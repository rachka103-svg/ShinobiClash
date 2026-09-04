import { motion } from "framer-motion";
import { Swords, Play, Zap, Info } from "lucide-react";
import { CoinsIcon, GemsIcon, SwordsIcon } from "@/components/GameIcons";
import { ElementIcon } from "@/components/ElementIcons";
import { RARITY } from "@/lib/styles";
import { ENERGY_COST } from "@/lib/energy";
import { spireFloorConfig, SPIRE_MAX_FLOOR } from "@/lib/spireConfig";

const PURPLE = "#a855f7";

function Diamond({ filled }) {
  return (
    <span
      className="inline-block w-3 h-3 rotate-45 rounded-[2px]"
      style={{
        background: filled ? PURPLE : "transparent",
        border: `1.5px solid ${filled ? PURPLE : "rgba(148,163,184,0.4)"}`,
        boxShadow: filled ? `0 0 6px ${PURPLE}99` : "none",
      }}
    />
  );
}

function RewardSlot({ children, label }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="w-[60px] h-[60px] rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(168,85,247,0.22)" }}>
        {children}
      </div>
      {label && <span className="text-[10px] text-slate-400 tabular-nums">{label}</span>}
    </div>
  );
}

export default function SpireChallenge({ floor, enemies, catalogById, isBoss, ryoReward, onChallenge, recPower, pathCfg }) {
  const cfg = spireFloorConfig(floor);
  const difficulty = Math.min(5, cfg.phaseIdx);
  const accent = pathCfg?.accent || PURPLE;
  const restriction = pathCfg?.element ? `${pathCfg.element} heroes only` : "No Restrictions";

  // Unique enemy elements for the "Enemy Elements" row.
  const elements = enemies
    .map((e) => catalogById[e.template_id]?.element)
    .filter(Boolean)
    .filter((el, idx, arr) => arr.indexOf(el) === idx)
    .slice(0, 3);

  return (
    <div
      className="relative rounded-[20px] p-6 h-[540px] flex flex-col"
      style={{
        background: "linear-gradient(160deg, #0d0a1f 0%, #08060f 100%)",
        border: "1px solid rgba(168,85,247,0.32)",
        boxShadow: "0 0 28px rgba(168,85,247,0.14), inset 0 1px 0 rgba(255,255,255,0.05)",
      }}
      data-testid="spire-challenge"
    >
      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.28em] mb-1" style={{ color: PURPLE }}>{cfg.phase} · Phase {cfg.phaseIdx}/6</p>
          <h2 className="font-display text-5xl leading-none text-white tracking-wide">FLOOR {floor}</h2>
          {cfg.isMilestone ? (
            <span className="inline-block mt-2 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide" style={{ background: "rgba(255,202,40,0.18)", color: "#FFCA28", border: "1px solid rgba(255,202,40,0.5)" }}>
              ★ Milestone Boss
            </span>
          ) : isBoss && (
            <span className="inline-block mt-2 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide" style={{ background: "rgba(255,87,34,0.18)", color: "#fb923c", border: "1px solid rgba(255,87,34,0.45)" }}>
              Boss Floor
            </span>
          )}
        </div>
        <div className="flex flex-col items-center justify-center rounded-xl px-4 py-2" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(168,85,247,0.25)", minWidth: "160px" }}>
          <span className="text-[9px] uppercase tracking-[0.2em] text-slate-400 mb-1">Recommended Power</span>
          <div className="flex items-center gap-1.5">
            <Swords className="w-4 h-4 text-purple-300" />
            <span className="font-display text-2xl text-white tabular-nums">{recPower.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* ── Enemy squad + Floor info ── */}
      <div className="grid grid-cols-12 gap-4 mb-4">
        {/* Enemy squad */}
        <div className="col-span-5 pr-4" style={{ borderRight: "1px solid rgba(255,255,255,0.08)" }}>
          <p className="text-[10px] uppercase tracking-[0.22em] text-slate-400 mb-2">Enemy Squad</p>
          <div className="flex items-center gap-3 flex-wrap">
            {enemies.length === 0 && (
              <>
                {[0, 1].map((i) => (
                  <div key={i} className="w-[90px] h-[120px] rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(148,163,184,0.18)" }}>
                    <span className="text-[10px] text-slate-600">Unknown</span>
                  </div>
                ))}
              </>
            )}
            {enemies.map((e, i) => {
              const t = catalogById[e.template_id];
              if (!t) return null;
              const r = RARITY[t.rarity] || {};
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="relative w-[90px] h-[120px] rounded-xl overflow-hidden"
                  style={{ border: `2px solid ${r.color || PURPLE}`, boxShadow: `0 0 10px ${(r.color || PURPLE)}55` }}
                >
                  <img src={t.portrait} alt={t.name} className="w-full h-full object-cover object-top grayscale-[0.35]" />
                  <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.65) 100%)" }} />
                  <span className="absolute top-1 left-1"><ElementIcon element={t.element} size={18} /></span>
                  <span className="absolute bottom-1 right-1 text-[10px] font-display text-white" style={{ textShadow: "0 1px 3px rgba(0,0,0,0.8)" }}>Lv.{e.level}</span>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Floor info */}
        <div className="col-span-7 flex flex-col">
          <p className="text-[10px] uppercase tracking-[0.22em] text-slate-400 mb-2">Floor Info</p>
          <div className="flex flex-col text-sm divide-y" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
            <div className="flex items-center justify-between py-2">
              <span className="text-slate-400">Difficulty</span>
              <span className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => <Diamond key={i} filled={i < difficulty} />)}
              </span>
            </div>
            <div className="flex items-center justify-between py-2" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
              <span className="text-slate-400">Enemy Elements</span>
              <span className="flex items-center gap-1.5">
                {elements.length === 0 && <span className="text-slate-500 text-xs">—</span>}
                {elements.map((el) => (
                  <span key={el} className="flex items-center gap-1">
                    <ElementIcon element={el} size={18} />
                    <span className="text-xs text-slate-300">{el}</span>
                  </span>
                ))}
              </span>
            </div>
            <div className="flex items-center justify-between py-2" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
              <span className="text-slate-400">Restrictions</span>
              <span className="text-xs" style={{ color: pathCfg?.element ? accent : "#cbd5e1" }}>{restriction}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Rewards ── */}
      <div className="grid grid-cols-12 gap-4 mb-4">
        <div className="col-span-6 pr-4" style={{ borderRight: "1px solid rgba(255,255,255,0.08)" }}>
          <p className="text-[10px] uppercase tracking-[0.22em] text-slate-400 mb-2">First Clear Rewards</p>
          <div className="flex items-end gap-3">
            <RewardSlot label={ryoReward.toLocaleString()}>
              <CoinsIcon size={30} />
            </RewardSlot>
            {cfg.isMilestone ? (
              <RewardSlot label={`${200 + floor}`}>
                <GemsIcon size={30} />
              </RewardSlot>
            ) : isBoss && (
              <RewardSlot label={`${30 + Math.floor(floor / 5)}`}>
                <GemsIcon size={30} />
              </RewardSlot>
            )}
            <RewardSlot>
              <span className="text-slate-600 text-xs">?</span>
            </RewardSlot>
          </div>
        </div>
        <div className="col-span-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] uppercase tracking-[0.22em] text-slate-400">Possible Rewards</p>
            <Info className="w-3.5 h-3.5 text-slate-600" />
          </div>
          <div className="flex items-end gap-2.5">
            <RewardSlot><span className="w-6 h-6 rotate-45 rounded-[3px]" style={{ background: "#29B6F6", boxShadow: "0 0 8px #29B6F699" }} /></RewardSlot>
            <RewardSlot><span className="w-6 h-6 rotate-45 rounded-[3px]" style={{ background: "#00E676", boxShadow: "0 0 8px #00E67699" }} /></RewardSlot>
            <RewardSlot><CoinsIcon size={26} /></RewardSlot>
            <RewardSlot><GemsIcon size={26} /></RewardSlot>
          </div>
        </div>
      </div>

      {/* ── CTA ── */}
      <div className="mt-auto">
        <button
          onClick={onChallenge}
          data-testid="spire-challenge-btn"
          className="w-full h-[58px] rounded-[10px] font-display text-2xl tracking-wider text-white flex items-center justify-center gap-2 transition-transform active:scale-[0.99]"
          style={{
            background: "radial-gradient(120% 140% at 50% 0%, #c026d3 0%, #7c3aed 55%, #5b21b6 100%)",
            boxShadow: "0 0 22px rgba(168,85,247,0.45), inset 0 1px 0 rgba(255,255,255,0.25)",
          }}
        >
          <SwordsIcon size={22} /> CHALLENGE FLOOR {floor}
          {ENERGY_COST.spire > 0 && (
            <span className="flex items-center gap-0.5 text-sm opacity-80"><Zap className="w-4 h-4" />{ENERGY_COST.spire}</span>
          )}
        </button>
        <p className="text-center text-xs text-slate-500 mt-2.5">Clear this floor to ascend the Dragon's Back and unlock the next.</p>
      </div>
    </div>
  );
}
