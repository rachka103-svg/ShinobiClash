import { Skull, Flame } from "lucide-react";
import { ELEMENT, RARITY } from "@/lib/styles";

/**
 * BattleFighter — redesigned combatant card for the battle screen.
 * Element-colored borders, HP/Chakra numerical values, active glow + ground aura.
 * Props are identical to the old inline Fighter so it's a drop-in replacement.
 */
export default function BattleFighter({ c, active, shake, floaters, highlight, onClick, flip, subdued }) {
  const hpPct = (c.hp / c.maxHp) * 100;
  const ckPct = (c.chakra / c.maxChakra) * 100;
  const el = ELEMENT[c.element] || {};
  const elColor = el.color || "#94a3b8";

  return (
    <div className="relative flex flex-col items-center" style={{ width: 128 }}>
      {/* Floaters */}
      <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
        {floaters.map((f) => (
          <div key={f.id} className="float-text font-display text-2xl whitespace-nowrap" style={{ color: f.color, textShadow: "0 2px 6px #000" }}>
            {f.text}
          </div>
        ))}
      </div>

      {/* Card */}
      <button
        onClick={onClick}
        disabled={!highlight}
        data-testid={`fighter-${c.uid}`}
        className={`relative rounded-xl overflow-hidden border-2 transition-all ${shake ? "shake" : ""} ${
          highlight ? "cursor-crosshair ring-2 ring-fox animate-pulse" : ""
        } ${!c.alive ? "grayscale opacity-40" : ""} ${active ? "active-turn" : ""}`}
        style={{
          width: 112,
          height: 146,
          borderColor: active ? elColor : highlight ? "#FF5722" : `${elColor}55`,
          boxShadow: active && c.alive
            ? `0 0 14px ${elColor}55, 0 4px 12px rgba(0,0,0,0.5)`
            : "0 4px 10px rgba(0,0,0,0.35)",
          transform: active && c.alive ? "scale(1.06)" : "scale(1)",
        }}
      >
        <img src={c.portrait} alt={c.name} className={`w-full h-full object-cover object-top ${flip ? "scale-x-[-1]" : ""}`} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        {subdued && <div className="absolute inset-0 bg-black/15" />}
        {!c.alive && <Skull className="absolute inset-0 m-auto w-8 h-8 text-white/70" />}
        {/* Level badge */}
        <span className="absolute top-1 right-1 text-[9px] font-display text-white bg-black/60 px-1.5 py-0.5 rounded">LV.{c.level}</span>
        {/* Enraged */}
        {c.enraged && (
          <span data-testid={`enraged-${c.uid}`} className="absolute top-1 left-1 flex items-center gap-0.5 text-[8px] font-display text-white bg-red-600/80 px-1 rounded">
            <Flame className="w-2.5 h-2.5" /> RAGE
          </span>
        )}
        {/* Shield phase */}
        {c.shieldPhaseActive && (
          <span data-testid={`shield-phase-${c.uid}`} className="absolute bottom-1 left-1 text-[8px] font-display text-white bg-sky-600/80 px-1 rounded">
            WARDED
          </span>
        )}
      </button>

      {/* Active ground glow */}
      {active && c.alive && (
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3/4 h-2 rounded-full pointer-events-none" style={{ background: `radial-gradient(ellipse, ${elColor}88, transparent 70%)` }} />
      )}

      {/* Name */}
      <p className="text-xs font-semibold mt-1.5 truncate w-full text-center" style={{ color: elColor }}>{c.name.split(" ")[0]}</p>

      {/* HP bar + value */}
      <div className="w-full mt-0.5">
        <div className="flex items-center justify-between text-[8px] mb-0.5">
          <span className="text-fox font-bold">HP</span>
          <span className="text-slate-300 tabular-nums">{c.hp.toLocaleString()}/{c.maxHp.toLocaleString()}</span>
        </div>
        <div className="w-full h-2 rounded bg-black/60 overflow-hidden">
          <div className="h-full rounded" style={{ width: `${hpPct}%`, background: "linear-gradient(90deg,#FF1744,#FF8A80)" }} />
        </div>
      </div>

      {/* Shield indicator */}
      {c.shield > 0 && <span className="text-[9px] text-sky-300 mt-0.5">🛡 {c.shield}</span>}

      {/* Chakra bar + value */}
      <div className="w-full mt-0.5">
        <div className="flex items-center justify-between text-[8px] mb-0.5">
          <span className="text-chakra font-bold">⚡</span>
          <span className="text-slate-300 tabular-nums">{c.chakra}/{c.maxChakra}</span>
        </div>
        <div className="w-full h-1.5 rounded bg-black/60 overflow-hidden">
          <div className="h-full rounded" style={{ width: `${ckPct}%`, background: "#00E5FF" }} />
        </div>
      </div>

      {/* Statuses */}
      {c.statuses?.length > 0 && (
        <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center" data-testid={`statuses-${c.uid}`}>
          {c.statuses.map((s) => {
            const labelMap = {
              blood_mark: `MARK ${s.stacks}`, curse_dot: "CURSE",
              burn: "BURN", poison: "POISON", bleed: "BLEED",
              stun: "STUN", freeze: "FREEZE",
              atk_down: "ATK↓", def_down: "DEF↓",
            };
            const colorMap = {
              burn: "#FF5722", poison: "#76FF03", bleed: "#FF1744",
              stun: "#FFCA28", freeze: "#40C4FF",
              atk_down: "#FF9100", def_down: "#FF9100",
            };
            const color = colorMap[s.effectType] || "#F48FB1";
            return (
              <span key={s.id} title={s.effectType}
                className="text-[7px] leading-none px-1 py-0.5 rounded bg-black/70 border"
                style={{ color, borderColor: `${color}55` }}>
                {labelMap[s.effectType] || s.effectType}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
