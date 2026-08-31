import { useEffect, useRef } from "react";

/**
 * Global background music player. Loops the BGM continuously.
 *
 * Browsers block audio autoplay before a user gesture, so playback is
 * started on the first interaction (click / touch / keypress) and then
 * loops indefinitely via the audio element's `loop` property.
 */
export default function BgmPlayer() {
  const audioRef = useRef(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = 0.4;

    const startPlayback = () => {
      audio.play().catch(() => {});
      // one listener is enough — remove after first successful start
      window.removeEventListener("click", startPlayback);
      window.removeEventListener("touchstart", startPlayback);
      window.removeEventListener("keydown", startPlayback);
    };

    window.addEventListener("click", startPlayback);
    window.addEventListener("touchstart", startPlayback);
    window.addEventListener("keydown", startPlayback);

    return () => {
      window.removeEventListener("click", startPlayback);
      window.removeEventListener("touchstart", startPlayback);
      window.removeEventListener("keydown", startPlayback);
    };
  }, []);

  return <audio ref={audioRef} src="/bgm.mp3" loop autoPlay preload="auto" />;
}
