import { useMemo, useState } from 'react';
import { DISTRICTS, START_POINTS } from '../data/districts';
import { PAUSE_POIS, STATIONS } from '../data';
import type { AgeGroup, Category, DistrictId, LatLng } from '../data/types';
import { formatDistance, distance } from '../lib/geo';
import { generateRoute } from '../lib/route';
import { speedFor, youngestGroup } from '../lib/scoring';
import { usePosition, startTracking } from '../lib/location';
import { play } from '../lib/feedback';
import { lastTeam, startGame, type Member, type NavMode, type Team, type TourConfig } from '../state/game';
import { MapView } from '../components/MapView';
import { Icon } from '../components/Icon';
import { LilliSays } from '../components/Lilli';

const AVATARS = ['🦊', '🐧', '🦉', '🐙', '🦁', '🐳', '🦄', '🐢', '🐝', '🦭'];
const AGE_LABEL: Record<AgeGroup, string> = { kids: 'Kind 6–9', tweens: 'Kind 10–13', adults: 'Teen / Erwachsen' };
const DISTRICT_LOOK: Record<DistrictId, { letter: string; color: string; sub: string }> = {
  winterhude: { letter: 'W', color: '#0F766E', sub: 'Stadtpark, Planetarium, Kanäle' },
  'barmbek-nord': { letter: 'B', color: '#C2410C', sub: 'Museum der Arbeit, Bohrrad TRUDE' },
  alsterdorf: { letter: 'A', color: '#1D4ED8', sub: 'Alsterbrücken, Feuerwache von 1914' },
};
const DURATIONS = [
  { v: 45, name: '45 min', sub: '2–3 Stationen' },
  { v: 60, name: '1 h', sub: '3–4 Stationen' },
  { v: 90, name: '1,5 h', sub: '4–5 Stationen' },
  { v: 120, name: '2 h', sub: 'mit Pause' },
  { v: 180, name: '3 h', sub: 'Ausflug' },
  { v: 240, name: '4 h', sub: 'großes Abenteuer' },
];
const THEMES: { id: Category | 'mix'; name: string; sub: string; color: string }[] = [
  { id: 'mix', name: 'Gemischt', sub: 'Von allem etwas', color: '#8E8E93' },
  { id: 'architektur', name: 'Architektur', sub: 'Klinker, Kirchen, Türme', color: '#C2410C' },
  { id: 'wasser', name: 'Wasser', sub: 'Alster, Kanäle, Brücken', color: '#1D4ED8' },
  { id: 'technik', name: 'Technik', sub: 'TRUDE, U-Bahn, Feuerwehr', color: '#4B5563' },
  { id: 'kultur', name: 'Kunst', sub: 'Pinguine, Fabeltier', color: '#7C3AED' },
  { id: 'natur', name: 'Natur', sub: 'Parks und Seen', color: '#15803D' },
  { id: 'geschichte', name: 'Geschichte', sub: 'Wie Hamburg wuchs', color: '#B45309' },
  { id: 'erinnern', name: 'Erinnern', sub: 'Stolpersteine, Mahnmale', color: '#0F766E' },
];
const LILLI: Record<number, string> = {
  1: 'Moin! Wer kommt mit auf Schatzsuche? Ich passe die Rätsel an die Jüngsten an.',
  2: 'Wo wollen wir suchen? Ihr könnt auch mehrere Stadtteile auswählen.',
  3: 'Wie lange haben eure Beine Lust? Ich plane die Route passend dazu.',
  4: 'Habt ihr ein Lieblingsthema? Dann suche ich passende Orte aus.',
  5: 'Noch ein paar Extras. Mein Tipp: das Schatz-Finale!',
  6: 'Eure Route steht! Den Schatz-Ort verrate ich natürlich noch nicht …',
};
const TOTAL = 6;

export function Setup({ onStarted, onCancel }: { onStarted: () => void; onCancel: () => void }) {
  const prev = lastTeam();
  const [step, setStep] = useState(1);
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
  const canNext = step === 1 ? teamValid : step === 2 ? districts.length > 0 : step === 5 ? pinValid && !!start : true;

  const setMember = (i: number, m: Partial<Member>) => setTeam({ ...team, members: team.members.map((x, k) => (k === i ? { ...x, ...m } : x)) });
  const go = (n: number) => {
    play('tap');
    setStep(n);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const toggleDistrict = (id: DistrictId) => {
    play('select');
    const next = districts.includes(id) ? districts.filter((x) => x !== id) : [...districts, id];
    setDistricts(next);
    const cur = START_POINTS.find((x) => x.id === startId);
    if (cur && next.length && !next.includes(cur.district)) setStartId(START_POINTS.find((x) => x.district === next[0])!.id);
  };

  const stationCount = route?.stops.filter((s) => s.kind === 'station').length ?? 0;
  const firstFar =
    route?.stops[0] && start && distance(start.coords, route.stops[0].kind === 'station' ? route.stops[0].station.coords : route.stops[0].poi.coords) > 1200;

  const begin = () => {
    const config: TourConfig = { districts, minutes, nav, includeQuiet, includePause, pin, start: start!.coords, startLabel: start!.label, seed, theme, cache };
    play('found');
    startGame({ ...team, name: team.name.trim() }, config, route!);
    onStarted();
  };

  return (
    <div className="screen setup">
      <div className="wizard-head">
        <button type="button" className="back" onClick={() => (step === 1 ? onCancel() : go(step - 1))}>
          <Icon name="back" size={20} width={2.6} />
          {step === 1 ? 'Start' : 'Zurück'}
        </button>
        <span className="caption">
          Schritt {step} von {TOTAL}
        </span>
        <span style={{ width: 60 }} />
      </div>
      <div className="progressbar" role="progressbar" aria-valuemin={1} aria-valuemax={TOTAL} aria-valuenow={step}>
        <div style={{ width: `${(step / TOTAL) * 100}%` }} />
      </div>

      <LilliSays key={`l${step}`}>{LILLI[step]}</LilliSays>

      <div key={step} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {step === 1 && (
          <>
            <h1 className="large-title rise">Euer Team</h1>
            <label className="field rise">
              <span>Teamname</span>
              <input value={team.name} placeholder="z. B. Die Alsterpiraten" onChange={(e) => setTeam({ ...team, name: e.target.value })} />
            </label>
            <div className="field rise">
              <span>Maskottchen</span>
              <div className="avatars">
                {AVATARS.map((a) => (
                  <button
                    key={a}
                    type="button"
                    className={a === team.avatar ? 'avatar on' : 'avatar'}
                    onClick={() => {
                      play('select');
                      setTeam({ ...team, avatar: a });
                    }}
                    aria-label={`Maskottchen ${a}`}
                    aria-pressed={a === team.avatar}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>
            <div className="field rise">
              <span>Wer spielt mit?</span>
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
                    <button type="button" className="icon-btn plain" aria-label="Person entfernen" onClick={() => setTeam({ ...team, members: team.members.filter((_, k) => k !== i) })}>
                      <Icon name="close" size={14} width={3} />
                    </button>
                  )}
                </div>
              ))}
              <button type="button" className="btn tinted small" style={{ alignSelf: 'flex-start' }} onClick={() => setTeam({ ...team, members: [...team.members, { name: '', age: 'kids' }] })}>
                <Icon name="plus" size={16} /> Person
              </button>
              <p className="muted">
                Die Rätsel richten sich nach der jüngsten Person: <strong>{AGE_LABEL[youngest]}</strong>.
              </p>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h1 className="large-title rise">Wo sucht ihr?</h1>
            {DISTRICTS.map((d) => {
              const on = districts.includes(d.id);
              const look = DISTRICT_LOOK[d.id];
              return (
                <button key={d.id} type="button" className={`choice rise${on ? ' on' : ''}`} aria-pressed={on} onClick={() => toggleDistrict(d.id)}>
                  <span className="badge-letter" style={{ background: look.color }}>
                    {look.letter}
                  </span>
                  <span className="txt">
                    <strong>{d.name}</strong>
                    <small>
                      {look.sub} · {STATIONS.filter((s) => s.district === d.id).length} Stationen
                    </small>
                  </span>
                  <span className="tick">
                    <Icon name="check" size={14} color="#fff" width={3.4} />
                  </span>
                </button>
              );
            })}
          </>
        )}

        {step === 3 && (
          <>
            <h1 className="large-title rise">Wie lange?</h1>
            <div className="grid2">
              {DURATIONS.map((d) => (
                <button
                  key={d.v}
                  type="button"
                  className={`choice tile rise${minutes === d.v ? ' on' : ''}`}
                  aria-pressed={minutes === d.v}
                  onClick={() => {
                    play('select');
                    setMinutes(d.v);
                  }}
                >
                  <span style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em' }}>{d.name}</span>
                  <small className="muted">{d.sub}</small>
                </button>
              ))}
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <h1 className="large-title rise">Welches Thema?</h1>
            <div className="grid2">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`choice tile rise${theme === t.id ? ' on' : ''}`}
                  aria-pressed={theme === t.id}
                  onClick={() => {
                    play('select');
                    setTheme(t.id);
                  }}
                >
                  <span className="swatch" style={{ background: t.color }} />
                  <strong style={{ fontSize: 16 }}>{t.name}</strong>
                  <small className="muted" style={{ fontSize: 13 }}>
                    {t.sub}
                  </small>
                </button>
              ))}
            </div>
          </>
        )}

        {step === 5 && (
          <>
            <h1 className="large-title rise">Extras</h1>
            <label className="field rise">
              <span>Startpunkt</span>
              <select
                aria-label="Startpunkt"
                value={startId}
                onChange={(e) => {
                  setStartId(e.target.value);
                  if (e.target.value === 'gps') startTracking();
                }}
              >
                <option value="gps">Mein aktueller Standort</option>
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
              {startId === 'gps' && !pos.coords && <small className="muted">Standort wird gesucht …</small>}
              {gpsFar && <small className="error">Ihr seid weit weg vom Spielgebiet. Wählt besser eine Haltestelle.</small>}
            </label>
            <div className="field rise">
              <span>Navigation</span>
              <div className="segmented" role="group" aria-label="Navigation">
                <div className="thumb" style={{ width: 'calc(50% - 2px)', left: nav === 'map' ? 2 : '50%' }} />
                <button type="button" aria-pressed={nav === 'map'} onClick={() => { play('select'); setNav('map'); }}>
                  Mit Karte
                </button>
                <button type="button" aria-pressed={nav === 'adventure'} onClick={() => { play('select'); setNav('adventure'); }}>
                  Abenteuer
                </button>
              </div>
              <small className="muted" style={{ paddingLeft: 4 }}>
                {nav === 'map'
                  ? 'Karte, Kompass und Entfernung helfen beim Finden. Ideal für kleine Kinder.'
                  : 'Nur Rätsel und Wegbeschreibung. Heiß/Kalt kostet Punkte, ohne Hilfe gibt es einen Bonus.'}
              </small>
            </div>
            <div className="grouped rise">
              {[
                { on: cache, set: setCache, name: 'Schatz-Finale', sub: 'Koordinaten berechnen wie beim Geocaching', test: 'cache-toggle' },
                { on: includePause, set: setIncludePause, name: 'Pause einplanen', sub: 'Spielplatz oder Eisdiele (ab 1 Stunde)' },
                { on: includeQuiet, set: setIncludeQuiet, name: 'Gedenkorte', sub: 'Ruhige Stationen ohne Punkte' },
              ].map((t) => (
                <button
                  key={t.name}
                  type="button"
                  className="switch-row"
                  role="switch"
                  aria-checked={t.on}
                  data-testid={t.test}
                  onClick={() => {
                    play('select');
                    t.set(!t.on);
                  }}
                >
                  <span className="txt">
                    <strong>{t.name}</strong>
                    <small>{t.sub}</small>
                  </span>
                  <span className={`switch${t.on ? ' on' : ''}`} />
                </button>
              ))}
            </div>
            <label className="field rise">
              <span>Eltern-PIN (4 Ziffern)</span>
              <input inputMode="numeric" maxLength={4} value={pin} placeholder="z. B. 1234" onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} />
              <small className="muted" style={{ paddingLeft: 4 }}>
                Damit schaltet ihr Stationen frei, wenn das GPS spinnt.
              </small>
            </label>
          </>
        )}

        {step === 6 && (
          <>
            <h1 className="large-title rise">Eure Route</h1>
            {route && stationCount > 0 ? (
              <>
                {nav === 'map' ? (
                  <div className="rise">
                    <MapView
                      markers={[
                        { id: 'start', coords: start!.coords, emoji: '🚩', label: start!.label },
                        ...route.stops
                          .map((s, i) =>
                            s.kind === 'station'
                              ? { id: s.station.id, coords: s.station.coords, emoji: s.station.mode === 'quiet' ? '🕯️' : String(i + 1), label: `${i + 1}. ${s.station.title}` }
                              : s.kind === 'pause'
                                ? { id: s.poi.id, coords: s.poi.coords, emoji: s.poi.kind === 'eis' ? '🍦' : '🛝', label: `Pause: ${s.poi.title}` }
                                : null,
                          )
                          .filter((m) => m !== null),
                      ]}
                      path={[start!.coords, ...route.stops.filter((s) => s.kind !== 'final').map((s) => (s.kind === 'station' ? s.station.coords : s.poi.coords))]}
                      fit={[start!.coords, ...route.stops.filter((s) => s.kind !== 'final').map((s) => (s.kind === 'station' ? s.station.coords : s.poi.coords))]}
                      height={250}
                    />
                  </div>
                ) : (
                  <div className="card teal rise">Im Abenteuer-Modus bleibt die Route geheim. Ihr erfahrt immer nur das nächste Rätsel!</div>
                )}
                <div className="route-stats rise summary">
                  <div>
                    <strong>{stationCount}</strong>
                    <span>Stationen</span>
                  </div>
                  <div>
                    <strong>{formatDistance(route.meters)}</strong>
                    <span>zu Fuß</span>
                  </div>
                  <div>
                    <strong>{Math.round(route.minutes)} min</strong>
                    <span>Dauer</span>
                  </div>
                </div>
                {firstFar && <p className="error rise">Die erste Station ist weit vom Start entfernt. Ein Startpunkt im Stadtteil spart Zeit.</p>}
                {nav === 'map' && (
                  <ol className="stop-list grouped rise">
                    {route.stops.map((s, i) => (
                      <li key={s.kind === 'station' ? s.station.id : s.poi.id + s.kind}>
                        {s.kind === 'station' ? (
                          <>
                            <span className={`num${s.station.mode === 'quiet' ? ' quiet' : ''}`}>{i + 1}</span>
                            {s.station.title}
                          </>
                        ) : s.kind === 'pause' ? (
                          <>
                            <span className="num extra">{s.poi.kind === 'eis' ? '🍦' : '🛝'}</span>Pause: {s.poi.title}
                          </>
                        ) : (
                          <>
                            <span className="num extra">💎</span>Schatz-Finale (Ort bleibt geheim)
                          </>
                        )}
                      </li>
                    ))}
                  </ol>
                )}
                <button
                  type="button"
                  className="btn tinted rise"
                  onClick={() => {
                    play('select');
                    setSeed(Math.floor(Math.random() * 1e9));
                  }}
                >
                  Andere Route würfeln
                </button>
                <p className="muted rise">Texte und Bilder sind gespeichert, ihr braucht unterwegs kein Netz. Kartenausschnitte werden beim Ansehen zwischengespeichert.</p>
              </>
            ) : (
              <p className="error">Für diese Auswahl passt keine Station in die Zeit. Wählt mehr Zeit oder einen anderen Startpunkt.</p>
            )}
          </>
        )}
      </div>

      <div className="bottom-bar">
        {step < TOTAL ? (
          <button type="button" className="btn big dark" disabled={!canNext} onClick={() => go(step + 1)}>
            {step === TOTAL - 1 ? 'Route planen' : 'Weiter'}
          </button>
        ) : (
          <button type="button" className="btn big primary" disabled={!route || stationCount === 0} onClick={begin}>
            Los geht's!
          </button>
        )}
      </div>
    </div>
  );
}
