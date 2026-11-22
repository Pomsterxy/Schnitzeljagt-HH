import { useEffect, useState } from 'react';
import { canSpeak, speak, stopSpeaking } from '../lib/speech';

export function ReadAloud({ text, label = 'Vorlesen' }: { text: string; label?: string }) {
  const [on, setOn] = useState(false);
  useEffect(() => () => stopSpeaking(), []);
  if (!canSpeak()) return null;
  return (
    <button
      type="button"
      className="btn small ghost"
      aria-label={on ? 'Vorlesen stoppen' : label}
      onClick={() => {
        if (on) {
          stopSpeaking();
          setOn(false);
        } else {
          setOn(true);
          speak(text, () => setOn(false));
        }
      }}
    >
      {on ? '⏹ Stopp' : `🔊 ${label}`}
    </button>
  );
}
