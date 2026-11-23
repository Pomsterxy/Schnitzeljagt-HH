import type { AgeGroup, Category } from './types';

/**
 * Gesprächsstoff für unterwegs: Fragen und Thesen, die zum Weiterdenken und Diskutieren anregen.
 * Es gibt keine richtigen oder falschen Antworten.
 * "kids" = für Familien mit Kindern 6–9, "older" = ab ca. 10 Jahren und Erwachsene.
 */
export interface Talk {
  kind: 'frage' | 'these';
  text: string;
  /** optionaler Denkanstoß nach dem Abstimmen bzw. Antippen */
  nudge?: string;
  age?: 'kids' | 'older';
}

export type TalkPool = Category | 'pause' | 'weg' | 'finish';

export const TALK: Record<TalkPool, Talk[]> = {
  architektur: [
    { kind: 'frage', text: 'Wenn dieses Haus sprechen könnte: Was würde es über die Menschen erzählen, die hier schon gewohnt oder gearbeitet haben?' },
    { kind: 'these', text: 'Ein Haus muss vor allem praktisch sein. Schön ist nur ein Extra.', nudge: 'Gibt es ein Gebäude, das ihr nur wegen seiner Schönheit mögt?' },
    { kind: 'frage', text: 'Ihr dürft ein Haus für eure Familie bauen, Geld spielt keine Rolle. Was muss es unbedingt haben?', age: 'kids' },
    { kind: 'frage', text: 'Warum sehen in Hamburg so viele Häuser rot aus? Und welche Farbe hätte eure Traumstadt?', age: 'kids' },
    { kind: 'these', text: 'Alte Gebäude sollten nie abgerissen werden, auch wenn sie keiner mehr braucht.', nudge: 'Was wäre ein guter neuer Zweck für ein altes Haus?', age: 'older' },
    { kind: 'frage', text: 'Welches Gebäude, das heute gebaut wird, schauen sich Menschen in 100 Jahren noch an – und warum?', age: 'older' },
    { kind: 'these', text: 'Man merkt einer Stadt an, ob die Menschen dort glücklich sind.', nudge: 'Woran würdet ihr das erkennen?' },
  ],
  wasser: [
    { kind: 'frage', text: 'Hamburg hat mehr Brücken als Venedig. Wenn ihr eine Brücke bauen dürftet: Wohin würde sie führen?' },
    { kind: 'these', text: 'Wasser in der Stadt macht Menschen entspannter.', nudge: 'Wo fühlt ihr euch am ruhigsten – und warum?' },
    { kind: 'frage', text: 'Stellt euch vor, die Alster wäre plötzlich ein Fluss aus Kakao. Was würde in der Stadt passieren?', age: 'kids' },
    { kind: 'frage', text: 'Welches Tier, das im Wasser lebt, wärt ihr gern für einen Tag?', age: 'kids' },
    { kind: 'these', text: 'In 50 Jahren fahren in Hamburg mehr Menschen mit dem Boot zur Arbeit als mit dem Auto.', nudge: 'Was müsste sich dafür ändern?', age: 'older' },
    { kind: 'frage', text: 'Früher waren die Kanäle Transportwege, heute fahren dort Kanus. Welche Dinge benutzen wir heute ganz anders als früher?', age: 'older' },
  ],
  technik: [
    { kind: 'frage', text: 'Welche Erfindung würdet ihr am meisten vermissen, wenn es sie plötzlich nicht mehr gäbe?' },
    { kind: 'these', text: 'Maschinen machen das Leben einfacher, aber nicht glücklicher.', nudge: 'Fällt euch ein Beispiel für beides ein?' },
    { kind: 'frage', text: 'Ihr dürft eine Maschine erfinden, die euch im Alltag hilft. Was macht sie?', age: 'kids' },
    { kind: 'frage', text: 'Wie sind die Menschen wohl vor 100 Jahren durch Hamburg gekommen – und wie in 100 Jahren?', age: 'kids' },
    { kind: 'these', text: 'Kinder sollten in der Schule mehr Werkzeug als Tablets benutzen.', nudge: 'Was habt ihr zuletzt mit den eigenen Händen gebaut?', age: 'older' },
    { kind: 'frage', text: 'Welcher Beruf, den es heute gibt, wird bald verschwinden – und welcher kommt neu dazu?', age: 'older' },
  ],
  kultur: [
    { kind: 'frage', text: 'Wenn ihr für diesen Platz ein Kunstwerk erschaffen dürftet: Was wäre es?' },
    { kind: 'these', text: 'Kunst muss man nicht verstehen, um sie gut zu finden.', nudge: 'Welches Kunstwerk, Lied oder Bild mögt ihr, ohne genau zu wissen warum?' },
    { kind: 'frage', text: 'Welches Tier sollte als Nächstes eine Statue in Hamburg bekommen?', age: 'kids' },
    { kind: 'frage', text: 'Erfindet zusammen eine Geschichte, wie diese Figur hierhergekommen ist. Jeder sagt einen Satz!', age: 'kids' },
    { kind: 'these', text: 'Graffiti ist auch Kunst.', nudge: 'Wo ist die Grenze zwischen Kunst und Schmiererei?', age: 'older' },
    { kind: 'frage', text: 'Was gehört für euch unbedingt zu einer guten Geschichte?', age: 'older' },
  ],
  natur: [
    { kind: 'frage', text: 'Welches Geräusch der Natur hört ihr gerade? Schließt kurz die Augen und lauscht.' },
    { kind: 'these', text: 'Ein Park ist wichtiger für eine Stadt als ein Einkaufszentrum.', nudge: 'Was macht ihr am liebsten draußen?' },
    { kind: 'frage', text: 'Wenn Bäume reden könnten: Was würde der älteste Baum hier erzählen?', age: 'kids' },
    { kind: 'frage', text: 'Welches Tier würdet ihr gern in den Stadtpark einladen?', age: 'kids' },
    { kind: 'these', text: 'Jedes Haus sollte ein grünes Dach haben.', nudge: 'Was spricht dafür, was dagegen?', age: 'older' },
    { kind: 'frage', text: 'Wo erlebt ihr Natur im Alltag, ohne es zu merken?', age: 'older' },
  ],
  geschichte: [
    { kind: 'frage', text: 'In welcher Zeit hättet ihr gern einen Tag in Hamburg verbracht – und was würdet ihr dort machen?' },
    { kind: 'these', text: 'Früher war nicht alles besser, aber manches.', nudge: 'Fragt die Ältesten: Was war in ihrer Kindheit anders?' },
    { kind: 'frage', text: 'Was spielen Kinder heute, was es vor 100 Jahren noch nicht gab? Und umgekehrt?', age: 'kids' },
    { kind: 'frage', text: 'Wenn ihr eine Zeitkapsel vergraben würdet: Welche drei Dinge kämen hinein?', age: 'kids' },
    { kind: 'these', text: 'Aus der Geschichte kann man lernen, wie man es besser macht.', nudge: 'Fällt euch ein Beispiel ein, wo das geklappt hat – oder nicht?', age: 'older' },
    { kind: 'frage', text: 'Welches Ereignis aus eurem Leben sollte man in 50 Jahren noch kennen?', age: 'older' },
  ],
  erinnern: [
    { kind: 'frage', text: 'Warum ist es wichtig, die Namen von Menschen zu kennen und nicht nur Zahlen?' },
    { kind: 'frage', text: 'Was können wir heute tun, damit alle Menschen sicher und frei leben können?' },
    { kind: 'frage', text: 'Was bedeutet es, mutig zu sein, wenn andere ungerecht behandelt werden?' },
    { kind: 'frage', text: 'Wie fühlt es sich an, ausgeschlossen zu werden? Wie können wir anderen helfen, dazuzugehören?', age: 'kids' },
    { kind: 'frage', text: 'Warum liegen die Stolpersteine genau vor den Häusern, in denen die Menschen gewohnt haben?', age: 'kids' },
    { kind: 'frage', text: 'Was hätte damals helfen können, dass Nachbarn nicht weggeschaut hätten?', age: 'older' },
    { kind: 'frage', text: 'Wie erinnern wir uns in Zukunft, wenn es keine Zeitzeugen mehr gibt?', age: 'older' },
  ],
  spass: [
    { kind: 'frage', text: 'Wenn Lilli eine Superkraft hätte: Welche wäre es?' },
    { kind: 'these', text: 'Erwachsene sollten öfter auf Spielplätze dürfen.', nudge: 'Wer traut sich als Nächstes auf die Rutsche?' },
    { kind: 'frage', text: 'Was ist das Lustigste, das euch dieses Jahr passiert ist?' },
  ],
  weg: [
    { kind: 'frage', text: 'Was war bisher euer Lieblingsort auf dieser Tour – und warum?' },
    { kind: 'these', text: 'Zu Fuß sieht man mehr als mit dem Fahrrad.', nudge: 'Was habt ihr heute entdeckt, das euch sonst nie aufgefallen wäre?' },
    { kind: 'frage', text: 'Wenn ihr Bürgermeisterin oder Bürgermeister von Hamburg wärt: Was würdet ihr als Erstes ändern?' },
    { kind: 'frage', text: 'Welche Straße würdet ihr umbenennen – und wie soll sie heißen?', age: 'kids' },
    { kind: 'frage', text: 'Wenn eure Familie eine Band wäre: Wie hieße sie und wer spielt welches Instrument?', age: 'kids' },
    { kind: 'these', text: 'Man sollte jedes Jahr etwas komplett Neues ausprobieren.', nudge: 'Was wäre euer Neues für dieses Jahr?', age: 'older' },
    { kind: 'frage', text: 'Was macht einen Ort zu einem Zuhause?', age: 'older' },
  ],
  pause: [
    { kind: 'frage', text: 'Ihr dürft eine neue Eissorte erfinden. Wie heißt sie und was ist drin?' },
    { kind: 'frage', text: 'Wenn ihr einen Tag lang die Rollen tauschen würdet – Kinder sind Eltern und umgekehrt –, was würde passieren?' },
    { kind: 'these', text: 'Pausen sind genauso wichtig wie Arbeit.', nudge: 'Wie sieht für euch die perfekte Pause aus?' },
    { kind: 'frage', text: 'Welches Spiel habt ihr als Kinder gespielt? Erwachsene zuerst!' },
    { kind: 'frage', text: 'Was wäre euer perfekter Familientag von morgens bis abends?', age: 'kids' },
    { kind: 'these', text: 'Langeweile ist gut für die Fantasie.', nudge: 'Wann hattet ihr zuletzt so richtig Langeweile – und was kam dabei heraus?', age: 'older' },
  ],
  finish: [
    { kind: 'frage', text: 'Welcher Ort von heute hat euch am meisten überrascht?' },
    { kind: 'frage', text: 'Was erzählt ihr heute Abend als Erstes, wenn jemand fragt, wie euer Tag war?' },
    { kind: 'frage', text: 'Wohin soll eure nächste Entdeckungstour gehen?' },
    { kind: 'frage', text: 'Wer aus eurem Team war heute der beste Spürhund – und warum?', age: 'kids' },
    { kind: 'frage', text: 'Was habt ihr heute über eure Stadt gelernt, das ihr vorher nicht wusstet?', age: 'older' },
  ],
};

function poolList(pools: TalkPool[], youngest: AgeGroup): Talk[] {
  const want = youngest === 'kids' ? 'kids' : 'older';
  const list = pools.flatMap((p) => TALK[p] ?? []).filter((t) => !t.age || t.age === want);
  return list.length ? list : TALK.weg;
}

/**
 * Deterministisch eine passende Frage wählen (gleicher Ort + gleiche Tour = gleiche Frage).
 * Bereits gestellte Fragen (exclude) werden übersprungen, solange es noch andere gibt.
 */
export function pickTalk(pools: TalkPool[], seed: number, youngest: AgeGroup, offset = 0, exclude: string[] = []): Talk {
  const all = poolList(pools, youngest);
  const fresh = all.filter((t) => !exclude.includes(t.text));
  const list = fresh.length ? fresh : all;
  return list[Math.abs(seed + offset) % list.length];
}

/** Fragen für eine ganze Tour, ohne Wiederholung: eine Liste von Pools pro Halt */
export function talksForTour(stops: TalkPool[][], seed: number, youngest: AgeGroup): Talk[] {
  const used: string[] = [];
  return stops.map((pools, i) => {
    const t = pickTalk(pools, seed + i * 7, youngest, 0, used);
    used.push(t.text);
    return t;
  });
}

/** Zahl aus einem Text (für stabile Auswahl pro Station) */
export function hashId(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
