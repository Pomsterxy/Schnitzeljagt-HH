import { CREDITS } from '../data';
import { useState } from 'react';
import { setSimulated, usePosition } from '../lib/location';
import { loadJSON, saveJSON } from '../lib/storage';
import { OC_KEY_STORAGE } from '../components/NearbyCaches';
import { resetCareer } from '../state/game';

export function Settings({ onBack }: { onBack: () => void }) {
  const pos = usePosition();
  const [ocKey, setOcKey] = useState(() => loadJSON<string>(OC_KEY_STORAGE, ''));
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

      <h3>🌍 Echte Geocaches</h3>
      <p>
        An jeder Station gibt es Links zur Geocaching.com- und Opencaching.de-Karte. Mit einem eigenen, kostenlosen Schlüssel von
        Opencaching.de zeigt die App Caches in der Nähe direkt an. Den Schlüssel bekommt ihr unter{' '}
        <a href="https://www.opencaching.de/okapi/signup.html" target="_blank" rel="noreferrer">
          opencaching.de/okapi/signup.html
        </a>
        . Er bleibt nur auf diesem Gerät gespeichert.
      </p>
      <label className="field">
        Opencaching-Schlüssel (Consumer Key)
        <input
          value={ocKey}
          placeholder="z. B. AbCdEf123…"
          onChange={(e) => {
            setOcKey(e.target.value.trim());
            saveJSON(OC_KEY_STORAGE, e.target.value.trim());
          }}
        />
      </label>

      <h3>Datenschutz</h3>
      <p>
        Die App hat kein Konto und keinen Server. Spielstand, Fotos und Album bleiben nur auf diesem Gerät. Euer Standort wird nur
        im Browser verwendet und nirgendwohin gesendet. Für die Karte werden Kartenkacheln von OpenStreetMap geladen. Nur wenn ihr echte Geocaches abruft, wird der Standort der Station an Opencaching.de gesendet.
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
