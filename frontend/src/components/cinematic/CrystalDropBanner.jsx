import { useEffect, useState } from "react";
import { Gem, Sparkles, X } from "lucide-react";

/**
 * CrystalDropBanner — a super-rare drop banner shown when a signature
 * Boss Crysta drops from a Tsukuyomi or Boss Hunt boss.
 *
 * Inspired by Iruna/Toram Online's rare-drop presentation:
 *   - Full-screen dark overlay
 *   - Crystal name in large display type with glow
 *   - "Signature Crysta of [Boss Name]" subtitle
 *   - Effect reveal (combat modifiers)
 *   - Particle shimmer
 *   - Tap to dismiss
 *
 * Props:
 *   crystal — the crystal reward object from the API (rewards.crystal)
 *   onDismiss — callback when the player taps to continue
 */
export default function CrystalDropBanner({ crystal, onDismiss }) {
  const [stage, setStage] = useState(0); // 0=hidden, 1=banner, 2=effects

  useEffect(() => {
    if (!crystal) { setStage(0); return; }
    const t1 = setTimeout(() => setStage(1), 100);
    const t2 = setTimeout(() => setStage(2), 1200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [crystal]);

  if (!crystal || !crystal.boss_crysta) return null;

  const bc = crystal.boss_crysta;
  const color = crystal.tier_color || "#FF1744";
  const isBossHunt = bc.source === "boss_hunt";

  // Build effect description from combat modifiers
  const effectLines = [];
  const mods = bc.combat_modifiers || {};
  const modLabels = {
    damage_reduction: (v) => `Damage Reduction +${Math.round(v * 100)}%`,
    lifesteal_pct: (v) => `Lifesteal +${v}%`,
    regen_pct: (v) => `Regen +${v}%/turn`,
    shield_pct: (v) => `Shield Strength +${v}%`,
    cc_resistance: (v) => `CC Resistance +${Math.round(v * 100)}%`,
    debuff_resistance: (v) => `Debuff Resistance +${Math.round(v * 100)}%`,
    physical_resistance: (v) => `Physical Resistance +${Math.round(v * 100)}%`,
    magic_resistance: (v) => `Magic Resistance +${Math.round(v * 100)}%`,
    physical_damage_reduction: (v) => `Phys DMG Reduction +${Math.round(v * 100)}%`,
    magic_damage_reduction: (v) => `Magic DMG Reduction +${Math.round(v * 100)}%`,
    crit_resistance: (v) => `Crit Resistance +${Math.round(v * 100)}%`,
    crit_damage_reduction: (v) => `Crit DMG Reduction +${Math.round(v * 100)}%`,
  };
  for (const [key, val] of Object.entries(mods)) {
    if (typeof val === "number") {
      const fn = modLabels[key];
      if (fn) effectLines.push({ text: fn(val), positive: !key.includes("vulnerability") && !key.includes("amplification") });
    } else if (typeof val === "object") {
      for (const [subKey, subVal] of Object.entries(val)) {
        if (key === "elemental_resistance") effectLines.push({ text: `${subKey} Resistance +${Math.round(subVal * 100)}%`, positive: true });
        else if (key === "elemental_vulnerability") effectLines.push({ text: `${subKey} Vulnerability +${Math.round(subVal * 100)}%`, positive: false });
        else if (key === "ailment_resistance") effectLines.push({ text: `${subKey} Resist +${Math.round(subVal * 100)}%`, positive: true });
        else if (key === "ailment_amplification") effectLines.push({ text: `${subKey} Amplification +${Math.round(subVal * 100)}%`, positive: false });
        else if (key === "status_resistance") effectLines.push({ text: `${subKey} Resist +${Math.round(subVal * 100)}%`, positive: true });
      }
    }
  }

  // Deterministic particle positions
  const particles = Array.from({ length: 16 }, (_, i) => {
    const s = (i + 1) * 7.3;
    return {
      left: `${((s * 13.7) % 100)}%`,
      top: `${((s * 7.1) % 100)}%`,
      size: 2 + ((s * 3) % 4),
      delay: `${((s * 1.3) % 10) * 0.1}s`,
      duration: `${2 + ((s * 7) % 4)}s`,
    };
  });

  return (
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center cursor-pointer"
      onClick={onDismiss}
      data-testid="crystal-drop-banner"
      style={{
        background: "rgba(5,5,10,0.95)",
        backdropFilter: "blur(8px)",
        animation: "crystalFadeIn 0.3s ease-out",
      }}
    >
      {/* Radial glow */}
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: "90vw",
          maxWidth: 700,
          height: 700,
          background: `radial-gradient(circle, ${color}33 0%, ${color}11 30%, transparent 60%)`,
          animation: "crystalGlowPulse 2s ease-in-out infinite alternate",
        }}
      />

      {/* Shimmer particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {particles.map((p, i) => (
          <span
            key={i}
            className="absolute rounded-full"
            style={{
              left: p.left,
              top: p.top,
              width: p.size,
              height: p.size,
              background: color,
              boxShadow: `0 0 ${p.size * 3}px ${color}`,
              animation: `crystalShimmer ${p.duration} ease-in-out infinite`,
              animationDelay: p.delay,
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center px-6 max-w-md text-center">
        {/* Rarity tag */}
        {stage >= 1 && (
          <div
            className="font-display text-xs tracking-[0.3em] uppercase mb-3"
            style={{
              color: isBossHunt ? "#FF1744" : "#AB47BC",
              textShadow: `0 0 12px ${isBossHunt ? "#FF1744" : "#AB47BC"}88`,
              animation: "crystalSlideDown 0.5s ease-out",
            }}
          >
            {isBossHunt ? "✦ BOSS HUNT SIGNATURE ✦" : "✦ SIGNATURE CRYSTA ✦"}
          </div>
        )}

        {/* Crystal icon */}
        {stage >= 1 && (
          <div
            className="mb-4"
            style={{
              animation: "crystalIconPop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)",
            }}
          >
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center"
              style={{
                background: `linear-gradient(135deg, ${color}33, ${color}11)`,
                border: `2px solid ${color}66`,
                boxShadow: `0 0 30px ${color}44, inset 0 0 20px ${color}22`,
              }}
            >
              <Gem
                className="w-10 h-10"
                style={{ color, filter: `drop-shadow(0 0 8px ${color})` }}
              />
            </div>
          </div>
        )}

        {/* Crystal name */}
        {stage >= 1 && (
          <h2
            className="font-display text-3xl sm:text-4xl tracking-wide leading-tight mb-1"
            style={{
              color: "#FFFFFF",
              textShadow: `0 0 24px ${color}aa, 0 2px 8px rgba(0,0,0,0.8)`,
              animation: "crystalSlideUp 0.5s ease-out 0.2s both",
            }}
          >
            {bc.name}
          </h2>
        )}

        {/* Source boss */}
        {stage >= 1 && (
          <p
            className="text-sm text-slate-400 mb-1"
            style={{ animation: "crystalSlideUp 0.5s ease-out 0.4s both" }}
          >
            Signature Crysta of {bc.boss_name}
          </p>
        )}

        {/* Description */}
        {stage >= 1 && (
          <p
            className="text-xs text-slate-500 italic mb-4 max-w-xs leading-relaxed"
            style={{ animation: "crystalSlideUp 0.5s ease-out 0.5s both" }}
          >
            {bc.description}
          </p>
        )}

        {/* Effects reveal */}
        {stage >= 2 && effectLines.length > 0 && (
          <div
            className="space-y-1 mb-4"
            style={{ animation: "crystalSlideUp 0.4s ease-out" }}
          >
            {effectLines.map((eff, i) => (
              <p
                key={i}
                className="text-sm font-display tracking-wide"
                style={{
                  color: eff.positive ? "#00E676" : "#FF5722",
                  textShadow: `0 0 8px ${eff.positive ? "#00E67644" : "#FF572244"}`,
                }}
              >
                {eff.positive ? "+" : "−"} {eff.text}
              </p>
            ))}
          </div>
        )}

        {/* Tap to continue */}
        {stage >= 2 && (
          <div
            className="flex items-center gap-1.5 text-xs text-slate-500"
            style={{ animation: "crystalFadeIn 0.5s ease-out 0.3s both" }}
          >
            <X className="w-3 h-3" /> Tap to continue
          </div>
        )}
      </div>

      <style>{`
        @keyframes crystalFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes crystalGlowPulse {
          0% { opacity: 0.5; transform: scale(1); }
          100% { opacity: 1; transform: scale(1.1); }
        }
        @keyframes crystalShimmer {
          0%, 100% { opacity: 0; transform: scale(0.5); }
          50% { opacity: 0.8; transform: scale(1.2); }
        }
        @keyframes crystalIconPop {
          0% { transform: scale(0) rotate(-180deg); opacity: 0; }
          100% { transform: scale(1) rotate(0); opacity: 1; }
        }
        @keyframes crystalSlideDown {
          from { transform: translateY(-20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes crystalSlideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
