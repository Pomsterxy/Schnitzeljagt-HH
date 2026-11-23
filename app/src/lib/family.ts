import { FAMILY_GAMES } from '../data/family-games';
import { rng } from './route';

/**
 * Verteilt Familien-Momente auf etwa jede dritte (normale) Station einer Tour.
 * Gedenkorte bekommen nie ein Spiel. Kein Spiel kommt doppelt vor.
 */
export function assignFamilyGames(normalStationIds: string[], seed: number): Record<string, string> {
  const rand = rng(seed ^ 0x5f3759df);
  const pool = FAMILY_GAMES.map((g) => g.id);
  // deterministisch mischen
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const out: Record<string, string> = {};
  if (normalStationIds.length < 2) return out;
  const start = 1 + Math.floor(rand() * 2); // 2. oder 3. Station
  let k = 0;
  for (let i = start; i < normalStationIds.length && k < pool.length; i += 3) out[normalStationIds[i]] = pool[k++];
  return out;
}
