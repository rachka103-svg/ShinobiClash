import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Heart, Sword, Shield, Wind, Star, ChevronsUp, Gem, Coins, Sparkles, Check,
  Scroll, Zap, Loader2, ArrowRight, Anvil, Plus, Maximize2, Minimize2, RotateCcw, X,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { RARITY, ELEMENT } from "@/lib/styles";
import { rarityFrame, GOLD } from "@/lib/theme";
import { DecoCorners } from "@/components/RarityFx";
import { RarityBadge } from "@/components/RarityBadge";
import { ItemIcon } from "@/components/ItemIcon";
import CrystalPickerModal from "@/components/CrystalPickerModal";
import { useAuth } from "@/context/AuthContext";
import { useGame } from "@/context/GameContext";
import api, { formatApiErrorDetail } from "@/lib/api";

const CRYSTAL_STAT_LABEL = { hp: "HP", atk: "ATK", def: "DEF", spd: "SPD" };

const Stat = ({ icon: Icon, label, value, color }) => (
  <div className="flex flex-col items-center gap-1 min-w-0 py-1">
    <Icon className="w-4 h-4 sm:w-5 sm:h-5" style={{ color }} />
    <span className="font-display text-xl sm:text-2xl text-ink leading-none">{value}</span>
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
  open, onClose, template, instance = null, owned = false, obtain = null, progression = null, squad = null,
}) {
  const { user, setUser } = useAuth();
  const { gearConfig, items, expTomeGoldCost, reforgeModifiers, reforgeMaxPerJutsu } = useGame();
  const [tab, setTab] = useState("train");
  const [qty, setQty] = useState(1);
  const [gearSlot, setGearSlot] = useState(null);
  const [pickerGear, setPickerGear] = useState(null);
  const [busyLocal, setBusyLocal] = useState(false);
  const [immersive, setImmersive] = useState(false);
  const [showRevertConfirm, setShowRevertConfirm] = useState(false);

  if (!template) return null;
  const rarity = RARITY[template.rarity] || RARITY.R;
  const frame = rarityFrame(template.rarity);
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

  // ---------- Transformation (Rarity Ascension) derived state ----------
  const ascTarget = instance?.ascension_target || instance?.transcendence_target || null;
  const ascCost = instance?.ascension_cost || instance?.transcendence_cost || null;
  const canTransform = instance?.can_ascend_rarity || false;
  const ascAffordable = ascCost && canTransform &&
    shardsOwned >= ascCost.shards &&
    (user?.ryo || 0) >= ascCost.ryo &&
    Object.entries(ascCost.items || {}).every(([iid, q]) => (inv[iid] || 0) >= q);

  const doTranscend = async () => {
    setBusyLocal(true);
    try {
      const { data } = await api.post("/game/hero/transcend", { instance_id: instance.instance_id });
      setUser(data.profile);
      toast.success(`Transformed to ${data.new_rarity}! New star capacity unlocked.`);
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally { setBusyLocal(false); }
  };

  // ---------- Skills / Jutsu derived state ----------
  const skill = instance?.skill || null;
  const skillCost = skill?.next_cost || null;
  const skillAffordable = skillCost && shardsOwned >= skillCost.shards && (user?.ryo || 0) >= skillCost.ryo;

  const doSkillUp = async () => {
    setBusyLocal(true);
    try {
      const { data } = await api.post("/game/hero/skill-up", { instance_id: instance.instance_id });
      setUser(data.profile);
      toast.success(data.unlocked_passive ? "Passive Unlocked!" : `Skills raised to Rank ${data.skill_rank}!`);
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally { setBusyLocal(false); }
  };

  // ---------- Reforge derived state ----------
  const reforgeMods = reforgeModifiers || {};
  const maxPerJutsu = reforgeMaxPerJutsu || 2;
  const instReforge = instance?.reforge || {};
  const reforgeNextCost = instance?.reforge_next_cost || null;
  const reforgeAffordable = reforgeNextCost && shardsOwned >= reforgeNextCost.shards && (user?.ryo || 0) >= reforgeNextCost.ryo;
  const activeJutsus = (template.jutsus || []).filter((j) => ["attack", "aoe", "heal"].includes(j.type));

  const doReforge = async (jutsuId, modId) => {
    setBusyLocal(true);
    try {
      const { data } = await api.post("/game/hero/reforge", { instance_id: instance.instance_id, jutsu_id: jutsuId, modifier_id: modId });
      setUser(data.profile);
      toast.success(`${reforgeMods[modId]?.name || "Reforge"} applied!`);
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally { setBusyLocal(false); }
  };

  // ---------- Revert to base ----------
  const isAtBase = instance?.level === 1 && (instance?.exp || 0) === 0 && (instance?.ascension || 0) === 0 && (instance?.stars || 1) === 1 && (instance?.skill_rank || 1) === 1 && !Object.keys(instance?.reforge || {}).length;

  const doRevert = async () => {
    setBusyLocal(true);
    try {
      const { data } = await api.post("/game/hero/revert", { instance_id: instance.instance_id });
      setUser(data.profile);
      toast.success("Hero reverted to Lv.1 — all materials refunded!");
      setShowRevertConfirm(false);
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

  // ---------- Crystal socket state (one crystal per equipped gear piece) ----------
  const crystals = user?.crystals || [];
  const crystalsByGear = Object.fromEntries(crystals.filter((c) => c.socketed_in).map((c) => [c.socketed_in, c]));
  const equippedGearList = Object.values(equippedBySlot);
  const removeCrystal = async (crystalId) => {
    setBusyLocal(true);
    try {
      const { data } = await api.post("/game/crystal/unequip", { crystal_id: crystalId });
      setUser(data.profile);
      toast.success("Crystal removed");
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally { setBusyLocal(false); }
  };

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

  const closeAll = () => { setImmersive(false); onClose(); };

  return (
    <>
    <Dialog open={open} onOpenChange={(o) => !o && closeAll()}>
      <DialogContent
        data-testid="hero-detail-modal"
        className="max-w-xl sm:max-w-2xl w-[calc(100%-1.5rem)] sm:w-full p-0 gap-0 overflow-hidden max-h-[92vh] overflow-y-auto bg-[#FFFFFF] border-0 rounded-2xl"
        style={{ border: `${frame.strokeWidth}px solid ${frame.useGold ? GOLD.stroke : rarity.color + "66"}`, boxShadow: `0 0 60px ${(frame.useGold ? GOLD.base : rarity.color)}40` }}
      >
        <DialogTitle className="sr-only">{template.name}</DialogTitle>
        <DialogDescription className="sr-only">Details for {template.name}</DialogDescription>

        {immersive ? (
          /* ---------- Immersive: art-only, info hidden ---------- */
          <div className="relative bg-black flex items-center justify-center min-h-[70vh]" data-testid="hero-immersive-view">
            <img
              src={template.portrait}
              alt={template.name}
              className="w-full max-h-[92vh] object-contain select-none"
              draggable={false}
            />
            {/* element wash + bottom scrim for legibility */}
            <div className="absolute inset-x-0 top-0 h-32 pointer-events-none" style={{ background: `linear-gradient(to bottom, ${element.color}55, transparent)` }} />
            <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />

            {/* exit immersive */}
            <button
              onClick={() => setImmersive(false)}
              data-testid="hero-immersive-exit"
              className="absolute top-4 left-4 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/55 backdrop-blur border border-black/12 text-slate-700 text-xs font-semibold hover:bg-black/75 transition-colors"
            >
              <Minimize2 className="w-3.5 h-3.5" /> Show Info
            </button>

            {/* minimal caption */}
            <div className="absolute inset-x-0 bottom-0 z-10 p-5 sm:p-7">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-white/15 text-white">{template.role}</span>
              </div>
              <h2 className="font-display text-4xl sm:text-6xl tracking-wide text-white leading-none">{template.name}</h2>
              {template.title && <p className="text-sm sm:text-base text-chakra italic mt-1.5">{template.title}</p>}
              {instance && (
                <div className="mt-3">
                  <EvoStars count={instance.stars || 1} max={instance.stars_max || 6} size="w-5 h-5" />
                </div>
              )}
            </div>
          </div>
        ) : (
        <>
        {/* ---------- Portrait ---------- */}
        <div className="relative h-[300px] sm:h-[400px] shrink-0">
          <img src={template.portrait} alt={template.name} className="w-full h-full object-cover object-top" />
          <div className="absolute inset-x-0 top-0 h-28 pointer-events-none" style={{ background: `linear-gradient(to bottom, ${element.color}40, transparent)` }} />
          <div className="absolute inset-0 bg-gradient-to-t from-[#FFFFFF] via-transparent to-transparent pointer-events-none" />
          {frame.useGold && <div className="gold-pinstripe absolute top-0 inset-x-0 z-10" />}
          {frame.cornerLevel >= 2 && <DecoCorners rarity={template.rarity} size={22} />}
          {owned && (
            <span className="absolute top-4 left-4 z-10 flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-500/90 text-ink text-xs font-bold" data-testid="detail-owned-badge">
              <Check className="w-3.5 h-3.5" /> OWNED
            </span>
          )}
          {instance && (
            <div className="absolute bottom-3 left-4 z-10">
              <EvoStars count={instance.stars || 1} max={instance.stars_max || 6} size="w-5 h-5" testid="hero-evolution-stars" />
            </div>
          )}
          {/* View full art — hides info panels */}
          <button
            onClick={() => setImmersive(true)}
            data-testid="hero-fullscreen-toggle"
            className="absolute bottom-3 right-3 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/50 backdrop-blur border border-black/12 text-slate-700 text-xs font-semibold hover:bg-black/70 transition-colors"
          >
            <Maximize2 className="w-3.5 h-3.5" /> View Art
          </button>
        </div>

        {/* ---------- Profile content ---------- */}
        <div className="p-4 sm:p-7 overflow-x-hidden min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-black/[0.06] text-slate-700">{template.role}</span>
            {instance && (
              <span className="ml-auto font-display text-lg text-amber-300 flex items-center gap-1" data-testid="hero-power-label"><Zap className="w-4 h-4" />{instance.power} PWR</span>
            )}
          </div>
          <h2 className="font-display text-4xl sm:text-6xl tracking-wide text-ink leading-none">{template.name}</h2>
          {template.title && <p className="text-sm sm:text-base text-chakra italic mt-1.5">{template.title}</p>}
          {template.lore && <p className="text-sm text-slate-500 italic mt-3">&ldquo;{template.lore}&rdquo;</p>}

          {/* Add to / remove from squad (unified Heroes & Squad hub) */}
          {squad && instance && (
            <button
              onClick={squad.onToggle}
              disabled={!squad.inSquad && !squad.canAdd}
              data-testid="modal-squad-toggle"
              className="w-full mt-4 flex items-center justify-center gap-2 py-3 rounded-xl font-display text-lg tracking-wide transition-colors disabled:opacity-40"
              style={squad.inSquad
                ? { background: "rgba(0,229,255,0.14)", border: "1px solid rgba(0,229,255,0.5)", color: "#00E5FF" }
                : { background: "#00E5FF", color: "#05050A" }}
            >
              {squad.inSquad ? <><Check className="w-5 h-5" /> IN SQUAD · TAP TO REMOVE</> : <><Plus className="w-5 h-5" /> {squad.canAdd ? "ADD TO SQUAD" : "SQUAD FULL"}</>}
            </button>
          )}

          {/* Stats */}
          <div className="glass-panel mt-5 p-3 sm:p-4">
            <div className="grid grid-cols-4 divide-x divide-white/10">
              <Stat icon={Heart} label="HP" value={stats.hp} color="#FF1744" />
              <Stat icon={Sword} label="ATK" value={stats.atk} color="#FF5722" />
              <Stat icon={Shield} label="DEF" value={stats.def} color="#29B6F6" />
              <Stat icon={Wind} label="SPD" value={stats.spd} color="#00E676" />
            </div>
          </div>

          {progression && instance ? (
            <Tabs value={tab} onValueChange={setTab} className="mt-6 min-w-0" data-testid="hero-detail-tabs">
              <TabsList className="grid grid-cols-4 w-full bg-black/[0.04] border border-black/10 rounded-xl h-11">
                <TabsTrigger value="train" data-testid="hero-train-tab" className="font-display tracking-wider text-xs sm:text-sm data-[state=active]:bg-chakra/15 data-[state=active]:text-chakra rounded-lg">TRAIN</TabsTrigger>
                <TabsTrigger value="evolve" data-testid="hero-evolve-tab" className="font-display tracking-wider text-xs sm:text-sm data-[state=active]:bg-amber-400/15 data-[state=active]:text-amber-300 rounded-lg">EVOLVE</TabsTrigger>
                <TabsTrigger value="skills" data-testid="hero-skills-tab" className="font-display tracking-wider text-xs sm:text-sm data-[state=active]:bg-jutsu/15 data-[state=active]:text-jutsu rounded-lg">SKILLS</TabsTrigger>
                <TabsTrigger value="gear" data-testid="hero-gear-tab" className="font-display tracking-wider text-xs sm:text-sm data-[state=active]:bg-fox/15 data-[state=active]:text-fox rounded-lg">GEAR</TabsTrigger>
              </TabsList>

              {/* ================= TRAIN ================= */}
              <TabsContent value="train" className="mt-4 w-full min-w-0" data-testid="hero-progression-section">
                <div className="rounded-xl bg-black/[0.04] border border-black/10 p-3 mb-4 overflow-hidden">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-display text-xl text-ink">Lv.{instance.level}<span className="text-slate-500 text-sm">/{instance.level_cap}</span></span>
                  <div className="flex gap-0.5" data-testid="ascension-stars">
                    {Array.from({ length: instance.ascension_max }).map((_, i) => (
                      <ChevronsUp key={i} className="w-4 h-4" style={{ color: i < instance.ascension ? "#00E5FF" : "#334155" }} />
                    ))}
                  </div>
                </div>
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                  <span>EXP</span>
                  <span data-testid="hero-exp-label">{progression.atCap ? "MAX — ascend to continue" : `${instance.exp} / ${instance.exp_to_next}`}</span>
                </div>
                <div className="h-2 rounded bg-black/50 overflow-hidden">
                  <div className="h-full rounded" style={{ width: `${expPct}%`, background: "linear-gradient(90deg,#00E5FF,#76FF03)" }} />
                </div>
                </div>

                <div className="rounded-xl bg-black/[0.04] border border-black/10 p-3 overflow-hidden">
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <p className="text-xs uppercase tracking-widest text-slate-500">Train with EXP Tomes</p>
                  <div className="flex gap-1" data-testid="train-qty-selector">
                    {[1, 5, 25].map((q) => (
                      <button
                        key={q}
                        onClick={() => setQty(q)}
                        data-testid={`train-qty-${q}`}
                        className={`px-2 sm:px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors ${qty === q ? "bg-chakra/20 text-chakra border border-chakra/40" : "text-slate-500 border border-black/10"}`}
                      >
                        x{q}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-2 w-full min-w-0 overflow-hidden">
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
                        className="flex flex-col items-center gap-0.5 py-2.5 rounded-xl bg-black/[0.04] border border-black/10 hover:border-white/25 transition-colors disabled:opacity-40"
                      >
                        <Sparkles className="w-4 h-4" style={{ color: meta?.color }} />
                        <span className="text-[10px] text-slate-600">+{(meta?.value ?? 0) * Math.max(1, useQty)} xp</span>
                        <span className="text-[10px] text-ink font-semibold">×{count}</span>
                        <span className="text-[9px] text-amber-300 flex items-center gap-0.5"><Coins className="w-2.5 h-2.5" />{goldCost}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-slate-500">Training consumes tomes + Ryo. Farm both in the Resource Dungeons.</p>
                </div>

                {!progression.fullyAscended ? (
                  <button
                    onClick={progression.onAscend}
                    disabled={busy || !progression.canAscend}
                    data-testid="ascend-button"
                    className="w-full py-3 mt-4 mb-2 rounded-xl font-display text-base sm:text-lg tracking-wide bg-amber-400 text-[#05050A] hover:bg-amber-300 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 flex-wrap"
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
                  <div className="w-full py-3 mt-4 mb-2 rounded-xl text-center font-display text-base tracking-wide text-amber-300 bg-amber-400/10 flex items-center justify-center gap-2" data-testid="fully-ascended-label">
                    <Sparkles className="w-4 h-4" /> FULLY ASCENDED
                  </div>
                )}

                {/* Revert to base — refunds all invested materials */}
                {!isAtBase && !showRevertConfirm && (
                  <button
                    onClick={() => setShowRevertConfirm(true)}
                    disabled={busy}
                    data-testid="revert-button"
                    className="w-full py-2.5 mt-2 rounded-xl font-display text-sm tracking-wide text-fox border border-fox/30 bg-fox/5 hover:bg-fox/10 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" /> REVERT TO BASE
                  </button>
                )}
                {showRevertConfirm && (
                  <div className="mt-2 rounded-xl border border-fox/30 bg-fox/5 p-3" data-testid="revert-confirm">
                    <p className="text-xs text-slate-600 mb-3 text-center">Reset to Lv.1 and refund all EXP tomes, Ryo, shards, ascension crystals &amp; materials?</p>
                    <div className="flex gap-2">
                      <button
                        onClick={doRevert}
                        disabled={busy}
                        data-testid="revert-confirm-yes"
                        className="flex-1 py-2.5 rounded-xl font-display text-sm tracking-wide bg-fox text-white hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center justify-center gap-2"
                      >
                        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />} CONFIRM REVERT
                      </button>
                      <button
                        onClick={() => setShowRevertConfirm(false)}
                        disabled={busy}
                        className="flex-1 py-2.5 rounded-xl font-display text-sm tracking-wide text-slate-600 border border-black/10 hover:bg-black/5 transition-colors disabled:opacity-40"
                      >
                        CANCEL
                      </button>
                    </div>
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
                <p className="text-center text-xs text-slate-500 mb-4">
                  Each star grants a permanent <span className="text-amber-300 font-bold">+18% HP / ATK / DEF</span> plus a stat multiplier surge. Stars can ONLY be gained through Evolution.
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
                ) : ascTarget ? (
                  <>
                    {/* MAX EVOLUTION REACHED — show Transform option */}
                    <div className="w-full py-3 mb-4 rounded-xl text-center bg-amber-400/10 border border-amber-400/30" data-testid="max-evolution-reached">
                      <p className="font-display text-lg tracking-wide text-amber-300 flex items-center justify-center gap-2">
                        <Star className="w-5 h-5" /> MAX EVOLUTION REACHED
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        This hero has reached the pinnacle of {instance.rarity || template.rarity} rarity.
                      </p>
                    </div>

                    {/* Transform preview */}
                    <div className="rounded-xl bg-black/[0.04] border border-black/10 p-3 mb-4" data-testid="transform-preview">
                      <div className="flex items-center justify-center gap-2 mb-3">
                        <span className="text-sm font-bold" style={{ color: RARITY[instance.rarity]?.color || "#FFCA28" }}>{instance.rarity || template.rarity}</span>
                        <ArrowRight className="w-4 h-4 text-slate-500" />
                        <span className="text-sm font-bold" style={{ color: RARITY[ascTarget]?.color || "#00E5FF" }}>{ascTarget}</span>
                        <span className="text-xs text-slate-500">· {instance.stars_max + 1}★ max</span>
                      </div>
                      <p className="text-xs text-slate-500 text-center mb-3">
                        Transforming {template.name} to {ascTarget} unlocks a new star and significantly increases base potential.
                      </p>

                      {/* Transformation costs */}
                      <div className="space-y-2 mb-4" data-testid="transform-cost-list">
                        <CostRow
                          icon={<Star className="w-4 h-4 text-amber-300" />}
                          label={`${template.name} Shards`}
                          have={shardsOwned} need={ascCost.shards}
                          testid="transform-cost-shards"
                        />
                        <CostRow
                          icon={<Coins className="w-4 h-4 text-amber-400" />}
                          label="Ryo"
                          have={user?.ryo || 0} need={ascCost.ryo}
                          testid="transform-cost-ryo"
                        />
                        {Object.entries(ascCost.items || {}).map(([iid, q]) => (
                          <CostRow
                            key={iid}
                            icon={<ItemIcon icon={items[iid]?.icon} className="w-4 h-4" style={{ color: items[iid]?.color }} />}
                            label={items[iid]?.name || iid}
                            have={inv[iid] || 0} need={q}
                            testid={`transform-cost-${iid}`}
                          />
                        ))}
                      </div>

                      {/* Benefits preview */}
                      {instance.ascension_benefits?.length > 0 && (
                        <div className="mb-4 rounded-lg bg-emerald-500/5 border border-emerald-500/20 p-2.5" data-testid="transform-benefits">
                          <p className="text-[10px] uppercase tracking-widest text-emerald-400 mb-1.5">Transformation Benefits</p>
                          <ul className="space-y-0.5">
                            {instance.ascension_benefits.map((b, i) => (
                              <li key={i} className="text-[11px] text-slate-600 flex items-center gap-1.5">
                                <Check className="w-3 h-3 text-emerald-400 shrink-0" /> {b}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <button
                        onClick={doTranscend}
                        disabled={busy || !ascAffordable}
                        data-testid="hero-transform-button"
                        className="w-full py-3 rounded-xl font-display text-lg tracking-wide bg-gradient-to-r from-jutsu to-chakra text-[#05050A] hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center justify-center gap-2"
                      >
                        {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                        ⭐ TRANSFORM TO {ascTarget}
                      </button>
                      {!ascAffordable && (
                        <p className="text-[10px] text-slate-500 mt-2 text-center">
                          Reach {instance.stars_max}★ max evolution and gather the required materials to transform.
                        </p>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="w-full py-3 rounded-xl text-center font-display text-base tracking-wide text-amber-300 bg-amber-400/10 flex items-center justify-center gap-2" data-testid="fully-evolved-label">
                    <Star className="w-4 h-4" /> FULLY EVOLVED — {instance.stars_max || 6}★
                  </div>
                )}
              </TabsContent>

              {/* ================= SKILLS / JUTSU ================= */}
              <TabsContent value="skills" className="mt-4" data-testid="hero-skills-panel">
                {skill ? (
                  <>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-slate-500">Skill Rank</p>
                        <p className="font-display text-3xl leading-none text-jutsu" data-testid="hero-skill-rank">{skill.rank}<span className="text-slate-500 text-lg"> / {skill.rank_max}</span></p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] uppercase tracking-widest text-slate-500">Jutsu Power</p>
                        <p className="font-display text-2xl leading-none text-emerald-400" data-testid="hero-skill-mult">+{Math.round((skill.power_mult - 1) * 100)}%</p>
                      </div>
                    </div>
                    <div className="h-2 rounded-full bg-black/50 overflow-hidden mb-3">
                      <div className="h-full rounded-full" style={{ width: `${(skill.rank / skill.rank_max) * 100}%`, background: "linear-gradient(90deg,#7C4DFF,#00E5FF)" }} />
                    </div>

                    {/* Passive unlock status */}
                    <div className="rounded-xl border p-3 mb-4" style={{ borderColor: skill.passive_unlocked ? "rgba(0,230,118,0.4)" : "rgba(255,255,255,0.12)", background: skill.passive_unlocked ? "rgba(0,230,118,0.06)" : "rgba(255,255,255,0.03)" }} data-testid="hero-passive-status">
                      <div className="flex items-center gap-2 mb-1">
                        <Sparkles className="w-4 h-4" style={{ color: skill.passive_unlocked ? "#00E676" : "#64748b" }} />
                        <p className="font-display text-lg tracking-wide" style={{ color: skill.passive_unlocked ? "#00E676" : "#94a3b8" }}>
                          {instance.passive_full?.name || "Signature Passive"}
                        </p>
                        {skill.passive_unlocked
                          ? <span className="ml-auto text-[10px] font-bold text-emerald-400 flex items-center gap-1"><Check className="w-3 h-3" /> ACTIVE</span>
                          : <span className="ml-auto text-[10px] font-bold text-slate-500">LOCKED · RANK {skill.passive_unlock_rank}</span>}
                      </div>
                      <p className="text-xs text-slate-500 leading-snug">{instance.passive_full?.description || "This hero's signature passive."}</p>
                    </div>

                    {skillCost ? (
                      <>
                        <div className="space-y-2 mb-4" data-testid="skill-cost-list">
                          <CostRow icon={<Star className="w-4 h-4 text-jutsu" />} label={`${template.name} Shards`} have={shardsOwned} need={skillCost.shards} testid="skill-cost-shards" />
                          <CostRow icon={<Coins className="w-4 h-4 text-amber-400" />} label="Ryo" have={user?.ryo || 0} need={skillCost.ryo} testid="skill-cost-ryo" />
                        </div>
                        <button onClick={doSkillUp} disabled={busy || !skillAffordable} data-testid="hero-skill-up-button"
                          className="w-full py-3 rounded-xl font-display text-lg tracking-wide bg-gradient-to-r from-jutsu to-chakra text-[#05050A] hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center justify-center gap-2">
                          {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <ChevronsUp className="w-5 h-5" />}
                          {(skill.rank + 1) === skill.passive_unlock_rank ? "UNLOCK PASSIVE" : `RANK UP → ${skill.rank + 1}`}
                        </button>
                        <p className="text-[10px] text-slate-500 mt-2 text-center">Shards are shared with Evolution — spend them wisely on stars or stronger skills.</p>
                      </>
                    ) : (
                      <div className="w-full py-3 rounded-xl text-center font-display text-base tracking-wide text-jutsu bg-jutsu/10 flex items-center justify-center gap-2" data-testid="skills-maxed-label">
                        <Sparkles className="w-4 h-4" /> SKILLS MASTERED — RANK {skill.rank_max}
                      </div>
                    )}

                    {/* ---------- REFORGE ---------- */}
                    <div className="rounded-xl border p-3 mt-4" style={{ borderColor: "rgba(255,202,40,0.3)", background: "rgba(255,202,40,0.04)" }} data-testid="hero-reforge-panel">
                      <div className="flex items-center gap-2 mb-1">
                        <Anvil className="w-4 h-4 text-amber-300" />
                        <p className="font-display text-lg tracking-wide text-ink">REFORGE</p>
                        <span className="ml-auto text-[10px] text-slate-500">Refine jutsus with hero shards</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mb-3 leading-snug">Spend {template.name} shards to permanently add combat modifiers — burn, stun, extra damage and more — to a jutsu.</p>

                      <div className="space-y-2.5">
                        {activeJutsus.map((j) => {
                          const applied = instReforge[j.id] || [];
                          const atCap = applied.length >= maxPerJutsu;
                          return (
                            <div key={j.id} className="rounded-lg bg-black/[0.04] border border-black/10 p-2.5">
                              <div className="flex items-center gap-2 mb-1.5">
                                <span className="text-xs font-bold text-ink truncate flex-1">{j.name}</span>
                                {applied.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {applied.map((mid) => (
                                      <span key={mid} className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30">
                                        {reforgeMods[mid]?.name || mid}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                              {!atCap && reforgeNextCost && (
                                <div className="flex flex-wrap gap-1">
                                  {Object.values(reforgeMods).map((m) => {
                                    const has = applied.includes(m.id);
                                    return (
                                      <button
                                        key={m.id}
                                        onClick={() => doReforge(j.id, m.id)}
                                        disabled={busy || has || !reforgeAffordable}
                                        title={m.desc}
                                        data-testid={`reforge-${j.id}-${m.id}`}
                                        className="text-[10px] px-2 py-1 rounded-md border transition-colors disabled:opacity-40"
                                        style={{
                                          color: has ? "#64748b" : "#FFCA28",
                                          borderColor: has ? "rgba(255,255,255,0.1)" : "rgba(255,202,40,0.35)",
                                          background: has ? "transparent" : "rgba(255,202,40,0.08)",
                                        }}
                                      >
                                        {has ? "✓ " : "+ "}{m.name.replace(" Reforge", "")}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                              {atCap && <p className="text-[10px] text-slate-500">Reforge slots full.</p>}
                            </div>
                          );
                        })}
                      </div>

                      {reforgeNextCost && (
                        <div className="flex items-center gap-3 mt-3 pt-2 border-t border-black/10">
                          <span className="text-[10px] uppercase tracking-widest text-slate-500">Next Reforge</span>
                          <span className="flex items-center gap-1 text-[11px] font-bold" style={{ color: shardsOwned >= reforgeNextCost.shards ? "#FFCA28" : "#FF5722" }}>
                            <Star className="w-3 h-3" />{shardsOwned}/{reforgeNextCost.shards}
                          </span>
                          <span className="flex items-center gap-1 text-[11px] font-bold" style={{ color: (user?.ryo || 0) >= reforgeNextCost.ryo ? "#FFCA28" : "#FF5722" }}>
                            <Coins className="w-3 h-3" />{(user?.ryo || 0)}/{reforgeNextCost.ryo}
                          </span>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-center text-slate-500 py-8 text-sm">Skills unlock once you own this hero.</p>
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
                        className={`relative p-3 rounded-xl text-left transition-colors ${active ? "bg-black/[0.06]" : "bg-black/[0.04] hover:bg-black/[0.05]"}`}
                        style={{ border: `1.5px solid ${active ? "#00E5FF" : color}` }}
                      >
                        <div className="flex items-center gap-2">
                          <ItemIcon icon={sm.icon} className="w-5 h-5" style={{ color: g ? color : "#64748B" }} />
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] uppercase tracking-widest text-slate-500">{sm.name || slot}</p>
                            {g ? (
                              <>
                                <p className="text-xs font-bold truncate" style={{ color }}>{g.set_name} +{g.plus}</p>
                                <p className="text-[10px] text-slate-500">Score {g.score}</p>
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

                {/* Crystal sockets — one per equipped gear piece */}
                {equippedGearList.length > 0 && (
                  <div className="mb-3" data-testid="hero-crystal-sockets">
                    <p className="text-xs uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-1"><Gem className="w-3 h-3 text-jutsu" /> Crystal Sockets</p>
                    <div className="space-y-1.5">
                      {equippedGearList.map((g) => {
                        const crystal = crystalsByGear[g.gear_id];
                        return (
                          <div key={g.gear_id} className="flex items-center gap-2 p-2 rounded-lg bg-black/[0.04] border border-black/10">
                            <ItemIcon icon={slotMeta[g.slot]?.icon} className="w-4 h-4 shrink-0 text-slate-500" />
                            <span className="text-[10px] uppercase tracking-widest text-slate-500 w-16 shrink-0">{slotMeta[g.slot]?.name || g.slot}</span>
                            {crystal ? (
                              <>
                                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: crystal.tier_color }} />
                                <span className="text-xs font-bold flex-1 min-w-0 truncate" style={{ color: crystal.tier_color }}>{crystal.tier_name} · {CRYSTAL_STAT_LABEL[crystal.main_stat]} +{crystal.main_value}</span>
                                <button onClick={() => removeCrystal(crystal.crystal_id)} disabled={busy} data-testid={`hero-crystal-remove-${g.gear_id}`} className="shrink-0 text-fox hover:text-fox/70 disabled:opacity-40" title="Remove crystal"><X className="w-3.5 h-3.5" /></button>
                              </>
                            ) : (
                              <>
                                <span className="text-xs text-slate-500 flex-1">Empty socket</span>
                                <button onClick={() => setPickerGear(g)} disabled={busy} data-testid={`hero-crystal-socket-${g.gear_id}`} className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-jutsu/15 text-jutsu border border-jutsu/40 hover:bg-jutsu/25 transition-colors disabled:opacity-40"><Plus className="w-3 h-3" /> Crystal</button>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Slot inventory */}
                {gearSlot && (
                  <div className="rounded-xl bg-black/30 border border-black/10 p-2 max-h-56 overflow-y-auto space-y-1.5" data-testid="hero-gear-inventory">
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
                          <div key={g.gear_id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-black/[0.04] border border-black/10">
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
              <div key={j.id} className="flex items-start gap-3 p-3 rounded-xl bg-black/[0.04] border border-white/5">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-ink text-sm">{j.name}</span>
                    {j.signature && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-jutsu/15 text-jutsu border border-jutsu/30">SIGNATURE</span>}
                    {j.ascendant && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-400/15 text-amber-300 border border-amber-400/30">ASCENDANT</span>}
                    {j.type === "passive" ? <span className="text-[10px] text-slate-500">Passive</span>
                      : j.chakra_cost > 0 ? <span className="text-[10px] font-bold text-chakra">{j.chakra_cost} CK</span>
                      : <span className="text-[10px] text-slate-500">Basic</span>}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{j.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        </>
        )}
      </DialogContent>
    </Dialog>
    <CrystalPickerModal open={!!pickerGear} onClose={() => setPickerGear(null)} gearId={pickerGear?.gear_id} gearName={pickerGear ? `${slotMeta[pickerGear.slot]?.name || pickerGear.slot}` : null} />
    </>
  );
}

const CostRow = ({ icon, label, have, need, testid }) => {
  const ok = have >= need;
  return (
    <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-black/[0.04] border border-black/10" data-testid={testid}>
      {icon}
      <span className="text-xs text-slate-600 flex-1 min-w-0 truncate">{label}</span>
      <span className={`text-xs font-bold tabular-nums ${ok ? "text-emerald-400" : "text-fox"}`}>{have} / {need}</span>
    </div>
  );
};
