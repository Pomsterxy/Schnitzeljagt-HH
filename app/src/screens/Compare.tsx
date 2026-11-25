import { useEffect, useMemo } from 'react';
import { decodeResult, hasOwnResult, saveResult, useResults } from '../lib/results';
import { decodeTour, type DecodedTour } from '../lib/share';
import { Leaderboard } from '../components/Leaderboard';
import { LilliSays } from '../components/Lilli';
import { getGame } from '../state/game';

/** Ergebnis-Link eines anderen Teams: Rangliste zeigen und die Tour zum Nachspielen anbieten */
export function Compare({ code, onPlay, onHome }: { code: string; onPlay: (t: DecodedTour) => void; onHome: () => void }) {
  const data = useMemo(() => decodeResult(code), [code]);
  const tour = useMemo(() => (data ? decodeTour(data.tourCode) : null), [data]);
  useEffect(() => {
    if (data) saveResult(data.result);
  }, [data]);
  const board = useResults(data?.result.fp ?? null);
  if (!data) {
    return (
      <div className="screen compare" data-testid="compare">
        <LilliSays mood="happy">Dieser Ergebnis-Link ist leider kaputt. Fragt das andere Team, ob es ihn noch einmal schickt.</LilliSays>
        <button type="button" className="btn big primary" onClick={onHome}>
          Zur Startseite
        </button>
      </div>
    );
  }
  const r = data.result;
  const played = hasOwnResult(r.fp);
  const running = getGame();
  const busy = !!running && !running.finishedAt;
  return (
    <div className="screen compare" data-testid="compare" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="caption" style={{ marginTop: 12 }}>
        Team-Vergleich
      </div>
      <h1 className="large-title">
        {r.avatar} {r.team}: {r.points} Punkte
      </h1>
      <LilliSays mood="excited">
        {played
          ? 'Ihr habt diese Tour auch gespielt. So steht es zwischen euch:'
          : `Herausforderung von „${r.team}“! Spielt genau dieselbe Tour und schickt euer Ergebnis zurück.`}
      </LilliSays>
      <Leaderboard results={board} title="Rangliste dieser Tour" />
      {!played && tour && (
        <>
          <button type="button" className="btn big primary" data-testid="accept-challenge" disabled={busy} onClick={() => onPlay(tour)}>
            Herausforderung annehmen
          </button>
          {busy && <p className="muted">Beendet zuerst eure laufende Tour, dann könnt ihr diese spielen.</p>}
        </>
      )}
      {!played && !tour && <p className="muted">Diese Tour lässt sich mit eurer App-Version nicht mehr nachspielen (Stationen haben sich geändert).</p>}
      <button type="button" className="btn ghost" onClick={onHome}>
        Zur Startseite
      </button>
    </div>
  );
}
