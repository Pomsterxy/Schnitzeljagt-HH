// Realistischer Ablauf auf nachgebildeten Handys (iPhone und Android):
// Tour mit Netz planen, Kartenkacheln vorladen lassen, dann fällt unterwegs das Netz weg.
// Geprüft wird: Neustart ohne Netz, Spielstand bleibt, Stationsbild und Kartenkacheln aus dem Speicher,
// Fehler-Tagebuch landet in den Meldungen.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');
import { planTour } from './chat.mjs';

const URL = process.argv[2] ?? 'http://localhost:4173/';
const browser = await chromium.launch(process.env.PW_PROXY ? { proxy: { server: process.env.PW_PROXY } } : {});
const fail = (m) => {
  console.error('FEHLER: ' + m);
  process.exit(1);
};
// 1×1-PNG als Kartenkachel (echte Antwort mit Status 200, damit sie gespeichert wird)
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

for (const name of ['iPhone 13', 'Pixel 7']) {
  const dev = devices[name];
  const ctx = await browser.newContext({
    ...dev,
    permissions: ['geolocation'],
    geolocation: { latitude: 53.59078, longitude: 10.01519, accuracy: 10 },
    locale: 'de-DE',
  });
  await ctx.route(/tile\.openstreetmap\.org/, (r) => r.fulfill({ status: 200, body: PNG, contentType: 'image/png', headers: { 'Access-Control-Allow-Origin': '*' } }));
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  await page.goto(URL);
  await page.evaluate(async () => !!(await navigator.serviceWorker.ready).active);
  // Seite muss vom Service Worker kontrolliert werden, sonst greift der Kachel-Speicher nicht
  if (!(await page.evaluate(() => !!navigator.serviceWorker.controller))) await page.reload();
  await page.waitForFunction(async () => {
    for (const k of await caches.keys()) {
      const reqs = await (await caches.open(k)).keys();
      if (reqs.filter((r) => r.url.includes('/img/stations/')).length >= 40) return true;
    }
    return false;
  }, null, { timeout: 60000 });
  await planTour(page, { team: name });
  // Vorladen der Karten abwarten
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('hh-hunt:tilesDone') ?? 'null') !== null, null, { timeout: 60000 });
  const cachedTiles = await page.evaluate(async () => {
    const c = await caches.open('osm-tiles');
    return (await c.keys()).length;
  });
  if (cachedTiles < 20) fail(`${name}: nur ${cachedTiles} Kartenkacheln gespeichert`);

  // Ein Fehler passiert unterwegs (z. B. in einem Sensor-Callback) – er soll im Tagebuch landen
  await page.evaluate(() => setTimeout(() => { throw new Error('Testfehler Sensor'); }, 0));
  await page.waitForTimeout(200);

  // Netz weg, App neu öffnen
  const before = await page.evaluate(() => JSON.parse(localStorage.getItem('hh-hunt:game')).index);
  await ctx.setOffline(true);
  await page.reload();
  await page.locator('.play').waitFor({ timeout: 10000 });
  const after = await page.evaluate(() => JSON.parse(localStorage.getItem('hh-hunt:game')).index);
  if (after !== before) fail(`${name}: Spielstand nach Neustart verändert`);
  // Zwischenziele auslassen, bis eine Station kommt
  for (let i = 0; i < 10; i++) {
    const kind = await page.evaluate(() => {
      const g = JSON.parse(localStorage.getItem('hh-hunt:game'));
      return g.stops[g.index].kind;
    });
    if (kind === 'station') break;
    const b = page.getByRole('button', { name: /Zwischenziel auslassen|Pause überspringen/ });
    await b.click();
    await page.waitForTimeout(250);
  }
  // Kartenkacheln kommen jetzt aus dem Speicher
  await page.getByRole('button', { name: 'Karte', exact: true }).click();
  await page.waitForFunction(() => [...document.querySelectorAll('.leaflet-tile')].some((i) => i.complete && i.naturalWidth > 0), null, { timeout: 15000 });
  await page.waitForTimeout(1500);
  const missing = await page.evaluate(async () => {
    const have = new Set((await (await caches.open('osm-tiles')).keys()).map((r) => r.url));
    return [...document.querySelectorAll('.leaflet-tile')].map((i) => i.src).filter((u) => !have.has(u));
  });
  if (missing.length) fail(`${name}: Kacheln fehlen offline: ${missing.join(' ')}`);
  // Station freischalten, Bild prüfen
  const t = (await page.locator('.play').getAttribute('data-target')).split(',').map(Number);
  await ctx.setGeolocation({ latitude: t[0], longitude: t[1], accuracy: 8 });
  await page.getByTestId('arrived').waitFor({ timeout: 10000 });
  const imgOk = await page.locator('.gallery img').first().evaluate((img) => new Promise((res) => (img.complete ? res(img.naturalWidth > 0) : img.addEventListener('load', () => res(img.naturalWidth > 0), { once: true }))));
  if (!imgOk) fail(`${name}: Stationsbild offline nicht geladen`);
  // Meldungen: Fehler-Tagebuch sichtbar
  await page.getByLabel('Menü').click();
  const errLog = await page.evaluate(() => JSON.parse(localStorage.getItem('hh-hunt:errors') ?? '[]'));
  if (!errLog.some((e) => e.msg.includes('Testfehler Sensor'))) fail(`${name}: Fehler nicht im Tagebuch`);
  const unexpected = errs.filter((m) => !m.includes('Testfehler'));
  if (unexpected.length) fail(`${name}: Seitenfehler: ${unexpected.join(' | ')}`);
  console.log(`✓ ${name}: ${cachedTiles} Kacheln vorgeladen, offline neu gestartet, Karte + Stationsbild aus dem Speicher, Fehler notiert`);
  await ctx.close();
}
await browser.close();
console.log('OK – Geräte- und Offline-Test bestanden');
