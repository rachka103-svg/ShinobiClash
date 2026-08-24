import { Zap, Coins, Star, Lock, Play, RotateCcw, Crown, TrendingUp, TrendingDown, Gift, Shield } from "lucide-react";
import { Drawer, DrawerContent, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { RARITY, ELEMENT } from "@/lib/styles";
import { ENERGY_COST } from "@/lib/energy";

function describePhase(phase) {
  const range = phase.hp_above != null ? `Above ${phase.hp_above}% HP`
    : phase.hp_below != null ? `Below ${phase.hp_below}% HP`
    : phase.hp_between ? `${phase.hp_between[0]}-${phase.hp_between[1]}% HP` : "Any HP";
  let detail = "Fights normally";
  if (phase.behavior === "shielded") detail = `Shielded — ${phase.shield_pct}% shield (breaks after 3 AoE hits)`;
  else if (phase.behavior === "enraged") {
    const bits = [`+${Math.round((phase.atk_mult - 1) * 100)}% ATK`];
    if (phase.spd_mult) bits.push(`+${Math.round((phase.spd_mult - 1) * 100)}% SPD`);
    if (phase.reflects_crit) bits.push("reflects crits");
    detail = `Enraged — ${bits.join(", ")}`;
  } else if (phase.behavior === "elemental_shift") detail = `Shifts affinity to ${phase.shift_to}`;
  return { range, detail };
}

/**
 * Stage preview — a bottom drawer (mobile-native pattern) shown before
 * committing Energy to a fight. Every number here is read straight from
 * the existing stage/catalog/boss-mechanic data — nothing is invented.
 * Energy is validated/deducted server-side by `onBattle` (startBattle);
 * this panel only decides whether to show the CTA as enabled.
 */
export default function CampaignStagePreviewDrawer({ stage, state, catalogById, bossMechanics, teamPower, onClose, onBattle, energyLow, busy }) {
  const open = !!stage;
  if (!stage) return null;

  const done = state === "completed";
  const locked = state === "locked";
  const isBoss = !!stage.is_boss;
  const mech = isBoss ? bossMechanics[stage.boss_mechanic] : null;
  const powerDelta = teamPower - stage.recommended_power;
  const overpowered = powerDelta >= 0;

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent
        data-testid="campaign-stage-drawer"
        className="bg-[#FFFFFF] border-black/10 max-h-[88vh] focus:outline-none"
      >
        <div className="mx-auto w-full max-w-lg px-4 sm:px-5 pb-[env(safe-area-inset-bottom)] overflow-y-auto max-h-[calc(88vh-1rem)]">
          <DrawerTitle className="sr-only">{stage.name}</DrawerTitle>
          <DrawerDescription className="sr-only">Preview and launch stage {stage.name}</DrawerDescription>

          {/* header */}
          <div className="flex items-center gap-2 mb-1.5">
            {isBoss && <Crown className="w-4 h-4 text-amber-400 shrink-0" />}
            <span className="text-[11px] uppercase tracking-widest text-slate-500">Chapter {stage.chapter} · {stage.region}</span>
          </div>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="font-display text-2xl sm:text-3xl text-ink tracking-wide leading-none" data-testid="stage-drawer-name">{stage.name}</h2>
            {done && <Star className="w-4 h-4 fill-amber-400 text-amber-400 shrink-0" />}
          </div>

          {/* power comparison */}
          <div className="flex items-center justify-between rounded-xl bg-black/[0.04] border border-black/10 px-4 py-3 mb-5">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-slate-500">Recommended Power</p>
              <p className="font-display text-xl text-ink mt-0.5" data-testid="stage-recommended-power">{stage.recommended_power}</p>
            </div>
            <div className={`flex items-center gap-1.5 text-sm font-semibold shrink-0 ${overpowered ? "text-emerald-400" : "text-fox"}`}>
              {overpowered ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              Your squad: {teamPower}
            </div>
          </div>

          {/* enemies — fixed grid so cards align consistently regardless of name length */}
          <p className="text-xs uppercase tracking-widest text-slate-500 mb-2.5">Enemy Forces</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-5" data-testid="stage-enemy-roster">
            {stage.enemies.map((e, i) => {
              const tpl = catalogById[e.template_id];
              const rc = RARITY[tpl?.rarity || "R"]?.color || "#94A3B8";
              const ec = ELEMENT[tpl?.element]?.color || "#94A3B8";
              return (
                <div key={i} className="flex items-center gap-2 rounded-lg bg-black/[0.04] border border-black/10 pr-2.5 py-1.5 pl-1.5 min-w-0">
                  <div className="relative w-11 h-11 rounded-md overflow-hidden border shrink-0" style={{ borderColor: rc }}>
                    {tpl?.portrait ? (
                      <img src={tpl.portrait} alt={tpl?.name || "enemy"} className="w-full h-full object-cover object-top" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-black/[0.04]"><Shield className="w-4 h-4 text-slate-500" /></div>
                    )}
                    <span className="absolute bottom-0 right-0 text-[8px] bg-black/70 px-0.5 text-white leading-tight">Lv{e.level}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-ink truncate">{tpl?.name || "Unknown"}</p>
                    <p className="text-[10px] truncate" style={{ color: ec }}>{tpl?.element || "?"} · {tpl?.role || "Fighter"}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* boss mechanics */}
          {isBoss && mech && (
            <div className="mb-5 rounded-xl border border-amber-500/25 bg-amber-500/[0.05] p-3.5" data-testid="stage-boss-mechanic">
              <p className="text-xs uppercase tracking-widest text-amber-400 mb-2 flex items-center gap-1.5"><Crown className="w-3.5 h-3.5" /> {mech.name}</p>
              <div className="space-y-1.5">
                {mech.phases.map((p, i) => {
                  const { range, detail } = describePhase(p);
                  return (
                    <p key={i} className="text-[11px] text-slate-600 leading-snug"><span className="text-slate-500">{range}:</span> {detail}</p>
                  );
                })}
                {mech.summons_adds_at_pct && <p className="text-[11px] text-slate-600 leading-snug"><span className="text-slate-500">Below {mech.summons_adds_at_pct}% HP:</span> Summons reinforcements</p>}
              </div>
            </div>
          )}

          {/* rewards */}
          <p className="text-xs uppercase tracking-widest text-slate-500 mb-2.5">Rewards</p>
          <div className="flex flex-wrap gap-2 mb-2.5">
            <span className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-black/[0.04] text-amber-300 font-medium"><Coins className="w-3.5 h-3.5" />{stage.rewards.ryo} Ryo</span>
            <span className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-black/[0.04] text-chakra font-medium"><Zap className="w-3.5 h-3.5" />{stage.rewards.exp} EXP</span>
          </div>
          {!done && (stage.first_clear?.ryo > 0 || stage.first_clear?.ninja) && (
            <div className="mb-5">
              <span className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-jutsu/15 text-jutsu border border-jutsu/30 w-fit" data-testid="stage-first-clear-reward">
                <Gift className="w-3.5 h-3.5" /> First-Time Bonus: +{stage.first_clear.ryo} Ryo{stage.first_clear.ninja ? " + new ally" : ""}
              </span>
            </div>
          )}
          {done && <div className="mb-3" />}

          {locked && (
            <p className="text-xs text-slate-500 mb-3" data-testid="stage-locked-requirement">Clear the previous stage to unlock this one.</p>
          )}
        </div>

        {/* sticky CTA */}
        <div className="sticky bottom-0 mx-auto w-full max-w-lg px-4 sm:px-5 pt-3 pb-4 bg-[#FFFFFF] border-t border-black/10">
          {locked ? (
            <div className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-black/[0.04] text-slate-500 font-display text-lg tracking-wide">
              <Lock className="w-4 h-4" /> LOCKED
            </div>
          ) : (
            <button
              onClick={onBattle}
              disabled={busy || energyLow}
              data-testid="stage-drawer-battle-btn"
              className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-display text-lg tracking-wide transition-colors ${
                energyLow ? "bg-black/[0.06] text-slate-500" : "bg-fox text-ink hover:bg-orange-600"
              } disabled:opacity-60`}
            >
              {done ? <RotateCcw className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
              {done ? "REPLAY" : "BATTLE"}
              <span className="flex items-center gap-1 text-sm opacity-80"><Zap className="w-3.5 h-3.5" />{ENERGY_COST.campaign}</span>
            </button>
          )}
          {energyLow && !locked && <p className="text-center text-[11px] text-fox mt-1.5">Not enough Energy — wait for it to regen.</p>}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
