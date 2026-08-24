import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Crosshair, Swords, Trophy, TrendingUp, TrendingDown, Loader2, RefreshCw, Zap } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import api, { formatApiErrorDetail } from "@/lib/api";
import { RARITY, ELEMENT } from "@/lib/styles";

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
    } catch {
      // silent — non-critical
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    fetchOpponent();
  }, [fetchStatus, fetchOpponent]);

  const attemptsLeft = status ? status.attempts_max - status.attempts_used : 0;
  const noAttempts = status && attemptsLeft <= 0;

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
        <Crosshair className="w-8 h-8 text-rose-400" />
        <h1 className="font-display text-4xl tracking-wide text-ink">ARENA</h1>
      </div>
      <p className="text-slate-500 mb-6">Fight a frozen snapshot of another Shinobi&apos;s saved team. Async — no live opponents.</p>

      {/* Stat strip */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="panel rounded-xl p-4 text-center">
          <p className="text-[11px] uppercase tracking-widest text-slate-500 mb-1">Rating</p>
          <p className="font-display text-2xl text-amber-300" data-testid="arena-rating">{status?.rating ?? "—"}</p>
        </div>
        <div className="panel rounded-xl p-4 text-center">
          <p className="text-[11px] uppercase tracking-widest text-slate-500 mb-1">Record</p>
          <p className="font-display text-2xl text-ink" data-testid="arena-record">
            <span className="text-emerald-400">{status?.wins ?? 0}W</span> - <span className="text-fox">{status?.losses ?? 0}L</span>
          </p>
        </div>
        <div className="panel rounded-xl p-4 text-center">
          <p className="text-[11px] uppercase tracking-widest text-slate-500 mb-1">Attempts Left</p>
          <p className="font-display text-2xl text-chakra flex items-center justify-center gap-1" data-testid="arena-attempts">
            <Zap className="w-4 h-4" />{attemptsLeft}/{status?.attempts_max ?? 5}
          </p>
        </div>
      </div>

      {/* Opponent card */}
      <div className="panel rounded-2xl p-6" data-testid="arena-opponent-card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-2xl text-ink tracking-wide flex items-center gap-2">
            <Swords className="w-5 h-5 text-rose-400" /> Challenger
          </h3>
          <button
            onClick={fetchOpponent}
            disabled={loadingOpp}
            data-testid="arena-refresh-btn"
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-ink transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingOpp ? "animate-spin" : ""}`} /> Find Another
          </button>
        </div>

        <AnimatePresence mode="wait">
          {loadingOpp ? (
            <motion.div key="loading" className="flex items-center justify-center py-14 text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin" />
            </motion.div>
          ) : noOpponents ? (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-14 text-slate-500" data-testid="arena-no-opponents">
              <Crosshair className="w-10 h-10 mx-auto mb-2 text-slate-600" />
              No challengers available yet — check back once more Shinobi have saved a team!
            </motion.div>
          ) : opponent ? (
            <motion.div key={opponent.user_id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-display text-2xl text-ink">{opponent.name}</p>
                  <p className="text-xs text-slate-500">Level {opponent.level} · Power {opponent.power}</p>
                </div>
                <Trophy className="w-8 h-8 text-slate-600" />
              </div>
              <div className="flex gap-3 justify-center mb-6">
                {opponent.team.map((t, i) => {
                  const rc = RARITY[t.rarity] || {};
                  const el = ELEMENT[t.element] || {};
                  return (
                    <div key={i} className="text-center" data-testid={`arena-opponent-hero-${i}`}>
                      <div className="w-16 h-20 rounded-lg overflow-hidden border-2" style={{ borderColor: rc.color }}>
                        <img src={t.portrait} alt={t.name} className="w-full h-full object-cover object-top" />
                      </div>
                      <p className="text-[10px] mt-1 font-semibold" style={{ color: el.color }}>{t.name.split(" ")[0]}</p>
                      <p className="text-[9px] text-slate-500">Lv{t.level}{t.ascension > 0 ? ` +${t.ascension}` : ""}</p>
                    </div>
                  );
                })}
              </div>
              <button
                onClick={fight}
                disabled={starting || noAttempts}
                data-testid="arena-fight-btn"
                className={`w-full py-3.5 rounded-lg font-display text-2xl tracking-wider flex items-center justify-center gap-2 transition-colors ${
                  noAttempts ? "bg-black/[0.04] text-slate-500 cursor-not-allowed" : "bg-fox text-ink hover:bg-orange-600"
                }`}
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

      <div className="flex items-center gap-4 mt-6 text-xs text-slate-500 justify-center">
        <span className="flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> Win: +20 Rating, +220 Ryo</span>
        <span className="flex items-center gap-1"><TrendingDown className="w-3.5 h-3.5 text-fox" /> Lose: -12 Rating</span>
      </div>
    </div>
  );
}
