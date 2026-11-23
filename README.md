# Schnitzeljagd Hamburg

Familien-Schnitzeljagd als Web-App (PWA) durch **Winterhude, Barmbek-Nord und Alsterdorf**: Rätsel lösen, Orte per GPS finden,
Aufgaben bearbeiten, Info-Snacks lesen, Punkte und Abzeichen sammeln. Gedenkorte (Stolpersteine, Mahnmale) haben einen eigenen
ruhigen Modus ohne Punkte.

- **51 Stationen** mit echten Fakten, 56 Fotos und Lizenzangaben, darunter 10 Gedenkorte und 24 Architektur-Stationen
- **Route nach Wunsch**: Stadtteile, Dauer (30 min – 4 h), Startpunkt und Thema (z. B. Architektur, Wasser, Technik, Erinnern) wählen, die App plant automatisch, auf Wunsch mit Spielplatz- oder Eis-Pause
- **Geocaching**: Schatz-Finale wie ein Multi-Cache. Jede Station liefert eine Cache-Zahl fürs Notizbuch, am Ende berechnet ihr die Koordinaten und sucht den Schatz nur mit Kompass und Entfernung. Dazu kommen Links zu echten Geocaches (Geocaching.com, Opencaching.de); mit eigenem Opencaching-Schlüssel zeigt die App Caches in der Nähe direkt an
- **GPS-Freischaltung**: Aufgaben erscheinen erst am Ort; wenn das GPS spinnt, hilft die Eltern-PIN
- **Zwei Navigationsmodi**: Karte mit Richtungspfeil oder Abenteuer (nur Rätsel, Heiß/Kalt kostet Punkte)
- **Altersstufen**: Kinder 6–9, Kinder 10–13, Teens/Erwachsene
- **Aufgabentypen**: Quiz, Schätzen, Zählen, Beobachten, Foto, Nachdenken
- **Familien-Momente**: an etwa jeder dritten Station ein gemeinsames Spiel (Mini-Versteckspiel, Lillis Freeze-Tanz, Grimassen-Selfie, Geräusche-Detektive, Komplimente-Runde u. a.) mit Timer, Musik oder Foto
- **Gamification**: Punkte, Hinweise mit Abzug, Bonus ohne Hilfe, 23 Abzeichen, Ränge, Sammelalbum, Urkunde
- **Design im Apple-Stil** mit der Möwe **Lilli** als Begleiterin, Animationen (Konfetti, Kompass-Radar, Zahlenschloss, Schatzkiste) sowie Tönen und Vibration (abschaltbar)
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

## Spielen

**👉 https://pomsterxy.github.io/Schnitzeljagt-HH/**

Auf dem Handy öffnen, den Standortzugriff erlauben und am besten zum Home-Bildschirm hinzufügen.

## Veröffentlichen (GitHub Pages)

Der Workflow `.github/workflows/pages.yml` baut und testet die App bei jedem Push auf `main` und legt das Ergebnis in den
Zweig `gh-pages`. GitHub Pages zeigt diesen Zweig an. Unter *Settings → Pages* muss als Quelle „Deploy from a branch“ mit
`gh-pages` / `(root)` eingestellt sein.

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
