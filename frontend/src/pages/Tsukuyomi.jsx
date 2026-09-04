import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Moon, ChevronLeft, ChevronRight, Swords, Shield, Zap, Sparkles, Trophy, Star,
  Flame, Droplet, Wind as WindIcon, Mountain, Sun, Loader2, Percent, Gem, Search, Grid3x3, Check, Clock,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { useGame } from "@/context/GameContext";
import api, { formatApiErrorDetail } from "@/lib/api";
import { RARITY, ELEMENT } from "@/lib/styles";
import { GOLD } from "@/lib/theme";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";

const SLOTS = ["weapon", "armor", "accessory", "relic"];

const ELEMENT_ICON = { Fire: Flame, Water: Droplet, Wind: WindIcon, Earth: Mountain, Lightning: Zap, Dark: Moon, Light: Sun };
const DIFF_COLOR = { normal: "#00E5FF", hard: "#FFCA28", nightmare: "#FF1744" };

const NEON = "#B53EFF";
const ORANGE = "#FF9500";

/**
 * TSUKUYOMI — the Infinite Nightmare. A dark neon-accented gallery of 25
 * escalating dream-bosses shown as a 5-card carousel (center boss larger and
 * glowing). Each carries basic material drops plus a 5-10% rare drop of a
 * single random piece from its signature gear set. A difficulty selector
 * raises power and slightly raises the rare rate.
 */
export default function Tsukuyomi() {
  const { user, setUser } = useAuth();
  const { catalogById } = useGame();
  const navigate = useNavigate();
  const [bosses, setBosses] = useState([]);
  const [progress, setProgress] = useState({});
  const [highestCleared, setHighestCleared] = useState(0);
  const [energyCost, setEnergyCost] = useState(12);
  const [index, setIndex] = useState(() => { try { return Number(localStorage.getItem("sc_tsuku_idx")) || 0; } catch { return 0; } });
  const [dir, setDir] = useState(0);
  const [difficulty, setDifficulty] = useState("normal");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [collectionOpen, setCollectionOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    api.get("/game/tsukuyomi").then(({ data }) => {
      if (!alive) return;
      setBosses(data.bosses || []);
      setProgress(data.progress || {});
      setHighestCleared(data.highest_cleared || 0);
      setEnergyCost(data.energy_cost || 0);
      // Auto-navigate to the current available stage (highest_cleared + 1)
      // unless the player has a saved position that is still unlocked.
      const hc = data.highest_cleared || 0;
      const availableIdx = Math.min(hc, (data.bosses || []).length - 1); // index 0-based, stage = idx+1
      setIndex((i) => {
        const saved = Math.max(0, Math.min((data.bosses || []).length - 1, i));
        // If saved stage is cleared or available, keep it; otherwise jump to available
        const savedBoss = (data.bosses || [])[saved];
        if (savedBoss && savedBoss.status !== "locked") return saved;
        return availableIdx;
      });
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
  const ready = teamPower >= (diff?.recommended_power ?? Infinity);
  const isLocked = boss?.status === "locked";
  const isCleared = boss?.status === "cleared";

  const go = (d) => {
    setDir(d);
    setIndex((i) => Math.max(0, Math.min(bosses.length - 1, i + d)));
  };

  const selectBoss = (target) => {
    setDir(target > index ? 1 : -1);
    setIndex(target);
  };

  const searchBosses = () => {
    const q = query.trim().toLowerCase();
    if (!q) return;
    const n = parseInt(q, 10);
    if (!Number.isNaN(n) && n >= 1 && n <= bosses.length) {
      selectBoss(n - 1);
      setQuery("");
      return;
    }
    const found = bosses.findIndex((b) => b.name.toLowerCase().includes(q));
    if (found >= 0) {
      selectBoss(found);
      setQuery("");
    } else {
      toast.error("No nightmare matches that name");
    }
  };

  // Gear-set collection tracker — owned slots per unique set from your gear.
  const gearOwned = useMemo(() => {
    const map = {};
    (user?.gear || []).forEach((g) => {
      if (!g.set_id) return;
      map[g.set_id] = map[g.set_id] || new Set();
      map[g.set_id].add(g.slot);
    });
    return map;
  }, [user?.gear]);
  const uniqueSets = useMemo(() => {
    const seen = {};
    bosses.forEach((b) => { if (!seen[b.gear_set]) seen[b.gear_set] = { id: b.gear_set, name: b.gear_set_name, color: b.gear_set_color }; });
    return Object.values(seen);
  }, [bosses]);

  const startNightmare = async () => {
    if (!boss || !diff) return;
    if (isLocked) {
      toast.error(boss.lock_requirement || "This stage is locked");
      return;
    }
    setBusy(true);
    try {
      localStorage.setItem("sc_tsuku_idx", String(index));
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
    return <div className="h-full flex items-center justify-center" data-testid="tsukuyomi-loading"><Loader2 className="w-8 h-8 animate-spin" style={{ color: NEON }} /></div>;
  }
  if (!boss) {
    return <div className="p-10 text-center text-slate-500" data-testid="tsukuyomi-empty">No nightmares available.</div>;
  }

  const EIcon = ELEMENT_ICON[boss.element] || Moon;
  const [bossTitle, ...epithetParts] = boss.name.split(",");
  const epithet = epithetParts.join(",").trim();

  // 5-card carousel: center + two on each side
  const offsets = [-2, -1, 0, 1, 2];

  return (
    <div
      className="h-full max-w-6xl mx-auto px-3 sm:px-6 py-3 flex flex-col overflow-hidden relative"
      style={{ background: "radial-gradient(120% 90% at 50% 0%, #1a0b2e 0%, #0B0B12 55%, #050508 100%)" }}
      data-testid="tsukuyomi-page"
    >
      {/* ambient nebula glow */}
      <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(60% 50% at 50% 35%, rgba(181,62,255,0.18), transparent 70%)" }} />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between gap-2 shrink-0 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${NEON}1f`, border: `1px solid ${NEON}66`, boxShadow: `0 0 16px ${NEON}44` }}>
            <Moon className="w-5 h-5" style={{ color: NEON }} />
          </div>
          <div className="min-w-0">
            <h1 className="font-display text-2xl sm:text-3xl tracking-wide leading-none truncate" style={{ color: "#FFFFFF" }}>NIGHTMARE BOSSES</h1>
            <p className="text-[11px] leading-none mt-0.5 truncate" style={{ color: "#94A3B8" }}>Face the strongest nightmares</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)" }} data-testid="tsukuyomi-search">
            <Search className="w-3.5 h-3.5" style={{ color: "#94A3B8" }} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && searchBosses()}
              placeholder="Search bosses..." data-testid="tsukuyomi-search-input"
              className="w-24 sm:w-32 bg-transparent text-sm outline-none placeholder:text-slate-500" style={{ color: "#FFFFFF" }} />
          </div>
          <button onClick={() => setCollectionOpen(true)} data-testid="tsukuyomi-collection-open"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl transition-colors"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)", color: "#CBD5E1" }}>
            <Grid3x3 className="w-4 h-4" /> <span className="hidden sm:inline text-xs font-semibold">All Bosses</span>
          </button>
          <div className="text-right">
            <p className="text-[9px] uppercase tracking-widest leading-none" style={{ color: "#94A3B8" }}>Nightmare Progress</p>
            <p className="font-display text-lg leading-none mt-0.5" style={{ color: NEON }} data-testid="tsukuyomi-index">{index + 1}/{bosses.length}</p>
          </div>
        </div>
      </div>

      {/* Gallery — 5-card carousel */}
      <div className="relative z-10 flex-1 min-h-0 flex items-center justify-center gap-2 sm:gap-3">
        <button onClick={() => go(-1)} disabled={index === 0} data-testid="tsukuyomi-prev"
          className="shrink-0 z-20 w-9 h-9 sm:w-11 sm:h-11 rounded-full flex items-center justify-center transition-all disabled:opacity-20"
          style={{ background: "rgba(181,62,255,0.12)", border: `1px solid ${NEON}55`, color: "#E2D4F5" }}>
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="relative flex-1 min-w-0 h-full flex items-center justify-center">
          <AnimatePresence custom={dir} mode="popLayout">
            {offsets.map((off) => {
              const idx = index + off;
              const b = idx >= 0 && idx < bosses.length ? bosses[idx] : null;
              if (!b) return <div key={`spacer-${off}`} className="shrink-0" style={{ width: "var(--side-w, 0px)" }} />;
              const isCenter = off === 0;
              const r = RARITY[b.rarity] || RARITY.SSR;
              const el = ELEMENT[b.element] || {};
              const Eic = ELEMENT_ICON[b.element] || Moon;
              const bDiff = b.difficulties?.find((d) => d.id === difficulty) || b.difficulties?.[0];
              const bCleared = progress[b.id];
              const bRare = bDiff ? Math.min(60, Math.round((b.rare_chance + bDiff.rate_bonus) * 100)) : 0;
              const [bTitle] = b.name.split(",");

              const scale = isCenter ? 1 : off === -1 || off === 1 ? 0.78 : 0.62;
              const opacity = isCenter ? 1 : off === -1 || off === 1 ? 0.5 : 0.28;
              const dim = !isCenter;
              const sideLocked = b.status === "locked";

              return (
                <motion.button
                  key={b.id}
                  layout
                  custom={dir}
                  initial={{ opacity: 0, scale: scale * 0.9 }}
                  animate={{ opacity, scale }}
                  exit={{ opacity: 0, scale: scale * 0.9 }}
                  transition={{ duration: 0.28, ease: "easeOut" }}
                  onClick={() => !isCenter && selectBoss(idx)}
                  data-testid={isCenter ? "tsukuyomi-boss-card" : `tsukuyomi-side-card-${off}`}
                  className="relative rounded-2xl sm:rounded-3xl overflow-hidden shrink-0 text-left"
                  style={{
                    width: isCenter ? "min(320px, 46vw)" : "min(190px, 26vw)",
                    height: isCenter ? "100%" : "82%",
                    border: isCenter ? `2px solid ${NEON}` : `1px solid ${dim ? "#2D2D3A" : `${NEON}88`}`,
                    boxShadow: isCenter ? `0 0 40px ${NEON}66, 0 0 80px ${NEON}22` : "none",
                    background: "#0B0B12",
                    cursor: isCenter ? "default" : "pointer",
                  }}
                >
                  {/* Portrait */}
                  <div className="absolute inset-0">
                    <img src={b.portrait} alt={b.name} className="absolute inset-0 w-full h-full object-cover object-top"
                      style={{ filter: dim ? "saturate(0.5) brightness(0.5)" : "saturate(0.85) brightness(0.78) contrast(1.05)" }} />
                    <div className="absolute inset-0" style={{ background: "radial-gradient(120% 90% at 60% 20%, rgba(181,62,255,0.30), transparent 55%)" }} />
                    <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(11,11,18,0.35) 0%, rgba(11,11,18,0.10) 35%, rgba(11,11,18,0.92) 82%, #0B0B12 100%)" }} />
                    {sideLocked && (
                      <div className="absolute inset-0 flex items-center justify-center z-20" style={{ background: "rgba(5,5,8,0.75)" }}>
                        <Clock className="w-6 h-6" style={{ color: "#64748b" }} />
                      </div>
                    )}
                  </div>

                  {/* Status indicator — top right */}
                  {isCenter && (
                    <div className="absolute top-2.5 right-2.5 z-10" data-testid="tsukuyomi-star">
                      {b.status === "locked" ? (
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold tracking-widest" style={{ background: "rgba(255,255,255,0.08)", color: "#64748b", border: "1px solid rgba(255,255,255,0.15)" }}>
                          <Clock className="w-3 h-3" /> LOCKED
                        </div>
                      ) : (
                        <Star className="w-5 h-5" style={{ color: bCleared ? GOLD.base : b.status === "available" ? NEON : "rgba(255,255,255,0.35)", fill: bCleared ? GOLD.base : "transparent" }} />
                      )}
                    </div>
                  )}

                  {/* Card content */}
                  <div className="relative z-10 h-full flex flex-col justify-end p-3 sm:p-4">
                    {isCenter && bCleared && (
                      <span className="inline-flex self-start items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold tracking-widest mb-1.5" style={{ background: "rgba(0,230,118,0.15)", color: "#00E676", border: "1px solid rgba(0,230,118,0.4)" }} data-testid="tsukuyomi-cleared-badge">
                        <Trophy className="w-3 h-3" /> {bCleared.toUpperCase()} CLEARED
                      </span>
                    )}
                    {isCenter && !bCleared && b.status === "available" && (
                      <span className="inline-flex self-start items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold tracking-widest mb-1.5" style={{ background: `${NEON}1f`, color: NEON, border: `1px solid ${NEON}55` }} data-testid="tsukuyomi-available-badge">
                        <Sparkles className="w-3 h-3" /> AVAILABLE
                      </span>
                    )}
                    {isCenter && b.status === "locked" && (
                      <span className="inline-flex self-start items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold tracking-widest mb-1.5" style={{ background: "rgba(100,116,139,0.15)", color: "#94A3B8", border: "1px solid rgba(100,116,139,0.3)" }} data-testid="tsukuyomi-locked-badge">
                        <Clock className="w-3 h-3" /> {b.lock_requirement}
                      </span>
                    )}
                    <h2 className="font-display leading-[0.9] truncate" style={{ fontSize: isCenter ? "1.75rem" : "1.15rem", color: "#FFFFFF" }} data-testid="tsukuyomi-boss-name">{bTitle}</h2>
                    {isCenter && <p className="text-[11px] italic mt-0.5 truncate" style={{ color: "#94A3B8" }}>{epithet}</p>}

                    {/* Tags: element + rank */}
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wide" style={{ background: `${el.color}22`, color: el.color, border: `1px solid ${el.color}55` }}>
                        <Eic className="w-3 h-3" /> {b.element}
                      </span>
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wide" style={{ background: `${r.color}22`, color: r.color, border: `1px solid ${r.color}55` }}>
                        {r.name}
                      </span>
                    </div>

                    {/* Power */}
                    {isCenter && (
                      <div className="flex items-center gap-1.5 mt-2 text-xs" style={{ color: "#CBD5E1" }}>
                        <Swords className="w-3.5 h-3.5" style={{ color: ORANGE }} />
                        <span className="text-[9px] uppercase tracking-widest" style={{ color: "#94A3B8" }}>POW</span>
                        <span className="font-display text-base" style={{ color: "#FFFFFF" }}>{(bDiff?.recommended_power ?? 0).toLocaleString()}</span>
                      </div>
                    )}

                    {/* Drop info */}
                    {isCenter && (
                      <div className="grid grid-cols-3 gap-1.5 mt-2" data-testid="tsukuyomi-gear-drop">
                        <div className="rounded-lg px-2 py-1.5" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                          <p className="text-[8px] uppercase tracking-widest flex items-center gap-0.5" style={{ color: "#94A3B8" }}><Percent className="w-2.5 h-2.5" /> Rare</p>
                          <p className="font-display text-sm leading-none mt-0.5" style={{ color: DIFF_COLOR[difficulty] }}>{bRare}%</p>
                        </div>
                        <div className="rounded-lg px-2 py-1.5" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                          <p className="text-[8px] uppercase tracking-widest flex items-center gap-0.5" style={{ color: "#94A3B8" }}><Gem className="w-2.5 h-2.5" /> Crystal</p>
                          <p className="font-display text-sm leading-none mt-0.5" style={{ color: "#D500F9" }}>{(bRare * 0.18).toFixed(1)}%</p>
                        </div>
                        <div className="rounded-lg px-2 py-1.5" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                          <p className="text-[8px] uppercase tracking-widest" style={{ color: "#94A3B8" }}>Materials</p>
                          <p className="font-display text-[11px] leading-tight mt-0.5 truncate" style={{ color: b.gear_set_color || GOLD.base }}>{b.gear_set_name}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.button>
              );
            })}
          </AnimatePresence>
        </div>

        <button onClick={() => go(1)} disabled={index === bosses.length - 1} data-testid="tsukuyomi-next"
          className="shrink-0 z-20 w-9 h-9 sm:w-11 sm:h-11 rounded-full flex items-center justify-center transition-all disabled:opacity-20"
          style={{ background: "rgba(181,62,255,0.12)", border: `1px solid ${NEON}55`, color: "#E2D4F5" }}>
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Pagination dots */}
      <div className="relative z-10 shrink-0 flex items-center justify-center gap-1.5 mt-2" data-testid="tsukuyomi-pagination">
        {bosses.map((b, i) => (
          <button key={b.id} onClick={() => selectBoss(i)} aria-label={`Go to nightmare ${i + 1}`}
            className="rounded-full transition-all"
            style={{
              width: i === index ? 22 : 7,
              height: 7,
              background: i === index ? NEON : b.status === "cleared" ? "#00E676" : b.status === "locked" ? "rgba(100,116,139,0.3)" : "rgba(255,255,255,0.18)",
              boxShadow: i === index ? `0 0 10px ${NEON}` : "none",
            }} />
        ))}
      </div>

      {/* Difficulty selector */}
      <div className="relative z-10 shrink-0 mt-2.5 flex items-center gap-2" data-testid="tsukuyomi-difficulty">
        {boss.difficulties.map((d) => {
          const active = difficulty === d.id;
          const c = DIFF_COLOR[d.id] || "#94a3b8";
          return (
            <button key={d.id} onClick={() => setDifficulty(d.id)} data-testid={`difficulty-${d.id}`}
              className="flex-1 py-1.5 rounded-xl font-display tracking-wider text-xs sm:text-sm transition-all"
              style={active ? { background: `${c}1f`, color: c, border: `1px solid ${c}`, boxShadow: `0 0 12px ${c}33` } : { color: "#94A3B8", border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.03)" }}>
              {d.name}
              {order[clearedDiff] >= order[d.id] && <Trophy className="inline w-3 h-3 ml-1" style={{ color: "#00E676" }} />}
            </button>
          );
        })}
      </div>

      {/* Bottom action bar */}
      <div className="relative z-10 shrink-0 mt-2.5 rounded-2xl p-3 flex items-center gap-3"
        style={{ background: "rgba(11,11,18,0.85)", border: "1px solid rgba(255,255,255,0.10)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)" }}>
        {/* Current nightmare */}
        <div className="hidden sm:block shrink-0 pr-3 border-r" style={{ borderColor: "rgba(255,255,255,0.10)" }}>
          <p className="text-[8px] uppercase tracking-widest" style={{ color: "#94A3B8" }}>Current Nightmare</p>
          <p className="font-display text-base leading-none mt-0.5" style={{ color: "#FFFFFF" }}>NIGHTMARE {index + 1}</p>
          <p className="text-[10px] mt-0.5 flex items-center gap-1" style={{ color: isLocked ? "#64748b" : clearedDiff ? "#00E676" : isCleared ? "#00E676" : NEON }}>
            {isLocked ? <><Clock className="w-3 h-3" /> Locked</> : clearedDiff ? <><Trophy className="w-3 h-3" /> {clearedDiff} Cleared</> : isCleared ? <><Trophy className="w-3 h-3" /> Cleared</> : <><Sparkles className="w-3 h-3" /> Available</>}
          </p>
        </div>

        {/* Recommended power */}
        <div className="shrink-0">
          <p className="text-[8px] uppercase tracking-widest" style={{ color: "#94A3B8" }}>Recommended Power</p>
          <p className="font-display text-base leading-none mt-0.5 flex items-center gap-1.5" style={{ color: "#FFFFFF" }}>
            <Swords className="w-4 h-4" style={{ color: ORANGE }} /> {(diff?.recommended_power ?? 0).toLocaleString()}
          </p>
        </div>

        {/* Squad power */}
        <div className="shrink-0 ml-auto sm:ml-0">
          <p className="text-[8px] uppercase tracking-widest" style={{ color: "#94A3B8" }}>Your Squad Power</p>
          <p className="font-display text-base leading-none mt-0.5 flex items-center gap-1.5" style={{ color: "#FFFFFF" }}>
            <Shield className="w-4 h-4" style={{ color: "#00E5FF" }} /> {teamPower.toLocaleString()}
          </p>
        </div>
        <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold" style={{ color: ready ? "#00E676" : "#FF9500" }} data-testid="tsukuyomi-ready">
          {ready ? <><Check className="w-3 h-3" /> Ready</> : "Underpowered"}
        </span>

        {/* CTA */}
        <button onClick={startNightmare} disabled={busy || energyLow || isLocked} data-testid="tsukuyomi-fight-button"
          className="flex-1 min-w-0 ml-auto py-3 rounded-xl font-display text-base sm:text-lg tracking-widest flex items-center justify-center gap-2 transition-all disabled:opacity-40"
          style={{ background: isLocked ? "rgba(100,116,139,0.15)" : `linear-gradient(135deg, ${NEON}, #7C2DFF)`, border: `1.5px solid ${isLocked ? "rgba(100,116,139,0.3)" : NEON}`, boxShadow: isLocked ? "none" : `0 0 24px ${NEON}66`, color: isLocked ? "#64748b" : "#FFFFFF" }}>
          {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : isLocked ? <Clock className="w-5 h-5" /> : <Swords className="w-5 h-5" />}
          <span className="truncate">{isLocked ? "LOCKED" : "ENTER NIGHTMARE"}</span>
          {!isLocked && energyCost > 0 && <span className="inline-flex items-center gap-1 text-xs" style={{ color: "#00E676" }}><Zap className="w-3.5 h-3.5" />{energyCost}</span>}
        </button>
      </div>
      {energyCost > 0 && energyLow && !isLocked && <p className="relative z-10 text-[11px] text-center mt-1.5" style={{ color: ORANGE }} data-testid="tsukuyomi-energy-low">Not enough Energy — refill in the Shop or wait for regen.</p>}
      {isLocked && <p className="relative z-10 text-[11px] text-center mt-1.5" style={{ color: "#94A3B8" }} data-testid="tsukuyomi-locked-msg">{boss.lock_requirement}</p>}

      {/* Gear-set Collection tracker */}
      <Dialog open={collectionOpen} onOpenChange={setCollectionOpen}>
        <DialogContent className="max-w-lg rounded-2xl max-h-[85vh] overflow-y-auto" style={{ background: "#0B0B14", border: `1px solid ${NEON}44` }} data-testid="tsukuyomi-collection-dialog">
          <DialogTitle className="font-display text-2xl tracking-wide" style={{ color: "#FFFFFF" }}>NIGHTMARE GEAR SETS</DialogTitle>
          <DialogDescription className="text-xs" style={{ color: "#94A3B8" }}>Collect a piece for every slot to complete each Tsukuyomi set.</DialogDescription>
          <div className="space-y-2.5 mt-1">
            {uniqueSets.map((set) => {
              const owned = gearOwned[set.id] || new Set();
              const complete = SLOTS.every((s) => owned.has(s));
              return (
                <div key={set.id} className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${complete ? "rgba(0,230,118,0.4)" : "rgba(255,255,255,0.10)"}` }} data-testid={`set-row-${set.id}`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="font-display text-lg tracking-wide" style={{ color: set.color || GOLD.base }}>{set.name}</p>
                    <span className="text-xs font-bold" style={{ color: complete ? "#00E676" : "#94A3B8" }}>{owned.size}/{SLOTS.length} {complete && "✓"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {SLOTS.map((s) => {
                      const has = owned.has(s);
                      return (
                        <div key={s} className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[10px] font-semibold capitalize"
                          style={has ? { background: `${set.color}1f`, color: set.color, border: `1px solid ${set.color}66` } : { background: "rgba(255,255,255,0.03)", color: "#64748b", border: "1px solid rgba(255,255,255,0.08)" }}>
                          {has ? <Check className="w-3 h-3" /> : <span className="w-3 h-3 rounded-full border border-current opacity-50" />} {s}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
