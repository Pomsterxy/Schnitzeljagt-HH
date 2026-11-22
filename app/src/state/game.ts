import { useSyncExternalStore } from 'react';
import type { AgeGroup, DistrictId, LatLng, Poi, Station, Task } from '../data/types';
import { POI_BY_ID, STATION_BY_ID, STATIONS } from '../data';
import { BADGES, type BadgeContext } from '../data/badges';
import { distance } from '../lib/geo';
import type { Route } from '../lib/route';
import { evaluate, POINTS, scoreTask, type Evaluation } from '../lib/scoring';
import { deletePhotos, loadJSON, removeKey, saveJSON } from '../lib/storage';

export interface Member {
  name: string;
  age: AgeGroup;
}

export interface Team {
  name: string;
  avatar: string;
  members: Member[];
}

export type NavMode = 'map' | 'adventure';

export interface TourConfig {
  districts: DistrictId[];
  minutes: number;
  nav: NavMode;
  includeQuiet: boolean;
  includePause: boolean;
  pin: string;
  start: LatLng;
  startLabel: string;
  seed: number;
}

export interface TaskState {
  done: boolean;
  points: number;
  attempts: number;
  hints: number;
  answer?: string;
  quality?: number;
  correct?: boolean;
}

export interface StopState {
  unlockedBy?: 'gps' | 'pin';
  unlockedAt?: number;
  tasks: Record<string, TaskState>;
  hotCold: number;
  mapPeek: number;
  wayfinding: boolean;
  done: boolean;
  skipped?: boolean;
  bonus: number;
}

export interface StopRef {
  kind: 'station' | 'pause';
  id: string;
}

export interface Game {
  version: 1;
  id: string;
  startedAt: number;
  finishedAt?: number;
  team: Team;
  config: TourConfig;
  stops: StopRef[];
  plannedMeters: number;
  plannedMinutes: number;
  index: number;
  stopStates: Record<string, StopState>;
  points: number;
  meters: number;
  lastPos?: LatLng;
  photos: { id: string; stopId: string; taskId: string; title: string }[];
  perfectEstimates: number;
  earnedBadges: string[];
}

export interface Career {
  points: number;
  tours: number;
  collected: string[];
  badges: string[];
}

const GAME_KEY = 'hh-hunt:game';
const CAREER_KEY = 'hh-hunt:career';
const TEAM_KEY = 'hh-hunt:lastTeam';

let game: Game | null = loadJSON<Game | null>(GAME_KEY, null);
let career: Career = loadJSON<Career>(CAREER_KEY, { points: 0, tours: 0, collected: [], badges: [] });
const listeners = new Set<() => void>();
let snapshot = { game, career };

function commit() {
  saveJSON(GAME_KEY, game);
  saveJSON(CAREER_KEY, career);
  snapshot = { game, career };
  listeners.forEach((l) => l());
}

export function useGame() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => snapshot,
  );
}

export function getGame(): Game | null {
  return game;
}

export function lastTeam(): Team | null {
  return loadJSON<Team | null>(TEAM_KEY, null);
}

function emptyStop(): StopState {
  return { tasks: {}, hotCold: 0, mapPeek: 0, wayfinding: false, done: false, bonus: 0 };
}

export function stopKey(s: StopRef) {
  return `${s.kind}:${s.id}`;
}

export function resolveStop(s: StopRef): { station?: Station; poi?: Poi } {
  return s.kind === 'station' ? { station: STATION_BY_ID.get(s.id) } : { poi: POI_BY_ID.get(s.id) };
}

export function stopCoords(s: StopRef): LatLng {
  const r = resolveStop(s);
  return (r.station?.coords ?? r.poi?.coords) as LatLng;
}

function mutate(fn: (g: Game) => void) {
  if (!game) return;
  const g: Game = structuredClone(game);
  fn(g);
  game = g;
  commit();
}

function st(g: Game, key: string): StopState {
  if (!g.stopStates[key]) g.stopStates[key] = emptyStop();
  return g.stopStates[key];
}

export function startGame(team: Team, config: TourConfig, route: Route): void {
  saveJSON(TEAM_KEY, team);
  const old = game;
  if (old) void deletePhotos(old.photos.map((p) => p.id));
  game = {
    version: 1,
    id: Math.random().toString(36).slice(2, 10),
    startedAt: Date.now(),
    team,
    config,
    stops: route.stops.map((s) =>
      s.kind === 'station' ? { kind: 'station', id: s.station.id } : { kind: 'pause', id: s.poi.id },
    ),
    plannedMeters: route.meters,
    plannedMinutes: route.minutes,
    index: 0,
    stopStates: {},
    points: 0,
    meters: 0,
    photos: [],
    perfectEstimates: 0,
    earnedBadges: [],
  };
  commit();
}

export function abandonGame(): void {
  if (game) void deletePhotos(game.photos.map((p) => p.id));
  game = null;
  removeKey(GAME_KEY);
  commit();
}

export function currentStop(g: Game): StopRef | undefined {
  return g.stops[g.index];
}

export function unlockStop(by: 'gps' | 'pin'): void {
  mutate((g) => {
    const s = currentStop(g);
    if (!s) return;
    const ss = st(g, stopKey(s));
    if (ss.unlockedBy) return;
    ss.unlockedBy = by;
    ss.unlockedAt = Date.now();
    // Bonus fürs Finden ohne Hilfe (nur Abenteuermodus, nur normale Stationen)
    const station = resolveStop(s).station;
    if (
      station &&
      station.mode === 'normal' &&
      g.config.nav === 'adventure' &&
      ss.hotCold === 0 &&
      ss.mapPeek === 0 &&
      by === 'gps'
    ) {
      ss.bonus = POINTS.noHelpBonus;
      g.points += POINTS.noHelpBonus;
    }
  });
}

export function spendHelp(kind: 'hotCold' | 'mapPeek' | 'wayfinding', forceFree = false): void {
  mutate((g) => {
    const s = currentStop(g);
    if (!s) return;
    const ss = st(g, stopKey(s));
    const station = resolveStop(s).station;
    const free = forceFree || !station || station.mode === 'quiet' || g.config.nav === 'map';
    if (kind === 'wayfinding') {
      if (ss.wayfinding) return;
      ss.wayfinding = true;
      if (!free) g.points = Math.max(0, g.points - POINTS.hint);
      return;
    }
    ss[kind] += 1;
    if (!free) g.points = Math.max(0, g.points - (kind === 'hotCold' ? POINTS.hotCold : POINTS.mapPeek));
  });
}

export function takeTaskHint(taskId: string): void {
  mutate((g) => {
    const s = currentStop(g);
    if (!s) return;
    const ss = st(g, stopKey(s));
    const ts = (ss.tasks[taskId] ??= { done: false, points: 0, attempts: 0, hints: 0 });
    ts.hints += 1;
  });
}

/** Antwort prüfen. Bei falscher Antwort gibt es genau einen zweiten Versuch. */
export function answerTask(task: Task, value: string | number, quiet: boolean): Evaluation & { final: boolean; points: number } {
  let result: Evaluation & { final: boolean; points: number } = {
    correct: false,
    quality: 0,
    message: '',
    final: false,
    points: 0,
  };
  mutate((g) => {
    const s = currentStop(g);
    if (!s) return;
    const ss = st(g, stopKey(s));
    const ts = (ss.tasks[task.id] ??= { done: false, points: 0, attempts: 0, hints: 0 });
    if (ts.done) return;
    const ev = evaluate(task, value);
    ts.attempts += 1;
    const final = ev.correct || ts.attempts >= 2;
    let pts = 0;
    if (final) {
      ts.done = true;
      ts.correct = ev.correct;
      ts.quality = ev.quality;
      ts.answer = String(value);
      pts = quiet || !ev.correct ? 0 : scoreTask(task, ev.quality, ts.attempts, ts.hints);
      ts.points = pts;
      g.points += pts;
      if (task.type === 'estimate' && ev.quality === 1) g.perfectEstimates += 1;
    }
    result = { ...ev, final, points: pts };
  });
  return result;
}

export function completePhotoTask(taskId: string, photoId: string | null, quiet: boolean, title: string): number {
  let pts = 0;
  mutate((g) => {
    const s = currentStop(g);
    if (!s) return;
    const ss = st(g, stopKey(s));
    const ts = (ss.tasks[taskId] ??= { done: false, points: 0, attempts: 0, hints: 0 });
    if (ts.done) return;
    ts.done = true;
    ts.correct = true;
    ts.attempts = 1;
    // Ohne Foto (Kamera abgelehnt) gibt es halbe Punkte, damit niemand hängen bleibt
    pts = quiet ? 0 : photoId ? POINTS.photo : Math.round(POINTS.photo / 2);
    ts.points = pts;
    g.points += pts;
    if (photoId) g.photos.push({ id: photoId, stopId: stopKey(s), taskId, title });
  });
  return pts;
}

export function completeReflection(taskId: string, note: string): void {
  mutate((g) => {
    const s = currentStop(g);
    if (!s) return;
    const ss = st(g, stopKey(s));
    const ts = (ss.tasks[taskId] ??= { done: false, points: 0, attempts: 0, hints: 0 });
    ts.done = true;
    ts.correct = true;
    ts.answer = note;
  });
}

export function nextStop(skipped = false): void {
  mutate((g) => {
    const s = currentStop(g);
    if (!s) return;
    const ss = st(g, stopKey(s));
    ss.done = true;
    ss.skipped = skipped;
    if (!skipped && s.kind === 'station' && !career.collected.includes(s.id)) {
      career = { ...career, collected: [...career.collected, s.id] };
    }
    g.index += 1;
    const newly = computeBadges(g).filter((b) => !g.earnedBadges.includes(b));
    g.earnedBadges.push(...newly);
  });
}

export function finishGame(): void {
  mutate((g) => {
    if (g.finishedAt) return;
    g.finishedAt = Date.now();
    career = {
      ...career,
      points: career.points + g.points,
      tours: career.tours + 1,
    };
    const newly = computeBadges(g).filter((b) => !g.earnedBadges.includes(b));
    g.earnedBadges.push(...newly);
    career = { ...career, badges: Array.from(new Set([...career.badges, ...g.earnedBadges])) };
  });
}

/** Zurückgelegte Strecke aus GPS-Punkten aufsummieren (Rauschen ignorieren) */
export function trackPosition(coords: LatLng, accuracy: number): void {
  if (!game || game.finishedAt || accuracy > 50) return;
  if (!game.lastPos) {
    mutate((g) => {
      g.lastPos = coords;
    });
    return;
  }
  const d = distance(game.lastPos, coords);
  if (d < 20 || d > 2000) {
    if (d > 2000)
      mutate((g) => {
        g.lastPos = coords;
      });
    return;
  }
  mutate((g) => {
    g.meters += d;
    g.lastPos = coords;
  });
}

export function finishedStations(g: Game): Station[] {
  return g.stops
    .filter((s) => s.kind === 'station' && g.stopStates[stopKey(s)]?.done && !g.stopStates[stopKey(s)]?.skipped)
    .map((s) => STATION_BY_ID.get(s.id)!)
    .filter(Boolean);
}

export function badgeContext(g: Game): BadgeContext {
  const states = Object.values(g.stopStates);
  return {
    finished: finishedStations(g),
    collected: new Set(career.collected),
    allStations: STATIONS,
    meters: Math.max(g.meters, 0),
    hintsUsed: states.reduce((a, s) => a + Object.values(s.tasks).reduce((b, t) => b + t.hints, 0) + (s.wayfinding ? 1 : 0), 0),
    helpUsed: g.config.nav === 'adventure' ? states.reduce((a, s) => a + s.hotCold + s.mapPeek, 0) : 1,
    photos: g.photos.length,
    perfectEstimates: g.perfectEstimates,
    toursFinished: career.tours,
  };
}

function computeBadges(g: Game): string[] {
  const ctx = badgeContext(g);
  return BADGES.filter((b) => b.check(ctx)).map((b) => b.id);
}

export function resetCareer(): void {
  career = { points: 0, tours: 0, collected: [], badges: [] };
  commit();
}
