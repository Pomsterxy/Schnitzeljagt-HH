import { useState } from 'react';
import { CREDITS, imageUrl } from '../data';

export function Gallery({ ids, alt }: { ids: string[]; alt: string }) {
  const [i, setI] = useState(0);
  if (!ids.length) return null;
  const id = ids[Math.min(i, ids.length - 1)];
  const c = CREDITS[id];
  return (
    <figure className="gallery">
      <img src={imageUrl(id)} alt={alt} loading="lazy" onClick={() => setI((i + 1) % ids.length)} />
      {ids.length > 1 && (
        <div className="gallery-dots">
          {ids.map((x, k) => (
            <button key={x} type="button" className={k === i ? 'dot on' : 'dot'} aria-label={`Bild ${k + 1}`} onClick={() => setI(k)} />
          ))}
        </div>
      )}
      {c && (
        <figcaption>
          Foto: {c.author} ·{' '}
          <a href={c.source} target="_blank" rel="noreferrer">
            {c.license}
          </a>
        </figcaption>
      )}
    </figure>
  );
}
