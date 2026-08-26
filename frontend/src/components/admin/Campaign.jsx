import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import { Map, Plus, Trash2, RotateCcw, Loader2, Skull } from "lucide-react";
import api, { formatApiErrorDetail } from "@/lib/api";
import { Panel, SectionLabel, numCls, inputCls, SaveBar } from "./AdminShared";

const ENEMY_SLOTS = 3;
const MECHS = ["sealed_titan", "abyssal_warden"];

export default function Campaign({ catalog }) {
  const [stages, setStages] = useState(null);
  const [mechs, setMechs] = useState({});
  const [overrides, setOverrides] = useState({});
  const [selId, setSelId] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const { data } = await api.get("/admin/stages");
      setStages(data.stages); setMechs(data.boss_mechanics || {}); setOverrides(data.overrides || {});
      setSelId((s) => s || data.stages[0]?.id || null);
    } catch (e) { toast.error(formatApiErrorDetail(e?.response?.data?.detail) || e.message); }
  };
  useMemo(() => { load(); }, []); // eslint-disable-line

  const sel = stages?.find((s) => s.id === selId) || null;
  const [draft, setDraft] = useState(null);

  useEffect(() => {
    if (!sel) return;
    setDraft({
      enemies: [...sel.enemies, ...Array(Math.max(0, ENEMY_SLOTS - sel.enemies.length)).fill(null)]
        .slice(0, ENEMY_SLOTS).map((e) => e ? { ...e } : null),
      rewards: { ryo: sel.rewards?.ryo ?? 0, exp: sel.rewards?.exp ?? 0 },
      first_clear: { ryo: sel.first_clear?.ryo ?? 0, ninja: sel.first_clear?.ninja ?? null },
      boss_mechanic: sel.boss_mechanic || "",
    });
  }, [selId]); // eslint-disable-line

  const power = sel ? sel.recommended_power : 0;
  const isOverridden = !!overrides[selId];

  const save = async () => {
    if (!sel) return;
    setBusy(true);
    try {
      const enemies = draft.enemies.filter(Boolean).map((e) => ({ template_id: e.template_id, level: Number(e.level) }));
      const payload = {
        stage_id: sel.id, enemies,
        rewards: { ryo: Number(draft.rewards.ryo), exp: Number(draft.rewards.exp) },
        first_clear: { ryo: Number(draft.first_clear.ryo), ninja: draft.first_clear.ninja || null },
        ...(draft.boss_mechanic ? { boss_mechanic: draft.boss_mechanic } : {}),
      };
      const { data } = await api.post("/admin/stage", payload);
      setStages((ss) => ss.map((s) => s.id === sel.id ? data.stage : s));
      setOverrides((o) => ({ ...o, [sel.id]: true }));
      toast.success(`${sel.name} updated`);
    } catch (e) { toast.error(formatApiErrorDetail(e?.response?.data?.detail) || e.message); }
    finally { setBusy(false); }
  };

  const reset = async () => {
    if (!sel) return;
    setBusy(true);
    try {
      const { data } = await api.post("/admin/stage/reset", { stage_id: sel.id });
      setStages((ss) => ss.map((s) => s.id === sel.id ? data.stage : s));
      setOverrides((o) => { const n = { ...o }; delete n[sel.id]; return n; });
      toast.success(`${sel.name} reset to default`);
    } catch (e) { toast.error(formatApiErrorDetail(e?.response?.data?.detail) || e.message); }
    finally { setBusy(false); }
  };

  if (!stages) return <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 text-chakra animate-spin" /></div>;

  return (
    <div className="grid lg:grid-cols-[300px_1fr] gap-5" data-testid="admin-campaign">
      {/* Stage list */}
      <div className="glass-panel p-3 max-h-[75vh] overflow-y-auto scrollbar-none">
        <div className="text-xs uppercase tracking-widest text-slate-500 px-1 mb-2">Stages</div>
        {stages.map((s) => (
          <button key={s.id} onClick={() => setSelId(s.id)} data-testid={`stage-row-${s.id}`}
            className={`w-full text-left px-3 py-2 rounded-lg mb-1.5 border transition-colors ${selId === s.id ? "bg-chakra/15 border-chakra/50" : "bg-black/[0.04] border-black/10 hover:bg-black/[0.06]"}`}>
            <div className="flex items-center justify-between gap-1">
              <span className="text-sm font-semibold text-ink truncate">{s.name}</span>
              {s.is_boss && <Skull className="w-3.5 h-3.5 text-fox shrink-0" />}
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-500 mt-0.5">
              <span>Ch.{s.chapter} · PWR {s.recommended_power?.toLocaleString()}</span>
              {overrides[s.id] && <span className="text-jutsu font-bold">●</span>}
            </div>
          </button>
        ))}
      </div>

      {/* Editor */}
      <div>
        {!sel || !draft ? <p className="text-slate-500">Select a stage.</p> : (
          <Panel title={sel.name} subtitle={`Chapter ${sel.chapter} · ${sel.region}${isOverridden ? " · (overridden)" : ""}`} icon={<Map className="w-6 h-6 text-jutsu" />}>
            <SectionLabel>Enemies</SectionLabel>
            <div className="space-y-2">
              {draft.enemies.map((e, i) => (
                <div key={i} className="flex items-center gap-2">
                  <select value={e?.template_id || ""} data-testid={`stage-enemy-${i}-id`}
                    onChange={(ev) => setDraft((d) => {
                      const en = [...d.enemies]; en[i] = en[i] ? { ...en[i], template_id: ev.target.value } : { template_id: ev.target.value, level: 1 };
                      return { ...d, enemies: en };
                    })} className={`${inputCls} mt-0 flex-1`}>
                    <option value="">— empty —</option>
                    {catalog.map((h) => <option key={h.id} value={h.id}>{h.name} ({h.rarity})</option>)}
                  </select>
                  <input type="number" min={1} value={e?.level ?? ""} data-testid={`stage-enemy-${i}-lvl`}
                    placeholder="Lvl" onChange={(ev) => setDraft((d) => {
                      const en = [...d.enemies]; en[i] = en[i] ? { ...en[i], level: ev.target.value } : { template_id: "", level: ev.target.value };
                      return { ...d, enemies: en };
                    })} className={`${numCls} w-20`} />
                  <button onClick={() => setDraft((d) => { const en = [...d.enemies]; en[i] = null; return { ...d, enemies: en }; })}
                    className="p-2 text-slate-500 hover:text-fox"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
              <button onClick={() => setDraft((d) => ({ ...d, enemies: [...d.enemies, null].slice(0, ENEMY_SLOTS) }))}
                disabled={draft.enemies.length >= ENEMY_SLOTS}
                className="flex items-center gap-1 text-xs text-jutsu hover:text-fox disabled:opacity-40"><Plus className="w-3.5 h-3.5" /> Add enemy</button>
            </div>

            <SectionLabel>Difficulty / Boss</SectionLabel>
            <div className="grid sm:grid-cols-2 gap-3">
              <label className="block">
                <span className="text-[10px] uppercase tracking-widest text-slate-500">Boss Mechanic</span>
                <select value={draft.boss_mechanic} onChange={(e) => setDraft((d) => ({ ...d, boss_mechanic: e.target.value }))}
                  data-testid="stage-mech" className={inputCls}>
                  <option value="">None (normal)</option>
                  {MECHS.map((m) => <option key={m} value={m}>{mechs[m]?.name || m}</option>)}
                </select>
              </label>
              <div className="flex items-end text-xs text-slate-500">
                Boss mechanics add shield/enrage/elemental-shift phases.
              </div>
            </div>

            <SectionLabel>Rewards</SectionLabel>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <label className="block"><span className="text-[10px] uppercase tracking-widest text-slate-500">Clear Ryo</span>
                <input type="number" value={draft.rewards.ryo} onChange={(e) => setDraft((d) => ({ ...d, rewards: { ...d.rewards, ryo: e.target.value } }))} className={numCls} data-testid="stage-ryo" /></label>
              <label className="block"><span className="text-[10px] uppercase tracking-widest text-slate-500">Clear EXP</span>
                <input type="number" value={draft.rewards.exp} onChange={(e) => setDraft((d) => ({ ...d, rewards: { ...d.rewards, exp: e.target.value } }))} className={numCls} /></label>
              <label className="block"><span className="text-[10px] uppercase tracking-widest text-slate-500">First-Clear Ryo</span>
                <input type="number" value={draft.first_clear.ryo} onChange={(e) => setDraft((d) => ({ ...d, first_clear: { ...d.first_clear, ryo: e.target.value } }))} className={numCls} data-testid="stage-fc-ryo" /></label>
              <label className="block"><span className="text-[10px] uppercase tracking-widest text-slate-500">First-Clear Hero</span>
                <select value={draft.first_clear.ninja || ""} onChange={(e) => setDraft((d) => ({ ...d, first_clear: { ...d.first_clear, ninja: e.target.value || null } }))}
                  data-testid="stage-fc-ninja" className={inputCls}>
                  <option value="">None</option>
                  {catalog.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
                </select></label>
            </div>

            <div className="flex gap-3 mt-2">
              <SaveBar busy={busy} onSave={save} testId="stage-save" label="SAVE STAGE" />
              {isOverridden && (
                <button onClick={reset} disabled={busy} data-testid="stage-reset"
                  className="mt-5 px-4 py-3 rounded-xl bg-black/[0.06] text-slate-600 font-bold flex items-center gap-2 disabled:opacity-50">
                  <RotateCcw className="w-4 h-4" /> Reset
                </button>
              )}
            </div>
            <p className="text-[11px] text-slate-500 mt-3">Recommended power now: <b className="text-ink">{power?.toLocaleString()}</b></p>
          </Panel>
        )}
      </div>
    </div>
  );
}
