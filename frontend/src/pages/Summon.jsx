import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, Coins, Gem, Loader2, Ticket, Star, Info, ChevronRight, Clock,
  Percent, History, Plus, Anvil, Swords, Flame, Droplet, Wind as WindIcon,
  Mountain, Zap, Moon, Sun, ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { useGame } from "@/context/GameContext";
import api, { formatApiErrorDetail } from "@/lib/api";
import { RARITY, ELEMENT } from "@/lib/styles";
import { rarityFrame, GOLD } from "@/lib/theme";
import { auraClass, RaritySparkles, DecoCorners } from "@/components/RarityFx";
import SummonRevealOverlay from "@/components/SummonRevealOverlay";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// ---------------------------------------------------------------------------
// Static, data-driven presentation helpers (no fake game state — purely
// cosmetic theming derived from the live featured hero + catalog).
// ---------------------------------------------------------------------------
const BANNER_THEME = {
  Dark: { name: "VOID CHRONICLES", tagline: "The threads of fate unravel. Mystic beings emerge from the void." },
  Fire: { name: "EMBER ASCENDANCE", tagline: "Cinders stir awake. Legends forged in flame answer the call." },
  Water: { name: "TIDECALLER'S RITE", tagline: "The deep awakens. Ancient tides carry heroes to your shore." },
  Wind: { name: "GALE COVENANT", tagline: "The winds shift. Swift spirits ride the storm to your side." },
  Earth: { name: "IRONROOT AWAKENING", tagline: "The mountains move. Unbreakable guardians rise from stone." },
  Lightning: { name: "STORMCALL SUMMONS", tagline: "The sky splits open. Thunder-born champions descend." },
  Light: { name: "RADIANT ASCENT", tagline: "Dawn breaks eternal. Luminous heroes grace the realm." },
};
const FALLBACK_THEME = { name: "LEGENDS AWAKEN", tagline: "Heroes of myth answer your call across the shadow realm." };

const TAG_LABEL = {
  AOE: "AoE", SINGLE_TARGET: "Single Target", DOT: "Damage Over Time", CRIT: "Critical",
  BURN: "Burn", BLEED: "Bleed", POISON: "Poison", STUN: "Stun", FREEZE: "Freeze",
  SHIELD: "Shield", HEAL: "Heal", BUFF: "Buff", DEBUFF: "Debuff", COUNTER: "Counter",
  LIFESTEAL: "Lifesteal", SUMMONER: "Summoner", EXECUTOR: "Executor", ENERGY: "Chakra", SPEED: "Speed",
};

const ELEMENT_ICON = { Fire: Flame, Water: Droplet, Wind: WindIcon, Earth: Mountain, Lightning: Zap, Dark: Moon, Light: Sun };
const STAR_COUNT = { R: 2, SR: 3, SSR: 4, UR: 5, GR: 5 };
const RARITY_ORDER = { R: 0, SR: 1, SSR: 2, UR: 3, GR: 4 };

// Next weekly reset (Mon 00:00 UTC) — a genuine live countdown, not fake data.
const nextWeeklyReset = () => {
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
  const day = d.getUTCDay(); // 0 Sun..6 Sat
  const daysUntilMon = ((8 - day) % 7) || 7;
  d.setUTCDate(d.getUTCDate() + daysUntilMon);
  return d.getTime();
};
const useCountdown = (target) => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const ms = Math.max(0, target - now);
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${d}d ${h}h ${m}m ${String(s).padStart(2, "0")}s`;
};

const relTime = (ts) => {
  const diff = Math.max(0, Date.now() - ts);
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

const Stars = ({ rarity, className = "w-3 h-3" }) => {
  const n = STAR_COUNT[rarity] || 3;
  const color = (RARITY[rarity] || RARITY.R).color;
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: n }).map((_, i) => (
        <Star key={i} className={className} style={{ color, fill: color }} />
      ))}
    </div>
  );
};

/**
 * SUMMONING SANCTUM — cinematic gacha banner. Featured rate-up hero, live
 * MYTHIC pity module (soft 100 / hard 150 / featured 50-50), transparent
 * rates, x1 / x10 / ticket pulls, an available-heroes carousel and a
 * localStorage-backed recent-summons feed. The Gear Armory is preserved as a
 * second banner accessible from the top toggle.
 */
export default function Summon() {
  const { user, setUser } = useAuth();
  const { catalog, catalogById, summonCost, banner, gemCosts, summonRates, summonRatesRyo, pityConfig, gearConfig } = useGame();
  const [mode, setMode] = useState("hero"); // hero | gear
  const [payMode, setPayMode] = useState("gems"); // gems | ryo  (hero altar)
  const [busy, setBusy] = useState(false);
  const [busyKind, setBusyKind] = useState(null);
  const [reveal, setReveal] = useState(null);
  const [ratesOpen, setRatesOpen] = useState(false);
  const [featuredOpen, setFeaturedOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [elementFilter, setElementFilter] = useState("ALL");
  const [history, setHistory] = useState([]);

  const historyKey = `sc_summon_history_${user?.id || "me"}`;
  useEffect(() => {
    try { setHistory(JSON.parse(localStorage.getItem(historyKey) || "[]")); } catch { setHistory([]); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyKey]);
  const pushHistory = (results) => {
    const entries = results
      .filter((r) => r && r.name)
      .map((r) => ({ template_id: r.template_id, name: r.name, rarity: r.rarity, portrait: r.portrait, ts: Date.now() }));
    setHistory((prev) => {
      const next = [...entries.reverse(), ...prev].slice(0, 60);
      try { localStorage.setItem(historyKey, JSON.stringify(next)); } catch { /* ignore quota */ }
      return next;
    });
  };

  const inv = user?.inventory || {};
  const tickets = inv.summon_ticket || 0;
  const gearTickets = inv.gear_ticket || 0;
  const pity = user?.pity || { gr: 0, featured_guarantee: false, total_pulls: 0 };
  const hardPity = pityConfig.hard_pity || 90;
  const softPity = pityConfig.soft_pity_start || 60;
  const pityRarity = pityConfig.pity_rarity || "GR";
  const pityColor = (RARITY[pityRarity] || RARITY.GR).color;
  const pityCount = pity.gr ?? pity.mythic ?? 0;
  const inSoftPity = pityCount + 1 >= softPity;
  const pullsToPity = Math.max(0, hardPity - pityCount);

  // ----- Featured hero (falls back to the highest-rarity catalog hero) -----
  const featuredHero = useMemo(() => {
    if (banner && catalogById[banner.template_id]) return catalogById[banner.template_id];
    return [...catalog].sort((a, b) => RARITY_ORDER[b.rarity] - RARITY_ORDER[a.rarity])[0] || null;
  }, [banner, catalog, catalogById]);
  const featRarity = featuredHero ? (RARITY[featuredHero.rarity] || RARITY.R) : RARITY.R;
  const featElement = featuredHero ? (ELEMENT[featuredHero.element] || {}) : {};
  const theme = (featuredHero && BANNER_THEME[featuredHero.element]) || FALLBACK_THEME;
  const heroTags = (featuredHero?.tags || []).slice(0, 3).map((t) => TAG_LABEL[t] || t);

  // Featured set = rate-up hero + next highest-rarity heroes (client curation).
  const featuredSet = useMemo(() => {
    if (!featuredHero) return [];
    const rest = [...catalog]
      .filter((c) => c.id !== featuredHero.id)
      .sort((a, b) => RARITY_ORDER[b.rarity] - RARITY_ORDER[a.rarity] || a.name.localeCompare(b.name));
    return [featuredHero, ...rest].slice(0, 4);
  }, [featuredHero, catalog]);
  const featuredAll = useMemo(
    () => [...catalog].sort((a, b) => RARITY_ORDER[b.rarity] - RARITY_ORDER[a.rarity] || a.name.localeCompare(b.name)).slice(0, 12),
    [catalog]
  );

  // ----- Available heroes carousel -----
  const availableHeroes = useMemo(() => {
    return [...catalog]
      .filter((c) => elementFilter === "ALL" || c.element === elementFilter)
      .sort((a, b) => RARITY_ORDER[b.rarity] - RARITY_ORDER[a.rarity] || a.name.localeCompare(b.name));
  }, [catalog, elementFilter]);
  const elementFilters = ["ALL", ...Array.from(new Set(catalog.map((c) => c.element)))];

  const countdown = useCountdown(useMemo(nextWeeklyReset, []));

  // ---------------------------- Actions ----------------------------
  const doHeroSummon = async (count, currency) => {
    setBusy(true); setBusyKind(`${currency}-${count}`);
    try {
      const { data } = await api.post("/game/summon", { currency, count });
      setUser(data.profile);
      pushHistory(data.results);
      setReveal(data.results);
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally { setBusy(false); setBusyKind(null); }
  };

  const doGearSummon = async (count, currency) => {
    setBusy(true); setBusyKind(`gear-${currency}-${count}`);
    try {
      const { data } = await api.post("/game/gear/summon", { currency, count });
      setUser(data.profile);
      const meta = gearConfig?.rarity_meta || {};
      setReveal(data.results.map((g) => ({
        kind: "gear", rarity: g.rarity, color: meta[g.rarity]?.color, score: g.score,
        set_name: g.set_name, slot_name: gearConfig?.slot_meta?.[g.slot]?.name || g.slot,
        icon: gearConfig?.slot_meta?.[g.slot]?.icon,
      })));
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally { setBusy(false); setBusyKind(null); }
  };

  const notifyEarn = (what) =>
    toast.info(what === "gems"
      ? "Earn Gems from daily login, missions & achievements."
      : "Earn Ryo from battles, Campaign & Resource Dungeons.");

  // Hero pull costs
  const gemX1 = gemCosts.summon;
  const ryoX1 = summonCost;
  const heroX1 = payMode === "gems" ? gemX1 : ryoX1;
  const heroX10 = heroX1 * 10;
  const heroHave = payMode === "gems" ? (user?.gems || 0) : (user?.ryo || 0);

  const isHero = mode === "hero";

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-6 py-6 min-w-0" data-testid="summon-page">
      {/* ===================== Resource strip ===================== */}
      <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto pb-2 mb-4 scrollbar-none" data-testid="summon-resource-strip">
        <ResourcePill icon={Gem} color="#D500F9" label="Gems" value={user?.gems ?? 0} onAdd={() => notifyEarn("gems")} testid="resource-gems" />
        <ResourcePill icon={Coins} color="#FFCA28" label="Ryo" value={user?.ryo ?? 0} onAdd={() => notifyEarn("ryo")} testid="resource-ryo" />
        <ResourcePill icon={Ticket} color="#FFCA28" label="Summon Tickets" value={tickets} testid="resource-summon-tickets" />
        <ResourcePill icon={Anvil} color="#7C4DFF" label="Armory Tickets" value={gearTickets} testid="resource-gear-tickets" />
        <div className="shrink-0 ml-auto flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/10">
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-widest text-slate-500 leading-none">GR Pity</p>
            <p className="font-display text-lg leading-tight" style={{ color: pityColor }} data-testid="resource-pity">
              {pityCount}<span className="text-slate-500 text-sm"> / {hardPity}</span>
            </p>
          </div>
          <div className="w-16 h-1.5 rounded-full bg-black/50 overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${Math.min(100, (pityCount / hardPity) * 100)}%`, background: `linear-gradient(90deg,#D500F9,${pityColor})` }} />
          </div>
        </div>
      </div>

      {/* ===================== Banner mode toggle ===================== */}
      <div className="flex items-center gap-2 mb-4" data-testid="summon-mode-toggle">
        <ModeTab active={isHero} onClick={() => setMode("hero")} icon={Sparkles} label="HERO BANNER" color="#D500F9" testid="mode-hero" />
        <ModeTab active={!isHero} onClick={() => setMode("gear")} icon={Anvil} label="GEAR ARMORY" color="#FF5722" testid="mode-gear" />
      </div>

      {isHero ? (
        <>
          {/* ===================== Cinematic banner ===================== */}
          {featuredHero && (
            <div
              className="relative rounded-3xl overflow-hidden mb-4 min-h-[360px] sm:min-h-[440px]"
              style={{ border: `1px solid ${featRarity.color}55`, boxShadow: `0 0 60px ${featRarity.color}22` }}
              data-testid="summon-banner"
            >
              {/* Art */}
              <div className="absolute inset-0">
                <img src={featuredHero.portrait} alt={featuredHero.name} className="absolute right-0 top-0 h-full w-full sm:w-3/4 object-cover object-right-top" />
                <div className="absolute inset-0" style={{ background: `linear-gradient(90deg, #0B0B14 18%, #0B0B14cc 42%, transparent 78%)` }} />
                <div className="absolute inset-0" style={{ background: `radial-gradient(120% 80% at 85% 30%, ${featElement.color || "#7C4DFF"}33, transparent 60%)` }} />
                <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#0B0B14] to-transparent" />
              </div>

              {/* prestige gold pinstripe along the top edge of the banner */}
              <div className="gold-pinstripe absolute top-0 inset-x-0 z-10" />
              {/* deco corner ornaments framing the whole banner */}
              <DecoCorners level={rarityFrame(featuredHero.rarity).useGold ? 4 : 3} color={rarityFrame(featuredHero.rarity).useGold ? GOLD.base : featRarity.color} size={26} />

              {/* Copy */}
              <div className="relative z-10 p-5 sm:p-8 max-w-[92%] sm:max-w-[58%]">
                <div className="flex items-center gap-3 flex-wrap mb-3">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-extrabold tracking-widest" style={{ background: `${featRarity.color}22`, color: featRarity.color, border: `1px solid ${featRarity.color}66` }}>
                    <Sparkles className="w-3.5 h-3.5" /> LIMITED SUMMON
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-xs text-slate-300" data-testid="banner-countdown">
                    <Clock className="w-3.5 h-3.5 text-chakra" /> {countdown}
                  </span>
                </div>

                <h1 className="font-display leading-[0.86] tracking-wide">
                  <span className="block text-4xl sm:text-6xl text-transparent bg-clip-text" style={{ backgroundImage: `linear-gradient(180deg,#fff, ${featRarity.color})` }}>{theme.name.split(" ")[0]}</span>
                  <span className="block text-3xl sm:text-5xl text-white/90">{theme.name.split(" ").slice(1).join(" ")}</span>
                </h1>
                <p className="text-sm sm:text-base text-slate-300 mt-3 max-w-md">{theme.tagline}</p>

                <div className="mt-5">
                  <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500 mb-0.5">Rate-Up Hero</p>
                  <h2 className="font-display text-3xl sm:text-5xl text-white leading-none">{featuredHero.name}</h2>
                  <div className="flex items-center gap-2 mt-1.5 text-sm" style={{ color: featRarity.color }}>
                    <span className="font-semibold">{featRarity.name}</span>
                    <span className="w-1 h-1 rounded-full bg-current opacity-60" />
                    <span className="flex items-center gap-1 text-slate-300">
                      {(() => { const EIcon = ELEMENT_ICON[featuredHero.element] || Sparkles; return <EIcon className="w-3.5 h-3.5" style={{ color: featElement.color }} />; })()}
                      {featuredHero.role}
                    </span>
                  </div>

                  {heroTags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {heroTags.map((t) => (
                        <span key={t} className="text-[11px] px-2.5 py-1 rounded-md bg-white/[0.06] border border-white/10 text-slate-200">{t}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ===================== Featured heroes row ===================== */}
          <div className="flex items-center gap-3 overflow-x-auto pb-1 mb-2 scrollbar-none" data-testid="featured-row">
            {featuredSet.map((h, i) => {
              const r = RARITY[h.rarity] || RARITY.R;
              const fr = rarityFrame(h.rarity);
              const isRateUp = i === 0;
              return (
                <div key={h.id} className="shrink-0 w-[88px] sm:w-[104px]">
                  <div className={`relative rounded-xl overflow-hidden ${auraClass(h.rarity)}`} style={{ border: `${fr.strokeWidth}px solid ${fr.strokeColor}`, "--glow": fr.useGold ? GOLD.base : r.color }}>
                    {isRateUp && (
                      <span className="absolute top-1 left-1 z-10 text-[9px] font-extrabold px-1.5 py-0.5 rounded" style={{ background: r.color, color: "#05050A" }}>RATE-UP</span>
                    )}
                    <div className="aspect-[3/4] bg-black/40">
                      <img src={h.portrait} alt={h.name} className="w-full h-full object-cover object-top" loading="lazy" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                    </div>
                    {fr.cornerLevel >= 2 && <DecoCorners rarity={h.rarity} size={11} />}
                    <div className="absolute bottom-1 inset-x-1">
                      <p className="text-[11px] font-display tracking-wide text-white truncate">{h.name}</p>
                      <Stars rarity={h.rarity} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <button onClick={() => setFeaturedOpen(true)} data-testid="view-all-featured" className="text-xs font-semibold text-chakra hover:text-white transition-colors mb-5 inline-flex items-center gap-1">
            View All Featured <ChevronRight className="w-3.5 h-3.5" />
          </button>

          {/* ===================== GR pity module ===================== */}
          <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-4 sm:p-5 mb-5" data-testid="summon-pity-module">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${pityColor}18`, border: `1px solid ${pityColor}55` }}>
                  <Sparkles className="w-6 h-6" style={{ color: pityColor }} />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-slate-500">GR Pity</p>
                  <p className="font-display text-3xl leading-none" style={{ color: pityColor }} data-testid="summon-pity-count-text">
                    {pityCount}<span className="text-slate-500 text-lg"> / {hardPity}</span>
                  </p>
                </div>
              </div>

              <div className="flex-1 min-w-[180px]">
                <p className="text-sm text-slate-300">
                  Summon <span className="font-bold text-white" data-testid="pulls-to-pity">{pullsToPity}</span> more time(s) with Gems to guarantee a <span className="font-bold" style={{ color: pityColor }}>GR</span> hero.
                </p>
                <div className="h-2 rounded-full bg-black/50 overflow-hidden mt-2 relative">
                  <div className="h-full rounded-full" style={{ width: `${Math.min(100, (pityCount / hardPity) * 100)}%`, background: `linear-gradient(90deg,#D500F9,${pityColor})` }} />
                  <div className="absolute top-0 bottom-0 w-px bg-fox/80" style={{ left: `${(softPity / hardPity) * 100}%` }} title="Soft pity begins" />
                </div>
                <div className="flex items-center gap-2 mt-2">
                  {inSoftPity && <span className="text-[10px] font-bold tracking-widest px-2 py-0.5 rounded bg-fox/15 text-fox border border-fox/40" data-testid="soft-pity-active-chip">SOFT PITY ACTIVE</span>}
                  {pity.featured_guarantee && <span className="text-[10px] font-bold tracking-widest px-2 py-0.5 rounded bg-amber-400/15 text-amber-300 border border-amber-400/40" data-testid="featured-guarantee-chip">NEXT GR = FEATURED</span>}
                  <span className="text-[10px] font-bold tracking-widest px-2 py-0.5 rounded bg-white/5 text-slate-400 border border-white/10">GEM BANNER ONLY</span>
                </div>
              </div>

              <div className="text-center shrink-0">
                <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Guaranteed At</p>
                <div className="gold-crest w-12 h-12 mx-auto rounded-xl flex items-center justify-center">
                  <span className="font-display text-lg" style={{ color: GOLD.base }}>{hardPity}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ===================== Pull deck ===================== */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5 p-1 rounded-lg bg-white/[0.04] border border-white/10" data-testid="pay-mode-toggle">
              {["gems", "ryo"].map((c) => {
                const active = payMode === c;
                const Icon = c === "gems" ? Gem : Coins;
                return (
                  <button key={c} onClick={() => setPayMode(c)} data-testid={`pay-${c}`}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${active ? "bg-white/10 text-white" : "text-slate-400 hover:text-white"}`}>
                    <Icon className="w-3.5 h-3.5" style={{ color: c === "gems" ? "#D500F9" : "#FFCA28" }} /> {c === "gems" ? "Gems" : "Ryo"}
                  </button>
                );
              })}
            </div>
            <button onClick={() => setRatesOpen(true)} data-testid="summon-rates-open-button" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-chakra transition-colors">
              <Info className="w-3.5 h-3.5" /> Drop Rates
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <PullCard
              label="SUMMON ×1"
              icon={payMode === "gems" ? Gem : Coins}
              amount={heroX1}
              color={payMode === "gems" ? "#D500F9" : "#FFCA28"}
              disabled={busy || heroHave < heroX1}
              busy={busyKind === `${payMode}-1`}
              onClick={() => doHeroSummon(1, payMode)}
              testid="summon-x1-button"
            />
            <PullCard
              label="SUMMON ×10"
              icon={payMode === "gems" ? Gem : Coins}
              amount={heroX10}
              color={payMode === "gems" ? "#D500F9" : "#FFCA28"}
              ribbon="SR+ GUARANTEED"
              primary
              disabled={busy || heroHave < heroX10}
              busy={busyKind === `${payMode}-10`}
              onClick={() => doHeroSummon(10, payMode)}
              testid="summon-x10-button"
              sub="Every ×10 includes at least one SR or better"
            />
            <PullCard
              label="SUMMON ×1"
              icon={Ticket}
              amount={1}
              unit="Ticket"
              color="#FFCA28"
              disabled={busy || tickets < 1}
              busy={busyKind === `ticket-1`}
              onClick={() => doHeroSummon(1, "ticket")}
              testid="summon-ticket-button"
              sub={`Have: ${tickets} ticket${tickets === 1 ? "" : "s"}`}
            />
          </div>
          {heroHave < heroX1 && (
            <p className="text-xs text-fox mt-2 text-center" data-testid="summon-insufficient-text">
              Not enough {payMode === "gems" ? "Gems" : "Ryo"} — win battles and missions to earn more.
            </p>
          )}

          {/* ===================== Available heroes ===================== */}
          <div className="mt-8">
            <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
              <h3 className="font-display text-2xl sm:text-3xl tracking-wide text-white">AVAILABLE HEROES</h3>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none" data-testid="element-filters">
                {elementFilters.map((el) => {
                  const active = elementFilter === el;
                  const Icon = el === "ALL" ? Sparkles : (ELEMENT_ICON[el] || Sparkles);
                  const color = el === "ALL" ? "#00E5FF" : (ELEMENT[el]?.color || "#94a3b8");
                  return (
                    <button key={el} onClick={() => setElementFilter(el)} data-testid={`element-filter-${el}`}
                      className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                      style={active ? { background: `${color}22`, color, border: `1px solid ${color}` } : { color: "rgba(148,163,184,0.8)", border: "1px solid rgba(255,255,255,0.1)" }}>
                      <Icon className="w-3.5 h-3.5" /> {el === "ALL" ? "All" : el}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none" data-testid="available-heroes">
              {availableHeroes.map((h) => {
                const r = RARITY[h.rarity] || RARITY.R;
                const fr = rarityFrame(h.rarity);
                const owned = (user?.ninjas || []).some((n) => n.template_id === h.id);
                return (
                  <div key={h.id} className="shrink-0 w-[128px] sm:w-[144px]" data-testid={`available-hero-${h.id}`}>
                    <div className={`relative rounded-xl overflow-hidden ${auraClass(h.rarity)}`} style={{ border: `${fr.strokeWidth}px solid ${fr.strokeColor}`, "--glow": fr.useGold ? GOLD.base : r.color }}>
                      <span className="absolute top-1.5 right-1.5 z-10 text-[10px] font-display px-1.5 rounded" style={{ background: r.color, color: "#05050A" }}>{r.label}</span>
                      {owned && <span className="absolute top-1.5 left-1.5 z-10 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-white"><ShieldCheck className="w-3 h-3" /></span>}
                      <div className="aspect-[3/4] bg-black/40">
                        <img src={h.portrait} alt={h.name} className="w-full h-full object-cover object-top" loading="lazy" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 to-transparent" />
                      </div>
                      {fr.cornerLevel >= 2 && <DecoCorners rarity={h.rarity} size={14} />}
                      <div className="absolute bottom-1.5 inset-x-2">
                        <p className="text-xs font-display tracking-wide text-white truncate">{h.name}</p>
                        <Stars rarity={h.rarity} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ===================== Info cards ===================== */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
            <InfoCard icon={Percent} color="#FFCA28" title="Rates & Rules" sub="Drop rates, pity rules and more." onClick={() => setRatesOpen(true)} testid="open-rates-card" />
            <InfoCard icon={History} color="#00E5FF" title="Summon History" sub="Review your recent summon results." onClick={() => setHistoryOpen(true)} testid="open-history-card" />
          </div>

          {/* ===================== Recent summons ===================== */}
          {history.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display text-xl tracking-wide text-white">RECENT SUMMONS</h3>
                <button onClick={() => setHistoryOpen(true)} data-testid="view-all-history" className="text-xs font-semibold text-chakra hover:text-white transition-colors">View All History</button>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none" data-testid="recent-summons">
                {history.slice(0, 10).map((h, i) => {
                  const r = RARITY[h.rarity] || RARITY.R;
                  return (
                    <div key={i} className="shrink-0 flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/10">
                      <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0" style={{ border: `1px solid ${r.color}` }}>
                        {h.portrait ? <img src={h.portrait} alt={h.name} className="w-full h-full object-cover object-top" /> : <div className="w-full h-full" style={{ background: r.color }} />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-white truncate max-w-[96px]">{h.name}</p>
                        <p className="text-[10px]" style={{ color: r.color }}>{r.label} · <span className="text-slate-500">{relTime(h.ts)}</span></p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      ) : (
        /* ===================== GEAR ARMORY ===================== */
        <GearArmory
          gearConfig={gearConfig}
          user={user}
          gearTickets={gearTickets}
          busy={busy}
          busyKind={busyKind}
          onSummon={doGearSummon}
        />
      )}

      {/* ===================== Dialogs & overlay ===================== */}
      <Dialog open={ratesOpen} onOpenChange={setRatesOpen}>
        <DialogContent className="max-w-md bg-[#0B0B14] border border-white/15 rounded-2xl max-h-[85vh] overflow-y-auto" data-testid="summon-rates-dialog">
          <DialogTitle className="font-display text-2xl tracking-wide text-white">SUMMON RATES</DialogTitle>
          <DialogDescription className="text-xs text-slate-400">Transparent per-pull probabilities for the <span className="text-jutsu font-semibold">Gem banner</span>. Rates update automatically as new heroes join the catalog.</DialogDescription>
          <Table data-testid="summon-rates-table">
            <TableHeader>
              <TableRow className="border-white/10"><TableHead className="text-slate-400">Rarity</TableHead><TableHead className="text-right text-slate-400">Gem</TableHead><TableHead className="text-right text-slate-400">Gold</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(summonRates).map(([r, pct]) => (
                <TableRow key={r} className="border-white/5">
                  <TableCell className="font-bold" style={{ color: (RARITY[r] || RARITY.R).color }}>{(RARITY[r] || {}).name || r} ({r})</TableCell>
                  <TableCell className="text-right text-white tabular-nums">{pct}%</TableCell>
                  <TableCell className="text-right text-slate-400 tabular-nums">{(summonRatesRyo && summonRatesRyo[r] != null) ? `${summonRatesRyo[r]}%` : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="text-xs text-slate-400 space-y-1.5 mt-1">
            <p><span className="text-white font-semibold">GR pity (Gem banner only):</span> normal rate for pulls 1-{softPity - 1}; the chance climbs every pull from {softPity} and a GR is guaranteed by pull {hardPity}. Pulling a GR naturally resets the counter.</p>
            <p><span className="text-white font-semibold">Gold banner:</span> pay with Ryo for far lower rare rates and <span className="text-white">no pity system</span> — a budget option for volume pulls.</p>
            <p><span className="text-white font-semibold">Featured 50/50:</span> when a featured GR banner is live, your first GR has a 50% chance to be the featured hero — lose it and your next GR is guaranteed to be featured. Rate-up boosts the featured hero's own odds (relative), it is not a flat chance.</p>
            <p><span className="text-white font-semibold">×10 guarantee:</span> every ×10 contains at least one SR or better. Duplicates always convert to shards for Evolution.</p>
          </div>
          <button onClick={() => setRatesOpen(false)} data-testid="summon-rates-close-button" className="w-full py-2.5 rounded-xl font-semibold text-sm bg-white/5 border border-white/15 text-slate-200 hover:bg-white/10 transition-colors">Close</button>
        </DialogContent>
      </Dialog>

      <Dialog open={featuredOpen} onOpenChange={setFeaturedOpen}>
        <DialogContent className="max-w-lg bg-[#0B0B14] border border-white/15 rounded-2xl max-h-[85vh] overflow-y-auto" data-testid="featured-dialog">
          <DialogTitle className="font-display text-2xl tracking-wide text-white">FEATURED HEROES</DialogTitle>
          <DialogDescription className="text-xs text-slate-400">The rate-up star and the realm's rarest legends available in this banner.</DialogDescription>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 mt-1">
            {featuredAll.map((h) => {
              const r = RARITY[h.rarity] || RARITY.R;
              const fr = rarityFrame(h.rarity);
              return (
                <div key={h.id} className={`relative rounded-lg overflow-hidden ${auraClass(h.rarity)}`} style={{ border: `${fr.strokeWidth}px solid ${fr.strokeColor}`, "--glow": fr.useGold ? GOLD.base : r.color }}>
                  <div className="aspect-[3/4] bg-black/40">
                    <img src={h.portrait} alt={h.name} className="w-full h-full object-cover object-top" loading="lazy" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 to-transparent" />
                  </div>
                  {fr.cornerLevel >= 2 && <DecoCorners rarity={h.rarity} size={12} />}
                  <div className="absolute bottom-1 inset-x-1.5">
                    <p className="text-[11px] font-display text-white truncate">{h.name}</p>
                    <Stars rarity={h.rarity} className="w-2.5 h-2.5" />
                  </div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-md bg-[#0B0B14] border border-white/15 rounded-2xl max-h-[85vh] overflow-y-auto" data-testid="summon-history-dialog">
          <DialogTitle className="font-display text-2xl tracking-wide text-white">SUMMON HISTORY</DialogTitle>
          <DialogDescription className="text-xs text-slate-400">Your most recent summon results on this device.</DialogDescription>
          {history.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">No summons yet — pull a banner to begin your collection.</p>
          ) : (
            <div className="space-y-1.5">
              {history.map((h, i) => {
                const r = RARITY[h.rarity] || RARITY.R;
                return (
                  <div key={i} className="flex items-center gap-3 px-2 py-1.5 rounded-lg bg-white/[0.03] border border-white/10">
                    <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0" style={{ border: `1px solid ${r.color}` }}>
                      {h.portrait ? <img src={h.portrait} alt={h.name} className="w-full h-full object-cover object-top" /> : <div className="w-full h-full" style={{ background: r.color }} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{h.name}</p>
                      <p className="text-[11px]" style={{ color: r.color }}>{r.name}</p>
                    </div>
                    <span className="text-[11px] text-slate-500 shrink-0">{relTime(h.ts)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <SummonRevealOverlay open={!!reveal} results={reveal || []} onClose={() => setReveal(null)} />
    </div>
  );
}

// --------------------------------------------------------------------------
// Sub-components
// --------------------------------------------------------------------------
const ResourcePill = ({ icon: Icon, color, label, value, onAdd, testid }) => (
  <div className="shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/10" data-testid={testid}>
    <Icon className="w-4 h-4 shrink-0" style={{ color }} />
    <div className="leading-none">
      <p className="text-[9px] uppercase tracking-widest text-slate-500 whitespace-nowrap">{label}</p>
      <p className="font-display text-base text-white leading-tight tabular-nums">{value.toLocaleString()}</p>
    </div>
    {onAdd && (
      <button onClick={onAdd} data-testid={`${testid}-add`} className="w-6 h-6 rounded-md bg-white/5 border border-white/10 flex items-center justify-center text-slate-300 hover:bg-white/10 transition-colors">
        <Plus className="w-3.5 h-3.5" />
      </button>
    )}
  </div>
);

const ModeTab = ({ active, onClick, icon: Icon, label, color, testid }) => (
  <button onClick={onClick} data-testid={testid}
    className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl font-display text-base sm:text-lg tracking-wider transition-colors"
    style={active ? { background: `${color}1f`, color, border: `1px solid ${color}66` } : { color: "rgba(148,163,184,0.8)", border: "1px solid rgba(255,255,255,0.1)" }}>
    <Icon className="w-5 h-5" /> {label}
  </button>
);

const PullCard = ({ label, icon: Icon, amount, unit, color, ribbon, sub, primary, disabled, busy, onClick, testid }) => (
  <button onClick={onClick} disabled={disabled} data-testid={testid}
    className={`relative flex flex-col items-center justify-center gap-1.5 py-5 px-3 rounded-2xl overflow-hidden transition-all disabled:opacity-40 ${
      primary ? "shine-sweep" : ""
    }`}
    style={primary
      ? { background: "linear-gradient(135deg,#3a2a08,#1a1406)", border: "1.5px solid #FFCA2866", boxShadow: "0 0 30px #FFCA2822" }
      : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)" }}>
    {ribbon && (
      <span className="absolute top-0 right-0 text-[9px] font-extrabold tracking-wider px-2 py-0.5 rounded-bl-lg" style={{ background: "#FFCA28", color: "#05050A" }}>{ribbon}</span>
    )}
    <span className="flex items-center gap-2 font-display text-xl sm:text-2xl tracking-wider text-white">
      {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" style={{ color: primary ? "#FFCA28" : color }} />}
      {label}
    </span>
    <span className="flex items-center gap-1.5 text-base font-bold" style={{ color }}>
      <Icon className="w-4 h-4" /> {amount.toLocaleString()}{unit ? ` ${unit}` : ""}
    </span>
    {sub && <span className="text-[10px] text-slate-400 text-center leading-tight">{sub}</span>}
  </button>
);

const InfoCard = ({ icon: Icon, color, title, sub, onClick, testid }) => (
  <button onClick={onClick} data-testid={testid} className="flex items-center gap-3 p-4 rounded-2xl bg-white/[0.03] border border-white/10 hover:bg-white/[0.06] transition-colors text-left">
    <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${color}18`, border: `1px solid ${color}44` }}>
      <Icon className="w-5 h-5" style={{ color }} />
    </div>
    <div className="flex-1 min-w-0">
      <p className="font-display text-lg tracking-wide text-white">{title}</p>
      <p className="text-xs text-slate-400">{sub}</p>
    </div>
    <ChevronRight className="w-5 h-5 text-slate-500 shrink-0" />
  </button>
);

const GearArmory = ({ gearConfig, user, gearTickets, busy, busyKind, onSummon }) => {
  const gemCost = gearConfig?.summon_gem_cost || 90;
  const gems = user?.gems || 0;
  const rarityMeta = gearConfig?.rarity_meta || {};
  const topRarity = Object.keys(rarityMeta).slice(-1)[0];
  return (
    <div data-testid="gear-armory">
      <div className="relative rounded-3xl overflow-hidden mb-5 min-h-[220px] p-6 sm:p-8 flex flex-col justify-end"
        style={{ border: "1px solid #FF572255", boxShadow: "0 0 60px #FF572218" }}>
        <div className="absolute inset-0" style={{ background: "radial-gradient(120% 90% at 80% 10%, #FF572233, transparent 55%)" }} />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B14] via-[#0B0B14aa] to-transparent" />
        <Anvil className="absolute right-6 top-6 w-24 h-24 text-fox/20" />
        <div className="relative z-10">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-extrabold tracking-widest bg-fox/15 text-fox border border-fox/40 mb-3"><Anvil className="w-3.5 h-3.5" /> THE ARMORY</span>
          <h1 className="font-display text-4xl sm:text-6xl tracking-wide text-white leading-none">GEAR FOUNDRY</h1>
          <p className="text-sm text-slate-300 mt-2 max-w-md">Forge-blessed gear drops from the vault — every ×10 guarantees an Epic or better.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-3">
          <p className="text-[10px] uppercase tracking-widest text-slate-500">Pay with Gems ({gems.toLocaleString()})</p>
          <PullCard label="ARMORY ×1" icon={Gem} amount={gemCost} color="#D500F9" disabled={busy || gems < gemCost} busy={busyKind === "gear-gems-1"} onClick={() => onSummon(1, "gems")} testid="gear-x1-button" />
          <PullCard label="ARMORY ×10" icon={Gem} amount={gemCost * 10} color="#D500F9" ribbon="EPIC+ GUARANTEED" primary disabled={busy || gems < gemCost * 10} busy={busyKind === "gear-gems-10"} onClick={() => onSummon(10, "gems")} testid="gear-x10-button" sub="Every ×10 includes an Epic or better" />
        </div>
        <div className="space-y-3">
          <p className="text-[10px] uppercase tracking-widest text-slate-500">Pay with Armory Tickets ({gearTickets})</p>
          <PullCard label="ARMORY ×1" icon={Ticket} amount={1} unit="Ticket" color="#FFCA28" disabled={busy || gearTickets < 1} busy={busyKind === "gear-ticket-1"} onClick={() => onSummon(1, "ticket")} testid="gear-ticket-x1-button" sub={`Have: ${gearTickets} ticket${gearTickets === 1 ? "" : "s"}`} />
          <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-4">
            <p className="text-xs uppercase tracking-widest text-slate-500 mb-2">Gear Rarities</p>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(rarityMeta).map(([rk, meta]) => (
                <span key={rk} className="text-[11px] px-2 py-1 rounded-md border" style={{ color: meta.color, borderColor: `${meta.color}55`, background: `${meta.color}12` }}>{meta.name || rk}</span>
              ))}
            </div>
            {topRarity && <p className="text-[10px] text-slate-500 mt-2">Highest tier: <span style={{ color: rarityMeta[topRarity].color }}>{rarityMeta[topRarity].name}</span> — equip &amp; enhance in the Forge.</p>}
          </div>
        </div>
      </div>
    </div>
  );
};
