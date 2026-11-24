/**
 * Stationen und Zwischenziele aus offenen Daten (siehe scripts/import-open-data.mjs):
 *  - Blaue Denkmaltafeln (Denkmalschutzamt Hamburg, dl-de/by-2.0) → neue Stationen
 *  - Stolpersteine (Wikidata, CC0) → stille Gedenkstationen an Adressen mit mehreren Steinen
 *  - Kunstwerke im öffentlichen Raum (Wikidata) und Trinkwasserbrunnen → Zwischenziele
 *  - Spielplatz-Beschreibungen, nahe Baudenkmale und Stolpersteine → Zusatzinfos an Zwischenzielen
 */
import type { Category, DistrictId, LatLng, Poi, Station, Task } from "./types";
import tafelnJson from "./open/tafeln.json";
import kunstJson from "./open/kunst.json";
import steineJson from "./open/stolpersteine.json";
import brunnenJson from "./open/trinkbrunnen.json";
import poiInfoJson from "./open/poi-info.json";
import metaJson from "./open/meta.json";

interface Tafel {
  id: string;
  title: string;
  text: string;
  coords: LatLng;
  district: DistrictId;
  nearExisting: boolean;
}
interface SteinGruppe {
  id: string;
  address: string;
  coords: LatLng;
  district: DistrictId;
  people: { name: string; inscription: string }[];
  wikidata: string[];
}
export interface PoiInfo {
  playground?: { name: string; text: string };
  monument?: { name: string; year?: string; m: number };
  stones?: { address: string; names: string[] };
}

export const OPEN_DATA_DATE: string = metaJson.importedAt;
export const DENKMAL_SOURCE =
  "Denkmalschutzamt Hamburg, Datenlizenz Deutschland – Namensnennung 2.0 (api.hamburg.de)";
const WIKIDATA = (q: string) => `https://www.wikidata.org/wiki/${q}`;

const TAFELN = tafelnJson as unknown as Tafel[];
const STEINE = steineJson as unknown as SteinGruppe[];

/** Kleiner, stabiler Hash für deterministische Antwort-Reihenfolgen */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++)
    h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Erster Satz (für Erklärungen) */
const firstSentence = (t: string) => {
  const m = /^(.{30,}?[a-zäöüß)\d]\.)\s+\p{Lu}/u.exec(t);
  return m ? m[1] : t;
};

/** Erstes plausibles Baujahr im Text */
function buildYear(text: string): number | null {
  const m = /\b(1[5-9]\d\d|20[0-2]\d)\b/.exec(text);
  return m ? Number(m[1]) : null;
}

function tafelTasks(t: Tafel): Task[] {
  const tasks: Task[] = [];
  const year = buildYear(t.text);
  if (year) {
    const wrong = [year - 40, year + 30, year - 90].map((y) =>
      Math.min(y, new Date().getFullYear() - 1),
    );
    // richtige Antwort an eine feste, aber "zufällige" Stelle
    const pos = hash(t.id) % 4;
    const options = wrong.slice();
    options.splice(pos, 0, year);
    tasks.push({
      id: `${t.id}-jahr`,
      type: "quiz",
      question: "Lest die blaue Tafel: Welches Jahr steht dort als Erstes?",
      options: options.map(String),
      correct: options.indexOf(year),
      hints: ["Die Jahreszahl steht meist gleich am Anfang des Textes."],
      explanation: firstSentence(t.text),
    });
    const age = new Date().getFullYear() - year;
    tasks.push({
      id: `${t.id}-alter`,
      type: "estimate",
      level: "kids",
      question:
        "Schaut euch das Gebäude genau an. Was schätzt ihr: Wie viele Jahre ist es ungefähr alt?",
      answer: age,
      unit: "Jahre",
      tolerance: 15,
      min: 0,
      max: 250,
      explanation: `Es ist ungefähr ${age} Jahre alt: Laut Tafel ging es ${year} los.`,
    });
  }
  tasks.push({
    id: `${t.id}-detail`,
    type: "photo",
    question:
      "Detektiv-Auftrag: Sucht am Gebäude ein Detail, das auf der Tafel beschrieben wird (Material, Fenster, Turm …), und macht ein Foto davon.",
  });
  return tasks;
}

function tafelCategories(t: Tafel): Category[] {
  const c: Category[] = ["architektur", "geschichte"];
  if (/Fabrik|Bahn|Station|Industrie|Kraftwerk/i.test(t.title + t.text))
    c.push("technik");
  if (/Kirche|Schule|Theater/i.test(t.title)) c.push("kultur");
  return c;
}

const TAFEL_STATIONS: Station[] = TAFELN.filter((t) => !t.nearExisting).map(
  (t) => ({
    id: t.id,
    district: t.district,
    title: t.title,
    coords: t.coords,
    radius: 45,
    categories: tafelCategories(t),
    mode: "normal",
    dwell: 7,
    appeal: 3,
    teaser: "Ein Gebäude mit einer blauen Tafel, die seine Geschichte erzählt.",
    wayfinding: `Ihr sucht „${t.title}“. An denkmalgeschützten Gebäuden hängt in Hamburg oft eine blaue Tafel, meist neben dem Eingang in Augenhöhe.`,
    riddle:
      "An mir hängt ein Schild in Hamburger Blau. Es erzählt, wann ich gebaut wurde und von wem. Findet ihr mich?",
    tasks: tafelTasks(t),
    snack: `Auf der blauen Tafel steht: „${t.text}“`,
    kidsFact:
      "Blaue Tafeln hängen in Hamburg an Häusern, die unter Denkmalschutz stehen. Das heißt: Sie dürfen nicht einfach abgerissen oder verändert werden.",
    images: [],
    sources: [DENKMAL_SOURCE],
    origin: "tafel",
  }),
);

/** Stolpersteine: Adressen mit mindestens drei Steinen werden zu stillen Gedenkstationen */
const STONE_MIN = 3;
function firstWords(ins: string): string {
  return ins.split(/\s+/).slice(0, 2).join(" ");
}
/** Doppelte Wikidata-Einträge (gleicher Nachname + Jahrgang) zusammenfassen */
function uniquePeople(people: SteinGruppe["people"]): SteinGruppe["people"] {
  const key = (p: SteinGruppe["people"][number]) =>
    `${p.name.split(" ").pop()}|${/Jg\.\s*(\d{4})/.exec(p.inscription)?.[1] ?? p.name}`;
  const m = new Map<string, SteinGruppe["people"][number]>();
  for (const p of people) {
    const prev = m.get(key(p));
    if (!prev || p.inscription.length > prev.inscription.length)
      m.set(key(p), p);
  }
  return [...m.values()];
}
const STONE_STATIONS: Station[] = STEINE.map((g) => ({
  ...g,
  people: uniquePeople(g.people),
}))
  .filter((g) => g.people.length >= STONE_MIN)
  .map((g) => {
    const n = g.people.length;
    const words = firstWords(g.people[0].inscription);
    const sameStart = g.people.every(
      (p) => firstWords(p.inscription) === words,
    );
    const inscriptions = g.people.map((p) => `„${p.inscription}“`).join("\n");
    const tasks: Task[] = [];
    if (sameStart && /^Hier \p{Ll}+$/u.test(words)) {
      tasks.push({
        id: `${g.id}-worte`,
        type: "text",
        question:
          "Lest die Steine im Gehweg: Mit welchen zwei Wörtern beginnen die Inschriften?",
        accept: [words, words.replace(/\s+/g, "")],
        explanation: `Auf den Steinen steht:\n${inscriptions}`,
      });
    }
    tasks.push({
      id: `${g.id}-gedanke`,
      type: "reflection",
      question:
        "Stolpersteine sind kleine Messingplatten von Gunter Demnig. Sie liegen vor dem letzten selbst gewählten Wohnort von Menschen, die in der Zeit des Nationalsozialismus verfolgt, vertrieben oder ermordet wurden. Sucht euch einen Namen aus und lest ihn leise vor. So wird dieser Mensch nicht vergessen.",
    });
    return {
      id: g.id,
      district: g.district,
      title: `Stolpersteine ${g.address}`,
      coords: g.coords,
      radius: 40,
      categories: ["erinnern", "geschichte"],
      mode: "quiet",
      dwell: 5,
      appeal: 1,
      teaser: `Vor einem Wohnhaus erinnern ${n} kleine Messingplatten an Menschen, die hier lebten.`,
      wayfinding: `Geht zur Hausnummer ${g.address.replace(/^.*?\s(\d+\w?)$/, "$1")} und schaut vor dem Eingang auf den Gehweg.`,
      riddle: `Vor ${g.address} glänzen ${n} kleine Messingplatten im Gehweg.`,
      tasks,
      snack: `Vor diesem Haus liegen ${n} Stolpersteine. Sie erinnern an ${g.people
        .map((p) => p.name)
        .join(", ")
        .replace(/, ([^,]*)$/, " und $1")}.`,
      images: [],
      sources: [
        ...g.wikidata.slice(0, 3).map(WIKIDATA),
        "https://www.stolpersteine-hamburg.de/",
      ],
      origin: "stolperstein",
    } satisfies Station;
  });

export const OPEN_STATIONS: Station[] = [...TAFEL_STATIONS, ...STONE_STATIONS];

/** Tafeltexte für bestehende Stationen (die Tafel hängt genau dort) */
export function tafelNear(coords: LatLng, maxM = 70): Tafel | undefined {
  const d = (a: LatLng, b: LatLng) => {
    const k = Math.cos((a[0] * Math.PI) / 180);
    return Math.hypot((a[0] - b[0]) * 111320, (a[1] - b[1]) * 111320 * k);
  };
  return TAFELN.filter(
    (t) => t.nearExisting && d(t.coords, coords) < maxM,
  ).sort((a, b) => d(a.coords, coords) - d(b.coords, coords))[0];
}

export const OPEN_POIS: Poi[] = [
  ...(kunstJson as unknown as Poi[]),
  ...(brunnenJson as unknown as Poi[]),
];
export const POI_INFO: Record<string, PoiInfo> =
  poiInfoJson as unknown as Record<string, PoiInfo>;
