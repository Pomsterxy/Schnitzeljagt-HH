# Schnitzeljagd Hamburg – Funktionskonzept (v0.1)

Familien-Schnitzeljagd als PWA. Startgebiet: **Barmbek-Nord, Winterhude, Alsterdorf**.
Fokus dieses Dokuments: Funktionen & Architektur. Optik folgt später.

## 1. Entscheidungen (aus der Abstimmung)

| Thema | Entscheidung |
|---|---|
| Plattform | PWA (Handy-Browser, auf Homescreen installierbar) |
| Inhalte | Kuratierter Stationen-Pool, recherchiert aus offenen Quellen |
| Gedenkorte | Eigener **ruhiger Modus**: keine Witze, keine Punkte-Hetze, respektvoller Text + Nachdenkfrage |
| Aufgaben | Vor-Ort-Beobachtung, Quiz/Schätzen, Foto-Aufgaben, Rätsel zum nächsten Ort, Wegbeschreibung über örtliche Merkmale |
| Navigation | Wählbar: **Karte** oder **Abenteuer** (nur Hinweise), Heiß/Kalt als Notfallhilfe |
| Dauer | Route wird automatisch aus Stadtteil(en) + Wunschdauer generiert |
| Spielmodus | Ein Handy pro Familie, Altersstufen, Punkte, Abzeichen, Gamification |
| Offline | Tour wird vorab komplett geladen (Texte, Bilder, Karte) |
| GPS | Radius pro Station + Fallback-Freischaltung durch Erwachsene |
| Daten | Nur lokal auf dem Gerät, kein Konto, kein Server |
| Extras | Pausen/Toiletten/Spielplätze als Zwischenstopps, Vorlesefunktion |

## 2. Spielablauf

1. **Start** – Team anlegen: Teamname, Avatar, Mitspielende mit Altersstufe
   (Kids 6–9 · Kids 10–13 · Teens/Erwachsene). Die jüngste Stufe bestimmt die Grundschwierigkeit,
   Fragen können zusätzlich pro Stufe Varianten haben.
2. **Tour konfigurieren** – Stadtteile wählen (Mehrfachauswahl), Dauer (Schieberegler 30 min – 4 h),
   Startpunkt (aktueller Standort oder Haltestelle), Navigationsmodus, Gedenkorte ein/aus,
   Pausen-Stopps ein/aus.
3. **Route generieren** – Vorschau: Anzahl Stationen, Strecke in km, geschätzte Dauer, Themen-Mix.
   „Neu würfeln“ möglich.
4. **Offline-Paket laden** – Fortschrittsbalken; danach Hinweis „Ihr könnt jetzt ohne Netz los“.
5. **Unterwegs** – Für jede Station:
   - *Anreise*: Karte mit Ziel **oder** Hinweis-/Wegbeschreibung („Geht am Kanal entlang bis zur
     Brücke mit den grünen Geländern …“). Heiß/Kalt-Anzeige auf Wunsch (kostet Punkte im Abenteuermodus).
   - *Ankunft*: GPS innerhalb des Stationsradius → Station „springt auf“ (Vibration + Sound).
     Vorher sind Aufgabe und Infotext **gesperrt und unsichtbar**.
   - *Aufgabe(n)* lösen → Punkte, ggf. Abzeichen.
   - *Info-Snack*: kurzer Wissenshappen mit Bild + Quelle, vorlesbar.
6. **Ende** – Urkunde (Teamname, Punkte, Abzeichen, Strecke), Fotoalbum, Teilen/Herunterladen.
   Spielstand wird laufend gespeichert; Pause/Fortsetzen jederzeit möglich.

## 3. Aufgabentypen

| Typ | Beispiel | Auswertung |
|---|---|---|
| `observation` | „Welche Jahreszahl steht über dem Eingang?“ | Eingabe/Auswahl, nur vor Ort lösbar |
| `count` | „Wie viele Fenster hat der Turm zur Straße?“ | Zahl mit Toleranz |
| `quiz` | Multiple Choice / Wahr-Falsch | exakt |
| `estimate` | „Wie hoch ist der Wasserturm (Planetarium)?“ | Punkte nach Nähe zum Wert |
| `photo` | „Stellt die Pose der Figur nach“ | Selbstbestätigung, Foto ins Album |
| `riddle_next` | Bilder-/Worträtsel führt zur nächsten Station | ergibt Ziel, kein Eingabefeld |
| `wayfinding` | Wegbeschreibung über Merkmale | Navigation statt Karte |
| `reflection` | (ruhiger Modus) „Was bedeutet es, dass hier ein Name steht?“ | keine Wertung, keine Punkte-Uhr |

Jede Aufgabe hat: bis zu 3 gestufte Hinweise (kosten Punkte), Lösungserklärung, Varianten je Altersstufe.

## 4. Gamification

- **Punkte**: Grundpunkte je Aufgabe, Abzug pro Hinweis, Bonus für „ohne Karte gefunden“.
- **Abzeichen**: pro Stadtteil („Jarrestadt-Kenner“), pro Thema (Wasser, Architektur, Geschichte),
  Spezial („Kanal-Kapitän“: alle Brücken-Stationen), Laufleistung (5 km, 10 km).
- **Ränge**: Spürnase → Stadtdetektiv → Hamburg-Profi (über mehrere Touren, lokal gespeichert).
- **Sammelkarten**: Jede Station ergibt eine Karte im „Hamburg-Album“ – Anreiz, weitere Touren zu spielen.
- **Ruhiger Modus**: Gedenkorte vergeben ein eigenes, stilles Symbol („Erinnert“), keine Punkte.

## 5. Routengenerator

- **Eingabe**: Stationen-Pool der gewählten Stadtteile, Startpunkt, Zeitbudget, Filter (Gedenkorte, Pausen).
- **Kosten**: Gehzeit (vorberechnete Fußwege zwischen allen Stationen, Familientempo ~3,5 km/h)
  + Verweildauer je Station (aus den Daten, z. B. 5–15 min) + optionale Pause.
- **Algorithmus**: Orienteering-Heuristik – greedy nach „Attraktivität ÷ Zusatzzeit“, danach
  2-opt-Optimierung der Reihenfolge; Rundtour oder Ende an ÖPNV-Haltestelle.
- **Mix-Regeln**: abwechselnde Aufgabentypen, max. 1 Gedenkort direkt hintereinander,
  bei > 60 min mindestens ein Pausen-Stopp (Spielplatz/Eis/WC).
- **Fußwege**: einmalig beim Build über OSRM/GraphHopper (Fußgänger-Profil, OpenStreetMap) berechnet
  und als Distanzmatrix in den Daten mitgeliefert → läuft offline auf dem Handy.

## 6. GPS & Freischaltung

- `navigator.geolocation.watchPosition` mit hoher Genauigkeit.
- Freischaltung, wenn `Distanz ≤ Stationsradius + min(Genauigkeit, 20 m)`.
- Radius pro Station (Stolperstein ~20 m, Gebäude ~40 m, Park ~80 m).
- **Fallback**: Nach 2 min „in der Nähe“ (≤ 2× Radius) erscheint „Wir sind da, GPS spinnt“ →
  Freischalten per Eltern-PIN (bei Tourstart festgelegt). Komplett ohne GPS: Eltern-PIN jederzeit.
- Akku-schonend: seltener abfragen, solange Ziel > 500 m entfernt.

## 7. Offline & Technik

| Baustein | Wahl |
|---|---|
| Framework | Vite + React + TypeScript |
| PWA | vite-plugin-pwa (Workbox), Installierbar, Service Worker |
| Karte | MapLibre GL + **PMTiles-Ausschnitt** des Gebiets (selbst gehostet, offline-fähig, keine Tile-Server-Policy-Probleme) |
| Speicher | IndexedDB (Dexie) für Spielstand, Fotos, Rangfortschritt |
| Fotos | Kamera über `<input capture>` / `getUserMedia`, lokal komprimiert |
| Vorlesen | Web Speech API (`speechSynthesis`, de-DE) |
| Urkunde/Album | Canvas → PNG, Teilen über Web Share API |
| Hosting | Statisch (z. B. GitHub Pages / Netlify), keine Server-Logik |
| Tests | Vitest (Routengenerator, Distanz/Unlock-Logik), Playwright mit simulierter Geolocation |

**Entwickler-Modus**: Standort per Klick auf der Karte simulieren – so kann man jede Tour am Schreibtisch testen.

## 8. Datenmodell (JSON, versioniert im Repo)

```jsonc
// data/stations/winterhude/planetarium.json
{
  "id": "wh-planetarium",
  "district": "winterhude",
  "title": "Planetarium im Stadtpark",
  "coords": [53.5966, 10.0118],
  "unlockRadius": 60,
  "category": ["architektur", "wissen"],
  "mode": "normal",                  // "normal" | "quiet" (Gedenkorte)
  "dwellMinutes": 10,
  "accessible": true,
  "approach": {
    "wayfinding": "Folgt der großen Wiese, bis ihr den dicken Backsteinturm seht …",
    "riddle": "Früher war in mir Wasser, heute sind in mir Sterne. Wer bin ich?"
  },
  "tasks": [
    { "type": "estimate", "question": "Wie hoch ist der Turm?", "answer": 64, "unit": "m",
      "hints": ["Höher als 10 Stockwerke"], "ageVariants": { "kids6": { "type": "quiz", "...": "..." } } }
  ],
  "snack": { "text": "Der Turm wurde 1912–1915 als Wasserturm gebaut …", "readAloud": true },
  "images": [
    { "file": "wh-planetarium-1.jpg", "source": "Wikimedia Commons", "author": "…", "license": "CC BY-SA 4.0", "url": "…" }
  ],
  "sources": ["https://de.wikipedia.org/wiki/Planetarium_Hamburg"],
  "verified": { "onSite": false, "date": null }
}
```

Zusätzlich: `data/pois/` (Spielplätze, WCs, Eisdielen aus OSM), `data/matrix.json` (Fußwege),
`data/badges.json`.

**Fakten in den Beispielen (Turmhöhe, Baujahre usw.) werden bei der Inhaltsrecherche geprüft.**

## 9. Inhaltsrecherche – Quellen & Regeln

- **Sehenswürdigkeiten/Infotafeln**: Wikipedia (de), Wikidata, OpenStreetMap (`tourism`, `historic`,
  `memorial`, `board_type=history`), Denkmalliste Hamburg, Stadtteilarchive (z. B. Geschichtswerkstatt Barmbek).
- **Stolpersteine**: stolpersteine-hamburg.de (Biografien – nur zusammenfassen, verlinken),
  Wikipedia-Listen „Stolpersteine in Hamburg-Barmbek-Nord / -Winterhude / -Alsterdorf“, OSM `memorial=stolperstein`.
- **Bilder**: Wikimedia Commons mit frei kompatibler Lizenz (CC0/CC BY/CC BY-SA), Lizenz + Urheber
  in den Daten und in der App angezeigt. Später eigene Fotos vor Ort.
- **Kandidaten fürs Startgebiet** (Auswahl, wird in der Recherche erweitert):
  - Winterhude: Stadtpark, Planetarium, Jarrestadt, Mühlenkamp/Goldbekkanal, Winterhuder Fährhaus,
    Leinpfad-Villen, Brücken am Osterbekkanal.
  - Barmbek-Nord: Museum der Arbeit (ehem. New-York-Hamburger Gummi-Waaren Compagnie),
    Zinnschmelze, Bahnhof Barmbek, Gedenkorte zum Bombenkrieg 1943, Fuhlsbüttler Straße.
  - Alsterdorf: Ev. Stiftung Alsterdorf mit Gedenkort (NS-„Euthanasie“, ruhiger Modus),
    Alsterlauf, Alsterdorfer Markt.
  - In allen drei Stadtteilen: zahlreiche Stolpersteine.
- **Vor-Ort-Aufgaben** müssen vor der Freigabe vor Ort geprüft werden (`verified.onSite`),
  sonst nur als Quiz-Aufgabe ausspielen.

## 10. Umsetzungsphasen

1. **Grundgerüst**: PWA-Projekt, Datenschema + Validierung, Entwickler-Standortsimulation.
2. **Kern-Spielschleife**: Team anlegen → feste Testtour → GPS-Freischaltung → Aufgaben → Punkte → Ende.
3. **Inhalte Runde 1**: ca. 30–40 Stationen in den drei Stadtteilen inkl. Bilder & Lizenzen.
4. **Routengenerator** + Distanzmatrix + Pausen-Stopps.
5. **Offline**: PMTiles-Karte, Vorab-Download, Service-Worker-Caching.
6. **Gamification**: Abzeichen, Ränge, Sammelalbum, Urkunde, Fotoalbum.
7. **Vorlesen, Hinweisstufen, Altersvarianten, Feinschliff.**
8. **Praxistest vor Ort** mit der Familie → Aufgaben korrigieren.
9. Optik/Design-Runde.

## 11. Offene Punkte für später

- Name der App / Maskottchen (z. B. eine Möwe als Begleitfigur?)
- Erweiterung auf weitere Stadtteile (Altstadt, HafenCity, Grindel …)
- Englische Version
- Saisonale Sondertouren (Halloween, Advent)
