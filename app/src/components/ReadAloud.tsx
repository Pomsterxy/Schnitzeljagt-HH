import { useEffect, useState } from 'react';
import { canSpeak, speak, stopSpeaking } from '../lib/speech';
import { Icon } from './Icon';

export function ReadAloud({ text, label = 'Vorlesen' }: { text: string; label?: string }) {
  const [on, setOn] = useState(false);
  useEffect(() => () => stopSpeaking(), []);
  if (!canSpeak()) return null;
  return (
    <button
      type="button"
      className="icon-btn accent"
      aria-label={on ? 'Vorlesen stoppen' : label}
      title={on ? 'Vorlesen stoppen' : label}
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
      <Icon name={on ? 'pause' : 'speaker'} size={18} />
    </button>
  );
}
