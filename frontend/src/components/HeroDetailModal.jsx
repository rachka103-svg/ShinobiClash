import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Heart, Sword, Shield, Wind, Star, ChevronsUp, Gem, Coins, Sparkles, Check,
  Scroll, Zap, Loader2, ArrowRight, Anvil, Plus,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { RARITY, ELEMENT } from "@/lib/styles";
import { RarityBadge } from "@/components/RarityBadge";
import { ItemIcon } from "@/components/ItemIcon";
import { useAuth } from "@/context/AuthContext";
import { useGame } from "@/context/GameContext";
import api, { formatApiErrorDetail } from "@/lib/api";

const Stat = ({ icon: Icon, label, value, color }) => (
  <div className="flex flex-col items-center gap-1 flex-1 min-w-0 py-1">
    <Icon className="w-4 h-4 sm:w-5 sm:h-5" style={{ color }} />
    <span className="font-display text-xl sm:text-2xl text-white leading-none">{value}</span>
    <span className="text-[10px] uppercase tracking-widest text-slate-500">{label}</span>
  </div>
);

const EvoStars = ({ count, max, size = "w-4 h-4", testid }) => (
  <div className="flex gap-0.5" data-testid={testid}>
    {Array.from({ length: max }).map((_, i) => (
      <Star key={i} className={size} style={{
        color: i < count ? "#FFCA28" : "#334155",
        fill: i < count ? "#FFCA28" : "transparent",
      }} />
    ))}
  </div>
);

/**
 * HeroDetailModal — the single, shared hero-detail card. Read-only "how to
 * obtain" viewer from the Gallery; full progression hub (Train / Evolve /
 * Gear tabs) from the Roster when `progression` is provided.
 */
export default function HeroDetailModal({
  open, onClose, template, instance = null, owned = false, obtain = null, progression = null,
}) {
  const { user, setUser } = useAuth();
  const { gearConfig, items, expTomeGoldCost } = useGame();
  const [tab, setTab] = useState("train");
  const [qty, setQty] = useState(1);
  const [gearSlot, setGearSlot] = useState(null);
  const [busyLocal, setBusyLocal] = useState(false);

  if (!template) return null;
  const rarity = RARITY[template.rarity] || RARITY.R;
  const element = ELEMENT[template.element] || {};
  const stats = instance?.stats || template.base_stats;
  const expPct = instance && instance.exp_to_next ? Math.min(100, (instance.exp / instance.exp_to_next) * 100) : 0;

  // ---------- Evolution derived state ----------
  const shardsOwned = instance ? (user?.hero_shards?.[instance.template_id] || 0) : 0;
  const evoCost = instance?.evolution_cost || null;
  const inv = user?.inventory || {};
  const evoAffordable = evoCost &&
    shardsOwned >= evoCost.shards &&
    (user?.ryo || 0) >= evoCost.ryo &&
    Object.entries(evoCost.items || {}).every(([iid, q]) => (inv[iid] || 0) >= q);

  const doEvolve = async () => {
    setBusyLocal(true);
    try {
      const { data } = await api.post("/game/hero/evolve", { instance_id: instance.instance_id });
      setUser(data.profile);
      toast.success(`Evolved to ${data.stars}\u2605! Permanent stat surge unlocked.`);
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally { setBusyLocal(false); }
  };

  // ---------- Gear derived state ----------
  const allGear = user?.gear || [];
  const equippedBySlot = {};
  allGear.forEach((g) => { if (g.equipped_by === instance?.instance_id) equippedBySlot[g.slot] = g; });
  const slotMeta = gearConfig?.slot_meta || {};
  const rarityMeta = gearConfig?.rarity_meta || {};
  const sets = gearConfig?.sets || {};
  const setCounts = {};
  Object.values(equippedBySlot).forEach((g) => { setCounts[g.set_id] = (setCounts[g.set_id] || 0) + 1; });

  const equipGear = async (gearId) => {
    setBusyLocal(true);
    try {
      const { data } = await api.post("/game/gear/equip", { gear_id: gearId, instance_id: instance.instance_id });
      setUser(data.profile);
      toast.success("Gear equipped");
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally { setBusyLocal(false); }
  };

  const unequipGear = async (gearId) => {
    setBusyLocal(true);
    try {
      const { data } = await api.post("/game/gear/unequip", { gear_id: gearId });
      setUser(data.profile);
      toast.success("Gear removed");
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally { setBusyLocal(false); }
  };

  const busy = busyLocal || progression?.busy;

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
        <div className="relative h-[300px] sm:h-[400px] shrink-0">
          <img src={template.portrait} alt={template.name} className="w-full h-full object-cover object-top" />
          <div className="absolute inset-x-0 top-0 h-28 pointer-events-none" style={{ background: `linear-gradient(to bottom, ${element.color}40, transparent)` }} />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B14] via-transparent to-transparent pointer-events-none" />
          <div className="absolute top-4 right-16 sm:right-20 z-10"><RarityBadge rarity={template.rarity} size="lg" /></div>
          {owned && (
            <span className="absolute top-4 left-4 z-10 flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-500/90 text-white text-xs font-bold" data-testid="detail-owned-badge">
              <Check className="w-3.5 h-3.5" /> OWNED
            </span>
          )}
          {instance && (
            <div className="absolute bottom-3 left-4 z-10">
              <EvoStars count={instance.stars || 1} max={instance.stars_max || 6} size="w-5 h-5" testid="hero-evolution-stars" />
            </div>
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

          {progression && instance ? (
            <Tabs value={tab} onValueChange={setTab} className="mt-6" data-testid="hero-detail-tabs">
              <TabsList className="grid grid-cols-3 w-full bg-white/[0.04] border border-white/10 rounded-xl h-11">
                <TabsTrigger value="train" data-testid="hero-train-tab" className="font-display tracking-wider text-base data-[state=active]:bg-chakra/15 data-[state=active]:text-chakra rounded-lg">TRAIN</TabsTrigger>
                <TabsTrigger value="evolve" data-testid="hero-evolve-tab" className="font-display tracking-wider text-base data-[state=active]:bg-amber-400/15 data-[state=active]:text-amber-300 rounded-lg">EVOLVE</TabsTrigger>
                <TabsTrigger value="gear" data-testid="hero-gear-tab" className="font-display tracking-wider text-base data-[state=active]:bg-fox/15 data-[state=active]:text-fox rounded-lg">GEAR</TabsTrigger>
              </TabsList>

              {/* ================= TRAIN ================= */}
              <TabsContent value="train" className="mt-4" data-testid="hero-progression-section">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-display text-xl text-white">Lv.{instance.level}<span className="text-slate-500 text-sm">/{instance.level_cap}</span></span>
                  <div className="flex gap-0.5" data-testid="ascension-stars">
                    {Array.from({ length: instance.ascension_max }).map((_, i) => (
                      <ChevronsUp key={i} className="w-4 h-4" style={{ color: i < instance.ascension ? "#00E5FF" : "#334155" }} />
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

                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs uppercase tracking-widest text-slate-500">Train with EXP Tomes</p>
                  <div className="flex gap-1" data-testid="train-qty-selector">
                    {[1, 5, 25].map((q) => (
                      <button
                        key={q}
                        onClick={() => setQty(q)}
                        data-testid={`train-qty-${q}`}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors ${qty === q ? "bg-chakra/20 text-chakra border border-chakra/40" : "text-slate-400 border border-white/10"}`}
                      >
                        x{q}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 mb-1">
                  {["exp_tome_minor", "exp_tome_greater", "exp_tome_ancient"].map((tid) => {
                    const count = inv[tid] || 0;
                    const meta = items[tid];
                    const useQty = Math.min(qty, count);
                    const goldCost = (expTomeGoldCost[tid] || 0) * Math.max(1, useQty);
                    return (
                      <button
                        key={tid}
                        onClick={() => progression.onUseExpTome(tid, useQty || 1)}
                        disabled={busy || count < 1 || progression.atCap}
                        data-testid={`use-${tid}`}
                        className="flex flex-col items-center gap-0.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 hover:border-white/25 transition-colors disabled:opacity-40"
                      >
                        <Sparkles className="w-4 h-4" style={{ color: meta?.color }} />
                        <span className="text-[10px] text-slate-300">+{(meta?.value ?? 0) * Math.max(1, useQty)} xp</span>
                        <span className="text-[10px] text-white font-semibold">×{count}</span>
                        <span className="text-[9px] text-amber-300 flex items-center gap-0.5"><Coins className="w-2.5 h-2.5" />{goldCost}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-slate-500 mb-4">Training consumes tomes + Ryo. Farm both in the Resource Dungeons.</p>

                {!progression.fullyAscended ? (
                  <button
                    onClick={progression.onAscend}
                    disabled={busy || !progression.canAscend}
                    data-testid="ascend-button"
                    className="w-full py-3 mb-1 rounded-xl font-display text-base sm:text-lg tracking-wide bg-amber-400 text-[#05050A] hover:bg-amber-300 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 flex-wrap"
                  >
                    {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <ChevronsUp className="w-5 h-5" />}
                    {progression.atCap ? "ASCEND" : "REACH LV.CAP TO ASCEND"}
                    {progression.atCap && (
                      <span className="flex items-center gap-2 text-sm">
                        <span className="flex items-center gap-1"><Gem className="w-4 h-4" />{progression.ascCost.ascension_crystal}</span>
                        <span className="flex items-center gap-1"><Coins className="w-4 h-4" />{progression.ascCost.ryo}</span>
                      </span>
                    )}
                  </button>
                ) : (
                  <div className="w-full py-3 mb-1 rounded-xl text-center font-display text-base tracking-wide text-amber-300 bg-amber-400/10 flex items-center justify-center gap-2" data-testid="fully-ascended-label">
                    <Sparkles className="w-4 h-4" /> FULLY ASCENDED
                  </div>
                )}
              </TabsContent>

              {/* ================= EVOLVE ================= */}
              <TabsContent value="evolve" className="mt-4" data-testid="hero-evolve-panel">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <EvoStars count={instance.stars || 1} max={instance.stars_max || 6} size="w-5 h-5" />
                  {evoCost && (
                    <>
                      <ArrowRight className="w-4 h-4 text-slate-500" />
                      <EvoStars count={(instance.stars || 1) + 1} max={instance.stars_max || 6} size="w-5 h-5" />
                    </>
                  )}
                </div>
                <p className="text-center text-xs text-slate-400 mb-4">
                  Each star grants a permanent <span className="text-amber-300 font-bold">+7% HP / ATK / DEF</span>. Stars can ONLY be gained through Evolution.
                </p>

                {evoCost ? (
                  <>
                    <div className="space-y-2 mb-4" data-testid="evolve-cost-list">
                      <CostRow
                        icon={<Star className="w-4 h-4 text-amber-300" />}
                        label={`${template.name} Shards`}
                        have={shardsOwned} need={evoCost.shards}
                        testid="evolve-cost-shards"
                      />
                      <CostRow
                        icon={<Coins className="w-4 h-4 text-amber-400" />}
                        label="Ryo"
                        have={user?.ryo || 0} need={evoCost.ryo}
                        testid="evolve-cost-ryo"
                      />
                      {Object.entries(evoCost.items || {}).map(([iid, q]) => (
                        <CostRow
                          key={iid}
                          icon={<ItemIcon icon={items[iid]?.icon} className="w-4 h-4" style={{ color: items[iid]?.color }} />}
                          label={items[iid]?.name || iid}
                          have={inv[iid] || 0} need={q}
                          testid={`evolve-cost-${iid}`}
                        />
                      ))}
                    </div>
                    <button
                      onClick={doEvolve}
                      disabled={busy || !evoAffordable}
                      data-testid="hero-evolve-confirm-button"
                      className="w-full py-3 rounded-xl font-display text-lg tracking-wide bg-gradient-to-r from-amber-400 to-amber-300 text-[#05050A] hover:from-amber-300 hover:to-amber-200 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
                    >
                      {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Star className="w-5 h-5" />}
                      EVOLVE TO {(instance.stars || 1) + 1}★
                    </button>
                    {!evoAffordable && (
                      <p className="text-[10px] text-slate-500 mt-2 text-center">Shards come from duplicate summons · Essences &amp; Cores from Dungeons and Fusion.</p>
                    )}
                  </>
                ) : (
                  <div className="w-full py-3 rounded-xl text-center font-display text-base tracking-wide text-amber-300 bg-amber-400/10 flex items-center justify-center gap-2" data-testid="fully-evolved-label">
                    <Star className="w-4 h-4" /> FULLY EVOLVED — 6★
                  </div>
                )}
              </TabsContent>

              {/* ================= GEAR ================= */}
              <TabsContent value="gear" className="mt-4" data-testid="hero-gear-panel">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs uppercase tracking-widest text-slate-500">Equipment</p>
                  <span className="text-xs text-amber-300 font-bold flex items-center gap-1" data-testid="hero-gear-score-total">
                    <Anvil className="w-3.5 h-3.5" /> Gear Score {instance.gear_score || 0}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {(gearConfig?.slots || []).map((slot) => {
                    const g = equippedBySlot[slot];
                    const sm = slotMeta[slot] || {};
                    const color = g ? (rarityMeta[g.rarity]?.color || "#9E9E9E") : "rgba(255,255,255,0.15)";
                    const active = gearSlot === slot;
                    return (
                      <button
                        key={slot}
                        onClick={() => setGearSlot(active ? null : slot)}
                        data-testid={`hero-gear-slot-${slot}`}
                        className={`relative p-3 rounded-xl text-left transition-colors ${active ? "bg-white/[0.08]" : "bg-white/[0.03] hover:bg-white/[0.06]"}`}
                        style={{ border: `1.5px solid ${active ? "#00E5FF" : color}` }}
                      >
                        <div className="flex items-center gap-2">
                          <ItemIcon icon={sm.icon} className="w-5 h-5" style={{ color: g ? color : "#64748B" }} />
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] uppercase tracking-widest text-slate-500">{sm.name || slot}</p>
                            {g ? (
                              <>
                                <p className="text-xs font-bold truncate" style={{ color }}>{g.set_name} +{g.plus}</p>
                                <p className="text-[10px] text-slate-400">Score {g.score}</p>
                              </>
                            ) : (
                              <p className="text-xs text-slate-500">Empty</p>
                            )}
                          </div>
                          {!g && <Plus className="w-4 h-4 text-slate-600" />}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Active set bonuses */}
                {Object.keys(setCounts).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3" data-testid="hero-set-bonuses">
                    {Object.entries(setCounts).map(([sid, cnt]) => {
                      const s = sets[sid];
                      if (!s) return null;
                      const active2 = cnt >= 2, active4 = cnt >= 4;
                      return (
                        <span key={sid} className="text-[10px] px-2 py-1 rounded-md border" style={{
                          color: active2 ? s.color : "#64748B",
                          borderColor: active2 ? `${s.color}66` : "rgba(255,255,255,0.1)",
                          background: active2 ? `${s.color}14` : "transparent",
                        }}>
                          {s.name} {cnt}pc {active4 ? "(2+4 active)" : active2 ? "(2pc active)" : ""}
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* Slot inventory */}
                {gearSlot && (
                  <div className="rounded-xl bg-black/30 border border-white/10 p-2 max-h-56 overflow-y-auto space-y-1.5" data-testid="hero-gear-inventory">
                    {equippedBySlot[gearSlot] && (
                      <button
                        onClick={() => unequipGear(equippedBySlot[gearSlot].gear_id)}
                        disabled={busy}
                        data-testid="hero-gear-unequip-button"
                        className="w-full text-left px-3 py-2 rounded-lg bg-fox/10 border border-fox/30 text-fox text-xs font-semibold hover:bg-fox/20 transition-colors"
                      >
                        Unequip current {slotMeta[gearSlot]?.name}
                      </button>
                    )}
                    {allGear
                      .filter((g) => g.slot === gearSlot && g.equipped_by !== instance.instance_id)
                      .sort((a, b) => b.score - a.score)
                      .map((g) => {
                        const color = rarityMeta[g.rarity]?.color || "#9E9E9E";
                        return (
                          <div key={g.gear_id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/10">
                            <ItemIcon icon={slotMeta[g.slot]?.icon} className="w-4 h-4 shrink-0" style={{ color }} />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold truncate" style={{ color }}>{g.set_name} +{g.plus} <span className="text-slate-500 font-normal">· {g.main_stat.toUpperCase()} {g.main_value}</span></p>
                              <p className="text-[10px] text-slate-500">Score {g.score}{g.equipped_by ? " · equipped on another hero" : ""}</p>
                            </div>
                            <button
                              onClick={() => equipGear(g.gear_id)}
                              disabled={busy}
                              data-testid={`hero-gear-equip-${g.gear_id}`}
                              className="shrink-0 px-3 py-1.5 rounded-md text-[11px] font-bold bg-chakra/15 text-chakra border border-chakra/40 hover:bg-chakra/25 transition-colors disabled:opacity-40"
                            >
                              EQUIP
                            </button>
                          </div>
                        );
                      })}
                    {allGear.filter((g) => g.slot === gearSlot && g.equipped_by !== instance.instance_id).length === 0 && !equippedBySlot[gearSlot] && (
                      <p className="text-xs text-slate-500 text-center py-4">No {slotMeta[gearSlot]?.name} pieces yet — farm the Gear Foundry or pull from the Armory.</p>
                    )}
                  </div>
                )}
              </TabsContent>
            </Tabs>
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

const CostRow = ({ icon, label, have, need, testid }) => {
  const ok = have >= need;
  return (
    <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/10" data-testid={testid}>
      {icon}
      <span className="text-xs text-slate-300 flex-1 min-w-0 truncate">{label}</span>
      <span className={`text-xs font-bold tabular-nums ${ok ? "text-emerald-400" : "text-fox"}`}>{have} / {need}</span>
    </div>
  );
};
