import { Skull, Flame } from "lucide-react";
import { ELEMENT, RARITY } from "@/lib/styles";
import { ElementIcon } from "@/components/ElementIcons";

/**
 * BattleFighter — redesigned combatant card for the battle screen.
 * Element-colored borders, HP/Chakra numerical values, active glow + ground aura.
 * Props are identical to the old inline Fighter so it's a drop-in replacement.
 */
export default function BattleFighter({ c, active, attacking, shake, floaters, highlight, onClick, flip, subdued }) {
  const hpPct = (c.hp / c.maxHp) * 100;
  const ckPct = (c.chakra / c.maxChakra) * 100;
  const el = ELEMENT[c.element] || {};
  const elColor = el.color || "#94a3b8";

  return (
    <div className="relative flex flex-col items-center" style={{ width: 128 }}>
      {/* Floaters */}
      <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
        {floaters.map((f) => (
          <div key={f.id} className={`${f.isCrit ? "cine-crit" : "float-text"} font-display ${f.isCrit ? "text-3xl" : "text-2xl"} whitespace-nowrap`} style={{ color: f.color, textShadow: f.isCrit ? `0 0 12px ${f.color}, 0 2px 6px #000` : "0 2px 6px #000" }}>
            {f.text}
          </div>
        ))}
      </div>

      {/* Elemental aura behind card (when active) */}
      {active && c.alive && (
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 aura-element pointer-events-none rounded-xl"
          style={{
            width: 130,
            height: 160,
            background: `radial-gradient(ellipse at center, ${elColor}33 0%, transparent 70%)`,
          }}
        />
      )}

      {/* Card */}
      <button
        onClick={onClick}
        disabled={!highlight}
        data-testid={`fighter-${c.uid}`}
        className={`relative rounded-xl overflow-hidden border-2 transition-all ${shake ? "shake" : ""} ${attacking ? "attack-lunge" : ""} ${
          highlight ? "cursor-crosshair ring-2 ring-fox animate-pulse" : ""
        } ${!c.alive ? "grayscale opacity-40" : ""} ${active ? "active-turn" : ""} ${c.alive && !active ? "idle-breath" : ""}`}
        style={{
          width: 112,
          height: 146,
          borderColor: active ? elColor : highlight ? "#FF5722" : `${elColor}55`,
          boxShadow: active && c.alive
            ? `0 0 14px ${elColor}55, 0 4px 12px rgba(0,0,0,0.5)`
            : "0 4px 10px rgba(0,0,0,0.35)",
          transform: active && c.alive ? "scale(1.06)" : "scale(1)",
          "--lunge-y": flip ? "12px" : "-12px",
        }}
      >
        <img src={c.portrait} alt={c.name} className={`w-full h-full object-cover object-top ${flip ? "scale-x-[-1]" : ""}`} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        {shake && <div className="absolute inset-0 hit-flash pointer-events-none" />}
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

      {/* Ground shadow (always visible while alive) */}
      {c.alive && (
        <div className="absolute top-[140px] left-1/2 -translate-x-1/2 w-20 h-3 rounded-full pointer-events-none ground-shadow" style={{ background: `radial-gradient(ellipse, rgba(0,0,0,0.5) 0%, transparent 70%)` }} />
      )}

      {/* Active ground glow */}
      {active && c.alive && (
        <div className="absolute top-[138px] left-1/2 -translate-x-1/2 w-3/4 h-2 rounded-full pointer-events-none" style={{ background: `radial-gradient(ellipse, ${elColor}88, transparent 70%)` }} />
      )}

      {/* Name */}
      <div className="flex items-center justify-center gap-1 mt-1.5">
        <ElementIcon element={c.element} size={14} />
        <p className="text-xs font-semibold truncate" style={{ color: elColor }}>{c.name.split(" ")[0]}</p>
      </div>

      {/* HP bar + value */}
      <div className="w-full mt-0.5">
        <div className="flex items-center justify-between text-[8px] mb-0.5">
          <span className="text-fox font-bold">HP</span>
          <span className="text-slate-300 tabular-nums">{c.hp.toLocaleString()}/{c.maxHp.toLocaleString()}</span>
        </div>
        <div className="w-full h-2 rounded bg-black/60 overflow-hidden">
          <div className="h-full rounded hp-bar-fill" style={{ width: `${hpPct}%`, background: "linear-gradient(90deg,#FF1744,#FF8A80)" }} />
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
          <div className="h-full rounded ck-bar-fill" style={{ width: `${ckPct}%`, background: "#00E5FF" }} />
        </div>
      </div>

      {/* Statuses — compact icon badges with turn countdown */}
      {c.statuses?.length > 0 && (
        <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center" data-testid={`statuses-${c.uid}`}>
          {c.statuses.map((s) => {
            const STATUS_VISUAL = {
              burn: { icon: "🔥", color: "#FF5722", label: "Burn" },
              poison: { icon: "☠", color: "#76FF03", label: "Poison" },
              bleed: { icon: "🩸", color: "#FF1744", label: "Bleed" },
              stun: { icon: "💫", color: "#FFCA28", label: "Stun" },
              freeze: { icon: "❄", color: "#40C4FF", label: "Freeze" },
              shock: { icon: "⚡", color: "#FFEB3B", label: "Shock" },
              atk_down: { icon: "⚔", color: "#FF9100", label: "ATK Down" },
              def_down: { icon: "🛡", color: "#FF9100", label: "DEF Down" },
              curse_dot: { icon: "👁", color: "#E040FB", label: `Curse x${s.stacks || 1}` },
              blood_mark: { icon: "🔖", color: "#E040FB", label: `Mark x${s.stacks || 1}` },
            };
            const vis = STATUS_VISUAL[s.effectType] || { icon: "•", color: "#F48FB1", label: s.effectType };
            const turns = s.duration ?? 0;
            return (
              <span key={s.id} title={`${vis.label}${turns > 0 ? ` (${turns}t)` : ""}`}
                className="status-badge flex items-center gap-0.5 leading-none px-1 py-0.5 rounded bg-black/75 border"
                style={{ color: vis.color, borderColor: `${vis.color}66` }}>
                <span className="text-[9px]">{vis.icon}</span>
                {turns > 0 && turns < 99 && <span className="text-[7px] font-bold opacity-80">{turns}</span>}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
