import { useEffect, useState, useMemo } from "react";
import { ELEMENT } from "@/lib/styles";

/**
 * BattleUltimate — contained ultimate ability announcement.
 * Shows a brief skill banner at the top of the screen with a small portrait
 * and elemental effects. The battlefield remains fully visible underneath.
 *
 * Props:
 *   data — { key, actorName, jutsuName, element, portrait } or null
 *   onDone — callback when the cinematic finishes
 */
export default function BattleUltimate({ data, onDone, duration = 1200 }) {
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!data || duration <= 0) {
      onDone?.();
      return;
    }
    setActive(true);
    const t = setTimeout(() => {
      setActive(false);
      onDone?.();
    }, duration);
    return () => clearTimeout(t);
  }, [data?.key, duration]); // eslint-disable-line react-hooks/exhaustive-deps

  const el = ELEMENT[data?.element] || {};
  const elColor = el.color || "#7C4DFF";

  // Particle burst — emanates from the banner, not center screen
  const particles = useMemo(
    () =>
      Array.from({ length: 14 }).map((_, i) => {
        const angle = (i / 14) * Math.PI * 2;
        const dist = 40 + (i % 3) * 25;
        return {
          x: Math.cos(angle) * dist,
          y: Math.sin(angle) * dist * 0.5,
          size: 3 + (i % 2) * 2,
          delay: `${(i * 0.03) % 0.5}s`,
        };
      }),
    [data?.key]
  );

  if (!active || !data) return null;

  return (
    <div className="fixed inset-0 z-[150] pointer-events-none overflow-hidden" data-testid="ultimate-cinematic">
      {/* Subtle top/bottom vignette — battlefield stays visible */}
      <div
        className="absolute inset-0 ult-vignette"
        style={{
          background: `radial-gradient(ellipse 120% 50% at 50% 0%, ${elColor}22 0%, transparent 50%), radial-gradient(ellipse 120% 50% at 50% 100%, ${elColor}11 0%, transparent 50%)`,
        }}
      />

      {/* Top skill banner */}
      <div className="absolute top-0 left-0 right-0 flex flex-col items-center pt-12 sm:pt-16">
        {/* Portrait + name row */}
        <div className="flex items-center gap-3 ult-banner-in">
          {/* Small portrait thumbnail */}
          <div
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg overflow-hidden shrink-0 ult-thumb-glow"
            style={{ border: `2px solid ${elColor}`, boxShadow: `0 0 20px ${elColor}88` }}
          >
            <img src={data.portrait} alt={data.actorName} className="w-full h-full object-cover object-top" />
          </div>

          {/* Actor name + jutsu name */}
          <div className="flex flex-col">
            <span className="font-display text-xs sm:text-sm text-white/70 tracking-wide">{data.actorName}</span>
            <h2
              className="ult-name-cont font-display text-2xl sm:text-4xl font-bold leading-none"
              style={{ color: elColor, textShadow: `0 0 20px ${elColor}88, 0 0 40px ${elColor}44` }}
            >
              {data.jutsuName}
            </h2>
          </div>
        </div>

        {/* Decorative line under banner */}
        <div
          className="ult-line-cont h-px mt-1.5"
          style={{ background: `linear-gradient(90deg, transparent, ${elColor}, transparent)`, maxWidth: 300 }}
        />

        {/* Particle burst from banner area */}
        <div className="relative">
          {particles.map((p, i) => (
            <span
              key={i}
              className="absolute rounded-full"
              style={{
                width: p.size,
                height: p.size,
                background: elColor,
                boxShadow: `0 0 8px ${elColor}`,
                animation: `ultParticleBurst 0.8s ease-out forwards`,
                animationDelay: p.delay,
                left: 0,
                top: 0,
                "--px": `${p.x}px`,
                "--py": `${p.y}px`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Brief energy flash at the end — subtle, doesn't cover battlefield */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at 50% 20%, ${elColor}33 0%, transparent 40%)`,
          animation: "ultEnergyFillCont 0.5s ease-out 0.7s forwards",
        }}
      />
    </div>
  );
}
