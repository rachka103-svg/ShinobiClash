import { ChevronDown, Skull } from "lucide-react";
import { RARITY } from "@/lib/styles";

/**
 * BattleTurnOrder — vertical turn-order strip for the left side of the
 * battlefield (desktop only). Shows upcoming actors with rarity-colored
 * borders and a downward chevron.
 */
export function BattleTurnOrder({ combs, order, ptr, className }) {
  const upcoming = (order || [])
    .slice(ptr)
    .map((uid) => combs.find((c) => c.uid === uid))
    .filter(Boolean)
    .slice(0, 6);

  return (
    <div className={`flex-col items-center gap-1.5 py-3 px-2 shrink-0 ${className}`}>
      <p className="text-[8px] uppercase tracking-widest text-slate-500 font-bold mb-1">Turn Order</p>
      {upcoming.map((c, i) => {
        const r = RARITY[c.rarity] || RARITY.R;
        const isActive = i === 0;
        return (
          <div
            key={c.uid}
            className={`relative w-9 h-9 rounded-lg overflow-hidden border-2 ${isActive ? "ring-2 ring-chakra" : ""}`}
            style={{ borderColor: r.color, opacity: c.alive ? 1 : 0.3 }}
          >
            <img src={c.portrait} alt={c.name} className="w-full h-full object-cover object-top" />
            {!c.alive && <Skull className="absolute inset-0 m-auto w-4 h-4 text-white/60" />}
          </div>
        );
      })}
      <ChevronDown className="w-4 h-4 text-slate-600 mt-1" />
    </div>
  );
}

/**
 * BattleInfoPanel — right-side battle information panel (desktop only).
 * Shows a scrollable battle log and the current objective.
 */
export function BattleInfoPanel({ log, enemies, className }) {
  const total = enemies.length;
  const defeated = enemies.filter((e) => !e.alive).length;

  return (
    <div className={`flex-col gap-2 py-3 px-3 w-52 shrink-0 ${className}`}>
      {/* Battle Log */}
      <div>
        <p className="text-[8px] uppercase tracking-widest text-slate-500 font-bold mb-1.5">Battle Log</p>
        <div className="space-y-0.5 max-h-40 overflow-y-auto scrollbar-none">
          {log.length === 0 ? (
            <p className="text-[10px] text-slate-600">Battle has not started.</p>
          ) : (
            log.map((msg, i) => (
              <p key={i} className="text-[10px] text-slate-400 leading-tight">{msg}</p>
            ))
          )}
        </div>
      </div>
      {/* Objective */}
      <div className="pt-2 border-t border-white/8">
        <p className="text-[8px] uppercase tracking-widest text-slate-500 font-bold mb-1">Objective</p>
        <p className="text-xs text-slate-300">
          Defeat all enemies <span className="text-chakra font-bold">{defeated}</span> / {total}
        </p>
      </div>
    </div>
  );
}
