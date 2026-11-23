import { STATIONS, STATION_BY_ID } from '../data';
import { BADGES, rankFor } from '../data/badges';
import { abandonGame, useGame } from '../state/game';
import { Lilli } from '../components/Lilli';
import { Icon } from '../components/Icon';
import { play, setSoundOn, useSoundOn } from '../lib/feedback';
import { requestMotionPermission } from '../lib/pedometer';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 11) return 'Moin! Gut geschlafen? Heute ist ein prima Tag für eine Schatzsuche.';
  if (h < 17) return 'Moin! Bereit für die nächste Schatzsuche?';
  return 'Moin! Noch Lust auf eine kleine Abendrunde?';
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
  const running = game && !game.finishedAt && game.index < game.stops.length;
  const rank = rankFor(career.points);
  const total = game?.stops.length ?? 1;
  const done = game ? Math.min(game.index, total) : 0;
  const circ = 151;
  const next = running ? game.stops[game.index] : undefined;
  const nextStation = next?.kind === 'station' ? STATION_BY_ID.get(next.id) : undefined;

  return (
    <div className="screen with-tabs home">
      <div className="rise" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div className="overline">Winterhude · Barmbek · Alsterdorf</div>
          <h1 className="large-title">Schnitzeljagd</h1>
        </div>
        <button
          type="button"
          className="icon-btn"
          aria-label={sound ? 'Ton ausschalten' : 'Ton einschalten'}
          onClick={() => setSoundOn(!sound)}
        >
          <Icon name={sound ? 'speaker' : 'mute'} size={20} color={sound ? 'var(--accent)' : 'var(--label2)'} />
        </button>
      </div>

      <div className="hero rise">
        <svg className="rings" width="320" height="200" viewBox="0 0 320 200" aria-hidden="true">
          <circle cx="220" cy="100" r="60" fill="none" stroke="#fff" strokeWidth="1.5" strokeDasharray="3 6" />
          <circle cx="220" cy="100" r="100" fill="none" stroke="#fff" strokeWidth="1.5" strokeDasharray="3 6" />
        </svg>
        <Lilli size={104} label="Lilli, die Möwe" />
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div className="who">Lilli</div>
          <div className="say">{running ? `Weiter geht's, ${game.team.name}! Ich hab das nächste Ziel schon im Blick.` : greeting()}</div>
        </div>
      </div>

      {running && (
        <div className="card continue-card rise">
          <div className="ring-wrap">
            <svg width="58" height="58" viewBox="0 0 58 58" aria-hidden="true">
              <circle cx="29" cy="29" r="24" fill="none" stroke="var(--fill2)" strokeWidth="7" />
              <circle
                className="ring"
                cx="29"
                cy="29"
                r="24"
                fill="none"
                stroke="var(--accent)"
                strokeWidth="7"
                strokeLinecap="round"
                strokeDasharray={circ}
                transform="rotate(-90 29 29)"
                style={{ ['--ring-from' as string]: circ, ['--ring-to' as string]: circ - (circ * done) / total, strokeDashoffset: circ - (circ * done) / total }}
              />
            </svg>
            <div className="ringval">
              {done}/{total}
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="caption">Laufende Tour · {game.points} Punkte</div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>
              {game.team.avatar} {game.team.name}
            </div>
            <div className="muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {nextStation ? `Nächstes Ziel: ${nextStation.teaser}` : next?.kind === 'final' ? 'Nächstes Ziel: der Schatz!' : 'Nächster Halt: Pause'}
            </div>
          </div>
          <button type="button" className="play-fab" aria-label="Weiterspielen" onClick={() => { play('select'); void requestMotionPermission(); onContinue(); }}>
            <Icon name="play" size={18} color="#fff" />
          </button>
        </div>
      )}
      {running && (
        <button
          type="button"
          className="btn ghost small rise"
          style={{ alignSelf: 'center' }}
          onClick={() => {
            if (confirm('Laufende Tour wirklich abbrechen? Punkte und Fotos dieser Tour gehen verloren.')) abandonGame();
          }}
        >
          Tour abbrechen
        </button>
      )}

      <button type="button" className={`btn big rise ${running ? 'dark' : 'primary'}`} onClick={() => { play('select'); onNew(); }} data-testid="new-tour">
        <Icon name="plus" size={20} color="#fff" width={2.4} /> Neue Tour planen
      </button>

      <h2 className="section-title rise">Eure Sammlung</h2>
      <div className="grid2 rise">
        <button type="button" className="card tile tap" onClick={onAlbum}>
          <div className="ic" style={{ background: 'var(--teal-soft)' }}>
            <Icon name="album" size={20} color="var(--teal)" />
          </div>
          <strong style={{ fontSize: 16 }}>Album</strong>
          <div className="bar">
            <div style={{ width: `${(career.collected.length / STATIONS.length) * 100}%`, background: 'var(--teal)' }} />
          </div>
          <span className="muted" style={{ fontSize: 13 }}>
            {career.collected.length} von {STATIONS.length} Karten
          </span>
        </button>
        <button type="button" className="card tile tap" onClick={onBadges}>
          <div className="ic" style={{ background: '#fff4d6' }}>
            <Icon name="medal" size={20} color="var(--gold-ink)" />
          </div>
          <strong style={{ fontSize: 16 }}>Abzeichen</strong>
          <div className="bar">
            <div style={{ width: `${(career.badges.length / BADGES.length) * 100}%`, background: 'var(--gold-ink)' }} />
          </div>
          <span className="muted" style={{ fontSize: 13 }}>
            {career.badges.length} von {BADGES.length} · {rank.title}
          </span>
        </button>
      </div>

      {!running && career.tours === 0 && (
        <div className="card howto rise">
          <strong>So funktioniert's</strong>
          <ol>
            <li>Stadtteil, Dauer und Thema wählen, Lilli plant die Route</li>
            <li>Rätsel lösen und den Ort finden. Die Aufgabe erscheint erst, wenn ihr per GPS wirklich da seid</li>
            <li>Aufgaben lösen, Punkte und Abzeichen sammeln</li>
            <li>Am Ende die Schatz-Koordinaten knacken!</li>
          </ol>
        </div>
      )}
    </div>
  );
}
