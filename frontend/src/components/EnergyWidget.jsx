import { useEffect, useState } from "react";
import { Zap, Gem, Loader2 } from "lucide-react";

function fmt(s) {
  if (s <= 0) return "Full";
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

/**
 * Displays current/max energy + a live countdown to the next regen tick.
 * The countdown is anchored to the server-computed `next_tick_in` and ticks
 * down locally; once it hits 0 we call `onRefresh` to re-sync with the
 * server (which also advances the `current` value there).
 *
 * Optionally offers an instant Gem-funded refill (`onGemRefill`) so players
 * who don't want to wait can buy back into the action immediately.
 */
export default function EnergyWidget({ energy, onRefresh, compact = false, gems, gemCostPerPoint = 4, gemCostMin = 15, onGemRefill }) {
  const [remaining, setRemaining] = useState(energy?.next_tick_in || 0);
  const [refilling, setRefilling] = useState(false);

  useEffect(() => {
    setRemaining(energy?.next_tick_in || 0);
  }, [energy?.next_tick_in, energy?.current]);

  useEffect(() => {
    if (!energy || energy.current >= energy.max) return;
    const t = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          onRefresh?.();
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [energy?.current, energy?.max]);

  if (!energy) return null;
  const pct = Math.min(100, (energy.current / energy.max) * 100);
  const full = energy.current >= energy.max;
  const missing = energy.max - energy.current;
  const estCost = Math.max(gemCostMin, missing * gemCostPerPoint);
  const canAfford = onGemRefill && !full && (gems ?? 0) >= estCost;

  if (compact) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-emerald-500/10 border border-emerald-500/30" data-testid="energy-widget-compact">
        <Zap className="w-4 h-4 text-emerald-400" />
        <span className="font-display text-lg text-emerald-300 tracking-wide" data-testid="energy-value-compact">{energy.current}</span>
        <span className="text-xs text-emerald-500/70">/{energy.max}</span>
      </div>
    );
  }

  const handleRefill = async () => {
    if (!onGemRefill || refilling) return;
    setRefilling(true);
    try {
      await onGemRefill();
    } finally {
      setRefilling(false);
    }
  };

  return (
    <div className="panel rounded-xl p-4" data-testid="energy-widget">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-emerald-400">
          <Zap className="w-4 h-4" />
          <span className="text-xs uppercase tracking-widest font-semibold">Energy</span>
        </div>
        <span className="text-xs text-slate-400" data-testid="energy-timer">{full ? "FULL" : `+1 in ${fmt(remaining)}`}</span>
      </div>
      <div className="flex items-end gap-2">
        <span className="font-display text-3xl text-white leading-none" data-testid="energy-value">{energy.current}</span>
        <span className="text-sm text-slate-500 mb-0.5">/ {energy.max}</span>
      </div>
      <div className="w-full h-2 rounded bg-black/40 overflow-hidden mt-2">
        <div
          className="h-full rounded transition-all"
          style={{ width: `${pct}%`, background: "linear-gradient(90deg,#00E676,#00E5FF)" }}
        />
      </div>
      {onGemRefill && !full && (
        <button
          onClick={handleRefill}
          disabled={refilling || !canAfford}
          data-testid="energy-gem-refill-btn"
          className="w-full mt-3 py-2 rounded-lg text-sm font-display tracking-wide flex items-center justify-center gap-1.5 border border-jutsu/40 text-jutsu bg-jutsu/10 hover:bg-jutsu/20 transition-colors disabled:opacity-40"
        >
          {refilling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Gem className="w-3.5 h-3.5" />}
          Refill Full — {estCost} Gems
        </button>
      )}
    </div>
  );
}
