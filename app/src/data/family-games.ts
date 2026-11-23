/**
 * Familien-Momente: kleine gemeinsame Spiele, die ab und zu an einer Station auftauchen.
 * Sie funktionieren an jedem Ort und brauchen kein Material.
 */
export type FamilyGameKind = 'simple' | 'timer' | 'photo' | 'freeze';

export interface FamilyGame {
  id: string;
  title: string;
  kind: FamilyGameKind;
  /** Was Lilli dazu sagt */
  lilli: string;
  /** Spielanleitung in kurzen Schritten */
  steps: string[];
  /** Für Timer-Spiele */
  seconds?: number;
  /** Für Freeze: Anzahl Runden */
  rounds?: number;
}

export const FAMILY_GAMES: FamilyGame[] = [
  {
    id: 'versteck',
    title: 'Mini-Versteckspiel',
    kind: 'timer',
    seconds: 120,
    lilli: 'Psst … Zeit für ein kleines Versteckspiel!',
    steps: [
      'Einer versteckt einen kleinen Gegenstand (Taschentuch, Schlüssel, Stein) in Sichtweite.',
      'Alle anderen drehen sich um und zählen laut bis 20.',
      'Dann wird gesucht! Der Verstecker darf „heiß“ und „kalt“ rufen.',
      'Schafft ihr es in 2 Minuten?',
    ],
  },
  {
    id: 'freeze',
    title: 'Lillis Freeze-Tanz',
    kind: 'freeze',
    rounds: 3,
    lilli: 'Ich mache Musik – und wenn sie stoppt, erstarrt ihr zur Statue!',
    steps: [
      'Sobald Lillis Musik spielt, tanzen alle.',
      'Stoppt die Musik: sofort einfrieren wie eine Statue!',
      'Wer wackelt, muss in der nächsten Runde eine lustige Pose machen.',
    ],
  },
  {
    id: 'ich-sehe',
    title: 'Ich sehe was, was du nicht siehst',
    kind: 'simple',
    lilli: 'Hier gibt es so viel zu entdecken. Wer hat die schärfsten Augen?',
    steps: [
      'Einer sucht sich etwas an diesem Ort aus und sagt: „Ich sehe was, was du nicht siehst, und das ist …“ plus eine Farbe.',
      'Die anderen raten reihum.',
      'Wer es errät, ist als Nächstes dran. Spielt zwei oder drei Runden.',
    ],
  },
  {
    id: 'grimassen-selfie',
    title: 'Grimassen-Selfie',
    kind: 'photo',
    lilli: 'Zeit für ein Erinnerungsfoto – aber bitte mit der verrücktesten Grimasse!',
    steps: [
      'Stellt euch alle zusammen, die Station soll im Hintergrund zu sehen sein.',
      'Auf „Moin!“ machen alle gleichzeitig ihre lustigste Grimasse.',
      'Das Foto landet im Familienalbum am Ende der Tour.',
    ],
  },
  {
    id: 'spiegel',
    title: 'Spiegel-Spiel',
    kind: 'timer',
    seconds: 60,
    lilli: 'Könnt ihr euch gegenseitig nachmachen wie ein Spiegel?',
    steps: [
      'Immer zwei stellen sich gegenüber, ein Kind ist der „Spiegel“.',
      'Der andere macht langsame Bewegungen, der Spiegel macht alles gleichzeitig nach.',
      'Nach 30 Sekunden wird getauscht.',
    ],
  },
  {
    id: 'lauschen',
    title: 'Geräusche-Detektive',
    kind: 'timer',
    seconds: 30,
    lilli: 'Pssst! Jetzt hören wir mal ganz genau hin …',
    steps: [
      'Alle schließen die Augen und sind 30 Sekunden ganz still.',
      'Zählt im Kopf, wie viele verschiedene Geräusche ihr hört.',
      'Danach erzählt jeder: Was habt ihr gehört? Wer hat die meisten?',
    ],
  },
  {
    id: 'komplimente',
    title: 'Komplimente-Runde',
    kind: 'simple',
    lilli: 'Eine Schatzsuche ist nur so gut wie ihr Team. Zeit für etwas Nettes!',
    steps: [
      'Stellt euch im Kreis auf.',
      'Jeder sagt der Person rechts neben sich, was er oder sie heute toll gemacht hat.',
      'Zum Schluss: einmal Team-Abklatschen in der Mitte!',
    ],
  },
  {
    id: 'foto-detektiv',
    title: 'Foto-Detektiv',
    kind: 'photo',
    lilli: 'Wer findet das Detail auf dem Foto?',
    steps: [
      'Einer fotografiert heimlich ein kleines Detail in der Nähe (ein Schild, eine Verzierung, ein Blatt).',
      'Zeigt das Foto den anderen: Wer findet die Stelle zuerst?',
      'Der Finder macht das nächste Detail-Foto.',
    ],
  },
  {
    id: 'pantomime',
    title: 'Pantomime-Station',
    kind: 'simple',
    lilli: 'Ohne Worte! Könnt ihr diesen Ort vorspielen?',
    steps: [
      'Jeder überlegt sich, was hier früher passiert sein könnte oder was man hier machen kann.',
      'Spielt es nacheinander ohne Worte vor.',
      'Die anderen raten, was gemeint ist.',
    ],
  },
  {
    id: 'schritte-schaetzen',
    title: 'Schritte-Schätzen',
    kind: 'simple',
    lilli: 'Wie gut könnt ihr Entfernungen schätzen?',
    steps: [
      'Sucht euch gemeinsam ein Ziel in der Nähe aus, zum Beispiel einen Baum oder eine Laterne.',
      'Jeder schätzt, wie viele Schritte es bis dorthin sind.',
      'Dann geht einer hin und zählt laut. Wer lag am nächsten dran?',
    ],
  },
  {
    id: 'farbjagd',
    title: 'Farbjagd',
    kind: 'timer',
    seconds: 60,
    lilli: 'Schnell! Ich rufe eine Farbe – und ihr sucht!',
    steps: [
      'Ein Erwachsener nennt eine Farbe, zum Beispiel Rot.',
      'Wer zuerst etwas in dieser Farbe berührt (sicher und ohne Straße!), bekommt einen Punkt.',
      'Spielt mehrere Farben, bis die Zeit um ist.',
    ],
  },
  {
    id: 'zeitreise',
    title: 'Zeitreise-Geschichte',
    kind: 'simple',
    lilli: 'Stellt euch vor, wir reisen 100 Jahre zurück …',
    steps: [
      'Jeder sagt einen Satz, wie es hier vor 100 Jahren ausgesehen haben könnte.',
      'Der Nächste setzt die Geschichte fort.',
      'Wer bringt die verrückteste Idee ein?',
    ],
  },
];

export const FAMILY_GAME_BY_ID = new Map(FAMILY_GAMES.map((g) => [g.id, g]));
export const FAMILY_POINTS = 5;
