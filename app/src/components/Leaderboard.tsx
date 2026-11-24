import type { TeamResult } from '../lib/results';
import { formatDistance } from '../lib/geo';
import { formatDuration } from '../lib/pedometer';

/** Rangliste aller Teams, die dieselbe Tour gespielt haben */
export function Leaderboard({ results, title = 'Team-Vergleich', hint = false }: { results: TeamResult[]; title?: string; hint?: boolean }) {
  if (!results.length) return null;
  const medal = ['🥇', '🥈', '🥉'];
  return (
    <section className="card leaderboard rise" data-testid="leaderboard">
      <div className="caption">{title}</div>
      <ol>
        {results.map((r, i) => (
          <li key={`${r.team}-${r.at}`} className={r.mine ? 'mine' : undefined}>
            <span className="rank" aria-hidden="true">
              {medal[i] ?? `${i + 1}.`}
            </span>
            <span className="who">
              <strong>
                {r.avatar} {r.team}
              </strong>
              {r.mine && <span className="chip teal small-chip">ihr</span>}
              <small className="muted">
                {r.stations}/{r.total} Stationen · {formatDistance(r.meters)} · {formatDuration(r.ms)}
                {r.treasure ? ' · Schatz 💎' : ''}
              </small>
            </span>
            <span className="pts">{r.points}</span>
          </li>
        ))}
      </ol>
      {hint && results.length === 1 && <p className="muted">Schickt euer Ergebnis an andere Familien: Sie bekommen dieselbe Tour und tauchen hier auf, sobald sie euch ihr Ergebnis zurückschicken.</p>}
    </section>
  );
}
