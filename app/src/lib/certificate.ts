import type { Game } from '../state/game';
import { BADGES } from '../data/badges';
import { formatDistance } from './geo';

/** Zeichnet die Urkunde als PNG (Canvas) */
export async function drawCertificate(game: Game, stations: number): Promise<Blob | null> {
  const W = 1080;
  const H = 1350;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const x = c.getContext('2d');
  if (!x) return null;
  x.fillStyle = '#fffaf0';
  x.fillRect(0, 0, W, H);
  x.strokeStyle = '#0b6e99';
  x.lineWidth = 18;
  x.strokeRect(30, 30, W - 60, H - 60);
  x.strokeStyle = '#e07a00';
  x.lineWidth = 4;
  x.strokeRect(62, 62, W - 124, H - 124);
  x.textAlign = 'center';
  x.fillStyle = '#0b3d5c';
  x.font = 'bold 76px system-ui, sans-serif';
  x.fillText('URKUNDE', W / 2, 200);
  x.font = '38px system-ui, sans-serif';
  x.fillText('Schnitzeljagd Hamburg', W / 2, 260);
  x.font = '150px system-ui, sans-serif';
  x.fillText(game.team.avatar, W / 2, 450);
  x.font = 'bold 64px system-ui, sans-serif';
  x.fillStyle = '#e07a00';
  x.fillText(game.team.name, W / 2, 560);
  x.fillStyle = '#0b3d5c';
  x.font = '36px system-ui, sans-serif';
  const names = game.team.members.map((m) => m.name.trim()).filter(Boolean).join(', ');
  if (names) x.fillText(names, W / 2, 615);
  x.font = '40px system-ui, sans-serif';
  x.fillText(`hat ${stations} Stationen gefunden`, W / 2, 700);
  x.fillText(`und ${formatDistance(game.meters || game.plannedMeters)} zurückgelegt.`, W / 2, 755);
  x.font = 'bold 90px system-ui, sans-serif';
  x.fillText(`⭐ ${game.points} Punkte`, W / 2, 880);
  const badges = BADGES.filter((b) => game.earnedBadges.includes(b.id));
  x.font = '64px system-ui, sans-serif';
  const row = badges.map((b) => b.icon).join(' ');
  if (row) x.fillText(row.slice(0, 40), W / 2, 1000);
  x.font = '30px system-ui, sans-serif';
  x.fillText(badges.map((b) => b.title).slice(0, 5).join(' · '), W / 2, 1060);
  x.font = '30px system-ui, sans-serif';
  x.fillStyle = '#555';
  x.fillText(new Date(game.finishedAt ?? Date.now()).toLocaleDateString('de-DE', { dateStyle: 'long' }), W / 2, 1200);
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
