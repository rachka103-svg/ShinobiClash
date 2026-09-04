import { useMemo } from "react";
import { Skull, Flame } from "lucide-react";
import { ELEMENT, RARITY } from "@/lib/styles";
import { ElementIcon } from "@/components/ElementIcons";

// Pre-computed ember particle configs (deterministic, no hooks needed)
const EMBER_PARTICLES = Array.from({ length: 14 }, (_, i) => ({
  left: `${(i * 7.3) % 100}%`,
  size: 2 + (i % 4),
  duration: 4 + (i % 6),
  delay: `${(i * 0.7) % 5}s`,
  drift: `${((i % 5) - 2) * 14}px`,
  opacity: 0.3 + (i % 5) * 0.12,
}));

const SPARK_PARTICLES = Array.from({ length: 8 }, (_, i) => ({
  left: `${(i * 12.5) % 100}%`,
  top: `${15 + (i * 11) % 70}%`,
  size: 2 + (i % 3),
  duration: 3 + (i % 4),
  delay: `${(i * 0.9) % 4}s`,
  opacity: 0.4 + (i % 4) * 0.12,
}));

/**
 * BattleFighter — combatant card for the battle screen.
 * Element-colored borders, HP/Chakra numerical values, active glow + ground aura.
 * When `isBoss` is true, the card renders dramatically larger with particle,
 * lightning, and aura effects.
 */
export default function BattleFighter({ c, active, attacking, shake, floaters, highlight, onClick, flip, subdued, isBoss }) {
  const hpPct = (c.hp / c.maxHp) * 100;
  const ckPct = (c.chakra / c.maxChakra) * 100;
  const el = ELEMENT[c.element] || {};
  const elColor = el.color || "#94a3b8";
  const rarityColor = RARITY[c.rarity]?.color || elColor;

  // ---- Boss sizing (responsive via clamp) ----
  const bossW = "clamp(170px, 28vw, 310px)";
  const bossH = "clamp(210px, 42vh, 390px)";
  const bossContainerW = "clamp(190px, 30vw, 330px)";

  // ---- Regular sizing ----
  const regW = 112;
  const regH = 146;
  const regContainerW = 128;

  const cardW = isBoss ? bossW : regW;
  const cardH = isBoss ? bossH : regH;
  const containerW = isBoss ? bossContainerW : regContainerW;

  return (
    <div className="relative flex flex-col items-center" style={{ width: containerW }}>
      {/* ===== BOSS EFFECT LAYERS (behind card) ===== */}
      {isBoss && c.alive && (
        <>
          {/* Pulsing aura ring */}
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 pointer-events-none rounded-2xl"
            style={{
              width: `calc(${bossW} + 60px)`,
              height: `calc(${bossH} + 60px)`,
              background: `radial-gradient(circle, ${rarityColor}22 0%, ${elColor}11 40%, transparent 70%)`,
              animation: "bossAuraPulse 4s ease-in-out infinite alternate",
            }}
          />
          {/* Lightning flash overlay */}
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 pointer-events-none rounded-2xl"
            style={{
              width: `calc(${bossW} + 40px)`,
              height: `calc(${bossH} + 40px)`,
              background: `radial-gradient(circle at 50% 50%, transparent 30%, ${elColor}10 60%, transparent 80%)`,
              animation: "bossLightning 7s ease-in-out infinite",
            }}
          />
          {/* Floating ember particles */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 pointer-events-none overflow-hidden rounded-2xl"
            style={{ width: `calc(${bossW} + 50px)`, height: `calc(${bossH} + 50px)` }}
          >
            {EMBER_PARTICLES.map((p, i) => (
              <span
                key={`ember-${i}`}
                className="absolute rounded-full"
                style={{
                  left: p.left,
                  bottom: "0%",
                  width: p.size,
                  height: p.size,
                  background: elColor,
                  opacity: p.opacity,
                  boxShadow: `0 0 ${p.size * 2}px ${elColor}`,
                  animation: `bossEmberRise ${p.duration}s ease-in infinite`,
                  animationDelay: p.delay,
                  "--drift": p.drift,
                }}
              />
            ))}
          </div>
        </>
      )}

      {/* Floaters */}
      <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
        {floaters.map((f) => (
          <div key={f.id} className={`${f.isCrit ? "cine-crit" : "float-text"} font-display ${f.isCrit ? (isBoss ? "text-5xl" : "text-3xl") : (isBoss ? "text-4xl" : "text-2xl")} whitespace-nowrap`} style={{ color: f.color, textShadow: f.isCrit ? `0 0 12px ${f.color}, 0 2px 6px #000` : "0 2px 6px #000" }}>
            {f.text}
          </div>
        ))}
      </div>

      {/* Elemental aura behind card (when active) */}
      {active && c.alive && (
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 aura-element pointer-events-none rounded-xl"
          style={{
            width: isBoss ? `calc(${bossW} + 20px)` : 130,
            height: isBoss ? `calc(${bossH} + 20px)` : 160,
            background: `radial-gradient(ellipse at center, ${elColor}${isBoss ? "44" : "33"} 0%, transparent 70%)`,
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
          width: cardW,
          height: cardH,
          borderColor: active ? elColor : highlight ? "#FF5722" : `${elColor}55`,
          boxShadow: isBoss && c.alive
            ? `0 0 40px ${rarityColor}44, 0 0 80px ${elColor}22, 0 0 120px ${elColor}11, 0 8px 30px rgba(0,0,0,0.6)`
            : active && c.alive
            ? `0 0 14px ${elColor}55, 0 4px 12px rgba(0,0,0,0.5)`
            : "0 4px 10px rgba(0,0,0,0.35)",
          transform: active && c.alive ? "scale(1.04)" : "scale(1)",
          "--lunge-y": flip ? "12px" : "-12px",
          ...(isBoss && c.alive ? { animation: "bossCardGlow 3s ease-in-out infinite alternate" } : {}),
        }}
      >
        <img src={c.portrait} alt={c.name} className={`w-full h-full object-cover object-top ${flip ? "scale-x-[-1]" : ""}`} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        {/* Boss inner border glow */}
        {isBoss && c.alive && (
          <div className="absolute inset-0 pointer-events-none rounded-xl" style={{
            boxShadow: `inset 0 0 25px ${rarityColor}44, inset 0 0 50px ${elColor}11`,
            animation: "bossBorderPulse 4s ease-in-out infinite",
          }} />
        )}

        {/* Boss spark particles (on top of image) */}
        {isBoss && c.alive && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {SPARK_PARTICLES.map((p, i) => (
              <span
                key={`spark-${i}`}
                className="absolute rounded-full"
                style={{
                  left: p.left,
                  top: p.top,
                  width: p.size,
                  height: p.size,
                  background: rarityColor,
                  opacity: p.opacity,
                  boxShadow: `0 0 ${p.size * 3}px ${rarityColor}`,
                  animation: `bossSparkFlicker ${p.duration}s ease-in-out infinite`,
                  animationDelay: p.delay,
                }}
              />
            ))}
          </div>
        )}

        {shake && <div className="absolute inset-0 hit-flash pointer-events-none" />}
        {subdued && <div className="absolute inset-0 bg-black/15" />}
        {!c.alive && <Skull className="absolute inset-0 m-auto w-8 h-8 text-white/70" />}
        {/* Level badge */}
        <span className={`absolute top-1 right-1 font-display text-white bg-black/60 px-1.5 py-0.5 rounded ${isBoss ? "text-sm" : "text-[9px]"}`}>LV.{c.level}</span>
        {/* Enraged */}
        {c.enraged && (
          <span data-testid={`enraged-${c.uid}`} className={`absolute top-1 left-1 flex items-center gap-0.5 font-display text-white bg-red-600/80 px-1 rounded ${isBoss ? "text-xs" : "text-[8px]"}`}>
            <Flame className={isBoss ? "w-3.5 h-3.5" : "w-2.5 h-2.5"} /> RAGE
          </span>
        )}
        {/* Shield phase */}
        {c.shieldPhaseActive && (
          <span data-testid={`shield-phase-${c.uid}`} className={`absolute bottom-1 left-1 font-display text-white bg-sky-600/80 px-1 rounded ${isBoss ? "text-xs" : "text-[8px]"}`}>
            WARDED
          </span>
        )}
      </button>

      {/* Ground shadow */}
      {c.alive && (
        <div
          className="absolute left-1/2 -translate-x-1/2 rounded-full pointer-events-none ground-shadow"
          style={{
            top: isBoss ? `calc(${bossH} - 6px)` : 140,
            width: isBoss ? "70%" : 80,
            height: isBoss ? 6 : 12,
            background: isBoss
              ? `radial-gradient(ellipse, ${rarityColor}44 0%, transparent 70%)`
              : "radial-gradient(ellipse, rgba(0,0,0,0.5) 0%, transparent 70%)",
            filter: isBoss ? "blur(6px)" : "none",
          }}
        />
      )}

      {/* Active ground glow */}
      {active && c.alive && (
        <div
          className="absolute left-1/2 -translate-x-1/2 rounded-full pointer-events-none"
          style={{
            top: isBoss ? `calc(${bossH} - 8px)` : 138,
            width: "75%",
            height: 2,
            background: `radial-gradient(ellipse, ${elColor}88, transparent 70%)`,
          }}
        />
      )}

      {/* Name */}
      <div className="flex items-center justify-center gap-1 mt-1.5">
        <ElementIcon element={c.element} size={isBoss ? 18 : 14} />
        <p className={`font-semibold truncate ${isBoss ? "text-base" : "text-xs"}`} style={{ color: elColor, textShadow: isBoss ? `0 0 10px ${elColor}88` : "none" }}>{c.name.split(" ")[0]}</p>
      </div>

      {/* HP bar + value */}
      <div className="w-full mt-0.5">
        <div className={`flex items-center justify-between mb-0.5 ${isBoss ? "text-[11px]" : "text-[8px]"}`}>
          <span className="text-fox font-bold">HP</span>
          <span className="text-slate-300 tabular-nums">{c.hp.toLocaleString()}/{c.maxHp.toLocaleString()}</span>
        </div>
        <div className={`w-full rounded bg-black/60 overflow-hidden ${isBoss ? "h-3" : "h-2"}`}>
          <div className="h-full rounded hp-bar-fill" style={{ width: `${hpPct}%`, background: "linear-gradient(90deg,#FF1744,#FF8A80)" }} />
        </div>
      </div>

      {/* Shield indicator */}
      {c.shield > 0 && <span className={`text-sky-300 mt-0.5 ${isBoss ? "text-xs" : "text-[9px]"}`}>🛡 {c.shield}</span>}

      {/* Chakra bar + value */}
      <div className="w-full mt-0.5">
        <div className={`flex items-center justify-between mb-0.5 ${isBoss ? "text-[11px]" : "text-[8px]"}`}>
          <span className="text-chakra font-bold">⚡</span>
          <span className="text-slate-300 tabular-nums">{c.chakra}/{c.maxChakra}</span>
        </div>
        <div className={`w-full rounded bg-black/60 overflow-hidden ${isBoss ? "h-2.5" : "h-1.5"}`}>
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
                <span className={isBoss ? "text-xs" : "text-[9px]"}>{vis.icon}</span>
                {turns > 0 && turns < 99 && <span className={`${isBoss ? "text-[9px]" : "text-[7px]"} font-bold opacity-80`}>{turns}</span>}
              </span>
            );
          })}
        </div>
      )}

      {/* ===== BOSS ANIMATION KEYFRAMES ===== */}
      {isBoss && (
        <style>{`
          @keyframes bossAuraPulse {
            0% { opacity: 0.5; transform: translateX(-50%) scale(1); }
            100% { opacity: 0.9; transform: translateX(-50%) scale(1.08); }
          }
          @keyframes bossLightning {
            0%, 88%, 100% { opacity: 0; }
            90%, 93% { opacity: 0.7; }
            91% { opacity: 0.2; }
          }
          @keyframes bossEmberRise {
            0% { transform: translateY(0) translateX(0); opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: 0.5; }
            100% { transform: translateY(-200px) translateX(var(--drift, 0px)); opacity: 0; }
          }
          @keyframes bossSparkFlicker {
            0%, 100% { opacity: 0; transform: scale(0.5); }
            50% { opacity: 0.8; transform: scale(1.3); }
          }
          @keyframes bossCardGlow {
            0% { box-shadow: 0 0 30px ${rarityColor}33, 0 0 60px ${elColor}11, 0 0 100px ${elColor}08, 0 8px 30px rgba(0,0,0,0.6); }
            100% { box-shadow: 0 0 50px ${rarityColor}55, 0 0 90px ${elColor}22, 0 0 140px ${elColor}15, 0 8px 30px rgba(0,0,0,0.6); }
          }
          @keyframes bossBorderPulse {
            0%, 100% { box-shadow: inset 0 0 25px ${rarityColor}44, inset 0 0 50px ${elColor}11; }
            50% { box-shadow: inset 0 0 35px ${rarityColor}66, inset 0 0 70px ${elColor}22; }
          }
        `}</style>
      )}
    </div>
  );
}
