import { useState } from "react";
import { Gift, Coins, Gem, Scroll, Check, Loader2 } from "lucide-react";

/** Tiny reward-preview chip for a single day's login reward. */
const RewardGlyphs = ({ reward }) => (
  <div className="flex items-center gap-1.5 flex-wrap">
    {reward.ryo > 0 && <span className="flex items-center gap-0.5 text-[10px] text-amber-300"><Coins className="w-3 h-3" />{reward.ryo}</span>}
    {reward.gems > 0 && <span className="flex items-center gap-0.5 text-[10px] text-jutsu"><Gem className="w-3 h-3" />{reward.gems}</span>}
    {Object.keys(reward.items || {}).length > 0 && <span className="flex items-center gap-0.5 text-[10px] text-chakra"><Scroll className="w-3 h-3" />item</span>}
  </div>
);

/**
 * Daily Login streak card — shown on the Lobby. Claiming advances a 7-day
 * cycle (missing a calendar day resets it); day 3/5/7 reward a few Gems so
 * the currency stays scarce but still has a reliable earn source.
 */
export default function DailyLoginCard({ login, onClaim }) {
  const [busy, setBusy] = useState(false);
  if (!login) return null;

  const handleClaim = async () => {
    if (busy || login.claimed_today) return;
    setBusy(true);
    try {
      await onClaim();
    } finally {
      setBusy(false);
    }
  };

  const currentDay = login.day || 0;

  return (
    <div className="panel rounded-xl p-4" data-testid="daily-login-card">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5 text-amber-300">
          <Gift className="w-4 h-4" />
          <span className="text-xs uppercase tracking-widest font-semibold">Daily Login</span>
        </div>
        <span className="text-xs text-slate-500" data-testid="daily-login-streak">Day {currentDay || "0"}/7</span>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-3">
        {Array.from({ length: 7 }, (_, i) => i + 1).map((d) => {
          const claimed = d <= currentDay;
          const isNext = d === login.next_day && !login.claimed_today;
          return (
            <div
              key={d}
              data-testid={`login-day-${d}`}
              className={`aspect-square rounded-md flex items-center justify-center text-[10px] font-bold border ${
                claimed ? "bg-amber-400/20 border-amber-400/50 text-amber-300"
                : isNext ? "border-chakra text-chakra bg-cyan-500/10 animate-pulse"
                : "border-black/10 text-slate-500"
              }`}
            >
              {claimed ? <Check className="w-3 h-3" /> : d}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">{login.claimed_today ? "Come back tomorrow" : `Day ${login.next_day} Reward`}</p>
          <RewardGlyphs reward={login.next_reward || { ryo: 0, gems: 0, items: {} }} />
        </div>
        <button
          onClick={handleClaim}
          disabled={busy || login.claimed_today}
          data-testid="daily-login-claim-btn"
          className="shrink-0 px-4 py-2 rounded-lg font-display text-sm tracking-wide bg-amber-400 text-[#05050A] hover:bg-amber-300 transition-colors disabled:opacity-40 disabled:bg-black/[0.06] disabled:text-slate-500 flex items-center gap-1.5"
        >
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
          {login.claimed_today ? "CLAIMED" : "CLAIM"}
        </button>
      </div>
    </div>
  );
}
