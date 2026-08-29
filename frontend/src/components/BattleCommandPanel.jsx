import { Zap, Star, Package, Sword, Heart, Shield, Sparkles, Bot } from "lucide-react";
import { ELEMENT } from "@/lib/styles";

const SKILL_ICON = { attack: Sword, aoe: Zap, heal: Heart, shield: Shield };
const TARGET_TYPE = { attack: "Single Enemy", aoe: "All Enemies", heal: "Single Ally", shield: "Single Ally" };

/**
 * BattleCommandPanel — the bottom tactical command interface.
 * Left: selected hero profile (portrait, name, level, element/role, HP/Chakra).
 * Center: "CHOOSE A JUTSU" with ability cards (icon, name, cost, description, target).
 * Right: SUMMON + ITEMS stacked buttons.
 * Handles all battle phases (select, auto, enemy, busy, intro).
 */
export default function BattleCommandPanel({ activeActor, phase, targeting, auto, onJutsuClick }) {
  const el = activeActor ? (ELEMENT[activeActor.element] || {}) : {};

  // ---- Phase: player select (manual) ----
  if (phase === "select" && activeActor && !auto) {
    return (
      <div className="absolute bottom-0 left-0 right-0 z-20 glass border-t border-cyan-500/30 px-3 py-2.5" data-testid="command-panel">
        <div className="max-w-5xl mx-auto flex items-stretch gap-3">
          {/* Left: Hero profile */}
          <div className="flex items-center gap-2 shrink-0 w-36 sm:w-44">
            <div className="relative w-12 h-12 rounded-lg overflow-hidden border-2 shrink-0" style={{ borderColor: el.color || "#94a3b8" }}>
              <img src={activeActor.portrait} alt="" className="w-full h-full object-cover object-top" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-display text-base text-white truncate leading-none">{activeActor.name}</p>
              <p className="text-[9px] text-slate-400 mt-0.5">Lv.{activeActor.level} · {activeActor.element} · {activeActor.role}</p>
              {/* HP bar */}
              <div className="flex items-center gap-1 mt-1">
                <div className="flex-1 h-1.5 rounded bg-black/60 overflow-hidden">
                  <div className="h-full rounded" style={{ width: `${(activeActor.hp / activeActor.maxHp) * 100}%`, background: "linear-gradient(90deg,#FF1744,#FF8A80)" }} />
                </div>
                <span className="text-[8px] text-fox tabular-nums shrink-0">{activeActor.hp.toLocaleString()}</span>
              </div>
              {/* Chakra bar */}
              <div className="flex items-center gap-1 mt-0.5">
                <div className="flex-1 h-1.5 rounded bg-black/60 overflow-hidden">
                  <div className="h-full rounded" style={{ width: `${(activeActor.chakra / activeActor.maxChakra) * 100}%`, background: "#00E5FF" }} />
                </div>
                <span className="text-[8px] text-chakra tabular-nums shrink-0">{activeActor.chakra}/{activeActor.maxChakra}</span>
              </div>
            </div>
          </div>

          {/* Center: Jutsu selection */}
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1.5">
              {targeting ? "▶ Select a Target" : "Choose a Jutsu"}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {activeActor.jutsus.map((j) => {
                const usable = j.chakra_cost <= activeActor.chakra;
                const aimed = targeting?.id === j.id;
                const SIcon = SKILL_ICON[j.type] || Sword;
                return (
                  <button
                    key={j.id}
                    onClick={() => onJutsuClick(j)}
                    disabled={!usable}
                    data-testid={`jutsu-${j.id}`}
                    className={`text-left p-2 rounded-lg border transition-all ${
                      aimed ? "border-chakra bg-cyan-500/15" : "border-white/10 hover:border-white/30"
                    } ${!usable ? "opacity-40" : "bg-black/30"}`}
                  >
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <SIcon className="w-3.5 h-3.5 shrink-0" style={{ color: el.color }} />
                      <span className="font-semibold text-white text-xs truncate flex-1">{j.name}</span>
                      {j.chakra_cost > 0
                        ? <span className="text-[10px] text-chakra flex items-center gap-0.5 shrink-0"><Zap className="w-3 h-3" />{j.chakra_cost}</span>
                        : <span className="text-[10px] text-emerald-400 shrink-0">+{j.chakra_gain}</span>}
                    </div>
                    <p className="text-[10px] text-slate-400 leading-tight line-clamp-2">{j.description}</p>
                    <p className="text-[9px] text-slate-500 mt-0.5">{TARGET_TYPE[j.type] || "Single Enemy"}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: Summon + Items */}
          <div className="hidden sm:flex flex-col gap-1.5 shrink-0 w-20">
            <button className="flex flex-col items-center justify-center gap-1 py-2.5 rounded-lg border border-amber-500/30 bg-amber-500/8 text-amber-400 hover:bg-amber-500/15 transition-colors">
              <Star className="w-4 h-4" />
              <span className="text-[10px] font-display tracking-wide">SUMMON</span>
            </button>
            <button className="flex flex-col items-center justify-center gap-1 py-2.5 rounded-lg border border-white/15 bg-white/[0.04] text-slate-300 hover:bg-white/10 transition-colors">
              <Package className="w-4 h-4" />
              <span className="text-[10px] font-display tracking-wide">ITEMS</span>
            </button>
          </div>
        </div>
        {/* Footer */}
        <p className="text-center text-[9px] text-slate-600 mt-1.5">Tap a skill to target · Tap and hold for details</p>
      </div>
    );
  }

  // ---- Phase: auto-battle ----
  if (phase === "select" && auto) {
    return (
      <div className="absolute bottom-0 left-0 right-0 z-20 glass border-t border-cyan-500/30 px-4 py-3" data-testid="auto-battle-indicator">
        <div className="flex items-center justify-center min-h-[80px]">
          <span className="font-display text-2xl tracking-widest text-chakra animate-pulse flex items-center gap-2">
            <Bot className="w-5 h-5" /> AUTO-BATTLING…
          </span>
        </div>
      </div>
    );
  }

  // ---- Phase: enemy / busy / intro ----
  return (
    <div className="absolute bottom-0 left-0 right-0 z-20 glass border-t border-cyan-500/30 px-4 py-3">
      <div className="flex items-center justify-center min-h-[80px]">
        <span className="font-display text-2xl tracking-widest text-slate-400 animate-pulse">
          {phase === "intro" ? "BATTLE START!" : phase === "enemy" ? "ENEMY TURN…" : "…"}
        </span>
      </div>
    </div>
  );
}
