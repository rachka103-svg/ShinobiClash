import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import {
  Save, Loader2, Zap, Lock, Plus, Users, Swords, Shield, Sparkles, Info,
  ChevronDown, SlidersHorizontal, Star, Flame, Droplet, Wind as WindIcon,
  Mountain, Moon, Sun, Check, X,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useGame } from "@/context/GameContext";
import { RARITY, ELEMENT, rarityFrame, GOLD } from "@/lib/theme";
import { DecoCorners } from "@/components/RarityFx";
import HeroDetailModal from "@/components/HeroDetailModal";
import { useAudio } from "@/context/AudioContext";
import api, { formatApiErrorDetail } from "@/lib/api";

const EL_ICON = { Fire: Flame, Water: Droplet, Wind: WindIcon, Earth: Mountain, Lightning: Zap, Dark: Moon, Light: Sun };
const ELEMENTS = ["Fire", "Water", "Wind", "Earth", "Lightning", "Dark", "Light"];
const RARITY_KEYS = ["GR", "LR", "UR", "SSR", "SR", "R"];
const RARITY_RANK = { R: 0, SR: 1, SSR: 2, UR: 3, LR: 4, GR: 5 };
const ascensionCost = (rarity, asc) => ({
  ascension_crystal: 5 + asc * 5 + RARITY_RANK[rarity] * 3,
  ryo: 500 + asc * 400 + RARITY_RANK[rarity] * 300,
});

const StarRow = ({ n = 1, max = 6 }) => (
  <div className="flex gap-0.5">
    {Array.from({ length: max }).map((_, i) => (
      <Star key={i} className="w-2.5 h-2.5" style={{ color: i < n ? "#FFCA28" : "#3a3a44", fill: i < n ? "#FFCA28" : "transparent" }} />
    ))}
  </div>
);

export default function TeamBuilder() {
  const { user, setUser } = useAuth();
  const { catalogById, items } = useGame();
  const { playSfx } = useAudio();
  const [team, setTeam] = useState(user?.team || []);
  const [busy, setBusy] = useState(false);
  const [pBusy, setPBusy] = useState(false);
  const [detailId, setDetailId] = useState(null);
  const [elFilter, setElFilter] = useState("ALL");
  const [rarFilter, setRarFilter] = useState("ALL");
  const [rarOpen, setRarOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const cap = user?.team_cap || 3;
  const nextSlotLevel = user?.next_slot_level || null;

  useEffect(() => { setTeam((user?.team || []).slice(0, cap)); }, [user?.id, JSON.stringify(user?.team), cap]);

  const owned = useMemo(
    () => (user?.ninjas || []).map((inst) => ({ ...inst, ...catalogById[inst.template_id], rarity: inst.rarity || inst.evolved_rarity || catalogById[inst.template_id]?.rarity })).filter((o) => o.name),
    [user?.ninjas, catalogById]
  );
  const ownedById = useMemo(() => Object.fromEntries(owned.map((o) => [o.instance_id, o])), [owned]);

  const toggle = (uid) => {
    if (team.includes(uid)) setTeam(team.filter((t) => t !== uid));
    else if (team.length < cap) setTeam([...team, uid]);
    else toast.info(`Squad is full (max ${cap}). Remove one first.`);
  };

  const teamTmpls = team.map((uid) => ownedById[uid]).filter(Boolean);
  const teamPower = teamTmpls.reduce((s, n) => s + (n.power || 0), 0);

  // ---- Synergy (data-driven preview) ----
  const synergy = useMemo(() => {
    const count = (key) => teamTmpls.reduce((m, t) => { const k = t[key] || "?"; m[k] = (m[k] || 0) + 1; return m; }, {});
    const top = (obj) => Object.entries(obj).sort((a, b) => b[1] - a[1])[0] || ["—", 0];
    const [elName, elC] = top(count("element"));
    const [roleName, roleC] = top(count("role"));
    const [facName, facC] = top(count("faction"));
    const elPct = elC >= 2 ? elC * 5 : 0;
    const rolePct = roleC >= 2 ? roleC * 5 : 0;
    const facPct = facC >= 2 ? 8 : 0;
    return { elName, elPct, roleName, roleC, rolePct, facName, facPct, total: elPct + rolePct + facPct };
  }, [teamTmpls]);

  const filtered = useMemo(() => {
    return owned
      .filter((o) => (elFilter === "ALL" || o.element === elFilter) && (rarFilter === "ALL" || o.rarity === rarFilter))
      .sort((a, b) => (RARITY_RANK[b.rarity] - RARITY_RANK[a.rarity]) || (b.power || 0) - (a.power || 0));
  }, [owned, elFilter, rarFilter]);
  const visible = showAll ? filtered : filtered.slice(0, 12);

  const autoForm = () => {
    const best = [...owned].sort((a, b) => (b.power || 0) - (a.power || 0)).slice(0, cap).map((o) => o.instance_id);
    setTeam(best);
    toast.success("Auto-formed your strongest squad!");
  };

  const save = async () => {
    setBusy(true);
    try {
      const { data } = await api.put("/game/team", { team });
      setUser(data);
      toast.success("Squad saved!");
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally { setBusy(false); }
  };

  // ---- Hero detail + progression (merged from Roster) ----
  const inv = user?.inventory || {};
  const sel = detailId ? (user?.ninjas || []).find((n) => n.instance_id === detailId) : null;
  const selTpl = sel ? catalogById[sel.template_id] : null;
  const atCap = sel && sel.level >= sel.level_cap;
  const fullyAscended = sel && sel.ascension >= sel.ascension_max;
  const ascCost = sel ? ascensionCost(selTpl.rarity, sel.ascension) : null;
  const canAscend = sel && atCap && !fullyAscended && (inv.ascension_crystal || 0) >= ascCost.ascension_crystal && (user.ryo || 0) >= ascCost.ryo;

  const applyExpTome = async (itemId, qty = 1) => {
    setPBusy(true);
    try {
      const { data } = await api.post("/game/hero/use-exp", { instance_id: detailId, item_id: itemId, qty: Math.max(1, qty) });
      setUser(data.profile);
      playSfx(data.levels_gained > 0 ? "levelup" : "coin");
      toast.success(data.levels_gained > 0 ? `Leveled up +${data.levels_gained}!` : "EXP applied");
    } catch (err) {
      playSfx("error");
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally { setPBusy(false); }
  };
  const ascend = async () => {
    setPBusy(true);
    try {
      const { data } = await api.post("/game/hero/ascend", { instance_id: detailId });
      setUser(data);
      playSfx("levelup");
      toast.success("Ascended! Level cap raised.");
    } catch (err) {
      playSfx("error");
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally { setPBusy(false); }
  };

  const slots = Array.from({ length: cap });

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 py-5" data-testid="team-page">
      {/* ===================== Header ===================== */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
        <div>
          <h1 className="font-display text-5xl sm:text-6xl tracking-wide text-ink leading-none">HEROES</h1>
          <p className="text-slate-500 mt-1.5" data-testid="team-counter">
            Tap a hero to view details · tap <span className="text-chakra">+</span> to add to your squad. <span className="text-chakra font-semibold">({team.length}/{cap})</span>
          </p>
          {nextSlotLevel && (
            <p className="flex items-center gap-1.5 text-xs text-amber-400/90 mt-1" data-testid="next-slot-hint">
              <Lock className="w-3.5 h-3.5" /> Reach Lv.{nextSlotLevel} to unlock a {cap + 1}th squad slot
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="glass-panel px-4 py-2.5 flex items-center gap-2.5">
            <Zap className="w-5 h-5 text-fox" />
            <div className="leading-none">
              <p className="font-display text-3xl text-ink tabular-nums" data-testid="squad-power">{teamPower.toLocaleString()}</p>
              <p className="text-[10px] uppercase tracking-widest text-slate-500">Squad Power</p>
            </div>
          </div>
          <button onClick={save} disabled={busy || team.length === 0} data-testid="save-team-button"
            className="flex items-center gap-2 px-5 py-3 rounded-xl font-display text-lg tracking-wide bg-chakra text-[#05050A] hover:bg-cyan-300 transition-colors disabled:opacity-50">
            {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} SAVE SQUAD
          </button>
          <button onClick={autoForm} data-testid="auto-form-button"
            className="flex items-center gap-2 px-4 py-3 rounded-xl font-display text-base tracking-wide bg-black/[0.04] border border-black/12 text-slate-700 hover:bg-black/10 transition-colors">
            <Users className="w-4.5 h-4.5" /> AUTO FORM
          </button>
        </div>
      </div>

      {/* ===================== Squad slots ===================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4">
        {slots.map((_, i) => {
          const hero = teamTmpls[i];
          if (!hero) {
            return (
              <button key={i} onClick={() => toast.info("Pick a shinobi from your collection below.")} data-testid={`squad-slot-empty-${i}`}
                className="aspect-[3/4.2] rounded-2xl border border-dashed border-black/12 bg-black/[0.03] flex flex-col items-center justify-center gap-3 text-slate-500 hover:border-chakra/40 hover:text-chakra transition-colors">
                <div className="w-14 h-14 rounded-full border border-black/12 flex items-center justify-center"><Plus className="w-6 h-6" /></div>
                <span className="text-sm font-semibold">Add Shinobi</span>
              </button>
            );
          }
          return <SquadSlotCard key={hero.instance_id} hero={hero} index={i} onView={() => setDetailId(hero.instance_id)} onRemove={() => toggle(hero.instance_id)} />;
        })}

        {/* Locked next slot */}
        {nextSlotLevel && (
          <div className="aspect-[3/4.2] rounded-2xl border border-black/10 bg-black/[0.03] flex flex-col items-center justify-center gap-3 text-slate-500" data-testid="squad-slot-locked">
            <div className="w-16 h-16 rounded-full border border-black/10 flex items-center justify-center"><Plus className="w-7 h-7" /></div>
            <span className="text-sm font-semibold text-slate-600">Unlock {cap + 1}th Slot</span>
            <span className="flex items-center gap-1.5 text-xs text-amber-400/90"><Lock className="w-3.5 h-3.5" /> Reach Lv.{nextSlotLevel}</span>
          </div>
        )}
      </div>

      {/* ===================== Squad Synergy ===================== */}
      <div className="glass-panel p-4 sm:p-5 mb-6" data-testid="squad-synergy">
        <div className="flex items-center gap-2 mb-3">
          <h2 className="font-display text-xl tracking-wide text-ink">SQUAD SYNERGY</h2>
          <Info className="w-4 h-4 text-slate-500" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Synergy icon={ELEMENT[synergy.elName]?.icon ? (EL_ICON[synergy.elName] || Sparkles) : Sparkles} color={ELEMENT[synergy.elName]?.color || "#00E676"}
            label="Element Bonus" main={`${synergy.elName} ${synergy.elPct ? `+${synergy.elPct}% ATK` : "—"}`} />
          <Synergy icon={Swords} color="#00E5FF" label="Role Bonus" main={synergy.rolePct ? `${synergy.roleC} ${synergy.roleName}s +${synergy.rolePct}% ATK` : "—"} />
          <Synergy icon={Shield} color="#D500F9" label="Faction Bonus" main={synergy.facPct ? `${synergy.facName} +${synergy.facPct}% HP` : "—"} />
          <div className="text-center lg:text-right">
            <p className="font-display text-4xl leading-none" style={{ color: GOLD.base, textShadow: `0 0 18px ${GOLD.base}66` }}>+{synergy.total}%</p>
            <p className="text-[10px] uppercase tracking-widest text-slate-500 mt-1">Total Bonus applied to squad stats</p>
          </div>
        </div>
      </div>

      {/* ===================== Collection ===================== */}
      <div className="flex items-center gap-3 flex-wrap mb-3">
        <h2 className="font-display text-2xl tracking-wide text-ink">SHINOBI COLLECTION</h2>
        <span className="text-sm text-slate-500" data-testid="collection-count">{owned.length} / 60</span>
        <div className="flex items-center gap-1.5 ml-auto flex-wrap">
          <ElChip active={elFilter === "ALL"} onClick={() => setElFilter("ALL")} testid="el-filter-ALL"><span className="text-xs font-bold px-1">ALL</span></ElChip>
          {ELEMENTS.map((el) => {
            const Icon = EL_ICON[el];
            return (
              <ElChip key={el} active={elFilter === el} color={ELEMENT[el]?.color} onClick={() => setElFilter(el)} testid={`el-filter-${el}`}>
                <Icon className="w-4 h-4" />
              </ElChip>
            );
          })}
          <div className="relative">
            <button onClick={() => setRarOpen((v) => !v)} data-testid="rarity-filter-button"
              className="flex items-center gap-1.5 px-3 h-9 rounded-lg bg-black/[0.04] border border-black/10 text-sm text-slate-700 hover:bg-black/10 transition-colors">
              {rarFilter === "ALL" ? "Rarity" : rarFilter} <ChevronDown className="w-3.5 h-3.5" />
            </button>
            {rarOpen && (
              <div className="absolute right-0 top-11 z-30 w-32 rounded-xl bg-[#FFFFFF] border border-black/10 p-1 shadow-2xl" data-testid="rarity-menu">
                {["ALL", ...RARITY_KEYS].map((rk) => (
                  <button key={rk} onClick={() => { setRarFilter(rk); setRarOpen(false); }}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors ${rarFilter === rk ? "bg-black/[0.06] text-ink" : "text-slate-600 hover:bg-black/5"}`}
                    style={{ color: rk !== "ALL" && rarFilter !== rk ? (RARITY[rk]?.color) : undefined }}>
                    {rk === "ALL" ? "All Rarities" : `${RARITY[rk]?.name} (${rk})`}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button onClick={() => { setElFilter("ALL"); setRarFilter("ALL"); toast.info("Filters reset"); }} data-testid="reset-filters"
            className="w-9 h-9 rounded-lg bg-black/[0.04] border border-black/10 flex items-center justify-center text-slate-600 hover:bg-black/10 transition-colors">
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2.5 sm:gap-3" data-testid="shinobi-collection">
        {visible.map((n) => (
          <CollectionCard key={n.instance_id} hero={n} slot={team.indexOf(n.instance_id)} squadFull={team.length >= cap}
            onView={() => setDetailId(n.instance_id)} onToggle={() => toggle(n.instance_id)} />
        ))}
      </div>
      {visible.length === 0 && <p className="text-center text-slate-500 py-10">No shinobi match these filters.</p>}

      {filtered.length > 12 && (
        <div className="flex justify-center mt-5">
          <button onClick={() => setShowAll((v) => !v)} data-testid="view-more-shinobi"
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-black/[0.04] border border-black/10 text-sm font-semibold text-slate-700 hover:bg-black/10 transition-colors">
            {showAll ? "SHOW LESS" : "VIEW MORE SHINOBI"} <ChevronDown className={`w-4 h-4 transition-transform ${showAll ? "rotate-180" : ""}`} />
          </button>
        </div>
      )}

      <HeroDetailModal
        open={!!detailId}
        onClose={() => setDetailId(null)}
        template={selTpl}
        instance={sel}
        owned
        progression={{ busy: pBusy, inv, items, atCap, fullyAscended, ascCost, canAscend, onUseExpTome: applyExpTome, onAscend: ascend }}
        squad={sel ? {
          inSquad: team.includes(sel.instance_id),
          canAdd: team.length < cap,
          onToggle: () => toggle(sel.instance_id),
        } : null}
      />
    </div>
  );
}

// --------------------------------------------------------------------------
const SquadSlotCard = ({ hero, index, onView, onRemove }) => {
  const r = RARITY[hero.rarity] || RARITY.R;
  const fr = rarityFrame(hero.rarity);
  return (
    <div data-testid={`squad-slot-${index}`}
      className="relative aspect-[3/4.2] rounded-2xl overflow-hidden text-left group cursor-pointer"
      style={{ border: `${fr.strokeWidth}px solid ${fr.useGold ? GOLD.stroke : r.color}`, boxShadow: `0 0 34px ${(fr.useGold ? GOLD.base : r.color)}33` }}
      onClick={onView}>
      <img src={hero.portrait} alt={hero.name} className="absolute inset-0 w-full h-full object-cover object-top" />
      <div className="absolute inset-0" style={{ background: `linear-gradient(to top, #05050Af2 6%, #05050A66 42%, transparent 70%)` }} />
      {fr.cornerLevel >= 2 && <DecoCorners rarity={hero.rarity} size={18} />}

      <button onClick={(e) => { e.stopPropagation(); onRemove(); }} data-testid={`squad-remove-${index}`}
        className="absolute top-2 right-2 z-20 w-7 h-7 rounded-md bg-black/55 border border-white/15 flex items-center justify-center text-white/80 hover:bg-fox/80 hover:text-white transition-colors" title="Remove from squad">
        <X className="w-4 h-4" />
      </button>

      <div className="absolute inset-x-0 bottom-0 z-10 p-2.5 sm:p-3">
        <div className="flex items-end justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-display text-lg sm:text-xl tracking-wide text-white leading-none truncate">{hero.name}</h3>
            <p className="text-[11px] text-slate-300 mt-0.5">{hero.role}</p>
            <p className="flex items-center gap-1 text-fox font-display text-base mt-0.5"><Zap className="w-3.5 h-3.5" />{(hero.power || 0).toLocaleString()}</p>
          </div>
          <span className="font-display text-lg text-white shrink-0">Lv.{hero.level}</span>
        </div>
      </div>
    </div>
  );
};

const CollectionCard = ({ hero, slot, squadFull, onView, onToggle }) => {
  const r = RARITY[hero.rarity] || RARITY.R;
  const fr = rarityFrame(hero.rarity);
  const el = ELEMENT[hero.element] || {};
  const EIcon = EL_ICON[hero.element] || Sparkles;
  const selected = slot !== -1;
  return (
    <div data-testid={`team-card-${hero.template_id}`}
      className="relative aspect-[3/4] rounded-xl overflow-hidden text-left group transition-transform active:scale-95 cursor-pointer"
      style={{ border: `${selected ? 2 : fr.strokeWidth}px solid ${selected ? "#00E5FF" : (fr.useGold ? GOLD.stroke : r.color + "aa")}`, boxShadow: selected ? "0 0 22px #00E5FF66" : `0 0 12px ${r.color}22` }}
      onClick={onView}>
      <img src={hero.portrait} alt={hero.name} className="absolute inset-0 w-full h-full object-cover object-top" loading="lazy" />
      <div className="absolute inset-0" style={{ background: "linear-gradient(to top, #05050Af5 8%, #05050A55 45%, transparent 72%)" }} />
      {fr.cornerLevel >= 2 && <DecoCorners rarity={hero.rarity} size={12} />}

      {selected && (
        <span className="absolute top-1.5 left-1/2 -translate-x-1/2 z-20 w-6 h-6 rounded-full bg-chakra text-[#05050A] flex items-center justify-center font-display text-sm" style={{ boxShadow: "0 0 10px #00E5FF" }}>{slot + 1}</span>
      )}

      {/* quick add / remove */}
      <button onClick={(e) => { e.stopPropagation(); onToggle(); }} disabled={!selected && squadFull}
        data-testid={`team-toggle-${hero.template_id}`}
        className="absolute bottom-1.5 right-1.5 z-20 w-7 h-7 rounded-full flex items-center justify-center transition-all disabled:opacity-30"
        title={selected ? "Remove from squad" : "Add to squad"}
        style={selected ? { background: "#00E5FF", color: "#05050A" } : { background: "rgba(0,0,0,0.6)", border: "1px solid rgba(0,229,255,0.5)", color: "#00E5FF" }}>
        {selected ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
      </button>

      <div className="absolute inset-x-0 bottom-0 z-10 p-2 pr-9">
        <div className="flex items-center justify-between gap-1">
          <h4 className="font-display text-xs sm:text-sm tracking-wide text-white truncate">{hero.name}</h4>
          <span className="text-[10px] text-slate-300 shrink-0">Lv.{hero.level}</span>
        </div>
        <StarRow n={hero.stars || 1} max={hero.stars_max || 6} />
        <p className="flex items-center gap-1 text-fox font-display text-sm mt-0.5"><Zap className="w-3 h-3" />{(hero.power || 0).toLocaleString()}</p>
      </div>
    </div>
  );
};

const Synergy = ({ icon: Icon, color, label, main }) => (
  <div className="flex items-center gap-3">
    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${color}18`, border: `1px solid ${color}44` }}>
      <Icon className="w-5 h-5" style={{ color }} />
    </div>
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-widest text-slate-500">{label}</p>
      <p className="text-sm font-semibold text-ink truncate">{main}</p>
    </div>
  </div>
);

const ElChip = ({ active, color = "#00E5FF", onClick, children, testid }) => (
  <button onClick={onClick} data-testid={testid}
    className="w-9 h-9 rounded-lg flex items-center justify-center transition-all shrink-0"
    style={active ? { background: `${color}22`, color, border: `1px solid ${color}` } : { color: "rgba(148,163,184,0.85)", border: "1px solid rgba(255,255,255,0.1)" }}>
    {children}
  </button>
);
