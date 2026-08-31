import { useState, useEffect } from "react";
import { Loader2, Save, ChevronDown, ChevronRight, Swords } from "lucide-react";
import { toast } from "sonner";
import api, { formatApiErrorDetail } from "@/lib/api";

const inputCls = "w-full bg-black/40 border border-black/10 rounded-lg px-3 py-2 text-sm text-ink outline-none focus:border-chakra";

export default function StagesTab() {
  const [data, setData] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const { data } = await api.get("/admin/stages-config");
      setData(data);
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail) || e.message);
    }
  };
  useEffect(() => { load(); }, []);

  const saveStage = async (stageId, updates) => {
    setBusy(true);
    try {
      await api.put(`/admin/stage/${stageId}`, updates);
      toast.success(`Stage ${stageId} updated — live now!`);
      await load();
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail) || e.message);
    } finally {
      setBusy(false);
    }
  };

  const saveMechanic = async (mechId, updates) => {
    setBusy(true);
    try {
      await api.put(`/admin/boss-mechanic/${mechId}`, updates);
      toast.success(`Boss mechanic ${mechId} updated — live now!`);
      await load();
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail) || e.message);
    } finally {
      setBusy(false);
    }
  };

  if (!data) return <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 text-chakra animate-spin" /></div>;

  // Show first 12 hand-authored stages + first 6 procedural as a sample
  const stages = data.stages.slice(0, 18);

  return (
    <div className="space-y-5" data-testid="admin-stages">
      {/* Stage Editor */}
      <div className="glass-panel p-4">
        <h3 className="font-display text-xl text-ink mb-0.5">Campaign Stages</h3>
        <p className="text-xs text-slate-500 mb-3">Edit enemies, rewards, first-clear bonuses, and boss mechanics. Changes apply live.</p>
        <div className="space-y-1.5 max-h-[50vh] overflow-y-auto scrollbar-none">
          {stages.map((s) => (
            <StageRow key={s.id} stage={s} heroIds={data.hero_ids} bossMechanics={data.boss_mechanics}
              expanded={expanded === s.id} onToggle={() => setExpanded(expanded === s.id ? null : s.id)}
              onSave={saveStage} busy={busy} />
          ))}
        </div>
      </div>

      {/* Boss Mechanics */}
      <div className="glass-panel p-4">
        <h3 className="font-display text-xl text-ink mb-0.5 flex items-center gap-2"><Swords className="w-5 h-5 text-fox" /> Boss Mechanics</h3>
        <p className="text-xs text-slate-500 mb-3">Multi-phase boss behavior frameworks (shield, enrage, elemental shift)</p>
        <div className="space-y-3">
          {Object.entries(data.boss_mechanics).map(([mid, mech]) => (
            <BossMechEditor key={mid} mechId={mid} mech={mech} onSave={saveMechanic} busy={busy} />
          ))}
        </div>
      </div>
    </div>
  );
}

function StageRow({ stage, heroIds, bossMechanics, expanded, onToggle, onSave, busy }) {
  const [form, setForm] = useState({ ...stage });

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setEnemy = (i, k, v) => setForm((f) => {
    const enemies = [...(f.enemies || [])];
    enemies[i] = { ...enemies[i], [k]: k === "level" ? Number(v) : v };
    return { ...f, enemies };
  });
  const addEnemy = () => setForm((f) => ({ ...f, enemies: [...(f.enemies || []), { template_id: heroIds[0], level: 1 }] }));
  const removeEnemy = (i) => setForm((f) => ({ ...f, enemies: (f.enemies || []).filter((_, x) => x !== i) }));
  const setReward = (k, v) => setForm((f) => ({ ...f, rewards: { ...f.rewards, [k]: Number(v) } }));
  const setFirstClear = (k, v) => setForm((f) => ({ ...f, first_clear: { ...f.first_clear, [k]: k === "ninja" ? v : Number(v) } }));

  return (
    <div className="rounded-lg border border-black/10 overflow-hidden" data-testid={`stage-row-${stage.id}`}>
      <button onClick={onToggle} className="w-full flex items-center justify-between px-3 py-2 bg-black/[0.03] hover:bg-black/[0.06] transition-colors">
        <span className="flex items-center gap-2 text-sm">
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          <span className="font-bold text-ink">{stage.id}</span>
          <span className="text-slate-500">Ch.{stage.chapter} · {stage.name}</span>
          {stage.is_boss && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-fox/20 text-fox">BOSS</span>}
        </span>
        <span className="text-xs text-slate-500">{stage.enemies?.length || 0} enemies · {stage.recommended_power} power</span>
      </button>
      {expanded && (
        <div className="p-3 space-y-3 bg-black/[0.02]">
          {/* Name & Region */}
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="text-[10px] uppercase tracking-widest text-slate-500">Stage Name</span>
              <input className={inputCls} value={form.name || ""} onChange={(e) => set("name", e.target.value)} data-testid={`stage-${stage.id}-name`} />
            </label>
            <label className="block">
              <span className="text-[10px] uppercase tracking-widest text-slate-500">Region</span>
              <input className={inputCls} value={form.region || ""} onChange={(e) => set("region", e.target.value)} data-testid={`stage-${stage.id}-region`} />
            </label>
          </div>

          {/* Enemies */}
          <div>
            <span className="text-[10px] uppercase tracking-widest text-slate-500">Enemies</span>
            <div className="space-y-1.5 mt-1">
              {(form.enemies || []).map((e, i) => (
                <div key={i} className="flex items-center gap-2">
                  <select className={`${inputCls} flex-1`} value={e.template_id} onChange={(ev) => setEnemy(i, "template_id", ev.target.value)} data-testid={`stage-${stage.id}-enemy-${i}-hero`}>
                    {heroIds.map((hid) => <option key={hid} value={hid}>{hid}</option>)}
                  </select>
                  <input type="number" className={`${inputCls} w-20 text-center`} value={e.level} onChange={(ev) => setEnemy(i, "level", ev.target.value)} data-testid={`stage-${stage.id}-enemy-${i}-lvl`} />
                  <button onClick={() => removeEnemy(i)} className="text-fox hover:text-fox/70 text-xs px-2">✕</button>
                </div>
              ))}
              <button onClick={addEnemy} className="text-xs text-chakra hover:text-chakra/70">+ Add Enemy</button>
            </div>
          </div>

          {/* Rewards */}
          <div>
            <span className="text-[10px] uppercase tracking-widest text-slate-500">Rewards</span>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <label className="block">
                <span className="text-[10px] text-slate-500">Ryo</span>
                <input type="number" className={inputCls} value={form.rewards?.ryo ?? 0} onChange={(e) => setReward("ryo", e.target.value)} data-testid={`stage-${stage.id}-ryo`} />
              </label>
              <label className="block">
                <span className="text-[10px] text-slate-500">EXP</span>
                <input type="number" className={inputCls} value={form.rewards?.exp ?? 0} onChange={(e) => setReward("exp", e.target.value)} data-testid={`stage-${stage.id}-exp`} />
              </label>
            </div>
          </div>

          {/* First Clear */}
          <div>
            <span className="text-[10px] uppercase tracking-widest text-slate-500">First Clear Bonus</span>
            <div className="grid grid-cols-3 gap-2 mt-1">
              <label className="block">
                <span className="text-[10px] text-slate-500">Ryo</span>
                <input type="number" className={inputCls} value={form.first_clear?.ryo ?? 0} onChange={(e) => setFirstClear("ryo", e.target.value)} data-testid={`stage-${stage.id}-fc-ryo`} />
              </label>
              <label className="block">
                <span className="text-[10px] text-slate-500">Hero Drop</span>
                <select className={inputCls} value={form.first_clear?.ninja || ""} onChange={(e) => setFirstClear("ninja", e.target.value)} data-testid={`stage-${stage.id}-fc-ninja`}>
                  <option value="">None</option>
                  {heroIds.map((hid) => <option key={hid} value={hid}>{hid}</option>)}
                </select>
              </label>
            </div>
          </div>

          {/* Boss Mechanic */}
          {stage.is_boss && (
            <div>
              <span className="text-[10px] uppercase tracking-widest text-slate-500">Boss Mechanic</span>
              <select className={`${inputCls} mt-1`} value={form.boss_mechanic || ""} onChange={(e) => set("boss_mechanic", e.target.value)} data-testid={`stage-${stage.id}-mech`}>
                <option value="">None</option>
                {Object.keys(bossMechanics).map((mid) => <option key={mid} value={mid}>{bossMechanics[mid].name}</option>)}
              </select>
            </div>
          )}

          <button onClick={() => onSave(stage.id, form)} disabled={busy}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 text-[#05050A] font-bold text-sm disabled:opacity-50 hover:brightness-110" data-testid={`stage-${stage.id}-save`}>
            <Save className="w-4 h-4" /> Save Stage
          </button>
        </div>
      )}
    </div>
  );
}

function BossMechEditor({ mechId, mech, onSave, busy }) {
  const [form, setForm] = useState({ ...mech });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setPhase = (i, k, v) => setForm((f) => {
    const phases = [...(f.phases || [])];
    phases[i] = { ...phases[i], [k]: v };
    return { ...f, phases };
  });

  return (
    <div className="rounded-lg border border-black/10 p-3 bg-black/[0.02]" data-testid={`boss-mech-${mechId}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="font-display text-lg text-ink">{mech.name}</span>
        <code className="text-xs text-slate-500">{mechId}</code>
      </div>
      <label className="block mb-2">
        <span className="text-[10px] uppercase tracking-widest text-slate-500">Mechanic Name</span>
        <input className={inputCls} value={form.name || ""} onChange={(e) => set("name", e.target.value)} data-testid={`bm-${mechId}-name`} />
      </label>
      <div className="mb-2">
        <span className="text-[10px] uppercase tracking-widest text-slate-500">Phases</span>
        <div className="space-y-2 mt-1">
          {(form.phases || []).map((p, i) => (
            <div key={i} className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <label className="block">
                <span className="text-[10px] text-slate-500">HP Above</span>
                <input type="number" className={inputCls} value={p.hp_above ?? ""} onChange={(e) => setPhase(i, "hp_above", Number(e.target.value))} data-testid={`bm-${mechId}-phase-${i}-above`} />
              </label>
              <label className="block">
                <span className="text-[10px] text-slate-500">HP Between (JSON)</span>
                <input className={inputCls} value={JSON.stringify(p.hp_between ?? [])} onChange={(e) => {
                  try { setPhase(i, "hp_between", JSON.parse(e.target.value)); } catch {}
                }} data-testid={`bm-${mechId}-phase-${i}-between`} />
              </label>
              <label className="block">
                <span className="text-[10px] text-slate-500">HP Below</span>
                <input type="number" className={inputCls} value={p.hp_below ?? ""} onChange={(e) => setPhase(i, "hp_below", Number(e.target.value))} data-testid={`bm-${mechId}-phase-${i}-below`} />
              </label>
              <label className="block">
                <span className="text-[10px] text-slate-500">Behavior</span>
                <input className={inputCls} value={p.behavior || ""} onChange={(e) => setPhase(i, "behavior", e.target.value)} data-testid={`bm-${mechId}-phase-${i}-beh`} />
              </label>
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-2">
        <label className="block">
          <span className="text-[10px] uppercase tracking-widest text-slate-500">Summons Adds at HP %</span>
          <input type="number" className={inputCls} value={form.summons_adds_at_pct ?? ""} onChange={(e) => set("summons_adds_at_pct", Number(e.target.value))} data-testid={`bm-${mechId}-adds`} />
        </label>
        <label className="block">
          <span className="text-[10px] uppercase tracking-widest text-slate-500">Immune To (comma-sep)</span>
          <input className={inputCls} value={(form.immune_to || []).join(", ")} onChange={(e) => set("immune_to", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} data-testid={`bm-${mechId}-immune`} />
        </label>
      </div>
      <button onClick={() => onSave(mechId, form)} disabled={busy}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 text-[#05050A] font-bold text-sm disabled:opacity-50 hover:brightness-110" data-testid={`bm-${mechId}-save`}>
        <Save className="w-4 h-4" /> Save Mechanic
      </button>
    </div>
  );
}
