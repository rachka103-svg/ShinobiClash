import { Loader2, Star, Coins, AlertTriangle, X, Check, Sparkles } from "lucide-react";
import { RARITY } from "@/lib/styles";

/**
 * EvolutionConfirmDialog — confirmation step before consuming evolution
 * materials. Shows exactly what will be consumed and the result.
 *
 * Props:
 *   open        — boolean
 *   onClose     — callback to cancel
 *   onConfirm   — callback to confirm evolution
 *   busy        — boolean (loading state)
 *   template    — hero template (name, element, portrait)
 *   instance    — hero instance (stars, rarity)
 *   method      — "shards" | "fodder"
 *   targetStar  — int (the star the hero will become)
 *   shardCost   — { shards, ryo, items } | null (for shards method)
 *   fodderHeroes — list of hero objects being consumed
 *   fodderSlots  — structured fodder requirement from the API
 *   sharedCost   — { ryo, items } shared between both methods
 *   items        — items metadata map
 *   hasSSR       — boolean (true if any SSR fodder is selected)
 */
export default function EvolutionConfirmDialog({
  open, onClose, onConfirm, busy,
  template, instance, method, targetStar,
  shardCost, fodderHeroes, sharedCost, items, hasSSR,
}) {
  if (!open) return null;

  const elementColor = {
    Fire: "#FF5722", Water: "#29B6F6", Earth: "#A1887F",
    Wind: "#00E676", Lightning: "#FFCA28", Light: "#FFD54F", Dark: "#7C4DFF",
  }[template?.element] || "#9E9E9E";

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4" data-testid="evolution-confirm-dialog">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={busy ? undefined : onClose} />
      <div className="relative w-full max-w-sm rounded-2xl bg-[#0F0F1A] border border-white/15 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 pt-5 pb-3 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/15 border border-amber-400/30 mb-3">
            <Star className="w-3.5 h-3.5 text-amber-300" />
            <span className="font-display text-xs tracking-widest text-amber-300">EVOLVE TO {targetStar}★</span>
          </div>
          <h3 className="font-display text-2xl text-white tracking-wide">{template?.name}</h3>
          <p className="text-xs text-slate-400 mt-1">
            <span style={{ color: elementColor }}>{template?.element}</span> · {instance?.rarity || template?.rarity} · {instance?.stars || 1}★ → {targetStar}★
          </p>
        </div>

        {/* Method badge */}
        <div className="px-5 pb-2">
          <div className="rounded-lg bg-white/[0.04] border border-white/10 px-3 py-2 flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-widest text-slate-500">Method</span>
            <span className="text-xs font-bold" style={{ color: method === "shards" ? "#FFCA28" : "#7C4DFF" }}>
              {method === "shards" ? "HERO SHARDS" : "ELEMENTAL FODDER"}
            </span>
          </div>
        </div>

        {/* Consuming list */}
        <div className="px-5 pb-3 space-y-1.5">
          <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Consuming</p>

          {method === "shards" && shardCost && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.03]">
              <Star className="w-3.5 h-3.5 text-amber-300" />
              <span className="text-xs text-slate-300 flex-1">{template.name} Shards</span>
              <span className="text-xs font-bold text-amber-300">×{shardCost.shards}</span>
            </div>
          )}

          {method === "fodder" && fodderHeroes?.map((h) => {
            const rarity = h.evolved_rarity || h.rarity;
            const isSSR = rarity === "SSR";
            return (
              <div key={h.instance_id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.03]">
                {h.portrait ? (
                  <img src={h.portrait} alt="" className="w-7 h-7 rounded object-cover object-top" />
                ) : (
                  <div className="w-7 h-7 rounded bg-white/10 flex items-center justify-center text-[8px] text-slate-400">{h.name?.slice(0, 2)}</div>
                )}
                <span className="text-xs text-slate-300 flex-1 truncate">{h.name}</span>
                <span className="text-[10px] font-bold" style={{ color: RARITY[rarity]?.color || "#9E9E9E" }}>{rarity} {h.stars}★</span>
              </div>
            );
          })}

          {/* Shared costs (Ryo + materials) */}
          {sharedCost && (
            <>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.03]">
                <Coins className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs text-slate-300 flex-1">Ryo</span>
                <span className="text-xs font-bold text-amber-400">×{sharedCost.ryo?.toLocaleString()}</span>
              </div>
              {Object.entries(sharedCost.items || {}).map(([iid, q]) => (
                <div key={iid} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.03]">
                  <Sparkles className="w-3.5 h-3.5" style={{ color: items?.[iid]?.color || "#9E9E9E" }} />
                  <span className="text-xs text-slate-300 flex-1">{items?.[iid]?.name || iid}</span>
                  <span className="text-xs font-bold" style={{ color: items?.[iid]?.color || "#9E9E9E" }}>×{q}</span>
                </div>
              ))}
            </>
          )}
        </div>

        {/* SSR warning */}
        {hasSSR && (
          <div className="mx-5 mb-3 rounded-lg bg-fox/10 border border-fox/30 px-3 py-2 flex items-start gap-2" data-testid="evolution-ssr-warning">
            <AlertTriangle className="w-4 h-4 text-fox shrink-0 mt-0.5" />
            <p className="text-[11px] text-fox leading-snug">
              You are consuming an <strong>SSR</strong> hero as fodder. This action cannot be undone.
            </p>
          </div>
        )}

        {/* Result */}
        <div className="mx-5 mb-3 rounded-lg bg-emerald-500/8 border border-emerald-500/20 px-3 py-2 flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-xs text-emerald-400">{template?.name} → {targetStar}★</span>
        </div>

        {/* Irreversible warning */}
        <p className="text-[10px] text-slate-500 text-center px-5 pb-3">This action cannot be undone.</p>

        {/* Buttons */}
        <div className="flex gap-2 px-5 pb-5">
          <button
            onClick={onClose}
            disabled={busy}
            data-testid="evolution-confirm-cancel"
            className="flex-1 py-2.5 rounded-xl font-display text-sm tracking-wide text-slate-400 border border-white/10 hover:bg-white/5 transition-colors disabled:opacity-40"
          >
            CANCEL
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            data-testid="evolution-confirm-yes"
            className="flex-1 py-2.5 rounded-xl font-display text-sm tracking-wide bg-gradient-to-r from-amber-400 to-amber-300 text-[#05050A] hover:from-amber-300 hover:to-amber-200 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Star className="w-4 h-4" />}
            CONFIRM EVOLUTION
          </button>
        </div>
      </div>
    </div>
  );
}
