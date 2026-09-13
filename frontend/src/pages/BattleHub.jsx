import { Link } from "react-router-dom";
import { useState } from "react";
import { motion } from "framer-motion";
import { Scroll, Moon, Castle, Crosshair, Landmark, Swords, Zap, Bot, Gauge, Sparkles } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useGame } from "@/context/GameContext";

/**
 * BattleHub — cinematic battle mode selection.
 * Full-screen character art background with a row of selectable mode cards.
 */
export default function BattleHub() {
  const { user } = useAuth();
  const { stages } = useGame();
  const cleared = user?.cleared_stages?.length || 0;
  const [auto, setAuto] = useState(() => { try { return localStorage.getItem("sc_battle_auto") === "1"; } catch { return false; } });
  const [speed, setSpeed] = useState(() => { try { return Number(localStorage.getItem("sc_battle_speed")) || 1; } catch { return 1; } });
  const toggleAuto = () => { const v = !auto; setAuto(v); try { localStorage.setItem("sc_battle_auto", v ? "1" : "0"); } catch { /* */ } };
  const cycleSpeed = () => { const v = speed >= 3 ? 1 : speed + 1; setSpeed(v); try { localStorage.setItem("sc_battle_speed", String(v)); } catch { /* */ } };

  const modes = [
    { to: "/campaign", label: "CAMPAIGN", icon: Scroll, color: "#FF5722",
      sub: `${cleared}/${stages.length} stages cleared`, testid: "mode-campaign" },
    { to: "/tsukuyomi", label: "TSUKUYOMI", icon: Moon, color: "#7C4DFF",
      sub: "Hunt boss gear & materials", testid: "mode-tsukuyomi", featured: true },
    { to: "/dungeons", label: "DUNGEONS", icon: Landmark, color: "#00E676",
      sub: "Gold · EXP · Materials", testid: "mode-dungeons" },
    { to: "/spire", label: "ENDLESS SPIRE", icon: Castle, color: "#D500F9",
      sub: `Floor ${user?.spire_floor || 0} reached`, testid: "mode-spire" },
    { to: "/arena", label: "ARENA", icon: Crosshair, color: "#FF1744",
      sub: `Rating ${user?.arena?.rating ?? 1000}`, testid: "mode-arena" },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0a0a0c]" data-testid="battle-hub-page">
      {/* ── Full-screen background art ── */}
      <div className="fixed inset-0 bg-cover bg-center" style={{ backgroundImage: "url(/art/login-bg-epic.png)" }} />
      {/* Dark gradient for readability — keeps art visible at top */}
      <div className="fixed inset-0" style={{
        background: "linear-gradient(180deg, rgba(10,10,12,0.55) 0%, rgba(10,10,12,0.25) 30%, rgba(10,10,12,0.85) 75%, rgba(10,10,12,0.97) 100%)"
      }} />
      {/* Purple ambient glow */}
      <div className="fixed inset-0 pointer-events-none" style={{
        background: "radial-gradient(60% 40% at 30% 35%, rgba(124,77,255,0.12) 0%, transparent 70%)"
      }} />

      {/* ── Content layer ── */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* ── Top bar: title + battle prefs ── */}
        <div className="flex items-center justify-between px-4 sm:px-8 pt-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: "#FF572218", border: "1px solid #FF572255" }}>
              <Swords className="w-6 h-6 text-fox" />
            </div>
            <div>
              <h1 className="font-display text-3xl sm:text-4xl tracking-wide text-white leading-none">BATTLE</h1>
              <p className="text-slate-400 text-xs mt-0.5">Choose your battlefield.</p>
            </div>
          </div>

          {/* Battle defaults */}
          <div className="flex items-center gap-2 p-2 rounded-xl bg-black/40 border border-white/10 backdrop-blur-sm" data-testid="battle-prefs">
            <span className="text-[10px] uppercase tracking-widest text-slate-500 ml-1 hidden sm:inline">Defaults</span>
            <button onClick={toggleAuto} data-testid="pref-auto-toggle"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-display tracking-wide border transition-colors"
              style={auto ? { color: "#00E5FF", borderColor: "#00E5FF", background: "rgba(0,229,255,0.12)" } : { color: "#94a3b8", borderColor: "rgba(255,255,255,0.15)" }}>
              <Bot className="w-3.5 h-3.5" /> AUTO {auto ? "ON" : "OFF"}
            </button>
            <button onClick={cycleSpeed} data-testid="pref-speed-toggle"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-display tracking-wide border border-white/15 text-slate-300 hover:text-white transition-colors">
              <Gauge className="w-3.5 h-3.5" /> {speed}X
            </button>
          </div>
        </div>

        {/* ── Left-side tagline (over the art) ── */}
        <div className="flex-1 flex flex-col justify-center px-4 sm:px-12 lg:px-16 max-w-xl">
          <motion.p
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="text-2xl sm:text-3xl lg:text-4xl text-white/80 leading-tight"
            style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 300, fontStyle: "italic" }}
          >
            A new chapter awakens.
          </motion.p>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="flex items-center gap-2 mt-4"
          >
            <div className="h-px w-12 bg-gradient-to-r from-[#d4af37] to-transparent" />
            <span className="text-[11px] tracking-[0.2em] uppercase text-[#d4af37]/70">Battle Modes</span>
          </motion.div>
        </div>

        {/* ── Featured banner (top-right area, desktop only) ── */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="hidden lg:block absolute top-24 right-8 w-64 rounded-xl p-4 backdrop-blur-md"
          style={{ background: "rgba(10,10,12,0.75)", border: "1px solid rgba(124,77,255,0.3)", boxShadow: "0 0 30px rgba(124,77,255,0.15)" }}
        >
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4" style={{ color: "#7C4DFF" }} />
            <h3 className="font-display text-lg tracking-wide text-white">ETERNAL NIGHTMARE</h3>
          </div>
          <p className="text-xs text-red-300/80 tracking-wide mb-2">NEW BOSS • TSUKUYOMI</p>
          <Link to="/tsukuyomi" className="text-sm text-white/70 hover:text-white transition-colors flex items-center gap-1">
            Challenge Now <span>→</span>
          </Link>
        </motion.div>

        {/* ── Bottom: Mode cards row ── */}
        <div className="px-4 sm:px-8 pb-6 pt-2">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            {modes.map((m, i) => {
              const Icon = m.icon;
              return (
                <motion.div
                  key={m.to}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08 * i, duration: 0.5 }}
                  className={m.featured ? "sm:col-span-1 lg:col-span-1" : ""}
                >
                  <Link
                    to={m.to}
                    data-testid={m.testid}
                    className="group relative block rounded-xl overflow-hidden transition-all active:scale-[0.97] h-full"
                    style={{
                      background: `linear-gradient(160deg, ${m.color}14, rgba(18,18,23,0.92) 70%)`,
                      border: `1px solid ${m.color}44`,
                      minHeight: "140px",
                    }}
                  >
                    {/* Glow on hover */}
                    <div
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                      style={{ background: `radial-gradient(80% 60% at 50% 30%, ${m.color}22, transparent)` }}
                    />

                    {/* Icon + label area */}
                    <div className="relative p-4 flex flex-col items-center justify-center gap-2 h-full">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
                        style={{ background: `${m.color}22`, boxShadow: `0 0 16px ${m.color}44`, border: `1px solid ${m.color}44` }}
                      >
                        <Icon className="w-6 h-6" style={{ color: m.color }} />
                      </div>
                      <h3 className="font-display text-base sm:text-lg tracking-wide text-white text-center leading-none">{m.label}</h3>
                      <p className="text-[10px] sm:text-[11px] text-slate-400 text-center leading-tight">{m.sub}</p>
                    </div>

                    {/* Bottom accent bar */}
                    <div
                      className="absolute bottom-0 left-0 right-0 h-0.5 transition-all duration-300 group-hover:h-1"
                      style={{ background: m.color, boxShadow: `0 0 8px ${m.color}` }}
                    />

                    {m.featured && (
                      <span className="absolute top-2 right-2 px-2 py-0.5 rounded text-[8px] font-bold tracking-wider uppercase" style={{ background: m.color, color: "#0a0a0c" }}>
                        NEW
                      </span>
                    )}
                  </Link>
                </motion.div>
              );
            })}
          </div>

          {/* Energy note */}
          <div className="mt-4 flex items-center justify-center gap-2 text-[11px] text-slate-500">
            <Zap className="w-3.5 h-3.5 text-emerald-400" /> Battles consume Energy. Refill in the Shop or wait for regen.
          </div>
        </div>
      </div>
    </div>
  );
}
