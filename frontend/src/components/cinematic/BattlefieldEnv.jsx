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

/**
 * BattlefieldEnv — a full-screen layered dark-fantasy Japanese environment
 * built entirely from CSS gradients, silhouettes, fog, particles and glow.
 * Three depth layers with subtle parallax: background (mountains/temples/
 * moon/fog), midground (arena ground + fog), foreground (particles).
 *
 * Props:
 *   element — dominant element of the battle (tints the ambient energy)
 *   shake   — triggers screen-shake class on the wrapper
 */
export default function BattlefieldEnv({ element = "Dark", shake = false }) {
  const particleClass = PARTICLE_CLASS[element] || PARTICLE_CLASS.Dark;

  // Deterministic particle positions (stable across re-renders)
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

  return (
    <div className={`absolute inset-0 overflow-hidden ${shake ? "screen-shake" : ""}`} data-testid="battlefield-env">
      {/* ===== BACKGROUND LAYER ===== */}
      {/* Deep navy gradient sky */}
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, #060614 0%, #0A0A1E 35%, #0E0E26 60%, #08081A 100%)" }} />

      {/* Moonlight glow */}
      <div className="absolute parallax-bg" style={{ top: "8%", right: "12%", width: 120, height: 120 }}>
        <div className="moon-glow w-full h-full rounded-full" style={{ background: "radial-gradient(circle, rgba(200,210,255,0.5) 0%, rgba(124,77,255,0.15) 40%, transparent 70%)" }} />
        <div className="absolute inset-0 rounded-full" style={{ background: "radial-gradient(circle at 40% 40%, rgba(220,225,255,0.8) 0%, rgba(180,190,220,0.3) 50%, transparent 80%)", filter: "blur(1px)" }} />
      </div>

      {/* Distant mountain silhouettes */}
      <svg className="absolute bottom-0 left-0 w-full h-[45%] parallax-bg" viewBox="0 0 1200 400" preserveAspectRatio="xMidYMax slice" style={{ opacity: 0.5 }}>
        <polygon points="0,400 0,250 80,180 160,220 240,140 340,190 420,100 520,170 620,80 720,160 820,120 920,200 1020,130 1120,190 1200,150 1200,400" fill="#0C0C1E" />
        <polygon points="0,400 0,300 100,240 200,280 300,200 400,260 500,180 600,250 700,190 800,270 900,210 1000,260 1100,220 1200,280 1200,400" fill="#0A0A18" opacity="0.7" />
      </svg>

      {/* Temple/pagoda silhouettes */}
      <svg className="absolute bottom-[20%] left-[15%] w-24 h-32 parallax-bg" viewBox="0 0 100 130" style={{ opacity: 0.35 }} preserveAspectRatio="xMidYMax meet">
        <polygon points="50,0 35,20 65,20" fill="#080812" />
        <rect x="38" y="20" width="24" height="8" fill="#080812" />
        <polygon points="28,28 72,28 78,38 22,38" fill="#080812" />
        <rect x="35" y="38" width="30" height="10" fill="#080812" />
        <polygon points="25,48 75,48 80,58 20,58" fill="#080812" />
        <rect x="32" y="58" width="36" height="12" fill="#080812" />
        <polygon points="22,70 78,70 84,80 16,80" fill="#080812" />
        <rect x="30" y="80" width="40" height="50" fill="#080812" />
      </svg>
      <svg className="absolute bottom-[22%] right-[12%] w-20 h-28 parallax-bg" viewBox="0 0 100 130" style={{ opacity: 0.3 }} preserveAspectRatio="xMidYMax meet">
        <polygon points="50,5 38,22 62,22" fill="#080812" />
        <rect x="40" y="22" width="20" height="8" fill="#080812" />
        <polygon points="30,30 70,30 76,40 24,40" fill="#080812" />
        <rect x="36" y="40" width="28" height="12" fill="#080812" />
        <polygon points="26,52 74,52 80,62 20,62" fill="#080812" />
        <rect x="34" y="62" width="32" height="68" fill="#080812" />
      </svg>

      {/* Distant fog layers */}
      <div className="absolute bottom-[15%] left-0 w-full h-[30%] fog-drift-slow" style={{ background: "linear-gradient(to top, rgba(20,20,40,0.4), transparent)", filter: "blur(20px)" }} />
      <div className="absolute bottom-[25%] left-0 w-full h-[20%] fog-drift" style={{ background: "linear-gradient(to top, rgba(124,77,255,0.08), transparent)", filter: "blur(15px)" }} />

      {/* ===== MIDGROUND LAYER ===== */}
      {/* Arena ground */}
      <div className="absolute bottom-0 left-0 w-full h-[25%]" style={{ background: "linear-gradient(to top, #060610 0%, rgba(10,10,25,0.6) 60%, transparent 100%)" }} />
      {/* Ground energy line */}
      <div className="absolute bottom-[12%] left-0 w-full h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(124,77,255,0.3) 30%, rgba(0,229,255,0.2) 50%, rgba(124,77,255,0.3) 70%, transparent)" }} />

      {/* Mid fog */}
      <div className="absolute bottom-[8%] left-0 w-full h-[15%] fog-drift" style={{ background: "linear-gradient(to top, rgba(10,10,30,0.5), transparent)", filter: "blur(12px)" }} />

      {/* ===== FOREGROUND LAYER ===== */}
      {/* Floating particles */}
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

      {/* Ambient element glow */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(100% 60% at 50% 80%, rgba(124,77,255,0.06), transparent 70%)" }} />

      {/* Cinematic vignette */}
      <div className="cine-vignette" />

      {/* Top/bottom cinematic darkening for depth */}
      <div className="absolute top-0 left-0 w-full h-20 pointer-events-none" style={{ background: "linear-gradient(to bottom, rgba(5,5,10,0.8), transparent)" }} />
      <div className="absolute bottom-0 left-0 w-full h-32 pointer-events-none" style={{ background: "linear-gradient(to top, rgba(5,5,10,0.7), transparent)" }} />
    </div>
  );
}
