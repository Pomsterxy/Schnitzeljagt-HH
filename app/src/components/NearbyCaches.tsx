import { useState } from 'react';
import type { LatLng } from '../data/types';
import { distance, formatDistance } from '../lib/geo';
import { loadJSON } from '../lib/storage';

export const OC_KEY_STORAGE = 'hh-hunt:opencachingKey';

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

/** Live-Abfrage bei Opencaching.de (OKAPI, CORS-fähig). Braucht einen eigenen kostenlosen Schlüssel. */
export async function fetchNearbyCaches(center: LatLng, key: string, radiusKm = 1): Promise<OcCache[]> {
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
  return Object.values(data);
}

export function geocachingMapUrl(c: LatLng) {
  return `https://www.geocaching.com/play/map?lat=${c[0].toFixed(5)}&lng=${c[1].toFixed(5)}&zoom=16`;
}
export function opencachingMapUrl(c: LatLng) {
  return `https://www.opencaching.de/map2.php?lat=${c[0].toFixed(5)}&lon=${c[1].toFixed(5)}&zoom=16`;
}

export function NearbyCaches({ center, title = '🌍 Echte Geocaches in der Nähe' }: { center: LatLng; title?: string }) {
  const key = loadJSON<string>(OC_KEY_STORAGE, '');
  const [list, setList] = useState<OcCache[] | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  return (
    <details className="nearby-caches">
      <summary>{title}</summary>
      <p className="muted">
        Echte Geocaches sind Verstecke, die andere Menschen angelegt haben, meist eine Dose mit Logbuch. Zum Suchen und Loggen braucht
        ihr ein (kostenloses) Konto bei Geocaching.com oder Opencaching.de. Bitte legt den Cache nach dem Finden genau so zurück, wie
        ihr ihn vorgefunden habt.
      </p>
      <div className="row">
        <a className="btn small" href={geocachingMapUrl(center)} target="_blank" rel="noreferrer">
          Karte auf Geocaching.com
        </a>
        <a className="btn small" href={opencachingMapUrl(center)} target="_blank" rel="noreferrer">
          Karte auf Opencaching.de
        </a>
      </div>
      {key ? (
        <button
          type="button"
          className="btn small"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setErr('');
            try {
              setList(await fetchNearbyCaches(center, key));
            } catch (e) {
              setErr(navigator.onLine ? `Konnte Caches nicht laden (${(e as Error).message}).` : 'Dafür braucht ihr Internet.');
            }
            setBusy(false);
          }}
        >
          {busy ? 'Lade …' : 'Opencaching-Caches im Umkreis von 1 km anzeigen'}
        </button>
      ) : (
        <p className="muted">Tipp: Mit einem eigenen Opencaching-Schlüssel (Einstellungen) zeigt die App Caches direkt hier an.</p>
      )}
      {err && <p className="error">{err}</p>}
      {list && list.length === 0 && <p className="muted">Keine Opencaching-Caches im Umkreis von 1 km.</p>}
      {list && list.length > 0 && (
        <ul className="cache-list">
          {list.map((c) => {
            const [la, lo] = c.location.split('|').map(Number);
            return (
              <li key={c.code}>
                <a href={c.url} target="_blank" rel="noreferrer">
                  <strong>{c.name}</strong>
                </a>{' '}
                ({c.code})<br />
                <small>
                  {TYPE_DE[c.type] ?? c.type} · Schwierigkeit {c.difficulty} · Gelände {c.terrain} · {formatDistance(distance(center, [la, lo]))}
                </small>
              </li>
            );
          })}
          <li className="muted">
            <small>Daten: Opencaching.de, Inhalte der jeweiligen Cache-Besitzer.</small>
          </li>
        </ul>
      )}
    </details>
  );
}
