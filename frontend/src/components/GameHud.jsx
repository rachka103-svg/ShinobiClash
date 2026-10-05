import { useNavigate } from "react-router-dom";
import { Zap, Coins, Gem, LogOut, Volume2, VolumeX } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useAudio } from "@/context/AudioContext";

/**
 * GameHud — Celestial Pagoda top HUD. Dark translucent jade-rimmed pills
 * for resources (energy, gold, diamonds) and a pagoda-styled player chip.
 */
const PILL_STYLE = {
  background: "rgba(13, 17, 23, 0.72)",
  backdropFilter: "blur(14px)",
  WebkitBackdropFilter: "blur(14px)",
  border: "1px solid rgba(123, 158, 181, 0.28)",
  boxShadow: "inset 0 1px 0 rgba(123, 158, 181, 0.08), 0 4px 18px rgba(0, 0, 0, 0.4)",
};

const Pill = ({ icon: Icon, color, value, testid }) => (
  <div
    data-testid={testid}
    className="pointer-events-auto flex items-center gap-1.5 pl-1.5 pr-3 py-1 rounded-full"
    style={PILL_STYLE}
  >
    <span
      className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
      style={{ background: `${color}1a`, boxShadow: `0 0 10px ${color}44`, border: `1px solid ${color}44` }}
    >
      <Icon className="w-3.5 h-3.5" style={{ color }} />
    </span>
    <span className="font-display text-base leading-none tabular-nums" style={{ color: "#dce7ec" }}>
      {Number(value ?? 0).toLocaleString()}
    </span>
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
      <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-[#0d1117] via-[#0d1117]/70 to-transparent" />
      <div className="relative max-w-6xl mx-auto px-3 sm:px-5 pt-[calc(0.55rem+env(safe-area-inset-top))] flex items-center gap-2">
        <Pill icon={Zap} color="#44d6b5" value={energy ? `${energy.current}` : 0} testid="hud-energy" />
        <Pill icon={Coins} color="#c4a882" value={user?.ryo} testid="hud-ryo" />
        <Pill icon={Gem} color="#7eb8d4" value={user?.gems} testid="hud-gems" />

        <div className="ml-auto flex items-center gap-2 pointer-events-auto">
          <div
            className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full"
            style={PILL_STYLE}
            data-testid="hud-player"
          >
            <span
              className="w-7 h-7 rounded-full flex items-center justify-center font-display text-sm shrink-0"
              style={{
                background: "linear-gradient(135deg, #44d6b5, #2a8a7a)",
                color: "#0d1117",
                border: "1px solid rgba(68, 214, 181, 0.4)",
              }}
            >
              {(user?.name || "S").slice(0, 1).toUpperCase()}
            </span>
            <div className="leading-none min-w-[68px]">
              <div className="flex items-center gap-1.5">
                <p className="text-[11px] font-semibold leading-none max-w-[80px] truncate" style={{ color: "#dce7ec" }} data-testid="hud-player-name">{user?.name}</p>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] font-display leading-none shrink-0" style={{ color: "#c4a882" }} data-testid="hud-player-level">Lv.{user?.level ?? 1}</span>
                <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "rgba(123, 158, 181, 0.15)" }} data-testid="hud-xp-bar-track">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, ((user?.exp ?? 0) / Math.max(1, user?.exp_to_next ?? 1)) * 100)}%`,
                      background: "linear-gradient(90deg, #44d6b5, #2a8a7a)",
                      boxShadow: "0 0 6px rgba(68, 214, 181, 0.5)",
                    }}
                    data-testid="hud-xp-bar-fill"
                  />
                </div>
              </div>
              <p className="text-[8px] leading-none mt-0.5 tabular-nums" style={{ color: "#6b838c" }} data-testid="hud-xp-text">
                {(user?.exp ?? 0).toLocaleString()} / {(user?.exp_to_next ?? 0).toLocaleString()}
              </p>
            </div>
          </div>
          <button
            onClick={toggleMute}
            data-testid="hud-sound-toggle"
            aria-label={muted ? "Unmute sound" : "Mute sound"}
            className="pointer-events-auto w-8 h-8 rounded-full flex items-center justify-center transition-colors"
            style={{
              ...PILL_STYLE,
              color: muted ? "#6b838c" : "#44d6b5",
            }}
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <button
            onClick={handleLogout}
            data-testid="hud-logout"
            className="pointer-events-auto w-8 h-8 rounded-full flex items-center justify-center transition-colors"
            style={{
              ...PILL_STYLE,
              color: "#c4a882",
            }}
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
