import { useEffect, useMemo, useRef, useState } from 'react';
import type { Poi } from '../data/types';
import { buildFormula, formatDegMin, solvedTarget } from '../lib/cache';
import { bearing, compassWord, distance, formatDistance, isWithinUnlock } from '../lib/geo';
import { setSimulatedPosition, usePosition } from '../lib/location';
import { youngestGroup } from '../lib/scoring';
import { FINAL_POINTS, finalState, nextStop, revealCoords, submitCoords, treasureFound, type Game } from '../state/game';
import { MapView } from '../components/MapView';
import { NearbyCaches } from '../components/NearbyCaches';
import { ReadAloud } from '../components/ReadAloud';

export function Notebook({ game }: { game: Game }) {
  const letters = game.cacheLetters ?? [];
  if (!letters.length) return <p className="muted">Noch keine Cache-Zahlen gesammelt. Löst Stationen, dann füllt sich das Notizbuch!</p>;
  return (
    <ul className="notebook" data-testid="notebook">
      {letters.map((l) => (
        <li key={l.letter}>
          <span className="letter">{l.letter}</span> = <strong>{l.value}</strong> <small className="muted">({l.label})</small>
        </li>
      ))}
    </ul>
  );
}

export function FinalView({ game, poi, onPin }: { game: Game; poi: Poi; onPin: () => void }) {
  const f = finalState(game);
  const pos = usePosition();
  const target = useMemo(() => solvedTarget(poi.coords), [poi.coords]);
  const hard = youngestGroup(game.team.members.map((m) => m.age)) !== 'kids';
  const formula = useMemo(() => buildFormula(poi.coords, game.cacheLetters ?? [], hard, game.config.seed), [poi.coords, game.cacheLetters, hard, game.config.seed]);
  const [north, setNorth] = useState('');
  const [east, setEast] = useState('');
  const [check, setCheck] = useState<{ north: boolean; east: boolean } | null>(null);
  const [showMap, setShowMap] = useState(false);
  const dist = pos.coords ? distance(pos.coords, target) : null;
  const nearSince = useRef<number | null>(null);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    if (!f.solved || f.found || dist === null) return;
    if (isWithinUnlock(dist, 25, pos.accuracy)) {
      try {
        navigator.vibrate?.([200, 80, 200, 80, 400]);
      } catch {
        /* egal */
      }
      treasureFound('gps');
    }
  }, [dist, f.solved, f.found, pos.accuracy]);

  useEffect(() => {
    const near = dist !== null && dist < 80;
    if (near && nearSince.current === null) nearSince.current = Date.now();
    if (!near) nearSince.current = null;
    const t = setInterval(() => {
      if (nearSince.current && Date.now() - nearSince.current > 45000) setFallback(true);
    }, 1000);
    return () => clearInterval(t);
  }, [dist]);

  const intro =
    'Schatz-Finale! Wie bei einem echten Multi-Cache habt ihr an jeder Station eine Cache-Zahl gesammelt. Setzt die Zahlen in die Formel ein und berechnet die Koordinaten des Schatzes.';

  if (f.found)
    return (
      <div className="final found" data-testid="treasure-found">
        <h2>💎 Schatz gefunden!</h2>
        <p className="feedback ok">+{FINAL_POINTS.found} Punkte{f.attempts === 1 && !f.revealed ? `, dazu +${FINAL_POINTS.firstTry} fürs Rechnen im ersten Versuch` : ''}</p>
        <p>
          Bei einem echten Geocache würdet ihr hier jetzt eine Dose mit Logbuch finden. Euer Schatz ist das Abzeichen <strong>„Schatzfinder“</strong>{' '}
          und die Erinnerung an diese Tour. Tipp für das nächste Mal: Eltern können hier vorher eine kleine Überraschung verstecken.
        </p>
        <p className="muted">Schatz-Ort: {poi.title} · {formatDegMin(target)}</p>
        <NearbyCaches center={target} title="🌍 Lust auf mehr? Echte Geocaches in der Nähe" />
        <button type="button" className="btn primary big" onClick={() => nextStop()}>
          Tour abschließen 🏁
        </button>
      </div>
    );

  if (!f.solved)
    return (
      <div className="final">
        <h2>💎 Schatz-Finale</h2>
        <p>{intro}</p>
        <ReadAloud text={intro} />
        <h3>📓 Euer Notizbuch</h3>
        <Notebook game={game} />
        <h3>🧮 Formel</h3>
        <div className="formula" data-testid="formula">
          <div>
            N {formula.north.deg}° {String(formula.north.min).padStart(2, '0')}.
            {formula.north.exprs.map((e, i) => (
              <span key={i} className="expr">
                ({e.text})
              </span>
            ))}
          </div>
          <div>
            E {String(formula.east.deg).padStart(3, '0')}° {String(formula.east.min).padStart(2, '0')}.
            {formula.east.exprs.map((e, i) => (
              <span key={i} className="expr">
                ({e.text})
              </span>
            ))}
          </div>
        </div>
        <p className="muted">Jede Klammer ergibt genau eine Ziffer von 0 bis 9.</p>
        <form
          className="coord-form"
          onSubmit={(e) => {
            e.preventDefault();
            setCheck(submitCoords(poi.coords, north, east));
          }}
        >
          <label>
            N {formula.north.deg}° {String(formula.north.min).padStart(2, '0')}.
            <input inputMode="numeric" maxLength={3} value={north} placeholder="___" aria-label="Nord-Ziffern" onChange={(e) => setNorth(e.target.value.replace(/\D/g, ''))} />
          </label>
          <label>
            E {String(formula.east.deg).padStart(3, '0')}° {String(formula.east.min).padStart(2, '0')}.
            <input inputMode="numeric" maxLength={3} value={east} placeholder="___" aria-label="Ost-Ziffern" onChange={(e) => setEast(e.target.value.replace(/\D/g, ''))} />
          </label>
          <button type="submit" className="btn primary" disabled={north.length !== 3 || east.length !== 3}>
            Koordinaten prüfen
          </button>
        </form>
        {check && (
          <p className="feedback bad">
            {check.north ? '✓ Nord stimmt' : '✗ Nord stimmt noch nicht'} · {check.east ? '✓ Ost stimmt' : '✗ Ost stimmt noch nicht'}. Rechnet noch einmal
            nach!
          </p>
        )}
        {f.attempts >= 2 && (
          <button type="button" className="btn warn" onClick={() => revealCoords()}>
            Lösung verraten (−{FINAL_POINTS.reveal} P.)
          </button>
        )}
      </div>
    );

  const brg = pos.coords ? bearing(pos.coords, target) : 0;
  const arrow = pos.heading != null ? brg - pos.heading : brg;
  return (
    <div className="final">
      <h2>💎 Auf zum Schatz!</h2>
      <p className="feedback ok">{f.revealed ? 'Hier sind die Koordinaten:' : 'Richtig gerechnet!'}</p>
      <p className="coords-big" data-testid="final-coords">
        {formatDegMin(target)}
      </p>
      <p>Wie echte Geocacher findet ihr den Schatz nur mit Richtung und Entfernung. Es gibt keine Karte!</p>
      {dist !== null && (
        <div className="compass">
          <div className="arrow" style={{ transform: `rotate(${arrow}deg)` }}>
            ⬆
          </div>
          <div>
            <div className="dist">{formatDistance(dist)}</div>
            <div className="muted">Richtung {compassWord(brg)}</div>
          </div>
        </div>
      )}
      <a className="btn small" href={`geo:${target[0].toFixed(6)},${target[1].toFixed(6)}`}>
        In Karten-App öffnen
      </a>
      {!showMap ? (
        <button type="button" className="btn small ghost" onClick={() => setShowMap(true)}>
          Wir kommen nicht weiter: Karte zeigen
        </button>
      ) : (
        <MapView
          markers={[{ id: 'schatz', coords: target, emoji: '💎', active: true }]}
          me={pos.coords}
          accuracy={pos.accuracy}
          fit={pos.coords && dist !== null && dist < 3000 ? [pos.coords, target] : [target]}
          onMapClick={pos.simulated ? setSimulatedPosition : undefined}
        />
      )}
      {(fallback || pos.status === 'denied' || pos.status === 'unavailable') && (
        <button type="button" className="btn warn" onClick={onPin}>
          📍 Wir sind da, aber es schaltet nicht frei
        </button>
      )}
    </div>
  );
}
