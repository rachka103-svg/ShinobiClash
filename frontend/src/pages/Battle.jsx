import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Bot, Gauge, Film, Settings } from "lucide-react";
import BattleFighter from "@/components/BattleFighter";
import BattleCommandPanel from "@/components/BattleCommandPanel";
import { BattleTurnOrder, BattleInfoPanel } from "@/components/BattleSidePanels";
import BattlefieldEnv from "@/components/cinematic/BattlefieldEnv";
import BattleEntry from "@/components/cinematic/BattleEntry";
import BattleAttackFx from "@/components/cinematic/BattleAttackFx";
import BattleUltimate from "@/components/cinematic/BattleUltimate";
import BattleVictory from "@/components/cinematic/BattleVictory";
import LevelUpOverlay from "@/components/LevelUpOverlay";
import { useAuth } from "@/context/AuthContext";
import { useGame } from "@/context/GameContext";
import { useAudio } from "@/context/AudioContext";
import {
  buildCombatant,
  buildOrder,
  resolveDamage,
  resolveOnHitEffects,
  resolveDeath,
  tickStatuses,
  applyBattleStartPassives,
  checkBossPhaseTransitions,
  makeEvent,
  spireEnemies,
  computeStats,
  applyEnemyGear,
  getTauntTarget,
  isImmune,
  applyJutsuEffects,
} from "@/lib/battle";
import { evaluateTeamSynergy } from "@/lib/teamSynergy";
import { getCombatModifiers, computeLifesteal, combatModifiersSummary } from "@/lib/combatModifiers";
import api from "@/lib/api";

let _uid = 0;
const nextUid = () => `c${_uid++}`;

const cloneArr = (arr) =>
  arr.map((c) => ({
    ...c,
    statuses: (c.statuses || []).map((s) => ({ ...s })),
  }));

/**
 * Shared AI decision-making — picks a jutsu + target for a combatant given
 * the current battlefield.
 */
function pickAiAction(actor, arr) {
  const enemies = arr.filter((c) => c.side !== actor.side && c.alive);
  const allies = arr.filter((c) => c.side === actor.side && c.alive);

  const affordable = actor.jutsus.filter(
    (j) => j.type !== "passive" && j.chakra_cost <= actor.chakra
  );

  // Check for taunt — must target the taunting enemy
  const tauntUid = getTauntTarget(arr, actor.side);

  // Priority 1: Revive a fallen ally
  const deadAlly = arr.find((c) => c.side === actor.side && !c.alive);
  const reviveJ = affordable.find((j) => j.type === "revive");
  if (reviveJ && deadAlly) {
    return { jutsu: reviveJ, targetUid: deadAlly.uid };
  }

  // Priority 2: Heal a wounded ally
  const healJ = affordable.find((j) => j.type === "heal" || j.type === "aoe_heal");
  const woundedAlly = allies.find((a) => a.hp / a.maxHp < 0.45);
  if (healJ && woundedAlly) {
    if (healJ.type === "aoe_heal") return { jutsu: healJ, targetUid: null };
    return { jutsu: healJ, targetUid: woundedAlly.uid };
  }

  // Priority 3: Team buff if no allies have buffs
  const buffJ = affordable.find((j) => j.type === "team_buff");
  if (buffJ && Math.random() < 0.4) {
    return { jutsu: buffJ, targetUid: null };
  }

  // Priority 4: Taunt if tank and enemies alive
  const tauntJ = affordable.find((j) => j.type === "taunt");
  if (tauntJ && actor.role === "Tank" && !actor.statuses?.some(s => s.effectType === "taunt") && Math.random() < 0.5) {
    return { jutsu: tauntJ, targetUid: actor.uid };
  }

  // Priority 5: Cleanse if allies have debuffs
  const cleanseJ = affordable.find((j) => j.type === "cleanse");
  const debuffedAlly = allies.find((a) => a.statuses?.some(s =>
    ["burn", "poison", "bleed", "stun", "freeze", "atk_down", "def_down", "shock"].includes(s.effectType)
  ));
  if (cleanseJ && debuffedAlly && Math.random() < 0.6) {
    return { jutsu: cleanseJ, targetUid: debuffedAlly.uid };
  }

  // Priority 6: Offensive action
  const offensive = affordable.filter(
    (j) => j.type === "attack" || j.type === "aoe"
  );

  let jutsu;
  let targetUid = null;

  const aoe = offensive.find((j) => j.type === "aoe");

  if (aoe && enemies.length >= 2 && Math.random() < 0.6) {
    jutsu = aoe;
  } else {
    const atks = offensive.filter((j) => j.type === "attack");
    jutsu = atks.sort((a, b) => b.power - a.power)[0] || actor.jutsus[0];
    // Target lowest HP enemy, but respect taunt
    if (tauntUid) {
      targetUid = tauntUid;
    } else {
      targetUid = [...enemies].sort((a, b) => a.hp - b.hp)[0]?.uid;
    }
  }

  if (jutsu.type === "aoe") targetUid = null;
  if (!jutsu) jutsu = actor.jutsus[0];

  return { jutsu, targetUid };
}

/**
 * Apply team buff effects (team_atk_up, team_def_up) from offensive skills
 * to all alive allies.  These effects are skipped in applyJutsuEffects for
 * offensive skills to avoid double-application, so they must be applied here.
 */
function _applyTeamBuffsFromOffensive(actor, arr, jutsu, events) {
  const teamBuffEffects = (jutsu.effects || []).filter(
    (e) => e.type === "team_atk_up" || e.type === "team_def_up"
  );
  if (!teamBuffEffects.length) return;

  const allies = arr.filter((c) => c.side === actor.side && c.alive);
  for (const eff of teamBuffEffects) {
    if (eff.chance != null && eff.chance < 100 && Math.random() * 100 > eff.chance) continue;
    const dur = eff.duration || 2;
    const val = eff.value || 0;
    const et = eff.type;
    for (const ally of allies) {
      ally.statuses = ally.statuses || [];
      ally.statuses.push({
        id: `${et}_${ally.uid}_${Date.now()}`,
        effectType: et,
        source: actor.uid,
        duration: dur,
        value: val,
      });
    }
    const label = et === "team_atk_up" ? "Team ATK Up!" : "Team DEF Up!";
    events.push(makeEvent("BUFF_APPLIED", { actorUid: actor.uid, text: label }));
  }
}

export default function Battle() {
  const { mode = "campaign", id } = useParams();
  const navigate = useNavigate();

  const { user, setUser } = useAuth();

  const {
    catalogById,
    advantage,
    stages,
    items,
    trials,
    catalog,
    bossMechanics,
  } = useGame();

  const { playSfx } = useAudio();

  // Arena opponents are ephemeral snapshots stored before navigation.
  const arenaOpponent =
    mode === "arena"
      ? JSON.parse(sessionStorage.getItem("arena_opponent") || "null")
      : null;

  // Tsukuyomi fights are launched from the boss gallery.
  const tsukuFight =
    mode === "tsukuyomi"
      ? JSON.parse(sessionStorage.getItem("tsukuyomi_fight") || "null")
      : null;

  // Boss Hunt fights are launched from the Boss Hunt page.
  const bossHuntFight =
    mode === "bosshunt"
      ? JSON.parse(sessionStorage.getItem("bosshunt_boss") || "null")
      : null;

  const floor = mode === "spire" ? parseInt(id, 10) : null;

  const stage =
    mode === "campaign"
      ? stages.find((s) => s.id === id)
      : null;

  const trial =
    mode === "trial"
      ? trials.find((t) => t.id === id)
      : null;

  const enemiesDef =
    mode === "spire"
      ? catalog.length
        ? spireEnemies(floor, catalog)
        : []
      : mode === "trial"
      ? trial?.enemies || []
      : mode === "arena"
      ? arenaOpponent?.team || []
      : mode === "tsukuyomi"
      ? tsukuFight?.enemies || []
      : mode === "bosshunt"
      ? bossHuntFight?.enemies || []
      : stage?.enemies || [];

  const title =
    mode === "spire"
      ? `SPIRE · FLOOR ${floor}`
      : mode === "trial"
      ? trial?.name || "TRIAL"
      : mode === "arena"
      ? `ARENA · vs ${arenaOpponent?.name || "???"}`
      : mode === "tsukuyomi"
      ? tsukuFight?.boss?.name || "TSUKUYOMI"
      : mode === "bosshunt"
      ? bossHuntFight?.name || "BOSS HUNT"
      : stage?.name || "BATTLE";

  const ready =
    mode === "spire"
      ? !!floor && catalog.length > 0
      : mode === "trial"
      ? !!trial
      : mode === "arena"
      ? !!arenaOpponent && Object.keys(catalogById).length > 0
      : mode === "tsukuyomi"
      ? !!tsukuFight && Object.keys(catalogById).length > 0
      : mode === "bosshunt"
      ? !!bossHuntFight && Object.keys(catalogById).length > 0
      : !!stage;

  const backTo =
    mode === "campaign"
      ? "/campaign"
      : mode === "arena"
      ? "/arena"
      : mode === "tsukuyomi"
      ? "/tsukuyomi"
      : mode === "bosshunt"
      ? "/boss-hunt"
      : mode === "trial"
      ? "/dungeons"
      : "/spire";

  const [combs, setCombsState] = useState([]);
  const [activeUid, setActiveUid] = useState(null);

  const [phase, setPhase] = useState("intro");

  const [targeting, setTargeting] = useState(null);

  // Only meaningful special events are stored here now.
  // Normal attacks, jutsu usage, turns, etc. do NOT create narration.
  const [log, setLog] = useState([]);

  const [round, setRound] = useState(1);

  const [floaters, setFloaters] = useState([]);

  const [resultData, setResultData] = useState(null);

  const [showLevelUp, setShowLevelUp] = useState(false);

  const [shakeUid, setShakeUid] = useState(null);

  const [events, setEvents] = useState([]);

  const [auto, setAutoState] = useState(() => {
    try {
      return localStorage.getItem("sc_battle_auto") === "1";
    } catch {
      return false;
    }
  });

  const [speed, setSpeedState] = useState(() => {
    try {
      return Number(localStorage.getItem("sc_battle_speed")) || 1;
    } catch {
      return 1;
    }
  });

  const [cinema, setCinemaState] = useState(() => {
    try {
      return localStorage.getItem("sc_battle_cinema") !== "0";
    } catch {
      return true;
    }
  });

  // Cinematic state
  const [introDone, setIntroDone] = useState(false);

  const [cinematicAction, setCinematicAction] = useState(null);

  const [ultimateData, setUltimateData] = useState(null);

  const [screenShake, setScreenShake] = useState(false);

  const [attackingUid, setAttackingUid] = useState(null);

  const actionCounterRef = useRef(0);

  const combRef = useRef([]);
  const orderRef = useRef([]);
  const ptrRef = useRef(0);
  const reportedRef = useRef(false);

  const actionLockRef = useRef(false);

  const autoRef = useRef(false);
  const speedRef = useRef(1);
  const cinemaRef = useRef(cinema);

  useEffect(() => {
    autoRef.current = auto;
    speedRef.current = speed;
    cinemaRef.current = cinema;
  }, []);

  const setCombs = (next) => {
    combRef.current = next;
    setCombsState(next);
  };

  // Reserved for important battle events only.
  const pushLog = (msg) => {
    if (!msg) return;
    setLog((l) => [msg, ...l].slice(0, 15));
  };

  const pushEvents = (evs) => {
    if (evs?.length) {
      setEvents((e) => [...e, ...evs].slice(-80));
    }
  };

  const ms = useCallback(
    (base) =>
      Math.max(60, Math.round(base / speedRef.current)),
    []
  );

  const setAuto = (v) => {
    autoRef.current = v;
    setAutoState(v);

    try {
      localStorage.setItem("sc_battle_auto", v ? "1" : "0");
    } catch {
      // Storage unavailable
    }
  };

  const setCinema = (v) => {
    cinemaRef.current = v;
    setCinemaState(v);

    try {
      localStorage.setItem("sc_battle_cinema", v ? "1" : "0");
    } catch {
      // Storage unavailable
    }
  };

  const cycleSpeed = () => {
    const next = speed >= 3 ? 1 : speed + 1;

    speedRef.current = next;
    setSpeedState(next);

    try {
      localStorage.setItem("sc_battle_speed", String(next));
    } catch {
      // Storage unavailable
    }
  };

  // ---------- INIT ----------

  useEffect(() => {
    if (!ready || !user || Object.keys(catalogById).length === 0) return;

    // --- Evaluate team synergy ---
    const allyTemplates = (user.team || [])
      .map((tid) => user.ninjas.find((n) => n.instance_id === tid))
      .filter(Boolean)
      .map((inst) => catalogById[inst.template_id])
      .filter(Boolean);
    const synergyResult = evaluateTeamSynergy(allyTemplates);
    const synergyBonuses = synergyResult.bonuses;

    const allies = (user.team || [])
      .map((tid) =>
        user.ninjas.find((n) => n.instance_id === tid)
      )
      .filter(Boolean)
      .map((inst) =>
        buildCombatant(
          nextUid(),
          "ally",
          catalogById[inst.template_id],
          inst.level,
          inst.ascension || 0,
          inst.instance_id,
          inst.stats || null,
          inst.skill_rank || 1,
          !inst.passive_locked,
          inst.reforge || null,
          null, // combatModifiers — allies don't have enemy combat modifiers
          Object.keys(synergyBonuses).length > 0 ? synergyBonuses : null
        )
      );

    const enemies = enemiesDef.map((e) => {
      const template = catalogById[e.template_id];

      // Enemies with the new progression system carry pre-computed
      // stats_override (evolved rarity + ascension + gear + crystals),
      // skill_rank, passive_locked, and reforge — all derived from real
      // RPG systems on the backend. Legacy enemies fall back to the
      // old computeStats + applyEnemyGear path.
      const statsOverride = e.stats_override || null;

      const gearedStats = !statsOverride && e.gear_bonus
        ? applyEnemyGear(
            computeStats(template, e.level, e.ascension || 0),
            e.gear_bonus
          )
        : statsOverride;

      return buildCombatant(
        nextUid(),
        "enemy",
        template,
        e.level,
        e.ascension || 0,
        null,
        gearedStats,
        e.skill_rank || 1,
        e.passive_locked == null ? true : !e.passive_locked,
        e.reforge || null,
        e.combat_modifiers || null
      );
    });

    // Campaign boss mechanics
    if (
      mode === "campaign" &&
      stage?.is_boss &&
      stage?.boss_mechanic &&
      enemies[0]
    ) {
      enemies[0].bossMechanicId = stage.boss_mechanic;
      enemies[0].bossPhaseIndex = -1;
    }

    // Tsukuyomi boss mechanics
    if (
      mode === "tsukuyomi" &&
      tsukuFight?.boss?.boss_mechanic &&
      enemies[0]
    ) {
      enemies[0].bossMechanicId =
        tsukuFight.boss.boss_mechanic;

      enemies[0].bossPhaseIndex = -1;
    }

    // Boss Hunt boss mechanics
    if (
      mode === "bosshunt" &&
      enemies[0]
    ) {
      const bhEnemy = bossHuntFight?.enemies?.[0];
      if (bhEnemy?.boss_mechanic) {
        enemies[0].bossMechanicId = bhEnemy.boss_mechanic;
      }
      enemies[0].bossPhaseIndex = -1;
    }

    const all = [...allies, ...enemies];

    const startEvents = applyBattleStartPassives(all);

    const bossStartEvents = checkBossPhaseTransitions(
      all,
      bossMechanics
    );

    if (startEvents.length) {
      pushEvents(startEvents);

      // Only log important passive events.
      startEvents.forEach((e) => {
        if (e.text) pushLog(e.text);
      });
    }

    if (bossStartEvents.length) {
      pushEvents(bossStartEvents);

      bossStartEvents.forEach((e) => {
        if (e.text) pushLog(e.text);
      });
    }

    setCombs(all);

    const initialOrder = buildOrder(all);

    orderRef.current = initialOrder;
    ptrRef.current = 0;

    setPhase("intro");

    const t = setTimeout(
      () => beginTurnAt(0, all, initialOrder),
      ms(900)
    );

    return () => clearTimeout(t);
  }, [mode, id, catalogById]);

  const aliveSide = (arr, side) =>
    arr.some((c) => c.side === side && c.alive);

  // ---------- BEGIN TURN ----------

  const beginTurnAt = useCallback(
    (ptr, arr, order) => {
      if (!aliveSide(arr, "ally")) {
        setPhase("lose");
        return;
      }

      if (!aliveSide(arr, "enemy")) {
        setPhase("win");
        return;
      }

      const work = cloneArr(arr);

      let p = ptr;
      let ord = order;

      // Skip dead actors
      while (
        p < ord.length &&
        !work.find((c) => c.uid === ord[p])?.alive
      ) {
        p++;
      }

      if (p >= ord.length) {
        ord = buildOrder(work);
        p = 0;

        setRound((r) => r + 1);
      }

      orderRef.current = ord;
      ptrRef.current = p;

      const actor = work.find(
        (c) => c.uid === ord[p]
      );

      if (!actor) {
        setPhase("lose");
        return;
      }

      // Start-of-turn status resolution
      const evs = [];

      // Capture CC state BEFORE tickStatuses — otherwise a duration-1 stun
      // is decremented to 0 the instant the actor's turn begins, so the
      // actor never actually skips a turn (stun/freeze did nothing).
      const ccStatus = actor.statuses?.find(
        (s) =>
          (s.effectType === "stun" ||
            s.effectType === "freeze") &&
          (s.duration ?? 0) > 0
      );
      const stunned = !!ccStatus;

      const { dmg: dotDmg, events: tickEvents } = tickStatuses(actor);

      // Use the events from tickStatuses — they carry the correct
      // effectType and damage values for DOT/debuff display.
      evs.push(...tickEvents);

      // Log status tick text (Burn! -150, Shock! +50% dmg taken, etc.)
      tickEvents.forEach((e) => {
        if (e.text) pushLog(e.text);
      });

      if (dotDmg > 0 && actor.alive) {
        actor.hp = Math.max(0, actor.hp - dotDmg);

        if (actor.hp === 0) {
          const revived = resolveDeath(actor, evs);

          // Important event only
          if (revived) {
            pushLog("REVIVED");
          }
        }
      }

      pushEvents(evs);

      // Fresh turn clears previous action lock.
      actionLockRef.current = false;

      if (!actor.alive) {
        setCombs(work);

        setTimeout(
          () => beginTurnAt(p + 1, work, ord),
          ms(300)
        );

        return;
      }

      // Chakra regeneration
      actor.chakra = Math.min(
        actor.maxChakra,
        actor.chakra + 20
      );

      // Stun / Freeze — uses the CC state captured before tickStatuses so
      // the stun actually consumes the turn it was applied for.
      if (stunned) {
        const statusName =
          ccStatus?.effectType === "freeze"
            ? "FROZEN"
            : "STUNNED";

        pushEvents([
          makeEvent("DEBUFF_APPLIED", {
            targetUid: actor.uid,
            text: statusName,
          }),
        ]);

        // Short event label only — no character narration.
        pushLog(statusName);

        setCombs(work);

        setTimeout(
          () => beginTurnAt(p + 1, work, ord),
          ms(600)
        );

        return;
      }

      setCombs(work);

      setActiveUid(actor.uid);

      setTargeting(null);

      if (actor.side === "ally") {
        setPhase("select");
      } else {
        setPhase("enemy");
      }
    },
    [ms]
  );

  const advance = useCallback(
    (arr) => {
      setTimeout(
        () =>
          beginTurnAt(
            ptrRef.current + 1,
            arr,
            orderRef.current
          ),
        ms(400)
      );
    },
    [beginTurnAt, ms]
  );

  // ---------- APPLY ACTION ----------

  const applyAction = useCallback(
    (actor, jutsu, targetUid) => {
      actionLockRef.current = true;

      setPhase("busy");

      setAttackingUid(actor.uid);

      setTimeout(
        () => setAttackingUid(null),
        ms(500)
      );

      playSfx(
        jutsu.type === "heal"
          ? "heal"
          : jutsu.type === "shield"
          ? "shield"
          : "hit"
      );

      // Cinematic attack data
      actionCounterRef.current += 1;

      const isUltimate =
        jutsu.chakra_cost >= 70;

      setCinematicAction({
        key: actionCounterRef.current,
        jutsuName: jutsu.name,
        element: actor.element,
        isAoe: jutsu.type === "aoe",
      });

      let arr = cloneArr(combRef.current);

      const act = arr.find(
        (c) => c.uid === actor.uid
      );

      // Pay / gain chakra
      act.chakra = Math.max(
        0,
        act.chakra -
          jutsu.chakra_cost +
          (jutsu.chakra_gain || 0)
      );

      act.chakra = Math.min(
        act.maxChakra,
        act.chakra
      );

      const newFloaters = [];
      const newEvents = [];

      const addFloat = (uid, text, color) => {
        newFloaters.push({
          id: `${Date.now()}-${uid}-${Math.random()}`,
          uid,
          text,
          color,
        });
      };

      const applyDamage = (target) => {
        const result = resolveDamage(
          act,
          target,
          jutsu,
          advantage
        );

        const {
          dmg,
          crit,
          mult,
          notes,
        } = result;

        // --- Immunity / Resistance feedback ---
        if (result.immune) {
          addFloat(target.uid, "IMMUNE", "#94A3B8");
          newEvents.push(
            makeEvent("IMMUNE", {
              actorUid: act.uid,
              targetUid: target.uid,
              text: "IMMUNE",
            })
          );
          return; // No damage applied
        }

        let remaining = dmg;

        let shieldAbsorbed = 0;
        if (target.shield > 0) {
          const absorbed = Math.min(
            target.shield,
            remaining
          );

          target.shield -= absorbed;
          remaining -= absorbed;
          shieldAbsorbed = absorbed;
        }

        target.hp = Math.max(
          0,
          target.hp - remaining
        );

        // Boss shield break tracking
        if (
          target.bossMechanicId &&
          target.shieldPhaseActive &&
          jutsu.type === "aoe"
        ) {
          target.aoeHitsTaken =
            (target.aoeHitsTaken || 0) + 1;

          if (
            target.aoeHitsTaken >= 3 &&
            target.shield > 0
          ) {
            target.shield = 0;

            target.shieldBrokenPhase =
              target.bossPhaseIndex;

            target.shieldPhaseActive = false;

            newEvents.push(
              makeEvent("SHIELD_BROKEN", {
                targetUid: target.uid,
              })
            );

            // Important cinematic event
            pushLog("SHIELD BROKEN");
          }
        }

        // --- Combat feedback floaters ---
        const hasResistNotes = notes.some((n) =>
          n.includes("RESIST") || n.includes("REDUCTION")
        );

        const color = notes.includes("execute")
          ? "#E040FB"
          : result.immune
          ? "#94A3B8"
          : hasResistNotes
          ? "#64748B"
          : mult > 1
          ? "#FFCA28"
          : mult < 1
          ? "#94A3B8"
          : "#FF1744";

        let floatText = "";
        if (shieldAbsorbed > 0 && remaining > 0) {
          floatText = `${crit ? "CRIT " : ""}${notes.includes("execute") ? "EXECUTE " : ""}-${dmg}`;
        } else if (shieldAbsorbed > 0 && remaining === 0) {
          floatText = `SHIELD -${shieldAbsorbed}`;
        } else {
          floatText = `${crit ? "CRIT " : ""}${notes.includes("execute") ? "EXECUTE " : ""}${hasResistNotes ? "RESIST " : ""}-${dmg}`;
        }

        addFloat(target.uid, floatText, color);

        newEvents.push(
          makeEvent(
            crit ? "CRITICAL" : "DAMAGE",
            {
              actorUid: act.uid,
              targetUid: target.uid,
              value: dmg,
            }
          )
        );

        setShakeUid(target.uid);

        setTimeout(
          () => setShakeUid(null),
          ms(300)
        );

        // --- Combat modifier life steal ---
        // Apply life steal from the attacker's combat modifiers (percentage
        // of damage dealt). DoT does not trigger this.
        const actorMods = getCombatModifiers(act);
        if (actorMods.lifesteal_pct && act.alive && dmg > 0) {
          const lifestealHeal = computeLifesteal(dmg, actorMods, false);
          if (lifestealHeal > 0) {
            const oldHp = act.hp;
            act.hp = Math.min(act.maxHp, act.hp + lifestealHeal);
            const actualHeal = act.hp - oldHp;
            if (actualHeal > 0) {
              addFloat(act.uid, `+${actualHeal}`, "#00E676");
              newEvents.push(
                makeEvent("HEAL", {
                  actorUid: act.uid,
                  targetUid: act.uid,
                  value: actualHeal,
                  text: `Life Steal +${actualHeal}`,
                })
              );
            }
          }
        }

        if (target.hp === 0) {
          const revived = resolveDeath(
            target,
            newEvents
          );

          if (revived) {
            addFloat(
              target.uid,
              "REVIVED!",
              "#FFD54F"
            );

            pushLog("REVIVED");
          }
        } else {
          const {
            burstDamage,
            events: hitEvents,
          } = resolveOnHitEffects(
            act,
            target,
            jutsu
          );

          newEvents.push(...hitEvents);

          if (burstDamage > 0) {
            target.hp = Math.max(
              0,
              target.hp - burstDamage
            );

            addFloat(
              target.uid,
              `MARK -${burstDamage}`,
              "#E040FB"
            );

            if (target.hp === 0) {
              const revived = resolveDeath(
                target,
                newEvents
              );

              if (revived) {
                addFloat(
                  target.uid,
                  "REVIVED!",
                  "#FFD54F"
                );

                pushLog("REVIVED");
              }
            }
          }
        }
      };

      // ---------- ATTACK ----------
      if (jutsu.type === "attack") {
        const t = arr.find(
          (c) => c.uid === targetUid
        );

        if (t) {
          newEvents.push(
            makeEvent("ATTACK", {
              actorUid: act.uid,
              targetUid: t.uid,
              jutsuId: jutsu.id,
            })
          );

          applyDamage(t);
        }

        // Apply team buff effects (team_atk_up, team_def_up) to all allies
        _applyTeamBuffsFromOffensive(act, arr, jutsu, newEvents);
      }

      // ---------- AOE ----------
      else if (jutsu.type === "aoe") {
        const enemiesArr = arr.filter(
          (c) =>
            c.side !== act.side &&
            c.alive
        );

        newEvents.push(
          makeEvent("SKILL", {
            actorUid: act.uid,
            jutsuId: jutsu.id,
          })
        );

        enemiesArr.forEach(applyDamage);

        // Apply team buff effects (team_atk_up, team_def_up) to all allies
        _applyTeamBuffsFromOffensive(act, arr, jutsu, newEvents);
      }

      // ---------- HEAL ----------
      else if (jutsu.type === "heal") {
        const t = arr.find(
          (c) => c.uid === targetUid
        );

        if (t) {
          const healMult = act._synergyDamageBonuses?.healing_pct
            ? 1 + act._synergyDamageBonuses.healing_pct / 100
            : 1;
          const heal = Math.round(
            ((jutsu.power / 100) *
              act.atk +
              jutsu.power) * healMult
          );

          t.hp = Math.min(
            t.maxHp,
            t.hp + heal
          );

          addFloat(
            t.uid,
            `+${heal}`,
            "#00E676"
          );

          newEvents.push(
            makeEvent("HEAL", {
              actorUid: act.uid,
              targetUid: t.uid,
              value: heal,
            })
          );

          // Apply heal effects — ally buffs go to the healed ally,
          // enemy-targeted effects (freeze, stun, etc.) go to a random enemy
          if (jutsu.effects?.length) {
            const allyEffects = jutsu.effects.filter(
              (e) => !["stun", "freeze", "burn", "poison", "bleed", "atk_down", "def_down", "shock", "dispel"].includes(e.type)
            );
            const enemyEffects = jutsu.effects.filter(
              (e) => ["stun", "freeze", "burn", "poison", "bleed", "atk_down", "def_down", "shock", "dispel"].includes(e.type)
            );
            if (allyEffects.length) {
              t.statuses = t.statuses || [];
              const effEvents = applyJutsuEffects(act, t, { ...jutsu, effects: allyEffects });
              newEvents.push(...effEvents);
            }
            if (enemyEffects.length) {
              const enemies = arr.filter((c) => c.side !== act.side && c.alive);
              if (enemies.length) {
                const enemy = enemies[Math.floor(Math.random() * enemies.length)];
                const effEvents = applyJutsuEffects(act, enemy, { ...jutsu, effects: enemyEffects });
                newEvents.push(...effEvents);
              }
            }
          }
        }
      }

      // ---------- SHIELD ----------
      else if (jutsu.type === "shield") {
        const t = arr.find(
          (c) => c.uid === targetUid
        );

        if (t) {
          const sh = Math.round(
            (jutsu.power || 100) / 100 * act.def * 2.5 + 150
          );

          t.shield += sh;
          t.statuses = t.statuses || [];

          addFloat(t.uid, "SHIELD", "#29B6F6");
          newEvents.push(
            makeEvent("SHIELD_APPLIED", {
              actorUid: act.uid,
              targetUid: t.uid,
              value: sh,
            })
          );

          // Apply shield skill effects (regen, immunity, cleanse, etc.)
          if (jutsu.effects?.length) {
            const effEvents = applyJutsuEffects(act, t, jutsu);
            newEvents.push(...effEvents);
          }
        }
      }

      // ---------- AOE HEAL ----------
      else if (jutsu.type === "aoe_heal") {
        const allies = arr.filter((c) => c.side === act.side && c.alive);
        newEvents.push(makeEvent("SKILL", { actorUid: act.uid, jutsuId: jutsu.id }));
        allies.forEach((ally) => {
          const healMult = act._synergyDamageBonuses?.healing_pct
            ? 1 + act._synergyDamageBonuses.healing_pct / 100
            : 1;
          const heal = Math.round(((jutsu.power || 100) / 100 * act.atk + (jutsu.power || 100)) * healMult);
          ally.hp = Math.min(ally.maxHp, ally.hp + heal);
          addFloat(ally.uid, `+${heal}`, "#00E676");
          newEvents.push(makeEvent("HEAL", { actorUid: act.uid, targetUid: ally.uid, value: heal }));
          // Apply heal effects (regen, cleanse, immunity, team buffs) to each ally
          if (jutsu.effects?.length) {
            ally.statuses = ally.statuses || [];
            const effEvents = applyJutsuEffects(act, ally, jutsu);
            newEvents.push(...effEvents);
          }
        });
      }

      // ---------- REVIVE ----------
      else if (jutsu.type === "revive") {
        const deadAlly = arr.find((c) => c.side === act.side && !c.alive);
        if (deadAlly) {
          const hpPct = jutsu.effects?.find((e) => e.type === "revive_ally")?.hp_pct || 30;
          deadAlly.hp = Math.max(1, Math.round(deadAlly.maxHp * hpPct / 100));
          deadAlly.alive = true;
          deadAlly.shield = 0;
          deadAlly.statuses = [];
          addFloat(deadAlly.uid, "REVIVED!", "#FFD54F");
          pushLog(`${deadAlly.name} revived!`);
          newEvents.push(makeEvent("REVIVAL", { targetUid: deadAlly.uid, text: `${deadAlly.name} rises again!` }));
          // Apply revive effects (team buffs, immunity, regen) to allies
          if (jutsu.effects?.length) {
            const allies = arr.filter((c) => c.side === act.side && c.alive);
            allies.forEach((ally) => {
              ally.statuses = ally.statuses || [];
              const effEvents = applyJutsuEffects(act, ally, jutsu);
              newEvents.push(...effEvents);
            });
          }
        }
      }

      // ---------- TAUNT ----------
      else if (jutsu.type === "taunt") {
        act.statuses = act.statuses || [];
        // Separate self-buff effects from enemy-targeted CC effects.
        // CC effects (stun, freeze) on taunt skills should hit a random
        // enemy, not the caster.
        const selfEffects = (jutsu.effects || []).filter(
          (e) => !["stun", "freeze"].includes(e.type)
        );
        const ccEffects = (jutsu.effects || []).filter(
          (e) => ["stun", "freeze"].includes(e.type)
        );

        // Apply self-buff effects (taunt, def_up, regen, etc.)
        if (selfEffects.length) {
          const selfJutsu = { ...jutsu, effects: selfEffects };
          const effEvents = applyJutsuEffects(act, act, selfJutsu);
          newEvents.push(...effEvents);
        }

        // Apply CC effects to a random alive enemy
        if (ccEffects.length) {
          const enemies = arr.filter(
            (c) => c.side !== act.side && c.alive
          );
          if (enemies.length) {
            const target = enemies[Math.floor(Math.random() * enemies.length)];
            const ccJutsu = { ...jutsu, effects: ccEffects };
            const ccEvents = applyJutsuEffects(act, target, ccJutsu);
            newEvents.push(...ccEvents);
          }
        }

        addFloat(act.uid, "TAUNT!", "#FF5722");
        pushLog(`${act.name} taunts all enemies!`);
        newEvents.push(makeEvent("BUFF_APPLIED", { actorUid: act.uid, targetUid: act.uid, text: "Taunt!" }));
      }

      // ---------- TEAM BUFF ----------
      else if (jutsu.type === "team_buff") {
        const allies = arr.filter((c) => c.side === act.side && c.alive);
        newEvents.push(makeEvent("SKILL", { actorUid: act.uid, jutsuId: jutsu.id }));
        allies.forEach((ally) => {
          ally.statuses = ally.statuses || [];
          if (jutsu.effects?.length) {
            const effEvents = applyJutsuEffects(act, ally, jutsu);
            newEvents.push(...effEvents);
          }
        });
        addFloat(act.uid, "TEAM BUFF!", "#00E5FF");
      }

      // ---------- CLEANSE ----------
      else if (jutsu.type === "cleanse") {
        const t = arr.find((c) => c.uid === targetUid);
        if (t) {
          t.statuses = t.statuses || [];
          if (jutsu.effects?.length) {
            const effEvents = applyJutsuEffects(act, t, jutsu);
            newEvents.push(...effEvents);
          }
          addFloat(t.uid, "CLEANSED!", "#00E676");
        }
      }

      // ---------- BOSS PHASES ----------

      const bossEvents =
        checkBossPhaseTransitions(
          arr,
          bossMechanics
        );

      bossEvents.forEach((e) => {
        newEvents.push(e);

        // Keep only major boss event text.
        if (e.text) {
          pushLog(e.text);
        }
      });

      // ---------- FLOATERS ----------

      setFloaters((f) => [
        ...f,
        ...newFloaters,
      ]);

      newFloaters.forEach((nf) => {
        setTimeout(
          () =>
            setFloaters((f) =>
              f.filter(
                (x) => x.id !== nf.id
              )
            ),
          ms(750)
        );
      });

      pushEvents(newEvents);

      setCombs(arr);

      // ---------- ULTIMATE ----------

      if (
        isUltimate &&
        cinemaRef.current
      ) {
        setUltimateData({
          key: actionCounterRef.current,
          actorName: actor.name,
          jutsuName: jutsu.name,
          element: actor.element,
          portrait: actor.portrait,
        });

        setTimeout(
          () => advance(arr),
          ms(1200)
        );
      } else {
        advance(arr);
      }
    },
    [
      advantage,
      advance,
      bossMechanics,
      ms,
      playSfx,
    ]
  );

  // ---------- ENEMY AI ----------

  useEffect(() => {
    if (phase !== "enemy") return;

    const t = setTimeout(() => {
      const arr = combRef.current;

      const actor = arr.find(
        (c) => c.uid === activeUid
      );

      if (!actor || !actor.alive) {
        advance(arr);
        return;
      }

      if (actionLockRef.current) return;

      const { jutsu, targetUid } =
        pickAiAction(actor, arr);

      applyAction(
        actor,
        jutsu,
        targetUid
      );
    }, ms(550));

    return () => clearTimeout(t);
  }, [
    phase,
    activeUid,
    advance,
    applyAction,
    ms,
  ]);

  // ---------- AUTO BATTLE ----------

  useEffect(() => {
    if (
      phase !== "select" ||
      !auto
    ) {
      return;
    }

    const t = setTimeout(() => {
      if (actionLockRef.current) return;

      const arr = combRef.current;

      const actor = arr.find(
        (c) => c.uid === activeUid
      );

      if (!actor || !actor.alive) return;

      const { jutsu, targetUid } =
        pickAiAction(actor, arr);

      applyAction(
        actor,
        jutsu,
        targetUid
      );
    }, ms(450));

    return () => clearTimeout(t);
  }, [
    phase,
    activeUid,
    auto,
    applyAction,
    ms,
  ]);

  // ---------- REPORT RESULT ----------

  useEffect(() => {
    if (
      (phase === "win" ||
        phase === "lose") &&
      !reportedRef.current
    ) {
      reportedRef.current = true;

      playSfx(
        phase === "win"
          ? "win"
          : "lose"
      );

      pushEvents([
        makeEvent(
          phase === "win"
            ? "VICTORY"
            : "DEFEAT",
          {}
        ),
      ]);

      const allyCombs =
        combRef.current.filter(
          (c) => c.side === "ally"
        );

      const participants =
        allyCombs
          .map((c) => c.instanceId)
          .filter(Boolean);

      const survivors =
        allyCombs
          .filter((c) => c.alive)
          .map((c) => c.instanceId)
          .filter(Boolean);

      const result =
        phase === "win"
          ? "win"
          : "lose";

      const reqs = {
        campaign: [
          "/game/battle/complete",
          {
            stage_id: id,
            result,
            participants,
            survivors,
          },
        ],

        spire: [
          "/game/spire/complete",
          {
            floor,
            result,
            participants,
            survivors,
          },
        ],

        trial: [
          "/game/trial/complete",
          {
            trial_id: id,
            result,
            participants,
            survivors,
          },
        ],

        tsukuyomi: [
          "/game/tsukuyomi/complete",
          {
            boss_id:
              tsukuFight?.boss?.id,
            difficulty:
              tsukuFight?.difficulty,
            result,
            participants,
            survivors,
          },
        ],

        arena: [
          "/arena/battle/complete",
          {
            opponent_user_id:
              arenaOpponent?.user_id,
            result,
            participants,
            survivors,
          },
        ],

        bosshunt: [
          "/game/boss-hunt/complete",
          {
            boss_id: bossHuntFight?.boss_id,
            result,
            participants,
            survivors,
          },
        ],
      };

      const [url, body] =
        reqs[mode] ||
        reqs.campaign;

      api
        .post(url, body)
        .then(({ data }) => {
          if (data.profile) {
            setUser(data.profile);
          }

          setResultData(data);

          if (data.level_up) {
            setTimeout(
              () =>
                setShowLevelUp(true),
              4200
            );
          }
        })
        .catch(() =>
          setResultData({
            result: phase,
          })
        );
    }
  }, [
    phase,
    playSfx,
    id,
    floor,
    mode,
    arenaOpponent,
    tsukuFight,
    setUser,
  ]);

  // ---------- PLAYER INPUT ----------

  const onJutsuClick = (jutsu) => {
    if (
      actionLockRef.current ||
      phase !== "select" ||
      auto
    ) {
      return;
    }

    const actor =
      combRef.current.find(
        (c) => c.uid === activeUid
      );

    if (
      !actor ||
      jutsu.chakra_cost >
        actor.chakra
    ) {
      return;
    }

    if (jutsu.type === "aoe") {
      applyAction(
        actor,
        jutsu,
        null
      );
    } else {
      setTargeting(jutsu);
    }
  };

  const onTargetClick = (target) => {
    if (
      actionLockRef.current ||
      phase !== "select" ||
      auto ||
      !targeting
    ) {
      return;
    }

    const valid =
      targeting.type === "heal" ||
      targeting.type === "shield"
        ? target.side === "ally"
        : target.side === "enemy";

    if (!valid || !target.alive) {
      return;
    }

    const actor =
      combRef.current.find(
        (c) => c.uid === activeUid
      );

    setTargeting(null);

    applyAction(
      actor,
      targeting,
      target.uid
    );
  };

  if (!ready) {
    return (
      <div className="p-10 text-center text-slate-400">
        Battle not found.
      </div>
    );
  }

  const allies = combs.filter(
    (c) => c.side === "ally"
  );

  const enemies = combs.filter(
    (c) => c.side === "enemy"
  );

  const activeActor =
    combs.find(
      (c) => c.uid === activeUid
    );

  const isValidTarget = (c) =>
    targeting &&
    !auto &&
    phase === "select" &&
    c.alive &&
    (
      targeting.type === "heal" ||
      targeting.type === "shield"
        ? c.side === "ally"
        : c.side === "enemy"
    );

  const dominantElement =
    enemies[0]?.element || "Dark";

  return (
    <div
      className={`fixed inset-0 overflow-hidden ${
        screenShake
          ? "screen-shake"
          : ""
      }`}
      data-testid="battle-page"
    >
      {/* Cinematic battlefield */}
      <BattlefieldEnv
        element={dominantElement}
        region={
          mode === "campaign"
            ? stage?.region
            : null
        }
      />

      {/* Battle entry */}
      {cinema && (
        <BattleEntry
          title={title}
          chapter={
            mode === "campaign"
              ? `CHAPTER ${
                  stage?.chapter || "I"
                }`
              : mode === "spire"
              ? `FLOOR ${floor}`
              : mode.toUpperCase()
          }
          onDone={() =>
            setIntroDone(true)
          }
        />
      )}

      {/* Attack effects */}
      {cinema && (
        <BattleAttackFx
          action={cinematicAction}
          onShake={(strength) => {
            setScreenShake(true);

            setTimeout(
              () =>
                setScreenShake(false),
              strength === "strong"
                ? 500
                : 400
            );
          }}
        />
      )}

      {/* Ultimate cinematic */}
      {cinema && (
        <BattleUltimate
          data={ultimateData}
          onDone={() =>
            setUltimateData(null)
          }
        />
      )}

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 glass border-b border-white/10 px-4 py-1.5 flex items-center justify-between">
        <button
          onClick={() =>
            navigate(backTo)
          }
          data-testid="battle-exit"
          className="text-slate-400 hover:text-white text-sm font-semibold"
        >
          ← Retreat
        </button>

        <div className="text-center">
          <div className="font-display text-lg tracking-widest text-white leading-none truncate max-w-[45vw]">
            {title}
          </div>

          <div className="text-[10px] text-chakra font-semibold">
            ROUND {round}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={cycleSpeed}
            data-testid="battle-speed-toggle"
            title="Battle speed"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-display tracking-wide border border-white/15 text-slate-300 hover:text-white hover:border-white/30 transition-colors"
          >
            <Gauge className="w-3.5 h-3.5" />
            {speed}X
          </button>

          <button
            onClick={() =>
              setAuto(!auto)
            }
            data-testid="battle-auto-toggle"
            title="Auto-battle"
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-display tracking-wide border transition-colors ${
              auto
                ? "border-chakra text-chakra bg-cyan-500/15"
                : "border-white/15 text-slate-300 hover:text-white hover:border-white/30"
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            AUTO
          </button>

          <button
            onClick={() =>
              setCinema(!cinema)
            }
            title={
              cinema
                ? "Cinematics on"
                : "Cinematics off"
            }
            className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-display tracking-wide border transition-colors ${
              cinema
                ? "border-violet-400/50 text-violet-300 bg-violet-500/10"
                : "border-white/15 text-slate-400 hover:text-white"
            }`}
          >
            <Film className="w-3.5 h-3.5" />
          </button>

          <button
            title="Settings"
            className="flex items-center px-2 py-1.5 rounded-lg border border-white/15 text-slate-300 hover:text-white hover:border-white/30 transition-colors"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Battlefield */}
      <div className="absolute inset-0 z-10 flex pt-10 pb-36">
        {/* Turn order */}
        <BattleTurnOrder
          combs={combs}
          order={orderRef.current}
          ptr={ptrRef.current}
          className="hidden lg:flex"
        />

        {/* Center battlefield */}
        <div className="flex-1 flex flex-col justify-center min-w-0">
          {/* Enemies */}
          <div className="flex justify-center gap-3 sm:gap-5 px-4 mb-3">
            {enemies.map((c) => (
              <BattleFighter
                key={c.uid}
                c={c}
                active={
                  c.uid === activeUid
                }
                attacking={
                  c.uid === attackingUid
                }
                shake={
                  shakeUid === c.uid
                }
                floaters={floaters.filter(
                  (f) => f.uid === c.uid
                )}
                highlight={isValidTarget(c)}
                onClick={() =>
                  onTargetClick(c)
                }
                flip
                subdued
              />
            ))}
          </div>

          {/* Minimal turn indicator */}
          <div className="text-center my-2">
            {phase === "select" &&
              activeActor &&
              !auto && (
                <div className="inline-flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-widest text-chakra font-bold">
                    YOUR TURN
                  </span>
                </div>
              )}

            {phase === "enemy" &&
              activeActor && (
                <div className="inline-flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-widest text-fox font-bold">
                    ENEMY TURN
                  </span>
                </div>
              )}

            {phase === "intro" && (
              <span className="font-display text-2xl tracking-widest text-white animate-pulse">
                BATTLE START!
              </span>
            )}
          </div>

          {/* Allies */}
          <div className="flex justify-center gap-3 sm:gap-5 px-4 mt-3">
            {allies.map((c) => (
              <BattleFighter
                key={c.uid}
                c={c}
                active={
                  c.uid === activeUid
                }
                attacking={
                  c.uid === attackingUid
                }
                shake={
                  shakeUid === c.uid
                }
                floaters={floaters.filter(
                  (f) => f.uid === c.uid
                )}
                highlight={isValidTarget(c)}
                onClick={() =>
                  onTargetClick(c)
                }
              />
            ))}
          </div>
        </div>

        {/* Battle info — now contains only meaningful events */}
        <BattleInfoPanel
          log={log}
          enemies={enemies}
          className="hidden lg:flex"
        />
      </div>

      {/* Commands */}
      <BattleCommandPanel
        activeActor={activeActor}
        phase={phase}
        targeting={targeting}
        auto={auto}
        onJutsuClick={onJutsuClick}
      />

      {/* Victory / defeat */}
      <BattleVictory
        open={
          phase === "win" ||
          phase === "lose"
        }
        result={resultData}
        mode={mode}
        floor={floor}
        isWin={phase === "win"}
        onBack={() =>
          navigate(backTo)
        }
        onNext={
          mode === "spire"
            ? () =>
                window.location.assign(
                  `/battle/spire/${
                    floor + 1
                  }`
                )
            : mode === "trial"
            ? () =>
                window.location.reload()
            : mode === "arena"
            ? () =>
                navigate("/arena")
            : mode === "tsukuyomi"
            ? () =>
                navigate("/tsukuyomi")
            : mode === "bosshunt"
            ? () =>
                navigate("/boss-hunt")
            : () => {
                const idx =
                  stages.findIndex(
                    (s) => s.id === id
                  );

                const next =
                  idx >= 0 &&
                  idx <
                    stages.length - 1
                    ? stages[idx + 1]
                    : null;

                if (next) {
                  window.location.assign(
                    `/battle/campaign/${next.id}`
                  );
                } else {
                  window.location.assign(
                    "/campaign"
                  );
                }
              }
        }
        onLobby={() =>
          navigate("/")
        }
        onRetry={() =>
          window.location.reload()
        }
      />

      <LevelUpOverlay
        open={showLevelUp}
        data={
          resultData?.level_up
        }
        onClose={() =>
          setShowLevelUp(false)
        }
      />
    </div>
  );
}
