import { IMPRESSUM } from '../data/impressum';
import { OPEN_DATA_DATE } from '../data/open';

/** Impressum und Datenschutzhinweis (unter "Mehr") */
export function Legal() {
  const hasImprint = IMPRESSUM.name || IMPRESSUM.address || IMPRESSUM.contact;
  return (
    <div className="card rise legal" data-testid="legal">
      <div className="caption">Impressum & Datenschutz</div>

      <details>
        <summary>Impressum</summary>
        {hasImprint ? (
          <p>
            Verantwortlich:
            {IMPRESSUM.name && (
              <>
                <br />
                {IMPRESSUM.name}
              </>
            )}
            {IMPRESSUM.address && (
              <>
                <br />
                {IMPRESSUM.address}
              </>
            )}
            {IMPRESSUM.contact && (
              <>
                <br />
                Kontakt: {IMPRESSUM.contact}
              </>
            )}
          </p>
        ) : (
          <p>Privates, nicht-kommerzielles Familienprojekt. Die App wird kostenlos und ohne Werbung im Freundes- und Bekanntenkreis geteilt.</p>
        )}
        <p>
          Alle Angaben ohne Gewähr. Orte können sich verändern, gesperrt sein oder Baustellen haben. Achtet im Straßenverkehr auf euch,
          Eltern haben die Aufsicht.
        </p>
      </details>

      <details>
        <summary>Datenschutz in Kürze</summary>
        <ul>
          <li>
            <strong>Kein Konto, kein eigener Server, keine Werbung, kein Tracking.</strong> Es gibt keine Analyse-Werkzeuge und keine Cookies.
          </li>
          <li>
            <strong>Alles bleibt auf eurem Handy:</strong> Teamname, Namen und Altersstufen, Spielstand, Punkte, Fotos, Album und Meldungen
            werden nur im Speicher dieses Browsers abgelegt. Löschen könnt ihr sie hier unter „Album & Abzeichen zurücksetzen“, beim Tour-Löschen
            oder indem ihr die Website-Daten im Browser entfernt.
          </li>
          <li>
            <strong>Standort (GPS):</strong> wird nur während einer Tour auf dem Gerät ausgewertet, um zu prüfen, ob ihr am Ziel seid. Er wird
            nicht übertragen. Ausnahme: Wenn ihr eine Meldung („Stimmt hier etwas nicht?“) selbst teilt, steht der Standort darin.
          </li>
          <li>
            <strong>Bewegungssensor:</strong> zählt auf dem Gerät eure Schritte. Gespeichert wird nur die Schrittzahl der Tour, Bewegungsdaten selbst werden weder gespeichert noch gesendet.
          </li>
          <li>
            <strong>Kamera/Fotos:</strong> Fotos bleiben im Album auf dem Handy, bis ihr sie selbst teilt.
          </li>
        </ul>
        <p>
          <strong>Wer technisch Daten sieht:</strong>
        </p>
        <ul>
          <li>
            <strong>GitHub Pages</strong> (GitHub Inc., USA) liefert die App aus. Dabei wird wie bei jeder Website eure IP-Adresse verarbeitet. Siehe
            Datenschutzerklärung von GitHub.
          </li>
          <li>
            <strong>OpenStreetMap</strong> (OpenStreetMap Foundation, UK) liefert die Kartenbilder, wenn ihr die Karte anseht. Dabei werden IP-Adresse und
            der angezeigte Kartenausschnitt übertragen.
          </li>
          <li>
            <strong>Opencaching.de</strong> wird nur abgefragt, wenn ihr an einer Station „Echte Geocaches in der Nähe“ aufklappt oder einen Cache öffnet. Übertragen wird der Ort der Station bzw. der Code des Caches (nicht euer Standort) und wie bei jeder Website eure IP-Adresse; Bilder aus Cache-Beschreibungen kommen ebenfalls von dort. Euer Standort für den Kompass zum Cache bleibt auf dem Handy.
          </li>
          <li>
            <strong>Open-Meteo</strong> liefert die Regenvorhersage für die Routenplanung. Gesendet wird nur der grob gerundete Startpunkt (etwa auf 1 km genau).
          </li>
          <li>
            <strong>Urban Data Platform Hamburg</strong> (api.hamburg.de, Landesbetrieb Geoinformation und Vermessung) liefert für den Baum-Detektiv den nächsten Straßenbaum. Gesendet wird ein kleiner Kartenausschnitt um das Zwischenziel (nicht euer Standort) und wie bei jeder Website eure IP-Adresse.
          </li>
          <li>Links zu Wikipedia, Geocaching.com oder Quellen öffnen sich nur, wenn ihr sie antippt.</li>
        </ul>
        <p>Schriften und Bilder der Stationen sind in der App enthalten und werden nicht von fremden Servern geladen.</p>
        <p>
          <strong>Offene Daten:</strong> Denkmaltafeln, Baudenkmale, Spielplätze, Trinkwasserbrunnen und Straßenbäume: Freie und Hansestadt Hamburg
          (Urban Data Platform, u. a. Denkmalschutzamt), Datenlizenz Deutschland – Namensnennung 2.0. Kunstwerke und Stolpersteine: Wikidata (CC0);
          mehr zu den Stolpersteinen auf stolpersteine-hamburg.de. Stand der Daten: {OPEN_DATA_DATE}.
        </p>
      </details>
    </div>
  );
}
