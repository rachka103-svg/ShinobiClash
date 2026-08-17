import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Heart, Sword, Shield, Wind, Star, ChevronsUp, Gem, ScrollText, BookOpen, Ticket, Coins, Sparkles, Zap } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useGame } from "@/context/GameContext";
import { NinjaCard } from "@/components/NinjaCard";
import { RarityBadge } from "@/components/RarityBadge";
import { RARITY, ELEMENT } from "@/lib/styles";
import api, { formatApiErrorDetail } from "@/lib/api";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";

const RARITY_ORDER = { R: 0, SR: 1, SSR: 2, UR: 3, LR: 4 };
const ascensionCost = (rarity, asc) => ({
  ascension_crystal: 5 + asc * 5 + RARITY_ORDER[rarity] * 3,
  ryo: 500 + asc * 400 + RARITY_ORDER[rarity] * 300,
});
const ITEM_ICONS = { exp_tome_minor: ScrollText, exp_tome_greater: ScrollText, exp_tome_ancient: BookOpen, ascension_crystal: Gem, summon_ticket: Ticket };

export default function Roster() {
  const { user, setUser } = useAuth();
  const { catalogById, items } = useGame();
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);

  const inv = user?.inventory || {};
  const owned = (user?.ninjas || [])
    .map((inst) => ({ ...inst, ...catalogById[inst.template_id], rarity: catalogById[inst.template_id]?.rarity }))
    .sort((a, b) => (RARITY_ORDER[b.rarity] - RARITY_ORDER[a.rarity]) || b.power - a.power);

  const sel = selected ? user.ninjas.find((n) => n.instance_id === selected) : null;
  const selTpl = sel ? catalogById[sel.template_id] : null;

  const atCap = sel && sel.level >= sel.level_cap;
  const fullyAscended = sel && sel.ascension >= sel.ascension_max;
  const ascCost = sel ? ascensionCost(selTpl.rarity, sel.ascension) : null;
  const canAscend = sel && atCap && !fullyAscended && (inv.ascension_crystal || 0) >= ascCost.ascension_crystal && (user.ryo || 0) >= ascCost.ryo;

  const applyExpTome = async (itemId) => {
    setBusy(true);
    try {
      const { data } = await api.post("/game/hero/use-exp", { instance_id: selected, item_id: itemId, qty: 1 });
      setUser(data.profile);
      toast.success(data.levels_gained > 0 ? `Leveled up +${data.levels_gained}!` : "EXP applied");
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally { setBusy(false); }
  };

  const ascend = async () => {
    setBusy(true);
    try {
      const { data } = await api.post("/game/hero/ascend", { instance_id: selected });
      setUser(data);
      toast.success("Ascended! Level cap raised.");
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally { setBusy(false); }
  };

  const expPct = sel ? Math.min(100, (sel.exp / sel.exp_to_next) * 100) : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8" data-testid="roster-page">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-5xl tracking-wide text-white">ROSTER</h1>
          <p className="text-slate-400">{owned.length} heroes in your ranks.</p>
        </div>
        <div className="flex items-center gap-2" data-testid="inventory-strip">
          {["exp_tome_minor", "exp_tome_greater", "exp_tome_ancient", "ascension_crystal", "summon_ticket"].map((id) => {
            const Icon = ITEM_ICONS[id];
            return (
              <div key={id} className="flex items-center gap-1 px-2.5 py-1.5 rounded panel" title={items[id]?.name} data-testid={`inv-${id}`}>
                <Icon className="w-4 h-4" style={{ color: items[id]?.color || "#fff" }} />
                <span className="font-display text-lg text-white">{inv[id] || 0}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {owned.map((n) => (
          <NinjaCard key={n.instance_id} ninja={n} testid={`roster-card-${n.template_id}`} onClick={() => setSelected(n.instance_id)} />
        ))}
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent
          className="max-w-md p-0 overflow-hidden max-h-[92vh] overflow-y-auto bg-[#0B0B14] border-0"
          style={sel ? { border: `1px solid ${RARITY[selTpl.rarity].color}66`, boxShadow: `0 0 50px ${RARITY[selTpl.rarity].color}40` } : undefined}
          data-testid="ninja-detail-dialog"
        >
          {sel && selTpl && (
            <div>
              <DialogTitle className="sr-only">{selTpl.name} details</DialogTitle>
              <DialogDescription className="sr-only">Stats, jutsu and leveling for {selTpl.name}</DialogDescription>

              {/* ---------- Hero showcase ---------- */}
              <div className="relative h-[440px]">
                <img src={selTpl.portrait} alt={selTpl.name} className="w-full h-full object-cover object-top" />
                {/* element-tinted top glow */}
                <div className="absolute inset-x-0 top-0 h-28 pointer-events-none" style={{ background: `linear-gradient(to bottom, ${ELEMENT[selTpl.element].color}40, transparent)` }} />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B14] via-[#0B0B14]/10 to-transparent pointer-events-none" />

                {/* glowing rarity badge — top right (sits below the dialog close button) */}
                <div className="absolute top-12 right-3 z-10">
                  <RarityBadge rarity={selTpl.rarity} size="lg" />
                </div>

                {/* level + ascension — top left */}
                <div className="absolute top-3 left-4 z-10">
                  <div className="font-display text-4xl text-white glow-text-cyan leading-none">
                    Lv.{sel.level}<span className="text-slate-400 text-xl">/{sel.level_cap}</span>
                  </div>
                  <div className="flex gap-0.5 mt-1.5" data-testid="ascension-stars">
                    {Array.from({ length: sel.ascension_max }).map((_, i) => (
                      <Star key={i} className="w-4 h-4" style={{
                        color: i < sel.ascension ? "#FFCA28" : "#475569",
                        fill: i < sel.ascension ? "#FFCA28" : "transparent",
                        filter: i < sel.ascension ? "drop-shadow(0 0 4px #FFCA28)" : "none",
                      }} />
                    ))}
                  </div>
                </div>

                {/* name block — bottom */}
                <div className="absolute bottom-4 left-5 right-5 z-10">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold px-2 py-1 rounded-md" style={{
                      background: `${ELEMENT[selTpl.element].color}22`, color: ELEMENT[selTpl.element].color,
                      border: `1px solid ${ELEMENT[selTpl.element].color}66`, boxShadow: `0 0 12px ${ELEMENT[selTpl.element].color}55`,
                    }}>{selTpl.element}</span>
                    <span className="text-xs font-semibold px-2 py-1 rounded-md bg-white/10 text-slate-200">{selTpl.role}</span>
                    <span className="text-xs font-bold flex items-center gap-1 ml-auto text-amber-300"><Zap className="w-3.5 h-3.5" />{sel.power}</span>
                  </div>
                  <h2 className="font-display text-5xl tracking-wide text-white leading-none" style={{ textShadow: "0 2px 18px rgba(0,0,0,0.8)" }}>{selTpl.name}</h2>
                  <p className="text-sm text-chakra italic mt-1">{selTpl.title}</p>
                </div>
              </div>

              <div className="p-5">
                {/* EXP bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>EXP</span>
                    <span data-testid="hero-exp-label">{atCap ? "MAX (ascend to continue)" : `${sel.exp} / ${sel.exp_to_next}`}</span>
                  </div>
                  <div className="h-2.5 rounded bg-black/50 overflow-hidden">
                    <div className="h-full hp-bar-fill rounded" style={{ width: `${expPct}%`, background: "linear-gradient(90deg,#00E5FF,#76FF03)" }} />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2 mb-4">
                  <StatBox icon={Heart} label="HP" value={sel.stats.hp} color="#FF1744" />
                  <StatBox icon={Sword} label="ATK" value={sel.stats.atk} color="#FF5722" />
                  <StatBox icon={Shield} label="DEF" value={sel.stats.def} color="#29B6F6" />
                  <StatBox icon={Wind} label="SPD" value={sel.stats.spd} color="#00E676" />
                </div>

                {/* EXP tome buttons */}
                <p className="text-xs uppercase tracking-widest text-slate-500 mb-2">Train with EXP Tomes</p>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {["exp_tome_minor", "exp_tome_greater", "exp_tome_ancient"].map((id) => {
                    const Icon = ITEM_ICONS[id];
                    const count = inv[id] || 0;
                    return (
                      <button
                        key={id}
                        onClick={() => applyExpTome(id)}
                        disabled={busy || count < 1 || atCap}
                        data-testid={`use-${id}`}
                        className="flex flex-col items-center gap-0.5 p-2 rounded-lg border border-white/10 bg-black/30 hover:border-white/30 transition-all disabled:opacity-40"
                      >
                        <Icon className="w-5 h-5" style={{ color: items[id]?.color }} />
                        <span className="text-[10px] text-slate-300">+{items[id]?.value} xp</span>
                        <span className="text-[10px] text-white">×{count}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Ascension */}
                {!fullyAscended ? (
                  <button
                    onClick={ascend}
                    disabled={busy || !canAscend}
                    data-testid="ascend-button"
                    className="w-full py-3 mb-4 rounded-lg font-display text-xl tracking-wide bg-amber-400 text-[#05050A] hover:bg-amber-300 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <ChevronsUp className="w-5 h-5" />}
                    {atCap ? "ASCEND" : "ASCEND (reach cap first)"}
                    <span className="flex items-center gap-1 text-sm"><Gem className="w-4 h-4" />{ascCost.ascension_crystal}</span>
                    <span className="flex items-center gap-1 text-sm"><Coins className="w-4 h-4" />{ascCost.ryo}</span>
                  </button>
                ) : (
                  <div className="w-full py-3 mb-4 rounded-lg text-center font-display text-lg tracking-wide text-amber-300 bg-amber-400/10 flex items-center justify-center gap-2">
                    <Sparkles className="w-4 h-4" /> FULLY ASCENDED
                  </div>
                )}

                <p className="text-xs uppercase tracking-widest text-slate-500 mb-2">Jutsu</p>
                <div className="space-y-2">
                  {selTpl.jutsus.map((j) => (
                    <div key={j.id} className="flex items-start gap-3 p-2 rounded bg-black/30">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white text-sm">{j.name}</span>
                          {j.chakra_cost > 0 ? (
                            <span className="text-[10px] text-chakra">{j.chakra_cost} CK</span>
                          ) : (
                            <span className="text-[10px] text-slate-500">Basic</span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400">{j.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

const StatBox = ({ icon: Icon, label, value, color }) => (
  <div className="rounded bg-black/30 p-2 flex flex-col items-center">
    <Icon className="w-4 h-4 mb-1" style={{ color }} />
    <span className="font-display text-xl text-white leading-none">{value}</span>
    <span className="text-[10px] text-slate-500">{label}</span>
  </div>
);
