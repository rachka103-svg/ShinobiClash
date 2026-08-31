import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Trophy, Gem, Coins, Gift, Check, Lock } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useGame } from "@/context/GameContext";
import api from "@/lib/api";
import { toast } from "sonner";
import { RARITY } from "@/lib/styles";

const CATEGORIES = [
  { id: "beginner", name: "Beginner", color: "#00E676" },
  { id: "combat", name: "Combat", color: "#FF5722" },
  { id: "collection", name: "Collection", color: "#D500F9" },
  { id: "progression", name: "Progression", color: "#FFCA28" },
];

function RewardBadge({ reward, items }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {reward.ryo > 0 && <span className="flex items-center gap-1 text-[11px] font-bold text-amber-300"><Coins className="w-3 h-3" />{reward.ryo}</span>}
      {reward.gems > 0 && <span className="flex items-center gap-1 text-[11px] font-bold text-jutsu"><Gem className="w-3 h-3" />{reward.gems}</span>}
      {Object.entries(reward.items || {}).map(([iid, qty]) => {
        const it = items?.[iid];
        return (
          <span key={iid} className="flex items-center gap-1 text-[11px] font-semibold" style={{ color: it?.color || "#94a3b8" }}>
            <Gift className="w-3 h-3" />{it?.name || iid} ×{qty}
          </span>
        );
      })}
    </div>
  );
}

function AchievementCard({ ach, items, onClaim, busy }) {
  const pct = Math.min(100, (ach.progress / ach.target) * 100);
  const color = (RARITY[ach.rarity] || { color: "#00E5FF" }).color;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className={`relative rounded-xl p-3 border transition-colors ${ach.claimed ? "border-white/5 bg-white/[0.02] opacity-60" : ach.complete ? "border-emerald-500/40 bg-emerald-500/[0.06]" : "border-white/10 bg-white/[0.03]"}`}
      data-testid={`achievement-${ach.id}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-display text-base text-white leading-tight truncate">{ach.name}</p>
          <p className="text-[11px] text-slate-400 leading-tight mt-0.5">{ach.desc}</p>
        </div>
        {ach.claimed ? (
          <span className="shrink-0 w-7 h-7 rounded-full bg-white/10 flex items-center justify-center"><Check className="w-4 h-4 text-slate-400" /></span>
        ) : ach.complete ? (
          <button
            onClick={() => onClaim(ach)}
            disabled={busy}
            data-testid={`claim-${ach.id}`}
            className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500 text-[#05050A] hover:brightness-110 disabled:opacity-50 transition-all"
          >
            CLAIM
          </button>
        ) : (
          <span className="shrink-0 w-7 h-7 rounded-full bg-white/5 flex items-center justify-center"><Lock className="w-3.5 h-3.5 text-slate-500" /></span>
        )}
      </div>
      <div className="mt-2.5">
        <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: ach.complete ? "#10b981" : "#00E5FF" }} />
        </div>
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-[10px] text-slate-500 tabular-nums">{ach.progress}/{ach.target}</span>
          <RewardBadge reward={ach.reward} items={items} />
        </div>
      </div>
    </motion.div>
  );
}

export default function Achievements() {
  const { user, setUser } = useAuth();
  const { items } = useGame();
  const [busyId, setBusyId] = useState(null);

  const achievements = user?.achievements || [];
  const byCat = useMemo(() => {
    const m = {};
    for (const a of achievements) (m[a.category] = m[a.category] || []).push(a);
    return m;
  }, [achievements]);

  const claimedCount = achievements.filter((a) => a.claimed).length;

  const onClaim = async (ach) => {
    setBusyId(ach.id);
    try {
      const { data } = await api.post(`/game/achievements/claim/${ach.id}`);
      setUser(data.profile);
      toast.success(`${ach.name} reward claimed!`);
    } catch (e) {
      toast.error(e?.response?.data?.detail || e.message);
    } finally { setBusyId(null); }
  };

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-5 py-3" data-testid="achievements-page">
      <div className="flex items-end justify-between gap-3 mb-4">
        <div>
          <h1 className="font-display text-4xl tracking-wide text-ink flex items-center gap-2">
            <Trophy className="w-8 h-8 text-amber-300" /> ACHIEVEMENTS
          </h1>
          <p className="text-slate-500 text-sm">Complete goals to earn Gems, Ryo &amp; stat-boost items.</p>
        </div>
        <div className="font-display text-xl text-chakra" data-testid="achievements-count">
          {claimedCount}<span className="text-slate-500">/{achievements.length}</span>
        </div>
      </div>

      {CATEGORIES.map((cat) => {
        const list = byCat[cat.id] || [];
        if (!list.length) return null;
        return (
          <section key={cat.id} className="mb-6">
            <h2 className="font-display text-lg tracking-wide mb-2 flex items-center gap-2" style={{ color: cat.color }}>
              <span className="w-1.5 h-4 rounded-full" style={{ background: cat.color }} /> {cat.name}
            </h2>
            <div className="grid sm:grid-cols-2 gap-2.5">
              {list.map((a) => (
                <AchievementCard key={a.id} ach={a} items={items} onClaim={onClaim} busy={busyId === a.id} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
