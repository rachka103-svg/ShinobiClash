import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Play, Zap, ChevronDown, Scroll } from "lucide-react";
import { LockIcon, CheckIcon, CrownIcon, SwordsIcon } from "@/components/GameIcons";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { useGame } from "@/context/GameContext";
import { startBattle, ENERGY_COST } from "@/lib/energy";
import { RARITY } from "@/lib/styles";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

function stageStateOf(stage, stages, cleared) {
  const idx = stages.findIndex((s) => s.id === stage.id);
  if (cleared.includes(stage.id)) return "completed";
  const unlocked = idx === 0 || cleared.includes(stages[idx - 1].id);
  return unlocked ? "current" : "locked";
}

/**
 * Campaign — a clean, scannable LIST of chapters and stages (reverted from
 * the cinematic node-map). A chapter picker up top, then a vertical list of
 * stage rows. All energy/reward/battle logic is unchanged on the server.
 */
export default function Campaign() {
  const { user, setUser } = useAuth();
  const { stages, chapters, catalogById } = useGame();
  const navigate = useNavigate();
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [busy, setBusy] = useState(false);

  const cleared = user?.cleared_stages || [];
  const energyLow = (user?.energy?.current ?? 0) < ENERGY_COST.campaign;

  useEffect(() => {
    if (selectedChapter != null || stages.length === 0) return;
    const next = stages.find((s) => !cleared.includes(s.id));
    setSelectedChapter(next ? next.chapter : stages[stages.length - 1].chapter);
  }, [stages]); // eslint-disable-line react-hooks/exhaustive-deps

  const chapterStages = useMemo(
    () => stages.filter((s) => s.chapter === selectedChapter),
    [stages, selectedChapter]
  );
  const chapterMeta = chapters.find((c) => c.chapter === selectedChapter);
  const accent = chapterMeta?.accent || "#00E5FF";
  const chapterDoneCount = chapterStages.filter((s) => cleared.includes(s.id)).length;
  const chapterDone = chapterStages.length > 0 && chapterDoneCount === chapterStages.length;
  const totalCleared = cleared.length;

  const launch = async (stage, state) => {
    if (state === "locked" || busy) return;
    setBusy(true);
    try {
      if (energyLow) { toast.error("Not enough Energy — refill in the Shop or wait for regen."); return; }
      await startBattle({ mode: "campaign", id: stage.id, navigate, setUser });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6" data-testid="campaign-page">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: "#FF572218", border: "1px solid #FF572255" }}>
          <Scroll className="w-6 h-6 text-fox" />
        </div>
        <div className="min-w-0">
          <h1 className="font-display text-4xl sm:text-5xl tracking-wide text-ink leading-none">CAMPAIGN</h1>
          <p className="text-[11px] text-slate-500 mt-1" data-testid="campaign-total-progress">{totalCleared}/{stages.length} stages cleared across the realm</p>
        </div>
      </div>

      {/* Chapter picker (dropdown — scales to 100 chapters cleanly) */}
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button data-testid="chapter-picker" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-black/[0.04] border border-black/10 hover:bg-black/[0.06] transition-colors">
              <span className="font-display text-xl tracking-wide" style={{ color: accent }}>CH.{selectedChapter}</span>
              <span className="text-sm text-ink truncate max-w-[42vw]">{chapterMeta?.name}</span>
              <ChevronDown className="w-4 h-4 text-slate-500" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="max-h-[50vh] overflow-y-auto bg-[#FFFFFF] border border-black/12" data-testid="chapter-menu">
            {chapters.map((c) => {
              const cs = stages.filter((s) => s.chapter === c.chapter);
              const done = cs.filter((s) => cleared.includes(s.id)).length;
              const complete = done === cs.length;
              return (
                <DropdownMenuItem key={c.chapter} onClick={() => setSelectedChapter(c.chapter)} data-testid={`chapter-opt-${c.chapter}`}
                  className="flex items-center justify-between gap-4 cursor-pointer focus:bg-black/[0.06]">
                  <span className="text-slate-700"><span className="font-display" style={{ color: c.accent }}>CH.{c.chapter}</span> {c.name}</span>
                  <span className={`text-[10px] ${complete ? "text-emerald-400" : "text-slate-500"}`}>{done}/{cs.length}</span>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
        {chapterDone && (
          <span className="text-[10px] font-bold tracking-widest text-amber-400 px-2 py-1 rounded bg-amber-400/10 border border-amber-400/30" data-testid="chapter-cleared-badge">CHAPTER CLEARED</span>
        )}
      </div>

      {chapterMeta && <p className="text-xs text-slate-500 italic mb-3 max-w-xl">{chapterMeta.lore}</p>}

      {/* Stage list */}
      <div className="space-y-2.5 pb-4" data-testid="campaign-stage-list">
        {chapterStages.map((stage, i) => {
          const state = stageStateOf(stage, stages, cleared);
          const locked = state === "locked";
          const isBoss = stage.is_boss;
          return (
            <motion.button
              key={stage.id}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.02 * i }}
              onClick={() => launch(stage, state)}
              disabled={locked || busy}
              data-testid={`stage-row-${stage.id}`}
              className="w-full text-left flex items-center gap-3 p-3 rounded-2xl border transition-all disabled:cursor-not-allowed group"
              style={{
                background: locked ? "rgba(255,255,255,0.02)" : isBoss ? "linear-gradient(120deg, rgba(255,87,34,0.14), rgba(11,11,20,0.94)), #0B0B14" : "rgba(255,255,255,0.04)",
                borderColor: state === "completed" ? "rgba(0,230,118,0.3)" : isBoss ? "rgba(255,87,34,0.4)" : "rgba(255,255,255,0.1)",
                opacity: locked ? 0.55 : 1,
              }}
            >
              {/* index / state */}
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-display text-lg"
                style={{ background: state === "completed" ? "rgba(0,230,118,0.15)" : isBoss ? "rgba(255,87,34,0.18)" : "rgba(255,255,255,0.05)", color: state === "completed" ? "#00E676" : isBoss ? "#FF5722" : "#94a3b8" }}>
                {locked ? <LockIcon size={16} /> : state === "completed" ? <CheckIcon size={20} /> : isBoss ? <CrownIcon size={20} /> : i + 1}
              </div>

              {/* name + region + enemies */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className={`font-display text-lg tracking-wide truncate ${isBoss ? "text-white" : "text-ink"}`}>{stage.name}</p>
                  {isBoss && <span className="text-[9px] font-bold tracking-widest text-fox px-1.5 py-0.5 rounded bg-fox/15 border border-fox/30">BOSS</span>}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex -space-x-1.5">
                    {stage.enemies.slice(0, 4).map((e, k) => {
                      const t = catalogById[e.template_id];
                      const r = RARITY[t?.rarity || "R"];
                      return (
                        <div key={k} className="w-6 h-6 rounded-full overflow-hidden border shrink-0" style={{ borderColor: r.color }}>
                          {t?.portrait ? <img src={t.portrait} alt="" className="w-full h-full object-cover object-top" /> : <div className="w-full h-full" style={{ background: r.color }} />}
                        </div>
                      );
                    })}
                  </div>
                  <span className="text-[11px] text-slate-500 flex items-center gap-1"><SwordsIcon size={12} /> Pow {(stage.recommended_power || 0).toLocaleString()}</span>
                </div>
              </div>

              {/* action */}
              {!locked && (
                <div className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-transform group-hover:scale-105"
                  style={{ background: isBoss ? "#FF5722" : accent, color: "#05050A" }}>
                  <Play className="w-4 h-4 fill-current" />
                </div>
              )}
            </motion.button>
          );
        })}
      </div>

      {energyLow && (
        <p className="text-[11px] text-fox text-center flex items-center justify-center gap-1" data-testid="campaign-energy-low">
          <Zap className="w-3.5 h-3.5" /> Low Energy — refill in the Shop or wait for regen.
        </p>
      )}
    </div>
  );
}
