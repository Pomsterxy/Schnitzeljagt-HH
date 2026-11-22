import { CREDITS } from '../data';
import { setSimulated, usePosition } from '../lib/location';
import { resetCareer } from '../state/game';

export function Settings({ onBack }: { onBack: () => void }) {
  const pos = usePosition();
  return (
    <div className="screen">
      <h2>⚙️ Einstellungen & Infos</h2>
      <label className="check">
        <input type="checkbox" data-testid="sim-toggle" checked={pos.simulated} onChange={(e) => setSimulated(e.target.checked)} />
        <span>
          <strong>Testmodus</strong>: Standort per Hand setzen (Karte antippen oder „Zum Ziel springen“). So kann man jede Tour am
          Schreibtisch ausprobieren.
        </span>
      </label>
      <button
        type="button"
        className="btn warn"
        onClick={() => {
          if (confirm('Album, Abzeichen und Gesamtpunkte wirklich löschen?')) resetCareer();
        }}
      >
        Album & Abzeichen zurücksetzen
      </button>

      <h3>Datenschutz</h3>
      <p>
        Die App hat kein Konto und keinen Server. Spielstand, Fotos und Album bleiben nur auf diesem Gerät. Euer Standort wird nur
        im Browser verwendet und nirgendwohin gesendet. Für die Karte werden Kartenkacheln von OpenStreetMap geladen.
      </p>

      <h3>Quellen & Lizenzen</h3>
      <p>
        Texte basieren auf Artikeln der deutschsprachigen Wikipedia (CC BY-SA 4.0) und den Listen der Stolpersteine in Hamburg (siehe
        auch stolpersteine-hamburg.de). Spielplätze, Toiletten und Eisdielen: © OpenStreetMap-Mitwirkende (ODbL). Kartendaten ©
        OpenStreetMap-Mitwirkende.
      </p>
      <details>
        <summary>Bildnachweise ({Object.keys(CREDITS).length})</summary>
        <ul className="credits">
          {Object.entries(CREDITS).map(([id, c]) => (
            <li key={id}>
              <a href={c.source} target="_blank" rel="noreferrer">
                {c.file}
              </a>{' '}
              · {c.author} · {c.license}
            </li>
          ))}
        </ul>
      </details>
      <button type="button" className="btn" onClick={onBack}>
        Zurück
      </button>
    </div>
  );
}
