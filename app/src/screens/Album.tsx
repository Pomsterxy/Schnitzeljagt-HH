import { useState } from 'react';
import { STATIONS, imageUrl } from '../data';
import { DISTRICTS } from '../data/districts';
import { BADGES, rankFor } from '../data/badges';
import { useGame } from '../state/game';
import { play } from '../lib/feedback';

export function Album({ mode }: { mode: 'cards' | 'badges' }) {
  const { career } = useGame();
  const [open, setOpen] = useState<string | null>(null);
  const rank = rankFor(career.points);
  const sel = STATIONS.find((s) => s.id === open);
  return (
    <div className="screen with-tabs">
      <div className="rise">
        <div className="overline">
          {rank.title} · {career.points} Punkte · {career.tours} Touren
        </div>
        <h1 className="large-title">{mode === 'cards' ? 'Album' : 'Abzeichen'}</h1>
      </div>

      {mode === 'badges' && (
        <div className="badges">
          {BADGES.map((b, i) => {
            const got = career.badges.includes(b.id);
            return (
              <div key={b.id} className={got ? 'badge' : 'badge locked'} title={b.description} style={{ animationDelay: `${i * 0.03}s` }}>
                <span className="icon">{got ? b.icon : '🔒'}</span>
                <span>{b.title}</span>
                <small>{b.description}</small>
              </div>
            );
          })}
        </div>
      )}

      {mode === 'cards' && (
        <>
          <p className="muted rise">
            {career.collected.length} von {STATIONS.length} Karten gesammelt. Jede gefundene Station kommt hierher.
          </p>
          {DISTRICTS.map((d) => (
            <section key={d.id} className="rise" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <h2 className="section-title">{d.name}</h2>
              <div className="cards">
                {STATIONS.filter((s) => s.district === d.id).map((s) => {
                  const got = career.collected.includes(s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      className={got ? 'cardlet card' : 'cardlet card locked'}
                      disabled={!got}
                      onClick={() => {
                        play('select');
                        setOpen(s.id);
                      }}
                    >
                      {got ? <img src={imageUrl(s.images[0])} alt="" loading="lazy" /> : <span className="q">?</span>}
                      <span>{got ? s.title : '???'}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </>
      )}

      {sel && (
        <div className="overlay" role="dialog" aria-modal="true" onClick={() => setOpen(null)}>
          <div className="dialog" onClick={(e) => e.stopPropagation()}>
            <div className="grabber" />
            <h3>{sel.title}</h3>
            <img src={imageUrl(sel.images[0])} alt="" className="card-img" />
            <p style={{ lineHeight: 1.5 }}>{sel.snack}</p>
            <button type="button" className="btn" onClick={() => setOpen(null)}>
              Schließen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
