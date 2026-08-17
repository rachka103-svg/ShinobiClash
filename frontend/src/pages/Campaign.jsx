import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Lock, Play, Star, Coins, Zap } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useGame } from "@/context/GameContext";
import { RARITY } from "@/lib/styles";
import { startBattle, ENERGY_COST } from "@/lib/energy";

export default function Campaign() {
  const { user, setUser } = useAuth();
  const { stages, catalogById } = useGame();
  const navigate = useNavigate();
  const cleared = user?.cleared_stages || [];
  const energyLow = (user?.energy?.current ?? 0) < ENERGY_COST.campaign;

  const isUnlocked = (idx) => idx === 0 || cleared.includes(stages[idx - 1].id);

  // group by chapter
  const chapters = [...new Set(stages.map((s) => s.chapter))];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8" data-testid="campaign-page">
      <div className="mb-8">
        <h1 className="font-display text-5xl tracking-wide text-white">CAMPAIGN</h1>
        <p className="text-slate-400">Battle through the shadow realm, one mission at a time.</p>
      </div>

      {chapters.map((ch) => (
        <div key={ch} className="mb-8">
          <h2 className="font-display text-2xl text-fox tracking-wide mb-3">CHAPTER {ch}</h2>
          <div className="space-y-3">
            {stages.filter((s) => s.chapter === ch).map((stage) => {
              const idx = stages.findIndex((x) => x.id === stage.id);
              const unlocked = isUnlocked(idx);
              const done = cleared.includes(stage.id);
              return (
                <motion.div
                  key={stage.id}
                  initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
                  data-testid={`stage-${stage.id}`}
                  className={`panel rounded-xl p-4 flex items-center gap-4 ${!unlocked ? "opacity-50" : ""}`}
                  style={{ borderLeft: `3px solid ${done ? "#00E676" : unlocked ? "#00E5FF" : "#475569"}` }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-display text-2xl tracking-wide text-white truncate">{stage.name}</h3>
                      {done && <Star className="w-4 h-4 fill-emerald-400 text-emerald-400" />}
                    </div>
                    <p className="text-xs text-slate-400 mb-2">{stage.region}</p>
                    <div className="flex items-center gap-2">
                      {stage.enemies.map((e, i) => (
                        <div key={i} className="relative w-9 h-9 rounded overflow-hidden border" style={{ borderColor: RARITY[catalogById[e.template_id]?.rarity || "R"].color }}>
                          <img src={catalogById[e.template_id]?.portrait} alt="" className="w-full h-full object-cover object-top" />
                          <span className="absolute bottom-0 right-0 text-[8px] bg-black/70 px-0.5 text-white">{e.level}</span>
                        </div>
                      ))}
                      <span className="text-xs text-amber-400 flex items-center gap-1 ml-2"><Coins className="w-3 h-3" />{stage.rewards.ryo}</span>
                    </div>
                  </div>

                  {unlocked ? (
                    <button
                      onClick={() => startBattle({ mode: "campaign", id: stage.id, navigate, setUser })}
                      data-testid={`battle-btn-${stage.id}`}
                      className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-display text-lg tracking-wide transition-colors shrink-0 ${
                        energyLow ? "bg-white/10 text-slate-400" : "bg-fox text-white hover:bg-orange-600"
                      }`}
                    >
                      <Play className="w-4 h-4 fill-current" /> {done ? "REPLAY" : "BATTLE"}
                      <span className="flex items-center gap-0.5 text-xs opacity-80"><Zap className="w-3 h-3" />{ENERGY_COST.campaign}</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5 px-4 py-2.5 text-slate-500 shrink-0">
                      <Lock className="w-4 h-4" /> <span className="text-sm">Locked</span>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
