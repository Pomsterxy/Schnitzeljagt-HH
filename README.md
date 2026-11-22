# Schnitzeljagd Hamburg

Familien-Schnitzeljagd als Web-App (PWA) durch **Winterhude, Barmbek-Nord und Alsterdorf**: Rätsel lösen, Orte per GPS finden,
Aufgaben bearbeiten, Info-Snacks lesen, Punkte und Abzeichen sammeln. Gedenkorte (Stolpersteine, Mahnmale) haben einen eigenen
ruhigen Modus ohne Punkte.

- **43 Stationen** mit echten Fakten, 48 Fotos und Lizenzangaben, darunter 10 Gedenkorte
- **Route nach Wunsch**: Stadtteile, Dauer (30 min – 4 h) und Startpunkt wählen, die App plant automatisch, auf Wunsch mit Spielplatz- oder Eis-Pause
- **GPS-Freischaltung**: Aufgaben erscheinen erst am Ort; wenn das GPS spinnt, hilft die Eltern-PIN
- **Zwei Navigationsmodi**: Karte mit Richtungspfeil oder Abenteuer (nur Rätsel, Heiß/Kalt kostet Punkte)
- **Altersstufen**: Kinder 6–9, Kinder 10–13, Teens/Erwachsene
- **Aufgabentypen**: Quiz, Schätzen, Zählen, Beobachten, Foto, Nachdenken
- **Gamification**: Punkte, Hinweise mit Abzug, Bonus ohne Hilfe, 19 Abzeichen, Ränge, Sammelalbum, Urkunde
- **Vorlesefunktion** für Rätsel, Fragen und Infotexte
- **Offline**: Texte und Bilder sind in der App gespeichert, Kartenkacheln werden beim Ansehen zwischengespeichert
- **Datenschutz**: kein Konto, kein Server, alles bleibt auf dem Handy

## Starten

```bash
cd app
npm install
npm run dev        # Entwicklung: http://localhost:5173
npm run build      # Produktions-Build nach app/dist
npm run preview    # Build ansehen: http://localhost:4173
```

Auf dem Handy testen: `npm run dev -- --host` und die angezeigte Netzwerk-Adresse öffnen. Für GPS braucht der Browser HTTPS oder
`localhost`. Deshalb am einfachsten über GitHub Pages (siehe unten) testen.

**Testmodus am Schreibtisch**: In der App unter *Einstellungen → Testmodus* (oder URL mit `?test=1`). Dann setzt ein Tipp auf die
Karte den Standort, und „Zum Ziel springen“ bringt euch direkt zur Station.

## Veröffentlichen (GitHub Pages)

Der Workflow `.github/workflows/pages.yml` baut die App bei jedem Push auf `main` und veröffentlicht sie unter
`https://<benutzer>.github.io/Schnitzeljagt-HH/`. Einmalig nötig: *Settings → Pages → Source: GitHub Actions*.

## Tests

```bash
npm test                      # Logik- und Datentests (Routengenerator, GPS-Freischaltung, Punkte, Datenintegrität)
npm run build && npm run preview &
npm run e2e                   # Kompletter Spieldurchlauf im Browser (Karte + Abenteuer) und Sonderfälle
```

## Projektstruktur

- `app/src/data/`: Stationen, Stadtteile, Startpunkte, Pausenorte (OSM), Abzeichen
- `app/src/lib/`: Geo-Berechnung, Routengenerator, Punkteauswertung, GPS, Speicher, Vorlesen
- `app/src/state/game.ts`: Spielstand (lokal gespeichert)
- `app/src/screens/`: Start, Tour-Planung, Spiel, Abschluss, Album, Einstellungen
- `docs/KONZEPT.md`: Funktionskonzept · `docs/RECHERCHE.md`: Stationen und Quellen

## Lizenzen

Texte basieren auf der deutschsprachigen Wikipedia (CC BY-SA 4.0). Fotos stammen von Wikimedia Commons, Urheber und Lizenz je
Bild stehen in `app/public/img/credits.json` und in der App. Pausenorte und Karte: © OpenStreetMap-Mitwirkende (ODbL).
