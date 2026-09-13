import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Heart, Sword, Shield, Wind, Zap, Save, Loader2, Skull, Castle, Moon, Search } from "lucide-react";
import { RARITY, ELEMENT } from "@/lib/styles";
import api, { formatApiErrorDetail } from "@/lib/api";

const STAT_KEYS = [
  { k: "hp", label: "HP", icon: Heart, color: "#FF1744" },
  { k: "atk", label: "ATK", icon: Sword, color: "#FF5722" },
  { k: "def", label: "DEF", icon: Shield, color: "#29B6F6" },
  { k: "spd", label: "SPD", icon: Wind, color: "#00E676" },
  { k: "chakra", label: "CK", icon: Zap, color: "#00E5FF" },
];

const MODE_TABS = [
  { id: "nightmare", label: "Nightmare Bosses", icon: Skull, color: "#FF1744" },
  { id: "tsukuyomi", label: "Tsukuyomi", icon: Moon, color: "#7C4DFF" },
  { id: "boss_hunt", label: "Boss Hunt", icon: Castle, color: "#FF5722" },
];

export default function EnemyManagerTab() {
  const [data, setData] = useState(null);
  const [mode, setMode] = useState("nightmare");
  const [selected, setSelected] = useState(null);
  const [editStats, setEditStats] = useState(null);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");

  const load = async () => {
    try {
      const { data: d } = await api.get("/admin/enemies");
      setData(d);
    } catch (e) {
      toast.error(formatApiErrorDetail(e?.response?.data?.detail) || "Failed to load enemies");
    }
  };
  useMemo(() => { load(); }, []); // eslint-disable-line

  const enemies = data ? (data[mode === "nightmare" ? "nightmare_bosses" : mode === "tsukuyomi" ? "tsukuyomi_bosses" : "boss_hunt_bosses"] || []) : [];
  const filtered = search ? enemies.filter((e) => e.name.toLowerCase().includes(search.toLowerCase())) : enemies;

  const selectEnemy = (e) => {
    setSelected(e);
    setEditStats({ ...e.base_stats } || {});
  };

  const setStat = (k, v) => setEditStats((s) => ({ ...s, [k]: Number(v) || 0 }));

  const saveStats = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      const templateId = selected.template_id || selected.id;
      await api.put(`/admin/enemy/${templateId}`, { base_stats: editStats });
      toast.success("Enemy stats updated!");
      await load();
    } catch (e) {
      toast.error(formatApiErrorDetail(e?.response?.data?.detail) || "Save failed");
    } finally {
      setBusy(false);
    }
  };

  if (!data) return <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 text-chakra animate-spin" /></div>;

  return (
    <div data-testid="admin-enemy-manager">
      {/* Mode tabs */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {MODE_TABS.map(({ id, label, icon: Icon, color }) => (
          <button
            key={id}
            onClick={() => { setMode(id); setSelected(null); }}
            data-testid={`enemy-mode-${id}`}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all ${mode === id ? "text-white" : "text-slate-600 bg-black/[0.04] hover:bg-black/10"}`}
            style={mode === id ? { background: color } : {}}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-[1fr_380px] gap-5">
        {/* Enemy grid */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Search className="w-4 h-4 text-slate-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search enemies…"
              data-testid="enemy-search"
              className="flex-1 bg-black/40 border border-black/10 rounded-lg px-3 py-2 text-sm text-ink outline-none focus:border-chakra"
            />
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-[60vh] overflow-y-auto scrollbar-none" data-testid="enemy-grid">
            {filtered.map((e) => {
              const rarity = RARITY[e.rarity] || RARITY.R;
              const isSelected = selected?.id === e.id;
              return (
                <button
                  key={e.id}
                  onClick={() => selectEnemy(e)}
                  data-testid={`enemy-card-${e.id}`}
                  className={`relative rounded-lg overflow-hidden border-2 transition-all ${isSelected ? "border-fox ring-1 ring-fox/40" : "border-black/10 hover:border-white/30"}`}
                >
                  <div className="w-full aspect-[3/4] flex items-center justify-center" style={{ background: `linear-gradient(160deg, ${rarity.color}22, #0B0B14)` }}>
                    {e.portrait && e.portrait !== "/heroes/_placeholder.webp" ? (
                      <img src={e.portrait} alt={e.name} className="w-full h-full object-cover object-top" />
                    ) : (
                      <Skull className="w-8 h-8" style={{ color: rarity.color }} />
                    )}
                  </div>
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-1.5">
                    <p className="text-[9px] font-bold text-white truncate">{e.name}</p>
                    <div className="flex items-center gap-1">
                      <span className="text-[8px]" style={{ color: rarity.color }}>{e.rarity}</span>
                      <span className="text-[8px] text-slate-400">· {e.element}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Editor panel */}
        <div>
          {selected ? (
            <motion.div
              key={selected.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-black/10 bg-[#FFFFFF] overflow-hidden sticky top-24"
              data-testid="enemy-editor"
            >
              <div className="relative h-[180px]" style={{ background: `linear-gradient(160deg, ${(RARITY[selected.rarity] || RARITY.R).color}33, #0B0B14)` }}>
                {selected.portrait && selected.portrait !== "/heroes/_placeholder.webp" && (
                  <img src={selected.portrait} alt={selected.name} className="w-full h-full object-cover object-top" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#FFFFFF] to-transparent" />
                <div className="absolute bottom-3 left-4 right-4">
                  <h3 className="font-display text-2xl text-ink leading-none">{selected.name}</h3>
                  <div className="flex items-center gap-2 mt-1 text-xs">
                    <span style={{ color: RARITY[selected.rarity]?.color }}>{selected.rarity}</span>
                    <span className="text-slate-500">·</span>
                    <span style={{ color: ELEMENT[selected.element]?.color }}>{selected.element}</span>
                    <span className="text-slate-500">·</span>
                    <span className="text-slate-500">{selected.role}</span>
                  </div>
                </div>
              </div>

              <div className="p-4 space-y-3">
                {/* Base stats editor */}
                <div>
                  <p className="text-xs uppercase tracking-widest text-slate-500 mb-2">Base Stats</p>
                  <div className="grid grid-cols-5 gap-2">
                    {STAT_KEYS.map(({ k, label, icon: Icon, color }) => (
                      <label key={k} className="block">
                        <span className="flex items-center gap-0.5 text-[10px] text-slate-500"><Icon className="w-3 h-3" style={{ color }} />{label}</span>
                        <input
                          type="number"
                          className="w-full bg-black/40 border border-black/10 rounded px-2 py-1.5 text-sm text-ink text-center focus:outline-none focus:border-chakra"
                          value={editStats?.[k] ?? 0}
                          onChange={(e) => setStat(k, e.target.value)}
                          data-testid={`enemy-stat-${k}`}
                        />
                      </label>
                    ))}
                  </div>
                </div>

                {/* Mode-specific info */}
                {mode === "tsukuyomi" && (
                  <div className="rounded-lg bg-black/[0.03] border border-black/10 p-3 space-y-1.5">
                    <p className="text-xs uppercase tracking-widest text-slate-500">Tsukuyomi Config</p>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Base Level</span>
                      <span className="font-bold text-ink">{selected.base_level}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Gear Set</span>
                      <span className="font-bold text-ink">{selected.gear_set_name || "—"}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Mechanic</span>
                      <span className="font-bold text-ink">{selected.boss_mechanic || "—"}</span>
                    </div>
                    {selected.boss_gear && (
                      <div className="pt-1.5 border-t border-black/10">
                        <p className="text-[10px] text-slate-500 mb-1">Gear Bonuses</p>
                        <div className="grid grid-cols-4 gap-1">
                          {Object.entries(selected.boss_gear).map(([k, v]) => (
                            <div key={k} className="text-center rounded bg-black/[0.03] py-1">
                              <p className="text-[9px] text-slate-500 uppercase">{k.replace("_pct", "")}</p>
                              <p className="text-xs font-bold text-ink">+{v}%</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {mode === "boss_hunt" && (
                  <div className="rounded-lg bg-black/[0.03] border border-black/10 p-3 space-y-1.5">
                    <p className="text-xs uppercase tracking-widest text-slate-500">Boss Hunt Config</p>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Base Level</span>
                      <span className="font-bold text-ink">{selected.base_level}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Enrage Rounds</span>
                      <span className="font-bold text-ink">{selected.enrage_rounds || "—"}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Mechanic</span>
                      <span className="font-bold text-ink">{selected.boss_mechanic || "—"}</span>
                    </div>
                  </div>
                )}

                {/* Jutsu preview */}
                {selected.jutsus && selected.jutsus.length > 0 && (
                  <div className="rounded-lg bg-black/[0.03] border border-black/10 p-3">
                    <p className="text-xs uppercase tracking-widest text-slate-500 mb-2">Jutsus</p>
                    <div className="space-y-1.5">
                      {selected.jutsus.slice(0, 4).map((j, i) => (
                        <div key={i} className="text-xs">
                          <span className="font-bold text-ink">{j.name}</span>
                          <span className="text-slate-500 ml-1.5">· {j.type} · Pow {j.power}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={saveStats}
                  disabled={busy}
                  data-testid="enemy-save-btn"
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-bold bg-emerald-500 text-[#05050A] disabled:opacity-60 hover:brightness-110 transition-all"
                >
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Stats
                </button>
              </div>
            </motion.div>
          ) : (
            <div className="rounded-xl border border-black/10 bg-[#FFFFFF] p-8 text-center text-slate-600 sticky top-24">
              Select an enemy to view and edit its stats.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
