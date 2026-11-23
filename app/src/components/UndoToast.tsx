import { undoLast, useUndo, UNDO_MS } from '../state/game';
import { play } from '../lib/feedback';

/** Kleine Leiste unten: "Tour gelöscht · Rückgängig" für ein paar Sekunden */
export function UndoToast({ onUndone }: { onUndone: (label: string) => void }) {
  const info = useUndo();
  if (!info) return null;
  return (
    <div className="undo-toast" role="status" key={info.at} data-testid="undo-toast">
      <span>{info.label}</span>
      <button
        type="button"
        data-testid="undo"
        onClick={() => {
          const label = undoLast();
          if (label) {
            play('select');
            onUndone(label);
          }
        }}
      >
        Rückgängig
      </button>
      <i className="undo-bar" style={{ animationDuration: `${UNDO_MS}ms` }} aria-hidden="true" />
    </div>
  );
}
