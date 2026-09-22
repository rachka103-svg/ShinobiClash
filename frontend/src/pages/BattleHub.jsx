import { Link } from "react-router-dom";
import { useState } from "react";
import { motion } from "framer-motion";
import { Scroll, Moon, Castle, Crosshair, Landmark, Swords, Zap, Bot, Gauge, Sparkles, Skull, Crown } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useGame } from "@/context/GameContext";
import { RARITY } from "@/lib/theme";

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
    { to: "/campaign", label: "CAMPAIGN", icon: Scroll, color: "#FF6B35",
      sub: `${cleared}/${stages.length} stages cleared`, testid: "mode-campaign",
      art: "/custom/ares.png", rarity: "SSR", heroName: "Ares" },
    { to: "/dungeons", label: "DUNGEONS", icon: Landmark, color: "#00E676",
      sub: "Gold · EXP · Materials", testid: "mode-dungeons",
      art: "/custom/ymir.png", rarity: "GR", heroName: "Ymir" },
    { to: "/boss-hunt", label: "BOSS HUNT", icon: Skull, color: "#FF1744",
      sub: "Hunt Powerful Bosses", testid: "mode-boss-hunt",
      art: "/custom/fenrir.png", rarity: "GR", heroName: "Fenrir" },
    { to: "/spire", label: "ENDLESS SPIRE", icon: Castle, color: "#A740E5",
      sub: `Floor ${user?.spire_floor || 0} reached`, testid: "mode-spire",
      art: "/custom/odin.png", rarity: "UR", heroName: "Odin" },
    { to: "/summon", label: "SUMMON", icon: Moon, color: "#E5A540",
      sub: "New Shinobi Available", testid: "mode-summon",
      art: "/custom/amaterasu.png", rarity: "UR", heroName: "Amaterasu" },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0a0a0c]" data-testid="battle-hub-page">
      {/* ── Full-screen background art ── */}
      <div className="fixed inset-0 bg-cover bg-center" style={{ backgroundImage: "url(/art/login-bg-epic.png)" }} />
      {/* Dark gradient — art visible at top, darkens toward bottom for card readability */}
      <div className="fixed inset-0" style={{
        background: "linear-gradient(180deg, rgba(10,10,12,0.55) 0%, rgba(10,10,12,0.25) 20%, rgba(10,10,12,0.70) 60%, rgba(10,10,12,0.97) 100%)"
      }} />
      {/* Purple ambient glow */}
      <div className="fixed inset-0 pointer-events-none" style={{
        background: "radial-gradient(50% 40% at 30% 35%, rgba(124,77,255,0.12) 0%, transparent 70%)"
      }} />
      {/* Red moon glow — upper right */}
      <div className="fixed inset-0 pointer-events-none" style={{
        background: "radial-gradient(25% 20% at 80% 15%, rgba(255,23,68,0.08) 0%, transparent 60%)"
      }} />

      {/* ── Large featured hero — left side ── */}
      <motion.div
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 1.0, delay: 0.2 }}
        className="hidden md:block fixed left-0 bottom-0 z-[5] pointer-events-none"
        style={{ width: "42vw", maxWidth: "620px", height: "78vh" }}
      >
        <img
          src="/custom/nm_shadow_sovereign.png"
          alt="Shadow Sovereign"
          className="w-full h-full object-contain object-bottom"
          style={{ filter: "drop-shadow(0 0 40px rgba(124,77,255,0.25))" }}
        />
      </motion.div>

      {/* ── Content layer ── */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* ── Top bar: title + battle prefs ── */}
        <div className="flex items-center justify-between px-4 sm:px-8 lg:px-12 pt-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, rgba(255,87,34,0.18), rgba(124,77,255,0.18))", border: "1px solid rgba(255,87,34,0.40)" }}>
              <Swords className="w-6 h-6" style={{ color: "#FF6B35" }} />
            </div>
            <div>
              <h1 className="font-display text-3xl sm:text-4xl tracking-wide text-white leading-none" style={{ textShadow: "0 0 30px rgba(255,107,53,0.30)" }}>BATTLE</h1>
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
          <div className="flex-1 max-w-lg relative z-10">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex items-center gap-2 mb-3"
            >
              <Crown className="w-5 h-5" style={{ color: "#E5A540" }} />
              <span className="text-[11px] tracking-[0.25em] uppercase text-[#E5A540]/80 font-display">Featured · Shadow Sovereign</span>
            </motion.div>
            <motion.p
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="text-2xl sm:text-3xl lg:text-5xl text-white/90 leading-tight"
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
              <div className="h-px w-12 bg-gradient-to-r from-[#E5A540] to-transparent" />
              <span className="text-[11px] tracking-[0.2em] uppercase text-[#E5A540]/70">Battle Modes</span>
            </motion.div>
          </div>

          {/* Featured banner — right side, with nightmare boss art */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="hidden sm:block w-64 lg:w-80 rounded-2xl overflow-hidden backdrop-blur-md shrink-0"
            style={{
              background: "rgba(16,16,20,0.85)",
              border: "1px solid rgba(124,77,255,0.40)",
              boxShadow: "0 0 50px rgba(124,77,255,0.15), inset 0 1px 0 rgba(255,255,255,0.06)",
            }}
          >
            {/* Nightmare boss art */}
            <div className="relative h-28 lg:h-36 overflow-hidden">
              <img
                src="/custom/nm_eternal_nightmare.png"
                alt="Eternal Nightmare"
                className="absolute inset-0 w-full h-full object-cover object-top"
                style={{ filter: "saturate(1.15)" }}
              />
              <div className="absolute inset-0" style={{
                background: "linear-gradient(180deg, rgba(16,16,20,0.20) 0%, rgba(16,16,20,0.60) 60%, rgba(16,16,20,0.95) 100%)"
              }} />
              <div className="absolute top-2.5 right-2.5 flex items-center gap-1 px-2 py-0.5 rounded-full" style={{
                background: "rgba(255,23,68,0.20)", border: "1px solid rgba(255,23,68,0.45)"
              }}>
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                <span className="text-[9px] font-display tracking-widest text-red-300">LIVE</span>
              </div>
            </div>
            <div className="p-4 lg:p-5">
              <div className="flex items-center gap-2 mb-1.5">
                <Sparkles className="w-4 h-4 lg:w-5 lg:h-5" style={{ color: "#7C4DFF" }} />
                <h3 className="font-display text-lg lg:text-xl tracking-wide text-white">ETERNAL NIGHTMARE</h3>
              </div>
              <p className="text-[10px] lg:text-xs text-red-300/80 tracking-[0.1em] mb-3">NEW BOSS • TSUKUYOMI</p>
              <Link to="/tsukuyomi" className="text-sm text-white/80 hover:text-white transition-colors flex items-center gap-1.5 group" style={{
                background: "linear-gradient(135deg, rgba(124,77,255,0.25), rgba(255,23,68,0.20))",
                border: "1px solid rgba(124,77,255,0.40)",
              }}>
                <span className="px-3 py-1.5 rounded-lg flex items-center gap-1.5 w-full">
                  Challenge Now
                  <span className="transition-transform group-hover:translate-x-1">→</span>
                </span>
              </Link>
            </div>
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
                    className="group relative block rounded-2xl overflow-hidden transition-all duration-300 active:scale-[0.97] hover:-translate-y-1.5 h-[200px] lg:h-[240px]"
                    style={{
                      border: `1px solid ${m.color}50`,
                      boxShadow: `0 4px 24px rgba(0,0,0,0.5), 0 0 0 1px ${m.color}10`,
                    }}
                  >
                    {/* Shinobi artwork background */}
                    <img
                      src={m.art}
                      alt={m.label}
                      className="absolute inset-0 w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-110"
                    />
                    {/* Dark gradient overlay for text readability */}
                    <div className="absolute inset-0" style={{
                      background: `linear-gradient(180deg, ${m.color}10 0%, rgba(10,10,14,0.40) 35%, rgba(10,10,14,0.88) 80%, rgba(10,10,14,0.96) 100%)`
                    }} />
                    {/* Hover glow */}
                    <div
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                      style={{ background: `radial-gradient(80% 60% at 50% 30%, ${m.color}30, transparent)` }}
                    />
                    {/* Top accent line */}
                    <div
                      className="absolute top-0 left-0 right-0 h-0.5 opacity-60 group-hover:opacity-100 group-hover:h-1 transition-all"
                      style={{ background: m.color, boxShadow: `0 0 12px ${m.color}` }}
                    />
                    {/* Rarity badge */}
                    {m.rarity && (
                      <div className="absolute top-2.5 right-2.5 px-1.5 py-0.5 rounded text-[9px] lg:text-[10px] font-display tracking-wider font-bold" style={{
                        color: RARITY[m.rarity]?.color || "#fff",
                        background: `${RARITY[m.rarity]?.color || "#fff"}20`,
                        border: `1px solid ${RARITY[m.rarity]?.color || "#fff"}50`,
                        textShadow: `0 0 8px ${RARITY[m.rarity]?.color || "#fff"}60`,
                      }}>
                        {m.rarity}
                      </div>
                    )}

                    <div className="relative h-full flex flex-col justify-end p-3 lg:p-4">
                      <div className="flex items-center gap-2 mb-1.5">
                        <div
                          className="w-8 h-8 lg:w-9 lg:h-9 rounded-lg flex items-center justify-center shrink-0"
                          style={{ background: `${m.color}22`, border: `1px solid ${m.color}55` }}
                        >
                          <Icon className="w-4 h-4 lg:w-5 lg:h-5" style={{ color: m.color }} />
                        </div>
                        <h3 className="font-display text-sm lg:text-base tracking-wide text-white leading-none">{m.label}</h3>
                      </div>
                      <p className="text-[10px] lg:text-[11px] text-slate-300/80 leading-tight pl-10 lg:pl-11">{m.sub}</p>
                    </div>

                    {/* Bottom accent bar */}
                    <div
                      className="absolute bottom-0 left-0 right-0 h-0.5 transition-all duration-300 group-hover:h-1"
                      style={{ background: m.color, boxShadow: `0 0 10px ${m.color}` }}
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
                      border: `1px solid ${m.color}50`,
                      height: "140px",
                    }}
                  >
                    <img src={m.art} alt={m.label} className="absolute inset-0 w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-110" />
                    <div className="absolute inset-0" style={{
                      background: `linear-gradient(180deg, ${m.color}10 0%, rgba(10,10,14,0.40) 35%, rgba(10,10,14,0.88) 80%, rgba(10,10,14,0.95) 100%)`
                    }} />
                    {m.rarity && (
                      <div className="absolute top-1.5 right-1.5 px-1 py-0.5 rounded text-[8px] font-display tracking-wider font-bold" style={{
                        color: RARITY[m.rarity]?.color || "#fff",
                        background: `${RARITY[m.rarity]?.color || "#fff"}20`,
                        border: `1px solid ${RARITY[m.rarity]?.color || "#fff"}50`,
                      }}>
                        {m.rarity}
                      </div>
                    )}
                    <div className="relative h-full flex flex-col justify-end p-2.5">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <div className="w-6 h-6 rounded flex items-center justify-center shrink-0" style={{ background: `${m.color}22`, border: `1px solid ${m.color}55` }}>
                          <Icon className="w-3.5 h-3.5" style={{ color: m.color }} />
                        </div>
                        <h3 className="font-display text-[11px] tracking-wide text-white leading-none">{m.label}</h3>
                      </div>
                      <p className="text-[9px] text-slate-300/70 leading-tight pl-7">{m.sub}</p>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: m.color, boxShadow: `0 0 6px ${m.color}` }} />
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
                  border: `1px solid #FF174450`,
                  height: "140px",
                }}
              >
                <img src="/custom/hades.png" alt="ARENA" className="absolute inset-0 w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-110" />
                <div className="absolute inset-0" style={{
                  background: `linear-gradient(180deg, #FF174412 0%, rgba(10,10,14,0.50) 45%, rgba(10,10,14,0.92) 100%)`
                }} />
                <div className="relative h-full flex flex-col justify-end p-2.5">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <div className="w-6 h-6 rounded flex items-center justify-center shrink-0" style={{ background: "#FF174422", border: "1px solid #FF174455" }}>
                      <Crosshair className="w-3.5 h-3.5" style={{ color: "#FF1744" }} />
                    </div>
                    <h3 className="font-display text-[11px] tracking-wide text-white leading-none">ARENA</h3>
                  </div>
                  <p className="text-[9px] text-slate-300/70 leading-tight pl-7">PvP Battles</p>
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
