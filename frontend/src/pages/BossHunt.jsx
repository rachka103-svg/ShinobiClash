import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Swords, Shield, Skull, Zap, Heart, AlertTriangle, ChevronRight } from "lucide-react";
import { useGame } from "@/context/GameContext";
import api from "@/lib/api";

const DIFFICULTY_COLORS = {
  HARD: "#FF9800",
  EXTREME: "#FF5722",
  NIGHTMARE: "#D500F9",
};

const DIFFICULTY_LABELS = {
  HARD: "HARD",
  EXTREME: "EXTREME",
  NIGHTMARE: "NIGHTMARE",
};

export default function BossHunt() {
  const navigate = useNavigate();
  const { catalogById, catalog } = useGame();
  const [bosses, setBosses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBoss, setSelectedBoss] = useState(null);

  useEffect(() => {
    api
      .get("/game/boss-hunt")
      .then(({ data }) => {
        setBosses(data.bosses || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const launchBattle = (boss) => {
    // Build the boss enemy from the config and store for Battle.jsx
    const template = catalogById[boss.template_id];
    if (!template) return;

    // Use high-level progression for boss hunt
    const enemy = {
      template_id: boss.template_id,
      level: 60,
      ascension: 10,
      stats_override: null, // Will be computed by backend progression
      skill_rank: 8,
      passive_locked: false,
      reforge: null,
      combat_modifiers: boss.combat_modifiers || {},
      boss_mechanic: boss.boss_mechanic || null,
      boss_identity: {
        name: boss.name,
        element: boss.element,
        difficulty: boss.difficulty,
        traits: boss.traits,
        strategy: boss.strategy,
        vulnerability_hint: boss.vulnerability_hint,
        archetype: boss.archetype,
      },
    };

    // Store for Battle.jsx to consume
    sessionStorage.setItem("bosshunt_boss", JSON.stringify({
      boss_id: boss.id,
      name: boss.name,
      difficulty: boss.difficulty,
      enemies: [enemy],
    }));

    navigate(`/battle/bosshunt/${boss.id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#05050A]">
        <Swords className="w-8 h-8 text-chakra animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#05050A] pb-24">
      {/* Header */}
      <div className="sticky top-0 z-30 glass border-b border-white/10 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl tracking-widest text-white">BOSS HUNT</h1>
            <p className="text-xs text-slate-400 mt-0.5">Elite bosses with unique mechanics. Build a counter team.</p>
          </div>
        </div>
      </div>

      {/* Boss grid */}
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {bosses.map((boss) => {
            const template = catalogById[boss.template_id];
            const diffColor = DIFFICULTY_COLORS[boss.difficulty] || "#FF9800";
            const diffLabel = DIFFICULTY_LABELS[boss.difficulty] || boss.difficulty;

            return (
              <div
                key={boss.id}
                className="glass-panel rounded-xl overflow-hidden border border-white/10 hover:border-white/25 transition-all cursor-pointer"
                onClick={() => setSelectedBoss(boss)}
              >
                {/* Boss header */}
                <div className="flex items-start gap-3 p-4">
                  {/* Portrait */}
                  {template?.portrait && (
                    <img
                      src={template.portrait}
                      alt={boss.name}
                      className="w-16 h-16 rounded-lg object-cover border border-white/10"
                    />
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-display text-lg text-white truncate">{boss.name}</h3>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: diffColor + "22", color: diffColor }}
                      >
                        {diffLabel}
                      </span>
                      <span className="text-xs text-slate-400">{boss.element}</span>
                    </div>
                  </div>

                  <ChevronRight className="w-5 h-5 text-slate-500 flex-shrink-0 mt-1" />
                </div>

                {/* Traits */}
                <div className="px-4 pb-3 flex flex-wrap gap-1.5">
                  {boss.traits?.map((trait, i) => (
                    <span
                      key={i}
                      className="text-[10px] px-2 py-1 rounded-md bg-white/5 text-slate-300 border border-white/5"
                    >
                      {trait}
                    </span>
                  ))}
                </div>

                {/* Strategy hint */}
                <div className="px-4 pb-4">
                  <div className="flex items-center gap-1.5 text-xs text-amber-400/80">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>Counter: {boss.vulnerability_hint}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Boss detail modal */}
      {selectedBoss && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setSelectedBoss(null)}
        >
          <div
            className="glass-panel rounded-2xl max-w-md w-full mx-4 border border-white/15 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-5 border-b border-white/10">
              <div className="flex items-center gap-3">
                {catalogById[selectedBoss.template_id]?.portrait && (
                  <img
                    src={catalogById[selectedBoss.template_id].portrait}
                    alt={selectedBoss.name}
                    className="w-20 h-20 rounded-xl object-cover border border-white/10"
                  />
                )}
                <div>
                  <h2 className="font-display text-2xl text-white">{selectedBoss.name}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className="text-xs font-bold px-2.5 py-1 rounded-full"
                      style={{
                        background: (DIFFICULTY_COLORS[selectedBoss.difficulty] || "#FF9800") + "22",
                        color: DIFFICULTY_COLORS[selectedBoss.difficulty] || "#FF9800",
                      }}
                    >
                      {DIFFICULTY_LABELS[selectedBoss.difficulty] || selectedBoss.difficulty}
                    </span>
                    <span className="text-sm text-slate-400">{selectedBoss.element} · {selectedBoss.archetype}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              {/* Traits */}
              <div>
                <h4 className="text-xs uppercase tracking-widest text-slate-500 mb-2">Boss Traits</h4>
                <div className="flex flex-wrap gap-1.5">
                  {selectedBoss.traits?.map((trait, i) => (
                    <span
                      key={i}
                      className="text-xs px-2.5 py-1.5 rounded-lg bg-white/5 text-slate-200 border border-white/10"
                    >
                      {trait}
                    </span>
                  ))}
                </div>
              </div>

              {/* Combat summary */}
              {selectedBoss.combat_summary && (
                <>
                  {(selectedBoss.combat_summary.immunities?.length > 0 ||
                    selectedBoss.combat_summary.resistances?.length > 0) && (
                    <div>
                      <h4 className="text-xs uppercase tracking-widest text-slate-500 mb-2">Defenses</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedBoss.combat_summary.immunities?.map((imm, i) => (
                          <span key={`imm-${i}`} className="text-xs px-2 py-1 rounded-md bg-red-500/15 text-red-300 border border-red-500/20">
                            {imm}
                          </span>
                        ))}
                        {selectedBoss.combat_summary.resistances?.map((res, i) => (
                          <span key={`res-${i}`} className="text-xs px-2 py-1 rounded-md bg-orange-500/15 text-orange-300 border border-orange-500/20">
                            {res}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedBoss.combat_summary.vulnerabilities?.length > 0 && (
                    <div>
                      <h4 className="text-xs uppercase tracking-widest text-slate-500 mb-2">Vulnerabilities</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedBoss.combat_summary.vulnerabilities?.map((vuln, i) => (
                          <span key={`vuln-${i}`} className="text-xs px-2 py-1 rounded-md bg-green-500/15 text-green-300 border border-green-500/20">
                            {vuln}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Strategy */}
              <div>
                <h4 className="text-xs uppercase tracking-widest text-slate-500 mb-2">Strategy</h4>
                <p className="text-sm text-slate-300">{selectedBoss.strategy}</p>
                <div className="flex items-center gap-1.5 mt-2 text-sm text-amber-400">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>Recommended: {selectedBoss.vulnerability_hint}</span>
                </div>
              </div>

              {/* Launch button */}
              <button
                onClick={() => launchBattle(selectedBoss)}
                className="w-full py-3 rounded-xl font-display text-lg tracking-wide bg-fox text-white hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
              >
                <Swords className="w-5 h-5" />
                ENGAGE BOSS
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
