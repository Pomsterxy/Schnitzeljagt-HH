export function wiki(title: string): string {
  return 'https://de.wikipedia.org/wiki/' + encodeURIComponent(title.replace(/ /g, '_'));
}

/** Kleiner, stabiler Hash (FNV-1a) für deterministische Auswahl und Fingerabdrücke */
export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
