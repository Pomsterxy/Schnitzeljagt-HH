/**
 * Bildschirmtastatur: Auf dem iPhone legt sich die Tastatur über die Seite, ohne sie zu verkleinern.
 * Unten klebende Leisten (Chat-Eingabe, Bottom-Sheets) würden dann verdeckt.
 * Wir messen die Tastaturhöhe über visualViewport und stellen sie als CSS-Variable --kb bereit.
 * Android (Chrome) verkleinert die Seite dank interactive-widget=resizes-content selbst.
 */
export function watchKeyboard(): () => void {
  const vv = window.visualViewport;
  const root = document.documentElement;
  const update = () => {
    if (!vv) return;
    const kb = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
    const open = kb > 80;
    root.style.setProperty('--kb', `${open ? kb : 0}px`);
    root.classList.toggle('kb-open', open);
  };
  // Fokussiertes Eingabefeld sichtbar halten, sobald die Tastatur da ist
  const onFocus = (e: FocusEvent) => {
    const el = e.target as HTMLElement | null;
    if (!el || !el.matches('input:not([type=file]):not([type=checkbox]), textarea')) return;
    setTimeout(() => {
      update();
      // in festen Leisten (Chat-Eingabe, Sheet) reicht die Verschiebung über --kb
      if (el.closest('.composer, .dialog')) return;
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, 320);
  };
  vv?.addEventListener('resize', update);
  vv?.addEventListener('scroll', update);
  document.addEventListener('focusin', onFocus);
  update();
  return () => {
    vv?.removeEventListener('resize', update);
    vv?.removeEventListener('scroll', update);
    document.removeEventListener('focusin', onFocus);
  };
}
