import { useEffect, useState } from "react";

/**
 * BattleEntry — cinematic battle intro transition.
 * Plays once on mount: screen darkens → motion blur sweep → vignette closes →
 * mission title animates in (fade up, scale 1.08→1, letter-spacing settles,
 * glowing line) → fades after ~2.5s.
 *
 * Props:
 *   title   — mission title (e.g. "THE STOLEN SCROLL")
 *   chapter — chapter/floor label (e.g. "CHAPTER I" or "FLOOR 2")
 *   onDone  — callback when intro finishes
 */
export default function BattleEntry({ title, chapter, onDone }) {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      setShow(false);
      onDone?.();
    }, 2800);
    return () => clearTimeout(t);
  }, [onDone]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none overflow-hidden" data-testid="battle-entry">
      {/* Full darken */}
      <div className="absolute inset-0 cine-darken" style={{ background: "#05050A" }} />

      {/* Motion blur sweep */}
      <div className="absolute inset-0 cine-blur-sweep" style={{ animationDelay: "0.3s" }} />

      {/* Vignette close-in */}
      <div className="absolute inset-0 cine-vignette-close" style={{ animationDelay: "0.5s" }} />

      {/* Title block */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {chapter && (
          <p className="cine-subtitle font-display text-sm tracking-[0.4em] text-slate-500 mb-2" style={{ animationDelay: "0.4s" }}>
            {chapter}
          </p>
        )}
        <h1
          className="cine-title font-display text-5xl sm:text-7xl text-white text-center px-4"
          style={{ animationDelay: "0.5s", textShadow: "0 0 30px rgba(124,77,255,0.6), 0 0 60px rgba(124,77,255,0.3)" }}
        >
          {title}
        </h1>
        {/* Glowing line */}
        <div
          className="cine-title-line h-px mt-4"
          style={{ animationDelay: "0.5s", background: "linear-gradient(90deg, transparent, #7C4DFF, #00E5FF, #7C4DFF, transparent)" }}
        />
      </div>
    </div>
  );
}
