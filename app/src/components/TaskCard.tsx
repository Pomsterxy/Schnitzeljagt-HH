import { useRef, useState } from 'react';
import type { Task } from '../data/types';
import { celebrateCorrect } from '../lib/effects';
import { CheckDraw } from './Micro';
import { answerTask, completePhotoTask, completeReflection, takeTaskHint, type TaskState } from '../state/game';
import { POINTS, taskMaxPoints } from '../lib/scoring';
import { compressImage, savePhoto } from '../lib/storage';
import { play } from '../lib/feedback';
import { ReadAloud } from './ReadAloud';
import { Icon } from './Icon';

const TYPE_LABEL: Record<Task['type'], string> = {
  quiz: 'Quiz',
  estimate: 'Schätzen',
  number: 'Zählen',
  text: 'Beobachten',
  photo: 'Foto',
  reflection: 'Nachdenken',
};

export function TaskCard({
  task,
  state,
  quiet,
  index,
  total,
  onPoints,
}: {
  task: Task;
  state?: TaskState;
  quiet: boolean;
  index: number;
  total: number;
  onPoints?: (n: number) => void;
}) {
  const stepper = task.type === 'number' && task.answer <= 40;
  const [value, setValue] = useState(stepper ? '0' : '');
  const [feedback, setFeedback] = useState<{ msg: string; ok: boolean } | null>(null);
  const [shakeKey, setShakeKey] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const cardRef = useRef<HTMLElement>(null);
  const hintsUsed = state?.hints ?? 0;
  const done = state?.done ?? false;
  const max = taskMaxPoints(task);

  const submit = (v: string | number) => {
    if (v === '' || v === undefined) return;
    const r = answerTask(task, v, quiet);
    if (r.final) {
      if (r.correct) {
        play(task.type === 'estimate' && r.quality < 1 ? 'coin' : 'correct');
        if (!quiet) celebrateCorrect(cardRef.current, r.points);
        if (r.points) onPoints?.(r.points);
      } else play('wrong');
      setFeedback({ ok: r.correct, msg: r.message });
    } else {
      play('wrong');
      setShakeKey((k) => k + 1);
      setFeedback({ ok: false, msg: `${r.message} Ihr habt noch einen Versuch!` });
      if (!stepper) setValue('');
    }
  };

  const onPhoto = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    const blob = await compressImage(file);
    const id = `${Date.now()}-${task.id}`;
    await savePhoto(id, blob);
    const pts = completePhotoTask(task.id, id, quiet, task.question);
    play('correct');
    if (!quiet) celebrateCorrect(cardRef.current, pts);
    if (pts) onPoints?.(pts);
    setFeedback({ ok: true, msg: 'Foto gespeichert!' });
    setBusy(false);
  };

  const correctText = () => {
    if (task.type === 'quiz') return task.options[task.correct];
    if (task.type === 'number') return String(task.answer);
    if (task.type === 'text') return task.accept[0];
    if (task.type === 'estimate') return `${task.answer} ${task.unit}`;
    return '';
  };

  return (
    <section ref={cardRef} className={`card task-card rise${done ? ' done' : ''}${quiet ? ' quiet' : ''}`} data-testid={`task-${task.id}`}>
      <div className="task-head">
        <span>
          {TYPE_LABEL[task.type]} · {index + 1} von {total}
        </span>
        {!quiet && max > 0 && <span className="pts">bis {max} Punkte</span>}
      </div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <h2 className="task-q" style={{ flex: 1 }}>
          {task.question}
        </h2>
        <ReadAloud text={task.question + (task.type === 'quiz' ? ' ' + task.options.join('. ') : '')} label="Frage vorlesen" />
      </div>

      <div key={shakeKey} className={shakeKey ? 'shake' : ''} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {!done && task.type === 'quiz' && (
          <div className="options">
            {task.options.map((o, i) => (
              <button
                key={o}
                type="button"
                className={`btn option${picked === i && feedback && !feedback.ok ? ' wrong' : ''}`}
                onClick={() => {
                  setPicked(i);
                  submit(i);
                }}
              >
                {o}
              </button>
            ))}
          </div>
        )}

        {!done && stepper && (
          <>
            <div className="stepper">
              <button type="button" aria-label="Eins weniger" onClick={() => { play('tap'); setValue(String(Math.max(0, Number(value) - 1))); }}>
                −
              </button>
              <output aria-live="polite" aria-label="Antwort">
                {value}
              </output>
              <button type="button" aria-label="Eins mehr" onClick={() => { play('tap'); setValue(String(Number(value) + 1)); }}>
                +
              </button>
            </div>
            <button type="button" className="btn big dark" onClick={() => submit(value)}>
              Prüfen
            </button>
          </>
        )}

        {!done && !stepper && (task.type === 'number' || task.type === 'estimate') && (
          <form
            className="answer-row"
            onSubmit={(e) => {
              e.preventDefault();
              submit(value);
            }}
          >
            <input
              inputMode="decimal"
              type="text"
              placeholder={task.type === 'estimate' ? `Schätzung (${task.unit})` : 'Zahl'}
              value={value}
              aria-label="Antwort"
              onChange={(e) => setValue(e.target.value.replace(/[^0-9.,-]/g, ''))}
            />
            <button className="btn dark" type="submit" disabled={!value}>
              Prüfen
            </button>
          </form>
        )}

        {!done && task.type === 'text' && (
          <form
            className="answer-row"
            onSubmit={(e) => {
              e.preventDefault();
              submit(value.trim());
            }}
          >
            <input type="text" placeholder="Antwort" value={value} aria-label="Antwort" onChange={(e) => setValue(e.target.value)} />
            <button className="btn dark" type="submit" disabled={!value.trim()}>
              Prüfen
            </button>
          </form>
        )}
      </div>

      {!done && task.type === 'photo' && (
        <div className="photo-row">
          <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => void onPhoto(e.target.files?.[0])} />
          <button type="button" className="btn primary" style={{ flex: 1 }} disabled={busy} onClick={() => fileRef.current?.click()}>
            <Icon name="camera" size={20} color="#fff" /> {busy ? 'Speichere …' : 'Foto machen'}
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => {
              const pts = completePhotoTask(task.id, null, quiet, task.question);
              play('select');
              if (pts) onPoints?.(pts);
              setFeedback({ ok: true, msg: 'Erledigt!' });
            }}
          >
            Ohne Foto erledigt
          </button>
        </div>
      )}

      {!done && task.type === 'reflection' && (
        <div className="reflection">
          <textarea rows={3} placeholder="Wer mag, notiert einen Gedanken (freiwillig)" value={value} onChange={(e) => setValue(e.target.value)} />
          <button type="button" className="btn dark" onClick={() => { play(quiet ? 'soft' : 'select'); completeReflection(task.id, value); }}>
            Weiter
          </button>
        </div>
      )}

      {!done && task.hints && task.hints.length > 0 && (
        <div className="hints">
          {task.hints.slice(0, hintsUsed).map((h) => (
            <p key={h} className="hint">
              {h}
            </p>
          ))}
          {hintsUsed < task.hints.length && (
            <button type="button" className="btn ghost small" onClick={() => { play('tap'); takeTaskHint(task.id); }}>
              <Icon name="bulb" size={16} /> Hinweis{!quiet && max > 0 ? ` (−${POINTS.hint} Punkte)` : ''}
            </button>
          )}
        </div>
      )}

      {feedback && !done && <p className={feedback.ok ? 'feedback ok' : 'feedback bad'}>{feedback.msg}</p>}

      {done && (
        <>
          {state?.correct === false ? (
            <div className="result bad">
              <p>
                Leider nicht. Richtig wäre: <strong>{correctText()}</strong>
              </p>
            </div>
          ) : !quiet && state?.points ? (
            <div className="result ok">
              <CheckDraw />
              <span className="big">+{state.points}</span>
              <p>{feedback?.msg ?? 'Richtig!'}</p>
            </div>
          ) : feedback && task.type !== 'reflection' ? (
            <p className="feedback ok">{feedback.msg}</p>
          ) : null}
          {task.explanation && <p className="explanation">{task.explanation}</p>}
        </>
      )}
    </section>
  );
}
