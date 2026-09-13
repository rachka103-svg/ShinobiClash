import { useMemo, useState, useRef } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Shield, Upload, Save, Trash2, Loader2, Heart, Sword, ShieldHalf, Wind, Zap } from "lucide-react";
import { useGame } from "@/context/GameContext";
import { RARITY, ELEMENT } from "@/lib/theme";
import api, { formatApiErrorDetail } from "@/lib/api";

const ELEMENTS = ["Fire", "Water", "Wind", "Earth", "Lightning", "Dark", "Light"];
const RARITIES = ["R", "SR", "SSR", "UR", "LR", "GR", "MYTHIC"];
const ROLES = ["Attacker", "Tank", "Support", "Assassin", "Mage", "Healer", "Control", "Bruiser"];
const STAT_KEYS = [
  { k: "hp", label: "HP", icon: Heart, color: "#FF1744" },
  { k: "atk", label: "ATK", icon: Sword, color: "#FF5722" },
  { k: "def", label: "DEF", icon: ShieldHalf, color: "#29B6F6" },
  { k: "spd", label: "SPD", icon: Wind, color: "#00E676" },
  { k: "chakra", label: "CK", icon: Zap, color: "#00E5FF" },
];

const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });

const Field = ({ label, children }) => (
  <label className="block">
    <span className="text-xs uppercase tracking-widest text-slate-500">{label}</span>
    {children}
  </label>
);

const sel = "mt-1 w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-chakra";

/**
 * EnemyGalleryTab — displays nightmare boss templates (enemy-only characters
 * used in Tsukuyomi and Boss Hunt modes). Admins can edit each enemy's
 * portrait and stats, mirroring the Manage Heroes workflow.
 */
export default function EnemyGalleryTab() {
  const { enemyTemplates, refreshCatalog } = useGame();
  const [selectedId, setSelectedId] = useState(null);

  const sorted = useMemo(
    () =>
      [...(enemyTemplates || [])].sort(
        (a, b) => (RARITY[b.rarity]?.tier ?? 0) - (RARITY[a.rarity]?.tier ?? 0)
      ),
    [enemyTemplates]
  );

  const selected = selectedId ? enemyTemplates.find((t) => t.id === selectedId) : null;

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "rgba(139,0,0,0.15)", border: "1px solid rgba(139,0,0,0.4)" }}>
          <Shield className="w-6 h-6 text-fox" />
        </div>
        <div>
          <h2 className="font-display text-3xl tracking-wide text-ink leading-none">ENEMY GALLERY</h2>
          <p className="text-sm text-slate-500 mt-1">
            Nightmare boss templates used in Tsukuyomi & Boss Hunt. These are enemy-only — not summonable, not in the player collection.
          </p>
        </div>
      </div>

      {sorted.length === 0 ? (
        <p className="text-center text-slate-500 py-10">No enemy templates loaded.</p>
      ) : (
        <div className="grid lg:grid-cols-[1fr_360px] gap-6">
          {/* Card grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 content-start" data-testid="enemy-gallery-grid">
            {sorted.map((t) => {
              const r = RARITY[t.rarity] || RARITY.UR;
              const el = ELEMENT[t.element] || {};
              const isSel = t.id === selectedId;
              return (
                <button
                  key={t.id}
                  data-testid={`enemy-card-${t.id}`}
                  onClick={() => setSelectedId(t.id)}
                  className={`relative aspect-[3/4] rounded-xl overflow-hidden border-2 transition-all text-left ${isSel ? "ring-2 ring-chakra scale-[1.02]" : "hover:scale-[1.01]"}`}
                  style={{ borderColor: r.color, boxShadow: `0 0 16px ${r.color}33` }}
                >
                  <img
                    src={t.portrait || "/heroes/_placeholder.webp"}
                    alt={t.name}
                    className="absolute inset-0 w-full h-full object-cover object-top"
                    onError={(e) => { e.target.src = "/heroes/_placeholder.webp"; }}
                  />
                  <div className="absolute inset-0" style={{ background: "linear-gradient(to top, #05050Af5 8%, #05050A55 45%, transparent 72%)" }} />
                  <div className="absolute top-2 left-2 flex items-center gap-1.5">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: `${el.color}22`, color: el.color, border: `1px solid ${el.color}55` }}>
                      {t.element}
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: `${r.color}22`, color: r.color, border: `1px solid ${r.color}55` }}>
                      {r.label}
                    </span>
                  </div>
                  <div className="absolute top-2 right-2">
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-black/60 text-slate-300 border border-white/10">
                      ENEMY
                    </span>
                  </div>
                  <div className="absolute inset-x-0 bottom-0 p-2.5">
                    <h3 className="font-display text-base tracking-wide text-white leading-none truncate">{t.name}</h3>
                    <p className="text-[11px] text-slate-300 mt-0.5">{t.role}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-2">{t.lore}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-[9px] text-slate-500 font-mono">{t.id}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Manager panel */}
          <div>
            {selected ? (
              <EnemyManager key={selected.id} enemy={selected} onChanged={refreshCatalog} />
            ) : (
              <div className="rounded-xl border border-white/10 bg-[#1a1a1a] p-8 text-center text-slate-500 sticky top-24" data-testid="enemy-manager-empty">
                Select an enemy to edit their portrait & stats.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function EnemyManager({ enemy, onChanged }) {
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ ...enemy });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setStat = (k, v) => setForm((f) => ({ ...f, base_stats: { ...f.base_stats, [k]: Number(v) || 0 } }));

  const hasOverride = (enemy.portrait || "").includes("/custom/");

  const uploadPortrait = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const image = await fileToDataUrl(file);
      await api.post("/admin/hero/portrait", { template_id: enemy.id, image });
      await onChanged();
      toast.success("Enemy portrait updated!");
    } catch (err) {
      toast.error(formatApiErrorDetail(err?.response?.data?.detail) || "Upload failed");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const resetPortrait = async () => {
    setBusy(true);
    try {
      await api.delete(`/admin/hero/${enemy.id}/portrait`);
      await onChanged();
      toast.success("Restored original art");
    } catch (err) {
      toast.error(formatApiErrorDetail(err?.response?.data?.detail) || "Reset failed");
    } finally {
      setBusy(false);
    }
  };

  const saveEdits = async () => {
    setBusy(true);
    try {
      await api.post("/admin/hero/edit", {
        id: enemy.id, name: form.name, title: form.title, element: form.element,
        rarity: form.rarity, role: form.role, lore: form.lore, base_stats: form.base_stats,
        portrait: enemy.portrait, jutsus: form.jutsus,
      });
      await onChanged();
      toast.success("Enemy updated!");
    } catch (err) {
      toast.error(formatApiErrorDetail(err?.response?.data?.detail) || "Save failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-white/10 bg-[#1a1a1a] overflow-hidden sticky top-24" data-testid="enemy-manager">
      <div className="relative h-[260px]">
        <img src={enemy.portrait} alt={enemy.name} className="w-full h-full object-cover object-top" data-testid="enemy-manager-portrait" />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, #1a1a1a, transparent)" }} />
        <div className="absolute bottom-3 left-4 right-4">
          <h3 className="font-display text-3xl text-white leading-none">{enemy.name}</h3>
          <p className="text-xs text-chakra italic">{enemy.title}</p>
        </div>
      </div>
      <div className="p-4 space-y-3">
        <input ref={fileRef} type="file" accept="image/*" className="hidden" data-testid="enemy-portrait-file-input" onChange={uploadPortrait} />
        <button onClick={() => fileRef.current?.click()} disabled={busy} data-testid="enemy-upload-portrait-btn"
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-semibold bg-chakra/15 text-chakra border border-chakra/30 hover:bg-chakra/25 disabled:opacity-60 transition-all">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} Replace Portrait
        </button>

        {hasOverride && (
          <button onClick={resetPortrait} disabled={busy} data-testid="enemy-reset-portrait-btn"
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg font-semibold bg-white/[0.04] text-slate-400 border border-white/10 hover:bg-white/10 disabled:opacity-60 transition-all">
            <Trash2 className="w-4 h-4" /> Reset to Original Art
          </button>
        )}

        <div className="grid grid-cols-2 gap-2">
          <Field label="Name"><input className={sel} data-testid="enemy-mgr-name" value={form.name} onChange={(e) => set("name", e.target.value)} /></Field>
          <Field label="Title"><input className={sel} data-testid="enemy-mgr-title" value={form.title} onChange={(e) => set("title", e.target.value)} /></Field>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Field label="Element">
            <select className={sel} data-testid="enemy-mgr-element" value={form.element} onChange={(e) => set("element", e.target.value)}>
              {ELEMENTS.map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
          </Field>
          <Field label="Rarity">
            <select className={sel} data-testid="enemy-mgr-rarity" value={form.rarity} onChange={(e) => set("rarity", e.target.value)}>
              {RARITIES.map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
          </Field>
          <Field label="Role">
            <select className={sel} data-testid="enemy-mgr-role" value={form.role} onChange={(e) => set("role", e.target.value)}>
              {ROLES.map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Lore"><textarea className={sel} rows={2} data-testid="enemy-mgr-lore" value={form.lore || ""} onChange={(e) => set("lore", e.target.value)} /></Field>
        <div className="grid grid-cols-5 gap-1.5">
          {STAT_KEYS.map(({ k, label, color }) => (
            <div key={k}>
              <span className="text-[10px] text-slate-500" style={{ color }}>{label}</span>
              <input className={`${sel} px-1 text-center`} type="number" data-testid={`enemy-mgr-stat-${k}`} value={form.base_stats?.[k] ?? 0} onChange={(e) => setStat(k, e.target.value)} />
            </div>
          ))}
        </div>

        <button onClick={saveEdits} disabled={busy} data-testid="enemy-mgr-save"
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-bold bg-emerald-500 text-[#05050A] disabled:opacity-60 hover:brightness-110 transition-all">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Changes
        </button>
      </div>
    </motion.div>
  );
}
