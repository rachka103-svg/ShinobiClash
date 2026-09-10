import { useEffect, useState } from "react";
import { ELEMENT } from "@/lib/styles";

/**
 * BattleTurnAnnounce — slim turn-start banner at the top of the screen.
 * Shows "YOUR TURN" / "ENEMY TURN" with the active combatant's name in a
 * compact banner. The battlefield remains fully visible.
 *
 * Props:
 *   activeUid — uid of the active combatant (triggers announcement on change)
 *   actor     — the active combatant object (name, element)
 *   phase     — "select" | "enemy" | other (only announce on these two)
 *   round     — current round number
 */
export default function BattleTurnAnnounce({ activeUid, actor, phase, round }) {
  const [announce, setAnnounce] = useState(null);

  useEffect(() => {
    if (!activeUid || !actor || (phase !== "select" && phase !== "enemy")) return;
    const isPlayer = phase === "select";
    setAnnounce({
      key: activeUid + round,
      name: actor.name,
      element: actor.element,
      isPlayer,
    });
    const t = setTimeout(() => setAnnounce(null), 900);
    return () => clearTimeout(t);
  }, [activeUid, phase, round]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!announce) return null;

  const el = ELEMENT[announce.element] || {};
  const elColor = el.color || "#7C4DFF";
  const label = announce.isPlayer ? "YOUR TURN" : "ENEMY TURN";
  const labelColor = announce.isPlayer ? "#00E5FF" : "#FF5722";

  return (
    <div key={announce.key} className="absolute inset-x-0 top-0 z-30 pointer-events-none flex justify-center" data-testid="turn-announce">
      <div className="turn-announce-banner flex items-center gap-2 mt-9 sm:mt-10 px-4 py-1 rounded-full"
        style={{
          background: "rgba(8,9,11,0.7)",
          backdropFilter: "blur(4px)",
          border: `1px solid ${elColor}44`,
        }}
      >
        <span
          className="font-display text-[10px] sm:text-xs tracking-[0.3em] font-bold"
          style={{ color: labelColor, textShadow: `0 0 8px ${labelColor}88` }}
        >
          {label}
        </span>
        <span className="w-px h-3 bg-white/20" />
        <span
          className="font-display text-sm sm:text-base text-white font-semibold"
          style={{ textShadow: `0 0 10px ${elColor}66` }}
        >
          {announce.name}
        </span>
      </div>
    </div>
  );
}
