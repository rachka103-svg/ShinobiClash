import { AnimatePresence, motion } from "framer-motion";

/**
 * EliteBurst — a brief, full-screen rarity-tinted flash used when a player
 * taps into a UR/LR hero. Communicates "this one is special" before the
 * showcase opens. Auto-dismisses; purely presentational, no layout impact.
 */
export default function EliteBurst({ color }) {
  return (
    <AnimatePresence>
      {color && (
        <motion.div
          key="elite-burst"
          className="fixed inset-0 z-[100] pointer-events-none flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.15 } }}
        >
          <motion.div
            className="absolute inset-0"
            style={{ background: `radial-gradient(circle, ${color}66 0%, ${color}22 35%, transparent 72%)` }}
            initial={{ scale: 0.2, opacity: 0 }}
            animate={{ scale: 2.4, opacity: [0, 1, 0] }}
            transition={{ duration: 0.55, times: [0, 0.35, 1], ease: "easeOut" }}
          />
          {/* radiating light rays */}
          <motion.div
            className="absolute w-[2px] h-[140vh]"
            style={{ background: `linear-gradient(to bottom, transparent, ${color}bb, transparent)` }}
            initial={{ opacity: 0, scale: 0, rotate: 0 }}
            animate={{ opacity: [0, 1, 0], scale: 1, rotate: 45 }}
            transition={{ duration: 0.5 }}
          />
          <motion.div
            className="absolute w-[2px] h-[140vh]"
            style={{ background: `linear-gradient(to bottom, transparent, ${color}bb, transparent)` }}
            initial={{ opacity: 0, scale: 0, rotate: 90 }}
            animate={{ opacity: [0, 1, 0], scale: 1, rotate: 135 }}
            transition={{ duration: 0.5 }}
          />
          {/* core flash */}
          <motion.div
            className="w-2 h-2 rounded-full bg-white"
            style={{ boxShadow: `0 0 80px 40px ${color}` }}
            initial={{ scale: 0 }}
            animate={{ scale: [0, 10, 0] }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
