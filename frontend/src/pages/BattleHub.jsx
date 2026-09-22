import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  Scroll, Moon, Castle, Landmark, Swords, Zap, Bot, Gauge,
  Sparkles, Crown, Coins, Gem, LogOut, Volume2, VolumeX,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useAudio } from "@/context/AudioContext";
import { useGame } from "@/context/GameContext";
import { RARITY } from "@/lib/theme";

const PILL_BG = {
  background: "rgba(13, 17, 23, 0.72)",
  backdropFilter: "blur(14px)",
  WebkitBackdropFilter: "blur(14px)",
  border: "1px solid rgba(123, 158, 181, 0.22)",
};

/**
 * BattleHub — cinematic battle mode selection matching the reference design.
 * Unified top bar (title + currency + profile + toggles), featured Shadow
 * Sovereign card (left), Eternal Nightmare boss card (center), and a row of
 * five selectable mode cards at the bottom.
 */
export default function BattleHub() {
  const { user, logout } = useAuth();
  const { stages } = useGame();
  const { muted, toggleMute } = useAudio();
  const navigate = useNavigate();
  const cleared = user?.cleared_stages?.length || 0;

  const [auto, setAuto] = useState(() => {
    try { return localStorage.getItem("sc_battle_auto") === "1"; } catch { return false; }
  });
  const [speed, setSpeed] = useState(() => {
    try { return Number(localStorage.getItem("sc_battle_speed")) || 1; } catch { return 1; }
  });
  const toggleAuto = () => {
    const v = !auto; setAuto(v);
    try { localStorage.setItem("sc_battle_auto", v ? "1" : "0"); } catch { /* */ }
  };
  const cycleSpeed = () => {
    const v = speed >= 3 ? 1 : speed + 1; setSpeed(v);
    try { localStorage.setItem("sc_battle_speed", String(v)); } catch { /* */ }
  };
  const handleLogout = async () => { await logout(); navigate("/login"); };

  const modes = [
    { to: "/campaign", label: "CAMPAIGN", icon: Scroll, color: "#A740E5",
      sub: `${cleared}/${stages.length || 1200} stages cleared`, testid: "mode-campaign",
      art: "/custom/ares.png", rarity: "SSR" },
    { to: "/dungeons", label: "DUNGEONS", icon: Landmark, color: "#29B6F6",
      sub: "Gold · EXP · Materials", testid: "mode-dungeons",
      art: "/custom/ymir.png", rarity: "SR" },
    { to: "/boss-hunt", label: "BOSS HUNT", icon: Moon, color: "#64FFDA",
      sub: "Hunt Powerful Bosses", testid: "mode-boss-hunt",
      art: "/custom/fenrir.png", rarity: "GR" },
    { to: "/spire", label: "SS SPIRE", icon: Castle, color: "#E5A540",
      sub: `${user?.spire_floor || 12}/50 floors reached`, testid: "mode-spire",
      art: "/custom/odin.png", rarity: "UR" },
    { to: "/summon", label: "SUMMON", icon: Sparkles, color: "#E5A540",
      sub: "New Shinobi Available", testid: "mode-summon",
      art: "/custom/amaterasu.png", rarity: "UR" },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0a0a0c]" data-testid="battle-hub-page">
      {/* ── Full-screen background art ── */}
      <div className="fixed inset-0 bg-cover bg-center" style={{ backgroundImage: "url(/art/login-bg-epic.png)" }} />
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

      {/* ── Content layer ── */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* ════════ Unified Top Bar ════════ */}
        <div className="flex items-center justify-between px-4 sm:px-6 lg:px-10 pt-3 pb-2">
          {/* Left: BATTLE title */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{
              background: "linear-gradient(135deg, rgba(255,87,34,0.18), rgba(124,77,255,0.18))",
              border: "1px solid rgba(255,87,34,0.40)",
            }}>
              <Swords className="w-6 h-6" style={{ color: "#FF6B35" }} />
            </div>
            <div>
              <h1 className="font-display text-2xl sm:text-3xl tracking-wide text-white leading-none" style={{ textShadow: "0 0 30px rgba(255,107,53,0.30)" }}>BATTLE</h1>
              <p className="text-slate-400 text-[11px] mt-0.5">Choose your battlefield.</p>
            </div>
          </div>

          {/* Center: Currency pills */}
          <div className="hidden md:flex items-center gap-2">
            {[
              { icon: Zap, color: "#44d6b5", value: energy(user) },
              { icon: Coins, color: "#c4a882", value: user?.ryo ?? 0 },
              { icon: Gem, color: "#7eb8d4", value: user?.gems ?? 0 },
            ].map((p, i) => (
              <div key={i} className="flex items-center gap-1.5 pl-1.5 pr-3 py-1 rounded-full" style={PILL_BG}>
                <span className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{
                  background: `${p.color}1a`, boxShadow: `0 0 10px ${p.color}44`, border: `1px solid ${p.color}44`,
                }}>
                  <p.icon className="w-3.5 h-3.5" style={{ color: p.color }} />
                </span>
                <span className="font-display text-sm leading-none tabular-nums" style={{ color: "#dce7ec" }}>
                  {Number(p.value ?? 0).toLocaleString()}
                </span>
              </div>
            ))}
          </div>

          {/* Right: Profile + sound + logout + toggles */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Profile chip */}
            <div className="hidden sm:flex items-center gap-2 pl-1 pr-3 py-1 rounded-full" style={PILL_BG} data-testid="hud-player">
              <span className="w-7 h-7 rounded-full flex items-center justify-center font-display text-sm shrink-0" style={{
                background: "linear-gradient(135deg, #44d6b5, #2a8a7a)", color: "#0d1117", border: "1px solid rgba(68, 214, 181, 0.4)",
              }}>
                {(user?.name || "S").slice(0, 1).toUpperCase()}
              </span>
              <div className="leading-none min-w-[60px]">
                <p className="text-[11px] font-semibold leading-none max-w-[70px] truncate" style={{ color: "#dce7ec" }} data-testid="hud-player-name">{user?.name}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[9px] font-display leading-none shrink-0" style={{ color: "#c4a882" }} data-testid="hud-player-level">Lv.{user?.level ?? 1}</span>
                  <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "rgba(123, 158, 181, 0.15)" }}>
                    <div className="h-full rounded-full transition-all duration-500" style={{
                      width: `${Math.min(100, ((user?.exp ?? 0) / Math.max(1, user?.exp_to_next ?? 1)) * 100)}%`,
                      background: "linear-gradient(90deg, #44d6b5, #2a8a7a)", boxShadow: "0 0 6px rgba(68, 214, 181, 0.5)",
                    }} />
                  </div>
                </div>
              </div>
            </div>

            <button onClick={toggleMute} data-testid="hud-sound-toggle" aria-label="Toggle sound" className="w-8 h-8 rounded-full flex items-center justify-center transition-colors" style={{ ...PILL_BG, color: muted ? "#6b838c" : "#44d6b5" }}>
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <button onClick={handleLogout} data-testid="hud-logout" aria-label="Logout" className="w-8 h-8 rounded-full flex items-center justify-center transition-colors" style={{ ...PILL_BG, color: "#c4a882" }}>
              <LogOut className="w-4 h-4" />
            </button>

            {/* Divider */}
            <div className="hidden sm:block w-px h-7 bg-white/10" />

            {/* Toggle buttons */}
            <div className="hidden sm:flex items-center gap-1.5" data-testid="battle-prefs">
              <span className="text-[10px] uppercase tracking-widest text-slate-500 px-1">Defaults</span>
              <button onClick={toggleAuto} data-testid="pref-auto-toggle" className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-display tracking-wide border transition-colors" style={auto ? { color: "#00E5FF", borderColor: "#00E5FF", background: "rgba(0,229,255,0.12)" } : { color: "#94a3b8", borderColor: "rgba(255,255,255,0.15)" }}>
                <Bot className="w-3.5 h-3.5" /> AUTO {auto ? "ON" : "OFF"}
              </button>
              <button onClick={cycleSpeed} data-testid="pref-speed-toggle" className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-display tracking-wide border border-white/15 text-slate-300 hover:text-white transition-colors">
                <Gauge className="w-3.5 h-3.5" /> {speed}X
              </button>
            </div>
          </div>
        </div>

        {/* ════════ Main Content: Shadow Sovereign card (left) + Eternal Nightmare (center) ════════ */}
        <div className="flex-1 flex items-center justify-center gap-4 lg:gap-6 px-4 sm:px-6 lg:px-10 pt-2 pb-2">
          {/* ── Shadow Sovereign featured card (left) ── */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.15 }}
            className="hidden md:block relative rounded-2xl overflow-hidden shrink-0"
            style={{
              width: "min(30vw, 360px)",
              height: "min(52vh, 440px)",
              border: "1px solid rgba(124,77,255,0.40)",
              boxShadow: "0 0 50px rgba(124,77,255,0.15), inset 0 1px 0 rgba(255,255,255,0.06)",
            }}
          >
            {/* Character art */}
            <img
              src="/custom/nm_shadow_sovereign.png"
              alt="Shadow Sovereign"
              className="absolute inset-0 w-full h-full object-cover object-top"
              style={{ filter: "saturate(1.1) drop-shadow(0 0 20px rgba(124,77,255,0.20))" }}
            />
            {/* Gradient overlay */}
            <div className="absolute inset-0" style={{
              background: "linear-gradient(180deg, rgba(10,10,14,0.15) 0%, rgba(10,10,14,0.40) 50%, rgba(10,10,14,0.95) 100%)",
            }} />
            {/* Text content */}
            <div className="absolute inset-0 flex flex-col justify-end p-5">
              <div className="flex items-center gap-2 mb-2">
                <Crown className="w-4 h-4" style={{ color: "#E5A540" }} />
                <span className="text-[10px] tracking-[0.2em] uppercase text-[#E5A540]/80 font-display">Featured | Shadow Sovereign</span>
              </div>
              <p className="text-2xl lg:text-3xl text-white/90 leading-tight mb-3" style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 300, fontStyle: "italic" }}>
                A new chapter awakens.
              </p>
              <div className="flex items-center gap-2">
                <div className="h-px w-10 bg-gradient-to-r from-[#E5A540] to-transparent" />
                <span className="text-[10px] tracking-[0.2em] uppercase text-[#E5A540]/70">Battle Modes</span>
              </div>
            </div>
          </motion.div>

          {/* ── Eternal Nightmare boss card (center) ── */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="relative rounded-2xl overflow-hidden backdrop-blur-md shrink-0"
            style={{
              width: "min(26vw, 320px)",
              background: "rgba(16,16,20,0.85)",
              border: "1px solid rgba(124,77,255,0.40)",
              boxShadow: "0 0 50px rgba(124,77,255,0.15), inset 0 1px 0 rgba(255,255,255,0.06)",
            }}
          >
            {/* Boss art */}
            <div className="relative h-32 lg:h-40 overflow-hidden">
              <img
                src="/custom/nm_eternal_nightmare.png"
                alt="Eternal Nightmare"
                className="absolute inset-0 w-full h-full object-cover object-top"
                style={{ filter: "saturate(1.15)" }}
              />
              <div className="absolute inset-0" style={{
                background: "linear-gradient(180deg, rgba(16,16,20,0.20) 0%, rgba(16,16,20,0.60) 60%, rgba(16,16,20,0.95) 100%)",
              }} />
              {/* LIVE badge */}
              <div className="absolute top-2.5 right-2.5 flex items-center gap-1 px-2 py-0.5 rounded-full" style={{
                background: "rgba(255,23,68,0.20)", border: "1px solid rgba(255,23,68,0.45)",
              }}>
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                <span className="text-[9px] font-display tracking-widest text-red-300">LIVE</span>
              </div>
            </div>
            {/* Card body */}
            <div className="p-4 lg:p-5">
              <div className="flex items-center gap-2 mb-1.5">
                <Sparkles className="w-4 h-4 lg:w-5 lg:h-5" style={{ color: "#7C4DFF" }} />
                <h3 className="font-display text-lg lg:text-xl tracking-wide text-white">ETERNAL NIGHTMARE</h3>
              </div>
              <p className="text-[10px] lg:text-xs text-red-300/80 tracking-[0.1em] mb-3">NEW BOSS · TSUKUYOMI</p>
              <Link to="/tsukuyomi" className="block group">
                <span className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm text-white transition-all" style={{
                  background: "linear-gradient(135deg, #5a1f33, #2d0d1a)",
                  border: "1px solid rgba(124,77,255,0.40)",
                }}>
                  Challenge Now
                  <span className="transition-transform group-hover:translate-x-1">→</span>
                </span>
              </Link>
            </div>
          </motion.div>
        </div>

        {/* ════════ Bottom: Mode cards carousel ════════ */}
        <div className="px-4 sm:px-6 lg:px-10 pb-4 lg:pb-6">
          {/* Desktop / Tablet: single row of 5 cards */}
          <div className="hidden sm:grid grid-cols-5 gap-3 lg:gap-4">
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
                    className="group relative block rounded-2xl overflow-hidden transition-all duration-300 active:scale-[0.97] hover:-translate-y-1.5 h-[180px] lg:h-[220px]"
                    style={{ border: `1px solid ${m.color}50`, boxShadow: `0 4px 24px rgba(0,0,0,0.5), 0 0 0 1px ${m.color}10` }}
                  >
                    <img src={m.art} alt={m.label} className="absolute inset-0 w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-110" />
                    <div className="absolute inset-0" style={{
                      background: `linear-gradient(180deg, ${m.color}10 0%, rgba(10,10,14,0.40) 35%, rgba(10,10,14,0.88) 80%, rgba(10,10,14,0.96) 100%)`,
                    }} />
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" style={{ background: `radial-gradient(80% 60% at 50% 30%, ${m.color}30, transparent)` }} />
                    <div className="absolute top-0 left-0 right-0 h-0.5 opacity-60 group-hover:opacity-100 group-hover:h-1 transition-all" style={{ background: m.color, boxShadow: `0 0 12px ${m.color}` }} />
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
                        <div className="w-8 h-8 lg:w-9 lg:h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${m.color}22`, border: `1px solid ${m.color}55` }}>
                          <Icon className="w-4 h-4 lg:w-5 lg:h-5" style={{ color: m.color }} />
                        </div>
                        <h3 className="font-display text-sm lg:text-base tracking-wide text-white leading-none">{m.label}</h3>
                      </div>
                      <p className="text-[10px] lg:text-[11px] text-slate-300/80 leading-tight pl-10 lg:pl-11">{m.sub}</p>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 transition-all duration-300 group-hover:h-1" style={{ background: m.color, boxShadow: `0 0 10px ${m.color}` }} />
                  </Link>
                </motion.div>
              );
            })}
          </div>

          {/* Mobile: 2-column grid */}
          <div className="sm:hidden grid grid-cols-2 gap-2.5">
            {modes.map((m, i) => {
              const Icon = m.icon;
              return (
                <motion.div key={m.to} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 * i, duration: 0.4 }}>
                  <Link to={m.to} data-testid={m.testid} className="group relative block rounded-xl overflow-hidden transition-all active:scale-[0.97]" style={{ border: `1px solid ${m.color}50`, height: "130px" }}>
                    <img src={m.art} alt={m.label} className="absolute inset-0 w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-110" />
                    <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, ${m.color}10 0%, rgba(10,10,14,0.40) 35%, rgba(10,10,14,0.88) 80%, rgba(10,10,14,0.95) 100%)` }} />
                    {m.rarity && (
                      <div className="absolute top-1.5 right-1.5 px-1 py-0.5 rounded text-[8px] font-display tracking-wider font-bold" style={{
                        color: RARITY[m.rarity]?.color || "#fff", background: `${RARITY[m.rarity]?.color || "#fff"}20`, border: `1px solid ${RARITY[m.rarity]?.color || "#fff"}50`,
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

/** Extract current energy value from user object. */
function energy(user) {
  return user?.energy?.current ?? 0;
}
