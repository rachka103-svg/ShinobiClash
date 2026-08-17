import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Check, Save, Loader2, Zap, Lock } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useGame } from "@/context/GameContext";
import { NinjaCard } from "@/components/NinjaCard";
import api, { formatApiErrorDetail } from "@/lib/api";

export default function TeamBuilder() {
  const { user, setUser } = useAuth();
  const { catalogById } = useGame();
  const [team, setTeam] = useState(user?.team || []);
  const [busy, setBusy] = useState(false);

  const cap = user?.team_cap || 3;
  const nextSlotLevel = user?.next_slot_level || null;

  // Keep the selection in sync with the loaded profile (fixes empty squad on hard reload).
  useEffect(() => {
    setTeam((user?.team || []).slice(0, cap));
  }, [user?.id, JSON.stringify(user?.team), cap]);

  const owned = (user?.ninjas || []).map((inst) => ({ ...inst, ...catalogById[inst.template_id], rarity: catalogById[inst.template_id]?.rarity }));

  const toggle = (uid) => {
    if (team.includes(uid)) {
      setTeam(team.filter((t) => t !== uid));
    } else if (team.length < cap) {
      setTeam([...team, uid]);
    } else {
      toast.info(`Squad is full (max ${cap}). Remove one first.`);
    }
  };

  const teamPower = team.reduce((sum, uid) => {
    const inst = user.ninjas.find((n) => n.instance_id === uid);
    return sum + (inst?.power || 0);
  }, 0);

  const save = async () => {
    setBusy(true);
    try {
      const { data } = await api.put("/game/team", { team });
      setUser(data);
      toast.success("Squad saved!");
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8" data-testid="team-page">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-5xl tracking-wide text-white">SQUAD</h1>
          <p className="text-slate-400" data-testid="team-counter">Select up to {cap} shinobi for battle. ({team.length}/{cap})</p>
          {nextSlotLevel && (
            <p className="flex items-center gap-1.5 text-xs text-amber-400/90 mt-1" data-testid="next-slot-hint">
              <Lock className="w-3.5 h-3.5" /> Reach Lv.{nextSlotLevel} to unlock a {cap + 1}th squad slot
            </p>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-2 rounded panel">
            <Zap className="w-4 h-4 text-fox" />
            <span className="font-display text-2xl text-white">{teamPower}</span>
            <span className="text-xs text-slate-500">POWER</span>
          </div>
          <button
            onClick={save}
            disabled={busy || team.length === 0}
            data-testid="save-team-button"
            className="flex items-center gap-2 px-6 py-3 rounded-lg font-display text-xl tracking-wide bg-chakra text-[#05050A] hover:bg-cyan-300 transition-colors disabled:opacity-50"
          >
            {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} SAVE
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {owned.map((n) => {
          const idx = team.indexOf(n.instance_id);
          const selected = idx !== -1;
          return (
            <NinjaCard
              key={n.instance_id}
              ninja={n}
              selected={selected}
              testid={`team-card-${n.template_id}`}
              onClick={() => toggle(n.instance_id)}
              badge={selected && (
                <span className="absolute top-1.5 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-chakra text-[#05050A] flex items-center justify-center font-display text-lg glow-cyan">
                  {idx + 1}
                </span>
              )}
            />
          );
        })}
      </div>
    </div>
  );
}
