"use client";

/**
 * Krótkie, ciche sygnały UI (Web Audio) zamiast nagrań stadionu.
 * Żadnego gwizdka przy wejściu na stronę — dźwięk tylko przy konkretnej akcji.
 */

export type StadiumSoundId = "applause" | "cheer" | "goal" | "whistle" | "crowd";

const MUTE_KEY = "awp-sounds-muted";

type CueNote = {
  freq: number;
  at: number;
  dur: number;
  gain: number;
  type?: OscillatorType;
};

const CUES: Record<StadiumSoundId, CueNote[]> = {
  applause: [
    { freq: 392, at: 0, dur: 0.16, gain: 0.07 },
    { freq: 523.25, at: 0.09, dur: 0.2, gain: 0.055 },
  ],
  cheer: [
    { freq: 349.23, at: 0, dur: 0.12, gain: 0.06 },
    { freq: 440, at: 0.08, dur: 0.14, gain: 0.055 },
    { freq: 523.25, at: 0.16, dur: 0.18, gain: 0.05 },
  ],
  goal: [
    { freq: 261.63, at: 0, dur: 0.22, gain: 0.06, type: "triangle" },
    { freq: 329.63, at: 0.05, dur: 0.22, gain: 0.05, type: "triangle" },
    { freq: 392, at: 0.12, dur: 0.28, gain: 0.045 },
  ],
  whistle: [{ freq: 587.33, at: 0, dur: 0.14, gain: 0.045 }],
  crowd: [{ freq: 196, at: 0, dur: 0.22, gain: 0.035, type: "triangle" }],
};

let unlocked = false;
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let stopTimer: number | undefined;

function canUseAudio(): boolean {
  return typeof window !== "undefined";
}

function prefersQuiet(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
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

function ensureContext(): AudioContext | null {
  if (!canUseAudio()) return null;
  const AC = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!ctx) {
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.85;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

/** Wywołaj po pierwszej interakcji użytkownika (klik / touch / key). */
export function unlockStadiumSounds(): void {
  if (!canUseAudio() || unlocked) {
    if (unlocked) ensureContext();
    return;
  }
  unlocked = true;
  ensureContext();
}

export function stopStadiumSound(): void {
  if (stopTimer != null) {
    window.clearTimeout(stopTimer);
    stopTimer = undefined;
  }
  if (!ctx || !master) return;
  const now = ctx.currentTime;
  try {
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(0.0001, now);
  } catch {
    /* ignore */
  }
  const next = ctx.createGain();
  next.gain.value = 0.85;
  next.connect(ctx.destination);
  master.disconnect();
  master = next;
}

function playCue(id: StadiumSoundId): void {
  const audio = ensureContext();
  if (!audio || !master) return;

  const filter = audio.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 1600;
  filter.Q.value = 0.7;
  filter.connect(master);

  let endAt = 0;
  for (const note of CUES[id]) {
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = note.type ?? "sine";
    osc.frequency.value = note.freq;
    const start = audio.currentTime + note.at;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(note.gain, start + 0.016);
    gain.gain.exponentialRampToValueAtTime(0.0008, start + note.dur);
    osc.connect(gain);
    gain.connect(filter);
    osc.start(start);
    osc.stop(start + note.dur + 0.03);
    endAt = Math.max(endAt, note.at + note.dur);
  }

  stopTimer = window.setTimeout(() => {
    try {
      filter.disconnect();
    } catch {
      /* ignore */
    }
  }, Math.ceil((endAt + 0.08) * 1000));
}

export function playStadiumSound(id: StadiumSoundId, _opts?: { volume?: number; maxMs?: number }): void {
  void import("@/lib/haptics").then((m) => m.hapticForStadiumSound(id));

  if (!canUseAudio() || isStadiumSoundsMuted() || prefersQuiet()) return;
  unlockStadiumSounds();
  stopStadiumSound();
  playCue(id);
}

export function playStadiumApplause(): void {
  playStadiumSound("applause");
}

export function playStadiumGoal(): void {
  playStadiumSound("goal");
}

export function playStadiumCheer(): void {
  playStadiumSound("cheer");
}

export function playStadiumWhistle(): void {
  playStadiumSound("whistle");
}

export function playStadiumCrowd(): void {
  playStadiumSound("crowd");
}

/** Zostawione dla kompatybilności — przy wejściu na stronę nic nie gra. */
export function playStadiumEntranceIfNeeded(): void {
  unlockStadiumSounds();
}
