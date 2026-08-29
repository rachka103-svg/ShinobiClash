import { motion } from "framer-motion";
import { Play, Zap } from "lucide-react";
import { ENERGY_COST } from "@/lib/energy";

// Uploaded environmental background images, keyed by trial id. When an
// image is present it replaces the vector placeholder (object-fit: cover).
const BG_IMAGE = {
  t_crystal: "/spire-assets/crystal-cavern.png",
};

/**
 * TrialDungeonCard — a cinematic dungeon card with environmental artwork.
 * Uses an uploaded background image when available, otherwise a vector
 * placeholder. Accent border + glow follow the trial's theme color.
 */
function DungeonArtwork({ color, theme }) {
  // Three distinct environmental backdrops keyed to the trial id.
  const art = {
    t_scroll: (
      <>
        <rect width="410" height="195" fill="#06121f" />
        <radialGradient id={`g-${theme}`} cx="30%" cy="40%" r="80%">
          <stop offset="0%" stopColor="#0a3a5c" />
          <stop offset="100%" stopColor="#04101c" />
        </radialGradient>
        <rect width="410" height="195" fill={`url(#g-${theme})`} />
        {/* floating scrolls / tomes */}
        <g fill="#0e2a44" stroke="#29B6F6" strokeOpacity="0.4">
          <rect x="40" y="40" width="70" height="50" rx="4" transform="rotate(-8 75 65)" />
          <rect x="250" y="30" width="60" height="44" rx="4" transform="rotate(10 280 52)" />
          <rect x="150" y="80" width="54" height="40" rx="4" transform="rotate(-4 177 100)" />
        </g>
        <g fill="#29B6F6" opacity="0.5">
          <circle cx="75" cy="65" r="2" /><circle cx="280" cy="52" r="2" /><circle cx="177" cy="100" r="2" />
        </g>
        <rect x="0" y="150" width="410" height="45" fill="#03101c" />
      </>
    ),
    t_crystal: (
      <>
        <rect width="410" height="195" fill="#0a0418" />
        <radialGradient id={`g-${theme}`} cx="50%" cy="60%" r="75%">
          <stop offset="0%" stopColor="#2a0f4d" />
          <stop offset="100%" stopColor="#08020f" />
        </radialGradient>
        <rect width="410" height="195" fill={`url(#g-${theme})`} />
        {/* crystal cluster */}
        <g>
          <path d="M205 160 L175 70 L205 30 L235 70 Z" fill="#7c3aed" opacity="0.85" />
          <path d="M205 160 L175 70 L205 30 Z" fill="#a855f7" opacity="0.9" />
          <path d="M205 160 L160 95 L175 70 Z" fill="#5b21b6" />
          <path d="M205 160 L250 95 L235 70 Z" fill="#6d28d9" />
          <path d="M150 160 L130 100 L150 75 L170 100 Z" fill="#7c3aed" opacity="0.7" />
          <path d="M270 160 L250 100 L270 80 L290 100 Z" fill="#7c3aed" opacity="0.7" />
        </g>
        <g fill="#c4b5fd" opacity="0.6">
          <circle cx="205" cy="55" r="1.6" /><circle cx="150" cy="90" r="1.4" /><circle cx="270" cy="92" r="1.4" />
        </g>
        <rect x="0" y="150" width="410" height="45" fill="#08020f" />
      </>
    ),
    t_gold: (
      <>
        <rect width="410" height="195" fill="#1a1206" />
        <radialGradient id={`g-${theme}`} cx="50%" cy="55%" r="80%">
          <stop offset="0%" stopColor="#3a2a08" />
          <stop offset="100%" stopColor="#0e0a02" />
        </radialGradient>
        <rect width="410" height="195" fill={`url(#g-${theme})`} />
        {/* vault arch */}
        <path d="M120 160 L120 90 Q205 40 290 90 L290 160 Z" fill="#1f1608" stroke="#d4af37" strokeOpacity="0.4" />
        <path d="M150 160 L150 100 Q205 70 260 100 L260 160 Z" fill="#2a1c06" />
        {/* gold piles */}
        <g fill="#f7d56c">
          <circle cx="170" cy="150" r="6" /><circle cx="186" cy="152" r="5" /><circle cx="200" cy="148" r="6" />
          <circle cx="220" cy="152" r="5" /><circle cx="236" cy="150" r="6" />
        </g>
        <g fill="#d4af37" opacity="0.7">
          <circle cx="178" cy="156" r="4" /><circle cx="208" cy="156" r="4" /><circle cx="228" cy="156" r="4" />
        </g>
        <rect x="0" y="150" width="410" height="45" fill="#0e0a02" />
      </>
    ),
  };

  return (
    <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid slice" viewBox="0 0 410 195" aria-hidden="true">
      {art[theme] || art.t_scroll}
    </svg>
  );
}

export default function TrialDungeonCard({ trial, catalogById, onFarm, index }) {
  const lvl = trial.enemies[0]?.level ?? 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className="relative rounded-2xl overflow-hidden h-[195px] flex flex-col justify-end p-4 group"
      style={{ border: `1px solid ${trial.color}55`, boxShadow: `0 0 18px ${trial.color}22` }}
      data-testid={`trial-${trial.id}`}
    >
      {BG_IMAGE[trial.id] ? (
        <img src={BG_IMAGE[trial.id]} alt="" className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <DungeonArtwork color={trial.color} theme={trial.id} />
      )}
      {/* readability scrim */}
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(6,8,17,0.1) 0%, rgba(6,8,17,0.55) 55%, rgba(6,8,17,0.92) 100%)" }} />

      {/* top-left icon + level */}
      <div className="absolute top-3 left-3 flex items-center gap-2 z-10">
        <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${trial.color}22`, border: `1px solid ${trial.color}66` }}>
          <span className="w-3.5 h-3.5 rotate-45 rounded-[2px]" style={{ background: trial.color, boxShadow: `0 0 8px ${trial.color}` }} />
        </span>
      </div>
      <div className="absolute top-3 right-3 z-10 text-[11px] font-display tracking-wide px-2 py-0.5 rounded" style={{ background: "rgba(0,0,0,0.45)", color: trial.color, border: `1px solid ${trial.color}44` }}>
        Lv. {lvl}
      </div>

      {/* content */}
      <div className="relative z-10">
        <h3 className="font-display text-2xl tracking-wide text-white leading-none mb-1">{trial.name}</h3>
        <p className="text-xs text-slate-300/90 mb-2.5 leading-snug">{trial.desc}</p>
        <button
          onClick={onFarm}
          data-testid={`trial-btn-${trial.id}`}
          className="w-full h-10 rounded-lg font-display text-base tracking-wide text-white flex items-center justify-center gap-2 transition-transform active:scale-[0.98]"
          style={{ background: `linear-gradient(120deg, ${trial.color}, ${trial.color}cc)`, boxShadow: `0 0 14px ${trial.color}55` }}
        >
          <Play className="w-3.5 h-3.5 fill-white" /> FARM
          <span className="flex items-center gap-0.5 text-xs opacity-90"><Zap className="w-3 h-3" />{ENERGY_COST.trial}</span>
        </button>
      </div>
    </motion.div>
  );
}
