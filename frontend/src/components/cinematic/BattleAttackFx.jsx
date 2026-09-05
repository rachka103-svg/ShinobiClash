import { useEffect, useState, useMemo } from "react";
import { ELEMENT } from "@/lib/styles";

/**
 * BattleAttackFx — non-obstructive attack visual effects.
 * Shows a brief ability name banner at the top and a small impact flash.
 * The battlefield, combatants, HP bars, and damage numbers remain fully visible.
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
    const t = setTimeout(() => setFx(null), 600);
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

  // Small particle burst
  const particles = useMemo(
    () =>
      Array.from({ length: 8 }).map((_, i) => {
        const angle = (i / 8) * Math.PI * 2;
        const dist = 30 + (i % 2) * 20;
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
    <div className="absolute inset-0 z-25 pointer-events-none" data-testid="attack-fx">
      {/* Ability name — small banner at top, not center */}
      {fx.jutsuName && (
        <div className="absolute top-10 sm:top-12 left-0 right-0 flex justify-center">
          <div
            key={`name-${fx.id}`}
            className="ability-name-flash font-display text-lg sm:text-xl tracking-wide px-3 py-0.5 rounded-md"
            style={{
              color: "#fff",
              textShadow: `0 0 12px ${elColor}, 0 0 24px ${elColor}66`,
              background: `linear-gradient(180deg, ${elColor}22, transparent)`,
            }}
          >
            {fx.jutsuName}
          </div>
        </div>
      )}

      {/* Impact flash — small, semi-transparent, positioned at upper-center */}
      <div className="absolute inset-0 flex items-start justify-center pt-[22%]">
        <div
          key={`flash-${fx.id}`}
          className="impact-flash rounded-full"
          style={{
            width: 120,
            height: 120,
            background: `radial-gradient(circle, ${elColor}88 0%, ${elColor}33 40%, transparent 70%)`,
          }}
        />
      </div>

      {/* Impact ring */}
      <div className="absolute inset-0 flex items-start justify-center pt-[22%]">
        <div
          key={`ring-${fx.id}`}
          className="impact-ring rounded-full"
          style={{
            width: 80,
            height: 80,
            border: `2px solid ${elColor}`,
            boxShadow: `0 0 12px ${elColor}`,
          }}
        />
      </div>

      {/* Elemental particle burst — small, from upper-center */}
      <div className="absolute inset-0 flex items-start justify-center pt-[22%]">
        <div className="relative">
          {particles.map((p, i) => (
            <span
              key={`p-${fx.id}-${i}`}
              className="absolute rounded-full"
              style={{
                width: 4,
                height: 4,
                background: elColor,
                boxShadow: `0 0 6px ${elColor}`,
                animation: `ultParticleBurst 0.5s ease-out forwards`,
                animationDelay: p.delay,
                "--px": `${p.x}px`,
                "--py": `${p.y}px`,
              }}
            />
          ))}
        </div>
      </div>

      {/* No darkening overlay — battlefield stays fully visible */}
    </div>
  );
}
