import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Check, Heart, Sword, Shield, Wind, Sparkles, Scroll } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useGame } from "@/context/GameContext";
import { NinjaCard } from "@/components/NinjaCard";
import { RarityBadge } from "@/components/RarityBadge";
import { RARITY, ELEMENT } from "@/lib/styles";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";

const RARITY_FILTERS = ["All", "MYTHIC", "LR", "GR", "UR", "SSR", "SR", "R", "N"];
const RARITY_ORDER = { MYTHIC: 7, LR: 6, GR: 5, UR: 4, SSR: 3, SR: 2, R: 1, N: 0 };

export default function Gallery() {
  const { user } = useAuth();
  const { catalog, stages } = useGame();
  const [rarity, setRarity] = useState("All");
  const [element, setElement] = useState("All");
  const [selected, setSelected] = useState(null);

  const ownedSet = useMemo(() => new Set((user?.ninjas || []).map((n) => n.template_id)), [user]);
  const campaignDrops = useMemo(() => {
    const m = {};
    stages.forEach((s) => { if (s.first_clear?.ninja) m[s.first_clear.ninja] = s.chapter; });
    return m;
  }, [stages]);

  const elements = ["All", ...Array.from(new Set(catalog.map((c) => c.element)))];

  const list = catalog
    .filter((c) => (rarity === "All" || c.rarity === rarity) && (element === "All" || c.element === element))
    .sort((a, b) => RARITY_ORDER[b.rarity] - RARITY_ORDER[a.rarity] || a.name.localeCompare(b.name));

  const sel = selected ? catalog.find((c) => c.id === selected) : null;
  const ownedCount = catalog.filter((c) => ownedSet.has(c.id)).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8" data-testid="gallery-page">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-5xl tracking-wide text-white">HERO GALLERY</h1>
          <p className="text-slate-400">Every obtainable hero in the realm — summon them to your squad.</p>
        </div>
        <div className="font-display text-2xl text-chakra" data-testid="gallery-count">{ownedCount}<span className="text-slate-500">/{catalog.length}</span> <span className="text-sm text-slate-400">collected</span></div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        {RARITY_FILTERS.map((r) => (
          <button key={r} onClick={() => setRarity(r)} data-testid={`filter-rarity-${r}`}
            className={`px-3 py-1.5 rounded-full text-sm font-bold transition-all ${rarity === r ? "text-[#05050A]" : "text-slate-300 bg-white/5 hover:bg-white/10"}`}
            style={rarity === r ? { background: r === "All" ? "#00E5FF" : RARITY[r].color } : {}}>
            {r}
          </button>
        ))}
        <span className="w-px h-5 bg-white/10 mx-1" />
        {elements.map((e) => (
          <button key={e} onClick={() => setElement(e)} data-testid={`filter-element-${e}`}
            className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-all ${element === e ? "text-white" : "text-slate-300 bg-white/5 hover:bg-white/10"}`}
            style={element === e && e !== "All" ? { background: `${ELEMENT[e].color}33`, color: ELEMENT[e].color, border: `1px solid ${ELEMENT[e].color}` } : element === e ? { background: "#ffffff22" } : {}}>
            {e}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {list.map((c) => {
          const owned = ownedSet.has(c.id);
          return (
            <NinjaCard
              key={c.id}
              ninja={c}
              testid={`gallery-card-${c.id}`}
              onClick={() => setSelected(c.id)}
              badge={owned && (
                <span className="absolute bottom-1.5 left-1.5 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center" data-testid={`owned-${c.id}`}>
                  <Check className="w-4 h-4" />
                </span>
              )}
            />
          );
        })}
      </div>

      {/* Detail */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-md p-0 overflow-hidden max-h-[92vh] overflow-y-auto bg-[#0B0B14] border-0"
          style={sel ? { border: `1px solid ${RARITY[sel.rarity].color}66`, boxShadow: `0 0 50px ${RARITY[sel.rarity].color}40` } : undefined}
          data-testid="gallery-detail-dialog">
          {sel && (
            <div>
              <DialogTitle className="sr-only">{sel.name}</DialogTitle>
              <DialogDescription className="sr-only">Gallery details for {sel.name}</DialogDescription>
              <div className="relative h-[420px]">
                <img src={sel.portrait} alt={sel.name} className="w-full h-full object-cover object-top" />
                <div className="absolute inset-x-0 top-0 h-28 pointer-events-none" style={{ background: `linear-gradient(to bottom, ${ELEMENT[sel.element].color}40, transparent)` }} />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B14] via-[#0B0B14]/10 to-transparent pointer-events-none" />
                <div className="absolute top-12 right-3 z-10"><RarityBadge rarity={sel.rarity} size="lg" /></div>
                {ownedSet.has(sel.id) && (
                  <span className="absolute top-3 left-4 z-10 flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-500/90 text-white text-xs font-bold" data-testid="detail-owned">
                    <Check className="w-3.5 h-3.5" /> OWNED
                  </span>
                )}
                <div className="absolute bottom-4 left-5 right-5 z-10">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold px-2 py-1 rounded-md" style={{ background: `${ELEMENT[sel.element].color}22`, color: ELEMENT[sel.element].color, border: `1px solid ${ELEMENT[sel.element].color}66`, boxShadow: `0 0 12px ${ELEMENT[sel.element].color}55` }}>{sel.element}</span>
                    <span className="text-xs font-semibold px-2 py-1 rounded-md bg-white/10 text-slate-200">{sel.role}</span>
                  </div>
                  <h2 className="font-display text-5xl tracking-wide text-white leading-none" style={{ textShadow: "0 2px 18px rgba(0,0,0,0.8)" }}>{sel.name}</h2>
                  <p className="text-sm text-chakra italic mt-1">{sel.title}</p>
                </div>
              </div>

              <div className="p-5">
                <p className="text-sm text-slate-300 italic mb-4">"{sel.lore}"</p>

                <div className="grid grid-cols-4 gap-2 mb-4">
                  <GStat icon={Heart} label="HP" value={sel.base_stats.hp} color="#FF1744" />
                  <GStat icon={Sword} label="ATK" value={sel.base_stats.atk} color="#FF5722" />
                  <GStat icon={Shield} label="DEF" value={sel.base_stats.def} color="#29B6F6" />
                  <GStat icon={Wind} label="SPD" value={sel.base_stats.spd} color="#00E676" />
                </div>

                <p className="text-xs uppercase tracking-widest text-slate-500 mb-2">How to obtain</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-jutsu/15 text-jutsu border border-jutsu/30"><Sparkles className="w-3.5 h-3.5" /> Summon</span>
                  {campaignDrops[sel.id] != null && (
                    <span className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-fox/15 text-fox border border-fox/30"><Scroll className="w-3.5 h-3.5" /> Campaign Ch.{campaignDrops[sel.id]} first clear</span>
                  )}
                </div>

                <p className="text-xs uppercase tracking-widest text-slate-500 mb-2">Jutsu</p>
                <div className="space-y-2">
                  {sel.jutsus.map((j) => (
                    <div key={j.id} className="flex items-start gap-3 p-2 rounded bg-black/30">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white text-sm">{j.name}</span>
                          {j.chakra_cost > 0 ? <span className="text-[10px] text-chakra">{j.chakra_cost} CK</span> : <span className="text-[10px] text-slate-500">Basic</span>}
                        </div>
                        <p className="text-xs text-slate-400">{j.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

const GStat = ({ icon: Icon, label, value, color }) => (
  <div className="rounded bg-black/30 p-2 flex flex-col items-center">
    <Icon className="w-4 h-4 mb-1" style={{ color }} />
    <span className="font-display text-xl text-white leading-none">{value}</span>
    <span className="text-[10px] text-slate-500">{label}</span>
  </div>
);
