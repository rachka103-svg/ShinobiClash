import { Check, Lock, Crown, Swords } from "lucide-react";

const NODE_SIZE = 60;
const BOSS_SIZE = 78;
const ROW_HEIGHT = 112;
const LEFT_X = 26;
const RIGHT_X = 74;
const TOP_PAD = 54;

function stageState(stage, stages, cleared) {
  const idx = stages.findIndex((s) => s.id === stage.id);
  if (cleared.includes(stage.id)) return "completed";
  const unlocked = idx === 0 || cleared.includes(stages[idx - 1].id);
  return unlocked ? "current" : "locked";
}

/**
 * The stage path for a single chapter — nodes connected by a thin glowing
 * line, alternating left/right so it reads as a winding trail rather than
 * an administrative list. Sits on its own subtly-tinted "terrain" panel
 * (rather than floating on raw black) for depth, using only the chapter's
 * existing accent token — no new art, no gradients beyond one restrained
 * radial wash. Positions are pre-computed (no layout thrash) and the
 * connector is one lightweight SVG — no per-frame animation, no particles.
 */
export default function CampaignStageMap({ stages, allStages, cleared, onSelectStage, accent = "#00E5FF" }) {
  const positions = stages.map((s, i) => ({
    x: i % 2 === 0 ? LEFT_X : RIGHT_X,
    y: TOP_PAD + i * ROW_HEIGHT,
  }));
  const totalHeight = TOP_PAD * 2 + Math.max(0, stages.length - 1) * ROW_HEIGHT;

  return (
    <div
      className="relative mx-auto max-w-[440px] rounded-2xl border border-white/[0.06] overflow-hidden"
      data-testid="campaign-stage-map"
    >
      {/* terrain panel — one restrained radial wash + inset vignette for depth, no photographic art needed */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 100% 60% at 50% 0%, ${accent}14, transparent 70%)`,
          boxShadow: "inset 0 0 60px rgba(0,0,0,0.5)",
        }}
      />
      <div className="relative" style={{ height: totalHeight }}>
        <svg
          className="absolute inset-0 w-full pointer-events-none"
          style={{ height: totalHeight }}
          viewBox={`0 0 100 ${totalHeight}`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {positions.slice(0, -1).map((p, i) => {
            const next = positions[i + 1];
            const traversed = cleared.includes(stages[i].id);
            return (
              <line
                key={i}
                x1={p.x} y1={p.y} x2={next.x} y2={next.y}
                stroke={traversed ? "#FFCA28" : "rgba(255,255,255,0.12)"}
                strokeWidth={traversed ? 1.4 : 1.1}
                strokeDasharray={traversed ? undefined : "3 4"}
                strokeLinecap="round"
              />
            );
          })}
        </svg>

        {stages.map((stage, i) => {
          const pos = positions[i];
          const state = stageState(stage, allStages, cleared);
          const isBoss = !!stage.is_boss;
          const size = isBoss ? BOSS_SIZE : NODE_SIZE;
          return (
            <div
              key={stage.id}
              className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
              style={{ left: `${pos.x}%`, top: pos.y }}
            >
              {isBoss && (
                <span className="text-[9px] font-bold tracking-widest text-amber-400 mb-1 flex items-center gap-0.5">
                  <Crown className="w-3 h-3" /> BOSS
                </span>
              )}
              {/* ground shadow — cheap static depth cue, no animation */}
              <div
                className="absolute rounded-full bg-black/40 blur-[2px]"
                style={{ width: size * 0.7, height: size * 0.22, top: size * 0.82 }}
              />
              <button
                onClick={() => onSelectStage(stage)}
                data-testid={`campaign-stage-node-${stage.id}`}
                aria-label={`${stage.name}${state === "locked" ? " (locked)" : ""}`}
                className={`relative rounded-full flex items-center justify-center border-2 transition-transform active:scale-95 ${
                  state === "current" ? "animate-pulse" : ""
                }`}
                style={{
                  width: size, height: size,
                  borderColor: state === "completed" ? "#FFCA28" : state === "current" ? "#00E5FF" : "rgba(255,255,255,0.14)",
                  background: state === "locked" ? "rgba(255,255,255,0.03)"
                    : isBoss ? "radial-gradient(circle,#3B0A0A,#0B0B14)"
                    : state === "completed" ? "radial-gradient(circle,rgba(255,202,40,0.16),#0B0B14)"
                    : "radial-gradient(circle,rgba(0,229,255,0.16),#0B0B14)",
                  boxShadow: state === "current" ? "0 0 12px rgba(0,229,255,0.35)" : state === "completed" ? "0 0 8px rgba(255,202,40,0.25)" : "none",
                }}
              >
                {state === "locked" ? (
                  <Lock className="w-5 h-5 text-slate-600" />
                ) : state === "completed" ? (
                  isBoss ? <Crown className="w-6 h-6 text-amber-400" /> : <Check className="w-6 h-6 text-amber-400" />
                ) : isBoss ? (
                  <Swords className="w-7 h-7 text-rose-400" />
                ) : (
                  <span className="font-display text-lg text-chakra">{i + 1}</span>
                )}
              </button>
              <span
                className={`text-[10px] mt-1.5 max-w-[100px] text-center leading-tight truncate ${
                  state === "locked" ? "text-slate-600" : "text-slate-200"
                }`}
                style={{ textShadow: "0 1px 3px rgba(0,0,0,0.9)" }}
              >
                {state === "current" && <span className="text-chakra font-bold block text-[9px] tracking-widest mb-0.5">NEXT</span>}
                {stage.name}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
