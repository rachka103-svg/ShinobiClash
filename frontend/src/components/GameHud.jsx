import { useNavigate } from "react-router-dom";
import { Coins, Gem, Zap, LogOut, Volume2, VolumeX } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useAudio } from "@/context/AudioContext";

/**
 * GameHud — a slim, console-style top HUD of floating resource pills and a
 * player chip. Deliberately NOT a browser header: no logo bar, transparent
 * scrim, thumb-free. Sits above the scrolling content region.
 */
const Pill = ({ icon: Icon, color, value, testid }) => (
  <div
    data-testid={testid}
    className="pointer-events-auto flex items-center gap-1.5 pl-1.5 pr-3 py-1 rounded-full bg-white/80 dark:bg-black/40 backdrop-blur-md border border-black/10 dark:border-white/10"
    style={{ boxShadow: `inset 0 1px 0 rgba(255,255,255,0.7), 0 4px 16px rgba(80,60,20,0.12)` }}
  >
    <span className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ background: `${color}22`, boxShadow: `0 0 10px ${color}55` }}>
      <Icon className="w-3.5 h-3.5" style={{ color }} />
    </span>
    <span className="font-display text-base leading-none text-ink tabular-nums">{Number(value ?? 0).toLocaleString()}</span>
  </div>
);

export default function GameHud() {
  const { user, logout } = useAuth();
  const { muted, toggleMute } = useAudio();
  const navigate = useNavigate();
  const energy = user?.energy;
  const handleLogout = async () => { await logout(); navigate("/login"); };

  return (
    <div className="fixed top-0 inset-x-0 z-40 pointer-events-none" data-testid="game-hud">
      <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-[#F4EEE2] via-[#F4EEE2]/70 to-transparent dark:from-[#101010] dark:via-[#101010]/70" />
      <div className="relative max-w-6xl mx-auto px-3 sm:px-5 pt-[calc(0.55rem+env(safe-area-inset-top))] flex items-center gap-2">
        <Pill icon={Zap} color="#00E676" value={energy ? `${energy.current}` : 0} testid="hud-energy" />
        <Pill icon={Coins} color="#E5A540" value={user?.ryo} testid="hud-ryo" />
        <Pill icon={Gem} color="#A740E5" value={user?.gems} testid="hud-gems" />

        <div className="ml-auto flex items-center gap-2 pointer-events-auto">
          <div className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full bg-white/80 dark:bg-black/40 backdrop-blur-md border border-black/10 dark:border-white/10" style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.7)" }} data-testid="hud-player">
            <span className="w-7 h-7 rounded-full flex items-center justify-center font-display text-sm text-[#101010] shrink-0" style={{ background: "linear-gradient(135deg,#E5A540,#C89530)" }}>
              {(user?.name || "S").slice(0, 1).toUpperCase()}
            </span>
            <div className="leading-none min-w-[68px]">
              <div className="flex items-center gap-1.5">
                <p className="text-[11px] font-semibold text-ink leading-none max-w-[80px] truncate" data-testid="hud-player-name">{user?.name}</p>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] text-chakra font-display leading-none shrink-0" data-testid="hud-player-level">Lv.{user?.level ?? 1}</span>
                <div className="flex-1 h-1 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden" data-testid="hud-xp-bar-track">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, ((user?.exp ?? 0) / Math.max(1, user?.exp_to_next ?? 1)) * 100)}%`,
                      background: "linear-gradient(90deg, #E5A540, #C89530)",
                      boxShadow: "0 0 6px rgba(229,165,64,0.5)",
                    }}
                    data-testid="hud-xp-bar-fill"
                  />
                </div>
              </div>
              <p className="text-[8px] text-slate-400 leading-none mt-0.5 tabular-nums" data-testid="hud-xp-text">
                {(user?.exp ?? 0).toLocaleString()} / {(user?.exp_to_next ?? 0).toLocaleString()}
              </p>
            </div>
          </div>
          <button
            onClick={toggleMute}
            data-testid="hud-sound-toggle"
            aria-label={muted ? "Unmute sound" : "Mute sound"}
            className="pointer-events-auto w-8 h-8 rounded-full bg-white/80 dark:bg-black/40 backdrop-blur-md border border-black/10 dark:border-white/10 flex items-center justify-center text-slate-500 hover:text-chakra hover:border-chakra/40 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-chakra"
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <button onClick={handleLogout} data-testid="hud-logout" className="pointer-events-auto w-8 h-8 rounded-full bg-white/80 dark:bg-black/40 backdrop-blur-md border border-black/10 dark:border-white/10 flex items-center justify-center text-slate-500 hover:text-fox hover:border-fox/40 transition-colors">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
