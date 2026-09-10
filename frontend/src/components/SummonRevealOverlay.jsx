import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Star } from "lucide-react";
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

/** Rarity-scaled card entrance — higher rarity gets a more dramatic reveal. */
const cardAnim = (tier) => {
  if (tier >= 5) return { initial: { rotateY: 90, opacity: 0, scale: 0.4 }, transition: { type: "spring", stiffness: 100, damping: 10 } };
  if (tier >= 4) return { initial: { rotateY: 90, opacity: 0, scale: 0.55 }, transition: { type: "spring", stiffness: 130, damping: 12 } };
  if (tier >= 3) return { initial: { rotateY: 90, opacity: 0, scale: 0.7 }, transition: { type: "spring", stiffness: 150, damping: 14 } };
  return { initial: { rotateY: 90, opacity: 0 }, transition: { type: "spring", stiffness: 160, damping: 18 } };
};

/**
 * SummonRevealOverlay — immersive gacha result screen.
 * Rendered via portal at document.body so it owns the full viewport above
 * the bottom navigation. Mobile ×10 uses a compact 5×2 grid where all 10
 * results fit in one viewport with no scrolling. ×1 uses a large
 * centerpiece card. Rarity controls visual intensity (glow, beam, sparkles)
 * without changing card dimensions.
 */
export default function SummonRevealOverlay({ open, results = [], onClose }) {
  const [revealed, setRevealed] = useState(0);
  const [stage, setStage] = useState("burst"); // burst | grid | done
  const best = useMemo(() => bestColor(results), [results]);
  const hasMythic = results.some((r) => r.kind !== "gear" && r.rarity === "GR");
  const single = results.length === 1;

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
    const next = results[revealed];
    const nextTier = next?.kind === "gear" ? (GEAR_TIER[next.rarity] || 1) + 1 : (RARITY_TIER[next.rarity] ?? 0);
    const base = revealed === 0 ? 240 : 150;
    const rarityBonus = nextTier >= 5 ? 220 : nextTier >= 4 ? 130 : nextTier >= 3 ? 60 : 0;
    const t = setTimeout(() => setRevealed((r) => r + 1), base + rarityBonus);
    return () => clearTimeout(t);
  }, [stage, revealed, results.length]);

  const skip = () => {
    if (stage === "done") return;
    setRevealed(results.length);
    setStage("done");
  };

  const overlay = (
    <AnimatePresence>
      {open && (
        <motion.div
          key="reveal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={skip}
          className="fixed inset-0 z-[200] flex flex-col bg-black backdrop-blur-md overflow-hidden"
          style={{ height: "100dvh", paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
          data-testid="summon-reveal-overlay"
        >
          {/* Rarity-colored ceremony flash */}
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

          {/* Mythic callout */}
          {hasMythic && stage !== "burst" && (
            <motion.p
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="font-display text-lg sm:text-2xl lg:text-3xl tracking-[0.3em] rarity-pulse text-center shrink-0 mt-2"
              style={{ color: RARITY.GR.color, "--glow": RARITY.GR.color }}
              data-testid="summon-mythic-callout"
            >
              ASCENDANT ARRIVES
            </motion.p>
          )}

          {/* Main composition — header + grid + controls, centered as a group */}
          {stage !== "burst" && (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 sm:gap-4 min-h-0">
              {/* Compact header */}
              {!single && (
                <div className="shrink-0 text-center" data-testid="summon-results-header">
                  <p className="font-display text-base sm:text-lg lg:text-xl tracking-[0.3em] text-white">SUMMON RESULTS</p>
                  <p className="text-[10px] sm:text-xs text-slate-400 tracking-widest">{results.length} PULLS</p>
                </div>
              )}

              {/* Results */}
              {single ? (
                <SingleResultCard r={results[0]} shown={revealed >= 1} />
              ) : (
                <div
                  className="grid grid-cols-5 gap-1 sm:gap-2 lg:gap-3 w-full max-w-[440px] sm:max-w-md lg:max-w-2xl px-2 sm:px-4"
                  data-testid="summon-results-grid"
                >
                  {results.map((r, i) => (
                    <CompactResultCard key={i} r={r} i={i} shown={i < revealed} />
                  ))}
                </div>
              )}

              {/* Controls — right below the grid, not at viewport bottom */}
              <div className="shrink-0 flex flex-col items-center gap-1.5">
                {stage !== "done" ? (
                  <button
                    onClick={(e) => { e.stopPropagation(); skip(); }}
                    className="px-5 py-2 rounded-lg text-sm font-semibold text-slate-300 bg-white/[0.06] border border-white/12 hover:bg-white/10 transition-colors"
                    data-testid="summon-skip-button"
                  >
                    Skip
                  </button>
                ) : (
                  <motion.button
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={(e) => { e.stopPropagation(); onClose(); }}
                    className="inline-flex items-center gap-2 px-8 py-2.5 sm:py-3 rounded-xl font-display text-lg sm:text-xl tracking-wider bg-chakra text-[#05050A] hover:bg-cyan-300 transition-colors"
                    data-testid="summon-reveal-close-button"
                  >
                    <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" /> CONTINUE
                  </motion.button>
                )}
                {stage !== "done" && <p className="text-[10px] sm:text-[11px] text-slate-500">tap anywhere to skip</p>}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(overlay, document.body);
}

// ---------------------------------------------------------------------------
// CompactResultCard — mobile-first gacha result card for the 5×2 grid.
// Fixed height via .summon-result-card CSS class (fluid clamp per breakpoint).
// Rarity controls border color, glow, sparkles, beam — never card size.
// ---------------------------------------------------------------------------
function CompactResultCard({ r, i, shown }) {
  const isGear = r.kind === "gear";
  const color = isGear ? (r.color || "#29B6F6") : (RARITY[r.rarity] || RARITY.R).color;
  const tier = isGear ? (GEAR_TIER[r.rarity] || 1) + 1 : (RARITY_TIER[r.rarity] ?? 0);
  const fr = isGear ? null : rarityFrame(r.rarity);
  const anim = cardAnim(tier);

  return (
    <motion.div
      initial={anim.initial}
      animate={shown ? { rotateY: 0, opacity: 1, scale: 1 } : anim.initial}
      transition={anim.transition}
      className={`summon-result-card relative overflow-hidden rounded-md sm:rounded-lg ${shown && tier >= 4 ? auraClass(isGear ? "UR" : r.rarity) : ""}`}
      style={{
        border: `1.5px solid ${shown ? (fr?.useGold ? GOLD.stroke : color) : "rgba(255,255,255,0.08)"}`,
        "--glow": fr?.useGold ? GOLD.base : color,
        boxShadow: shown && tier >= 5 ? `0 0 16px ${color}66` : undefined,
        willChange: "transform",
      }}
      data-testid={`summon-result-card-${i}`}
    >
      {isGear ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 p-1 bg-[#FFFFFF]">
          <ItemIcon icon={r.icon || "anvil"} className="w-5 h-5 sm:w-7 sm:h-7 lg:w-9 lg:h-9" style={{ color }} />
          <p className="text-[7px] sm:text-[9px] lg:text-[10px] font-bold text-center leading-tight text-ink truncate w-full">{r.slot_name}</p>
          <span className="text-[7px] sm:text-[8px] lg:text-[9px] font-extrabold uppercase" style={{ color }}>{r.rarity}</span>
        </div>
      ) : (
        <>
          <img src={r.portrait} alt={r.name} className="absolute inset-0 w-full h-full object-cover object-top" loading="eager" decoding="async" />
          <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/90 to-transparent" />
          {shown && tier >= 5 && <span className="absolute inset-0 shine-sweep pointer-events-none" />}
          {shown && <RaritySparkles rarity={r.rarity} />}
          <span className="absolute top-0.5 left-0.5 text-[7px] sm:text-[8px] lg:text-[9px] font-bold px-1 rounded text-[#05050A]" style={{ background: color }}>{r.rarity}</span>
          {!r.duplicate && <span className="absolute top-0.5 right-0.5 text-[7px] font-bold px-0.5 rounded bg-emerald-500 text-white" data-testid={`summon-new-badge-${i}`}>NEW</span>}
          <div className="absolute bottom-0.5 inset-x-0.5 text-center">
            <p className="text-[8px] sm:text-[9px] lg:text-[10px] font-bold text-white truncate leading-tight">{r.name}</p>
            {r.duplicate && <p className="text-[7px] sm:text-[8px] lg:text-[9px] text-amber-300 leading-tight flex items-center justify-center gap-0.5"><Star className="w-1.5 h-1.5" />+{r.shards_gained}</p>}
          </div>
        </>
      )}

      {/* Reveal flash — rarity-scaled, contained within card via overflow-hidden */}
      {shown && tier >= 2 && (
        <>
          <motion.span aria-hidden initial={{ opacity: 0.95, scale: 0.2 }} animate={{ opacity: 0, scale: 2.6 }} transition={{ duration: 0.5, ease: "easeOut" }}
            className="absolute inset-0 z-30 pointer-events-none rounded-md sm:rounded-lg" style={{ background: `radial-gradient(circle, #ffffff 0%, ${color} 40%, transparent 66%)` }} />
          <motion.span aria-hidden initial={{ opacity: 0.85, scale: 0.45 }} animate={{ opacity: 0, scale: 1.9 }} transition={{ duration: 0.6, ease: "easeOut" }}
            className="absolute inset-0 z-30 pointer-events-none rounded-md sm:rounded-lg" style={{ border: `2px solid ${color}`, boxShadow: `0 0 28px 8px ${color}` }} />
        </>
      )}
      {shown && tier >= 4 && (
        <motion.span aria-hidden
          initial={{ opacity: 0, scaleY: 0 }}
          animate={{ opacity: [0, 0.7, 0], scaleY: [0, 1, 0.85] }}
          transition={{ duration: 0.7, ease: "easeOut", delay: 0.1 }}
          className="absolute inset-x-0 top-0 bottom-0 z-20 pointer-events-none origin-bottom rounded-md sm:rounded-lg"
          style={{ background: `linear-gradient(to top, transparent, ${color}44 30%, #ffffffaa 50%, ${color}44 70%, transparent)` }}
        />
      )}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// SingleResultCard — large centerpiece for ×1 pulls.
// ---------------------------------------------------------------------------
function SingleResultCard({ r, shown }) {
  if (!r) return null;
  const isGear = r.kind === "gear";
  const color = isGear ? (r.color || "#29B6F6") : (RARITY[r.rarity] || RARITY.R).color;
  const tier = isGear ? (GEAR_TIER[r.rarity] || 1) + 1 : (RARITY_TIER[r.rarity] ?? 0);
  const fr = isGear ? null : rarityFrame(r.rarity);
  const anim = cardAnim(tier);

  return (
    <motion.div
      initial={anim.initial}
      animate={shown ? { rotateY: 0, opacity: 1, scale: 1 } : anim.initial}
      transition={anim.transition}
      className={`relative overflow-hidden rounded-2xl ${shown && tier >= 4 ? auraClass(isGear ? "UR" : r.rarity) : ""}`}
      style={{
        border: `2px solid ${shown ? (fr?.useGold ? GOLD.stroke : color) : "rgba(255,255,255,0.08)"}`,
        "--glow": fr?.useGold ? GOLD.base : color,
        boxShadow: shown && tier >= 5 ? `0 0 30px ${color}66` : undefined,
        width: "clamp(220px, 60vw, 340px)",
        aspectRatio: "3/4",
        willChange: "transform",
      }}
      data-testid="summon-result-card-0"
    >
      {isGear ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 bg-[#FFFFFF]">
          <ItemIcon icon={r.icon || "anvil"} className="w-12 h-12 sm:w-16 sm:h-16" style={{ color }} />
          <p className="text-xs sm:text-sm font-bold text-center text-ink">{r.set_name} {r.slot_name}</p>
          <span className="text-[10px] sm:text-xs font-extrabold uppercase tracking-widest px-2 py-0.5 rounded" style={{ background: `${color}22`, color }}>{r.rarity}</span>
          <span className="text-[10px] text-slate-500">Score {r.score}</span>
        </div>
      ) : (
        <>
          <img src={r.portrait} alt={r.name} className="absolute inset-0 w-full h-full object-cover object-top" loading="eager" decoding="async" fetchpriority="high" />
          <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/90 to-transparent" />
          {shown && tier >= 5 && <span className="absolute inset-0 shine-sweep pointer-events-none" />}
          {shown && <RaritySparkles rarity={r.rarity} />}
          {shown && fr?.cornerLevel >= 2 && <DecoCorners rarity={r.rarity} size={16} />}
          <span className="absolute top-2 left-2 font-display text-sm px-2 py-0.5 rounded text-[#05050A]" style={{ background: color }}>{r.rarity}</span>
          {!r.duplicate && <span className="absolute top-2 right-2 text-[10px] font-extrabold tracking-widest px-2 py-0.5 rounded bg-emerald-500 text-ink" data-testid="summon-new-badge-0">NEW</span>}
          <div className="absolute bottom-2 inset-x-2 text-center">
            <p className="text-sm sm:text-base font-bold text-white leading-tight">{r.name}</p>
            {r.duplicate && <p className="text-xs text-amber-300 flex items-center justify-center gap-1"><Star className="w-3 h-3" /> +{r.shards_gained} shards</p>}
          </div>
        </>
      )}

      {shown && tier >= 2 && (
        <>
          <motion.span aria-hidden initial={{ opacity: 0.95, scale: 0.2 }} animate={{ opacity: 0, scale: 2.6 }} transition={{ duration: 0.5, ease: "easeOut" }}
            className="absolute inset-0 z-30 pointer-events-none rounded-2xl" style={{ background: `radial-gradient(circle, #ffffff 0%, ${color} 40%, transparent 66%)` }} />
          <motion.span aria-hidden initial={{ opacity: 0.85, scale: 0.45 }} animate={{ opacity: 0, scale: 1.9 }} transition={{ duration: 0.6, ease: "easeOut" }}
            className="absolute inset-0 z-30 pointer-events-none rounded-2xl" style={{ border: `2px solid ${color}`, boxShadow: `0 0 28px 8px ${color}` }} />
        </>
      )}
      {shown && tier >= 4 && (
        <motion.span aria-hidden
          initial={{ opacity: 0, scaleY: 0 }}
          animate={{ opacity: [0, 0.7, 0], scaleY: [0, 1, 0.85] }}
          transition={{ duration: 0.7, ease: "easeOut", delay: 0.1 }}
          className="absolute inset-x-0 top-0 bottom-0 z-20 pointer-events-none origin-bottom rounded-2xl"
          style={{ background: `linear-gradient(to top, transparent, ${color}44 30%, #ffffffaa 50%, ${color}44 70%, transparent)` }}
        />
      )}
    </motion.div>
  );
}
