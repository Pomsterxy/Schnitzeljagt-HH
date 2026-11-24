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
  await ctx.route(/tile\.openstreetmap\.org/, (r) => r.fulfill({ status: 204, body: '', headers: { 'Access-Control-Allow-Origin': '*' } }));
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

  // Problem melden
  await page.getByTestId('report-open').click();
  await page.getByRole('button', { name: 'Ort nicht zugänglich' }).click();
  await page.getByTestId('report-text').fill('Baustelle');
  await page.getByTestId('report-save').click();
  await page.getByTestId('report-sent').waitFor();
  const reps = await page.evaluate(() => JSON.parse(localStorage.getItem('hh-hunt:reports') || '[]'));
  if (reps.length !== 1 || reps[0].kind !== 'Ort nicht zugänglich' || reps[0].text !== 'Baustelle') fail('Meldung nicht gespeichert');
  console.log('✓ Problem melden funktioniert');

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
  await ctx.route(/tile\.openstreetmap\.org/, (r) => r.fulfill({ status: 204, body: '', headers: { 'Access-Control-Allow-Origin': '*' } }));
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

// 6) Chat lesbar, neu würfeln, Tour abbrechen (behalten) und löschen
{
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    permissions: ['geolocation'],
    geolocation: { latitude: 53.59078, longitude: 10.01519, accuracy: 10 },
  });
  await ctx.route(/tile\.openstreetmap\.org/, (r) => r.fulfill({ status: 204, body: '', headers: { 'Access-Control-Allow-Origin': '*' } }));
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  await page.goto(URL);
  await page.getByTestId('new-tour').click();
  const colors = await page.getByTestId('chat-input').evaluate((e) => [getComputedStyle(e).backgroundColor, getComputedStyle(e).color]);
  const lum = (c) => {
    const [r, g, b] = c.match(/\d+/g).slice(0, 3).map((v) => {
      const x = Number(v) / 255;
      return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const [l1, l2] = [lum(colors[0]), lum(colors[1])];
  const contrast = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  if (contrast < 4.5) fail(`Chat-Eingabe schlecht lesbar (Kontrast ${contrast.toFixed(1)}): ${colors.join(' / ')}`);
  await page.getByRole('button', { name: 'Abbrechen' }).click();
  // bis zur Routenübersicht planen, aber noch nicht starten
  const sig = () => page.locator('.chat-stops').innerText();
  await planTour(page, {
    team: 'Würfel',
    snap: async (n) => {
      if (n !== 'chat-route') return;
      const before = await sig();
      await page.getByTestId('reroll').click();
      await page.waitForTimeout(300);
      const after = await sig();
      if (before === after && !(await page.getByTestId('no-other-route').count())) fail('Neu würfeln ändert nichts');
      console.log('✓ Neu würfeln liefert eine andere Route');
    },
  });
  // Kompass antippen schaltet den Handy-Kompass ein, der Hinweis verschwindet bei Kompassdaten
  for (let i = 0; i < 6 && !(await page.getByTestId('compass-tap').count()); i++) {
    const b = page.getByRole('button', { name: 'Zwischenziel auslassen' });
    if (await b.count()) await b.click();
    await page.waitForTimeout(300);
  }
  await page.getByTestId('compass-hint').waitFor();
  // Test-Browser hat keinen Kompass: einen vorgaukeln
  await page.evaluate(() => {
    if (!('DeviceOrientationEvent' in window)) window.DeviceOrientationEvent = class extends Event {};
  });
  await page.getByTestId('compass-tap').click();
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    const e = new Event('deviceorientationabsolute');
    Object.assign(e, { alpha: 90, absolute: true });
    window.dispatchEvent(e);
  });
  await page.getByTestId('compass-hint').waitFor({ state: 'detached', timeout: 3000 });
  console.log('✓ Kompass antippen schaltet den Handy-Kompass ein');

  // Echte Geocaches in der App (Opencaching-Antworten nachgestellt, inkl. bösartigem HTML)
  await page.route(/opencaching\.de\/okapi\/services\/caches\/shortcuts/, (r) =>
    r.fulfill({ contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ OCTEST1: { code: 'OCTEST1', name: 'Test-Dose', location: '53.5912|10.0160', type: 'Traditional', difficulty: 1.5, terrain: 2, size2: 'small', url: 'https://www.opencaching.de/viewcache.php?wp=OCTEST1', status: 'Available' } }) }),
  );
  await page.route(/opencaching\.de\/okapi\/services\/caches\/geocache\?/, (r) =>
    r.fulfill({
      contentType: 'application/json',
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        code: 'OCTEST1', name: 'Test-Dose', location: '53.5912|10.0160', type: 'Traditional', status: 'Available', owner: { username: 'Tester' }, size2: 'small', difficulty: 1.5, terrain: 2,
        short_description: 'Kurz', description: '<p>Hallo<script>window.__xss=1</script><img src="x" onerror="window.__xss=2"><a href="javascript:window.__xss=3">böse</a></p>',
        hint2: 'Unter dem Stein', images: [], attrnames: ['Kinderfreundlich'], latest_logs: [{ uuid: 'l1', date: '2026-01-01T10:00:00+01:00', user: { username: 'Finder' }, type: 'Found it', comment: '<b>TFTC</b><script>window.__xss=4</script>' }],
        date_hidden: '2020-05-01T00:00:00+02:00', founds: 3, notfounds: 0, recommendations: 1, attribution_note: '&copy; Tester', url: 'https://www.opencaching.de/viewcache.php?wp=OCTEST1', req_passwd: false,
      }),
    }),
  );
  await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('hh-hunt:game')); return s.index; });
  // Station freischalten (per GPS) und bis zum Ende klicken, dann Caches öffnen
  {
    // Zwischenziele und Pausen davor überspringen
    for (let i = 0; i < 8; i++) {
      const kind = await page.evaluate(() => { const g = JSON.parse(localStorage.getItem('hh-hunt:game')); return g.stops[g.index].kind; });
      if (kind === 'station') break;
      const sk = page.getByRole('button', { name: /Zwischenziel auslassen|Pause überspringen/ });
      if (await sk.count()) await sk.first().click();
      await page.waitForTimeout(400);
    }
    const t = (await page.locator('.play').getAttribute('data-target')).split(',').map(Number);
    await page.context().setGeolocation({ latitude: t[0], longitude: t[1], accuracy: 8 });
    await page.getByTestId('arrived').waitFor();
    for (let g = 0; g < 16; g++) {
      const o = page.locator('.task-card:not(.done) .btn.option').first();
      if (await o.count()) { await o.click(); await page.waitForTimeout(150); if (await page.locator('.task-card:not(.done) .btn.option').count()) await page.locator('.task-card:not(.done) .btn.option').first().click(); continue; }
      const card = page.locator('.task-card:not(.done)');
      if (await card.count()) {
        if (await card.locator('.stepper').count()) { await card.getByRole('button', { name: 'Prüfen' }).click(); await page.waitForTimeout(120); if (await page.locator('.task-card:not(.done) .stepper').count()) await page.locator('.task-card:not(.done)').getByRole('button', { name: 'Prüfen' }).click(); continue; }
        if (await card.getByRole('button', { name: /Ohne Foto/ }).count()) { await card.getByRole('button', { name: /Ohne Foto/ }).click(); continue; }
        if (await card.locator('input').count()) { await card.locator('input').first().fill('7'); await card.getByRole('button', { name: 'Prüfen' }).click(); await page.waitForTimeout(120); if (await page.locator('.task-card:not(.done) input').count()) { await page.locator('.task-card:not(.done) input').first().fill('6'); await page.locator('.task-card:not(.done)').getByRole('button', { name: 'Prüfen' }).click(); } continue; }
      }
      const fam = page.locator('[data-testid=family-game]:not([data-state])');
      if (await fam.count()) { const np = fam.getByRole('button', { name: /Gespielt, ohne Foto/ }); if (await np.count()) await np.click(); else await fam.getByRole('button', { name: /Geschafft/ }).click(); continue; }
      const n = page.getByTestId('step-next'); if ((await n.count()) && (await n.isEnabled())) { await n.click(); continue; }
      break;
    }
  }
  await page.locator('.nearby-caches summary').click();
  await page.locator('.cache-item').first().click();
  await page.getByTestId('cache-detail').waitFor();
  await page.locator('.cache-title').waitFor();
  await page.getByRole('button', { name: 'Hinweis zeigen' }).click();
  if ((await page.getByTestId('cache-hint').innerText()).indexOf('Unter dem Stein') < 0) fail('Cache-Hinweis fehlt');
  await page.waitForTimeout(300);
  const xss = await page.evaluate(() => window.__xss ?? 0);
  if (xss) fail('Fremdes HTML wurde ausgeführt: ' + xss);
  if (await page.locator('.cache-html script, .cache-html [onerror]').count()) fail('Gefährliches HTML nicht entfernt');
  await page.getByTestId('cache-found').click();
  if (!(await page.evaluate(() => (localStorage.getItem('hh-hunt:foundCaches') || '').includes('OCTEST1')))) fail('Gefunden nicht gespeichert');
  await page.getByTestId('cache-back').click();
  await page.getByTestId('cache-detail').waitFor({ state: 'detached' });
  if (!(await page.locator('.cache-item').first().innerText()).includes('✓')) fail('Gefunden-Haken fehlt in der Liste');
  console.log('✓ Echte Geocaches in der App: Liste, Details, Hinweis, Gefunden, HTML bereinigt');

  // Mitten in der Tour: beenden und Punkte behalten
  await page.getByLabel('Menü').click();
  await page.getByTestId('quit-tour').click();
  await page.getByTestId('quit-keep').click();
  await page.getByTestId('final-score').waitFor();
  console.log('✓ Tour vorzeitig beenden (Punkte behalten) funktioniert');
  // Neue Tour starten, löschen, rückgängig machen, dann endgültig löschen
  await page.getByRole('button', { name: 'Zum Hauptmenü' }).click();
  await planTour(page, { team: 'Löscher' });
  // Offline-Karten werden im Hintergrund gespeichert
  await page.waitForTimeout(2500);
  await page.getByLabel('Menü').click();
  await page.getByTestId('tiles-status').waitFor();
  console.log('✓ Offline-Karten:', await page.getByTestId('tiles-status').innerText());
  // Stromsparmodus
  await page.getByTestId('power-toggle').click();
  if (!(await page.evaluate(() => JSON.parse(localStorage.getItem('hh-hunt:powerSave'))))) fail('Stromsparmodus nicht gespeichert');
  console.log('✓ Stromsparmodus schaltbar');
  await page.getByTestId('quit-tour').click();
  await page.getByTestId('quit-delete').click();
  await page.getByTestId('undo').click();
  await page.locator('.play').waitFor();
  if (!(await page.evaluate(() => localStorage.getItem('hh-hunt:game')))) fail('Rückgängig hat die Tour nicht zurückgeholt');
  console.log('✓ Löschen lässt sich rückgängig machen');
  // Überspringen rückgängig
  const idx0 = await page.evaluate(() => JSON.parse(localStorage.getItem('hh-hunt:game')).index);
  await page.getByLabel('Menü').click();
  await page.getByRole('button', { name: /überspringen/ }).click();
  await page.getByLabel('Eltern-PIN').fill('1234');
  await page.getByRole('button', { name: 'Freischalten' }).click();
  await page.getByTestId('undo').click();
  const idx1 = await page.evaluate(() => JSON.parse(localStorage.getItem('hh-hunt:game')).index);
  if (idx1 !== idx0) fail(`Überspringen nicht rückgängig: ${idx0} → ${idx1}`);
  console.log('✓ Überspringen lässt sich rückgängig machen');
  await page.getByLabel('Menü').click();
  await page.getByTestId('quit-tour').click();
  await page.getByTestId('quit-delete').click();
  await page.getByTestId('new-tour').waitFor();
  await page.getByTestId('undo-toast').waitFor({ state: 'detached', timeout: 12000 });
  const left = await page.evaluate(() => localStorage.getItem('hh-hunt:game'));
  if (left) fail('Tour wurde nicht gelöscht');
  if (await page.getByRole('button', { name: /Weiterspielen/ }).count()) fail('Gelöschte Tour wird noch angeboten');
  console.log('✓ Tour mittendrin löschen funktioniert');

  // Sicherung: speichern, Daten löschen, wieder einspielen
  await page.locator('.tabbar').getByRole('button', { name: 'Mehr' }).click();
  const dl = page.waitForEvent('download');
  await page.getByTestId('backup-save').click();
  const file = await (await dl).path();
  const careerBefore = await page.evaluate(() => localStorage.getItem('hh-hunt:career'));
  await page.evaluate(() => localStorage.removeItem('hh-hunt:career'));
  await page.getByTestId('backup-load').setInputFiles(file);
  await page.waitForTimeout(1500);
  const careerAfter = await page.evaluate(() => localStorage.getItem('hh-hunt:career'));
  if (!careerAfter || JSON.parse(careerAfter).tours !== JSON.parse(careerBefore).tours) fail('Sicherung nicht korrekt eingespielt');
  console.log('✓ Sicherung speichern und laden funktioniert');
  if (errs.length) fail('Seitenfehler: ' + errs.join(' / '));
  await ctx.close();
}

// 7) Tour per Link teilen: Freunde bekommen genau dieselbe Route
{
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    permissions: ['geolocation', 'clipboard-read', 'clipboard-write'],
    geolocation: { latitude: 53.59078, longitude: 10.01519, accuracy: 10 },
  });
  await ctx.route(/tile\.openstreetmap\.org/, (r) => r.fulfill({ status: 204, body: '' }));
  const page = await ctx.newPage();
  await page.goto(URL);
  let link = '';
  let stopsA = [];
  await planTour(page, {
    team: 'Einlader',
    snap: async (n) => {
      if (n !== 'chat-route') return;
      stopsA = await page.locator('.chat-stops li').allInnerTexts();
      await page.evaluate(() => { delete navigator.share; });
      await page.getByTestId('share-tour').click();
      await page.getByTestId('share-msg').waitFor();
      link = (await page.evaluate(() => navigator.clipboard.readText())).split(' ').pop();
    },
  });
  if (!link.includes('?tour=')) fail('Kein Einladungslink erzeugt: ' + link);
  // Regen-Hinweis (mit nachgestellter Vorhersage)
  {
    const rctx = await browser.newContext({ viewport: { width: 390, height: 844 }, permissions: ['geolocation'], geolocation: { latitude: 53.59078, longitude: 10.01519, accuracy: 10 } });
    const rp = await rctx.newPage();
    await rp.goto(URL);
    await planTour(rp, { team: 'Regen', rain: true, snap: async (n) => {
      if (n !== 'chat-route') return;
      await rp.getByTestId('rain-warn').waitFor({ timeout: 5000 });
      console.log('✓ Regen-Hinweis:', (await rp.getByTestId('rain-warn').innerText()).slice(0, 60));
    } });
    await rctx.close();
  }
  const friend = await (await browser.newContext({ viewport: { width: 390, height: 844 }, permissions: ['geolocation'], geolocation: { latitude: 53.59078, longitude: 10.01519, accuracy: 10 } })).newPage();
  await friend.goto(link);
  await friend.getByTestId('chat-input').fill('Eingeladene');
  await friend.getByRole('button', { name: 'Senden' }).click();
  await friend.getByRole('button', { name: 'Passt so' }).click();
  await friend.getByTestId('chat-input').fill('1111');
  await friend.getByRole('button', { name: 'Senden' }).click();
  await friend.getByRole('button', { name: "Los geht's!" }).waitFor();
  if (await friend.getByTestId('reroll').count()) fail('Eingeladene sollen die Route nicht neu würfeln');
  const stopsB = await friend.locator('.chat-stops li').allInnerTexts();
  if (JSON.stringify(stopsA) !== JSON.stringify(stopsB)) fail(`Andere Route beim Freund:\n${stopsA}\n${stopsB}`);
  if (friend.url().includes('tour=')) fail('Einladungscode bleibt in der Adresse stehen');
  console.log(`✓ Tour per Link geteilt: Freunde bekommen dieselben ${stopsB.length} Ziele`);
  // Team-Vergleich: Ergebnis-Link eines anderen Teams annehmen, nachspielen, Rangliste
  {
    const tourCode = new globalThis.URL(link).searchParams.get('tour');
    const tour = JSON.parse(Buffer.from(tourCode, 'base64url').toString('utf8'));
    const fpStr = tour.st.map(([k, id]) => `${k}:${id}`).join('|');
    let h = 2166136261;
    for (let i = 0; i < fpStr.length; i++) h = Math.imul(h ^ fpStr.charCodeAt(i), 16777619);
    const fp = (h >>> 0).toString(36) + tour.st.length.toString(36);
    const result = { fp, team: 'Die Herausforderer', avatar: '🦊', points: 42, stations: 3, total: 4, meters: 2300, ms: 5400000, treasure: true, at: Date.now() - 3600000 };
    const code = Buffer.from(JSON.stringify({ v: 1, r: result, t: tourCode }), 'utf8').toString('base64url');
    const rctx = await browser.newContext({ viewport: { width: 390, height: 844 }, permissions: ['geolocation'], geolocation: { latitude: 53.59078, longitude: 10.01519, accuracy: 10 } });
    await rctx.route(/tile\.openstreetmap\.org/, (r) => r.fulfill({ status: 204, body: '' }));
    const rp = await rctx.newPage();
    await rp.goto(`${URL}?result=${code}`);
    await rp.getByTestId('compare').waitFor();
    if (!(await rp.getByTestId('leaderboard').innerText()).includes('Die Herausforderer')) fail('Rangliste zeigt das andere Team nicht');
    await rp.getByTestId('accept-challenge').click();
    await rp.getByTestId('chat-input').fill('Gegenteam');
    await rp.getByRole('button', { name: 'Senden' }).click();
    await rp.getByRole('button', { name: 'Passt so' }).click();
    await rp.getByTestId('chat-input').fill('2222');
    await rp.getByRole('button', { name: 'Senden' }).click();
    await rp.getByRole('button', { name: "Los geht's!" }).click();
    await rp.locator('.play').waitFor();
    await rp.getByLabel('Menü').click();
    await rp.getByTestId('quit-tour').click();
    await rp.getByTestId('quit-keep').click();
    await rp.getByTestId('final-score').waitFor();
    const board = await rp.getByTestId('leaderboard').innerText();
    if (!board.includes('Die Herausforderer') || !board.includes('Gegenteam')) fail('Rangliste nach der Tour unvollständig: ' + board);
    if (await rp.locator('[data-testid=crash]').count()) fail('Absturzseite beim Team-Vergleich');
    console.log('✓ Team-Vergleich: Herausforderung angenommen, beide Teams in der Rangliste');
    await rctx.close();
  }
  await ctx.close();
}

await browser.close();
console.log('OK – alle Sonderfälle bestanden');
