import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Loader2, ChevronUp, ChevronDown, Coins, Zap } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useGame } from "@/context/GameContext";
import api, { formatApiErrorDetail } from "@/lib/api";
import { ItemIcon } from "@/components/ItemIcon";

// Must mirror backend forge_production.py production_recipe()
const MATERIAL_BANDS = [
  ["copper_ore", "tin_shard"],
  ["iron_ingot", "mithril_shard"],
  ["adamantite_chunk", "runic_crystal"],
  ["orichalcum_ingot", "dragon_scale"],
  ["void_essence", "primordial_core"],
];

function productionRecipe(cat, tier) {
  const band = Math.min(Math.floor((tier - 1) / 40), 4);
  const [mat1, mat2] = MATERIAL_BANDS[band];
  const tierInBand = ((tier - 1) % 40) + 1;
  const qty1 = 2 + Math.floor(tierInBand / 5);
  const qty2 = 1 + Math.floor(tierInBand / 10);
  const materials = { [mat1]: qty1, [mat2]: qty2 };
  if (tier >= 150) materials.titan_core = 1 + Math.floor((tier - 150) / 25);
  if (tier >= 170) materials.warden_scale = 1 + Math.floor((tier - 170) / 15);
  const ryo = 50 * tier;
  const forgeXp = 15 * tier;
  let potency;
  if (cat.stat === "hp") potency = 500 + tier * 50;
  else if (cat.stat === "chakra") potency = 20 + tier * 2;
  else if (cat.stat === "atk" || cat.stat === "def") potency = 10 + tier * 3;
  else potency = 30 + tier * 2;
  return { materials, ryo, forgeXp, forgeLevelReq: tier, potency };
}

const PAGE_SIZE = 12;

export default function ForgeProduction() {
  const { user, setUser } = useAuth();
  const { productionCategories, items, forgeMaxLevel } = useGame();
  const [selCat, setSelCat] = useState(productionCategories[0]?.id || "hp_potion");
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState(false);

  const forgeLevel = user?.forge_level || 1;
  const forgeXp = user?.forge_xp || 0;
  const inv = user?.inventory || {};
  const ryo = user?.ryo || 0;

  // Forge XP bar
  const xpInfo = useMemo(() => {
    let level = 1, remaining = forgeXp;
    while (level < (forgeMaxLevel || 200)) {
      const need = 80 + level * 40;
      if (remaining < need) return { level, xp: remaining, need, pct: (remaining / need) * 100 };
      remaining -= need;
      level++;
    }
    return { level: forgeMaxLevel, xp: 0, need: 0, pct: 100 };
  }, [forgeXp, forgeMaxLevel]);

  const cat = productionCategories.find((c) => c.id === selCat) || productionCategories[0];
  const maxTier = forgeMaxLevel || 200;
  const totalPages = Math.ceil(maxTier / PAGE_SIZE);
  const startTier = page * PAGE_SIZE + 1;
  const endTier = Math.min(startTier + PAGE_SIZE - 1, maxTier);

  const recipes = useMemo(() => {
    if (!cat) return [];
    const out = [];
    for (let t = startTier; t <= endTier; t++) {
      out.push({ tier: t, ...productionRecipe(cat, t) });
    }
    return out;
  }, [cat, startTier, endTier]);

  const produce = async (tier) => {
    setBusy(true);
    try {
      const { data } = await api.post("/game/forge/produce", { category: selCat, tier });
      setUser(data.profile);
      if (data.forge_leveled_up) {
        toast.success(`Forge Level ${data.forge_new_level}!`, {
          description: `Crafted ${data.produced.name} ×${data.produced.qty}`,
        });
      } else {
        toast.success(`Crafted ${data.produced.name} ×${data.produced.qty} (+${data.forge_xp_gained} Forge XP)`);
      }
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally { setBusy(false); }
  };

  if (!cat) return null;

  return (
    <div data-testid="forge-production">
      {/* Forge level + XP bar */}
      <div className="flex items-center gap-3 mb-4 p-3.5 rounded-xl panel">
        <div className="flex items-center gap-2 shrink-0">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center font-display text-lg font-bold"
            style={{ background: "linear-gradient(135deg,#FF5722,#FFC857)", color: "#05050A" }}
          >
            {xpInfo.level}
          </div>
          <div>
            <p className="text-sm font-bold text-ink leading-none">Forge Level</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Max {forgeMaxLevel}</p>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between text-[10px] text-slate-500 mb-1">
            <span>Forge XP</span>
            <span className="tabular-nums">{xpInfo.xp.toLocaleString()} / {xpInfo.need.toLocaleString()}</span>
          </div>
          <div className="h-2.5 rounded bg-black/10 overflow-hidden">
            <div
              className="h-full rounded transition-all"
              style={{ width: `${xpInfo.pct}%`, background: "linear-gradient(90deg,#FF5722,#FFC857)" }}
            />
          </div>
        </div>
      </div>

      {/* Category selector */}
      <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
        {productionCategories.map((c) => (
          <button
            key={c.id}
            onClick={() => { setSelCat(c.id); setPage(0); }}
            data-testid={`prod-cat-${c.id}`}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-colors ${
              selCat === c.id ? "text-[#05050A]" : "text-slate-500 border border-black/10 hover:text-ink"
            }`}
            style={selCat === c.id ? { background: c.color } : {}}
          >
            <ItemIcon icon={c.icon} className="w-4 h-4" style={{ color: selCat === c.id ? "#05050A" : c.color }} />
            {c.name}
          </button>
        ))}
      </div>

      {/* Tier pagination */}
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] text-slate-500">{cat.desc}</p>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
            className="p-1 rounded-md border border-black/10 text-slate-500 hover:text-ink disabled:opacity-30"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          <span className="text-[10px] text-slate-500 tabular-nums px-1">
            Tiers {startTier}–{endTier}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
            disabled={page >= totalPages - 1}
            className="p-1 rounded-md border border-black/10 text-slate-500 hover:text-ink disabled:opacity-30"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Recipe grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" data-testid="forge-production-list">
        {recipes.map((r) => {
          const locked = forgeLevel < r.forgeLevelReq;
          const canAfford = !locked && ryo >= r.ryo && Object.entries(r.materials).every(([mid, need]) => (inv[mid] || 0) >= need);
          return (
            <motion.div
              key={r.tier}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min((r.tier - startTier) * 0.02, 0.2) }}
              className={`p-3 rounded-xl border transition-all ${
                locked ? "border-black/5 bg-black/[0.02] opacity-50" : canAfford ? "border-black/10 bg-black/[0.04]" : "border-black/10 bg-black/[0.02]"
              }`}
              data-testid={`prod-recipe-${r.tier}`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <ItemIcon icon={cat.icon} className="w-4 h-4 shrink-0" style={{ color: cat.color }} />
                <span className="text-xs font-bold text-ink flex-1 truncate">
                  {cat.name} <span className="text-slate-500">Lv.{r.tier}</span>
                </span>
                <span className="text-[10px] font-bold tabular-nums" style={{ color: cat.color }}>
                  +{r.potency.toLocaleString()}
                </span>
              </div>

              {/* Materials */}
              <div className="flex flex-wrap gap-1.5 mb-2">
                {Object.entries(r.materials).map(([mid, need]) => {
                  const have = inv[mid] || 0;
                  const enough = have >= need;
                  const meta = items[mid] || {};
                  return (
                    <span
                      key={mid}
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] ${enough ? "text-slate-600" : "text-fox"}`}
                    >
                      <ItemIcon icon={meta.icon} className="w-3 h-3" style={{ color: meta.color }} />
                      {meta.name || mid} <span className="font-bold">{have}/{need}</span>
                    </span>
                  );
                })}
              </div>

              {/* Cost + craft button */}
              <div className="flex items-center gap-2">
                <span className={`text-[10px] flex items-center gap-0.5 ${ryo >= r.ryo ? "text-slate-500" : "text-fox"}`}>
                  <Coins className="w-3 h-3" /> {r.ryo.toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-500 flex items-center gap-0.5">
                  <Zap className="w-3 h-3 text-chakra" /> {r.forgeXp} XP
                </span>
                {locked ? (
                  <span className="ml-auto text-[10px] text-slate-500 font-bold">
                    🔒 Forge Lv.{r.forgeLevelReq}
                  </span>
                ) : (
                  <button
                    onClick={() => produce(r.tier)}
                    disabled={busy || !canAfford}
                    data-testid={`prod-craft-${r.tier}`}
                    className="ml-auto inline-flex items-center gap-1 px-3 py-1.5 rounded-md font-display text-sm tracking-wide text-[#05050A] transition-colors disabled:opacity-30"
                    style={{ background: cat.color }}
                  >
                    {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                    CRAFT
                  </button>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
