import { useState } from "react";
import { Loader2, Gem, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import api, { formatApiErrorDetail } from "@/lib/api";

const STAT_LABEL = { hp: "HP", atk: "ATK", def: "DEF", spd: "SPD" };
const subLabel = (s) => (s.stat.endsWith("_pct") ? `${s.stat.slice(0, -4).toUpperCase()} %` : s.stat.toUpperCase());

const MOD_LABELS = {
  lifesteal_pct: (v) => `Lifesteal ${v}%`,
  damage_reduction: (v) => `DMG Reduction ${Math.round(v * 100)}%`,
  regen_pct: (v) => `Regen ${v}%/turn`,
  shield_pct: (v) => `Shield ${v}% Max HP`,
  cc_resistance: (v) => `CC Resist ${Math.round(v * 100)}%`,
  debuff_resistance: (v) => `Debuff Resist ${Math.round(v * 100)}%`,
};

/**
 * CrystalPickerModal — lists all owned crystals and sockets the chosen one
 * into a target gear piece (POST /game/crystal/equip). Crystals already
 * socketed elsewhere are selectable (the backend moves them automatically).
 */
export default function CrystalPickerModal({ open, onClose, gearId, gearName }) {
  const { user, setUser } = useAuth();
  const [busy, setBusy] = useState(false);
  const crystals = user?.crystals || [];
  const gear = (user?.gear || []).find((g) => g.gear_id === gearId);

  const pick = async (crystalId) => {
    setBusy(true);
    try {
      const { data } = await api.post("/game/crystal/equip", { crystal_id: crystalId, gear_id: gearId });
      setUser(data.profile);
      toast.success("Crystal socketed");
      onClose();
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md bg-[#FFFFFF] rounded-2xl border border-black/10 max-h-[85vh] overflow-y-auto" data-testid="crystal-picker-modal">
        <DialogTitle className="font-display text-2xl tracking-wide text-ink flex items-center gap-2">
          <Gem className="w-5 h-5 text-jutsu" /> Socket Crystal
        </DialogTitle>
        <DialogDescription className="text-xs text-slate-500">
          {gear ? `Into ${gear.set_name} ${gear.slot}` : "Choose a crystal to socket"}{gearName ? ` · ${gearName}` : ""}
        </DialogDescription>

        {crystals.length === 0 ? (
          <div className="text-center py-10 text-slate-500" data-testid="crystal-picker-empty">
            <Gem className="w-7 h-7 mx-auto mb-2 text-slate-600" />
            No crystals yet — hunt the Nightmare bosses in Tsukuyomi.
          </div>
        ) : (
          <div className="space-y-2 mt-2" data-testid="crystal-picker-list">
            {crystals.map((c) => {
              const socketed = !!c.socketed_in;
              return (
                <button
                  key={c.crystal_id}
                  onClick={() => pick(c.crystal_id)}
                  disabled={busy}
                  data-testid={`crystal-pick-${c.crystal_id}`}
                  className="w-full text-left p-3 rounded-xl bg-black/[0.04] border border-black/10 hover:border-white/30 transition-colors disabled:opacity-50"
                  style={{ borderLeft: `3px solid ${c.tier_color}` }}
                >
                  {c.boss_crysta && (
                    <div className="text-xs font-bold text-ink mb-0.5">{c.boss_crysta.name}</div>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest" style={{ color: c.tier_color }}>{c.tier_name}</span>
                    <span className="text-xs font-bold text-ink">{STAT_LABEL[c.main_stat]} +{c.main_value}</span>
                    {c.plus > 0 && <span className="text-[10px] text-amber-400 font-bold">+{c.plus}</span>}
                    <span className="ml-auto text-[10px] text-slate-500">Score {c.score}</span>
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                    {c.subs.map((s, i) => (
                      <span key={i} className="text-[10px] text-slate-500">{subLabel(s)} +{s.value}{s.stat.endsWith("_pct") ? "%" : ""}</span>
                    ))}
                  </div>
                  {c.combat_modifiers && Object.keys(c.combat_modifiers).length > 0 && (
                    <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-1">
                      {Object.entries(c.combat_modifiers).map(([k, v]) => (
                        <span key={k} className="text-[10px] font-semibold" style={{ color: c.tier_color }}>
                          {MOD_LABELS[k] ? MOD_LABELS[k](v) : `${k} ${v}`}
                        </span>
                      ))}
                    </div>
                  )}
                  {socketed && (
                    <span className="text-[9px] text-amber-400 mt-1 inline-block">◆ Socketed in another piece — moves here</span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
