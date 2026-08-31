import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, ChevronLeft, ChevronRight, Star, Sparkles, Zap, Shield, Sword,
  Heart, Wind, Eye, Crosshair, Gauge, Flame, Droplet, Mountain,
  Moon, Sun as SunIcon,
} from "lucide-react";
import { RARITY, ELEMENT } from "@/lib/styles";
import { GOLD, BG } from "@/lib/theme";

// ---------------------------------------------------------------------------
// Stat display helpers
// ---------------------------------------------------------------------------
const STAT_META = {
  hp:          { label: "HP",            icon: Heart,    color: "#FF5722" },
  atk:         { label: "Attack",        icon: Sword,    color: "#FFCA28" },
  def:         { label: "Defense",       icon: Shield,   color: "#29B6F6" },
  spd:         { label: "Speed",          icon: Wind,     color: "#00E676" },
  chakra:      { label: "Chakra",        icon: Zap,      color: "#D500F9" },
  crit_rate:   { label: "Crit Rate",     icon: Crosshair,color: "#FF1744" },
  crit_damage: { label: "Crit Damage",   icon: Sword,    color: "#FF6B35" },
  accuracy:    { label: "Accuracy",       icon: Eye,      color: "#00E5FF" },
  resistance:  { label: "Resistance",    icon: Shield,   color: "#AB47BC" },
};
const STAT_ORDER = ["hp", "atk", "def", "spd", "chakra", "crit_rate", "crit_damage", "accuracy", "resistance"];
const STAT_MAX = { hp: 5000, atk: 700, def: 360, spd: 190, chakra: 200, crit_rate: 20, crit_damage: 220, accuracy: 98, resistance: 30 };

const STAR_COUNT = { R: 2, SR: 3, SSR: 4, UR: 5, GR: 5 };
const ELEMENT_ICON = { Fire: Flame, Water: Droplet, Wind: Wind, Earth: Mountain, Lightning: Zap, Dark: Moon, Light: SunIcon };

const SKILL_TYPE_ICON = { attack: Sword, aoe: Zap, heal: Heart, buff: Sparkles };

const TABS = [
  { key: "skills", label: "SKILLS" },
  { key: "stats", label: "STATS" },
  { key: "lore", label: "LORE" },
  { key: "progression", label: "PROGRESSION" },
];

/**
 * HeroInspectionOverlay — a premium full-screen collectible card inspection.
 * Opens on top of the Available Heroes modal when a hero card is clicked.
 * Large card on the left, info panel on the right (desktop); stacked on mobile.
 */
export default function HeroInspectionOverlay({ heroes, initialIndex, onClose }) {
  const [index, setIndex] = useState(initialIndex);
  const [tab, setTab] = useState("skills");
  const [showDetails, setShowDetails] = useState(false);

  const hero = heroes[index];
  const r = RARITY[hero?.rarity] || RARITY.R;
  const el = ELEMENT[hero?.element] || {};
  const EIcon = ELEMENT_ICON[hero?.element] || Sparkles;

  const goPrev = useCallback(() => {
    setIndex((i) => (i - 1 + heroes.length) % heroes.length);
    setShowDetails(false);
  }, [heroes.length]);
  const goNext = useCallback(() => {
    setIndex((i) => (i + 1) % heroes.length);
    setShowDetails(false);
  }, [heroes.length]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, goPrev, goNext]);

  if (!hero) return null;

  const maxStars = STAR_COUNT[hero.rarity] || 5;
  const currentStars = hero.star_level_default || 1;
  const glow = r.tier >= 4 ? `0 0 30px ${r.color}66, 0 0 60px ${r.color}33`
             : r.tier >= 3 ? `0 0 24px ${r.color}55, 0 0 48px ${r.color}22`
             : r.tier >= 2 ? `0 0 16px ${r.color}44`
             : r.tier >= 1 ? `0 0 10px ${r.color}33`
             : `0 0 6px ${r.color}22`;
  const borderW = r.tier >= 3 ? 2.5 : 2;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ background: "rgba(5,5,10,0.92)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}
      data-testid="hero-inspection-overlay"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        data-testid="hero-inspection-close"
        className="absolute top-4 right-4 z-50 w-10 h-10 rounded-full flex items-center justify-center transition-colors"
        style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)" }}
      >
        <X className="w-5 h-5 text-slate-300" />
      </button>

      {/* Nav arrows */}
      <button
        onClick={(e) => { e.stopPropagation(); goPrev(); }}
        data-testid="hero-inspection-prev"
        className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 z-50 w-10 h-10 rounded-full flex items-center justify-center transition-colors hover:bg-white/10"
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)" }}
      >
        <ChevronLeft className="w-6 h-6 text-slate-300" />
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); goNext(); }}
        data-testid="hero-inspection-next"
        className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 z-50 w-10 h-10 rounded-full flex items-center justify-center transition-colors hover:bg-white/10"
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)" }}
      >
        <ChevronRight className="w-6 h-6 text-slate-300" />
      </button>

      {/* Main content — stop propagation so clicks inside don't close */}
      <motion.div
        key={hero.id}
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="flex flex-col lg:flex-row items-center lg:items-stretch gap-4 lg:gap-8 max-w-5xl w-[92%] max-h-[90vh] overflow-y-auto lg:overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        data-testid="hero-inspection-content"
      >
        {/* ---- LEFT: Large hero card ---- */}
        <div className="shrink-0 flex flex-col items-center gap-3">
          <div
            className="relative rounded-xl overflow-hidden"
            style={{
              border: `${borderW}px solid ${r.color}${r.tier >= 3 ? "cc" : "88"}`,
              boxShadow: glow,
              width: "min(280px, 60vw)",
              aspectRatio: "3 / 4",
            }}
          >
            <img src={hero.portrait} alt={hero.name} className="w-full h-full object-cover object-top" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />
            {/* Rarity top strip */}
            <div className="absolute top-0 inset-x-0 h-1" style={{ background: r.color }} />
            {/* Rarity badge */}
            <span className="absolute top-2 left-2 text-xs font-display px-2 py-0.5 rounded" style={{ color: r.color, background: `${r.color}22`, border: `1px solid ${r.color}55` }}>
              {r.label}
            </span>
            {/* Element icon */}
            <span className="absolute top-2 right-2 w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(0,0,0,0.55)" }}>
              <EIcon className="w-4 h-4" style={{ color: el.color }} />
            </span>
            {/* Name at bottom of card */}
            <div className="absolute bottom-2 inset-x-3">
              <p className="font-display text-xl text-white leading-none">{hero.name}</p>
              <div className="flex gap-0.5 mt-1">
                {Array.from({ length: maxStars }).map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5" style={{ color: r.color, fill: i < currentStars ? r.color : "transparent", opacity: i < currentStars ? 1 : 0.3 }} />
                ))}
              </div>
            </div>
          </div>
          {/* Index indicator */}
          <p className="text-[11px] text-slate-500 font-semibold tracking-widest">
            {index + 1} / {heroes.length}
          </p>
        </div>

        {/* ---- RIGHT: Info panel ---- */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Header */}
          <div className="shrink-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold" style={{ color: r.color }}>{r.name}</span>
              <span className="w-1 h-1 rounded-full bg-slate-600" />
              <span className="flex items-center gap-1 text-sm text-slate-300">
                <EIcon className="w-3.5 h-3.5" style={{ color: el.color }} />
                {hero.element}
              </span>
              <span className="w-1 h-1 rounded-full bg-slate-600" />
              <span className="text-sm text-slate-300">{hero.role}</span>
            </div>
            {hero.faction && (
              <p className="text-[11px] text-slate-500 mt-0.5">{hero.faction}</p>
            )}
            {/* Short lore */}
            <p className="text-sm text-slate-400 mt-2 italic leading-relaxed max-w-md">"{hero.lore}"</p>
          </div>

          {/* VIEW DETAILS button or tabbed panel */}
          {!showDetails ? (
            <button
              onClick={() => setShowDetails(true)}
              data-testid="hero-inspection-view-details"
              className="mt-4 self-start inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-display text-sm tracking-wider transition-all hover:scale-105"
              style={{
                background: `linear-gradient(135deg, ${r.color}22, ${r.color}08)`,
                border: `1.5px solid ${r.color}66`,
                color: r.color,
              }}
            >
              <Sparkles className="w-4 h-4" /> VIEW DETAILS
            </button>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="flex flex-col flex-1 min-h-0 mt-4"
            >
              {/* Tab bar */}
              <div className="flex gap-1 shrink-0 border-b border-white/10 pb-2" data-testid="hero-inspection-tabs">
                {TABS.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    data-testid={`hero-inspection-tab-${t.key}`}
                    className={`px-3 py-1.5 rounded-md text-[11px] font-display tracking-wider transition-all ${
                      tab === t.key ? "text-white" : "text-slate-500 hover:text-slate-300"
                    }`}
                    style={tab === t.key ? { background: `${r.color}18`, border: `1px solid ${r.color}44` } : { border: "1px solid transparent" }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div className="flex-1 min-h-0 overflow-y-auto scrollbar-none mt-3 pr-1" data-testid="hero-inspection-tab-content">
                {tab === "skills" && <SkillsTab hero={hero} r={r} />}
                {tab === "stats" && <StatsTab hero={hero} />}
                {tab === "lore" && <LoreTab hero={hero} r={r} />}
                {tab === "progression" && <ProgressionTab hero={hero} r={r} maxStars={maxStars} currentStars={currentStars} />}
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Tab content components
// ---------------------------------------------------------------------------
const SkillsTab = ({ hero, r }) => {
  const jutsus = hero.jutsus || [];
  const passive = hero.passive;
  if (jutsus.length === 0 && !passive) return <p className="text-sm text-slate-500">No abilities available.</p>;
  return (
    <div className="space-y-2.5">
      {jutsus.map((j) => {
        const SIcon = SKILL_TYPE_ICON[j.type] || Sword;
        const isUlt = j.ultimate;
        return (
          <div key={j.id} className="rounded-lg p-3" style={{ background: isUlt ? `${r.color}10` : "rgba(255,255,255,0.03)", border: `1px solid ${isUlt ? `${r.color}44` : "rgba(255,255,255,0.08)"}` }}>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: isUlt ? `${r.color}22` : "rgba(255,255,255,0.06)" }}>
                <SIcon className="w-4 h-4" style={{ color: isUlt ? r.color : "#94a3b8" }} />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">
                  {j.name}
                  {isUlt && <span className="ml-2 text-[9px] font-display tracking-wider px-1.5 py-0.5 rounded" style={{ background: r.color, color: "#05050A" }}>ULTIMATE</span>}
                </p>
                <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                  <span className="uppercase tracking-wider">{j.type}</span>
                  {j.chakra_cost > 0 && <span className="flex items-center gap-0.5"><Zap className="w-3 h-3" />{j.chakra_cost}</span>}
                  {j.chakra_gain > 0 && <span className="flex items-center gap-0.5 text-emerald-400"><Zap className="w-3 h-3" />+{j.chakra_gain}</span>}
                  {j.power > 0 && <span className="flex items-center gap-0.5 text-fox"><Sword className="w-3 h-3" />{j.power}</span>}
                </div>
              </div>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed pl-10">{j.description}</p>
          </div>
        );
      })}
      {passive && (
        <div className="rounded-lg p-3" style={{ background: "rgba(213,0,249,0.06)", border: "1px solid rgba(213,0,249,0.22)" }}>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(213,0,249,0.18)" }}>
              <Sparkles className="w-4 h-4 text-jutsu" />
            </span>
            <p className="text-sm font-semibold text-white">{passive.name} <span className="text-[9px] font-display tracking-wider px-1.5 py-0.5 rounded bg-jutsu/20 text-jutsu ml-1">PASSIVE</span></p>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed pl-10">{passive.desc}</p>
        </div>
      )}
    </div>
  );
};

const StatsTab = ({ hero }) => {
  const stats = hero.base_stats || {};
  return (
    <div className="space-y-2.5">
      {STAT_ORDER.map((key) => {
        const meta = STAT_META[key];
        const val = stats[key] ?? 0;
        const max = STAT_MAX[key] || 100;
        const pct = Math.min(100, (val / max) * 100);
        const SIcon = meta.icon;
        return (
          <div key={key} className="flex items-center gap-3">
            <span className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${meta.color}15` }}>
              <SIcon className="w-3.5 h-3.5" style={{ color: meta.color }} />
            </span>
            <span className="text-xs font-semibold text-slate-300 w-20 shrink-0">{meta.label}</span>
            <div className="flex-1 h-2 rounded-full bg-white/8 overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: meta.color }} />
            </div>
            <span className="text-xs font-bold text-white tabular-nums w-12 text-right shrink-0">{val.toLocaleString()}</span>
          </div>
        );
      })}
    </div>
  );
};

const LoreTab = ({ hero, r }) => (
  <div className="space-y-3">
    <p className="text-sm text-slate-300 leading-relaxed italic">"{hero.lore}"</p>
    {hero.faction && (
      <div className="pt-2 border-t border-white/8">
        <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Faction</p>
        <p className="text-sm text-slate-300">{hero.faction}</p>
      </div>
    )}
    {hero.title && (
      <div className="pt-2 border-t border-white/8">
        <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Title</p>
        <p className="text-sm" style={{ color: r.color }}>{hero.title}</p>
      </div>
    )}
    {hero.tags && hero.tags.length > 0 && (
      <div className="pt-2 border-t border-white/8">
        <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1.5">Traits</p>
        <div className="flex flex-wrap gap-1.5">
          {hero.tags.map((t) => (
            <span key={t} className="text-[10px] px-2 py-0.5 rounded-md bg-white/[0.04] text-slate-300 border border-white/10">{t}</span>
          ))}
        </div>
      </div>
    )}
  </div>
);

const ProgressionTab = ({ hero, r, maxStars, currentStars }) => {
  const maxLevel = 500;
  return (
    <div className="space-y-4">
      {/* Star evolution */}
      <div>
        <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">Star Evolution</p>
        <div className="flex items-center gap-1.5">
          {Array.from({ length: maxStars }).map((_, i) => (
            <Star key={i} className="w-6 h-6" style={{ color: r.color, fill: i < currentStars ? r.color : "transparent", opacity: i < currentStars ? 1 : 0.25 }} />
          ))}
        </div>
        <p className="text-[11px] text-slate-400 mt-1.5">
          {currentStars < maxStars
            ? <>Evolve with shards to reach <span style={{ color: r.color }}>{maxStars}★</span> — unlocks full potential.</>
            : <span style={{ color: r.color }}>Maximum stars reached — fully evolved.</span>
          }
        </p>
      </div>

      {/* Level progression */}
      <div className="pt-3 border-t border-white/8">
        <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">Level Progression</p>
        <div className="flex items-center gap-2 mb-1">
          <div className="flex-1 h-2 rounded-full bg-white/8 overflow-hidden">
            <div className="h-full rounded-full" style={{ width: "20%", background: `linear-gradient(90deg, ${r.color}, ${GOLD.base})` }} />
          </div>
          <span className="text-xs font-bold text-white tabular-nums">1 / {maxLevel}</span>
        </div>
        <p className="text-[11px] text-slate-400 mt-1">Ascend with crystals to raise the level cap beyond 100 — up to {maxLevel}.</p>
      </div>

      {/* Ascension */}
      <div className="pt-3 border-t border-white/8">
        <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">Ascension</p>
        <div className="flex items-center gap-1">
          {Array.from({ length: 16 }).map((_, i) => (
            <div key={i} className="flex-1 h-1.5 rounded-full" style={{ background: i === 0 ? r.color : "rgba(255,255,255,0.08)" }} />
          ))}
        </div>
        <p className="text-[11px] text-slate-400 mt-1.5">16 ascension tiers — each unlocks +25 levels and boosts all stats.</p>
      </div>

      {/* Merge / potential */}
      <div className="pt-3 border-t border-white/8">
        <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">Merge Compatibility</p>
        <p className="text-[11px] text-slate-400">Duplicates convert to <span style={{ color: GOLD.base }}>Evolution Shards</span> — invest in stars or skill ranks. Long-term growth keeps every hero relevant.</p>
      </div>
    </div>
  );
};
