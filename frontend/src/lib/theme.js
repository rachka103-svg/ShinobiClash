// ---------------------------------------------------------------------------
// SHINOBI CLASH — centralized visual design system.
//
// Purple/night is the ATMOSPHERE of this game, not the entire interface.
// Hierarchy should come from artwork, contrast, lighting, spacing and
// typography first — accent color is used deliberately, not everywhere.
//
// This module is additive: `lib/styles.js` keeps re-exporting RARITY/ELEMENT
// from here unchanged so every existing screen keeps working exactly as
// before. New screens should pull tokens from here directly.
// ---------------------------------------------------------------------------

// ---- Background / surface layers --------------------------------------
export const BG = {
  void: "#05050A",   // deepest background — behind everything
  deep: "#0B0B14",   // base app background
  night: "#12121F",  // slightly lifted panel background (used sparingly)
};

export const SURFACE = {
  // Frosted glass — used only where information truly needs separation
  // from the artwork behind it (e.g. a bottom info sheet over a portrait).
  glass: "rgba(8, 8, 16, 0.55)",
  glassStrong: "rgba(6, 6, 12, 0.78)",
  // Very subtle raised panel — for small HUD strips, never a full card grid.
  hairline: "rgba(255, 255, 255, 0.08)",
};

// ---- Text hierarchy ------------------------------------------------------
export const TEXT = {
  primary: "#FFFFFF",
  secondary: "rgba(226, 232, 240, 0.78)", // slate-200 @ 78%
  tertiary: "rgba(148, 163, 184, 0.72)",  // slate-400 @ 72%
  muted: "rgba(100, 116, 139, 0.55)",     // slate-500 @ 55%
};

// ---- Accent colors — used deliberately, never as a background wash -----
export const ACCENT = {
  chakra: "#00E5FF", // primary interactive / highlight
  fox: "#FF5722",    // primary CTA / energy
  jutsu: "#D500F9",  // secondary mystical accent (spire/ability)
  gold: "#FFCA28",   // premium / reward / ascension
};

// ---- Rarity — 5 canonical tiers, strong & unmistakable at a glance ------
// R < SR < SSR < UR < GR, with GR as the pinnacle (and the pity target).
export const RARITY = {
  R: { label: "R", color: "#9E9E9E", name: "Common", tier: 0 },
  SR: { label: "SR", color: "#29B6F6", name: "Rare", tier: 1 },
  SSR: { label: "SSR", color: "#AB47BC", name: "Epic", tier: 2 },
  UR: { label: "UR", color: "#FFCA28", name: "Legendary", tier: 3 },
  LR: { label: "LR", color: "#FF5252", name: "Mythic", tier: 4 },
  GR: { label: "GR", color: "#64FFDA", name: "Ascendant", tier: 5 },
};

// ---- Elements — communicate identity through color, not labels alone ---
export const ELEMENT = {
  Fire: { color: "#FF5722", icon: "flame" },
  Water: { color: "#29B6F6", icon: "droplet" },
  Wind: { color: "#00E676", icon: "wind" },
  Earth: { color: "#A1887F", icon: "mountain" },
  Lightning: { color: "#FFCA28", icon: "zap" },
  Dark: { color: "#7C4DFF", icon: "moon" },
  Light: { color: "#FFD54F", icon: "sun" },
};

// ---- Radii ---------------------------------------------------------------
export const RADIUS = {
  sm: "0.5rem",
  md: "0.75rem",
  lg: "1rem",
  xl: "1.25rem",
  full: "9999px",
};

// ---- Spacing scale (reference — most layout uses Tailwind directly) ----
export const SPACE = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 };

// ---- Typography scale -----------------------------------------------------
export const TYPE = {
  display: "'Bebas Neue', sans-serif",
  body: "'Outfit', sans-serif",
  hero: "clamp(2.5rem, 8vw, 4.5rem)",   // showcase character names
  h1: "clamp(1.75rem, 5vw, 2.75rem)",   // screen titles
  h2: "1.375rem",                        // section titles
  label: "0.7rem",                       // uppercase tracked micro-labels
};

// ---- Glow / shadow presets ------------------------------------------------
/** A soft, controlled outer glow tinted to a color — used for rarity/element
 * accents. Intensity 1 = subtle, 3 = hero showcase strength. */
export const glow = (color, intensity = 1) =>
  `0 0 ${6 * intensity}px ${color}${intensity >= 3 ? "cc" : intensity >= 2 ? "99" : "66"}, 0 0 ${14 * intensity}px ${color}${intensity >= 2 ? "55" : "33"}`;

export const SHADOW = {
  soft: "0 12px 32px rgba(0, 0, 0, 0.45)",
  lift: "0 20px 48px rgba(0, 0, 0, 0.55)",
};

/** Bottom-up gradient for legible text over artwork — no boxed panel needed. */
export const scrimBottom = (strength = "0.92") =>
  `linear-gradient(to top, rgba(5,5,10,${strength}) 0%, rgba(5,5,10,0.35) 45%, transparent 75%)`;

/** Subtle inner vignette so portrait edges recede instead of hard-cropping. */
export const vignetteInset =
  "radial-gradient(120% 100% at 50% 0%, transparent 55%, rgba(0,0,0,0.35) 100%)";

export const rarityTier = (rarityKey) => RARITY[rarityKey]?.tier ?? 0;

// ---------------------------------------------------------------------------
// PRESTIGE / DECO tokens — "Neon Shadow — Deco Prestige" theme.
// Gold is the PRESTIGE accent (rarity/rewards/premium); cyan stays the primary
// interactive accent. Used for gold hairlines, corner filigree and crests.
// ---------------------------------------------------------------------------
export const GOLD = {
  base: "#FFCA28",
  bright: "#FFC857",
  dim: "rgba(255,202,40,0.22)",
  hairline: "rgba(255,202,40,0.38)",
  stroke: "rgba(255,202,40,0.55)",
};

/** GODLY — the pinnacle prestige treatment for GR. A prismatic, color-shifting
 *  border with the GR mint-cyan as its glow anchor. Even more ornate than gold. */
export const GODLY = {
  base: "#64FFDA",
  stroke: "rgba(100,255,218,0.7)",
  hairline: "rgba(100,255,218,0.4)",
};

export const STROKE = {
  soft: "rgba(255,255,255,0.08)",
  base: "rgba(255,255,255,0.12)",
  hard: "rgba(255,255,255,0.18)",
};

// Which rarities receive the gold prestige treatment on their frame.
export const GOLD_RARITIES = ["UR", "LR", "GR"];
// GR gets the Godly treatment (even more ornate than gold).
export const GODLY_RARITIES = ["GR"];

/**
 * rarityFrame(key) — resolves the ornate, rarity-scaled frame treatment.
 * Ornamentation (corner level) and glow strength grow with rarity; the top
 * prestige tiers (UR / LR / MYTHIC) switch to a gold structure.
 *
 * returns:
 *  - tier            numeric rarity tier
 *  - rarityColor     the raw rarity color
 *  - useGold         whether this tier uses the gold prestige structure
 *  - cornerLevel     0 none · 1 SR · 2 SSR · 3 UR/GR · 4 LR/MYTHIC
 *  - strokeColor     outer frame border color
 *  - strokeWidth     outer frame border width (px)
 *  - cornerColor     color for the deco corner ornaments
 */
export const rarityFrame = (key) => {
  const r = RARITY[key] || RARITY.R;
  const t = r.tier;
  const isGodly = GODLY_RARITIES.includes(key);
  const useGold = GOLD_RARITIES.includes(key);
  // UR now gets the full gold ornamentation (cornerLevel 4) that GR used to
  // have; GR gets a new Godly level (5) with even more corner studs.
  const cornerLevel = t >= 4 ? 5 : t >= 3 ? 4 : t >= 2 ? 2 : t >= 1 ? 1 : 0;
  return {
    tier: t,
    rarityColor: r.color,
    useGold,
    isGodly,
    cornerLevel,
    strokeColor: isGodly ? GODLY.stroke : useGold ? GOLD.stroke : `${r.color}66`,
    strokeWidth: isGodly ? 3 : t >= 3 ? 2 : 1,
    cornerColor: isGodly ? GODLY.base : useGold ? GOLD.base : r.color,
  };
};
