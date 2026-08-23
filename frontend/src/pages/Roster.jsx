import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Gem, Sparkles, Zap, Crown } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { useGame } from "@/context/GameContext";
import HeroPortrait from "@/components/HeroPortrait";
import HeroDetailModal from "@/components/HeroDetailModal";
import EliteBurst from "@/components/EliteBurst";
import { RARITY, ELEMENT } from "@/lib/styles";
import api, { formatApiErrorDetail } from "@/lib/api";

const RARITY_ORDER = { R: 0, SR: 1, SSR: 2, UR: 3, GR: 4 };
const RARITY_FILTERS = ["ALL", "GR", "UR", "SSR", "SR", "R"];
const ELEMENT_FILTERS = ["ALL", "Fire", "Water", "Wind", "Earth", "Lightning", "Dark", "Light"];
const ascensionCost = (rarity, asc) => ({
  ascension_crystal: 5 + asc * 5 + RARITY_ORDER[rarity] * 3,
  ryo: 500 + asc * 400 + RARITY_ORDER[rarity] * 300,
});

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
  const [burst, setBurst] = useState(null);
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

  const handleCardClick = (n) => {
    const rarity = RARITY[n.rarity] || RARITY.R;
    if (rarity.tier >= 3) {
      // UR / LR — dramatic burst before the showcase opens
      setBurst({ color: rarity.color });
      setTimeout(() => { setBurst(null); setSelected(n.instance_id); }, 380);
    } else {
      setSelected(n.instance_id);
    }
  };

  const sel = selected ? user.ninjas.find((n) => n.instance_id === selected) : null;
  const selTpl = sel ? catalogById[sel.template_id] : null;

  const atCap = sel && sel.level >= sel.level_cap;
  const fullyAscended = sel && sel.ascension >= sel.ascension_max;
  const ascCost = sel ? ascensionCost(selTpl.rarity, sel.ascension) : null;
  const canAscend = sel && atCap && !fullyAscended && (inv.ascension_crystal || 0) >= ascCost.ascension_crystal && (user.ryo || 0) >= ascCost.ryo;

  const applyExpTome = async (itemId, qty = 1) => {
    setBusy(true);
    try {
      const { data } = await api.post("/game/hero/use-exp", { instance_id: selected, item_id: itemId, qty: Math.max(1, qty) });
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
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-4 gap-y-6 sm:gap-x-5 sm:gap-y-7 lg:gap-x-6 lg:gap-y-8">
          {filtered.map((n, i) => (
            <motion.div key={n.instance_id} className="w-full overflow-visible" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.02, 0.3) }}>
              <HeroPortrait
                hero={n}
                mode="compact"
                onClick={() => handleCardClick(n)}
                testid={`roster-card-${n.template_id}`}
              />
            </motion.div>
          ))}
        </div>
      )}

      <EliteBurst color={burst?.color} />

      <HeroDetailModal
        open={!!selected}
        onClose={() => setSelected(null)}
        template={selTpl}
        instance={sel}
        owned
        progression={{
          busy, inv, items, atCap, fullyAscended, ascCost, canAscend,
          onUseExpTome: applyExpTome, onAscend: ascend,
        }}
      />
    </div>
  );
}
