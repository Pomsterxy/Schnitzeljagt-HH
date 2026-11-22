import { STATIONS } from '../data';
import { abandonGame, useGame } from '../state/game';
import { rankFor } from '../data/badges';

export function Home({
  onNew,
  onContinue,
  onAlbum,
  onSettings,
}: {
  onNew: () => void;
  onContinue: () => void;
  onAlbum: () => void;
  onSettings: () => void;
}) {
  const { game, career } = useGame();
  const running = game && !game.finishedAt;
  const rank = rankFor(career.points);
  return (
    <div className="screen home">
      <h1>
        🐧 Schnitzeljagd
        <br />
        Hamburg
      </h1>
      <p className="lead">
        Rätsel, Entdeckungen und Geschichte zum Anfassen in Winterhude, Barmbek-Nord und Alsterdorf. {STATIONS.length} Stationen
        warten auf euch!
      </p>
      {running && (
        <div className="continue">
          <p>
            Laufende Tour: <strong>{game.team.avatar} {game.team.name}</strong>, Stopp {Math.min(game.index + 1, game.stops.length)} von{' '}
            {game.stops.length}, ⭐ {game.points}
          </p>
          <button type="button" className="btn primary big" onClick={onContinue}>
            ▶ Weiterspielen
          </button>
          <button
            type="button"
            className="btn small ghost"
            onClick={() => {
              if (confirm('Laufende Tour wirklich abbrechen? Punkte und Fotos dieser Tour gehen verloren.')) abandonGame();
            }}
          >
            Tour abbrechen
          </button>
        </div>
      )}
      <button type="button" className={running ? 'btn big' : 'btn primary big'} onClick={onNew} data-testid="new-tour">
        ✨ Neue Tour planen
      </button>
      <button type="button" className="btn big" onClick={onAlbum}>
        📒 Album & Abzeichen ({career.collected.length}/{STATIONS.length})
      </button>
      <button type="button" className="btn" onClick={onSettings} data-testid="settings">
        ⚙️ Einstellungen, Testmodus & Quellen
      </button>
      <p className="muted">Rang: {rank.title} · {career.tours} Touren gespielt</p>
      <div className="howto">
        <h3>So geht's</h3>
        <ol>
          <li>Team anlegen und Altersstufen wählen</li>
          <li>Stadtteile, Dauer und Startpunkt wählen, die App plant die Route</li>
          <li>Rätsel lösen und den Ort finden: Die Aufgabe erscheint erst, wenn ihr per GPS wirklich da seid</li>
          <li>Aufgaben lösen, Punkte und Abzeichen sammeln, Fotos machen</li>
          <li>Am Ende gibt es eine Urkunde!</li>
        </ol>
      </div>
    </div>
  );
}
