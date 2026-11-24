import { useEffect, useMemo, useRef, useState } from 'react';
import DOMPurify from 'dompurify';
import type { LatLng } from '../data/types';
import { bearing, distance } from '../lib/geo';
import { startTracking, usePosition } from '../lib/location';
import { play } from '../lib/feedback';
import { celebrateUnlock } from '../lib/effects';
import { loadJSON, saveJSON } from '../lib/storage';
import { Compass } from './Compass';
import { MapView } from './MapView';
import { DotLoader } from './Micro';
import { Icon } from './Icon';

export interface OcCacheDetail {
  code: string;
  name: string;
  location: string;
  type: string;
  status: string;
  owner: { username: string };
  size2: string;
  difficulty: number;
  terrain: number;
  short_description: string;
  description: string;
  hint2: string;
  images: { url: string; thumb_url: string; caption: string; is_spoiler: boolean }[];
  attrnames: string[];
  latest_logs: { uuid: string; date: string; user: { username: string }; type: string; comment: string }[];
  date_hidden: string;
  founds: number;
  notfounds: number;
  recommendations: number;
  attribution_note: string;
  url: string;
  req_passwd: boolean;
}

export const TYPE_ICON: Record<string, string> = {
  Traditional: '📦',
  Multi: '🧩',
  Quiz: '❓',
  Virtual: '👻',
  Event: '🎉',
  Webcam: '📷',
  Moving: '🚲',
  Math: '🧮',
  Drive_In: '🚗',
  Other: '📍',
};
const TYPE_DE: Record<string, string> = {
  Traditional: 'Traditioneller Cache',
  Multi: 'Multi-Cache',
  Quiz: 'Rätsel-Cache',
  Virtual: 'Virtueller Cache',
  Event: 'Event',
  Webcam: 'Webcam-Cache',
  Moving: 'Wandernder Cache',
  Math: 'Mathe-/Physik-Cache',
  Drive_In: 'Drive-In',
  Other: 'Sonstiger Cache',
};
const SIZE_DE: Record<string, string> = { none: 'ohne Dose', nano: 'Nano', micro: 'Mikro', small: 'Klein', regular: 'Normal', large: 'Groß', xlarge: 'Sehr groß', other: 'Andere' };
const LOG_ICON: Record<string, string> = { 'Found it': '✅', "Didn't find it": '❌', Comment: '💬', 'Attended': '🎉', 'Will attend': '📅', 'Temporarily unavailable': '⏸️', 'Ready to search': '▶️', Archived: '🗄️', 'Needs maintenance': '🔧', 'Maintenance performed': '🛠️' };

const DETAIL_FIELDS =
  'code|name|location|type|status|owner|size2|difficulty|terrain|short_description|description|hint2|images|attrnames|latest_logs|date_hidden|founds|notfounds|recommendations|attribution_note|url|req_passwd';
const memo = new Map<string, OcCacheDetail>();

/** Alle Angaben zu einem Cache bei Opencaching.de abrufen (auf Deutsch, mit den letzten Logs) */
export async function fetchCacheDetail(code: string, key: string): Promise<OcCacheDetail> {
  const hit = memo.get(code);
  if (hit) return hit;
  const params = new URLSearchParams({ cache_code: code, langpref: 'de|en', fields: DETAIL_FIELDS, log_fields: 'uuid|date|user|type|comment', lpc: '6', consumer_key: key });
  const r = await fetch(`https://www.opencaching.de/okapi/services/caches/geocache?${params}`);
  if (!r.ok) throw new Error(`Fehler ${r.status}`);
  const d = (await r.json()) as OcCacheDetail;
  memo.set(code, d);
  return d;
}

// Fremdes HTML aus Beschreibungen und Logs bereinigen: nur einfache Formatierung, Links und Bilder (https)
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A') {
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noreferrer noopener');
  }
  if (node.tagName === 'IMG') {
    const src = node.getAttribute('src') ?? '';
    if (!src.startsWith('https://')) node.remove();
    else node.setAttribute('loading', 'lazy');
  }
});
export function cleanHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 'ul', 'ol', 'li', 'a', 'img', 'h2', 'h3', 'h4', 'span', 'div', 'blockquote', 'table', 'thead', 'tbody', 'tr', 'td', 'th', 'hr', 'center'],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'title'],
    ALLOWED_URI_REGEXP: /^(https?:|mailto:)/i,
  });
}

const FOUND_KEY = 'hh-hunt:foundCaches';
export function foundCaches(): string[] {
  return loadJSON<string[]>(FOUND_KEY, []);
}

/** Ein echter Geocache ganz in der App: Navigation, Beschreibung, Hinweis, Bilder, Logbuch */
export function CacheDetail({ code, apiKey, onClose }: { code: string; apiKey: string; onClose: () => void }) {
  const [c, setC] = useState<OcCacheDetail | null>(null);
  const [err, setErr] = useState('');
  const [hint, setHint] = useState(false);
  const [spoilers, setSpoilers] = useState(false);
  const [found, setFound] = useState(() => foundCaches().includes(code));
  const pos = usePosition();

  useEffect(() => {
    startTracking();
    let alive = true;
    fetchCacheDetail(code, apiKey)
      .then((d) => alive && setC(d))
      .catch((e) => alive && setErr(navigator.onLine ? `Konnte den Cache nicht laden (${(e as Error).message}).` : 'Dafür braucht ihr Internet.'));
    return () => {
      alive = false;
    };
  }, [code, apiKey]);

  // Zurück-Geste des Handys schließt die Ansicht
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    history.pushState({ cache: code }, '');
    const onPop = () => closeRef.current();
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [code]);

  const target: LatLng | null = useMemo(() => (c ? (c.location.split('|').map(Number) as LatLng) : null), [c]);
  const dist = pos.coords && target ? distance(pos.coords, target) : null;
  const near = dist !== null && dist <= 25 + Math.min(pos.accuracy, 20);
  const desc = useMemo(() => (c ? cleanHtml(c.description) : ''), [c]);
  const attribution = useMemo(() => (c ? cleanHtml(c.attribution_note) : ''), [c]);

  const markFound = (e: React.MouseEvent) => {
    const list = foundCaches();
    const next = found ? list.filter((x) => x !== code) : [...list, code];
    saveJSON(FOUND_KEY, next);
    setFound(!found);
    if (!found) {
      play('treasure');
      celebrateUnlock(e.currentTarget);
    }
  };

  return (
    <div className="cache-detail" role="dialog" aria-modal="true" aria-label={c?.name ?? 'Geocache'} data-testid="cache-detail">
      <header className="cache-top">
        <button type="button" className="icon-btn" aria-label="Zurück zur Station" data-testid="cache-back" onClick={() => history.back()}>
          <Icon name="back" size={20} width={2.6} />
        </button>
        <span className="caption">Echter Geocache · {code}</span>
      </header>

      {!c && !err && (
        <p className="muted" style={{ textAlign: 'center', padding: 40 }}>
          Cache wird geladen <DotLoader />
        </p>
      )}
      {err && <p className="error" style={{ padding: 20 }}>{err}</p>}

      {c && target && (
        <div className="cache-body">
          <div className="cache-title rise">
            <span className="cache-type" aria-hidden="true">
              {TYPE_ICON[c.type] ?? '📍'}
            </span>
            <div>
              <h1>{c.name}</h1>
              <p className="muted">
                {TYPE_DE[c.type] ?? c.type} von {c.owner.username}
              </p>
            </div>
          </div>
          {c.status !== 'Available' && <p className="cache-warn">Achtung: Dieser Cache ist gerade nicht aktiv ({c.status}).</p>}

          <div className="cache-facts rise">
            <span>Schwierigkeit {c.difficulty}</span>
            <span>Gelände {c.terrain}</span>
            <span>Dose: {SIZE_DE[c.size2] ?? c.size2}</span>
            <span>✅ {c.founds}× gefunden</span>
            {c.recommendations > 0 && <span>⭐ {c.recommendations} Empfehlungen</span>}
            <span>seit {new Date(c.date_hidden).toLocaleDateString('de-DE', { month: 'short', year: 'numeric' })}</span>
          </div>

          {dist !== null && pos.coords && (
            <section className="card cache-nav rise">
              <Compass dist={dist} brg={bearing(pos.coords, target)} heading={pos.heading} />
              {(c.type === 'Multi' || c.type === 'Quiz' || c.type === 'Math') && (
                <p className="muted" style={{ textAlign: 'center', fontSize: 14 }}>
                  Bei diesem Cache-Typ ist das der Startpunkt. Das Versteck findet ihr mit den Angaben in der Beschreibung.
                </p>
              )}
              {near && <p className="cache-near pop">Ihr seid da! Jetzt genau suchen …</p>}
            </section>
          )}
          {!pos.coords && (
            <p className="muted" style={{ textAlign: 'center' }}>
              Suche GPS-Signal <DotLoader />
            </p>
          )}

          <div className="rise">
            <MapView
              markers={[{ id: c.code, coords: target, emoji: TYPE_ICON[c.type] ?? '📍', active: true, label: c.name }]}
              me={pos.coords}
              accuracy={pos.accuracy}
              fit={pos.coords && dist !== null && dist < 3000 ? [pos.coords, target] : [target]}
              height={220}
            />
          </div>

          <button type="button" className={`btn big ${found ? 'found' : 'primary'}`} data-testid="cache-found" onClick={markFound}>
            {found ? '✓ Gefunden! (antippen zum Zurücknehmen)' : near ? 'Gefunden!' : 'Als gefunden markieren'}
          </button>

          {c.hint2 && (
            <section className="card cache-hint">
              {hint ? (
                <p className="fade" data-testid="cache-hint">
                  💡 {c.hint2}
                </p>
              ) : (
                <button type="button" className="btn small" onClick={() => setHint(true)}>
                  Hinweis zeigen
                </button>
              )}
            </section>
          )}

          <section className="card cache-desc">
            {c.short_description && <p className="cache-short">{c.short_description}</p>}
            {c.req_passwd && <p className="cache-warn">Zum Online-Loggen braucht ihr ein Passwort aus dem Logbuch.</p>}
            <div className="cache-html" dangerouslySetInnerHTML={{ __html: desc }} />
            {c.attrnames.length > 0 && (
              <div className="cache-attrs">
                {c.attrnames.map((a) => (
                  <span key={a}>{a}</span>
                ))}
              </div>
            )}
          </section>

          {c.images.length > 0 && (
            <section className="card">
              <h3>Bilder</h3>
              <div className="cache-images">
                {c.images.map((im) => (
                  <figure key={im.url} className={im.is_spoiler && !spoilers ? 'spoiler' : ''}>
                    <img src={im.thumb_url || im.url} alt={im.caption} loading="lazy" />
                    <figcaption>{im.is_spoiler ? `Spoiler: ${im.caption}` : im.caption}</figcaption>
                  </figure>
                ))}
              </div>
              {c.images.some((im) => im.is_spoiler) && !spoilers && (
                <button type="button" className="btn small" onClick={() => setSpoilers(true)}>
                  Spoiler-Bilder zeigen
                </button>
              )}
            </section>
          )}

          <section className="card cache-logs">
            <h3>Logbuch</h3>
            {c.latest_logs.length === 0 && <p className="muted">Noch keine Einträge. Vielleicht seid ihr die Ersten!</p>}
            {c.latest_logs.map((l) => (
              <article key={l.uuid}>
                <div className="log-head">
                  <span aria-hidden="true">{LOG_ICON[l.type] ?? '📝'}</span>
                  <strong>{l.user.username}</strong>
                  <span className="muted">{new Date(l.date).toLocaleDateString('de-DE')}</span>
                </div>
                <div className="cache-html" dangerouslySetInnerHTML={{ __html: cleanHtml(l.comment) }} />
              </article>
            ))}
          </section>

          <p className="cache-attrib" dangerouslySetInnerHTML={{ __html: attribution }} />
          <a className="btn" href={c.url} target="_blank" rel="noreferrer">
            Im Online-Logbuch eintragen (Opencaching.de)
          </a>
          <p className="muted" style={{ fontSize: 13, textAlign: 'center' }}>
            Bitte legt den Cache genau so zurück, wie ihr ihn gefunden habt, und tragt euch ins Logbuch in der Dose ein.
          </p>
        </div>
      )}
    </div>
  );
}
