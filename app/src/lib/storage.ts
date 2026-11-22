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
