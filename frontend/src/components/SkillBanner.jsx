import { motion, AnimatePresence } from "framer-motion";
import { Zap } from "lucide-react";
import { ELEMENT } from "@/lib/styles";

// Visual "skill callout" shown the moment a jutsu is used in battle — displays
// the skill name + actor + a short effects summary. Purely presentational; it
// does not touch combat state and is pointer-events-none so it never blocks taps.
const TYPE_META = {
  attack: { label: "ATTACK", color: "#FF1744" },
  aoe: { label: "AREA", color: "#FF7043" },
  heal: { label: "HEAL", color: "#00E676" },
  shield: { label: "SHIELD", color: "#29B6F6" },
};

function effectSummary(jutsu) {
  const parts = [];
  const el = ELEMENT[jutsu.element] || {};
  if (jutsu.type === "attack" || jutsu.type === "aoe") {
    parts.push({ icon: "⚔", text: `${jutsu.power} dmg`, color: "#FF5252" });
    if (jutsu.element) parts.push({ icon: "✦", text: jutsu.element, color: el.color || "#fff" });
  } else if (jutsu.type === "heal") {
    parts.push({ icon: "✚", text: `${jutsu.power} heal`, color: "#00E676" });
    if (jutsu.element) parts.push({ icon: "✦", text: jutsu.element, color: el.color || "#fff" });
  } else if (jutsu.type === "shield") {
    parts.push({ icon: "🛡", text: "Damage shield", color: "#29B6F6" });
    if (jutsu.element) parts.push({ icon: "✦", text: jutsu.element, color: el.color || "#fff" });
  }
  if (jutsu.chakra_cost > 0) {
    parts.push({ icon: "⚡", text: `${jutsu.chakra_cost} chakra`, color: "#00E5FF" });
  } else if (jutsu.chakra_gain > 0) {
    parts.push({ icon: "⚡", text: `+${jutsu.chakra_gain} chakra`, color: "#00E676" });
  }
  return parts;
}

export default function SkillBanner({ fx }) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
      <AnimatePresence>
        {fx && fx.jutsu && (
          <motion.div
            key={fx.key}
            initial={{ opacity: 0, x: fx.side === "ally" ? -120 : 120, rotate: fx.side === "ally" ? -6 : 6 }}
            animate={{ opacity: 1, x: 0, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.18 } }}
            transition={{ type: "spring", stiffness: 320, damping: 24 }}
            className="relative"
          >
            <SkillCallout fx={fx} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SkillCallout({ fx }) {
  const { jutsu, actorName, side } = fx;
  const meta = TYPE_META[jutsu.type] || TYPE_META.attack;
  const el = ELEMENT[jutsu.element] || {};
  const accent = el.color || meta.color;
  const effects = effectSummary(jutsu);

  return (
    <div
      data-testid="skill-banner"
      className="relative px-7 py-3 min-w-[260px] max-w-[80vw]"
      style={{
        background: "linear-gradient(110deg, rgba(5,5,10,0.92), rgba(5,5,10,0.72))",
        borderLeft: `4px solid ${accent}`,
        boxShadow: `0 0 28px ${accent}55, inset 0 0 20px rgba(0,0,0,0.6)`,
        clipPath: "polygon(0 0, 100% 0, calc(100% - 16px) 100%, 0 100%)",
      }}
    >
      {/* actor */}
      <div className="flex items-center gap-1.5 mb-0.5">
        <span
          className="text-[11px] font-display tracking-widest uppercase"
          style={{ color: side === "ally" ? "#00E5FF" : "#FF5722" }}
        >
          {side === "ally" ? "▶" : "◀"} {actorName.split(" ")[0]}
        </span>
        <span
          className="text-[10px] font-display tracking-wider px-1.5 rounded-sm"
          style={{ background: `${meta.color}22`, color: meta.color, border: `1px solid ${meta.color}66` }}
        >
          {meta.label}
        </span>
      </div>

      {/* skill name */}
      <h3
        className="font-display text-3xl sm:text-4xl tracking-wide leading-none truncate"
        style={{ color: "#fff", textShadow: `0 0 16px ${accent}aa, 0 2px 4px #000` }}
      >
        {jutsu.name}
      </h3>

      {/* effects */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
        {effects.map((e, i) => (
          <span key={i} className="text-[11px] font-semibold flex items-center gap-0.5" style={{ color: e.color }}>
            <span className="opacity-80">{e.icon}</span>{e.text}
          </span>
        ))}
      </div>

      {/* description */}
      {jutsu.description && (
        <p className="text-[11px] text-slate-400 italic leading-tight mt-1 line-clamp-1">{jutsu.description}</p>
      )}

      {/* accent sweep line */}
      <motion.span
        className="absolute left-0 bottom-0 h-[2px]"
        style={{ background: accent }}
        initial={{ width: 0 }}
        animate={{ width: "100%" }}
        transition={{ duration: 0.5 }}
      />
    </div>
  );
}
