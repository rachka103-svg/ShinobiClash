import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Swords, Zap, Scroll, Castle, Crosshair, Users,
  Sparkles, LayoutGrid, Play, Plus, PartyPopper,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useGame } from "@/context/GameContext";
import { ELEMENT } from "@/lib/theme";
import MissionsPanel from "@/components/MissionsPanel";
import DailyLoginCard from "@/components/DailyLoginCard";
import api, { formatApiErrorDetail } from "@/lib/api";

// Controlled accent system — each concern owns one color.
const ACCENT = {
  cyan: "#00E5FF",
  purple: "#9d4eff",
  orange: "#FF6A1A",
  red: "#FF1744",
  gold: "#FFCA28",
  green: "#00E676",
};

export default function Lobby() {
  const { user, setUser } = useAuth();
  const { catalogById, stages } = useGame();

  const teamInstances = (user?.team || [])
    .map((tid) => user.ninjas?.find((n) => n.instance_id === tid))
    .filter(Boolean);
  const hasSquad = teamInstances.length > 0;
  const squadElements = [...new Set(teamInstances.map((n) => catalogById[n.template_id]?.element).filter(Boolean))];
  const clearedCount = user?.cleared_stages?.length || 0;
  const nextStage = stages.find((s) => !user?.cleared_stages?.includes(s.id));
  const recPower = nextStage
    ? nextStage.enemies.reduce((s, e) => s + e.level * 180, 0)
    : 0;
  const power = user?.team_power ?? 0;
  const powerOk = power >= recPower;

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
    <div
      data-testid="lobby-page"
      className="relative max-w-7xl mx-auto px-4 sm:px-6 py-5 lg:py-6 space-y-5"
    >
      {/* ===== CSS-only atmospheric background (no images) ===== */}
      <div className="fixed inset-0 -z-10 pointer-events-none" style={{ background: "#070810" }} />
      <div
        className="fixed inset-0 -z-10 pointer-events-none"
        style={{
          background:
            "radial-gradient(120% 80% at 18% 12%, rgba(125,38,205,0.16), transparent 55%), radial-gradient(100% 70% at 85% 8%, rgba(0,229,255,0.07), transparent 50%), radial-gradient(120% 90% at 50% 110%, rgba(255,87,34,0.06), transparent 55%)",
        }}
      />
      <div className="fixed inset-0 -z-10 pointer-events-none cmd-grid opacity-70" />

      {/* ===== Page Header ===== */}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl sm:text-5xl tracking-wide leading-none text-white">
            SHINOBI CLASH
          </h1>
          <p className="font-display text-xl sm:text-2xl tracking-[0.3em] leading-none mt-1" style={{ color: ACCENT.cyan }}>
            COMMAND CENTER
          </p>
          <p className="text-sm text-slate-400 mt-2">Prepare your squad. Choose your next challenge.</p>
        </div>
        <div
          className="flex items-center gap-3 rounded-xl px-4 py-2.5 shrink-0"
          style={{ background: "rgba(255,87,34,0.08)", border: "1px solid rgba(255,87,34,0.3)", boxShadow: "0 0 18px rgba(255,87,34,0.12)" }}
          data-testid="stat-power"
        >
          <Swords className="w-6 h-6" style={{ color: ACCENT.orange }} />
          <div className="leading-none">
            <p className="font-display text-3xl text-white tabular-nums">{power.toLocaleString()}</p>
            <p className="text-[10px] uppercase tracking-widest text-slate-400 mt-0.5">Power</p>
          </div>
        </div>
      </header>

      {/* ===== Main Command Area — 35% / 65% ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* LEFT — Battle Status Panel */}
        <div className="lg:col-span-4">
          <BattleStatusPanel
            hasSquad={hasSquad}
            power={power}
            elements={squadElements}
            energy={user?.energy}
            onRefill={handleGemRefill}
          />
        </div>

        {/* RIGHT — Current Mission */}
        <div className="lg:col-span-8">
          {nextStage ? (
            <MissionPanel stage={nextStage} catalogById={catalogById} recPower={recPower} powerOk={powerOk} />
          ) : (
            <div
              className="relative h-full min-h-[260px] rounded-2xl overflow-hidden flex flex-col items-center justify-center text-center p-6"
              style={{ background: "linear-gradient(135deg, rgba(255,202,40,0.10), rgba(7,8,16,0.96))", border: "1px solid rgba(255,202,40,0.35)", boxShadow: "0 0 26px rgba(255,202,40,0.14)" }}
              data-testid="campaign-complete"
            >
              <PartyPopper className="w-8 h-8 mb-2" style={{ color: ACCENT.gold }} />
              <h3 className="font-display text-3xl tracking-wide" style={{ color: ACCENT.gold, textShadow: "0 0 14px rgba(255,202,40,0.5)" }}>ALL MISSIONS CLEARED</h3>
              <p className="text-slate-400 text-sm mt-1">You have conquered every stage. New chapters await.</p>
            </div>
          )}
        </div>
      </div>

      {/* ===== Game Modes ===== */}
      <section>
        <SectionTitle label="GAME MODES" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3" data-testid="lobby-tiles">
          <ModeCard to="/campaign" icon={Scroll} title="CAMPAIGN" subtitle="Story Mode" color={ACCENT.orange} testid="tile-campaign" />
          <ModeCard to="/spire" icon={Castle} title="SPIRE" subtitle="Climb Up" color={ACCENT.purple} testid="tile-spire" />
          <ModeCard to="/arena" icon={Crosshair} title="ARENA" subtitle="PvP Battles" color={ACCENT.red} testid="tile-arena" />
          <ModeCard to="/team" icon={Swords} title="SQUAD" subtitle="Manage Team" color={ACCENT.cyan} testid="tile-team" />
        </div>
      </section>

      {/* ===== Secondary Actions ===== */}
      <div className="grid grid-cols-3 gap-3">
        <ModeCard to="/roster" icon={Users} title="ROSTER" subtitle="Your Heroes" color={ACCENT.cyan} testid="tile-roster" compact />
        <ModeCard to="/summon" icon={Sparkles} title="SUMMON" subtitle="Recruit Shinobi" color={ACCENT.gold} testid="tile-summon" compact />
        <ModeCard to="/gallery" icon={LayoutGrid} title="GALLERY" subtitle="All Heroes" color={ACCENT.green} testid="tile-gallery" compact />
      </div>

      {/* ===== Today's Progress ===== */}
      <section>
        <SectionTitle label="TODAY'S PROGRESS" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-1">
            <DailyLoginCard login={user?.login} onClaim={handleClaimLogin} />
          </div>
          <div className="sm:col-span-2">
            <MissionsPanel missions={user?.missions} onClaimed={setUser} />
          </div>
        </div>
      </section>

      {/* campaign progress hint */}
      <p className="text-center text-xs text-slate-500 pt-1">
        Campaign progress · {clearedCount}/{stages.length} stages cleared
      </p>
    </div>
  );
}

/* ---------- Section title ---------- */
const SectionTitle = ({ label }) => (
  <div className="flex items-center gap-3 mb-3">
    <span className="font-display text-lg tracking-[0.25em] text-white">{label}</span>
    <span className="flex-1 h-px bg-gradient-to-r from-white/15 to-transparent" />
  </div>
);

/* ---------- Battle Status Panel (left, CSS-only) ---------- */
const BattleStatusPanel = ({ hasSquad, power, elements, energy, onRefill }) => {
  const particles = [
    { left: "18%", bottom: "20%", dur: "6s", delay: "0s", color: ACCENT.purple },
    { left: "70%", bottom: "30%", dur: "8s", delay: "1.5s", color: ACCENT.cyan },
    { left: "40%", bottom: "60%", dur: "7s", delay: "0.8s", color: ACCENT.purple },
    { left: "82%", bottom: "55%", dur: "9s", delay: "2.2s", color: ACCENT.cyan },
    { left: "28%", bottom: "75%", dur: "7.5s", delay: "3s", color: ACCENT.purple },
  ];
  return (
    <div
      className="relative h-full min-h-[300px] rounded-2xl overflow-hidden flex flex-col items-center justify-center p-6 text-center"
      style={{
        background: "linear-gradient(160deg, rgba(125,38,205,0.18), rgba(7,8,16,0.96) 70%)",
        border: "1px solid rgba(157,78,255,0.28)",
        boxShadow: "0 0 30px rgba(125,38,205,0.14), inset 0 0 40px rgba(125,38,205,0.06)",
      }}
      data-testid="leader-hero"
    >
      {/* decorative layers */}
      <div className="absolute inset-0 cmd-diag opacity-60" />
      <div className="absolute inset-0" style={{ background: "radial-gradient(70% 60% at 50% 45%, rgba(157,78,255,0.22), transparent 70%)" }} />
      {/* abstract energy rings */}
      <div className="absolute cmd-ring" style={{ top: "50%", left: "50%", width: 220, height: 220, marginLeft: -110, marginTop: -110, borderRadius: "9999px", border: "1px solid rgba(157,78,255,0.18)", "--ring-dur": "28s" }} />
      <div className="absolute cmd-ring-rev" style={{ top: "50%", left: "50%", width: 160, height: 160, marginLeft: -80, marginTop: -80, borderRadius: "9999px", border: "1px dashed rgba(0,229,255,0.16)", "--ring-dur": "22s" }} />
      <div className="absolute cmd-ring" style={{ top: "50%", left: "50%", width: 104, height: 104, marginLeft: -52, marginTop: -52, borderRadius: "9999px", border: "1px solid rgba(157,78,255,0.14)", "--ring-dur": "18s" }} />
      {/* floating particles */}
      {particles.map((p, i) => (
        <span key={i} className="cmd-particle" style={{ left: p.left, bottom: p.bottom, "--p-dur": p.dur, "--p-delay": p.delay, "--p-color": p.color }} />
      ))}

      <div className="relative z-10">
        <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400 mb-3">Squad Status</p>
        <div
          className="w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4"
          style={{ background: "rgba(125,38,205,0.16)", border: "1px solid rgba(157,78,255,0.4)", boxShadow: "0 0 26px rgba(157,78,255,0.3), inset 0 0 18px rgba(157,78,255,0.18)" }}
        >
          <Swords className="w-9 h-9" style={{ color: ACCENT.purple }} />
        </div>
        <h2 className="font-display text-4xl tracking-wide text-white leading-none">
          {hasSquad ? "BATTLE READY" : "NO SQUAD"}
        </h2>
        <p className="text-[11px] uppercase tracking-widest text-slate-400 mt-4">Squad Power</p>
        <p className="font-display text-3xl text-white tabular-nums leading-none mt-0.5">{power.toLocaleString()}</p>

        {/* element dots */}
        <div className="flex items-center justify-center gap-3 mt-4 flex-wrap min-h-[20px]">
          {hasSquad ? (
            squadDots(elements)
          ) : (
            <Link to="/team" className="text-xs text-cyan-400 underline">Choose your squad →</Link>
          )}
        </div>

        {/* energy refill (preserves gem-refill action) */}
        {energy && (
          <div className="flex items-center justify-center gap-2 mt-5">
            <span className="flex items-center gap-1.5 text-xs text-slate-400">
              <Zap className="w-3.5 h-3.5" style={{ color: ACCENT.green }} />
              {energy.current}/{energy.max} Energy
            </span>
            <button
              onClick={onRefill}
              title="Refill energy with Gems"
              data-testid="stat-energy-action"
              className="w-6 h-6 rounded-md flex items-center justify-center transition-colors"
              style={{ background: "rgba(0,229,255,0.1)", border: "1px solid rgba(0,229,255,0.3)", color: ACCENT.cyan }}
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const squadDots = (elements) =>
  (elements.length ? elements : ["Fire", "Water", "Lightning"]).slice(0, 4).map((el) => {
    const c = (ELEMENT[el] || {}).color || "#9E9E9E";
    return (
      <span key={el} className="flex items-center gap-1.5 text-xs text-slate-300">
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: c, boxShadow: `0 0 8px ${c}` }} />
        {el}
      </span>
    );
  });

/* ---------- Current Mission (right, dominant CTA) ---------- */
const MissionPanel = ({ stage, catalogById, recPower, powerOk }) => {
  const enemies = stage.enemies.slice(0, 4);
  return (
    <Link
      to="/campaign"
      data-testid="continue-battle"
      className="group relative block h-full min-h-[260px] rounded-2xl overflow-hidden p-5 sm:p-6 transition-transform active:scale-[0.99]"
      style={{
        background: "linear-gradient(135deg, rgba(255,87,34,0.14), rgba(7,8,16,0.95) 60%)",
        border: "1px solid rgba(255,87,34,0.38)",
        boxShadow: "0 0 30px rgba(255,87,34,0.16), inset 0 0 40px rgba(255,87,34,0.05)",
      }}
    >
      {/* geometric background pattern */}
      <div className="absolute inset-0 cmd-diag-orange opacity-70" />
      <div className="absolute inset-0" style={{ background: "radial-gradient(80% 70% at 80% 50%, rgba(255,87,34,0.16), transparent 70%)" }} />

      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-5 h-full">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.25em] mb-1.5" style={{ color: ACCENT.orange, textShadow: "0 0 8px rgba(255,87,34,0.5)" }}>
            Next Mission · Chapter {stage.chapter}
          </p>
          <h3 className="font-display text-3xl sm:text-4xl tracking-wide text-white leading-none truncate">
            {stage.name}
          </h3>
          <p className="text-xs text-slate-400 mt-1">{stage.region}</p>

          {/* enemy squad — abstract circular icons, no artwork */}
          <div className="flex items-center gap-2.5 mt-4">
            <span className="text-[10px] uppercase tracking-widest text-slate-500 mr-1">Enemy Squad</span>
            {enemies.map((e, i) => {
              const tpl = catalogById[e.template_id];
              const el = tpl?.element || "Fire";
              const c = (ELEMENT[el] || {}).color || "#9E9E9E";
              return (
                <span
                  key={i}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
                  style={{ background: "rgba(7,8,16,0.8)", border: `1.5px solid ${c}`, boxShadow: `0 0 10px ${c}55`, color: c }}
                  title={`${tpl?.name || "Enemy"} · Lv.${e.level}`}
                >
                  {el.slice(0, 1)}
                </span>
              );
            })}
          </div>

          <div className="flex items-center gap-2 mt-4">
            <span className="text-[10px] uppercase tracking-widest text-slate-500">Recommended Power</span>
            <span
              className="font-display text-xl tabular-nums"
              style={{ color: powerOk ? ACCENT.green : ACCENT.orange, textShadow: `0 0 10px ${powerOk ? ACCENT.green : ACCENT.orange}55` }}
            >
              {recPower.toLocaleString()}
            </span>
          </div>
        </div>

        {/* large orange circular play button */}
        <div className="flex flex-col items-center gap-2 shrink-0 self-center">
          <span
            className="w-20 h-20 rounded-full flex items-center justify-center transition-transform group-hover:scale-105"
            style={{
              background: `radial-gradient(circle at 50% 35%, ${ACCENT.orange}, #b83e0a)`,
              border: "2px solid rgba(255,255,255,0.18)",
              boxShadow: `0 0 26px ${ACCENT.orange}66, inset 0 3px 6px rgba(255,255,255,0.25)`,
            }}
            data-testid="continue-battle-button"
          >
            <Play className="w-8 h-8 text-white fill-current translate-x-0.5" />
          </span>
          <span className="font-display text-sm tracking-[0.2em]" style={{ color: ACCENT.orange }}>START MISSION</span>
        </div>
      </div>
    </Link>
  );
};

/* ---------- Mode / action card ---------- */
const ModeCard = ({ to, icon: Icon, title, subtitle, color, testid, compact }) => (
  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -3 }}>
    <Link
      to={to}
      data-testid={testid}
      className="group relative flex flex-col items-center justify-center text-center gap-1.5 rounded-xl transition-all active:scale-[0.97] overflow-hidden"
      style={{
        minHeight: compact ? 96 : 120,
        background: `linear-gradient(160deg, ${color}14, rgba(7,8,16,0.94))`,
        border: `1px solid ${color}33`,
        boxShadow: `0 0 16px ${color}10`,
      }}
    >
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: `radial-gradient(70% 60% at 50% 40%, ${color}1a, transparent 70%)` }} />
      <div
        className="relative w-11 h-11 rounded-full flex items-center justify-center transition-transform group-hover:scale-110"
        style={{ background: `${color}1c`, boxShadow: `0 0 14px ${color}44` }}
      >
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <h4 className="relative font-display text-lg tracking-wide text-white leading-none">{title}</h4>
      <p className="relative text-[11px] text-slate-400 leading-none">{subtitle}</p>
    </Link>
  </motion.div>
);
