import { useState } from "react";
import { Sparkles, Loader2, TrendingUp, Gift, Star, Info } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import api, { formatApiErrorDetail } from "@/lib/api";
import { RARITY } from "@/lib/styles";
import SummonRevealOverlay from "@/components/SummonRevealOverlay";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const GOLD = "#FFCA28";
const CHAKRA = "#00E5FF";

/**
 * StepUpSummon — a free x10 summon earned every 10 player levels. Rewards
 * accumulate (unused rewards are never lost). Reuses the existing
 * SummonRevealOverlay for the cinematic reveal.
 */
export default function StepUpSummon() {
  const { user, setUser } = useAuth();
  const [busy, setBusy] = useState(false);
  const [reveal, setReveal] = useState(null);
  const [ratesOpen, setRatesOpen] = useState(false);

  const stepup = user?.stepup || {};
  const level = stepup.level || user?.level || 1;
  const available = stepup.available || 0;
  const totalEarned = stepup.total_earned || 0;
  const used = stepup.used || 0;
  const nextMilestone = stepup.next_milestone || 10;
  const progressToNext = stepup.progress_to_next ?? (level % 10);
  const rates = stepup.rates || {};

  const doStepUp = async () => {
    if (available <= 0 || busy) return;
    setBusy(true);
    try {
      const { data } = await api.post("/game/summon/stepup");
      setUser(data.profile);
      setReveal(data.results);
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally {
      setBusy(false);
    }
  };

  const progressPct = (progressToNext / 10) * 100;

  return (
    <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-2.5 lg:gap-4 relative z-10" data-testid="stepup-panel">
      {/* -------- LEFT: Step-Up banner -------- */}
      <div
        className="relative rounded-2xl sm:rounded-3xl overflow-hidden flex-1 min-h-[260px] sm:min-h-[320px] lg:flex-none lg:basis-[60%] lg:h-full"
        style={{ border: `1px solid ${CHAKRA}55`, boxShadow: `0 0 60px ${CHAKRA}22` }}
        data-testid="stepup-banner"
      >
        {/* Background */}
        <div className="absolute inset-0" style={{ background: "radial-gradient(120% 80% at 50% 30%, rgba(0,229,255,0.12) 0%, transparent 60%), #05050A" }} />
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, transparent 40%, #05050Af2 100%)" }} />

        {/* Floating particles */}
        {Array.from({ length: 8 }).map((_, i) => (
          <span
            key={i}
            className="absolute rounded-full"
            style={{
              left: `${15 + i * 10}%`,
              bottom: "10%",
              width: 4, height: 4,
              background: CHAKRA,
              opacity: 0.3,
              animation: `floatUp ${8 + i}s ease-in ${i * 0.5}s infinite`,
            }}
          />
        ))}

        <div className="relative z-10 h-full flex flex-col p-4 sm:p-6">
          {/* Badge */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-extrabold tracking-widest" style={{ background: `${CHAKRA}18`, color: CHAKRA, border: `1px solid ${CHAKRA}66` }}>
              <TrendingUp className="w-3.5 h-3.5" /> STEP-UP SUMMON
            </span>
            <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-300">
              <Gift className="w-3.5 h-3.5 text-chakra" /> FREE x10 SUMMON
            </span>
          </div>

          {/* Title */}
          <div className="mt-4">
            <h1 className="font-display leading-[0.86] tracking-wide">
              <span className="block text-3xl sm:text-5xl text-transparent bg-clip-text" style={{ backgroundImage: `linear-gradient(180deg, #fff, ${CHAKRA})` }}>STEP-UP</span>
              <span className="block text-2xl sm:text-4xl text-slate-200">SUMMON</span>
            </h1>
            <p className="text-sm text-slate-400 mt-2 max-w-md">Reach new levels. Earn free summons. Every 10 levels grants a free x10 pull with boosted rates.</p>
          </div>

          {/* Level progress */}
          <div className="mt-auto">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] uppercase tracking-widest text-slate-400">Level Progress</span>
              <span className="text-[10px] uppercase tracking-widest text-slate-400">Next Free x10: Level {nextMilestone}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-display text-2xl text-white">{level}</span>
              <div className="flex-1 h-2.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${progressPct}%`, background: `linear-gradient(90deg, ${CHAKRA}, ${GOLD})` }}
                />
              </div>
              <span className="font-display text-2xl text-slate-400">{nextMilestone}</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">{progressToNext} / 10 levels toward next free summon</p>
          </div>
        </div>
      </div>

      {/* -------- RIGHT: summon panel -------- */}
      <div className="shrink-0 lg:basis-[40%] lg:h-full lg:min-h-0 flex flex-col gap-2.5" data-testid="stepup-control-rail">
        {/* Available summons */}
        <div className="rounded-xl bg-white/[0.04] border border-white/10 p-4 shrink-0 text-center" data-testid="stepup-available">
          <p className="text-[9px] uppercase tracking-widest text-slate-400">Available Summons</p>
          <p className="font-display text-5xl leading-none mt-1" style={{ color: available > 0 ? CHAKRA : "#64748b" }}>
            {available}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            {available > 0 ? `FREE x10 SUMMON${available > 1 ? "S" : ""}` : `Next free summon at Level ${nextMilestone}`}
          </p>
          <div className="flex items-center justify-center gap-3 mt-2 text-[10px] text-slate-500">
            <span>Total Earned: {totalEarned}</span>
            <span className="w-1 h-1 rounded-full bg-slate-600" />
            <span>Used: {used}</span>
          </div>
        </div>

        {/* Rates button */}
        <button
          onClick={() => setRatesOpen(true)}
          className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-chakra transition-colors shrink-0 py-1"
        >
          <Info className="w-3.5 h-3.5" /> Step-Up Rates
        </button>

        {/* Summon button */}
        {available > 0 ? (
          <button
            onClick={doStepUp}
            disabled={busy}
            data-testid="stepup-summon-button"
            data-sfx="summon"
            className="relative flex flex-col items-center justify-center gap-1.5 py-5 rounded-2xl overflow-hidden shine-sweep transition-all disabled:opacity-50"
            style={{
              background: "linear-gradient(135deg, #003a4a, #001520)",
              border: `2px solid ${CHAKRA}aa`,
              boxShadow: `0 0 32px ${CHAKRA}44, 0 0 64px ${CHAKRA}22, inset 0 0 16px rgba(0,229,255,0.08)`,
            }}
          >
            <span className="flex items-center gap-2 font-display text-xl tracking-wider text-white">
              {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" style={{ color: CHAKRA }} />}
              FREE x10 SUMMON
            </span>
            <span className="flex items-center gap-1 text-sm font-bold" style={{ color: CHAKRA }}>
              <Star className="w-3.5 h-3.5" /> SR+ Guaranteed
            </span>
          </button>
        ) : (
          <div
            className="flex flex-col items-center justify-center gap-1.5 py-5 rounded-2xl"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.10)" }}
          >
            <span className="font-display text-lg text-slate-500">NEXT FREE SUMMON</span>
            <span className="font-display text-2xl text-slate-400">AT LEVEL {nextMilestone}</span>
          </div>
        )}

        {/* Info card */}
        <div className="rounded-xl bg-white/[0.04] border border-white/10 p-3 shrink-0">
          <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-1.5">How It Works</p>
          <ul className="text-[11px] text-slate-400 space-y-1">
            <li>• Earn 1 free x10 summon every 10 player levels</li>
            <li>• Unused summons accumulate — they never expire</li>
            <li>• Improved rates vs the standard banner</li>
            <li>• Every x10 guarantees at least one SR or higher</li>
          </ul>
        </div>
      </div>

      {/* Rates dialog */}
      <Dialog open={ratesOpen} onOpenChange={setRatesOpen}>
        <DialogContent className="max-w-md bg-[#0B0B14] border border-white/12 rounded-2xl max-h-[85vh] overflow-y-auto" data-testid="stepup-rates-dialog">
          <DialogTitle className="font-display text-2xl tracking-wide text-white">STEP-UP RATES</DialogTitle>
          <DialogDescription className="text-xs text-slate-400">Improved rates compared to the standard Gem banner. Every x10 guarantees at least one SR or higher.</DialogDescription>
          <Table>
            <TableHeader>
              <TableRow className="border-white/10"><TableHead className="text-slate-400">Rarity</TableHead><TableHead className="text-right text-slate-400">Rate</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(rates).map(([r, pct]) => (
                <TableRow key={r} className="border-white/5">
                  <TableCell className="font-bold" style={{ color: (RARITY[r] || RARITY.R).color }}>{(RARITY[r] || {}).name || r} ({r})</TableCell>
                  <TableCell className="text-right text-white tabular-nums">{pct}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <button onClick={() => setRatesOpen(false)} className="w-full py-2.5 rounded-xl font-semibold text-sm bg-white/[0.06] border border-white/12 text-slate-200 hover:bg-white/10 transition-colors">Close</button>
        </DialogContent>
      </Dialog>

      <SummonRevealOverlay open={!!reveal} results={reveal || []} onClose={() => setReveal(null)} />
    </div>
  );
}
