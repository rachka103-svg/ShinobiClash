import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, Heart, Sword, Shield, Wind, Star, ChevronsUp, Gem, Coins, Sparkles, Zap, Layers, Crown } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { useGame } from "@/context/GameContext";
import HeroPortrait from "@/components/HeroPortrait";
import { RarityBadge } from "@/components/RarityBadge";
import { RARITY, ELEMENT } from "@/lib/styles";
import api, { formatApiErrorDetail } from "@/lib/api";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";

const RARITY_ORDER = { R: 0, SR: 1, SSR: 2, UR: 3, LR: 4 };
const RARITY_FILTERS = ["ALL", "LR", "UR", "SSR", "SR", "R"];
const ELEMENT_FILTERS = ["ALL", "Fire", "Water", "Wind", "Earth", "Lightning", "Dark", "Light"];
const ascensionCost = (rarity, asc) => ({
  ascension_crystal: 5 + asc * 5 + RARITY_ORDER[rarity] * 3,
  ryo: 500 + asc * 400 + RARITY_ORDER[rarity] * 300,
});
const ITEM_ICONS = { exp_tome_minor: Layers, exp_tome_greater: Layers, exp_tome_ancient: Layers, ascension_crystal: Gem, summon_ticket: Sparkles };

/** Minimal, unboxed filter pill — text + thin ring, filled only when active. */
const FilterChip = ({ active, color, onClick, children, testid }) => (
  <button
    onClick={onClick}
    data-testid={testid}
    className="shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all"
    style={
      active
        ? { background: color, color: "#05050A", boxShadow: `0 0 14px ${color}88` }
        : { color: "rgba(203,213,225,0.7)", border: "1px solid rgba(255,255,255,0.12)" }
    }
  >
    {children}
  </button>
);

export default function Roster() {
  const { user, setUser } = useAuth();
  const { catalogById, items } = useGame();
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  const [rarityFilter, setRarityFilter] = useState("ALL");
  const [elementFilter, setElementFilter] = useState("ALL");

  const inv = user?.inventory || {};
  const owned = (user?.ninjas || [])
    .map((inst) => ({ ...inst, ...catalogById[inst.template_id], rarity: catalogById[inst.template_id]?.rarity }))
    .sort((a, b) => (RARITY_ORDER[b.rarity] - RARITY_ORDER[a.rarity]) || b.power - a.power);

  const filtered = useMemo(
    () => owned.filter((n) => (rarityFilter === "ALL" || n.rarity === rarityFilter) && (elementFilter === "ALL" || n.element === elementFilter)),
    [owned, rarityFilter, elementFilter]
  );

  const highestRarity = owned[0]?.rarity;

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
      {/* ---------- Header ---------- */}
      <div className="mb-1">
        <h1 className="font-display text-5xl sm:text-6xl tracking-wide text-white leading-none">ROSTER</h1>
        <p className="text-slate-400 mt-1">Build your ultimate squad.</p>
      </div>

      {/* ---------- Slim summary strip — no boxed stat cards ---------- */}
      <div className="flex items-center gap-5 sm:gap-8 mt-5 mb-6 overflow-x-auto pb-1" data-testid="roster-summary">
        <div className="shrink-0">
          <p className="text-[10px] uppercase tracking-widest text-slate-500">Heroes</p>
          <p className="font-display text-2xl text-white leading-none">{owned.length}</p>
        </div>
        <div className="w-px h-8 bg-white/10 shrink-0" />
        <div className="shrink-0 flex items-center gap-1.5">
          <Crown className="w-4 h-4" style={{ color: highestRarity ? RARITY[highestRarity].color : "#475569" }} />
          <div>
            <p className="text-[10px] uppercase tracking-widest text-slate-500">Best</p>
            <p className="font-display text-xl leading-none" style={{ color: highestRarity ? RARITY[highestRarity].color : "#fff" }}>
              {highestRarity ? RARITY[highestRarity].name : "—"}
            </p>
          </div>
        </div>
        <div className="w-px h-8 bg-white/10 shrink-0" />
        <div className="shrink-0 flex items-center gap-1.5">
          <Zap className="w-4 h-4 text-fox" />
          <div>
            <p className="text-[10px] uppercase tracking-widest text-slate-500">Squad Power</p>
            <p className="font-display text-xl text-white leading-none">{user?.team_power ?? 0}</p>
          </div>
        </div>
        <div className="w-px h-8 bg-white/10 shrink-0" />
        <div className="shrink-0 flex items-center gap-1.5">
          <Gem className="w-4 h-4 text-jutsu" />
          <div>
            <p className="text-[10px] uppercase tracking-widest text-slate-500">Crystals</p>
            <p className="font-display text-xl text-white leading-none">{inv.ascension_crystal || 0}</p>
          </div>
        </div>
      </div>

      {/* ---------- Filters — minimal pill rows ---------- */}
      <div className="space-y-2 mb-6">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1" data-testid="rarity-filters">
          {RARITY_FILTERS.map((r) => (
            <FilterChip key={r} active={rarityFilter === r} color={r === "ALL" ? "#00E5FF" : RARITY[r].color} onClick={() => setRarityFilter(r)} testid={`filter-rarity-${r}`}>
              {r === "ALL" ? "All" : r}
            </FilterChip>
          ))}
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1" data-testid="element-filters">
          {ELEMENT_FILTERS.map((el) => (
            <FilterChip key={el} active={elementFilter === el} color={el === "ALL" ? "#00E5FF" : ELEMENT[el].color} onClick={() => setElementFilter(el)} testid={`filter-element-${el}`}>
              {el === "ALL" ? "All Elements" : el}
            </FilterChip>
          ))}
        </div>
      </div>

      {/* ---------- Collection grid — portrait-first ---------- */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 text-slate-500" data-testid="roster-empty">
          <Sparkles className="w-8 h-8 mx-auto mb-2 text-slate-700" />
          No heroes match these filters yet.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
          {filtered.map((n, i) => (
            <motion.div key={n.instance_id} className="w-full" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.02, 0.3) }}>
              <HeroPortrait
                hero={n}
                mode="compact"
                onClick={() => setSelected(n.instance_id)}
                testid={`roster-card-${n.template_id}`}
              />
            </motion.div>
          ))}
        </div>
      )}

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
