import type { LatLng } from '../data/types';

/*
 * Sonnenuntergang berechnen (Formeln nach dem bekannten Verfahren der NOAA/SunCalc, selbst umgesetzt).
 * Genau auf wenige Minuten – reicht für "Es wird bald dunkel".
 */
const rad = Math.PI / 180;
const dayMs = 864e5;
const J1970 = 2440588;
const J2000 = 2451545;
const e = rad * 23.4397;
const toJulian = (d: Date) => d.valueOf() / dayMs - 0.5 + J1970;
const fromJulian = (j: number) => new Date((j + 0.5 - J1970) * dayMs);
const toDays = (d: Date) => toJulian(d) - J2000;
const solarMeanAnomaly = (d: number) => rad * (357.5291 + 0.98560028 * d);
const eclipticLongitude = (M: number) => M + rad * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M)) + rad * 102.9372 + Math.PI;
const declination = (l: number) => Math.asin(Math.sin(e) * Math.sin(l));
const J0 = 0.0009;
const julianCycle = (d: number, lw: number) => Math.round(d - J0 - lw / (2 * Math.PI));
const approxTransit = (Ht: number, lw: number, n: number) => J0 + (Ht + lw) / (2 * Math.PI) + n;
const solarTransitJ = (ds: number, M: number, L: number) => J2000 + ds + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L);
const hourAngle = (h: number, phi: number, d: number) => Math.acos((Math.sin(h) - Math.sin(phi) * Math.sin(d)) / (Math.cos(phi) * Math.cos(d)));

/** Sonnenuntergang am Tag von `date` am Ort `at` */
export function sunset(date: Date, at: LatLng): Date {
  const lw = rad * -at[1];
  const phi = rad * at[0];
  const d = toDays(date);
  const n = julianCycle(d, lw);
  const ds = approxTransit(0, lw, n);
  const M = solarMeanAnomaly(ds);
  const L = eclipticLongitude(M);
  const dec = declination(L);
  const w = hourAngle(-0.833 * rad, phi, dec);
  const a = approxTransit(w, lw, n);
  return fromJulian(solarTransitJ(a, M, L));
}

export function clock(d: Date): string {
  return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

/** Hinweis, wenn die Tour nach Sonnenuntergang endet (oder kurz davor) */
export function daylightWarning(now: Date, minutes: number, at: LatLng): string | null {
  const set = sunset(now, at);
  const end = new Date(now.valueOf() + minutes * 60000);
  if (now > set) return `Die Sonne ist schon untergegangen (${clock(set)} Uhr). Nehmt eine Taschenlampe mit oder spielt lieber morgen.`;
  if (end.valueOf() > set.valueOf() - 10 * 60000)
    return `Die Sonne geht um ${clock(set)} Uhr unter, die Tour endet aber erst gegen ${clock(end)} Uhr. Plant lieber eine kürzere Tour oder startet früher.`;
  return null;
}

/** Regen-Hinweis von Open-Meteo (frei, ohne Schlüssel). Gesendet wird nur der grob gerundete Startpunkt. */
export async function rainWarning(at: LatLng, minutes: number): Promise<string | null> {
  const params = new URLSearchParams({
    latitude: at[0].toFixed(2),
    longitude: at[1].toFixed(2),
    hourly: 'precipitation_probability,precipitation',
    forecast_days: '2',
    timezone: 'Europe/Berlin',
  });
  const r = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  if (!r.ok) return null;
  const d = (await r.json()) as { hourly?: { time: string[]; precipitation_probability: number[]; precipitation: number[] } };
  const h = d.hourly;
  if (!h) return null;
  const now = Date.now();
  const end = now + minutes * 60000;
  let worst: { t: string; p: number } | null = null;
  h.time.forEach((t, i) => {
    // Stunden, die sich mit der Tour überschneiden (Zeiten kommen in Ortszeit Hamburg)
    const start = new Date(t).valueOf();
    if (start + 3600000 < now || start > end) return;
    const p = h.precipitation_probability[i] ?? 0;
    if (p >= 60 && (h.precipitation[i] ?? 0) >= 0.3 && (!worst || p > worst.p)) worst = { t, p };
  });
  if (!worst) return null;
  const w = worst as { t: string; p: number };
  return `Regen möglich gegen ${w.t.slice(11, 16)} Uhr (${w.p} %). Packt Regenjacken ein – oder wählt eine kürzere Tour.`;
}
