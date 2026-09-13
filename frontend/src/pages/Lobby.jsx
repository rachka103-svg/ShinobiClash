import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Scroll, Users, Swords, Sparkles, Trophy, Coins, Zap, Gem, Castle, LayoutGrid, Crosshair, Play, PartyPopper, Plus, ChevronRight, Bell } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useGame } from "@/context/GameContext";
import { RARITY, ELEMENT, glow, scrimBottom, vignetteInset, rarityFrame, GOLD } from "@/lib/theme";
import { DecoCorners } from "@/components/RarityFx";
import MissionsPanel from "@/components/MissionsPanel";
import DailyLoginCard from "@/components/DailyLoginCard";
import api, { formatApiErrorDetail } from "@/lib/api";

const ELEMENT_QUOTES = {
  Fire: "Fire is not destruction... it is my rebirth.",
  Water: "Like water, I adapt... I flow, I conquer.",
  Wind: "The wind cuts unseen... so do I.",
  Earth: "Mountains crumble... I remain.",
  Lightning: "Faster than the eye... striking before the thought.",
  Nature: "Life and death bloom from the same root.",
  Light: "Even in darkness, my will illuminates.",
  Dark: "Shadows are not absence... they are my domain.",
};

export default function Lobby() {
  const { user, setUser, refreshProfile } = useAuth();
  const { catalogById, stages, gemCosts } = useGame();

  const teamInstances = (user?.team || [])
    .map((tid) => user.ninjas.find((n) => n.instance_id === tid))
    .filter(Boolean);
  const leader = teamInstances[0];
  const leaderTpl = leader ? catalogById[leader.template_id] : null;
  const leaderRarityKey = leader?.rarity || leader?.evolved_rarity || leaderTpl?.rarity || "R";
  const leaderRarity = RARITY[leaderRarityKey] || RARITY.R;
  const leaderElement = leaderTpl ? ELEMENT[leaderTpl.element] || {} : {};
  const clearedCount = user?.cleared_stages?.length || 0;
  const nextStage = stages.find((s) => !user?.cleared_stages?.includes(s.id));

  const tiles = [
    { to: "/campaign", label: "Campaign", desc: `${clearedCount}/${stages.length} cleared`, icon: Scroll, color: "#FF5722", testid: "tile-campaign" },
    { to: "/spire", label: "Spire", desc: `Floor ${user?.spire_floor || 0}`, icon: Castle, color: "#D500F9", testid: "tile-spire" },
    { to: "/arena", label: "Arena", desc: `Rating ${user?.arena?.rating ?? 1000}`, icon: Crosshair, color: "#FF1744", testid: "tile-arena" },
    { to: "/team", label: "Squad", desc: "Arrange team", icon: Swords, color: "#00E5FF", testid: "tile-team" },
    { to: "/roster", label: "Roster", desc: `${user?.ninjas?.length || 0} shinobi`, icon: Users, color: "#A740E5", testid: "tile-roster" },
    { to: "/gallery", label: "Gallery", desc: "All heroes", icon: LayoutGrid, color: "#00E676", testid: "tile-gallery" },
    { to: "/summon", label: "Summon", desc: "Recruit shinobi", icon: Sparkles, color: "#FFCA28", testid: "tile-summon" },
  ];

  const handleGemRefill = async () => {
    try {
      const { data } = await api.post("/game/energy/refill");
      setUser(data.profile);
      toast.success(`Energy refilled for ${data.cost} Gems!`);
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    }
  };

  const handleClaimLogin = async () => {
    try {
      const { data } = await api.post("/game/login/claim");
      setUser(data.profile);
      const parts = [];
      if (data.reward.ryo) parts.push(`+${data.reward.ryo} Ryo`);
      if (data.reward.gems) parts.push(`+${data.reward.gems} Gems`);
      toast.success(`Day ${data.day} reward claimed! ${parts.join(" · ")}`);
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    }
  };

  const leaderFrame = leaderTpl ? rarityFrame(leaderRarityKey) : null;
  const leaderQuote = leaderTpl ? (ELEMENT_QUOTES[leaderTpl.element] || "A true shinobi walks the path without hesitation.") : "";

  return (
    <div
      data-testid="lobby-page"
      className="min-h-full px-3 sm:px-5 lg:px-6 py-3 grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-4 lg:h-full"
    >
      {/* ================= LEFT — cinematic squad leader ================= */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}
        className="lg:col-span-5 relative rounded-2xl overflow-hidden h-[36dvh] lg:h-full min-h-0"
        style={leaderFrame ? { border: `${leaderFrame.strokeWidth}px solid ${leaderFrame.useGold ? GOLD.stroke : leaderRarity.color + "55"}`, boxShadow: `0 0 50px ${(leaderFrame.useGold ? GOLD.base : leaderRarity.color)}22` } : { border: "1px solid rgba(255,255,255,0.08)" }}
        data-testid="leader-hero"
      >
        {leaderTpl ? (
          <img src={leaderTpl.portrait} alt={leaderTpl.name} className="absolute inset-0 w-full h-full object-cover object-top" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900" />
        )}
        {/* Element tint at top */}
        {leaderTpl && <div className="absolute inset-x-0 top-0 h-28 pointer-events-none" style={{ background: `linear-gradient(to bottom, ${leaderElement.color}55, transparent)` }} />}
        <div className="absolute inset-0 pointer-events-none" style={{ background: vignetteInset }} />
        {/* Bottom scrim for text */}
        <div className="absolute inset-x-0 bottom-0 h-2/3 pointer-events-none" style={{ background: scrimBottom("0.97") }} />
        {leaderFrame?.useGold && <div className="gold-pinstripe absolute top-0 inset-x-0 z-10" />}
        {leaderFrame && leaderFrame.cornerLevel >= 2 && <DecoCorners rarity={leaderRarityKey} size={22} />}

        {/* Level badge top-right */}
        <div className="absolute top-3 right-3 z-10 text-right rounded-lg px-2.5 py-1.5 bg-black/55 backdrop-blur-sm">
          <p className="text-[10px] uppercase tracking-widest text-slate-400">Sensei</p>
          <p className="font-display text-2xl lg:text-3xl text-chakra leading-none" style={{ textShadow: glow("#E5A540", 1) }} data-testid="stat-level">Lv.{user?.level ?? 1}</p>
        </div>

        {/* Character info bottom */}
        <div className="absolute bottom-0 inset-x-0 z-10 px-4 lg:px-6 pb-4 lg:pb-6">
          <p className="text-[11px] uppercase tracking-widest text-chakra mb-1" style={{ textShadow: "0 0 10px rgba(229,165,64,0.6)" }}>Squad Leader</p>
          <h1 className="font-display tracking-wide text-white leading-none text-3xl lg:text-5xl" style={{ textShadow: "0 4px 20px rgba(0,0,0,0.85)" }}>
            {leaderTpl?.name || "No Leader Set"}
          </h1>
          {leaderTpl ? (
            <>
              <div className="flex items-center gap-2 mt-2 text-xs lg:text-sm font-semibold tracking-wide flex-wrap">
                <span style={{ color: leaderRarity.color, textShadow: `0 0 10px ${leaderRarity.color}` }}>{leaderRarity.name.toUpperCase()}</span>
                <span className="text-slate-400">·</span>
                <span style={{ color: leaderElement.color, textShadow: `0 0 10px ${leaderElement.color}` }}>{leaderTpl.element}</span>
                <span className="text-slate-400">·</span>
                <span className="text-slate-200">Lv.{leader.level}</span>
              </div>
              {/* Quote */}
              <p className="mt-3 text-sm lg:text-base text-white/60 italic leading-snug max-w-sm" style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 300 }}>
                "{leaderQuote}"
              </p>
            </>
          ) : (
            <Link to="/team" data-testid="set-leader-link" className="inline-block mt-2 text-sm text-chakra underline">Choose your squad →</Link>
          )}
          {/* Footer tag */}
          <p className="mt-3 text-[10px] uppercase tracking-[0.2em] text-white/25 hidden lg:block">A New Generation of Ninja RPG</p>
        </div>
      </motion.div>

      {/* ================= RIGHT — dashboard ================= */}
      <div className="lg:col-span-7 flex flex-col gap-3 lg:h-full min-h-0">
        {/* Continue Mission */}
        {nextStage ? (
          <Link
            to="/campaign"
            data-testid="continue-battle"
            className="block group relative rounded-2xl overflow-hidden p-4 lg:p-5 transition-transform active:scale-[0.99] shrink-0"
            style={{ background: "linear-gradient(120deg, rgba(255,87,34,0.16), rgba(11,11,20,0.94) 55%), #0B0B14", border: "1px solid rgba(255,87,34,0.35)", boxShadow: glow("#FF5722", 1) }}
          >
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] uppercase tracking-widest text-fox mb-0.5" style={{ textShadow: "0 0 8px rgba(255,87,34,0.6)" }}>Next Mission · Ch.{nextStage.chapter}</p>
                <h3 className="font-display text-xl lg:text-2xl tracking-wide text-white truncate">{nextStage.name}</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Skirmish {nextStage.id}</p>
                <div className="flex items-center gap-1.5 mt-2">
                  {nextStage.enemies.slice(0, 4).map((e, i) => (
                    <div key={i} className="w-8 h-8 rounded-full overflow-hidden border-2 shrink-0" style={{ borderColor: RARITY[catalogById[e.template_id]?.rarity || "R"].color }}>
                      <img src={catalogById[e.template_id]?.portrait} alt="" className="w-full h-full object-cover object-top" />
                    </div>
                  ))}
                </div>
              </div>
              {/* Enter Battle button */}
              <div className="shrink-0 flex flex-col items-center gap-1">
                <div
                  className="w-14 h-14 lg:w-16 lg:h-16 rounded-full flex items-center justify-center bg-fox text-white group-hover:scale-105 transition-transform"
                  style={{ boxShadow: glow("#FF5722", 2) }}
                  data-testid="continue-battle-button"
                >
                  <ChevronRight className="w-6 h-6 fill-current" />
                </div>
                <span className="text-[10px] font-display tracking-wide text-fox uppercase">Enter Battle</span>
              </div>
            </div>
          </Link>
        ) : (
          <div className="relative rounded-2xl overflow-hidden p-4 text-center shrink-0" style={{ background: "linear-gradient(120deg, rgba(255,202,40,0.14), rgba(11,11,20,0.94)), #0B0B14", border: "1px solid rgba(255,202,40,0.35)", boxShadow: glow("#FFCA28", 1) }} data-testid="campaign-complete">
            <PartyPopper className="w-6 h-6 mx-auto mb-1 text-amber-300" />
            <h3 className="font-display text-xl lg:text-2xl text-amber-300" style={{ textShadow: "0 0 12px rgba(255,202,40,0.6)" }}>ALL MISSIONS CLEARED!</h3>
          </div>
        )}

        {/* Quick-access tiles — 7 cards in a row */}
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 lg:gap-2.5 shrink-0" data-testid="lobby-tiles">
          {tiles.map((t, i) => {
            const Icon = t.icon;
            return (
              <motion.div key={t.to} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.03 * i }}>
                <Link
                  to={t.to}
                  data-testid={t.testid}
                  className="group flex flex-col items-center text-center gap-1.5 rounded-xl p-2.5 lg:p-3 transition-all active:scale-[0.97] hover:-translate-y-0.5 h-full"
                  style={{ background: `linear-gradient(160deg, ${t.color}1c, rgba(11,11,20,0.92)), #0B0B14`, border: `1px solid ${t.color}33` }}
                >
                  <div className="w-9 h-9 lg:w-10 lg:h-10 rounded-full flex items-center justify-center transition-transform group-hover:scale-110" style={{ background: `${t.color}22`, boxShadow: `0 0 12px ${t.color}55` }}>
                    <Icon className="w-5 h-5" style={{ color: t.color }} />
                  </div>
                  <h4 className="font-display text-[11px] lg:text-xs tracking-wide text-white leading-none">{t.label}</h4>
                </Link>
              </motion.div>
            );
          })}
        </div>

        {/* Daily login + Missions (fills remaining height; internal scroll) */}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 flex-1 min-h-0">
          <div className="sm:col-span-2 min-h-0 overflow-y-auto scrollbar-none">
            <DailyLoginCard login={user?.login} onClaim={handleClaimLogin} />
          </div>
          <div className="sm:col-span-3 min-h-0 overflow-y-auto scrollbar-none">
            <MissionsPanel missions={user?.missions} onClaimed={setUser} />
          </div>
        </div>
      </div>
    </div>
  );
}
