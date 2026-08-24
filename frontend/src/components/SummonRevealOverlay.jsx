import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, Star } from "lucide-react";
import { RARITY } from "@/lib/styles";
import { rarityFrame, GOLD } from "@/lib/theme";
import { auraClass, RaritySparkles, RARITY_TIER, DecoCorners } from "@/components/RarityFx";
import { ItemIcon } from "@/components/ItemIcon";

const GEAR_TIER = { common: 1, fine: 2, rare: 3, epic: 4, legendary: 5 };

const bestColor = (results) => {
  let best = { color: "#00E5FF", tier: -1 };
  results.forEach((r) => {
    if (r.kind === "gear") {
      const t = GEAR_TIER[r.rarity] || 1;
      if (t + 1 > best.tier) best = { color: r.color || "#29B6F6", tier: t + 1 };
    } else {
      const t = RARITY_TIER[r.rarity] ?? 0;
      if (t > best.tier) best = { color: (RARITY[r.rarity] || RARITY.R).color, tier: t };
    }
  });
  return best;
};

/**
 * SummonRevealOverlay — the cinematic pull ceremony. Works for hero pulls
 * AND gear pulls (pass `kind: "gear"` on gear results). Flow:
 *   burst (rarity-colored flash) -> staggered card flips -> done (summary).
 * Tap anywhere to skip straight to the fully-revealed state.
 */
export default function SummonRevealOverlay({ open, results = [], onClose }) {
  const [revealed, setRevealed] = useState(0);
  const [stage, setStage] = useState("burst"); // burst | grid | done
  const best = useMemo(() => bestColor(results), [results]);
  const hasMythic = results.some((r) => r.kind !== "gear" && r.rarity === "GR");

  useEffect(() => {
    if (!open) return;
    setRevealed(0);
    setStage("burst");
    const t1 = setTimeout(() => setStage("grid"), 420);
    return () => clearTimeout(t1);
  }, [open, results]);

  useEffect(() => {
    if (stage !== "grid" || revealed >= results.length) {
      if (stage === "grid" && revealed >= results.length) setStage("done");
      return;
    }
    const t = setTimeout(() => setRevealed((r) => r + 1), revealed === 0 ? 240 : 150);
    return () => clearTimeout(t);
  }, [stage, revealed, results.length]);

  const skip = () => {
    if (stage === "done") return;
    setRevealed(results.length);
    setStage("done");
  };

  const single = results.length === 1;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="reveal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={skip}
          className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black/90 backdrop-blur-sm px-3 overflow-y-auto"
          data-testid="summon-reveal-overlay"
        >
          {/* rarity-colored ceremony flash */}
          <AnimatePresence>
            {stage === "burst" && (
              <motion.div
                key="flash"
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: [0, 1, 0], scale: [0.6, 1.5, 2.0] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.42, times: [0, 0.4, 1] }}
                className="fixed inset-0 pointer-events-none"
                style={{ background: `radial-gradient(circle at 50% 45%, #ffffffcc 0%, ${best.color}88 30%, transparent 60%)` }}
              />
            )}
          </AnimatePresence>

          {hasMythic && stage !== "burst" && (
            <motion.p
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="font-display text-3xl sm:text-4xl tracking-[0.3em] mb-4 rarity-pulse"
              style={{ color: RARITY.GR.color, "--glow": RARITY.GR.color }}
              data-testid="summon-mythic-callout"
            >
              ASCENDANT ARRIVES
            </motion.p>
          )}

          {stage !== "burst" && (
            <div
              className={`grid gap-2.5 sm:gap-3 w-full ${single ? "max-w-[240px] grid-cols-1" : "max-w-2xl grid-cols-2 xs:grid-cols-3 sm:grid-cols-5"}`}
              data-testid="summon-results-grid"
            >
              {results.map((r, i) => {
                const shown = i < revealed;
                const isGear = r.kind === "gear";
                const color = isGear ? (r.color || "#29B6F6") : (RARITY[r.rarity] || RARITY.R).color;
                const tier = isGear ? (GEAR_TIER[r.rarity] || 1) + 1 : (RARITY_TIER[r.rarity] ?? 0);
                const fr = isGear ? null : rarityFrame(r.rarity);
                const strokeW = fr ? fr.strokeWidth : 1.5;
                const strokeCol = shown ? (fr?.useGold ? GOLD.stroke : color) : "rgba(255,255,255,0.08)";
                return (
                  <motion.div
                    key={i}
                    initial={{ rotateY: 90, opacity: 0 }}
                    animate={shown ? { rotateY: 0, opacity: 1 } : { rotateY: 90, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 160, damping: 18 }}
                    className={`relative rounded-xl overflow-hidden bg-[#FFFFFF] ${shown && tier >= 4 ? auraClass(isGear ? "UR" : r.rarity) : ""}`}
                    style={{ border: `${strokeW}px solid ${strokeCol}`, "--glow": fr?.useGold ? GOLD.base : color, boxShadow: shown && tier >= 5 ? `0 0 26px ${color}66` : undefined }}
                    data-testid={`summon-result-card-${i}`}
                  >
                    {shown && tier >= 2 && (
                      <>
                        <motion.span aria-hidden initial={{ opacity: 0.95, scale: 0.2 }} animate={{ opacity: 0, scale: 2.6 }} transition={{ duration: 0.5, ease: "easeOut" }}
                          className="absolute inset-0 z-30 pointer-events-none rounded-xl" style={{ background: `radial-gradient(circle, #ffffff 0%, ${color} 40%, transparent 66%)` }} />
                        <motion.span aria-hidden initial={{ opacity: 0.85, scale: 0.45 }} animate={{ opacity: 0, scale: 1.9 }} transition={{ duration: 0.6, ease: "easeOut" }}
                          className="absolute inset-0 z-30 pointer-events-none rounded-xl" style={{ border: `2px solid ${color}`, boxShadow: `0 0 28px 8px ${color}` }} />
                      </>
                    )}
                    {shown && !isGear && fr.cornerLevel >= 2 && <DecoCorners rarity={r.rarity} size={14} />}
                    {shown && isGear && tier >= 5 && <DecoCorners level={3} color={GOLD.base} size={14} />}
                    {isGear ? (
                      <div className="aspect-[3/4] flex flex-col items-center justify-center gap-2 p-2">
                        <ItemIcon icon={r.icon || "anvil"} className="w-9 h-9" style={{ color }} />
                        <p className="text-[11px] font-bold text-center leading-tight text-ink">{r.set_name} {r.slot_name}</p>
                        <span className="text-[10px] font-extrabold uppercase tracking-widest px-1.5 py-0.5 rounded" style={{ background: `${color}22`, color }}>{r.rarity}</span>
                        <span className="text-[10px] text-slate-500">Score {r.score}</span>
                      </div>
                    ) : (
                      <>
                        <div className="aspect-[3/4] relative">
                          <img src={r.portrait} alt={r.name} className="w-full h-full object-cover object-top" loading="lazy" />
                          {shown && tier >= 5 && <span className="absolute inset-0 shine-sweep pointer-events-none" />}
                          {shown && <RaritySparkles rarity={r.rarity} />}
                          <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/90 to-transparent" />
                          <span className="absolute top-1.5 left-1.5 font-display text-sm px-1.5 rounded text-[#05050A]" style={{ background: color }}>{r.rarity}</span>
                          {!r.duplicate && (
                            <span className="absolute top-1.5 right-1.5 text-[9px] font-extrabold tracking-widest px-1.5 py-0.5 rounded bg-emerald-500 text-ink" data-testid={`summon-new-badge-${i}`}>NEW</span>
                          )}
                        </div>
                        <div className="absolute inset-x-0 bottom-0 px-1.5 pb-1.5 text-center">
                          <p className="text-[11px] font-bold text-ink leading-tight truncate">{r.name}</p>
                          {r.duplicate && (
                            <p className="text-[9px] text-amber-300 flex items-center justify-center gap-0.5">
                              <Star className="w-2.5 h-2.5" /> +{r.shards_gained} shards
                            </p>
                          )}
                        </div>
                      </>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}

          <div className="mt-6 flex items-center gap-3">
            {stage !== "done" ? (
              <button
                onClick={(e) => { e.stopPropagation(); skip(); }}
                className="px-5 py-2 rounded-lg text-sm font-semibold text-slate-600 bg-black/[0.04] border border-black/12 hover:bg-black/10 transition-colors"
                data-testid="summon-skip-button"
              >
                Skip
              </button>
            ) : (
              <motion.button
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={(e) => { e.stopPropagation(); onClose(); }}
                className="inline-flex items-center gap-2 px-8 py-3 rounded-xl font-display text-xl tracking-wider bg-chakra text-[#05050A] hover:bg-cyan-300 transition-colors"
                data-testid="summon-reveal-close-button"
              >
                <Sparkles className="w-5 h-5" /> CONTINUE
              </motion.button>
            )}
          </div>
          {stage !== "done" && <p className="text-[11px] text-slate-500 mt-2">tap anywhere to skip</p>}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
