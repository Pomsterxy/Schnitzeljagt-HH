import { play } from '../lib/feedback';

export interface SheetAction {
  label: string;
  onClick: () => void;
  tone?: 'danger' | 'primary' | 'plain';
  testId?: string;
}

/** Bottom-Sheet zum Bestätigen (statt des System-Dialogs, der in Home-Bildschirm-Apps oft fehlt) */
export function ConfirmSheet({ title, text, actions, onClose }: { title: string; text: string; actions: SheetAction[]; onClose: () => void }) {
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label={title} onClick={onClose}>
      <div className="dialog confirm-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="grabber" />
        <h3>{title}</h3>
        <p className="muted">{text}</p>
        {actions.map((a) => (
          <button
            key={a.label}
            type="button"
            data-testid={a.testId}
            className={`btn big ${a.tone === 'danger' ? 'danger' : a.tone === 'primary' ? 'primary' : ''}`}
            onClick={() => {
              play('tap');
              a.onClick();
            }}
          >
            {a.label}
          </button>
        ))}
        <button type="button" className="btn ghost" onClick={onClose}>
          Zurück
        </button>
      </div>
    </div>
  );
}
