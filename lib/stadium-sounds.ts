"use client";

/**
 * Dźwięki stadionowe (Mixkit Free SFX License) — aplauz, okrzyki, gwizdek.
 * Wymaga interakcji użytkownika (autoplay policy); odblokowywane przy pierwszym kliknięciu.
 */

export type StadiumSoundId = "applause" | "cheer" | "goal" | "whistle" | "crowd";

const MUTE_KEY = "awp-sounds-muted";
const ENTRY_SOUND_KEY = "awp-entry-sound-played";

const FILES: Record<StadiumSoundId, string> = {
  applause: "/sounds/applause.mp3",
  cheer: "/sounds/cheer.mp3",
  goal: "/sounds/goal.mp3",
  whistle: "/sounds/whistle.mp3",
  crowd: "/sounds/crowd.mp3",
};

const DEFAULT_VOLUME: Record<StadiumSoundId, number> = {
  applause: 0.45,
  cheer: 0.5,
  goal: 0.55,
  whistle: 0.4,
  crowd: 0.22,
};

/** Max. długość odtwarzania (ms) — dłuższe klipy nie ciągną się w nieskończoność. */
const DEFAULT_MAX_MS: Partial<Record<StadiumSoundId, number>> = {
  applause: 4500,
  cheer: 4500,
  goal: 5500,
  whistle: 2000,
  crowd: 6000,
};

let unlocked = false;
let current: HTMLAudioElement | null = null;
let stopTimer: number | undefined;
const cache = new Map<StadiumSoundId, HTMLAudioElement>();

function canUseAudio(): boolean {
  return typeof window !== "undefined" && typeof Audio !== "undefined";
}

export function isStadiumSoundsMuted(): boolean {
  if (!canUseAudio()) return true;
  try {
    return localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setStadiumSoundsMuted(muted: boolean): void {
  if (!canUseAudio()) return;
  try {
    localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
  } catch {
    /* private mode */
  }
  if (muted) stopStadiumSound();
  window.dispatchEvent(new CustomEvent("awp-sounds-muted", { detail: { muted } }));
}

export function areStadiumSoundsUnlocked(): boolean {
  return unlocked;
}

/** Wywołaj po pierwszej interakcji użytkownika (klik / touch / key). */
export function unlockStadiumSounds(): void {
  if (!canUseAudio() || unlocked) return;
  unlocked = true;
  try {
    const a = new Audio();
    a.volume = 0;
    void a.play().then(() => a.pause()).catch(() => {
      /* iOS może wymagać kolejnej interakcji */
    });
  } catch {
    /* ignore */
  }
}

function getAudio(id: StadiumSoundId): HTMLAudioElement | null {
  if (!canUseAudio()) return null;
  let a = cache.get(id);
  if (!a) {
    a = new Audio(FILES[id]);
    a.preload = "auto";
    cache.set(id, a);
  }
  return a;
}

export function stopStadiumSound(): void {
  if (stopTimer != null) {
    window.clearTimeout(stopTimer);
    stopTimer = undefined;
  }
  if (current) {
    try {
      current.pause();
      current.currentTime = 0;
    } catch {
      /* ignore */
    }
    current = null;
  }
}

export function playStadiumSound(
  id: StadiumSoundId,
  opts?: { volume?: number; maxMs?: number }
): void {
  // Wibracja niezależnie od wyciszenia dźwięku (ten sam moment UX).
  void import("@/lib/haptics").then((m) => m.hapticForStadiumSound(id));

  if (!canUseAudio() || isStadiumSoundsMuted()) return;
  unlockStadiumSounds();

  const audio = getAudio(id);
  if (!audio) return;

  stopStadiumSound();
  current = audio;
  try {
    audio.currentTime = 0;
  } catch {
    /* ignore */
  }
  audio.volume = Math.min(1, Math.max(0, opts?.volume ?? DEFAULT_VOLUME[id]));

  const playPromise = audio.play();
  if (playPromise) {
    void playPromise.catch(() => {
      /* autoplay zablokowany — czekamy na gest */
    });
  }

  const maxMs = opts?.maxMs ?? DEFAULT_MAX_MS[id];
  if (maxMs != null && maxMs > 0) {
    stopTimer = window.setTimeout(() => {
      if (current === audio) {
        try {
          audio.pause();
          audio.currentTime = 0;
        } catch {
          /* ignore */
        }
        current = null;
      }
    }, maxMs);
  }
}

/** Sukces ogólny (zapis na mecz, potwierdzenie). */
export function playStadiumApplause(): void {
  playStadiumSound("applause");
}

/** Gol / mocny wynik. */
export function playStadiumGoal(): void {
  playStadiumSound("goal");
}

/** Losowanie kapitana / wygrana. */
export function playStadiumCheer(): void {
  playStadiumSound("cheer");
}

/** Start meczu / „rozegrano”. */
export function playStadiumWhistle(): void {
  playStadiumSound("whistle");
}

/** Lekki ambient tłumu (np. po odblokowaniu). */
export function playStadiumCrowd(): void {
  playStadiumSound("crowd", { volume: 0.18, maxMs: 5000 });
}

function hasPlayedEntrySound(): boolean {
  if (!canUseAudio()) return true;
  try {
    return sessionStorage.getItem(ENTRY_SOUND_KEY) === "1";
  } catch {
    return false;
  }
}

function markEntrySoundPlayed(): void {
  try {
    sessionStorage.setItem(ENTRY_SOUND_KEY, "1");
  } catch {
    /* private mode */
  }
}

/**
 * Dźwięk przy wejściu na stronę (raz na kartę/sesję).
 * W przeglądarce zwykle odpali się dopiero po pierwszym geście (autoplay policy).
 */
export function playStadiumEntranceIfNeeded(): void {
  if (!canUseAudio() || isStadiumSoundsMuted() || hasPlayedEntrySound()) return;

  unlockStadiumSounds();

  const audio = getAudio("whistle");
  if (!audio) return;

  stopStadiumSound();
  current = audio;
  try {
    audio.currentTime = 0;
  } catch {
    /* ignore */
  }
  audio.volume = 0.38;

  void import("@/lib/haptics").then((m) => m.hapticForStadiumSound("whistle"));

  const playPromise = audio.play();
  if (!playPromise) {
    markEntrySoundPlayed();
    return;
  }

  void playPromise
    .then(() => {
      markEntrySoundPlayed();
      stopTimer = window.setTimeout(() => {
        if (current === audio) {
          try {
            audio.pause();
            audio.currentTime = 0;
          } catch {
            /* ignore */
          }
          current = null;
        }
      }, 1600);
    })
    .catch(() => {
      /* autoplay zablokowany — StadiumSoundsUnlock zagra po geście */
      current = null;
    });
}
