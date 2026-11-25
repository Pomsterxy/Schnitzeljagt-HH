export type DistrictId = 'winterhude' | 'barmbek-nord' | 'alsterdorf';

export type AgeGroup = 'kids' | 'tweens' | 'adults';

/** Welche Altersstufen eine Aufgabe sehen. Fehlt das Feld, sehen sie alle. */
export type TaskLevel = 'kids' | 'all' | 'pro';

export type LatLng = [number, number];

interface TaskBase {
  id: string;
  level?: TaskLevel;
  question: string;
  hints?: string[];
  /** Erklärung nach dem Lösen */
  explanation?: string;
}

export interface QuizTask extends TaskBase {
  type: 'quiz';
  options: string[];
  correct: number;
}

export interface EstimateTask extends TaskBase {
  type: 'estimate';
  answer: number;
  unit: string;
  /** Prozentuale Abweichung, bei der es noch volle Punkte gibt */
  tolerance?: number;
  min: number;
  max: number;
}

export interface NumberTask extends TaskBase {
  type: 'number';
  answer: number;
  /** Absolute Toleranz (z. B. ±1 beim Zählen) */
  tolerance?: number;
}

export interface TextTask extends TaskBase {
  type: 'text';
  /** Akzeptierte Antworten (Groß-/Kleinschreibung und Umlaute egal) */
  accept: string[];
}

export interface PhotoTask extends TaskBase {
  type: 'photo';
}

export interface ReflectionTask extends TaskBase {
  type: 'reflection';
}

export type Task = QuizTask | EstimateTask | NumberTask | TextTask | PhotoTask | ReflectionTask;

export interface ImageRef {
  file: string;
  author: string;
  license: string;
  source: string;
}

export type Category = 'geschichte' | 'architektur' | 'natur' | 'wasser' | 'kultur' | 'technik' | 'erinnern' | 'spass';

export interface Station {
  id: string;
  district: DistrictId;
  title: string;
  coords: LatLng;
  /** Freischaltradius in Metern */
  radius: number;
  categories: Category[];
  /** quiet = Gedenkort: ruhiger Modus ohne Punkte */
  mode: 'normal' | 'quiet';
  /** Verweildauer vor Ort in Minuten */
  dwell: number;
  /** 1–5: wie spannend für Familien */
  appeal: number;
  /** Kurzbeschreibung, die schon vor der Ankunft sichtbar sein darf (ohne Lösung) */
  teaser: string;
  /** Wegbeschreibung über örtliche Merkmale (letzte ~200 m) */
  wayfinding: string;
  /** Rätsel, das auf diesen Ort hinführt */
  riddle: string;
  tasks: Task[];
  /** Info-Snack nach der Freischaltung */
  snack: string;
  /** Zusätzlicher Fakt für Kinder */
  kidsFact?: string;
  /** Bild-IDs → public/img/stations/<id>.jpg, Lizenz in credits.json */
  images: string[];
  sources: string[];
  /** Quellenangabe ohne Link (z. B. Lizenzhinweis einer Behörde) */
  attribution?: string;
  /** Text der blauen Denkmaltafel, die an dieser Station hängt */
  tafel?: string;
  /** Aus offenen Daten erzeugt (Denkmaltafel, Stolpersteine): nicht im Album */
  origin?: 'tafel' | 'stolperstein';
}

export type PoiKind = 'spielplatz' | 'eis' | 'wc' | 'cafe' | 'kunst' | 'trinkwasser';

export interface Poi {
  id: string;
  kind: PoiKind;
  title: string;
  coords: LatLng;
  district: DistrictId;
  note?: string;
  /** Kunstwerke (Wikidata) */
  creator?: string;
  year?: number;
}

export interface StartPoint {
  id: string;
  title: string;
  coords: LatLng;
  district: DistrictId;
}

export interface District {
  id: DistrictId;
  name: string;
  center: LatLng;
  intro: string;
}
