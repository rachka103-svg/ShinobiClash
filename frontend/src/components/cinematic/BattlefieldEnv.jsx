import { useMemo } from "react";

const PARTICLE_CLASS = {
  Fire: "el-particle-fire",
  Water: "el-particle-water",
  Lightning: "el-particle-lightning",
  Wind: "el-particle-wind",
  Dark: "el-particle-dark",
  Earth: "el-particle-earth",
  Light: "el-particle-light",
};

// Map campaign regions → biome keys
const REGION_BIOME = {
  "Leaf Outskirts": "forest", "Misty Woods": "forest", "Verdant Undercroft": "forest",
  "Rocky Pass": "stone", "Obsidian Bastion": "stone",
  "Howling Cliffs": "storm", "Skyshard Peaks": "storm", "Thundercrag Basin": "storm",
  "Forsaken Shrine": "shadow", "Withering Hollow": "shadow", "Voidglass Expanse": "shadow",
  "Ashfall Wastes": "fire", "Sunspire Sanctum": "fire",
  "Drowned Coral Reach": "water", "Frozen Reliquary": "water",
};

// Per-biome visual config: sky gradient, fog tint, particle class, accent
const BIOME_CONFIG = {
  forest: {
    sky: "linear-gradient(180deg, #06120C 0%, #0A1812 35%, #0E1A18 60%, #08120E 100%)",
    fog: "rgba(0,230,118,0.06)",
    accent: "#00E676",
    particle: "el-particle-wind",
    silhouette: "trees",
  },
  storm: {
    sky: "linear-gradient(180deg, #060A16 0%, #0A0E22 35%, #0E1228 60%, #080A1E 100%)",
    fog: "rgba(64,196,255,0.07)",
    accent: "#40C4FF",
    particle: "el-particle-lightning",
    silhouette: "peaks",
    lightning: true,
  },
  stone: {
    sky: "linear-gradient(180deg, #100E0A 0%, #16120E 35%, #1A1612 60%, #120E0A 100%)",
    fog: "rgba(161,136,127,0.08)",
    accent: "#A1887F",
    particle: "el-particle-earth",
    silhouette: "cliffs",
  },
  shadow: {
    sky: "linear-gradient(180deg, #0A0614 0%, #0E0A1E 35%, #120E28 60%, #0A0618 100%)",
    fog: "rgba(124,77,255,0.1)",
    accent: "#7C4DFF",
    particle: "el-particle-dark",
    silhouette: "ruins",
  },
  fire: {
    sky: "linear-gradient(180deg, #140606 0%, #1A0A0A 35%, #1E0E0C 60%, #140808 100%)",
    fog: "rgba(255,87,34,0.08)",
    accent: "#FF5722",
    particle: "el-particle-fire",
    silhouette: "peaks",
    ember: true,
  },
  water: {
    sky: "linear-gradient(180deg, #060E14 0%, #0A141E 35%, #0E1828 60%, #080C18 100%)",
    fog: "rgba(41,182,246,0.08)",
    accent: "#29B6F6",
    particle: "el-particle-water",
    silhouette: "cliffs",
  },
};

/**
 * BattlefieldEnv — a full-screen layered dark-fantasy environment built from
 * CSS gradients, silhouettes, fog, particles and glow. Three depth layers
 * with subtle parallax. The environment varies by campaign region (biome)
 * while the `element` prop tints the ambient energy glow.
 *
 * Props:
 *   element — dominant element of the battle (tints ambient energy)
 *   region  — campaign region name (selects the biome)
 *   shake   — triggers screen-shake class on the wrapper
 *   mode    — battle mode (campaign, spire, tsukuyomi, bosshunt) for bg image
 */
export default function BattlefieldEnv({ element = "Dark", region = null, shake = false, shrine = false, mode = null }) {
  // Deterministic particle positions (stable across re-renders) — must be
  // called unconditionally (before any early return) per React hooks rules.
  const particles = useMemo(
    () =>
      Array.from({ length: 18 }).map((_, i) => ({
        left: `${(i * 5.5 + 3) % 100}%`,
        size: 2 + ((i * 3) % 4),
        duration: 8 + ((i * 7) % 12),
        delay: `${(i * 1.3) % 10}s`,
        drift: `${((i % 5) - 2) * 15}px`,
      })),
    []
  );

  // Mode-specific background images
  const MODE_BG = {
    bosshunt: { img: "/bosshunt-shrine.webp", glow: "rgba(139,0,0,0.12)", fog: "rgba(139,0,0,0.08)", biome: "shrine" },
    tsukuyomi: { img: "/bg-tsukuyomi.webp", glow: "rgba(181,62,255,0.15)", fog: "rgba(124,77,255,0.10)", biome: "tsukuyomi" },
    spire: { img: "/bg-spire.webp", glow: "rgba(106,90,205,0.12)", fog: "rgba(106,90,205,0.08)", biome: "spire" },
    campaign: { img: "/bg-campaign.webp", glow: "rgba(212,138,77,0.10)", fog: "rgba(212,138,77,0.06)", biome: "campaign" },
  };

  const modeBg = (shrine || mode === "bosshunt") ? MODE_BG.bosshunt
    : mode === "tsukuyomi" ? MODE_BG.tsukuyomi
    : mode === "spire" ? MODE_BG.spire
    : mode === "campaign" ? MODE_BG.campaign
    : null;

  if (modeBg) {
    return (
      <div className={`absolute inset-0 overflow-hidden ${shake ? "screen-shake" : ""}`} data-testid="battlefield-env" data-biome={modeBg.biome}>
        {/* Background image */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${modeBg.img})` }}
        />
        {/* Dark overlay for readability */}
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(5,5,10,0.35) 0%, rgba(5,5,10,0.15) 40%, rgba(5,5,10,0.55) 100%)" }} />
        {/* Ambient glow */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(80% 50% at 50% 25%, ${modeBg.glow} 0%, transparent 60%)` }} />
        {/* Fog layers */}
        <div className="absolute bottom-0 left-0 w-full h-[35%] fog-drift-slow" style={{ background: `linear-gradient(to top, rgba(15,10,15,0.6), transparent)`, filter: "blur(20px)" }} />
        <div className="absolute bottom-[10%] left-0 w-full h-[20%] fog-drift" style={{ background: `linear-gradient(to top, ${modeBg.fog}, transparent)`, filter: "blur(15px)" }} />
        {/* Cinematic vignette */}
        <div className="cine-vignette" />
        {/* Top/bottom cinematic darkening */}
        <div className="absolute top-0 left-0 w-full h-20 pointer-events-none" style={{ background: "linear-gradient(to bottom, rgba(5,5,10,0.7), transparent)" }} />
        <div className="absolute bottom-0 left-0 w-full h-32 pointer-events-none" style={{ background: "linear-gradient(to top, rgba(5,5,10,0.6), transparent)" }} />
      </div>
    );
  }

  const biomeKey = (region && REGION_BIOME[region]) || "shadow";
  const biome = BIOME_CONFIG[biomeKey] || BIOME_CONFIG.shadow;
  const elColor = (element && PARTICLE_CLASS[element]) ? biome.accent : biome.accent;
  const particleClass = biome.particle || PARTICLE_CLASS[element] || PARTICLE_CLASS.Dark;

  return (
    <div className={`absolute inset-0 overflow-hidden ${shake ? "screen-shake" : ""}`} data-testid="battlefield-env" data-biome={biomeKey}>
      {/* ===== BACKGROUND LAYER ===== */}
      <div className="absolute inset-0" style={{ background: biome.sky }} />

      {/* Moonlight glow (subtle, tinted by biome) */}
      <div className="absolute parallax-bg" style={{ top: "8%", right: "12%", width: 120, height: 120 }}>
        <div className="moon-glow w-full h-full rounded-full" style={{ background: `radial-gradient(circle, ${biome.accent}40 0%, ${biome.accent}10 40%, transparent 70%)` }} />
        <div className="absolute inset-0 rounded-full" style={{ background: `radial-gradient(circle at 40% 40%, ${biome.accent}66 0%, ${biome.accent}22 50%, transparent 80%)`, filter: "blur(1px)" }} />
      </div>

      {/* Lightning flash (storm biome only) */}
      {biome.lightning && (
        <div className="absolute inset-0 lightning-flash pointer-events-none" style={{ background: "radial-gradient(ellipse at 30% 20%, rgba(200,220,255,0.25) 0%, transparent 50%)" }} />
      )}

      {/* Distant silhouettes per biome */}
      {biome.silhouette === "peaks" && (
        <svg className="absolute bottom-0 left-0 w-full h-[45%] parallax-bg" viewBox="0 0 1200 400" preserveAspectRatio="xMidYMax slice" style={{ opacity: 0.55 }}>
          <polygon points="0,400 0,250 80,180 160,220 240,140 340,190 420,100 520,170 620,80 720,160 820,120 920,200 1020,130 1120,190 1200,150 1200,400" fill="#0C0C1E" />
          <polygon points="0,400 0,300 100,240 200,280 300,200 400,260 500,180 600,250 700,190 800,270 900,210 1000,260 1100,220 1200,280 1200,400" fill="#0A0A18" opacity="0.7" />
        </svg>
      )}
      {biome.silhouette === "trees" && (
        <svg className="absolute bottom-0 left-0 w-full h-[50%] parallax-bg" viewBox="0 0 1200 400" preserveAspectRatio="xMidYMax slice" style={{ opacity: 0.5 }}>
          {Array.from({ length: 14 }).map((_, i) => {
            const x = i * 90 + 20;
            const h = 180 + ((i * 47) % 120);
            const w = 40 + ((i * 23) % 20);
            return <polygon key={i} points={`${x},400 ${x - w / 2},${400 - h * 0.7} ${x},${400 - h} ${x + w / 2},${400 - h * 0.7}`} fill="#070F0A" />;
          })}
          <polygon points="0,400 0,320 1200,340 1200,400" fill="#050A08" opacity="0.8" />
        </svg>
      )}
      {biome.silhouette === "cliffs" && (
        <svg className="absolute bottom-0 left-0 w-full h-[45%] parallax-bg" viewBox="0 0 1200 400" preserveAspectRatio="xMidYMax slice" style={{ opacity: 0.5 }}>
          <polygon points="0,400 0,200 120,200 140,260 260,260 280,180 400,180 420,240 560,240 580,160 720,160 740,220 880,220 900,200 1020,200 1040,260 1200,260 1200,400" fill="#0C0A08" />
          {/* Broken pillars */}
          <rect x="200" y="180" width="14" height="80" fill="#0A0806" />
          <rect x="520" y="160" width="14" height="100" fill="#0A0806" />
          <rect x="840" y="200" width="14" height="60" fill="#0A0806" />
        </svg>
      )}
      {biome.silhouette === "ruins" && (
        <svg className="absolute bottom-0 left-0 w-full h-[45%] parallax-bg" viewBox="0 0 1200 400" preserveAspectRatio="xMidYMax slice" style={{ opacity: 0.5 }}>
          {/* Floating broken arches */}
          <path d="M 100 400 L 100 280 Q 160 220 220 280 L 220 400 Z" fill="#0A0814" />
          <path d="M 480 400 L 480 240 Q 560 170 640 240 L 640 400 Z" fill="#080612" />
          <path d="M 880 400 L 880 290 Q 940 240 1000 290 L 1000 400 Z" fill="#0A0814" />
          <polygon points="0,400 0,320 1200,340 1200,400" fill="#06040E" opacity="0.8" />
        </svg>
      )}

      {/* Temple/pagoda silhouettes (shared accent, subtle) */}
      <svg className="absolute bottom-[20%] left-[15%] w-24 h-32 parallax-bg" viewBox="0 0 100 130" style={{ opacity: 0.3 }} preserveAspectRatio="xMidYMax meet">
        <polygon points="50,0 35,20 65,20" fill="#080812" />
        <rect x="38" y="20" width="24" height="8" fill="#080812" />
        <polygon points="28,28 72,28 78,38 22,38" fill="#080812" />
        <rect x="35" y="38" width="30" height="10" fill="#080812" />
        <polygon points="25,48 75,48 80,58 20,58" fill="#080812" />
        <rect x="32" y="58" width="36" height="12" fill="#080812" />
        <polygon points="22,70 78,70 84,80 16,80" fill="#080812" />
        <rect x="30" y="80" width="40" height="50" fill="#080812" />
      </svg>

      {/* Distant fog layers */}
      <div className="absolute bottom-[15%] left-0 w-full h-[30%] fog-drift-slow" style={{ background: `linear-gradient(to top, ${biome.fog}, transparent)`, filter: "blur(20px)" }} />
      <div className="absolute bottom-[25%] left-0 w-full h-[20%] fog-drift" style={{ background: `linear-gradient(to top, ${biome.accent}11, transparent)`, filter: "blur(15px)" }} />

      {/* ===== MIDGROUND LAYER ===== */}
      <div className="absolute bottom-0 left-0 w-full h-[25%]" style={{ background: "linear-gradient(to top, #060610 0%, rgba(10,10,25,0.6) 60%, transparent 100%)" }} />
      <div className="absolute bottom-[12%] left-0 w-full h-px" style={{ background: `linear-gradient(90deg, transparent, ${biome.accent}44 30%, ${biome.accent}33 50%, ${biome.accent}44 70%, transparent)` }} />
      <div className="absolute bottom-[8%] left-0 w-full h-[15%] fog-drift" style={{ background: `linear-gradient(to top, rgba(10,10,30,0.5), transparent)`, filter: "blur(12px)" }} />

      {/* ===== FOREGROUND LAYER ===== */}
      <div className="absolute inset-0 pointer-events-none">
        {particles.map((p, i) => (
          <span
            key={i}
            className={`battle-particle ${particleClass}`}
            style={{
              left: p.left,
              bottom: "5%",
              width: p.size,
              height: p.size,
              animationDuration: `${p.duration}s`,
              animationDelay: p.delay,
              "--drift": p.drift,
            }}
          />
        ))}
      </div>

      {/* Ember glow (fire biome) */}
      {biome.ember && (
        <div className="absolute bottom-0 left-0 w-full h-[35%] pointer-events-none" style={{ background: "radial-gradient(ellipse at 50% 100%, rgba(255,87,34,0.12) 0%, transparent 60%)" }} />
      )}

      {/* Ambient element glow */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(100% 60% at 50% 80%, ${biome.accent}0D, transparent 70%)` }} />

      {/* Cinematic vignette */}
      <div className="cine-vignette" />

      {/* Top/bottom cinematic darkening for depth */}
      <div className="absolute top-0 left-0 w-full h-20 pointer-events-none" style={{ background: "linear-gradient(to bottom, rgba(5,5,10,0.8), transparent)" }} />
      <div className="absolute bottom-0 left-0 w-full h-32 pointer-events-none" style={{ background: "linear-gradient(to top, rgba(5,5,10,0.7), transparent)" }} />
    </div>
  );
}
