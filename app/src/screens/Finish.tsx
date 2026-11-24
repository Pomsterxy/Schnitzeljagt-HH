import { useEffect, useState } from 'react';
import { BADGES, rankFor } from '../data/badges';
import { formatDistance } from '../lib/geo';
import { drawCertificate, shareOrDownload } from '../lib/certificate';
import { loadPhoto } from '../lib/storage';
import { play } from '../lib/feedback';
import { finishedStations, finishGame, tourStats, useGame } from '../state/game';
import { formatDuration, formatSteps, strideFor } from '../lib/pedometer';
import { youngestGroup } from '../lib/scoring';
import { LilliSays } from '../components/Lilli';
import { TalkCard } from '../components/TalkCard';
import { StarRating } from '../components/Micro';
import { shareGame } from './Play';
import { Icon } from '../components/Icon';
import { celebrateFinish } from '../lib/effects';

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
          <figure key={p.id} className="rise">
            <img src={urls[p.id]} alt={p.title} />
            <button
              type="button"
              className="btn small tinted"
              onClick={async () => {
                const b = await loadPhoto(p.id);
                if (b) await shareOrDownload(b, `schnitzeljagd-${p.id}.jpg`);
              }}
            >
              <Icon name="share" size={16} /> Teilen
            </button>
          </figure>
        ) : null,
      )}
    </div>
  );
}

export function Finish({ onHome }: { onHome: () => void }) {
  const { game, career } = useGame();
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (game && !game.finishedAt) {
      finishGame();
      play('treasure');
    }
  }, [game]);
  // Punkte hochzählen
  useEffect(() => {
    if (!game) return;
    const target = game.points;
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / 1200);
      setShown(Math.round(target * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [game?.points, game]);
  useEffect(() => {
    const t = setTimeout(celebrateFinish, 300);
    return () => clearTimeout(t);
  }, []);
  if (!game) return null;
  const stations = finishedStations(game);
  const earned = BADGES.filter((b) => game.earnedBadges.includes(b.id));
  const stats = tourStats(game, strideFor(youngestGroup(game.team.members.map((m) => m.age))));
  const rank = rankFor(career.points);

  return (
    <div className="screen finish">
      <div className="finish-hero">
        <div className="caption rise">Tour geschafft</div>
        <div className="score-big pop" data-testid="final-score" aria-label={`${game.team.name}: ${game.points} Punkte`}>
          {shown}
        </div>
        <div className="rise" style={{ fontSize: 17, fontWeight: 600 }}>
          Punkte für {game.team.avatar} {game.team.name}
        </div>
      </div>
      <LilliSays mood="excited">
        Was für eine Tour! {game.final?.found ? 'Und den Schatz habt ihr auch geknackt. ' : ''}Ihr seid jetzt „{rank.title}“.
        {rank.next ? ` Noch ${rank.next.min - career.points} Punkte bis „${rank.next.title}“.` : ''}
      </LilliSays>
      <StarRating id={game.id} />
      <button type="button" className="btn" data-testid="finish-share" onClick={() => void shareGame(game)}>
        Diese Tour an Freunde weitergeben
      </button>
      <TalkCard pools={['finish']} seed={game.config.seed} youngest={youngestGroup(game.team.members.map((m) => m.age))} title="Zum Nachklang" />
      <section className="card walk-stats rise" aria-label="Eure Tour in Zahlen">
        <div className="caption">Eure Tour in Zahlen</div>
        <div className="walk-main" data-testid="steps">
          <Icon name="steps" size={30} color="var(--accent)" width={1.8} />
          <div>
            <div className="walk-big">
              {stats.estimated ? 'ca. ' : ''}
              {formatSteps(stats.steps)}
            </div>
            <div className="muted">Schritte{stats.estimated ? ' (geschätzt aus der Strecke)' : ''}</div>
          </div>
        </div>
        <div className="walk-grid">
          <div>
            <Icon name="route" size={20} color="var(--teal)" />
            <strong data-testid="walk-distance">{formatDistance(stats.meters)}</strong>
            <span>Strecke</span>
          </div>
          <div>
            <Icon name="clock" size={20} color="var(--gold-ink)" />
            <strong data-testid="walk-time">{formatDuration(stats.ms)}</strong>
            <span>Zeit</span>
          </div>
          <div>
            <Icon name="pin" size={20} color="var(--label)" />
            <strong>{stations.length}</strong>
            <span>Stationen</span>
          </div>
        </div>
      </section>
      {game.stops.some((s) => s.kind === 'final') && (
        <div className="card rise" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 30 }} aria-hidden="true">
            💎
          </span>
          <span style={{ fontWeight: 600 }}>Schatz: {game.final?.found ? 'gefunden!' : 'diesmal nicht gefunden'}</span>
        </div>
      )}
      <h2 className="section-title">Abzeichen</h2>
      {earned.length ? (
        <div className="badges">
          {earned.map((b, i) => (
            <div key={b.id} className={b.quiet ? 'badge quiet' : 'badge'} title={b.description} style={{ animationDelay: `${0.2 + i * 0.12}s` }}>
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
        className="btn big tinted"
        onClick={async () => {
          const b = await drawCertificate(game, stations.length, { steps: stats.steps, estimated: stats.estimated, meters: stats.meters, time: formatDuration(stats.ms) });
          if (b) await shareOrDownload(b, `urkunde-${game.team.name.replace(/\W+/g, '-')}.png`);
        }}
      >
        <Icon name="share" size={18} /> Urkunde teilen
      </button>
      <h2 className="section-title">Fotoalbum</h2>
      <PhotoGrid photos={game.photos} />
      <button type="button" className="btn big dark" onClick={onHome}>
        Zum Hauptmenü
      </button>
    </div>
  );
}
