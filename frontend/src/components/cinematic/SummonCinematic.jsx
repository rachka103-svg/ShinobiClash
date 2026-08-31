import { useEffect, useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Star, X, ChevronRight } from "lucide-react";
import { RARITY } from "@/lib/styles";
import { rarityFrame, GOLD } from "@/lib/theme";
import { DecoCorners, RaritySparkles, RARITY_TIER } from "@/components/RarityFx";
import SummonCircle from "./SummonCircle";
import { ItemIcon } from "@/components/ItemIcon";

const GEAR_TIER = { common: 1, fine: 2, rare: 3, epic: 4, legendary: 5 };

// Rarity → energy color mapping for the cinematic
const RARITY_ENERGY = {
  R: { color: "#29B6F6", label: "COMMON", intensity: 0.5 },
  SR: { color: "#7C4DFF", label: "RARE", intensity: 0.7 },
  SSR: { color: "#AB47BC", label: "EPIC", intensity: 0.85 },
  UR: { color: "#FFCA28", label: "LEGENDARY", intensity: 1.0 },
  GR: { color: "#64FFDA", label: "ASCENDANT", intensity: 1.2 },
};

const ELEMENT_BG = {
  Fire: "linear-gradient(180deg, #1a0a05 0%, #3d1505 40%, #1a0a05 100%)",
  Water: "linear-gradient(180deg, #051a2a 0%, #0a3d5a 40%, #051a2a 100%)",
  Lightning: "linear-gradient(180deg, #1a1505 0%, #3d3205 40%, #1a1505 100%)",
  Wind: "linear-gradient(180deg, #051a0a 0%, #0a3d1a 40%, #051a0a 100%)",
  Dark: "linear-gradient(180deg, #0a0518 0%, #1a0a3d 40%, #0a0518 100%)",
  Earth: "linear-gradient(180deg, #1a120a 0%, #2d1f15 40%, #1a120a 100%)",
  Light: "linear-gradient(180deg, #1a1505 0%, #3d3205 40%, #1a1505 100%)",
};

/**
 * SummonCinematic — the full cinematic summon ceremony.
 *
 * Single summon flow:
 *   activation (circle spins, particles inward, "SUMMONING...")
 *   → energy buildup (rising energy, light rays, brightening)
 *   → rarity reveal (energy color → rarity text)
 *   → character reveal (silhouette → character art → name → stats)
 *
 * Multi-summon (10x) flow:
 *   10 glowing portal cards → player taps each → full reveal → return to grid
 *
 * Props:
 *   open    — boolean
 *   results — array of summon results
 *   onClose — callback
 */
export default function SummonCinematic({ open, results = [], onClose }) {
  const [stage, setStage] = useState("idle"); // idle | activating | energy | rarity | reveal | grid | cardReveal | done
  const [revealedCount, setRevealedCount] = useState(0);
  const [activeCard, setActiveCard] = useState(null); // index for multi-summon card reveal
  const [duplicate, setDuplicate] = useState(null);

  const isMulti = results.length > 1;
  const single = results.length === 1 ? results[0] : null;

  // Determine best result for the initial flash
  const bestResult = useMemo(() => {
    if (!results.length) return null;
    return results.reduce((best, r) => {
      const t = r.kind === "gear" ? (GEAR_TIER[r.rarity] || 1) + 1 : (RARITY_TIER[r.rarity] ?? 0);
      const bt = best ? (best.kind === "gear" ? (GEAR_TIER[best.rarity] || 1) + 1 : (RARITY_TIER[best.rarity] ?? 0)) : -1;
      return t > bt ? r : best;
    }, null);
  }, [results]);

  const bestEnergy = bestResult
    ? bestResult.kind === "gear"
      ? { color: bestResult.color || "#29B6F6", label: bestResult.rarity?.toUpperCase() || "GEAR", intensity: 0.8 }
      : RARITY_ENERGY[bestResult.rarity] || RARITY_ENERGY.R
    : RARITY_ENERGY.R;

  // Reset when opened
  useEffect(() => {
    if (!open) { setStage("idle"); setRevealedCount(0); setActiveCard(null); setDuplicate(null); return; }
    if (isMulti) {
      setStage("grid");
    } else {
      setStage("activating");
    }
  }, [open, isMulti]);

  // Single summon cinematic sequence
  useEffect(() => {
    if (!open || isMulti) return;
    if (stage === "activating") {
      const t = setTimeout(() => setStage("energy"), 1800);
      return () => clearTimeout(t);
    }
    if (stage === "energy") {
      const t = setTimeout(() => setStage("rarity"), 1600);
      return () => clearTimeout(t);
    }
    if (stage === "rarity") {
      const t = setTimeout(() => setStage("reveal"), 1800);
      return () => clearTimeout(t);
    }
    if (stage === "reveal") {
      // Check for duplicate
      if (single?.duplicate) {
        const t = setTimeout(() => setDuplicate(single), 1500);
        return () => clearTimeout(t);
      }
      const t = setTimeout(() => setStage("done"), 2500);
      return () => clearTimeout(t);
    }
    if (stage === "done" && duplicate) {
      const t = setTimeout(() => setStage("done"), 1500);
      return () => clearTimeout(t);
    }
  }, [stage, open, isMulti, single, duplicate]);

  // Multi-summon: check if all cards revealed
  useEffect(() => {
    if (stage === "grid" && revealedCount >= results.length && results.length > 0) {
      const t = setTimeout(() => setStage("done"), 500);
      return () => clearTimeout(t);
    }
  }, [stage, revealedCount, results.length]);

  const revealCard = useCallback((index) => {
    setActiveCard(index);
    setStage("cardReveal");
  }, []);

  const closeCard = useCallback(() => {
    setRevealedCount((c) => c + 1);
    setActiveCard(null);
    if (revealedCount + 1 >= results.length) {
      setStage("done");
    } else {
      setStage("grid");
    }
  }, [revealedCount, results.length]);

  const skip = useCallback(() => {
    if (isMulti) {
      setRevealedCount(results.length);
      setStage("done");
    } else {
      setStage("done");
      setDuplicate(null);
    }
  }, [isMulti, results.length]);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={skip}
        className="fixed inset-0 z-[200] flex flex-col items-center justify-center overflow-hidden"
        style={{ background: "#05050A" }}
        data-testid="summon-cinematic"
      >
        {/* ===== SINGLE SUMMON CINEMATIC ===== */}
        {!isMulti && (
          <>
            {/* Activation: summoning circle + particles */}
            {(stage === "activating" || stage === "energy") && (
              <div className="absolute inset-0 flex items-center justify-center">
                <SummonCircle
                  color={bestEnergy.color}
                  size={300}
                  active={stage === "energy"}
                  className="z-10"
                />
                {/* Particles flowing inward */}
                {stage === "energy" &&
                  Array.from({ length: 20 }).map((_, i) => {
                    const angle = (i / 20) * Math.PI * 2;
                    const dist = 200 + (i % 4) * 50;
                    return (
                      <span
                        key={i}
                        className="absolute rounded-full summon-particle-inward"
                        style={{
                          width: 4,
                          height: 4,
                          background: bestEnergy.color,
                          boxShadow: `0 0 8px ${bestEnergy.color}`,
                          "--sx": `${Math.cos(angle) * dist}px`,
                          "--sy": `${Math.sin(angle) * dist}px`,
                          animationDelay: `${(i * 0.08) % 1.5}s`,
                        }}
                      />
                    );
                  })}
                {/* Energy rising */}
                {stage === "energy" &&
                  Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className="absolute summon-energy-rise rounded-full"
                      style={{
                        width: 8,
                        height: 80,
                        background: `linear-gradient(to top, ${bestEnergy.color}, transparent)`,
                        left: `${30 + i * 12}%`,
                        bottom: "30%",
                        animationDelay: `${i * 0.2}s`,
                      }}
                    />
                  ))}
                {/* Light rays */}
                {stage === "energy" &&
                  Array.from({ length: 8 }).map((_, i) => (
                    <div
                      key={`ray-${i}`}
                      className="absolute summon-light-ray"
                      style={{
                        width: 2,
                        height: "50%",
                        background: `linear-gradient(to top, ${bestEnergy.color}88, transparent)`,
                        left: "50%",
                        bottom: "50%",
                        transformOrigin: "bottom center",
                        transform: `translateX(-50%) rotate(${i * 45}deg)`,
                        animationDelay: `${i * 0.1}s`,
                      }}
                    />
                  ))}
                {/* SUMMONING text */}
                {stage === "activating" && (
                  <div className="absolute bottom-[20%] text-center">
                    <p className="font-display text-2xl tracking-[0.4em] text-white animate-pulse" style={{ textShadow: `0 0 20px ${bestEnergy.color}` }}>
                      SUMMONING...
                    </p>
                  </div>
                )}
                {/* Brightening flash */}
                {stage === "energy" && (
                  <div
                    className="absolute inset-0 summon-bright-flash"
                    style={{ background: `radial-gradient(circle at center, ${bestEnergy.color}44 0%, transparent 60%)` }}
                  />
                )}
              </div>
            )}

            {/* Rarity reveal */}
            {stage === "rarity" && (
              <div className="absolute inset-0 flex items-center justify-center">
                {/* Screen brightening */}
                <div
                  className="absolute inset-0"
                  style={{
                    background: `radial-gradient(circle at center, ${bestEnergy.color}${bestEnergy.intensity > 1 ? "88" : "55"} 0%, transparent 50%)`,
                    animation: "summonBrightFlash 1.8s ease-in-out forwards",
                  }}
                />
                {/* Legendary shake + gold particles */}
                {bestEnergy.intensity >= 1 && (
                  <>
                    <div className="absolute inset-0 summon-shake" />
                    {Array.from({ length: 16 }).map((_, i) => {
                      const angle = (i / 16) * Math.PI * 2;
                      const dist = 150 + (i % 3) * 40;
                      return (
                        <span
                          key={i}
                          className="absolute rounded-full"
                          style={{
                            width: 6,
                            height: 6,
                            background: bestEnergy.color,
                            boxShadow: `0 0 12px ${bestEnergy.color}, 0 0 24px ${bestEnergy.color}`,
                            animation: "ultParticleBurst 1.2s ease-out forwards",
                            animationDelay: `${i * 0.05}s`,
                            "--px": `${Math.cos(angle) * dist}px`,
                            "--py": `${Math.sin(angle) * dist}px`,
                          }}
                        />
                      );
                    })}
                  </>
                )}
                {/* Rarity text */}
                <h2
                  className="rarity-reveal-text font-display text-5xl sm:text-7xl relative z-10"
                  style={{ color: bestEnergy.color, textShadow: `0 0 40px ${bestEnergy.color}, 0 0 80px ${bestEnergy.color}66` }}
                >
                  {bestEnergy.label}
                </h2>
              </div>
            )}

            {/* Character reveal */}
            {(stage === "reveal" || stage === "done") && single && (
              <CharacterReveal
                result={single}
                stage={stage}
                duplicate={duplicate}
                bestEnergy={bestEnergy}
              />
            )}
          </>
        )}

        {/* ===== MULTI-SUMMON GRID ===== */}
        {isMulti && stage === "grid" && (
          <MultiSummonGrid
            results={results}
            revealedCount={revealedCount}
            onReveal={revealCard}
          />
        )}

        {/* ===== MULTI-SUMMON CARD REVEAL ===== */}
        {isMulti && stage === "cardReveal" && activeCard !== null && (
          <CardReveal result={results[activeCard]} onClose={closeCard} />
        )}

        {/* ===== DONE: summary + continue ===== */}
        {stage === "done" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {isMulti && (
              <div className="grid grid-cols-5 gap-2 max-w-2xl mb-6 px-4">
                {results.map((r, i) => {
                  const color = r.kind === "gear" ? (r.color || "#29B6F6") : (RARITY[r.rarity] || RARITY.R).color;
                  return (
                    <div
                      key={i}
                      className="relative rounded-lg overflow-hidden aspect-[3/4]"
                      style={{ border: `2px solid ${color}`, boxShadow: `0 0 10px ${color}55` }}
                    >
                      {r.kind === "gear" ? (
                        <div className="w-full h-full flex items-center justify-center" style={{ background: "#0B0B14" }}>
                          <ItemIcon icon={r.icon || "anvil"} className="w-6 h-6" style={{ color }} />
                        </div>
                      ) : (
                        <img src={r.portrait} alt={r.name} className="w-full h-full object-cover object-top" />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={(e) => { e.stopPropagation(); onClose(); }}
              className="inline-flex items-center gap-2 px-8 py-3 rounded-xl font-display text-xl tracking-wider transition-colors pointer-events-auto"
              style={{ background: "linear-gradient(135deg, #FFCA28, #FF8F00)", color: "#05050A" }}
              data-testid="summon-cinematic-continue"
            >
              <Sparkles size={20} /> CONTINUE
            </motion.button>
          </div>
        )}

        {/* Skip hint */}
        {stage !== "done" && (
          <p className="absolute bottom-4 text-[11px] text-slate-600">tap anywhere to skip</p>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

// ---------------------------------------------------------------------------
// CharacterReveal — single summon character reveal with silhouette → art → name → stats
// ---------------------------------------------------------------------------
function CharacterReveal({ result, stage, duplicate, bestEnergy }) {
  const isGear = result.kind === "gear";
  const r = isGear ? null : (RARITY[result.rarity] || RARITY.R);
  const fr = isGear ? null : rarityFrame(result.rarity);
  const color = isGear ? (result.color || "#29B6F6") : r.color;
  const elBg = !isGear && result.element ? (ELEMENT_BG[result.element] || "#05050A") : "#05050A";

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ background: elBg }}>
      {/* Element ambient particles */}
      {!isGear && result.element && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {Array.from({ length: 12 }).map((_, i) => (
            <span
              key={i}
              className="absolute battle-particle"
              style={{
                left: `${(i * 8 + 5) % 100}%`,
                bottom: "10%",
                width: 3,
                height: 3,
                background: color,
                boxShadow: `0 0 6px ${color}`,
                animationDuration: `${6 + (i % 5)}s`,
                animationDelay: `${i * 0.5}s`,
                "--drift": `${(i % 3 - 1) * 20}px`,
              }}
            />
          ))}
        </div>
      )}

      {/* Character art — 60-70% of screen */}
      <div className="relative" style={{ width: "65%", maxWidth: 320, height: "55%", maxHeight: 420 }}>
        {/* Silhouette phase (during reveal start) */}
        {stage === "reveal" && (
          <div className="absolute inset-0 rounded-2xl overflow-hidden silhouette-reveal" style={{ border: `2px solid ${color}` }}>
            <img src={result.portrait} alt="" className="w-full h-full object-cover object-top" />
            {/* Rim light */}
            <div className="absolute inset-0 rim-light" style={{ background: `linear-gradient(180deg, ${color}33 0%, transparent 30%)`, mixBlendMode: "screen" }} />
          </div>
        )}

        {/* Full reveal (done stage) */}
        {stage === "done" && !duplicate && (
          <div className="absolute inset-0 char-reveal-fade rounded-2xl overflow-hidden" style={{ border: `2px solid ${color}`, boxShadow: `0 0 40px ${color}66, 0 0 80px ${color}33` }}>
            <img src={result.portrait} alt={result.name} className="w-full h-full object-cover object-top" />
            {fr?.cornerLevel >= 2 && <DecoCorners rarity={result.rarity} size={14} />}
            {r && r.tier >= 3 && <RaritySparkles rarity={result.rarity} />}
            <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, transparent 50%, ${elBg === "#05050A" ? "#05050A" : "rgba(5,5,10,0.8)"} 100%)` }} />
          </div>
        )}

        {/* Duplicate dissolve */}
        {duplicate && (
          <div className="absolute inset-0 duplicate-dissolve rounded-2xl overflow-hidden" style={{ border: `2px solid ${color}` }}>
            <img src={result.portrait} alt="" className="w-full h-full object-cover object-top" />
            {/* Fragment burst */}
            {Array.from({ length: 10 }).map((_, i) => {
              const angle = (i / 10) * Math.PI * 2;
              return (
                <span
                  key={i}
                  className="absolute fragment-burst rounded-full"
                  style={{
                    top: "50%",
                    left: "50%",
                    width: 6,
                    height: 6,
                    background: color,
                    boxShadow: `0 0 8px ${color}`,
                    "--fx": `${Math.cos(angle) * 60}px`,
                    "--fy": `${Math.sin(angle) * 60}px`,
                    animationDelay: `${i * 0.05}s`,
                  }}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Rarity label */}
      {stage === "reveal" && (
        <div className="absolute top-[8%] text-center">
          <p className="rarity-reveal-text font-display text-2xl tracking-[0.3em]" style={{ color, textShadow: `0 0 20px ${color}` }}>
            {isGear ? (result.rarity || "GEAR").toUpperCase() : (r?.name || "").toUpperCase()}
          </p>
        </div>
      )}

      {/* Character name + stats (done stage) */}
      {stage === "done" && (
        <div className="absolute bottom-[8%] text-center w-full px-4">
          {!duplicate && (
            <>
              <h2 className="char-name-reveal font-display text-4xl sm:text-5xl text-white" style={{ textShadow: `0 0 20px ${color}` }}>
                {result.name}
              </h2>
              {result.role && (
                <p className="char-name-reveal text-sm text-slate-400 mt-1" style={{ animationDelay: "0.3s" }}>
                  {result.role}
                </p>
              )}
              {/* Stats */}
              {result.power != null && (
                <div className="char-name-reveal flex items-center justify-center gap-4 mt-3 text-sm" style={{ animationDelay: "0.5s" }}>
                  <span className="text-slate-400">POWER <span className="text-white font-bold">{result.power?.toLocaleString()}</span></span>
                  {result.atk != null && <span className="text-slate-400">ATK <span className="text-white font-bold">{result.atk}</span></span>}
                  {result.def != null && <span className="text-slate-400">DEF <span className="text-white font-bold">{result.def}</span></span>}
                </div>
              )}
              {/* New badge */}
              {!result.duplicate && (
                <span className="char-name-reveal inline-block mt-2 text-[10px] font-extrabold tracking-widest px-2 py-0.5 rounded bg-emerald-500 text-[#05050A]" style={{ animationDelay: "0.7s" }}>
                  NEW
                </span>
              )}
            </>
          )}
          {/* Duplicate conversion */}
          {duplicate && (
            <div className="char-name-reveal">
              <p className="font-display text-2xl text-amber-300" style={{ textShadow: "0 0 16px rgba(255,202,40,0.6)" }}>
                DUPLICATE CONVERTED
              </p>
              <p className="text-lg text-amber-200 mt-1">+ {result.shards_gained || 20} HERO ESSENCE</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// MultiSummonGrid — 10 glowing portal cards
// ---------------------------------------------------------------------------
function MultiSummonGrid({ results, revealedCount, onReveal }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center">
      <p className="font-display text-lg tracking-[0.3em] text-slate-500 mb-4">
        {revealedCount} / {results.length} REVEALED
      </p>
      <div className="grid grid-cols-5 gap-2 sm:gap-3 max-w-lg px-4">
        {results.map((r, i) => {
          const revealed = i < revealedCount;
          const color = r.kind === "gear"
            ? (r.color || "#29B6F6")
            : (RARITY[r.rarity] || RARITY.R).color;
          return (
            <button
              key={i}
              onClick={() => !revealed && onReveal(i)}
              disabled={revealed}
              data-testid={`summon-card-${i}`}
              className="relative aspect-[3/4] rounded-xl overflow-hidden transition-all"
              style={{
                border: revealed ? `2px solid ${color}` : "2px solid rgba(255,255,255,0.15)",
                boxShadow: revealed ? `0 0 10px ${color}44` : `0 0 8px ${color}33`,
                "--card-glow": color,
                cursor: revealed ? "default" : "pointer",
              }}
            >
              {!revealed ? (
                <div className="w-full h-full flex items-center justify-center" style={{ background: "#0B0B14" }}>
                  <div className="summon-portal-pulse text-3xl font-display" style={{ color, textShadow: `0 0 12px ${color}` }}>
                    ?
                  </div>
                  {/* Rarity energy leak from edges */}
                  <div className="absolute inset-0 pointer-events-none" style={{ background: `linear-gradient(180deg, ${color}11 0%, transparent 30%, transparent 70%, ${color}11 100%)` }} />
                </div>
              ) : (
                <div className="w-full h-full">
                  {r.kind === "gear" ? (
                    <div className="w-full h-full flex items-center justify-center" style={{ background: "#0B0B14" }}>
                      <ItemIcon icon={r.icon || "anvil"} className="w-6 h-6" style={{ color }} />
                    </div>
                  ) : (
                    <img src={r.portrait} alt={r.name} className="w-full h-full object-cover object-top" />
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-slate-600 mt-4">Tap each card to reveal</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CardReveal — individual card expansion for multi-summon
// ---------------------------------------------------------------------------
function CardReveal({ result, onClose }) {
  const [phase, setPhase] = useState("rarity"); // rarity → reveal → done
  const isGear = result.kind === "gear";
  const r = isGear ? null : (RARITY[result.rarity] || RARITY.R);
  const color = isGear ? (result.color || "#29B6F6") : r.color;
  const energy = isGear ? { color, label: (result.rarity || "GEAR").toUpperCase(), intensity: 0.8 } : (RARITY_ENERGY[result.rarity] || RARITY_ENERGY.R);
  const elBg = !isGear && result.element ? (ELEMENT_BG[result.element] || "#05050A") : "#05050A";

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("reveal"), 1500);
    const t2 = setTimeout(() => setPhase("done"), 3000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ background: elBg }} onClick={(e) => e.stopPropagation()}>
      {/* Rarity flash */}
      {phase === "rarity" && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="absolute inset-0" style={{ background: `radial-gradient(circle, ${energy.color}44 0%, transparent 50%)`, animation: "summonBrightFlash 1.5s ease-in-out forwards" }} />
          <h2 className="rarity-reveal-text font-display text-5xl" style={{ color: energy.color, textShadow: `0 0 30px ${energy.color}` }}>
            {energy.label}
          </h2>
        </div>
      )}

      {/* Character reveal */}
      {phase !== "rarity" && (
        <>
          <div className="relative summon-card-expand" style={{ width: "60%", maxWidth: 280, height: "55%", maxHeight: 380 }}>
            <div className="absolute inset-0 char-reveal-fade rounded-2xl overflow-hidden" style={{ border: `2px solid ${color}`, boxShadow: `0 0 40px ${color}66` }}>
              {isGear ? (
                <div className="w-full h-full flex flex-col items-center justify-center gap-2" style={{ background: "#0B0B14" }}>
                  <ItemIcon icon={result.icon || "anvil"} className="w-12 h-12" style={{ color }} />
                  <p className="text-sm font-bold text-white">{result.set_name} {result.slot_name}</p>
                </div>
              ) : (
                <>
                  <img src={result.portrait} alt={result.name} className="w-full h-full object-cover object-top" />
                  <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, transparent 50%, ${elBg === "#05050A" ? "#05050A" : "rgba(5,5,10,0.8)"} 100%)` }} />
                </>
              )}
            </div>
          </div>
          {phase === "done" && (
            <div className="absolute bottom-[10%] text-center w-full px-4">
              <h2 className="char-name-reveal font-display text-3xl text-white" style={{ textShadow: `0 0 16px ${color}` }}>
                {result.name}
              </h2>
              {result.duplicate && (
                <p className="char-name-reveal text-sm text-amber-300 mt-1" style={{ animationDelay: "0.3s" }}>
                  +{result.shards_gained || 20} Hero Essence
                </p>
              )}
              <button
                onClick={onClose}
                className="mt-4 px-6 py-2 rounded-xl font-display text-lg tracking-wide pointer-events-auto"
                style={{ background: color, color: "#05050A" }}
                data-testid="card-close"
              >
                <ChevronRight size={18} className="inline" /> NEXT
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
