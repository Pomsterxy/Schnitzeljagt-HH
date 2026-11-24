import type { Category, Station, Task } from './types';

/**
 * Such-Aufträge für die Jüngsten (6–9 Jahre): Sie brauchen kein Vorwissen, nur Augen.
 * Ergänzt wird nur dort, wo eine Station noch keine eigene Kinder-Aufgabe hat.
 */
const POOLS: Partial<Record<Category, string[]>> = {
  wasser: [
    'Wasser-Detektive: Findet ihr Enten, Schwäne, Boote oder Fische? Macht ein Foto von dem, was ihr zuerst entdeckt.',
    'Schaut aufs Wasser: Fließt es, oder steht es still? Werft ein kleines Blatt hinein und beobachtet es. Macht ein Foto davon.',
  ],
  architektur: [
    'Formen-Jagd: Sucht am Gebäude einen Kreis, ein Dreieck und einen Bogen. Macht ein Foto von der schönsten Form.',
    'Zählt die Stockwerke und sucht das kleinste Fenster. Macht ein Foto vom kleinsten Fenster, das ihr findet.',
    'Welche Farbe hat dieses Gebäude am meisten? Sucht etwas in genau dieser Farbe in eurer Nähe und fotografiert es.',
  ],
  technik: [
    'Erfinder-Blick: Sucht etwas, das sich drehen, öffnen oder bewegen kann (Rad, Tür, Klappe …). Macht ein Foto davon.',
    'Sucht Schrauben, Nieten oder Bolzen. Wer findet die größte? Macht ein Foto.',
  ],
  natur: [
    'Natur-Bingo: Findet ein Blatt, einen Stein und etwas Weiches. Legt alles nebeneinander und macht ein Foto.',
    'Sucht den dicksten Baum in der Nähe. Wie viele Kinder braucht ihr, um ihn zu umarmen? Macht ein Foto.',
  ],
  kultur: [
    'Sucht Buchstaben oder Zahlen an diesem Ort. Findet ihr den Anfangsbuchstaben eures Namens? Macht ein Foto davon.',
    'Macht ein lustiges Foto: Stellt euch so hin, wie eine Figur, ein Schild oder ein Bild hier aussieht.',
  ],
  geschichte: [
    'Zeitreise: Sucht etwas, das richtig alt aussieht, und etwas ganz Neues. Macht von beidem ein Foto.',
    'Sucht eine Jahreszahl, ein Schild oder eine Inschrift. Macht ein Foto und fragt die Großen, was es bedeutet.',
  ],
  spass: ['Macht das lustigste Gruppenfoto des Tages: Alle machen ein Gesicht, das zu diesem Ort passt!'],
};
const FALLBACK = 'Ich sehe was, was du nicht siehst: Ein Kind wählt etwas aus, die anderen raten. Macht danach ein Foto davon.';

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export function withKidsTask(s: Station): Station {
  if (s.mode !== 'normal' || s.tasks.some((t) => t.level === 'kids')) return s;
  const pool = s.categories.flatMap((c) => POOLS[c] ?? []);
  const question = pool.length ? pool[hash(s.id) % pool.length] : FALLBACK;
  const task: Task = { id: `${s.id}-kids`, type: 'photo', level: 'kids', question };
  return { ...s, tasks: [...s.tasks, task] };
}
