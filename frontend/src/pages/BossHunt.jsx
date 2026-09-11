import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Swords, Skull, Zap, ChevronRight, Flame, Droplet, Wind, Mountain, Sun, Moon, Sparkles, TrendingUp, Hand } from "lucide-react";
import { useGame } from "@/context/GameContext";
import { useAuth } from "@/context/AuthContext";
import { rarityFrame, glow, RARITY, ELEMENT } from "@/lib/theme";
import api from "@/lib/api";
import { cachedFetch } from "@/lib/cache";
import { preloadBattleAssets, getBattleBackground } from "@/lib/preload";

const ELEMENT_ICONS = {
  Fire: Flame, Water: Droplet, Wind: Wind, Earth: Mountain,
  Lightning: Zap, Dark: Moon, Light: Sun,
};

const RARITY_LABELS = {
  UR: "UR · LEGENDARY",
  LR: "LR · MYTHIC",
  GR: "GR · ASCENDANT",
};

const REWARD_LABELS = {
  boss_crystal: { name: "Boss Crystal", icon: "https://media.base44.com/images/public/6a95b687e54c815596ebfc07/53f44f9d8_generated_d106d66d.png" },
  event_gear: { name: "Event Gear", icon: "https://media.base44.com/images/public/6a95b687e54c815596ebfc07/ffcf2e186_generated_c2248e7f.png" },
  essence: { name: "Essence", icon: "https://media.base44.com/images/public/6a95b687e54c815596ebfc07/1ffc8322d_generated_93a565a4.png" },
  boss_card: { name: "Boss Card", icon: "https://media.base44.com/images/public/6a95b687e54c815596ebfc07/3b5a23e5b_generated_b123f19c.png" },
};

/** Deterministic ember particle positions — stable across re-renders. */
function useParticles(count, seed) {
  return useMemo(() => {
    const arr = [];
    for (let i = 0; i < count; i++) {
      const s = (i + 1) * (seed || 7);
      arr.push({
        left: `${((s * 13.7) % 100)}%`,
        size: 2 + ((s * 3) % 4),
        duration: 4 + ((s * 7) % 8),
        delay: `${((s * 1.3) % 10) * 0.5}s`,
        drift: `${(((s % 5) - 2) * 12)}px`,
        opacity: 0.3 + ((s % 7) * 0.08),
      });
    }
    return arr;
  }, [count, seed]);
}

export default function BossHunt() {
  const navigate = useNavigate();
  const { catalogById, catalog } = useGame();
  const { user } = useAuth();
  const [bosses, setBosses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIdx, setSelectedIdx] = useState(0);

  useEffect(() => {
    cachedFetch("/game/boss-hunt", { ttl: 60_000, revalidate: true }, api)
      .then((data) => {
        setBosses(data.bosses || []);
        setLoading(false);

        // Preload boss portraits and background
        const portraits = (data.bosses || [])
          .slice(0, 5)
          .map((b) => catalogById[b.template_id]?.portrait)
          .filter(Boolean);
        preloadBattleAssets({ portraits, background: getBattleBackground("bosshunt") });
      })
      .catch(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedBoss = bosses[selectedIdx];

  // Particle hooks must run unconditionally (before any early return)
  const particleSeed = selectedIdx + 1;
  const emberParticles = useParticles(24, particleSeed);
  const sparkParticles = useParticles(12, particleSeed * 3);

  const launchBattle = (boss) => {
    const template = catalogById[boss.template_id];
    if (!template) return;

    const enemy = {
      template_id: boss.template_id,
      level: boss.level || 60,
      ascension: 15,
      stats_override: null,
      skill_rank: 10,
      passive_locked: false,
      reforge: null,
      combat_modifiers: boss.combat_modifiers || {},
      boss_mechanic: boss.boss_mechanic || null,
      escalating_damage: boss.escalating_damage || false,
      boss_identity: {
        name: boss.name,
        element: boss.element,
        difficulty: boss.difficulty,
        traits: boss.traits,
        strategy: boss.strategy,
        vulnerability_hint: boss.vulnerability_hint,
        archetype: boss.archetype,
      },
    };

    sessionStorage.setItem("bosshunt_boss", JSON.stringify({
      boss_id: boss.id,
      name: boss.name,
      difficulty: boss.difficulty,
      enemies: [enemy],
    }));

    navigate(`/battle/bosshunt/${boss.id}`);
  };

  // Build team hero cards
  const teamHeroes = (user?.team || [])
    .map((tid) => {
      const inst = user?.ninjas?.find((n) => n.instance_id === tid);
      if (!inst) return null;
      const tmpl = catalogById[inst.template_id];
      if (!tmpl) return null;
      return { inst, tmpl };
    })
    .filter(Boolean);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#05050A]">
        <Swords className="w-8 h-8 text-chakra animate-pulse" />
      </div>
    );
  }

  if (!selectedBoss) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#05050A]">
        <p className="text-slate-400">No bosses available.</p>
      </div>
    );
  }

  const bossTemplate = catalogById[selectedBoss.template_id];
  const bossRarity = selectedBoss.rarity || "UR";
  const frame = rarityFrame(bossRarity);
  const rarityColor = RARITY[bossRarity]?.color || "#FFCA28";
  const elemColor = ELEMENT[selectedBoss.element]?.color || "#9E9E9E";
  const ElemIcon = ELEMENT_ICONS[selectedBoss.element] || Skull;
  const diffColor = selectedBoss.difficulty === "NIGHTMARE" ? "#D500F9" : "#FF5722";
  const canFight = teamHeroes.length > 0 && !!bossTemplate;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#05050A]">
      {/* ===== FULL-SCREEN SHRINE BACKGROUND ===== */}
      <div
        className="fixed inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url(/bosshunt-shrine.webp)" }}
      />
      {/* Subtle dark gradient overlay for readability */}
      <div className="fixed inset-0" style={{
        background: "linear-gradient(180deg, rgba(5,5,10,0.50) 0%, rgba(5,5,10,0.10) 25%, rgba(5,5,10,0.25) 50%, rgba(5,5,10,0.80) 100%)"
      }} />
      {/* Red ambient glow */}
      <div className="fixed inset-0 pointer-events-none" style={{
        background: "radial-gradient(70% 50% at 50% 20%, rgba(139,0,0,0.18) 0%, transparent 60%)"
      }} />
      {/* Element-tinted ambient glow behind boss area */}
      <div className="fixed inset-0 pointer-events-none" style={{
        background: `radial-gradient(50% 40% at 50% 35%, ${elemColor}15 0%, transparent 70%)`,
        animation: "ambientPulse 5s ease-in-out infinite alternate",
      }} />

      {/* ===== CONTENT LAYER ===== */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* ===== HEADER ===== */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/15 text-slate-300 hover:text-white hover:border-white/30 transition-colors text-sm font-display tracking-wide"
          >
            ← RETREAT
          </button>
          <div className="text-center">
            <div className="flex items-center gap-2 justify-center">
              <Sparkles className="w-4 h-4 text-fox" />
              <h1 className="font-display text-2xl sm:text-3xl tracking-[0.2em] text-white" style={{ textShadow: "0 0 20px rgba(139,0,0,0.5)" }}>
                BOSS HUNT
              </h1>
              <Sparkles className="w-4 h-4 text-fox" />
            </div>
            <p className="text-[10px] sm:text-xs text-slate-300/80 tracking-[0.15em] uppercase">
              Challenge Legends. Claim Their Power.
            </p>
          </div>
          <div className="w-20" /> {/* spacer for centering */}
        </div>

        {/* ===== MAIN CONTENT ===== */}
        <div className="flex-1 flex flex-col lg:flex-row gap-4 px-4 sm:px-6 max-w-[1600px] mx-auto w-full">

          {/* ===== LEFT: BOSS SELECTOR ===== */}
          <div className="lg:w-52 flex-shrink-0 flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-1 lg:pb-0 order-1">
            {bosses.map((boss, i) => {
              const tmpl = catalogById[boss.template_id];
              const isSelected = i === selectedIdx;
              const bRarity = boss.rarity || "UR";
              const bColor = RARITY[bRarity]?.color || "#FFCA28";
              return (
                <button
                  key={boss.id}
                  onClick={() => setSelectedIdx(i)}
                  className={`flex-shrink-0 lg:w-full w-36 text-left rounded-xl overflow-hidden border transition-all duration-300 ${
                    isSelected
                      ? "bg-white/10 border-2"
                      : "bg-black/40 border border-white/10 hover:border-white/25 opacity-80"
                  }`}
                  style={isSelected ? { borderColor: bColor, boxShadow: `0 0 16px ${bColor}44` } : {}}
                >
                  <div className="flex items-center gap-2 p-2">
                    {tmpl?.portrait && (
                      <img
                        src={tmpl.portrait}
                        alt={boss.name}
                        className={`w-12 h-12 rounded-lg object-cover ${isSelected ? "" : "grayscale-[40%] brightness-90"}`}
                        style={isSelected ? { boxShadow: `0 0 8px ${bColor}66` } : {}}
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-[9px] font-bold tracking-wider" style={{ color: bColor }}>
                        {RARITY_LABELS[bRarity] || bRarity}
                      </div>
                      <h3 className={`font-display text-sm tracking-wide truncate ${isSelected ? "text-white" : "text-slate-300"}`}>
                        {boss.name}
                      </h3>
                      <p className="text-[10px] text-slate-500 truncate">{boss.title || ""}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* ===== CENTER: GIANT BOSS CARD + TEAM + CTA ===== */}
          <div className="flex-1 flex flex-col items-center justify-start min-h-0 order-2 lg:order-2 gap-3 py-2">

            {/* --- Boss Card with heavy effects --- */}
            {bossTemplate?.portrait && (
              <div className="relative" style={{ width: "clamp(280px, 62vw, 520px)" }}>
                {/* Pulsing aura behind card */}
                <div
                  className="absolute -inset-8 rounded-full pointer-events-none"
                  style={{
                    background: `radial-gradient(circle, ${rarityColor}22 0%, ${elemColor}11 40%, transparent 70%)`,
                    animation: "auraPulse 4s ease-in-out infinite alternate",
                  }}
                />

                {/* Lightning crack overlay (behind card) */}
                <div
                  className="absolute -inset-4 pointer-events-none rounded-2xl"
                  style={{
                    background: `radial-gradient(circle at 50% 50%, ${elemColor}00 30%, ${elemColor}08 60%, transparent 80%)`,
                    animation: "lightningFlash 7s ease-in-out infinite",
                  }}
                />

                {/* Floating ember particles (behind card) */}
                <div className="absolute -inset-6 pointer-events-none overflow-hidden">
                  {emberParticles.map((p, i) => (
                    <span
                      key={`ember-${i}`}
                      className="absolute rounded-full"
                      style={{
                        left: p.left,
                        bottom: "0%",
                        width: p.size,
                        height: p.size,
                        background: elemColor,
                        opacity: p.opacity,
                        boxShadow: `0 0 ${p.size * 2}px ${elemColor}`,
                        animation: `emberRise ${p.duration}s ease-in infinite`,
                        animationDelay: p.delay,
                        "--drift": p.drift,
                      }}
                    />
                  ))}
                </div>

                {/* The actual boss card — clickable to launch battle */}
                <button
                  onClick={() => canFight && launchBattle(selectedBoss)}
                  className="relative block w-full rounded-2xl overflow-hidden boss-float group cursor-pointer transition-transform"
                  style={{
                    boxShadow: `0 0 50px ${rarityColor}44, 0 0 100px ${rarityColor}22, 0 0 140px ${elemColor}15, 0 20px 60px rgba(0,0,0,0.7)`,
                    border: `3px solid ${frame.strokeColor}`,
                    animation: "bossGlow 3s ease-in-out infinite alternate, bossFloat 6s ease-in-out infinite",
                  }}
                >
                  {/* Animated inner border glow */}
                  <div className="absolute inset-0 pointer-events-none rounded-2xl z-20" style={{
                    boxShadow: `inset 0 0 25px ${rarityColor}44, inset 0 0 50px ${elemColor}11`,
                    animation: "bossBorderPulse 4s ease-in-out infinite",
                  }} />

                  {/* Boss artwork */}
                  <img
                    src={bossTemplate.portrait}
                    alt={selectedBoss.name}
                    className="w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    style={{ height: "clamp(380px, 58vh, 580px)", objectPosition: "top" }}
                  />

                  {/* Bottom gradient scrim */}
                  <div className="absolute inset-0 z-10" style={{
                    background: "linear-gradient(to top, rgba(5,5,10,0.95) 0%, rgba(5,5,10,0.3) 45%, transparent 70%, rgba(5,5,10,0.2) 100%)"
                  }} />

                  {/* Top gradient for badge readability */}
                  <div className="absolute top-0 left-0 right-0 h-20 z-10" style={{
                    background: "linear-gradient(to bottom, rgba(5,5,10,0.7), transparent)"
                  }} />

                  {/* Spark particles (on top of image) */}
                  <div className="absolute inset-0 pointer-events-none z-15 overflow-hidden">
                    {sparkParticles.map((p, i) => (
                      <span
                        key={`spark-${i}`}
                        className="absolute rounded-full"
                        style={{
                          left: p.left,
                          top: `${(i * 8) % 80 + 10}%`,
                          width: p.size - 1,
                          height: p.size - 1,
                          background: rarityColor,
                          opacity: p.opacity * 0.7,
                          boxShadow: `0 0 ${p.size * 3}px ${rarityColor}`,
                          animation: `sparkFlicker ${p.duration}s ease-in-out infinite`,
                          animationDelay: p.delay,
                        }}
                      />
                    ))}
                  </div>

                  {/* Level badge */}
                  <div className="absolute top-3 left-3 z-20 px-3 py-1.5 rounded-lg bg-black/70 border border-white/15 backdrop-blur-sm">
                    <span className="font-display text-base tracking-wider" style={{ color: rarityColor, textShadow: `0 0 10px ${rarityColor}` }}>
                      LV.{selectedBoss.level}
                    </span>
                  </div>
                  {/* Rarity badge */}
                  <div className="absolute top-3 right-3 z-20 px-3 py-1.5 rounded-lg bg-black/70 border backdrop-blur-sm" style={{ borderColor: rarityColor + "66" }}>
                    <span className="font-display text-base tracking-wider" style={{ color: rarityColor, textShadow: `0 0 10px ${rarityColor}` }}>
                      {bossRarity}
                    </span>
                  </div>

                  {/* Boss name and title */}
                  <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5 z-20">
                    <h2 className="font-display text-3xl sm:text-4xl tracking-wider text-white" style={{ textShadow: `0 0 20px ${rarityColor}aa, 0 2px 4px rgba(0,0,0,0.8)` }}>
                      {selectedBoss.name}
                    </h2>
                    <p className="text-xs sm:text-sm tracking-[0.15em] uppercase text-slate-300 mt-1">
                      {selectedBoss.title}
                    </p>
                    {/* Element + Difficulty */}
                    <div className="flex items-center gap-3 mt-2">
                      <span className="flex items-center gap-1 text-xs sm:text-sm" style={{ color: elemColor, textShadow: `0 0 8px ${elemColor}88` }}>
                        <ElemIcon className="w-4 h-4" />
                        {selectedBoss.element}
                      </span>
                      <span className="flex items-center gap-1 text-xs sm:text-sm" style={{ color: diffColor, textShadow: `0 0 8px ${diffColor}88` }}>
                        <Skull className="w-4 h-4" />
                        {selectedBoss.difficulty}
                      </span>
                    </div>
                  </div>

                  {/* Tap-to-battle hint (mobile/tablet) */}
                  {canFight && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100 lg:opacity-0 transition-opacity duration-300">
                      <div className="px-4 py-2 rounded-full bg-black/60 backdrop-blur-sm border border-white/20 flex items-center gap-2">
                        <Swords className="w-4 h-4 text-red-400" />
                        <span className="text-sm font-display tracking-wider text-white">TAP TO CHALLENGE</span>
                      </div>
                    </div>
                  )}
                </button>

                {/* Glow ring beneath card (ground reflection) */}
                <div
                  className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-[80%] h-6 rounded-full pointer-events-none"
                  style={{
                    background: `radial-gradient(ellipse, ${rarityColor}33 0%, transparent 70%)`,
                    filter: "blur(8px)",
                  }}
                />
              </div>
            )}

            {/* Escalation warning */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-950/40 border border-red-500/20">
              <TrendingUp className="w-4 h-4 text-fox" />
              <span className="text-xs text-red-300/90 font-display tracking-wide">
                Damage escalates +10% every 10 turns
              </span>
            </div>

            {/* --- Player Team (confronting the boss) --- */}
            <div className="w-full flex flex-col items-center gap-2 pt-1">
              <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-display">
                Your Team
              </div>
              <div className="flex items-center justify-center gap-2 sm:gap-3 flex-wrap">
                {teamHeroes.length > 0 ? (
                  teamHeroes.map(({ inst, tmpl }, i) => {
                    const tRarity = tmpl.rarity;
                    const tColor = RARITY[tRarity]?.color || "#9E9E9E";
                    return (
                      <div
                        key={i}
                        className="flex-shrink-0 w-14 sm:w-20 rounded-lg overflow-hidden border bg-black/50 backdrop-blur-sm transition-transform hover:scale-105"
                        style={{ borderColor: tColor + "55", boxShadow: `0 0 12px ${tColor}22` }}
                      >
                        {tmpl.portrait && (
                          <img src={tmpl.portrait} alt={tmpl.name} className="w-full h-14 sm:h-20 object-cover" />
                        )}
                        <div className="p-1">
                          <p className="text-[9px] text-white font-display tracking-wide truncate">{tmpl.name}</p>
                          <p className="text-[8px] text-slate-400">Lv.{inst.level}</p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-slate-500">No team set — visit Hero roster to build your team.</p>
                )}
              </div>
            </div>

            {/* --- Enter Battle CTA (desktop primary, also works on mobile) --- */}
            <button
              onClick={() => canFight && launchBattle(selectedBoss)}
              className="group relative px-8 sm:px-10 py-3 sm:py-4 rounded-xl font-display text-xl sm:text-2xl tracking-[0.15em] text-white overflow-hidden transition-all duration-300 hover:scale-105 active:scale-95"
              style={{
                background: "linear-gradient(135deg, #B71C1C 0%, #E53935 40%, #FF1744 100%)",
                boxShadow: "0 0 30px rgba(255,23,68,0.5), 0 0 60px rgba(183,28,28,0.3), 0 8px 32px rgba(0,0,0,0.6)",
                border: "2px solid rgba(255,100,100,0.4)",
                animation: "ctaPulse 2s ease-in-out infinite",
              }}
            >
              <span className="relative flex items-center gap-2 justify-center">
                <Swords className="w-5 h-5 sm:w-6 sm:h-6" />
                ENTER BATTLE
              </span>
            </button>
          </div>

          {/* ===== RIGHT: BOSS INFO PANEL ===== */}
          <div className="lg:w-60 flex-shrink-0 space-y-3 order-3">
            {/* Boss Traits */}
            <div className="rounded-xl bg-black/45 border border-white/10 p-3 backdrop-blur-sm">
              <h4 className="text-[10px] uppercase tracking-[0.15em] text-slate-400 mb-2 font-display">Boss Traits</h4>
              <div className="space-y-1.5">
                {selectedBoss.traits?.map((trait, i) => (
                  <div key={i} className="text-xs text-slate-200 flex items-start gap-1.5">
                    <span className="text-slate-500">•</span>
                    <span>{trait}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Weaknesses */}
            {selectedBoss.combat_summary?.vulnerabilities?.length > 0 && (
              <div className="rounded-xl bg-black/45 border border-white/10 p-3 backdrop-blur-sm">
                <h4 className="text-[10px] uppercase tracking-[0.15em] text-slate-400 mb-2 font-display">Weaknesses</h4>
                <div className="flex flex-wrap gap-1.5">
                  {selectedBoss.combat_summary.vulnerabilities.map((vuln, i) => (
                    <span key={i} className="text-xs px-2 py-1 rounded-md bg-green-500/15 text-green-300 border border-green-500/20">
                      {vuln}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Defenses */}
            {(selectedBoss.combat_summary?.immunities?.length > 0 || selectedBoss.combat_summary?.resistances?.length > 0) && (
              <div className="rounded-xl bg-black/45 border border-white/10 p-3 backdrop-blur-sm">
                <h4 className="text-[10px] uppercase tracking-[0.15em] text-slate-400 mb-2 font-display">Defenses</h4>
                <div className="flex flex-wrap gap-1.5">
                  {selectedBoss.combat_summary.immunities?.map((imm, i) => (
                    <span key={`imm-${i}`} className="text-xs px-2 py-1 rounded-md bg-red-500/15 text-red-300 border border-red-500/20">
                      {imm}
                    </span>
                  ))}
                  {selectedBoss.combat_summary.resistances?.map((res, i) => (
                    <span key={`res-${i}`} className="text-xs px-2 py-1 rounded-md bg-orange-500/15 text-orange-300 border border-orange-500/20">
                      {res}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Rewards */}
            {selectedBoss.rewards && (
              <div className="rounded-xl bg-black/45 border border-white/10 p-3 backdrop-blur-sm">
                <h4 className="text-[10px] uppercase tracking-[0.15em] text-slate-400 mb-2 font-display">Exclusive Rewards</h4>
                <div className="grid grid-cols-4 gap-2">
                  {selectedBoss.rewards.items?.map((item, i) => {
                    const info = REWARD_LABELS[item] || { name: item, icon: "🎁" };
                    const isImg = info.icon?.startsWith("http");
                    return (
                      <div key={i} className="flex flex-col items-center gap-1">
                        <div className="w-11 h-11 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
                          {isImg
                            ? <img src={info.icon} alt={info.name} className="w-full h-full object-cover" />
                            : <span className="text-lg">{info.icon}</span>}
                        </div>
                        <span className="text-[8px] text-slate-400 text-center leading-tight">{info.name}</span>
                      </div>
                    );
                  })}
                </div>
                {selectedBoss.rewards.boss_card_drop_rate != null && (
                  <div className="mt-2 flex items-center justify-between text-[10px]">
                    <span className="text-slate-500">Boss Card Drop</span>
                    <span className="text-amber-400 font-bold">{selectedBoss.rewards.boss_card_drop_rate}%</span>
                  </div>
                )}
              </div>
            )}

            {/* Strategy hint */}
            <div className="rounded-xl bg-amber-950/30 border border-amber-500/15 p-3">
              <p className="text-[10px] text-amber-400/80 leading-relaxed">
                {selectedBoss.strategy}
              </p>
              <p className="text-[10px] text-amber-300 mt-1.5 font-display tracking-wide">
                Counter: {selectedBoss.vulnerability_hint}
              </p>
            </div>
          </div>
        </div>

        {/* Bottom spacer for breathing room */}
        <div className="h-4" />
      </div>

      {/* ===== ANIMATIONS ===== */}
      <style>{`
        @keyframes bossGlow {
          0% { box-shadow: 0 0 40px ${rarityColor}33, 0 0 80px ${rarityColor}11, 0 0 120px ${elemColor}08, 0 20px 60px rgba(0,0,0,0.7); }
          100% { box-shadow: 0 0 60px ${rarityColor}55, 0 0 100px ${rarityColor}22, 0 0 160px ${elemColor}15, 0 20px 60px rgba(0,0,0,0.7); }
        }
        @keyframes bossFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes bossBorderPulse {
          0%, 100% { box-shadow: inset 0 0 25px ${rarityColor}44, inset 0 0 50px ${elemColor}11; }
          50% { box-shadow: inset 0 0 35px ${rarityColor}66, inset 0 0 70px ${elemColor}22; }
        }
        @keyframes ctaPulse {
          0%, 100% { box-shadow: 0 0 30px rgba(255,23,68,0.5), 0 0 60px rgba(183,28,28,0.3), 0 8px 32px rgba(0,0,0,0.6); }
          50% { box-shadow: 0 0 45px rgba(255,23,68,0.7), 0 0 90px rgba(183,28,28,0.4), 0 8px 32px rgba(0,0,0,0.6); }
        }
        @keyframes auraPulse {
          0% { opacity: 0.5; transform: scale(1); }
          100% { opacity: 0.9; transform: scale(1.08); }
        }
        @keyframes ambientPulse {
          0% { opacity: 0.6; }
          100% { opacity: 1; }
        }
        @keyframes lightningFlash {
          0%, 90%, 100% { opacity: 0; }
          92%, 94% { opacity: 0.8; }
          93% { opacity: 0.3; }
        }
        @keyframes emberRise {
          0% { transform: translateY(0) translateX(0); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 0.6; }
          100% { transform: translateY(-200px) translateX(var(--drift, 0px)); opacity: 0; }
        }
        @keyframes sparkFlicker {
          0%, 100% { opacity: 0; transform: scale(0.5); }
          50% { opacity: 0.8; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}
