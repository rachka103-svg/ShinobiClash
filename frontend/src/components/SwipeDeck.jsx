import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

const SWIPE_THRESHOLD = 80;     // px dragged past this flips the card
const VELOCITY_THRESHOLD = 500; // a fast flick flips even with a small drag

/**
 * SwipeDeck — a mobile-first card carousel. One card is centered; swipe
 * left/right (or tap the arrows) flips to the next/previous card with a
 * spring transition like a real game deck.
 *
 * Props:
 *   items       — array of cards to flip through
 *   renderCard  — (item, index) => ReactNode for the centered card body
 *   onSelect    — optional (item, index) => void when a card is tapped
 *   emptyState  — ReactNode shown when items is empty
 */
export default function SwipeDeck({ items = [], renderCard, onSelect, emptyState = null, testid = "swipe-deck" }) {
  const [[index, dir], setState] = useState([0, 0]);

  const paginate = useCallback((newDir) => {
    setState(([i]) => {
      const next = i + newDir;
      if (next < 0 || next >= items.length) return [i, 0];
      return [next, newDir];
    });
  }, [items.length]);

  const onDragEnd = useCallback((_, info) => {
    const { offset, velocity } = info;
    if (offset.x < -SWIPE_THRESHOLD || velocity.x < -VELOCITY_THRESHOLD) paginate(1);
    else if (offset.x > SWIPE_THRESHOLD || velocity.x > VELOCITY_THRESHOLD) paginate(-1);
  }, [paginate]);

  if (!items.length) return emptyState || <p className="text-center text-slate-500 py-10">No cards.</p>;

  const item = items[Math.min(index, items.length - 1)];

  const slide = {
    enter: (d) => ({ x: d > 0 ? "60%" : "-60%", opacity: 0, scale: 0.92 }),
    center: { x: 0, opacity: 1, scale: 1 },
    exit: (d) => ({ x: d > 0 ? "-60%" : "60%", opacity: 0, scale: 0.92 }),
  };

  return (
    <div className="flex flex-col items-center gap-3" data-testid={testid}>
      <div className="relative w-full max-w-xs" style={{ touchAction: "pan-y" }}>
        {/* edge peek shadows for depth */}
        <div className="absolute inset-y-2 -left-2 w-3 rounded-lg bg-white/5" />
        <div className="absolute inset-y-2 -right-2 w-3 rounded-lg bg-white/5" />

        <AnimatePresence mode="popLayout" custom={dir} initial={false}>
          <motion.div
            key={index}
            custom={dir}
            variants={slide}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.6}
            onDragEnd={onDragEnd}
            onClick={() => onSelect?.(item, index)}
            className="relative cursor-grab active:cursor-grabbing"
            data-testid="swipe-card"
          >
            {renderCard(item, index)}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* controls + counter */}
      <div className="flex items-center gap-3">
        <button onClick={() => paginate(-1)} disabled={index === 0}
          data-testid="deck-prev"
          className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-300 disabled:opacity-30 hover:bg-white/10 transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="text-xs text-slate-400 tabular-nums font-display tracking-widest" data-testid="deck-counter">
          {index + 1} / {items.length}
        </span>
        <button onClick={() => paginate(1)} disabled={index >= items.length - 1}
          data-testid="deck-next"
          className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-300 disabled:opacity-30 hover:bg-white/10 transition-colors">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
