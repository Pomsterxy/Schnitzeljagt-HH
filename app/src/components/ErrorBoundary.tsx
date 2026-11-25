import { Component, type ReactNode } from 'react';
import { logError } from '../lib/errorlog';

/**
 * Fängt Abstürze einer Ansicht ab, statt einen weißen Bildschirm zu zeigen.
 * (Fehlende Programmteile nach einem Update behandelt main.tsx über "vite:preloadError".)
 */
export class ErrorBoundary extends Component<{ children: ReactNode; onHome: () => void }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    logError(error, 'Ansicht');
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="screen crash" data-testid="crash">
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 40 }}>
          <h1 className="large-title">Hoppla!</h1>
          <p>Da ist etwas schiefgegangen. Euer Spielstand ist gespeichert, es geht gleich weiter.</p>
          <button type="button" className="btn big primary" onClick={() => location.reload()}>
            Neu laden
          </button>
          <button
            type="button"
            className="btn ghost"
            onClick={() => {
              this.setState({ failed: false });
              this.props.onHome();
            }}
          >
            Zur Startseite
          </button>
          <small className="muted">Der Fehler wurde auf dem Handy notiert. Ihr könnt ihn unter „Mehr“ bei den Meldungen teilen.</small>
        </div>
      </div>
    );
  }
}
