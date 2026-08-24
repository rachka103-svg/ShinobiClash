import { useNavigate } from "react-router-dom";
import { Coins, Gem, Zap, LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

/**
 * GameHud — a slim, console-style top HUD of floating resource pills and a
 * player chip. Deliberately NOT a browser header: no logo bar, transparent
 * scrim, thumb-free. Sits above the scrolling content region.
 */
const Pill = ({ icon: Icon, color, value, testid }) => (
  <div
    data-testid={testid}
    className="pointer-events-auto flex items-center gap-1.5 pl-1.5 pr-3 py-1 rounded-full bg-black/45 backdrop-blur-md border border-black/10"
    style={{ boxShadow: `inset 0 1px 0 rgba(255,255,255,0.08), 0 4px 16px rgba(0,0,0,0.4)` }}
  >
    <span className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ background: `${color}22`, boxShadow: `0 0 10px ${color}55` }}>
      <Icon className="w-3.5 h-3.5" style={{ color }} />
    </span>
    <span className="font-display text-base leading-none text-ink tabular-nums">{Number(value ?? 0).toLocaleString()}</span>
  </div>
);

export default function GameHud() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const energy = user?.energy;
  const handleLogout = async () => { await logout(); navigate("/login"); };

  return (
    <div className="fixed top-0 inset-x-0 z-40 pointer-events-none" data-testid="game-hud">
      <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-[#05050A] via-[#05050A]/70 to-transparent" />
      <div className="relative max-w-6xl mx-auto px-3 sm:px-5 pt-[calc(0.55rem+env(safe-area-inset-top))] flex items-center gap-2">
        <Pill icon={Zap} color="#00E676" value={energy ? `${energy.current}` : 0} testid="hud-energy" />
        <Pill icon={Coins} color="#FFCA28" value={user?.ryo} testid="hud-ryo" />
        <Pill icon={Gem} color="#D500F9" value={user?.gems} testid="hud-gems" />

        <div className="ml-auto flex items-center gap-2 pointer-events-auto">
          <div className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full bg-black/45 backdrop-blur-md border border-black/10" style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)" }} data-testid="hud-player">
            <span className="w-7 h-7 rounded-full flex items-center justify-center font-display text-sm text-[#05050A] shrink-0" style={{ background: "linear-gradient(135deg,#00E5FF,#0091EA)" }}>
              {(user?.name || "S").slice(0, 1).toUpperCase()}
            </span>
            <div className="leading-none">
              <p className="text-[11px] font-semibold text-ink leading-none max-w-[90px] truncate" data-testid="hud-player-name">{user?.name}</p>
              <p className="text-[10px] text-chakra leading-none mt-0.5">Lv. {user?.level ?? 1}</p>
            </div>
          </div>
          <button onClick={handleLogout} data-testid="hud-logout" className="pointer-events-auto w-8 h-8 rounded-full bg-black/45 backdrop-blur-md border border-black/10 flex items-center justify-center text-slate-500 hover:text-fox hover:border-fox/40 transition-colors">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
