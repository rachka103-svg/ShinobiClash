import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Coins, Gem, Loader2, Ticket, Star, Info, Anvil, Swords } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { useGame } from "@/context/GameContext";
import api, { formatApiErrorDetail } from "@/lib/api";
import { RARITY } from "@/lib/styles";
import { auraClass, RaritySparkles } from "@/components/RarityFx";
import SummonRevealOverlay from "@/components/SummonRevealOverlay";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

/**
 * SUMMONING SANCTUM — the full gacha ceremony. Two altars:
 *  - HERO ALTAR: x1/x10 pulls, transparent rates, MYTHIC pity counter
 *    (soft 100-149 / hard 150 / featured 50-50), currency selector.
 *  - ARMORY: gear pulls (Rare+ gear, x10 guarantees Epic+).
 */
export default function Summon() {
  const { user, setUser } = useAuth();
  const { summonCost, banner, gemCosts, summonRates, pityConfig, gearConfig } = useGame();
  const [altar, setAltar] = useState("hero"); // hero | gear
  const [currency, setCurrency] = useState("ryo");
  const [busy, setBusy] = useState(false);
  const [reveal, setReveal] = useState(null); // array of results for the overlay
  const [ratesOpen, setRatesOpen] = useState(false);

  const tickets = user?.inventory?.summon_ticket || 0;
  const gearTickets = user?.inventory?.gear_ticket || 0;
  const pity = user?.pity || { mythic: 0, featured_guarantee: false, total_pulls: 0 };
  const hardPity = pityConfig.hard_pity || 150;
  const softPity = pityConfig.soft_pity_start || 100;
  const inSoftPity = pity.mythic + 1 >= softPity;

  const heroCost = (n) =>
    currency === "ryo" ? { icon: Coins, amount: summonCost * n, have: user?.ryo || 0, color: "#FFC857" }
    : currency === "gems" ? { icon: Gem, amount: gemCosts.summon * n, have: user?.gems || 0, color: "#D500F9" }
    : { icon: Ticket, amount: n, have: tickets, color: "#FFCA28" };

  const gearCost = (n) =>
    currency === "ticket" ? { icon: Ticket, amount: n, have: gearTickets, color: "#FFCA28" }
    : { icon: Gem, amount: (gearConfig?.summon_gem_cost || 90) * n, have: user?.gems || 0, color: "#D500F9" };

  const doHeroSummon = async (count) => {
    setBusy(true);
    try {
      const { data } = await api.post("/game/summon", { currency, count });
      setUser(data.profile);
      setReveal(data.results);
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally { setBusy(false); }
  };

  const doGearSummon = async (count) => {
    setBusy(true);
    try {
      const { data } = await api.post("/game/gear/summon", { currency: currency === "ticket" ? "ticket" : "gems", count });
      setUser(data.profile);
      const meta = gearConfig?.rarity_meta || {};
      setReveal(data.results.map((g) => ({
        kind: "gear", rarity: g.rarity, color: meta[g.rarity]?.color, score: g.score,
        set_name: g.set_name, slot_name: gearConfig?.slot_meta?.[g.slot]?.name || g.slot,
        icon: gearConfig?.slot_meta?.[g.slot]?.icon,
      })));
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally { setBusy(false); }
  };

  const isHero = altar === "hero";
  const costX1 = isHero ? heroCost(1) : gearCost(1);
  const costX10 = isHero ? heroCost(10) : gearCost(10);
  const currencies = isHero ? ["ryo", "gems", "ticket"] : ["gems", "ticket"];

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 min-w-0" data-testid="summon-page">
      <div className="text-center">
        <h1 className="font-display text-5xl sm:text-6xl tracking-wide text-white">SUMMONING SANCTUM</h1>
        <p className="text-slate-400 mt-1 mb-6">Call forth heroes — or forge-blessed gear — from across the legends.</p>
      </div>

      {/* Altar selector */}
      <div className="grid grid-cols-2 gap-2 mb-5" data-testid="altar-selector">
        <button
          onClick={() => { setAltar("hero"); setCurrency("ryo"); }}
          data-testid="altar-hero-tab"
          className={`flex items-center justify-center gap-2 py-3 rounded-xl font-display text-xl tracking-wider transition-colors ${isHero ? "bg-jutsu/20 text-jutsu border border-jutsu/50" : "bg-white/[0.03] text-slate-400 border border-white/10 hover:text-white"}`}
        >
          <Swords className="w-5 h-5" /> HERO ALTAR
        </button>
        <button
          onClick={() => { setAltar("gear"); setCurrency("gems"); }}
          data-testid="altar-gear-tab"
          className={`flex items-center justify-center gap-2 py-3 rounded-xl font-display text-xl tracking-wider transition-colors ${!isHero ? "bg-fox/20 text-fox border border-fox/50" : "bg-white/[0.03] text-slate-400 border border-white/10 hover:text-white"}`}
        >
          <Anvil className="w-5 h-5" /> ARMORY
        </button>
      </div>

      {isHero && banner && <FeaturedBanner banner={banner} />}

      {/* Pity module (hero altar only) */}
      {isHero && (
        <div className="panel rounded-2xl p-4 mb-4" data-testid="summon-pity-module">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-widest text-slate-500">Mythic Pity</p>
              <p className="font-display text-3xl leading-none mt-0.5" style={{ color: RARITY.MYTHIC.color }} data-testid="summon-pity-count-text">
                {pity.mythic}<span className="text-slate-500 text-lg"> / {hardPity}</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              {inSoftPity && (
                <span className="text-[10px] font-bold tracking-widest px-2 py-1 rounded bg-fox/15 text-fox border border-fox/40" data-testid="soft-pity-active-chip">SOFT PITY ACTIVE</span>
              )}
              {pity.featured_guarantee && (
                <span className="text-[10px] font-bold tracking-widest px-2 py-1 rounded bg-amber-400/15 text-amber-300 border border-amber-400/40" data-testid="featured-guarantee-chip">NEXT MYTHIC = FEATURED</span>
              )}
              <button
                onClick={() => setRatesOpen(true)}
                data-testid="summon-rates-open-button"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-chakra bg-chakra/10 border border-chakra/30 hover:bg-chakra/20 transition-colors"
              >
                <Info className="w-3.5 h-3.5" /> Rates
              </button>
            </div>
          </div>
          <div className="h-2 rounded bg-black/50 overflow-hidden mt-3 relative">
            <div className="h-full rounded" style={{ width: `${Math.min(100, (pity.mythic / hardPity) * 100)}%`, background: `linear-gradient(90deg, #D500F9, ${RARITY.MYTHIC.color})` }} />
            <div className="absolute top-0 bottom-0 w-px bg-fox/70" style={{ left: `${(softPity / hardPity) * 100}%` }} title="Soft pity begins" />
          </div>
          <p className="text-[10px] text-slate-500 mt-1.5">Soft pity ramps from pull {softPity} · guaranteed MYTHIC at {hardPity} · a natural MYTHIC resets the counter</p>
        </div>
      )}

      {/* Altar visual */}
      <div className="relative panel rounded-2xl p-8 sm:p-10 min-h-[220px] flex flex-col items-center justify-center overflow-hidden mb-4">
        <div className="absolute inset-0 opacity-30 pointer-events-none"
          style={{ background: `radial-gradient(circle at 50% 40%, ${isHero ? "rgba(213,0,249,0.25)" : "rgba(255,87,34,0.22)"}, transparent 60%)` }} />
        <motion.div key={altar} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="relative z-10 text-center">
          {isHero ? <Sparkles className="w-16 h-16 text-jutsu/60 mx-auto" /> : <Anvil className="w-16 h-16 text-fox/60 mx-auto" />}
          <p className="text-slate-400 mt-3 text-sm">
            {isHero ? "Every x10 guarantees at least one SR or better." : "Armory pulls drop Rare+ gear — x10 guarantees an Epic or better."}
          </p>
        </motion.div>
      </div>

      {/* Currency selector */}
      <div className="flex items-center justify-center gap-2 mb-4" data-testid="currency-selector">
        {currencies.map((c) => {
          const active = currency === c;
          const label = c === "ryo" ? "Ryo" : c === "gems" ? "Gems" : "Tickets";
          const Icon = c === "ryo" ? Coins : c === "gems" ? Gem : Ticket;
          const have = c === "ryo" ? (user?.ryo || 0) : c === "gems" ? (user?.gems || 0) : (isHero ? tickets : gearTickets);
          return (
            <button
              key={c}
              onClick={() => setCurrency(c)}
              data-testid={`currency-${c}-button`}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${active ? "bg-white/10 text-white border border-white/30" : "text-slate-400 border border-white/10 hover:text-white"}`}
            >
              <Icon className="w-4 h-4" /> {label}
              <span className="text-xs text-slate-400">{have}</span>
            </button>
          );
        })}
      </div>

      {/* Pull CTAs */}
      <div className="grid grid-cols-2 gap-3">
        <PullButton
          label="SUMMON x1"
          cost={costX1}
          disabled={busy || costX1.have < costX1.amount}
          busy={busy}
          onClick={() => (isHero ? doHeroSummon(1) : doGearSummon(1))}
          testid="summon-x1-button"
        />
        <PullButton
          label="SUMMON x10"
          cost={costX10}
          disabled={busy || costX10.have < costX10.amount}
          busy={busy}
          primary
          onClick={() => (isHero ? doHeroSummon(10) : doGearSummon(10))}
          testid="summon-x10-button"
        />
      </div>
      {costX10.have < costX1.amount && (
        <p className="text-xs text-fox mt-2 text-center" data-testid="summon-insufficient-text">Not enough {currency === "ryo" ? "Ryo" : currency === "gems" ? "Gems" : "tickets"} — win battles and missions to earn more.</p>
      )}

      {/* Rates dialog */}
      <Dialog open={ratesOpen} onOpenChange={setRatesOpen}>
        <DialogContent className="max-w-md bg-[#0B0B14] border border-white/15 rounded-2xl max-h-[85vh] overflow-y-auto" data-testid="summon-rates-dialog">
          <DialogTitle className="font-display text-2xl tracking-wide text-white">SUMMON RATES</DialogTitle>
          <DialogDescription className="text-xs text-slate-400">
            Transparent per-pull probabilities. Rates update automatically as new heroes join the catalog.
          </DialogDescription>
          <Table data-testid="summon-rates-table">
            <TableHeader>
              <TableRow className="border-white/10">
                <TableHead className="text-slate-400">Rarity</TableHead>
                <TableHead className="text-right text-slate-400">Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(summonRates).map(([r, pct]) => (
                <TableRow key={r} className="border-white/5">
                  <TableCell className="font-bold" style={{ color: (RARITY[r] || RARITY.R).color }}>{(RARITY[r] || {}).name || r} ({r})</TableCell>
                  <TableCell className="text-right text-white tabular-nums">{pct}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="text-xs text-slate-400 space-y-1.5 mt-1">
            <p><span className="text-white font-semibold">MYTHIC pity:</span> normal rate for pulls 1-{softPity - 1}; the chance climbs every pull from {softPity} and a MYTHIC is guaranteed by pull {hardPity}. Pulling a MYTHIC naturally resets the counter.</p>
            <p><span className="text-white font-semibold">Featured 50/50:</span> when a featured MYTHIC banner is live, your first MYTHIC has a 50% chance to be the featured hero — lose the 50/50 and your next MYTHIC is guaranteed to be featured.</p>
            <p><span className="text-white font-semibold">x10 guarantee:</span> every x10 contains at least one SR or better. Duplicates always convert to shards for Evolution.</p>
          </div>
          <button
            onClick={() => setRatesOpen(false)}
            data-testid="summon-rates-close-button"
            className="w-full py-2.5 rounded-xl font-semibold text-sm bg-white/5 border border-white/15 text-slate-200 hover:bg-white/10 transition-colors"
          >
            Close
          </button>
        </DialogContent>
      </Dialog>

      <SummonRevealOverlay open={!!reveal} results={reveal || []} onClose={() => setReveal(null)} />
    </div>
  );
}

const PullButton = ({ label, cost, disabled, busy, primary, onClick, testid }) => {
  const Icon = cost.icon;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      data-testid={testid}
      className={`flex flex-col items-center gap-1 py-4 rounded-xl font-display text-xl sm:text-2xl tracking-wider transition-colors disabled:opacity-40 ${
        primary ? "bg-jutsu text-white hover:bg-fuchsia-500 shine-sweep relative overflow-hidden" : "bg-white/[0.05] text-white border border-white/15 hover:bg-white/10"
      }`}
    >
      <span className="flex items-center gap-2">{busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}{label}</span>
      <span className="flex items-center gap-1 text-sm font-sans font-semibold" style={{ color: primary ? "#fff" : cost.color }}>
        <Icon className="w-4 h-4" />{cost.amount}
      </span>
    </button>
  );
};

const FeaturedBanner = ({ banner }) => {
  const r = RARITY[banner.rarity] || RARITY.R;
  const isMythic = banner.rarity === "MYTHIC";
  const pct = Math.round((banner.rate_up_chance || 0) * 100);
  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      data-testid="summon-banner"
      className="relative flex items-center gap-4 mb-4 p-3 sm:p-4 rounded-2xl overflow-hidden text-left panel"
      style={{ border: `1.5px solid ${r.color}`, "--glow": r.color }}
    >
      <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ background: `radial-gradient(circle at 12% 50%, ${r.color}, transparent 55%)` }} />
      <div className={`relative w-20 h-24 sm:w-24 sm:h-28 shrink-0 rounded-xl overflow-hidden ${auraClass(banner.rarity)}`} style={{ border: `1.5px solid ${r.color}`, "--glow": r.color }}>
        <img src={banner.portrait} alt={banner.name} className="w-full h-full object-cover object-top" />
        <RaritySparkles rarity={banner.rarity} />
      </div>
      <div className="relative flex-1 min-w-0">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-extrabold tracking-widest" style={{ background: r.color, color: "#05050A" }}>
          <Star className="w-3 h-3" /> RATE-UP
        </span>
        <h3 className="font-display text-2xl sm:text-3xl text-white leading-tight mt-1 truncate">{banner.name}</h3>
        <p className="text-xs sm:text-sm" style={{ color: r.color }}>{r.name} · {banner.element} · {banner.role}</p>
        <p className="text-xs text-slate-300 mt-1">
          {isMythic ? "Featured MYTHIC — 50/50 with guarantee after a loss!" : <>Featured summon — <span className="font-bold text-white">{pct}%</span> chance per pull!</>}
        </p>
      </div>
    </motion.div>
  );
};
