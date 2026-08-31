import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Bot, Gauge, Film } from "lucide-react";
import BattleFighter from "@/components/BattleFighter";
import BattleCommandPanel from "@/components/BattleCommandPanel";
import { BattleTurnOrder, BattleInfoPanel } from "@/components/BattleSidePanels";
import BattlefieldEnv from "@/components/cinematic/BattlefieldEnv";
import BattleEntry from "@/components/cinematic/BattleEntry";
import BattleTurnAnnounce from "@/components/cinematic/BattleTurnAnnounce";
import BattleAttackFx from "@/components/cinematic/BattleAttackFx";
import BattleUltimate from "@/components/cinematic/BattleUltimate";
import BattleVictory from "@/components/cinematic/BattleVictory";
import { useAuth } from "@/context/AuthContext";
import { useGame } from "@/context/GameContext";
import { useAudio } from "@/context/AudioContext";
import {
  buildCombatant, buildOrder, resolveDamage, resolveOnHitEffects, resolveDeath,
  tickStatuses, applyBattleStartPassives, checkBossPhaseTransitions, makeEvent, spireEnemies,
  isStunned,
} from "@/lib/battle";
import { ELEMENT, RARITY } from "@/lib/styles";
import api from "@/lib/api";

let _uid = 0;
const nextUid = () => `c${_uid++}`;
const cloneArr = (arr) => arr.map((c) => ({ ...c, statuses: (c.statuses || []).map((s) => ({ ...s })) }));

/**
 * Shared AI decision-making — picks a jutsu + target for a combatant given
 * the current battlefield. Used identically by the enemy AI and by the
 * player's Auto-Battle mode, so "auto" plays exactly like a smart opponent
 * would: heal a wounded ally when possible, otherwise favor AoE when it's
 * worth it, otherwise focus the lowest-HP enemy with the strongest attack
 * it can currently afford.
 */
function pickAiAction(actor, arr) {
  const enemies = arr.filter((c) => c.side !== actor.side && c.alive);
  const allies = arr.filter((c) => c.side === actor.side && c.alive);
  const affordable = actor.jutsus.filter((j) =>
        j.type !== "passive" && j.chakra_cost <= actor.chakra
      );
  const healJ = affordable.find((j) => j.type === "heal");
  const woundedAlly = allies.find((a) => a.hp / a.maxHp < 0.45);

  let jutsu, targetUid = null;
  if (healJ && woundedAlly) {
    jutsu = healJ; targetUid = woundedAlly.uid;
  } else {
    const offensive = affordable.filter((j) => j.type === "attack" || j.type === "aoe");
    const aoe = offensive.find((j) => j.type === "aoe");
    if (aoe && enemies.length >= 2 && Math.random() < 0.6) {
      jutsu = aoe;
    } else {
      const atks = offensive.filter((j) => j.type === "attack");
      jutsu = atks.sort((a, b) => b.power - a.power)[0] || actor.jutsus[0];
      targetUid = [...enemies].sort((a, b) => a.hp - b.hp)[0]?.uid;
    }
    if (jutsu.type === "aoe") targetUid = null;
  }
  return { jutsu, targetUid };
}

export default function Battle() {
  const { mode = "campaign", id } = useParams();
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  const { catalogById, advantage, stages, items, trials, catalog, bossMechanics } = useGame();
  const { playSfx } = useAudio();

  // Arena opponents are ephemeral (frozen snapshots) — stashed in
  // sessionStorage by the Arena page right before navigating in here, since
  // there's no persistent "battle session" on the server for async PvP.
  const arenaOpponent = mode === "arena" ? JSON.parse(sessionStorage.getItem("arena_opponent") || "null") : null;
  // Tsukuyomi fights are launched from the boss gallery, which stashes the
  // chosen boss + difficulty + resolved enemy list here before navigating in.
  const tsukuFight = mode === "tsukuyomi" ? JSON.parse(sessionStorage.getItem("tsukuyomi_fight") || "null") : null;

  // Resolve the battle definition from the route mode.
  const floor = mode === "spire" ? parseInt(id, 10) : null;
  const stage = mode === "campaign" ? stages.find((s) => s.id === id) : null;
  const trial = mode === "trial" ? trials.find((t) => t.id === id) : null;
  const enemiesDef =
    mode === "spire" ? (catalog.length ? spireEnemies(floor, catalog) : [])
    : mode === "trial" ? (trial?.enemies || [])
    : mode === "arena" ? (arenaOpponent?.team || [])
    : mode === "tsukuyomi" ? (tsukuFight?.enemies || [])
    : (stage?.enemies || []);
  const title =
    mode === "spire" ? `SPIRE · FLOOR ${floor}`
    : mode === "trial" ? (trial?.name || "TRIAL")
    : mode === "arena" ? `ARENA · vs ${arenaOpponent?.name || "???"}`
    : mode === "tsukuyomi" ? (tsukuFight?.boss?.name || "TSUKUYOMI")
    : (stage?.name || "BATTLE");
  const ready =
    mode === "spire" ? !!floor && catalog.length > 0
    : mode === "trial" ? !!trial
    : mode === "arena" ? !!arenaOpponent && Object.keys(catalogById).length > 0
    : mode === "tsukuyomi" ? !!tsukuFight && Object.keys(catalogById).length > 0
    : !!stage;
  const backTo = mode === "campaign" ? "/campaign" : mode === "arena" ? "/arena" : mode === "tsukuyomi" ? "/tsukuyomi" : mode === "trial" ? "/dungeons" : "/spire";

  const [combs, setCombsState] = useState([]);
  const [activeUid, setActiveUid] = useState(null);
  const [phase, setPhase] = useState("intro"); // intro | select | enemy | busy | win | lose
  const [targeting, setTargeting] = useState(null); // jutsu being aimed
  const [log, setLog] = useState([]);
  const [round, setRound] = useState(1);
  const [floaters, setFloaters] = useState([]); // {id, uid, text, color}
  const [resultData, setResultData] = useState(null);
  const [shakeUid, setShakeUid] = useState(null);
  const [events, setEvents] = useState([]); // structured combat event log (Phase 3B) — for future VFX/animation
  const [auto, setAutoState] = useState(() => { try { return localStorage.getItem("sc_battle_auto") === "1"; } catch { return false; } });
  const [speed, setSpeedState] = useState(() => { try { return Number(localStorage.getItem("sc_battle_speed")) || 1; } catch { return 1; } });
  const [cinema, setCinemaState] = useState(() => { try { return localStorage.getItem("sc_battle_cinema") !== "0"; } catch { return true; } });

  // --- Cinematic state ---
  const [introDone, setIntroDone] = useState(false);
  const [cinematicAction, setCinematicAction] = useState(null); // { key, jutsuName, element, isCrit, isAoe }
  const [ultimateData, setUltimateData] = useState(null); // { key, actorName, jutsuName, element, portrait }
  const [screenShake, setScreenShake] = useState(false);
  const actionCounterRef = useRef(0);

  const combRef = useRef([]);
  const orderRef = useRef([]);
  const ptrRef = useRef(0);
  const reportedRef = useRef(false);
  const actionLockRef = useRef(false); // guards against multi-tap / double-submit dealing double damage
  const autoRef = useRef(false);
  const speedRef = useRef(1);
  const cinemaRef = useRef(cinema);
  // Honor the pre-battle preferences chosen in the Battle hub on first mount.
  useEffect(() => { autoRef.current = auto; speedRef.current = speed; cinemaRef.current = cinema; }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const setCombs = (next) => { combRef.current = next; setCombsState(next); };
  const pushLog = (msg) => setLog((l) => [msg, ...l].slice(0, 30));
  const pushEvents = (evs) => { if (evs?.length) setEvents((e) => [...e, ...evs].slice(-80)); };
  // Every timing constant in this screen is tuned for a snappy 1x baseline,
  // then divided further by the chosen speed multiplier (2x/3x) so both
  // manual and auto-battle play feel fast-paced.
  const ms = useCallback((base) => Math.max(60, Math.round(base / speedRef.current)), []);

  const setAuto = (v) => { autoRef.current = v; setAutoState(v); try { localStorage.setItem("sc_battle_auto", v ? "1" : "0"); } catch { /* storage unavailable */ } };
  const setCinema = (v) => { cinemaRef.current = v; setCinemaState(v); try { localStorage.setItem("sc_battle_cinema", v ? "1" : "0"); } catch { /* storage unavailable */ } };
  const cycleSpeed = () => {
    const next = speed >= 3 ? 1 : speed + 1;
    speedRef.current = next;
    setSpeedState(next);
    try { localStorage.setItem("sc_battle_speed", String(next)); } catch { /* storage unavailable */ }
  };

  // ---------- init ----------
  useEffect(() => {
    if (!ready || !user || Object.keys(catalogById).length === 0) return;
    const allies = (user.team || [])
      .map((tid) => user.ninjas.find((n) => n.instance_id === tid))
      .filter(Boolean)
      .map((inst) => buildCombatant(nextUid(), "ally", catalogById[inst.template_id], inst.level, inst.ascension || 0, inst.instance_id, inst.stats || null, inst.skill_rank || 1, !(inst.passive_locked), inst.reforge || null));
    const enemies = enemiesDef.map((e) => buildCombatant(nextUid(), "enemy", catalogById[e.template_id], e.level, e.ascension || 0));
    // Wire the boss-mechanic framework onto the boss stage's single enemy
    // (only real Campaign boss stages set stage.boss_mechanic — Spire and
    // Arena naturally skip this and run through the exact same engine).
    if (mode === "campaign" && stage?.is_boss && stage?.boss_mechanic && enemies[0]) {
      enemies[0].bossMechanicId = stage.boss_mechanic;
      enemies[0].bossPhaseIndex = -1;
    }
    // Tsukuyomi bosses always carry a phase mechanic — wire it onto the boss
    // (the first enemy), so nightmares play as true multi-phase fights.
    if (mode === "tsukuyomi" && tsukuFight?.boss?.boss_mechanic && enemies[0]) {
      enemies[0].bossMechanicId = tsukuFight.boss.boss_mechanic;
      enemies[0].bossPhaseIndex = -1;
    }
    const all = [...allies, ...enemies];
    const startEvents = applyBattleStartPassives(all);
    if (startEvents.length) {
      pushEvents(startEvents);
      startEvents.forEach((e) => e.text && pushLog(e.text));
    }
    setCombs(all);
    orderRef.current = buildOrder(all);
    ptrRef.current = 0;
    setPhase("intro");
    // With cinematics on, the first turn is gated on the BattleEntry intro
    // finishing (see the introDone effect below) so the player never misses
    // the opening of the fight. With cinematics off, start right away.
    if (!cinemaRef.current) setIntroDone(true);
  }, [mode, id, catalogById]);

  // Begin the first turn once the intro cinematic has finished — or at once
  // when cinematics are disabled. This is what "halts" the battle until the
  // cinematic art preview ends so nothing plays out behind the overlay.
  useEffect(() => {
    if (introDone && phase === "intro" && combRef.current.length > 0) {
      beginTurnAt(0, combRef.current, orderRef.current);
    }
  }, [introDone, phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const aliveSide = (arr, side) => arr.some((c) => c.side === side && c.alive);

  const beginTurnAt = useCallback((ptr, arr, order) => {
    if (!aliveSide(arr, "ally")) { setPhase("lose"); return; }
    if (!aliveSide(arr, "enemy")) { setPhase("win"); return; }

    const work = cloneArr(arr);
    let p = ptr;
    let ord = order;
    // skip dead actors
    while (p < ord.length && !work.find((c) => c.uid === ord[p])?.alive) p++;
    if (p >= ord.length) {
      ord = buildOrder(work);
      p = 0;
      setRound((r) => r + 1);
    }
    orderRef.current = ord;
    ptrRef.current = p;
    const actor = work.find((c) => c.uid === ord[p]);

    // Start-of-turn status resolution (Withering Curse DoT ticks). Trigger
    // timing: "start of the affected combatant's own turn" (Phase 3B item 6).
    const evs = [];
    const { dmg: dotDmg } = tickStatuses(actor);
    if (dotDmg > 0 && actor.alive) {
      actor.hp = Math.max(0, actor.hp - dotDmg);
      pushLog(`${actor.name} suffers ${dotDmg} from a lingering curse.`);
      evs.push(makeEvent("DOT_TRIGGERED", { targetUid: actor.uid, value: dotDmg }));
      if (actor.hp === 0) {
        const revived = resolveDeath(actor, evs);
        pushLog(revived ? `${actor.name} refuses to fall!` : `${actor.name} succumbs to the curse.`);
      }
    }
    pushEvents(evs);

    // A fresh turn always clears the previous action lock — this is the
    // single re-arm point for player input (fixes multi-tap double damage).
    actionLockRef.current = false;

    if (!actor.alive) {
      // Died to the DoT before acting — resolve the round and move on.
      setCombs(work);
      setTimeout(() => beginTurnAt(p + 1, work, ord), ms(300));
      return;
    }

    // chakra regen at start of turn
    actor.chakra = Math.min(actor.maxChakra, actor.chakra + 20);

    // Stun / Freeze check — skip the actor's turn entirely
    if (isStunned(actor)) {
      const stunStatus = actor.statuses.find((s) => (s.effectType === "stun" || s.effectType === "freeze") && (s.duration ?? 0) > 0);
      pushLog(`${actor.name} is ${stunStatus.effectType === "freeze" ? "frozen" : "stunned"} and cannot act!`);
      pushEvents([makeEvent("DEBUFF_APPLIED", { targetUid: actor.uid, text: `${actor.name} is ${stunStatus.effectType === "freeze" ? "FROZEN" : "STUNNED"}!` })]);
      setCombs(work);
      setTimeout(() => beginTurnAt(p + 1, work, ord), ms(600));
      return;
    }

    setCombs(work);
    setActiveUid(actor.uid);
    setTargeting(null);
    if (actor.side === "ally") setPhase("select");
    else setPhase("enemy");
  }, [ms]);

  const advance = useCallback((arr) => {
    setTimeout(() => beginTurnAt(ptrRef.current + 1, arr, orderRef.current), ms(400));
  }, [beginTurnAt, ms]);

  // ---------- apply an action ----------
  const applyAction = useCallback((actor, jutsu, targetUid) => {
    actionLockRef.current = true;
    setPhase("busy");
    playSfx(jutsu.type === "heal" ? "heal" : jutsu.type === "shield" ? "shield" : "hit");
    // Cinematic: capture action info for attack FX
    actionCounterRef.current += 1;
    const isUltimate = jutsu.chakra_cost >= 70;
    setCinematicAction({
      key: actionCounterRef.current,
      jutsuName: jutsu.name,
      element: actor.element,
      isAoe: jutsu.type === "aoe",
    });
    let arr = cloneArr(combRef.current);
    const act = arr.find((c) => c.uid === actor.uid);
    // pay / gain chakra
    act.chakra = Math.max(0, act.chakra - jutsu.chakra_cost + (jutsu.chakra_gain || 0));
    act.chakra = Math.min(act.maxChakra, act.chakra);

    const newFloaters = [];
    const newEvents = [];
    const addFloat = (uid, text, color) => newFloaters.push({ id: `${Date.now()}-${uid}-${Math.random()}`, uid, text, color });

    const applyDamage = (target) => {
      const { dmg, crit, mult, notes } = resolveDamage(act, target, jutsu, advantage);
      let remaining = dmg;
      if (target.shield > 0) {
        const absorbed = Math.min(target.shield, remaining);
        target.shield -= absorbed;
        remaining -= absorbed;
      }
      target.hp = Math.max(0, target.hp - remaining);

      // Boss shield-phase break tracking: 3 AoE hits while shielded forces
      // the shield down early, regardless of remaining shield value.
      if (target.bossMechanicId && target.shieldPhaseActive && jutsu.type === "aoe") {
        target.aoeHitsTaken = (target.aoeHitsTaken || 0) + 1;
        if (target.aoeHitsTaken >= 3 && target.shield > 0) {
          target.shield = 0;
          target.shieldBrokenPhase = target.bossPhaseIndex;
          target.shieldPhaseActive = false;
          newEvents.push(makeEvent("SHIELD_BROKEN", { targetUid: target.uid }));
          pushLog(`${target.name}'s shield shatters!`);
        }
      }

      const color = notes.includes("execute") ? "#E040FB" : mult > 1 ? "#FFCA28" : mult < 1 ? "#94A3B8" : "#FF1744";
      addFloat(target.uid, `${crit ? "CRIT " : ""}${notes.includes("execute") ? "EXECUTE " : ""}-${dmg}`, color);
      newEvents.push(makeEvent(crit ? "CRITICAL" : "DAMAGE", { actorUid: act.uid, targetUid: target.uid, value: dmg }));
      setShakeUid(target.uid);
      setTimeout(() => setShakeUid(null), ms(300));

      if (target.hp === 0) {
        const revived = resolveDeath(target, newEvents);
        if (revived) addFloat(target.uid, "REVIVED!", "#FFD54F");
      } else {
        // On-hit secondary effects (Blood Mark stacks, Withering Curse) —
        // only while the target is still standing.
        const { burstDamage, events: hitEvents } = resolveOnHitEffects(act, target, jutsu);
        newEvents.push(...hitEvents);
        if (burstDamage > 0) {
          target.hp = Math.max(0, target.hp - burstDamage);
          addFloat(target.uid, `MARK -${burstDamage}`, "#E040FB");
          if (target.hp === 0) {
            const revived = resolveDeath(target, newEvents);
            if (revived) addFloat(target.uid, "REVIVED!", "#FFD54F");
          }
        }
      }
    };

    if (jutsu.type === "attack") {
      const t = arr.find((c) => c.uid === targetUid);
      newEvents.push(makeEvent("ATTACK", { actorUid: act.uid, targetUid: t.uid, jutsuId: jutsu.id }));
      applyDamage(t);
      pushLog(`${act.name} used ${jutsu.name} on ${t.name}.`);
    } else if (jutsu.type === "aoe") {
      const enemiesArr = arr.filter((c) => c.side !== act.side && c.alive);
      newEvents.push(makeEvent("SKILL", { actorUid: act.uid, jutsuId: jutsu.id }));
      enemiesArr.forEach(applyDamage);
      pushLog(`${act.name} unleashed ${jutsu.name}!`);
    } else if (jutsu.type === "heal") {
      const t = arr.find((c) => c.uid === targetUid);
      const heal = Math.round((jutsu.power / 100) * act.atk + jutsu.power);
      t.hp = Math.min(t.maxHp, t.hp + heal);
      addFloat(t.uid, `+${heal}`, "#00E676");
      newEvents.push(makeEvent("HEAL", { actorUid: act.uid, targetUid: t.uid, value: heal }));
      pushLog(`${act.name} healed ${t.name} with ${jutsu.name}.`);
    } else if (jutsu.type === "shield") {
      const t = arr.find((c) => c.uid === targetUid);
      const sh = Math.round(act.def * 2.5 + 150);
      t.shield += sh;
      addFloat(t.uid, `SHIELD`, "#29B6F6");
      newEvents.push(makeEvent("SHIELD_APPLIED", { actorUid: act.uid, targetUid: t.uid, value: sh }));
      pushLog(`${act.name} shielded ${t.name}.`);
    }

    // Boss phase transitions (shield / enrage / elemental shift) — checked
    // after every action since HP thresholds can be crossed by any hit.
    const bossEvents = checkBossPhaseTransitions(arr, bossMechanics);
    bossEvents.forEach((e) => { newEvents.push(e); if (e.text) pushLog(`${e.text}!`); });

    setFloaters((f) => [...f, ...newFloaters]);
    newFloaters.forEach((nf) => setTimeout(() => setFloaters((f) => f.filter((x) => x.id !== nf.id)), ms(750)));
    pushEvents(newEvents);

    setCombs(arr);

    // Cinematic: ultimate abilities trigger a mini-cinematic that delays the
    // next turn so the letterbox/energy sequence has time to play.
    if (isUltimate && cinemaRef.current) {
      setUltimateData({
        key: actionCounterRef.current,
        actorName: actor.name,
        jutsuName: jutsu.name,
        element: actor.element,
        portrait: actor.portrait,
      });
      // Delay advance until the (brief) ultimate cinematic finishes
      setTimeout(() => advance(arr), ms(1200));
    } else {
      advance(arr);
    }
  }, [advantage, advance, bossMechanics, ms, playSfx]);

  // ---------- enemy AI ----------
  useEffect(() => {
    if (phase !== "enemy") return;
    const t = setTimeout(() => {
      const arr = combRef.current;
      const actor = arr.find((c) => c.uid === activeUid);
      if (!actor || !actor.alive) { advance(arr); return; }
      if (actionLockRef.current) return;
      const { jutsu, targetUid } = pickAiAction(actor, arr);
      applyAction(actor, jutsu, targetUid);
    }, ms(550));
    return () => clearTimeout(t);
  }, [phase, activeUid]);

  // ---------- auto-battle (player side) ----------
  useEffect(() => {
    if (phase !== "select" || !auto) return;
    const t = setTimeout(() => {
      if (actionLockRef.current) return;
      const arr = combRef.current;
      const actor = arr.find((c) => c.uid === activeUid);
      if (!actor || !actor.alive) return;
      const { jutsu, targetUid } = pickAiAction(actor, arr);
      applyAction(actor, jutsu, targetUid);
    }, ms(450));
    return () => clearTimeout(t);
  }, [phase, activeUid, auto]);

  // ---------- report result ----------
  useEffect(() => {
    if ((phase === "win" || phase === "lose") && !reportedRef.current) {
      reportedRef.current = true;
      playSfx(phase === "win" ? "win" : "lose");
      pushEvents([makeEvent(phase === "win" ? "VICTORY" : "DEFEAT", {})]);
      const allyCombs = combRef.current.filter((c) => c.side === "ally");
      const participants = allyCombs.map((c) => c.instanceId).filter(Boolean);
      const survivors = allyCombs.filter((c) => c.alive).map((c) => c.instanceId).filter(Boolean);
      const result = phase === "win" ? "win" : "lose";
      const reqs = {
        campaign: ["/game/battle/complete", { stage_id: id, result, participants, survivors }],
        spire: ["/game/spire/complete", { floor, result, participants, survivors }],
        trial: ["/game/trial/complete", { trial_id: id, result, participants, survivors }],
        tsukuyomi: ["/game/tsukuyomi/complete", { boss_id: tsukuFight?.boss?.id, difficulty: tsukuFight?.difficulty, result, participants, survivors }],
        arena: ["/arena/battle/complete", { opponent_user_id: arenaOpponent?.user_id, result, participants, survivors }],
      };
      const [url, body] = reqs[mode] || reqs.campaign;
      api.post(url, body)
        .then(({ data }) => {
          if (data.profile) setUser(data.profile);
          setResultData(data);
        })
        .catch(() => setResultData({ result: phase }));
    }
  }, [phase, playSfx]);

  // ---------- player input ----------
  const onJutsuClick = (jutsu) => {
    if (actionLockRef.current || phase !== "select" || auto) return;
    const actor = combRef.current.find((c) => c.uid === activeUid);
    if (!actor || jutsu.chakra_cost > actor.chakra) return;
    if (jutsu.type === "aoe") {
      applyAction(actor, jutsu, null);
    } else {
      setTargeting(jutsu);
    }
  };

  const onTargetClick = (target) => {
    if (actionLockRef.current || phase !== "select" || auto || !targeting) return;
    const valid = (targeting.type === "heal" || targeting.type === "shield")
      ? target.side === "ally" : target.side === "enemy";
    if (!valid || !target.alive) return;
    const actor = combRef.current.find((c) => c.uid === activeUid);
    // Clear targeting immediately (synchronously, before the state update
    // that flips phase -> "busy" lands) so a rapid second tap on the same
    // enemy can never slip through and deal a second hit.
    setTargeting(null);
    applyAction(actor, targeting, target.uid);
  };

  if (!ready) return <div className="p-10 text-center text-slate-400">Battle not found.</div>;

  const allies = combs.filter((c) => c.side === "ally");
  const enemies = combs.filter((c) => c.side === "enemy");
  const activeActor = combs.find((c) => c.uid === activeUid);
  const isValidTarget = (c) => targeting && !auto && phase === "select" && c.alive && ((targeting.type === "heal" || targeting.type === "shield") ? c.side === "ally" : c.side === "enemy");

  const dominantElement = enemies[0]?.element || "Dark";

  return (
    <div className={`fixed inset-0 overflow-hidden ${screenShake ? "screen-shake" : ""}`} data-testid="battle-page">
      {/* Cinematic layered battlefield environment */}
      <BattlefieldEnv element={dominantElement} />

      {/* Cinematic battle entry transition */}
      {cinema && <BattleEntry title={title} chapter={mode === "campaign" ? `CHAPTER ${stage?.chapter || "I"}` : mode === "spire" ? `FLOOR ${floor}` : mode.toUpperCase()} onDone={() => setIntroDone(true)} />}

      {/* Cinematic turn announcement */}
      {cinema && <BattleTurnAnnounce activeUid={activeUid} actor={activeActor} phase={phase} round={round} />}

      {/* Cinematic attack effects */}
      {cinema && <BattleAttackFx action={cinematicAction} onShake={(strength) => { setScreenShake(true); setTimeout(() => setScreenShake(false), strength === "strong" ? 500 : 400); }} />}

      {/* Ultimate cinematic */}
      {cinema && <BattleUltimate data={ultimateData} onDone={() => setUltimateData(null)} />}

      {/* Header: retreat + stage info + controls */}
      <div className="absolute top-0 left-0 right-0 z-20 glass border-b border-white/10 px-4 py-1.5 flex items-center justify-between">
        <button onClick={() => navigate(backTo)} data-testid="battle-exit" className="text-slate-400 hover:text-white text-sm font-semibold">← Retreat</button>
        <div className="text-center">
          <div className="font-display text-lg tracking-widest text-white leading-none truncate max-w-[45vw]">{title}</div>
          <div className="text-[10px] text-chakra font-semibold">ROUND {round}</div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={cycleSpeed}
            data-testid="battle-speed-toggle"
            title="Battle speed"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-display tracking-wide border border-white/15 text-slate-300 hover:text-white hover:border-white/30 transition-colors"
          >
            <Gauge className="w-3.5 h-3.5" />{speed}X
          </button>
          <button
            onClick={() => setAuto(!auto)}
            data-testid="battle-auto-toggle"
            title="Auto-battle"
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-display tracking-wide border transition-colors ${
              auto ? "border-chakra text-chakra bg-cyan-500/15" : "border-white/15 text-slate-300 hover:text-white hover:border-white/30"
            }`}
          >
            <Bot className="w-3.5 h-3.5" />AUTO
          </button>
          <button
            onClick={() => setCinema(!cinema)}
            data-testid="battle-cinema-toggle"
            title="Toggle cinematic previews"
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-display tracking-wide border transition-colors ${
              cinema ? "border-jutsu text-jutsu bg-fuchsia-500/15" : "border-white/15 text-slate-300 hover:text-white hover:border-white/30"
            }`}
          >
            <Film className="w-3.5 h-3.5" />CINEMA
          </button>
        </div>
      </div>

      {/* Battlefield with side panels */}
      <div className="absolute inset-0 z-10 flex pt-10 pb-36">
        {/* Left: Turn order (desktop only) */}
        <BattleTurnOrder combs={combs} order={orderRef.current} ptr={ptrRef.current} className="hidden lg:flex" />

        {/* Center: Battlefield */}
        <div className="flex-1 flex flex-col justify-center min-w-0">
          {/* Enemies */}
          <div className="flex justify-center gap-3 sm:gap-5 px-4 mb-3">
            {enemies.map((c) => (
              <BattleFighter key={c.uid} c={c} active={c.uid === activeUid} shake={shakeUid === c.uid}
                floaters={floaters.filter((f) => f.uid === c.uid)} highlight={isValidTarget(c)}
                onClick={() => onTargetClick(c)} flip subdued />
            ))}
          </div>

          {/* Turn indicator */}
          <div className="text-center my-2">
            {phase === "select" && activeActor && !auto && (
              <div className="inline-flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-widest text-chakra font-bold">YOUR TURN</span>
                <span className="font-display text-lg text-white">{activeActor.name}</span>
              </div>
            )}
            {phase === "enemy" && activeActor && (
              <div className="inline-flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-widest text-fox font-bold">ENEMY TURN</span>
                <span className="font-display text-lg text-white">{activeActor.name}</span>
              </div>
            )}
            {phase === "intro" && (
              <span className="font-display text-2xl tracking-widest text-white animate-pulse">BATTLE START!</span>
            )}
          </div>

          {/* Allies */}
          <div className="flex justify-center gap-3 sm:gap-5 px-4 mt-3">
            {allies.map((c) => (
              <BattleFighter key={c.uid} c={c} active={c.uid === activeUid} shake={shakeUid === c.uid}
                floaters={floaters.filter((f) => f.uid === c.uid)} highlight={isValidTarget(c)}
                onClick={() => onTargetClick(c)} />
            ))}
          </div>
        </div>

        {/* Right: Battle info (desktop only) */}
        <BattleInfoPanel log={log} enemies={enemies} className="hidden lg:flex" />
      </div>

      {/* Bottom command panel */}
      <BattleCommandPanel activeActor={activeActor} phase={phase} targeting={targeting} auto={auto} onJutsuClick={onJutsuClick} />

      {/* Cinematic victory/defeat sequence */}
      <BattleVictory
        open={phase === "win" || phase === "lose"}
        result={resultData}
        mode={mode}
        floor={floor}
        isWin={phase === "win"}
        onBack={() => navigate(backTo)}
        onNext={
          mode === "spire" ? () => window.location.assign(`/battle/spire/${floor + 1}`)
          : mode === "trial" ? () => window.location.reload()
          : mode === "arena" ? () => navigate("/arena")
          : mode === "tsukuyomi" ? () => navigate("/tsukuyomi")
          : () => {
            const idx = stages.findIndex((s) => s.id === id);
            const next = idx >= 0 && idx < stages.length - 1 ? stages[idx + 1] : null;
            if (next) window.location.assign(`/battle/campaign/${next.id}`);
            else window.location.assign("/campaign");
          }
        }
        onLobby={() => navigate("/")}
        onRetry={() => window.location.reload()}
      />
    </div>
  );
}


