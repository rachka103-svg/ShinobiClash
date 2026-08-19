import { motion } from "framer-motion";
import { Image } from "lucide-react";
import { RARITY, ELEMENT, glow, scrimBottom, vignetteInset } from "@/lib/theme";

/**
 * HeroPortrait — the primary reusable hero-artwork component.
 *
 * The artwork is always visually dominant. Information (name, level,
 * element, rarity) is overlaid directly on the artwork via a bottom scrim —
 * never placed in a separate boxed footer or stacked info card.
 *
 * modes:
 *  - "compact"  → dense collection grids (Roster/Gallery)
 *  - "featured" → larger single-hero spotlight (Lobby/Summon)
 *  - "detail"   → full showcase, meant to fill most of a screen
 */
export default function HeroPortrait({
  hero,               // { portrait, name, rarity, element, level, role, power }
  mode = "compact",
  selected = false,
  disabled = false,
  onClick,
  testid,
  className = "",
}) {
  if (!hero) return null;
  const rarity = RARITY[hero.rarity] || RARITY.R;
  const element = ELEMENT[hero.element] || {};
  const elite = rarity.tier >= 3; // UR / LR shine

  // Dense collection grids get a tighter glow so a card's aura never bleeds
  // into its neighbor's cell — full drama is reserved for single-hero modes.
  const glowScale = mode === "compact" ? 0.55 : 1;
  const frameGlow = selected
    ? glow(rarity.color, 3 * glowScale)
    : glow(rarity.color, (rarity.tier >= 3 ? 2 : rarity.tier >= 2 ? 1.4 : 1) * glowScale);

  const aspect = mode === "detail" ? "aspect-[3/4] sm:aspect-[16/10]" : mode === "featured" ? "aspect-[4/5]" : "aspect-[3/4]";
  const nameSize = mode === "detail" ? "text-4xl sm:text-6xl" : mode === "featured" ? "text-2xl" : "text-sm";
  const padBottom = mode === "compact" ? "p-2" : mode === "featured" ? "p-4" : "p-6";

  const Comp = onClick ? motion.button : motion.div;

  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      disabled={disabled}
      whileHover={onClick && !disabled ? { y: -3 } : {}}
      whileTap={onClick && !disabled ? { scale: 0.97 } : {}}
      data-testid={testid}
      className={`relative w-full overflow-hidden text-left rounded-xl group ${aspect} ${disabled ? "opacity-40 grayscale" : ""} ${className}`}
      style={{ boxShadow: frameGlow, border: `1px solid ${rarity.color}55` }}
    >
      {hero.portrait ? (
        <img
          src={hero.portrait}
          alt={hero.name}
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0B0B14]">
          <Image className="w-8 h-8 text-slate-700" />
        </div>
      )}

      {/* inner vignette — edges recede instead of hard-cropping */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: vignetteInset }} />

      {/* elite shine sweep for UR/LR */}
      {elite && !disabled && <span className="absolute inset-0 shine-sweep pointer-events-none" />}

      {/* top-left: element, minimal glyph — no boxed pill */}
      <div className="absolute top-2 left-2.5 flex items-center gap-1 z-10">
        <span
          className="w-2 h-2 rounded-full"
          style={{ background: element.color, boxShadow: `0 0 6px ${element.color}` }}
        />
        {mode !== "compact" && (
          <span className="text-[11px] font-semibold tracking-wide" style={{ color: element.color, textShadow: `0 0 8px ${element.color}` }}>
            {hero.element}
          </span>
        )}
      </div>

      {/* top-right: level — plain glowing text, no box */}
      {hero.level != null && (
        <div className="absolute top-2 right-2.5 z-10 font-display text-white leading-none" style={{ textShadow: "0 0 10px rgba(0,0,0,0.9)" }}>
          <span className={mode === "compact" ? "text-sm" : "text-lg"}>Lv.{hero.level}</span>
        </div>
      )}

      {/* bottom scrim + name/rarity — overlaid directly on the artwork */}
      <div className="absolute inset-x-0 bottom-0 z-10" style={{ background: scrimBottom(mode === "compact" ? "0.85" : "0.92") }}>
        <div className={padBottom}>
          <p className={`font-display tracking-wide text-white leading-none truncate ${nameSize}`} style={{ textShadow: "0 2px 10px rgba(0,0,0,0.8)" }}>
            {hero.name}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: rarity.color, textShadow: `0 0 8px ${rarity.color}` }}>
              {rarity.name}
            </span>
            {hero.role && mode !== "compact" && <span className="text-[10px] text-slate-400">· {hero.role}</span>}
            {hero.power != null && mode !== "compact" && (
              <span className="text-[10px] text-amber-300 ml-auto font-semibold">{hero.power} PWR</span>
            )}
          </div>
        </div>
      </div>
    </Comp>
  );
}
