import { useSyncExternalStore } from 'react';
import { loadJSON, saveJSON } from './storage';

/**
 * Sounds und Vibration. Die Töne werden mit der Web-Audio-API erzeugt,
 * es gibt also keine Tondateien und alles funktioniert offline.
 */

const KEY = 'hh-hunt:sound';
let soundOn = loadJSON<boolean>(KEY, true);
const listeners = new Set<() => void>();

export function useSoundOn(): boolean {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => soundOn,
  );
}

export function setSoundOn(v: boolean): void {
  soundOn = v;
  saveJSON(KEY, v);
  listeners.forEach((l) => l());
  if (v) play('tap');
}

let ctx: AudioContext | null = null;
function audio(): AudioContext | null {
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx ??= new AC();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(c: AudioContext, freq: number, start: number, dur: number, type: OscillatorType = 'sine', gain = 0.18, slideTo?: number) {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, c.currentTime + start);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, c.currentTime + start + dur);
  g.gain.setValueAtTime(0.0001, c.currentTime + start);
  g.gain.exponentialRampToValueAtTime(gain, c.currentTime + start + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + start + dur);
  o.connect(g).connect(c.destination);
  o.start(c.currentTime + start);
  o.stop(c.currentTime + start + dur + 0.05);
}

export type Cue = 'tap' | 'select' | 'found' | 'correct' | 'wrong' | 'coin' | 'unlock' | 'treasure' | 'gull' | 'soft';

const HAPTICS: Record<Cue, number | number[]> = {
  tap: 8,
  select: 12,
  found: [40, 60, 40, 60, 120],
  correct: [30, 40, 60],
  wrong: [80, 60, 80],
  coin: 20,
  unlock: [20, 30, 20],
  treasure: [60, 80, 60, 80, 200],
  gull: 0,
  soft: 0,
};

export function haptic(cue: Cue): void {
  try {
    const p = HAPTICS[cue];
    if (p) navigator.vibrate?.(p);
  } catch {
    /* nicht unterstützt */
  }
}

/** Kurzer Ton + passende Vibration */
export function play(cue: Cue): void {
  haptic(cue);
  if (!soundOn) return;
  const c = audio();
  if (!c) return;
  switch (cue) {
    case 'tap':
      tone(c, 880, 0, 0.05, 'sine', 0.06);
      break;
    case 'select':
      tone(c, 660, 0, 0.07, 'triangle', 0.1);
      break;
    case 'coin':
      tone(c, 988, 0, 0.08, 'square', 0.06);
      tone(c, 1319, 0.07, 0.18, 'square', 0.06);
      break;
    case 'correct':
      tone(c, 523, 0, 0.12, 'triangle');
      tone(c, 659, 0.1, 0.12, 'triangle');
      tone(c, 784, 0.2, 0.25, 'triangle');
      break;
    case 'wrong':
      tone(c, 311, 0, 0.18, 'sawtooth', 0.07);
      tone(c, 233, 0.16, 0.25, 'sawtooth', 0.07);
      break;
    case 'found':
      // Möwenruf: zwei schnelle, abfallende Schreie, dann ein Glockenakkord
      tone(c, 1500, 0, 0.18, 'sawtooth', 0.05, 900);
      tone(c, 1600, 0.2, 0.22, 'sawtooth', 0.05, 950);
      tone(c, 784, 0.45, 0.6, 'sine', 0.16);
      tone(c, 988, 0.45, 0.6, 'sine', 0.12);
      tone(c, 1175, 0.45, 0.7, 'sine', 0.1);
      break;
    case 'gull':
      tone(c, 1500, 0, 0.18, 'sawtooth', 0.05, 900);
      tone(c, 1600, 0.2, 0.22, 'sawtooth', 0.05, 950);
      break;
    case 'unlock':
      tone(c, 1200, 0, 0.04, 'square', 0.05);
      tone(c, 800, 0.06, 0.06, 'square', 0.05);
      break;
    case 'treasure':
      [523, 659, 784, 1047, 1319].forEach((f, i) => tone(c, f, i * 0.09, 0.4, 'triangle', 0.12));
      tone(c, 1568, 0.5, 0.9, 'sine', 0.1);
      break;
    case 'soft':
      tone(c, 392, 0, 0.9, 'sine', 0.06);
      break;
  }
}

/**
 * Fröhliche Schleifen-Melodie (für Lillis Freeze-Tanz).
 * Liefert eine Stopp-Funktion. Spielt nur, wenn Töne eingeschaltet sind.
 */
export function startMelody(): () => void {
  if (!soundOn) return () => {};
  const c = audio();
  if (!c) return () => {};
  const notes = [523, 659, 784, 659, 587, 698, 880, 698, 523, 659, 784, 1047, 988, 784, 659, 587];
  let i = 0;
  const step = () => {
    const f = notes[i % notes.length];
    tone(c, f, 0, 0.16, 'triangle', 0.12);
    if (i % 4 === 0) tone(c, f / 2, 0, 0.22, 'sine', 0.1);
    i++;
  };
  step();
  const t = setInterval(step, 180);
  return () => clearInterval(t);
}
