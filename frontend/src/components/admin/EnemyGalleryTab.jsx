import { useMemo } from "react";
import { Shield, Zap, Swords } from "lucide-react";
import { useGame } from "@/context/GameContext";
import { RARITY, ELEMENT } from "@/lib/theme";

/**
 * EnemyGalleryTab — displays nightmare boss templates (enemy-only characters
 * used in Tsukuyomi and Boss Hunt modes). These are NOT summonable heroes and
 * do NOT appear in the player's collection. This tab is for admin reference.
 */
export default function EnemyGalleryTab() {
  const { enemyTemplates } = useGame();

  const sorted = useMemo(
    () =>
      [...(enemyTemplates || [])].sort(
        (a, b) =>
          (RARITY[b.rarity]?.tier ?? 0) - (RARITY[a.rarity]?.tier ?? 0)
      ),
    [enemyTemplates]
  );

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "rgba(139,0,0,0.15)", border: "1px solid rgba(139,0,0,0.4)" }}>
          <Shield className="w-6 h-6 text-fox" />
        </div>
        <div>
          <h2 className="font-display text-3xl tracking-wide text-ink leading-none">ENEMY GALLERY</h2>
          <p className="text-sm text-slate-500 mt-1">
            Nightmare boss templates used in Tsukuyomi & Boss Hunt. These are enemy-only — not summonable, not in the player collection.
          </p>
        </div>
      </div>

      {sorted.length === 0 ? (
        <p className="text-center text-slate-500 py-10">No enemy templates loaded.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3" data-testid="enemy-gallery-grid">
          {sorted.map((t) => {
            const r = RARITY[t.rarity] || RARITY.UR;
            const el = ELEMENT[t.element] || {};
            return (
              <div
                key={t.id}
                data-testid={`enemy-card-${t.id}`}
                className="relative aspect-[3/4] rounded-xl overflow-hidden border-2"
                style={{ borderColor: r.color, boxShadow: `0 0 16px ${r.color}33` }}
              >
                <img
                  src={t.portrait || "/heroes/_placeholder.png"}
                  alt={t.name}
                  className="absolute inset-0 w-full h-full object-cover object-top"
                  onError={(e) => { e.target.src = "/heroes/_placeholder.png"; }}
                />
                <div className="absolute inset-0" style={{ background: "linear-gradient(to top, #05050Af5 8%, #05050A55 45%, transparent 72%)" }} />
                <div className="absolute top-2 left-2 flex items-center gap-1.5">
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: `${el.color}22`, color: el.color, border: `1px solid ${el.color}55` }}>
                    {t.element}
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: `${r.color}22`, color: r.color, border: `1px solid ${r.color}55` }}>
                    {r.label}
                  </span>
                </div>
                <div className="absolute top-2 right-2">
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-black/60 text-slate-300 border border-white/10">
                    ENEMY
                  </span>
                </div>
                <div className="absolute inset-x-0 bottom-0 p-2.5">
                  <h3 className="font-display text-base tracking-wide text-white leading-none truncate">{t.name}</h3>
                  <p className="text-[11px] text-slate-300 mt-0.5">{t.role}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-2">{t.lore}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-[9px] text-slate-500 font-mono">{t.id}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
