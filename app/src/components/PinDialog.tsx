import { useState } from 'react';
import { play } from '../lib/feedback';

export function PinDialog({
  title,
  text,
  pin,
  onOk,
  onCancel,
}: {
  title: string;
  text: string;
  pin: string;
  onOk: () => void;
  onCancel: () => void;
}) {
  const [v, setV] = useState('');
  const [err, setErr] = useState(0);
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label={title} onClick={onCancel}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <div className="grabber" />
        <h3>{title}</h3>
        <p className="muted">{text}</p>
        <input
          key={err}
          className={`pin-input${err ? ' shake' : ''}`}
          inputMode="numeric"
          type="password"
          autoFocus
          maxLength={6}
          value={v}
          aria-label="Eltern-PIN"
          onChange={(e) => setV(e.target.value.replace(/\D/g, ''))}
        />
        {err > 0 && <p className="error">Falsche PIN.</p>}
        <button
          type="button"
          className="btn primary"
          onClick={() => {
            if (v === pin) {
              play('unlock');
              onOk();
            } else {
              play('wrong');
              setErr((x) => x + 1);
            }
          }}
        >
          Freischalten
        </button>
        <button type="button" className="btn" onClick={onCancel}>
          Abbrechen
        </button>
      </div>
    </div>
  );
}
