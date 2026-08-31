import { RARITY } from "@/lib/styles";
import { rarityFrame, GOLD, GODLY } from "@/lib/theme";

const RARITY_TIER_MAP = Object.fromEntries(Object.entries(RARITY).map(([k, v]) => [k, v.tier]));
export const RARITY_TIER = RARITY_TIER_MAP;

// Returns the aura className for a rarity (animated glow for SSR+).
export const auraClass = (rarity) => {
  const t = RARITY_TIER[rarity] ?? 0;
  return t >= 4 ? "aura-5" : t >= 3 ? "aura-4" : t >= 2 ? "aura-2" : "";
};

/* ==========================================================================
   DecoCorners — distinct, rarity-scaled corner ornaments.
   Each level renders a UNIQUE SVG flourish (no shared "dots + brackets"):
     1 (SR)   — single diagonal accent slash
     2 (SSR)  — stepped double-line deco bracket
     3 (UR)   — gold filigree crest with end bead
     4 (UR+)  — royal crest with inner curve + gem
     5 (GR)   — godly double-sweep flourish with a 4-point star (mint, no gold)
   The ornament is drawn once for the top-left corner and mirrored to the
   other three corners. GR uses the GODLY mint-cyan so it reads distinct
   from UR's gold.
   ========================================================================== */

const SW = 2;        // main stroke width (viewBox units)
const SW2 = 1.4;      // secondary stroke width

// Each ornament is drawn for the TOP-LEFT corner (pointing into it).
const ORNAMENTS = {
  // SR — a single quiet diagonal accent.
  1: () => (
    <path d="M4 14 L14 4" fill="none" stroke="currentColor" strokeWidth={SW} strokeLinecap="round" />
  ),
  // SSR — stepped double-line deco bracket.
  2: () => (
    <>
      <path d="M3 3 H15 M3 3 V15" fill="none" stroke="currentColor" strokeWidth={SW} strokeLinecap="round" />
      <path d="M7 7 H13 M7 7 V13" fill="none" stroke="currentColor" strokeWidth={SW2} strokeLinecap="round" opacity="0.6" />
    </>
  ),
  // UR — gold filigree crest: a quarter-arc sweep with an end bead.
  3: () => (
    <>
      <path d="M3 16 C3 8 8 3 16 3" fill="none" stroke="currentColor" strokeWidth={SW} strokeLinecap="round" />
      <circle cx="16" cy="3" r="1.6" fill="currentColor" />
    </>
  ),
  // UR-featured — royal crest: wider sweep + inner arc + gem diamond.
  4: () => (
    <>
      <path d="M3 17 C3 8 8 3 17 3" fill="none" stroke="currentColor" strokeWidth={SW} strokeLinecap="round" />
      <path d="M7 14 C7 9 9 7 14 7" fill="none" stroke="currentColor" strokeWidth={SW2} strokeLinecap="round" opacity="0.7" />
      <path d="M13 11 L15 9 L17 11 L15 13 Z" fill="currentColor" />
    </>
  ),
  // GR — godly flourish: elaborate double sweep + 4-point star (mint, no dots).
  5: () => (
    <>
      <path d="M3 19 C3 9 9 3 19 3" fill="none" stroke="currentColor" strokeWidth={SW} strokeLinecap="round" />
      <path d="M7 16 C7 10 10 7 16 7" fill="none" stroke="currentColor" strokeWidth={SW2} strokeLinecap="round" opacity="0.6" />
      <path d="M12 12 L14 8 L16 12 L14 16 Z" fill="currentColor" opacity="0.92" />
      <circle cx="19" cy="3" r="1.1" fill="currentColor" />
    </>
  ),
};

const CORNERS = [
  { top: 0, left: 0, transform: "none" },
  { top: 0, right: 0, transform: "scaleX(-1)" },
  { bottom: 0, left: 0, transform: "scaleY(-1)" },
  { bottom: 0, right: 0, transform: "scale(-1,-1)" },
];

export const DecoCorners = ({ rarity, level, color, size = 14 }) => {
  let lvl = level;
  let col = color;
  if (rarity) {
    const f = rarityFrame(rarity);
    lvl = f.cornerLevel;
    // GR keeps its GODLY mint-cyan (distinct from UR gold); UR stays gold.
    col = f.isGodly ? GODLY.base : f.useGold ? GOLD.base : f.rarityColor;
  }
  if (!lvl || lvl <= 0) return null;
  const Orn = ORNAMENTS[lvl] || ORNAMENTS[2];
  const px = Math.round(size * 1.25);
  return (
    <div className="deco-corners" style={{ "--corner-color": col }} aria-hidden>
      {CORNERS.map((c, i) => (
        <svg
          key={i}
          viewBox="0 0 24 24"
          width={px}
          height={px}
          style={{
            position: "absolute",
            top: c.top,
            left: c.left,
            right: c.right,
            bottom: c.bottom,
            color: col,
            transform: c.transform,
            transformOrigin: "center",
            filter: `drop-shadow(0 0 3px ${col})`,
          }}
        >
          {Orn()}
        </svg>
      ))}
    </div>
  );
};

// Floating sparkle particles overlay — only rendered for UR and above.
export const RaritySparkles = ({ rarity }) => {
  const t = RARITY_TIER[rarity] ?? 0;
  if (t < 3) return null;
  const color = (RARITY[rarity] || RARITY.R).color;
  const dots = t >= 4 ? [
    { left: "10%", delay: "0s" }, { left: "24%", delay: "0.5s" }, { left: "38%", delay: "0.2s" },
    { left: "52%", delay: "0.8s" }, { left: "66%", delay: "0.3s" }, { left: "80%", delay: "1.0s" },
    { left: "90%", delay: "0.6s" },
  ] : t >= 3 ? [
    { left: "14%", delay: "0s" }, { left: "32%", delay: "0.7s" }, { left: "55%", delay: "0.3s" },
    { left: "72%", delay: "1.1s" }, { left: "88%", delay: "0.5s" },
  ] : [
    { left: "22%", delay: "0s" }, { left: "60%", delay: "0.6s" }, { left: "82%", delay: "1.0s" },
  ];
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ "--glow": color }} aria-hidden>
      {dots.map((d, i) => (
        <span key={i} className="sparkle" style={{ left: d.left, bottom: "18%", animationDelay: d.delay }} />
      ))}
    </div>
  );
};
