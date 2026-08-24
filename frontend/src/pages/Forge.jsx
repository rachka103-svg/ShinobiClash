import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Anvil, Hammer, Coins, Loader2, FlaskConical, Sparkles, ChevronRight, Layers, Filter,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useGame } from "@/context/GameContext";
import api, { formatApiErrorDetail } from "@/lib/api";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ItemIcon } from "@/components/ItemIcon";
import SummonRevealOverlay from "@/components/SummonRevealOverlay";

/**
 * THE FORGE — gear inventory + enhancement, crafting (blueprints) and
 * material fusion. The long-term material sink that keeps drops meaningful.
 */
export default function Forge() {
  const { user, setUser } = useAuth();
  const { gearConfig, craftRecipes, fusionRecipes, items, catalogById } = useGame();
  const [slotFilter, setSlotFilter] = useState("ALL");
  const [selectedGear, setSelectedGear] = useState(null);
  const [busy, setBusy] = useState(false);
  const [craftReveal, setCraftReveal] = useState(null);
  const [fuseQty, setFuseQty] = useState({});

  const gear = user?.gear || [];
  const inv = user?.inventory || {};
  const slotMeta = gearConfig?.slot_meta || {};
  const rarityMeta = gearConfig?.rarity_meta || {};
  const sets = gearConfig?.sets || {};

  const heroName = (iid) => {
    const inst = (user?.ninjas || []).find((n) => n.instance_id === iid);
    return inst ? catalogById[inst.template_id]?.name : null;
  };

  const filtered = useMemo(() => {
    const list = slotFilter === "ALL" ? gear : gear.filter((g) => g.slot === slotFilter);
    return [...list].sort((a, b) => b.score - a.score);
  }, [gear, slotFilter]);

  const sel = selectedGear ? gear.find((g) => g.gear_id === selectedGear) : null;

  const enhance = async (gearId) => {
    setBusy(true);
    try {
      const { data } = await api.post("/game/gear/enhance", { gear_id: gearId });
      setUser(data.profile);
      toast.success(`Enhanced to +${data.gear.plus}!`);
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally { setBusy(false); }
  };

  const craft = async (slot) => {
    setBusy(true);
    try {
      const { data } = await api.post("/game/gear/craft", { slot });
      setUser(data.profile);
      const g = data.crafted;
      setCraftReveal([{
        kind: "gear", rarity: g.rarity, color: rarityMeta[g.rarity]?.color, score: g.score,
        set_name: g.set_name, slot_name: slotMeta[g.slot]?.name || g.slot, icon: slotMeta[g.slot]?.icon,
      }]);
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally { setBusy(false); }
  };

  const fuse = async (targetId) => {
    setBusy(true);
    try {
      const qty = fuseQty[targetId] || 1;
      const { data } = await api.post("/game/material/fuse", { target_id: targetId, qty });
      setUser(data.profile);
      toast.success(`Fused ${qty}× ${items[targetId]?.name || targetId}!`);
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally { setBusy(false); }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 min-w-0" data-testid="forge-page">
      <div className="mb-6">
        <h1 className="font-display text-5xl sm:text-6xl tracking-wide text-ink leading-none flex items-center gap-3">
          <Anvil className="w-9 h-9 text-fox" /> THE FORGE
        </h1>
        <p className="text-slate-500 mt-1">Equip, enhance, craft and fuse — turn battlefield salvage into power.</p>
      </div>

      <Tabs defaultValue="inventory" data-testid="forge-tabs">
        <TabsList className="grid grid-cols-3 w-full bg-black/[0.04] border border-black/10 rounded-xl h-11 mb-5">
          <TabsTrigger value="inventory" data-testid="forge-inventory-tab" className="font-display tracking-wider text-base data-[state=active]:bg-fox/15 data-[state=active]:text-fox rounded-lg">GEAR</TabsTrigger>
          <TabsTrigger value="craft" data-testid="forge-craft-tab" className="font-display tracking-wider text-base data-[state=active]:bg-chakra/15 data-[state=active]:text-chakra rounded-lg">CRAFT</TabsTrigger>
          <TabsTrigger value="fuse" data-testid="forge-fuse-tab" className="font-display tracking-wider text-base data-[state=active]:bg-jutsu/15 data-[state=active]:text-jutsu rounded-lg">FUSE</TabsTrigger>
        </TabsList>

        {/* ============ INVENTORY ============ */}
        <TabsContent value="inventory">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-3" data-testid="forge-slot-filters">
            {["ALL", ...(gearConfig?.slots || [])].map((s) => (
              <button
                key={s}
                onClick={() => setSlotFilter(s)}
                data-testid={`forge-filter-${s}`}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${slotFilter === s ? "bg-fox text-[#05050A]" : "text-slate-500 border border-black/10 hover:text-ink"}`}
              >
                {s === "ALL" ? "All" : slotMeta[s]?.name || s}
              </button>
            ))}
            <span className="ml-auto shrink-0 text-xs text-slate-500" data-testid="forge-gear-count">{gear.length} pieces</span>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-16 text-slate-500" data-testid="forge-empty">
              <Anvil className="w-8 h-8 mx-auto mb-2 text-slate-700" />
              No gear yet — clear Campaign stages, farm the Gear Foundry or pull from the Armory.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5" data-testid="forge-gear-grid">
              {filtered.map((g, i) => {
                const color = rarityMeta[g.rarity]?.color || "#9E9E9E";
                const equippedName = g.equipped_by ? heroName(g.equipped_by) : null;
                return (
                  <motion.button
                    key={g.gear_id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.02, 0.25) }}
                    onClick={() => setSelectedGear(g.gear_id)}
                    data-testid={`forge-gear-card-${g.gear_id}`}
                    className="text-left p-3 rounded-xl bg-black/[0.04] hover:bg-black/[0.05] transition-colors"
                    style={{ border: `1.5px solid ${color}55` }}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <ItemIcon icon={slotMeta[g.slot]?.icon} className="w-5 h-5" style={{ color }} />
                      <span className="text-[10px] font-extrabold uppercase tracking-widest" style={{ color }}>{g.rarity}</span>
                      <span className="ml-auto text-[10px] font-bold text-ink">+{g.plus}</span>
                    </div>
                    <p className="text-xs font-bold text-ink truncate">{g.set_name} {slotMeta[g.slot]?.name}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Score {g.score} · {g.main_stat.toUpperCase()} {g.main_value}</p>
                    {equippedName && <p className="text-[10px] text-chakra mt-0.5 truncate">▸ {equippedName}</p>}
                  </motion.button>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ============ CRAFT ============ */}
        <TabsContent value="craft">
          <p className="text-xs text-slate-500 mb-3">Blueprints drop in the Gear Foundry. Crafting always yields <span className="text-emerald-400 font-bold">Fine or better</span> — with a chance at Legendary.</p>
          <div className="space-y-2.5" data-testid="forge-craft-list">
            {Object.entries(craftRecipes).map(([slot, recipe]) => {
              const bpOwned = inv[recipe.blueprint] || 0;
              const steelOwned = inv.forge_steel || 0;
              const can = bpOwned >= 1 && steelOwned >= recipe.forge_steel && (user?.ryo || 0) >= recipe.ryo;
              return (
                <div key={slot} className="flex items-center gap-3 p-3.5 rounded-xl panel" data-testid={`craft-recipe-${slot}`}>
                  <ItemIcon icon={slotMeta[slot]?.icon} className="w-7 h-7 shrink-0 text-fox" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-ink">{slotMeta[slot]?.name}</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] mt-0.5">
                      <span className={bpOwned >= 1 ? "text-emerald-400" : "text-fox"}>Blueprint {bpOwned}/1</span>
                      <span className={steelOwned >= recipe.forge_steel ? "text-emerald-400" : "text-fox"}>Steel {steelOwned}/{recipe.forge_steel}</span>
                      <span className={(user?.ryo || 0) >= recipe.ryo ? "text-emerald-400" : "text-fox"}><Coins className="w-3 h-3 inline" /> {recipe.ryo}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => craft(slot)}
                    disabled={busy || !can}
                    data-testid={`gear-craft-button-${slot}`}
                    className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg font-display text-base tracking-wide bg-chakra text-[#05050A] hover:bg-cyan-300 transition-colors disabled:opacity-40"
                  >
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Hammer className="w-4 h-4" />} CRAFT
                  </button>
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* ============ FUSE ============ */}
        <TabsContent value="fuse">
          <p className="text-xs text-slate-500 mb-3">Merge surplus low-tier materials into the rare ones that gate Evolution and crafting.</p>
          <div className="space-y-2.5" data-testid="forge-fuse-list">
            {Object.entries(fusionRecipes).map(([target, recipe]) => {
              const srcOwned = inv[recipe.from] || 0;
              const qty = fuseQty[target] || 1;
              const maxQty = Math.floor(srcOwned / recipe.qty);
              const can = maxQty >= 1;
              const srcMeta = items[recipe.from] || {};
              const tgtMeta = items[target] || {};
              return (
                <div key={target} className="p-3.5 rounded-xl panel" data-testid={`fusion-recipe-${target}`}>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <ItemIcon icon={srcMeta.icon} className="w-5 h-5 shrink-0" style={{ color: srcMeta.color }} />
                      <span className="text-xs text-slate-600 truncate">{recipe.qty}× {srcMeta.name}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-600 shrink-0" />
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <ItemIcon icon={tgtMeta.icon} className="w-5 h-5 shrink-0" style={{ color: tgtMeta.color }} />
                      <span className="text-xs font-bold text-ink truncate">1× {tgtMeta.name}</span>
                    </div>
                    <span className="text-[11px] text-slate-500 shrink-0" data-testid={`fusion-owned-${target}`}>have {srcOwned}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-2.5">
                    <div className="flex items-center gap-1">
                      {[1, 5, maxQty].filter((q, i, a) => q >= 1 && a.indexOf(q) === i).map((q) => (
                        <button
                          key={q}
                          onClick={() => setFuseQty((f) => ({ ...f, [target]: q }))}
                          data-testid={`fusion-qty-${target}-${q}`}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors ${qty === q ? "bg-jutsu/20 text-jutsu border border-jutsu/40" : "text-slate-500 border border-black/10"}`}
                        >
                          {q === maxQty && q > 5 ? `Max (${q})` : `x${q}`}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => fuse(target)}
                      disabled={busy || !can || qty > maxQty}
                      data-testid={`material-fuse-button-${target}`}
                      className="ml-auto inline-flex items-center gap-1.5 px-4 py-2 rounded-lg font-display text-base tracking-wide bg-jutsu text-ink hover:bg-fuchsia-500 transition-colors disabled:opacity-40"
                    >
                      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <FlaskConical className="w-4 h-4" />} FUSE
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Material wallet */}
          <p className="text-xs uppercase tracking-widest text-slate-500 mt-6 mb-2">Materials</p>
          <div className="flex flex-wrap gap-1.5" data-testid="forge-material-wallet">
            {["scrap_iron", "forge_steel", "forge_hammer", "spirit_dust", "evo_essence", "celestial_core"].map((iid) => (
              <span key={iid} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-black/[0.04] border border-black/10 text-[11px] text-slate-600">
                <ItemIcon icon={items[iid]?.icon} className="w-3.5 h-3.5" style={{ color: items[iid]?.color }} />
                {items[iid]?.name} <span className="font-bold text-ink">×{inv[iid] || 0}</span>
              </span>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* ============ Gear detail dialog ============ */}
      <Dialog open={!!sel} onOpenChange={(o) => !o && setSelectedGear(null)}>
        {sel && (
          <DialogContent
            className="max-w-sm bg-[#FFFFFF] rounded-2xl border-0 max-h-[85vh] overflow-y-auto"
            style={{ border: `1px solid ${rarityMeta[sel.rarity]?.color}66`, boxShadow: `0 0 40px ${rarityMeta[sel.rarity]?.color}30` }}
            data-testid="gear-detail-dialog"
          >
            <DialogTitle className="font-display text-2xl tracking-wide text-ink flex items-center gap-2">
              <ItemIcon icon={slotMeta[sel.slot]?.icon} className="w-6 h-6" style={{ color: rarityMeta[sel.rarity]?.color }} />
              {sel.set_name} {slotMeta[sel.slot]?.name} +{sel.plus}
            </DialogTitle>
            <DialogDescription className="sr-only">Gear details</DialogDescription>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded" style={{ background: `${rarityMeta[sel.rarity]?.color}22`, color: rarityMeta[sel.rarity]?.color }}>{sel.rarity}</span>
              <span className="text-xs text-amber-300 font-bold" data-testid="gear-score-value">Score {sel.score}</span>
              {sel.equipped_by && <span className="text-xs text-chakra truncate">▸ {heroName(sel.equipped_by)}</span>}
            </div>

            <div className="rounded-xl bg-black/[0.04] border border-black/10 p-3 space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">{sel.main_stat.toUpperCase()} (main)</span>
                <span className="font-bold text-ink tabular-nums">+{sel.main_value}</span>
              </div>
              {sel.subs.map((s, i) => (
                <div key={i} className="flex justify-between text-xs">
                  <span className="text-slate-500">{s.stat.endsWith("_pct") ? `${s.stat.slice(0, -4).toUpperCase()} %` : s.stat.toUpperCase()}</span>
                  <span className="text-slate-600 tabular-nums">+{s.value}{s.stat.endsWith("_pct") ? "%" : ""}</span>
                </div>
              ))}
            </div>

            {/* Set bonus info */}
            {sets[sel.set_id] && (
              <div className="rounded-xl bg-black/[0.04] border border-black/10 p-3">
                <p className="text-xs font-bold mb-1" style={{ color: sets[sel.set_id].color }}>{sets[sel.set_id].name} Set</p>
                <p className="text-[11px] text-slate-500">2pc: {Object.entries(sets[sel.set_id].bonus2).map(([k, v]) => `+${v}% ${k.slice(0, -4).toUpperCase()}`).join(", ")}</p>
                <p className="text-[11px] text-slate-500">4pc: {Object.entries(sets[sel.set_id].bonus4).map(([k, v]) => `+${v}% ${k.slice(0, -4).toUpperCase()}`).join(", ")}</p>
              </div>
            )}

            {/* Enhance */}
            <div>
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>Enhancement</span>
                <span className="text-ink font-bold">+{sel.plus} / {gearConfig?.enhance_max || 15}</span>
              </div>
              <div className="h-2 rounded bg-black/50 overflow-hidden mb-3">
                <div className="h-full rounded" style={{ width: `${(sel.plus / (gearConfig?.enhance_max || 15)) * 100}%`, background: `linear-gradient(90deg, ${rarityMeta[sel.rarity]?.color}, #FFC857)` }} />
              </div>
              {sel.enhance_cost ? (
                <button
                  onClick={() => enhance(sel.gear_id)}
                  disabled={busy || (user?.ryo || 0) < sel.enhance_cost.ryo || (sel.enhance_cost.forge_hammer && (inv.forge_hammer || 0) < sel.enhance_cost.forge_hammer)}
                  data-testid="gear-enhance-button"
                  className="w-full py-3 rounded-xl font-display text-lg tracking-wide bg-fox text-ink hover:bg-orange-500 transition-colors disabled:opacity-40 flex items-center justify-center gap-2 flex-wrap"
                >
                  {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Hammer className="w-5 h-5" />}
                  ENHANCE
                  <span className="flex items-center gap-2 text-sm font-sans font-semibold">
                    <span className="flex items-center gap-1"><Coins className="w-4 h-4" />{sel.enhance_cost.ryo}</span>
                    {sel.enhance_cost.forge_hammer && <span className="flex items-center gap-1"><Hammer className="w-4 h-4" />{sel.enhance_cost.forge_hammer}</span>}
                  </span>
                </button>
              ) : (
                <div className="w-full py-3 rounded-xl text-center font-display text-base tracking-wide text-amber-300 bg-amber-400/10" data-testid="gear-max-enhanced-label">
                  <Sparkles className="w-4 h-4 inline mr-1" /> MAX ENHANCED
                </div>
              )}
            </div>
          </DialogContent>
        )}
      </Dialog>

      <SummonRevealOverlay open={!!craftReveal} results={craftReveal || []} onClose={() => setCraftReveal(null)} />
    </div>
  );
}
