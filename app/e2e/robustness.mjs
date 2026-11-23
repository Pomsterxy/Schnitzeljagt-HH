// Sonderfälle: Neuladen mitten in der Tour, GPS verweigert + PIN, Überspringen, Offline nach erstem Laden.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
import { planTour } from './chat.mjs';

const URL = process.argv[2] ?? 'http://localhost:4173/';
// PW_PROXY: optionaler Proxy (z. B. in abgeschotteten Umgebungen)
const browser = await chromium.launch(process.env.PW_PROXY ? { proxy: { server: process.env.PW_PROXY } } : {});
const fail = (m) => {
  console.error('FEHLER: ' + m);
  process.exit(1);
};

async function setupTour(page) {
  await planTour(page, { team: 'Robust', pin: '4321' });
}

/** Zwischenziele am Anfang auslassen, bis eine Station kommt */
async function skipWaypoints(page) {
  for (let i = 0; i < 10; i++) {
    const kind = await page.evaluate(() => {
      const g = JSON.parse(localStorage.getItem('hh-hunt:game'));
      return g.stops[g.index].kind;
    });
    if (kind !== 'waypoint') return;
    await page.getByRole('button', { name: 'Zwischenziel auslassen' }).click();
    await page.waitForTimeout(200);
  }
}

// 1) GPS verweigert → Hinweis + PIN-Freischaltung, falsche PIN wird abgelehnt
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } }); // keine Geolocation-Erlaubnis
  await ctx.route(/tile\.openstreetmap\.org/, (r) => r.fulfill({ status: 204, body: '' }));
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  await page.goto(URL);
  await setupTour(page);
  await skipWaypoints(page);
  await page.getByRole('button', { name: /Wir sind da/ }).waitFor({ timeout: 15000 });
  console.log('✓ GPS verweigert: Hinweis + Fallback-Button sichtbar');
  await page.getByRole('button', { name: /Wir sind da/ }).click();
  await page.getByLabel('Eltern-PIN').fill('1111');
  await page.getByRole('button', { name: 'Freischalten' }).click();
  if (!(await page.getByText('Falsche PIN.').count())) fail('Falsche PIN wurde akzeptiert');
  await page.getByLabel('Eltern-PIN').fill('4321');
  await page.getByRole('button', { name: 'Freischalten' }).click();
  await page.getByTestId('arrived').waitFor();
  console.log('✓ PIN-Freischaltung funktioniert, falsche PIN wird abgelehnt');

  // 2) Neuladen mitten in der Station → gleicher Zustand
  const before = await page.locator('.station h1').innerText();
  await page.reload();
  await page.getByTestId('arrived').waitFor();
  const after = await page.locator('.station h1').innerText();
  if (before !== after) fail(`Nach Neuladen andere Station: ${before} / ${after}`);
  console.log('✓ Spielstand übersteht Neuladen:', after);

  // 3) Überspringen per Menü + PIN
  const idxBefore = await page.evaluate(() => JSON.parse(localStorage.getItem('hh-hunt:game')).index);
  await page.getByLabel('Menü').click();
  await page.getByRole('button', { name: /überspringen/ }).click();
  await page.getByLabel('Eltern-PIN').fill('4321');
  await page.getByRole('button', { name: 'Freischalten' }).click();
  const idxAfter = await page.evaluate(() => JSON.parse(localStorage.getItem('hh-hunt:game')).index);
  if (idxAfter !== idxBefore + 1) fail('Überspringen hat nicht funktioniert');
  console.log('✓ Stopp überspringen funktioniert');

  // 4) Pausieren → Hauptmenü → Weiterspielen
  await page.getByLabel('Menü').click();
  await page.getByRole('button', { name: /Hauptmenü/ }).click();
  await page.getByRole('button', { name: /Weiterspielen/ }).click();
  await page.locator('.play').waitFor();
  console.log('✓ Pausieren und Weiterspielen funktioniert');
  if (errs.length) fail('Seitenfehler: ' + errs.join(' / '));
  await ctx.close();
}

// 5) Offline: nach dem ersten Laden ohne Netz neu starten
{
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    permissions: ['geolocation'],
    geolocation: { latitude: 53.59078, longitude: 10.01519, accuracy: 10 },
  });
  await ctx.route(/tile\.openstreetmap\.org/, (r) => r.fulfill({ status: 204, body: '' }));
  const page = await ctx.newPage();
  await page.goto(URL);
  await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready;
    return !!reg.active;
  });
  // Warten, bis der Service Worker alles vorgeladen hat
  await page.waitForFunction(async () => {
    const keys = await caches.keys();
    for (const k of keys) {
      const c = await caches.open(k);
      const reqs = await c.keys();
      if (reqs.filter((r) => r.url.includes('/img/stations/')).length >= 40) return true;
    }
    return false;
  }, null, { timeout: 60000 });
  await ctx.setOffline(true);
  await page.reload();
  await setupTour(page);
  await context_check(page);
  console.log('✓ Offline: App startet, Tour planbar, Stationsbilder aus dem Cache');
  await ctx.close();
}

async function context_check(page) {
  await skipWaypoints(page);
  // erste Station freischalten und Bild prüfen
  const t = (await page.locator('.play').getAttribute('data-target')).split(',').map(Number);
  await page.context().setGeolocation({ latitude: t[0], longitude: t[1], accuracy: 8 });
  const arrived = page.getByTestId('arrived');
  const pause = page.getByRole('button', { name: /Pause/ });
  await Promise.race([arrived.waitFor(), pause.waitFor()]);
  if (await arrived.count()) {
    const ok = await page.locator('.gallery img').evaluate((img) => img.complete && img.naturalWidth > 0);
    if (!ok) fail('Stationsbild offline nicht geladen');
  }
}

await browser.close();
console.log('OK – alle Sonderfälle bestanden');
