import { useState, useRef, useMemo } from "react";
import { Save, Upload, Loader2, ImagePlus, Check } from "lucide-react";
import { toast } from "sonner";
import api, { formatApiErrorDetail } from "@/lib/api";

const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });

const sel = "mt-1 w-full bg-black/40 border border-black/10 rounded px-3 py-2 text-sm text-ink focus:outline-none focus:border-chakra";

// Bonus stats are {atk_pct, def_pct, hp_pct, spd_pct} → editable as numbers.
const BONUS_KEYS = ["atk_pct", "def_pct", "hp_pct", "spd_pct"];

function parseBonus(bonus) {
  const out = {};
  for (const k of BONUS_KEYS) out[k] = bonus?.[k] ?? "";
  return out;
}

function SetEditor({ setId, set, onChanged }) {
  const [form, setForm] = useState({
    name: set.name || "",
    color: set.color || "#FFFFFF",
    bonus2: parseBonus(set.bonus2),
    bonus4: parseBonus(set.bonus4),
  });
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);
  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setBonus = (which, k, v) => setForm((f) => ({ ...f, [which]: { ...f[which], [k]: v } }));

  const save = async () => {
    setBusy(true);
    try {
      const bonus2 = {}, bonus4 = {};
      for (const k of BONUS_KEYS) {
        if (form.bonus2[k] !== "" && form.bonus2[k] != null) bonus2[k] = Number(form.bonus2[k]);
        if (form.bonus4[k] !== "" && form.bonus4[k] != null) bonus4[k] = Number(form.bonus4[k]);
      }
      await api.put(`/admin/gear-set/${setId}`, {
        name: form.name, color: form.color, bonus2, bonus4,
      });
      await onChanged();
      toast.success(`${form.name || setId} updated`);
    } catch (e) {
      toast.error(formatApiErrorDetail(e?.response?.data?.detail) || "Save failed");
    } finally { setBusy(false); }
  };

  const uploadIcon = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const image = await fileToDataUrl(file);
      await api.post(`/admin/gear-set/${setId}/icon`, { image });
      await onChanged();
      toast.success("Icon uploaded");
    } catch (e) {
      toast.error(formatApiErrorDetail(e?.response?.data?.detail) || "Upload failed");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="rounded-xl border border-black/10 bg-[#FFFFFF] p-4 space-y-3" data-testid={`gear-set-${setId}`}>
      <div className="flex items-center gap-3">
        {set.icon ? <img src={set.icon} alt={set.name} className="w-12 h-12 rounded-lg object-cover border border-black/10" /> : <span className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: `${set.color}22` }}><ImagePlus className="w-5 h-5" style={{ color: set.color }} /></span>}
        <div className="flex-1">
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={uploadIcon} />
          <div className="flex items-center gap-2">
            <h3 className="font-display text-xl text-ink">{form.name || setId}</h3>
            <button onClick={() => fileRef.current?.click()} disabled={busy} data-testid={`gear-icon-${setId}`} className="text-xs font-semibold text-chakra hover:text-fox flex items-center gap-1 disabled:opacity-50">
              <Upload className="w-3.5 h-3.5" /> Icon
            </button>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-xs uppercase tracking-widest text-slate-500">Name</span>
          <input className={sel} value={form.name} onChange={(e) => setField("name", e.target.value)} data-testid={`gear-name-${setId}`} />
        </label>
        <label className="block">
          <span className="text-xs uppercase tracking-widest text-slate-500">Color</span>
          <div className="flex items-center gap-2 mt-1">
            <input type="color" value={form.color} onChange={(e) => setField("color", e.target.value)} className="w-10 h-9 rounded border border-black/10 bg-transparent" data-testid={`gear-color-${setId}`} />
            <input className={`${sel} flex-1`} value={form.color} onChange={(e) => setField("color", e.target.value)} />
          </div>
        </label>
      </div>
      {["bonus2", "bonus4"].map((which) => (
        <div key={which}>
          <span className="text-xs uppercase tracking-widest text-slate-500">{which === "bonus2" ? "2-Piece Bonus" : "4-Piece Bonus"} (% stats)</span>
          <div className="grid grid-cols-4 gap-2 mt-1">
            {BONUS_KEYS.map((k) => (
              <label key={k} className="block">
                <span className="text-[10px] text-slate-500">{k.replace("_pct", "%")}</span>
                <input type="number" className={`${sel} px-2 text-center`} value={form[which][k]}
                  onChange={(e) => setBonus(which, k, e.target.value)} data-testid={`gear-${which}-${setId}-${k}`} />
              </label>
            ))}
          </div>
        </div>
      ))}
      <button onClick={save} disabled={busy} data-testid={`gear-save-${setId}`} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-bold bg-emerald-500 text-[#05050A] disabled:opacity-60 hover:brightness-110 transition-all">
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Set
      </button>
    </div>
  );
}

function RarityEditor({ rarity, meta, onChanged }) {
  const [form, setForm] = useState({ name: meta.name, color: meta.color, mult: meta.mult, subs: meta.subs, tier: meta.tier });
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const save = async () => {
    setBusy(true);
    try {
      await api.put(`/admin/gear-rarity/${rarity}`, {
        name: form.name, color: form.color, mult: Number(form.mult), subs: Number(form.subs), tier: Number(form.tier),
      });
      await onChanged();
      toast.success(`${form.name} updated`);
    } catch (e) {
      toast.error(formatApiErrorDetail(e?.response?.data?.detail) || "Save failed");
    } finally { setBusy(false); }
  };
  return (
    <div className="rounded-xl border border-black/10 bg-[#FFFFFF] p-3 space-y-2" data-testid={`gear-rarity-${rarity}`}>
      <div className="flex items-center gap-2">
        <span className="w-4 h-4 rounded-full" style={{ background: form.color }} />
        <span className="font-display text-ink">{form.name}</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="block"><span className="text-[10px] text-slate-500">Name</span>
          <input className={`${sel} px-2`} value={form.name} onChange={(e) => set("name", e.target.value)} /></label>
        <label className="block"><span className="text-[10px] text-slate-500">Color</span>
          <input type="color" value={form.color} onChange={(e) => set("color", e.target.value)} className="w-full h-8 rounded border border-black/10" /></label>
        <label className="block"><span className="text-[10px] text-slate-500">Stat Mult</span>
          <input type="number" step="0.1" className={`${sel} px-2`} value={form.mult} onChange={(e) => set("mult", e.target.value)} /></label>
        <label className="block"><span className="text-[10px] text-slate-500">Substats</span>
          <input type="number" className={`${sel} px-2`} value={form.subs} onChange={(e) => set("subs", e.target.value)} /></label>
      </div>
      <button onClick={save} disabled={busy} className="w-full flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-bold bg-chakra/15 text-chakra border border-chakra/30 hover:bg-chakra/25 disabled:opacity-50">
        {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Save
      </button>
    </div>
  );
}

export default function GearTab() {
  const [cfg, setCfg] = useState(null);
  const load = async () => {
    try { const { data } = await api.get("/admin/gear-config"); setCfg(data); }
    catch (e) { toast.error(formatApiErrorDetail(e?.response?.data?.detail) || e.message); }
  };
  useMemo(() => { load(); }, []); // eslint-disable-line
  if (!cfg) return <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 text-chakra animate-spin" /></div>;

  return (
    <div className="space-y-6" data-testid="admin-gear">
      <div>
        <h3 className="font-display text-2xl text-ink mb-1">GEAR SETS</h3>
        <p className="text-xs text-slate-500 mb-4">Edit set names, colors, 2/4-piece bonuses and upload an icon. Changes apply live to every player.</p>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(cfg.sets).map(([sid, s]) => (
            <SetEditor key={sid} setId={sid} set={s} onChanged={load} />
          ))}
        </div>
      </div>
      <div>
        <h3 className="font-display text-2xl text-ink mb-1">RARITY TIERS</h3>
        <p className="text-xs text-slate-500 mb-4">Stat multipliers and substat count per rarity tier.</p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {cfg.rarities.map((r) => (
            <RarityEditor key={r} rarity={r} meta={cfg.rarity_meta[r]} onChanged={load} />
          ))}
        </div>
      </div>
    </div>
  );
}
