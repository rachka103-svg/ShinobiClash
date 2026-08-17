import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Coins, Loader2, Ticket, Star } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { useGame } from "@/context/GameContext";
import api, { formatApiErrorDetail } from "@/lib/api";
import { RARITY } from "@/lib/styles";
import { auraClass, RaritySparkles, RARITY_TIER } from "@/components/RarityFx";

export default function Summon() {
  const { user, setUser } = useAuth();
  const { summonCost, banner } = useGame();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const tickets = user?.inventory?.summon_ticket || 0;

  const summon = async (currency) => {
    setBusy(true);
    setResult(null);
    try {
      const { data } = await api.post("/game/summon", { currency });
      setUser(data.profile);
      setTimeout(() => setResult(data.summoned), 600);
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally {
      setTimeout(() => setBusy(false), 600);
    }
  };

  const rarity = result ? RARITY[result.rarity] : null;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 text-center" data-testid="summon-page">
      <h1 className="font-display text-6xl tracking-wide text-white">SUMMONING ALTAR</h1>
      <p className="text-slate-400 mb-8">Call forth heroes & shinobi from across the legends. Rarer summons hold mythic power.</p>

      {banner && <FeaturedBanner banner={banner} />}

      <div className="relative panel rounded-2xl p-10 min-h-[420px] flex flex-col items-center justify-center overflow-hidden">
        <div className="absolute inset-0 opacity-30 pointer-events-none"
          style={{ background: "radial-gradient(circle at 50% 40%, rgba(213,0,249,0.25), transparent 60%)" }} />

        <AnimatePresence mode="wait">
          {busy && !result ? (
            <motion.div key="loading" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="relative z-10">
              <Sparkles className="w-20 h-20 text-jutsu animate-pulse mx-auto" />
              <p className="font-display text-3xl text-white mt-4 tracking-widest">SUMMONING…</p>
            </motion.div>
          ) : result ? (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.6, rotateY: 90 }}
              animate={{ opacity: 1, scale: 1, rotateY: 0 }}
              transition={{ type: "spring", stiffness: 120 }}
              className="relative z-10"
              data-testid="summon-result"
            >
              <div className={`relative w-48 mx-auto rounded-xl overflow-hidden ${auraClass(result.rarity)}`}
                style={{ "--glow": rarity.color, boxShadow: `0 0 40px ${rarity.color}` }}>
                <img src={result.portrait} alt={result.name} className="w-full aspect-[3/4] object-cover object-top" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                <RaritySparkles rarity={result.rarity} />
                {RARITY_TIER[result.rarity] >= 3 && <span className="absolute inset-0 shine-sweep pointer-events-none" />}
                <span className="absolute top-2 left-2 font-display text-lg px-2 rounded text-[#05050A]" style={{ background: rarity.color }}>{result.rarity}</span>
              </div>
              <h2 className="font-display text-4xl tracking-wide text-white mt-4">{result.name}</h2>
              <p className="text-lg font-semibold" style={{ color: rarity.color }}>{rarity.name} · {result.element} · {result.role}</p>
            </motion.div>
          ) : (
            <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative z-10">
              <Sparkles className="w-20 h-20 text-jutsu/50 mx-auto" />
              <p className="text-slate-400 mt-4">Tap the altar to call forth a new ally.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
        <button
          onClick={() => summon("ryo")}
          disabled={busy || (user?.ryo || 0) < summonCost}
          data-testid="summon-button"
          className="inline-flex items-center gap-3 px-8 py-4 rounded-xl font-display text-2xl tracking-wider bg-jutsu text-white hover:bg-fuchsia-500 transition-colors disabled:opacity-50"
        >
          {busy ? <Loader2 className="w-6 h-6 animate-spin" /> : <Sparkles className="w-6 h-6" />}
          SUMMON
          <span className="flex items-center gap-1 text-xl"><Coins className="w-5 h-5" />{summonCost}</span>
        </button>
        <button
          onClick={() => summon("ticket")}
          disabled={busy || tickets < 1}
          data-testid="summon-ticket-button"
          className="inline-flex items-center gap-3 px-8 py-4 rounded-xl font-display text-2xl tracking-wider bg-amber-400 text-[#05050A] hover:bg-amber-300 transition-colors disabled:opacity-50"
        >
          <Ticket className="w-6 h-6" />
          FREE SUMMON
          <span className="text-xl">×{tickets}</span>
        </button>
      </div>
      {(user?.ryo || 0) < summonCost && tickets < 1 && <p className="text-xs text-fox mt-2">Not enough Ryo or tickets — win battles to earn more.</p>}
    </div>
  );
}

const FeaturedBanner = ({ banner }) => {
  const r = RARITY[banner.rarity] || RARITY.R;
  const pct = Math.round((banner.rate_up_chance || 0) * 100);
  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      data-testid="summon-banner"
      className="relative flex items-center gap-4 mb-6 p-3 sm:p-4 rounded-2xl overflow-hidden text-left panel"
      style={{ border: `1.5px solid ${r.color}`, "--glow": r.color }}
    >
      <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ background: `radial-gradient(circle at 12% 50%, ${r.color}, transparent 55%)` }} />
      <div className={`relative w-20 h-24 sm:w-24 sm:h-28 shrink-0 rounded-xl overflow-hidden ${auraClass(banner.rarity)}`} style={{ border: `1.5px solid ${r.color}`, "--glow": r.color }}>
        <img src={banner.portrait} alt={banner.name} className="w-full h-full object-cover object-top" />
        <RaritySparkles rarity={banner.rarity} />
      </div>
      <div className="relative flex-1">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-extrabold tracking-widest" style={{ background: r.color, color: "#05050A" }}>
          <Star className="w-3 h-3" /> RATE-UP
        </span>
        <h3 className="font-display text-2xl sm:text-3xl text-white leading-tight mt-1">{banner.name}</h3>
        <p className="text-xs sm:text-sm" style={{ color: r.color }}>{r.name} · {banner.element} · {banner.role}</p>
        <p className="text-xs text-slate-300 mt-1">Featured summon — <span className="font-bold text-white">{pct}%</span> chance per pull!</p>
      </div>
    </motion.div>
  );
};
