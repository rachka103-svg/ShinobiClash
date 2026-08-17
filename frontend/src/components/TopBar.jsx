import { Link, useLocation, useNavigate } from "react-router-dom";
import { Swords, Users, Scroll, Trophy, Sparkles, LogOut, Coins, Home, Castle, LayoutGrid, Wand2, Crosshair } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import EnergyWidget from "@/components/EnergyWidget";

const NAV = [
  { to: "/", label: "Lobby", icon: Home, testid: "nav-lobby" },
  { to: "/campaign", label: "Campaign", icon: Scroll, testid: "nav-campaign" },
  { to: "/spire", label: "Spire", icon: Castle, testid: "nav-spire" },
  { to: "/arena", label: "Arena", icon: Crosshair, testid: "nav-arena" },
  { to: "/roster", label: "Roster", icon: Users, testid: "nav-roster" },
  { to: "/gallery", label: "Gallery", icon: LayoutGrid, testid: "nav-gallery" },
  { to: "/team", label: "Team", icon: Swords, testid: "nav-team" },
  { to: "/summon", label: "Summon", icon: Sparkles, testid: "nav-summon" },
  { to: "/leaderboard", label: "Ranks", icon: Trophy, testid: "nav-leaderboard" },
];

export const TopBar = () => {
  const { user, logout, refreshProfile } = useAuth();
  const loc = useLocation();
  const navigate = useNavigate();
  const nav = user?.role === "admin" ? [...NAV, { to: "/admin", label: "Admin", icon: Wand2, testid: "nav-admin" }] : NAV;

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-40 glass border-b border-white/10" data-testid="top-bar">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
        <Link to="/" className="flex items-center gap-2 group" data-testid="logo-link">
          <Swords className="w-6 h-6 text-chakra glow-text-cyan" />
          <span className="font-display text-2xl tracking-wider text-white group-hover:text-chakra transition-colors">
            SHINOBI<span className="text-fox">CLASH</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {nav.map((n) => {
            const active = loc.pathname === n.to;
            const Icon = n.icon;
            return (
              <Link
                key={n.to}
                to={n.to}
                data-testid={n.testid}
                className={`flex items-center gap-1.5 px-3 py-2 rounded text-sm font-medium transition-all ${
                  active ? "text-chakra bg-cyan-500/10" : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <Icon className="w-4 h-4" />
                {n.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <div className="hidden sm:block">
            <EnergyWidget energy={user?.energy} onRefresh={refreshProfile} compact />
          </div>
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded bg-amber-500/10 border border-amber-500/30" data-testid="ryo-counter">
            <Coins className="w-4 h-4 text-amber-400" />
            <span className="font-display text-lg text-amber-300 tracking-wide">{user?.ryo ?? 0}</span>
          </div>
          <div className="hidden sm:flex flex-col items-end leading-none">
            <span className="text-sm font-semibold text-white" data-testid="player-name">{user?.name}</span>
            <span className="text-xs text-chakra">Lv. {user?.level}</span>
          </div>
          <button onClick={handleLogout} data-testid="logout-button" className="p-2 rounded text-slate-400 hover:text-fox hover:bg-fox/10 transition-colors">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* mobile nav */}
      <nav className="md:hidden flex items-center justify-between px-2 pb-2 gap-1 overflow-x-auto">
        {nav.map((n) => {
          const active = loc.pathname === n.to;
          const Icon = n.icon;
          return (
            <Link key={n.to} to={n.to} data-testid={`m-${n.testid}`}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded text-[10px] ${active ? "text-chakra" : "text-slate-400"}`}>
              <Icon className="w-4 h-4" />
              {n.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
};
