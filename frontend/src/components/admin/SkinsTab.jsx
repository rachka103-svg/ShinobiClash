import { useState, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Sparkles, Save, Trash2, Upload, Loader2, Plus, Star, Heart, Sword, Shield, Wind } from "lucide-react";
import { useGame } from "@/context/GameContext";
import { RARITY } from "@/lib/styles";
import api, { formatApiErrorDetail } from "@/lib/api";

const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });

const BONUS_KEYS = [
  { k: "hp_pct", label: "HP%", icon: Heart, color: "#FF1744" },
  { k: "atk_pct", label: "ATK%", icon: Sword, color: "#FF5722" },
  { k: "def_pct", label: "DEF%", icon: Shield, color: "#29B6F6" },
  { k: "spd_pct", label: "SPD%", icon: Wind, color: "#00E676" },
];

export default function SkinsTab() {
  const { catalog, skins, refreshCatalog } = useGame();
  const [selectedHero, setSelectedHero] = useState(null);
  const [busy, setBusy] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", image: "", stat_bonuses: {} });
  const fileRef = useRef(null);

  const sortedHeroes = useMemo(() =>
    [...catalog].sort((a, b) => RARITY[b.rarity]?.order - RARITY[a.rarity]?.order || a.name.localeCompare(b.name)),
    [catalog]
  );

  const heroSkins = selectedHero ? (skins[selectedHero] || []) : [];

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await fileToDataUrl(file);
      setForm((f) => ({ ...f, image: dataUrl }));
    } catch (err) {
      toast.error("Failed to read image");
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const saveSkin = async () => {
    if (!selectedHero) return toast.error("Select a hero first");
    if (!form.name.trim()) return toast.error("Skin name required");
    if (!form.image) return toast.error("Upload a skin image first");
    setBusy(true);
    try {
      await api.post("/admin/skin/save", {
        template_id: selectedHero,
        name: form.name.trim(),
        image: form.image,
        stat_bonuses: form.stat_bonuses,
      });
      await refreshCatalog();
      toast.success("Skin saved!");
      setForm({ name: "", image: "", stat_bonuses: {} });
      setShowForm(false);
    } catch (e) {
      toast.error(formatApiErrorDetail(e?.response?.data?.detail) || "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const deleteSkin = async (templateId, skinId) => {
    if (!window.confirm("Delete this skin?")) return;
    setBusy(true);
    try {
      await api.delete(`/admin/skin/${templateId}/${skinId}`);
      await refreshCatalog();
      toast.success("Skin deleted");
    } catch (e) {
      toast.error(formatApiErrorDetail(e?.response?.data?.detail) || "Delete failed");
    } finally {
      setBusy(false);
    }
  };

  const setBonus = (k, v) => {
    setForm((f) => ({
      ...f,
      stat_bonuses: { ...f.stat_bonuses, [k]: v === "" ? undefined : Number(v) },
    }));
  };

  return (
    <div className="grid lg:grid-cols-[1fr_360px] gap-5" data-testid="admin-skins">
      {/* Left: hero grid + skins */}
      <div>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 mb-4 max-h-[50vh] overflow-y-auto scrollbar-none" data-testid="skin-hero-grid">
          {sortedHeroes.map((h) => {
            const count = skins[h.id]?.length || 0;
            return (
              <button
                key={h.id}
                onClick={() => { setSelectedHero(h.id); setShowForm(false); }}
                data-testid={`skin-hero-${h.id}`}
                className={`relative rounded-lg overflow-hidden border-2 transition-all ${selectedHero === h.id ? "border-chakra ring-1 ring-chakra/40" : "border-black/10 hover:border-white/30"}`}
              >
                <img src={h.portrait} alt={h.name} className="w-full aspect-[3/4] object-cover object-top" />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-1.5">
                  <p className="text-[9px] font-bold text-white truncate">{h.name}</p>
                  <p className="text-[8px]" style={{ color: RARITY[h.rarity]?.color }}>{h.rarity}</p>
                </div>
                {count > 0 && (
                  <span className="absolute top-1 right-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-jutsu text-white" data-testid={`skin-count-${h.id}`}>{count}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Skins for selected hero */}
        {selectedHero && (
          <div className="rounded-xl border border-black/10 bg-[#FFFFFF] p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display text-xl text-ink">
                Skins for {catalog.find((h) => h.id === selectedHero)?.name}
              </h3>
              <button
                onClick={() => setShowForm(!showForm)}
                data-testid="add-skin-btn"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold bg-jutsu/15 text-jutsu border border-jutsu/30 hover:bg-jutsu/25 transition-colors"
              >
                <Plus className="w-4 h-4" /> Add Skin
              </button>
            </div>

            {showForm && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mb-4 rounded-lg border border-black/10 bg-black/[0.02] p-3 space-y-3" data-testid="skin-form">
                <div className="flex gap-3">
                  <div className="shrink-0">
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" data-testid="skin-file-input" onChange={handleUpload} />
                    <button
                      onClick={() => fileRef.current?.click()}
                      data-testid="skin-upload-btn"
                      className="w-24 h-32 rounded-lg border-2 border-dashed border-black/20 flex items-center justify-center overflow-hidden hover:border-chakra transition-colors"
                    >
                      {form.image ? (
                        <img src={form.image} alt="preview" className="w-full h-full object-cover" />
                      ) : (
                        <Upload className="w-6 h-6 text-slate-400" />
                      )}
                    </button>
                  </div>
                  <div className="flex-1 space-y-2">
                    <label className="block">
                      <span className="text-xs uppercase tracking-widest text-slate-500">Skin Name</span>
                      <input
                        className="mt-1 w-full bg-black/40 border border-black/10 rounded px-3 py-2 text-sm text-ink focus:outline-none focus:border-chakra"
                        value={form.name}
                        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                        placeholder="e.g. Inferno Armor"
                        data-testid="skin-name-input"
                      />
                    </label>
                    <div>
                      <span className="text-xs uppercase tracking-widest text-slate-500">Stat Bonuses (optional)</span>
                      <div className="grid grid-cols-4 gap-2 mt-1">
                        {BONUS_KEYS.map(({ k, label, icon: Icon, color }) => (
                          <label key={k} className="block">
                            <span className="flex items-center gap-0.5 text-[10px] text-slate-500"><Icon className="w-3 h-3" style={{ color }} />{label}</span>
                            <input
                              type="number"
                              className="w-full bg-black/40 border border-black/10 rounded px-2 py-1.5 text-sm text-ink text-center focus:outline-none focus:border-chakra"
                              value={form.stat_bonuses[k] ?? ""}
                              onChange={(e) => setBonus(k, e.target.value)}
                              placeholder="0"
                              data-testid={`skin-bonus-${k}`}
                            />
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <button
                  onClick={saveSkin}
                  disabled={busy}
                  data-testid="skin-save-btn"
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-bold bg-emerald-500 text-[#05050A] disabled:opacity-60 hover:brightness-110 transition-all"
                >
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Skin
                </button>
              </motion.div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {heroSkins.map((s) => (
                <div key={s.id} className="relative rounded-lg overflow-hidden border border-black/10" data-testid={`skin-card-${s.id}`}>
                  <img src={s.image} alt={s.name} className="w-full aspect-[3/4] object-cover" />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-2">
                    <p className="text-xs font-bold text-white truncate">{s.name}</p>
                    {Object.keys(s.stat_bonuses || {}).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {Object.entries(s.stat_bonuses).map(([k, v]) => (
                          <span key={k} className="text-[8px] font-bold px-1 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30">
                            +{v}% {k.replace("_pct", "").toUpperCase()}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => deleteSkin(selectedHero, s.id)}
                    data-testid={`skin-delete-${s.id}`}
                    className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-black/70 flex items-center justify-center text-fox hover:bg-black/90 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {heroSkins.length === 0 && !showForm && (
                <p className="col-span-full text-sm text-slate-500 text-center py-6">No skins yet. Click "Add Skin" to create one.</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Right: info panel */}
      <div className="rounded-xl border border-black/10 bg-[#FFFFFF] p-4 sticky top-24">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-5 h-5 text-jutsu" />
          <h3 className="font-display text-xl text-ink">Skin System</h3>
        </div>
        <p className="text-sm text-slate-500 leading-relaxed">
          Skins let you give heroes a new visual look. Upload an image, name it, and optionally add stat bonuses (e.g. +5% ATK).
          Players can select skins from a hero's detail page — the card portrait swaps and stat bonuses apply in battle.
        </p>
        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Star className="w-3.5 h-3.5 text-amber-300" />
            <span>Select a hero → Add Skin → Upload image → Set bonuses → Save</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Upload className="w-3.5 h-3.5 text-chakra" />
            <span>Images are stored as data URLs in the game config</span>
          </div>
        </div>
      </div>
    </div>
  );
}
