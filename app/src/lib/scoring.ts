import type { AgeGroup, Station, Task } from '../data/types';

export const POINTS = {
  task: 10,
  estimateMax: 15,
  photo: 10,
  hint: 3,
  hotCold: 2,
  mapPeek: 5,
  noHelpBonus: 5,
  /** zweiter Versuch gibt halbe Punkte */
  secondTry: 0.5,
};

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]/g, '');
}

export interface Evaluation {
  correct: boolean;
  /** 0..1 Anteil der Punkte */
  quality: number;
  message: string;
}

export function evaluate(task: Task, value: string | number): Evaluation {
  switch (task.type) {
    case 'quiz': {
      const ok = Number(value) === task.correct;
      return { correct: ok, quality: ok ? 1 : 0, message: ok ? 'Richtig!' : 'Leider falsch.' };
    }
    case 'number': {
      const n = Number(String(value).replace(',', '.'));
      const diff = Math.abs(n - task.answer);
      const exact = diff <= (task.tolerance ?? 0);
      // Zählen vor Ort: Es kann ein Stein dazugekommen oder ein Fenster verdeckt sein.
      // Kleine Zahlen (keine Jahreszahlen) werten wir deshalb großzügig.
      const generous = task.answer <= 100 ? Math.max(task.tolerance ?? 0, task.answer >= 5 ? 1 : 0, Math.round(task.answer * 0.1)) : task.tolerance ?? 0;
      const ok = exact || diff <= generous;
      return {
        correct: ok,
        quality: ok ? 1 : 0,
        message: exact
          ? 'Genau!'
          : ok
            ? `Gilt! In unseren Unterlagen steht ${task.answer}. Vor Ort kann sich etwas verändert haben.`
            : n < task.answer
              ? 'Es sind mehr.'
              : 'Es sind weniger.',
      };
    }
    case 'text': {
      const v = normalize(String(value));
      const ok = v.length > 0 && task.accept.some((a) => {
        const na = normalize(a);
        return v === na || (na.length >= 5 && v.includes(na));
      });
      return { correct: ok, quality: ok ? 1 : 0, message: ok ? 'Richtig!' : 'Das stimmt noch nicht.' };
    }
    case 'estimate': {
      const n = Number(String(value).replace(',', '.'));
      const dev = Math.abs(n - task.answer) / Math.max(Math.abs(task.answer), 1);
      const tol = (task.tolerance ?? 10) / 100;
      let quality: number;
      if (dev <= tol) quality = 1;
      else if (dev >= tol * 5) quality = 0.1;
      else quality = Math.max(0.1, 1 - (dev - tol) / (tol * 4));
      const message =
        quality === 1
          ? 'Volltreffer – super geschätzt!'
          : quality > 0.6
            ? 'Ganz schön nah dran!'
            : quality > 0.3
              ? 'Nicht schlecht, aber da geht noch was.'
              : 'Da lagt ihr ziemlich daneben – macht nichts!';
      // Schätzfragen sind nie "falsch": man bekommt immer etwas
      return { correct: true, quality, message: `${message} Richtig sind ${task.answer} ${task.unit}.` };
    }
    case 'photo':
    case 'reflection':
      return { correct: true, quality: 1, message: 'Danke!' };
  }
}

export function taskMaxPoints(task: Task): number {
  if (task.type === 'estimate') return POINTS.estimateMax;
  if (task.type === 'photo') return POINTS.photo;
  if (task.type === 'reflection') return 0;
  return POINTS.task;
}

/** Punkte für eine gelöste Aufgabe */
export function scoreTask(task: Task, quality: number, attempt: number, hintsUsed: number): number {
  const max = taskMaxPoints(task);
  if (!max) return 0;
  let p = max * quality;
  if (attempt > 1) p *= POINTS.secondTry;
  p -= hintsUsed * POINTS.hint;
  return Math.max(task.type === 'estimate' ? 1 : 0, Math.round(p));
}

/**
 * Welche Aufgaben eine Gruppe sieht. Die jüngste Altersstufe bestimmt die Grundstufe:
 * kleine Kinder bekommen kids+all, nur Erwachsene all+pro.
 */
export function tasksFor(station: Station, youngest: AgeGroup): Task[] {
  const allowed =
    youngest === 'kids' ? ['kids', 'all'] : youngest === 'tweens' ? ['kids', 'all', 'pro'] : ['all', 'pro'];
  const list = station.tasks.filter((t) => allowed.includes(t.level ?? 'all'));
  // Bei Tweens nicht zu viele: kids-Aufgaben nur, wenn es keine pro-Aufgabe gibt
  if (youngest === 'tweens') {
    const hasPro = list.some((t) => t.level === 'pro');
    return list.filter((t) => !(hasPro && t.level === 'kids'));
  }
  return list.length ? list : station.tasks;
}

export function youngestGroup(groups: AgeGroup[]): AgeGroup {
  if (groups.includes('kids')) return 'kids';
  if (groups.includes('tweens')) return 'tweens';
  return 'adults';
}

/** Gehtempo nach jüngster Altersstufe */
export function speedFor(youngest: AgeGroup): number {
  return youngest === 'kids' ? 3 : youngest === 'tweens' ? 3.8 : 4.3;
}
