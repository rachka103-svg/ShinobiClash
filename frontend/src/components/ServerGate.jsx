import { useCallback, useEffect, useRef, useState } from "react";
import { Swords, RotateCw, ServerCrash } from "lucide-react";
import api from "@/lib/api";

const MAX_AUTO_ATTEMPTS = Infinity; // never give up — keep retrying until the server responds
const BASE_DELAY_MS = 1400;
const MAX_DELAY_MS = 15000; // cap backoff at 15s so recovery is detected promptly

/**
 * Gatekeeper rendered above AuthProvider/GameProvider. Pings the backend on
 * app launch and auto-retries with backoff while the server cold-starts, so
 * the player never has to manually open the backend URL to "wake" it.
 * Falls back to a manual "Wake Server" button if auto-retries are exhausted.
 */
export default function ServerGate({ children }) {
  const [status, setStatus] = useState("checking"); // checking | waking | failed | ready
  const [attempt, setAttempt] = useState(0);
  const timerRef = useRef(null);
  const cancelledRef = useRef(false);

  const ping = useCallback(async () => {
    try {
      await api.get("/", { timeout: 8000 });
      return true;
    } catch {
      return false;
    }
  }, []);

  const attemptWake = useCallback(
    async (n) => {
      if (cancelledRef.current) return;
      const ok = await ping();
      if (cancelledRef.current) return;
      if (ok) {
        setStatus("ready");
        return;
      }
      setAttempt(n);
      setStatus("waking");
      const delay = Math.min(BASE_DELAY_MS * Math.pow(1.35, n), MAX_DELAY_MS);
      timerRef.current = setTimeout(() => attemptWake(n + 1), delay);
    },
    [ping],
  );

  useEffect(() => {
    cancelledRef.current = false;
    attemptWake(1);
    return () => {
      cancelledRef.current = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [attemptWake]);

  const manualWake = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    cancelledRef.current = false;
    setAttempt(0);
    setStatus("checking");
    attemptWake(1);
  };

  if (status === "ready") return children;

  const failed = status === "failed";

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#05050A] px-6 text-center"
      data-testid="server-wake-screen"
    >
      {failed ? (
        <ServerCrash className="w-12 h-12 text-fox" data-testid="server-wake-icon-failed" />
      ) : (
        <Swords className="w-12 h-12 text-chakra animate-pulse" data-testid="server-wake-icon-loading" />
      )}
      <p className="font-display text-2xl tracking-widest text-white" data-testid="server-wake-title">
        {status === "checking" && "CONNECTING…"}
        {status === "waking" && "WAKING THE SERVER…"}
        {failed && "SERVER UNREACHABLE"}
      </p>
      <p className="text-sm text-slate-400 max-w-sm" data-testid="server-wake-message">
        {failed
          ? "We couldn't reach the server after several attempts. Tap below to try again."
          : "The realm is booting up. This can take up to a minute on a cold start — hang tight, ninja."}
      </p>
      {status === "waking" && attempt > 1 && (
        <p className="text-xs text-slate-500" data-testid="server-wake-attempt-counter">
          Attempt {attempt} — the server will reconnect automatically
        </p>
      )}
      <button
        onClick={manualWake}
        data-testid="server-wake-button"
        className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-display text-lg tracking-wide bg-chakra text-[#05050A] hover:bg-cyan-300 active:scale-95 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-chakra"
      >
        <RotateCw className="w-4 h-4" /> WAKE SERVER
      </button>
    </div>
  );
}
