import { useEffect, useMemo, useRef, useState } from 'react';
import type { LatLng, Poi, Station } from '../data/types';
import { bearing, compassWord, distance, formatDistance, isWithinUnlock, temperature, type Temperature } from '../lib/geo';
import { enableCompass, setSimulatedPosition, startTracking, usePosition } from '../lib/location';
import { POINTS, tasksFor, youngestGroup } from '../lib/scoring';
import { play, setSoundOn, useSoundOn } from '../lib/feedback';
import { estimateSteps, formatSteps, startPedometer, strideFor } from '../lib/pedometer';
import {
  addActivity,
  currentStop,
  nextStop,
  reachWaypoint,
  resolveStop,
  WAYPOINT_POINTS,
  spendHelp,
  stopCoords,
  stopKey,
  trackPosition,
  treasureFound,
  unlockStop,
  useGame,
  type Game,
} from '../state/game';
import { MapView } from '../components/MapView';
import { Gallery } from '../components/Gallery';
import { PinDialog } from '../components/PinDialog';
import { ReadAloud } from '../components/ReadAloud';
import { TaskCard } from '../components/TaskCard';
import { NearbyCaches } from '../components/NearbyCaches';
import { Breath } from '../components/Breath';
import { celebrateArrival, celebratePause, celebrateWaypoint } from '../lib/effects';
import { WALK_GAMES } from '../data/walk-games';
import { TalkCard } from '../components/TalkCard';
import { talksForTour, type TalkPool } from '../data/talk';
import { STATION_BY_ID } from '../data';
import { FamilyGameCard } from '../components/FamilyGameCard';
import { Lilli, LilliSays } from '../components/Lilli';
import { Icon } from '../components/Icon';
import { FinalView, Notebook } from './FinalView';
import { CACHE_CLUES } from '../data/cache-clues';
import { LETTERS } from '../lib/cache';

function useWakeLock() {
  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null;
    const req = async () => {
      try {
        const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } };
        lock = (await nav.wakeLock?.request('screen')) ?? null;
      } catch {
        /* nicht unterstützt */
      }
    };
    void req();
    const onVis = () => document.visibilityState === 'visible' && void req();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      void lock?.release();
    };
  }, []);
}


export function Play({ onFinish, onHome }: { onFinish: () => void; onHome: () => void }) {
  const { game } = useGame();
  const pos = usePosition();
  const sound = useSoundOn();
  const [menu, setMenu] = useState(false);
  const [pinFor, setPinFor] = useState<null | 'unlock' | 'skip'>(null);
  const [notebook, setNotebook] = useState(false);
  useWakeLock();

  // Dezenter Schrittzähler + reine Spielzeit (nur solange die Tour offen und sichtbar ist)
  useEffect(() => {
    let last = Date.now();
    const stop = startPedometer((n) => addActivity(n, 0));
    const tick = setInterval(() => {
      const now = Date.now();
      if (document.visibilityState === 'visible') addActivity(0, now - last);
      last = now;
    }, 15000);
    const onVis = () => {
      if (document.visibilityState === 'visible') last = Date.now();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      const now = Date.now();
      if (document.visibilityState === 'visible') addActivity(0, now - last);
      clearInterval(tick);
      document.removeEventListener('visibilitychange', onVis);
      stop();
    };
  }, []);

  useEffect(() => {
    startTracking();
  }, []);

  useEffect(() => {
    if (pos.coords) trackPosition(pos.coords, pos.accuracy);
  }, [pos.coords, pos.accuracy]);

  const stop = game ? currentStop(game) : undefined;

  useEffect(() => {
    if (game && !stop) onFinish();
  }, [game, stop, onFinish]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [game?.index]);

  if (!game || !stop) return null;
  const key = stopKey(stop);
  const ss = game.stopStates[key];
  const { station, poi } = resolveStop(stop);
  const stationNo = game.stops.slice(0, game.index + 1).filter((s) => s.kind === 'station').length;
  const stationTotal = game.stops.filter((s) => s.kind === 'station').length;
  const quiet = station?.mode === 'quiet';
  const night = stop.kind === 'final';
  const hasFinal = game.stops.some((x) => x.kind === 'final');

  return (
    <div className={`screen play${quiet ? ' quiet-screen' : ''}${night ? ' night' : ''}`} data-target={stopCoords(stop).join(',')}>
      <header className="play-head" style={night ? { background: 'rgba(11,18,32,0.8)' } : quiet ? { background: 'rgba(238,237,234,0.85)' } : undefined}>
        <button type="button" className="icon-btn plain" onClick={() => { play('tap'); setMenu(true); }} aria-label="Menü" style={night ? { background: 'rgba(255,255,255,0.12)', color: '#fff' } : undefined}>
          <Icon name="more" size={20} width={3} />
        </button>
        <div className="mid">
          <span className="caption" style={night ? { color: 'rgba(255,255,255,0.7)' } : undefined}>
            {stop.kind === 'station' ? `Station ${stationNo} von ${stationTotal}` : stop.kind === 'final' ? 'Schatz-Finale' : stop.kind === 'waypoint' ? 'Zwischenziel' : 'Pause'} · {game.team.avatar} {game.team.name}
          </span>
          <div className="segments">
            {game.stops.map((_, i) => (
              <div key={i} className={i < game.index ? 'done' : i === game.index ? 'now' : ''} style={night && i < game.index ? { background: '#fff' } : undefined} />
            ))}
          </div>
        </div>
        <span className="points-pill" data-testid="score">
          <Icon name="star" size={15} color="var(--gold)" />
          <span key={game.points} className="bump">
            {game.points}
          </span>
        </span>
      </header>

      {station && !ss?.unlockedBy && <Navigate game={game} station={station} onPin={() => setPinFor('unlock')} />}
      {station && ss?.unlockedBy && <StationView game={game} station={station} hasFinal={hasFinal} />}
      {poi && stop.kind === 'pause' && <PauseView game={game} poi={poi} />}
      {poi && stop.kind === 'waypoint' && <WaypointView key={key} game={game} poi={poi} />}
      {poi && stop.kind === 'final' && <FinalView game={game} poi={poi} onPin={() => setPinFor('unlock')} />}

      {pos.simulated && <SimPanel target={stopCoords(stop)} radius={station?.radius ?? WAYPOINT_RADIUS} />}

      {menu && (
        <div className="overlay" role="dialog" aria-modal="true" aria-label="Menü" onClick={() => setMenu(false)}>
          <div className="dialog" onClick={(e) => e.stopPropagation()}>
            <div className="grabber" />
            <h3>Menü</h3>
            <p className="muted" data-testid="menu-steps">
              {(game.steps ?? 0) > 0
                ? `${formatSteps(game.steps ?? 0)} Schritte`
                : `ca. ${formatSteps(estimateSteps(game.meters, strideFor(youngestGroup(game.team.members.map((m) => m.age)))))} Schritte`}{' '}
              · {formatDistance(game.meters)} · GPS: {pos.status === 'ok' ? `±${Math.round(pos.accuracy)} m` : pos.status}
            </p>
            <div className="sheet-list">
              {hasFinal && (
                <button type="button" onClick={() => { setMenu(false); setNotebook(true); }}>
                  <Icon name="notebook" size={20} color="var(--accent)" /> Cache-Notizbuch ({(game.cacheLetters ?? []).length})
                </button>
              )}
              {station && !ss?.unlockedBy && (
                <button type="button" onClick={() => { setMenu(false); setPinFor('unlock'); }}>
                  <Icon name="lock" size={20} color="var(--accent)" /> Station mit Eltern-PIN freischalten
                </button>
              )}
              <button type="button" onClick={() => { setMenu(false); setPinFor('skip'); }}>
                <Icon name="skip" size={20} color="var(--accent)" /> Diesen Stopp überspringen (Eltern-PIN)
              </button>
              <button type="button" onClick={() => void enableCompass()}>
                <Icon name="compass" size={20} color="var(--accent)" /> Kompass des Handys aktivieren
              </button>
              <button type="button" onClick={() => setSoundOn(!sound)}>
                <Icon name={sound ? 'speaker' : 'mute'} size={20} color="var(--accent)" /> Ton {sound ? 'ausschalten' : 'einschalten'}
              </button>
              <button type="button" onClick={onHome}>
                <Icon name="pause" size={20} color="var(--accent)" /> Pause – zum Hauptmenü (Spielstand bleibt)
              </button>
            </div>
            <button type="button" className="btn" onClick={() => setMenu(false)}>
              Schließen
            </button>
          </div>
        </div>
      )}

      {notebook && (
        <div className="overlay" role="dialog" aria-modal="true" onClick={() => setNotebook(false)}>
          <div className="dialog light" onClick={(e) => e.stopPropagation()}>
            <div className="grabber" />
            <h3>Cache-Notizbuch</h3>
            <p className="muted">Diese Zahlen braucht ihr am Ende, um die Koordinaten des Schatzes zu berechnen.</p>
            <Notebook game={game} />
            <button type="button" className="btn" onClick={() => setNotebook(false)}>
              Schließen
            </button>
          </div>
        </div>
      )}

      {pinFor && (
        <PinDialog
          title={pinFor === 'unlock' ? 'Station freischalten' : 'Stopp überspringen'}
          text={
            pinFor === 'unlock'
              ? 'Ihr steht am Ziel, aber das GPS will nicht? Ein Erwachsener kann mit der PIN freischalten.'
              : 'Der Ort ist gesperrt, zu weit oder es regnet in Strömen? Mit der PIN geht es direkt zum nächsten Stopp.'
          }
          pin={game.config.pin}
          onCancel={() => setPinFor(null)}
          onOk={() => {
            if (pinFor === 'unlock') {
              if (stop.kind === 'final') {
                play('treasure');
                treasureFound('pin');
              } else {
                play(quiet ? 'soft' : 'found');
                unlockStop('pin');
              }
            } else nextStop(true);
            setPinFor(null);
          }}
        />
      )}
    </div>
  );
}

const TEMP_STYLE: Record<Temperature, { bg: string; fill: string; ink: string; level: number; text: string }> = {
  eiskalt: { bg: '#E3F0FF', fill: '#0A84FF', ink: '#0A4FA3', level: 10, text: 'Ganz weit weg.' },
  kalt: { bg: '#E8F3FB', fill: '#4E9BD6', ink: '#1F5F8F', level: 28, text: 'Noch ein ganzes Stück.' },
  lauwarm: { bg: '#EEF6E4', fill: '#7FAE3A', ink: '#3E5F14', level: 45, text: 'Ihr kommt näher.' },
  warm: { bg: '#FFF4E5', fill: '#F59E0B', ink: '#9A3412', level: 62, text: 'Ihr seid auf dem richtigen Weg.' },
  heiß: { bg: '#FFE8DD', fill: '#F97316', ink: '#9A3412', level: 82, text: 'Ganz nah dran!' },
  kochend: { bg: '#FDE2E1', fill: '#DC2626', ink: '#991B1B', level: 100, text: 'Ihr seid fast da!' },
};

function Compass({ dist, brg, heading }: { dist: number; brg: number; heading: number | null }) {
  const arrow = heading != null ? brg - heading : brg;
  return (
    <div className="compass-wrap rise" aria-label={`Noch ${formatDistance(dist)} Richtung ${compassWord(brg)}`}>
      <svg className="compass-svg" width="220" height="220" viewBox="0 0 260 260" aria-hidden="true">
        <circle className="ping" cx="130" cy="130" r="120" fill="#C2410C" fillOpacity="0.1" />
        <circle className="ping b" cx="130" cy="130" r="120" fill="#C2410C" fillOpacity="0.1" />
        <circle cx="130" cy="130" r="100" fill="#FFFFFF" style={{ filter: 'drop-shadow(0 8px 20px rgba(0,0,0,0.10))' }} />
        <circle cx="130" cy="130" r="84" fill="none" stroke="#F2F2F7" strokeWidth="2" />
        <g transform={heading != null ? `rotate(${-heading} 130 130)` : undefined}>
          <path d="M130 36 V48 M130 212 V224 M36 130 H48 M212 130 H224" stroke="#1C1C1E" strokeWidth="3" strokeLinecap="round" />
          <text x="130" y="66" textAnchor="middle" fontWeight="800" fontSize="16" fill="#C2410C">N</text>
          <text x="200" y="135" textAnchor="middle" fontWeight="600" fontSize="13" fill="#8E8E93">O</text>
          <text x="130" y="204" textAnchor="middle" fontWeight="600" fontSize="13" fill="#8E8E93">S</text>
          <text x="60" y="135" textAnchor="middle" fontWeight="600" fontSize="13" fill="#8E8E93">W</text>
        </g>
        <g className="needle" style={{ transform: `rotate(${arrow}deg)` }}>
          <path d="M130 62 L142 130 L130 124 L118 130 Z" fill="#C2410C" />
          <path d="M130 198 L142 130 L130 136 L118 130 Z" fill="#D1D1D6" />
        </g>
        <circle cx="130" cy="130" r="7" fill="#1C1C1E" />
      </svg>
      <div className="big-dist" data-testid="distance">
        {formatDistance(dist)}
      </div>
      <div className="dir">
        Richtung {compassWord(brg)}
        {heading == null ? ' · Norden ist oben' : ''}
      </div>
    </div>
  );
}

function Navigate({ game, station, onPin }: { game: Game; station: Station; onPin: () => void }) {
  const pos = usePosition();
  const ss = game.stopStates[stopKey(currentStop(game)!)];
  const dist = pos.coords ? distance(pos.coords, station.coords) : null;
  const [hotUntil, setHotUntil] = useState(0);
  const [view, setView] = useState<'compass' | 'map'>('compass');
  const [, force] = useState(0);
  const nearSince = useRef<number | null>(null);
  const [showFallback, setShowFallback] = useState(false);
  const adventure = game.config.nav === 'adventure';
  const quiet = station.mode === 'quiet';
  const mapAllowed = !adventure || (ss?.mapPeek ?? 0) > 0;
  const compassAllowed = !adventure || quiet || (ss?.mapPeek ?? 0) > 0;

  useEffect(() => {
    if (dist !== null && isWithinUnlock(dist, station.radius, pos.accuracy)) {
      play(quiet ? 'soft' : 'found');
      unlockStop('gps');
    }
  }, [dist, pos.accuracy, station.radius, quiet]);

  useEffect(() => {
    const near = dist !== null && dist <= station.radius * 2.5 + Math.min(pos.accuracy, 60);
    if (near) {
      if (nearSince.current === null) nearSince.current = Date.now();
    } else nearSince.current = null;
    const t = setInterval(() => {
      if (nearSince.current && Date.now() - nearSince.current > 45000) setShowFallback(true);
      force((x) => x + 1);
    }, 1000);
    return () => clearInterval(t);
  }, [dist, pos.accuracy, station.radius]);

  const gpsBroken = pos.status === 'denied' || pos.status === 'unavailable';
  const hot = Date.now() < hotUntil && dist !== null;
  const brg = pos.coords ? bearing(pos.coords, station.coords) : 0;
  const wayfindingFree = !adventure || quiet || (dist !== null && dist < 250);
  const temp = dist !== null ? temperature(dist) : null;
  const showWay = ss?.wayfinding || !adventure;

  return (
    <div className="navigate" style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
      <div className="card riddle-card rise">
        <Lilli size={46} mood={quiet ? 'quiet' : 'happy'} />
        <div style={{ flex: 1 }}>
          <div className="kicker" style={quiet ? { color: 'var(--quiet-2)' } : undefined}>
            {quiet ? 'Ein Ort zum Erinnern' : adventure ? 'Lillis Rätsel' : station.title}
          </div>
          <p className="riddle" data-testid="riddle">
            {station.riddle}
          </p>
        </div>
        <ReadAloud text={station.riddle} label="Rätsel vorlesen" />
      </div>

      {showWay && (
        <details className="wayfinding slidedown" open={adventure}>
          <summary>
            <strong>Wegbeschreibung</strong>
          </summary>
          <p style={{ marginTop: 4 }}>{station.wayfinding}</p>
        </details>
      )}

      {hot && temp && (
        <div className="temp-banner slidedown" style={{ background: TEMP_STYLE[temp].bg, color: TEMP_STYLE[temp].ink }} data-testid="temperature">
          <div className="thermo">
            <div style={{ height: `${TEMP_STYLE[temp].level}%`, background: TEMP_STYLE[temp].fill }} />
          </div>
          <div>
            <strong>{temp[0].toUpperCase() + temp.slice(1)}!</strong>
            <div style={{ fontSize: 14 }}>{TEMP_STYLE[temp].text}</div>
          </div>
        </div>
      )}

      {mapAllowed && compassAllowed && dist !== null && (
        <div className="segmented" role="group" aria-label="Ansicht">
          <div className="thumb" style={{ width: 'calc(50% - 2px)', left: view === 'compass' ? 2 : '50%' }} />
          <button type="button" aria-pressed={view === 'compass'} onClick={() => { play('select'); setView('compass'); }}>
            Kompass
          </button>
          <button type="button" aria-pressed={view === 'map'} onClick={() => { play('select'); setView('map'); }}>
            Karte
          </button>
        </div>
      )}

      {dist !== null && compassAllowed && view === 'compass' && <Compass dist={dist} brg={brg} heading={pos.heading} />}
      {mapAllowed && (view === 'map' || dist === null || !compassAllowed) && (
        <div className="rise">
          <MapView
            markers={[{ id: station.id, coords: station.coords, emoji: quiet ? '🕯️' : '🎯', active: true }]}
            me={pos.coords}
            accuracy={pos.accuracy}
            target={station.coords}
            radius={station.radius}
            fit={pos.coords && dist !== null && dist < 4000 ? [pos.coords, station.coords] : [station.coords]}
            onMapClick={pos.simulated ? setSimulatedPosition : undefined}
            height={340}
          />
        </div>
      )}
      {!compassAllowed && !mapAllowed && (
        <div className="card rise" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Lilli size={70} mood="happy" />
          <p style={{ fontSize: 15, lineHeight: 1.45 }}>
            Abenteuer-Modus: keine Karte, kein Pfeil. Folgt dem Rätsel! Wenn ihr nicht weiterkommt, helfen Heiß/Kalt und der Tipp.
          </p>
        </div>
      )}

      <div className="gps-note">
        {pos.status === 'waiting' && <p>Suche GPS-Signal …</p>}
        {gpsBroken && (
          <p className="error">
            Kein GPS ({pos.status === 'denied' ? 'Zugriff verweigert' : 'nicht verfügbar'}). Erlaubt den Standort in den Einstellungen oder nutzt die
            Eltern-PIN.
          </p>
        )}
        {pos.coords && pos.accuracy > 40 && <p>GPS ist gerade ungenau (±{Math.round(pos.accuracy)} m). Geht ein paar Schritte ins Freie.</p>}
      </div>

      <div className="action-bar">
        <div className="action-grid">
          <button
            type="button"
            className="action warm"
            aria-label="Heiß oder kalt?"
            disabled={dist === null}
            onClick={() => {
              spendHelp('hotCold');
              play('select');
              setHotUntil(Date.now() + 20000);
            }}
          >
            <Icon name="thermo" size={20} />
            Heiß/Kalt
            <small>{adventure && !quiet ? `−${POINTS.hotCold} Punkte` : 'gratis'}</small>
          </button>
          {adventure && !mapAllowed ? (
            <button
              type="button"
              className="action teal"
              onClick={() => {
                if (!ss?.wayfinding) {
                  spendHelp('wayfinding', wayfindingFree);
                  play('select');
                } else {
                  play('select');
                  spendHelp('mapPeek');
                }
              }}
            >
              <Icon name={ss?.wayfinding ? 'map' : 'bulb'} size={20} />
              {ss?.wayfinding ? 'Karte' : 'Tipp'}
              <small>{ss?.wayfinding ? `−${POINTS.mapPeek} Punkte` : wayfindingFree ? 'gratis' : `−${POINTS.hint} Punkte`}</small>
            </button>
          ) : (
            <button type="button" className="action teal" onClick={() => void enableCompass()}>
              <Icon name="compass" size={20} />
              Kompass
              <small>Handy drehen</small>
            </button>
          )}
          <button type="button" className="action grey" onClick={() => { play('tap'); onPin(); }} style={showFallback || gpsBroken ? { background: '#FFF4E5' } : undefined}>
            <Icon name="pin" size={20} />
            Wir sind da
            <small>Eltern-PIN</small>
          </button>
        </div>
      </div>
    </div>
  );
}

function StationView({ game, station, hasFinal }: { game: Game; station: Station; hasFinal: boolean }) {
  const ss = game.stopStates[stopKey(currentStop(game)!)];
  const youngest = youngestGroup(game.team.members.map((m) => m.age));
  const tasks = useMemo(() => tasksFor(station, youngest), [station, youngest]);
  const quiet = station.mode === 'quiet';
  const doneCount = tasks.filter((t) => ss.tasks[t.id]?.done).length;
  const allDone = doneCount === tasks.length;
  const current = tasks.find((t) => !ss.tasks[t.id]?.done);
  const pts = Object.values(ss.tasks).reduce((a, t) => a + t.points, 0) + ss.bonus;
  const [silence, setSilence] = useState(false);
  const fresh = ss.unlockedAt && Date.now() - ss.unlockedAt < 5000;
  const clue = CACHE_CLUES[station.id];
  const familyGame = quiet ? undefined : game.familyGames?.[station.id];
  const familyState = game.familyDone?.[station.id];
  const familyPending = !!familyGame && !familyState;
  const letters = game.cacheLetters ?? [];
  const letter = letters.find((l) => l.stationId === station.id)?.letter ?? LETTERS[letters.length % LETTERS.length];

  // Ankunft feiern (nur direkt nach dem Freischalten, nicht an Gedenkorten)
  useEffect(() => {
    if (!quiet && fresh) celebrateArrival();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [station.id]);

  // Gesprächsstoff: über die ganze Tour ohne Wiederholung
  const tourTalk = useMemo(() => {
    const stationStops = game.stops.filter((s) => s.kind === 'station');
    const pools = stationStops.map((s) => talkPools(STATION_BY_ID.get(s.id)!));
    const i = stationStops.findIndex((s) => s.id === station.id);
    return talksForTour(pools, game.config.seed, youngest)[i];
  }, [game.stops, game.config.seed, youngest, station.id]);

  const lilliText = quiet
    ? 'Hier sind wir leise. Lasst uns gemeinsam einen Moment innehalten.'
    : allDone
      ? 'Super gemacht! Lest noch den Info-Happen, dann fliegen wir weiter.'
      : ss.bonus
        ? 'Juhu, gefunden – ganz ohne Hilfe! Das gibt einen Bonus. Jetzt genau hinschauen …'
        : 'Juhu, gefunden! Jetzt genau hinschauen …';

  return (
    <div className={`station${quiet ? ' quiet' : ''}`} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {quiet ? (
        <div className="quiet-head fade" data-testid="arrived">
          <svg width="28" height="34" viewBox="0 0 28 34" aria-hidden="true">
            <path className="flame" d="M14 2 C18 8 19 11 19 13.5 A5 5 0 0 1 9 13.5 C9 11 10 8 14 2 Z" fill="#E8A33D" />
            <rect x="9" y="18" width="10" height="15" rx="2" fill="#D9D6CF" />
          </svg>
          <div>
            <div className="caption" style={{ color: 'var(--quiet-2)' }}>
              Ein Ort zum Erinnern · keine Punkte
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 700, lineHeight: 1.15 }}>{station.title}</h1>
          </div>
        </div>
      ) : (
        <div className="celebrate" data-testid="arrived">
          <div className="check-badge">
            <div className="burst" />
            <div className="disc">
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
            </div>
          </div>
          <div className="caption rise">Gefunden!</div>
          <h1 className="large-title rise">{station.title}</h1>
          {ss.bonus > 0 && <span className="chip teal rise">+{ss.bonus} Bonus · ohne Hilfe gefunden</span>}
        </div>
      )}

      <div className={quiet ? 'fade' : 'rise'}>
        <Gallery ids={station.images} alt={station.title} />
      </div>

      <LilliSays mood={quiet ? 'quiet' : allDone ? 'excited' : 'happy'} variant={quiet ? 'quiet' : 'light'}>
        {lilliText}
      </LilliSays>

      {quiet && (
        <div className="card fade">
          <p style={{ fontSize: 16, lineHeight: 1.55 }}>{station.snack}</p>
          <div style={{ marginTop: 8 }}>
            <ReadAloud text={station.snack} />
          </div>
        </div>
      )}

      {tasks
        .filter((t) => ss.tasks[t.id]?.done)
        .map((t) => (
          <TaskCard key={t.id} task={t} state={ss.tasks[t.id]} quiet={quiet} index={tasks.indexOf(t)} total={tasks.length} />
        ))}
      {current && <TaskCard key={current.id} task={current} state={ss.tasks[current.id]} quiet={quiet} index={tasks.indexOf(current)} total={tasks.length} />}

      {allDone && !quiet && clue && hasFinal && (
        <div className="cache-clue" data-testid="cache-clue">
          <div className="letter-tile">{letter}</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>
              Notizbuch: {letter} = {clue.value}
            </div>
            <div className="muted" style={{ fontSize: 13 }}>
              {clue.label}
            </div>
          </div>
        </div>
      )}

      {allDone && !quiet && (
        <section className="card snack rise">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <h3>Wusstet ihr?</h3>
            <ReadAloud text={station.snack + (station.kidsFact ? ' ' + station.kidsFact : '')} />
          </div>
          <p>{station.snack}</p>
          {station.kidsFact && <p className="kids-fact">{station.kidsFact}</p>}
        </section>
      )}

      {allDone && !quiet && (
        <TalkCard pools={talkPools(station)} seed={game.config.seed + game.index} youngest={youngest} initial={tourTalk} />
      )}

      {allDone && familyGame && <FamilyGameCard stationId={station.id} gameId={familyGame} state={familyState} />}

      {allDone && quiet && (
        <div className="card fade" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {silence && (
            <Breath />
          )}
          <button type="button" className="btn" style={{ background: '#E3E1DC' }} onClick={() => { play('soft'); setSilence(!silence); }}>
            {silence ? 'Moment der Stille beenden' : 'Einen Moment der Stille'}
          </button>
        </div>
      )}

      {allDone && quiet && (
        <TalkCard pools={['erinnern']} seed={game.config.seed + game.index} youngest={youngest} title="Zum Nachdenken" quiet initial={tourTalk} />
      )}

      {allDone && !familyPending && (
        <>
          {!quiet && pts > 0 && (
            <p className="caption" style={{ textAlign: 'center' }}>
              Punkte an dieser Station: {pts}
            </p>
          )}
          <button
            type="button"
            className={`btn big ${quiet ? 'dark' : 'primary'}`}
            onClick={() => {
              play(quiet ? 'soft' : 'unlock');
              nextStop();
            }}
          >
            {quiet ? 'Leise weitergehen' : game.index + 1 < game.stops.length ? 'Weiter zum nächsten Ziel' : 'Tour abschließen'}
            {!quiet && <Icon name="next" size={18} color="#fff" width={2.6} />}
          </button>
        </>
      )}

      {!quiet && <NearbyCaches center={station.coords} />}
      <details className="sources">
        <summary>Quellen</summary>
        <ul>
          {station.sources.map((s) => (
            <li key={s}>
              <a href={s} target="_blank" rel="noreferrer">
                {decodeURIComponent(s.replace(/^https?:\/\//, ''))}
              </a>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}

const POI_EMOJI: Record<Poi['kind'], string> = { spielplatz: '🛝', eis: '🍦', wc: '🚻', cafe: '☕' };

function PauseView({ game, poi }: { game: Game; poi: Poi }) {
  const pos = usePosition();
  const dist = pos.coords ? distance(pos.coords, poi.coords) : null;
  const arrived = dist !== null && dist < 60;
  useEffect(() => {
    if (!arrived) return;
    play('gull');
    celebratePause(document.querySelector('.pause-hero .emoji'));
  }, [arrived]);
  return (
    <div className="pause" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="pause-hero">
        <span className="emoji" aria-hidden="true">
          {POI_EMOJI[poi.kind]}
        </span>
        <h1 className="large-title">Pausenzeit!</h1>
        <p className="muted">Zeit zum Toben, Eis essen und Kräfte sammeln.</p>
      </div>
      <div className="card rise">
        <div className="caption">Nächster Halt</div>
        <div style={{ fontSize: 18, fontWeight: 700 }}>{poi.title}</div>
        {poi.note && <p className="muted">{poi.note}</p>}
        {dist !== null && (
          <p style={{ fontSize: 28, fontWeight: 800, marginTop: 6 }} className="dist">
            {arrived ? 'Ihr seid da!' : formatDistance(dist)}
          </p>
        )}
      </div>
      <div className="rise">
        <MapView
          markers={[{ id: poi.id, coords: poi.coords, emoji: POI_EMOJI[poi.kind], active: true }]}
          me={pos.coords}
          accuracy={pos.accuracy}
          fit={pos.coords && dist !== null && dist < 4000 ? [pos.coords, poi.coords] : [poi.coords]}
          onMapClick={pos.simulated ? setSimulatedPosition : undefined}
          height={260}
        />
      </div>
      {arrived && <TalkCard pools={['pause']} seed={game.config.seed + game.index} youngest={youngestGroup(game.team.members.map((m) => m.age))} title="Pausen-Frage" />}
      <button type="button" className="btn big primary" onClick={() => { play('unlock'); nextStop(false); }}>
        {arrived ? 'Pause beendet – weiter' : 'Pause überspringen'}
      </button>
      {game.config.nav === 'adventure' && <p className="muted">Pausen sind immer auf der Karte zu sehen und kosten keine Punkte.</p>}
    </div>
  );
}

const WAYPOINT_RADIUS = 35;

/** Themen-Pools für den Gesprächsstoff einer Station */
function talkPools(s: Station): TalkPool[] {
  return s.mode === 'quiet' ? ['erinnern'] : (s.categories.filter((c) => c !== 'erinnern') as TalkPool[]);
}

function WaypointView({ game, poi }: { game: Game; poi: Poi }) {
  const pos = usePosition();
  const dist = pos.coords ? distance(pos.coords, poi.coords) : null;
  const [arrived, setArrived] = useState(false);
  const n = game.index;
  const walkGame = WALK_GAMES[(n + game.config.seed) % WALK_GAMES.length];
  // nächste Station (für die Vorschau)
  const nextStation = game.stops.slice(game.index + 1).find((s) => s.kind === 'station');
  const ahead = game.stops.slice(game.index + 1, game.stops.indexOf(nextStation!)).filter((s) => s.kind === 'waypoint').length;
  const nextTitle = nextStation ? STATION_BY_ID.get(nextStation.id)?.teaser : undefined;

  useEffect(() => {
    if (!arrived && dist !== null && isWithinUnlock(dist, WAYPOINT_RADIUS, pos.accuracy)) {
      setArrived(true);
      play('unlock');
      celebrateWaypoint(document.querySelector('.compass-wrap, .waypoint'), WAYPOINT_POINTS);
    }
  }, [dist, pos.accuracy, arrived]);
  useEffect(() => {
    if (!arrived) return;
    const t = setTimeout(() => reachWaypoint(true), 1600);
    return () => clearTimeout(t);
  }, [arrived]);

  const brg = pos.coords ? bearing(pos.coords, poi.coords) : 0;
  return (
    <div className="waypoint" data-testid="waypoint" data-state={arrived ? 'arrived' : undefined}>
      {arrived ? (
        <div className="waypoint-done pop">
          <Lilli size={110} mood="excited" />
          <h1 className="large-title">Zwischenziel geschafft!</h1>
          <span className="points-pill">+{WAYPOINT_POINTS}</span>
        </div>
      ) : (
        <>
          <div className="card waypoint-head rise">
            <span className="wp-flag" aria-hidden="true">
              {POI_EMOJI[poi.kind]}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="caption">Lauft zum Zwischenziel</div>
              <strong>{poi.title}</strong>
              {nextTitle && (
                <small className="muted">
                  {ahead > 0 ? `Noch ${ahead + 1} Zwischenziele` : 'Danach wartet die nächste Station'}
                </small>
              )}
            </div>
          </div>
          {dist !== null && <Compass dist={dist} brg={brg} heading={pos.heading} />}
          <div className="rise">
            <MapView
              markers={[{ id: poi.id, coords: poi.coords, emoji: POI_EMOJI[poi.kind], active: true }]}
              me={pos.coords}
              accuracy={pos.accuracy}
              fit={pos.coords && dist !== null && dist < 1500 ? [pos.coords, poi.coords] : [poi.coords]}
              onMapClick={pos.simulated ? setSimulatedPosition : undefined}
              height={200}
            />
          </div>
          {n % 2 === 0 ? (
            <div className="card walk-game rise">
              <div className="caption">Spiel für unterwegs</div>
              <p>{walkGame}</p>
            </div>
          ) : (
            <TalkCard pools={['weg']} seed={game.config.seed + n} youngest={youngestGroup(game.team.members.map((m) => m.age))} />
          )}
          <button type="button" className="btn ghost small" style={{ alignSelf: 'center' }} onClick={() => { play('tap'); reachWaypoint(false); }}>
            Zwischenziel auslassen
          </button>
        </>
      )}
    </div>
  );
}

function SimPanel({ target, radius }: { target: LatLng; radius: number }) {
  const offset = (m: number): LatLng => [target[0] - m / 111320, target[1]];
  return (
    <div className="sim-panel" data-testid="sim-panel">
      <strong>Testmodus</strong>
      <button type="button" className="btn" data-testid="sim-near" onClick={() => setSimulatedPosition(offset(radius * 3 + 150))}>
        {Math.round(radius * 3 + 150)} m davor
      </button>
      <button type="button" className="btn" data-testid="sim-jump" onClick={() => setSimulatedPosition(offset(radius * 0.4))}>
        Zum Ziel springen
      </button>
      <small>Tippen auf die Karte setzt den Standort.</small>
    </div>
  );
}
