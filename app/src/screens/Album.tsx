import { useState } from 'react';
import { STATIONS, imageUrl } from '../data';
import { DISTRICTS } from '../data/districts';
import { BADGES, rankFor } from '../data/badges';
import { useGame } from '../state/game';

export function Album({ onBack }: { onBack: () => void }) {
  const { career } = useGame();
  const [open, setOpen] = useState<string | null>(null);
  const rank = rankFor(career.points);
  const sel = STATIONS.find((s) => s.id === open);
  return (
    <div className="screen">
      <h2>📒 Euer Hamburg-Album</h2>
      <p>
        Rang: <strong>{rank.title}</strong> · {career.points} Punkte · {career.tours} Touren · {career.collected.length}/{STATIONS.length} Karten
      </p>
      <h3>Abzeichen</h3>
      <div className="badges">
        {BADGES.map((b) => (
          <div key={b.id} className={career.badges.includes(b.id) ? 'badge' : 'badge locked'} title={b.description}>
            <span className="icon">{career.badges.includes(b.id) ? b.icon : '🔒'}</span>
            <span>{b.title}</span>
            <small>{b.description}</small>
          </div>
        ))}
      </div>
      {DISTRICTS.map((d) => (
        <section key={d.id}>
          <h3>{d.name}</h3>
          <div className="cards">
            {STATIONS.filter((s) => s.district === d.id).map((s) => {
              const got = career.collected.includes(s.id);
              return (
                <button key={s.id} type="button" className={got ? 'card' : 'card locked'} disabled={!got} onClick={() => setOpen(s.id)}>
                  {got ? <img src={imageUrl(s.images[0])} alt="" loading="lazy" /> : <span className="q">?</span>}
                  <span>{got ? s.title : '???'}</span>
                </button>
              );
            })}
          </div>
        </section>
      ))}
      {sel && (
        <div className="overlay" onClick={() => setOpen(null)}>
          <div className="dialog" onClick={(e) => e.stopPropagation()}>
            <h3>{sel.title}</h3>
            <img src={imageUrl(sel.images[0])} alt="" className="card-img" />
            <p>{sel.snack}</p>
            <button type="button" className="btn" onClick={() => setOpen(null)}>
              Schließen
            </button>
          </div>
        </div>
      )}
      <button type="button" className="btn" onClick={onBack}>
        Zurück
      </button>
    </div>
  );
}
