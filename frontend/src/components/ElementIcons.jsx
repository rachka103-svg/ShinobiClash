import { ELEMENT } from "@/lib/theme";

/**
 * Custom SVG element icons matching the game's premium aesthetic.
 * Each element has a stylized symbol rendered inside an optional circular badge.
 * Replaces the generic colored-dot + text element indicators throughout the app.
 */

const SYMBOLS = {
  Fire: (
    <>
      <path d="M12 2c-1 2-3 4-3 8 0 3 1 5 3 5s3-2 3-5c0-4-2-6-3-8z" fill="currentColor" />
      <path d="M12 8c-.5 1-1 1.5-1 2.5a1 1 0 0 0 2 0c0-1-.5-1.5-1-2.5z" fill="rgba(255,255,255,0.45)" />
    </>
  ),
  Water: (
    <>
      <path d="M12 3c-3 4-5 6-5 9a5 5 0 0 0 10 0c0-3-2-5-5-9z" fill="currentColor" />
      <path d="M10.5 13c0-1 .5-2 1.5-3-.8 1.8-.5 3 .5 3.5s2 .2 2.5-.8c.3 2-1 3.5-3 3.5s-3-1.5-3-3.5z" fill="rgba(255,255,255,0.3)" />
    </>
  ),
  Wind: (
    <path
      d="M12 4c-4 0-8 3-8 8s4 8 8 8c3 0 5-2 5-5 0-2-1-3-3-3-1 0-2 1-2 2"
      fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
    />
  ),
  Lightning: (
    <>
      <path d="M10 2L4 14h4l-1 8 8-14h-4l1-6z" fill="currentColor" />
      <path d="M16 7l-2 4h2l-1 4 4-7h-2l1-1z" fill="currentColor" opacity="0.5" />
    </>
  ),
  Earth: (
    <>
      <path d="M12 3L3 20h18L12 3z" fill="currentColor" />
      <path d="M12 3L8 11h8L12 3z" fill="rgba(255,255,255,0.2)" />
    </>
  ),
  Dark: (
    <path d="M12 3a9 9 0 1 0 9 9 7 7 0 0 1-9-9z" fill="currentColor" />
  ),
  Light: (
    <>
      <path d="M12 2l2 6 6 2-6 2-2 6-2-6-6-2 6-2 2-6z" fill="currentColor" />
      <path d="M12 5l1.5 3.5L17 10l-3.5 1.5L12 15l-1.5-3.5L7 10l3.5-1.5L12 5z" fill="rgba(255,255,255,0.3)" />
    </>
  ),
};

/**
 * ElementIcon — circular badge with the element's stylized symbol.
 * @param {string} element - Element name (Fire, Water, Wind, etc.)
 * @param {number} size - Badge diameter in px (default 20)
 * @param {boolean} badge - Wrap in circular badge (default true)
 * @param {string} className - Extra classes
 */
export function ElementIcon({ element, size = 20, badge = true, className = "" }) {
  const el = ELEMENT[element] || {};
  const color = el.color || "#94a3b8";
  const symbol = SYMBOLS[element] || SYMBOLS.Light;

  if (badge) {
    return (
      <span
        className={`inline-flex items-center justify-center rounded-full shrink-0 ${className}`}
        style={{
          width: size,
          height: size,
          background: "rgba(0,0,0,0.55)",
          border: `1.5px solid ${color}88`,
          boxShadow: `0 0 6px ${color}44`,
          color,
        }}
      >
        <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24">
          {symbol}
        </svg>
      </span>
    );
  }

  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24"
      className={className} style={{ color }}
    >
      {symbol}
    </svg>
  );
}
