import { Sparkles } from "lucide-react";
import { RARITY } from "@/lib/styles";

/**
 * Glowing, gem-like rarity badge used on the hero showcase (top-right of portrait).
 * Higher rarities pulse and sparkle like popular gacha titles.
 */
export const RarityBadge = ({ rarity, size = "md" }) => {
  const r = RARITY[rarity] || RARITY.R;
  const tier = r.tier ?? 0;
  const dim = size === "lg" ? "w-16 h-16 text-4xl" : "w-11 h-11 text-2xl";
  const elite = tier >= 4; // UR and above

  return (
    <div className="flex flex-col items-center gap-1 select-none" data-testid={`rarity-badge-${rarity}`}>
      <div
        className={`relative ${dim} rounded-2xl flex items-center justify-center font-display tracking-wide rarity-pulse overflow-hidden`}
        style={{
          "--glow": `${r.color}cc`,
          background: `radial-gradient(circle at 32% 26%, rgba(255,255,255,0.55), transparent 46%), ${r.color}`,
          color: "#05050A",
          border: "2px solid rgba(255,255,255,0.85)",
        }}
      >
        <span className="relative z-10 drop-shadow">{r.label}</span>
        {elite && (
          <span className="absolute inset-0 shine-sweep" />
        )}
      </div>
      <span
        className="text-[11px] font-extrabold uppercase tracking-[0.18em]"
        style={{ color: r.color, textShadow: `0 0 12px ${r.color}` }}
      >
        {r.name}
      </span>
      {elite && (
        <Sparkles className="w-3 h-3 -mt-0.5" style={{ color: r.color }} />
      )}
    </div>
  );
};
