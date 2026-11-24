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

/** Eigene Gesprächsfrage für jede normale Station (passt genau zum Ort; Gedenkorte nutzen die behutsamen Fragen oben) */
export const STATION_TALK: Record<string, Talk> = {
  planetarium: { kind: 'frage', text: 'Früher war hier Wasser drin, heute die Sterne. Wenn ihr einem Stern einen Namen geben dürftet: Wie hieße er und warum?' },
  pinguinbrunnen: { kind: 'frage', text: 'Pinguine mitten in Hamburg! Welches Tier würdet ihr als Brunnenfigur in eure Straße stellen?' },
  fabeltier: { kind: 'these', text: 'Ein Spielplatz braucht Kunst, nicht nur Klettergerüste.', nudge: 'Das Fabeltier wurde einmal entfernt und kam zurück. Warum ist es gut, dass es wieder da ist?' },
  trinkhalle: { kind: 'frage', text: 'Früher kamen die Leute hierher, um gesundes Heilwasser zu trinken. Was macht euch gesund und munter, außer Wasser?' },
  'landhaus-walter': { kind: 'frage', text: 'Dieses Haus ist über 100 Jahre alt und immer noch ein Treffpunkt. Wo trefft ihr euch am liebsten mit Freunden?' },
  stadtparksee: { kind: 'frage', text: 'Ihr bekommt die Liebesinsel für einen Tag. Was macht ihr dort?' },
  'diana-hirschkuh': { kind: 'frage', text: 'Diana war die Göttin der Jagd. Wenn ihr Göttinnen oder Götter von etwas Alltäglichem wärt: wovon?' },
  'heine-denkmal': { kind: 'these', text: 'Man sollte nur Denkmäler für Menschen bauen, die etwas Gutes getan haben.', nudge: 'Heines Denkmal wurde entfernt, weil er Jude war. Was sagt das über die Zeit damals?' },
  stadthalle: { kind: 'frage', text: 'Hier stand eine Stadthalle, die es nicht mehr gibt. Welches Gebäude in eurer Nähe würdet ihr vermissen, wenn es verschwände?' },
  stadthallenbruecke: { kind: 'frage', text: 'Wenn ihr eine Brücke mit Tieren schmücken dürftet: Welche Tiere kämen drauf?' },
  kranzhaus: { kind: 'these', text: 'Alle Häuser einer Siedlung sollten gleich aussehen.', nudge: 'Die Jarrestadt wurde für viele Familien auf einmal gebaut. Was ist praktisch daran, was langweilig?' },
  kampnagel: { kind: 'frage', text: 'Aus einer Fabrik wurde ein Theater. Was würdet ihr aus einem leeren Fabrikgebäude machen?' },
  wiesendammbruecke: { kind: 'frage', text: 'Fritz Schumacher hat fast alles aus rotem Klinker gebaut. Was ist euer Lieblingsmaterial: Holz, Stein, Glas oder Lego?' },
  faehrhaus: { kind: 'frage', text: 'Früher wurde hier getanzt. Welches Lied würdet ihr heute als Familie zusammen tanzen?' },
  marktplatz: { kind: 'frage', text: 'Was würdet ihr auf einem Markt verkaufen, wenn ihr einen eigenen Stand hättet?' },
  'winterhuder-bruecke': { kind: 'frage', text: 'Erst Pferdebahn, dann Straßenbahn, heute Busse. Wie kommt man hier wohl in 50 Jahren über die Brücke?' },
  sierichstrasse: { kind: 'these', text: 'Mehr Straßen sollten zu bestimmten Zeiten nur für Fahrräder und Fußgänger da sein.', nudge: 'Die Sierichstraße wechselt jeden Tag die Richtung. Welche verrückte Verkehrsregel würdet ihr erfinden?' },
  'arne-jacobsen': { kind: 'frage', text: 'Arne Jacobsen hat Häuser UND Stühle entworfen. Was würdet ihr gern selbst entwerfen?' },
  'city-nord-park': { kind: 'frage', text: 'Der Park ist so groß wie 14 Fußballfelder. Welches Spiel würdet ihr hier mit ganz vielen Leuten spielen?' },
  sporthalle: { kind: 'frage', text: 'Hier fanden große Spiele und Konzerte statt. Wen würdet ihr gern einmal live sehen?' },
  'museum-arbeit': { kind: 'frage', text: 'Was arbeiten die Erwachsenen von euch – und was wollen die Kinder später einmal werden?' },
  trude: { kind: 'frage', text: 'TRUDE hat sich durch die Erde unter der Elbe gebohrt. Wohin würdet ihr einen Tunnel bauen?' },
  'bahnhof-barmbek': { kind: 'frage', text: 'Jeden Tag steigen hier etwa 70.000 Menschen um. Wohin würdet ihr am liebsten mit der Bahn fahren?' },
  'von-elm-hof': { kind: 'these', text: 'Wohnungen sollten Menschen gehören, die darin wohnen, und nicht Firmen.', nudge: 'Der Wohnblock gehört einer Genossenschaft. Was ist eine Genossenschaft eigentlich?' },
  'wasserturm-barmbek': { kind: 'frage', text: 'Im Turm passten so viel Wasser wie in 3.000 Badewannen. Was würdet ihr mit so viel Wasser anstellen?' },
  auferstehungskirche: { kind: 'frage', text: 'Diese Kirche wurde gebaut, weil es so viele Menschen in Barmbek gab. Wo kommen in eurem Ort viele Menschen zusammen?' },
  hellbrook: { kind: 'frage', text: 'Früher fuhren Lastkähne über den Kanal. Was würdet ihr heute mit einem Boot transportieren?' },
  'rothe-gymnasium': { kind: 'frage', text: 'Die Schule trägt den Namen einer mutigen jungen Frau. Nach wem würdet ihr eure Schule benennen – und warum?' },
  feuerwache: { kind: 'frage', text: 'Feuerwehrleute müssen in Sekunden losfahren. Was würdet ihr in einem Notfall als Erstes einpacken?' },
  'traute-lafrenz': { kind: 'frage', text: 'Traute Lafrenz war mutig, als viele weggeschaut haben. Wann habt ihr schon einmal Mut gebraucht?' },
  skagerrak: { kind: 'frage', text: 'Hamburg hat mehr Brücken als Venedig. Welche Stadt würdet ihr gern einmal besuchen und warum?' },
  'martin-luther': { kind: 'frage', text: 'Diese Kirche ist auch ein Gemeindezentrum. Was müsste es an einem Ort geben, an dem sich alle Nachbarn wohlfühlen?' },
  krematorium: { kind: 'frage', text: 'Ein Gebäude mit acht Ecken – warum bauen Menschen manche Häuser so besonders?' },
  lichtwarkschule: { kind: 'frage', text: 'Die Lichtwarkschule wollte neue Wege beim Lernen gehen. Wie sähe eure Traumschule aus?' },
  matthaeuskirche: { kind: 'frage', text: 'Winterhude bekam erst 1899 einen eigenen Pastor. Was braucht ein Stadtteil, damit er sich wie ein eigenes Dorf anfühlt?' },
  epiphanienkirche: { kind: 'these', text: 'Eine Kirche darf modern aussehen.', nudge: 'Wie sieht für euch ein Raum aus, in dem man zur Ruhe kommt?' },
  'paul-gerhardt': { kind: 'frage', text: 'Paul Gerhardt hat Lieder geschrieben, die bis heute gesungen werden. Welches Lied sollte man in 300 Jahren noch kennen?' },
  'ueberseering-35': { kind: 'frage', text: 'Hier saßen früher tausende Büroleute in einem Haus. Möchtet ihr später lieber drinnen oder draußen arbeiten?' },
  'edeka-gebaeude': { kind: 'frage', text: 'Die Balkone sind Fluchtwege für den Notfall. Wie sieht euer Fluchtplan aus, wenn zu Hause der Rauchmelder piept?' },
  'u-sierichstrasse': { kind: 'frage', text: 'Diesen Bahnhof gibt es seit 1912. Was würdet ihr auf einen Bahnhof von heute schreiben, damit man in 100 Jahren an euch denkt?' },
  'schule-tieloh': { kind: 'these', text: 'Schulen ohne Noten sind besser.', nudge: 'Wie merkt man auch ohne Zeugnis, dass man etwas gut kann?' },
};
