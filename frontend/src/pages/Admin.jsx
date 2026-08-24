import { useState, useRef, useMemo } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Wand2, Sparkles, Save, Trash2, Upload, Loader2, Heart, Sword, Shield, Wind, Zap, ImagePlus, Download, Brush, Check, Shuffle, Star } from "lucide-react";
import { useGame } from "@/context/GameContext";
import { NinjaCard } from "@/components/NinjaCard";
import { RARITY, ELEMENT } from "@/lib/styles";
import api, { formatApiErrorDetail } from "@/lib/api";

const ELEMENTS = ["Fire", "Water", "Wind", "Earth", "Lightning", "Dark", "Light"];
const RARITIES = ["R", "SR", "SSR", "UR", "GR"];
const ROLES = ["Attacker", "Tank", "Support", "Assassin", "Mage", "Healer", "Control", "Bruiser"];
const ART_STYLES = ["anime", "painterly", "cel-shaded", "semi-realistic", "dark fantasy", "chibi"];
const SURPRISE_POSES = [
  "mid-leap with weapon raised", "crouched and ready to strike", "back-to-back with a summoned spirit",
  "channeling energy with glowing hands", "dashing forward through debris", "standing atop a cliff at dusk",
  "weaving hand signs mid-jutsu", "deflecting an attack with a blade",
];
const SURPRISE_NAMES = [
  "Raijin Kurokawa", "Yuki Shirayami", "Kaen Hoshino", "Arashi Tatsumi", "Kage Murasaki",
  "Sora Tsukikage", "Ren Akatsuchi", "Hayate Mizuki", "Kuro Enjin", "Tora Kazami",
];
const STAT_KEYS = [
  { k: "hp", label: "HP", icon: Heart, color: "#FF1744" },
  { k: "atk", label: "ATK", icon: Sword, color: "#FF5722" },
  { k: "def", label: "DEF", icon: Shield, color: "#29B6F6" },
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

const sel = "mt-1 w-full bg-black/40 border border-black/10 rounded px-3 py-2 text-sm text-ink focus:outline-none focus:border-chakra";

export default function Admin() {
  const { catalog, refreshCatalog, banner } = useGame();
  const [tab, setTab] = useState("generate");

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8" data-testid="admin-page">
      <div className="mb-6">
        <h1 className="font-display text-5xl tracking-wide text-ink flex items-center gap-3">
          <Wand2 className="w-9 h-9 text-jutsu" /> ADMIN FORGE
        </h1>
        <p className="text-slate-500">Generate heroes with AI, balance their stats, and manage portraits — changes go live instantly.</p>
      </div>

      <div className="flex items-center gap-2 mb-6">
        {[["generate", "AI Generator"], ["art", "Art Studio"], ["manage", `Manage Heroes (${catalog.length})`], ["players", "Players"], ["economy", "Economy"]].map(([id, lbl]) => (
          <button key={id} data-testid={`admin-tab-${id}`} onClick={() => setTab(id)}
            className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${tab === id ? "bg-chakra text-[#05050A]" : "text-slate-600 bg-black/[0.04] hover:bg-black/10"}`}>
            {lbl}
          </button>
        ))}
      </div>

      {tab === "generate" ? <Generator onSaved={refreshCatalog} />
        : tab === "art" ? <ArtStudio catalog={catalog} onApplied={refreshCatalog} />
        : tab === "players" ? <Players />
        : tab === "economy" ? <Economy />
        : <Manage catalog={catalog} banner={banner} onChanged={refreshCatalog} />}
    </div>
  );
}

/* ----------------------------- AI Generator ----------------------------- */
function Generator({ onSaved }) {
  const [form, setForm] = useState({ name: "", concept: "", element: "auto", rarity: "auto", role: "auto" });
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const generate = async () => {
    if (!form.name.trim()) return toast.error("Give your hero a name first");
    setBusy(true);
    setDraft(null);
    try {
      const payload = {
        name: form.name.trim(),
        concept: form.concept.trim(),
        ...(form.element !== "auto" && { element: form.element }),
        ...(form.rarity !== "auto" && { rarity: form.rarity }),
        ...(form.role !== "auto" && { role: form.role }),
      };
      const { data } = await api.post("/admin/hero/generate", payload);
      setDraft(data.draft);
      toast.success("Hero conjured! Review and save.");
    } catch (e) {
      toast.error(formatApiErrorDetail(e?.response?.data?.detail) || "Generation failed");
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.post("/admin/hero/save", draft);
      await onSaved();
      toast.success(`${draft.name} added to the roster!`);
      setDraft(null);
      setForm({ name: "", concept: "", element: "auto", rarity: "auto", role: "auto" });
    } catch (e) {
      toast.error(formatApiErrorDetail(e?.response?.data?.detail) || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Form */}
      <div className="rounded-xl border border-black/10 bg-[#FFFFFF] p-5 space-y-4" data-testid="generator-form">
        <Field label="Hero Name">
          <input className={sel} data-testid="gen-name" value={form.name} maxLength={40}
            onChange={(e) => set("name", e.target.value)} placeholder="e.g. Kaen Ryujin" />
        </Field>
        <Field label="Concept / Theme (optional)">
          <textarea className={sel} rows={3} data-testid="gen-concept" value={form.concept} maxLength={300}
            onChange={(e) => set("concept", e.target.value)} placeholder="A stoic dragon-blooded swordsman wreathed in molten flame…" />
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Element">
            <select className={sel} data-testid="gen-element" value={form.element} onChange={(e) => set("element", e.target.value)}>
              <option value="auto">Auto</option>
              {ELEMENTS.map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
          </Field>
          <Field label="Rarity">
            <select className={sel} data-testid="gen-rarity" value={form.rarity} onChange={(e) => set("rarity", e.target.value)}>
              <option value="auto">Auto</option>
              {RARITIES.map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
          </Field>
          <Field label="Role">
            <select className={sel} data-testid="gen-role" value={form.role} onChange={(e) => set("role", e.target.value)}>
              <option value="auto">Auto</option>
              {ROLES.map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
          </Field>
        </div>
        <button onClick={generate} disabled={busy} data-testid="gen-submit"
          className="w-full flex items-center justify-center gap-2 py-3 rounded-lg font-bold bg-gradient-to-r from-jutsu to-fox text-ink disabled:opacity-60 hover:brightness-110 transition-all">
          {busy ? <><Loader2 className="w-5 h-5 animate-spin" /> Conjuring… (AI is drawing)</> : <><Sparkles className="w-5 h-5" /> Generate Hero</>}
        </button>
        <p className="text-[11px] text-slate-500 text-center">Each generation spends Universal Key credits (1 image + text).</p>
      </div>

      {/* Preview */}
      <div className="rounded-xl border border-black/10 bg-[#FFFFFF] overflow-hidden" data-testid="generator-preview">
        {!draft && !busy && (
          <div className="h-full min-h-[420px] flex flex-col items-center justify-center text-slate-600 gap-3">
            <ImagePlus className="w-12 h-12" />
            <p>Your generated hero will appear here</p>
          </div>
        )}
        {busy && (
          <div className="h-full min-h-[420px] flex flex-col items-center justify-center text-slate-500 gap-3">
            <Loader2 className="w-10 h-10 animate-spin text-jutsu" />
            <p>Summoning art &amp; stats…</p>
          </div>
        )}
        {draft && <DraftEditor draft={draft} setDraft={setDraft} onSave={save} saving={saving} />}
      </div>
    </div>
  );
}

function DraftEditor({ draft, setDraft, onSave, saving }) {
  const setStat = (k, v) => setDraft((d) => ({ ...d, base_stats: { ...d.base_stats, [k]: Number(v) || 0 } }));
  const set = (k, v) => setDraft((d) => ({ ...d, [k]: v }));
  return (
    <div>
      <div className="relative h-[300px]">
        <img src={draft.portrait} alt={draft.name} className="w-full h-full object-cover object-top" data-testid="draft-portrait" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#FFFFFF] to-transparent" />
        <span className="absolute top-3 left-3 font-display text-lg px-2 rounded" style={{ background: RARITY[draft.rarity].color, color: "#05050A" }}>{draft.rarity}</span>
      </div>
      <div className="p-5 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Name"><input className={sel} data-testid="draft-name" value={draft.name} onChange={(e) => set("name", e.target.value)} /></Field>
          <Field label="Title"><input className={sel} data-testid="draft-title" value={draft.title} onChange={(e) => set("title", e.target.value)} /></Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Element">
            <select className={sel} data-testid="draft-element" value={draft.element} onChange={(e) => set("element", e.target.value)}>
              {ELEMENTS.map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
          </Field>
          <Field label="Rarity">
            <select className={sel} data-testid="draft-rarity" value={draft.rarity} onChange={(e) => set("rarity", e.target.value)}>
              {RARITIES.map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
          </Field>
          <Field label="Role">
            <select className={sel} data-testid="draft-role" value={draft.role} onChange={(e) => set("role", e.target.value)}>
              {ROLES.map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Lore"><textarea className={sel} rows={2} data-testid="draft-lore" value={draft.lore} onChange={(e) => set("lore", e.target.value)} /></Field>
        <div className="grid grid-cols-5 gap-2">
          {STAT_KEYS.map(({ k, label, icon: Icon, color }) => (
            <div key={k}>
              <span className="flex items-center gap-1 text-[10px] text-slate-500"><Icon className="w-3 h-3" style={{ color }} />{label}</span>
              <input className={`${sel} px-2 text-center`} type="number" data-testid={`draft-stat-${k}`} value={draft.base_stats[k]} onChange={(e) => setStat(k, e.target.value)} />
            </div>
          ))}
        </div>
        <button onClick={onSave} disabled={saving} data-testid="draft-save"
          className="w-full flex items-center justify-center gap-2 py-3 rounded-lg font-bold bg-emerald-500 text-[#05050A] disabled:opacity-60 hover:brightness-110 transition-all">
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} Save to Roster
        </button>
      </div>
    </div>
  );
}

/* ----------------------------- Art Studio ----------------------------- */
function ArtStudio({ catalog, onApplied }) {
  const [form, setForm] = useState({ name: "", description: "", element: "none", rarity: "SSR", style: "anime", pose: "", model: "pro" });
  const [busy, setBusy] = useState(false);
  const [describing, setDescribing] = useState(false);
  const [images, setImages] = useState([]);
  const [picked, setPicked] = useState(null); // selected image id
  const [target, setTarget] = useState(""); // hero template_id to apply to
  const [applying, setApplying] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const surprise = () => {
    setForm((f) => ({
      ...f,
      name: f.name.trim() || pick(SURPRISE_NAMES),
      element: pick(ELEMENTS),
      rarity: pick(RARITIES),
      style: pick(ART_STYLES),
      pose: pick(SURPRISE_POSES),
      description: "",
    }));
    toast.message("🎲 Surprised! Tweak it or hit Generate.");
  };

  const autoDescribe = async () => {
    if (!form.name.trim()) return toast.error("Enter a character name first");
    setDescribing(true);
    try {
      const { data } = await api.post("/admin/art/describe", {
        name: form.name.trim(), style: form.style,
        ...(form.element !== "none" && { element: form.element }),
        notes: form.pose.trim(),
      });
      set("description", data.description);
      toast.success("Description generated");
    } catch (e) {
      toast.error(formatApiErrorDetail(e?.response?.data?.detail) || "Auto-describe failed");
    } finally {
      setDescribing(false);
    }
  };

  const generate = async () => {
    if (!form.name.trim()) return toast.error("Enter a character name first");
    setBusy(true);
    setImages([]);
    setPicked(null);
    try {
      const { data } = await api.post("/admin/art/generate", {
        name: form.name.trim(), description: form.description.trim(), style: form.style,
        pose: form.pose.trim(), model: form.model, count: 4,
        ...(form.element !== "none" && { element: form.element }),
        ...(form.rarity !== "none" && { rarity: form.rarity }),
      });
      setImages(data.images);
      toast.success(`${data.images.length} variations ready`);
    } catch (e) {
      toast.error(formatApiErrorDetail(e?.response?.data?.detail) || "Generation failed");
    } finally {
      setBusy(false);
    }
  };

  const download = (img) => {
    const ext = img.data_url.startsWith("data:image/jpeg") ? "jpg" : "png";
    const a = document.createElement("a");
    a.href = img.data_url;
    a.download = `${form.name.trim().replace(/\s+/g, "_") || "art"}_${img.id + 1}.${ext}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const applyAsPortrait = async () => {
    const img = images.find((i) => i.id === picked);
    if (!img || !target) return;
    setApplying(true);
    try {
      await api.post("/admin/hero/portrait", { template_id: target, image: img.data_url });
      await onApplied();
      toast.success(`Applied to ${catalog.find((c) => c.id === target)?.name}`);
    } catch (e) {
      toast.error(formatApiErrorDetail(e?.response?.data?.detail) || "Apply failed");
    } finally {
      setApplying(false);
    }
  };

  const sortedHeroes = useMemo(() => [...catalog].sort((a, b) => a.name.localeCompare(b.name)), [catalog]);

  return (
    <div className="grid lg:grid-cols-[380px_1fr] gap-6">
      {/* Form */}
      <div className="rounded-xl border border-black/10 bg-[#FFFFFF] p-5 space-y-4 self-start" data-testid="art-form">
        <Field label="Character Name">
          <input className={sel} data-testid="art-name" value={form.name} maxLength={60}
            onChange={(e) => set("name", e.target.value)} placeholder="e.g. Raiden Kage" />
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Element">
            <select className={sel} data-testid="art-element" value={form.element} onChange={(e) => set("element", e.target.value)}>
              <option value="none">None</option>
              {ELEMENTS.map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
          </Field>
          <Field label="Rarity">
            <select className={sel} data-testid="art-rarity" value={form.rarity} onChange={(e) => set("rarity", e.target.value)}>
              <option value="none">None</option>
              {RARITIES.map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
          </Field>
          <Field label="Art Style">
            <select className={sel} data-testid="art-style" value={form.style} onChange={(e) => set("style", e.target.value)}>
              {ART_STYLES.map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
          </Field>
        </div>
        <p className="text-[11px] text-slate-500 -mt-1">Higher rarity = more ornate, detailed and effect-heavy art (R → LR).</p>
        <div>
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-widest text-slate-500">Description / Details</span>
            <button onClick={autoDescribe} disabled={describing} data-testid="art-autodescribe"
              className="flex items-center gap-1 text-xs text-jutsu hover:text-fox disabled:opacity-50 transition-colors">
              {describing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />} Auto-describe
            </button>
          </div>
          <textarea className={`${sel} mt-1`} rows={5} data-testid="art-description" value={form.description} maxLength={600}
            onChange={(e) => set("description", e.target.value)} placeholder="Describe appearance, outfit, colors, weapon… or click Auto-describe." />
        </div>
        <Field label="Pose / Scene notes (optional)">
          <input className={sel} data-testid="art-pose" value={form.pose} maxLength={200}
            onChange={(e) => set("pose", e.target.value)} placeholder="e.g. mid-leap, lightning crackling around twin blades" />
        </Field>
        <div>
          <span className="text-xs uppercase tracking-widest text-slate-500">Quality</span>
          <div className="grid grid-cols-2 gap-2 mt-1">
            {[["pro", "Pro · Highest"], ["flash", "Fast · Standard"]].map(([id, lbl]) => (
              <button key={id} data-testid={`art-model-${id}`} onClick={() => set("model", id)}
                className={`py-2 rounded-lg text-sm font-bold border transition-all ${form.model === id ? "bg-jutsu/20 border-jutsu text-jutsu" : "border-black/10 text-slate-500 hover:bg-black/5"}`}>
                {lbl}
              </button>
            ))}
          </div>
        </div>
        <button onClick={surprise} data-testid="art-surprise"
          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg font-semibold bg-black/[0.04] text-slate-700 border border-black/10 hover:bg-black/10 transition-all">
          <Shuffle className="w-4 h-4" /> Surprise Me
        </button>
        <button onClick={generate} disabled={busy} data-testid="art-generate"
          className="w-full flex items-center justify-center gap-2 py-3 rounded-lg font-bold bg-gradient-to-r from-jutsu to-fox text-ink disabled:opacity-60 hover:brightness-110 transition-all">
          {busy ? <><Loader2 className="w-5 h-5 animate-spin" /> Painting 4 variations…</> : <><Brush className="w-5 h-5" /> Generate Art (4)</>}
        </button>
        <p className="text-[11px] text-slate-500 text-center">Generates 4 high-quality 3:4 portraits. Pro uses more Universal Key credits.</p>
      </div>

      {/* Results */}
      <div className="rounded-xl border border-black/10 bg-[#FFFFFF] p-5" data-testid="art-results">
        {!images.length && !busy && (
          <div className="h-full min-h-[420px] flex flex-col items-center justify-center text-slate-600 gap-3">
            <ImagePlus className="w-12 h-12" />
            <p>Generated art variations will appear here</p>
          </div>
        )}
        {busy && (
          <div className="h-full min-h-[420px] flex flex-col items-center justify-center text-slate-500 gap-3">
            <Loader2 className="w-10 h-10 animate-spin text-jutsu" />
            <p>Conjuring 4 variations… this can take up to a minute</p>
          </div>
        )}
        {!!images.length && (
          <>
            <div className="grid grid-cols-2 gap-4">
              {images.map((img) => (
                <div key={img.id} data-testid={`art-image-${img.id}`}
                  className={`relative rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${picked === img.id ? "border-chakra glow-cyan" : "border-black/10 hover:border-white/30"}`}
                  onClick={() => setPicked(img.id)}>
                  <img src={img.data_url} alt={`variation ${img.id + 1}`} className="w-full aspect-[3/4] object-cover" />
                  {img.scene && (
                    <span className="absolute top-2 right-2 max-w-[70%] truncate px-2 py-1 rounded bg-black/65 text-[10px] text-slate-700" data-testid={`art-scene-${img.id}`}>
                      {img.scene}
                    </span>
                  )}
                  {picked === img.id && (
                    <span className="absolute top-2 left-2 w-6 h-6 rounded-full bg-chakra text-[#05050A] flex items-center justify-center"><Check className="w-4 h-4" /></span>
                  )}
                  <button onClick={(e) => { e.stopPropagation(); download(img); }} data-testid={`art-download-${img.id}`}
                    className="absolute bottom-2 right-2 flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-black/70 text-ink text-xs font-semibold hover:bg-black/90 transition-colors">
                    <Download className="w-3.5 h-3.5" /> Download
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-5 p-4 rounded-lg bg-black/30 border border-black/10">
              <p className="text-xs uppercase tracking-widest text-slate-500 mb-2">Use selected art as a hero portrait</p>
              <div className="flex flex-wrap items-center gap-3">
                <select className={`${sel} mt-0 flex-1 min-w-[180px]`} data-testid="art-apply-target" value={target} onChange={(e) => setTarget(e.target.value)}>
                  <option value="">Choose a hero…</option>
                  {sortedHeroes.map((h) => <option key={h.id} value={h.id}>{h.name} ({h.rarity})</option>)}
                </select>
                <button onClick={applyAsPortrait} disabled={picked === null || !target || applying} data-testid="art-apply-btn"
                  className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-bold bg-emerald-500 text-[#05050A] disabled:opacity-50 hover:brightness-110 transition-all">
                  {applying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Apply as Portrait
                </button>
              </div>
              {picked === null && <p className="text-[11px] text-slate-500 mt-2">Select a variation above first.</p>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ----------------------------- Manage Heroes ----------------------------- */
function Manage({ catalog, banner, onChanged }) {
  const [selectedId, setSelectedId] = useState(null);
  const sorted = useMemo(
    () => [...catalog].sort((a, b) => RARITIES.indexOf(b.rarity) - RARITIES.indexOf(a.rarity) || a.name.localeCompare(b.name)),
    [catalog]
  );
  const selected = selectedId ? catalog.find((c) => c.id === selectedId) : null;

  const clearBanner = async () => {
    try {
      await api.delete("/admin/banner");
      await onChanged();
      toast.success("Rate-up banner cleared");
    } catch (e) {
      toast.error(formatApiErrorDetail(e?.response?.data?.detail) || "Failed");
    }
  };

  return (
    <div className="grid lg:grid-cols-[1fr_360px] gap-6">
      <div>
        <div className="flex items-center justify-between gap-3 mb-3 p-3 rounded-lg bg-jutsu/10 border border-jutsu/30" data-testid="banner-status">
          <span className="flex items-center gap-2 text-sm text-slate-700">
            <Star className="w-4 h-4 text-jutsu" />
            {banner ? <>Featured on Summon: <b className="text-ink">{banner.name}</b> <span className="text-jutsu">({banner.rarity}, {Math.round(banner.rate_up_chance * 100)}% rate-up)</span></> : <span className="text-slate-500">No rate-up banner active. Select an SSR+ hero to feature.</span>}
          </span>
          {banner && <button onClick={clearBanner} data-testid="clear-banner-btn" className="text-xs font-semibold text-fox hover:text-fox/80">Clear</button>}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 content-start" data-testid="manage-grid">
          {sorted.map((c) => (
            <div key={c.id} className="relative">
              <NinjaCard ninja={c} testid={`manage-card-${c.id}`} selected={c.id === selectedId} onClick={() => setSelectedId(c.id)} />
              {c.is_custom && (
                <span className="absolute -top-1.5 -right-1.5 z-10 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-fox text-ink" data-testid={`custom-tag-${c.id}`}>CUSTOM</span>
              )}
              {banner?.template_id === c.id && (
                <span className="absolute -top-1.5 -left-1.5 z-10 flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-jutsu text-ink"><Star className="w-2.5 h-2.5" /></span>
              )}
            </div>
          ))}
        </div>
      </div>
      <div>
        {selected
          ? <HeroManager key={selected.id} hero={selected} banner={banner} onChanged={onChanged} onDeleted={() => { setSelectedId(null); onChanged(); }} />
          : <div className="rounded-xl border border-black/10 bg-[#FFFFFF] p-8 text-center text-slate-600 sticky top-24" data-testid="manage-empty">Select a hero to manage their portrait{`,`} stats &amp; more.</div>}
      </div>
    </div>
  );
}

function HeroManager({ hero, banner, onChanged, onDeleted }) {
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ ...hero });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setStat = (k, v) => setForm((f) => ({ ...f, base_stats: { ...f.base_stats, [k]: Number(v) || 0 } }));
  const isFeatured = banner?.template_id === hero.id;
  const canFeature = RARITIES.indexOf(hero.rarity) >= 2; // SSR+

  const toggleFeature = async () => {
    setBusy(true);
    try {
      if (isFeatured) {
        await api.delete("/admin/banner");
        toast.success("Removed from Summon banner");
      } else {
        await api.post("/admin/banner", { template_id: hero.id });
        toast.success(`${hero.name} is now the featured summon!`);
      }
      await onChanged();
    } catch (err) {
      toast.error(formatApiErrorDetail(err?.response?.data?.detail) || "Failed");
    } finally {
      setBusy(false);
    }
  };

  const uploadPortrait = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const image = await fileToDataUrl(file);
      await api.post("/admin/hero/portrait", { template_id: hero.id, image });
      await onChanged();
      toast.success("Portrait updated!");
    } catch (err) {
      toast.error(formatApiErrorDetail(err?.response?.data?.detail) || "Upload failed");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const saveEdits = async () => {
    setBusy(true);
    try {
      await api.post("/admin/hero/save", {
        id: hero.id, name: form.name, title: form.title, element: form.element,
        rarity: form.rarity, role: form.role, lore: form.lore, base_stats: form.base_stats, portrait: hero.portrait,
      });
      await onChanged();
      toast.success("Hero updated!");
    } catch (err) {
      toast.error(formatApiErrorDetail(err?.response?.data?.detail) || "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(`Delete ${hero.name}? This cannot be undone.`)) return;
    setBusy(true);
    try {
      await api.delete(`/admin/hero/${hero.id}`);
      toast.success(`${hero.name} removed`);
      onDeleted();
    } catch (err) {
      toast.error(formatApiErrorDetail(err?.response?.data?.detail) || "Delete failed");
      setBusy(false);
    }
  };

  const resetPortrait = async () => {
    setBusy(true);
    try {
      await api.delete(`/admin/hero/${hero.id}/portrait`);
      await onChanged();
      toast.success("Restored original art");
    } catch (err) {
      toast.error(formatApiErrorDetail(err?.response?.data?.detail) || "Reset failed");
    } finally {
      setBusy(false);
    }
  };

  const hasOverride = !hero.is_custom && (hero.portrait || "").includes("/custom/");

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-black/10 bg-[#FFFFFF] overflow-hidden sticky top-24" data-testid="hero-manager">
      <div className="relative h-[260px]">
        <img src={hero.portrait} alt={hero.name} className="w-full h-full object-cover object-top" data-testid="manager-portrait" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#FFFFFF] to-transparent" />
        <div className="absolute bottom-3 left-4 right-4">
          <h3 className="font-display text-3xl text-ink leading-none">{hero.name}</h3>
          <p className="text-xs text-chakra italic">{hero.title}</p>
        </div>
      </div>
      <div className="p-4 space-y-3">
        <input ref={fileRef} type="file" accept="image/*" className="hidden" data-testid="portrait-file-input" onChange={uploadPortrait} />
        <button onClick={() => fileRef.current?.click()} disabled={busy} data-testid="upload-portrait-btn"
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-semibold bg-chakra/15 text-chakra border border-chakra/30 hover:bg-chakra/25 disabled:opacity-60 transition-all">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} Replace Portrait
        </button>

        {hasOverride && (
          <button onClick={resetPortrait} disabled={busy} data-testid="reset-portrait-btn"
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg font-semibold bg-black/[0.04] text-slate-600 border border-black/10 hover:bg-black/10 disabled:opacity-60 transition-all">
            <Trash2 className="w-4 h-4" /> Reset to Original Art
          </button>
        )}

        {canFeature && (
          <button onClick={toggleFeature} disabled={busy} data-testid="feature-banner-btn"
            className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-bold border transition-all disabled:opacity-60 ${isFeatured ? "bg-jutsu text-ink border-jutsu" : "bg-jutsu/15 text-jutsu border-jutsu/40 hover:bg-jutsu/25"}`}>
            <Star className="w-4 h-4" /> {isFeatured ? "Featured ★ — Remove from Banner" : "Feature on Summon (Rate-Up)"}
          </button>
        )}

        {hero.is_custom ? (
          <>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Name"><input className={sel} data-testid="mgr-name" value={form.name} onChange={(e) => set("name", e.target.value)} /></Field>
              <Field label="Title"><input className={sel} data-testid="mgr-title" value={form.title} onChange={(e) => set("title", e.target.value)} /></Field>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Field label="Element">
                <select className={sel} data-testid="mgr-element" value={form.element} onChange={(e) => set("element", e.target.value)}>
                  {ELEMENTS.map((x) => <option key={x} value={x}>{x}</option>)}
                </select>
              </Field>
              <Field label="Rarity">
                <select className={sel} data-testid="mgr-rarity" value={form.rarity} onChange={(e) => set("rarity", e.target.value)}>
                  {RARITIES.map((x) => <option key={x} value={x}>{x}</option>)}
                </select>
              </Field>
              <Field label="Role">
                <select className={sel} data-testid="mgr-role" value={form.role} onChange={(e) => set("role", e.target.value)}>
                  {ROLES.map((x) => <option key={x} value={x}>{x}</option>)}
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {STAT_KEYS.map(({ k, label, color }) => (
                <div key={k}>
                  <span className="text-[10px] text-slate-500" style={{ color }}>{label}</span>
                  <input className={`${sel} px-1 text-center`} type="number" data-testid={`mgr-stat-${k}`} value={form.base_stats[k]} onChange={(e) => setStat(k, e.target.value)} />
                </div>
              ))}
            </div>
            <button onClick={saveEdits} disabled={busy} data-testid="mgr-save"
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-bold bg-emerald-500 text-[#05050A] disabled:opacity-60 hover:brightness-110 transition-all">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Changes
            </button>
            <button onClick={remove} disabled={busy} data-testid="mgr-delete"
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg font-semibold bg-fox/10 text-fox border border-fox/30 hover:bg-fox/20 disabled:opacity-60 transition-all">
              <Trash2 className="w-4 h-4" /> Delete Hero
            </button>
          </>
        ) : (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-black/30">
            <div className="grid grid-cols-5 gap-2 flex-1">
              {STAT_KEYS.map(({ k, label, color }) => (
                <div key={k} className="text-center">
                  <span className="block text-[10px]" style={{ color }}>{label}</span>
                  <span className="font-display text-base text-ink">{hero.base_stats[k]}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {!hero.is_custom && <p className="text-[11px] text-slate-500 text-center">Original hero — you can replace its portrait. Stats are fixed for game balance.</p>}
      </div>
    </motion.div>
  );
}


// ==========================================================================
// PLAYERS — search accounts and grant/set currencies, level, energy, mats.
// ==========================================================================
const GRANT_MONEY = [["ryo", "Ryo", "#FFCA28"], ["gems", "Gems", "#D500F9"], ["energy", "Energy", "#00E676"], ["level", "Level", "#00E5FF"]];
const GRANT_MATS = [["summon_ticket", "Summon Tix"], ["gear_ticket", "Gear Tix"], ["ascension_crystal", "Crystals"], ["evo_stone", "Evo Stones"], ["gold_dust", "Gold Dust"]];

function Players() {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState([]);
  const [sel, setSel] = useState(null);
  const [mode, setMode] = useState("add");
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);

  const search = async () => {
    setBusy(true);
    try { const { data } = await api.get(`/admin/players?q=${encodeURIComponent(q)}`); setRows(data.players); }
    catch (e) { toast.error(formatApiErrorDetail(e.response?.data?.detail) || e.message); }
    finally { setBusy(false); }
  };
  useMemo(() => { search(); /* initial */ }, []); // eslint-disable-line

  const grant = async () => {
    if (!sel) return;
    const payload = { user_id: sel.id, mode };
    Object.entries(form).forEach(([k, v]) => { if (v !== "" && v != null) payload[k] = Number(v); });
    setBusy(true);
    try {
      const { data } = await api.post("/admin/player/grant", payload);
      toast.success(`Updated ${data.player.name}`);
      setForm({});
      setRows((rs) => rs.map((r) => r.id === sel.id ? { ...r, ...data.player } : r));
      setSel((s) => ({ ...s, ...data.player }));
    } catch (e) { toast.error(formatApiErrorDetail(e.response?.data?.detail) || e.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="grid lg:grid-cols-2 gap-5" data-testid="admin-players">
      {/* list */}
      <div className="glass-panel p-4">
        <div className="flex gap-2 mb-3">
          <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && search()}
            placeholder="Search name or email…" data-testid="players-search"
            className="flex-1 bg-black/40 border border-black/10 rounded-lg px-3 py-2 text-sm text-ink outline-none focus:border-chakra" />
          <button onClick={search} disabled={busy} data-testid="players-search-btn" className="px-4 rounded-lg bg-chakra text-[#05050A] font-bold text-sm">Search</button>
        </div>
        <div className="space-y-1.5 max-h-[60vh] overflow-y-auto scrollbar-none">
          {rows.map((p) => (
            <button key={p.id} onClick={() => setSel(p)} data-testid={`player-row-${p.id}`}
              className={`w-full text-left px-3 py-2 rounded-lg border transition-colors ${sel?.id === p.id ? "bg-chakra/15 border-chakra/50" : "bg-black/[0.04] border-black/10 hover:bg-black/[0.05]"}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-ink truncate">{p.name} {p.role === "admin" && <span className="text-[10px] text-fox">ADMIN</span>}</span>
                <span className="text-xs text-slate-500">Lv.{p.level}</span>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-0.5">
                <span className="text-amber-300">{p.ryo?.toLocaleString()} ryo</span>
                <span className="text-jutsu">{p.gems} gems</span>
                <span>{p.heroes} heroes</span>
              </div>
            </button>
          ))}
          {rows.length === 0 && <p className="text-sm text-slate-500 text-center py-6">No players found.</p>}
        </div>
      </div>

      {/* grant panel */}
      <div className="glass-panel p-4">
        {!sel ? (
          <p className="text-slate-500 text-sm text-center py-16">Select a player to edit their account.</p>
        ) : (
          <>
            <h3 className="font-display text-2xl text-ink mb-1">{sel.name}</h3>
            <p className="text-xs text-slate-500 mb-4">{sel.email}</p>
            <div className="flex gap-2 mb-4">
              {["add", "set"].map((m) => (
                <button key={m} onClick={() => setMode(m)} data-testid={`grant-mode-${m}`}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold ${mode === m ? "bg-chakra text-[#05050A]" : "bg-black/[0.04] text-slate-600"}`}>
                  {m === "add" ? "ADD (+/-)" : "SET (=)"}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              {GRANT_MONEY.map(([k, lbl, c]) => (
                <label key={k} className="block">
                  <span className="text-[10px] uppercase tracking-widest" style={{ color: c }}>{lbl}</span>
                  <input type="number" value={form[k] ?? ""} onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))}
                    data-testid={`grant-${k}`} placeholder={mode === "add" ? "+/-" : "="}
                    className="w-full bg-black/40 border border-black/10 rounded-lg px-3 py-2 text-sm text-ink outline-none focus:border-chakra" />
                </label>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2 mt-3">
              {GRANT_MATS.map(([k, lbl]) => (
                <label key={k} className="block">
                  <span className="text-[10px] uppercase tracking-widest text-slate-500">{lbl}</span>
                  <input type="number" value={form[k] ?? ""} onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))}
                    data-testid={`grant-${k}`} placeholder={mode === "add" ? "+/-" : "="}
                    className="w-full bg-black/40 border border-black/10 rounded-lg px-2 py-1.5 text-sm text-ink outline-none focus:border-chakra" />
                </label>
              ))}
            </div>
            <button onClick={grant} disabled={busy} data-testid="grant-apply"
              className="w-full mt-5 py-3 rounded-xl bg-fox text-ink font-display text-lg tracking-wide disabled:opacity-50">
              {busy ? "APPLYING…" : `APPLY ${mode.toUpperCase()}`}
            </button>
            <div className="mt-4 text-xs text-slate-500 grid grid-cols-2 gap-1">
              <span className="text-amber-300">Ryo: {sel.ryo?.toLocaleString()}</span>
              <span className="text-jutsu">Gems: {sel.gems}</span>
              <span>Energy: {sel.energy}</span>
              <span>Level: {sel.level}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ==========================================================================
// ECONOMY — live global knobs (costs, pity, rate-up). Applies instantly.
// ==========================================================================
const ECON_FIELDS = [
  ["summon_cost", "Ryo Summon Cost"], ["gem_summon_cost", "Gem Summon Cost"],
  ["gear_summon_gem_cost", "Gear Summon (Gems)"], ["gem_energy_refill_per_point", "Energy Refill / pt (Gems)"],
  ["gem_energy_refill_min", "Energy Refill Min (Gems)"], ["pity_soft_start", "GR Soft Pity Start"],
  ["pity_hard", "GR Hard Pity"], ["featured_5050", "Featured 50/50 (0-1)"], ["featured_rate_mult", "Rate-Up Multiplier"],
];

function Economy() {
  const [econ, setEcon] = useState(null);
  const [rates, setRates] = useState({});
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try { const { data } = await api.get("/admin/economy"); setEcon(data.economy); setRates(data.summon_rates || {}); setForm(data.economy); }
    catch (e) { toast.error(formatApiErrorDetail(e.response?.data?.detail) || e.message); }
  };
  useMemo(() => { load(); }, []); // eslint-disable-line

  const save = async () => {
    setBusy(true);
    try {
      const payload = {}; Object.entries(form).forEach(([k, v]) => payload[k] = Number(v));
      const { data } = await api.post("/admin/economy", payload);
      setEcon(data.economy); setRates(data.summon_rates || rates); setForm(data.economy);
      toast.success("Economy updated live!");
    } catch (e) { toast.error(formatApiErrorDetail(e.response?.data?.detail) || e.message); }
    finally { setBusy(false); }
  };

  if (!econ) return <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 text-chakra animate-spin" /></div>;

  return (
    <div className="grid lg:grid-cols-3 gap-5" data-testid="admin-economy">
      <div className="glass-panel p-4 lg:col-span-2">
        <h3 className="font-display text-2xl text-ink mb-1">GLOBAL ECONOMY</h3>
        <p className="text-xs text-slate-500 mb-4">Changes apply instantly to every player and persist across restarts.</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {ECON_FIELDS.map(([k, lbl]) => (
            <label key={k} className="block">
              <span className="text-[10px] uppercase tracking-widest text-slate-500">{lbl}</span>
              <input type="number" step={k === "featured_5050" || k === "featured_rate_mult" ? "0.1" : "1"}
                value={form[k] ?? ""} onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))}
                data-testid={`econ-${k}`}
                className="w-full bg-black/40 border border-black/10 rounded-lg px-3 py-2 text-sm text-ink outline-none focus:border-chakra" />
            </label>
          ))}
        </div>
        <button onClick={save} disabled={busy} data-testid="econ-save"
          className="w-full mt-5 py-3 rounded-xl bg-chakra text-[#05050A] font-display text-lg tracking-wide disabled:opacity-50">
          {busy ? "SAVING…" : "SAVE ECONOMY"}
        </button>
      </div>
      <div className="glass-panel p-4">
        <h4 className="font-display text-lg text-ink mb-2">Live Gem Rates</h4>
        <div className="space-y-1.5">
          {Object.entries(rates).map(([r, pct]) => (
            <div key={r} className="flex items-center justify-between text-sm">
              <span className="font-bold" style={{ color: (RARITY[r] || RARITY.R).color }}>{r}</span>
              <span className="text-ink tabular-nums">{pct}%</span>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-slate-500 mt-3">Rates derive from the catalog composition; pity/costs above tune the live economy.</p>
      </div>
    </div>
  );
}
