import { useEffect, useMemo, useRef, useState } from 'react';
import type { Poi } from '../data/types';
import { buildFormula, formatDegMin, solvedTarget, toDegMin } from '../lib/cache';
import { bearing, compassWord, distance, formatDistance, isWithinUnlock } from '../lib/geo';
import { setSimulatedPosition, usePosition } from '../lib/location';
import { youngestGroup } from '../lib/scoring';
import { play } from '../lib/feedback';
import { celebrateTreasure, celebrateUnlock } from '../lib/effects';
import { FINAL_POINTS, finalState, nextStop, revealCoords, submitCoords, treasureFound, type Game } from '../state/game';
import { MapView } from '../components/MapView';
import { NearbyCaches } from '../components/NearbyCaches';
import { LilliSays } from '../components/Lilli';
import { Icon } from '../components/Icon';

export function Notebook({ game }: { game: Game }) {
  const letters = game.cacheLetters ?? [];
  if (!letters.length) return <p className="muted">Noch keine Cache-Zahlen gesammelt. Löst Stationen, dann füllt sich das Notizbuch!</p>;
  return (
    <ul className="notebook" data-testid="notebook">
      {letters.map((l) => (
        <li key={l.letter} title={l.label}>
          <div className="l">{l.letter}</div>
          <div className="v">{l.value}</div>
          <small>{l.label.split('(')[0].trim()}</small>
        </li>
      ))}
    </ul>
  );
}

const STARS = [
  [8, 6], [22, 14], [48, 4], [70, 10], [88, 5], [94, 20], [12, 28], [60, 24], [36, 18], [80, 32],
];

function Lock({ label, prefix, value, onChange, solvedDigits }: { label: string; prefix: string; value: number[]; onChange: (v: number[]) => void; solvedDigits?: boolean[] }) {
  return (
    <div className="lock-row" role="group" aria-label={`${label}-Ziffern`}>
      <span className="lbl">{prefix}</span>
      {value.map((v, i) => (
        <button
          key={i}
          type="button"
          className={`wheel${solvedDigits?.[i] ? ' ok' : ''}`}
          aria-label={`${label} Ziffer ${i + 1}: ${v}`}
          onClick={() => {
            play('tap');
            const next = value.slice();
            next[i] = (v + 1) % 10;
            onChange(next);
          }}
        >
          {v}
        </button>
      ))}
    </div>
  );
}

export function FinalView({ game, poi, onPin }: { game: Game; poi: Poi; onPin: () => void }) {
  const f = finalState(game);
  const pos = usePosition();
  const target = useMemo(() => solvedTarget(poi.coords), [poi.coords]);
  const hard = youngestGroup(game.team.members.map((m) => m.age)) !== 'kids';
  const formula = useMemo(() => buildFormula(poi.coords, game.cacheLetters ?? [], hard, game.config.seed), [poi.coords, game.cacheLetters, hard, game.config.seed]);
  const [north, setNorth] = useState([0, 0, 0]);
  const [east, setEast] = useState([0, 0, 0]);
  const [check, setCheck] = useState<{ north: boolean; east: boolean } | null>(null);
  const [shake, setShake] = useState(0);
  const [showMap, setShowMap] = useState(false);
  const dist = pos.coords ? distance(pos.coords, target) : null;
  const nearSince = useRef<number | null>(null);
  const [fallback, setFallback] = useState(false);

  // Schloss geknackt / Schatz gefunden feiern (nur beim Übergang, nicht beim Neuladen)
  const was = useRef({ solved: f.solved, found: f.found });
  useEffect(() => {
    if (f.solved && !was.current.solved) celebrateUnlock(document.querySelector('.lock, [data-testid=final-coords]'));
    if (f.found && !was.current.found) setTimeout(celebrateTreasure, 250);
    was.current = { solved: f.solved, found: f.found };
  }, [f.solved, f.found]);

  useEffect(() => {
    if (!f.solved || f.found || dist === null) return;
    if (isWithinUnlock(dist, 25, pos.accuracy)) {
      play('treasure');
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

  const stars = (
    <div className="stars" aria-hidden="true">
      {STARS.map(([x, y], i) => (
        <i key={i} style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${(i % 5) * 0.6}s` }} />
      ))}
    </div>
  );

  if (f.found)
    return (
      <div className="final found" data-testid="treasure-found" style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center', textAlign: 'center' }}>
        {stars}
        <svg className="chest" width="180" height="150" viewBox="0 0 160 130" aria-hidden="true">
          <g className="rays" opacity="0.6">
            <path d="M80 70 L60 0 L100 0 Z M80 70 L160 50 L160 90 Z M80 70 L100 140 L60 140 Z M80 70 L0 90 L0 50 Z" fill="#F5B000" fillOpacity="0.25" />
          </g>
          <circle className="glow" cx="80" cy="70" r="36" fill="#F5B000" fillOpacity="0.35" />
          <g transform="translate(28 30)">
            <path d="M0 52 H104 V92 a8 8 0 0 1 -8 8 H8 a8 8 0 0 1 -8 -8 Z" fill="#9A5B13" />
            <rect x="0" y="62" width="104" height="6" fill="#7A4510" />
            <rect x="44" y="54" width="16" height="20" rx="4" fill="#F5B000" />
          </g>
          <g className="lid">
            <path d="M28 82 a26 26 0 0 1 26 -26 H106 a26 26 0 0 1 26 26 Z" fill="#C2410C" />
          </g>
        </svg>
        <h1 className="large-title rise">Schatz gefunden!</h1>
        <p className="rise" style={{ fontSize: 22, fontWeight: 800, color: '#F5B000' }}>
          +{FINAL_POINTS.found} Punkte{f.attempts === 1 && !f.revealed ? ` · +${FINAL_POINTS.firstTry} fürs Rechnen` : ''}
        </p>
        <LilliSays mood="excited" variant="dark">
          Ihr seid echte Geocacher! Bei einem echten Cache läge hier eine Dose mit Logbuch. Euer Schatz ist das Abzeichen „Schatzfinder“. Tipp für nächstes Mal: Eltern können hier vorher eine kleine Überraschung verstecken.
        </LilliSays>
        <p className="muted rise">
          {poi.title} · {formatDegMin(target)}
        </p>
        <div style={{ alignSelf: 'stretch', color: 'var(--label)' }}>
          <NearbyCaches center={target} title="Lust auf mehr? Echte Geocaches in der Nähe" />
        </div>
        <button type="button" className="btn big white" onClick={() => { play('unlock'); nextStop(); }}>
          Tour abschließen
        </button>
      </div>
    );

  if (!f.solved) {
    const n = toDegMin(poi.coords[0]).digits;
    const e = toDegMin(poi.coords[1]).digits;
    const mm = (x: number) => String(x).padStart(2, '0');
    return (
      <div className="final" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {stars}
        <div className="rise">
          <div className="overline" style={{ color: '#FDBA74' }}>
            Multi-Cache · Finale
          </div>
          <h1 className="large-title">Knackt den Schatz</h1>
        </div>
        <LilliSays mood="night" variant="dark">
          Wie bei einem echten Multi-Cache habt ihr an jeder Station eine Cache-Zahl gesammelt. Setzt sie in die Formel ein: Jede Klammer ergibt genau eine Ziffer.
        </LilliSays>
        <div className="glass rise">
          <div className="caption" style={{ color: 'rgba(255,255,255,0.7)', marginBottom: 8 }}>
            Euer Notizbuch
          </div>
          <Notebook game={game} />
          <div className="formula" data-testid="formula">
            <div>
              N {formula.north.deg}° {mm(formula.north.min)}.
              {formula.north.exprs.map((x, i) => (
                <span key={i} className="expr">
                  ({x.text})
                </span>
              ))}
            </div>
            <div>
              E {String(formula.east.deg).padStart(3, '0')}° {mm(formula.east.min)}.
              {formula.east.exprs.map((x, i) => (
                <span key={i} className="expr">
                  ({x.text})
                </span>
              ))}
            </div>
          </div>
        </div>
        <p className="muted rise">Tippt auf die Ziffern, bis das Schloss stimmt.</p>
        <div key={shake} className={shake ? 'shake' : 'rise'} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Lock label="Nord" prefix={`N ${formula.north.deg}° ${mm(formula.north.min)}.`} value={north} onChange={setNorth} solvedDigits={check?.north ? north.map((v, i) => v === n[i]) : undefined} />
          <Lock label="Ost" prefix={`E ${String(formula.east.deg).padStart(3, '0')}° ${mm(formula.east.min)}.`} value={east} onChange={setEast} solvedDigits={check?.east ? east.map((v, i) => v === e[i]) : undefined} />
        </div>
        <button
          type="button"
          className="btn big gold"
          onClick={() => {
            const r = submitCoords(poi.coords, north.join(''), east.join(''));
            setCheck(r);
            if (r.north && r.east) play('unlock');
            else {
              play('wrong');
              setShake((s) => s + 1);
            }
          }}
        >
          Schloss öffnen
        </button>
        {check && !(check.north && check.east) && (
          <p className="feedback rise" style={{ color: '#FDBA74' }}>
            {check.north ? 'Nord stimmt!' : 'Nord stimmt noch nicht.'} {check.east ? 'Ost stimmt!' : 'Ost stimmt noch nicht.'} Rechnet noch einmal nach.
          </p>
        )}
        {f.attempts >= 2 && (
          <button type="button" className="btn ghost" onClick={() => { play('select'); revealCoords(); }}>
            Lösung verraten (−{FINAL_POINTS.reveal} Punkte)
          </button>
        )}
      </div>
    );
  }

  const brg = pos.coords ? bearing(pos.coords, target) : 0;
  const arrow = pos.heading != null ? brg - pos.heading : brg;
  return (
    <div className="final" style={{ display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }}>
      {stars}
      <div className="rise">
        <div className="overline" style={{ color: '#FDBA74' }}>
          {f.revealed ? 'Koordinaten verraten' : 'Geknackt!'}
        </div>
        <h1 className="large-title">Auf zum Schatz</h1>
      </div>
      <p className="coords-big rise" data-testid="final-coords">
        {formatDegMin(target)}
      </p>
      <LilliSays mood="night" variant="dark">
        Wie echte Geocacher findet ihr den Schatz nur mit Richtung und Entfernung. Ich fliege schon mal vor!
      </LilliSays>
      {dist !== null && (
        <div className="compass-wrap rise">
          <svg className="compass-svg" width="240" height="240" viewBox="0 0 260 260" aria-hidden="true">
            <circle className="ping" cx="130" cy="130" r="120" fill="#F5B000" fillOpacity="0.12" />
            <circle className="ping b" cx="130" cy="130" r="120" fill="#F5B000" fillOpacity="0.12" />
            <circle cx="130" cy="130" r="100" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.2)" />
            <text x="130" y="66" textAnchor="middle" fontWeight="800" fontSize="16" fill="#FDBA74">N</text>
            <g className="needle" style={{ transform: `rotate(${arrow}deg)` }}>
              <path d="M130 62 L142 130 L130 124 L118 130 Z" fill="#F5B000" />
              <path d="M130 198 L142 130 L130 136 L118 130 Z" fill="rgba(255,255,255,0.35)" />
            </g>
            <circle cx="130" cy="130" r="7" fill="#fff" />
          </svg>
          <div className="big-dist">{formatDistance(dist)}</div>
          <div className="dir">Richtung {compassWord(brg)}</div>
        </div>
      )}
      <div className="row">
        <a className="btn small" style={{ background: 'rgba(255,255,255,0.12)', color: '#fff' }} href={`geo:${target[0].toFixed(6)},${target[1].toFixed(6)}`}>
          <Icon name="map" size={16} /> In Karten-App öffnen
        </a>
        {!showMap && (
          <button type="button" className="btn small ghost" onClick={() => setShowMap(true)}>
            Karte zeigen
          </button>
        )}
      </div>
      {showMap && (
        <MapView
          markers={[{ id: 'schatz', coords: target, emoji: '💎', active: true }]}
          me={pos.coords}
          accuracy={pos.accuracy}
          fit={pos.coords && dist !== null && dist < 3000 ? [pos.coords, target] : [target]}
          onMapClick={pos.simulated ? setSimulatedPosition : undefined}
          height={260}
        />
      )}
      {(fallback || pos.status === 'denied' || pos.status === 'unavailable') && (
        <button type="button" className="btn warn" onClick={onPin}>
          Wir sind da, aber es schaltet nicht frei
        </button>
      )}
    </div>
  );
}
