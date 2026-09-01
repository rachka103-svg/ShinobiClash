import { motion } from "framer-motion";
import { Castle, ChevronRight } from "lucide-react";
import { CheckIcon, LockIcon, SkullIcon } from "@/components/GameIcons";
import { SPIRE_BOSS_FLOORS, SPIRE_MILESTONE_FLOORS } from "@/lib/spireConfig";
import SpireTowerBg from "./SpireTowerBg";

const PURPLE = "#a855f7";
const GREEN = "#22c55e";

// Build the vertical climb: a window around the player's progress plus
// upcoming boss floors so the path always previews the next challenge.
function buildFloors(cleared) {
  const maxAttempt = cleared + 1;
  const low = Math.max(1, maxAttempt - 3);
  const high = maxAttempt + 2;
  const set = new Set();
  for (let f = low; f <= high; f++) set.add(f);
  // Add upcoming boss floors within a reasonable preview window
  [...SPIRE_BOSS_FLOORS].forEach((m) => {
    if (m > cleared && m <= maxAttempt + 8) set.add(m);
  });
  return [...set].sort((a, b) => b - a); // highest first → climbs upward
}

function NodeIcon({ state, boss, floor }) {
  if (state === "cleared") return <CheckIcon size={22} />;
  if (state === "locked") return <LockIcon size={16} />;
  if (boss) return <SkullIcon size={22} />;
  return <span className="font-display text-xl leading-none">{floor}</span>;
}

export default function SpireProgression({ cleared, floor, onSelect }) {
  const maxAttempt = cleared + 1;
  const floors = buildFloors(cleared);

  return (
    <div
      className="relative rounded-[20px] overflow-hidden h-[540px]"
      style={{ border: "1px solid rgba(168,85,247,0.22)" }}
      data-testid="spire-progress"
    >
      <SpireTowerBg />

      {/* readability scrim — darker on the right where labels sit */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "linear-gradient(90deg, rgba(6,8,17,0.35) 0%, rgba(6,8,17,0.15) 38%, rgba(6,8,17,0.78) 62%, rgba(6,8,17,0.92) 100%)" }}
      />

      {/* header chip */}
      <div className="absolute top-3 left-3 z-20 flex items-center gap-2">
        <span className="w-7 h-7 rounded-md flex items-center justify-center" style={{ background: "rgba(168,85,247,0.16)", border: "1px solid rgba(168,85,247,0.4)" }}>
          <Castle className="w-4 h-4" style={{ color: PURPLE }} />
        </span>
        <span className="text-[10px] uppercase tracking-[0.25em] text-purple-300/80">Dragon's Back</span>
      </div>

      {/* vertical glowing spine — brighter near the current floor */}
      <div
        className="absolute z-10 w-[3px] rounded-full"
        style={{
          left: "32%",
          top: "70px",
          bottom: "44px",
          transform: "translateX(-50%)",
          background: "linear-gradient(180deg, rgba(168,85,247,0.15) 0%, rgba(168,85,247,0.85) 40%, rgba(168,85,247,0.9) 55%, rgba(168,85,247,0.2) 100%)",
          boxShadow: "0 0 10px rgba(168,85,247,0.55)",
        }}
      />

      {/* nodes */}
      <div className="absolute inset-0 z-20 flex flex-col justify-between py-[70px] px-5">
        {floors.map((f, i) => {
          const state = f <= cleared ? "cleared" : f === maxAttempt ? "current" : "locked";
          const boss = SPIRE_BOSS_FLOORS.has(f);
          const isMilestone = SPIRE_MILESTONE_FLOORS.has(f);
          const selected = f === floor;
          const canPick = f <= maxAttempt;
          const color = state === "cleared" ? GREEN : state === "current" ? PURPLE : "#475568";

          return (
            <motion.button
              key={f}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => canPick && onSelect(f)}
              disabled={!canPick}
              data-testid={`spire-node-${f}`}
              className="relative flex items-center gap-3 disabled:cursor-not-allowed group"
              style={{ marginLeft: "calc(32% - 28px)" }}
            >
              <div
                className={`relative flex items-center justify-center rounded-full font-display transition-all ${boss ? "w-12 h-12" : "w-10 h-10"} ${selected ? "ring-2 ring-offset-2 ring-offset-[#070612]" : ""}`}
                style={{
                  background: state === "locked" ? "rgba(255,255,255,0.05)" : `radial-gradient(circle at 50% 35%, ${color}, ${color}55)`,
                  border: `2px solid ${state === "locked" ? "rgba(148,163,184,0.35)" : color}`,
                  color: state === "locked" ? "#94a3b8" : "#05050a",
                  boxShadow: state === "locked" ? "none" : state === "current" ? `0 0 18px ${color}, 0 0 32px ${color}66` : `0 0 12px ${color}88`,
                  ["--tw-ring-color"]: "#facc15",
                }}
              >
                <NodeIcon state={state} boss={boss} floor={f} />
              </div>

              {/* label block */}
              <div className="flex flex-col leading-tight">
                <div className="flex items-center gap-1.5">
                  <span
                    className="font-display text-lg tracking-wide"
                    style={{ color: selected ? "#facc15" : state === "locked" ? "#64748b" : color }}
                  >
                    FLOOR {f}
                  </span>
                  {state === "current" && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide" style={{ background: "rgba(168,85,247,0.22)", color: PURPLE, border: "1px solid rgba(168,85,247,0.5)" }}>
                      Current
                    </span>
                  )}
                  {state === "current" && <ChevronRight className="w-3.5 h-3.5" style={{ color: PURPLE }} />}
                </div>
                <span className="text-[11px] font-semibold" style={{ color: state === "cleared" ? GREEN : state === "current" ? "#c4b5fd" : boss ? PURPLE : "#475568" }}>
                  {state === "cleared" ? "CLEARED" : state === "current" ? "In progress" : isMilestone ? "MILESTONE BOSS" : boss ? "BOSS FLOOR" : "Locked"}
                </span>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
