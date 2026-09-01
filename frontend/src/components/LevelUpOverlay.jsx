import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Coins, Gem, Sparkles, Star, Ticket, ChevronRight } from "lucide-react";
import { CoinsIcon, GemsIcon } from "@/components/GameIcons";

/**
 * LevelUpOverlay — premium full-screen level-up celebration.
 *
 * Shows when `open` is true and `data` contains level-up info from the backend:
 *   { old_level, new_level, levels_gained, is_milestone, total_rewards }
 *
 * Sequence: dark scrim → radial glow → "LEVEL UP" title → animated level
 * number → reward list → CONTINUE button.
 *
 * Handles multiple level-ups (Level X → Y) with an aggregated reward summary.
 */
const REWARD_ICON = {
  ryo: { icon: CoinsIcon, color: "#FFCA28", label: "Ryo" },
  gems: { icon: GemsIcon, color: "#D500F9", label: "Gems" },
  summon_ticket: { icon: Ticket, color: "#FFCA28", label: "Summon Ticket" },
  exp_tome_minor: { icon: Sparkles, color: "#9E9E9E", label: "Minor EXP Tome" },
  exp_tome_greater: { icon: Sparkles, color: "#29B6F6", label: "Greater EXP Tome" },
  exp_tome_ancient: { icon: Sparkles, color: "#AB47BC", label: "Ancient EXP Tome" },
  ascension_crystal: { icon: Gem, color: "#00E5FF", label: "Ascension Crystal" },
};

export default function LevelUpOverlay({ open, data, onClose }) {
  const [stage, setStage] = useState(0); // 0=hidden, 1=title, 2=number, 3=rewards, 4=button

  useEffect(() => {
    if (!open || !data) { setStage(0); return; }
    const timers = [
      setTimeout(() => setStage(1), 100),
      setTimeout(() => setStage(2), 700),
      setTimeout(() => setStage(3), 1400),
      setTimeout(() => setStage(4), 2200),
    ];
    return () => timers.forEach(clearTimeout);
  }, [open, data]);

  const multi = data && data.levels_gained > 1;
  const milestone = data?.is_milestone;
  const total = data?.total_rewards || {};

  // Build reward display list
  const rewardList = [];
  if (total.ryo > 0) rewardList.push({ key: "ryo", qty: total.ryo });
  if (total.gems > 0) rewardList.push({ key: "gems", qty: total.gems });
  if (total.items) {
    for (const [iid, qty] of Object.entries(total.items)) {
      rewardList.push({ key: iid, qty });
    }
  }

  return (
    <AnimatePresence>
      {open && data && (
        <motion.div
          className="fixed inset-0 z-[130] flex items-center justify-center overflow-hidden"
          data-testid="level-up-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Dark scrim */}
          <div className="absolute inset-0" style={{ background: "rgba(5,5,10,0.95)", backdropFilter: "blur(6px)" }} />

          {/* Radial glow */}
          <motion.div
            className="absolute rounded-full"
            style={{
              width: "90vw", maxWidth: 700, height: 700,
              background: milestone
                ? "radial-gradient(circle, rgba(255,202,40,0.35) 0%, rgba(255,202,40,0.12) 30%, transparent 65%)"
                : "radial-gradient(circle, rgba(0,229,255,0.25) 0%, rgba(0,229,255,0.08) 30%, transparent 65%)",
            }}
            initial={{ scale: 0.3, opacity: 0 }}
            animate={{ scale: stage >= 1 ? 1 : 0.3, opacity: stage >= 1 ? 1 : 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />

          {/* Content */}
          <div className="relative z-10 flex flex-col items-center gap-4 px-6 max-w-md w-full">
            {/* LEVEL UP title */}
            <AnimatePresence>
              {stage >= 1 && (
                <motion.div
                  initial={{ y: -30, opacity: 0, scale: 0.8 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, ease: "backOut" }}
                  className="text-center"
                >
                  {milestone && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 }}
                      className="flex items-center justify-center gap-1 mb-1"
                    >
                      {[0, 1, 2].map(i => (
                        <Star key={i} className="w-5 h-5 text-amber-300" fill="currentColor" />
                      ))}
                    </motion.div>
                  )}
                  <h2
                    className="font-display text-4xl sm:text-5xl tracking-[0.15em]"
                    style={{
                      color: milestone ? "#FFCA28" : "#00E5FF",
                      textShadow: milestone
                        ? "0 0 30px rgba(255,202,40,0.8), 0 0 60px rgba(255,202,40,0.4)"
                        : "0 0 30px rgba(0,229,255,0.8), 0 0 60px rgba(0,229,255,0.4)",
                    }}
                  >
                    LEVEL UP
                  </h2>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Level number(s) */}
            <AnimatePresence>
              {stage >= 2 && (
                <motion.div
                  initial={{ scale: 0, opacity: 0, rotate: -10 }}
                  animate={{ scale: 1, opacity: 1, rotate: 0 }}
                  transition={{ duration: 0.6, ease: "backOut", type: "spring", bounce: 0.5 }}
                  className="flex items-center gap-3"
                >
                  {multi ? (
                    <>
                      <span
                        className="font-display text-5xl sm:text-6xl tabular-nums"
                        style={{ color: "#94A3B8", textShadow: "0 0 20px rgba(148,163,184,0.5)" }}
                      >
                        {data.old_level}
                      </span>
                      <ChevronRight className="w-8 h-8 text-slate-500" />
                      <span
                        className="font-display text-6xl sm:text-7xl tabular-nums"
                        style={{
                          color: milestone ? "#FFCA28" : "#00E5FF",
                          textShadow: milestone
                            ? "0 0 40px rgba(255,202,40,0.9), 0 0 80px rgba(255,202,40,0.5)"
                            : "0 0 40px rgba(0,229,255,0.9), 0 0 80px rgba(0,229,255,0.5)",
                        }}
                      >
                        {data.new_level}
                      </span>
                    </>
                  ) : (
                    <span
                      className="font-display text-7xl sm:text-8xl tabular-nums"
                      style={{
                        color: milestone ? "#FFCA28" : "#00E5FF",
                        textShadow: milestone
                          ? "0 0 40px rgba(255,202,40,0.9), 0 0 80px rgba(255,202,40,0.5)"
                          : "0 0 40px rgba(0,229,255,0.9), 0 0 80px rgba(0,229,255,0.5)",
                      }}
                    >
                      {data.new_level}
                    </span>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* "New Level Reached" subtitle */}
            <AnimatePresence>
              {stage >= 2 && (
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-sm text-slate-400 font-display tracking-wider uppercase"
                >
                  {milestone ? "Milestone Level Reached" : "New Level Reached"}
                </motion.p>
              )}
            </AnimatePresence>

            {/* Rewards */}
            <AnimatePresence>
              {stage >= 3 && rewardList.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="w-full mt-2"
                >
                  <p className="text-center text-xs text-slate-500 font-display tracking-widest uppercase mb-3">Rewards Earned</p>
                  <div className="flex flex-col gap-2 items-center">
                    {rewardList.map((r, i) => {
                      const cfg = REWARD_ICON[r.key] || { icon: Sparkles, color: "#94A3B8", label: r.key };
                      const Icon = cfg.icon;
                      return (
                        <motion.div
                          key={r.key}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.12, duration: 0.3 }}
                          className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-white/5 border border-white/10"
                          data-testid={`levelup-reward-${r.key}`}
                        >
                          <Icon className="w-5 h-5" style={{ color: cfg.color }} />
                          <span className="font-display text-lg" style={{ color: cfg.color }}>
                            +{r.qty.toLocaleString()}
                          </span>
                          <span className="text-sm text-slate-400">{cfg.label}</span>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* CONTINUE button */}
            <AnimatePresence>
              {stage >= 4 && (
                <motion.button
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  onClick={onClose}
                  data-testid="level-up-continue"
                  className="mt-4 px-10 py-3 rounded-xl font-display text-lg tracking-wide transition-colors hover:scale-105 active:scale-95"
                  style={{
                    background: milestone
                      ? "linear-gradient(135deg, #FFCA28, #FF8F00)"
                      : "linear-gradient(135deg, #00E5FF, #0091EA)",
                    color: "#05050A",
                    boxShadow: milestone
                      ? "0 0 30px rgba(255,202,40,0.4)"
                      : "0 0 30px rgba(0,229,255,0.4)",
                  }}
                >
                  CONTINUE
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
