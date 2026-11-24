import type { Game } from '../state/game';
import { BADGES } from '../data/badges';
import { formatDistance } from './geo';
import { loadPhoto } from './storage';

const INK = '#1E2A4A';
const ACCENT = '#EF7A2F';
const MUTED = '#5B6683';

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((res) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => res(null);
    img.src = src;
  });
}

/** Lilli so, wie sie gerade auf dem Bildschirm steht (mit Kostüm), als Bild */
async function lilliImage(): Promise<HTMLImageElement | null> {
  const svg = document.querySelector('svg.lilli');
  if (!svg) return null;
  const clone = svg.cloneNode(true) as SVGElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', '400');
  clone.setAttribute('height', '400');
  return loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(clone.outerHTML)}`);
}

function roundRect(x: CanvasRenderingContext2D, px: number, py: number, w: number, h: number, r: number) {
  x.beginPath();
  x.roundRect(px, py, w, h, r);
}

function fitText(x: CanvasRenderingContext2D, text: string, max: number): string {
  if (x.measureText(text).width <= max) return text;
  let t = text;
  while (t.length > 3 && x.measureText(t + '…').width > max) t = t.slice(0, -1);
  return t + '…';
}

/**
 * Erinnerungskarte (1080 × 1350, gut für Messenger und Ausdruck):
 * Lilli, Team, bis zu drei Fotos als Polaroids, besuchte Orte, Zahlen und Abzeichen.
 */
export async function drawCertificate(
  game: Game,
  stations: number,
  walk?: { steps: number; estimated: boolean; meters: number; time: string },
  places: string[] = [],
): Promise<Blob | null> {
  const W = 1080;
  const H = 1350;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const x = c.getContext('2d');
  if (!x) return null;
  try {
    await document.fonts?.ready;
  } catch {
    /* egal */
  }
  const display = '"Fredoka", "Nunito", system-ui, sans-serif';
  const body = '"Nunito", system-ui, sans-serif';

  // Hintergrund: Himmel oben, cremefarbener Grund
  x.fillStyle = '#FFF8EE';
  x.fillRect(0, 0, W, H);
  const sky = x.createLinearGradient(0, 0, 0, 420);
  sky.addColorStop(0, '#A9DBFF');
  sky.addColorStop(1, '#E6F5FF');
  x.fillStyle = sky;
  x.fillRect(0, 0, W, 420);
  x.fillStyle = '#FFD23F';
  x.beginPath();
  x.arc(1010, 50, 56, 0, Math.PI * 2);
  x.fill();
  x.fillStyle = '#6FB6F0';
  x.beginPath();
  x.moveTo(0, 380);
  x.bezierCurveTo(260, 330, 520, 370, 760, 355);
  x.bezierCurveTo(900, 345, 1000, 340, W, 360);
  x.lineTo(W, 420);
  x.lineTo(0, 420);
  x.fill();
  x.fillStyle = '#FFF8EE';
  x.beginPath();
  x.moveTo(0, 410);
  x.bezierCurveTo(300, 380, 600, 400, W, 392);
  x.lineTo(W, 440);
  x.lineTo(0, 440);
  x.fill();

  const lilli = await lilliImage();
  if (lilli) x.drawImage(lilli, 70, 110, 300, 300);

  x.textAlign = 'left';
  x.fillStyle = INK;
  x.font = `600 44px ${body}`;
  x.fillText('Schnitzeljagd Hamburg', 400, 140);
  // Teamname: lieber kleiner als abgeschnitten
  const team = `${game.team.avatar} ${game.team.name}`;
  let fs = 76;
  x.font = `700 ${fs}px ${display}`;
  while (fs > 40 && x.measureText(team).width > 620) {
    fs -= 4;
    x.font = `700 ${fs}px ${display}`;
  }
  x.fillText(fitText(x, team, 620), 400, 230);
  x.font = `700 40px ${body}`;
  x.fillStyle = MUTED;
  x.fillText(new Date(game.finishedAt ?? Date.now()).toLocaleDateString('de-DE', { dateStyle: 'long' }), 400, 290);

  // Fotos als Polaroids
  const photos: HTMLImageElement[] = [];
  for (const p of game.photos.slice(0, 3)) {
    const blob = await loadPhoto(p.id);
    if (!blob) continue;
    const url = URL.createObjectURL(blob);
    const img = await loadImage(url);
    if (img) photos.push(img);
  }
  let y = 470;
  if (photos.length) {
    const n = photos.length;
    const pw = n === 1 ? 520 : n === 2 ? 420 : 300;
    const gap = 30;
    const total = n * pw + (n - 1) * gap;
    photos.forEach((img, i) => {
      const px = (W - total) / 2 + i * (pw + gap);
      const tilt = (i - (n - 1) / 2) * 0.05;
      x.save();
      x.translate(px + pw / 2, y + pw / 2);
      x.rotate(tilt);
      x.shadowColor = 'rgba(30,42,74,0.18)';
      x.shadowBlur = 18;
      x.shadowOffsetY = 8;
      x.fillStyle = '#FFFFFF';
      x.fillRect(-pw / 2 - 14, -pw / 2 - 14, pw + 28, pw + 60);
      x.shadowColor = 'transparent';
      const s = Math.min(img.width, img.height);
      x.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, -pw / 2, -pw / 2, pw, pw);
      x.restore();
    });
    y += pw + 90;
  }

  // Zahlen
  const stats: [string, string][] = [
    [String(game.points), 'Punkte'],
    [String(stations), 'Stationen'],
    [formatDistance(walk?.meters ?? (game.meters || game.plannedMeters)), 'zu Fuß'],
  ];
  if (walk) stats.push([`${walk.estimated ? 'ca. ' : ''}${walk.steps.toLocaleString('de-DE')}`, 'Schritte']);
  const bw = (W - 140 - (stats.length - 1) * 20) / stats.length;
  stats.forEach(([v, l], i) => {
    const bx = 70 + i * (bw + 20);
    x.fillStyle = '#FFFFFF';
    roundRect(x, bx, y, bw, 150, 28);
    x.fill();
    x.textAlign = 'center';
    x.fillStyle = i === 0 ? ACCENT : INK;
    x.font = `600 ${v.length > 7 ? 44 : 58}px ${display}`;
    x.fillText(v, bx + bw / 2, y + 78);
    x.fillStyle = MUTED;
    x.font = `700 30px ${body}`;
    x.fillText(l, bx + bw / 2, y + 122);
  });
  y += 210;

  // Orte
  x.textAlign = 'left';
  if (places.length && y < H - 200) {
    x.fillStyle = INK;
    x.font = `600 38px ${display}`;
    x.fillText('Unterwegs entdeckt', 70, y);
    y += 50;
    x.font = `600 32px ${body}`;
    x.fillStyle = MUTED;
    for (const p of places.slice(0, Math.max(1, Math.floor((H - 160 - y) / 44)))) {
      x.fillText(fitText(x, `• ${p}`, W - 140), 70, y);
      y += 44;
    }
  }

  // Abzeichen unten
  const badges = BADGES.filter((b) => game.earnedBadges.includes(b.id));
  x.textAlign = 'center';
  if (badges.length) {
    x.font = `56px ${body}`;
    x.fillText(badges.map((b) => b.icon).slice(0, 10).join(' '), W / 2, H - 80);
  } else {
    x.fillStyle = MUTED;
    x.font = `700 32px ${body}`;
    x.fillText('Bis zur nächsten Tour! – Lilli', W / 2, H - 80);
  }
  return new Promise((res) => c.toBlob((b) => res(b), 'image/png'));
}

export async function shareOrDownload(blob: Blob, filename: string): Promise<void> {
  const file = new File([blob], filename, { type: blob.type });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  try {
    if (nav.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: 'Schnitzeljagd Hamburg' });
      return;
    }
  } catch {
    /* abgebrochen → Download */
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
