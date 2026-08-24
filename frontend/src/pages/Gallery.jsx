import { useState, useMemo } from "react";
import { Check } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useGame } from "@/context/GameContext";
import { NinjaCard } from "@/components/NinjaCard";
import HeroDetailModal from "@/components/HeroDetailModal";
import { RARITY, ELEMENT } from "@/lib/styles";

const RARITY_FILTERS = ["All", "GR", "UR", "SSR", "SR", "R"];
const RARITY_ORDER = { GR: 4, UR: 3, SSR: 2, SR: 1, R: 0 };

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
          <h1 className="font-display text-5xl tracking-wide text-ink">HERO GALLERY</h1>
          <p className="text-slate-500">Every obtainable hero in the realm — summon them to your squad.</p>
        </div>
        <div className="font-display text-2xl text-chakra" data-testid="gallery-count">{ownedCount}<span className="text-slate-500">/{catalog.length}</span> <span className="text-sm text-slate-500">collected</span></div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        {RARITY_FILTERS.map((r) => (
          <button key={r} onClick={() => setRarity(r)} data-testid={`filter-rarity-${r}`}
            className={`px-3 py-1.5 rounded-full text-sm font-bold transition-all ${rarity === r ? "text-[#05050A]" : "text-slate-600 bg-black/[0.04] hover:bg-black/10"}`}
            style={rarity === r ? { background: r === "All" ? "#00E5FF" : RARITY[r].color } : {}}>
            {r}
          </button>
        ))}
        <span className="w-px h-5 bg-black/[0.06] mx-1" />
        {elements.map((e) => (
          <button key={e} onClick={() => setElement(e)} data-testid={`filter-element-${e}`}
            className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-all ${element === e ? "text-ink" : "text-slate-600 bg-black/[0.04] hover:bg-black/10"}`}
            style={element === e && e !== "All" ? { background: `${ELEMENT[e].color}33`, color: ELEMENT[e].color, border: `1px solid ${ELEMENT[e].color}` } : element === e ? { background: "#ffffff22" } : {}}>
            {e}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 gap-y-6 sm:gap-x-5 sm:gap-y-7 lg:gap-x-6 lg:gap-y-8">
        {list.map((c) => {
          const owned = ownedSet.has(c.id);
          return (
            <NinjaCard
              key={c.id}
              ninja={c}
              testid={`gallery-card-${c.id}`}
              onClick={() => setSelected(c.id)}
              badge={owned && (
                <span className="absolute bottom-1.5 left-1.5 w-6 h-6 rounded-full bg-emerald-500 text-ink flex items-center justify-center" data-testid={`owned-${c.id}`}>
                  <Check className="w-4 h-4" />
                </span>
              )}
            />
          );
        })}
      </div>

      {/* Detail */}
      <HeroDetailModal
        open={!!selected}
        onClose={() => setSelected(null)}
        template={sel}
        owned={sel ? ownedSet.has(sel.id) : false}
        obtain={{ campaignChapter: sel ? campaignDrops[sel.id] : null }}
      />
    </div>
  );
}
