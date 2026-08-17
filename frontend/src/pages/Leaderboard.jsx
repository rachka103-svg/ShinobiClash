import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Trophy, Crown, Zap, Loader2, Crosshair } from "lucide-react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function Leaderboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("power"); // "power" | "arena"

  useEffect(() => {
    api.get("/game/leaderboard").then(({ data }) => setData(data));
  }, []);

  const rows = data ? (tab === "power" ? data.leaderboard : data.arena_leaderboard) : null;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8" data-testid="leaderboard-page">
      <div className="flex items-center gap-3 mb-6">
        <Trophy className="w-8 h-8 text-amber-400" />
        <h1 className="font-display text-5xl tracking-wide text-white">RANKINGS</h1>
      </div>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab("power")}
          data-testid="leaderboard-tab-power"
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-display text-sm tracking-wide transition-colors ${
            tab === "power" ? "bg-chakra text-[#05050A]" : "bg-white/5 text-slate-400 hover:text-white"
          }`}
        >
          <Zap className="w-4 h-4" /> POWER
        </button>
        <button
          onClick={() => setTab("arena")}
          data-testid="leaderboard-tab-arena"
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-display text-sm tracking-wide transition-colors ${
            tab === "arena" ? "bg-fox text-white" : "bg-white/5 text-slate-400 hover:text-white"
          }`}
        >
          <Crosshair className="w-4 h-4" /> ARENA
        </button>
      </div>

      {!rows ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 text-chakra animate-spin" /></div>
      ) : rows.length === 0 ? (
        <div className="panel rounded-xl p-8 text-center text-slate-400">No rankings yet — be the first!</div>
      ) : (
        <div className="space-y-2">
          {rows.map((r, i) => {
            const isMe = r.name === user?.name;
            const medal = ["#FFCA28", "#B0BEC5", "#A1745C"][i];
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                data-testid={`rank-row-${i}`}
                className={`panel rounded-lg p-4 flex items-center gap-4 ${isMe ? "ring-1 ring-chakra" : ""}`}
                style={{ borderLeft: medal ? `3px solid ${medal}` : "3px solid transparent" }}
              >
                <div className="w-8 text-center">
                  {i < 3 ? <Crown className="w-6 h-6 mx-auto" style={{ color: medal }} /> : <span className="font-display text-xl text-slate-500">{i + 1}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-display text-2xl tracking-wide text-white truncate">{r.name} {isMe && <span className="text-xs text-chakra">(You)</span>}</p>
                  {tab === "power" ? (
                    <p className="text-xs text-slate-400">Rank Lv. {r.level} · {r.wins} wins · {r.cleared} stages</p>
                  ) : (
                    <p className="text-xs text-slate-400">{r.arena_wins} wins · {r.arena_losses} losses</p>
                  )}
                </div>
                {tab === "power" ? (
                  <div className="flex items-center gap-1.5 text-fox">
                    <Zap className="w-4 h-4" />
                    <span className="font-display text-2xl">{r.team_power}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-rose-400">
                    <Crosshair className="w-4 h-4" />
                    <span className="font-display text-2xl">{r.arena_rating}</span>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
