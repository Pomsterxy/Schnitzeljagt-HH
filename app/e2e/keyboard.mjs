// Prüft, dass die Bildschirmtastatur keine Eingabefelder (und ihre Knöpfe) verdeckt.
// iPhone-Art: Tastatur legt sich über die Seite (visualViewport wird kleiner, Seite nicht).
// Android-Art: Seite wird kleiner (interactive-widget=resizes-content).
// Nutzung: node e2e/keyboard.mjs [url]
import { createRequire } from 'node:module';
import { answerQuiz, planTour } from './chat.mjs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const URL = process.argv[2] ?? 'http://localhost:4173/';
const KB = 336; // typische iPhone-Tastatur mit Wortvorschlägen
const problems = [];

/** Simuliert eine iPhone-Tastatur: visualViewport schrumpft beim Fokus auf ein Eingabefeld */
const fakeKeyboard = (kb) => {
  const vv = new EventTarget();
  let h = window.innerHeight;
  Object.defineProperties(vv, {
    height: { get: () => h },
    width: { get: () => window.innerWidth },
    offsetTop: { get: () => 0 },
    offsetLeft: { get: () => 0 },
    scale: { get: () => 1 },
  });
  Object.defineProperty(window, 'visualViewport', { configurable: true, get: () => vv });
  const set = (open) => {
    h = window.innerHeight - (open ? kb : 0);
    window.__kbOpen = open;
    vv.dispatchEvent(new Event('resize'));
  };
  document.addEventListener('focusin', (e) => {
    if (e.target.matches('input:not([type=file]), textarea')) set(true);
  });
  document.addEventListener('focusout', () => setTimeout(() => !document.activeElement?.matches('input, textarea') && set(false), 50));
};

/** Ist das Element vollständig im sichtbaren Bereich über der Tastatur? */
async function visibleAboveKeyboard(page, locator, what, kbHeight) {
  await page.waitForTimeout(700);
  const r = await locator.evaluate((el) => {
    const b = el.getBoundingClientRect();
    return { top: b.top, bottom: b.bottom, vh: window.visualViewport ? window.visualViewport.height : window.innerHeight };
  });
  const limit = kbHeight === undefined ? r.vh : r.vh;
  if (r.bottom > limit + 1 || r.top < 0) {
    const msg = `${what}: verdeckt (oben ${Math.round(r.top)}, unten ${Math.round(r.bottom)}, sichtbar bis ${Math.round(limit)})`;
    problems.push(msg);
    console.log('✗ ' + msg);
  }
  else console.log(`✓ ${what} sichtbar (unten ${Math.round(r.bottom)} ≤ ${Math.round(limit)})`);
}

async function run(mode) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    permissions: ['geolocation'],
    geolocation: { latitude: 53.585, longitude: 10.01519, accuracy: 10 },
    hasTouch: true,
    isMobile: true,
  });
  await ctx.route(/tile\.openstreetmap\.org/, (r) => r.fulfill({ status: 204, body: '' }));
  const page = await ctx.newPage();
  if (mode === 'iphone') await page.addInitScript(fakeKeyboard, KB);
  // Android-Art: Seite beim Fokus verkleinern
  const android = async (open) => {
    if (mode === 'android') await page.setViewportSize({ width: 390, height: open ? 844 - 300 : 844 });
  };
  page.on('pageerror', (e) => problems.push(`${mode}: Seitenfehler ${e.message}`));
  await page.goto(URL);
  console.log(`\n== ${mode === 'iphone' ? 'iPhone-Art (Tastatur überlagert)' : 'Android-Art (Seite schrumpft)'} ==`);

  // Schriftgröße der Felder (iOS zoomt bei < 16 px)
  const checkFont = async (where) => {
    const small = await page.evaluate(() =>
      [...document.querySelectorAll('input:not([type=file]):not([hidden]), textarea')].map((el) => parseFloat(getComputedStyle(el).fontSize)).filter((f) => f < 16),
    );
    if (small.length) problems.push(`${mode}: ${where}: Eingabefeld mit Schrift ${small.join(', ')} px (iPhone zoomt hinein)`);
  };

  // 1) Chat: Teamname
  await page.getByTestId('new-tour').click();
  const input = page.getByTestId('chat-input');
  await checkFont('Chat');
  await input.click();
  await android(true);
  await input.fill('Die Tastaturtester');
  await visibleAboveKeyboard(page, input, `${mode}: Chat-Eingabe Teamname`);
  await visibleAboveKeyboard(page, page.getByRole('button', { name: 'Senden' }), `${mode}: Senden-Knopf`);
  await page.getByRole('button', { name: 'Senden' }).click();
  await android(false);
  await page.getByRole('button', { name: 'Abbrechen' }).click();

  // 2) Tour planen (bis zur PIN-Frage) und PIN eingeben
  await planTour(page, {
    team: 'Tastatur',
    snap: async () => {},
  }).catch((e) => problems.push(`${mode}: Planung ${e.message}`));

  // 3) Station: Antwortfelder (Zahl/Text) und PIN-Fenster
  for (let i = 0; i < 8; i++) {
    const st = await page.evaluate(() => {
      const g = JSON.parse(localStorage.getItem('hh-hunt:game'));
      return g.stops[g.index];
    });
    if (st.kind === 'station') break;
    const b = page.getByRole('button', { name: /Zwischenziel auslassen|Pause überspringen/ });
    if (await b.count()) await b.first().click();
    await page.waitForTimeout(300);
  }
  // PIN-Fenster über "Wir sind da"
  await page.getByRole('button', { name: /Wir sind da/ }).click();
  const pin = page.getByLabel('Eltern-PIN');
  await checkFont('PIN-Fenster');
  await pin.click();
  await android(true);
  await visibleAboveKeyboard(page, pin, `${mode}: PIN-Feld`);
  await visibleAboveKeyboard(page, page.getByRole('button', { name: 'Freischalten' }), `${mode}: Freischalten-Knopf`);
  await pin.fill('1234');
  await page.getByRole('button', { name: 'Freischalten' }).click();
  await android(false);
  await page.getByTestId('arrived').waitFor();

  // Antwortfeld in einer Aufgabe suchen (Quiz lösen, bis ein Eingabefeld kommt)
  await page.locator('.task-card').first().waitFor();
  await page.waitForTimeout(400);
  let tested = false;
  for (let g = 0; g < 10 && !tested; g++) {
    const card = page.locator('.task-card:not(.done)');
    const field = card.locator('input:not([type=file]), textarea');
    if ((await card.count()) && (await field.count())) {
      await checkFont('Aufgabe');
      await field.first().click();
      await android(true);
      await visibleAboveKeyboard(page, field.first(), `${mode}: Antwortfeld in der Aufgabe`);
      const btn = card.getByRole('button', { name: /Prüfen|Weiter/ });
      if (await btn.count()) await visibleAboveKeyboard(page, btn.first(), `${mode}: Prüfen-Knopf`);
      await page.keyboard.press('Tab');
      await android(false);
      tested = true;
      break;
    }
    if (await card.locator('.btn.option').count()) {
      await answerQuiz(page, card.first());
      continue;
    }
    if (await card.locator('.stepper').count()) {
      await card.getByRole('button', { name: 'Prüfen' }).click();
      await page.waitForTimeout(120);
      if (await page.locator('.task-card:not(.done) .stepper').count()) await page.locator('.task-card:not(.done)').getByRole('button', { name: 'Prüfen' }).click();
      continue;
    }
    if (await card.getByRole('button', { name: /Ohne Foto/ }).count()) {
      await card.getByRole('button', { name: /Ohne Foto/ }).click();
      continue;
    }
    const n = page.getByTestId('step-next');
    if ((await n.count()) && (await n.isEnabled())) {
      await n.click();
      continue;
    }
    break;
  }
  if (!tested) console.log(`(${mode}: an dieser Station gab es kein Antwortfeld)`);

  // 4) Problem melden: Textfeld im Sheet
  await page.waitForTimeout(800);
  await page.getByTestId('report-open').scrollIntoViewIfNeeded();
  await page.getByTestId('report-open').click();
  await page.getByTestId('report-text').waitFor();
  const ta = page.getByTestId('report-text');
  await checkFont('Problem melden');
  await ta.click();
  await android(true);
  await visibleAboveKeyboard(page, ta, `${mode}: Textfeld „Problem melden“`);
  await visibleAboveKeyboard(page, page.getByTestId('report-save'), `${mode}: Speichern-Knopf`);
  await android(false);
  await browser.close();
}

await run('iphone');
await run('android');
if (problems.length) {
  console.error('\nFEHLER:\n' + problems.join('\n'));
  process.exit(1);
}
console.log('\nOK – Tastatur verdeckt keine Eingabefelder');
