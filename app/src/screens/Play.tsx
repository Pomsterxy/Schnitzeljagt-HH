import { useEffect, useMemo, useRef, useState } from 'react';
import type { LatLng, Poi, Station } from '../data/types';
import { bearing, compassWord, distance, formatDistance, isWithinUnlock, temperature } from '../lib/geo';
import { enableCompass, setSimulatedPosition, startTracking, usePosition } from '../lib/location';
import { POINTS, tasksFor, youngestGroup } from '../lib/scoring';
import {
  currentStop,
  nextStop,
  resolveStop,
  spendHelp,
  stopCoords,
  stopKey,
  trackPosition,
  unlockStop,
  useGame,
  type Game,
} from '../state/game';
import { MapView } from '../components/MapView';
import { Gallery } from '../components/Gallery';
import { PinDialog } from '../components/PinDialog';
import { ReadAloud } from '../components/ReadAloud';
import { TaskCard } from '../components/TaskCard';

function vibrate(p: number | number[]) {
  try {
    navigator.vibrate?.(p);
  } catch {
    /* egal */
  }
}

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
  const [menu, setMenu] = useState(false);
  const [pinFor, setPinFor] = useState<null | 'unlock' | 'skip'>(null);
  useWakeLock();

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

  if (!game || !stop) return null;
  const key = stopKey(stop);
  const ss = game.stopStates[key];
  const { station, poi } = resolveStop(stop);
  const stationNo = game.stops.slice(0, game.index + 1).filter((s) => s.kind === 'station').length;
  const stationTotal = game.stops.filter((s) => s.kind === 'station').length;

  return (
    <div className="screen play" data-target={stopCoords(stop).join(',')}>
      <header className="play-head">
        <span className="team">
          {game.team.avatar} {game.team.name}
        </span>
        <span className="score" data-testid="score">
          ⭐ {game.points}
        </span>
        <span className="progress">
          {stop.kind === 'station' ? `Station ${stationNo}/${stationTotal}` : 'Pause'}
        </span>
        <button type="button" className="btn small ghost" onClick={() => setMenu(true)} aria-label="Menü">
          ☰
        </button>
      </header>
      <div className="progress-bar">
        <div style={{ width: `${(game.index / game.stops.length) * 100}%` }} />
      </div>

      {station && !ss?.unlockedBy && <Navigate game={game} station={station} onPin={() => setPinFor('unlock')} />}
      {station && ss?.unlockedBy && <StationView game={game} station={station} />}
      {poi && <PauseView game={game} poi={poi} />}

      {pos.simulated && <SimPanel target={stopCoords(stop)} radius={station?.radius ?? 40} />}

      {menu && (
        <div className="overlay" role="dialog" aria-modal="true" onClick={() => setMenu(false)}>
          <div className="dialog" onClick={(e) => e.stopPropagation()}>
            <h3>Menü</h3>
            <p className="muted">
              Ziel: {game.stops.length} Stopps · gelaufen: {formatDistance(game.meters)} · GPS: {pos.status}
              {pos.coords ? ` (±${Math.round(pos.accuracy)} m)` : ''}
            </p>
            {station && !ss?.unlockedBy && (
              <button type="button" className="btn" onClick={() => { setMenu(false); setPinFor('unlock'); }}>
                🔓 Station mit Eltern-PIN freischalten
              </button>
            )}
            <button type="button" className="btn" onClick={() => { setMenu(false); setPinFor('skip'); }}>
              ⏭ Diesen Stopp überspringen (Eltern-PIN)
            </button>
            <button type="button" className="btn" onClick={() => void enableCompass()}>
              🧭 Kompass aktivieren
            </button>
            <button type="button" className="btn" onClick={onHome}>
              ⏸ Pause – zum Hauptmenü (Spielstand bleibt)
            </button>
            <button type="button" className="btn ghost" onClick={() => setMenu(false)}>
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
              ? 'Ihr steht am Ziel, aber das GPS will nicht? Ein Erwachsener kann die Station mit der PIN freischalten.'
              : 'Der Ort ist gesperrt, zu weit oder es regnet in Strömen? Mit der PIN geht es direkt zum nächsten Stopp.'
          }
          pin={game.config.pin}
          onCancel={() => setPinFor(null)}
          onOk={() => {
            if (pinFor === 'unlock') unlockStop('pin');
            else nextStop(true);
            setPinFor(null);
          }}
        />
      )}
    </div>
  );
}

function Navigate({ game, station, onPin }: { game: Game; station: Station; onPin: () => void }) {
  const pos = usePosition();
  const ss = game.stopStates[stopKey(currentStop(game)!)];
  const dist = pos.coords ? distance(pos.coords, station.coords) : null;
  const [hotUntil, setHotUntil] = useState(0);
  const [, force] = useState(0);
  const nearSince = useRef<number | null>(null);
  const [showFallback, setShowFallback] = useState(false);
  const adventure = game.config.nav === 'adventure';
  const showMap = !adventure || (ss?.mapPeek ?? 0) > 0;
  const quiet = station.mode === 'quiet';

  // Automatisch freischalten, sobald man im Radius ist
  useEffect(() => {
    if (dist !== null && isWithinUnlock(dist, station.radius, pos.accuracy)) {
      vibrate([120, 60, 120]);
      unlockStop('gps');
    }
  }, [dist, pos.accuracy, station.radius]);

  // Fallback anbieten, wenn man länger "fast da" ist
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
  const arrow = pos.heading != null ? brg - pos.heading : brg;
  const wayfindingFree = !adventure || quiet || (dist !== null && dist < 250);

  return (
    <div className="navigate">
      <h2>{adventure && !quiet ? 'Wohin geht es?' : station.title}</h2>
      <p className="riddle" data-testid="riddle">
        {quiet ? '🕯️ ' : '🧩 '}
        {station.riddle}
      </p>
      <ReadAloud text={station.riddle} label="Rätsel vorlesen" />
      {!adventure && <p className="muted">{station.teaser}</p>}

      {(ss?.wayfinding || !adventure) && (
        <div className="wayfinding">
          <strong>Wegbeschreibung:</strong> {station.wayfinding}
        </div>
      )}
      {adventure && !ss?.wayfinding && (
        <button type="button" className="btn" onClick={() => spendHelp('wayfinding', wayfindingFree)}>
          🗒️ Wegbeschreibung zeigen{wayfindingFree ? '' : ` (−${POINTS.hint} P.)`}
        </button>
      )}

      {dist !== null && !adventure && (
        <div className="compass" aria-label={`Noch ${formatDistance(dist)} Richtung ${compassWord(brg)}`}>
          <div className="arrow" style={{ transform: `rotate(${arrow}deg)` }}>
            ⬆
          </div>
          <div>
            <div className="dist" data-testid="distance">
              {formatDistance(dist)}
            </div>
            <div className="muted">Richtung {compassWord(brg)}{pos.heading == null ? ' (Norden = oben)' : ''}</div>
          </div>
        </div>
      )}

      {adventure && (
        <div className="help-row">
          <button
            type="button"
            className="btn"
            disabled={dist === null}
            onClick={() => {
              spendHelp('hotCold');
              setHotUntil(Date.now() + 20000);
            }}
          >
            🌡️ Heiß oder kalt?{quiet ? '' : ` (−${POINTS.hotCold} P.)`}
          </button>
          {!showMap && (
            <button type="button" className="btn" onClick={() => spendHelp('mapPeek')}>
              🗺️ Karte zeigen{quiet ? '' : ` (−${POINTS.mapPeek} P.)`}
            </button>
          )}
        </div>
      )}
      {hot && dist !== null && (
        <div className={`temp temp-${temperature(dist).replace('ß', 'ss')}`} data-testid="temperature">
          {temperature(dist).toUpperCase()}!
        </div>
      )}

      {showMap && (
        <MapView
          markers={[{ id: station.id, coords: station.coords, emoji: quiet ? '🕯️' : '🎯', active: true }]}
          me={pos.coords}
          accuracy={pos.accuracy}
          target={station.coords}
          radius={station.radius}
          fit={pos.coords && dist !== null && dist < 4000 ? [pos.coords, station.coords] : [station.coords]}
          onMapClick={pos.simulated ? setSimulatedPosition : undefined}
        />
      )}

      <div className="gps-status">
        {pos.status === 'waiting' && <p className="muted">📡 Suche GPS-Signal …</p>}
        {gpsBroken && (
          <p className="error">
            Kein GPS verfügbar ({pos.status === 'denied' ? 'Zugriff verweigert' : 'nicht verfügbar'}). Erlaubt den Standortzugriff in den
            Browser-Einstellungen oder schaltet die Station mit der Eltern-PIN frei.
          </p>
        )}
        {pos.coords && pos.accuracy > 40 && <p className="muted">GPS ist gerade ungenau (±{Math.round(pos.accuracy)} m). Geht ein paar Schritte ins Freie.</p>}
      </div>

      {(showFallback || gpsBroken) && (
        <button type="button" className="btn warn" onClick={onPin}>
          📍 Wir sind da, aber es schaltet nicht frei
        </button>
      )}
    </div>
  );
}

function StationView({ game, station }: { game: Game; station: Station }) {
  const ss = game.stopStates[stopKey(currentStop(game)!)];
  const youngest = youngestGroup(game.team.members.map((m) => m.age));
  const tasks = useMemo(() => tasksFor(station, youngest), [station, youngest]);
  const quiet = station.mode === 'quiet';
  const doneCount = tasks.filter((t) => ss.tasks[t.id]?.done).length;
  const allDone = doneCount === tasks.length;
  const current = tasks.find((t) => !ss.tasks[t.id]?.done);
  const pts = Object.values(ss.tasks).reduce((a, t) => a + t.points, 0) + ss.bonus;
  const top = useRef<HTMLDivElement>(null);
  useEffect(() => {
    top.current?.scrollIntoView({ behavior: 'smooth' });
  }, [station.id]);

  return (
    <div className={`station${quiet ? ' quiet' : ''}`} ref={top}>
      <div className="arrived" data-testid="arrived">
        {quiet ? '🕯️ Ein Ort zum Erinnern' : '🎉 Gefunden!'}
        {ss.bonus > 0 && <span className="bonus"> +{ss.bonus} Bonus fürs Finden ohne Hilfe</span>}
      </div>
      <h2>{station.title}</h2>
      <Gallery ids={station.images} alt={station.title} />
      {quiet && (
        <div className="quiet-note">
          <p>
            Dies ist ein Gedenkort. Hier gibt es keine Punkte und keine Eile. Seid bitte leise und respektvoll und nehmt euch
            Zeit.
          </p>
          <p>{station.snack}</p>
          <ReadAloud text={station.snack} />
        </div>
      )}

      {tasks
        .filter((t) => ss.tasks[t.id]?.done)
        .map((t) => (
          <TaskCard key={t.id} task={t} state={ss.tasks[t.id]} quiet={quiet} index={tasks.indexOf(t)} total={tasks.length} />
        ))}
      {current && (
        <TaskCard key={current.id} task={current} state={ss.tasks[current.id]} quiet={quiet} index={tasks.indexOf(current)} total={tasks.length} />
      )}

      {allDone && !quiet && (
        <section className="snack">
          <h3>🍪 Info-Snack</h3>
          <p>{station.snack}</p>
          {station.kidsFact && <p className="kids-fact">🧒 Wusstet ihr? {station.kidsFact}</p>}
          <ReadAloud text={station.snack + (station.kidsFact ? ' Wusstet ihr? ' + station.kidsFact : '')} />
        </section>
      )}

      {allDone && (
        <>
          {!quiet && <p className="station-points">Punkte an dieser Station: {pts}</p>}
          <button
            type="button"
            className="btn primary big"
            onClick={() => {
              vibrate(60);
              nextStop();
            }}
          >
            {game.index + 1 < game.stops.length ? 'Weiter zum nächsten Ziel ➜' : 'Tour abschließen 🏁'}
          </button>
        </>
      )}
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
  return (
    <div className="pause">
      <h2>
        {POI_EMOJI[poi.kind]} Pausenzeit!
      </h2>
      <p>
        Nächster Halt: <strong>{poi.title}</strong>. Zeit zum Toben, Eis essen und Kräfte sammeln.
      </p>
      {poi.note && <p className="muted">{poi.note}</p>}
      {dist !== null && <p className="dist">{arrived ? 'Ihr seid da! Viel Spaß!' : `Noch ${formatDistance(dist)}`}</p>}
      <MapView
        markers={[{ id: poi.id, coords: poi.coords, emoji: POI_EMOJI[poi.kind], active: true }]}
        me={pos.coords}
        accuracy={pos.accuracy}
        fit={pos.coords && dist !== null && dist < 4000 ? [pos.coords, poi.coords] : [poi.coords]}
        onMapClick={pos.simulated ? setSimulatedPosition : undefined}
      />
      <button type="button" className="btn primary big" onClick={() => nextStop(false)}>
        {arrived ? 'Pause beendet – weiter ➜' : 'Pause überspringen ➜'}
      </button>
      {game.config.nav === 'adventure' && <p className="muted">Pausen sind immer auf der Karte zu sehen und kosten keine Punkte.</p>}
    </div>
  );
}

function SimPanel({ target, radius }: { target: LatLng; radius: number }) {
  const offset = (m: number): LatLng => [target[0] - m / 111320, target[1]];
  return (
    <div className="sim-panel" data-testid="sim-panel">
      <strong>🧪 Testmodus</strong>
      <div className="row">
        <button type="button" className="btn small" data-testid="sim-near" onClick={() => setSimulatedPosition(offset(radius * 3 + 150))}>
          {Math.round(radius * 3 + 150)} m vor das Ziel
        </button>
        <button type="button" className="btn small" data-testid="sim-jump" onClick={() => setSimulatedPosition(offset(radius * 0.4))}>
          Zum Ziel springen
        </button>
      </div>
      <small>Auf der Karte tippen setzt euren Standort.</small>
    </div>
  );
}
