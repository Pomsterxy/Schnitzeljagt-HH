/**
 * Cache-Zahlen für das Multi-Cache-Finale (wie beim Geocaching).
 * Nach dem Lösen einer Station bekommt das Team eine Zahl von 0–9 ins Notizbuch.
 * Daraus berechnen sie am Ende die Koordinaten des Schatzes.
 * Gedenkorte vergeben bewusst keine Cache-Zahlen.
 */
export interface CacheClue {
  label: string;
  value: number;
}

export const CACHE_CLUES: Record<string, CacheClue> = {
  planetarium: { label: 'Letzte Ziffer des Jahres, in dem der Turm fertig wurde (1915)', value: 5 },
  pinguinbrunnen: { label: 'Anzahl der Pinguine', value: 6 },
  fabeltier: { label: 'Erste Ziffer der Planschbecken-Fläche (3.000 m²)', value: 3 },
  trinkhalle: { label: 'Anzahl der Heilwässer geteilt durch 10 (50 ÷ 10)', value: 5 },
  'landhaus-walter': { label: 'Letzte Ziffer des Brunnen-Baujahrs (1916)', value: 6 },
  stadtparksee: { label: 'Erste Ziffer der Seelänge (380 m)', value: 3 },
  'diana-hirschkuh': { label: 'Letzte Ziffer des Entstehungsjahres (1910)', value: 0 },
  'heine-denkmal': { label: 'So viele Jahre stand die Statue im Park (1926–1933)', value: 7 },
  stadthalle: { label: 'Erste Ziffer der Gästezahl (14.000)', value: 1 },
  stadthallenbruecke: { label: 'Anzahl der Enten am Brückenschmuck', value: 2 },
  kranzhaus: { label: 'Letzte Ziffer der Wohnungszahl (146)', value: 6 },
  kampnagel: { label: 'Letzte Ziffer des Gründungsjahres (1865)', value: 5 },
  wiesendammbruecke: { label: 'Letzte Ziffer der Brückenlänge (29 m)', value: 9 },
  faehrhaus: { label: 'Letzte Ziffer der Faschingsbälle 1951 (67)', value: 7 },
  marktplatz: { label: 'Anzahl der alten Bauernhöfe (Vollhufner)', value: 7 },
  'winterhuder-bruecke': { label: 'Letzte Ziffer der Brückenlänge (27 m)', value: 7 },
  sierichstrasse: { label: 'Uhrzeit, ab der morgens stadteinwärts gefahren wird (4 Uhr)', value: 4 },
  'arne-jacobsen': { label: 'Anzahl der Hochhausscheiben', value: 4 },
  'city-nord-park': { label: 'Letzte Ziffer des ersten Planungsjahres (1959)', value: 9 },
  sporthalle: { label: 'Letzte Ziffer der Sitzplatzzahl (4.144)', value: 4 },
  'museum-arbeit': { label: 'Letzte Ziffer des Fabrik-Baujahrs (1871)', value: 1 },
  trude: { label: 'So viele Meter bohrte TRUDE pro Tag', value: 6 },
  'bahnhof-barmbek': { label: 'Anzahl der Bahnsteige', value: 3 },
  'von-elm-hof': { label: 'Anzahl der Ecken des Häuserblocks', value: 3 },
  'wasserturm-barmbek': { label: 'Erste Ziffer der Turmhöhe (48 m)', value: 4 },
  auferstehungskirche: { label: 'Letzte Ziffer des Weihejahres (1920)', value: 0 },
  hellbrook: { label: 'Letzte Ziffer des Baujahres (1912)', value: 2 },
  'rothe-gymnasium': { label: 'Letzte Ziffer des Jahres der Namensgebung (1988)', value: 8 },
  feuerwache: { label: 'Anzahl der Motorspritzen 1914', value: 2 },
  'traute-lafrenz': { label: 'Letzte Ziffer des Umbenennungsjahres (2025)', value: 5 },
  skagerrak: { label: 'Letzte Ziffer des Baujahrs der Brabandbrücke (1965)', value: 5 },
  'martin-luther': { label: 'Letzte Ziffer der Turmhöhe (34 m)', value: 4 },
  krematorium: { label: 'Anzahl der Ecken', value: 8 },
  lichtwarkschule: { label: 'Letzte Ziffer des Gründungsjahres (1914)', value: 4 },
  matthaeuskirche: { label: 'Letzte Ziffer des Baubeginns (1910)', value: 0 },
  epiphanienkirche: { label: 'Letzte Ziffer des Fertigstellungsjahres (1962)', value: 2 },
  'paul-gerhardt': { label: 'Letzte Ziffer des Baubeginns (1960)', value: 0 },
  'ueberseering-35': { label: 'Anzahl der Bürotrakte', value: 4 },
  'edeka-gebaeude': { label: 'Höchstzahl der Arbeitsplätze pro Büro', value: 8 },
  'u-sierichstrasse': { label: 'Letzte Ziffer des Eröffnungsjahres (1912)', value: 2 },
  'schule-tieloh': { label: 'Letzte Ziffer des ersten Schuljahres im Gebäude (1914)', value: 4 },
};
