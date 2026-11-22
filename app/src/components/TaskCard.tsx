import { useRef, useState } from 'react';
import type { Task } from '../data/types';
import { answerTask, completePhotoTask, completeReflection, takeTaskHint, type TaskState } from '../state/game';
import { POINTS, taskMaxPoints } from '../lib/scoring';
import { compressImage, savePhoto } from '../lib/storage';
import { ReadAloud } from './ReadAloud';

const TYPE_LABEL: Record<Task['type'], string> = {
  quiz: 'Quiz',
  estimate: 'Schätzfrage',
  number: 'Zählen & Rechnen',
  text: 'Beobachten',
  photo: 'Foto-Aufgabe',
  reflection: 'Nachdenken',
};

export function TaskCard({
  task,
  state,
  quiet,
  index,
  total,
}: {
  task: Task;
  state?: TaskState;
  quiet: boolean;
  index: number;
  total: number;
}) {
  const [value, setValue] = useState('');
  const [feedback, setFeedback] = useState<{ msg: string; ok: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const hintsUsed = state?.hints ?? 0;
  const done = state?.done ?? false;
  const max = taskMaxPoints(task);

  const submit = (v: string | number) => {
    if (v === '' || v === undefined) return;
    const r = answerTask(task, v, quiet);
    if (r.final) {
      setFeedback({
        ok: r.correct,
        msg: r.correct ? `${r.message}${!quiet && r.points ? ` +${r.points} Punkte` : ''}` : 'Leider nicht richtig.',
      });
    } else {
      setFeedback({ ok: false, msg: `${r.message} Ihr habt noch einen Versuch!` });
      setValue('');
    }
  };

  const onPhoto = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    const blob = await compressImage(file);
    const id = `${Date.now()}-${task.id}`;
    await savePhoto(id, blob);
    const pts = completePhotoTask(task.id, id, quiet, task.question);
    setFeedback({ ok: true, msg: `Foto gespeichert!${!quiet && pts ? ` +${pts} Punkte` : ''}` });
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
    <section className={`task-card${done ? ' done' : ''}${quiet ? ' quiet' : ''}`} data-testid={`task-${task.id}`}>
      <div className="task-head">
        <span className="task-type">
          {TYPE_LABEL[task.type]} · {index + 1}/{total}
        </span>
        {!quiet && max > 0 && <span className="task-points">bis {max} P.</span>}
      </div>
      <p className="task-q">{task.question}</p>
      <ReadAloud text={task.question + (task.type === 'quiz' ? ' ' + task.options.join('. ') : '')} label="Frage vorlesen" />

      {!done && task.type === 'quiz' && (
        <div className="options">
          {task.options.map((o, i) => (
            <button key={o} type="button" className="btn option" onClick={() => submit(i)}>
              {o}
            </button>
          ))}
        </div>
      )}

      {!done && (task.type === 'number' || task.type === 'estimate') && (
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
            placeholder={task.type === 'estimate' ? `Schätzung in ${task.unit}` : 'Zahl'}
            value={value}
            aria-label="Antwort"
            onChange={(e) => setValue(e.target.value.replace(/[^0-9.,-]/g, ''))}
          />
          <button className="btn primary" type="submit" disabled={!value}>
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
          <button className="btn primary" type="submit" disabled={!value.trim()}>
            Prüfen
          </button>
        </form>
      )}

      {!done && task.type === 'photo' && (
        <div className="photo-row">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            onChange={(e) => void onPhoto(e.target.files?.[0])}
          />
          <button type="button" className="btn primary" disabled={busy} onClick={() => fileRef.current?.click()}>
            📷 {busy ? 'Speichere …' : 'Foto machen'}
          </button>
          <button
            type="button"
            className="btn ghost"
            onClick={() => {
              const pts = completePhotoTask(task.id, null, quiet, task.question);
              setFeedback({ ok: true, msg: `Erledigt ohne Foto.${!quiet && pts ? ` +${pts} Punkte` : ''}` });
            }}
          >
            Ohne Foto erledigt
          </button>
        </div>
      )}

      {!done && task.type === 'reflection' && (
        <div className="reflection">
          <textarea
            rows={3}
            placeholder="Wer mag, kann hier einen Gedanken notieren (freiwillig)"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <button type="button" className="btn primary" onClick={() => completeReflection(task.id, value)}>
            Weiter
          </button>
        </div>
      )}

      {!done && task.hints && task.hints.length > 0 && (
        <div className="hints">
          {task.hints.slice(0, hintsUsed).map((h) => (
            <p key={h} className="hint">
              💡 {h}
            </p>
          ))}
          {hintsUsed < task.hints.length && (
            <button type="button" className="btn small ghost" onClick={() => takeTaskHint(task.id)}>
              💡 Hinweis{!quiet && max > 0 ? ` (−${POINTS.hint} P.)` : ''}
            </button>
          )}
        </div>
      )}

      {feedback && <p className={feedback.ok ? 'feedback ok' : 'feedback bad'}>{feedback.msg}</p>}

      {done && (
        <div className="solution">
          {state?.correct === false && (
            <p>
              Richtig wäre: <strong>{correctText()}</strong>
            </p>
          )}
          {!feedback && state?.points ? <p className="feedback ok">+{state.points} Punkte</p> : null}
          {task.explanation && <p className="explanation">{task.explanation}</p>}
        </div>
      )}
    </section>
  );
}
