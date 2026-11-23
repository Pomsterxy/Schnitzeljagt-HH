import { useEffect, useRef, useState } from 'react';
import { FAMILY_GAME_BY_ID, FAMILY_POINTS } from '../data/family-games';
import { finishFamilyGame } from '../state/game';
import { celebrateFamily } from '../lib/effects';
import { play, startMelody, useSoundOn } from '../lib/feedback';
import { compressImage, savePhoto } from '../lib/storage';
import { LilliSays } from './Lilli';
import { Icon } from './Icon';

function Countdown({ seconds, onEnd }: { seconds: number; onEnd: () => void }) {
  const [left, setLeft] = useState(seconds);
  const [running, setRunning] = useState(false);
  const ended = useRef(false);
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setLeft((l) => Math.max(0, l - 1)), 1000);
    return () => clearInterval(t);
  }, [running]);
  useEffect(() => {
    if (left === 0 && !ended.current) {
      ended.current = true;
      setRunning(false);
      play('found');
      onEnd();
    } else if (running && left <= 3 && left > 0) play('tap');
  }, [left, running, onEnd]);
  const r = 54;
  const circ = 2 * Math.PI * r;
  const mm = Math.floor(left / 60);
  const ss = String(left % 60).padStart(2, '0');
  return (
    <div className="countdown">
      <svg width="140" height="140" viewBox="0 0 140 140" aria-hidden="true">
        <circle cx="70" cy="70" r={r} fill="none" stroke="var(--fill2)" strokeWidth="10" />
        <circle
          cx="70"
          cy="70"
          r={r}
          fill="none"
          stroke={left === 0 ? 'var(--green)' : 'var(--accent)'}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - left / seconds)}
          transform="rotate(-90 70 70)"
          style={{ transition: 'stroke-dashoffset 1s linear' }}
        />
      </svg>
      <div className="countdown-val" aria-live="polite">
        {left === 0 ? 'Zeit!' : `${mm}:${ss}`}
      </div>
      {left > 0 && (
        <button type="button" className="btn tinted small" onClick={() => { play('select'); setRunning(!running); }}>
          {running ? 'Pause' : left === seconds ? 'Timer starten' : 'Weiter'}
        </button>
      )}
    </div>
  );
}

function FreezeGame({ rounds, onEnd }: { rounds: number; onEnd: () => void }) {
  const sound = useSoundOn();
  const [phase, setPhase] = useState<'ready' | 'dance' | 'freeze' | 'done'>('ready');
  const [round, setRound] = useState(0);
  const stopMusic = useRef<() => void>(() => {});
  useEffect(() => () => stopMusic.current(), []);

  const dance = (n: number) => {
    setRound(n);
    setPhase('dance');
    stopMusic.current = startMelody();
    const ms = 3500 + Math.random() * 5000;
    setTimeout(() => {
      stopMusic.current();
      play('wrong');
      setPhase('freeze');
      setTimeout(() => {
        if (n + 1 >= rounds) {
          setPhase('done');
          play('correct');
          onEnd();
        } else dance(n + 1);
      }, 3000);
    }, ms);
  };

  return (
    <div className={`freeze freeze-${phase}`} aria-live="assertive">
      {phase === 'ready' && (
        <button type="button" className="btn primary big" onClick={() => dance(0)}>
          <Icon name="play" size={18} color="#fff" /> Musik starten
        </button>
      )}
      {phase === 'dance' && (
        <>
          <div className="eq" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
            <i />
          </div>
          <strong>Tanzen!</strong>
          <small>
            Runde {round + 1} von {rounds}
            {!sound && ' · Ton ist aus, achtet auf das Wort FREEZE'}
          </small>
        </>
      )}
      {phase === 'freeze' && (
        <>
          <strong className="pop">FREEZE!</strong>
          <small>Nicht bewegen …</small>
        </>
      )}
      {phase === 'done' && <strong>Super Statuen!</strong>}
    </div>
  );
}

export function FamilyGameCard({ stationId, gameId, state }: { stationId: string; gameId: string; state?: 'done' | 'skipped' }) {
  const game = FAMILY_GAME_BY_ID.get(gameId);
  const [ready, setReady] = useState(game?.kind === 'simple');
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const cardRef = useRef<HTMLElement>(null);
  /** Geschafft: Herzen fliegen lassen und speichern */
  const markDone = (photo?: Parameters<typeof finishFamilyGame>[2]) => {
    celebrateFamily(cardRef.current);
    finishFamilyGame(stationId, 'done', photo);
  };
  if (!game) return null;

  if (state)
    return (
      <section className="card family-card done" data-testid="family-game" data-state={state}>
        <div className="family-kicker">
          <Icon name="star" size={14} color="var(--gold-ink)" /> Familien-Moment
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <strong style={{ flex: 1 }}>{game.title}</strong>
          {state === 'done' ? <span className="chip teal pop">+{FAMILY_POINTS} Familienbonus</span> : <span className="muted">übersprungen</span>}
        </div>
      </section>
    );

  const onPhoto = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    const blob = await compressImage(file);
    const id = `${Date.now()}-family`;
    await savePhoto(id, blob);
    play('correct');
    markDone({ id, title: game.title });
    setBusy(false);
  };

  return (
    <section ref={cardRef} className="card family-card rise" data-testid="family-game">
      <div className="family-kicker">
        <Icon name="star" size={14} color="var(--gold-ink)" /> Familien-Moment
      </div>
      <h2 className="title2">{game.title}</h2>
      <LilliSays mood="excited" size={46}>
        {game.lilli}
      </LilliSays>
      <ol className="family-steps">
        {game.steps.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ol>

      {game.kind === 'timer' && <Countdown seconds={game.seconds ?? 60} onEnd={() => setReady(true)} />}
      {game.kind === 'freeze' && <FreezeGame rounds={game.rounds ?? 3} onEnd={() => setReady(true)} />}

      {game.kind === 'photo' ? (
        <>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => void onPhoto(e.target.files?.[0])} />
          <button type="button" className="btn primary big" disabled={busy} onClick={() => fileRef.current?.click()}>
            <Icon name="camera" size={20} color="#fff" /> {busy ? 'Speichere …' : 'Foto machen'}
          </button>
          <button type="button" className="btn" onClick={() => { play('correct'); markDone(); }}>
            Gespielt, ohne Foto (+{FAMILY_POINTS})
          </button>
        </>
      ) : (
        <button
          type="button"
          className={`btn big ${ready ? 'primary' : 'dark'}`}
          onClick={() => {
            play('correct');
            markDone();
          }}
        >
          Geschafft! (+{FAMILY_POINTS})
        </button>
      )}
      <button type="button" className="btn ghost small" style={{ alignSelf: 'center' }} onClick={() => { play('tap'); finishFamilyGame(stationId, 'skipped'); }}>
        Diesmal überspringen
      </button>
    </section>
  );
}
