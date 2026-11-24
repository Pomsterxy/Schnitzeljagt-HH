/**
 * Schließen beim Antippen des abgedunkelten Hintergrunds – aber nur, wenn der Finger auch dort
 * aufgesetzt wurde. Sonst schließt sich ein Fenster, wenn es beim Tippen in ein Feld wegen der
 * Tastatur nach oben rutscht und der Finger beim Loslassen auf dem Hintergrund landet.
 */
export function backdropClose(close: () => void) {
  let startedOnBackdrop = false;
  return {
    onPointerDown: (e: React.PointerEvent) => {
      startedOnBackdrop = e.target === e.currentTarget;
    },
    onClick: (e: React.MouseEvent) => {
      if (startedOnBackdrop && e.target === e.currentTarget) close();
      startedOnBackdrop = false;
    },
  };
}
