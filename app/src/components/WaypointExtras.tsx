import { useEffect, useState } from 'react';
import type { LatLng, Poi } from '../data/types';
import { POI_INFO } from '../data/open';
import { distance } from '../lib/geo';

/** Nächster Straßenbaum aus dem Straßenbaumkataster Hamburg (nur online) */
export interface Tree {
  species: string;
  latin?: string;
  year?: number;
  girth?: number;
  crown?: number;
  street?: string;
  m: number;
}

const TREE_API = 'https://api.hamburg.de/datasets/v1/strassenbaumkataster/collections/strassenbaumkataster_hh/items';
const treeCache = new Map<string, Tree | null>();

export async function nearestTree(c: LatLng, maxM = 60): Promise<Tree | null> {
  const key = c.map((x) => x.toFixed(4)).join(',');
  if (treeCache.has(key)) return treeCache.get(key)!;
  const dLat = maxM / 111320;
  const dLon = maxM / (111320 * Math.cos((c[0] * Math.PI) / 180));
  const url = `${TREE_API}?f=json&limit=60&bbox=${c[1] - dLon},${c[0] - dLat},${c[1] + dLon},${c[0] + dLat}`;
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 6000);
    const r = await fetch(url, { signal: ctl.signal });
    clearTimeout(t);
    if (!r.ok) return null;
    const d = (await r.json()) as { features: { geometry: { type: string; coordinates: number[] | number[][] }; properties: Record<string, unknown> }[] };
    let best: Tree | null = null;
    for (const f of d.features ?? []) {
      const g = f.geometry;
      const pt = (g.type === 'MultiPoint' ? (g.coordinates as number[][])[0] : (g.coordinates as number[])) ?? [];
      if (pt.length < 2) continue;
      const m = distance(c, [pt[1], pt[0]]);
      const p = f.properties;
      const species = String(p.art_deutsch || p.gattung_deutsch || '').split(',')[0].trim();
      if (!species || m > maxM || (best && m >= best.m)) continue;
      best = {
        species,
        latin: typeof p.art_latein === 'string' ? p.art_latein : undefined,
        year: typeof p.pflanzjahr === 'number' && p.pflanzjahr > 1700 ? p.pflanzjahr : undefined,
        girth: typeof p.stammumfang === 'number' && p.stammumfang > 0 ? p.stammumfang : undefined,
        crown: typeof p.kronendurchmesser === 'number' && p.kronendurchmesser > 0 ? p.kronendurchmesser : undefined,
        street: typeof p.strasse === 'string' ? p.strasse : undefined,
        m: Math.round(m),
      };
    }
    treeCache.set(key, best);
    return best;
  } catch {
    return null;
  }
}

export function useNearestTree(c: LatLng): Tree | null {
  const [tree, setTree] = useState<Tree | null>(null);
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
    let live = true;
    nearestTree(c).then((t) => live && setTree(t));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c[0], c[1]]);
  return tree;
}

/** Hat das Zwischenziel etwas zu erzählen? */
export function hasExtras(poi: Poi, tree: Tree | null): boolean {
  return poi.kind === 'kunst' || poi.kind === 'trinkwasser' || !!POI_INFO[poi.id] || !!tree;
}

function TreeCard({ tree }: { tree: Tree }) {
  const [open, setOpen] = useState(false);
  const age = tree.year ? new Date().getFullYear() - tree.year : null;
  // Faustregel: Ein Erwachsener umarmt mit ausgestreckten Armen etwa 150 cm
  const hugs = tree.girth ? Math.max(1, Math.ceil(tree.girth / 150)) : null;
  return (
    <section className="card extra-card tree-card" data-testid="tree-card">
      <div className="caption">🌳 Baum-Detektiv</div>
      <p>
        {tree.m < 8 ? 'Genau hier' : `Etwa ${tree.m} m von hier`}
        {tree.street ? ` an der ${tree.street}` : ''} steht eine <strong>{tree.species}</strong>
        {tree.latin ? <span className="muted"> ({tree.latin})</span> : null}.
      </p>
      {age !== null ? (
        open ? (
          <p className="fade" data-testid="tree-answer">
            Gepflanzt {tree.year}: Sie ist {age} Jahre alt.
            {tree.girth ? ` Ihr Stamm ist ${tree.girth} cm dick (Umfang)${hugs && hugs > 1 ? ` – zum Umarmen braucht es ${hugs} Leute` : ' – eine Person kann ihn umarmen'}.` : ''}
          </p>
        ) : (
          <>
            <p>Findet ihr sie? Schätzt: Wie alt ist dieser Baum?</p>
            <button type="button" className="btn small" data-testid="tree-reveal" onClick={() => setOpen(true)}>
              Auflösen
            </button>
          </>
        )
      ) : tree.girth ? (
        <p>Ihr Stamm hat {tree.girth} cm Umfang. Passt ihr mit den Armen herum?</p>
      ) : null}
    </section>
  );
}

export function WaypointExtras({ poi, tree }: { poi: Poi; tree: Tree | null }) {
  const info = POI_INFO[poi.id];
  return (
    <div className="waypoint-extras" data-testid="waypoint-extras">
      {poi.kind === 'kunst' && (
        <section className="card extra-card" data-testid="art-card">
          <div className="caption">🗿 Kunst am Weg</div>
          <p>
            <strong>{poi.title}</strong>
            {poi.creator || poi.year ? (
              <span className="muted">
                {' '}
                · {[poi.creator, poi.year].filter(Boolean).join(', ')}
              </span>
            ) : null}
          </p>
          <p>Schaut genau hin: Woraus ist das Kunstwerk gemacht? Was oder wen zeigt es? Jeder sagt ein Wort, das ihm dazu einfällt.</p>
          {poi.year && <p className="muted">Es ist schon {new Date().getFullYear() - poi.year} Jahre alt.</p>}
        </section>
      )}
      {poi.kind === 'trinkwasser' && (
        <section className="card extra-card">
          <div className="caption">🚰 Trinkpause</div>
          <p>Hier gibt es kostenloses Trinkwasser aus der Leitung – Flaschen auffüllen!</p>
        </section>
      )}
      {info?.playground && (
        <section className="card extra-card">
          <div className="caption">🛝 {info.playground.name}</div>
          <p>{info.playground.text}</p>
        </section>
      )}
      {info?.monument && (
        <section className="card extra-card" data-testid="monument-card">
          <div className="caption">🏛️ Wusstet ihr?</div>
          <p>
            {info.monument.m < 20 ? 'Hier' : `Gleich nebenan (ca. ${info.monument.m} m)`} steht ein Baudenkmal: <strong>{info.monument.name}</strong>
            {info.monument.year ? `, gebaut ${info.monument.year.replace(/\s*\/\s*/g, '–')}` : ''}. Erkennt ihr, welches Gebäude gemeint ist?
          </p>
        </section>
      )}
      {info?.stones && (
        <section className="card extra-card quiet-extra" data-testid="stones-card">
          <div className="caption">🕯️ Stolpersteine</div>
          <p>
            Vor {info.stones.address} erinnern {info.stones.names.length === 1 ? 'ein Stolperstein' : `${info.stones.names.length} Stolpersteine`} an{' '}
            {info.stones.names.join(', ')}. Wenn ihr mögt, bleibt kurz stehen und lest die Namen leise.
          </p>
        </section>
      )}
      {tree && <TreeCard tree={tree} />}
    </div>
  );
}
