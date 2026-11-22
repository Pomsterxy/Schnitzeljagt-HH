let voice: SpeechSynthesisVoice | null = null;

function pickVoice(): SpeechSynthesisVoice | null {
  if (typeof speechSynthesis === 'undefined') return null;
  const voices = speechSynthesis.getVoices();
  return (
    voices.find((v) => v.lang === 'de-DE' && /google|anna|petra|helena|katja/i.test(v.name)) ??
    voices.find((v) => v.lang.startsWith('de')) ??
    null
  );
}

if (typeof speechSynthesis !== 'undefined') {
  speechSynthesis.onvoiceschanged = () => {
    voice = pickVoice();
  };
}

export function canSpeak(): boolean {
  return typeof speechSynthesis !== 'undefined';
}

export function speak(text: string, onEnd?: () => void): void {
  if (!canSpeak()) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'de-DE';
  u.rate = 0.95;
  voice = voice ?? pickVoice();
  if (voice) u.voice = voice;
  if (onEnd) {
    u.onend = onEnd;
    u.onerror = onEnd;
  }
  speechSynthesis.speak(u);
}

export function stopSpeaking(): void {
  if (canSpeak()) speechSynthesis.cancel();
}
