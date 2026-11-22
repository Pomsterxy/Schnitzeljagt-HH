import { useState } from 'react';

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
  const [err, setErr] = useState(false);
  return (
    <div className="overlay" role="dialog" aria-modal="true">
      <div className="dialog">
        <h3>{title}</h3>
        <p>{text}</p>
        <input
          className="pin-input"
          inputMode="numeric"
          type="password"
          autoFocus
          maxLength={6}
          value={v}
          aria-label="Eltern-PIN"
          onChange={(e) => {
            setV(e.target.value.replace(/\D/g, ''));
            setErr(false);
          }}
        />
        {err && <p className="error">Falsche PIN.</p>}
        <div className="row">
          <button type="button" className="btn ghost" onClick={onCancel}>
            Abbrechen
          </button>
          <button
            type="button"
            className="btn primary"
            onClick={() => {
              if (v === pin) onOk();
              else setErr(true);
            }}
          >
            Freischalten
          </button>
        </div>
      </div>
    </div>
  );
}
