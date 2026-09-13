import { motion } from "framer-motion";

/**
 * Full-screen cinematic splash shown before the login form.
 * Displays the epic background art with "TAP TO ENTER" — clicking
 * anywhere transitions into the login card.
 */
export default function LoginSplash({ onEnter }) {
  return (
    <motion.div
      className="absolute inset-0 z-30 flex flex-col items-center justify-center cursor-pointer select-none"
      onClick={onEnter}
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.08 }}
      transition={{ duration: 0.7, ease: "easeInOut" }}
      data-testid="login-splash"
    >
      {/* Dark vignette to deepen the mood */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/70" />

      {/* Center content */}
      <div className="relative z-10 flex flex-col items-center gap-6">
        {/* Logo */}
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="font-display text-6xl md:text-7xl tracking-wider text-center leading-none"
          style={{
            background: "linear-gradient(180deg, #F5C55A 0%, #D69E2E 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            filter: "drop-shadow(0 2px 8px rgba(214, 158, 46, 0.5))",
          }}
        >
          SHINOBI STRIKE
        </motion.h1>

        {/* Kanji subtext */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="text-white/80 text-lg tracking-[0.3em] font-light"
        >
          忍 ストライク
        </motion.p>

        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.7 }}
          className="text-white/60 text-sm tracking-[0.25em] uppercase"
        >
          Beautiful Souls. Burn Brighter.
        </motion.p>

        {/* TAP TO ENTER button */}
        <motion.button
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 1 }}
          className="mt-8 px-12 py-3 rounded-full border-2 text-white text-lg tracking-[0.2em] font-display backdrop-blur-sm bg-black/20 hover:bg-black/40 hover:scale-105 transition-all duration-300"
          style={{ borderColor: "#D69E2E", boxShadow: "0 0 20px rgba(214, 158, 46, 0.3)" }}
          data-testid="tap-to-enter"
        >
          TAP TO ENTER
        </motion.button>
      </div>

      {/* Vertical Japanese text on the right side */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, delay: 1.2 }}
        className="absolute right-6 top-1/2 -translate-y-1/2 z-10"
        style={{ writingMode: "vertical-rl" }}
      >
        <span className="text-white/40 text-sm tracking-widest font-serif">美しき魂、今、咲き誇る</span>
      </motion.div>

      {/* Version tag top-right */}
      <div className="absolute top-5 right-6 z-10 text-right">
        <span className="text-white/40 text-xs tracking-widest">v1.0.0</span>
        <p className="text-[#D69E2E]/60 text-[10px] tracking-[0.2em] uppercase">Live the Legend</p>
      </div>
    </motion.div>
  );
}
