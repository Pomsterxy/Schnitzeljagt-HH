import { useState } from 'react';
import { STATIONS, STATION_BY_ID } from '../data';
import { ConfirmSheet } from '../components/ConfirmSheet';
import { BADGES, rankFor } from '../data/badges';
import { abandonGame, useGame } from '../state/game';
import { Icon } from '../components/Icon';
import { SkyScene } from '../components/Scene';
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

  return (
    <div className="home-dark with-tabs">
      <SkyScene>
        <button
          type="button"
          className="icon-btn sky-sound"
          aria-label={sound ? 'Ton ausschalten' : 'Ton einschalten'}
          onClick={() => setSoundOn(!sound)}
        >
          <Icon name={sound ? 'speaker' : 'mute'} size={20} color="#101B33" />
        </button>
      </SkyScene>

      <div className="home-body">
        <div className="home-hello rise">
          <h1>{running ? `Weiter geht's, ${game.team.name}!` : g.title}</h1>
          <p>{running ? 'Lilli hat das nächste Ziel schon im Blick.' : g.sub}</p>
        </div>

        {running && (
          <div className="dark-card continue-dark rise">
            <div className="ring-wrap">
              <svg width="58" height="58" viewBox="0 0 58 58" aria-hidden="true">
                <circle cx="29" cy="29" r="24" fill="none" stroke="rgba(30,42,74,0.1)" strokeWidth="7" />
                <circle
                  className="ring"
                  cx="29"
                  cy="29"
                  r="24"
                  fill="none"
                  stroke="#EF7A2F"
                  strokeWidth="7"
                  strokeLinecap="round"
                  strokeDasharray={151}
                  transform="rotate(-90 29 29)"
                  style={{ ['--ring-from' as string]: 151, ['--ring-to' as string]: 151 - (151 * done) / total, strokeDashoffset: 151 - (151 * done) / total }}
                />
              </svg>
              <div className="ringval">
                {done}/{total}
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="dark-caption">Laufende Tour · {game.points} Punkte</div>
              <div style={{ fontSize: 18, fontWeight: 800 }}>
                {game.team.avatar} {game.team.name}
              </div>
              <div className="dark-caption" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {nextStation ? nextStation.teaser : next?.kind === 'final' ? 'Nächstes Ziel: der Schatz!' : next?.kind === 'waypoint' ? 'Nächster Halt: Zwischenziel' : 'Nächster Halt: Pause'}
              </div>
            </div>
            <button
              type="button"
              className="play-fab"
              aria-label="Weiterspielen"
              onClick={() => {
                play('select');
                void requestMotionPermission();
                onContinue();
              }}
            >
              <Icon name="play" size={18} color="#fff" />
            </button>
          </div>
        )}

        <button
          type="button"
          className="btn pill big primary rise"
          onClick={() => {
            play('select');
            onNew();
          }}
          data-testid="new-tour"
        >
          {running ? 'Neue Tour planen' : 'Schatzsuche starten'}
        </button>

        {running && (
          <button
            type="button"
            className="btn ghost small rise"
            style={{ alignSelf: 'center', color: 'var(--accent-ink)' }}
            data-testid="home-quit"
            onClick={() => setQuit(true)}
          >
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

        <div className="divider-or rise">
          <span>eure Sammlung</span>
        </div>

        <div className="dark-card collection rise">
          <button type="button" className="btn pill outline" onClick={onAlbum}>
            <Icon name="album" size={18} /> Album {career.collected.length}/{STATIONS.length}
          </button>
          <button type="button" className="btn pill outline" onClick={onBadges}>
            <Icon name="medal" size={18} /> {career.badges.length}/{BADGES.length}
          </button>
          <p className="dark-caption" style={{ gridColumn: '1 / -1', textAlign: 'center' }}>
            Rang: {rank.title} · {career.points} Punkte · {career.tours} Touren
          </p>
        </div>

        {!running && career.tours === 0 && (
          <div className="dark-card howto-dark rise">
            <strong>So funktioniert's</strong>
            <ol>
              <li>Stadtteil, Dauer und Thema wählen, Lilli plant die Route</li>
              <li>Rätsel lösen und den Ort finden. Die Aufgabe erscheint erst, wenn ihr per GPS wirklich da seid</li>
              <li>Aufgaben lösen, Familien-Momente spielen, Punkte sammeln</li>
              <li>Am Ende die Schatz-Koordinaten knacken!</li>
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}
