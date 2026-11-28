import { useEffect, useMemo, useRef, useState } from 'react';
import { DISTRICTS, START_POINTS } from '../data/districts';
import { POI_EMOJI, POIS, ROUTE_STATIONS } from '../data';
import type { AgeGroup, Category, DistrictId, LatLng } from '../data/types';
import { formatDistance, distance } from '../lib/geo';
import { generateRoute, measure, type RouteStop } from '../lib/route';
import { encodeTour, shareLink, tourLink, type SharedTour } from '../lib/share';
import { daylightWarning, rainWarning } from '../lib/daylight';
import { seasonFor, seasonNote } from '../lib/season';
import { speedFor, youngestGroup } from '../lib/scoring';
import { usePosition, startTracking } from '../lib/location';
import { play } from '../lib/feedback';
import { sparkle } from '../lib/effects';
import { requestMotionPermission } from '../lib/pedometer';
import { lastTeam, startGame, type Member, type NavMode, type Team, type TourConfig } from '../state/game';
import { MapView } from '../components/MapView';
import { Icon } from '../components/Icon';
import { Lilli } from '../components/Lilli';
import { DotLoader } from '../components/Micro';

const AVATARS = ['🦊', '🐧', '🦉', '🐙', '🦁', '🐳', '🦄', '🐢', '🐝', '🦭'];
const DURATIONS = [
  { v: 45, name: '45 Minuten' },
  { v: 60, name: '1 Stunde' },
  { v: 90, name: '1,5 Stunden' },
  { v: 120, name: '2 Stunden' },
  { v: 180, name: '3 Stunden' },
  { v: 240, name: '4 Stunden' },
];
const THEMES: { id: Category | 'mix'; name: string }[] = [
  { id: 'mix', name: 'Von allem etwas' },
  { id: 'architektur', name: 'Architektur' },
  { id: 'wasser', name: 'Wasser' },
  { id: 'technik', name: 'Technik' },
  { id: 'kultur', name: 'Kunst' },
  { id: 'natur', name: 'Natur' },
  { id: 'geschichte', name: 'Geschichte' },
  { id: 'erinnern', name: 'Erinnern' },
];
const MAX_PEOPLE = 8;
/** Wie weit darf ein Weg zwischen zwei Zielen sein? 0 = egal */
const LEGS = [
  { v: 500, name: 'Höchstens 500 m' },
  { v: 1000, name: 'Bis 1 km ist okay' },
  { v: 0, name: 'Egal, auch weiter' },
];

/** Nur 6 Fragen; alles andere hat gute Standards und lässt sich bei der Route ändern */
type Q = { id: 'team' } | { id: 'people' } | { id: 'districts' } | { id: 'minutes' } | { id: 'start' } | { id: 'pin' } | { id: 'route' };

const AGE_ORDER: AgeGroup[] = ['adults', 'tweens', 'kids'];
const AGE_PLURAL: Record<AgeGroup, [string, string]> = { adults: ['Erwachsener', 'Erwachsene'], tweens: ['Kind (10–13)', 'Kinder (10–13)'], kids: ['Kind (6–9)', 'Kinder (6–9)'] };
/** Beschriftung der Zähler-Zeilen */
const AGE_ROW: Record<AgeGroup, string> = { adults: 'Erwachsene & Teens', tweens: 'Kinder 10–13', kids: 'Kinder 6–9' };
type Counts = Record<AgeGroup, number>;
function countsOf(members: Member[]): Counts {
  const c: Counts = { adults: 0, tweens: 0, kids: 0 };
  for (const m of members) c[m.age]++;
  return c;
}
/** Mitspieler aus den Anzahlen bauen (Namen von früher bleiben erhalten) */
function membersFrom(c: Counts, old: Member[]): Member[] {
  return AGE_ORDER.flatMap((age) => {
    const named = old.filter((m) => m.age === age);
    return Array.from({ length: c[age] }, (_, i) => named[i] ?? { name: '', age });
  });
}
function peopleText(c: Counts): string {
  return AGE_ORDER.filter((a) => c[a] > 0)
    .map((a) => `${c[a]} ${AGE_PLURAL[a][c[a] === 1 ? 0 : 1]}`)
    .join(' · ');
}

/** Lilli fragt der Reihe nach, wie im Chat. Ältere Antworten lassen sich antippen und ändern. */
export function Setup({ onStarted, onCancel, shared }: { onStarted: () => void; onCancel: () => void; shared?: { tour: SharedTour; stops: RouteStop[] } | null }) {
  const st = shared?.tour;
  const prev = lastTeam();
  const [step, setStep] = useState(0);
  const [team, setTeam] = useState<Team>(prev ?? { name: '', avatar: AVATARS[0], members: [] });
  const [counts, setCounts] = useState<Counts>(() => (prev?.members.length ? countsOf(prev.members) : { adults: 1, tweens: 0, kids: 1 }));
  const [districts, setDistricts] = useState<DistrictId[]>(st?.d ?? []);
  const [minutes, setMinutes] = useState(st?.m ?? 90);
  const [nav, setNav] = useState<NavMode>(st?.n ?? 'map');
  const [includeQuiet, setIncludeQuiet] = useState(shared ? shared.stops.some((x) => x.kind === 'station' && x.station.mode === 'quiet') : true);
  const [includePause, setIncludePause] = useState(shared ? shared.stops.some((x) => x.kind === 'pause') : true);
  const [pin, setPin] = useState('');
  const [startId, setStartId] = useState<string>('');
  const [theme, setTheme] = useState<Category | 'mix'>(st?.t ?? 'mix');
  const [cache, setCache] = useState(shared ? shared.stops.some((x) => x.kind === 'final') : true);
  const [maxLeg, setMaxLeg] = useState(st?.ml ?? 500);
  const [seed, setSeed] = useState(() => st?.sd ?? Math.floor(Math.random() * 1e9));
  const [shareMsg, setShareMsg] = useState('');
  const pos = usePosition();

  // Eingeladen per Link: Route steht schon fest, nur Team, Mitspieler und PIN fehlen
  const questions: Q[] = shared
    ? [{ id: 'team' }, { id: 'people' }, { id: 'pin' }, { id: 'route' }]
    : [{ id: 'team' }, { id: 'people' }, { id: 'districts' }, { id: 'minutes' }, { id: 'start' }, { id: 'pin' }, { id: 'route' }];

  const current = questions[Math.min(step, questions.length - 1)];
  const members = useMemo(() => membersFrom(counts, prev?.members ?? []), [counts, prev?.members]);
  const groups = members.map((m) => m.age);
  const youngest = youngestGroup(groups.length ? groups : ['adults']);

  const start: { coords: LatLng; label: string } | null = useMemo(() => {
    if (st) return { coords: st.c, label: st.s };
    if (startId === 'gps') return pos.coords ? { coords: pos.coords, label: 'Euer Standort' } : null;
    const sp = START_POINTS.find((s) => s.id === startId);
    return sp ? { coords: sp.coords, label: sp.title } : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startId, pos.coords]);

  // Jahreszeit und Dunkelheit (zum Testen: ?datum=2026-07-15T14:00)
  const season = useMemo(() => {
    if (!start) return undefined;
    const q = new URLSearchParams(location.search).get('datum');
    const now = q && !Number.isNaN(Date.parse(q)) ? new Date(q) : new Date();
    return seasonFor(now, minutes, start.coords);
  }, [start, minutes]);
  const [avoid, setAvoid] = useState<string[]>([]);
  const [noOther, setNoOther] = useState(false);
  const plan = (sd: number, av: string[]) =>
    generateRoute(ROUTE_STATIONS, POIS, {
      districts,
      start: start!.coords,
      minutes,
      kmh: speedFor(youngest),
      includeQuiet: includeQuiet || theme === 'erinnern',
      includePause,
      seed: sd,
      theme,
      cache,
      maxLeg: maxLeg || Infinity,
      avoid: av,
      season,
    });
  const route = useMemo(() => {
    if (current.id !== 'route' || !start || !districts.length) return null;
    if (shared) {
      const m = measure(start.coords, shared.stops, speedFor(youngest));
      return { stops: shared.stops, meters: m.meters, minutes: m.minutes };
    }
    return plan(seed, avoid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current.id, start, districts, minutes, youngest, includeQuiet, includePause, seed, theme, cache, maxLeg, avoid, season]);

  /** Neu würfeln: so lange probieren, bis eine wirklich andere Route herauskommt */
  const sig = (r: NonNullable<typeof route>) => r.stops.map((x) => (x.kind === 'station' ? x.station.id : x.kind)).join('>');
  const reroll = () => {
    if (!route || !start) return;
    const now = sig(route);
    const used = route.stops.flatMap((x) => (x.kind === 'station' ? [x.station.id] : []));
    for (let i = 0; i < 14; i++) {
      const sd = Math.floor(Math.random() * 1e9);
      const av = i < 10 ? used : [];
      const r = plan(sd, av);
      if (r.stops.some((x) => x.kind === 'station') && sig(r) !== now) {
        setNoOther(false);
        setAvoid(av);
        setSeed(sd);
        return;
      }
    }
    setNoOther(true);
  };

  // neue Nachricht: nach unten scrollen
  const endRef = useRef<HTMLDivElement>(null);
  const routeRef = useRef<HTMLDivElement>(null);
  // Lilli "tippt" kurz, bevor ihre nächste Frage erscheint
  const [typing, setTyping] = useState(false);
  useEffect(() => {
    if (step === 0) return;
    setTyping(true);
    const t = setTimeout(() => setTyping(false), 650);
    return () => clearTimeout(t);
  }, [step]);
  const hasRoute = !!route && route.stops.some((s) => s.kind === 'station');
  useEffect(() => {
    if (!hasRoute) return;
    const t = setTimeout(() => sparkle(routeRef.current), 450);
    return () => clearTimeout(t);
  }, [hasRoute, seed]);
  useEffect(() => {
    // ganz nach unten, damit die Antwortleiste nichts verdeckt
    const t = setTimeout(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' }), 60);
    return () => clearTimeout(t);
    // nach dem "Tippen" wird Lillis Nachricht länger: dann noch einmal nach unten
  }, [step, route, typing]);

  const next = () => {
    play('tap');
    setNoOther(false);
    setStep((s) => s + 1);
  };

  /** Frage von Lilli (Text) */
  const ask = (q: Q): string => {
    const n = team.name.trim() || 'ihr';
    switch (q.id) {
      case 'team':
        if (shared) return `Moin! Ihr wurdet zu einer Schatzsuche eingeladen: ${shared.stops.filter((x) => x.kind === 'station').length} Stationen ab ${shared.tour.s}. Wie heißt euer Team?`;
        return prev ? `Moin, ${prev.name}! Schön, dass ihr wieder da seid. Bleibt es bei eurem Teamnamen?` : 'Moin! Ich bin Lilli, eure Schatzsuch-Füchsin. Wie heißt euer Team?';
      case 'people':
        return `${n} – klingt nach echten Entdeckern! Wer ist dabei? Die Rätsel richten sich nach den Jüngsten.`;
      case 'districts':
        return 'Wo wollen wir suchen? Ihr könnt auch mehrere Stadtteile antippen.';
      case 'minutes':
        return 'Wie lange haben eure Beine Lust?';
      case 'start':
        return 'Wo startet ihr?';
      case 'pin':
        return 'Zum Schluss: Ein Erwachsener legt eine 4-stellige Eltern-PIN fest. Damit schaltet ihr Stationen frei, wenn das GPS mal spinnt.';
      case 'route':
        return route && route.stops.some((s) => s.kind === 'station')
          ? shared
            ? 'Das ist eure Tour, genau wie bei den Freunden, die euch eingeladen haben. Wer schafft mehr Punkte?'
            : `Eure Route steht!${maxLeg ? ` Kein Weg ist länger als ${maxLeg === 1000 ? '1 Kilometer' : `${maxLeg} Meter`}.` : ''} Unten könnt ihr Thema, Wege und Extras anpassen.`
          : 'Hm, für diese Auswahl finde ich keine passende Route. Tippt oben auf eine Antwort, um etwas zu ändern.';
    }
  };

  /** Eure Antwort (für den Chatverlauf) */
  const answer = (q: Q): string => {
    switch (q.id) {
      case 'team':
        return team.name.trim();
      case 'people':
        return peopleText(counts);
      case 'districts':
        return districts.map((d) => DISTRICTS.find((x) => x.id === d)!.name).join(', ');
      case 'minutes':
        return DURATIONS.find((d) => d.v === minutes)!.name;
      case 'start':
        return start?.label ?? 'Mein Standort';
      case 'pin':
        return '••••';
      case 'route':
        return '';
    }
  };

  const begin = () => {
    if (!route || !start) return;
    const config: TourConfig = { districts, minutes, nav, includeQuiet, includePause, pin, start: start.coords, startLabel: start.label, seed, theme, cache, maxLeg };
    play('found');
    // Schrittzähler: iOS fragt nur nach einem Tipp um Erlaubnis
    void requestMotionPermission();
    startGame({ ...team, name: team.name.trim(), members }, config, route);
    onStarted();
  };

  // Tageslicht und Regen für die geplante Tour
  const daylight = route && start ? daylightWarning(new Date(), route.minutes, start.coords) : null;
  const [rain, setRain] = useState<string | null>(null);
  const routeMinutes = route ? Math.round(route.minutes) : 0;
  useEffect(() => {
    if (!routeMinutes || !start || navigator.onLine === false) return;
    let alive = true;
    rainWarning(start.coords, routeMinutes)
      .then((w) => alive && setRain(w))
      .catch(() => {});
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeMinutes, start?.label]);

  const stationCount = route?.stops.filter((s) => s.kind === 'station').length ?? 0;
  const waypointCount = route?.stops.filter((s) => s.kind === 'waypoint').length ?? 0;
  const firstStop = route?.stops[0];
  const firstLeg = firstStop && start ? distance(start.coords, firstStop.kind === 'station' ? firstStop.station.coords : firstStop.poi.coords) : 0;
  const longest = route && start
    ? route.stops.reduce(
        (acc, s, i) => {
          const c = s.kind === 'station' ? s.station.coords : s.poi.coords;
          const d = i === 0 ? 0 : distance(acc.prev, c);
          return { prev: c, max: Math.max(acc.max, d) };
        },
        { prev: start.coords, max: 0 },
      ).max
    : 0;

  return (
    <div className="screen chat-setup">
      <div className="chat-head">
        <button type="button" className="back" onClick={onCancel}>
          <Icon name="close" size={16} width={3} /> Abbrechen
        </button>
        <div className="chat-progress" role="progressbar" aria-valuemin={0} aria-valuemax={questions.length} aria-valuenow={step}>
          <div style={{ width: `${(Math.min(step, questions.length - 1) / (questions.length - 1)) * 100}%` }} />
        </div>
      </div>

      <div className="chat-log" aria-live="polite">
        {questions.slice(0, step + 1).map((q, i) => (
          <div key={`${q.id}${'i' in q ? q.i : ''}`} className="chat-turn">
            <div className="msg lilli-msg">
              {(i === 0 || i === step) && (
                <span className="chat-avatar" aria-hidden="true">
                  <Lilli size={40} mood={q.id === 'route' ? 'excited' : 'happy'} />
                </span>
              )}
              {i === step && typing ? (
                <p className="bubble typing-dots" aria-label="Lilli schreibt …">
                  <i />
                  <i />
                  <i />
                </p>
              ) : (
                <p className={i === step ? 'bubble typing-in' : 'bubble'}>{ask(q)}</p>
              )}
            </div>
            {i < step && answer(q) && (
              <button
                type="button"
                className="msg me-msg"
                aria-label={`Antwort ändern: ${answer(q)}`}
                onClick={() => {
                  play('tap');
                  setStep(i);
                }}
              >
                <span className="bubble">{answer(q)}</span>
              </button>
            )}
          </div>
        ))}

        {current.id === 'route' && route && stationCount > 0 && start && (
          <div ref={routeRef} key={seed} className="chat-route rise">
            {nav === 'map' ? (
              <MapView
                markers={[
                  { id: 'start', coords: start.coords, emoji: '🚩', label: start.label },
                  ...route.stops
                    .map((s, i) =>
                      s.kind === 'station'
                        ? { id: s.station.id, coords: s.station.coords, emoji: s.station.mode === 'quiet' ? '🕯️' : String(route.stops.slice(0, i + 1).filter((x) => x.kind === 'station').length), label: s.station.title }
                        : s.kind === 'pause'
                          ? { id: s.poi.id, coords: s.poi.coords, emoji: POI_EMOJI[s.poi.kind], label: `Pause: ${s.poi.title}` }
                          : s.kind === 'waypoint'
                            ? { id: `${s.poi.id}-${i}`, coords: s.poi.coords, emoji: '·', label: `Zwischenziel: ${s.poi.title}` }
                            : null,
                    )
                    .filter((m) => m !== null),
                ]}
                path={[start.coords, ...route.stops.filter((s) => s.kind !== 'final').map((s) => (s.kind === 'station' ? s.station.coords : s.poi.coords))]}
                fit={[start.coords, ...route.stops.filter((s) => s.kind !== 'final').map((s) => (s.kind === 'station' ? s.station.coords : s.poi.coords))]}
                height={230}
              />
            ) : (
              <p className="dark-caption" style={{ padding: '4px 4px 0' }}>
                Im Abenteuer-Modus bleibt die Route geheim. Ihr erfahrt immer nur das nächste Rätsel!
              </p>
            )}
            <div className="route-stats summary">
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
            <p className="dark-caption" data-testid="leg-info">
              {waypointCount === 1 ? 'Ein Zwischenziel hält die Wege kurz. ' : waypointCount > 1 ? `${waypointCount} Zwischenziele halten die Wege kurz. ` : ''}
              Längste Etappe: {formatDistance(longest)}
              {maxLeg && firstLeg > maxLeg ? ` · Der erste Weg vom Start ist ${formatDistance(firstLeg * 1.3)} lang.` : ''}
            </p>
            {daylight && (
              <p className="tour-warn" data-testid="daylight-warn">
                🌇 {daylight}
              </p>
            )}
            {season && !shared && seasonNote(season) && (
              <p className="tour-warn season-note" data-testid="season-note">
                {season.summer ? '☀️' : season.dark ? '🔦' : '🧣'} {seasonNote(season)}
              </p>
            )}
            {rain && (
              <p className="tour-warn" data-testid="rain-warn">
                🌧️ {rain}
              </p>
            )}
            {noOther && (
              <p className="dark-caption reroll-note" data-testid="no-other-route">
                Hier passt gerade keine andere Route in die Zeit. Nehmt einen weiteren Stadtteil dazu oder ändert die Dauer.
              </p>
            )}
            {nav === 'map' && (
              <ol className="chat-stops">
                {route.stops.map((s, i) =>
                  s.kind === 'waypoint' ? null : (
                    <li key={i}>
                      {s.kind === 'station' ? (
                        <>
                          <span className={`num${s.station.mode === 'quiet' ? ' quiet' : ''}`}>{route.stops.slice(0, i + 1).filter((x) => x.kind === 'station').length}</span>
                          {s.station.title}
                        </>
                      ) : s.kind === 'pause' ? (
                        <>
                          <span className="num extra">{POI_EMOJI[s.poi.kind]}</span>Pause: {s.poi.title}
                        </>
                      ) : (
                        <>
                          <span className="num extra">💎</span>Schatz-Finale (Ort bleibt geheim)
                        </>
                      )}
                    </li>
                  ),
                )}
              </ol>
            )}
          </div>
        )}
        {current.id === 'route' && start && !shared && (
          <details className="tour-settings rise" data-testid="tour-settings">
            <summary>
              <span>Anpassen</span>
              <small>
                {THEMES.find((t) => t.id === theme)!.name} · {LEGS.find((l) => l.v === maxLeg)!.name} · {nav === 'map' ? 'Mit Karte' : 'Abenteuer'}
              </small>
            </summary>
            <SettingGroup label="Thema" testId="set-theme" options={THEMES.map((t) => ({ id: t.id, label: t.name }))} value={theme} onPick={(v) => setTheme(v as Category | 'mix')} />
            <SettingGroup label="Wege bis zum nächsten Ziel" testId="set-legs" options={LEGS.map((l) => ({ id: String(l.v), label: l.name }))} value={String(maxLeg)} onPick={(v) => setMaxLeg(Number(v))} />
            <SettingGroup
              label="Orte finden"
              testId="set-nav"
              options={[
                { id: 'map', label: 'Mit Karte' },
                { id: 'adventure', label: 'Abenteuer (nur Rätsel)' },
              ]}
              value={nav}
              onPick={(v) => setNav(v as NavMode)}
            />
            <div className="setting-group">
              <div className="setting-label">Extras</div>
              <div className="chips start">
                <Toggle label="Schatz-Finale" on={cache} onChange={setCache} testId="cache-toggle" />
                {minutes >= 60 && <Toggle label="Pause (Spielplatz/Eis)" on={includePause} onChange={setIncludePause} />}
                {theme !== 'erinnern' && <Toggle label="Gedenkorte" on={includeQuiet} onChange={setIncludeQuiet} />}
              </div>
            </div>
            <SettingGroup label="Maskottchen" options={AVATARS.map((a) => ({ id: a, label: a }))} value={team.avatar} onPick={(a) => setTeam({ ...team, avatar: a })} />
          </details>
        )}
        <div ref={endRef} />
      </div>

      <div className="composer" key={step}>
        {composer()}
      </div>
    </div>
  );

  // Eingabebereich passend zur aktuellen Frage
  function composer() {
    const q = current;
    switch (q.id) {
      case 'team':
        return (
          <TextAnswer
            initial={team.name}
            placeholder="Teamname, z. B. Die Alsterpiraten"
            chips={prev ? [prev.name] : ['Die Alsterpiraten', 'Team Fuchs', 'Die Klinker-Detektive']}
            onSend={(v) => {
              setTeam({ ...team, name: v });
              next();
            }}
          />
        );
      case 'people':
        return (
          <>
            <div className="people-picker" data-testid="people">
              {AGE_ORDER.map((age) => (
                <div key={age} className="people-row">
                  <span>{AGE_ROW[age]}</span>
                  <button
                    type="button"
                    aria-label={`${AGE_ROW[age]}: eins weniger`}
                    disabled={counts[age] === 0}
                    onClick={() => {
                      play('tap');
                      setCounts({ ...counts, [age]: counts[age] - 1 });
                    }}
                  >
                    −
                  </button>
                  <strong key={counts[age]} className="pop-num" data-testid={`count-${age}`}>
                    {counts[age]}
                  </strong>
                  <button
                    type="button"
                    aria-label={`${AGE_ROW[age]}: eins mehr`}
                    disabled={members.length >= MAX_PEOPLE}
                    onClick={() => {
                      play('tap');
                      setCounts({ ...counts, [age]: counts[age] + 1 });
                    }}
                  >
                    +
                  </button>
                </div>
              ))}
            </div>
            <button type="button" className="btn pill big primary" disabled={members.length === 0} onClick={next}>
              Passt so
            </button>
          </>
        );
      case 'districts':
        return (
          <>
            <Chips
              options={DISTRICTS.map((d) => ({ id: d.id, label: `${d.name} · ${ROUTE_STATIONS.filter((s) => s.district === d.id && s.mode === 'normal').length}` }))}
              selected={districts}
              onPick={(id) => {
                play('select');
                const d = id as DistrictId;
                setDistricts(districts.includes(d) ? districts.filter((x) => x !== d) : [...districts, d]);
              }}
            />
            <button type="button" className="btn pill big primary" disabled={!districts.length} onClick={next}>
              Passt so
            </button>
          </>
        );
      case 'minutes':
        return (
          <Chips
            options={DURATIONS.map((d) => ({ id: String(d.v), label: d.name }))}
            selected={[String(minutes)]}
            onPick={(v) => {
              setMinutes(Number(v));
              next();
            }}
          />
        );
      case 'start': {
        const spots = START_POINTS.filter((s) => districts.includes(s.district));
        return (
          <>
            <Chips
              options={[{ id: 'gps', label: '📍 Mein Standort' }, ...spots.map((s) => ({ id: s.id, label: s.title }))]}
              selected={startId ? [startId] : []}
              onPick={(id) => {
                setStartId(id);
                if (id === 'gps') startTracking();
                else next();
              }}
            />
            {startId === 'gps' && (
              <button type="button" className="btn pill big primary" disabled={!pos.coords} onClick={next}>
                {pos.coords ? (
                  'Hier starten'
                ) : (
                  <>
                    Standort wird gesucht <DotLoader />
                  </>
                )}
              </button>
            )}
          </>
        );
      }
      case 'pin':
        return (
          <TextAnswer
            initial={pin}
            placeholder="4 Ziffern, z. B. 1234"
            numeric
            valid={(v) => /^\d{4}$/.test(v)}
            onSend={(v) => {
              setPin(v);
              next();
            }}
          />
        );
      case 'route':
        return (
          <>
            {route && stationCount > 0 && (
              <button type="button" className="btn pill big primary" onClick={begin}>
                Los geht's!
              </button>
            )}
            {!shared && (
              <button
                type="button"
                className="btn pill outline"
                data-testid="reroll"
                onClick={() => {
                  play('select');
                  reroll();
                }}
              >
                Andere Route würfeln
              </button>
            )}
            {route && stationCount > 0 && start && (
              <button
                type="button"
                className="btn pill outline"
                data-testid="share-tour"
                onClick={async () => {
                  play('select');
                  const code = encodeTour({ d: districts, m: minutes, s: start.label, c: start.coords, stops: route.stops, n: nav, sd: seed, t: theme, ml: maxLeg });
                  const r = await shareLink(tourLink(code), 'Kommt mit auf unsere Schatzsuche durch Hamburg!');
                  setShareMsg(r === 'copied' ? 'Link kopiert – jetzt z. B. in WhatsApp einfügen.' : r === 'shared' ? 'Geteilt!' : '');
                }}
              >
                Tour mit Freunden teilen
              </button>
            )}
            {shareMsg && (
              <p className="muted fade" role="status" data-testid="share-msg" style={{ textAlign: 'center' }}>
                {shareMsg}
              </p>
            )}
          </>
        );
    }
  }

}

function Chips({
  options,
  selected,
  onPick,
  big,
}: {
  options: { id: string; label: string }[];
  selected: string[];
  onPick: (id: string) => void;
  big?: boolean;
}) {
  return (
    <div className={`chips${big ? ' big' : ''}`}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          className={`chip${selected.includes(o.id) ? ' on' : ''}`}
          aria-pressed={selected.includes(o.id)}
          onClick={() => {
            play('select');
            onPick(o.id);
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function TextAnswer({
  initial,
  placeholder,
  chips,
  numeric,
  valid = (v) => v.trim().length > 0,
  onSend,
}: {
  initial: string;
  placeholder: string;
  chips?: string[];
  numeric?: boolean;
  valid?: (v: string) => boolean;
  onSend: (v: string) => void;
}) {
  const [v, setV] = useState(initial);
  const ok = valid(v);
  return (
    <>
      {chips && (
        <div className="chips">
          {chips.map((c) => (
            <button key={c} type="button" className="chip" onClick={() => onSend(c)}>
              {c}
            </button>
          ))}
        </div>
      )}
      <form
        className="chat-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (ok) onSend(v.trim());
        }}
      >
        <input
          className="chat-input"
          data-testid="chat-input"
          value={v}
          placeholder={placeholder}
          inputMode={numeric ? 'numeric' : undefined}
          maxLength={numeric ? 4 : 40}
          autoComplete="off"
          onChange={(e) => setV(numeric ? e.target.value.replace(/\D/g, '') : e.target.value)}
        />
        <button type="submit" className="send-btn" aria-label="Senden" disabled={!ok}>
          <Icon name="play" size={18} color="#fff" />
        </button>
      </form>
    </>
  );
}

function SettingGroup({ label, options, value, onPick, testId }: { label: string; options: { id: string; label: string }[]; value: string; onPick: (id: string) => void; testId?: string }) {
  return (
    <div className="setting-group" data-testid={testId}>
      <div className="setting-label">{label}</div>
      <div className="chips start">
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            className={`chip${o.id === value ? ' on' : ''}`}
            aria-pressed={o.id === value}
            onClick={() => {
              play('select');
              onPick(o.id);
            }}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Toggle({ label, on, onChange, testId }: { label: string; on: boolean; onChange: (v: boolean) => void; testId?: string }) {
  return (
    <button
      type="button"
      className={`chip toggle${on ? ' on' : ''}`}
      aria-pressed={on}
      data-testid={testId}
      onClick={() => {
        play('select');
        onChange(!on);
      }}
    >
      {on ? '✓ ' : ''}
      {label}
    </button>
  );
}
