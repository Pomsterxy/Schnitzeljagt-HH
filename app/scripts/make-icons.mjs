// Erzeugt das App-Icon aus der echten Lilli der App (gleiche Zeichnung, gleiche Farben).
// Nutzung: App bauen und starten (npm run build && npx vite preview --port 4173), dann
//   node scripts/make-icons.mjs http://localhost:4173/
// Schreibt icon-src/*.svg und public/icon.svg, icon-192.png, icon-512.png, icon-maskable-512.png, apple-touch-icon.png
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const APP = process.argv[2] ?? 'http://localhost:4173/';
const C = { leaf: '#5A6A42', leafDark: '#4E5C39', sun: '#F6BC57', cream: '#F9F1E1' };

const browser = await chromium.launch();
const page = await browser.newPage();
// ohne Kostüm, ohne Animation
await page.addInitScript(() => localStorage.setItem('hh-hunt:outfit', JSON.stringify('none')));
await page.goto(APP);
const lilli = await page.locator('.home-avatar svg.lilli').evaluate((el) => {
  const c = el.cloneNode(true);
  c.removeAttribute('class');
  c.removeAttribute('width');
  c.removeAttribute('height');
  c.removeAttribute('aria-hidden');
  c.querySelectorAll('[class]').forEach((n) => n.removeAttribute('class'));
  return c.innerHTML;
});

/** Icon-Motiv: Laubgrün, Sonne, cremefarbener Hügel, Lilli (scale = Anteil der Fläche) */
function icon(scale) {
  const s = (1024 * scale) / 200;
  const x = (1024 - 200 * s) / 2;
  const y = 1024 - 200 * s - (1024 * (1 - scale)) / 2 + 40 * scale;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <rect width="1024" height="1024" fill="${C.leaf}"/>
  <circle cx="760" cy="250" r="${230 * scale + 40}" fill="${C.sun}" opacity="0.35"/>
  <circle cx="760" cy="250" r="${150 * scale + 20}" fill="${C.sun}"/>
  <path d="M0 ${800 + (1 - scale) * 40} C220 ${740 + (1 - scale) * 40} 420 ${770 + (1 - scale) * 40} 560 ${760 + (1 - scale) * 40} C760 ${745 + (1 - scale) * 40} 900 ${735 + (1 - scale) * 40} 1024 ${760 + (1 - scale) * 40} V1024 H0 Z" fill="${C.cream}"/>
  <g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${s.toFixed(4)})">${lilli}</g>
</svg>`;
}
const full = icon(0.82);
const mask = icon(0.62); // innerhalb der sicheren Zone (80 % Kreis) für "maskable"
writeFileSync(new URL('../icon-src/icon-full.svg', import.meta.url), full);
writeFileSync(new URL('../icon-src/icon-maskable.svg', import.meta.url), mask);
writeFileSync(new URL('../public/icon.svg', import.meta.url), full);

async function png(svg, size, file) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0">${svg.replace('width="1024" height="1024"', `width="${size}" height="${size}"`)}</body></html>`);
  await page.locator('svg').screenshot({ path: new URL(`../public/${file}`, import.meta.url).pathname, omitBackground: false });
}
await png(full, 192, 'icon-192.png');
await png(full, 512, 'icon-512.png');
await png(full, 180, 'apple-touch-icon.png');
await png(mask, 512, 'icon-maskable-512.png');
// Vorschau mit abgerundeten Ecken (wie auf dem Home-Bildschirm)
await page.setViewportSize({ width: 600, height: 600 });
await page.setContent(`<html><body style="margin:0;background:#ddd;display:flex;gap:30px;align-items:center;justify-content:center;height:600px">
  <div style="width:220px;height:220px;border-radius:50px;overflow:hidden">${full.replace('width="1024" height="1024"', 'width="220" height="220"')}</div>
  <div style="width:220px;height:220px;border-radius:50%;overflow:hidden">${mask.replace('width="1024" height="1024"', 'width="220" height="220"')}</div></body></html>`);
await page.screenshot({ path: new URL('../icon-src/preview-rounded.png', import.meta.url).pathname });
await browser.close();
console.log('Icons geschrieben');
