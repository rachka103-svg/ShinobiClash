import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Loader2, RefreshCw, Gift, Lock } from "lucide-react";
import { toast } from "sonner";
import api, { formatApiErrorDetail } from "@/lib/api";
import { RARITY } from "@/lib/styles";
import { rarityFrame, GOLD } from "@/lib/theme";
import { auraClass, RaritySparkles, RARITY_TIER, DecoCorners } from "@/components/RarityFx";

/**
 * NewbieSummonOverlay — the beginner ×10 summon with re-rolls.
 *
 * Flow: peek (resume) → optional Begin → reveal 10 cards → Keep / Retry.
 * The server holds the pending results in a session and only commits them
 * to the roster on "Keep", so re-rolling never wastes heroes. After the
 * reroll cap is reached the results lock and only Keep is offered.
 */
export default function NewbieSummonOverlay({ open, onClose, setUser }) {
  const [results, setResults] = useState(null);
  const [attempts, setAttempts] = useState(0);
  const [maxRolls, setMaxRolls] = useState(11);
  const [locked, setLocked] = useState(false);
  const [phase, setPhase] = useState("loading"); // loading | start | results | committing
  const [busy, setBusy] = useState(false);
  const [revealed, setRevealed] = useState(0);

  // On open, resume any in-progress session from the server.
  useEffect(() => {
    if (!open) return;
    let alive = true;
    setPhase("loading");
    setResults(null);
    setRevealed(0);
    (async () => {
      try {
        const { data } = await api.post("/game/summon/newbie", { action: "peek" });
        if (!alive) return;
        setAttempts(data.attempts);
        setMaxRolls(data.max_rolls);
        setLocked(data.locked);
        if (data.results && data.results.length) {
          setResults(data.results);
          setPhase("results");
        } else {
          setPhase("start");
        }
      } catch {
        if (alive) setPhase("start");
      }
    })();
    return () => { alive = false; };
  }, [open]);

  // Stagger card flip-in whenever a fresh result set arrives.
  useEffect(() => {
    if (phase !== "results" || !results) return;
    setRevealed(0);
    if (results.length === 0) return;
    const timers = [];
    for (let i = 0; i < results.length; i++) {
      timers.push(setTimeout(() => setRevealed((r) => Math.max(r, i + 1)), i === 0 ? 200 : 130 * i));
    }
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results, phase]);

  const roll = async () => {
    setBusy(true);
    try {
      const { data } = await api.post("/game/summon/newbie", { action: "roll" });
      setResults(data.results);
      setAttempts(data.attempts);
      setMaxRolls(data.max_rolls);
      setLocked(data.locked);
      setRevealed(0);
      setPhase("results");
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally { setBusy(false); }
  };

  const keep = async () => {
    setBusy(true);
    setPhase("committing");
    try {
      const { data } = await api.post("/game/summon/newbie", { action: "keep" });
      setUser(data.profile);
      toast.success("Heroes added to your roster!");
      setTimeout(() => onClose(), 600);
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
      setPhase("results");
    } finally { setBusy(false); }
  };

  const retriesLeft = Math.max(0, maxRolls - attempts);
  const hasResults = results && results.length > 0;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="newbie"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black/92 backdrop-blur-sm px-3 py-6 overflow-y-auto"
          data-testid="newbie-summon-overlay"
        >
          {/* heading */}
          <div className="text-center mb-3 shrink-0" data-testid="newbie-header">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-extrabold tracking-widest bg-emerald-500/15 text-emerald-300 border border-emerald-400/40">
              <Gift className="w-4 h-4" /> BEGINNER SUMMON · FREE ×10
            </span>
            <h2 className="font-display text-3xl sm:text-4xl tracking-wide text-white mt-2">New Player Rite</h2>
            <p className="text-xs text-slate-400 mt-1 max-w-md">
              Summon 10 heroes for free. Don't like the result? Re-roll — keep the set you love.
            </p>
          </div>

          {/* body */}
          {phase === "loading" && (
            <Loader2 className="w-8 h-8 animate-spin text-chakra" data-testid="newbie-loading" />
          )}

          {phase === "start" && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-4 max-w-sm text-center">
              <div className="w-24 h-24 rounded-full flex items-center justify-center" style={{ background: "radial-gradient(circle, rgba(0,229,255,0.25), transparent 70%)" }}>
                <Sparkles className="w-12 h-12 text-chakra" />
              </div>
              <p className="text-sm text-slate-300">
                Your one-time beginner gift. Roll a free ×10 summon — you can re-roll up to {maxRolls - 1} times before locking in your heroes.
              </p>
              <button
                onClick={roll}
                disabled={busy}
                data-testid="newbie-begin-button"
                className="inline-flex items-center gap-2 px-8 py-3 rounded-xl font-display text-xl tracking-wider bg-chakra text-[#05050A] hover:bg-cyan-300 transition-colors disabled:opacity-50"
              >
                {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />} BEGIN SUMMON
              </button>
            </motion.div>
          )}

          {phase === "results" && hasResults && (
            <>
              <div className="grid gap-2.5 sm:gap-3 w-full max-w-2xl grid-cols-2 xs:grid-cols-3 sm:grid-cols-5" data-testid="newbie-results-grid">
                {results.map((r, i) => {
                  const shown = i < revealed;
                  const color = (RARITY[r.rarity] || RARITY.R).color;
                  const tier = RARITY_TIER[r.rarity] ?? 0;
                  const fr = rarityFrame(r.rarity);
                  const strokeW = fr.strokeWidth;
                  const strokeCol = shown ? (fr.useGold ? GOLD.stroke : color) : "rgba(255,255,255,0.08)";
                  return (
                    <motion.div
                      key={i}
                      initial={{ rotateY: 90, opacity: 0 }}
                      animate={shown ? { rotateY: 0, opacity: 1 } : { rotateY: 90, opacity: 0 }}
                      transition={{ type: "spring", stiffness: 160, damping: 18 }}
                      className={`relative rounded-xl overflow-hidden bg-[#FFFFFF] ${shown && tier >= 4 ? auraClass(r.rarity) : ""}`}
                      style={{ border: `${strokeW}px solid ${strokeCol}`, "--glow": fr.useGold ? GOLD.base : color, boxShadow: shown && tier >= 5 ? `0 0 26px ${color}66` : undefined }}
                      data-testid={`newbie-result-card-${i}`}
                    >
                      {shown && fr.cornerLevel >= 2 && <DecoCorners rarity={r.rarity} size={14} />}
                      <div className="aspect-[3/4] relative">
                        <img src={r.portrait} alt={r.name} className="w-full h-full object-cover object-top" loading="lazy" />
                        {shown && <RaritySparkles rarity={r.rarity} />}
                        <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/90 to-transparent" />
                        <span className="absolute top-1.5 left-1.5 font-display text-sm px-1.5 rounded text-[#05050A]" style={{ background: color }}>{r.rarity}</span>
                        {!r.duplicate && shown && (
                          <span className="absolute top-1.5 right-1.5 text-[9px] font-extrabold tracking-widest px-1.5 py-0.5 rounded bg-emerald-500 text-ink">NEW</span>
                        )}
                      </div>
                      <div className="absolute inset-x-0 bottom-0 px-1.5 pb-1.5 text-center">
                        <p className="text-[11px] font-bold text-white leading-tight truncate">{r.name}</p>
                        {r.duplicate && <p className="text-[9px] text-amber-300">+{r.shards_gained} shards</p>}
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* actions */}
              <div className="mt-5 flex flex-col items-center gap-2 shrink-0">
                <div className="flex items-center gap-3">
                  <motion.button
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={keep}
                    disabled={busy}
                    data-testid="newbie-keep-button"
                    className="inline-flex items-center gap-2 px-7 py-3 rounded-xl font-display text-lg tracking-wider bg-emerald-500 text-[#05050A] hover:bg-emerald-400 transition-colors disabled:opacity-50"
                  >
                    <Sparkles className="w-5 h-5" /> KEEP HEROES
                  </motion.button>

                  {!locked && (
                    <motion.button
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      onClick={roll}
                      disabled={busy}
                      data-testid="newbie-retry-button"
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-display text-lg tracking-wider bg-black/40 text-chakra border border-chakra/50 hover:bg-chakra/10 transition-colors disabled:opacity-50"
                    >
                      {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />} RE-ROLL
                    </motion.button>
                  )}
                </div>
                <p className="text-xs text-slate-400" data-testid="newbie-retry-count">
                  {locked ? (
                    <span className="inline-flex items-center gap-1 text-amber-300"><Lock className="w-3.5 h-3.5" /> Results locked — keep your heroes.</span>
                  ) : (
                    <>Re-rolls remaining: <span className="font-bold text-chakra">{retriesLeft}</span> / {maxRolls - 1}</>
                  )}
                </p>
              </div>
            </>
          )}

          {phase === "committing" && (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
              <p className="text-sm text-slate-300">Adding your heroes…</p>
            </div>
          )}

          {/* dismiss (only before any results are committed) */}
          {!busy && phase !== "committing" && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-9 h-9 rounded-lg bg-black/40 border border-white/15 text-slate-400 hover:text-white hover:border-white/30 transition-colors flex items-center justify-center"
              aria-label="Close"
              data-testid="newbie-close-button"
            >
              ✕
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
