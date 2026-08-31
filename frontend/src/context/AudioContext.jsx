import {
  createContext, useCallback, useContext, useEffect, useRef, useState,
} from "react";

/**
 * AudioProvider — owns the game's two audio systems:
 *
 *  1. BGM  — a single looping <audio> element (public/bgm.mp3). Browsers
 *     block autoplay until a user gesture, so playback is (re)attempted on
 *     every pointer/click/keydown until it actually starts, and again when
 *     the tab becomes visible again. This makes BGM reliably start on every
 *     device (iOS Safari, Android Chrome, desktop) regardless of autoplay
 *     policy.
 *
 *  2. SFX  — short sound effects synthesized live with the Web Audio API
 *     (oscillators + envelopes), so no audio asset files are needed and they
 *     work everywhere. A master Gain node controls overall SFX volume.
 *
 * A single global `pointerdown` listener plays a soft "tap" on interactive
 * elements; any element can opt into a named sound via `data-sfx="name"`.
 * Mute state is persisted to localStorage and gates both BGM and SFX.
 */

const AudioCtx = createContext(null);
const MUTE_KEY = "sc_muted";

/* ----------------------------- SFX synthesis ----------------------------- */
function tone(ctx, dest, { freq, type = "sine", dur = 0.12, gain = 0.18, delay = 0, to }) {
  const t0 = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (to) osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(dest);
  osc.start(t0);
  osc.stop(t0 + dur + 0.03);
}

function noiseBurst(ctx, dest, { dur = 0.12, gain = 0.18, delay = 0, freq = 1200 }) {
  const t0 = ctx.currentTime + delay;
  const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const filt = ctx.createBiquadFilter();
  filt.type = "bandpass";
  filt.frequency.value = freq;
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filt).connect(g).connect(dest);
  src.start(t0);
  src.stop(t0 + dur);
}

const SFX = {
  tap:     (c, d) => tone(c, d, { freq: 660, type: "triangle", dur: 0.05, gain: 0.07 }),
  nav:     (c, d) => tone(c, d, { freq: 520, type: "triangle", dur: 0.06, gain: 0.09, to: 720 }),
  back:    (c, d) => tone(c, d, { freq: 660, type: "triangle", dur: 0.06, gain: 0.09, to: 440 }),
  open:    (c, d) => tone(c, d, { freq: 300, type: "sine", dur: 0.14, gain: 0.11, to: 880 }),
  close:   (c, d) => tone(c, d, { freq: 880, type: "sine", dur: 0.12, gain: 0.09, to: 300 }),
  success: (c, d) => [523, 659, 784].forEach((f, i) => tone(c, d, { freq: f, type: "triangle", dur: 0.12, gain: 0.13, delay: i * 0.07 })),
  levelup: (c, d) => {
    [523, 659, 784, 1047].forEach((f, i) => tone(c, d, { freq: f, type: "triangle", dur: 0.16, gain: 0.15, delay: i * 0.08 }));
    tone(c, d, { freq: 1568, type: "sine", dur: 0.3, gain: 0.1, delay: 0.32 });
  },
  error:   (c, d) => {
    tone(c, d, { freq: 220, type: "sawtooth", dur: 0.18, gain: 0.13, to: 140 });
    tone(c, d, { freq: 160, type: "sawtooth", dur: 0.2, gain: 0.11, delay: 0.12, to: 90 });
  },
  coin:    (c, d) => {
    tone(c, d, { freq: 988, type: "square", dur: 0.06, gain: 0.09 });
    tone(c, d, { freq: 1319, type: "square", dur: 0.1, gain: 0.09, delay: 0.06 });
  },
  summon:  (c, d) => {
    [392, 523, 659, 784, 988].forEach((f, i) => tone(c, d, { freq: f, type: "sine", dur: 0.18, gain: 0.11, delay: i * 0.05 }));
    tone(c, d, { freq: 1568, type: "triangle", dur: 0.4, gain: 0.1, delay: 0.28 });
  },
  hit:     (c, d) => {
    noiseBurst(c, d, { dur: 0.1, gain: 0.18, freq: 1400 });
    tone(c, d, { freq: 180, type: "square", dur: 0.1, gain: 0.11, to: 80 });
  },
  heal:    (c, d) => [523, 659].forEach((f, i) => tone(c, d, { freq: f, type: "sine", dur: 0.18, gain: 0.11, delay: i * 0.06, to: f * 1.5 })),
  shield:  (c, d) => tone(c, d, { freq: 400, type: "sine", dur: 0.2, gain: 0.11, to: 600 }),
  win:     (c, d) => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(c, d, { freq: f, type: "triangle", dur: 0.2, gain: 0.15, delay: i * 0.1 })),
  lose:    (c, d) => [392, 330, 262, 196].forEach((f, i) => tone(c, d, { freq: f, type: "sawtooth", dur: 0.25, gain: 0.13, delay: i * 0.12 })),
};

const INTERACTIVE_SELECTOR =
  "[data-sfx], button, a, [role='button'], input, select, textarea, summary, .cursor-pointer";

export function AudioProvider({ children }) {
  const bgmRef = useRef(null);
  const ctxRef = useRef(null);
  const masterRef = useRef(null);
  const mutedRef = useRef(false);
  const [muted, setMutedState] = useState(() => {
    try { return localStorage.getItem(MUTE_KEY) === "1"; } catch { return false; }
  });
  mutedRef.current = muted;

  const ensureCtx = useCallback(() => {
    if (typeof window === "undefined") return null;
    if (!ctxRef.current) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctxRef.current = new AC();
      masterRef.current = ctxRef.current.createGain();
      masterRef.current.gain.value = 0.6;
      masterRef.current.connect(ctxRef.current.destination);
    }
    if (ctxRef.current.state === "suspended") ctxRef.current.resume().catch(() => {});
    return ctxRef.current;
  }, []);

  const playSfx = useCallback((name) => {
    if (mutedRef.current) return;
    const ctx = ensureCtx();
    if (!ctx) return;
    const fn = SFX[name];
    if (!fn) return;
    try { fn(ctx, masterRef.current || ctx.destination); } catch { /* ignore */ }
  }, [ensureCtx]);

  const setMuted = useCallback((next) => {
    mutedRef.current = next;
    setMutedState(next);
    try { localStorage.setItem(MUTE_KEY, next ? "1" : "0"); } catch { /* storage unavailable */ }
    const audio = bgmRef.current;
    if (!audio) return;
    if (next) {
      audio.pause();
    } else {
      // unmuting — start BGM immediately within this user gesture (iOS-safe)
      ensureCtx();
      if (audio.paused) audio.play().catch(() => {});
    }
  }, [ensureCtx]);

  const toggleMute = useCallback(() => setMuted(!mutedRef.current), [setMuted]);

  /* BGM: keep trying to start on any gesture until it plays, and resume
     when the tab becomes visible again. Bound once on mount. */
  useEffect(() => {
    const audio = bgmRef.current;
    if (!audio) return;
    audio.volume = 0.4;
    audio.loop = true;
    const tryStart = () => {
      if (mutedRef.current) return;
      if (audio.paused) { ensureCtx(); audio.play().catch(() => {}); }
    };
    const onGesture = () => { ensureCtx(); tryStart(); };
    const onVis = () => { if (!document.hidden) tryStart(); };
    tryStart();
    window.addEventListener("pointerdown", onGesture);
    window.addEventListener("click", onGesture);
    window.addEventListener("keydown", onGesture);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("pointerdown", onGesture);
      window.removeEventListener("click", onGesture);
      window.removeEventListener("keydown", onGesture);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [ensureCtx]);

  /* Global tap SFX for interactive elements; `data-sfx` opts into a named sound. */
  useEffect(() => {
    const onPointerDown = (e) => {
      const el = e.target.closest?.(INTERACTIVE_SELECTOR);
      if (!el) return;
      if ((el.tagName === "BUTTON" || el.tagName === "INPUT") && el.disabled) return;
      if (el.closest?.("[aria-disabled='true']")) return;
      playSfx(el.getAttribute("data-sfx") || "tap");
    };
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [playSfx]);

  return (
    <AudioCtx.Provider value={{ muted, toggleMute, setMuted, playSfx }}>
      {children}
      <audio ref={bgmRef} src="/bgm.mp3" preload="auto" playsInline webkit-playsinline="true" />
    </AudioCtx.Provider>
  );
}

export const useAudio = () => useContext(AudioCtx);
