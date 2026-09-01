import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Castle, Swords } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useGame } from "@/context/GameContext";
import { spireEnemies } from "@/lib/battle";
import { spireFloorConfig, SPIRE_MAX_FLOOR } from "@/lib/spireConfig";
import { startBattle } from "@/lib/energy";
import SpireProgression from "@/components/spire/SpireProgression";
import SpireChallenge from "@/components/spire/SpireChallenge";
import TrialDungeonCard from "@/components/spire/TrialDungeonCard";

const PURPLE = "#a855f7";

export default function Spire() {
  const { user, setUser } = useAuth();
  const { catalog, catalogById, trials } = useGame();
  const navigate = useNavigate();

  const cleared = user?.spire_floor || 0;
  const maxAttempt = Math.min(cleared + 1, SPIRE_MAX_FLOOR);
  const [floor, setFloor] = useState(maxAttempt);

  const enemies = catalog.length ? spireEnemies(floor, catalog) : [];
  const cfg = spireFloorConfig(floor);
  const isBoss = cfg.isBoss;
  const ryoReward = Math.round((100 + floor * 25) * cfg.rewardMult * (isBoss ? 1.5 : 1));

  // Blueprint shows exactly the three base trial dungeons (Scroll Sanctum,
  // Crystal Cavern, Gold Vault). Tiered dungeon entries live on the Dungeons page.
  const baseTrials = trials.filter((t) => !t.dungeon_id).slice(0, 3);

  return (
    <div className="w-full max-w-[1504px] mx-auto px-6 lg:px-11 pt-3 pb-4" data-testid="spire-page">
      {/* ── Title area ── */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(168,85,247,0.14)", border: "1px solid rgba(168,85,247,0.45)", boxShadow: "0 0 16px rgba(168,85,247,0.18)" }}>
          <Castle className="w-7 h-7" style={{ color: PURPLE }} />
        </div>
        <div>
          <h1 className="font-display text-4xl lg:text-[40px] tracking-wide text-white leading-none">ENDLESS SPIRE</h1>
          <p className="text-[15px] text-slate-400 mt-1.5 leading-snug">Ascend the Dragon's Back into the heavens.<br />How high can you rise?</p>
        </div>
      </div>

      {/* ── Main two-column area ── */}
      <div className="grid gap-10 lg:grid-cols-[560px_1fr]">
        <SpireProgression cleared={cleared} floor={floor} onSelect={setFloor} />

        <SpireChallenge
          floor={floor}
          enemies={enemies}
          catalogById={catalogById}
          isBoss={isBoss}
          ryoReward={ryoReward}
          onChallenge={() => startBattle({ mode: "spire", id: floor, navigate, setUser })}
        />
      </div>

      {/* ── Trial Dungeons ── */}
      <div className="mt-9">
        <div className="flex items-center gap-2.5 mb-1.5">
          <Swords className="w-6 h-6" style={{ color: "#22d3ee" }} />
          <h2 className="font-display text-3xl tracking-wide text-white">TRIAL DUNGEONS</h2>
        </div>
        <p className="text-[14px] text-slate-400 mb-4">Repeatable battles — farm the materials you need to level and ascend your heroes.</p>

        <div className="grid gap-[15px] sm:grid-cols-2 lg:grid-cols-3">
          {baseTrials.map((tr, i) => (
            <TrialDungeonCard
              key={tr.id}
              trial={tr}
              catalogById={catalogById}
              onFarm={() => startBattle({ mode: "trial", id: tr.id, navigate, setUser })}
              index={i}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
