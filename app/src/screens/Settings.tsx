import { useState } from 'react';
import { CREDITS } from '../data';
import { setSimulated, usePosition } from '../lib/location';
import { exportBackup, importBackup } from '../lib/storage';
import { setSoundOn, useSoundOn } from '../lib/feedback';
import { resetCareer } from '../state/game';
import { setPowerSave, usePowerSave } from '../lib/power';
import { Legal } from '../components/Legal';
import { clearReports, reportsText, useReports } from '../state/reports';

function SwitchRow({ on, onToggle, title, sub, testId }: { on: boolean; onToggle: () => void; title: string; sub: string; testId?: string }) {
  return (
    <button type="button" className="switch-row" role="switch" aria-checked={on} data-testid={testId} onClick={onToggle}>
      <span className="txt">
        <strong>{title}</strong>
        <small>{sub}</small>
      </span>
      <span className={`switch${on ? ' on' : ''}`} />
    </button>
  );
}

export function Settings() {
  const pos = usePosition();
  const sound = useSoundOn();
  const powerSave = usePowerSave();
  return (
    <div className="screen with-tabs">
      <h1 className="large-title rise">Mehr</h1>

      <div className="field-label rise">Spiel</div>
      <div className="grouped rise">
        <SwitchRow on={sound} onToggle={() => setSoundOn(!sound)} title="Töne & Vibration" sub="Möwenruf, Glöckchen und Schatzkiste" />
        <SwitchRow
          on={powerSave}
          onToggle={() => setPowerSave(!powerSave)}
          title="Stromsparmodus"
          sub="Bildschirm darf ausgehen, GPS etwas sparsamer. Gut für lange Touren."
          testId="power-setting"
        />
        <SwitchRow
          on={pos.simulated}
          onToggle={() => setSimulated(!pos.simulated)}
          title="Testmodus"
          sub="Standort per Hand setzen, um Touren am Schreibtisch auszuprobieren"
          testId="sim-toggle"
        />
      </div>

      <div className="field-label rise">Datenschutz</div>
      <div className="card rise">
        <p style={{ fontSize: 15, lineHeight: 1.5 }}>
          Kein Konto, kein Server: Spielstand, Fotos und Album bleiben nur auf diesem Gerät. Euer Standort wird nur im Browser verwendet.
          Kartenkacheln kommen von OpenStreetMap. Öffnet ihr an einer Station „Echte Geocaches in der Nähe“, fragt die App bei Opencaching.de nach Caches rund um die Station (nicht euren Standort).
        </p>
      </div>

      <div className="field-label rise">Quellen & Lizenzen</div>
      <div className="card rise" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <p style={{ fontSize: 15, lineHeight: 1.5 }}>
          Texte basieren auf der deutschsprachigen Wikipedia (CC BY-SA 4.0) und den Listen der Stolpersteine in Hamburg (siehe auch
          stolpersteine-hamburg.de). Spielplätze, Toiletten, Eisdielen und Karte: © OpenStreetMap-Mitwirkende (ODbL).
        </p>
        <details>
          <summary style={{ fontWeight: 600, cursor: 'pointer' }}>Bildnachweise ({Object.keys(CREDITS).length})</summary>
          <ul className="credits">
            {Object.entries(CREDITS).map(([id, c]) => (
              <li key={id}>
                <a href={c.source} target="_blank" rel="noreferrer">
                  {c.file}
                </a>{' '}
                · {c.author} · {c.license}
              </li>
            ))}
          </ul>
        </details>
      </div>

      <Reports />

      <Backup />

      <Legal />

      <button
        type="button"
        className="btn warn rise"
        onClick={() => {
          if (confirm('Album, Abzeichen und Gesamtpunkte wirklich löschen?')) resetCareer();
        }}
      >
        Album & Abzeichen zurücksetzen
      </button>
      <p className="muted" style={{ textAlign: 'center', fontSize: 13 }} data-testid="version">
        Version vom {new Date(__BUILD_TIME__).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' })}
      </p>
    </div>
  );
}

/** Gemeldete Probleme ansehen und teilen (z. B. per WhatsApp an die Person, die die App pflegt) */
function Reports() {
  const list = useReports();
  const [copied, setCopied] = useState(false);
  if (!list.length) return null;
  const share = async () => {
    const text = reportsText(list);
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Schnitzeljagd – Meldungen', text });
        return;
      }
    } catch {
      /* abgebrochen: dann kopieren */
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      /* kein Zugriff */
    }
  };
  return (
    <div className="card rise reports" data-testid="reports">
      <div className="caption">Gemeldete Probleme ({list.length})</div>
      <ul>
        {list.map((r) => (
          <li key={r.id}>
            <strong>{r.stationTitle}</strong> · {r.kind}
            {r.text && <div className="muted">{r.text}</div>}
          </li>
        ))}
      </ul>
      <button type="button" className="btn primary" onClick={() => void share()}>
        {copied ? 'Kopiert!' : 'Meldungen teilen'}
      </button>
      <button type="button" className="btn ghost small" onClick={() => { if (confirm('Alle Meldungen löschen?')) clearReports(); }}>
        Meldungen löschen
      </button>
    </div>
  );
}

/** Sicherung als Datei: für Handywechsel oder falls der Browser Daten löscht */
function Backup() {
  const [msg, setMsg] = useState('');
  const save = async () => {
    const text = exportBackup();
    const name = `schnitzeljagd-sicherung-${new Date().toISOString().slice(0, 10)}.json`;
    const file = new File([text], name, { type: 'application/json' });
    try {
      const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
      if (nav.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Schnitzeljagd-Sicherung' });
        setMsg('Sicherung geteilt.');
        return;
      }
    } catch {
      /* abgebrochen: herunterladen */
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(file);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    setMsg('Sicherung gespeichert.');
  };
  const load = async (f: File | undefined) => {
    if (!f) return;
    try {
      importBackup(await f.text());
      setMsg('Sicherung geladen. Die App startet neu …');
      setTimeout(() => location.reload(), 800);
    } catch {
      setMsg('Das ist keine gültige Sicherung dieser App.');
    }
  };
  return (
    <div className="card rise backup" data-testid="backup">
      <div className="caption">Sicherung</div>
      <p className="muted" style={{ fontSize: 14 }}>
        Spielstand, Album, Abzeichen und Meldungen als Datei sichern, z. B. vor einem Handywechsel. Fotos sind nicht enthalten.
      </p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" className="btn" onClick={() => void save()} data-testid="backup-save">
          Sicherung speichern
        </button>
        <label className="btn">
          Sicherung laden
          <input type="file" accept="application/json,.json" hidden data-testid="backup-load" onChange={(e) => void load(e.target.files?.[0])} />
        </label>
      </div>
      {msg && <p className="muted fade" role="status">{msg}</p>}
    </div>
  );
}
