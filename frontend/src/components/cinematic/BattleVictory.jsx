import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Coins, Gem, Zap, ArrowRight, Star } from "lucide-react";
import { CoinsIcon, GemsIcon } from "@/components/GameIcons";

/**
 * BattleVictory — cinematic victory sequence.
 * When triggered: screen darkens → camera pulls back → VICTORY text with
 * gold light → rewards reveal one at a time (scale in, glow, particle burst) →
 * CONTINUE button.
 *
 * Props:
 *   open     — boolean
 *   result   — resultData from the API (rewards, etc.)
 *   mode     — battle mode
 *   floor    — spire floor (for next floor button)
 *   onBack   — navigate back callback
 *   onNext   — next floor / retry callback
 *   onLobby  — lobby callback
 */
export default function BattleVictory({ open, result, mode, floor, onBack, onNext, onLobby, onRetry, isWin }) {
  const [stage, setStage] = useState(0); // 0=hidden, 1=title, 2=rewards, 3=buttons

  useEffect(() => {
    if (!open) { setStage(0); return; }
    // Sequence: title appears → rewards → buttons
    const t1 = setTimeout(() => setStage(1), 200);
    const t2 = setTimeout(() => setStage(2), 2000);
    const t3 = setTimeout(() => setStage(3), 3500);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [open]);

  if (!open) return null;

  const rewards = result?.rewards;
  const isVictory = isWin;

  // Build reward items for staggered reveal
  const rewardItems = [];
  if (rewards && isVictory) {
    if (rewards.ryo != null) rewardItems.push({ icon: "ryo", label: `${rewards.ryo} RYO`, color: "#FFCA28", delay: 0 });
    if (rewards.gems > 0) rewardItems.push({ icon: "gems", label: `${rewards.gems} GEMS`, color: "#D500F9", delay: 0.3 });
    if (rewards.exp != null) rewardItems.push({ icon: "exp", label: `${rewards.exp} EXP`, color: "#00E5FF", delay: 0.6 });
  }

  return (
    <div className="fixed inset-0 z-[120] pointer-events-none overflow-hidden flex items-center justify-center" data-testid="cinematic-victory">
      {/* Darkened battlefield */}
      <div className="absolute inset-0 victory-fade" style={{ background: "rgba(5,5,10,0.92)", backdropFilter: "blur(4px)" }} />

      {/* Gold light behind text */}
      {stage >= 1 && (
        <div
          className="absolute victory-gold-light rounded-full"
          style={{
            width: "80vw",
            maxWidth: 600,
            height: 600,
            background: isVictory
              ? "radial-gradient(circle, rgba(255,202,40,0.3) 0%, rgba(255,202,40,0.1) 30%, transparent 60%)"
              : "radial-gradient(circle, rgba(255,87,34,0.25) 0%, rgba(255,87,34,0.08) 30%, transparent 60%)",
          }}
        />
      )}

      {/* Title */}
      {stage >= 1 && (
        <div className="absolute inset-x-0 top-[18%] text-center">
          <h1
            className="victory-title font-display text-7xl sm:text-9xl"
            style={{
              color: isVictory ? "#FFCA28" : "#FF5722",
              textShadow: isVictory
                ? "0 0 40px rgba(255,202,40,0.8), 0 0 80px rgba(255,202,40,0.4)"
                : "0 0 40px rgba(255,87,34,0.8), 0 0 80px rgba(255,87,34,0.4)",
            }}
          >
            {isVictory ? "VICTORY" : "DEFEAT"}
          </h1>
        </div>
      )}

      {/* Rewards — staggered reveal */}
      {stage >= 2 && isVictory && rewards && (
        <div className="absolute inset-x-0 top-[48%] flex flex-col items-center gap-3">
          {rewardItems.map((r, i) => (
            <div
              key={i}
              className="reward-reveal flex items-center gap-2 font-display text-2xl sm:text-3xl"
              style={{
                color: r.color,
                textShadow: `0 0 16px ${r.color}88`,
                animationDelay: `${r.delay}s`,
                opacity: 0,
                animationFillMode: "forwards",
              }}
            >
              {r.icon === "ryo" && <CoinsIcon size={24} />}
              {r.icon === "gems" && <GemsIcon size={24} />}
              {r.icon === "exp" && <Zap size={24} />}
              + {r.label.split(" ")[0]} {r.label.split(" ").slice(1).join(" ")}
              {/* Reward particle */}
              <span
                className="reward-particle absolute"
                style={{ width: 4, height: 4, borderRadius: "50%", background: r.color, boxShadow: `0 0 8px ${r.color}` }}
              />
            </div>
          ))}
          {/* Hero exp */}
          {rewards.hero_exp?.length > 0 && (
            <div className="reward-reveal text-xs text-slate-400 mt-1" style={{ animationDelay: "1s", opacity: 0, animationFillMode: "forwards" }}>
              {rewards.hero_exp.map((h) => (
                <span key={h.instance_id} className="inline-block mx-1">
                  {h.name.split(" ")[0]} +{h.exp}xp{h.levels > 0 && <span className="text-emerald-400 font-semibold"> (+{h.levels}Lv)</span>}
                </span>
              ))}
            </div>
          )}
          {/* Ninja recruit */}
          {rewards.ninja && (
            <div className="reward-reveal text-jutsu font-display text-lg mt-1" style={{ animationDelay: "1.3s", opacity: 0, animationFillMode: "forwards" }}>
              ★ New ally: {rewards.ninja.name}
            </div>
          )}
          {/* Gear drop */}
          {rewards.gear && (
            <div className="reward-reveal font-display text-lg mt-1" style={{ animationDelay: "1.5s", opacity: 0, animationFillMode: "forwards", color: rewards.gear.color || "#FFCA28" }}>
              ★ {rewards.gear.set_name} {rewards.gear.slot} ({rewards.gear.rarity})
            </div>
          )}
          {/* Crystal drop */}
          {rewards.crystal && (
            <div className="reward-reveal font-display text-lg mt-1 flex items-center gap-1.5" style={{ animationDelay: "1.7s", opacity: 0, animationFillMode: "forwards", color: rewards.crystal.tier_color || "#AB47BC" }}>
              <Gem size={18} /> ★ {rewards.crystal.tier_name} Crystal ({rewards.crystal.main_stat.toUpperCase()})
            </div>
          )}
        </div>
      )}

      {/* Defeat message */}
      {stage >= 2 && !isVictory && (
        <div className="absolute inset-x-0 top-[48%] text-center">
          <p className="reward-reveal text-slate-400 text-lg" style={{ animationDelay: "0.3s", opacity: 0, animationFillMode: "forwards" }}>
            Your squad was wiped out. Train harder and try again.
          </p>
        </div>
      )}

      {/* Buttons */}
      {stage >= 3 && (
        <div className="absolute inset-x-0 bottom-[12%] flex flex-col items-center gap-3 pointer-events-auto">
          <div className="flex gap-3 px-4 w-full max-w-sm mx-auto">
            <button
              onClick={onBack}
              data-testid="cine-result-back"
              className="flex-1 py-3 rounded-xl font-display text-lg tracking-wide border border-white/15 text-slate-300 hover:bg-white/10 transition-colors"
            >
              {mode === "campaign" ? "CAMPAIGN" : mode === "arena" ? "ARENA" : "BACK"}
            </button>
            {isVictory ? (
              <button
                onClick={onNext || onLobby}
                data-testid="cine-result-next"
                className="flex-1 py-3 rounded-xl font-display text-lg tracking-wide flex items-center justify-center gap-1 transition-colors"
                style={{ background: "linear-gradient(135deg, #FFCA28, #FF8F00)", color: "#05050A" }}
              >
                {mode === "spire" ? "NEXT FLOOR" : mode === "trial" ? "FARM AGAIN" : mode === "arena" ? "FIND OPPONENT" : "LOBBY"}
                <ArrowRight size={18} />
              </button>
            ) : (
              <button
                onClick={onRetry}
                data-testid="cine-result-retry"
                className="flex-1 py-3 rounded-xl font-display text-lg tracking-wide transition-colors"
                style={{ background: "#FF5722", color: "#fff" }}
              >
                RETRY
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
