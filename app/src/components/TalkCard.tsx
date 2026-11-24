import { useState } from 'react';
import { pickTalk, type Talk, type TalkPool } from '../data/talk';
import type { AgeGroup } from '../data/types';
import { play } from '../lib/feedback';
import { ReadAloud } from './ReadAloud';
import { heartBurst } from './Micro';

const VOTES = [
  { id: 'ja', label: '👍 Stimmt' },
  { id: 'nein', label: '👎 Stimmt nicht' },
  { id: 'jein', label: '🤔 Kommt drauf an' },
];

/** Gesprächsstarter: eine Frage oder These zum gemeinsamen Nachdenken und Diskutieren */
export function TalkCard({
  pools,
  seed,
  youngest,
  title = 'Gesprächsstoff für den Weg',
  quiet = false,
  initial,
}: {
  pools: TalkPool[];
  seed: number;
  youngest: AgeGroup;
  title?: string;
  quiet?: boolean;
  /** vorab gewählte Frage (z. B. ohne Wiederholung in der Tour) */
  initial?: Talk;
}) {
  const [offset, setOffset] = useState(0);
  const [vote, setVote] = useState<string | null>(null);
  const talk = offset === 0 && initial ? initial : pickTalk(pools, seed, youngest, offset, initial ? [initial.text] : []);

  return (
    <section className={`card talk-card rise${quiet ? ' quiet' : ''}`} data-testid="talk-card">
      <div className="talk-top">
        <span className="talk-eyebrow">
          <span aria-hidden="true">{quiet ? '🕊️' : '💬'}</span> {title}
        </span>
        <ReadAloud text={talk.text} />
      </div>
      <span className={`talk-kind ${talk.kind}`}>{talk.kind === 'these' ? 'These' : 'Frage an alle'}</span>
      <p key={talk.text} className="talk-text">
        {talk.text}
      </p>
      {talk.kind === 'these' && (
        <div className="talk-votes" role="group" aria-label="Was meint ihr?">
          {VOTES.map((v) => (
            <button
              key={v.id}
              type="button"
              className={`talk-vote${vote === v.id ? ' on' : ''}`}
              aria-pressed={vote === v.id}
              onClick={(e) => {
                play('select');
                if (vote !== v.id) heartBurst(e.currentTarget);
                setVote(v.id);
              }}
            >
              {v.label}
            </button>
          ))}
        </div>
      )}
      {(talk.kind === 'these' ? vote : true) && (
        <p className="talk-nudge fade">
          {talk.kind === 'these' ? 'Und warum? Jeder sagt einen Satz. Wer überzeugt die anderen?' : 'Jeder darf antworten, die Jüngsten zuerst.'}
          {talk.nudge && <> {talk.nudge}</>}
        </p>
      )}
      {!quiet && (
        <button
          type="button"
          className="btn ghost small talk-next"
          onClick={() => {
            play('tap');
            setVote(null);
            setOffset((o) => o + 1);
          }}
        >
          Andere Frage
        </button>
      )}
    </section>
  );
}
