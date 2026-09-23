import { Zap, Bot } from "lucide-react";
import { ELEMENT } from "@/lib/styles";
import { ElementIcon } from "@/components/ElementIcons";
import {
  SkillAttackIcon,
  SkillAoeIcon,
  SkillHealIcon,
  SkillShieldIcon,
  SummonIcon,
  ItemsIcon,
} from "@/components/GameIcons";

const SKILL_ICON = {
  attack: SkillAttackIcon,
  aoe: SkillAoeIcon,
  heal: SkillHealIcon,
  shield: SkillShieldIcon,
};

const TARGET_TYPE = {
  attack: "Single Enemy",
  aoe: "All Enemies",
  heal: "Single Ally",
  aoe_heal: "All Allies",
  shield: "Single Ally",
  revive: "Fallen Ally",
  team_buff: "All Allies",
  taunt: "Self",
};

/**
 * BattleCommandPanel — the bottom tactical command interface.
 *
 * IMPORTANT PASSIVE RULE:
 * Passive abilities must NEVER appear as manually selectable battle commands.
 * This component defensively filters them out even if stale or malformed
 * battle state somehow places them inside activeActor.jutsus.
 */
export default function BattleCommandPanel({
  activeActor,
  phase,
  targeting,
  auto,
  onJutsuClick,
}) {
  const el = activeActor
    ? ELEMENT[activeActor.element] || {}
    : {};

  // Central passive detector.
  // We intentionally check several markers because older game data may
  // represent passives differently.
  const isPassiveSkill = (j) => {
    return (
      j?.type === "passive" ||
      j?.signature === true ||
      j?.passive === true ||
      String(j?.id || "").endsWith("_passive") ||
      String(j?.effect_type || "") === "passive"
    );
  };

  // Only actual active abilities are allowed into the command panel.
  const selectableJutsus = activeActor
    ? (activeActor.jutsus || []).filter(
        (j) => !isPassiveSkill(j)
      )
    : [];

  // ---- Phase: player select (manual) ----
  if (phase === "select" && activeActor && !auto) {
    return (
      <div
        className="absolute bottom-0 left-0 right-0 z-20 glass border-t border-cyan-500/30 px-2 sm:px-3 py-1.5 sm:py-2"
        data-testid="command-panel"
      >
        <div className="max-w-5xl lg:max-w-6xl mx-auto flex items-stretch gap-2 sm:gap-3 lg:gap-4">

          {/* Left: Hero profile */}
          <div className="flex items-center gap-1.5 shrink-0 w-28 sm:w-44 lg:w-56">
            <div
              className="relative w-10 h-10 sm:w-12 sm:h-12 lg:w-16 lg:h-16 rounded-lg overflow-hidden border-2 shrink-0"
              style={{
                borderColor: el.color || "#94a3b8",
              }}
            >
              <img
                src={activeActor.portrait}
                alt=""
                className="w-full h-full object-cover object-top"
              />
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-display text-sm sm:text-base lg:text-lg text-white truncate leading-none">
                {activeActor.name}
              </p>

              <div className="flex items-center gap-1 mt-0.5">
                <ElementIcon
                  element={activeActor.element}
                  size={12}
                />

                <p className="text-[9px] lg:text-xs text-slate-400">
                  Lv.{activeActor.level} ·{" "}
                  {activeActor.element} ·{" "}
                  {activeActor.role}
                </p>
              </div>

              {/* HP bar */}
              <div className="flex items-center gap-1 mt-1">
                <div className="flex-1 h-1.5 rounded bg-black/60 overflow-hidden">
                  <div
                    className="h-full rounded"
                    style={{
                      width: `${
                        (activeActor.hp /
                          activeActor.maxHp) *
                        100
                      }%`,
                      background:
                        "linear-gradient(90deg,#FF1744,#FF8A80)",
                    }}
                  />
                </div>

                <span className="text-[9px] text-fox tabular-nums shrink-0">
                  {activeActor.hp.toLocaleString()}
                </span>
              </div>

              {/* Chakra bar */}
              <div className="flex items-center gap-1 mt-0.5">
                <div className="flex-1 h-1.5 rounded bg-black/60 overflow-hidden">
                  <div
                    className="h-full rounded"
                    style={{
                      width: `${
                        (activeActor.chakra /
                          activeActor.maxChakra) *
                        100
                      }%`,
                      background: "#00E5FF",
                    }}
                  />
                </div>

                <span className="text-[9px] text-chakra tabular-nums shrink-0">
                  {activeActor.chakra}/{activeActor.maxChakra}
                </span>
              </div>
            </div>
          </div>

          {/* Center: Jutsu selection */}
          <div className="flex-1 min-w-0">

            <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1.5">
              {targeting
                ? "▶ Select a Target"
                : "Choose a Jutsu"}
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 lg:gap-3">

              {selectableJutsus.map((j) => {
                const usable =
                  j.chakra_cost <=
                  activeActor.chakra;

                const aimed =
                  targeting?.id === j.id;

                const SIcon =
                  SKILL_ICON[j.type] ||
                  SkillAttackIcon;

                return (
                  <button
                    key={j.id}
                    onClick={() =>
                      onJutsuClick(j)
                    }
                    disabled={!usable}
                    data-testid={`jutsu-${j.id}`}
                    className={`text-left p-2 lg:p-3 rounded-lg border transition-all ${
                      aimed
                        ? "border-chakra bg-cyan-500/15"
                        : "border-white/10 hover:border-white/30"
                    } ${
                      !usable
                        ? "opacity-40"
                        : "bg-black/30"
                    }`}
                  >

                    <div className="flex items-center gap-1.5 mb-0.5">

                      <SIcon
                        className="w-3.5 h-3.5 shrink-0"
                        style={{
                          color: el.color,
                        }}
                      />

                      <span className="font-semibold text-white text-xs lg:text-sm truncate flex-1">
                        {j.name}
                      </span>

                      {j.chakra_cost > 0 ? (
                        <span className="text-[10px] text-chakra flex items-center gap-0.5 shrink-0">
                          <Zap className="w-3 h-3" />
                          {j.chakra_cost}
                        </span>
                      ) : (
                        <span className="text-[10px] text-emerald-400 shrink-0">
                          +{j.chakra_gain}
                        </span>
                      )}

                    </div>

                    <p className="text-[10px] lg:text-xs text-slate-400 leading-tight line-clamp-2">
                      {j.description}
                    </p>

                    <p className="text-[9px] text-slate-500 mt-0.5">
                      {TARGET_TYPE[j.type] || "—"}
                    </p>

                  </button>
                );
              })}

            </div>
          </div>

          {/* Right: Summon + Items */}
          <div className="hidden sm:flex flex-col gap-1.5 shrink-0 w-20">

            <button className="flex flex-col items-center justify-center gap-1 py-2.5 rounded-lg border border-amber-500/30 bg-amber-500/8 text-amber-400 hover:bg-amber-500/15 transition-colors">
              <SummonIcon size={16} />

              <span className="text-[10px] font-display tracking-wide">
                SUMMON
              </span>
            </button>

            <button className="flex flex-col items-center justify-center gap-1 py-2.5 rounded-lg border border-white/15 bg-white/[0.04] text-slate-300 hover:bg-white/10 transition-colors">
              <ItemsIcon size={16} />

              <span className="text-[10px] font-display tracking-wide">
                ITEMS
              </span>
            </button>

          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[9px] text-slate-600 mt-1">
          Tap a skill to target · Tap and hold for details
        </p>
      </div>
    );
  }

  // ---- Phase: auto-battle ----
  if (phase === "select" && auto) {
    return (
      <div
        className="absolute bottom-0 left-0 right-0 z-20 glass border-t border-cyan-500/30 px-4 py-1.5"
        data-testid="auto-battle-indicator"
      >
        <div className="flex items-center justify-center min-h-[36px]">

          <span className="font-display text-base tracking-widest text-chakra animate-pulse flex items-center gap-2">
            <Bot className="w-4 h-4" />
            AUTO-BATTLING…
          </span>

        </div>
      </div>
    );
  }

  // ---- Phase: enemy / busy / intro ----
  return (
    <div className="absolute bottom-0 left-0 right-0 z-20 glass border-t border-cyan-500/30 px-4 py-1.5">

      <div className="flex items-center justify-center min-h-[36px]">

        <span className="font-display text-base tracking-widest text-slate-400 animate-pulse">

          {phase === "intro"
            ? "BATTLE START!"
            : phase === "enemy"
              ? "ENEMY TURN…"
              : "…"}

        </span>

      </div>
    </div>
  );
}
