import { Heart, Sword, Shield, Wind, Star, ChevronsUp, Gem, Coins, Sparkles, Check, Scroll, Zap, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { RARITY, ELEMENT } from "@/lib/styles";
import { RarityBadge } from "@/components/RarityBadge";

const Stat = ({ icon: Icon, label, value, color }) => (
  <div className="flex flex-col items-center gap-1 flex-1 min-w-0 py-1">
    <Icon className="w-4 h-4 sm:w-5 sm:h-5" style={{ color }} />
    <span className="font-display text-xl sm:text-2xl text-white leading-none">{value}</span>
    <span className="text-[10px] uppercase tracking-widest text-slate-500">{label}</span>
  </div>
);

/**
 * HeroDetailModal — the single, shared hero-detail card. Used as a
 * read-only "how to obtain" viewer from the Gallery, and as the full
 * progression hub (EXP tomes + Ascend) from the Roster. Generously sized —
 * portrait up top, complete profile below — never a cramped tiny dialog.
 *
 * @param template   catalog definition: name, title, lore, element, role,
 *                    rarity, portrait, base_stats, jutsus
 * @param instance    owned instance (level, exp, exp_to_next, ascension,
 *                    ascension_max, stats, power) — omit for a catalog-only view
 * @param owned       shows the green "OWNED" ribbon
 * @param obtain      { campaignChapter } — Gallery-only "how to obtain" hint
 * @param progression { busy, inv, items, atCap, fullyAscended, ascCost,
 *                    canAscend, onUseExpTome, onAscend } — Roster-only. When
 *                    provided, replaces "How to Obtain" with the training UI.
 */
export default function HeroDetailModal({
  open, onClose, template, instance = null, owned = false, obtain = null, progression = null,
}) {
  if (!template) return null;
  const rarity = RARITY[template.rarity] || RARITY.R;
  const element = ELEMENT[template.element] || {};
  const stats = instance?.stats || template.base_stats;
  const expPct = instance && instance.exp_to_next ? Math.min(100, (instance.exp / instance.exp_to_next) * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        data-testid="hero-detail-modal"
        className="max-w-xl sm:max-w-2xl w-[calc(100%-1.5rem)] sm:w-full p-0 gap-0 overflow-hidden max-h-[92vh] overflow-y-auto bg-[#0B0B14] border-0 rounded-2xl"
        style={{ border: `1px solid ${rarity.color}66`, boxShadow: `0 0 60px ${rarity.color}40` }}
      >
        <DialogTitle className="sr-only">{template.name}</DialogTitle>
        <DialogDescription className="sr-only">Details for {template.name}</DialogDescription>

        {/* ---------- Portrait ---------- */}
        <div className="relative h-[340px] sm:h-[440px] shrink-0">
          <img src={template.portrait} alt={template.name} className="w-full h-full object-cover object-top" />
          <div className="absolute inset-x-0 top-0 h-28 pointer-events-none" style={{ background: `linear-gradient(to bottom, ${element.color}40, transparent)` }} />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B14] via-transparent to-transparent pointer-events-none" />
          <div className="absolute top-4 right-16 sm:right-20 z-10"><RarityBadge rarity={template.rarity} size="lg" /></div>
          {owned && (
            <span className="absolute top-4 left-4 z-10 flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-500/90 text-white text-xs font-bold" data-testid="detail-owned-badge">
              <Check className="w-3.5 h-3.5" /> OWNED
            </span>
          )}
        </div>

        {/* ---------- Profile content ---------- */}
        <div className="p-5 sm:p-7">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-bold px-2.5 py-1 rounded-md" style={{ background: `${element.color}22`, color: element.color, border: `1px solid ${element.color}66` }}>{template.element}</span>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-white/10 text-slate-200">{template.role}</span>
            {instance && (
              <span className="ml-auto font-display text-lg text-amber-300 flex items-center gap-1" data-testid="hero-power-label"><Zap className="w-4 h-4" />{instance.power} PWR</span>
            )}
          </div>
          <h2 className="font-display text-4xl sm:text-6xl tracking-wide text-white leading-none">{template.name}</h2>
          {template.title && <p className="text-sm sm:text-base text-chakra italic mt-1.5">{template.title}</p>}
          {template.lore && <p className="text-sm text-slate-400 italic mt-3">&ldquo;{template.lore}&rdquo;</p>}

          {/* Stats */}
          <div className="rounded-2xl bg-white/[0.03] border border-white/10 mt-5 p-3 sm:p-4">
            <div className="flex items-stretch divide-x divide-white/10">
              <Stat icon={Heart} label="HP" value={stats.hp} color="#FF1744" />
              <Stat icon={Sword} label="ATK" value={stats.atk} color="#FF5722" />
              <Stat icon={Shield} label="DEF" value={stats.def} color="#29B6F6" />
              <Stat icon={Wind} label="SPD" value={stats.spd} color="#00E676" />
            </div>
          </div>

          {progression ? (
            <div className="mt-6" data-testid="hero-progression-section">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-display text-xl text-white">Lv.{instance.level}<span className="text-slate-500 text-sm">/{instance.level_cap}</span></span>
                <div className="flex gap-0.5" data-testid="ascension-stars">
                  {Array.from({ length: instance.ascension_max }).map((_, i) => (
                    <Star key={i} className="w-4 h-4" style={{
                      color: i < instance.ascension ? "#FFCA28" : "#475569",
                      fill: i < instance.ascension ? "#FFCA28" : "transparent",
                    }} />
                  ))}
                </div>
              </div>
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>EXP</span>
                <span data-testid="hero-exp-label">{progression.atCap ? "MAX — ascend to continue" : `${instance.exp} / ${instance.exp_to_next}`}</span>
              </div>
              <div className="h-2 rounded bg-black/50 overflow-hidden mb-4">
                <div className="h-full rounded" style={{ width: `${expPct}%`, background: "linear-gradient(90deg,#00E5FF,#76FF03)" }} />
              </div>

              <p className="text-xs uppercase tracking-widest text-slate-500 mb-2">Train with EXP Tomes</p>
              <div className="grid grid-cols-3 gap-2 mb-4">
                {["exp_tome_minor", "exp_tome_greater", "exp_tome_ancient"].map((tid) => {
                  const count = progression.inv[tid] || 0;
                  const meta = progression.items[tid];
                  return (
                    <button
                      key={tid}
                      onClick={() => progression.onUseExpTome(tid)}
                      disabled={progression.busy || count < 1 || progression.atCap}
                      data-testid={`use-${tid}`}
                      className="flex flex-col items-center gap-0.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 hover:border-white/25 transition-colors disabled:opacity-40"
                    >
                      <Sparkles className="w-4 h-4" style={{ color: meta?.color }} />
                      <span className="text-[10px] text-slate-300">+{meta?.value ?? 0} xp</span>
                      <span className="text-[10px] text-white font-semibold">×{count}</span>
                    </button>
                  );
                })}
              </div>

              {!progression.fullyAscended ? (
                <button
                  onClick={progression.onAscend}
                  disabled={progression.busy || !progression.canAscend}
                  data-testid="ascend-button"
                  className="w-full py-3 mb-2 rounded-xl font-display text-base sm:text-lg tracking-wide bg-amber-400 text-[#05050A] hover:bg-amber-300 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 flex-wrap"
                >
                  {progression.busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <ChevronsUp className="w-5 h-5" />}
                  {progression.atCap ? "ASCEND" : "REACH LV.CAP TO ASCEND"}
                  {progression.atCap && (
                    <span className="flex items-center gap-2 text-sm">
                      <span className="flex items-center gap-1"><Gem className="w-4 h-4" />{progression.ascCost.ascension_crystal}</span>
                      <span className="flex items-center gap-1"><Coins className="w-4 h-4" />{progression.ascCost.ryo}</span>
                    </span>
                  )}
                </button>
              ) : (
                <div className="w-full py-3 mb-2 rounded-xl text-center font-display text-base tracking-wide text-amber-300 bg-amber-400/10 flex items-center justify-center gap-2" data-testid="fully-ascended-label">
                  <Sparkles className="w-4 h-4" /> FULLY ASCENDED
                </div>
              )}
            </div>
          ) : (
            <div className="mt-6">
              <p className="text-xs uppercase tracking-widest text-slate-500 mb-2">How to Obtain</p>
              <div className="flex flex-wrap gap-2">
                <span className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-jutsu/15 text-jutsu border border-jutsu/30"><Sparkles className="w-3.5 h-3.5" /> Summon</span>
                {obtain?.campaignChapter != null && (
                  <span className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-fox/15 text-fox border border-fox/30"><Scroll className="w-3.5 h-3.5" /> Campaign Ch.{obtain.campaignChapter} first clear</span>
                )}
              </div>
            </div>
          )}

          {/* Jutsu */}
          <p className="text-xs uppercase tracking-widest text-slate-500 mt-6 mb-2">Jutsu</p>
          <div className="space-y-2">
            {template.jutsus.map((j) => (
              <div key={j.id} className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white text-sm">{j.name}</span>
                    {j.chakra_cost > 0 ? <span className="text-[10px] font-bold text-chakra">{j.chakra_cost} CK</span> : <span className="text-[10px] text-slate-500">Basic</span>}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{j.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
