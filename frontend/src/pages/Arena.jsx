import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Crosshair, Swords, Trophy, TrendingUp, TrendingDown, Loader2, RefreshCw, Zap, Shield, Award, Crown, Gem } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import api, { formatApiErrorDetail } from "@/lib/api";
import HeroPortrait from "@/components/HeroPortrait";

/** Cosmetic rank tiers derived purely from rating — no new backend state. */
const RANK_TIERS = [
  { min: 0, name: "Genin", color: "#94A3B8", icon: Shield },
  { min: 1000, name: "Chunin", color: "#00B8D4", icon: Shield },
  { min: 1400, name: "Jonin", color: "#00E676", icon: Award },
  { min: 1800, name: "Kage", color: "#FFCA28", icon: Crown },
  { min: 2200, name: "Legendary", color: "#D500F9", icon: Gem },
];
const rankFor = (rating) => RANK_TIERS.reduce((acc, t) => (rating >= t.min ? t : acc), RANK_TIERS[0]);

const StatCard = ({ icon: Icon, color, label, children, testid }) => (
  <div className="panel rounded-xl p-4 flex flex-col items-center gap-1.5">
    <span className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: `${color}1c`, boxShadow: `0 0 14px ${color}40` }}>
      <Icon className="w-4 h-4" style={{ color }} />
    </span>
    <p className="text-[10px] uppercase tracking-widest text-slate-500">{label}</p>
    <p className="font-display text-2xl leading-none" data-testid={testid}>{children}</p>
  </div>
);

export default function Arena() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState(user?.arena || null);
  const [opponent, setOpponent] = useState(null);
  const [loadingOpp, setLoadingOpp] = useState(true);
  const [noOpponents, setNoOpponents] = useState(false);
  const [starting, setStarting] = useState(false);

  const fetchOpponent = useCallback(async () => {
    setLoadingOpp(true);
    setNoOpponents(false);
    try {
      const { data } = await api.post("/arena/opponent");
      setOpponent(data.opponent);
    } catch (e) {
      if (e?.response?.status === 404) setNoOpponents(true);
      else toast.error(formatApiErrorDetail(e?.response?.data?.detail));
    } finally {
      setLoadingOpp(false);
    }
  }, []);

  const fetchStatus = useCallback(async () => {
    try {
      const { data } = await api.get("/arena/status");
      setStatus(data.arena);
    } catch (e) {
      console.error("Arena status fetch failed:", e);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    fetchOpponent();
  }, [fetchStatus, fetchOpponent]);

  const attemptsLeft = status ? status.attempts_max - status.attempts_used : 0;
  const noAttempts = status && attemptsLeft <= 0;
  const rank = rankFor(status?.rating ?? 1000);
  const RankIcon = rank.icon;

  const fight = async () => {
    if (!opponent || noAttempts) return;
    setStarting(true);
    try {
      const { data } = await api.post("/arena/battle/start", { opponent_user_id: opponent.user_id });
      if (data.profile) setUser(data.profile);
      sessionStorage.setItem("arena_opponent", JSON.stringify(data.opponent));
      navigate(`/battle/arena/${data.opponent.user_id}`);
    } catch (e) {
      toast.error(formatApiErrorDetail(e?.response?.data?.detail) || "Unable to start Arena battle");
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8" data-testid="arena-page">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#FF174418", border: "1px solid #FF174455", boxShadow: "0 0 20px #FF174430" }}>
          <Crosshair className="w-6 h-6 text-rose-400" />
        </div>
        <div>
          <h1 className="font-display text-4xl sm:text-5xl tracking-wide text-ink leading-none">ARENA</h1>
          <p className="text-slate-500 text-sm mt-1">Fight a frozen snapshot of another Shinobi&apos;s saved team.</p>
        </div>
        <div
          className="ml-auto hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full shrink-0"
          style={{ background: `${rank.color}18`, border: `1px solid ${rank.color}55` }}
          data-testid="arena-rank-badge"
        >
          <RankIcon className="w-4 h-4" style={{ color: rank.color }} />
          <span className="font-display text-sm tracking-wide" style={{ color: rank.color }}>{rank.name}</span>
        </div>
      </div>

      {/* Stat strip */}
      <div className="grid grid-cols-3 gap-3 mb-6 mt-5">
        <StatCard icon={Trophy} color={rank.color} label="Rating" testid="arena-rating">
          <span style={{ color: rank.color }}>{status?.rating ?? "—"}</span>
        </StatCard>
        <StatCard icon={Swords} color="#00E676" label="Record" testid="arena-record">
          <span className="text-emerald-400">{status?.wins ?? 0}W</span>
          <span className="text-slate-500"> - </span>
          <span className="text-fox">{status?.losses ?? 0}L</span>
        </StatCard>
        <StatCard icon={Zap} color="#00E5FF" label="Attempts Left" testid="arena-attempts">
          <span className="text-chakra">{attemptsLeft}/{status?.attempts_max ?? 5}</span>
        </StatCard>
      </div>

      {/* Opponent matchup card */}
      <div className="panel rounded-2xl p-5 sm:p-6 relative overflow-hidden" data-testid="arena-opponent-card">
        <div className="gold-pinstripe absolute top-0 inset-x-0" />

        <AnimatePresence mode="wait">
          {loadingOpp ? (
            <motion.div key="loading" className="flex items-center justify-center py-16 text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin" />
            </motion.div>
          ) : noOpponents ? (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16 text-slate-500" data-testid="arena-no-opponents">
              <Crosshair className="w-10 h-10 mx-auto mb-2 text-slate-400" />
              No challengers available yet — check back once more Shinobi have saved a team!
            </motion.div>
          ) : opponent ? (
            <motion.div key={opponent.user_id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              {/* VS matchup strip */}
              <div className="flex items-center justify-between gap-3 mb-5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-10 h-10 rounded-full flex items-center justify-center font-display text-base shrink-0 text-[#05050A]" style={{ background: "linear-gradient(135deg,#00E5FF,#0091EA)" }}>
                    {(user?.name || "S").slice(0, 1).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-widest text-slate-500 leading-none">You</p>
                    <p className="font-display text-lg text-ink leading-none mt-0.5 truncate">{status?.rating ?? 1000} RTG</p>
                  </div>
                </div>

                <span className="font-display text-2xl tracking-widest text-fox shrink-0 glow-text-orange">VS</span>

                <div className="flex items-center gap-2.5 min-w-0 flex-row-reverse text-right">
                  <span className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-black/[0.06] border border-black/10">
                    <Trophy className="w-5 h-5 text-slate-400" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-widest text-slate-500 leading-none">Challenger</p>
                    <p className="font-display text-lg text-ink leading-none mt-0.5 truncate">{opponent.name}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between mb-3 text-xs text-slate-500 px-1">
                <span>Level {opponent.level} · Power {opponent.power}</span>
                <button
                  onClick={fetchOpponent}
                  disabled={loadingOpp}
                  data-testid="arena-refresh-btn"
                  className="flex items-center gap-1.5 hover:text-ink transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingOpp ? "animate-spin" : ""}`} /> Find Another
                </button>
              </div>

              <div className="grid grid-cols-5 gap-2 mb-6">
                {opponent.team.map((t, i) => (
                  <HeroPortrait key={i} hero={t} mode="compact" testid={`arena-opponent-hero-${i}`} />
                ))}
              </div>

              <button
                onClick={fight}
                disabled={starting || noAttempts}
                data-testid="arena-fight-btn"
                className={`w-full py-3.5 rounded-lg font-display text-2xl tracking-wider flex items-center justify-center gap-2 transition-colors ${
                  noAttempts ? "bg-black/[0.04] text-slate-500 cursor-not-allowed" : "bg-fox text-ink hover:bg-orange-600 glow-text-orange"
                }`}
                style={!noAttempts ? { boxShadow: "0 0 24px rgba(255,87,34,0.35)" } : undefined}
              >
                {starting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Swords className="w-5 h-5" />}
                {noAttempts ? "NO ATTEMPTS LEFT TODAY" : "FIGHT"}
              </button>
              {noAttempts && (
                <p className="text-center text-xs text-slate-500 mt-2">Attempts reset daily at 00:00 UTC.</p>
              )}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      <div className="flex items-center gap-4 mt-6 justify-center">
        <span className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-emerald-400/10 border border-emerald-400/30 text-emerald-600">
          <TrendingUp className="w-3.5 h-3.5" /> Win: +20 Rating, +220 Ryo
        </span>
        <span className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-fox/10 border border-fox/30 text-fox">
          <TrendingDown className="w-3.5 h-3.5" /> Lose: -12 Rating
        </span>
      </div>
    </div>
  );
}
