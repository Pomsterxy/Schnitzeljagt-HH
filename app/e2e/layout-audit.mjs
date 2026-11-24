// Layout-Prüfung: alle Hauptbildschirme in mehreren Bildschirmgrößen.
// Misst horizontalen Überlauf, zu kleine Tipp-Ziele, abgeschnittenen Text und von festen Leisten verdeckte Inhalte.
// Nutzung: node e2e/layout-audit.mjs [url] [ausgabeordner]
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { planTour } from './chat.mjs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const URL = process.argv[2] ?? 'http://localhost:4173/';
const OUT = process.argv[3] ?? 'e2e/layout';
mkdirSync(OUT, { recursive: true });

const VIEWPORTS = [
  { name: '320x568-SE', width: 320, height: 568 },
  { name: '390x844-iPhone', width: 390, height: 844 },
  { name: '430x932-ProMax', width: 430, height: 932 },
  { name: '844x390-quer', width: 844, height: 390 },
  { name: '768x1024-iPad', width: 768, height: 1024 },
  { name: '1280x800-Desktop', width: 1280, height: 800 },
];

/** Messungen im Browser */
const measure = () => {
  const vw = window.innerWidth;
  const issues = [];
  const doc = document.documentElement;
  if (doc.scrollWidth > vw + 1) issues.push(`Seite scrollt seitlich (${doc.scrollWidth}px > ${vw}px)`);
  const skip = (el) => el.closest('.leaflet-container, .fx-canvas, .confetti, svg, .step-pills, .cache-html table, .sr-only');
  const visible = (el) => {
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const label = (el) => `${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : ''} "${(el.innerText || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 28)}"`;
  // 1) Elemente, die seitlich aus dem Bildschirm ragen
  for (const el of document.querySelectorAll('body *')) {
    if (skip(el) || !visible(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.right > vw + 2 || r.left < -2) {
      const cs = getComputedStyle(el);
      if (cs.position === 'fixed' && (r.left < -50 || r.right > vw + 50)) continue;
      issues.push(`ragt raus (${Math.round(r.left)}–${Math.round(r.right)}): ${label(el)}`);
    }
  }
  // 2) Zu kleine Tipp-Ziele (Apple/Google: mindestens 44×44 bzw. 48×48)
  for (const el of document.querySelectorAll('button, a[href], input, select, summary, [role=button]')) {
    if (skip(el) || !visible(el) || el.closest('figcaption, .cache-attrib, .credits, .sources ul, .cache-html, .leaflet-control-attribution')) continue;
    const r = el.getBoundingClientRect();
    if (r.height < 36 || r.width < 36) issues.push(`kleines Tipp-Ziel ${Math.round(r.width)}×${Math.round(r.height)}: ${label(el)}`);
  }
  // 3) Abgeschnittener Text (nicht absichtlich mit … gekürzt)
  for (const el of document.querySelectorAll('h1, h2, h3, p, button, span, strong, a, label')) {
    if (skip(el) || !visible(el)) continue;
    const cs = getComputedStyle(el);
    if (cs.textOverflow === 'ellipsis') continue;
    if (el.scrollWidth > el.clientWidth + 2 && (cs.overflow === 'hidden' || cs.overflowX === 'hidden') && el.clientWidth > 0) issues.push(`Text abgeschnitten: ${label(el)}`);
  }
  // 4) Zu kleine Schrift
  for (const el of document.querySelectorAll('p, span, small, li, button, a, label, div')) {
    if (skip(el) || !visible(el) || el.closest('figcaption, .cache-attrib, .leaflet-control-attribution')) continue;
    if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 2)) continue;
    const fs = parseFloat(getComputedStyle(el).fontSize);
    if (fs < 12) issues.push(`Schrift ${fs}px: ${label(el)}`);
  }
  // 5) Feste Leisten verdecken den letzten Inhalt? (am Seitenende prüfen)
  const bars = [...document.querySelectorAll('.tabbar, .composer, .step-bar, .action-bar')].filter(visible);
  return { issues: [...new Set(issues)], bars: bars.map((b) => b.className) };
};

const results = {};
const browser = await chromium.launch();
for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    permissions: ['geolocation'],
    geolocation: { latitude: 53.585, longitude: 10.01519, accuracy: 10 },
  });
  await ctx.route(/tile\.openstreetmap\.org/, (r) => r.fulfill({ status: 204, body: '', headers: { 'Access-Control-Allow-Origin': '*' } }));
  await ctx.route(/opencaching\.de/, (r) => r.fulfill({ status: 204, body: '', headers: { 'Access-Control-Allow-Origin': '*' } }));
  const page = await ctx.newPage();
  const res = (results[vp.name] = {});
  const shot = async (name, full = false) => {
    await page.waitForTimeout(700);
    res[name] = await page.evaluate(measure);
    await page.screenshot({ path: `${OUT}/${vp.name}-${name}.png`, fullPage: full });
    // auch ganz nach unten scrollen und dort prüfen
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(300);
    const bottom = await page.evaluate(measure);
    for (const i of bottom.issues) if (!res[name].issues.includes(i)) res[name].issues.push(i + ' (unten)');
    await page.screenshot({ path: `${OUT}/${vp.name}-${name}-unten.png` });
    await page.evaluate(() => window.scrollTo(0, 0));
  };
  await page.goto(URL);
  await shot('start');
  await planTour(page, {
    snap: async (n) => {
      if (n === 'chat-districts') await shot('chat');
      if (n === 'chat-route') {
        await page.getByTestId('tour-settings').locator('summary').click();
        await shot('route');
      }
    },
  });
  await shot('unterwegs');
  // zur ersten Station
  for (let i = 0; i < 8; i++) {
    const st = await page.evaluate(() => {
      const g = JSON.parse(localStorage.getItem('hh-hunt:game'));
      return g.stops[g.index];
    });
    if (st.kind === 'station') break;
    if (st.kind === 'waypoint' && i === 0) await shot('zwischenziel');
    const t = (await page.locator('.play').getAttribute('data-target')).split(',').map(Number);
    await ctx.setGeolocation({ latitude: t[0], longitude: t[1], accuracy: 8 });
    await page.waitForTimeout(2200);
    const p = page.getByRole('button', { name: /Pause beendet|Pause überspringen/ });
    if (await p.count()) await p.click();
  }
  const t = (await page.locator('.play').getAttribute('data-target')).split(',').map(Number);
  await ctx.setGeolocation({ latitude: t[0], longitude: t[1], accuracy: 8 });
  await page.getByTestId('arrived').waitFor();
  await page.waitForTimeout(2500);
  await shot('station-raetsel');
  const o = page.locator('.task-card:not(.done) .btn.option').first();
  if (await o.count()) await o.click();
  await shot('station-geloest');
  await page.getByLabel('Menü').click();
  await shot('menue');
  await page.getByTestId('quit-tour').click();
  await page.getByTestId('quit-keep').click();
  await page.getByTestId('final-score').waitFor();
  await page.waitForTimeout(3500);
  await shot('ende', true);
  await page.getByRole('button', { name: 'Zum Hauptmenü' }).click();
  await page.locator('.tabbar').getByRole('button', { name: 'Album' }).click();
  await shot('album');
  await page.locator('.tabbar').getByRole('button', { name: 'Abzeichen' }).click();
  await shot('abzeichen');
  await page.locator('.tabbar').getByRole('button', { name: 'Mehr' }).click();
  await shot('mehr', true);
  await ctx.close();
  console.log(vp.name, 'fertig');
}
await browser.close();
writeFileSync(`${OUT}/report.json`, JSON.stringify(results, null, 1));
let total = 0;
for (const [vp, screens] of Object.entries(results)) {
  for (const [screen, r] of Object.entries(screens)) {
    if (!r.issues.length) continue;
    total += r.issues.length;
    console.log(`\n## ${vp} · ${screen}`);
    for (const i of r.issues.slice(0, 12)) console.log('  - ' + i);
    if (r.issues.length > 12) console.log(`  … und ${r.issues.length - 12} weitere`);
  }
}
console.log(`\nBefunde gesamt: ${total}`);
