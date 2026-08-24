import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Trophy, Crown, Zap, Loader2, Crosshair, Medal } from "lucide-react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { GOLD } from "@/lib/theme";
import { DecoCorners } from "@/components/RarityFx";

export default function Leaderboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("power"); // "power" | "arena"

  useEffect(() => {
    api.get("/game/leaderboard").then(({ data }) => setData(data));
  }, []);

  const rows = data ? (tab === "power" ? data.leaderboard : data.arena_leaderboard) : null;
  const MEDALS = ["#FFCA28", "#C7D2DA", "#CD8A54"]; // gold · silver · bronze

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8" data-testid="leaderboard-page">
      {/* header */}
      <div className="mb-1 flex items-center gap-3">
        <div className="gold-crest w-11 h-11 rounded-xl flex items-center justify-center shrink-0">
          <Trophy className="w-6 h-6" style={{ color: GOLD.base }} />
        </div>
        <div>
          <h1 className="font-display text-5xl tracking-wide text-ink leading-none">RANKINGS</h1>
          <p className="text-slate-500 text-sm mt-1">The realm's mightiest sensei, ranked.</p>
        </div>
      </div>
      <div className="gold-pinstripe max-w-[220px] my-5 opacity-70" />

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab("power")}
          data-testid="leaderboard-tab-power"
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-display text-sm tracking-wide transition-colors ${
            tab === "power" ? "bg-chakra text-[#05050A]" : "bg-black/[0.04] border border-black/10 text-slate-500 hover:text-ink"
          }`}
        >
          <Zap className="w-4 h-4" /> POWER
        </button>
        <button
          onClick={() => setTab("arena")}
          data-testid="leaderboard-tab-arena"
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-display text-sm tracking-wide transition-colors ${
            tab === "arena" ? "bg-fox text-ink" : "bg-black/[0.04] border border-black/10 text-slate-500 hover:text-ink"
          }`}
        >
          <Crosshair className="w-4 h-4" /> ARENA
        </button>
      </div>

      {!rows ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 text-chakra animate-spin" /></div>
      ) : rows.length === 0 ? (
        <div className="glass-panel p-8 text-center text-slate-500">No rankings yet — be the first!</div>
      ) : (
        <div className="space-y-2.5">
          {rows.map((r, i) => {
            const isMe = r.name === user?.name;
            const medal = MEDALS[i];
            const top = i < 3;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                data-testid={`rank-row-${i}`}
                className={`glass-panel relative overflow-hidden p-4 flex items-center gap-4 ${isMe ? "ring-1 ring-chakra" : ""}`}
                style={{
                  borderLeft: medal ? `3px solid ${medal}` : undefined,
                  boxShadow: top ? `var(--shadow-deep), inset 0 0 40px ${medal}18` : "var(--shadow-deep)",
                }}
              >
                {i === 0 && <DecoCorners level={4} color={GOLD.base} size={18} />}
                <div className="w-9 text-center shrink-0">
                  {top ? (
                    i === 0
                      ? <Crown className="w-7 h-7 mx-auto" style={{ color: medal, filter: `drop-shadow(0 0 8px ${medal})` }} />
                      : <Medal className="w-6 h-6 mx-auto" style={{ color: medal, filter: `drop-shadow(0 0 6px ${medal})` }} />
                  ) : (
                    <span className="font-display text-xl text-slate-500">{i + 1}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-display text-2xl tracking-wide text-ink truncate">{r.name} {isMe && <span className="text-xs text-chakra align-middle">(You)</span>}</p>
                  {tab === "power" ? (
                    <p className="text-xs text-slate-500">Rank Lv. {r.level} · {r.wins} wins · {r.cleared} stages</p>
                  ) : (
                    <p className="text-xs text-slate-500">{r.arena_wins} wins · {r.arena_losses} losses</p>
                  )}
                </div>
                {tab === "power" ? (
                  <div className="flex items-center gap-1.5 text-fox shrink-0">
                    <Zap className="w-4 h-4" />
                    <span className="font-display text-2xl tabular-nums">{r.team_power}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-rose-400 shrink-0">
                    <Crosshair className="w-4 h-4" />
                    <span className="font-display text-2xl tabular-nums">{r.arena_rating}</span>
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
