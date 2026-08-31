import { useEffect, useState, useMemo } from "react";
import { ELEMENT } from "@/lib/styles";

/**
 * BattleUltimate — mini-cinematic ultimate ability sequence.
 * When triggered: battle UI fades → letterbox bars appear → screen darkens →
 * character portrait expands → elemental energy fills screen → ability name
 * in large typography → screen distortion → particles → returns to battle.
 *
 * Props:
 *   data — { key, actorName, jutsuName, element, portrait } or null
 *   onDone — callback when the cinematic finishes
 */
export default function BattleUltimate({ data, onDone }) {
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!data) return;
    setActive(true);
    // Brief by design — the portrait flashes and clears as the attack lands,
    // instead of lingering over the whole damage window.
    const t = setTimeout(() => {
      setActive(false);
      onDone?.();
    }, 1200);
    return () => clearTimeout(t);
  }, [data?.key]); // eslint-disable-line react-hooks/exhaustive-deps

  const el = ELEMENT[data?.element] || {};
  const elColor = el.color || "#7C4DFF";

  // Particle burst positions
  const particles = useMemo(
    () =>
      Array.from({ length: 24 }).map((_, i) => {
        const angle = (i / 24) * Math.PI * 2;
        const dist = 100 + (i % 4) * 50;
        return {
          x: Math.cos(angle) * dist,
          y: Math.sin(angle) * dist,
          size: 4 + (i % 3) * 3,
          delay: `${(i * 0.04) % 1}s`,
        };
      }),
    [data?.key]
  );

  if (!active || !data) return null;

  return (
    <div className="fixed inset-0 z-[150] pointer-events-none overflow-hidden" data-testid="ultimate-cinematic">
      {/* Darkened background */}
      <div className="absolute inset-0" style={{ background: "#05050A", animation: "victoryFadeIn 0.4s ease-in forwards" }} />

      {/* Letterbox bars */}
      <div className="absolute top-0 left-0 w-full letterbox-in" style={{ background: "#000" }} />
      <div className="absolute bottom-0 left-0 w-full letterbox-in" style={{ background: "#000" }} />

      {/* Cinematic view label */}
      <div className="absolute top-[14vh] left-0 w-full text-center">
        <p className="font-display text-[10px] tracking-[0.5em] text-slate-600">CINEMATIC VIEW</p>
      </div>

      {/* Screen distortion wrapper */}
      <div className="absolute inset-0 ult-distort flex items-center justify-center">
        {/* Character portrait expansion */}
        <div
          className="relative ult-zoom"
          style={{ width: "60%", maxWidth: 320, height: "60%", maxHeight: 420 }}
        >
          <div
            className="absolute inset-0 rounded-2xl overflow-hidden"
            style={{ border: `2px solid ${elColor}`, boxShadow: `0 0 60px ${elColor}88, 0 0 120px ${elColor}44` }}
          >
            <img src={data.portrait} alt={data.actorName} className="w-full h-full object-cover object-top" />
            {/* Element tint overlay */}
            <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, transparent 30%, ${elColor}33 100%)` }} />
          </div>

          {/* Expanding energy rings */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="ult-energy rounded-full" style={{ width: 200, height: 200, background: `radial-gradient(circle, ${elColor}66 0%, transparent 70%)` }} />
            <div className="ult-energy rounded-full" style={{ width: 300, height: 300, background: `radial-gradient(circle, ${elColor}44 0%, transparent 70%)`, animationDelay: "0.3s" }} />
          </div>
        </div>

        {/* Particle burst */}
        {particles.map((p, i) => (
          <span
            key={i}
            className="absolute rounded-full"
            style={{
              width: p.size,
              height: p.size,
              background: elColor,
              boxShadow: `0 0 10px ${elColor}, 0 0 20px ${elColor}`,
              animation: "ultParticleBurst 1.2s ease-out forwards",
              animationDelay: p.delay,
              "--px": `${p.x}px`,
              "--py": `${p.y}px`,
            }}
          />
        ))}
      </div>

      {/* Character name */}
      <div className="absolute inset-x-0 top-[55%] text-center ult-char-name">
        <p className="font-display text-xl sm:text-2xl text-white tracking-wider" style={{ textShadow: `0 0 16px ${elColor}` }}>
          {data.actorName}
        </p>
      </div>

      {/* Ability name — large typography */}
      <div className="absolute inset-x-0 top-[64%] text-center">
        <h2
          className="ult-name font-display text-4xl sm:text-6xl"
          style={{ color: elColor, textShadow: `0 0 30px ${elColor}, 0 0 60px ${elColor}66` }}
        >
          {data.jutsuName}
        </h2>
      </div>

      {/* Decorative lines */}
      <div className="absolute inset-x-0 top-[62%] flex flex-col items-center gap-1">
        <div className="ult-line h-px" style={{ background: `linear-gradient(90deg, transparent, ${elColor}, transparent)` }} />
        <div className="ult-line h-px" style={{ background: `linear-gradient(90deg, transparent, ${elColor}, transparent)`, animationDelay: "0.1s" }} />
      </div>

      {/* Full-screen energy flash at the end */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at center, ${elColor}66 0%, transparent 60%)`,
          animation: "ultEnergyFill 0.5s ease-out 0.7s forwards",
        }}
      />
    </div>
  );
}
