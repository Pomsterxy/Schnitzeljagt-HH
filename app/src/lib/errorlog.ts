/**
 * Fehler-Tagebuch: technische Fehler werden nur auf dem Handy gespeichert (höchstens 30)
 * und lassen sich zusammen mit den Meldungen teilen. Es geht nichts an einen Server.
 */
import { useSyncExternalStore } from 'react';

export interface ErrorEntry {
  at: number;
  msg: string;
  where?: string;
  screen?: string;
  count: number;
}

const KEY = 'hh-hunt:errors';
const MAX = 30;
let entries: ErrorEntry[] = [];
try {
  entries = JSON.parse(localStorage.getItem(KEY) ?? '[]') as ErrorEntry[];
} catch {
  entries = [];
}
const listeners = new Set<() => void>();

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(entries));
  } catch {
    /* Speicher voll: dann eben nicht */
  }
  listeners.forEach((l) => l());
}

/** Harmlose Meldungen, die nichts kaputt machen */
const IGNORE = /ResizeObserver loop|Script error\.?$|AbortError|The play\(\) request was interrupted|^Load failed$|^Failed to fetch$|NetworkError when attempting/i;

export function logError(err: unknown, where?: string): void {
  const e = err as { message?: string; stack?: string } | undefined;
  const msg = String(e?.message ?? err ?? 'Unbekannter Fehler').slice(0, 300);
  if (IGNORE.test(msg)) return;
  // Erste Zeile im Stapel, die auf unseren Code zeigt (Dateiname ohne Pfad)
  const frame = e?.stack
    ?.split('\n')
    .map((l) => l.trim())
    .find((l) => /assets\/|src\//.test(l));
  const loc = where ?? frame?.replace(/^at\s+/, '').replace(/https?:\/\/[^)]*\/(assets|src)\//, '$1/').slice(0, 120);
  const screen = typeof document !== 'undefined' ? (document.querySelector('[data-screen]')?.getAttribute('data-screen') ?? location.hash) : undefined;
  const last = entries[entries.length - 1];
  if (last && last.msg === msg && last.where === loc) {
    entries = [...entries.slice(0, -1), { ...last, at: Date.now(), count: last.count + 1 }];
  } else {
    entries = [...entries, { at: Date.now(), msg, where: loc, screen: screen || undefined, count: 1 }].slice(-MAX);
  }
  save();
}

export function clearErrors(): void {
  entries = [];
  save();
}

export function useErrors(): ErrorEntry[] {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => entries,
  );
}

export function errorsText(list: ErrorEntry[]): string {
  if (!list.length) return '';
  const lines = list.map((e) => {
    const when = new Date(e.at).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' });
    return `• ${when}${e.count > 1 ? ` (${e.count}×)` : ''}: ${e.msg}${e.where ? ` @ ${e.where}` : ''}${e.screen ? ` [${e.screen}]` : ''}`;
  });
  return `Technische Fehler (${list.length})\n${lines.join('\n')}`;
}

/** Gerät und Version, damit Fehler zuzuordnen sind */
export function deviceLine(): string {
  const ua = navigator.userAgent;
  const os = /iPhone|iPad/.test(ua) ? `iOS ${/OS (\d+[_.]\d+)/.exec(ua)?.[1]?.replace('_', '.') ?? ''}` : /Android/.test(ua) ? `Android ${/Android (\d+(\.\d+)?)/.exec(ua)?.[1] ?? ''}` : 'Desktop';
  const browser = /CriOS|Chrome\//.test(ua) ? 'Chrome' : /FxiOS|Firefox/.test(ua) ? 'Firefox' : /Safari/.test(ua) ? 'Safari' : 'Browser';
  const standalone = matchMedia?.('(display-mode: standalone)').matches ? ', als App installiert' : '';
  return `Gerät: ${os.trim()}, ${browser}${standalone}, ${screen.width}×${screen.height} · Version ${__BUILD_TIME__.slice(0, 16).replace('T', ' ')}`;
}

/** Globale Fehler mitschreiben */
export function watchErrors(): void {
  window.addEventListener('error', (ev) => logError(ev.error ?? ev.message));
  window.addEventListener('unhandledrejection', (ev) => logError(ev.reason, 'Promise'));
}
