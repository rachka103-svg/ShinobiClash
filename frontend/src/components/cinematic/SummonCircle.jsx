import { useMemo } from "react";

/**
 * SummonCircle — a rotating, concentric summoning circle with Japanese-inspired
 * rune-like symbols and geometric patterns. Built entirely from SVG + CSS.
 *
 * Props:
 *   color   — glow color (purple default, cyan/gold for other banners)
 *   size    — pixel diameter
 *   active  — when true, spins faster (during summoning)
 *   className
 */
export default function SummonCircle({ color = "#7C4DFF", size = 280, active = false, className = "" }) {
  // Rune-like symbols around the circle
  const runes = useMemo(
    () => Array.from({ length: 8 }).map((_, i) => {
      const angle = (i / 8) * 360;
      const rad = (angle - 90) * (Math.PI / 180);
      const r = 42; // percentage radius
      return {
        x: 50 + r * Math.cos(rad),
        y: 50 + r * Math.sin(rad),
        rotate: angle,
        symbol: ["◆", "◇", "✦", "✧", "❖", "⟡", "◈", "✶"][i],
      };
    }),
    []
  );

  const innerRunes = useMemo(
    () => Array.from({ length: 6 }).map((_, i) => {
      const angle = (i / 6) * 360 + 30;
      const rad = (angle - 90) * (Math.PI / 180);
      const r = 26;
      return {
        x: 50 + r * Math.cos(rad),
        y: 50 + r * Math.sin(rad),
        rotate: angle,
        symbol: ["水", "火", "風", "雷", "土", "光"][i],
      };
    }),
    []
  );

  return (
    <div
      className={`relative ${className}`}
      style={{ width: size, height: size, color }}
      data-testid="summon-circle"
    >
      {/* Outer glow */}
      <div
        className="absolute inset-0 rounded-full circle-glow"
        style={{ background: `radial-gradient(circle, ${color}15 0%, transparent 70%)` }}
      />

      {/* Outer ring — rotates slowly */}
      <svg
        className={`absolute inset-0 w-full h-full ${active ? "circle-rotate-fast" : "circle-rotate"}`}
        viewBox="0 0 100 100"
        style={{ filter: `drop-shadow(0 0 8px ${color})` }}
      >
        <circle cx="50" cy="50" r="48" fill="none" stroke={color} strokeWidth="0.5" opacity="0.6" />
        <circle cx="50" cy="50" r="45" fill="none" stroke={color} strokeWidth="0.3" opacity="0.4" strokeDasharray="2 3" />
        {/* Tick marks */}
        {Array.from({ length: 24 }).map((_, i) => {
          const a = (i / 24) * 360;
          const rad = (a - 90) * (Math.PI / 180);
          const x1 = 50 + 47 * Math.cos(rad);
          const y1 = 50 + 47 * Math.sin(rad);
          const x2 = 50 + 44 * Math.cos(rad);
          const y2 = 50 + 44 * Math.sin(rad);
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth="0.4" opacity="0.5" />;
        })}
        {/* Rune symbols */}
        {runes.map((r, i) => (
          <text
            key={i}
            x={r.x}
            y={r.y}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="3.5"
            fill={color}
            opacity="0.8"
            transform={`rotate(${r.rotate} ${r.x} ${r.y})`}
          >
            {r.symbol}
          </text>
        ))}
      </svg>

      {/* Middle ring — rotates reverse */}
      <svg
        className={`absolute inset-[8%] w-[84%] h-[84%] circle-rotate-rev`}
        viewBox="0 0 100 100"
        style={{ filter: `drop-shadow(0 0 6px ${color})` }}
      >
        <circle cx="50" cy="50" r="46" fill="none" stroke={color} strokeWidth="0.4" opacity="0.5" />
        {/* Geometric star pattern */}
        <polygon
          points="50,8 57,40 88,42 64,58 72,88 50,72 28,88 36,58 12,42 43,40"
          fill="none"
          stroke={color}
          strokeWidth="0.3"
          opacity="0.4"
        />
        {/* Inner runes (kanji) */}
        {innerRunes.map((r, i) => (
          <text
            key={i}
            x={r.x}
            y={r.y}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="4"
            fill={color}
            opacity="0.7"
            transform={`rotate(${r.rotate} ${r.x} ${r.y})`}
          >
            {r.symbol}
          </text>
        ))}
      </svg>

      {/* Inner ring — rotates fast */}
      <svg
        className={`absolute inset-[20%] w-[60%] h-[60%] ${active ? "circle-rotate-fast" : "circle-rotate"}`}
        viewBox="0 0 100 100"
        style={{ filter: `drop-shadow(0 0 5px ${color})` }}
      >
        <circle cx="50" cy="50" r="44" fill="none" stroke={color} strokeWidth="0.5" opacity="0.6" />
        <circle cx="50" cy="50" r="38" fill="none" stroke={color} strokeWidth="0.3" opacity="0.4" strokeDasharray="1 2" />
        {/* Inner geometric pattern */}
        <polygon points="50,15 78,35 68,70 32,70 22,35" fill="none" stroke={color} strokeWidth="0.4" opacity="0.5" />
        <polygon points="50,85 22,65 32,30 68,30 78,65" fill="none" stroke={color} strokeWidth="0.3" opacity="0.3" />
        {/* Center seal */}
        <circle cx="50" cy="50" r="12" fill="none" stroke={color} strokeWidth="0.6" opacity="0.7" />
        <circle cx="50" cy="50" r="8" fill="none" stroke={color} strokeWidth="0.4" opacity="0.5" />
        <circle cx="50" cy="50" r="3" fill={color} opacity="0.6" />
      </svg>

      {/* Center glow */}
      <div
        className="absolute rounded-full circle-glow"
        style={{
          top: "38%",
          left: "38%",
          width: "24%",
          height: "24%",
          background: `radial-gradient(circle, ${color}40 0%, transparent 70%)`,
        }}
      />
    </div>
  );
}
