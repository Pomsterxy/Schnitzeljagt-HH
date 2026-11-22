import { useEffect, useState } from 'react';
import { BADGES } from '../data/badges';
import { formatDistance } from '../lib/geo';
import { drawCertificate, shareOrDownload } from '../lib/certificate';
import { loadPhoto } from '../lib/storage';
import { finishedStations, finishGame, useGame } from '../state/game';
import { rankFor } from '../data/badges';

export function PhotoGrid({ photos }: { photos: { id: string; title: string }[] }) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  useEffect(() => {
    let alive = true;
    const made: string[] = [];
    void (async () => {
      const out: Record<string, string> = {};
      for (const p of photos) {
        const b = await loadPhoto(p.id);
        if (b) {
          const u = URL.createObjectURL(b);
          made.push(u);
          out[p.id] = u;
        }
      }
      if (alive) setUrls(out);
    })();
    return () => {
      alive = false;
      made.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [photos]);
  if (!photos.length) return <p className="muted">Keine Fotos in dieser Tour.</p>;
  return (
    <div className="photo-grid">
      {photos.map((p) =>
        urls[p.id] ? (
          <figure key={p.id}>
            <img src={urls[p.id]} alt={p.title} />
            <button
              type="button"
              className="btn small ghost"
              onClick={async () => {
                const b = await loadPhoto(p.id);
                if (b) await shareOrDownload(b, `schnitzeljagd-${p.id}.jpg`);
              }}
            >
              Teilen / Speichern
            </button>
          </figure>
        ) : null,
      )}
    </div>
  );
}

export function Finish({ onHome }: { onHome: () => void }) {
  const { game, career } = useGame();
  useEffect(() => {
    if (game && !game.finishedAt) finishGame();
  }, [game]);
  if (!game) return null;
  const stations = finishedStations(game);
  const earned = BADGES.filter((b) => game.earnedBadges.includes(b.id));
  const minutes = Math.round(((game.finishedAt ?? Date.now()) - game.startedAt) / 60000);
  const rank = rankFor(career.points);

  return (
    <div className="screen finish">
      <h1>🏁 Geschafft!</h1>
      <p className="big-score" data-testid="final-score">
        {game.team.avatar} {game.team.name}: ⭐ {game.points} Punkte
      </p>
      <ul className="stats">
        <li>📍 {stations.length} Stationen gefunden</li>
        <li>👟 {formatDistance(game.meters)} gelaufen (geplant: {formatDistance(game.plannedMeters)})</li>
        <li>⏱️ {minutes} Minuten unterwegs</li>
        <li>
          🎖️ Euer Rang: <strong>{rank.title}</strong> ({career.points} Punkte insgesamt
          {rank.next ? `, noch ${rank.next.min - career.points} bis „${rank.next.title}“` : ''})
        </li>
      </ul>
      <h3>Abzeichen</h3>
      {earned.length ? (
        <div className="badges">
          {earned.map((b) => (
            <div key={b.id} className={b.quiet ? 'badge quiet' : 'badge'} title={b.description}>
              <span className="icon">{b.icon}</span>
              <span>{b.title}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="muted">Diesmal keine Abzeichen, beim nächsten Mal klappt's!</p>
      )}
      <button
        type="button"
        className="btn primary"
        onClick={async () => {
          const b = await drawCertificate(game, stations.length);
          if (b) await shareOrDownload(b, `urkunde-${game.team.name.replace(/\W+/g, '-')}.png`);
        }}
      >
        📜 Urkunde herunterladen / teilen
      </button>
      <h3>Euer Fotoalbum</h3>
      <PhotoGrid photos={game.photos} />
      <button type="button" className="btn big" onClick={onHome}>
        Zum Hauptmenü
      </button>
    </div>
  );
}
