import { useState } from 'react';
import type { Station } from '../data/types';
import { usePosition } from '../lib/location';
import { play } from '../lib/feedback';
import { addReport } from '../state/reports';

const KINDS = ['Aufgabe stimmt nicht', 'Ort nicht zugänglich', 'GPS-Punkt liegt falsch', 'Text oder Bild falsch', 'Sonstiges'];

/** "Stimmt hier etwas nicht?" – Meldung an einer Station */
export function ReportButton({ station }: { station: Station }) {
  const pos = usePosition();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState(KINDS[0]);
  const [text, setText] = useState('');
  const [sent, setSent] = useState(false);

  if (sent)
    return (
      <p className="muted report-thanks fade" data-testid="report-sent">
        Danke! Eure Meldung ist gespeichert. Unter „Mehr“ könnt ihr sie teilen.
      </p>
    );

  return (
    <>
      <button type="button" className="btn ghost small report-link" data-testid="report-open" onClick={() => { play('tap'); setOpen(true); }}>
        Stimmt hier etwas nicht?
      </button>
      {open && (
        <div className="overlay" role="dialog" aria-modal="true" aria-label="Problem melden" onClick={() => setOpen(false)}>
          <div className="dialog confirm-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="grabber" />
            <h3>Problem melden</h3>
            <p className="muted">{station.title}. Was ist los?</p>
            <div className="report-kinds">
              {KINDS.map((k) => (
                <button key={k} type="button" className={`report-kind${k === kind ? ' on' : ''}`} aria-pressed={k === kind} onClick={() => setKind(k)}>
                  {k}
                </button>
              ))}
            </div>
            <textarea rows={3} value={text} placeholder="Was genau? z. B. „Es sind 6 Steine, nicht 5“" onChange={(e) => setText(e.target.value)} data-testid="report-text" />
            <button
              type="button"
              className="btn big primary"
              data-testid="report-save"
              onClick={() => {
                addReport({ stationId: station.id, stationTitle: station.title, kind, text: text.trim(), coords: pos.coords ?? undefined, accuracy: pos.accuracy });
                play('soft');
                setOpen(false);
                setSent(true);
              }}
            >
              Meldung speichern
            </button>
            <button type="button" className="btn ghost" onClick={() => setOpen(false)}>
              Abbrechen
            </button>
          </div>
        </div>
      )}
    </>
  );
}
