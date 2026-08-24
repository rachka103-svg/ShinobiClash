import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Moon, ChevronLeft, ChevronRight, Swords, Shield, Zap, Sparkles, Trophy,
  Flame, Droplet, Wind as WindIcon, Mountain, Sun, Loader2, Percent, Gem,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { useGame } from "@/context/GameContext";
import api, { formatApiErrorDetail } from "@/lib/api";
import { RARITY, ELEMENT } from "@/lib/styles";
import { rarityFrame, GOLD } from "@/lib/theme";
import { DecoCorners } from "@/components/RarityFx";

const ELEMENT_ICON = { Fire: Flame, Water: Droplet, Wind: WindIcon, Earth: Mountain, Lightning: Zap, Dark: Moon, Light: Sun };
const DIFF_COLOR = { normal: "#00E5FF", hard: "#FFCA28", nightmare: "#FF1744" };

/**
 * TSUKUYOMI — the Infinite Nightmare. A swipe left/right gallery of 25
 * escalating dream-bosses. Each carries basic material drops plus a 5-10%
 * rare drop of a single random piece from its signature gear set. A
 * difficulty selector raises power and slightly raises the rare rate.
 */
export default function Tsukuyomi() {
  const { user, setUser } = useAuth();
  const { catalogById } = useGame();
  const navigate = useNavigate();
  const [bosses, setBosses] = useState([]);
  const [progress, setProgress] = useState({});
  const [energyCost, setEnergyCost] = useState(12);
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState(0);
  const [difficulty, setDifficulty] = useState("normal");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    api.get("/game/tsukuyomi").then(({ data }) => {
      if (!alive) return;
      setBosses(data.bosses || []);
      setProgress(data.progress || {});
      setEnergyCost(data.energy_cost || 12);
      setLoading(false);
    }).catch((e) => {
      toast.error(formatApiErrorDetail(e?.response?.data?.detail) || "Failed to load nightmares");
      setLoading(false);
    });
    return () => { alive = false; };
  }, []);

  const boss = bosses[index] || null;
  const rarity = boss ? (RARITY[boss.rarity] || RARITY.SSR) : RARITY.SSR;
  const element = boss ? (ELEMENT[boss.element] || {}) : {};
  const diff = useMemo(() => boss?.difficulties?.find((d) => d.id === difficulty) || boss?.difficulties?.[0], [boss, difficulty]);
  const clearedDiff = boss ? progress[boss.id] : null;
  const order = { normal: 1, hard: 2, nightmare: 3 };
  const teamPower = user?.team_power ?? 0;
  const energyLow = (user?.energy?.current ?? 0) < energyCost;
  const rareChance = diff ? Math.min(60, Math.round((boss.rare_chance + diff.rate_bonus) * 100)) : 0;

  const go = (d) => {
    setDir(d);
    setIndex((i) => Math.max(0, Math.min(bosses.length - 1, i + d)));
  };

  const startNightmare = async () => {
    if (!boss || !diff) return;
    setBusy(true);
    try {
      sessionStorage.setItem("tsukuyomi_fight", JSON.stringify({
        boss: { id: boss.id, name: boss.name, boss_mechanic: boss.boss_mechanic },
        difficulty, enemies: diff.enemies,
      }));
      const { data } = await api.post("/game/battle/start", { mode: "tsukuyomi", id: boss.id });
      if (data.profile) setUser(data.profile);
      navigate(`/battle/tsukuyomi/${boss.id}`);
    } catch (e) {
      toast.error(formatApiErrorDetail(e?.response?.data?.detail) || "Unable to enter the nightmare");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <div className="h-full flex items-center justify-center" data-testid="tsukuyomi-loading"><Loader2 className="w-8 h-8 text-jutsu animate-spin" /></div>;
  }
  if (!boss) {
    return <div className="p-10 text-center text-slate-400" data-testid="tsukuyomi-empty">No nightmares available.</div>;
  }

  const EIcon = ELEMENT_ICON[boss.element] || Moon;
  const fr = rarityFrame(boss.rarity);

  return (
    <div className="h-full max-w-5xl mx-auto px-3 sm:px-6 py-3 flex flex-col overflow-hidden" data-testid="tsukuyomi-page">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 shrink-0 mb-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "#7C4DFF18", border: "1px solid #7C4DFF55" }}>
            <Moon className="w-5 h-5 text-jutsu" />
          </div>
          <div>
            <h1 className="font-display text-2xl sm:text-3xl tracking-wide text-white leading-none">TSUKUYOMI</h1>
            <p className="text-[11px] text-slate-500 leading-none mt-0.5">The Infinite Nightmare</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-widest text-slate-500 leading-none">Nightmare</p>
          <p className="font-display text-xl leading-none mt-0.5 text-jutsu" data-testid="tsukuyomi-index">{index + 1} / {bosses.length}</p>
        </div>
      </div>

      {/* Gallery body */}
      <div className="flex-1 min-h-0 flex items-stretch gap-2 sm:gap-3">
        {/* Left arrow */}
        <button onClick={() => go(-1)} disabled={index === 0} data-testid="tsukuyomi-prev"
          className="shrink-0 self-center w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-white/[0.04] border border-white/12 flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30">
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Boss card */}
        <div className="flex-1 min-w-0 relative">
          <AnimatePresence mode="wait" custom={dir}>
            <motion.div
              key={boss.id}
              custom={dir}
              initial={{ opacity: 0, x: dir >= 0 ? 60 : -60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: dir >= 0 ? -60 : 60 }}
              transition={{ duration: 0.22 }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.18}
              onDragEnd={(e, info) => { if (info.offset.x < -80) go(1); else if (info.offset.x > 80) go(-1); }}
              className="absolute inset-0 rounded-2xl sm:rounded-3xl overflow-hidden"
              style={{ border: `1px solid ${rarity.color}55`, boxShadow: `0 0 50px ${rarity.color}22` }}
              data-testid="tsukuyomi-boss-card"
            >
              {/* Art with nightmare overlay */}
              <div className="absolute inset-0">
                <img src={boss.portrait} alt={boss.name} className="absolute inset-0 w-full h-full object-cover object-top" style={{ filter: "saturate(0.7) brightness(0.72) contrast(1.05)" }} />
                <div className="absolute inset-0" style={{ background: "radial-gradient(120% 90% at 70% 20%, rgba(124,77,255,0.35), transparent 55%)" }} />
                <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(5,5,10,0.45) 0%, rgba(5,5,10,0.15) 30%, rgba(11,11,20,0.9) 78%, #0B0B14 100%)" }} />
                <div className="absolute inset-0 mix-blend-overlay" style={{ background: "radial-gradient(circle at 50% 40%, transparent 40%, rgba(0,0,0,0.6) 100%)" }} />
              </div>

              <div className="gold-pinstripe absolute top-0 inset-x-0 z-10" />
              {fr.cornerLevel >= 2 && <DecoCorners rarity={boss.rarity} size={20} />}

              {/* Content */}
              <div className="relative z-10 h-full flex flex-col justify-end p-4 sm:p-6">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-extrabold tracking-widest" style={{ background: `${rarity.color}22`, color: rarity.color, border: `1px solid ${rarity.color}66` }}>
                    <Moon className="w-3.5 h-3.5" /> NIGHTMARE #{boss.index}
                  </span>
                  {clearedDiff && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold tracking-widest bg-emerald-500/15 text-emerald-300 border border-emerald-400/40" data-testid="tsukuyomi-cleared-badge">
                      <Trophy className="w-3 h-3" /> {clearedDiff.toUpperCase()} CLEARED
                    </span>
                  )}
                </div>
                <h2 className="font-display text-3xl sm:text-5xl text-white leading-[0.9]" data-testid="tsukuyomi-boss-name">{boss.name}</h2>
                <p className="text-xs sm:text-sm text-slate-300 italic mt-1.5 max-w-md">{boss.lore}</p>

                <div className="flex items-center gap-3 mt-2.5 text-xs">
                  <span className="flex items-center gap-1 font-semibold" style={{ color: rarity.color }}>{rarity.name}</span>
                  <span className="w-1 h-1 rounded-full bg-slate-600" />
                  <span className="flex items-center gap-1 text-slate-200"><EIcon className="w-3.5 h-3.5" style={{ color: element.color }} /> {boss.element}</span>
                  <span className="w-1 h-1 rounded-full bg-slate-600" />
                  <span className="flex items-center gap-1 text-slate-200"><Swords className="w-3.5 h-3.5 text-fox" /> Pow {diff?.recommended_power?.toLocaleString()}</span>
                </div>

                {/* Drop info */}
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <div className="rounded-xl bg-black/40 border border-white/10 px-3 py-2" data-testid="tsukuyomi-gear-drop">
                    <p className="text-[9px] uppercase tracking-widest text-slate-500">Signature Gear Set</p>
                    <p className="font-display text-base leading-none mt-0.5" style={{ color: boss.gear_set_color || GOLD.base }}>{boss.gear_set_name}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Random piece · not the full set</p>
                  </div>
                  <div className="rounded-xl bg-black/40 border border-white/10 px-3 py-2" data-testid="tsukuyomi-rare-chance">
                    <p className="text-[9px] uppercase tracking-widest text-slate-500 flex items-center gap-1"><Percent className="w-3 h-3" /> Rare Drop</p>
                    <p className="font-display text-base leading-none mt-0.5" style={{ color: DIFF_COLOR[difficulty] }}>{rareChance}%</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">+ basic nightmare materials</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Right arrow */}
        <button onClick={() => go(1)} disabled={index === bosses.length - 1} data-testid="tsukuyomi-next"
          className="shrink-0 self-center w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-white/[0.04] border border-white/12 flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Controls */}
      <div className="shrink-0 mt-2.5 space-y-2.5">
        {/* Difficulty selector */}
        <div className="flex items-center gap-2" data-testid="tsukuyomi-difficulty">
          {boss.difficulties.map((d) => {
            const active = difficulty === d.id;
            const c = DIFF_COLOR[d.id] || "#94a3b8";
            const locked = false;
            return (
              <button key={d.id} onClick={() => setDifficulty(d.id)} data-testid={`difficulty-${d.id}`}
                className="flex-1 py-2 rounded-xl font-display tracking-wider text-sm transition-colors"
                style={active ? { background: `${c}1f`, color: c, border: `1px solid ${c}` } : { color: "rgba(148,163,184,0.85)", border: "1px solid rgba(255,255,255,0.1)" }}>
                {d.name}
                {order[clearedDiff] >= order[d.id] && <Trophy className="inline w-3 h-3 ml-1 text-emerald-400" />}
              </button>
            );
          })}
        </div>

        {/* Fight button */}
        <button onClick={startNightmare} disabled={busy || energyLow} data-testid="tsukuyomi-fight-button"
          className="w-full py-3.5 rounded-2xl font-display text-xl tracking-widest text-white flex items-center justify-center gap-2 transition-all disabled:opacity-40 shine-sweep"
          style={{ background: "linear-gradient(135deg, rgba(124,77,255,0.35), rgba(26,10,50,0.9))", border: "1.5px solid rgba(124,77,255,0.6)", boxShadow: "0 0 26px rgba(124,77,255,0.3)" }}>
          {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Swords className="w-5 h-5" />}
          ENTER NIGHTMARE
          <span className="inline-flex items-center gap-1 text-sm text-emerald-300"><Zap className="w-3.5 h-3.5" />{energyCost}</span>
        </button>
        {energyLow && <p className="text-[11px] text-fox text-center" data-testid="tsukuyomi-energy-low">Not enough Energy — refill in the Shop or wait for regen.</p>}
        <p className="text-[10px] text-slate-500 text-center">Your squad power: <span className="text-slate-300">{teamPower.toLocaleString()}</span></p>
      </div>
    </div>
  );
}
