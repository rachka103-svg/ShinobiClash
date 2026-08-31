import { useEffect, useState, useMemo } from "react";
import { ELEMENT } from "@/lib/styles";

/**
 * BattleAttackFx — cinematic attack visual effects overlay.
 * Watches the `action` prop for new actions and triggers:
 *   - Ability name flash (brief, centered)
 *   - Impact flash at screen center (full-screen radial burst)
 *   - Screen shake on the battlefield container
 *   - Elemental particle burst
 *
 * Props:
 *   action — { key, jutsuName, element, actorUid, targetUid, isCrit, isAoe } or null
 *   onShake — callback to trigger screen shake on parent
 */
export default function BattleAttackFx({ action, onShake }) {
  const [fx, setFx] = useState(null);

  useEffect(() => {
    if (!action) return;
    setFx({ ...action, id: action.key });
    const t = setTimeout(() => setFx(null), 1000);
    return () => clearTimeout(t);
  }, [action?.key]); // eslint-disable-line react-hooks/exhaustive-deps

  // Trigger screen shake on parent
  useEffect(() => {
    if (fx && onShake) {
      onShake(fx.isCrit ? "strong" : "normal");
    }
  }, [fx?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const el = ELEMENT[fx?.element] || {};
  const elColor = el.color || "#7C4DFF";

  // Particle burst positions
  const particles = useMemo(
    () =>
      Array.from({ length: 12 }).map((_, i) => {
        const angle = (i / 12) * Math.PI * 2;
        const dist = 60 + (i % 3) * 30;
        return {
          x: Math.cos(angle) * dist,
          y: Math.sin(angle) * dist,
          delay: `${i * 0.02}s`,
        };
      }),
    [fx?.id]
  );

  if (!fx) return null;

  return (
    <div className="absolute inset-0 z-25 pointer-events-none flex items-center justify-center" data-testid="attack-fx">
      {/* Ability name flash */}
      {fx.jutsuName && (
        <div
          key={`name-${fx.id}`}
          className="absolute top-[28%] ability-name-flash font-display text-2xl sm:text-3xl tracking-wider text-white"
          style={{ textShadow: `0 0 16px ${elColor}, 0 0 32px ${elColor}66` }}
        >
          {fx.jutsuName}
        </div>
      )}

      {/* Impact flash */}
      <div
        key={`flash-${fx.id}`}
        className="absolute impact-flash rounded-full"
        style={{
          width: 200,
          height: 200,
          background: `radial-gradient(circle, #ffffff 0%, ${elColor} 40%, transparent 70%)`,
        }}
      />

      {/* Impact ring */}
      <div
        key={`ring-${fx.id}`}
        className="absolute impact-ring rounded-full"
        style={{
          width: 120,
          height: 120,
          border: `3px solid ${elColor}`,
          boxShadow: `0 0 20px ${elColor}`,
        }}
      />

      {/* Elemental particle burst */}
      {particles.map((p, i) => (
        <span
          key={`p-${fx.id}-${i}`}
          className="absolute rounded-full"
          style={{
            width: 5,
            height: 5,
            background: elColor,
            boxShadow: `0 0 8px ${elColor}, 0 0 16px ${elColor}`,
            animation: `ultParticleBurst 0.6s ease-out forwards`,
            animationDelay: p.delay,
            "--px": `${p.x}px`,
            "--py": `${p.y}px`,
          }}
        />
      ))}

      {/* Brief darkening for impact */}
      <div
        key={`dark-${fx.id}`}
        className="absolute inset-0"
        style={{
          background: "rgba(5,5,10,0.3)",
          animation: "summonBrightFlash 0.4s ease-out forwards",
        }}
      />
    </div>
  );
}
