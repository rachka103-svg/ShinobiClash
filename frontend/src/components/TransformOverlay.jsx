import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";
import { RARITY } from "@/lib/styles";
import { rarityFrame } from "@/lib/theme";
import { DecoCorners } from "@/components/RarityFx";

/**
 * TransformOverlay — a cinematic rarity-ascension sequence played inside
 * the HeroDetailModal when a hero transcends to a higher rarity tier.
 *
 * Sequence (~2.6s):
 *  1. White flash + radial light burst in the NEW rarity color
 *  2. Hero portrait pulses with the new rarity's aura
 *  3. Sparkle particles float upward in the new rarity color
 *  4. Rarity label morphs: OLD → NEW with a glow burst
 *  5. New rarity's deco corners fade in on the frame
 *
 * Props:
 *  - oldRarity   rarity key before transform (e.g. "SSR")
 *  - newRarity   rarity key after transform  (e.g. "UR")
 *  - portrait    hero portrait URL
 *  - heroName    hero display name
 *  - onComplete  callback when the sequence finishes
 */
export default function TransformOverlay({ oldRarity, newRarity, portrait, heroName, onComplete }) {
  const oldR = RARITY[oldRarity] || RARITY.R;
  const newR = RARITY[newRarity] || RARITY.R;
  const newFrame = rarityFrame(newRarity);
  const newColor = newR.color;

  // Sparkle particle positions
  const sparkles = Array.from({ length: 14 }, (_, i) => ({
    left: `${10 + (i * 6) + Math.random() * 4}%`,
    delay: Math.random() * 0.6,
    duration: 1.4 + Math.random() * 0.8,
    size: 4 + Math.random() * 6,
  }));

  return (
    <motion.div
      className="absolute inset-0 z-50 flex items-center justify-center overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      style={{ background: "rgba(5,5,10,0.88)", backdropFilter: "blur(6px)" }}
      onAnimationComplete={() => {
        // fire after the main sequence via a delayed call
      }}
    >
      {/* ---- Phase 1: Initial white flash ---- */}
      <motion.div
        className="absolute inset-0"
        style={{ background: "white" }}
        initial={{ opacity: 0.9 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
      />

      {/* ---- Phase 2: Radial light burst in new rarity color ---- */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: "60vmin",
          height: "60vmin",
          background: `radial-gradient(circle, ${newColor}cc 0%, ${newColor}44 40%, transparent 70%)`,
        }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0, 2.2, 1.6], opacity: [0, 1, 0.5] }}
        transition={{ duration: 1.6, ease: "easeOut", times: [0, 0.4, 1] }}
      />

      {/* ---- Expanding ring ---- */}
      <motion.div
        className="absolute rounded-full border-4"
        style={{ borderColor: newColor }}
        initial={{ width: 80, height: 80, opacity: 0.8 }}
        animate={{ width: ["10vmin", "70vmin"], height: ["10vmin", "70vmin"], opacity: [0.8, 0] }}
        transition={{ duration: 1.2, ease: "easeOut" }}
      />

      {/* ---- Hero portrait with pulsing aura ---- */}
      <div className="relative z-10 flex flex-col items-center">
        <motion.div
          className="relative rounded-2xl overflow-hidden"
          style={{
            width: "min(44vw, 280px)",
            aspectRatio: "3/4",
            border: `${newFrame.strokeWidth}px solid ${newFrame.strokeColor}`,
            boxShadow: `0 0 40px ${newColor}aa, 0 0 80px ${newColor}55`,
          }}
          initial={{ scale: 0.7, opacity: 0, rotateY: 180 }}
          animate={{ scale: [0.7, 1.05, 1], opacity: [0, 1, 1], rotateY: [180, 10, 0] }}
          transition={{ duration: 1.0, ease: "easeOut", times: [0, 0.6, 1] }}
        >
          {portrait && (
            <img
              src={portrait}
              alt={heroName}
              className="absolute inset-0 w-full h-full object-cover object-top"
            />
          )}
          {/* color wash in new rarity */}
          <motion.div
            className="absolute inset-0"
            style={{ background: newColor }}
            initial={{ opacity: 0.5 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
          />
          {/* new rarity deco corners */}
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.8 }}
          >
            <DecoCorners rarity={newRarity} size={22} />
          </motion.div>
          {/* shine sweep */}
          <motion.div
            className="absolute inset-0 overflow-hidden"
            initial={{ x: "-120%" }}
            animate={{ x: "120%" }}
            transition={{ duration: 0.8, delay: 0.6, ease: "easeInOut" }}
          >
            <div
              className="absolute inset-y-0 w-1/3"
              style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)" }}
            />
          </motion.div>
        </motion.div>

        {/* ---- Rarity label morph ---- */}
        <motion.div
          className="mt-6 flex items-center gap-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.4 }}
        >
          <span
            className="font-display text-2xl tracking-widest"
            style={{ color: oldR.color, opacity: 0.5, textDecoration: "line-through" }}
          >
            {oldR.name.toUpperCase()}
          </span>
          <motion.div
            initial={{ scale: 0, rotate: -45 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.8, type: "spring", stiffness: 300 }}
          >
            <Sparkles className="w-5 h-5" style={{ color: newColor }} />
          </motion.div>
          <motion.span
            className="font-display text-4xl tracking-widest"
            style={{
              color: newColor,
              textShadow: `0 0 20px ${newColor}, 0 0 40px ${newColor}aa`,
            }}
            initial={{ scale: 0.3, opacity: 0 }}
            animate={{ scale: [0.3, 1.3, 1], opacity: [0, 1, 1] }}
            transition={{ delay: 0.8, duration: 0.5, ease: "easeOut" }}
          >
            {newR.name.toUpperCase()}
          </motion.span>
        </motion.div>

        {/* ---- "TRANSFORMED" label ---- */}
        <motion.p
          className="mt-2 text-sm tracking-[0.3em] uppercase"
          style={{ color: newColor, opacity: 0.8 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.8 }}
          transition={{ delay: 1.2, duration: 0.4 }}
        >
          Transformed
        </motion.p>
      </div>

      {/* ---- Floating sparkle particles ---- */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ "--glow": newColor }}>
        {sparkles.map((s, i) => (
          <motion.span
            key={i}
            className="absolute rounded-full"
            style={{
              left: s.left,
              bottom: "20%",
              width: s.size,
              height: s.size,
              background: newColor,
              boxShadow: `0 0 ${s.size * 2}px ${newColor}, 0 0 ${s.size * 4}px ${newColor}88`,
            }}
            initial={{ y: 0, opacity: 0, scale: 0 }}
            animate={{ y: [-20, -200], opacity: [0, 1, 0], scale: [0, 1, 0.5] }}
            transition={{
              delay: s.delay,
              duration: s.duration,
              ease: "easeOut",
            }}
          />
        ))}
      </div>

      {/* ---- Auto-dismiss timer ---- */}
      <motion.div
        className="absolute"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0 }}
        transition={{ delay: 2.6, duration: 0.01 }}
        onAnimationComplete={() => onComplete?.()}
      />
    </motion.div>
  );
}
