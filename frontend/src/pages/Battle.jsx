import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Zap, Coins, Trophy, Skull, ArrowRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useGame } from "@/context/GameContext";
import { buildCombatant, buildOrder, rollDamage, spireEnemies } from "@/lib/battle";
import { ELEMENT, RARITY } from "@/lib/styles";
import api from "@/lib/api";

let _uid = 0;
const nextUid = () => `c${_uid++}`;

export default function Battle() {
  const { mode = "campaign", id } = useParams();
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  const { catalogById, advantage, stages, items, trials, catalog } = useGame();

  // Arena opponents are ephemeral (frozen snapshots) — stashed in
  // sessionStorage by the Arena page right before navigating in here, since
  // there's no persistent "battle session" on the server for async PvP.
  const arenaOpponent = mode === "arena" ? JSON.parse(sessionStorage.getItem("arena_opponent") || "null") : null;

  // Resolve the battle definition from the route mode.
  const floor = mode === "spire" ? parseInt(id, 10) : null;
  const stage = mode === "campaign" ? stages.find((s) => s.id === id) : null;
  const trial = mode === "trial" ? trials.find((t) => t.id === id) : null;
  const enemiesDef =
    mode === "spire" ? (catalog.length ? spireEnemies(floor, catalog) : [])
    : mode === "trial" ? (trial?.enemies || [])
    : mode === "arena" ? (arenaOpponent?.team || [])
    : (stage?.enemies || []);
  const title =
    mode === "spire" ? `SPIRE · FLOOR ${floor}`
    : mode === "trial" ? (trial?.name || "TRIAL")
    : mode === "arena" ? `ARENA · vs ${arenaOpponent?.name || "???"}`
    : (stage?.name || "BATTLE");
  const ready =
    mode === "spire" ? !!floor && catalog.length > 0
    : mode === "trial" ? !!trial
    : mode === "arena" ? !!arenaOpponent && Object.keys(catalogById).length > 0
    : !!stage;
  const backTo = mode === "campaign" ? "/campaign" : mode === "arena" ? "/arena" : "/spire";

  const [combs, setCombsState] = useState([]);
  const [activeUid, setActiveUid] = useState(null);
  const [phase, setPhase] = useState("intro"); // intro | select | enemy | busy | win | lose
  const [targeting, setTargeting] = useState(null); // jutsu being aimed
  const [log, setLog] = useState([]);
  const [round, setRound] = useState(1);
  const [floaters, setFloaters] = useState([]); // {id, uid, text, color}
  const [resultData, setResultData] = useState(null);
  const [shakeUid, setShakeUid] = useState(null);

  const combRef = useRef([]);
  const orderRef = useRef([]);
  const ptrRef = useRef(0);
  const reportedRef = useRef(false);

  const setCombs = (next) => { combRef.current = next; setCombsState(next); };
  const pushLog = (msg) => setLog((l) => [msg, ...l].slice(0, 30));

  // ---------- init ----------
  useEffect(() => {
    if (!ready || !user || Object.keys(catalogById).length === 0) return;
    const allies = (user.team || [])
      .map((tid) => user.ninjas.find((n) => n.instance_id === tid))
      .filter(Boolean)
      .map((inst) => buildCombatant(nextUid(), "ally", catalogById[inst.template_id], inst.level, inst.ascension || 0, inst.instance_id));
    const enemies = enemiesDef.map((e) => buildCombatant(nextUid(), "enemy", catalogById[e.template_id], e.level, e.ascension || 0));
    const all = [...allies, ...enemies];
    setCombs(all);
    orderRef.current = buildOrder(all);
    ptrRef.current = 0;
    setPhase("intro");
    const t = setTimeout(() => beginTurnAt(0, all, buildOrder(all)), 1600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, id, catalogById]);

  const aliveSide = (arr, side) => arr.some((c) => c.side === side && c.alive);

  const beginTurnAt = useCallback((ptr, arr, order) => {
    if (!aliveSide(arr, "ally")) { setPhase("lose"); return; }
    if (!aliveSide(arr, "enemy")) { setPhase("win"); return; }

    let p = ptr;
    let ord = order;
    // skip dead actors
    while (p < ord.length && !arr.find((c) => c.uid === ord[p])?.alive) p++;
    if (p >= ord.length) {
      ord = buildOrder(arr);
      p = 0;
      setRound((r) => r + 1);
    }
    orderRef.current = ord;
    ptrRef.current = p;
    const actor = arr.find((c) => c.uid === ord[p]);

    // chakra regen at start of turn
    const regen = arr.map((c) => c.uid === actor.uid ? { ...c, chakra: Math.min(c.maxChakra, c.chakra + 20) } : c);
    setCombs(regen);
    setActiveUid(actor.uid);
    setTargeting(null);
    if (actor.side === "ally") setPhase("select");
    else setPhase("enemy");
  }, []);

  const advance = useCallback((arr) => {
    setTimeout(() => beginTurnAt(ptrRef.current + 1, arr, orderRef.current), 650);
  }, [beginTurnAt]);

  // ---------- apply an action ----------
  const applyAction = useCallback((actor, jutsu, targetUid) => {
    setPhase("busy");
    let arr = combRef.current.map((c) => ({ ...c }));
    const act = arr.find((c) => c.uid === actor.uid);
    // pay / gain chakra
    act.chakra = Math.max(0, act.chakra - jutsu.chakra_cost + (jutsu.chakra_gain || 0));
    act.chakra = Math.min(act.maxChakra, act.chakra);

    const newFloaters = [];
    const addFloat = (uid, text, color) => newFloaters.push({ id: `${Date.now()}-${uid}-${Math.random()}`, uid, text, color });

    const applyDamage = (target) => {
      const { dmg, crit, mult } = rollDamage(act, target, jutsu, advantage);
      let remaining = dmg;
      if (target.shield > 0) {
        const absorbed = Math.min(target.shield, remaining);
        target.shield -= absorbed;
        remaining -= absorbed;
      }
      target.hp = Math.max(0, target.hp - remaining);
      if (target.hp === 0) target.alive = false;
      const color = mult > 1 ? "#FFCA28" : mult < 1 ? "#94A3B8" : "#FF1744";
      addFloat(target.uid, `${crit ? "CRIT " : ""}-${dmg}`, color);
      setShakeUid(target.uid);
      setTimeout(() => setShakeUid(null), 400);
    };

    if (jutsu.type === "attack") {
      const t = arr.find((c) => c.uid === targetUid);
      applyDamage(t);
      pushLog(`${act.name} used ${jutsu.name} on ${t.name}.`);
    } else if (jutsu.type === "aoe") {
      const enemies = arr.filter((c) => c.side !== act.side && c.alive);
      enemies.forEach(applyDamage);
      pushLog(`${act.name} unleashed ${jutsu.name}!`);
    } else if (jutsu.type === "heal") {
      const t = arr.find((c) => c.uid === targetUid);
      const heal = Math.round((jutsu.power / 100) * act.atk + jutsu.power);
      t.hp = Math.min(t.maxHp, t.hp + heal);
      addFloat(t.uid, `+${heal}`, "#00E676");
      pushLog(`${act.name} healed ${t.name} with ${jutsu.name}.`);
    } else if (jutsu.type === "shield") {
      const t = arr.find((c) => c.uid === targetUid);
      const sh = Math.round(act.def * 2.5 + 150);
      t.shield += sh;
      addFloat(t.uid, `SHIELD`, "#29B6F6");
      pushLog(`${act.name} shielded ${t.name}.`);
    }

    setFloaters((f) => [...f, ...newFloaters]);
    newFloaters.forEach((nf) => setTimeout(() => setFloaters((f) => f.filter((x) => x.id !== nf.id)), 950));

    setCombs(arr);
    advance(arr);
  }, [advantage, advance]);

  // ---------- enemy AI ----------
  useEffect(() => {
    if (phase !== "enemy") return;
    const t = setTimeout(() => {
      const arr = combRef.current;
      const actor = arr.find((c) => c.uid === activeUid);
      if (!actor || !actor.alive) { advance(arr); return; }
      const enemies = arr.filter((c) => c.side !== actor.side && c.alive);
      const allies = arr.filter((c) => c.side === actor.side && c.alive);

      const affordable = actor.jutsus.filter((j) => j.chakra_cost <= actor.chakra);
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
          // target lowest hp enemy
          targetUid = [...enemies].sort((a, b) => a.hp - b.hp)[0]?.uid;
        }
        if (jutsu.type === "aoe") targetUid = null;
      }
      applyAction(actor, jutsu, targetUid);
    }, 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, activeUid]);

  // ---------- report result ----------
  useEffect(() => {
    if ((phase === "win" || phase === "lose") && !reportedRef.current) {
      reportedRef.current = true;
      const allyCombs = combRef.current.filter((c) => c.side === "ally");
      const participants = allyCombs.map((c) => c.instanceId).filter(Boolean);
      const survivors = allyCombs.filter((c) => c.alive).map((c) => c.instanceId).filter(Boolean);
      const result = phase === "win" ? "win" : "lose";
      const reqs = {
        campaign: ["/game/battle/complete", { stage_id: id, result, participants, survivors }],
        spire: ["/game/spire/complete", { floor, result, participants, survivors }],
        trial: ["/game/trial/complete", { trial_id: id, result, participants, survivors }],
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // ---------- player input ----------
  const onJutsuClick = (jutsu) => {
    const actor = combRef.current.find((c) => c.uid === activeUid);
    if (!actor || jutsu.chakra_cost > actor.chakra) return;
    if (jutsu.type === "aoe") {
      applyAction(actor, jutsu, null);
    } else {
      setTargeting(jutsu);
    }
  };

  const onTargetClick = (target) => {
    if (!targeting) return;
    const valid = (targeting.type === "heal" || targeting.type === "shield")
      ? target.side === "ally" : target.side === "enemy";
    if (!valid || !target.alive) return;
    const actor = combRef.current.find((c) => c.uid === activeUid);
    applyAction(actor, targeting, target.uid);
  };

  if (!ready) return <div className="p-10 text-center text-slate-400">Battle not found.</div>;

  const allies = combs.filter((c) => c.side === "ally");
  const enemies = combs.filter((c) => c.side === "enemy");
  const activeActor = combs.find((c) => c.uid === activeUid);
  const isValidTarget = (c) => targeting && c.alive && ((targeting.type === "heal" || targeting.type === "shield") ? c.side === "ally" : c.side === "enemy");

  return (
    <div className="fixed inset-0 overflow-hidden" data-testid="battle-page">
      <img src="/art/battle-bg.png" alt="" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-[#05050A]/55" />

      {/* top bar: round + log */}
      <div className="absolute top-0 left-0 right-0 z-20 glass border-b border-white/10 px-4 py-2 flex items-center justify-between">
        <button onClick={() => navigate(backTo)} data-testid="battle-exit" className="text-slate-400 hover:text-white text-sm">← Retreat</button>
        <div className="text-center">
          <div className="font-display text-xl tracking-widest text-white leading-none truncate max-w-[60vw]">{title}</div>
          <div className="text-[11px] text-chakra">ROUND {round}</div>
        </div>
        <span className="text-xs text-slate-400 truncate max-w-[28%] text-right">{log[0]}</span>
      </div>

      {/* battlefield */}
      <div className="absolute inset-0 z-10 flex flex-col justify-center pt-14 pb-56">
        {/* enemies top */}
        <div className="flex justify-center gap-3 sm:gap-6 px-4 mb-6">
          {enemies.map((c) => (
            <Fighter key={c.uid} c={c} active={c.uid === activeUid} shake={shakeUid === c.uid}
              floaters={floaters.filter((f) => f.uid === c.uid)} highlight={isValidTarget(c)}
              onClick={() => onTargetClick(c)} flip />
          ))}
        </div>
        <div className="text-center font-display text-3xl text-white/20 tracking-[0.5em] my-2">VS</div>
        {/* allies bottom */}
        <div className="flex justify-center gap-3 sm:gap-6 px-4 mt-6">
          {allies.map((c) => (
            <Fighter key={c.uid} c={c} active={c.uid === activeUid} shake={shakeUid === c.uid}
              floaters={floaters.filter((f) => f.uid === c.uid)} highlight={isValidTarget(c)}
              onClick={() => onTargetClick(c)} />
          ))}
        </div>
      </div>

      {/* command HUD */}
      <div className="absolute bottom-0 left-0 right-0 z-20 glass border-t border-cyan-500/40 p-4 min-h-[140px]">
        <div className="max-w-3xl mx-auto">
          {phase === "select" && activeActor && (
            <div data-testid="command-panel">
              <div className="flex items-center gap-2 mb-3">
                <img src={activeActor.portrait} alt="" className="w-9 h-9 rounded object-cover object-top active-turn" />
                <span className="font-display text-2xl text-white tracking-wide">{activeActor.name}</span>
                <span className="text-xs text-chakra ml-auto">{targeting ? "▶ Select a target" : "Choose a jutsu"}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {activeActor.jutsus.map((j) => {
                  const usable = j.chakra_cost <= activeActor.chakra;
                  const aimed = targeting?.id === j.id;
                  return (
                    <button
                      key={j.id}
                      onClick={() => onJutsuClick(j)}
                      disabled={!usable}
                      data-testid={`jutsu-${j.id}`}
                      className={`text-left p-2.5 rounded-lg border transition-all ${
                        aimed ? "border-chakra bg-cyan-500/15" : "border-white/10 hover:border-white/30"
                      } ${!usable ? "opacity-40" : "bg-black/30"}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-white text-sm">{j.name}</span>
                        {j.chakra_cost > 0 ? <span className="text-[10px] text-chakra flex items-center gap-0.5"><Zap className="w-3 h-3" />{j.chakra_cost}</span>
                          : <span className="text-[10px] text-emerald-400">+{j.chakra_gain}</span>}
                      </div>
                      <p className="text-[11px] text-slate-400 leading-tight line-clamp-2">{j.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {(phase === "enemy" || phase === "busy" || phase === "intro") && (
            <div className="flex items-center justify-center h-full min-h-[108px]">
              <span className="font-display text-2xl tracking-widest text-slate-400 animate-pulse">
                {phase === "intro" ? "BATTLE START!" : phase === "enemy" ? "ENEMY TURN…" : "…"}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* result overlay */}
      <AnimatePresence>
        {(phase === "win" || phase === "lose") && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="absolute inset-0 z-30 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            data-testid="battle-result"
          >
            <motion.div initial={{ scale: 0.7, y: 30 }} animate={{ scale: 1, y: 0 }} className="panel rounded-2xl p-8 text-center max-w-sm w-full">
              {phase === "win" ? <Trophy className="w-16 h-16 text-amber-400 mx-auto" /> : <Skull className="w-16 h-16 text-fox mx-auto" />}
              <h2 className="font-display text-6xl tracking-wide mt-3" style={{ color: phase === "win" ? "#FFCA28" : "#FF5722" }}>
                {phase === "win" ? "VICTORY" : "DEFEAT"}
              </h2>
              {resultData?.rewards && phase === "win" && (
                <div className="mt-4 space-y-1 text-slate-300">
                  <p className="flex items-center justify-center gap-2"><Coins className="w-4 h-4 text-amber-400" /> +{resultData.rewards.ryo} Ryo</p>
                  {resultData.rewards.exp != null && (
                    <p className="flex items-center justify-center gap-2"><Zap className="w-4 h-4 text-chakra" /> +{resultData.rewards.exp} Account EXP</p>
                  )}
                  {resultData.rewards.hero_exp?.length > 0 && (
                    <div className="text-xs text-slate-400 pt-1" data-testid="reward-hero-exp">
                      {resultData.rewards.hero_exp.map((h) => (
                        <span key={h.instance_id} className="inline-block mx-1">
                          {h.name.split(" ")[0]} +{h.exp}xp{h.levels > 0 && <span className="text-emerald-400"> (+{h.levels}Lv)</span>}
                        </span>
                      ))}
                    </div>
                  )}
                  {resultData.rewards.items && Object.keys(resultData.rewards.items).length > 0 && (
                    <div className="flex flex-wrap items-center justify-center gap-2 pt-2" data-testid="reward-items">
                      {Object.entries(resultData.rewards.items).map(([iid, qty]) => (
                        <span key={iid} className="text-xs px-2 py-1 rounded bg-white/10 text-white">
                          {items[iid]?.name || iid} ×{qty}
                        </span>
                      ))}
                    </div>
                  )}
                  {resultData.rewards.ninja && (
                    <p className="text-jutsu font-semibold mt-2" data-testid="reward-ninja">★ New ally recruited: {resultData.rewards.ninja.name}!</p>
                  )}
                </div>
              )}
              {phase === "win" && mode === "spire" && resultData?.advancing && (
                <p className="text-amber-300 font-semibold mt-2" data-testid="spire-advance">▲ Floor {floor} cleared — new height reached!</p>
              )}
              {phase === "win" && mode === "arena" && (
                <p className="text-emerald-400 font-semibold mt-2" data-testid="arena-rating-gain">+20 Arena Rating</p>
              )}
              {phase === "lose" && mode === "arena" && (
                <p className="text-slate-400 mt-3" data-testid="arena-rating-loss">-12 Arena Rating. Train harder and try again.</p>
              )}
              {phase === "lose" && mode !== "arena" && <p className="text-slate-400 mt-3">Your squad was wiped out. Train harder and try again.</p>}
              <div className="flex gap-2 mt-6">
                <button onClick={() => navigate(backTo)} data-testid="result-back-btn" className="flex-1 py-3 rounded-lg font-display text-lg tracking-wide bg-white/10 text-white hover:bg-white/20 transition-colors">
                  {mode === "campaign" ? "CAMPAIGN" : mode === "arena" ? "ARENA" : "BACK"}
                </button>
                {phase === "win" ? (
                  mode === "spire" ? (
                    <button onClick={() => window.location.assign(`/battle/spire/${floor + 1}`)} data-testid="result-next-floor-btn" className="flex-1 py-3 rounded-lg font-display text-lg tracking-wide bg-chakra text-[#05050A] hover:bg-cyan-300 transition-colors flex items-center justify-center gap-1">
                      NEXT FLOOR <ArrowRight className="w-4 h-4" />
                    </button>
                  ) : mode === "trial" ? (
                    <button onClick={() => window.location.reload()} data-testid="result-again-btn" className="flex-1 py-3 rounded-lg font-display text-lg tracking-wide bg-chakra text-[#05050A] hover:bg-cyan-300 transition-colors">
                      FARM AGAIN
                    </button>
                  ) : mode === "arena" ? (
                    <button onClick={() => navigate("/arena")} data-testid="result-find-opponent-btn" className="flex-1 py-3 rounded-lg font-display text-lg tracking-wide bg-chakra text-[#05050A] hover:bg-cyan-300 transition-colors flex items-center justify-center gap-1">
                      FIND OPPONENT <ArrowRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button onClick={() => navigate("/")} data-testid="result-lobby-btn" className="flex-1 py-3 rounded-lg font-display text-lg tracking-wide bg-chakra text-[#05050A] hover:bg-cyan-300 transition-colors flex items-center justify-center gap-1">
                      LOBBY <ArrowRight className="w-4 h-4" />
                    </button>
                  )
                ) : (
                  <button onClick={() => window.location.reload()} data-testid="result-retry-btn" className="flex-1 py-3 rounded-lg font-display text-lg tracking-wide bg-fox text-white hover:bg-orange-600 transition-colors">
                    RETRY
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Fighter({ c, active, shake, floaters, highlight, onClick, flip }) {
  const hpPct = (c.hp / c.maxHp) * 100;
  const ckPct = (c.chakra / c.maxChakra) * 100;
  const el = ELEMENT[c.element] || {};
  return (
    <div className="relative flex flex-col items-center" style={{ width: 110 }}>
      {/* floaters */}
      <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
        {floaters.map((f) => (
          <div key={f.id} className="float-text font-display text-2xl whitespace-nowrap" style={{ color: f.color, textShadow: "0 2px 6px #000" }}>
            {f.text}
          </div>
        ))}
      </div>

      <button
        onClick={onClick}
        disabled={!highlight}
        data-testid={`fighter-${c.uid}`}
        className={`relative w-[92px] h-[120px] rounded-lg overflow-hidden border-2 transition-all ${shake ? "shake" : ""} ${
          highlight ? "border-fox cursor-crosshair ring-2 ring-fox animate-pulse" : "border-white/10"
        } ${!c.alive ? "grayscale opacity-40" : ""} ${active ? "active-turn" : ""}`}
        style={{ borderColor: active ? "#00E5FF" : highlight ? "#FF5722" : `${RARITY[c.rarity]?.color}66` }}
      >
        <img src={c.portrait} alt={c.name} className={`w-full h-full object-cover object-top ${flip ? "scale-x-[-1]" : ""}`} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        {!c.alive && <Skull className="absolute inset-0 m-auto w-8 h-8 text-white/70" />}
        <span className="absolute top-0.5 right-0.5 text-[9px] font-display text-white bg-black/50 px-1 rounded">Lv{c.level}</span>
      </button>

      <p className="text-[10px] text-white font-semibold mt-1 truncate w-full text-center" style={{ color: el.color }}>{c.name.split(" ")[0]}</p>
      {/* HP */}
      <div className="w-full h-2 rounded bg-black/60 overflow-hidden mt-0.5">
        <div className="h-full hp-bar-fill rounded" style={{ width: `${hpPct}%`, background: "linear-gradient(90deg,#FF1744,#FF8A80)" }} />
      </div>
      {c.shield > 0 && <span className="text-[9px] text-sky-300">🛡 {c.shield}</span>}
      {/* Chakra */}
      <div className="w-full h-1.5 rounded bg-black/60 overflow-hidden mt-0.5">
        <div className="h-full ck-bar-fill rounded" style={{ width: `${ckPct}%`, background: "#00E5FF" }} />
      </div>
    </div>
  );
}
