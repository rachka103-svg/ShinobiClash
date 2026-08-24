import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Zap, Swords, Loader2, ScrollText, Shirt } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useGame } from "@/context/GameContext";
import { startBattle, ENERGY_COST } from "@/lib/energy";
import { ItemIcon } from "@/components/ItemIcon";

/**
 * RESOURCE DUNGEONS — the dedicated farming hub. Gold Vault (Ryo),
 * EXP Temple (tomes) and Gear Foundry (gear + crafting materials), each
 * with 5 difficulty tiers. Battles run through the exact same engine as
 * Trials (mode=trial) — zero new combat plumbing.
 */
export default function Dungeons() {
  const { user, setUser } = useAuth();
  const { dungeons, items, catalogById } = useGame();
  const navigate = useNavigate();
  const [tierSel, setTierSel] = useState({});
  const [busyId, setBusyId] = useState(null);

  const teamPower = user?.team_power ?? 0;
  const energyLow = (user?.energy?.current ?? 0) < ENERGY_COST.trial;

  const start = async (tierId) => {
    setBusyId(tierId);
    try {
      await startBattle({ mode: "trial", id: tierId, navigate, setUser });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 min-w-0" data-testid="dungeons-page">
      <div className="mb-6">
        <h1 className="font-display text-5xl sm:text-6xl tracking-wide text-ink leading-none">RESOURCE DUNGEONS</h1>
        <p className="text-slate-500 mt-1">Dedicated farming runs — gold, tomes, gear and crafting materials. Repeat forever.</p>
      </div>

      <div className="space-y-4">
        {dungeons.map((d, di) => {
          const tiers = d.tiers || [];
          const selIdx = tierSel[d.id] ?? 0;
          const tier = tiers[selIdx];
          if (!tier) return null;
          const rec = tier.recommended_power;
          const overpowered = teamPower >= rec;
          return (
            <motion.div
              key={d.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: di * 0.08 }}
              className="relative panel rounded-2xl p-4 sm:p-5 overflow-hidden"
              style={{ border: `1px solid ${d.color}33` }}
              data-testid={`dungeon-card-${d.id}`}
            >
              <div className="absolute inset-0 opacity-[0.07] pointer-events-none" style={{ background: `radial-gradient(circle at 90% 10%, ${d.color}, transparent 55%)` }} />

              <div className="relative flex items-center gap-3 mb-3">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${d.color}18`, border: `1px solid ${d.color}44` }}>
                  <ItemIcon icon={d.icon} className="w-6 h-6" style={{ color: d.color }} />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-display text-2xl sm:text-3xl tracking-wide leading-none" style={{ color: d.color }}>{d.name}</h2>
                  <p className="text-xs text-slate-500 mt-0.5">{d.desc}</p>
                </div>
              </div>

              {/* Tier selector */}
              <div className="relative flex items-center gap-1.5 mb-3" data-testid={`dungeon-tier-selector-${d.id}`}>
                {tiers.map((t, i) => (
                  <button
                    key={t.id}
                    onClick={() => setTierSel((s) => ({ ...s, [d.id]: i }))}
                    data-testid={`dungeon-tier-${d.id}-${t.tier}`}
                    className={`flex-1 py-2 rounded-lg font-display text-lg tracking-wide transition-colors ${i === selIdx ? "text-[#05050A]" : "text-slate-500 bg-black/[0.04] border border-black/10 hover:text-ink"}`}
                    style={i === selIdx ? { background: d.color } : undefined}
                  >
                    T{t.tier}
                  </button>
                ))}
              </div>

              {/* Tier details */}
              <div className="relative grid sm:grid-cols-2 gap-3">
                <div className="rounded-xl bg-black/25 border border-black/10 p-3">
                  <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1.5">Enemy Forces</p>
                  <div className="space-y-1">
                    {tier.enemies.map((e, i) => (
                      <p key={i} className="text-xs text-slate-600">
                        <span className="text-slate-500">Lv.{e.level}</span> {catalogById[e.template_id]?.name || e.template_id}
                      </p>
                    ))}
                  </div>
                  <p className={`text-xs mt-2 font-bold ${overpowered ? "text-emerald-400" : "text-fox"}`} data-testid={`dungeon-power-check-${d.id}`}>
                    Recommended {rec} · your squad {teamPower}
                  </p>
                </div>
                <div className="rounded-xl bg-black/25 border border-black/10 p-3">
                  <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1.5">Drops</p>
                  <div className="flex flex-wrap gap-1.5">
                    <DropChip label={`${tier.rewards.ryo} Ryo`} color="#FFC857" icon="coins" />
                    {Object.entries(tier.rewards.items || {}).map(([iid, q]) => (
                      <DropChip key={iid} label={`${q}× ${items[iid]?.name || iid}`} color={items[iid]?.color} icon={items[iid]?.icon} />
                    ))}
                    {tier.has_gear_drop && <DropChip label="Gear (guaranteed)" color={d.color} icon="anvil" />}
                    {tier.blueprint_chance && <DropChip label={`Blueprint ${Math.round(tier.blueprint_chance * 100)}%`} color="#D500F9" icon="scroll" />}
                  </div>
                </div>
              </div>

              <button
                onClick={() => start(tier.id)}
                disabled={busyId !== null || energyLow}
                data-testid={`dungeon-start-button-${d.id}`}
                className="relative w-full mt-3 py-3.5 rounded-xl font-display text-xl tracking-wider text-[#05050A] transition-opacity disabled:opacity-40 flex items-center justify-center gap-2"
                style={{ background: d.color }}
              >
                {busyId === tier.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Swords className="w-5 h-5" />}
                RAID TIER {tier.tier}
                <span className="flex items-center gap-1 text-sm font-sans font-bold"><Zap className="w-4 h-4" />{ENERGY_COST.trial}</span>
              </button>
            </motion.div>
          );
        })}
      </div>
      {energyLow && <p className="text-xs text-fox mt-3 text-center" data-testid="dungeons-energy-low">Not enough Energy — refill with Gems or wait for regen.</p>}
    </div>
  );
}

const DropChip = ({ label, color = "#94A3B8", icon }) => (
  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold bg-black/[0.04] border border-black/10 text-slate-600">
    <ItemIcon icon={icon} className="w-3 h-3" style={{ color }} />
    {label}
  </span>
);
