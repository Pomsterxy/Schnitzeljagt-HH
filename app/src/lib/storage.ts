import { del, get, set, keys } from 'idb-keyval';

/** Kleiner, fehlertoleranter Wrapper um localStorage (privater Modus etc.) */
export function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function saveJSON(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* Speicher voll oder gesperrt – Spiel läuft trotzdem weiter */
  }
}

export function removeKey(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* egal */
  }
}

const PHOTO_PREFIX = 'photo:';

export async function savePhoto(id: string, blob: Blob): Promise<void> {
  try {
    await set(PHOTO_PREFIX + id, blob);
  } catch {
    /* IndexedDB nicht verfügbar */
  }
}

export async function loadPhoto(id: string): Promise<Blob | undefined> {
  try {
    return await get<Blob>(PHOTO_PREFIX + id);
  } catch {
    return undefined;
  }
}

export async function deletePhotos(ids: string[]): Promise<void> {
  try {
    await Promise.all(ids.map((id) => del(PHOTO_PREFIX + id)));
  } catch {
    /* egal */
  }
}

export async function allPhotoIds(): Promise<string[]> {
  try {
    return (await keys()).map(String).filter((k) => k.startsWith(PHOTO_PREFIX)).map((k) => k.slice(PHOTO_PREFIX.length));
  } catch {
    return [];
  }
}

/** Foto verkleinern, damit der Speicher nicht vollläuft */
export async function compressImage(file: Blob, maxSide = 1600, quality = 0.82): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((res) => canvas.toBlob((b) => res(b ?? file), 'image/jpeg', quality));
  } catch {
    return file;
  }
}

// ---------- Sicherung ----------

/** Alle eigenen Schlüssel im localStorage */
const BACKUP_KEYS = ['hh-hunt:game', 'hh-hunt:career', 'hh-hunt:lastTeam', 'hh-hunt:reports'];
const MIRROR = 'backup:mirror';
let mirrorTimer: ReturnType<typeof setTimeout> | null = null;

/** Zweite Kopie in IndexedDB (falls localStorage verloren geht). Gebündelt, höchstens alle 1,5 s. */
export function mirrorState(): void {
  if (mirrorTimer) clearTimeout(mirrorTimer);
  mirrorTimer = setTimeout(() => {
    const data: Record<string, string | null> = {};
    try {
      for (const k of BACKUP_KEYS) data[k] = localStorage.getItem(k);
    } catch {
      return;
    }
    void set(MIRROR, { at: Date.now(), data }).catch(() => {});
  }, 1500);
}

/**
 * Nur wenn der localStorage komplett leer ist (z. B. vom Browser geleert), die Kopie zurückholen.
 * Liefert true, wenn etwas wiederhergestellt wurde.
 */
export async function restoreMirrorIfEmpty(): Promise<boolean> {
  try {
    if (BACKUP_KEYS.some((k) => localStorage.getItem(k) !== null)) return false;
    const m = await get<{ at: number; data: Record<string, string | null> }>(MIRROR);
    if (!m) return false;
    let restored = false;
    for (const [k, v] of Object.entries(m.data)) {
      if (v !== null && BACKUP_KEYS.includes(k)) {
        localStorage.setItem(k, v);
        restored = true;
      }
    }
    return restored;
  } catch {
    return false;
  }
}

/** Browser bitten, unsere Daten nicht automatisch zu löschen */
export function askPersistentStorage(): void {
  try {
    void navigator.storage?.persist?.();
  } catch {
    /* nicht unterstützt */
  }
}

/** Sicherungsdatei erstellen (ohne Fotos) */
export function exportBackup(): string {
  const data: Record<string, unknown> = {};
  for (const k of BACKUP_KEYS) data[k] = loadJSON(k, null);
  return JSON.stringify({ app: 'schnitzeljagd-hh', version: 1, at: new Date().toISOString(), data }, null, 1);
}

/** Sicherungsdatei einspielen; wirft bei ungültiger Datei */
export function importBackup(text: string): void {
  const parsed = JSON.parse(text) as { app?: string; data?: Record<string, unknown> };
  if (parsed.app !== 'schnitzeljagd-hh' || !parsed.data) throw new Error('Keine Sicherung dieser App');
  for (const k of BACKUP_KEYS) {
    const v = parsed.data[k];
    if (v === null || v === undefined) removeKey(k);
    else saveJSON(k, v);
  }
}
