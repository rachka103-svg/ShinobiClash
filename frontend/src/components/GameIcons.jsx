/**
 * Custom SVG game icons matching the premium Shinobi Clash aesthetic.
 * Replaces generic lucide-react icons with stylized game-art versions.
 * Each icon accepts { size, className, style } for flexible sizing.
 */

const base = (size, className, style) => ({
  viewBox: "0 0 24 24",
  className,
  style: { width: size, height: size, ...style },
});

/* ── Resource Icons (Row 1) ─────────────────────────────────────────── */

export function CoinsIcon({ size, className = "", style }) {
  return (
    <svg {...base(size, className, style)} fill="none">
      <ellipse cx="12" cy="6" rx="7" ry="3" fill="#FFD54F" stroke="#FFB300" strokeWidth="1" />
      <ellipse cx="12" cy="10" rx="7" ry="3" fill="#FFCA28" stroke="#FFB300" strokeWidth="1" />
      <ellipse cx="12" cy="14" rx="7" ry="3" fill="#FFB300" stroke="#FF8F00" strokeWidth="1" />
      <circle cx="12" cy="6" r="1.5" fill="#FF8F00" />
      <circle cx="12" cy="10" r="1.5" fill="#FF8F00" />
      <circle cx="12" cy="14" r="1.5" fill="#E65100" />
    </svg>
  );
}

export function GemsIcon({ size, className = "", style }) {
  return (
    <svg {...base(size, className, style)} fill="none">
      <path d="M12 3L6 10l6 11 6-11z" fill="#AB47BC" />
      <path d="M12 3L9 10h6z" fill="#CE93D8" />
      <path d="M6 10l6 11V10z" fill="#7B1FA2" />
      <path d="M18 10l-6 11V10z" fill="#9C27B0" />
      <path d="M9 10h6" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
    </svg>
  );
}

export function ScrollIcon({ size, className = "", style }) {
  return (
    <svg {...base(size, className, style)} fill="none">
      <path d="M6 3h10v16a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V3z" fill="#1A237E" />
      <path d="M6 3h10v2H6z" fill="#283593" />
      <circle cx="16" cy="5" r="2" fill="#0D47A1" stroke="#00E5FF" strokeWidth="0.5" />
      <path d="M9 8h6M9 11h6M9 14h4" stroke="#00E5FF" strokeWidth="1" strokeLinecap="round" opacity="0.7" />
    </svg>
  );
}

export function PotionIcon({ size, className = "", style }) {
  return (
    <svg {...base(size, className, style)} fill="none">
      <path d="M10 2h4v3l2 2v13a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2V7l2-2V2z" fill="#1565C0" />
      <rect x="10" y="2" width="4" height="2" fill="#FFD54F" />
      <path d="M10 11v9h4v-9z" fill="#42A5F5" />
      <circle cx="12" cy="15" r="2" fill="rgba(255,255,255,0.4)" />
    </svg>
  );
}

/* ── Skill Type Icons (for battle command panel) ────────────────────── */

export function SkillAttackIcon({ size, className = "", style }) {
  return (
    <svg {...base(size, className, style)} fill="none" style={{ color: "currentColor", width: size, height: size, ...style }}>
      <path d="M3 3l12 12 4-4L7 1z" fill="currentColor" />
      <path d="M15 15l4 4 3-3-4-4z" fill="currentColor" opacity="0.7" />
      <path d="M3 3l2 2M5 5l3-3" stroke="rgba(255,255,255,0.4)" strokeWidth="0.8" />
    </svg>
  );
}

export function SkillAoeIcon({ size, className = "", style }) {
  return (
    <svg {...base(size, className, style)} fill="none" style={{ color: "currentColor", width: size, height: size, ...style }}>
      <circle cx="12" cy="12" r="3" fill="currentColor" />
      <path d="M12 2v4M12 18v4M2 12h4M18 12h4M5 5l3 3M16 16l3 3M19 5l-3 3M8 16l-3 3"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function SkillHealIcon({ size, className = "", style }) {
  return (
    <svg {...base(size, className, style)} fill="none" style={{ color: "currentColor", width: size, height: size, ...style }}>
      <path d="M12 21s-7-5-7-11a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 6-7 11-7 11z" fill="currentColor" />
      <path d="M12 9v6M9 12h6" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function SkillShieldIcon({ size, className = "", style }) {
  return (
    <svg {...base(size, className, style)} fill="none" style={{ color: "currentColor", width: size, height: size, ...style }}>
      <path d="M12 2L4 5v7c0 5 3 8 8 10 5-2 8-5 8-10V5z" fill="currentColor" />
      <path d="M12 2L4 5v7c0 5 3 8 8 10z" fill="rgba(255,255,255,0.15)" />
    </svg>
  );
}

export function SummonIcon({ size, className = "", style }) {
  return (
    <svg {...base(size, className, style)} fill="none">
      <path d="M12 2l2.5 7 7 2.5-7 2.5L12 21l-2.5-7-7-2.5 7-2.5L12 2z" fill="#FFCA28" />
      <path d="M12 6l1.5 4 4 1.5-4 1.5L12 17l-1.5-4-4-1.5 4-1.5L12 6z" fill="#FFD54F" />
    </svg>
  );
}

export function ItemsIcon({ size, className = "", style }) {
  return (
    <svg {...base(size, className, style)} fill="none">
      <path d="M6 8h12l-1 13H7z" fill="#37474F" stroke="#546E7A" strokeWidth="1" />
      <path d="M9 8V5a3 3 0 0 1 6 0v3" fill="none" stroke="#78909C" strokeWidth="1.5" />
      <circle cx="12" cy="14" r="2.5" fill="#42A5F5" opacity="0.8" />
      <circle cx="12" cy="14" r="1" fill="rgba(255,255,255,0.5)" />
    </svg>
  );
}

/* ── Status / System Icons (Row 4) ──────────────────────────────────── */

export function LockIcon({ size, className = "", style }) {
  return (
    <svg {...base(size, className, style)} fill="none">
      <rect x="5" y="10" width="14" height="11" rx="2" fill="#616161" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" fill="none" stroke="#616161" strokeWidth="2" />
      <circle cx="12" cy="15" r="2" fill="#9E9E9E" />
    </svg>
  );
}

export function LockGoldIcon({ size, className = "", style }) {
  return (
    <svg {...base(size, className, style)} fill="none">
      <rect x="5" y="10" width="14" height="11" rx="2" fill="#FFB300" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" fill="none" stroke="#FFCA28" strokeWidth="2" />
      <circle cx="12" cy="15" r="2" fill="#FFD54F" />
      <circle cx="12" cy="15" r="1" fill="#FF8F00" />
    </svg>
  );
}

export function CheckIcon({ size, className = "", style }) {
  return (
    <svg {...base(size, className, style)} fill="none">
      <circle cx="12" cy="12" r="10" fill="#2E7D32" />
      <path d="M7 12l3 3 7-7" fill="none" stroke="#76FF03" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function SkullIcon({ size, className = "", style }) {
  return (
    <svg {...base(size, className, style)} fill="none">
      <path d="M12 2C7 2 4 5 4 10c0 3 1 5 3 6v3a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-3c2-1 3-3 3-6 0-5-3-8-8-8z" fill="#37474F" />
      <circle cx="9" cy="10" r="2" fill="#FF1744" />
      <circle cx="15" cy="10" r="2" fill="#FF1744" />
      <path d="M10 16v4M14 16v4" stroke="#263238" strokeWidth="1.5" />
      <path d="M8 4c-1 1-1 2-1 3M16 4c1 1 1 2 1 3" fill="none" stroke="#546E7A" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function CrownIcon({ size, className = "", style }) {
  return (
    <svg {...base(size, className, style)} fill="none">
      <path d="M3 8l4 4 5-8 5 8 4-4-2 12H5z" fill="#FFCA28" />
      <path d="M3 8l4 4 5-8 5 8 4-4-2 12H5z" fill="none" stroke="#FFB300" strokeWidth="0.5" />
      <circle cx="3" cy="8" r="1.5" fill="#FFB300" />
      <circle cx="21" cy="8" r="1.5" fill="#FFB300" />
      <circle cx="12" cy="4" r="1.5" fill="#FFB300" />
      <rect x="5" y="18" width="14" height="2" fill="#FF8F00" rx="1" />
    </svg>
  );
}

export function SwordsIcon({ size, className = "", style }) {
  return (
    <svg {...base(size, className, style)} fill="none">
      <path d="M3 3l8 8 2-2-8-8-2 2z" fill="currentColor" />
      <path d="M21 3l-8 8-2-2 8-8 2 2z" fill="currentColor" opacity="0.8" />
      <path d="M3 21l8-8 2 2-8 8-2-2z" fill="currentColor" opacity="0.8" />
      <path d="M21 21l-8-8-2 2 8 8 2-2z" fill="currentColor" />
      <circle cx="12" cy="12" r="2" fill="#FFCA28" />
    </svg>
  );
}

export function StarIcon({ size, className = "", style }) {
  return (
    <svg {...base(size, className, style)} fill="none">
      <path d="M12 2l3 7 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z" fill="#FFCA28" />
      <path d="M12 2l3 7 7 1-5 5 1 7-6-3z" fill="#FFD54F" />
    </svg>
  );
}

/* ── Skill type → icon mapping ──────────────────────────────────────── */
export const SKILL_ICONS = {
  attack: SkillAttackIcon,
  aoe: SkillAoeIcon,
  heal: SkillHealIcon,
  shield: SkillShieldIcon,
};
