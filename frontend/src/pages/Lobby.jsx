import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Scroll, Users, Swords, Sparkles, Castle, LayoutGrid, Crosshair, ChevronRight, PartyPopper } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useGame } from "@/context/GameContext";
import { RARITY, ELEMENT, rarityFrame, GOLD } from "@/lib/theme";
import { DecoCorners } from "@/components/RarityFx";
import MissionsPanel from "@/components/MissionsPanel";
import DailyLoginCard from "@/components/DailyLoginCard";
import { heroPortrait } from "@/lib/utils";
import api, { formatApiErrorDetail } from "@/lib/api";
import "./Lobby.css";

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

const SECTION_BG_MISSION = "https://media.base44.com/images/public/6a95b687e54c815596ebfc07/cf0eea0e7_generated_9e628520.jpg";
const SECTION_BG_TILES = "https://media.base44.com/images/public/6a95b687e54c815596ebfc07/b74c034c6_generated_a041d66c.jpg";

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
    <div className="pagoda-lobby" data-testid="lobby-page">
      <div className="pagoda-shell">
        {/* ===================== HERO — moonlit pagoda archway ===================== */}
        <section
          className="pagoda-hero"
          data-testid="leader-hero"
          style={leaderFrame ? {
            border: `${leaderFrame.strokeWidth}px solid ${leaderFrame.useGold ? GOLD.stroke : leaderRarity.color + "55"}`,
            boxShadow: `0 24px 70px rgba(0,0,0,0.6), 0 0 50px ${leaderFrame.useGold ? GOLD.base : leaderRarity.color}22`,
          } : undefined}
        >
          {leaderTpl ? (
            <img src={heroPortrait(leader) || leaderTpl.portrait} alt={leaderTpl.name} className="pagoda-hero-img" />
          ) : (
            <div className="pagoda-hero-img" style={{ background: "linear-gradient(to bottom, #17232d, #0d1117)" }} />
          )}

          {/* Element tint at top */}
          {leaderTpl && (
            <div className="pagoda-element-tint" style={{ background: `linear-gradient(to bottom, ${leaderElement.color}55, transparent)` }} />
          )}

          <div className="pagoda-moon" />
          <div className="pagoda-petals" />

          {leaderFrame?.useGold && <div className="gold-pinstripe absolute top-0 inset-x-0 z-10" />}
          {leaderFrame && leaderFrame.cornerLevel >= 2 && <DecoCorners rarity={leaderRarityKey} size={22} />}

          {/* Sensei badge */}
          <div className="pagoda-sensei">
            <small className="pagoda-sensei-label">Sensei</small>
            <strong className="pagoda-sensei-level" data-testid="stat-level">Lv.{user?.level ?? 1}</strong>
          </div>

          {/* Hero copy */}
          <div className="pagoda-hero-copy">
            <div className="pagoda-eyebrow">Squad Leader</div>
            <h1>{leaderTpl?.name || "No Leader Set"}</h1>
            {leaderTpl ? (
              <>
                <div className="pagoda-hero-meta">
                  <span style={{ color: leaderRarity.color, textShadow: `0 0 10px ${leaderRarity.color}` }}>{leaderRarity.name.toUpperCase()}</span>
                  <span style={{ color: leaderElement.color, textShadow: `0 0 10px ${leaderElement.color}` }}>{leaderTpl.element}</span>
                  <span style={{ color: "#dce7ec" }}>Lv.{leader.level}</span>
                </div>
                <p className="pagoda-quote">"{leaderQuote}"</p>
              </>
            ) : (
              <Link to="/team" data-testid="set-leader-link" className="inline-block mt-2 text-chakra underline">Choose your squad →</Link>
            )}
            <p className="pagoda-hero-footer">A New Generation of Ninja RPG</p>
          </div>
        </section>

        {/* ===================== NEXT MISSION — temple offering ===================== */}
        <section className="pagoda-section" style={{ "--section-bg": `url(${SECTION_BG_MISSION})` }}>
          <h2 className="pagoda-panel-title">Next Mission</h2>
          {nextStage ? (
            <Link to="/campaign" data-testid="continue-battle" className="pagoda-mission">
              <div className="min-w-0 flex-1">
                <p className="pagoda-mission-kicker">Next Mission · Ch.{nextStage.chapter}</p>
                <h2>{nextStage.name}</h2>
                <p className="pagoda-mission-sub">Skirmish {nextStage.id}</p>
                <div className="pagoda-enemies">
                  {nextStage.enemies.slice(0, 4).map((e, i) => (
                    <div key={i} className="pagoda-enemy" style={{ borderColor: RARITY[catalogById[e.template_id]?.rarity || "R"].color }}>
                      <img src={catalogById[e.template_id]?.portrait} alt="" className="w-full h-full object-cover object-top" />
                    </div>
                  ))}
                </div>
              </div>
              <div className="pagoda-enter" data-testid="continue-battle-button">
                <span className="pagoda-enter-circle"><ChevronRight className="w-7 h-7" /></span>
                <span>Enter Battle</span>
              </div>
            </Link>
          ) : (
            <div className="pagoda-mission text-center" data-testid="campaign-complete">
              <PartyPopper className="w-6 h-6 mx-auto mb-1 text-amber-300" />
              <h2 style={{ color: "#FFCA28", textShadow: "0 0 12px rgba(255,202,40,0.6)" }}>ALL MISSIONS CLEARED!</h2>
            </div>
          )}
        </section>

        {/* ===================== TILES — floating jade plaques ===================== */}
        <section className="pagoda-section" style={{ "--section-bg": `url(${SECTION_BG_TILES})` }}>
          <div className="pagoda-tiles" data-testid="lobby-tiles">
            {tiles.map((t) => {
              const Icon = t.icon;
              return (
                <Link key={t.to} to={t.to} data-testid={t.testid} className="pagoda-tile">
                  <span className="pagoda-tile-icon"><Icon style={{ color: t.color, width: 22, height: 22 }} /></span>
                  <span className="pagoda-tile-label">{t.label}</span>
                  <span className="pagoda-tile-desc">{t.desc}</span>
                </Link>
              );
            })}
          </div>
        </section>

        {/* ===================== CARDS — Daily Login + Missions ==================== */}
        <section className="pagoda-cards">
          <div className="pagoda-card">
            <DailyLoginCard login={user?.login} onClaim={handleClaimLogin} />
          </div>
          <div className="pagoda-card">
            <MissionsPanel missions={user?.missions} onClaimed={setUser} />
          </div>
        </section>

        <div className="pagoda-footer">A New Generation of Ninja RPG</div>
      </div>
    </div>
  );
}
