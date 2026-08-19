import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Scroll, Users, Swords, Sparkles, Trophy, Coins, Zap, Gem, Castle, LayoutGrid, Crosshair, Play, PartyPopper } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useGame } from "@/context/GameContext";
import { RARITY, ELEMENT, glow, scrimBottom, vignetteInset } from "@/lib/theme";
import EnergyWidget from "@/components/EnergyWidget";
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

  return (
    <div data-testid="lobby-page">
      {/* ================= CINEMATIC SQUAD LEADER BANNER — full-bleed ================= */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}
        className="relative w-full h-[48vh] sm:h-[56vh] max-h-[560px] overflow-hidden"
        data-testid="leader-hero"
      >
        {leaderTpl ? (
          <img src={leaderTpl.portrait} alt={leaderTpl.name} className="absolute inset-0 w-full h-full object-cover object-top" />
        ) : (
          <div className="absolute inset-0 bg-[#0B0B14]" />
        )}

        {/* elemental aura wash from the top */}
        {leaderTpl && (
          <div className="absolute inset-x-0 top-0 h-32 pointer-events-none" style={{ background: `linear-gradient(to bottom, ${leaderElement.color}55, transparent)` }} />
        )}
        {/* rarity edge glow */}
        {leaderTpl && (
          <div className="absolute inset-0 pointer-events-none" style={{ boxShadow: `inset 0 0 120px ${leaderRarity.color}30` }} />
        )}
        {/* inner vignette so edges recede */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: vignetteInset }} />
        {/* bottom scrim merging into page background */}
        <div className="absolute inset-x-0 bottom-0 h-2/3 pointer-events-none" style={{ background: scrimBottom("0.95") }} />

        {/* player rank — top-right, floating, no box */}
        <div className="absolute top-4 right-4 sm:right-6 z-10 text-right">
          <p className="text-[10px] uppercase tracking-widest text-slate-400">Sensei Rank</p>
          <p className="font-display text-2xl sm:text-3xl text-chakra leading-none" style={{ textShadow: glow("#00E5FF", 1) }} data-testid="stat-level">
            Lv.{user?.level ?? 1}
          </p>
        </div>

        {/* name block — bottom of banner, overlapping the merge scrim */}
        <div className="absolute bottom-0 inset-x-0 z-10 px-5 sm:px-8 pb-5 sm:pb-7">
          <p className="text-xs uppercase tracking-widest text-chakra mb-1.5" style={{ textShadow: "0 0 10px rgba(0,229,255,0.6)" }}>Squad Leader</p>
          <h1 className="font-display tracking-wide text-white leading-none text-4xl sm:text-6xl" style={{ textShadow: "0 4px 20px rgba(0,0,0,0.85)" }}>
            {leaderTpl?.name || "No Leader Set"}
          </h1>
          {leaderTpl ? (
            <>
              <p className="text-sm text-slate-300 italic mt-1">{leaderTpl.title}</p>
              <div className="flex items-center gap-2 mt-2.5 text-xs sm:text-sm font-semibold tracking-wide">
                <span style={{ color: leaderRarity.color, textShadow: `0 0 10px ${leaderRarity.color}` }}>{leaderRarity.name.toUpperCase()}</span>
                <span className="text-slate-500">·</span>
                <span style={{ color: leaderElement.color, textShadow: `0 0 10px ${leaderElement.color}` }}>{leaderTpl.element}</span>
                <span className="text-slate-500">·</span>
                <span className="text-slate-300">Lv.{leader.level}</span>
              </div>
            </>
          ) : (
            <Link to="/team" data-testid="set-leader-link" className="inline-block mt-2 text-sm text-chakra underline">Choose your squad →</Link>
          )}
        </div>
      </motion.div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 -mt-1 pb-8 space-y-5">
        {/* ================= HUD strip — unboxed, glowing readouts ================= */}
        <div className="flex items-center gap-4 sm:gap-8 overflow-x-auto pb-1" data-testid="lobby-hud">
          <HudStat icon={Zap} label="Energy" value={`${user?.energy?.current ?? 0}/${user?.energy?.max ?? 0}`} color="#00E676" testid="stat-energy" />
          <div className="w-px h-9 bg-white/10 shrink-0" />
          <HudStat icon={Coins} label="Ryo" value={user?.ryo ?? 0} color="#FFCA28" testid="stat-ryo" />
          <div className="w-px h-9 bg-white/10 shrink-0" />
          <HudStat icon={Gem} label="Gems" value={user?.gems ?? 0} color="#D500F9" testid="stat-gems" />
          <div className="w-px h-9 bg-white/10 shrink-0" />
          <HudStat icon={Trophy} label="Power" value={user?.team_power ?? 0} color="#FF5722" testid="stat-power" />
        </div>

        {/* ================= Primary action — Continue Mission ================= */}
        {nextStage ? (
          <Link
            to="/campaign"
            data-testid="continue-battle"
            className="block group relative rounded-2xl overflow-hidden p-5 sm:p-6 transition-transform active:scale-[0.99]"
            style={{
              background: "linear-gradient(120deg, rgba(255,87,34,0.16), rgba(11,11,20,0.9) 55%)",
              border: "1px solid rgba(255,87,34,0.35)",
              boxShadow: glow("#FF5722", 1.2),
            }}
          >
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-widest text-fox mb-1" style={{ textShadow: "0 0 8px rgba(255,87,34,0.6)" }}>Next Mission · Ch.{nextStage.chapter}</p>
                <h3 className="font-display text-2xl sm:text-3xl tracking-wide text-white truncate">{nextStage.name}</h3>
                <p className="text-sm text-slate-400 truncate">{nextStage.region}</p>
                <div className="flex items-center gap-1.5 mt-2.5">
                  {nextStage.enemies.slice(0, 4).map((e, i) => (
                    <div key={i} className="w-8 h-8 rounded-full overflow-hidden border-2 shrink-0" style={{ borderColor: RARITY[catalogById[e.template_id]?.rarity || "R"].color }}>
                      <img src={catalogById[e.template_id]?.portrait} alt="" className="w-full h-full object-cover object-top" />
                    </div>
                  ))}
                </div>
              </div>
              <div
                className="shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center bg-fox text-white group-hover:scale-105 transition-transform"
                style={{ boxShadow: glow("#FF5722", 2) }}
                data-testid="continue-battle-button"
              >
                <Play className="w-6 h-6 fill-current" />
              </div>
            </div>
          </Link>
        ) : (
          <div
            className="relative rounded-2xl overflow-hidden p-6 text-center"
            style={{ background: "linear-gradient(120deg, rgba(255,202,40,0.14), rgba(11,11,20,0.9))", border: "1px solid rgba(255,202,40,0.35)", boxShadow: glow("#FFCA28", 1) }}
            data-testid="campaign-complete"
          >
            <PartyPopper className="w-7 h-7 mx-auto mb-2 text-amber-300" />
            <h3 className="font-display text-2xl sm:text-3xl text-amber-300" style={{ textShadow: "0 0 12px rgba(255,202,40,0.6)" }}>ALL MISSIONS CLEARED!</h3>
            <p className="text-sm text-slate-400 mt-1">You are a legend of the shadow realm.</p>
          </div>
        )}

        {/* ================= Quick-access tiles ================= */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {tiles.map((t, i) => {
            const Icon = t.icon;
            return (
              <motion.div key={t.to} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 * i }}>
                <Link
                  to={t.to}
                  data-testid={t.testid}
                  className="block rounded-2xl p-4 sm:p-5 transition-all group active:scale-[0.98] h-full"
                  style={{ background: `linear-gradient(160deg, ${t.color}1c, rgba(11,11,20,0.85))`, border: `1px solid ${t.color}33` }}
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center mb-3 transition-transform group-hover:scale-110"
                    style={{ background: `${t.color}22`, boxShadow: `0 0 14px ${t.color}55` }}
                  >
                    <Icon className="w-5 h-5" style={{ color: t.color }} />
                  </div>
                  <h4 className="font-display text-xl tracking-wide text-white leading-none">{t.label}</h4>
                  <p className="text-[11px] text-slate-400 mt-1 leading-snug">{t.desc}</p>
                </Link>
              </motion.div>
            );
          })}
        </div>

        {/* ================= Energy + Daily Login + Missions ================= */}
        <div className="grid lg:grid-cols-12 gap-4 sm:gap-6">
          <div className="lg:col-span-4 space-y-4">
            <EnergyWidget
              energy={user?.energy}
              onRefresh={refreshProfile}
              gems={user?.gems}
              gemCostPerPoint={gemCosts.energy_refill_per_point}
              gemCostMin={gemCosts.energy_refill_min}
              onGemRefill={handleGemRefill}
            />
            <DailyLoginCard login={user?.login} onClaim={handleClaimLogin} />
          </div>
          <div className="lg:col-span-8">
            <MissionsPanel missions={user?.missions} onClaimed={setUser} />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Unboxed HUD readout — icon + glowing value + micro label, no card background. */
const HudStat = ({ icon: Icon, label, value, color, testid }) => (
  <div className="flex items-center gap-2 shrink-0" data-testid={testid}>
    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: `${color}1a`, boxShadow: `0 0 10px ${color}44` }}>
      <Icon className="w-4 h-4" style={{ color }} />
    </div>
    <div className="leading-none">
      <p className="font-display text-lg text-white leading-none">{value}</p>
      <p className="text-[10px] uppercase tracking-widest text-slate-500">{label}</p>
    </div>
  </div>
);
