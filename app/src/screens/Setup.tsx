import { useEffect, useMemo, useRef, useState } from 'react';
import { DISTRICTS, START_POINTS } from '../data/districts';
import { POIS, STATIONS } from '../data';
import type { AgeGroup, Category, DistrictId, LatLng } from '../data/types';
import { formatDistance, distance } from '../lib/geo';
import { generateRoute } from '../lib/route';
import { speedFor, youngestGroup } from '../lib/scoring';
import { usePosition, startTracking } from '../lib/location';
import { play } from '../lib/feedback';
import { sparkle } from '../lib/effects';
import { requestMotionPermission } from '../lib/pedometer';
import { lastTeam, startGame, type Member, type NavMode, type Team, type TourConfig } from '../state/game';
import { MapView } from '../components/MapView';
import { Icon } from '../components/Icon';
import { Lilli } from '../components/Lilli';

const AVATARS = ['🦊', '🐧', '🦉', '🐙', '🦁', '🐳', '🦄', '🐢', '🐝', '🦭'];
const AGE_LABEL: Record<AgeGroup, string> = { kids: 'Kind 6–9', tweens: 'Kind 10–13', adults: 'Teen / Erwachsen' };
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

type Q =
  | { id: 'team' }
  | { id: 'count' }
  | { id: 'member'; i: number }
  | { id: 'avatar' }
  | { id: 'districts' }
  | { id: 'minutes' }
  | { id: 'legs' }
  | { id: 'theme' }
  | { id: 'start' }
  | { id: 'nav' }
  | { id: 'cache' }
  | { id: 'pause' }
  | { id: 'quiet' }
  | { id: 'pin' }
  | { id: 'route' };

/** Lilli fragt der Reihe nach, wie im Chat. Ältere Antworten lassen sich antippen und ändern. */
export function Setup({ onStarted, onCancel }: { onStarted: () => void; onCancel: () => void }) {
  const prev = lastTeam();
  const [step, setStep] = useState(0);
  const [team, setTeam] = useState<Team>(prev ?? { name: '', avatar: AVATARS[0], members: [] });
  const [count, setCount] = useState(prev?.members.length ?? 0);
  const [districts, setDistricts] = useState<DistrictId[]>([]);
  const [minutes, setMinutes] = useState(90);
  const [nav, setNav] = useState<NavMode>('map');
  const [includeQuiet, setIncludeQuiet] = useState(true);
  const [includePause, setIncludePause] = useState(true);
  const [pin, setPin] = useState('');
  const [startId, setStartId] = useState<string>('');
  const [theme, setTheme] = useState<Category | 'mix'>('mix');
  const [cache, setCache] = useState(true);
  const [maxLeg, setMaxLeg] = useState(500);
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1e9));
  const pos = usePosition();

  const questions: Q[] = useMemo(() => {
    const q: Q[] = [{ id: 'team' }, { id: 'count' }];
    for (let i = 0; i < count; i++) q.push({ id: 'member', i });
    q.push({ id: 'avatar' }, { id: 'districts' }, { id: 'minutes' }, { id: 'legs' }, { id: 'theme' }, { id: 'start' }, { id: 'nav' }, { id: 'cache' });
    if (minutes >= 60) q.push({ id: 'pause' });
    if (theme !== 'erinnern') q.push({ id: 'quiet' });
    q.push({ id: 'pin' }, { id: 'route' });
    return q;
  }, [count, minutes, theme]);

  const current = questions[Math.min(step, questions.length - 1)];
  const members = team.members.slice(0, count);
  const groups = members.map((m) => m.age);
  const youngest = youngestGroup(groups.length ? groups : ['adults']);

  const start: { coords: LatLng; label: string } | null = useMemo(() => {
    if (startId === 'gps') return pos.coords ? { coords: pos.coords, label: 'Euer Standort' } : null;
    const sp = START_POINTS.find((s) => s.id === startId);
    return sp ? { coords: sp.coords, label: sp.title } : null;
  }, [startId, pos.coords]);

  const [avoid, setAvoid] = useState<string[]>([]);
  const [noOther, setNoOther] = useState(false);
  const plan = (sd: number, av: string[]) =>
    generateRoute(STATIONS, POIS, {
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
    });
  const route = useMemo(() => {
    if (current.id !== 'route' || !start || !districts.length) return null;
    return plan(seed, avoid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current.id, start, districts, minutes, youngest, includeQuiet, includePause, seed, theme, cache, maxLeg, avoid]);

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
  }, [step, route]);

  const next = () => {
    play('tap');
    setNoOther(false);
    setStep((s) => s + 1);
  };
  const setMember = (i: number, m: Member) => {
    const list = team.members.slice();
    while (list.length <= i) list.push({ name: '', age: 'kids' });
    list[i] = m;
    setTeam({ ...team, members: list });
  };

  /** Frage von Lilli (Text) */
  const ask = (q: Q): string => {
    const n = team.name.trim() || 'ihr';
    switch (q.id) {
      case 'team':
        return prev ? `Moin, ${prev.name}! Schön, dass ihr wieder da seid. Bleibt es bei eurem Teamnamen?` : 'Moin! Ich bin Lilli, eure Schatzsuch-Möwe. Wie heißt euer Team?';
      case 'count':
        return `${n} – klingt nach echten Entdeckern! Wie viele seid ihr?`;
      case 'member':
        return q.i === 0 ? 'Wer ist dabei? Verrate mir Namen und Alter. Der Name ist freiwillig.' : `Und Person ${q.i + 1}?`;
      case 'avatar':
        return `Ich passe die Rätsel an die Jüngsten an (${AGE_LABEL[youngest]}). Welches Maskottchen nehmt ihr mit?`;
      case 'districts':
        return 'Wo wollen wir suchen? Ihr könnt auch mehrere Stadtteile antippen.';
      case 'minutes':
        return 'Wie lange haben eure Beine Lust?';
      case 'legs':
        return 'Sind auch Wege über 500 Meter bis zum nächsten Ziel okay? Bei kurzen Wegen baue ich kleine Zwischenziele ein, damit niemand quengelt.';
      case 'theme':
        return 'Habt ihr ein Lieblingsthema?';
      case 'start':
        return 'Wo startet ihr?';
      case 'nav':
        return 'Wie wollt ihr die Orte finden? Mit Karte ist es leichter, im Abenteuer-Modus gibt es nur Rätsel und Hinweise.';
      case 'cache':
        return 'Soll am Ende ein Schatz-Finale warten? Dafür sammelt ihr unterwegs Zahlen und berechnet die Koordinaten wie beim Geocaching.';
      case 'pause':
        return 'Sollen wir eine Pause an einem Spielplatz oder einer Eisdiele einplanen?';
      case 'quiet':
        return 'Möchtet ihr auch Gedenkorte besuchen, zum Beispiel Stolpersteine? Dort ist es ruhig und es gibt keine Punkte.';
      case 'pin':
        return 'Zum Schluss: Ein Erwachsener legt eine 4-stellige Eltern-PIN fest. Damit schaltet ihr Stationen frei, wenn das GPS mal spinnt.';
      case 'route':
        return route && route.stops.some((s) => s.kind === 'station')
          ? `Eure Route steht!${maxLeg ? ` Kein Weg ist länger als ${maxLeg === 1000 ? '1 Kilometer' : `${maxLeg} Meter`}.` : ''} Den Schatz-Ort verrate ich natürlich noch nicht …`
          : 'Hm, für diese Auswahl finde ich keine passende Route. Tippt oben auf eine Antwort, um etwas zu ändern.';
    }
  };

  /** Eure Antwort (für den Chatverlauf) */
  const answer = (q: Q): string => {
    switch (q.id) {
      case 'team':
        return team.name.trim();
      case 'count':
        return count === 1 ? 'Nur ich' : `Wir sind ${count}`;
      case 'member': {
        const m = members[q.i];
        return m ? `${m.name.trim() || `Person ${q.i + 1}`} · ${AGE_LABEL[m.age]}` : '';
      }
      case 'avatar':
        return team.avatar;
      case 'districts':
        return districts.map((d) => DISTRICTS.find((x) => x.id === d)!.name).join(', ');
      case 'minutes':
        return DURATIONS.find((d) => d.v === minutes)!.name;
      case 'legs':
        return LEGS.find((l) => l.v === maxLeg)!.name;
      case 'theme':
        return THEMES.find((t) => t.id === theme)!.name;
      case 'start':
        return start?.label ?? 'Mein Standort';
      case 'nav':
        return nav === 'map' ? 'Mit Karte' : 'Abenteuer';
      case 'cache':
        return cache ? 'Ja, mit Schatz!' : 'Nein, danke';
      case 'pause':
        return includePause ? 'Ja, Pause muss sein' : 'Keine Pause';
      case 'quiet':
        return includeQuiet ? 'Ja' : 'Lieber nicht';
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
                          ? { id: s.poi.id, coords: s.poi.coords, emoji: s.poi.kind === 'eis' ? '🍦' : '🛝', label: `Pause: ${s.poi.title}` }
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
                          <span className="num extra">{s.poi.kind === 'eis' ? '🍦' : '🛝'}</span>Pause: {s.poi.title}
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
            chips={prev ? [prev.name] : ['Die Alsterpiraten', 'Team Möwe', 'Die Klinker-Detektive']}
            onSend={(v) => {
              setTeam({ ...team, name: v });
              next();
            }}
          />
        );
      case 'count':
        return (
          <Chips
            options={Array.from({ length: MAX_PEOPLE }, (_, i) => ({ id: String(i + 1), label: i === 0 ? 'Nur ich' : String(i + 1) }))}
            selected={count ? [String(count)] : []}
            onPick={(id) => {
              const c = Number(id);
              setCount(c);
              const list = team.members.slice(0, c);
              while (list.length < c) list.push({ name: '', age: list.length === 0 ? 'adults' : 'kids' });
              setTeam({ ...team, members: list });
              next();
            }}
          />
        );
      case 'member':
        return (
          <MemberAnswer
            i={q.i}
            m={team.members[q.i] ?? { name: '', age: q.i === 0 ? 'adults' : 'kids' }}
            onPick={(m) => {
              setMember(q.i, m);
              next();
            }}
          />
        );
      case 'avatar':
        return (
          <Chips
            options={AVATARS.map((a) => ({ id: a, label: a }))}
            selected={[team.avatar]}
            big
            onPick={(a) => {
              setTeam({ ...team, avatar: a });
              next();
            }}
          />
        );
      case 'districts':
        return (
          <>
            <Chips
              options={DISTRICTS.map((d) => ({ id: d.id, label: `${d.name} · ${STATIONS.filter((s) => s.district === d.id).length}` }))}
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
      case 'legs':
        return (
          <Chips
            options={LEGS.map((l) => ({ id: String(l.v), label: l.name }))}
            selected={[String(maxLeg)]}
            onPick={(v) => {
              setMaxLeg(Number(v));
              next();
            }}
          />
        );
      case 'theme':
        return (
          <Chips
            options={THEMES.map((t) => ({ id: t.id, label: t.name }))}
            selected={[theme]}
            onPick={(v) => {
              setTheme(v as Category | 'mix');
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
                {pos.coords ? 'Hier starten' : 'Standort wird gesucht …'}
              </button>
            )}
          </>
        );
      }
      case 'nav':
        return (
          <Chips
            options={[
              { id: 'map', label: '🗺️ Mit Karte' },
              { id: 'adventure', label: '🧭 Abenteuer' },
            ]}
            selected={[nav]}
            onPick={(v) => {
              setNav(v as NavMode);
              next();
            }}
          />
        );
      case 'cache':
        return <YesNo yes="Ja, mit Schatz!" no="Nein, danke" value={cache} testId="cache-toggle" onPick={(v) => { setCache(v); next(); }} />;
      case 'pause':
        return <YesNo yes="Ja, Pause muss sein" no="Keine Pause" value={includePause} onPick={(v) => { setIncludePause(v); next(); }} />;
      case 'quiet':
        return <YesNo yes="Ja" no="Lieber nicht" value={includeQuiet} onPick={(v) => { setIncludeQuiet(v); next(); }} />;
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
          </>
        );
    }
  }

}

function MemberAnswer({ i, m, onPick }: { i: number; m: Member; onPick: (m: Member) => void }) {
  const [name, setName] = useState(m.name);
  return (
    <>
      <input className="chat-input" data-testid="chat-input" value={name} placeholder={`Name ${i + 1} (freiwillig)`} onChange={(e) => setName(e.target.value)} />
      <Chips
        options={(Object.keys(AGE_LABEL) as AgeGroup[]).map((a) => ({ id: a, label: AGE_LABEL[a] }))}
        selected={[m.age]}
        onPick={(a) => onPick({ name, age: a as AgeGroup })}
      />
    </>
  );
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

function YesNo({ yes, no, value, onPick, testId }: { yes: string; no: string; value: boolean; onPick: (v: boolean) => void; testId?: string }) {
  return (
    <div className="chips" data-testid={testId}>
      <button type="button" className={`chip${value ? ' on' : ''}`} onClick={() => { play('select'); onPick(true); }}>
        {yes}
      </button>
      <button type="button" className="chip" onClick={() => { play('select'); onPick(false); }}>
        {no}
      </button>
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
