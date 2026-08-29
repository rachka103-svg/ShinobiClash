import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Castle, ChevronUp, ChevronDown, Play, Ticket, BookOpen, Zap } from "lucide-react";
import { CrownIcon, CoinsIcon, GemsIcon, SwordsIcon, CheckIcon, LockIcon } from "@/components/GameIcons";
import { useAuth } from "@/context/AuthContext";
import { useGame } from "@/context/GameContext";
import { spireEnemies } from "@/lib/battle";
import { RARITY } from "@/lib/styles";
import { startBattle, ENERGY_COST } from "@/lib/energy";

const TRIAL_ICONS = { "book-open": BookOpen, gem: GemsIcon, coins: CoinsIcon };
const SNAKE = ["self-start", "self-center", "self-end", "self-center"]; // winding "dragon's back" path

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

  // Build a winding column of floors, highest at the top so climbing goes UP.
  const top = maxAttempt + 2;
  const floorsList = [];
  for (let f = top; f >= Math.max(1, top - 7); f--) floorsList.push(f);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6" data-testid="spire-page">
      <div className="mb-5 flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: "#7C4DFF18", border: "1px solid #7C4DFF55" }}>
          <Castle className="w-6 h-6 text-jutsu" />
        </div>
        <div>
          <h1 className="font-display text-4xl sm:text-5xl tracking-wide text-ink leading-none">ENDLESS SPIRE</h1>
          <p className="text-slate-500 text-sm mt-1">Ascend the Dragon's Back into the heavens. How high can you rise?</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-5">
        {/* ============ DRAGON'S ASCENT — winding vertical climb ============ */}
        <div className="lg:col-span-5 relative rounded-3xl overflow-hidden p-4 sm:p-5" data-testid="spire-progress"
          style={{ background: "linear-gradient(180deg, #1a1030 0%, #0d0820 45%, #FFFFFF 100%)", border: "1px solid rgba(124,77,255,0.35)" }}>
          {/* atmosphere */}
          <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(120% 60% at 50% 0%, rgba(124,77,255,0.28), transparent 60%)" }} />
          <div className="absolute top-3 left-1/2 -translate-x-1/2 text-center z-10">
            <p className="text-[10px] uppercase tracking-[0.3em] text-jutsu/80">Highest Floor</p>
            <p className="font-display text-5xl leading-none" style={{ color: "#D500F9", textShadow: "0 0 22px #D500F9aa" }} data-testid="spire-highest">{cleared}</p>
          </div>

          {/* spine line */}
          <div className="absolute left-1/2 top-24 bottom-6 w-1 -translate-x-1/2 rounded-full" style={{ background: "linear-gradient(180deg, rgba(213,0,249,0.9), rgba(124,77,255,0.5), rgba(124,77,255,0.05))" }} />

          <div className="relative z-10 flex flex-col gap-3 mt-20">
            {floorsList.map((f, i) => {
              const state = f <= cleared ? "cleared" : f === maxAttempt ? "next" : "locked";
              const boss = f % 5 === 0;
              const selected = f === floor;
              const canPick = f <= maxAttempt;
              const color = state === "cleared" ? "#00E676" : state === "next" ? "#D500F9" : "#4b3a6b";
              return (
                <motion.button
                  key={f}
                  initial={{ opacity: 0, x: i % 2 ? 20 : -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => canPick && setFloor(f)}
                  disabled={!canPick}
                  data-testid={`spire-node-${f}`}
                  className={`${SNAKE[i % SNAKE.length]} relative flex items-center gap-2 disabled:cursor-not-allowed`}
                >
                  <div className={`relative flex items-center justify-center rounded-full font-display transition-all ${boss ? "w-14 h-14 text-lg" : "w-11 h-11 text-base"} ${selected ? "ring-2 ring-offset-2 ring-offset-[#0d0820]" : ""}`}
                    style={{
                      background: state === "locked" ? "rgba(255,255,255,0.04)" : `radial-gradient(circle at 50% 35%, ${color}, ${color}55)`,
                      border: `2px solid ${color}`,
                      color: state === "locked" ? "#64748b" : "#05050A",
                      boxShadow: state === "locked" ? "none" : `0 0 16px ${color}88`,
                      ["--tw-ring-color"]: "#FFCA28",
                    }}>
                    {state === "cleared" ? <CheckIcon size={20} /> : state === "locked" ? <LockIcon size={16} /> : (boss ? <CrownIcon size={24} /> : f)}
                    {boss && state !== "locked" && <span className="absolute -bottom-1 -right-1 text-[8px] font-extrabold px-1 rounded bg-fox text-[#05050A]">BOSS</span>}
                  </div>
                  <span className="text-sm font-semibold" style={{ color: selected ? "#FFCA28" : state === "locked" ? "#4b3a6b" : color }}>Floor {f}</span>
                  {state === "next" && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-jutsu/20 text-jutsu border border-jutsu/40 animate-pulse">CLIMB</span>}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* ============ Challenge card ============ */}
        <div className="lg:col-span-7 panel rounded-3xl p-6" style={{ borderLeft: `3px solid ${isBoss ? "#FF2D78" : "#D500F9"}` }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {isBoss && <CrownIcon size={24} />}
              <h2 className="font-display text-4xl tracking-wide text-ink">FLOOR {floor}</h2>
              {isBoss && <span className="text-xs font-bold px-2 py-1 rounded bg-fox/20 text-fox border border-fox/40">BOSS</span>}
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setFloor((f) => Math.max(1, f - 1))} disabled={floor <= 1} data-testid="spire-floor-down" className="p-2 rounded-lg bg-black/[0.04] hover:bg-black/10 disabled:opacity-30"><ChevronDown className="w-5 h-5 text-ink" /></button>
              <button onClick={() => setFloor((f) => Math.min(maxAttempt, f + 1))} disabled={floor >= maxAttempt} data-testid="spire-floor-up" className="p-2 rounded-lg bg-black/[0.04] hover:bg-black/10 disabled:opacity-30"><ChevronUp className="w-5 h-5 text-ink" /></button>
            </div>
          </div>

          <p className="text-xs uppercase tracking-widest text-slate-500 mb-2">Enemy Squad</p>
          <div className="flex items-center gap-3 mb-5 flex-wrap">
            {enemies.map((e, i) => {
              const t = catalogById[e.template_id];
              if (!t) return null;
              return (
                <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                  className="relative w-16 h-20 rounded-lg overflow-hidden border-2" style={{ borderColor: RARITY[t.rarity].color, boxShadow: `0 0 10px ${RARITY[t.rarity].color}66` }}>
                  <img src={t.portrait} alt={t.name} className="w-full h-full object-cover object-top" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                  <span className="absolute bottom-0.5 right-1 text-[10px] font-display text-ink">Lv{e.level}</span>
                  <span className="absolute top-0.5 left-1 text-[9px] font-display px-1 rounded" style={{ background: RARITY[t.rarity].color, color: "#05050A" }}>{t.rarity}</span>
                </motion.div>
              );
            })}
          </div>

          <div className="flex items-center gap-3 mb-5 text-sm">
            <span className="text-slate-500">Rewards:</span>
            <span className="flex items-center gap-1 text-amber-300"><CoinsIcon size={16} />{ryoReward}</span>
            {isBoss && <span className="flex items-center gap-1 text-chakra"><GemsIcon size={16} />×2</span>}
            {isBoss && <span className="flex items-center gap-1 text-amber-400"><Ticket className="w-4 h-4" />×1</span>}
          </div>

          <button
            onClick={() => startBattle({ mode: "spire", id: floor, navigate, setUser })}
            data-testid="spire-challenge-btn"
            className="w-full py-3.5 rounded-xl font-display text-2xl tracking-wider bg-jutsu text-ink hover:bg-fuchsia-500 transition-colors flex items-center justify-center gap-2"
          >
            <Play className="w-5 h-5 fill-white" /> CHALLENGE FLOOR {floor}
            {ENERGY_COST.spire > 0 && <span className="flex items-center gap-0.5 text-sm opacity-80"><Zap className="w-4 h-4" />{ENERGY_COST.spire}</span>}
          </button>
          {floor === maxAttempt && <p className="text-xs text-center text-slate-500 mt-2">Clear this floor to ascend the Dragon's Back and unlock the next.</p>}
        </div>
      </div>

      {/* Trials */}
      <div className="mt-8">
        <div className="flex items-center gap-2 mb-3">
          <SwordsIcon size={24} className="text-chakra" />
          <h2 className="font-display text-3xl tracking-wide text-ink">TRIAL DUNGEONS</h2>
        </div>
        <p className="text-slate-500 text-sm mb-4">Repeatable battles — farm the materials you need to level and ascend your heroes.</p>
        <div className="grid sm:grid-cols-3 gap-4">
          {trials.map((tr, i) => {
            const Icon = TRIAL_ICONS[tr.icon] || CoinsIcon;
            return (
              <motion.div key={tr.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="panel rounded-xl p-5 flex flex-col" style={{ borderTop: `3px solid ${tr.color}` }} data-testid={`trial-${tr.id}`}>
                <Icon className="w-7 h-7 mb-2" style={{ color: tr.color }} />
                <h3 className="font-display text-2xl tracking-wide text-ink">{tr.name}</h3>
                <p className="text-xs text-slate-500 mb-3 flex-1">{tr.desc}</p>
                <div className="flex items-center gap-1.5 mb-3">
                  {tr.enemies.map((e, j) => (
                    <div key={j} className="w-9 h-9 rounded overflow-hidden border border-black/10">
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
