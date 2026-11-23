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
const THEME = process.env.THEME ?? 'mix';
mkdirSync(SHOTS, { recursive: true });

const NAMES = { winterhude: 'Winterhude', 'barmbek-nord': 'Barmbek-Nord', alsterdorf: 'Alsterdorf' };
const errors = [];
// PW_PROXY: optionaler Proxy (z. B. in abgeschotteten Umgebungen)
const browser = await chromium.launch(process.env.PW_PROXY ? { proxy: { server: process.env.PW_PROXY } } : {});
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

// 2. Stadtteile
for (const [id, name] of Object.entries(NAMES)) {
  const b = page.locator('button.choice', { hasText: name });
  const on = (await b.getAttribute('aria-pressed')) === 'true';
  if (DISTRICTS.includes(id) !== on) await b.click();
}
await snap('districts');
await page.getByRole('button', { name: 'Weiter' }).click();
// 3. Dauer
await page.locator('button.choice', { hasText: '2 h' }).click();
await page.getByRole('button', { name: 'Weiter' }).click();
// 4. Thema
const THEME_NAME = { mix: 'Gemischt', architektur: 'Architektur', wasser: 'Wasser', technik: 'Technik', erinnern: 'Erinnern' };
await page.locator('button.choice', { hasText: THEME_NAME[THEME] }).click();
await snap('theme');
await page.getByRole('button', { name: 'Weiter' }).click();
// 5. Extras
const START = { winterhude: 'u-borgweg', 'barmbek-nord': 'bf-barmbek', alsterdorf: 'u-alsterdorf' };
await page.getByLabel('Startpunkt', { exact: true }).selectOption(START[DISTRICTS[0]]);
await page.getByRole('button', { name: NAV === 'map' ? 'Mit Karte' : 'Abenteuer' }).click();
await page.getByPlaceholder('z. B. 1234').fill('1234');
await snap('tour');
await page.getByRole('button', { name: 'Route planen' }).click();
await snap('route');
const summary = await page.locator('.summary').innerText();
console.log('Route:', summary);
await page.getByRole('button', { name: "Los geht's!" }).click();
// Gehen simulieren: 10 s Beschleunigungsdaten mit 1,8 Schritten/s (wie ein echter Bewegungssensor)
await page.evaluate(
  () =>
    new Promise((res) => {
      let i = 0;
      const t = setInterval(() => {
        const z = 9.81 + 2.5 * Math.sin((2 * Math.PI * 1.8 * i * 20) / 1000);
        window.dispatchEvent(new DeviceMotionEvent('devicemotion', { accelerationIncludingGravity: { x: 0.3, y: 0.2, z } }));
        if (++i >= 500) {
          clearInterval(t);
          res();
        }
      }, 20);
    }),
);
await page.waitForTimeout(3500);
const sensorSteps = await page.evaluate(() => JSON.parse(localStorage.getItem('hh-hunt:game')).steps);
console.log('Schritte vom simulierten Sensor:', sensorSteps);
if (!(sensorSteps >= 12 && sensorSteps <= 22)) errors.push(`Schrittzähler unplausibel: ${sensorSteps}`);

const coordsOf = async () =>
  page.evaluate(() => {
    const g = JSON.parse(localStorage.getItem('hh-hunt:game'));
    return { index: g.index, total: g.stops.length, stop: g.stops[g.index] };
  });

let stations = 0;
let photoUploaded = false;
let clues = 0;
let treasure = false;
let pauses = 0;
let guard = 0;
while (guard++ < 40) {
  const state = await coordsOf();
  if (state.index >= state.total) break;
  if (!(await page.locator('.play').count())) { await page.waitForTimeout(1000); }
  if (!(await page.locator('.play').count())) { await snap('error'); throw new Error('Kein Spielbildschirm. Fehler: ' + errors.join(' / ')); }
  const coords = (await page.locator('.play').getAttribute('data-target')).split(',').map(Number);
  if (state.stop.kind === 'final') {
    // Koordinaten wie ein Geocacher berechnen (hier aus der Zielkoordinate abgeleitet)
    const dm = (v) => {
      const t = Math.round((v - Math.floor(v)) * 60000);
      return String(t % 1000).padStart(3, '0');
    };
    await page.getByTestId('formula').waitFor();
    const nb = await page.locator('[data-testid=notebook] li').count();
    if (nb !== clues) errors.push(`Notizbuch hat ${nb} Einträge, erwartet ${clues}`);
    await snap('final-formula');
    // erst falsch (000), dann die Ziffern am Zahlenschloss einstellen
    await page.getByRole('button', { name: 'Schloss öffnen' }).click();
    await page.getByText(/stimmt noch nicht/).first().waitFor();
    for (const [lbl, v] of [['Nord', dm(coords[0])], ['Ost', dm(coords[1])]]) {
      for (let i = 0; i < 3; i++) {
        const wheel = page.getByRole('group', { name: `${lbl}-Ziffern` }).locator('button').nth(i);
        for (let k = 0; k < Number(v[i]); k++) await wheel.click();
      }
    }
    await snap('final-lock');
    await page.getByRole('button', { name: 'Schloss öffnen' }).click();
    await page.getByTestId('final-coords').waitFor();
    await context.setGeolocation({ latitude: coords[0] - 0.003, longitude: coords[1], accuracy: 10 });
    await page.waitForTimeout(400);
    if (await page.getByTestId('treasure-found').count()) throw new Error('Schatz aus der Ferne gefunden!');
    await snap('final-search');
    await context.setGeolocation({ latitude: coords[0], longitude: coords[1], accuracy: 6 });
    await page.getByTestId('treasure-found').waitFor({ timeout: 8000 });
    treasure = true;
    await snap('final-found');
    await page.getByRole('button', { name: /Tour abschließen/ }).click();
    continue;
  }
  if (state.stop.kind === 'pause') {
    pauses++;
    await context.setGeolocation({ latitude: coords[0], longitude: coords[1], accuracy: 10 });
    await page.waitForTimeout(400);
    await snap(`pause-${state.index}`);
    // erst weggehen, damit eine nahe Station nicht sofort freischaltet
    await context.setGeolocation({ latitude: coords[0] - 0.01, longitude: coords[1], accuracy: 10 });
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
        await page.locator(`[data-testid="${tid}"].done`).waitFor();
        photoUploaded = true;
      } else await card.getByRole('button', { name: /Ohne Foto/ }).click();
    } else if (await card.locator('textarea').count()) {
      await card.locator('textarea').fill('Wir denken an sie.');
      await card.getByRole('button', { name: 'Weiter' }).click();
    } else if (await card.locator('.stepper').count()) {
      await card.getByRole('button', { name: 'Prüfen' }).click();
      if (!(await card.evaluate((el) => el.classList.contains('done')))) {
        for (let i = 0; i < 6; i++) await card.getByRole('button', { name: 'Eins mehr' }).click();
        await card.getByRole('button', { name: 'Prüfen' }).click();
      }
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
  if (await page.getByTestId('cache-clue').count()) clues++;
  if (stations <= 2) await snap(`station-${state.stop.id}`);
  await context.setGeolocation({ latitude: coords[0] - 0.01, longitude: coords[1], accuracy: 10 });
  await page.getByRole('button', { name: /Weiter zum nächsten Ziel|Tour abschließen|Leise weitergehen/ }).click();
}

await page.waitForSelector('[data-testid=final-score]', { timeout: 8000 });
await page.waitForTimeout(1500);
await snap('finish');
if (photoUploaded && !(await page.locator('.photo-grid img').count())) errors.push('Foto fehlt im Fotoalbum');
const score = await page.getByTestId('final-score').innerText();
const walk = (await page.getByTestId('steps').innerText()).replace(/\s+/g, ' ');
console.log('Auswertung:', walk, '|', await page.getByTestId('walk-distance').innerText(), '|', await page.getByTestId('walk-time').innerText());
console.log('Ergebnis:', score, `| Stationen: ${stations}, Pausen: ${pauses}, Cache-Zahlen: ${clues}, Schatz: ${treasure ? 'gefunden' : 'nein'}`);
if (!treasure) errors.push('Schatz-Finale wurde nicht gespielt');
if (THEME === 'architektur') {
  const arch = await page.evaluate(() => {
    const g = JSON.parse(localStorage.getItem('hh-hunt:game'));
    return g.stops.filter((s) => s.kind === 'station').map((s) => s.id);
  });
  console.log('Architektur-Tour:', arch.join(', '));
}

// Reload-Test: Album zeigt gesammelte Karten
await page.getByRole('button', { name: 'Zum Hauptmenü' }).click();
await page.locator('.tabbar').getByRole('button', { name: 'Album' }).click();
const cards = await page.locator('.cardlet:not(.locked)').count();
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
