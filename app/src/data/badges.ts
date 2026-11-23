import type { Category, DistrictId, Station } from './types';

export interface BadgeContext {
  /** Stationen dieser Tour, die abgeschlossen wurden */
  finished: Station[];
  /** Alle jemals abgeschlossenen Stationen (über alle Touren) */
  collected: Set<string>;
  allStations: Station[];
  meters: number;
  hintsUsed: number;
  helpUsed: number;
  photos: number;
  perfectEstimates: number;
  toursFinished: number;
  cacheFound?: boolean;
  familyGames?: number;
  cacheFirstTry?: boolean;
  collectedBadges?: Set<string>;
}

export interface Badge {
  id: string;
  icon: string;
  title: string;
  description: string;
  /** stille Abzeichen (Gedenkorte) werden ohne Jubel angezeigt */
  quiet?: boolean;
  check: (c: BadgeContext) => boolean;
}

const has = (c: BadgeContext, cat: Category, n: number) =>
  c.finished.filter((s) => s.categories.includes(cat)).length >= n;

const districtDone = (c: BadgeContext, d: DistrictId) => {
  const all = c.allStations.filter((s) => s.district === d);
  return all.length > 0 && all.every((s) => c.collected.has(s.id));
};

export const BADGES: Badge[] = [
  { id: 'erste-station', icon: '🧭', title: 'Spürnase', description: 'Die erste Station gefunden.', check: (c) => c.finished.length >= 1 },
  { id: 'fuenf-stationen', icon: '🗺️', title: 'Stadtentdecker', description: '5 Stationen in einer Tour geschafft.', check: (c) => c.finished.length >= 5 },
  { id: 'zehn-stationen', icon: '🏆', title: 'Hamburg-Profi', description: '10 Stationen in einer Tour geschafft.', check: (c) => c.finished.length >= 10 },
  { id: 'wasser', icon: '⛵', title: 'Kanal-Kapitän', description: '3 Stationen am Wasser besucht.', check: (c) => has(c, 'wasser', 3) },
  { id: 'technik', icon: '⚙️', title: 'Tüftler', description: '2 Technik-Stationen besucht.', check: (c) => has(c, 'technik', 2) },
  { id: 'architektur', icon: '🧱', title: 'Klinker-Kenner', description: '3 Architektur-Stationen besucht.', check: (c) => has(c, 'architektur', 3) },
  { id: 'kunst', icon: '🎨', title: 'Kunstdetektiv', description: '3 Kunst- und Kultur-Stationen besucht.', check: (c) => has(c, 'kultur', 3) },
  {
    id: 'erinnern',
    icon: '🕯️',
    title: 'Erinnern',
    description: 'An einem Gedenkort innegehalten.',
    quiet: true,
    check: (c) => c.finished.some((s) => s.mode === 'quiet'),
  },
  { id: 'ohne-hilfe', icon: '🦉', title: 'Schlaue Eule', description: 'Eine Tour mit mindestens 3 Stationen ganz ohne Hinweise.', check: (c) => c.finished.length >= 3 && c.hintsUsed === 0 },
  { id: 'kompass', icon: '🧿', title: 'Pfadfinder', description: 'Eine Tour mit mindestens 3 Stationen ohne Karte und Heiß/Kalt.', check: (c) => c.finished.length >= 3 && c.helpUsed === 0 },
  { id: 'schaetzer', icon: '🎯', title: 'Schätzmeister', description: '2 Schätzfragen mit Volltreffer.', check: (c) => c.perfectEstimates >= 2 },
  { id: 'fotograf', icon: '📸', title: 'Familienfotograf', description: '3 Fotoaufgaben erledigt.', check: (c) => c.photos >= 3 },
  { id: 'km3', icon: '👟', title: 'Wanderschuh', description: 'Mehr als 3 km gelaufen.', check: (c) => c.meters >= 3000 },
  { id: 'km6', icon: '🥾', title: 'Marathon-Familie', description: 'Mehr als 6 km gelaufen.', check: (c) => c.meters >= 6000 },
  { id: 'stadtpark', icon: '🐧', title: 'Stadtpark-Kenner', description: 'Pinguine, Fabeltier und Planetarium gefunden.', check: (c) => ['pinguinbrunnen', 'fabeltier', 'planetarium'].every((id) => c.collected.has(id)) },
  { id: 'all-winterhude', icon: '⭐', title: 'Winterhude komplett', description: 'Alle Stationen in Winterhude gesammelt.', check: (c) => districtDone(c, 'winterhude') },
  { id: 'all-barmbek', icon: '⭐', title: 'Barmbek komplett', description: 'Alle Stationen in Barmbek-Nord gesammelt.', check: (c) => districtDone(c, 'barmbek-nord') },
  { id: 'all-alsterdorf', icon: '⭐', title: 'Alsterdorf komplett', description: 'Alle Stationen in Alsterdorf gesammelt.', check: (c) => districtDone(c, 'alsterdorf') },
  { id: 'familienbande', icon: '🤝', title: 'Familienbande', description: '3 Familien-Momente gemeinsam gespielt.', check: (c) => (c.familyGames ?? 0) >= 3 },
  { id: 'cacher', icon: '💎', title: 'Schatzfinder', description: 'Den Schatz am Ende eines Multi-Caches gefunden.', check: (c) => !!c.cacheFound },
  { id: 'koordinaten', icon: '🧮', title: 'Koordinaten-Profi', description: 'Die Schatz-Koordinaten im ersten Versuch richtig berechnet.', check: (c) => !!c.cacheFirstTry },
  {
    id: 'architektur-profi',
    icon: '🏛️',
    title: 'Architektur-Profi',
    description: '6 Architektur-Stationen in einer Tour besucht.',
    check: (c) => has(c, 'architektur', 6),
  },
  { id: 'drei-touren', icon: '🎖️', title: 'Stammgast', description: '3 Touren beendet.', check: (c) => c.toursFinished >= 3 },
];

export const RANKS = [
  { min: 0, title: 'Spürnase' },
  { min: 150, title: 'Stadtdetektiv' },
  { min: 400, title: 'Hamburg-Kenner' },
  { min: 900, title: 'Hamburg-Profi' },
  { min: 1600, title: 'Ehren-Hamburger' },
];

export function rankFor(points: number) {
  let r = RANKS[0];
  for (const x of RANKS) if (points >= x.min) r = x;
  const next = RANKS.find((x) => x.min > points);
  return { ...r, next };
}
