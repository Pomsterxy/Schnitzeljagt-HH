import { useMemo, useState } from 'react';
import { DISTRICTS, START_POINTS } from '../data/districts';
import { PAUSE_POIS, STATIONS } from '../data';
import type { AgeGroup, Category, DistrictId, LatLng } from '../data/types';
import { formatDistance, distance } from '../lib/geo';
import { generateRoute } from '../lib/route';
import { speedFor, youngestGroup } from '../lib/scoring';
import { usePosition, startTracking } from '../lib/location';
import { lastTeam, startGame, type Member, type NavMode, type Team, type TourConfig } from '../state/game';
import { MapView } from '../components/MapView';

const AVATARS = ['🦊', '🐧', '🦉', '🐙', '🦁', '🐳', '🦄', '🐢', '🐝', '🦭'];
const THEMES: { id: Category | 'mix'; label: string }[] = [
  { id: 'mix', label: '🎲 Bunt gemischt' },
  { id: 'architektur', label: '🏛️ Architektur & Baukunst' },
  { id: 'geschichte', label: '📜 Geschichte' },
  { id: 'wasser', label: '⛵ Wasser, Kanäle & Brücken' },
  { id: 'technik', label: '⚙️ Technik' },
  { id: 'kultur', label: '🎨 Kunst & Kultur' },
  { id: 'natur', label: '🌳 Natur & Parks' },
  { id: 'erinnern', label: '🕯️ Erinnern (Gedenkorte)' },
];

const AGE_LABEL: Record<AgeGroup, string> = { kids: 'Kind 6–9', tweens: 'Kind 10–13', adults: 'Teen / Erwachsen' };

export function Setup({ onStarted, onCancel }: { onStarted: () => void; onCancel: () => void }) {
  const prev = lastTeam();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [team, setTeam] = useState<Team>(
    prev ?? { name: '', avatar: AVATARS[0], members: [{ name: '', age: 'adults' }, { name: '', age: 'kids' }] },
  );
  const [districts, setDistricts] = useState<DistrictId[]>(['winterhude']);
  const [minutes, setMinutes] = useState(90);
  const [nav, setNav] = useState<NavMode>('map');
  const [includeQuiet, setIncludeQuiet] = useState(true);
  const [includePause, setIncludePause] = useState(true);
  const [pin, setPin] = useState('');
  const [startId, setStartId] = useState<string>('u-borgweg');
  const [theme, setTheme] = useState<Category | 'mix'>('mix');
  const [cache, setCache] = useState(true);
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1e9));
  const pos = usePosition();

  const groups = team.members.map((m) => m.age);
  const youngest = youngestGroup(groups.length ? groups : ['adults']);

  const start: { coords: LatLng; label: string } | null = useMemo(() => {
    if (startId === 'gps') return pos.coords ? { coords: pos.coords, label: 'Euer Standort' } : null;
    const sp = START_POINTS.find((s) => s.id === startId)!;
    return { coords: sp.coords, label: sp.title };
  }, [startId, pos.coords]);

  const gpsFar = startId === 'gps' && pos.coords && Math.min(...STATIONS.map((s) => distance(s.coords, pos.coords!))) > 3000;

  const route = useMemo(() => {
    if (!start || !districts.length) return null;
    return generateRoute(STATIONS, PAUSE_POIS, {
      districts,
      start: start.coords,
      minutes,
      kmh: speedFor(youngest),
      includeQuiet: includeQuiet || theme === 'erinnern',
      includePause,
      seed,
      theme,
      cache,
    });
  }, [start, districts, minutes, youngest, includeQuiet, includePause, seed, theme, cache]);

  const teamValid = team.name.trim().length > 0 && team.members.length > 0;
  const pinValid = /^\d{4}$/.test(pin);

  const setMember = (i: number, m: Partial<Member>) =>
    setTeam({ ...team, members: team.members.map((x, k) => (k === i ? { ...x, ...m } : x)) });

  if (step === 1)
    return (
      <div className="screen">
        <h2>1. Euer Team</h2>
        <label className="field">
          Teamname
          <input value={team.name} placeholder="z. B. Die Alsterpiraten" onChange={(e) => setTeam({ ...team, name: e.target.value })} />
        </label>
        <div className="field">
          Maskottchen
          <div className="avatars">
            {AVATARS.map((a) => (
              <button
                key={a}
                type="button"
                className={a === team.avatar ? 'avatar on' : 'avatar'}
                onClick={() => setTeam({ ...team, avatar: a })}
                aria-label={`Maskottchen ${a}`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          Wer spielt mit?
          {team.members.map((m, i) => (
            <div className="member-row" key={i}>
              <input value={m.name} placeholder={`Name ${i + 1} (optional)`} onChange={(e) => setMember(i, { name: e.target.value })} />
              <select value={m.age} onChange={(e) => setMember(i, { age: e.target.value as AgeGroup })} aria-label="Altersstufe">
                {(Object.keys(AGE_LABEL) as AgeGroup[]).map((a) => (
                  <option key={a} value={a}>
                    {AGE_LABEL[a]}
                  </option>
                ))}
              </select>
              {team.members.length > 1 && (
                <button
                  type="button"
                  className="btn small ghost"
                  aria-label="Entfernen"
                  onClick={() => setTeam({ ...team, members: team.members.filter((_, k) => k !== i) })}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          <button type="button" className="btn small" onClick={() => setTeam({ ...team, members: [...team.members, { name: '', age: 'kids' }] })}>
            + Person
          </button>
          <p className="muted">
            Die Fragen richten sich nach der jüngsten Person: <strong>{AGE_LABEL[youngest]}</strong>.
          </p>
        </div>
        <div className="row">
          <button type="button" className="btn ghost" onClick={onCancel}>
            Zurück
          </button>
          <button type="button" className="btn primary" disabled={!teamValid} onClick={() => setStep(2)}>
            Weiter
          </button>
        </div>
      </div>
    );

  if (step === 2)
    return (
      <div className="screen">
        <h2>2. Eure Tour</h2>
        <div className="field">
          Stadtteile
          {DISTRICTS.map((d) => (
            <label key={d.id} className="check">
              <input
                type="checkbox"
                checked={districts.includes(d.id)}
                onChange={(e) => {
                  const next = e.target.checked ? [...districts, d.id] : districts.filter((x) => x !== d.id);
                  setDistricts(next);
                  // Startpunkt passend zum gewählten Stadtteil vorschlagen
                  const cur = START_POINTS.find((x) => x.id === startId);
                  if (cur && next.length && !next.includes(cur.district)) {
                    setStartId(START_POINTS.find((x) => x.district === next[0])!.id);
                  }
                }}
              />
              <span>
                <strong>{d.name}</strong> · {STATIONS.filter((s) => s.district === d.id).length} Stationen
                <br />
                <small className="muted">{d.intro}</small>
              </span>
            </label>
          ))}
        </div>
        <label className="field">
          Dauer: <strong>{minutes >= 60 ? `${Math.floor(minutes / 60)} h ${minutes % 60 ? `${minutes % 60} min` : ''}` : `${minutes} min`}</strong>
          <input type="range" min={30} max={240} step={15} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} />
        </label>
        <label className="field">
          Thema der Tour
          <select value={theme} onChange={(e) => setTheme(e.target.value as Category | 'mix')} aria-label="Thema">
            {THEMES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
          <small className="muted">Bei einem Thema bevorzugt die Route passende Stationen. Andere kommen nur dazu, wenn es sich lohnt.</small>
        </label>
        <label className="field">
          Startpunkt
          <select
            aria-label="Startpunkt"
            value={startId}
            onChange={(e) => {
              setStartId(e.target.value);
              if (e.target.value === 'gps') startTracking();
            }}
          >
            <option value="gps">📍 Mein aktueller Standort</option>
            {DISTRICTS.map((d) => (
              <optgroup key={d.id} label={d.name}>
                {START_POINTS.filter((s) => s.district === d.id).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          {startId === 'gps' && !pos.coords && <small className="muted">Standort wird gesucht … ({pos.status})</small>}
          {gpsFar && <small className="error">Ihr seid weit weg vom Spielgebiet. Wählt besser eine Haltestelle als Start.</small>}
        </label>
        <div className="field">
          Navigation
          <label className="check">
            <input type="radio" name="nav" checked={nav === 'map'} onChange={() => setNav('map')} />
            <span>
              <strong>🗺️ Karte</strong>: Das Ziel ist auf der Karte markiert, mit Entfernung und Richtungspfeil. Ideal für kleine Kinder.
            </span>
          </label>
          <label className="check">
            <input type="radio" name="nav" checked={nav === 'adventure'} onChange={() => setNav('adventure')} />
            <span>
              <strong>🧭 Abenteuer</strong>: Nur Rätsel und Wegbeschreibung. Heiß/Kalt und Kartenblick kosten Punkte, ohne Hilfe gibt es einen Bonus.
            </span>
          </label>
        </div>
        <label className="check">
          <input type="checkbox" checked={includeQuiet} onChange={(e) => setIncludeQuiet(e.target.checked)} />
          <span>
            <strong>Gedenkorte einbeziehen</strong> (Stolpersteine, Mahnmale). Dort gibt es keine Punkte, nur einen ruhigen Moment zum Erinnern.
          </span>
        </label>
        <label className="check">
          <input type="checkbox" checked={cache} onChange={(e) => setCache(e.target.checked)} data-testid="cache-toggle" />
          <span>
            <strong>💎 Schatz-Finale wie beim Geocaching</strong>: An jeder Station sammelt ihr eine Cache-Zahl. Am Ende berechnet ihr daraus
            die Koordinaten eines Schatz-Ortes und sucht ihn nur mit Kompass und Entfernung.
          </span>
        </label>
        <label className="check">
          <input type="checkbox" checked={includePause} onChange={(e) => setIncludePause(e.target.checked)} />
          <span>
            <strong>Pause einplanen</strong> (Spielplatz oder Eisdiele, ab 60 Minuten)
          </span>
        </label>
        <label className="field">
          Eltern-PIN (4 Ziffern), um Stationen freizuschalten, wenn das GPS spinnt
          <input inputMode="numeric" maxLength={4} value={pin} placeholder="z. B. 1234" onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} />
        </label>
        <div className="row">
          <button type="button" className="btn ghost" onClick={() => setStep(1)}>
            Zurück
          </button>
          <button type="button" className="btn primary" disabled={!districts.length || !pinValid || !start} onClick={() => setStep(3)}>
            Route planen
          </button>
        </div>
      </div>
    );

  const stationCount = route?.stops.filter((s) => s.kind === 'station').length ?? 0;
  return (
    <div className="screen">
      <h2>3. Eure Route</h2>
      {route && stationCount > 0 ? (
        <>
          <p className="summary">
            <strong>{stationCount} Stationen</strong> · ca. {formatDistance(route.meters)} zu Fuß · ca. {Math.round(route.minutes)} min
          </p>
          {route.stops[0] && distance(start!.coords, route.stops[0].kind === 'station' ? route.stops[0].station.coords : route.stops[0].poi.coords) > 1200 && (
            <p className="error">Die erste Station ist weit vom Startpunkt entfernt. Ein Startpunkt im gewählten Stadtteil spart Laufzeit.</p>
          )}
          {nav === 'map' ? (
            <MapView
              markers={[
                { id: 'start', coords: start!.coords, emoji: '🚩', label: start!.label },
                ...route.stops.map((s, i) =>
                  s.kind === 'station'
                    ? { id: s.station.id, coords: s.station.coords, emoji: s.station.mode === 'quiet' ? '🕯️' : String(i + 1), label: `${i + 1}. ${s.station.title}` }
                    : s.kind === 'pause'
                      ? { id: s.poi.id, coords: s.poi.coords, emoji: s.poi.kind === 'eis' ? '🍦' : '🛝', label: `Pause: ${s.poi.title}` }
                      : null,
                ).filter((m) => m !== null),
              ]}
              path={[start!.coords, ...route.stops.filter((s) => s.kind !== 'final').map((s) => (s.kind === 'station' ? s.station.coords : s.poi.coords))]}
              fit={[start!.coords, ...route.stops.filter((s) => s.kind !== 'final').map((s) => (s.kind === 'station' ? s.station.coords : s.poi.coords))]}
              height={260}
            />
          ) : (
            <p className="muted">Im Abenteuermodus bleibt die Route geheim. Ihr erfahrt immer nur das nächste Rätsel!</p>
          )}
          {nav === 'map' && (
            <ol className="stop-list">
              {route.stops.map((s) => (
                <li key={s.kind === 'station' ? s.station.id : s.poi.id}>
                  {s.kind === 'station' ? (
                    <>
                      {s.station.mode === 'quiet' ? '🕯️ ' : ''}
                      {s.station.title}
                    </>
                  ) : s.kind === 'pause' ? (
                    <>
                      {s.poi.kind === 'eis' ? '🍦' : '🛝'} Pause: {s.poi.title}
                    </>
                  ) : (
                    <>💎 Schatz-Finale (Ort bleibt geheim!)</>
                  )}
                </li>
              ))}
            </ol>
          )}
          <p className="muted">Alle Texte und Bilder sind in der App gespeichert, ihr braucht unterwegs kein Netz. Nur die Kartenkacheln werden beim Anschauen nachgeladen und zwischengespeichert.</p>
        </>
      ) : (
        <p className="error">Für diese Auswahl passt keine Station in die Zeit. Wählt mehr Zeit oder einen anderen Startpunkt.</p>
      )}
      <div className="row">
        <button type="button" className="btn ghost" onClick={() => setStep(2)}>
          Zurück
        </button>
        <button type="button" className="btn" onClick={() => setSeed(Math.floor(Math.random() * 1e9))}>
          🎲 Neu würfeln
        </button>
        <button
          type="button"
          className="btn primary"
          disabled={!route || stationCount === 0}
          onClick={() => {
            const config: TourConfig = {
              districts,
              minutes,
              nav,
              includeQuiet,
              includePause,
              pin,
              start: start!.coords,
              startLabel: start!.label,
              seed,
              theme,
              cache,
            };
            startGame({ ...team, name: team.name.trim() }, config, route!);
            onStarted();
          }}
        >
          Los geht's!
        </button>
      </div>
    </div>
  );
}
