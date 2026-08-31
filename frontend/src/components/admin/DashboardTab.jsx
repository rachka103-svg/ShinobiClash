import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Save, Loader2, X, Search } from "lucide-react";
import { NinjaCard } from "@/components/NinjaCard";
import { RARITY, ELEMENT } from "@/lib/styles";
import api, { formatApiErrorDetail } from "@/lib/api";

const ELEMENTS = ["Fire", "Water", "Wind", "Earth", "Lightning", "Dark", "Light"];
const RARITIES = ["R", "SR", "SSR", "UR", "GR"];

const sel = "w-full bg-black/40 border border-black/10 rounded-lg px-3 py-2 text-sm text-ink focus:outline-none focus:border-chakra";

export default function DashboardTab({ catalog, onChanged }) {
  const [editing, setEditing] = useState(null); // hero being edited
  const [query, setQuery] = useState("");
  const [rarityFilter, setRarityFilter] = useState("all");
  const [elementFilter, setElementFilter] = useState("all");

  const sorted = useMemo(() => {
    let rows = [...catalog];
    if (query.trim()) {
      const q = query.toLowerCase();
      rows = rows.filter((c) => c.name.toLowerCase().includes(q) || c.role?.toLowerCase().includes(q));
    }
    if (rarityFilter !== "all") rows = rows.filter((c) => c.rarity === rarityFilter);
    if (elementFilter !== "all") rows = rows.filter((c) => c.element === elementFilter);
    return rows.sort((a, b) => RARITIES.indexOf(b.rarity) - RARITIES.indexOf(a.rarity) || a.name.localeCompare(b.name));
  }, [catalog, query, rarityFilter, elementFilter]);

  return (
    <div data-testid="admin-dashboard">
      {/* Filter bar */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            className={`${sel} pl-9`}
            placeholder="Search heroes by name or role…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            data-testid="dashboard-search"
          />
        </div>
        <select className={`${sel} w-auto`} value={rarityFilter} onChange={(e) => setRarityFilter(e.target.value)} data-testid="dashboard-rarity-filter">
          <option value="all">All Rarities</option>
          {RARITIES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <select className={`${sel} w-auto`} value={elementFilter} onChange={(e) => setElementFilter(e.target.value)} data-testid="dashboard-element-filter">
          <option value="all">All Elements</option>
          {ELEMENTS.map((el) => <option key={el} value={el}>{el}</option>)}
        </select>
        <span className="text-sm text-slate-500 whitespace-nowrap">{sorted.length} heroes</span>
      </div>

      {/* Card grid — full width */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 content-start" data-testid="dashboard-grid">
        {sorted.map((c) => (
          <NinjaCard
            key={c.id}
            ninja={c}
            testid={`dashboard-card-${c.id}`}
            onClick={() => setEditing(c)}
          />
        ))}
      </div>

      {/* Quick-edit modal */}
      <AnimatePresence>
        {editing && (
          <QuickEditModal
            key={editing.id}
            hero={editing}
            onClose={() => setEditing(null)}
            onSaved={() => { onChanged(); setEditing(null); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function QuickEditModal({ hero, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: hero.name,
    rarity: hero.rarity,
    element: hero.element,
    role: hero.role,
    title: hero.title || "",
    lore: hero.lore || "",
    base_stats: { ...hero.base_stats },
    jutsus: (hero.jutsus || []).map((j) => ({ ...j })),
  });
  const [busy, setBusy] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setJutsuPower = (i, v) => setForm((f) => {
    const jutsus = [...f.jutsus];
    jutsus[i] = { ...jutsus[i], power: Number(v) || 0 };
    return { ...f, jutsus };
  });

  const save = async () => {
    setBusy(true);
    try {
      await api.post("/admin/hero/edit", {
        id: hero.id,
        name: form.name,
        title: form.title,
        element: form.element,
        rarity: form.rarity,
        role: form.role,
        lore: form.lore,
        base_stats: form.base_stats,
        portrait: hero.portrait,
        jutsus: form.jutsus,
      });
      toast.success(`${form.name} updated!`);
      onSaved();
    } catch (e) {
      toast.error(formatApiErrorDetail(e?.response?.data?.detail) || "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const el = ELEMENT[hero.element] || {};
  const rarityColor = RARITY[hero.rarity]?.color || "#888";

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
      data-testid="quick-edit-overlay"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-[#FFFFFF] rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto"
        data-testid="quick-edit-modal"
      >
        {/* Header with portrait */}
        <div className="relative h-40 overflow-hidden rounded-t-2xl">
          <img src={hero.portrait} alt={hero.name} className="w-full h-full object-cover object-top" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#FFFFFF] via-transparent to-black/30" />
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
            data-testid="quick-edit-close"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="absolute bottom-2 left-4 right-4">
            <h2 className="font-display text-2xl text-white leading-none drop-shadow-lg">{hero.name}</h2>
            <p className="text-xs text-white/80 italic">{hero.title}</p>
          </div>
        </div>

        {/* Edit fields */}
        <div className="p-5 space-y-4">
          {/* Name */}
          <div>
            <label className="text-xs uppercase tracking-widest text-slate-500">Name</label>
            <input
              className={`${sel} mt-1`}
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              data-testid="quick-edit-name"
            />
          </div>

          {/* Rarity + Element */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs uppercase tracking-widest text-slate-500">Rarity</label>
              <select
                className={`${sel} mt-1`}
                value={form.rarity}
                onChange={(e) => set("rarity", e.target.value)}
                data-testid="quick-edit-rarity"
                style={{ borderColor: RARITY[form.rarity]?.color ? `${RARITY[form.rarity].color}66` : undefined }}
              >
                {RARITIES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-slate-500">Element</label>
              <select
                className={`${sel} mt-1`}
                value={form.element}
                onChange={(e) => set("element", e.target.value)}
                data-testid="quick-edit-element"
                style={{ borderColor: el.color ? `${el.color}66` : undefined }}
              >
                {ELEMENTS.map((el) => <option key={el} value={el}>{el}</option>)}
              </select>
            </div>
          </div>

          {/* Skill power */}
          <div>
            <label className="text-xs uppercase tracking-widest text-slate-500">Skill Power (% ATK)</label>
            <p className="text-[11px] text-slate-400 mb-2">Power is a percentage of ATK — 100 = 100% ATK damage, 200 = 200% ATK damage.</p>
            <div className="space-y-2">
              {form.jutsus.map((j, i) => (
                <div key={i} className="flex items-center gap-2 rounded-lg bg-black/[0.03] p-2" data-testid={`quick-edit-jutsu-${i}`}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-ink truncate">{j.name}</p>
                    <p className="text-[10px] text-slate-500">{j.type} · {j.element}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      className="w-20 bg-black/40 border border-black/10 rounded-lg px-2 py-1.5 text-sm text-ink text-center focus:outline-none focus:border-chakra"
                      value={j.power ?? 0}
                      onChange={(e) => setJutsuPower(i, e.target.value)}
                      data-testid={`quick-edit-jutsu-${i}-power`}
                    />
                    <span className="text-xs text-slate-400">%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Save */}
          <button
            onClick={save}
            disabled={busy}
            data-testid="quick-edit-save"
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold bg-emerald-500 text-[#05050A] disabled:opacity-60 hover:brightness-110 transition-all"
          >
            {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} Save Changes
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
