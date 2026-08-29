/**
 * SpireTowerBg — environmental SVG artwork for the left progression panel.
 * A gothic spire rising into a stormy purple/navy sky, drawn with gradients
 * so it reads as part of the world (not a card). No external image asset is
 * available, so this evokes the blueprint's atmosphere with vector art.
 */
export default function SpireTowerBg() {
  return (
    <svg
      className="absolute inset-0 w-full h-full"
      preserveAspectRatio="xMidYMid slice"
      viewBox="0 0 560 540"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="spireSky" cx="50%" cy="18%" r="90%">
          <stop offset="0%" stopColor="#3a1f5e" />
          <stop offset="42%" stopColor="#1c1140" />
          <stop offset="100%" stopColor="#070612" />
        </radialGradient>
        <linearGradient id="spireStone" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#0c0a1c" />
          <stop offset="50%" stopColor="#1a1438" />
          <stop offset="100%" stopColor="#0c0a1c" />
        </linearGradient>
        <linearGradient id="spireGlow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#a855f7" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="spireMoon" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#c4a0ff" stopOpacity="0.9" />
          <stop offset="60%" stopColor="#7c4dff" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#7c4dff" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* sky */}
      <rect width="560" height="540" fill="url(#spireSky)" />

      {/* distant moon halo */}
      <circle cx="300" cy="120" r="150" fill="url(#spireMoon)" />
      <circle cx="300" cy="120" r="34" fill="#e9d8ff" opacity="0.85" />
      <circle cx="300" cy="120" r="34" fill="#7c4dff" opacity="0.18" />

      {/* storm clouds */}
      <path d="M0 70 Q140 50 280 78 T560 64 V40 H0 Z" fill="#2e1a47" opacity="0.5" />
      <path d="M0 96 Q160 78 320 100 T560 88 V70 H0 Z" fill="#241640" opacity="0.55" />

      {/* lightning streak */}
      <path d="M412 30 L398 92 L420 96 L402 168" fill="none" stroke="#d8b4fe" strokeWidth="2" opacity="0.4" />

      {/* far mountains */}
      <path d="M0 470 L120 360 L210 470 Z" fill="#120c2a" opacity="0.7" />
      <path d="M210 470 L330 330 L470 470 Z" fill="#160f30" opacity="0.8" />
      <path d="M380 470 L470 360 L560 470 Z" fill="#120c2a" opacity="0.7" />

      {/* the spire tower */}
      <g fill="url(#spireStone)">
        {/* base mass */}
        <path d="M232 540 L232 300 L328 300 L328 540 Z" />
        {/* mid shaft */}
        <path d="M246 320 L246 200 L314 200 L314 320 Z" />
        {/* upper shaft */}
        <path d="M256 210 L256 110 L304 110 L304 210 Z" />
        {/* belfry */}
        <rect x="250" y="104" width="60" height="16" rx="2" />
        <rect x="262" y="86" width="36" height="20" rx="2" />
        {/* spire point */}
        <path d="M280 4 L300 86 L260 86 Z" />
      </g>

      {/* window slits (glowing) */}
      <g fill="#a855f7" opacity="0.7">
        <rect x="276" y="240" width="8" height="22" rx="3" />
        <rect x="276" y="160" width="8" height="18" rx="3" />
        <rect x="278" y="112" width="4" height="10" rx="2" />
      </g>

      {/* faint purple aura climbing the tower */}
      <rect x="246" y="4" width="68" height="300" fill="url(#spireGlow)" opacity="0.5" />

      {/* foreground rock */}
      <path d="M0 540 L0 470 Q120 452 280 472 Q420 488 560 470 L560 540 Z" fill="#070612" />
    </svg>
  );
}
