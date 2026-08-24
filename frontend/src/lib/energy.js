// Client helper for the Energy-gated battle-start flow. The server is the
// source of truth for the actual cost/consumption — these constants are only
// used to render the cost chip on Campaign/Spire/Trial "battle" buttons.
import { toast } from "sonner";
import api, { formatApiErrorDetail } from "@/lib/api";

export const ENERGY_COST = { campaign: 10, spire: 0, trial: 8 };

export async function startBattle({ mode, id, navigate, setUser }) {
  try {
    const { data } = await api.post("/game/battle/start", { mode, id: String(id) });
    if (data.profile) setUser(data.profile);
    navigate(`/battle/${mode}/${id}`);
  } catch (e) {
    toast.error(formatApiErrorDetail(e?.response?.data?.detail) || "Unable to start battle");
  }
}
