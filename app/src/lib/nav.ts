import { flushSync } from 'react-dom';

/**
 * Sanfte Bildschirmwechsel: vorwärts gleitet der neue Bildschirm von rechts herein, zurück nach rechts hinaus.
 * Nutzt die View Transitions API, wo es sie gibt (Chrome, Safari 18+); sonst übernimmt eine CSS-Animation.
 * Bei "Bewegung reduzieren" wird sofort umgeschaltet.
 */
export type NavDir = 'forward' | 'back' | 'left' | 'right' | 'fade';

type ViewTransition = { finished: Promise<void>; ready: Promise<void>; updateCallbackDone: Promise<void> };
type VTDocument = Document & { startViewTransition?: (cb: () => void) => ViewTransition };

export function reducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

export const hasViewTransitions = (): boolean => typeof document !== 'undefined' && typeof (document as VTDocument).startViewTransition === 'function';

/** Zustand ändern und dabei sanft überblenden */
export function transition(update: () => void, dir: NavDir = 'fade'): void {
  const doc = document as VTDocument;
  if (!hasViewTransitions() || reducedMotion()) {
    update();
    return;
  }
  document.documentElement.dataset.nav = dir;
  const vt = doc.startViewTransition!(() => flushSync(update));
  // Bricht der Browser die Animation ab (z. B. weil die Tastatur die Größe ändert), ist das harmlos
  vt.ready.catch(() => {});
  vt.updateCallbackDone.catch(() => {});
  vt.finished
    .catch(() => {})
    .finally(() => {
      delete document.documentElement.dataset.nav;
    });
}
