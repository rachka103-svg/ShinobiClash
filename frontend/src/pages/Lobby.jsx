import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Scroll, Users, Swords, Sparkles, Trophy, Coins, Zap, ChevronRight, Castle, LayoutGrid, Crosshair } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useGame } from "@/context/GameContext";
import { RARITY, ELEMENT } from "@/lib/styles";
import EnergyWidget from "@/components/EnergyWidget";
import MissionsPanel from "@/components/MissionsPanel";

export default function Lobby() {
  const { user, setUser, refreshProfile } = useAuth();
  const { catalogById, stages } = useGame();

  const teamInstances = (user?.team || [])
    .map((tid) => user.ninjas.find((n) => n.instance_id === tid))
    .filter(Boolean);
  const leader = teamInstances[0];
  const leaderTpl = leader ? catalogById[leader.template_id] : null;
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8" data-testid="lobby-page">
      <div className="grid lg:grid-cols-12 gap-6">
        {/* Leader hero */}
        <motion.div
          initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-5 relative rounded-xl overflow-hidden panel min-h-[420px] flex items-end"
          data-testid="leader-hero"
        >
          {leaderTpl && (
            <img src={leaderTpl.portrait} alt={leaderTpl.name} className="absolute inset-0 w-full h-full object-cover object-top" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#05050A] via-[#05050A]/30 to-transparent" />
          <div className="relative z-10 p-6">
            <p className="text-xs uppercase tracking-widest text-chakra mb-1">Squad Leader</p>
            <h2 className="font-display text-5xl tracking-wide text-white leading-none">{leaderTpl?.name}</h2>
            {leaderTpl && (
              <div className="flex items-center gap-2 mt-3">
                <span className="font-display px-2 rounded text-[#05050A]" style={{ background: RARITY[leaderTpl.rarity].color }}>{leaderTpl.rarity}</span>
                <span className="text-sm px-2 py-0.5 rounded" style={{ background: `${ELEMENT[leaderTpl.element].color}22`, color: ELEMENT[leaderTpl.element].color }}>{leaderTpl.element}</span>
                <span className="text-sm text-slate-300">Lv. {leader.level}</span>
              </div>
            )}
          </div>
        </motion.div>

        {/* Right column */}
        <div className="lg:col-span-7 space-y-6">
          {/* Stats strip */}
          <div className="grid grid-cols-3 gap-3">
            <Stat icon={Trophy} label="Rank Lv." value={user?.level} color="#00E5FF" testid="stat-level" />
            <Stat icon={Coins} label="Ryo" value={user?.ryo} color="#FFCA28" testid="stat-ryo" />
            <Stat icon={Zap} label="Power" value={user?.team_power} color="#FF5722" testid="stat-power" />
          </div>

          {/* Continue campaign */}
          {nextStage ? (
            <Link to="/campaign" data-testid="continue-battle" className="block group relative rounded-xl overflow-hidden panel p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-widest text-fox mb-1">Next Mission · Ch.{nextStage.chapter}</p>
                  <h3 className="font-display text-3xl tracking-wide text-white">{nextStage.name}</h3>
                  <p className="text-sm text-slate-400">{nextStage.region}</p>
                </div>
                <ChevronRight className="w-8 h-8 text-chakra group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          ) : (
            <div className="panel rounded-xl p-6 text-center" data-testid="campaign-complete">
              <h3 className="font-display text-3xl text-chakra">ALL MISSIONS CLEARED!</h3>
              <p className="text-sm text-slate-400">You are a legend of the shadow realm.</p>
            </div>
          )}

          {/* Bento tiles */}
          <div className="grid grid-cols-2 gap-3">
            {tiles.map((t, i) => {
              const Icon = t.icon;
              return (
                <motion.div key={t.to} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i }}>
                  <Link to={t.to} data-testid={t.testid} className="block panel rounded-xl p-5 hover:border-white/20 transition-all group" style={{ borderLeft: `3px solid ${t.color}` }}>
                    <Icon className="w-6 h-6 mb-3 transition-transform group-hover:scale-110" style={{ color: t.color }} />
                    <h4 className="font-display text-2xl tracking-wide text-white">{t.label}</h4>
                    <p className="text-xs text-slate-400">{t.desc}</p>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Energy + Daily Missions */}
      <div className="grid lg:grid-cols-12 gap-6 mt-6">
        <div className="lg:col-span-4">
          <EnergyWidget energy={user?.energy} onRefresh={refreshProfile} />
        </div>
        <div className="lg:col-span-8">
          <MissionsPanel missions={user?.missions} onClaimed={setUser} />
        </div>
      </div>
    </div>
  );
}

const Stat = ({ icon: Icon, label, value, color, testid }) => (
  <div className="panel rounded-xl p-4 flex flex-col items-center" data-testid={testid}>
    <Icon className="w-5 h-5 mb-1" style={{ color }} />
    <span className="font-display text-3xl tracking-wide text-white leading-none">{value ?? 0}</span>
    <span className="text-[11px] uppercase tracking-wide text-slate-500">{label}</span>
  </div>
);
