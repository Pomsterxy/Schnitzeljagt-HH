import { useState } from 'react';
import type { LatLng } from '../data/types';
import { distance, formatDistance } from '../lib/geo';
import { loadJSON } from '../lib/storage';
import { MapView } from './MapView';
import { Icon } from './Icon';
import { CacheDetail, TYPE_ICON, foundCaches } from './CacheDetail';

export const OC_KEY_STORAGE = 'hh-hunt:opencachingKey';
/** Öffentlicher Opencaching-Schlüssel der App (OKAPI Level 1, kein Geheimnis – identifiziert nur die App) */
export const OPENCACHING_KEY = 'LKNuffKqwDskSw6Wr33m';
const RADIUS_KM = 2;

export interface OcCache {
  code: string;
  name: string;
  location: string;
  type: string;
  difficulty: number;
  terrain: number;
  size2: string;
  url: string;
  status: string;
  attribution_note?: string;
}

const TYPE_DE: Record<string, string> = {
  Traditional: 'Tradi',
  Multi: 'Multi-Cache',
  Quiz: 'Rätsel-Cache',
  Virtual: 'Virtuell',
  Event: 'Event',
  Webcam: 'Webcam',
  Moving: 'Wandernd',
  Math: 'Mathe/Physik',
  Drive_In: 'Drive-In',
  Other: 'Sonstige',
};

/** Live-Abfrage bei Opencaching.de (OKAPI, CORS-fähig) mit dem Schlüssel der App */
export async function fetchNearbyCaches(center: LatLng, key: string, radiusKm = RADIUS_KM): Promise<OcCache[]> {
  const params = new URLSearchParams({
    search_method: 'services/caches/search/nearest',
    search_params: JSON.stringify({ center: `${center[0]}|${center[1]}`, radius: radiusKm, limit: 15, status: 'Available' }),
    retr_method: 'services/caches/geocaches',
    retr_params: JSON.stringify({ fields: 'code|name|location|type|difficulty|terrain|size2|url|status|attribution_note' }),
    wrap: 'false',
    consumer_key: key,
  });
  const r = await fetch(`https://www.opencaching.de/okapi/services/caches/shortcuts/search_and_retrieve?${params}`);
  if (!r.ok) throw new Error(r.status === 400 || r.status === 401 ? 'Schlüssel ungültig' : `Fehler ${r.status}`);
  const data = (await r.json()) as Record<string, OcCache>;
  const at = (c: OcCache) => c.location.split('|').map(Number) as LatLng;
  return Object.values(data).sort((a, b) => distance(center, at(a)) - distance(center, at(b)));
}

export function geocachingMapUrl(c: LatLng) {
  return `https://www.geocaching.com/play/map?lat=${c[0].toFixed(5)}&lng=${c[1].toFixed(5)}&zoom=16`;
}
export function opencachingMapUrl(c: LatLng) {
  return `https://www.opencaching.de/map2.php?lat=${c[0].toFixed(5)}&lon=${c[1].toFixed(5)}&zoom=16`;
}

export function NearbyCaches({ center, title = '🌍 Echte Geocaches in der Nähe' }: { center: LatLng; title?: string }) {
  // Eigener Schlüssel (alte Einstellung) hat Vorrang, sonst der der App
  const key = loadJSON<string>(OC_KEY_STORAGE, '') || OPENCACHING_KEY;
  const [list, setList] = useState<OcCache[] | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [found, setFound] = useState<string[]>(foundCaches);
  const load = async () => {
    setBusy(true);
    setErr('');
    try {
      setList(await fetchNearbyCaches(center, key));
    } catch (e) {
      setErr(navigator.onLine ? `Konnte Caches nicht laden (${(e as Error).message}).` : 'Dafür braucht ihr Internet.');
    }
    setBusy(false);
  };

  return (
    <details
      className="nearby-caches"
      onToggle={(e) => {
        // beim Aufklappen gleich laden
        if ((e.currentTarget as HTMLDetailsElement).open && !list && !busy) void load();
      }}
    >
      <summary>{title}</summary>
      <p className="muted">
        Echte Geocaches sind Verstecke, die andere Menschen angelegt haben, meist eine Dose mit Logbuch. Tippt einen Cache an: Die App
        führt euch hin und zeigt Beschreibung, Hinweis und Logbuch.
      </p>
      <div className="row">
        <a className="btn small" href={geocachingMapUrl(center)} target="_blank" rel="noreferrer">
          Weitere Caches auf Geocaching.com
        </a>
      </div>
      {busy && (
        <p className="muted" data-testid="caches-loading">
          Caches werden geladen …
        </p>
      )}
      {!busy && (err || list) && (
        <button type="button" className="btn small" onClick={() => void load()}>
          Neu laden
        </button>
      )}
      {err && <p className="error">{err}</p>}
      {list && list.length === 0 && <p className="muted">Keine Opencaching-Caches im Umkreis von 2 km.</p>}
      {list && list.length > 0 && (
        <>
          <MapView
            markers={list.map((c) => ({ id: c.code, coords: c.location.split('|').map(Number) as LatLng, emoji: TYPE_ICON[c.type] ?? '📍', label: c.name, done: found.includes(c.code) }))}
            fit={[center, ...list.map((c) => c.location.split('|').map(Number) as LatLng)]}
            onMarkerClick={setOpen}
            height={200}
          />
          <ul className="cache-list" data-testid="cache-list">
            {list.map((c) => {
              const [la, lo] = c.location.split('|').map(Number);
              return (
                <li key={c.code}>
                  <button type="button" className="cache-item" onClick={() => setOpen(c.code)}>
                    <span className="cache-icon" aria-hidden="true">
                      {TYPE_ICON[c.type] ?? '📍'}
                    </span>
                    <span className="cache-text">
                      <strong>
                        {found.includes(c.code) ? '✓ ' : ''}
                        {c.name}
                      </strong>
                      <small>
                        {TYPE_DE[c.type] ?? c.type} · D {c.difficulty} · T {c.terrain} · {formatDistance(distance(center, [la, lo]))}
                      </small>
                    </span>
                    <Icon name="next" size={16} color="var(--label2)" />
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="muted" style={{ fontSize: 12 }}>
            Daten: Opencaching.de, Inhalte der jeweiligen Cache-Besitzer (CC BY-NC-ND).
          </p>
        </>
      )}
      {open && (
        <CacheDetail
          code={open}
          apiKey={key}
          onClose={() => {
            setOpen(null);
            setFound(foundCaches());
          }}
        />
      )}
    </details>
  );
}
