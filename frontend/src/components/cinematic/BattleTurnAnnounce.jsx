import { useEffect, useState } from "react";
import { ELEMENT } from "@/lib/styles";

/**
 * BattleTurnAnnounce — cinematic turn-start announcement.
 * When `activeUid` changes and phase is select/enemy, shows a dramatic
 * character name + "YOUR TURN" / "ENEMY TURN" with elemental color,
 * glowing line, and fade-out after ~1.5s.
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
    const t = setTimeout(() => setAnnounce(null), 1600);
    return () => clearTimeout(t);
  }, [activeUid, phase, round]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!announce) return null;

  const el = ELEMENT[announce.element] || {};
  const elColor = el.color || "#7C4DFF";
  const label = announce.isPlayer ? "YOUR TURN" : "ENEMY TURN";

  return (
    <div key={announce.key} className="absolute inset-0 z-30 pointer-events-none flex items-center justify-center" data-testid="turn-announce">
      <div className="text-center turn-announce">
        <p
          className="font-display text-xs tracking-[0.4em] mb-1"
          style={{ color: announce.isPlayer ? "#00E5FF" : "#FF5722", textShadow: `0 0 12px ${announce.isPlayer ? "#00E5FF" : "#FF5722"}` }}
        >
          {label}
        </p>
        <h2
          className="font-display text-3xl sm:text-5xl text-white"
          style={{ textShadow: `0 0 20px ${elColor}99, 0 0 40px ${elColor}44` }}
        >
          {announce.name}
        </h2>
        <div
          className="turn-line h-px mx-auto mt-2"
          style={{ background: `linear-gradient(90deg, transparent, ${elColor}, transparent)` }}
        />
      </div>
    </div>
  );
}
