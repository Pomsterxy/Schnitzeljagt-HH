// Kompletter Spieldurchlauf im Browser.
// Nutzung: npm run build && npx vite preview --port 4173 & node e2e/playthrough.mjs [url] [nav] [districts]
// Der Standort wird über die echte Geolocation-API des Browsers gesetzt (context.setGeolocation),
// die App läuft also genau so wie auf dem Handy.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
import { mkdirSync } from 'node:fs';

const URL = process.argv[2] ?? 'http://localhost:4173/';
const NAV = process.argv[3] ?? 'map';
const DISTRICTS = (process.argv[4] ?? 'winterhude').split(',');
const SHOTS = process.env.SHOTS ?? 'e2e/shots';
mkdirSync(SHOTS, { recursive: true });

const NAMES = { winterhude: 'Winterhude', 'barmbek-nord': 'Barmbek-Nord', alsterdorf: 'Alsterdorf' };
const errors = [];
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  permissions: ['geolocation'],
  geolocation: { latitude: 53.59078, longitude: 10.01519, accuracy: 12 },
  locale: 'de-DE',
});
// Kartenkacheln im Test nicht laden (kein Netz nötig)
await context.route(/tile\.openstreetmap\.org/, (r) => r.fulfill({ status: 204, body: '' }));
const page = await context.newPage();
page.on('pageerror', (e) => { errors.push('pageerror: ' + e.message); console.log('PAGEERROR', e.message, (e.stack||'').split('\n').slice(0,6).join(' | ')); });
page.on('console', (m) => m.type() === 'error' && !/204|tile/.test(m.text()) && errors.push('console: ' + m.text()));

let shot = 0;
const snap = async (name) => page.screenshot({ path: `${SHOTS}/${String(++shot).padStart(2, '0')}-${name}.png`, fullPage: true });

await page.goto(URL);
await snap('home');
await page.getByTestId('new-tour').click();

// 1. Team
await page.getByPlaceholder('z. B. Die Alsterpiraten').fill('Die Testpiraten');
await page.getByPlaceholder('Name 1 (optional)').fill('Mama');
await page.getByPlaceholder('Name 2 (optional)').fill('Lotta');
await snap('team');
await page.getByRole('button', { name: 'Weiter' }).click();

// 2. Tour
for (const [id, name] of Object.entries(NAMES)) {
  const cb = page.locator('label.check', { hasText: name }).locator('input[type=checkbox]');
  if (DISTRICTS.includes(id) !== (await cb.isChecked())) await cb.click();
}
await page.locator('input[type=range]').fill('120');
const START = { winterhude: 'u-borgweg', 'barmbek-nord': 'bf-barmbek', alsterdorf: 'u-alsterdorf' };
await page.locator('select').first().selectOption(START[DISTRICTS[0]]);
await page.locator(`input[name=nav]`).nth(NAV === 'map' ? 0 : 1).check();
await page.getByPlaceholder('z. B. 1234').fill('1234');
await snap('tour');
await page.getByRole('button', { name: 'Route planen' }).click();
await snap('route');
const summary = await page.locator('.summary').innerText();
console.log('Route:', summary);
await page.getByRole('button', { name: "Los geht's!" }).click();

const coordsOf = async () =>
  page.evaluate(() => {
    const g = JSON.parse(localStorage.getItem('hh-hunt:game'));
    return { index: g.index, total: g.stops.length, stop: g.stops[g.index] };
  });

let stations = 0;
let photoUploaded = false;
let pauses = 0;
let guard = 0;
while (guard++ < 40) {
  const state = await coordsOf();
  if (state.index >= state.total) break;
  if (!(await page.locator('.play').count())) { await page.waitForTimeout(1000); }
  if (!(await page.locator('.play').count())) { await snap('error'); throw new Error('Kein Spielbildschirm. Fehler: ' + errors.join(' / ')); }
  const coords = (await page.locator('.play').getAttribute('data-target')).split(',').map(Number);
  if (state.stop.kind === 'pause') {
    pauses++;
    await context.setGeolocation({ latitude: coords[0], longitude: coords[1], accuracy: 10 });
    await page.waitForTimeout(400);
    await snap(`pause-${state.index}`);
    await page.getByRole('button', { name: /Pause (beendet|überspringen)/ }).click();
    continue;
  }
  // 1) Weit weg: Aufgabe darf NICHT sichtbar sein
  await context.setGeolocation({ latitude: coords[0] - 0.004, longitude: coords[1], accuracy: 10 });
  await page.waitForTimeout(500);
  if (await page.getByTestId('arrived').count()) throw new Error('Station schon vor Ankunft freigeschaltet!');
  if (await page.locator('.task-card').count()) throw new Error('Aufgabe vor Ankunft sichtbar!');
  if (stations === 0) await snap('navigate');
  if (NAV === 'adventure' && stations === 0) {
    await page.getByRole('button', { name: /Heiß oder kalt/ }).click();
    await page.getByTestId('temperature').waitFor();
    await snap('hotcold');
  }
  // 2) Am Ziel: automatische Freischaltung per GPS
  await context.setGeolocation({ latitude: coords[0] + 0.00005, longitude: coords[1], accuracy: 8 });
  await page.getByTestId('arrived').waitFor({ timeout: 8000 });
  stations++;
  // Aufgaben lösen
  for (let k = 0; k < 8; k++) {
    const open = page.locator('.task-card:not(.done)').last();
    if (!(await open.count())) break;
    const tid = await open.getAttribute('data-testid');
    const card = page.getByTestId(tid);
    const opts = card.locator('.btn.option');
    if (await opts.count()) {
      await opts.nth(k % 2 === 0 ? 0 : 1).click();
      // evtl. zweiter Versuch
      if (await card.locator('.btn.option').count()) await card.locator('.btn.option').first().click();
    } else if (await card.getByRole('button', { name: /Ohne Foto/ }).count()) {
      if (!photoUploaded) {
        // echtes Foto hochladen testen
        await card.locator('input[type=file]').setInputFiles('public/icon-512.png');
        await card.locator('.feedback.ok').waitFor();
        photoUploaded = true;
      } else await card.getByRole('button', { name: /Ohne Foto/ }).click();
    } else if (await card.locator('textarea').count()) {
      await card.locator('textarea').fill('Wir denken an sie.');
      await card.getByRole('button', { name: 'Weiter' }).click();
    } else if (await card.locator('input').count()) {
      if (k === 0 && (await card.getByRole('button', { name: /Hinweis/ }).count())) await card.getByRole('button', { name: /Hinweis/ }).click();
      await card.locator('input').fill('6');
      await card.getByRole('button', { name: 'Prüfen' }).click();
      if (!(await card.evaluate((el) => el.classList.contains('done')))) {
        await card.locator('input').fill('7');
        await card.getByRole('button', { name: 'Prüfen' }).click();
      }
    }
    await page.waitForTimeout(150);
  }
  if (stations <= 2) await snap(`station-${state.stop.id}`);
  await page.getByRole('button', { name: /Weiter zum nächsten Ziel|Tour abschließen/ }).click();
}

await page.waitForSelector('[data-testid=final-score]', { timeout: 8000 });
await snap('finish');
if (photoUploaded && !(await page.locator('.photo-grid img').count())) errors.push('Foto fehlt im Fotoalbum');
const score = await page.getByTestId('final-score').innerText();
console.log('Ergebnis:', score, `| Stationen: ${stations}, Pausen: ${pauses}`);

// Reload-Test: Album zeigt gesammelte Karten
await page.getByRole('button', { name: 'Zum Hauptmenü' }).click();
await page.getByRole('button', { name: /Album/ }).click();
const cards = await page.locator('.card:not(.locked)').count();
if (photoUploaded) console.log('Foto hochgeladen und im Album gespeichert');
console.log('Gesammelte Karten im Album:', cards);
await snap('album');
if (cards !== stations) errors.push(`Album zeigt ${cards} Karten, erwartet ${stations}`);

await browser.close();
if (errors.length) {
  console.error('FEHLER:\n' + errors.join('\n'));
  process.exit(1);
}
console.log('OK – Spieldurchlauf erfolgreich');
