import { useState } from 'react';
import { STATIONS, STATION_BY_ID } from '../data';
import { ConfirmSheet } from '../components/ConfirmSheet';
import { BADGES, rankFor } from '../data/badges';
import { abandonGame, useGame } from '../state/game';
import { Icon } from '../components/Icon';
import { Lilli } from '../components/Lilli';
import { play, setSoundOn, useSoundOn } from '../lib/feedback';
import { requestMotionPermission } from '../lib/pedometer';

function greeting(): { title: string; sub: string } {
  const h = new Date().getHours();
  if (h < 11) return { title: 'Moin, ihr Frühaufsteher!', sub: 'Heute ist ein prima Tag für eine Schatzsuche.' };
  if (h < 17) return { title: 'Moin, ihr Entdecker!', sub: 'Lilli wartet schon auf euch.' };
  return { title: 'Moin, ihr Abendsegler!', sub: 'Noch Lust auf eine kleine Runde?' };
}

export function Home({
  onNew,
  onContinue,
  onAlbum,
  onBadges,
}: {
  onNew: () => void;
  onContinue: () => void;
  onAlbum: () => void;
  onBadges: () => void;
}) {
  const { game, career } = useGame();
  const sound = useSoundOn();
  const [quit, setQuit] = useState(false);
  const running = game && !game.finishedAt && game.index < game.stops.length;
  const rank = rankFor(career.points);
  const total = game?.stops.length ?? 1;
  const done = game ? Math.min(game.index, total) : 0;
  const next = running ? game.stops[game.index] : undefined;
  const nextStation = next?.kind === 'station' ? STATION_BY_ID.get(next.id) : undefined;
  const g = greeting();

  const nextLine = nextStation
    ? nextStation.teaser
    : next?.kind === 'final'
      ? 'Nächstes Ziel: der Schatz!'
      : next?.kind === 'waypoint'
        ? 'Nächster Halt: Zwischenziel'
        : 'Nächster Halt: Pause';
  const start = () => {
    play('select');
    onNew();
  };

  return (
    <div className="home-v4 with-tabs">
      <header className="home-top rise">
        <div className="home-avatar" aria-hidden="true">
          <Lilli size={46} mood="happy" />
        </div>
        <div className="home-who">
          <strong>{running ? `${game.team.avatar} ${game.team.name}` : 'Lilli & ihr'}</strong>
          <small>{rank.title}</small>
        </div>
        <span className="points-pill" aria-label={`${career.points} Punkte gesammelt`}>
          {career.points} <span className="star" aria-hidden="true">★</span>
        </span>
        <button type="button" className="icon-btn plain" aria-label={sound ? 'Ton ausschalten' : 'Ton einschalten'} onClick={() => setSoundOn(!sound)}>
          <Icon name={sound ? 'speaker' : 'mute'} size={18} />
        </button>
      </header>

      <div className="home-body">
        <section className="hero-card rise">
          <div className="hero-text">
            <h1>{running ? 'Weiter geht\'s!' : g.title}</h1>
            <p>{running ? `${done}/${total} geschafft · ${game.points} Punkte` : g.sub}</p>
            {running && <p className="hero-next">{nextLine}</p>}
            {running ? (
              <button
                type="button"
                className="btn pill hero-btn"
                aria-label="Weiterspielen"
                onClick={() => {
                  play('select');
                  void requestMotionPermission();
                  onContinue();
                }}
              >
                Weiterspielen
              </button>
            ) : (
              <button type="button" className="btn pill hero-btn" onClick={start} data-testid="new-tour">
                Los geht's
              </button>
            )}
          </div>
          <div className="hero-art" aria-hidden="true">
            <Lilli size={132} mood="excited" />
          </div>
          {running && (
            <div className="hero-progress" aria-hidden="true">
              <div style={{ width: `${(100 * done) / total}%` }} />
            </div>
          )}
        </section>

        {running && (
          <button type="button" className="topic-card rise" onClick={start} data-testid="new-tour">
            <span className="topic-text">
              <strong>Neue Tour planen</strong>
              <small>Stadtteil, Dauer und Thema wählen</small>
            </span>
            <span className="topic-art" aria-hidden="true">🗺️</span>
          </button>
        )}

        <button type="button" className="topic-card rise" onClick={onAlbum}>
          <span className="topic-text">
            <strong>Album</strong>
            <small>
              {career.collected.length} von {STATIONS.length} Karten gesammelt
            </small>
          </span>
          <span className="topic-art" aria-hidden="true">🃏</span>
        </button>
        <button type="button" className="topic-card rise" onClick={onBadges}>
          <span className="topic-text">
            <strong>Abzeichen</strong>
            <small>
              {career.badges.length} von {BADGES.length} · {career.tours} {career.tours === 1 ? 'Tour' : 'Touren'}
            </small>
          </span>
          <span className="topic-art" aria-hidden="true">🏅</span>
        </button>

        {!running && career.tours === 0 && (
          <div className="topic-card howto rise">
            <span className="topic-text">
              <strong>So funktioniert's</strong>
              <ol>
                <li>Stadtteil, Dauer und Thema wählen, Lilli plant die Route</li>
                <li>Rätsel lösen und den Ort finden. Die Aufgabe erscheint erst, wenn ihr per GPS wirklich da seid</li>
                <li>Aufgaben lösen, Familien-Momente spielen, Punkte sammeln</li>
                <li>Am Ende die Schatz-Koordinaten knacken!</li>
              </ol>
            </span>
          </div>
        )}

        {running && (
          <button type="button" className="btn ghost small rise" style={{ alignSelf: 'center' }} data-testid="home-quit" onClick={() => setQuit(true)}>
            Tour abbrechen
          </button>
        )}

        {quit && (
          <ConfirmSheet
            title="Tour löschen?"
            text="Die laufende Tour wird gelöscht, mit ihren Punkten und Fotos. Euer Album und eure Abzeichen bleiben."
            onClose={() => setQuit(false)}
            actions={[{ label: 'Tour löschen', tone: 'danger', testId: 'home-quit-delete', onClick: () => { setQuit(false); abandonGame(); } }]}
          />
        )}
      </div>
    </div>
  );
}
