import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Moon, Loader2, Sparkles } from "lucide-react";
import api, { formatApiErrorDetail } from "@/lib/api";
import { Panel, SectionLabel, numCls, inputCls, SaveBar } from "./AdminShared";

export default function Goddess() {
  const [bosses, setBosses] = useState(null);
  const [gearSets, setGearSets] = useState({});
  const [overrides, setOverrides] = useState({});
  const [selId, setSelId] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const { data } = await api.get("/admin/tsukuyomi");
      setBosses(data.bosses); setGearSets(data.gear_sets || {}); setOverrides(data.overrides || {});
      setSelId((s) => s || data.bosses[0]?.id || null);
    } catch (e) { toast.error(formatApiErrorDetail(e?.response?.data?.detail) || e.message); }
  };
  useMemo(() => { load(); }, []); // eslint-disable-line

  const sel = bosses?.find((b) => b.id === selId) || null;
  const [form, setForm] = useState({});

  useMemo(() => {
    if (!sel) return;
    setForm({ base_level: sel.base_level, rare_chance: sel.rare_chance, gear_set: sel.gear_set });
  }, [selId]); // eslint-disable-line

  const save = async () => {
    if (!sel) return;
    setBusy(true);
    try {
      const payload = {
        boss_id: sel.id,
        base_level: Number(form.base_level),
        rare_chance: Number(form.rare_chance),
        gear_set: form.gear_set,
      };
      const { data } = await api.post("/admin/tsukuyomi", payload);
      setBosses((bs) => bs.map((b) => b.id === sel.id ? data.boss : b));
      setOverrides((o) => ({ ...o, [sel.id]: true }));
      toast.success(`${sel.name} tuned`);
    } catch (e) { toast.error(formatApiErrorDetail(e?.response?.data?.detail) || e.message); }
    finally { setBusy(false); }
  };

  if (!bosses) return <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 text-chakra animate-spin" /></div>;

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="grid lg:grid-cols-[300px_1fr] gap-5" data-testid="admin-goddess">
      <div className="glass-panel p-3 max-h-[75vh] overflow-y-auto scrollbar-none">
        <div className="text-xs uppercase tracking-widest text-slate-500 px-1 mb-2">Dream Bosses</div>
        {bosses.map((b) => (
          <button key={b.id} onClick={() => setSelId(b.id)} data-testid={`goddess-row-${b.id}`}
            className={`w-full text-left px-3 py-2 rounded-lg mb-1.5 border transition-colors ${selId === b.id ? "bg-chakra/15 border-chakra/50" : "bg-black/[0.04] border-black/10 hover:bg-black/[0.06]"}`}>
            <div className="flex items-center justify-between gap-1">
              <span className="text-sm font-semibold text-ink truncate">{b.index}. {b.name}</span>
              {overrides[b.id] && <span className="text-jutsu text-xs">●</span>}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Lv {b.base_level} · {b.rarity} {b.element}</div>
          </button>
        ))}
      </div>

      <div>
        {!sel || !form.base_level ? <p className="text-slate-500">Select a goddess boss.</p> : (
          <Panel title={sel.name} subtitle={`Boss #${sel.index} · ${sel.lore}`} icon={<Moon className="w-6 h-6 text-chakra" />}>
            <div className="flex items-center gap-4 mb-4">
              <img src={sel.portrait} alt={sel.name} className="w-20 h-20 rounded-lg object-cover border border-black/10" />
              <div className="text-sm text-slate-600">
                <div><b className="text-ink">{sel.template_id}</b> · {sel.rarity} {sel.element}</div>
                <div>Signature set: <span style={{ color: sel.gear_set_color }}>{sel.gear_set_name}</span></div>
                <div>Mechanic: {sel.boss_mechanic}</div>
              </div>
            </div>

            <SectionLabel>Power & Difficulty</SectionLabel>
            <div className="grid grid-cols-2 gap-3">
              <label className="block"><span className="text-[10px] uppercase tracking-widest text-slate-500">Base Level</span>
                <input type="number" min={1} value={form.base_level} onChange={(e) => set("base_level", e.target.value)}
                  data-testid="goddess-level" className={numCls} /></label>
              <label className="block"><span className="text-[10px] uppercase tracking-widest text-slate-500">Rare Drop Chance (0–0.6)</span>
                <input type="number" step={0.01} min={0} max={0.6} value={form.rare_chance} onChange={(e) => set("rare_chance", e.target.value)}
                  data-testid="goddess-rare" className={numCls} /></label>
            </div>

            <SectionLabel>Signature Gear Set</SectionLabel>
            <select value={form.gear_set} onChange={(e) => set("gear_set", e.target.value)} data-testid="goddess-set" className={inputCls}>
              {Object.entries(gearSets).map(([sid, s]) => <option key={sid} value={sid}>{s.name}</option>)}
            </select>

            <SectionLabel>Difficulty Breakdown (read-only)</SectionLabel>
            <div className="grid sm:grid-cols-3 gap-3">
              {sel.difficulties.map((d) => (
                <div key={d.id} className="rounded-lg border border-black/10 p-3" style={{ borderColor: d.color + "55" }}>
                  <div className="text-sm font-bold" style={{ color: d.color }}>{d.name}</div>
                  <div className="text-xs text-slate-500 mt-1">PWR mult ×{d.power_mult}</div>
                  <div className="text-xs text-slate-500">Reward ×{d.reward_mult}</div>
                  <div className="text-xs text-ink mt-1">Rec. PWR {d.recommended_power?.toLocaleString()}</div>
                </div>
              ))}
            </div>

            <SaveBar busy={busy} onSave={save} testId="goddess-save" label="SAVE GODDESS" />
            <p className="text-[11px] text-slate-500 mt-3 flex items-center gap-1"><Sparkles className="w-3 h-3" /> Raising the base level scales every difficulty's enemy level proportionally.</p>
          </Panel>
        )}
      </div>
    </div>
  );
}
