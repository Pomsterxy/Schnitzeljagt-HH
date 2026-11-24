/**
 * Schrittzähler über den Beschleunigungssensor (DeviceMotion).
 * Eine Web-App hat keinen Zugriff auf den Schrittzähler des Handys (Apple Health / Google Fit),
 * daher zählen wir selbst, solange die App geöffnet ist. Fällt der Sensor aus, wird aus der
 * GPS-Strecke geschätzt (siehe estimateSteps).
 */

/** Erkennt Schritte als Spitzen in der geglätteten Beschleunigung */
export class StepDetector {
  private fast = 9.81;
  private slow = 9.81;
  private armed = false;
  private lastStep = -Infinity;
  /** Mindestabstand zwischen zwei Schritten in ms (max. ~3,5 Schritte/s) */
  minInterval = 280;
  /** Mindestausschlag über der Grundlinie in m/s² */
  threshold = 1.1;

  /** Neue Messung; liefert true, wenn ein Schritt erkannt wurde */
  push(t: number, x: number, y: number, z: number): boolean {
    const m = Math.sqrt(x * x + y * y + z * z);
    this.fast += (m - this.fast) * 0.25;
    this.slow += (m - this.slow) * 0.02;
    const d = this.fast - this.slow;
    if (d < 0) this.armed = true;
    if (this.armed && d > this.threshold && t - this.lastStep > this.minInterval) {
      this.armed = false;
      this.lastStep = t;
      return true;
    }
    return false;
  }
}

type DME = typeof DeviceMotionEvent & { requestPermission?: () => Promise<'granted' | 'denied'> };

let permission: 'unknown' | 'granted' | 'denied' | 'unsupported' = 'unknown';

/** Muss auf iOS direkt in einem Tipp/Klick aufgerufen werden */
export async function requestMotionPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || typeof DeviceMotionEvent === 'undefined') {
    permission = 'unsupported';
    return false;
  }
  const D = DeviceMotionEvent as DME;
  if (typeof D.requestPermission === 'function') {
    try {
      permission = (await D.requestPermission()) === 'granted' ? 'granted' : 'denied';
    } catch {
      permission = 'denied';
    }
  } else permission = 'granted';
  return permission === 'granted';
}

let running = false;
let handler: ((e: DeviceMotionEvent) => void) | null = null;

/** Startet das Zählen; onSteps bekommt die Anzahl neuer Schritte (gebündelt) */
export function startPedometer(onSteps: (n: number) => void): () => void {
  // Auch bei "verweigert" lauschen: kommen keine Daten, zählt die App die Schritte aus der Strecke
  if (running || typeof window === 'undefined' || typeof DeviceMotionEvent === 'undefined') return () => {};
  running = true;
  const det = new StepDetector();
  let pending = 0;
  handler = (e: DeviceMotionEvent) => {
    const a = e.accelerationIncludingGravity;
    if (!a || a.x == null || a.y == null || a.z == null) return;
    if (det.push(e.timeStamp || performance.now(), a.x, a.y, a.z)) pending++;
  };
  window.addEventListener('devicemotion', handler);
  const flush = setInterval(() => {
    if (pending) {
      onSteps(pending);
      pending = 0;
    }
  }, 3000);
  return () => {
    if (handler) window.removeEventListener('devicemotion', handler);
    handler = null;
    clearInterval(flush);
    if (pending) onSteps(pending);
    running = false;
  };
}

/** Typische Schrittlänge in Metern nach Altersstufe */
export function strideFor(age: 'kids' | 'tweens' | 'adults'): number {
  return age === 'kids' ? 0.5 : age === 'tweens' ? 0.6 : 0.72;
}

export function estimateSteps(meters: number, stride: number): number {
  return Math.round(meters / stride);
}

export function formatDuration(ms: number): string {
  const min = Math.max(0, Math.round(ms / 60000));
  if (min < 1) return '< 1 min';
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

export function formatSteps(n: number): string {
  return n.toLocaleString('de-DE');
}
