import { Link } from "react-router-dom";
import { useState } from "react";
import { motion } from "framer-motion";
import { Scroll, Moon, Castle, Crosshair, Landmark, Swords, Zap, Bot, Gauge, Sparkles, Skull } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useGame } from "@/context/GameContext";

/**
 * BattleHub — cinematic battle mode selection.
 * Full-screen character art background with a featured banner and a row
 * of selectable mode cards at the bottom, matching the reference design.
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
    { to: "/campaign", label: "CAMPAIGN", icon: Scroll, color: "#FF9D00",
      sub: `${cleared}/${stages.length} stages cleared`, testid: "mode-campaign" },
    { to: "/dungeons", label: "DUNGEONS", icon: Landmark, color: "#00E676",
      sub: "Gold · EXP · Materials", testid: "mode-dungeons" },
    { to: "/boss-hunt", label: "BOSS HUNT", icon: Skull, color: "#FF1744",
      sub: "Hunt Powerful Bosses", testid: "mode-boss-hunt" },
    { to: "/spire", label: "ENDLESS SPIRE", icon: Castle, color: "#D500F9",
      sub: `Floor ${user?.spire_floor || 0} reached`, testid: "mode-spire" },
    { to: "/summon", label: "SUMMON", icon: Moon, color: "#7C4DFF",
      sub: "New Shinobi Available", testid: "mode-summon" },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0a0a0c]" data-testid="battle-hub-page">
      {/* ── Full-screen background art ── */}
      <div className="fixed inset-0 bg-cover bg-center" style={{ backgroundImage: "url(/art/login-bg-epic.png)" }} />
      {/* Dark gradient — art visible at top, darkens toward bottom for card readability */}
      <div className="fixed inset-0" style={{
        background: "linear-gradient(180deg, rgba(10,10,12,0.45) 0%, rgba(10,10,12,0.15) 25%, rgba(10,10,12,0.75) 65%, rgba(10,10,12,0.97) 100%)"
      }} />
      {/* Purple ambient glow */}
      <div className="fixed inset-0 pointer-events-none" style={{
        background: "radial-gradient(50% 35% at 35% 30%, rgba(124,77,255,0.10) 0%, transparent 70%)"
      }} />

      {/* ── Content layer ── */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* ── Top bar: title + battle prefs ── */}
        <div className="flex items-center justify-between px-4 sm:px-8 lg:px-12 pt-4">
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

        {/* ── Hero area: tagline (left) + featured banner (right) ── */}
        <div className="flex-1 flex items-center px-4 sm:px-8 lg:px-12 pt-6 pb-2">
          {/* Left tagline */}
          <div className="flex-1 max-w-lg">
            <motion.p
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="text-2xl sm:text-3xl lg:text-5xl text-white/85 leading-tight"
              style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 300, fontStyle: "italic" }}
            >
              A new chapter awakens.
            </motion.p>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="flex items-center gap-2 mt-3 sm:mt-4"
            >
              <div className="h-px w-12 bg-gradient-to-r from-[#d4af37] to-transparent" />
              <span className="text-[11px] tracking-[0.2em] uppercase text-[#d4af37]/70">Battle Modes</span>
            </motion.div>
          </div>

          {/* Featured banner — right side, aligned with card row right edge */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="hidden sm:block w-56 lg:w-72 rounded-2xl p-4 lg:p-5 backdrop-blur-md shrink-0"
            style={{
              background: "rgba(16,16,20,0.80)",
              border: "1px solid rgba(124,77,255,0.35)",
              boxShadow: "0 0 40px rgba(124,77,255,0.12), inset 0 1px 0 rgba(255,255,255,0.05)",
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 lg:w-5 lg:h-5" style={{ color: "#7C4DFF" }} />
              <h3 className="font-display text-lg lg:text-xl tracking-wide text-white">ETERNAL NIGHTMARE</h3>
            </div>
            <p className="text-[10px] lg:text-xs text-red-300/80 tracking-[0.1em] mb-3">NEW BOSS • TSUKUYOMI</p>
            <Link to="/tsukuyomi" className="text-sm text-white/70 hover:text-white transition-colors flex items-center gap-1 group">
              Challenge Now
              <span className="transition-transform group-hover:translate-x-1">→</span>
            </Link>
          </motion.div>
        </div>

        {/* ── Bottom: Mode cards row ── */}
        <div className="px-4 sm:px-8 lg:px-12 pb-5 lg:pb-7">
          {/* Desktop / Tablet: single row of 5 cards */}
          <div className="hidden sm:grid grid-cols-5 gap-3 lg:gap-5">
            {modes.map((m, i) => {
              const Icon = m.icon;
              return (
                <motion.div
                  key={m.to}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08 * i, duration: 0.5 }}
                >
                  <Link
                    to={m.to}
                    data-testid={m.testid}
                    className="group relative block rounded-2xl overflow-hidden transition-all duration-300 active:scale-[0.97] hover:-translate-y-1 h-[180px] lg:h-[220px]"
                    style={{
                      background: `linear-gradient(165deg, ${m.color}10, rgba(16,16,20,0.90) 65%)`,
                      border: `1px solid ${m.color}40`,
                      boxShadow: `0 4px 24px rgba(0,0,0,0.4)`,
                    }}
                  >
                    {/* Hover glow */}
                    <div
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                      style={{ background: `radial-gradient(80% 60% at 50% 30%, ${m.color}20, transparent)` }}
                    />
                    {/* Top accent line */}
                    <div
                      className="absolute top-0 left-0 right-0 h-0.5 opacity-50 group-hover:opacity-100 group-hover:h-1 transition-all"
                      style={{ background: m.color, boxShadow: `0 0 10px ${m.color}` }}
                    />

                    <div className="relative h-full flex flex-col items-center justify-center gap-3 p-4">
                      <div
                        className="w-14 h-14 lg:w-16 lg:h-16 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110"
                        style={{
                          background: `${m.color}1a`,
                          boxShadow: `0 0 20px ${m.color}33, inset 0 0 12px ${m.color}22`,
                          border: `1px solid ${m.color}55`,
                        }}
                      >
                        <Icon className="w-7 h-7 lg:w-8 lg:h-8" style={{ color: m.color }} />
                      </div>
                      <div className="text-center">
                        <h3 className="font-display text-base lg:text-lg tracking-wide text-white leading-none">{m.label}</h3>
                        <p className="text-[10px] lg:text-[11px] text-slate-400 mt-1.5 leading-tight">{m.sub}</p>
                      </div>
                    </div>

                    {/* Bottom accent bar */}
                    <div
                      className="absolute bottom-0 left-0 right-0 h-0.5 transition-all duration-300 group-hover:h-1"
                      style={{ background: m.color, boxShadow: `0 0 8px ${m.color}` }}
                    />
                  </Link>
                </motion.div>
              );
            })}
          </div>

          {/* Mobile: 2-column grid, scrollable */}
          <div className="sm:hidden grid grid-cols-2 gap-2.5">
            {modes.map((m, i) => {
              const Icon = m.icon;
              return (
                <motion.div
                  key={m.to}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.06 * i, duration: 0.4 }}
                >
                  <Link
                    to={m.to}
                    data-testid={m.testid}
                    className="group relative block rounded-xl overflow-hidden transition-all active:scale-[0.97]"
                    style={{
                      background: `linear-gradient(165deg, ${m.color}12, rgba(16,16,20,0.92) 65%)`,
                      border: `1px solid ${m.color}40`,
                      height: "130px",
                    }}
                  >
                    <div
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                      style={{ background: `radial-gradient(80% 60% at 50% 30%, ${m.color}18, transparent)` }}
                    />
                    <div className="relative h-full flex flex-col items-center justify-center gap-2 p-3">
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
                        style={{
                          background: `${m.color}1a`,
                          boxShadow: `0 0 14px ${m.color}33`,
                          border: `1px solid ${m.color}55`,
                        }}
                      >
                        <Icon className="w-5 h-5" style={{ color: m.color }} />
                      </div>
                      <div className="text-center">
                        <h3 className="font-display text-xs tracking-wide text-white leading-none">{m.label}</h3>
                        <p className="text-[9px] text-slate-400 mt-1 leading-tight">{m.sub}</p>
                      </div>
                    </div>
                    <div
                      className="absolute bottom-0 left-0 right-0 h-0.5"
                      style={{ background: m.color, boxShadow: `0 0 6px ${m.color}` }}
                    />
                  </Link>
                </motion.div>
              );
            })}
            {/* 6th cell: Arena on mobile (fills the 2x3 grid) */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.06 * 5, duration: 0.4 }}
            >
              <Link
                to="/arena"
                data-testid="mode-arena"
                className="group relative block rounded-xl overflow-hidden transition-all active:scale-[0.97]"
                style={{
                  background: `linear-gradient(165deg, #FF174412, rgba(16,16,20,0.92) 65%)`,
                  border: `1px solid #FF174440`,
                  height: "130px",
                }}
              >
                <div className="relative h-full flex flex-col items-center justify-center gap-2 p-3">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
                    style={{ background: "#FF17441a", boxShadow: "0 0 14px #FF174433", border: "1px solid #FF174455" }}
                  >
                    <Crosshair className="w-5 h-5" style={{ color: "#FF1744" }} />
                  </div>
                  <div className="text-center">
                    <h3 className="font-display text-xs tracking-wide text-white leading-none">ARENA</h3>
                    <p className="text-[9px] text-slate-400 mt-1 leading-tight">PvP Battles</p>
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: "#FF1744", boxShadow: "0 0 6px #FF1744" }} />
              </Link>
            </motion.div>
          </div>

          {/* Energy note */}
          <div className="mt-3 sm:mt-4 flex items-center justify-center gap-2 text-[11px] text-slate-500">
            <Zap className="w-3.5 h-3.5 text-emerald-400" /> Battles consume Energy. Refill in the Shop or wait for regen.
          </div>
        </div>
      </div>
    </div>
  );
}
