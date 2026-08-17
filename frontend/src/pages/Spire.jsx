import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Castle, ChevronUp, ChevronDown, Play, Crown, Coins, Gem, Ticket, BookOpen, Swords, Zap } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useGame } from "@/context/GameContext";
import { spireEnemies } from "@/lib/battle";
import { RARITY } from "@/lib/styles";
import { startBattle, ENERGY_COST } from "@/lib/energy";

const TRIAL_ICONS = { "book-open": BookOpen, gem: Gem, coins: Coins };

export default function Spire() {
  const { user, setUser } = useAuth();
  const { catalog, catalogById, trials } = useGame();
  const navigate = useNavigate();

  const cleared = user?.spire_floor || 0;
  const maxAttempt = cleared + 1;
  const [floor, setFloor] = useState(maxAttempt);

  const enemies = catalog.length ? spireEnemies(floor, catalog) : [];
  const isBoss = floor % 5 === 0;
  const ryoReward = 120 + floor * 35;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8" data-testid="spire-page">
      <div className="mb-6 flex items-center gap-3">
        <Castle className="w-8 h-8 text-jutsu" />
        <div>
          <h1 className="font-display text-5xl tracking-wide text-white leading-none">ENDLESS SPIRE</h1>
          <p className="text-slate-400">Climb ascending floors of ever-stronger foes. How high can you rise?</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        {/* Tower progress */}
        <div className="lg:col-span-4 panel rounded-xl p-5 flex flex-col items-center justify-center" data-testid="spire-progress">
          <p className="text-xs uppercase tracking-widest text-slate-500">Highest Floor</p>
          <div className="font-display text-7xl text-jutsu glow-text-cyan leading-none my-1" style={{ color: "#D500F9", textShadow: "0 0 22px #D500F9aa" }}>{cleared}</div>
          <div className="w-full mt-4 space-y-1">
            {[2, 1, 0].map((d) => {
              const f = maxAttempt + d - 1;
              const state = f <= cleared ? "cleared" : f === maxAttempt ? "next" : "locked";
              return (
                <div key={d} className={`flex items-center justify-between px-3 py-2 rounded ${state === "next" ? "bg-jutsu/15 border border-jutsu/40" : "bg-black/30"}`}>
                  <span className="text-sm font-semibold" style={{ color: state === "cleared" ? "#00E676" : state === "next" ? "#D500F9" : "#64748b" }}>Floor {f}</span>
                  <span className="text-[11px] text-slate-500">{f % 5 === 0 ? "BOSS" : ""} {state === "cleared" ? "✓" : ""}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Challenge card */}
        <div className="lg:col-span-8 panel rounded-xl p-6" style={{ borderLeft: `3px solid ${isBoss ? "#FF2D78" : "#D500F9"}` }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {isBoss && <Crown className="w-6 h-6 text-fox" />}
              <h2 className="font-display text-4xl tracking-wide text-white">FLOOR {floor}</h2>
              {isBoss && <span className="text-xs font-bold px-2 py-1 rounded bg-fox/20 text-fox border border-fox/40">BOSS</span>}
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setFloor((f) => Math.max(1, f - 1))} disabled={floor <= 1} data-testid="spire-floor-down" className="p-2 rounded bg-white/5 hover:bg-white/10 disabled:opacity-30"><ChevronDown className="w-5 h-5 text-white" /></button>
              <button onClick={() => setFloor((f) => Math.min(maxAttempt, f + 1))} disabled={floor >= maxAttempt} data-testid="spire-floor-up" className="p-2 rounded bg-white/5 hover:bg-white/10 disabled:opacity-30"><ChevronUp className="w-5 h-5 text-white" /></button>
            </div>
          </div>

          <p className="text-xs uppercase tracking-widest text-slate-500 mb-2">Enemy Squad</p>
          <div className="flex items-center gap-3 mb-5">
            {enemies.map((e, i) => {
              const t = catalogById[e.template_id];
              if (!t) return null;
              return (
                <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                  className="relative w-16 h-20 rounded-lg overflow-hidden border-2" style={{ borderColor: RARITY[t.rarity].color, boxShadow: `0 0 10px ${RARITY[t.rarity].color}66` }}>
                  <img src={t.portrait} alt={t.name} className="w-full h-full object-cover object-top" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                  <span className="absolute bottom-0.5 right-1 text-[10px] font-display text-white">Lv{e.level}</span>
                  <span className="absolute top-0.5 left-1 text-[9px] font-display px-1 rounded" style={{ background: RARITY[t.rarity].color, color: "#05050A" }}>{t.rarity}</span>
                </motion.div>
              );
            })}
          </div>

          <div className="flex items-center gap-3 mb-5 text-sm">
            <span className="text-slate-400">Rewards:</span>
            <span className="flex items-center gap-1 text-amber-300"><Coins className="w-4 h-4" />{ryoReward}</span>
            {isBoss && <span className="flex items-center gap-1 text-chakra"><Gem className="w-4 h-4" />×2</span>}
            {isBoss && <span className="flex items-center gap-1 text-amber-400"><Ticket className="w-4 h-4" />×1</span>}
          </div>

          <button
            onClick={() => startBattle({ mode: "spire", id: floor, navigate, setUser })}
            data-testid="spire-challenge-btn"
            className="w-full py-3.5 rounded-lg font-display text-2xl tracking-wider bg-jutsu text-white hover:bg-fuchsia-500 transition-colors flex items-center justify-center gap-2"
          >
            <Play className="w-5 h-5 fill-white" /> CHALLENGE FLOOR {floor}
            <span className="flex items-center gap-0.5 text-sm opacity-80"><Zap className="w-4 h-4" />{ENERGY_COST.spire}</span>
          </button>
          {floor === maxAttempt && <p className="text-xs text-center text-slate-500 mt-2">Clear this floor to ascend the Spire and unlock the next.</p>}
        </div>
      </div>

      {/* Trials */}
      <div className="mt-10">
        <div className="flex items-center gap-2 mb-3">
          <Swords className="w-6 h-6 text-chakra" />
          <h2 className="font-display text-3xl tracking-wide text-white">TRIAL DUNGEONS</h2>
        </div>
        <p className="text-slate-400 text-sm mb-4">Repeatable battles — farm the materials you need to level and ascend your heroes.</p>
        <div className="grid sm:grid-cols-3 gap-4">
          {trials.map((tr, i) => {
            const Icon = TRIAL_ICONS[tr.icon] || Coins;
            return (
              <motion.div key={tr.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="panel rounded-xl p-5 flex flex-col" style={{ borderTop: `3px solid ${tr.color}` }} data-testid={`trial-${tr.id}`}>
                <Icon className="w-7 h-7 mb-2" style={{ color: tr.color }} />
                <h3 className="font-display text-2xl tracking-wide text-white">{tr.name}</h3>
                <p className="text-xs text-slate-400 mb-3 flex-1">{tr.desc}</p>
                <div className="flex items-center gap-1.5 mb-3">
                  {tr.enemies.map((e, j) => (
                    <div key={j} className="w-9 h-9 rounded overflow-hidden border border-white/10">
                      <img src={catalogById[e.template_id]?.portrait} alt="" className="w-full h-full object-cover object-top" />
                    </div>
                  ))}
                  <span className="text-[11px] text-slate-500 ml-1">Lv {tr.enemies[0]?.level}</span>
                </div>
                <button
                  onClick={() => startBattle({ mode: "trial", id: tr.id, navigate, setUser })}
                  data-testid={`trial-btn-${tr.id}`}
                  className="w-full py-2.5 rounded-lg font-display text-lg tracking-wide text-[#05050A] hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                  style={{ background: tr.color }}
                >
                  <Play className="w-4 h-4 fill-[#05050A]" /> FARM
                  <span className="flex items-center gap-0.5 text-xs opacity-80"><Zap className="w-3 h-3" />{ENERGY_COST.trial}</span>
                </button>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
