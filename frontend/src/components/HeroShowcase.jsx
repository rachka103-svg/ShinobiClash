import { Loader2, Heart, Sword, Shield, Wind, Star, ChevronsUp, Gem, Coins, Sparkles, Zap } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { RARITY, ELEMENT } from "@/lib/theme";

const StatPill = ({ icon: Icon, label, value, color }) => (
  <div className="flex flex-col items-center gap-0.5 flex-1">
    <Icon className="w-4 h-4" style={{ color }} />
    <span className="font-display text-2xl text-white leading-none">{value}</span>
    <span className="text-[10px] uppercase tracking-widest text-slate-500">{label}</span>
  </div>
);

/**
 * HeroShowcase — the cinematic full-screen character showcase. Replaces a
 * boxed modal: the portrait fills the top ~58% of the viewport and merges
 * into the background via a gradient; everything below reads as a character
 * profile, not a database record. Game logic/handlers are passed in — this
 * component is presentation only.
 */
export default function HeroShowcase({
  open, onClose, hero, template,
  busy, inv, items, atCap, fullyAscended, ascCost, canAscend,
  onUseExpTome, onAscend,
}) {
  if (!hero || !template) return null;
  const rarity = RARITY[template.rarity] || RARITY.R;
  const element = ELEMENT[template.element] || {};
  const expPct = Math.min(100, (hero.exp / hero.exp_to_next) * 100);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        data-testid="hero-showcase"
        className="max-w-none w-screen h-screen sm:h-screen top-0 left-0 translate-x-0 translate-y-0 rounded-none border-0 p-0 gap-0 bg-[#05050A] overflow-y-auto overflow-x-hidden"
      >
        <DialogTitle className="sr-only">{template.name} showcase</DialogTitle>
        <DialogDescription className="sr-only">Stats, jutsu and leveling for {template.name}</DialogDescription>

        {/* ================= ARTWORK ZONE — ~58% of viewport ================= */}
        <div className="relative w-full h-[56vh] sm:h-[62vh] overflow-hidden">
          <img src={template.portrait} alt={template.name} className="absolute inset-0 w-full h-full object-cover object-top" />

          {/* elemental aura wash from the top */}
          <div className="absolute inset-x-0 top-0 h-40 pointer-events-none" style={{ background: `linear-gradient(to bottom, ${element.color}55, transparent)` }} />
          {/* rarity edge glow */}
          <div className="absolute inset-0 pointer-events-none" style={{ boxShadow: `inset 0 0 140px ${rarity.color}30` }} />
          {/* bottom scrim that MERGES into the page background color below */}
          <div className="absolute inset-x-0 bottom-0 h-2/3 pointer-events-none" style={{ background: "linear-gradient(to top, #05050A 0%, rgba(5,5,10,0.75) 35%, transparent 100%)" }} />

          {/* level + ascension — top-left, floating, no box */}
          <div className="absolute top-5 left-5 z-10">
            <div className="font-display text-3xl sm:text-4xl text-white leading-none" style={{ textShadow: "0 0 14px rgba(0,0,0,0.9)" }}>
              Lv.{hero.level}<span className="text-slate-400 text-lg">/{hero.level_cap}</span>
            </div>
            <div className="flex gap-0.5 mt-1.5" data-testid="ascension-stars">
              {Array.from({ length: hero.ascension_max }).map((_, i) => (
                <Star key={i} className="w-3.5 h-3.5" style={{
                  color: i < hero.ascension ? "#FFCA28" : "#475569",
                  fill: i < hero.ascension ? "#FFCA28" : "transparent",
                  filter: i < hero.ascension ? "drop-shadow(0 0 4px #FFCA28)" : "none",
                }} />
              ))}
            </div>
          </div>

          {/* name block — bottom of artwork zone, overlapping the merge scrim */}
          <div className="absolute bottom-0 inset-x-0 z-10 px-5 sm:px-10 pb-5 sm:pb-8">
            <div className="flex items-center gap-2 mb-1.5 text-xs sm:text-sm font-semibold tracking-wide">
              <span style={{ color: rarity.color, textShadow: `0 0 10px ${rarity.color}` }}>{rarity.name.toUpperCase()}</span>
              <span className="text-slate-500">·</span>
              <span style={{ color: element.color, textShadow: `0 0 10px ${element.color}` }}>{template.element}</span>
              <span className="text-slate-500">·</span>
              <span className="text-slate-300">{template.role}</span>
              <span className="ml-auto flex items-center gap-1 text-amber-300"><Zap className="w-3.5 h-3.5" />{hero.power} PWR</span>
            </div>
            <h1 className="font-display tracking-wide text-white leading-none text-5xl sm:text-7xl" style={{ textShadow: "0 4px 24px rgba(0,0,0,0.85)" }}>
              {template.name}
            </h1>
            <p className="text-sm sm:text-base text-chakra italic mt-1">{template.title}</p>
          </div>
        </div>

        {/* ================= CHARACTER PROFILE ================= */}
        <div className="relative px-5 sm:px-10 pb-12 -mt-1">
          {/* EXP */}
          <div className="mb-5">
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>EXP</span>
              <span data-testid="hero-exp-label">{atCap ? "MAX — ascend to continue" : `${hero.exp} / ${hero.exp_to_next}`}</span>
            </div>
            <div className="h-2 rounded bg-black/50 overflow-hidden">
              <div className="h-full rounded" style={{ width: `${expPct}%`, background: "linear-gradient(90deg,#00E5FF,#76FF03)" }} />
            </div>
          </div>

          {/* single glass surface — the ONLY place info needs separation from the artwork */}
          <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-4 sm:p-5 mb-6">
            <div className="flex items-stretch divide-x divide-white/10">
              <StatPill icon={Heart} label="HP" value={hero.stats.hp} color="#FF1744" />
              <StatPill icon={Sword} label="ATK" value={hero.stats.atk} color="#FF5722" />
              <StatPill icon={Shield} label="DEF" value={hero.stats.def} color="#29B6F6" />
              <StatPill icon={Wind} label="SPD" value={hero.stats.spd} color="#00E676" />
            </div>
          </div>

          {/* Train with EXP tomes */}
          <p className="text-xs uppercase tracking-widest text-slate-500 mb-2">Train with EXP Tomes</p>
          <div className="grid grid-cols-3 gap-2 mb-5">
            {["exp_tome_minor", "exp_tome_greater", "exp_tome_ancient"].map((id) => {
              const count = inv[id] || 0;
              return (
                <button
                  key={id}
                  onClick={() => onUseExpTome(id)}
                  disabled={busy || count < 1 || atCap}
                  data-testid={`use-${id}`}
                  className="flex flex-col items-center gap-0.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 hover:border-white/25 transition-all disabled:opacity-40"
                >
                  <Sparkles className="w-4 h-4" style={{ color: items[id]?.color }} />
                  <span className="text-[10px] text-slate-300">+{items[id]?.value} xp</span>
                  <span className="text-[10px] text-white font-semibold">×{count}</span>
                </button>
              );
            })}
          </div>

          {/* Ascend */}
          {!fullyAscended ? (
            <button
              onClick={onAscend}
              disabled={busy || !canAscend}
              data-testid="ascend-button"
              className="w-full py-3 mb-7 rounded-xl font-display text-xl tracking-wide bg-amber-400 text-[#05050A] hover:bg-amber-300 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <ChevronsUp className="w-5 h-5" />}
              {atCap ? "ASCEND" : "ASCEND (reach cap first)"}
              <span className="flex items-center gap-1 text-sm"><Gem className="w-4 h-4" />{ascCost.ascension_crystal}</span>
              <span className="flex items-center gap-1 text-sm"><Coins className="w-4 h-4" />{ascCost.ryo}</span>
            </button>
          ) : (
            <div className="w-full py-3 mb-7 rounded-xl text-center font-display text-lg tracking-wide text-amber-300 bg-amber-400/10 flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4" /> FULLY ASCENDED
            </div>
          )}

          {/* Abilities — visually distinct actions, not plain text rows */}
          <p className="text-xs uppercase tracking-widest text-slate-500 mb-2">Abilities</p>
          <div className="space-y-2">
            {template.jutsus.map((j) => {
              const isBasic = !(j.chakra_cost > 0);
              return (
                <div
                  key={j.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border-l-2"
                  style={{ borderLeftColor: isBasic ? "#475569" : element.color }}
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: isBasic ? "rgba(255,255,255,0.06)" : `${element.color}22`, color: isBasic ? "#94A3B8" : element.color }}
                  >
                    {isBasic ? <Sword className="w-4.5 h-4.5" /> : <Zap className="w-4.5 h-4.5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white text-sm">{j.name}</span>
                      {!isBasic && <span className="text-[10px] font-bold" style={{ color: element.color }}>{j.chakra_cost} CK</span>}
                    </div>
                    <p className="text-xs text-slate-400">{j.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
