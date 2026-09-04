import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Castle, Swords } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useGame } from "@/context/GameContext";
import { spireEnemies } from "@/lib/battle";
import { spireFloorConfig, SPIRE_MAX_FLOOR, SPIRE_PATHS, getSpirePath } from "@/lib/spireConfig";
import { computeStats } from "@/lib/battle";
import { startBattle } from "@/lib/energy";
import SpireProgression from "@/components/spire/SpireProgression";
import SpireChallenge from "@/components/spire/SpireChallenge";
import TrialDungeonCard from "@/components/spire/TrialDungeonCard";

export default function Spire() {
  const { user, setUser } = useAuth();
  const { catalog, catalogById, trials } = useGame();
  const navigate = useNavigate();

  const [path, setPath] = useState("normal");
  const pathCfg = getSpirePath(path);

  // Per-path cleared floor — normal uses the legacy spire_floor field,
  // elemental paths use user.spire_floors[path].
  const cleared = path === "normal"
    ? (user?.spire_floor || 0)
    : (user?.spire_floors?.[path] || 0);

  const maxAttempt = Math.min(cleared + 1, SPIRE_MAX_FLOOR);
  const [floor, setFloor] = useState(maxAttempt);

  // Keep floor in sync when switching paths
  const switchPath = (p) => {
    setPath(p);
    const pCleared = p === "normal"
      ? (user?.spire_floor || 0)
      : (user?.spire_floors?.[p] || 0);
    setFloor(Math.min(pCleared + 1, SPIRE_MAX_FLOOR));
  };

  const enemies = useMemo(
    () => (catalog.length ? spireEnemies(floor, catalog, path) : []),
    [floor, catalog, path]
  );
  const cfg = spireFloorConfig(floor);
  const isBoss = cfg.isBoss;
  const ryoReward = Math.round((100 + floor * 25) * cfg.rewardMult * (isBoss ? 1.5 : 1));

  // Recommended Power from actual enemy formation
  const recPower = useMemo(() => {
    if (!enemies.length || !catalogById) return Math.round(floor * 600 * cfg.statMult);
    let total = 0;
    for (const e of enemies) {
      const t = catalogById[e.template_id];
      if (!t) continue;
      const s = computeStats(t, e.level, e.ascension || 0);
      total += Math.round(s.hp * 0.4 + s.atk * 2.2 + s.def * 1.6 + s.spd * 1.2 + s.chakra * 1.0);
    }
    return Math.round(total * cfg.statMult);
  }, [enemies, catalogById, cfg.statMult]);

  // Count eligible heroes for the selected elemental path
  const eligibleCount = useMemo(() => {
    if (!pathCfg.element || !user?.ninjas) return null;
    return user.ninjas.filter((n) => {
      const t = catalogById[n.template_id];
      return t && t.element === pathCfg.element;
    }).length;
  }, [pathCfg.element, user, catalogById]);

  const baseTrials = trials.filter((t) => !t.dungeon_id).slice(0, 3);

  return (
    <div className="w-full max-w-[1504px] mx-auto px-6 lg:px-11 pt-3 pb-4 relative" data-testid="spire-page">
      {/* Background image */}
      <div className="fixed inset-0 bg-cover bg-center -z-10" style={{ backgroundImage: "url(/bg-spire.png)" }} />
      {/* Dark overlay for readability */}
      <div className="fixed inset-0 -z-10" style={{ background: "linear-gradient(180deg, rgba(13,10,17,0.55) 0%, rgba(13,10,17,0.35) 40%, rgba(13,10,17,0.75) 100%)" }} />
      {/* ── Title area ── */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${pathCfg.accent}22`, border: `1px solid ${pathCfg.accent}55`, boxShadow: `0 0 16px ${pathCfg.accent}30` }}>
          <Castle className="w-7 h-7" style={{ color: pathCfg.accent }} />
        </div>
        <div>
          <h1 className="font-display text-4xl lg:text-[40px] tracking-wide text-white leading-none">ENDLESS SPIRE</h1>
          <p className="text-[15px] text-slate-400 mt-1.5 leading-snug">
            {pathCfg.element
              ? <>Only <span style={{ color: pathCfg.accent }}>{pathCfg.element}</span> heroes may enter. Climb your elemental path.</>
              : <>Ascend the Dragon's Back into the heavens.<br />How high can you rise?</>}
          </p>
        </div>
      </div>

      {/* ── Path selector ── */}
      <div className="flex items-center gap-2 mb-5 flex-wrap" data-testid="spire-path-selector">
        {SPIRE_PATHS.map((p) => {
          const active = path === p.id;
          return (
            <button
              key={p.id}
              data-testid={`spire-path-${p.id}`}
              onClick={() => switchPath(p.id)}
              className={`px-3.5 py-2 rounded-xl text-sm font-bold tracking-wide transition-all flex items-center gap-1.5 ${
                active
                  ? "text-[#05050A]"
                  : "text-slate-300 hover:text-white border border-white/10 bg-white/[0.04] hover:bg-white/[0.08]"
              }`}
              style={active ? { background: p.accent, boxShadow: `0 0 14px ${p.accent}66` } : {}}
            >
              <span className="text-base">{p.icon}</span>
              {p.label}
            </button>
          );
        })}
      </div>

      {/* ── Eligible heroes notice for elemental paths ── */}
      {pathCfg.element && (
        <div className="mb-4 px-4 py-2.5 rounded-xl flex items-center gap-2" style={{ background: `${pathCfg.accent}11`, border: `1px solid ${pathCfg.accent}33` }} data-testid="spire-element-notice">
          <span className="text-lg">{pathCfg.icon}</span>
          <span className="text-sm font-bold" style={{ color: pathCfg.accent }}>{pathCfg.element.toUpperCase()} SPIRE</span>
          <span className="text-xs text-slate-400">·</span>
          <span className="text-sm text-slate-300">
            {eligibleCount != null
              ? `${eligibleCount} eligible ${pathCfg.element} hero${eligibleCount !== 1 ? "s" : ""} available`
              : `${pathCfg.element} heroes only`}
          </span>
          {eligibleCount != null && eligibleCount === 0 && (
            <span className="text-xs text-fox ml-auto">No {pathCfg.element} heroes — summon or build one to enter.</span>
          )}
        </div>
      )}

      {/* ── Main two-column area ── */}
      <div className="grid gap-10 lg:grid-cols-[560px_1fr]">
        <SpireProgression cleared={cleared} floor={floor} onSelect={setFloor} pathLabel={pathCfg.label} accent={pathCfg.accent} />

        <SpireChallenge
          floor={floor}
          enemies={enemies}
          catalogById={catalogById}
          isBoss={isBoss}
          ryoReward={ryoReward}
          recPower={recPower}
          pathCfg={pathCfg}
          onChallenge={() => startBattle({ mode: "spire", id: floor, navigate, setUser, spirePath: path })}
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
