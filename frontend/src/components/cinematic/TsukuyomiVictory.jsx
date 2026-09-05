import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Sparkles, Gem, Star, ChevronRight } from "lucide-react";
import { CoinsIcon } from "@/components/GameIcons";
import { ItemIcon } from "@/components/ItemIcon";
import { useGame } from "@/context/GameContext";

const DIFF_LABELS = {
  normal: "NORMAL MODE",
  hard: "HARD MODE",
  nightmare: "NIGHTMARE MODE",
};

/**
 * TsukuyomiVictory — themed victory screen for Tsukuyomi battles.
 * Gold-on-dark aesthetic with currency bar, team XP, and reward cards.
 *
 * Props match BattleVictory so it can be swapped in from Battle.jsx.
 */
export default function TsukuyomiVictory({ open, result, mode, onBack, onNext, onRetry, isWin }) {
  const [stage, setStage] = useState(0);
  const { items: itemMeta, catalogById, user } = useGame();

  useEffect(() => {
    if (!open) { setStage(0); return; }
    const t1 = setTimeout(() => setStage(1), 200);
    const t2 = setTimeout(() => setStage(2), 900);
    const t3 = setTimeout(() => setStage(3), 1600);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [open]);

  if (!open) return null;

  const rewards = result?.rewards;
  const isVictory = isWin;
  const difficulty = result?.rewards ? null : null; // not available in result; derive from tsukuFight
  const diffLabel = DIFF_LABELS[result?.difficulty] || "NIGHTMARE MODE";

  // Build hero exp entries with portrait lookup
  const heroExp = (rewards?.hero_exp || []).map((h) => {
    const inst = user?.ninjas?.find((n) => n.instance_id === h.instance_id);
    const tmpl = inst ? catalogById[inst.template_id] : null;
    return {
      ...h,
      portrait: tmpl?.portrait,
      element: tmpl?.element,
      rarity: tmpl?.rarity,
    };
  });

  // Build material reward cards
  const materialCards = [];
  if (rewards?.items) {
    for (const [iid, qty] of Object.entries(rewards.items)) {
      const meta = itemMeta[iid] || { name: iid, color: "#94A3B8", icon: "sparkles" };
      materialCards.push({ iid, qty, meta });
    }
  }

  // Rare drops (gear, crystal, card) — shown as special cards
  const rareDrops = [];
  if (rewards?.gear) {
    rareDrops.push({
      type: "gear",
      name: rewards.gear.set_name ? `${rewards.gear.set_name} ${rewards.gear.slot}` : "Gear",
      sub: rewards.gear.rarity || "Gear",
      color: rewards.gear.color || "#F5C65F",
      stats: rewards.gear.stats || [],
      isNew: true,
    });
  }
  if (rewards?.crystal) {
    rareDrops.push({
      type: "crystal",
      name: rewards.crystal.boss_crysta ? rewards.crystal.boss_crysta.name : `${rewards.crystal.tier_name} Crystal`,
      sub: "Boss Crystal",
      color: rewards.crystal.tier_color || "#AB47BC",
      stats: rewards.crystal.main_stat ? [{ label: rewards.crystal.main_stat.toUpperCase() }] : [],
      isNew: true,
    });
  }
  if (rewards?.card) {
    rareDrops.push({
      type: "card",
      name: rewards.card.duplicate ? `${rewards.card.name} Shards` : rewards.card.name,
      sub: rewards.card.duplicate ? `+${rewards.card.shards_gained} Shards` : "New Boss Card",
      color: "#FFD700",
      stats: [],
      isNew: !rewards.card.duplicate,
    });
  }

  // First-clear bonus
  const fcBonus = rewards?.first_clear_bonus;

  return (
    <div className="fixed inset-0 z-[120] overflow-hidden flex items-center justify-center" data-testid="tsukuyomi-victory">
      {/* Dark blurred background */}
      <div className="absolute inset-0" style={{ background: "rgba(8,9,11,0.95)", backdropFilter: "blur(6px)" }} />

      {/* Gold radial glow */}
      {stage >= 1 && (
        <div
          className="absolute rounded-full"
          style={{
            width: "70vw", maxWidth: 550, height: 550,
            background: "radial-gradient(circle, rgba(245,198,95,0.18) 0%, rgba(245,198,95,0.05) 35%, transparent 65%)",
            top: "8%", left: "50%", transform: "translateX(-50%)",
          }}
        />
      )}

      {/* Content container */}
      <div className="relative z-10 w-full max-w-2xl mx-auto px-4 sm:px-6 pointer-events-none" style={{ maxHeight: "100vh", overflowY: "auto" }}>

        {/* Corner labels — top */}
        <div className="flex justify-between items-start pt-4 sm:pt-6">
          <div className="text-[9px] sm:text-[10px] leading-tight font-display tracking-wider text-white/50">
            <div>PUSH BEYOND</div>
            <div>THE LIMITS</div>
          </div>
          <div className="text-[9px] sm:text-[10px] leading-tight font-display tracking-wider text-white/50 text-right">
            <div>TSUKUYOMI</div>
            <div style={{ color: "#F5C65F" }}>{diffLabel}</div>
          </div>
        </div>

        {/* Title */}
        {stage >= 1 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="text-center mt-4 sm:mt-6"
          >
            <h1
              className="font-display text-5xl sm:text-7xl font-bold leading-none"
              style={{
                background: isVictory
                  ? "linear-gradient(180deg, #FFE9A0 0%, #F5C65F 50%, #D99834 100%)"
                  : "linear-gradient(180deg, #FF8A8A 0%, #FF5722 50%, #982222 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                filter: isVictory
                  ? "drop-shadow(0 0 30px rgba(245,198,95,0.5))"
                  : "drop-shadow(0 0 30px rgba(255,87,34,0.5))",
              }}
            >
              {isVictory ? "VICTORY" : "DEFEAT"}
            </h1>
            {isVictory && (
              <div className="flex items-center justify-center gap-3 mt-2">
                <div className="h-px w-12 sm:w-20 bg-gradient-to-r from-transparent to-[#D99834]" />
                <span className="text-[10px] sm:text-xs tracking-[0.3em] font-display" style={{ color: "#D99834" }}>
                  NIGHTMARE DEFEATED
                </span>
                <div className="h-px w-12 sm:w-20 bg-gradient-to-l from-transparent to-[#D99834]" />
              </div>
            )}
          </motion.div>
        )}

        {/* Defeat message */}
        {stage >= 2 && !isVictory && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
            className="text-center mt-8"
          >
            <p className="text-slate-400 text-sm">Your squad was overwhelmed. The nightmare endures.</p>
          </motion.div>
        )}

        {/* Victory content */}
        {stage >= 2 && isVictory && rewards && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-5 sm:mt-6 space-y-3"
          >
            {/* First-clear bonus badge */}
            {fcBonus && (
              <div className="flex items-center justify-center gap-2 py-1.5 px-4 rounded-lg" style={{ background: "rgba(245,198,95,0.1)", border: "1px solid rgba(245,198,95,0.3)" }}>
                <Star className="w-3.5 h-3.5" style={{ color: "#F5C65F" }} fill="currentColor" />
                <span className="text-xs font-display tracking-wide" style={{ color: "#F5C65F" }}>FIRST CLEAR BONUS</span>
                {fcBonus.gems > 0 && <span className="text-xs text-white">+{fcBonus.gems} 💎</span>}
              </div>
            )}

            {/* Currency bar */}
            <div
              className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl"
              style={{ background: "#131517", border: "1px solid rgba(245,198,95,0.25)" }}
            >
              <CoinsIcon size={22} />
              <span className="font-display text-lg sm:text-xl text-white font-bold">
                + {rewards.ryo?.toLocaleString() || 0} <span className="text-sm text-slate-400">RYO</span>
              </span>
            </div>

            {/* Team XP section */}
            {heroExp.length > 0 && (
              <div className="flex rounded-xl overflow-hidden" style={{ background: "#131517", border: "1px solid rgba(255,255,255,0.08)" }}>
                {/* Vertical label */}
                <div className="flex items-center justify-center px-1.5" style={{ background: "rgba(245,198,95,0.06)", borderRight: "1px solid rgba(255,255,255,0.06)" }}>
                  <span className="text-[9px] font-display tracking-[0.2em] font-bold" style={{ color: "#D99834", writingMode: "vertical-rl", transform: "rotate(180deg)" }}>
                    TEAM EXP
                  </span>
                </div>
                {/* Hero slots */}
                <div className="flex-1 grid grid-cols-3 gap-2 p-2.5">
                  {heroExp.slice(0, 3).map((h, i) => (
                    <div key={h.instance_id || i} className="flex flex-col items-center gap-1">
                      {/* Avatar */}
                      <div
                        className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center text-lg font-bold overflow-hidden"
                        style={{
                          background: h.portrait ? "transparent" : `${h.element === "fire" ? "#FF5722" : h.element === "water" ? "#29B6F6" : h.element === "earth" ? "#8D6E63" : h.element === "wind" ? "#26C6DA" : h.element === "lightning" ? "#FFCA28" : "#78909C"}22`,
                          border: `1px solid ${h.element === "fire" ? "#FF5722" : h.element === "water" ? "#29B6F6" : h.element === "earth" ? "#8D6E63" : h.element === "wind" ? "#26C6DA" : h.element === "lightning" ? "#FFCA28" : "#78909C"}44`,
                        }}
                      >
                        {h.portrait ? (
                          <img src={h.portrait} alt={h.name} className="w-full h-full object-cover" />
                        ) : (
                          <span style={{ color: "#fff" }}>{h.name?.charAt(0)}</span>
                        )}
                      </div>
                      <span className="text-[10px] sm:text-xs text-white font-semibold truncate max-w-full">{h.name?.split(" ")[0]}</span>
                      <span className="text-[9px] text-slate-400">Lv.{h.level}</span>
                      <span className="text-[10px] sm:text-xs font-bold" style={{ color: "#FFCA28" }}>+{h.exp} XP</span>
                      {/* XP bar */}
                      <div className="w-full h-1 rounded-full bg-white/10 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${Math.min(100, (h.exp / Math.max(1, h.exp * 4)) * 100)}%`, background: "linear-gradient(90deg, #FFCA28, #FFE082)" }} />
                      </div>
                      {h.levels > 0 && (
                        <span className="text-[9px] font-bold text-emerald-400">+{h.levels} LV</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Rewards section */}
            <div>
              {/* Header */}
              <div className="flex items-center justify-center gap-2.5 mb-2.5">
                <span className="text-[#D99834] text-xs">◆</span>
                <span className="text-xs font-display tracking-[0.25em] text-slate-300">REWARDS</span>
                <span className="text-[#D99834] text-xs">◆</span>
              </div>

              {/* Reward cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {/* Material items */}
                {materialCards.map((m, i) => (
                  <RewardCard key={m.iid} meta={m.meta} qty={m.qty} delay={i * 0.1} />
                ))}
                {/* Rare drops */}
                {rareDrops.map((d, i) => (
                  <RareDropCard key={d.type} drop={d} delay={(materialCards.length + i) * 0.1} />
                ))}
              </div>
            </div>

            {/* Level-up indicator */}
            {result?.level_up && (
              <div className="flex items-center justify-center gap-2 py-1.5" data-testid="tsukuyomi-victory-level-up">
                <Star className="w-4 h-4" fill="currentColor" style={{ color: "#00E5FF" }} />
                <span className="text-sm font-display" style={{ color: "#00E5FF" }}>
                  LEVEL UP! Lv.{result.level_up.old_level} → Lv.{result.level_up.new_level}
                </span>
              </div>
            )}
          </motion.div>
        )}

        {/* Footer buttons */}
        {stage >= 3 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex gap-2.5 mt-5 sm:mt-6 pointer-events-auto pb-4"
          >
            <button
              onClick={onBack}
              data-testid="tsukuyomi-victory-back"
              className="flex-1 py-3 rounded-xl font-display text-sm sm:text-base tracking-wide border border-white/15 text-slate-300 hover:bg-white/10 transition-colors"
            >
              BACK
            </button>
            <button
              onClick={onRetry}
              data-testid="tsukuyomi-victory-retry"
              className="flex-1 py-3 rounded-xl font-display text-sm sm:text-base tracking-wide text-white transition-colors"
              style={{ background: "linear-gradient(135deg, #D73333, #982222)" }}
            >
              RETRY
            </button>
            <button
              onClick={onNext}
              data-testid="tsukuyomi-victory-next"
              className="flex-1 py-3 rounded-xl font-display text-sm sm:text-base tracking-wide flex items-center justify-center gap-1 text-black font-bold transition-opacity hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #F5C65F, #D99834)" }}
            >
              TSUKUYOMI
              <ArrowRight size={16} />
            </button>
          </motion.div>
        )}

        {/* Corner labels — bottom */}
        <div className="flex justify-between items-end pb-4 pt-2">
          <div className="text-[9px] sm:text-[10px] leading-tight font-display tracking-wider text-white/40">
            <div>STRONGER</div>
            <div>EACH BATTLE</div>
          </div>
          <div className="text-[9px] sm:text-[10px] leading-tight font-display tracking-wider text-white/40 text-right">
            <div>THE NIGHTMARE</div>
            <div>NEVER ENDS</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---- Sub-components ---- */

function RewardCard({ meta, qty, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35, delay }}
      className="flex flex-col items-center gap-1 p-2.5 rounded-xl text-center"
      style={{ background: "#131517", border: `1px solid ${meta.color}33` }}
    >
      {/* Icon */}
      <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${meta.color}18`, boxShadow: `0 0 12px ${meta.color}33` }}>
        <ItemIcon icon={meta.icon} className="w-5 h-5" style={{ color: meta.color }} />
      </div>
      {/* Quantity */}
      <span className="text-xs font-bold text-white">×{qty}</span>
      {/* Name */}
      <span className="text-[10px] text-slate-300 leading-tight truncate max-w-full">{meta.name}</span>
      {/* Type pill */}
      <span
        className="text-[8px] px-2 py-0.5 rounded-full font-semibold"
        style={{ background: `${meta.color}22`, color: meta.color }}
      >
        {meta.type === "material" ? "Material" : meta.type || "Material"}
      </span>
    </motion.div>
  );
}

function RareDropCard({ drop, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay }}
      className="flex flex-col items-center gap-1 p-2.5 rounded-xl text-center relative"
      style={{
        background: "#131517",
        border: `2px solid ${drop.color}`,
        boxShadow: `0 0 16px ${drop.color}55, inset 0 0 12px ${drop.color}11`,
      }}
    >
      {/* NEW badge */}
      {drop.isNew && (
        <span className="absolute -top-1.5 -right-1.5 text-[8px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "#F5C65F", color: "#000" }}>
          NEW
        </span>
      )}
      {/* Icon */}
      <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${drop.color}22`, boxShadow: `0 0 14px ${drop.color}55` }}>
        {drop.type === "gear" && <Sparkles className="w-5 h-5" style={{ color: drop.color }} />}
        {drop.type === "crystal" && <Gem className="w-5 h-5" style={{ color: drop.color }} />}
        {drop.type === "card" && <Star className="w-5 h-5" fill={drop.color} style={{ color: drop.color }} />}
      </div>
      {/* Name */}
      <span className="text-[10px] text-white font-semibold leading-tight">{drop.name}</span>
      {/* Sub label */}
      <span className="text-[8px] px-2 py-0.5 rounded-full font-semibold" style={{ background: `${drop.color}22`, color: drop.color }}>
        {drop.sub}
      </span>
      {/* Stats */}
      {drop.stats.length > 0 && (
        <div className="flex flex-col gap-0.5 mt-0.5">
          {drop.stats.slice(0, 3).map((s, i) => (
            <span key={i} className="text-[8px] text-slate-300 leading-tight">
              {s.label || s}
            </span>
          ))}
        </div>
      )}
    </motion.div>
  );
}
