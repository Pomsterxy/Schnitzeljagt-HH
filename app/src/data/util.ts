export function wiki(title: string): string {
  return 'https://de.wikipedia.org/wiki/' + encodeURIComponent(title.replace(/ /g, '_'));
}
