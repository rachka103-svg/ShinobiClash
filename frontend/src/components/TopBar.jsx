import { Link, useLocation, useNavigate } from "react-router-dom";
import { Swords, Users, Scroll, Trophy, Sparkles, LogOut, Coins, Gem, Home, Castle, LayoutGrid, Wand2, Crosshair, MoreHorizontal, Landmark, Anvil } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import EnergyWidget from "@/components/EnergyWidget";
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetClose } from "@/components/ui/sheet";

const NAV = [
  { to: "/", label: "Lobby", icon: Home, testid: "nav-lobby" },
  { to: "/campaign", label: "Campaign", icon: Scroll, testid: "nav-campaign" },
  { to: "/dungeons", label: "Dungeons", icon: Landmark, testid: "nav-dungeons" },
  { to: "/spire", label: "Spire", icon: Castle, testid: "nav-spire" },
  { to: "/arena", label: "Arena", icon: Crosshair, testid: "nav-arena" },
  { to: "/roster", label: "Roster", icon: Users, testid: "nav-roster" },
  { to: "/gallery", label: "Gallery", icon: LayoutGrid, testid: "nav-gallery" },
  { to: "/team", label: "Team", icon: Swords, testid: "nav-team" },
  { to: "/forge", label: "Forge", icon: Anvil, testid: "nav-forge" },
  { to: "/summon", label: "Summon", icon: Sparkles, testid: "nav-summon" },
  { to: "/leaderboard", label: "Ranks", icon: Trophy, testid: "nav-leaderboard" },
];

// Only the highest-frequency actions get a fixed thumb-reachable slot on
// mobile; everything else lives one tap away behind "More" so the strip
// never needs a sideways scroll to be fully visible.
const MOBILE_PRIMARY_PATHS = ["/", "/campaign", "/roster", "/summon"];

export const TopBar = () => {
  const { user, logout, refreshProfile } = useAuth();
  const loc = useLocation();
  const navigate = useNavigate();
  const nav = user?.role === "admin" ? [...NAV, { to: "/admin", label: "Admin", icon: Wand2, testid: "nav-admin" }] : NAV;
  const primaryNav = nav.filter((n) => MOBILE_PRIMARY_PATHS.includes(n.to));
  const moreNav = nav.filter((n) => !MOBILE_PRIMARY_PATHS.includes(n.to));
  const moreActive = moreNav.some((n) => n.to === loc.pathname);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-40 glass border-b border-black/10" data-testid="top-bar">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
        <Link to="/" className="flex items-center gap-2 group shrink-0" data-testid="logo-link">
          <Swords className="w-6 h-6 text-chakra glow-text-cyan" />
          <span className="font-display text-2xl tracking-wider text-ink group-hover:text-chakra transition-colors">
            SHINOBI<span className="text-fox">CLASH</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-0.5 lg:gap-1 min-w-0 overflow-x-auto" data-testid="desktop-nav">
          {nav.map((n) => {
            const active = loc.pathname === n.to;
            const Icon = n.icon;
            return (
              <Link
                key={n.to}
                to={n.to}
                data-testid={n.testid}
                className={`flex items-center gap-1.5 px-2.5 lg:px-3 xl:px-3.5 py-2 lg:py-2.5 rounded text-sm font-medium transition-all whitespace-nowrap shrink-0 ${
                  active ? "text-chakra bg-cyan-500/10" : "text-slate-500 hover:text-ink hover:bg-black/5"
                }`}
              >
                <Icon className="w-4 h-4 lg:w-[18px] lg:h-[18px]" />
                {n.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2 lg:gap-2.5 shrink-0">
          <div className="hidden sm:block">
            <EnergyWidget energy={user?.energy} onRefresh={refreshProfile} compact />
          </div>
          <div className="hidden sm:flex items-center gap-1.5 px-3 lg:px-3.5 py-1.5 lg:py-2 rounded bg-amber-500/10 border border-amber-500/30" data-testid="ryo-counter">
            <Coins className="w-4 h-4 lg:w-5 lg:h-5 text-amber-400" />
            <span className="font-display text-lg lg:text-xl text-amber-300 tracking-wide">{user?.ryo ?? 0}</span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 px-3 lg:px-3.5 py-1.5 lg:py-2 rounded bg-fuchsia-500/10 border border-fuchsia-500/30" data-testid="gems-counter">
            <Gem className="w-4 h-4 lg:w-5 lg:h-5 text-jutsu" />
            <span className="font-display text-lg lg:text-xl text-jutsu tracking-wide">{user?.gems ?? 0}</span>
          </div>
          <div className="hidden sm:flex flex-col items-end leading-none">
            <span className="text-sm lg:text-[15px] font-semibold text-ink" data-testid="player-name">{user?.name}</span>
            <span className="text-xs lg:text-sm text-chakra">Lv. {user?.level}</span>
          </div>
          <button onClick={handleLogout} data-testid="logout-button" className="p-2 rounded text-slate-500 hover:text-fox hover:bg-fox/10 transition-colors">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* mobile nav — 4 primary tabs + More, always fits without scrolling */}
      <nav className="md:hidden flex items-center justify-between px-1 pb-2 gap-1">
        {primaryNav.map((n) => {
          const active = loc.pathname === n.to;
          const Icon = n.icon;
          return (
            <Link key={n.to} to={n.to} data-testid={`m-${n.testid}`}
              className={`flex flex-1 flex-col items-center gap-0.5 px-1 py-1.5 rounded text-[10px] transition-colors ${active ? "text-chakra" : "text-slate-500"}`}>
              <Icon className="w-5 h-5" />
              {n.label}
            </Link>
          );
        })}
        <Sheet>
          <SheetTrigger asChild>
            <button
              data-testid="m-nav-more"
              className={`flex flex-1 flex-col items-center gap-0.5 px-1 py-1.5 rounded text-[10px] transition-colors ${moreActive ? "text-chakra" : "text-slate-500"}`}
            >
              <MoreHorizontal className="w-5 h-5" />
              More
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" data-testid="more-sheet" className="bg-[#FFFFFF] border-black/10 rounded-t-2xl max-h-[70vh]">
            <SheetHeader>
              <SheetTitle className="font-display text-2xl tracking-wide text-ink text-left">More</SheetTitle>
            </SheetHeader>
            <div className="grid grid-cols-4 gap-2 mt-4 pb-6">
              {moreNav.map((n) => {
                const active = loc.pathname === n.to;
                const Icon = n.icon;
                return (
                  <SheetClose asChild key={n.to}>
                    <Link
                      to={n.to}
                      data-testid={`more-${n.testid}`}
                      className={`flex flex-col items-center gap-1.5 py-3.5 rounded-xl transition-colors ${active ? "text-chakra bg-cyan-500/10" : "text-slate-600 hover:bg-black/5"}`}
                    >
                      <Icon className="w-6 h-6" />
                      <span className="text-[11px] font-medium">{n.label}</span>
                    </Link>
                  </SheetClose>
                );
              })}
            </div>
          </SheetContent>
        </Sheet>
      </nav>
    </header>
  );
};
