"use client";

import { useEffect, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import {
  isStadiumSoundsMuted,
  setStadiumSoundsMuted,
  unlockStadiumSounds,
} from "@/lib/stadium-sounds";
import { isHapticsMuted, setHapticsMuted, triggerHaptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";

/** Odblokowuje AudioContext po geście — bez dźwięku przy wejściu. */
export function StadiumSoundsUnlock() {
  useEffect(() => {
    const unlock = () => unlockStadiumSounds();
    window.addEventListener("pointerdown", unlock, { once: true, passive: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);
  return null;
}

/** Przełącznik wyciszenia dźwięków i wibracji. */
export function StadiumSoundsToggle({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    setMuted(isStadiumSoundsMuted() || isHapticsMuted());
    const onChange = () => setMuted(isStadiumSoundsMuted() || isHapticsMuted());
    window.addEventListener("awp-sounds-muted", onChange);
    window.addEventListener("awp-haptics-muted", onChange);
    return () => {
      window.removeEventListener("awp-sounds-muted", onChange);
      window.removeEventListener("awp-haptics-muted", onChange);
    };
  }, []);

  function toggle() {
    const next = !muted;
    setStadiumSoundsMuted(next);
    setHapticsMuted(next);
    setMuted(next);
    if (!next) {
      unlockStadiumSounds();
      triggerHaptic("light");
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={cn(
        "awp-focus-ring inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/25 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm transition hover:bg-black/40",
        compact && "gap-0 px-2.5 py-1.5",
        className
      )}
      aria-pressed={muted}
      aria-label={muted ? "Włącz dźwięki i wibracje" : "Wycisz dźwięki i wibracje"}
      title={muted ? "Włącz dźwięki i wibracje" : "Wycisz dźwięki i wibracje"}
    >
      {muted ? <VolumeX className="h-4 w-4" aria-hidden /> : <Volume2 className="h-4 w-4" aria-hidden />}
      {!compact ? <span>{muted ? "Efekty wył." : "Efekty wł."}</span> : null}
    </button>
  );
}
