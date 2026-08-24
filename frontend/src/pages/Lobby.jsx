import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Scroll, Users, Swords, Sparkles, Trophy, Coins, Zap, Gem, Castle, LayoutGrid, Crosshair, Play, PartyPopper, Plus } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useGame } from "@/context/GameContext";
import { RARITY, ELEMENT, glow, scrimBottom, vignetteInset, rarityFrame, GOLD } from "@/lib/theme";
import { DecoCorners } from "@/components/RarityFx";
import MissionsPanel from "@/components/MissionsPanel";
import DailyLoginCard from "@/components/DailyLoginCard";
import api, { formatApiErrorDetail } from "@/lib/api";

export default function Lobby() {
  const { user, setUser, refreshProfile } = useAuth();
  const { catalogById, stages, gemCosts } = useGame();

  const teamInstances = (user?.team || [])
    .map((tid) => user.ninjas.find((n) => n.instance_id === tid))
    .filter(Boolean);
  const leader = teamInstances[0];
  const leaderTpl = leader ? catalogById[leader.template_id] : null;
  const leaderRarity = leaderTpl ? RARITY[leaderTpl.rarity] || RARITY.R : null;
  const leaderElement = leaderTpl ? ELEMENT[leaderTpl.element] || {} : {};
  const clearedCount = user?.cleared_stages?.length || 0;
  const nextStage = stages.find((s) => !user?.cleared_stages?.includes(s.id));

  const tiles = [
    { to: "/campaign", label: "Campaign", desc: `${clearedCount}/${stages.length} stages cleared`, icon: Scroll, color: "#FF5722", testid: "tile-campaign" },
    { to: "/spire", label: "Spire", desc: `Floor ${user?.spire_floor || 0} reached`, icon: Castle, color: "#D500F9", testid: "tile-spire" },
    { to: "/arena", label: "Arena", desc: `Rating ${user?.arena?.rating ?? 1000} · ${user?.arena?.wins ?? 0}W-${user?.arena?.losses ?? 0}L`, icon: Crosshair, color: "#FF1744", testid: "tile-arena" },
    { to: "/team", label: "Squad", desc: "Arrange your battle team", icon: Swords, color: "#00E5FF", testid: "tile-team" },
    { to: "/roster", label: "Roster", desc: `${user?.ninjas?.length || 0} ninja collected`, icon: Users, color: "#D500F9", testid: "tile-roster" },
    { to: "/gallery", label: "Gallery", desc: "View all heroes", icon: LayoutGrid, color: "#00E676", testid: "tile-gallery" },
    { to: "/summon", label: "Summon", desc: "Recruit new shinobi", icon: Sparkles, color: "#FFCA28", testid: "tile-summon" },
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

  const leaderFrame = leaderTpl ? rarityFrame(leaderTpl.rarity) : null;

  return (
    <div
      data-testid="lobby-page"
      className="max-w-7xl mx-auto px-3 sm:px-6 py-3 lg:h-full lg:overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-4"
    >
      {/* ================= LEFT — cinematic squad leader ================= */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}
        className="lg:col-span-4 relative rounded-2xl overflow-hidden h-[38vh] lg:h-full min-h-0"
        style={leaderFrame ? { border: `${leaderFrame.strokeWidth}px solid ${leaderFrame.useGold ? GOLD.stroke : leaderRarity.color + "55"}`, boxShadow: `0 0 50px ${(leaderFrame.useGold ? GOLD.base : leaderRarity.color)}22` } : { border: "1px solid rgba(255,255,255,0.08)" }}
        data-testid="leader-hero"
      >
        {leaderTpl ? (
          <img src={leaderTpl.portrait} alt={leaderTpl.name} className="absolute inset-0 w-full h-full object-cover object-top" />
        ) : (
          <div className="absolute inset-0 bg-[#FFFFFF]" />
        )}
        {leaderTpl && <div className="absolute inset-x-0 top-0 h-28 pointer-events-none" style={{ background: `linear-gradient(to bottom, ${leaderElement.color}55, transparent)` }} />}
        <div className="absolute inset-0 pointer-events-none" style={{ background: vignetteInset }} />
        <div className="absolute inset-x-0 bottom-0 h-2/3 pointer-events-none" style={{ background: scrimBottom("0.96") }} />
        {leaderFrame?.useGold && <div className="gold-pinstripe absolute top-0 inset-x-0 z-10" />}
        {leaderFrame && leaderFrame.cornerLevel >= 2 && <DecoCorners rarity={leaderTpl.rarity} size={22} />}

        <div className="absolute top-3 right-3 z-10 text-right">
          <p className="text-[10px] uppercase tracking-widest text-slate-500">Sensei Rank</p>
          <p className="font-display text-2xl lg:text-3xl text-chakra leading-none" style={{ textShadow: glow("#00E5FF", 1) }} data-testid="stat-level">Lv.{user?.level ?? 1}</p>
        </div>

        <div className="absolute bottom-0 inset-x-0 z-10 px-4 lg:px-5 pb-4 lg:pb-5">
          <p className="text-[11px] uppercase tracking-widest text-chakra mb-1" style={{ textShadow: "0 0 10px rgba(0,229,255,0.6)" }}>Squad Leader</p>
          <h1 className="font-display tracking-wide text-white leading-none text-3xl lg:text-5xl" style={{ textShadow: "0 4px 20px rgba(0,0,0,0.85)" }}>
            {leaderTpl?.name || "No Leader Set"}
          </h1>
          {leaderTpl ? (
            <div className="flex items-center gap-2 mt-2 text-xs lg:text-sm font-semibold tracking-wide flex-wrap">
              <span style={{ color: leaderRarity.color, textShadow: `0 0 10px ${leaderRarity.color}` }}>{leaderRarity.name.toUpperCase()}</span>
              <span className="text-slate-400">·</span>
              <span style={{ color: leaderElement.color, textShadow: `0 0 10px ${leaderElement.color}` }}>{leaderTpl.element}</span>
              <span className="text-slate-400">·</span>
              <span className="text-slate-200">Lv.{leader.level}</span>
            </div>
          ) : (
            <Link to="/team" data-testid="set-leader-link" className="inline-block mt-2 text-sm text-chakra underline">Choose your squad →</Link>
          )}
        </div>
      </motion.div>

      {/* ================= RIGHT — dashboard ================= */}
      <div className="lg:col-span-8 flex flex-col gap-3 lg:h-full min-h-0">
        {/* HUD strip */}
        <div className="flex items-center gap-3 sm:gap-5 overflow-x-auto scrollbar-none glass-panel px-4 py-2.5 shrink-0" data-testid="lobby-hud">
          <HudStat icon={Zap} label="Energy" value={`${user?.energy?.current ?? 0}/${user?.energy?.max ?? 0}`} color="#00E676" testid="stat-energy" action={handleGemRefill} actionTitle="Refill energy with Gems" />
          <div className="w-px h-8 bg-black/[0.06] shrink-0" />
          <HudStat icon={Coins} label="Ryo" value={user?.ryo ?? 0} color="#FFCA28" testid="stat-ryo" />
          <div className="w-px h-8 bg-black/[0.06] shrink-0" />
          <HudStat icon={Gem} label="Gems" value={user?.gems ?? 0} color="#D500F9" testid="stat-gems" />
          <div className="w-px h-8 bg-black/[0.06] shrink-0" />
          <HudStat icon={Trophy} label="Power" value={user?.team_power ?? 0} color="#FF5722" testid="stat-power" />
        </div>

        {/* Continue Mission */}
        {nextStage ? (
          <Link
            to="/campaign"
            data-testid="continue-battle"
            className="block group relative rounded-2xl overflow-hidden p-4 transition-transform active:scale-[0.99] shrink-0"
            style={{ background: "linear-gradient(120deg, rgba(255,87,34,0.16), rgba(11,11,20,0.9) 55%)", border: "1px solid rgba(255,87,34,0.35)", boxShadow: glow("#FF5722", 1) }}
          >
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-widest text-fox mb-0.5" style={{ textShadow: "0 0 8px rgba(255,87,34,0.6)" }}>Next Mission · Ch.{nextStage.chapter}</p>
                <h3 className="font-display text-xl lg:text-2xl tracking-wide text-white truncate">{nextStage.name}</h3>
                <div className="flex items-center gap-1.5 mt-2">
                  {nextStage.enemies.slice(0, 4).map((e, i) => (
                    <div key={i} className="w-7 h-7 rounded-full overflow-hidden border-2 shrink-0" style={{ borderColor: RARITY[catalogById[e.template_id]?.rarity || "R"].color }}>
                      <img src={catalogById[e.template_id]?.portrait} alt="" className="w-full h-full object-cover object-top" />
                    </div>
                  ))}
                </div>
              </div>
              <div className="shrink-0 w-12 h-12 lg:w-14 lg:h-14 rounded-full flex items-center justify-center bg-fox text-ink group-hover:scale-105 transition-transform" style={{ boxShadow: glow("#FF5722", 2) }} data-testid="continue-battle-button">
                <Play className="w-5 h-5 fill-current" />
              </div>
            </div>
          </Link>
        ) : (
          <div className="relative rounded-2xl overflow-hidden p-4 text-center shrink-0" style={{ background: "linear-gradient(120deg, rgba(255,202,40,0.14), rgba(11,11,20,0.9))", border: "1px solid rgba(255,202,40,0.35)", boxShadow: glow("#FFCA28", 1) }} data-testid="campaign-complete">
            <PartyPopper className="w-6 h-6 mx-auto mb-1 text-amber-300" />
            <h3 className="font-display text-xl lg:text-2xl text-amber-300" style={{ textShadow: "0 0 12px rgba(255,202,40,0.6)" }}>ALL MISSIONS CLEARED!</h3>
          </div>
        )}

        {/* Quick-access tiles */}
        <div className="grid grid-cols-4 gap-2.5 shrink-0" data-testid="lobby-tiles">
          {tiles.map((t, i) => {
            const Icon = t.icon;
            return (
              <motion.div key={t.to} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.03 * i }}>
                <Link
                  to={t.to}
                  data-testid={t.testid}
                  className="flex flex-col items-center text-center gap-1.5 rounded-xl p-2.5 transition-all group active:scale-[0.97] h-full"
                  style={{ background: `linear-gradient(160deg, ${t.color}1c, rgba(11,11,20,0.85))`, border: `1px solid ${t.color}33` }}
                >
                  <div className="w-9 h-9 rounded-full flex items-center justify-center transition-transform group-hover:scale-110" style={{ background: `${t.color}22`, boxShadow: `0 0 12px ${t.color}55` }}>
                    <Icon className="w-5 h-5" style={{ color: t.color }} />
                  </div>
                  <h4 className="font-display text-base tracking-wide text-white leading-none">{t.label}</h4>
                </Link>
              </motion.div>
            );
          })}
        </div>

        {/* Daily login + Missions (fills remaining height; internal scroll) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1 min-h-0">
          <div className="sm:col-span-1 min-h-0 overflow-y-auto scrollbar-none">
            <DailyLoginCard login={user?.login} onClaim={handleClaimLogin} />
          </div>
          <div className="sm:col-span-2 min-h-0 overflow-y-auto scrollbar-none">
            <MissionsPanel missions={user?.missions} onClaimed={setUser} />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Unboxed HUD readout — icon + glowing value + micro label, with optional action. */
const HudStat = ({ icon: Icon, label, value, color, testid, action, actionTitle }) => (
  <div className="flex items-center gap-2 shrink-0" data-testid={testid}>
    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: `${color}1a`, boxShadow: `0 0 10px ${color}44` }}>
      <Icon className="w-4 h-4" style={{ color }} />
    </div>
    <div className="leading-none">
      <p className="font-display text-lg text-ink leading-none">{value}</p>
      <p className="text-[10px] uppercase tracking-widest text-slate-500">{label}</p>
    </div>
    {action && (
      <button onClick={action} title={actionTitle} data-testid={`${testid}-action`} className="ml-0.5 w-5 h-5 rounded-md bg-black/[0.04] border border-black/10 flex items-center justify-center text-slate-600 hover:bg-black/10 transition-colors">
        <Plus className="w-3 h-3" />
      </button>
    )}
  </div>
);
