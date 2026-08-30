import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Lock, Unlock, Loader2, Check, Gift, RotateCw } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { useAudio } from "@/context/AudioContext";
import api, { formatApiErrorDetail } from "@/lib/api";
import { RARITY, ELEMENT } from "@/lib/styles";
import { rarityFrame, GOLD } from "@/lib/theme";
import { DecoCorners, auraClass } from "@/components/RarityFx";
import SummonCircle from "@/components/cinematic/SummonCircle";

/**
 * BeginnerSummon — the one-time newbie ×10 banner tab.
 * Re-roll the ×10 up to 10 times, pin up to 3 cards (survive rerolls), then
 * claim to grant the shown 10 and end the beginner summon forever.
 */
export default function BeginnerSummon() {
  const { user, setUser } = useAuth();
  const { playSfx } = useAudio();
  const [busy, setBusy] = useState(null); // "summon" | "lock" | "claim"
  const [claimed, setClaimed] = useState(null);

  const b = user?.beginner || { finished: false, rolls_used: 0, rolls_max: 10, locks_used: 0, locks_max: 3, results: [] };
  const finished = b.finished;
  const results = b.results || [];
  const rollsLeft = (b.rolls_max || 10) - (b.rolls_used || 0);
  const locksLeft = (b.locks_max || 3) - (b.locks_used || 0);
  const canReroll = !finished && rollsLeft > 0;
  const canClaim = !finished && results.length > 0;

  const doSummon = async () => {
    setBusy("summon");
    try {
      const { data } = await api.post("/game/beginner/summon");
      setUser(data.profile);
      playSfx("summon");
    } catch (e) {
      toast.error(formatApiErrorDetail(e?.response?.data?.detail) || e.message);
    } finally { setBusy(null); }
  };

  const toggleLock = async (index) => {
    if (finished || busy) return;
    setBusy("lock");
    try {
      const { data } = await api.post("/game/beginner/lock", { index });
      setUser(data.profile);
      playSfx("tap");
    } catch (e) {
      toast.error(formatApiErrorDetail(e?.response?.data?.detail) || e.message);
    } finally { setBusy(null); }
  };

  const doClaim = async () => {
    setBusy("claim");
    try {
      const { data } = await api.post("/game/beginner/claim");
      setUser(data.profile);
      setClaimed(data.results);
      playSfx("levelup");
      toast.success(`Claimed ${data.results.length} heroes!`);
    } catch (e) {
      toast.error(formatApiErrorDetail(e?.response?.data?.detail) || e.message);
    } finally { setBusy(null); }
  };

  if (finished && !claimed) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 py-16" data-testid="beginner-finished">
        <div className="w-16 h-16 rounded-full flex items-center justify-center bg-emerald-500/15 border border-emerald-500/40">
          <Check className="w-8 h-8 text-emerald-400" />
        </div>
        <h2 className="font-display text-3xl text-white tracking-wide">BEGINNER SUMMON COMPLETE</h2>
        <p className="text-slate-400 max-w-sm">You've claimed your beginner heroes. Build your squad and continue your journey!</p>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-3 relative z-10" data-testid="beginner-summon">
      {/* Header */}
      <div className="relative rounded-2xl overflow-hidden p-4 sm:p-5 shrink-0"
        style={{ border: "1px solid #00E67655", boxShadow: "0 0 50px #00E67622" }}>
        <div className="absolute inset-0" style={{ background: "radial-gradient(120% 90% at 80% 10%, #00E67622, transparent 55%)" }} />
        <div className="absolute inset-0 bg-gradient-to-t from-[#05050A] via-[#05050A]/80 to-transparent" />
        <div className="absolute top-1/2 left-6 -translate-y-1/2 opacity-10"><SummonCircle color="#00E676" size={220} /></div>
        <div className="relative z-10">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-extrabold tracking-widest bg-emerald-500/15 text-emerald-300 border border-emerald-500/40">
            <Gift className="w-3.5 h-3.5" /> BEGINNER BANNER · ONE TIME
          </span>
          <h1 className="font-display text-3xl sm:text-4xl text-white tracking-wide mt-2">NEW SHINOBI ×10</h1>
          <p className="text-sm text-slate-400 mt-1 max-w-md">A free ×10 pull from every hero. Re-roll up to 10 times, lock your favorites (up to 3), then claim to keep all 10.</p>
          <div className="flex items-center gap-4 mt-3 text-xs">
            <span className="flex items-center gap-1.5 text-slate-300">
              <RotateCw className="w-3.5 h-3.5 text-chakra" />
              Re-rolls <b className="text-white">{b.rolls_used || 0}/{b.rolls_max || 10}</b>
            </span>
            <span className="flex items-center gap-1.5 text-slate-300">
              <Lock className="w-3.5 h-3.5 text-amber-300" />
              Locks <b className="text-white">{b.locks_used || 0}/{b.locks_max || 3}</b>
            </span>
          </div>
        </div>
      </div>

      {/* Card grid */}
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-none">
        {results.length === 0 ? (
          <div className="h-full min-h-[240px] flex flex-col items-center justify-center text-center gap-3 text-slate-500">
            <Sparkles className="w-10 h-10 text-emerald-400/60" />
            <p>Summon your free ×10 to begin. Lock the heroes you want to keep, then re-roll the rest!</p>
          </div>
        ) : (
          <div className="grid grid-cols-5 gap-2 sm:gap-3" data-testid="beginner-grid">
            <AnimatePresence mode="popLayout">
              {results.map((r) => {
                const rar = RARITY[r.rarity] || RARITY.R;
                const fr = rarityFrame(r.rarity);
                const el = ELEMENT[r.element] || {};
                return (
                  <motion.div
                    key={`${r.index}-${r.template_id}`}
                    layout
                    initial={{ opacity: 0, scale: 0.8, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ type: "spring", stiffness: 300, damping: 26 }}
                    className={`relative rounded-lg overflow-hidden ${r.locked ? "ring-2 ring-amber-300" : ""}`}
                    style={{ border: `${fr.strokeWidth}px solid ${fr.strokeColor}`, boxShadow: r.locked ? `0 0 14px #FFCA28aa` : `0 0 8px ${rar.color}44` }}
                    data-testid={`beginner-card-${r.index}`}
                  >
                    <div className="aspect-[3/4] bg-black/40">
                      <img src={r.portrait} alt={r.name} className="w-full h-full object-cover object-top" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 to-transparent" />
                    </div>
                    {fr.cornerLevel >= 2 && <DecoCorners rarity={r.rarity} size={10} />}
                    <span className="absolute top-1 right-1 z-20 text-[8px] font-display px-1 rounded" style={{ background: rar.color, color: "#05050A" }}>{r.rarity}</span>
                    <span className="absolute top-1 left-1 z-20 w-3 h-3 rounded-full flex items-center justify-center" style={{ background: el.color || "#94a3b8" }} />
                    <p className="absolute bottom-0.5 inset-x-1 text-[9px] font-display text-white truncate text-center">{r.name}</p>
                    {/* Lock toggle */}
                    {!finished && (
                      <button
                        onClick={() => toggleLock(r.index)}
                        disabled={!!busy}
                        data-testid={`beginner-lock-${r.index}`}
                        className="absolute bottom-1 right-1 z-30 w-6 h-6 rounded-full flex items-center justify-center border transition-colors disabled:opacity-50"
                        style={{
                          background: r.locked ? "#FFCA28" : "rgba(0,0,0,0.6)",
                          borderColor: r.locked ? "#FFCA28" : "rgba(255,255,255,0.2)",
                        }}
                        title={r.locked ? "Unlock" : "Lock (keeps on re-roll)"}
                      >
                        {r.locked ? <Lock className="w-3 h-3 text-[#05050A]" /> : <Unlock className="w-3 h-3 text-slate-300" />}
                      </button>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Actions */}
      {!finished && (
        <div className="grid grid-cols-2 gap-2 shrink-0" data-testid="beginner-actions">
          <button
            onClick={doSummon}
            disabled={!!busy || !canReroll}
            data-testid="beginner-summon-btn"
            className="relative flex flex-col items-center justify-center gap-1 py-3.5 rounded-2xl overflow-hidden disabled:opacity-40 shine-sweep"
            style={{ background: "linear-gradient(135deg,#0a3d2e,#061a14)", border: "2px solid #00E676aa", boxShadow: "0 0 28px #00E67633" }}
          >
            <span className="flex items-center gap-1.5 font-display tracking-wider text-white text-lg">
              {busy === "summon" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-emerald-300" />}
              {results.length === 0 ? "SUMMON ×10" : "RE-ROLL ×10"}
            </span>
            <span className="text-[10px] text-emerald-300/80">{results.length === 0 ? "Free first pull" : `${rollsLeft} re-roll${rollsLeft === 1 ? "" : "s"} left`}</span>
          </button>
          <button
            onClick={doClaim}
            disabled={!!busy || !canClaim}
            data-testid="beginner-claim-btn"
            className="flex flex-col items-center justify-center gap-1 py-3.5 rounded-2xl disabled:opacity-40 transition-all"
            style={{ background: "linear-gradient(135deg,#4a3408,#1a1406)", border: "2px solid #FFCA28aa", boxShadow: "0 0 28px #FFCA2833" }}
          >
            <span className="flex items-center gap-1.5 font-display tracking-wider text-white text-lg">
              {busy === "claim" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 text-amber-300" />}
              CLAIM ×10
            </span>
            <span className="text-[10px] text-amber-300/80">Keep all 10 &amp; finish</span>
          </button>
        </div>
      )}

      {/* Claimed reveal */}
      {claimed && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 p-4" data-testid="beginner-claimed-overlay" onClick={() => setClaimed(null)}>
          <div className="max-w-md w-full rounded-2xl bg-[#0B0B14] border border-emerald-500/40 p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-2xl text-white text-center mb-3">Heroes Claimed!</h3>
            <div className="grid grid-cols-5 gap-2 max-h-[50vh] overflow-y-auto scrollbar-none">
              {claimed.map((r, i) => {
                const rar = RARITY[r.rarity] || RARITY.R;
                return (
                  <div key={i} className="rounded-lg overflow-hidden" style={{ border: `1px solid ${rar.color}` }}>
                    <div className="aspect-[3/4]"><img src={r.portrait} alt={r.name} className="w-full h-full object-cover object-top" /></div>
                    <p className="text-[8px] text-white text-center truncate px-0.5 bg-black/60">{r.name}</p>
                  </div>
                );
              })}
            </div>
            <button onClick={() => setClaimed(null)} className="w-full mt-4 py-2.5 rounded-xl bg-emerald-500 text-[#05050A] font-bold">Continue</button>
          </div>
        </div>
      )}
    </div>
  );
}
