// Client helper for the Energy-gated battle-start flow. The server is the
// source of truth for the actual cost/consumption — these constants are only
// used to render the cost chip on Campaign/Spire/Trial "battle" buttons.
import { toast } from "sonner";
import api, { formatApiErrorDetail } from "@/lib/api";

export const ENERGY_COST = { campaign: 10, spire: 0, trial: 8 };

// Campaign difficulty tiers. `mult` scales enemy HP/ATK/DEF client-side;
// `expMult` scales exp rewards server-side (extreme capped at x25).
export const DIFFICULTIES = [
  { id: "normal",    label: "Normal",    mult: 1,   expMult: 1,  unlockLevel: 0 },
  { id: "hard",      label: "Hard",      mult: 2,   expMult: 2,  unlockLevel: 30 },
  { id: "difficult", label: "Difficult", mult: 10,  expMult: 10, unlockLevel: 60 },
  { id: "extreme",   label: "Extreme",   mult: 100, expMult: 25, unlockLevel: 100 },
];

export function getDifficulty(id) {
  return DIFFICULTIES.find((d) => d.id === id) || DIFFICULTIES[0];
}

export async function startBattle({ mode, id, navigate, setUser, difficulty }) {
  try {
    const { data } = await api.post("/game/battle/start", { mode, id: String(id) });
    if (data.profile) setUser(data.profile);
    // Stash difficulty so Battle.jsx can scale enemies and pass it to /complete.
    if (difficulty) sessionStorage.setItem("campaign_difficulty", difficulty);
    else sessionStorage.removeItem("campaign_difficulty");
    navigate(`/battle/${mode}/${id}`);
  } catch (e) {
    toast.error(formatApiErrorDetail(e?.response?.data?.detail) || "Unable to start battle");
  }
}
