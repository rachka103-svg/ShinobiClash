import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Gift, Loader2, Coins } from "lucide-react";
import { toast } from "sonner";
import api, { formatApiErrorDetail } from "@/lib/api";
import { useGame } from "@/context/GameContext";

/** Daily missions list with progress bars + claim buttons. Progress is
 * driven entirely by server-side gameplay events; this panel is read/claim
 * only. */
export default function MissionsPanel({ missions, onClaimed }) {
  const { items } = useGame();
  const [claimingId, setClaimingId] = useState(null);

  const claim = async (id) => {
    setClaimingId(id);
    try {
      const { data } = await api.post(`/game/missions/claim/${id}`);
      onClaimed?.(data.profile);
      toast.success("Mission reward claimed!");
    } catch (e) {
      toast.error(formatApiErrorDetail(e?.response?.data?.detail));
    } finally {
      setClaimingId(null);
    }
  };

  if (!missions?.length) return null;

  return (
    <div className="panel rounded-xl p-5" data-testid="missions-panel">
      <div className="flex items-center gap-2 mb-4">
        <Gift className="w-5 h-5 text-fox" />
        <h3 className="font-display text-2xl tracking-wide text-ink">Daily Missions</h3>
      </div>
      <div className="space-y-3">
        {missions.map((m) => {
          const pct = Math.min(100, (m.progress / m.target) * 100);
          const claimable = m.complete && !m.claimed;
          const rewardText = [
            m.reward.ryo ? `${m.reward.ryo} Ryo` : null,
            ...Object.entries(m.reward.items || {}).map(([iid, qty]) => `${items[iid]?.name || iid} ×${qty}`),
          ].filter(Boolean).join(" · ");
          return (
            <motion.div
              key={m.id}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex items-center gap-3"
              data-testid={`mission-${m.id}`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-ink truncate">{m.name}</span>
                  <span className="text-[11px] text-slate-500 shrink-0" data-testid={`mission-progress-${m.id}`}>
                    {Math.min(m.progress, m.target)}/{m.target}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">{m.desc}</p>
                {rewardText && (
                  <p className="text-[10px] text-amber-400/80 flex items-center gap-1 mt-0.5">
                    <Coins className="w-3 h-3" /> {rewardText}
                  </p>
                )}
                <div className="w-full h-1.5 rounded bg-black/40 overflow-hidden mt-1.5">
                  <div
                    className="h-full rounded transition-all"
                    style={{ width: `${pct}%`, background: m.claimed ? "#475569" : claimable ? "#00E676" : "#00E5FF" }}
                  />
                </div>
              </div>
              <button
                onClick={() => claim(m.id)}
                disabled={!claimable || claimingId === m.id}
                data-testid={`claim-btn-${m.id}`}
                className={`shrink-0 px-3 py-2 rounded-lg text-xs font-display tracking-wide flex items-center gap-1 transition-colors ${
                  m.claimed
                    ? "bg-black/[0.04] text-slate-500"
                    : claimable
                    ? "bg-chakra text-[#05050A] hover:bg-cyan-300"
                    : "bg-black/[0.04] text-slate-500 cursor-not-allowed"
                }`}
              >
                {claimingId === m.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : m.claimed ? (
                  <><CheckCircle2 className="w-3.5 h-3.5" /> Claimed</>
                ) : (
                  "Claim"
                )}
              </button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
