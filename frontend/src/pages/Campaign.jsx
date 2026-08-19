import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useGame } from "@/context/GameContext";
import { startBattle, ENERGY_COST } from "@/lib/energy";
import CampaignChapterStrip from "@/components/CampaignChapterStrip";
import CampaignStageMap from "@/components/CampaignStageMap";
import CampaignStagePreviewDrawer from "@/components/CampaignStagePreviewDrawer";

function stageStateOf(stage, stages, cleared) {
  const idx = stages.findIndex((s) => s.id === stage.id);
  if (cleared.includes(stage.id)) return "completed";
  const unlocked = idx === 0 || cleared.includes(stages[idx - 1].id);
  return unlocked ? "current" : "locked";
}

/**
 * Campaign World Map — replaces the old flat stage list. World -> Chapter
 * -> Stage -> Battle. All progression/energy/reward/battle logic is
 * untouched and still lives on the server; this screen is purely a
 * cinematic way to browse the exact same `stages` data and launch the
 * exact same `startBattle()` flow as before.
 */
export default function Campaign() {
  const { user, setUser } = useAuth();
  const { stages, chapters, catalogById, bossMechanics } = useGame();
  const navigate = useNavigate();
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [selectedStageId, setSelectedStageId] = useState(null);
  const [busy, setBusy] = useState(false);

  const cleared = user?.cleared_stages || [];
  const energyLow = (user?.energy?.current ?? 0) < ENERGY_COST.campaign;
  const teamPower = user?.team_power ?? 0;

  // Default to the chapter containing the next un-cleared stage — resume
  // exactly where the player left off. Falls back to the final chapter if
  // the whole campaign is cleared.
  useEffect(() => {
    if (selectedChapter != null || stages.length === 0) return;
    const next = stages.find((s) => !cleared.includes(s.id));
    setSelectedChapter(next ? next.chapter : stages[stages.length - 1].chapter);
  }, [stages]);

  const chapterStages = useMemo(
    () => stages.filter((s) => s.chapter === selectedChapter),
    [stages, selectedChapter]
  );
  const chapterMeta = chapters.find((c) => c.chapter === selectedChapter);
  const chapterDone = chapterStages.length > 0 && chapterStages.every((s) => cleared.includes(s.id));
  const chapterDoneCount = chapterStages.filter((s) => cleared.includes(s.id)).length;

  const selectedStage = stages.find((s) => s.id === selectedStageId) || null;
  const selectedState = selectedStage ? stageStateOf(selectedStage, stages, cleared) : null;

  const handleBattle = async () => {
    if (!selectedStage) return;
    setBusy(true);
    try {
      await startBattle({ mode: "campaign", id: selectedStage.id, navigate, setUser });
    } finally {
      setBusy(false);
    }
  };

  const totalCleared = cleared.length;
  const accent = chapterMeta?.accent || "#00E5FF";
  const chapterBg = chapterMeta?.background_image;

  return (
    <div className="relative min-h-screen overflow-x-hidden" data-testid="campaign-page">
      {/* Atmospheric backdrop — static, no continuous animation. Tinted per
          chapter with the chapter's existing accent token so the world
          feels less like flat empty black space; swaps to real chapter
          art automatically the moment `background_image` is populated,
          with zero UI changes required. */}
      <div className="fixed inset-0 -z-10 pointer-events-none transition-[background] duration-500">
        {chapterBg ? (
          <img src={chapterBg} alt="" className="w-full h-full object-cover opacity-30" />
        ) : (
          <img src="/art/battle-bg.png" alt="" className="w-full h-full object-cover opacity-[0.12]" />
        )}
        <div
          className="absolute inset-0"
          style={{ background: `radial-gradient(ellipse 80% 50% at 50% 0%, ${accent}1A, transparent 65%)` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#05050A]/60 via-[#05050A]/95 to-[#05050A]" />
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6">
          <h1 className="font-display text-4xl sm:text-5xl tracking-wide text-white">CAMPAIGN</h1>
          <p className="text-slate-400 text-sm mt-1">Battle through the shadow realm, one mission at a time.</p>
          <p className="text-[11px] text-slate-500 mt-1" data-testid="campaign-total-progress">{totalCleared}/{stages.length} stages cleared across the realm</p>
        </div>

        <CampaignChapterStrip
          chapters={chapters}
          stages={stages}
          cleared={cleared}
          selectedChapter={selectedChapter}
          onSelect={setSelectedChapter}
        />

        {chapterMeta && (
          <div className="mt-7 mb-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-2xl tracking-wide" style={{ color: accent }}>CH.{selectedChapter} — {chapterMeta.name}</h2>
              {chapterDone && (
                <span className="text-[10px] font-bold tracking-widest text-amber-400 px-2 py-1 rounded bg-amber-400/10 border border-amber-400/30 shrink-0" data-testid="chapter-cleared-badge">
                  CHAPTER CLEARED
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 italic mt-1 max-w-md">{chapterMeta.lore}</p>
            <p className="text-[11px] text-slate-500 mt-1">{chapterDoneCount}/{chapterStages.length} stages cleared in this chapter</p>
          </div>
        )}

        <div className="mt-2 pb-8">
          {chapterStages.length > 0 && (
            <CampaignStageMap
              stages={chapterStages}
              allStages={stages}
              cleared={cleared}
              onSelectStage={(s) => setSelectedStageId(s.id)}
              accent={accent}
            />
          )}
        </div>
      </div>

      <CampaignStagePreviewDrawer
        stage={selectedStage}
        state={selectedState}
        catalogById={catalogById}
        bossMechanics={bossMechanics}
        teamPower={teamPower}
        onClose={() => setSelectedStageId(null)}
        onBattle={handleBattle}
        energyLow={energyLow}
        busy={busy}
      />
    </div>
  );
}
