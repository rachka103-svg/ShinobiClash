import { useEffect, useMemo, useState } from "react";
import {
  Sparkles, Coins, Gem, Loader2, Ticket, Star, Info, ChevronRight, Clock,
  History, Anvil, Flame, Droplet, Wind as WindIcon, Users2,
  Mountain, Zap, Moon, Sun, ShieldCheck, LayoutGrid, Gift,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { useGame } from "@/context/GameContext";
import api, { formatApiErrorDetail } from "@/lib/api";
import { RARITY, ELEMENT } from "@/lib/styles";
import { rarityFrame, GOLD } from "@/lib/theme";
import { auraClass, DecoCorners } from "@/components/RarityFx";
import SummonRevealOverlay from "@/components/SummonRevealOverlay";
import NewbieSummonOverlay from "@/components/NewbieSummonOverlay";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// ---------------------------------------------------------------------------
// Static, data-driven presentation helpers (purely cosmetic theming derived
// from the live featured hero + catalog — no fabricated game state).
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
  const day = d.getUTCDay();
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
 * SUMMONING SANCTUM — a single-viewport, no-scroll gacha experience for PC and
 * mobile. The cinematic banner occupies the left/top hero region; a tight
 * control rail on the right/bottom holds pity, pay-mode, and pull actions.
 * Secondary panels (Featured, Available roster, Rates, History) are folded into
 * dialogs so the entire page always fits one screen without scrolling.
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
  const [availableOpen, setAvailableOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [elementFilter, setElementFilter] = useState("ALL");
  const [history, setHistory] = useState([]);
  const [newbieOpen, setNewbieOpen] = useState(false);

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
    return [featuredHero, ...rest].slice(0, 5);
  }, [featuredHero, catalog]);
  const featuredAll = useMemo(
    () => [...catalog].sort((a, b) => RARITY_ORDER[b.rarity] - RARITY_ORDER[a.rarity] || a.name.localeCompare(b.name)).slice(0, 12),
    [catalog]
  );

  // ----- Available heroes (dialog) -----
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

  // Hero pull costs
  const gemX1 = gemCosts.summon;
  const ryoX1 = summonCost;
  const heroX1 = payMode === "gems" ? gemX1 : ryoX1;
  const heroX10 = heroX1 * 10;
  const heroHave = payMode === "gems" ? (user?.gems || 0) : (user?.ryo || 0);
  const payColor = payMode === "gems" ? "#D500F9" : "#FFCA28";

  const isHero = mode === "hero";

  return (
    <div
      data-testid="summon-page"
      className="h-full max-w-6xl mx-auto px-3 sm:px-5 py-2.5 sm:py-3 flex flex-col overflow-hidden min-w-0"
    >
      {/* ===================== Single-view body ===================== */}
      {(
        <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-2.5 lg:gap-4">
          {/* -------- LEFT: cinematic banner -------- */}
          {featuredHero ? (
            <div
              className="relative rounded-2xl sm:rounded-3xl overflow-hidden flex-1 min-h-[150px] lg:flex-none lg:basis-[57%] lg:h-full"
              style={{ border: `1px solid ${featRarity.color}55`, boxShadow: `0 0 60px ${featRarity.color}22` }}
              data-testid="summon-banner"
            >
              {/* Art */}
              <div className="absolute inset-0">
                <img src={featuredHero.portrait} alt={featuredHero.name} className="absolute right-0 top-0 h-full w-full object-cover object-top" />
                <div className="absolute inset-0" style={{ background: `linear-gradient(90deg, #FFFFFF 12%, #FFFFFFbb 40%, transparent 80%)` }} />
                <div className="absolute inset-0" style={{ background: `radial-gradient(120% 80% at 85% 25%, ${featElement.color || "#7C4DFF"}33, transparent 60%)` }} />
                <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#FFFFFF] to-transparent" />
              </div>

              <div className="gold-pinstripe absolute top-0 inset-x-0 z-10" />
              <DecoCorners level={rarityFrame(featuredHero.rarity).useGold ? 4 : 3} color={rarityFrame(featuredHero.rarity).useGold ? GOLD.base : featRarity.color} size={24} />

              {/* Copy */}
              <div className="relative z-10 h-full flex flex-col p-4 sm:p-6">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-extrabold tracking-widest" style={{ background: `${featRarity.color}22`, color: featRarity.color, border: `1px solid ${featRarity.color}66` }}>
                    <Sparkles className="w-3.5 h-3.5" /> LIMITED SUMMON
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-600" data-testid="banner-countdown">
                    <Clock className="w-3.5 h-3.5 text-chakra" /> {countdown}
                  </span>
                </div>

                <div className="mt-3 max-w-[92%] sm:max-w-[64%]">
                  <h1 className="font-display leading-[0.86] tracking-wide">
                    <span className="block text-3xl sm:text-5xl text-transparent bg-clip-text" style={{ backgroundImage: `linear-gradient(180deg,#fff, ${featRarity.color})` }}>{theme.name.split(" ")[0]}</span>
                    <span className="block text-2xl sm:text-4xl text-ink/90">{theme.name.split(" ").slice(1).join(" ")}</span>
                  </h1>
                  <p className="hidden sm:block text-sm text-slate-600 mt-2 max-w-md">{theme.tagline}</p>
                </div>

                {/* Rate-up hero — pinned toward the bottom */}
                <div className="mt-auto">
                  <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500 mb-0.5">Rate-Up Hero</p>
                  <h2 className="font-display text-2xl sm:text-4xl text-ink leading-none">{featuredHero.name}</h2>
                  <div className="flex items-center gap-2 mt-1.5 text-xs sm:text-sm" style={{ color: featRarity.color }}>
                    <span className="font-semibold">{featRarity.name}</span>
                    <span className="w-1 h-1 rounded-full bg-current opacity-60" />
                    <span className="flex items-center gap-1 text-slate-600">
                      {(() => { const EIcon = ELEMENT_ICON[featuredHero.element] || Sparkles; return <EIcon className="w-3.5 h-3.5" style={{ color: featElement.color }} />; })()}
                      {featuredHero.role}
                    </span>
                  </div>
                  {heroTags.length > 0 && (
                    <div className="hidden sm:flex flex-wrap gap-1.5 mt-2">
                      {heroTags.map((t) => (
                        <span key={t} className="text-[10px] px-2 py-0.5 rounded-md bg-black/[0.05] border border-black/10 text-slate-700">{t}</span>
                      ))}
                    </div>
                  )}

                  {/* Featured mini-row */}
                  <div className="flex items-center gap-2 mt-3">
                    <div className="flex -space-x-2">
                      {featuredSet.slice(0, 5).map((h) => {
                        const r = RARITY[h.rarity] || RARITY.R;
                        return (
                          <div key={h.id} className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg overflow-hidden shrink-0 ring-1" style={{ ["--tw-ring-color"]: r.color, borderColor: r.color }}>
                            <img src={h.portrait} alt={h.name} className="w-full h-full object-cover object-top" loading="lazy" />
                          </div>
                        );
                      })}
                    </div>
                    <button onClick={() => setFeaturedOpen(true)} data-testid="view-all-featured" className="text-[11px] font-semibold text-chakra hover:text-ink transition-colors inline-flex items-center gap-0.5">
                      View Featured <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 rounded-2xl bg-black/[0.04] border border-black/10 flex items-center justify-center">
              <p className="text-slate-500 text-sm">No banner available yet.</p>
            </div>
          )}

          {/* -------- RIGHT: control rail -------- */}
          <div className="shrink-0 lg:basis-[43%] lg:h-full lg:min-h-0 flex flex-col gap-2.5" data-testid="summon-control-rail">
            {/* Beginner summon — one-time free ×10 with re-rolls */}
            {user?.newbie_summon && !user.newbie_summon.used && (
              <button
                onClick={() => setNewbieOpen(true)}
                data-testid="newbie-summon-entry"
                className="relative shrink-0 text-left p-3 rounded-2xl overflow-hidden shine-sweep"
                style={{ background: "linear-gradient(135deg,#0c3b2e,#062018)", border: "1.5px solid #00E67666", boxShadow: "0 0 24px #00E67622" }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(0,229,118,0.18)", border: "1px solid rgba(0,229,118,0.5)" }}>
                    <Gift className="w-5 h-5 text-emerald-300" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-base text-emerald-200 leading-none tracking-wide">BEGINNER SUMMON</p>
                    <p className="text-[11px] text-slate-300 mt-1 leading-tight">Free ×10 — re-roll up to {user.newbie_summon.max_rolls - 1} times, keep your favorites.</p>
                  </div>
                  <Sparkles className="w-4 h-4 text-emerald-300 shrink-0" />
                </div>
                <span className="absolute top-0 right-0 text-[9px] font-extrabold tracking-wider px-1.5 py-0.5 rounded-bl-lg bg-emerald-500 text-[#05050A]">FREE</span>
              </button>
            )}

            {/* Pity compact */}
            <div className="rounded-2xl bg-black/[0.04] border border-black/10 p-3 shrink-0" data-testid="summon-pity-module">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${pityColor}18`, border: `1px solid ${pityColor}55` }}>
                    <Sparkles className="w-5 h-5" style={{ color: pityColor }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] uppercase tracking-widest text-slate-500 leading-none">GR Pity · Gems only</p>
                    <p className="font-display text-2xl leading-none mt-0.5" style={{ color: pityColor }} data-testid="summon-pity-count-text">
                      {pityCount}<span className="text-slate-500 text-base"> / {hardPity}</span>
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[9px] uppercase tracking-widest text-slate-500 leading-none">To Guarantee</p>
                  <p className="font-display text-lg leading-none mt-0.5" style={{ color: GOLD.base }} data-testid="pulls-to-pity">{pullsToPity}</p>
                </div>
              </div>
              <div className="h-1.5 rounded-full bg-black/50 overflow-hidden mt-2 relative">
                <div className="h-full rounded-full" style={{ width: `${Math.min(100, (pityCount / hardPity) * 100)}%`, background: `linear-gradient(90deg,#D500F9,${pityColor})` }} />
                <div className="absolute top-0 bottom-0 w-px bg-fox/80" style={{ left: `${(softPity / hardPity) * 100}%` }} title="Soft pity begins" />
              </div>
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                {inSoftPity && <span className="text-[9px] font-bold tracking-widest px-1.5 py-0.5 rounded bg-fox/15 text-fox border border-fox/40" data-testid="soft-pity-active-chip">SOFT PITY</span>}
                {pity.featured_guarantee && <span className="text-[9px] font-bold tracking-widest px-1.5 py-0.5 rounded bg-amber-400/15 text-amber-300 border border-amber-400/40" data-testid="featured-guarantee-chip">NEXT GR = FEATURED</span>}
              </div>
            </div>

            {/* Pay toggle + rates */}
            <div className="flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-1 p-1 rounded-lg bg-black/[0.04] border border-black/10" data-testid="pay-mode-toggle">
                {["gems", "ryo"].map((c) => {
                  const active = payMode === c;
                  const Icon = c === "gems" ? Gem : Coins;
                  return (
                    <button key={c} onClick={() => setPayMode(c)} data-testid={`pay-${c}`}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${active ? "bg-black/[0.06] text-ink" : "text-slate-500 hover:text-ink"}`}>
                      <Icon className="w-3.5 h-3.5" style={{ color: c === "gems" ? "#D500F9" : "#FFCA28" }} /> {c === "gems" ? "Gems" : "Ryo"}
                    </button>
                  );
                })}
              </div>
              <button onClick={() => setRatesOpen(true)} data-testid="summon-rates-open-button" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-chakra transition-colors">
                <Info className="w-3.5 h-3.5" /> Rates
              </button>
            </div>

            {/* Pull deck */}
            <div className="grid grid-cols-2 gap-2 shrink-0">
              <PullButton
                label="SUMMON ×1"
                icon={payMode === "gems" ? Gem : Coins}
                amount={heroX1}
                color={payColor}
                disabled={busy || heroHave < heroX1}
                busy={busyKind === `${payMode}-1`}
                onClick={() => doHeroSummon(1, payMode)}
                testid="summon-x1-button"
              />
              <PullButton
                label="SUMMON ×10"
                icon={payMode === "gems" ? Gem : Coins}
                amount={heroX10}
                color={payColor}
                ribbon="SR+"
                primary
                disabled={busy || heroHave < heroX10}
                busy={busyKind === `${payMode}-10`}
                onClick={() => doHeroSummon(10, payMode)}
                testid="summon-x10-button"
              />
            </div>
            <PullButton
              label="TICKET SUMMON ×1"
              icon={Ticket}
              amount={1}
              unit="Ticket"
              color="#FFCA28"
              slim
              disabled={busy || tickets < 1}
              busy={busyKind === `ticket-1`}
              onClick={() => doHeroSummon(1, "ticket")}
              testid="summon-ticket-button"
              sub={`Have ${tickets} ticket${tickets === 1 ? "" : "s"}`}
            />
            {heroHave < heroX1 && (
              <p className="text-[11px] text-fox text-center shrink-0" data-testid="summon-insufficient-text">
                Not enough {payMode === "gems" ? "Gems" : "Ryo"} — win battles &amp; missions to earn more.
              </p>
            )}

            {/* Desktop-only showcase — fills the rail's mid space without adding mobile height */}
            <div className="hidden lg:flex flex-col flex-1 min-h-0 rounded-2xl bg-black/[0.04] border border-black/10 p-3 overflow-hidden" data-testid="banner-showcase">
              <div className="flex items-center justify-between mb-2 shrink-0">
                <p className="text-[10px] uppercase tracking-widest text-slate-500">In This Banner</p>
                <button onClick={() => setAvailableOpen(true)} className="text-[11px] font-semibold text-chakra hover:text-ink transition-colors inline-flex items-center gap-0.5" data-testid="showcase-view-all">
                  View All <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-4 gap-2 overflow-y-auto scrollbar-none min-h-0">
                {featuredAll.map((h) => {
                  const r = RARITY[h.rarity] || RARITY.R;
                  const fr = rarityFrame(h.rarity);
                  return (
                    <div key={h.id} className="relative rounded-lg overflow-hidden" style={{ border: `${fr.strokeWidth}px solid ${fr.strokeColor}` }}>
                      <div className="aspect-[3/4] bg-black/40">
                        <img src={h.portrait} alt={h.name} className="w-full h-full object-cover object-top" loading="lazy" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 to-transparent" />
                      </div>
                      <span className="absolute top-0.5 right-0.5 text-[8px] font-display px-1 rounded" style={{ background: r.color, color: "#05050A" }}>{r.label}</span>
                      <p className="absolute bottom-0.5 inset-x-1 text-[9px] font-display text-ink truncate">{h.name}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick access — folds secondary panels into dialogs */}
            <div className="grid grid-cols-3 gap-2 shrink-0 mt-auto pt-1" data-testid="summon-quick-access">
              <QuickBtn icon={Users2} color="#00E5FF" label="Roster" onClick={() => setAvailableOpen(true)} testid="open-available-card" />
              <QuickBtn icon={Star} color="#FFCA28" label="Featured" onClick={() => setFeaturedOpen(true)} testid="open-featured-card" />
              <QuickBtn icon={History} color="#D500F9" label="History" onClick={() => setHistoryOpen(true)} testid="open-history-card" />
            </div>
          </div>
        </div>
      )}

      {/* ===================== Dialogs & overlay ===================== */}
      <Dialog open={ratesOpen} onOpenChange={setRatesOpen}>
        <DialogContent className="max-w-md bg-[#FFFFFF] border border-black/12 rounded-2xl max-h-[85vh] overflow-y-auto" data-testid="summon-rates-dialog">
          <DialogTitle className="font-display text-2xl tracking-wide text-ink">SUMMON RATES</DialogTitle>
          <DialogDescription className="text-xs text-slate-500">Transparent per-pull probabilities. The <span className="text-jutsu font-semibold">Gem banner</span> carries GR pity; the <span className="text-amber-300 font-semibold">Ryo banner</span> does not.</DialogDescription>
          <Table data-testid="summon-rates-table">
            <TableHeader>
              <TableRow className="border-black/10"><TableHead className="text-slate-500">Rarity</TableHead><TableHead className="text-right text-slate-500">Gem</TableHead><TableHead className="text-right text-slate-500">Ryo</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(summonRates).map(([r, pct]) => (
                <TableRow key={r} className="border-white/5">
                  <TableCell className="font-bold" style={{ color: (RARITY[r] || RARITY.R).color }}>{(RARITY[r] || {}).name || r} ({r})</TableCell>
                  <TableCell className="text-right text-ink tabular-nums">{pct}%</TableCell>
                  <TableCell className="text-right text-slate-500 tabular-nums">{(summonRatesRyo && summonRatesRyo[r] != null) ? `${summonRatesRyo[r]}%` : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="text-xs text-slate-500 space-y-1.5 mt-1">
            <p><span className="text-ink font-semibold">GR pity (Gem banner only):</span> normal rate for pulls 1-{softPity - 1}; the chance climbs every pull from {softPity} and a GR is guaranteed by pull {hardPity}. Pulling a GR naturally resets the counter.</p>
            <p><span className="text-ink font-semibold">Ryo banner:</span> pay with Ryo for far lower rare rates and <span className="text-ink">no pity system</span> — a budget option for volume pulls.</p>
            <p><span className="text-ink font-semibold">Featured 50/50:</span> when a featured GR banner is live, your first GR has a 50% chance to be the featured hero — lose it and your next GR is guaranteed featured.</p>
            <p><span className="text-ink font-semibold">×10 guarantee:</span> every ×10 contains at least one SR or better. Duplicates always convert to shards for Evolution.</p>
          </div>
          <button onClick={() => setRatesOpen(false)} data-testid="summon-rates-close-button" className="w-full py-2.5 rounded-xl font-semibold text-sm bg-black/[0.04] border border-black/12 text-slate-700 hover:bg-black/10 transition-colors">Close</button>
        </DialogContent>
      </Dialog>

      <Dialog open={featuredOpen} onOpenChange={setFeaturedOpen}>
        <DialogContent className="max-w-lg bg-[#FFFFFF] border border-black/12 rounded-2xl max-h-[85vh] overflow-y-auto" data-testid="featured-dialog">
          <DialogTitle className="font-display text-2xl tracking-wide text-ink">FEATURED HEROES</DialogTitle>
          <DialogDescription className="text-xs text-slate-500">The rate-up star and the realm's rarest legends available in this banner.</DialogDescription>
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
                    <p className="text-[11px] font-display text-ink truncate">{h.name}</p>
                    <Stars rarity={h.rarity} className="w-2.5 h-2.5" />
                  </div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={availableOpen} onOpenChange={setAvailableOpen}>
        <DialogContent className="max-w-2xl bg-[#FFFFFF] border border-black/12 rounded-2xl max-h-[85vh] overflow-y-auto" data-testid="available-dialog">
          <DialogTitle className="font-display text-2xl tracking-wide text-ink">AVAILABLE HEROES</DialogTitle>
          <DialogDescription className="text-xs text-slate-500">Every hero currently obtainable from this banner. Owned heroes are marked.</DialogDescription>
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
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5 mt-1" data-testid="available-heroes">
            {availableHeroes.map((h) => {
              const r = RARITY[h.rarity] || RARITY.R;
              const fr = rarityFrame(h.rarity);
              const owned = (user?.ninjas || []).some((n) => n.template_id === h.id);
              return (
                <div key={h.id} className={`relative rounded-lg overflow-hidden ${auraClass(h.rarity)}`} style={{ border: `${fr.strokeWidth}px solid ${fr.strokeColor}`, "--glow": fr.useGold ? GOLD.base : r.color }} data-testid={`available-hero-${h.id}`}>
                  <span className="absolute top-1 right-1 z-10 text-[9px] font-display px-1 rounded" style={{ background: r.color, color: "#05050A" }}>{r.label}</span>
                  {owned && <span className="absolute top-1 left-1 z-10 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center text-ink"><ShieldCheck className="w-2.5 h-2.5" /></span>}
                  <div className="aspect-[3/4] bg-black/40">
                    <img src={h.portrait} alt={h.name} className="w-full h-full object-cover object-top" loading="lazy" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 to-transparent" />
                  </div>
                  {fr.cornerLevel >= 2 && <DecoCorners rarity={h.rarity} size={11} />}
                  <div className="absolute bottom-1 inset-x-1.5">
                    <p className="text-[10px] font-display text-ink truncate">{h.name}</p>
                    <Stars rarity={h.rarity} className="w-2.5 h-2.5" />
                  </div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-md bg-[#FFFFFF] border border-black/12 rounded-2xl max-h-[85vh] overflow-y-auto" data-testid="summon-history-dialog">
          <DialogTitle className="font-display text-2xl tracking-wide text-ink">SUMMON HISTORY</DialogTitle>
          <DialogDescription className="text-xs text-slate-500">Your most recent summon results on this device.</DialogDescription>
          {history.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">No summons yet — pull a banner to begin your collection.</p>
          ) : (
            <div className="space-y-1.5">
              {history.map((h, i) => {
                const r = RARITY[h.rarity] || RARITY.R;
                return (
                  <div key={i} className="flex items-center gap-3 px-2 py-1.5 rounded-lg bg-black/[0.04] border border-black/10">
                    <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0" style={{ border: `1px solid ${r.color}` }}>
                      {h.portrait ? <img src={h.portrait} alt={h.name} className="w-full h-full object-cover object-top" /> : <div className="w-full h-full" style={{ background: r.color }} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-ink truncate">{h.name}</p>
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
      <NewbieSummonOverlay open={newbieOpen} onClose={() => setNewbieOpen(false)} setUser={setUser} />
    </div>
  );
}

// --------------------------------------------------------------------------
// Sub-components
// --------------------------------------------------------------------------
const ModeTab = ({ active, onClick, icon: Icon, label, color, testid }) => (
  <button onClick={onClick} data-testid={testid}
    className="flex-1 inline-flex items-center justify-center gap-2 py-2 rounded-xl font-display text-sm sm:text-base tracking-wider transition-colors"
    style={active ? { background: `${color}1f`, color, border: `1px solid ${color}66` } : { color: "rgba(148,163,184,0.8)", border: "1px solid rgba(255,255,255,0.1)" }}>
    <Icon className="w-4 h-4 sm:w-5 sm:h-5" /> {label}
  </button>
);

const PullButton = ({ label, icon: Icon, amount, unit, color, ribbon, sub, primary, slim, disabled, busy, onClick, testid }) => (
  <button onClick={onClick} disabled={disabled} data-testid={testid}
    className={`relative flex overflow-hidden transition-all disabled:opacity-40 ${
      slim
        ? "items-center justify-center gap-2 py-2.5 px-3 rounded-xl flex-row"
        : "flex-col items-center justify-center gap-1 py-3.5 px-2 rounded-2xl"
    } ${primary ? "shine-sweep" : ""}`}
    style={primary
      ? { background: "linear-gradient(135deg,#3a2a08,#1a1406)", border: "1.5px solid #FFCA2866", boxShadow: "0 0 24px #FFCA2822" }
      : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)" }}>
    {ribbon && (
      <span className="absolute top-0 right-0 text-[9px] font-extrabold tracking-wider px-1.5 py-0.5 rounded-bl-lg" style={{ background: "#FFCA28", color: "#05050A" }}>{ribbon}</span>
    )}
    <span className="flex items-center gap-1.5 font-display text-base sm:text-lg tracking-wider text-ink leading-none">
      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" style={{ color: primary ? "#FFCA28" : color }} />}
      {label}
    </span>
    <span className="flex items-center gap-1 text-sm font-bold leading-none" style={{ color }}>
      <Icon className="w-3.5 h-3.5" /> {amount.toLocaleString()}{unit ? ` ${unit}` : ""}
    </span>
    {sub && !slim && <span className="text-[9px] text-slate-500 text-center leading-tight">{sub}</span>}
    {sub && slim && <span className="text-[10px] text-slate-500 leading-none">· {sub}</span>}
  </button>
);

const QuickBtn = ({ icon: Icon, color, label, onClick, testid }) => (
  <button onClick={onClick} data-testid={testid} className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-black/[0.04] border border-black/10 hover:bg-black/[0.05] transition-colors">
    <Icon className="w-4 h-4" style={{ color }} />
    <span className="text-xs font-semibold text-slate-700">{label}</span>
  </button>
);

// --------------------------------------------------------------------------
// GEAR ARMORY — single-view sibling of the hero banner.
// --------------------------------------------------------------------------
const GearArmory = ({ gearConfig, user, gearTickets, busy, busyKind, onSummon }) => {
  const gemCost = gearConfig?.summon_gem_cost || 90;
  const gems = user?.gems || 0;
  const rarityMeta = gearConfig?.rarity_meta || {};
  const topRarity = Object.keys(rarityMeta).slice(-1)[0];
  return (
    <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-2.5 lg:gap-4" data-testid="gear-armory">
      {/* Cinematic gear banner */}
      <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden flex-1 min-h-[150px] lg:flex-none lg:basis-[57%] lg:h-full p-4 sm:p-6 flex flex-col justify-center"
        style={{ border: "1px solid #FF572255", boxShadow: "0 0 60px #FF572218" }}>
        <div className="absolute inset-0" style={{ background: "radial-gradient(120% 90% at 80% 10%, #FF572233, transparent 55%)" }} />
        <div className="absolute inset-0 bg-gradient-to-t from-[#FFFFFF] via-[#FFFFFFaa] to-transparent" />
        <Anvil className="absolute right-6 top-1/2 -translate-y-1/2 w-40 h-40 text-fox/15" />
        <div className="gold-pinstripe absolute top-0 inset-x-0 z-10" />
        <div className="relative z-10">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-extrabold tracking-widest bg-fox/15 text-fox border border-fox/40 mb-2"><Anvil className="w-3.5 h-3.5" /> THE ARMORY</span>
          <h1 className="font-display text-4xl sm:text-6xl tracking-wide text-ink leading-none">GEAR FOUNDRY</h1>
          <p className="text-sm text-slate-600 mt-2 max-w-md">Forge-blessed gear drops from the vault — every ×10 guarantees an Epic or better.</p>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {Object.entries(rarityMeta).map(([rk, meta]) => (
              <span key={rk} className="text-[11px] px-2 py-1 rounded-md border" style={{ color: meta.color, borderColor: `${meta.color}55`, background: `${meta.color}12` }}>{meta.name || rk}</span>
            ))}
          </div>
          {topRarity && <p className="text-[10px] text-slate-500 mt-2">Highest tier: <span style={{ color: rarityMeta[topRarity].color }}>{rarityMeta[topRarity].name}</span> — equip &amp; enhance in the Forge.</p>}
        </div>
      </div>

      {/* Gear control rail */}
      <div className="shrink-0 lg:basis-[43%] lg:h-full lg:min-h-0 flex flex-col gap-2.5 lg:justify-center">
        <div className="rounded-2xl bg-black/[0.04] border border-black/10 p-3">
          <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">Pay with Gems ({gems.toLocaleString()})</p>
          <div className="grid grid-cols-2 gap-2">
            <PullButton label="ARMORY ×1" icon={Gem} amount={gemCost} color="#D500F9" disabled={busy || gems < gemCost} busy={busyKind === "gear-gems-1"} onClick={() => onSummon(1, "gems")} testid="gear-x1-button" />
            <PullButton label="ARMORY ×10" icon={Gem} amount={gemCost * 10} color="#D500F9" ribbon="EPIC+" primary disabled={busy || gems < gemCost * 10} busy={busyKind === "gear-gems-10"} onClick={() => onSummon(10, "gems")} testid="gear-x10-button" />
          </div>
        </div>
        <div className="rounded-2xl bg-black/[0.04] border border-black/10 p-3">
          <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">Pay with Armory Tickets ({gearTickets})</p>
          <PullButton label="ARMORY TICKET ×1" icon={Ticket} amount={1} unit="Ticket" color="#FFCA28" slim disabled={busy || gearTickets < 1} busy={busyKind === "gear-ticket-1"} onClick={() => onSummon(1, "ticket")} testid="gear-ticket-x1-button" sub={`Have ${gearTickets}`} />
        </div>
      </div>
    </div>
  );
};
