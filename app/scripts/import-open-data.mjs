// Importiert offene Daten für Winterhude, Barmbek-Nord und Alsterdorf und schreibt sie nach src/data/open/.
// Quellen:
//  - Urban Data Platform Hamburg (api.hamburg.de, OGC API Features), Datenlizenz Deutschland – Namensnennung 2.0
//    · Stadtteilgrenzen, Denkmal-Tafeln, Baudenkmale, Spielplätze, Trinkwasserbrunnen
//  - Wikidata (query.wikidata.org), CC0: Kunstwerke/Skulpturen/Brunnen, Stolpersteine
// Nutzung: node scripts/import-open-data.mjs
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const OUT = new URL('../src/data/open/', import.meta.url);
mkdirSync(OUT, { recursive: true });
const API = 'https://api.hamburg.de/datasets/v1';
const DISTRICTS = { Winterhude: 'winterhude', 'Barmbek-Nord': 'barmbek-nord', Alsterdorf: 'alsterdorf' };
const BBOX = '9.98,53.575,10.075,53.63';
const [W, S, E, N] = BBOX.split(',');
const WD_BOX = `SERVICE wikibase:box { ?i wdt:P625 ?c . bd:serviceParam wikibase:cornerSouthWest "Point(${W} ${S})"^^geo:wktLiteral; wikibase:cornerNorthEast "Point(${E} ${N})"^^geo:wktLiteral . }`;

const getJson = async (url, headers = {}) => {
  for (let i = 0; i < 4; i++) {
    const r = await fetch(url, { headers: { 'User-Agent': 'schnitzeljagd-hh-import/1.0', ...headers } });
    if (r.ok) return r.json();
    await new Promise((res) => setTimeout(res, 1500 * (i + 1)));
  }
  throw new Error('Abruf fehlgeschlagen: ' + url);
};
const features = async (ds, coll, extra = '') => {
  const all = [];
  let url = `${API}/${ds}/collections/${coll}/items?f=json&bbox=${BBOX}&limit=1000${extra}`;
  while (url) {
    const d = await getJson(url);
    all.push(...d.features);
    url = d.links?.find((l) => l.rel === 'next')?.href ?? null;
  }
  return all;
};
const sparql = async (q) =>
  (await getJson(`https://query.wikidata.org/sparql?query=${encodeURIComponent(q)}`, { Accept: 'application/sparql-results+json' })).results.bindings;

// ---------- Geometrie ----------
const R = 6371000;
const dist = (a, b) => {
  const toR = (d) => (d * Math.PI) / 180;
  const dLat = toR(b[0] - a[0]);
  const dLon = toR(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toR(a[0])) * Math.cos(toR(b[0])) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};
const inRing = (pt, ring) => {
  // pt = [lon, lat]
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > pt[1] !== yj > pt[1] && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};
const centroid = (g) => {
  if (g.type === 'Point') return g.coordinates;
  const ring = g.type === 'Polygon' ? g.coordinates[0] : g.coordinates[0][0];
  const n = ring.length;
  return [ring.reduce((a, p) => a + p[0], 0) / n, ring.reduce((a, p) => a + p[1], 0) / n];
};
const round = (x) => Math.round(x * 1e6) / 1e6;
/** Wikidata-Koordinate "Point(lon lat)" → [lat, lon] */
const wkt = (v) => {
  const m = /Point\(([-\d.]+) ([-\d.]+)\)/.exec(v);
  return [Number(m[2]), Number(m[1])];
};
/** Nächster Eintrag mit .coords innerhalb von maxM Metern */
const nearest = (list, c, maxM) => {
  let best = null;
  let bestD = maxM;
  for (const x of list) {
    const d = dist(x.coords, c);
    if (d < bestD) [best, bestD] = [x, d];
  }
  return best;
};

console.log('Stadtteilgrenzen …');
const stt = (await getJson(`${API}/verwaltungsgrenzen/collections/stadtteile/items?f=json&limit=200`)).features.filter((f) => DISTRICTS[f.properties.stadtteil_name]);
const districtOf = ([lon, lat]) => {
  for (const f of stt) {
    const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
    if (polys.some((p) => inRing([lon, lat], p[0]))) return DISTRICTS[f.properties.stadtteil_name];
  }
  return null;
};

// Bestehende, handgeschriebene Stationen (um Doppelungen zu vermeiden)
const existing = [];
for (const file of ['stations-winterhude.ts', 'stations-barmbek-alsterdorf.ts', 'stations-architektur.ts']) {
  const src = readFileSync(new URL(`../src/data/${file}`, import.meta.url), 'utf8');
  for (const m of src.matchAll(/coords:\s*\[([\d.]+),\s*([\d.]+)\]/g)) existing.push([Number(m[1]), Number(m[2])]);
}
const nearExisting = (c, m) => existing.some((e) => dist(e, c) < m);

// ---------- 1) Blaue Denkmal-Tafeln ----------
console.log('Denkmal-Tafeln …');
const clean = (t) =>
  (t || '')
    .replace(/\s+/g, ' ')
    .replace(/(\p{L})- (?!(?:und|oder|bzw)\b)(\p{Ll})/gu, '$1$2')
    .replace(/([a-zäöüß])([A-ZÄÖÜ][a-zäöü])/g, '$1 $2')
    .replace(/“|”|„/g, '"')
    .trim();
const stripHeading = (t) => t.replace(/^[\p{Lu}\s.\-&]{4,}(?=\s(?:\p{Lu}\p{Ll}|\d))/u, '').trim();
const tafeln = [];
for (const f of await features('denkmalschutz', 'tafeln')) {
  const [lon, lat] = centroid(f.geometry);
  const d = districtOf([lon, lat]);
  if (!d) continue;
  // Absätze trennen, englische Übersetzung weglassen
  const paras = String(f.properties.info || '').split(/\r?\n\s*\r?\n/);
  const isEnglish = (p) => (p.match(/\b(the|and|of|was|by|built|with)\b/gi) || []).length >= 3;
  let text = clean(paras.filter((p) => !isEnglish(p)).join(' '));
  const en = /\s(Built|Erected|Constructed|Designed|This (building|church|house|villa|school))\b/.exec(text);
  if (en && en.index > 80) text = text.slice(0, en.index).trim();
  const title = clean(f.properties.titel);
  if (tafeln.some((t) => t.title === title)) continue;
  text = stripHeading(text);
  if (!title || text.length < 40) continue;
  tafeln.push({ id: `tafel-${f.properties.fisid ?? f.id}`, title, text, coords: [round(lat), round(lon)], district: d, nearExisting: nearExisting([lat, lon], 60) });
}
console.log('  Tafeln:', tafeln.length, 'davon neu:', tafeln.filter((t) => !t.nearExisting).length);
writeFileSync(new URL('tafeln.json', OUT), JSON.stringify(tafeln, null, 1));

// ---------- 2) Baudenkmale (für "Wusstet ihr?" an Zwischenzielen) ----------
console.log('Baudenkmale …');
const denkmale = [];
for (const coll of ['gebaeude', 'denkmalobjekte_symbolhaft', 'ensembles']) {
  for (const f of await features('denkmalschutz', coll)) {
    const name = clean(f.properties.bezeichnung);
    if (!name || /^[\d\s,/-]+$/.test(name)) continue;
    const [lon, lat] = centroid(f.geometry);
    if (!districtOf([lon, lat])) continue;
    denkmale.push({ name, year: clean(f.properties.baujahr) || undefined, coords: [round(lat), round(lon)], kind: coll });
  }
}
console.log('  Baudenkmale mit Namen:', denkmale.length);

// ---------- 3) Spielplätze (Beschreibungen) & Trinkwasserbrunnen ----------
console.log('Spielplätze & Trinkbrunnen …');
const spielplaetze = (await features('spielplaetze', 'spielplaetze_hh'))
  .map((f) => {
    const [lon, lat] = centroid(f.geometry);
    return { name: clean(f.properties.name), text: clean(f.properties.beschreibung), link: f.properties.link, coords: [round(lat), round(lon)], district: districtOf([lon, lat]) };
  })
  .filter((s) => s.district && s.text);
const brunnen = (await features('trinkwasserbrunnen', 'trinkwasserbrunnen'))
  .map((f) => {
    const [lon, lat] = centroid(f.geometry);
    return { id: `trink-${f.id}`, kind: 'trinkwasser', title: 'Trinkwasserbrunnen', note: clean(f.properties.adresse), coords: [round(lat), round(lon)], district: districtOf([lon, lat]) };
  })
  .filter((b) => b.district);
console.log('  Spielplätze mit Beschreibung:', spielplaetze.length, '| Trinkbrunnen:', brunnen.length);

// ---------- 4) Kunstwerke, Skulpturen, Brunnen (Wikidata) ----------
console.log('Kunstwerke (Wikidata) …');
const ART_TYPES = ['wd:Q838948', 'wd:Q860861', 'wd:Q4989906', 'wd:Q483453', 'wd:Q179700', 'wd:Q1428238', 'wd:Q241045', 'wd:Q4370428', 'wd:Q1307276'];
const art = await sparql(`SELECT ?i ?iLabel ?c ?creatorLabel ?year WHERE {
  ${WD_BOX}
  ?i wdt:P31 ?type . VALUES ?type { ${ART_TYPES.join(' ')} }
  OPTIONAL { ?i wdt:P170 ?creator }
  OPTIONAL { ?i wdt:P571 ?inc . BIND(YEAR(?inc) AS ?year) }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "de,en". } }`);
const artMap = new Map();
for (const b of art) {
  const q = b.i.value.split('/').pop();
  const [lat, lon] = wkt(b.c.value);
  const d = districtOf([lon, lat]);
  if (!d) continue;
  let label = (b.iLabel?.value ?? '').replace(/\bo\.\s?T\./, 'ohne Titel');
  const unk = /^unbekannt \((.+)\)$/i.exec(label);
  if (unk) label = unk[1][0].toUpperCase() + unk[1].slice(1);
  // ohne Namen, Gartenbrunnen auf Privatgrund oder namenlose "Brunnen" sind als Ziel zu ungenau
  if (!label || /^Q\d+$/.test(label) || /im Garten \d/.test(label) || (/^Brunnen$/.test(label) && !b.creatorLabel)) continue;
  const prev = artMap.get(q);
  const creator = b.creatorLabel?.value && !/^Q\d+$/.test(b.creatorLabel.value) ? b.creatorLabel.value : prev?.creator;
  artMap.set(q, { id: `kunst-${q}`, kind: 'kunst', title: label, creator, year: b.year ? Number(b.year.value) : prev?.year, coords: [round(lat), round(lon)], district: d });
}
const kunst = [...artMap.values()].filter((k) => !nearExisting(k.coords, 25));
console.log('  Kunstwerke:', kunst.length);

// ---------- 5) Stolpersteine (Wikidata) ----------
console.log('Stolpersteine (Wikidata) …');
const st = await sparql(`SELECT ?i ?iLabel ?c ?ins ?addr WHERE {
  ${WD_BOX}
  ?i wdt:P31 wd:Q26703203 . OPTIONAL { ?i wdt:P1684 ?ins } OPTIONAL { ?i wdt:P6375 ?addr }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "de". } }`);
const byAddr = new Map();
for (const b of st) {
  const [lat, lon] = wkt(b.c.value);
  const d = districtOf([lon, lat]);
  if (!d || !b.ins) continue;
  const addr = (b.addr?.value ?? '').replace(/,\s*\d{5}\s*Hamburg$/, '').trim();
  const key = addr || `${lat.toFixed(4)},${lon.toFixed(4)}`;
  const e = byAddr.get(key) ?? { address: addr, coords: [round(lat), round(lon)], district: d, people: [], wikidata: [] };
  const q = b.i.value.split('/').pop();
  if (!e.wikidata.includes(q)) {
    e.wikidata.push(q);
    e.people.push({ name: (b.iLabel?.value ?? '').replace(/^Stolperstein für /, ''), inscription: clean(b.ins.value) });
  }
  byAddr.set(key, e);
}
/** Doppelte Wikidata-Einträge (gleicher Nachname + Jahrgang) zusammenfassen, längste Inschrift behalten */
const uniquePeople = (people) => {
  const key = (p) => `${p.name.split(' ').pop()}|${/Jg\.\s*(\d{4})/.exec(p.inscription)?.[1] ?? p.name}`;
  const m = new Map();
  for (const p of people) if (!m.has(key(p)) || p.inscription.length > m.get(key(p)).inscription.length) m.set(key(p), p);
  return [...m.values()].sort((a, b) => a.name.localeCompare(b.name, 'de'));
};
const groups = [...byAddr.values()].filter((s) => s.address).map((s) => ({ ...s, people: uniquePeople(s.people) }));
// Gedenkstationen nur an Adressen mit mindestens drei Steinen (die übrigen erscheinen als Hinweis an Zwischenzielen)
const STONE_MIN = 3;
const stolpersteine = groups
  .filter((s) => s.people.length >= STONE_MIN && !nearExisting(s.coords, 40))
  .map((s) => ({ id: `stein-${s.wikidata[0]}`, ...s }));
console.log('  Stolperstein-Adressen:', groups.length, '| Gedenkstationen:', stolpersteine.length);

// ---------- 6) Zusatzinfos für Zwischenziele (POIs) ----------
const pois = JSON.parse(readFileSync(new URL('../src/data/pois.json', import.meta.url), 'utf8'));
const poiInfo = {};
for (const p of [...pois, ...kunst, ...brunnen]) {
  const info = {};
  const sp = p.kind === 'spielplatz' ? nearest(spielplaetze, p.coords, 90) : null;
  if (sp) info.playground = { name: sp.name, text: sp.text };
  const dk = nearest(denkmale, p.coords, 70);
  if (dk) info.monument = { name: dk.name, year: dk.year, m: Math.round(dist(dk.coords, p.coords)) };
  const sg = nearest(groups, p.coords, 50);
  if (sg) info.stones = { address: sg.address, names: sg.people.map((x) => x.name) };
  if (Object.keys(info).length) poiInfo[p.id] = info;
}
console.log('  Zwischenziele mit Zusatzinfo:', Object.keys(poiInfo).length);

writeFileSync(new URL('kunst.json', OUT), JSON.stringify(kunst, null, 1));
writeFileSync(new URL('stolpersteine.json', OUT), JSON.stringify(stolpersteine, null, 1));
writeFileSync(new URL('trinkbrunnen.json', OUT), JSON.stringify(brunnen, null, 1));
writeFileSync(new URL('poi-info.json', OUT), JSON.stringify(poiInfo));
writeFileSync(
  new URL('meta.json', OUT),
  JSON.stringify({ importedAt: new Date().toISOString().slice(0, 10), counts: { tafeln: tafeln.length, kunst: kunst.length, stolpersteine: stolpersteine.length, trinkbrunnen: brunnen.length, poiInfo: Object.keys(poiInfo).length } }, null, 1),
);
console.log('fertig');
