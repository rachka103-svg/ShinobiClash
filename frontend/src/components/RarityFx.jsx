import { RARITY } from "@/lib/styles";

const RARITY_TIER_MAP = Object.fromEntries(Object.entries(RARITY).map(([k, v]) => [k, v.tier]));
export const RARITY_TIER = RARITY_TIER_MAP;

// Returns the aura className for a rarity (animated glow for SSR+).
export const auraClass = (rarity) => {
  const t = RARITY_TIER[rarity] ?? 0;
  return t >= 6 ? "aura-4" : t >= 4 ? "aura-3" : t >= 3 ? "aura-2" : "";
};

// Floating sparkle particles overlay — only rendered for UR and above.
export const RaritySparkles = ({ rarity }) => {
  const t = RARITY_TIER[rarity] ?? 0;
  if (t < 4) return null;
  const color = (RARITY[rarity] || RARITY.R).color;
  const dots = t >= 6 ? [
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
