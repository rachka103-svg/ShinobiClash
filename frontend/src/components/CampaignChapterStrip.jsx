import { useEffect, useRef } from "react";
import { LockIcon, SkullIcon } from "@/components/GameIcons";

/**
 * Horizontal chapter navigator — "regions" of the World Map. Lets the
 * player jump between unlocked chapters without losing their place, and
 * communicates each chapter's state (locked / in progress / cleared) plus
 * boss-beaten status at a glance.
 *
 * The scroll region is fully CONTAINED within the page's own padding (no
 * negative-margin "full bleed" trick) — that trick is what can silently
 * widen the document's scrollable area and cause the whole page to gain a
 * horizontal scrollbar. This strip scrolls internally only.
 */
export default function CampaignChapterStrip({ chapters, stages, cleared, selectedChapter, onSelect }) {
  const refs = useRef({});

  useEffect(() => {
    const el = refs.current[selectedChapter];
    if (el) el.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [selectedChapter]);

  return (
    <div
      className="flex items-stretch gap-2.5 overflow-x-auto pb-2 snap-x snap-mandatory"
      data-testid="campaign-chapter-strip"
    >
      {chapters.map((ch) => {
        const chStages = stages.filter((s) => s.chapter === ch.chapter);
        if (chStages.length === 0) return null;
        const doneCount = chStages.filter((s) => cleared.includes(s.id)).length;
        const total = chStages.length;
        const pct = total ? Math.round((doneCount / total) * 100) : 0;
        const complete = doneCount === total;
        const bossStage = chStages.find((s) => s.is_boss);
        const bossDefeated = bossStage ? cleared.includes(bossStage.id) : false;
        const firstIdx = stages.findIndex((s) => s.id === chStages[0].id);
        const unlocked = firstIdx === 0 || cleared.includes(stages[firstIdx - 1].id);
        const active = selectedChapter === ch.chapter;
        const accent = ch.accent || "#00E5FF";

        return (
          <button
            key={ch.chapter}
            ref={(el) => { refs.current[ch.chapter] = el; }}
            onClick={() => unlocked && onSelect(ch.chapter)}
            disabled={!unlocked}
            data-testid={`campaign-chapter-chip-${ch.chapter}`}
            aria-label={`Chapter ${ch.chapter}: ${ch.name}${unlocked ? "" : " (locked)"}`}
            aria-current={active}
            className={`relative shrink-0 snap-start text-left min-w-[200px] sm:min-w-[240px] h-[86px] rounded-xl px-3.5 py-2.5 border transition-colors duration-200 ${
              !unlocked ? "opacity-45 cursor-not-allowed border-black/10 bg-black/[0.03]"
              : active ? "bg-black/[0.05]" : "border-black/10 bg-black/[0.04] hover:border-white/25"
            }`}
            style={active ? { borderColor: accent, boxShadow: `0 0 20px ${accent}33` } : undefined}
          >
            {active && <span className="absolute top-0 left-3 right-3 h-[2px] rounded-full" style={{ background: accent }} />}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-widest text-slate-500">Chapter {ch.chapter}</p>
                <h3 className="font-display text-lg text-ink leading-tight truncate">{ch.name}</h3>
              </div>
              {!unlocked ? (
                <LockIcon size={16} className="shrink-0 mt-0.5" />
              ) : bossStage && (
                <SkullIcon size={16} className={`shrink-0 mt-0.5 ${bossDefeated ? "opacity-100" : "opacity-50"}`} />
              )}
            </div>
            <p className="text-[11px] text-slate-500 truncate mt-1">{ch.lore}</p>
            <div className="flex items-center gap-2 mt-1.5">
              <div className="flex-1 h-1 rounded-full bg-black/40 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${pct}%`, background: complete ? "#FFCA28" : accent }}
                />
              </div>
              <span
                className="text-[9px] font-bold tracking-wide shrink-0"
                style={{ color: !unlocked ? "#64748B" : complete ? "#FFCA28" : accent }}
                data-testid={`campaign-chapter-progress-${ch.chapter}`}
              >
                {!unlocked ? "LOCKED" : complete ? "CLEARED" : `${doneCount}/${total}`}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
