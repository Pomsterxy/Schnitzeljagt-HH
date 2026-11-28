import { lazy, Suspense, useEffect, useState } from 'react';
import { Home } from './screens/Home';
const Setup = lazy(() => import('./screens/Setup').then((m) => ({ default: m.Setup })));
const Play = lazy(() => import('./screens/Play').then((m) => ({ default: m.Play })));
const Finish = lazy(() => import('./screens/Finish').then((m) => ({ default: m.Finish })));
const Album = lazy(() => import('./screens/Album').then((m) => ({ default: m.Album })));
const Compare = lazy(() => import('./screens/Compare').then((m) => ({ default: m.Compare })));
const Settings = lazy(() => import('./screens/Settings').then((m) => ({ default: m.Settings })));
import { TabBar, type Tab } from './components/TabBar';
import { getGame } from './state/game';
import { setSimulated } from './lib/location';
import { decodeTour } from './lib/share';
import { EffectsLayer } from './components/EffectsLayer';
import { clearEffects } from './lib/effects';
import { UndoToast } from './components/UndoToast';
import { useRipple } from './components/Micro';
import { ErrorBoundary } from './components/ErrorBoundary';
import { hasViewTransitions, transition, type NavDir } from './lib/nav';

type Screen = Tab | 'setup' | 'play' | 'finish' | 'compare';

/** Tiefe eines Bildschirms: größer = weiter "vorne" (für die Richtung der Übergänge) */
const DEPTH: Record<Screen, number> = { home: 0, album: 0, badges: 0, settings: 0, setup: 1, compare: 1, play: 2, finish: 3 };
const TAB_ORDER: Screen[] = ['home', 'album', 'badges', 'settings'];
function dirFor(from: Screen, to: Screen): NavDir {
  if (DEPTH[to] > DEPTH[from]) return 'forward';
  if (DEPTH[to] < DEPTH[from]) return 'back';
  const a = TAB_ORDER.indexOf(from);
  const b = TAB_ORDER.indexOf(to);
  return a >= 0 && b >= 0 ? (b > a ? 'left' : 'right') : 'fade';
}

export default function App() {
  // Einladung per Link (?tour=…): direkt in die Planung mit fester Route
  const [shared, setShared] = useState(() => {
    const code = new URLSearchParams(location.search).get('tour');
    return code ? decodeTour(code) : null;
  });
  // Ergebnis eines anderen Teams (?result=…): Rangliste und Herausforderung
  const [resultCode] = useState(() => new URLSearchParams(location.search).get('result'));
  const [screen, setScreenNow] = useState<Screen>(() => {
    if (resultCode) return 'compare';
    if (shared) return 'setup';
    const g = getGame();
    return g && !g.finishedAt && g.index < g.stops.length ? 'play' : 'home';
  });
  // Richtung des letzten Wechsels (für die CSS-Animation, falls es keine View Transitions gibt)
  const [dir, setDir] = useState<NavDir | 'vt'>('fade');
  const setScreen = (to: Screen) => {
    if (to === screen) return;
    const d = dirFor(screen, to);
    // Tab-Wechsel: die Tab-Leiste bleibt stehen, ihr Pill gleitet; der Inhalt gleitet per CSS
    if (DEPTH[to] === 0 && DEPTH[screen] === 0) {
      setDir(d);
      setScreenNow(to);
      return;
    }
    // Mit View Transitions übernimmt der Browser die Animation, sonst die CSS-Klasse
    setDir(hasViewTransitions() ? 'vt' : d);
    transition(() => setScreenNow(to), d);
  };

  useEffect(() => {
    const q = new URLSearchParams(location.search);
    if (q.has('tour') || q.has('result')) history.replaceState(null, '', location.pathname);
  }, []);

  useEffect(() => {
    // ?test=1 schaltet den Testmodus ein (Standort simulieren)
    const q = new URLSearchParams(location.search);
    if (q.get('test') === '1') setSimulated(true);
    if (q.get('test') === '0') setSimulated(false);
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
    clearEffects();
    // Dunkle Bildschirme: Seitenhintergrund und Statusleiste ebenfalls dunkel (nicht auf :has() verlassen)
    const dark = screen === 'home' || screen === 'setup';
    document.documentElement.toggleAttribute('data-dark', dark);
    document.querySelector('meta[name=theme-color]')?.setAttribute('content', '#f9f1e1');
  }, [screen]);

  useRipple();

  const tab = screen === 'home' || screen === 'album' || screen === 'badges' || screen === 'settings' ? screen : null;

  let content: React.ReactNode;
  switch (screen) {
    case 'setup':
      content = (
        <Setup
          shared={shared}
          onStarted={() => {
            setShared(null);
            setScreen('play');
          }}
          onCancel={() => {
            setShared(null);
            setScreen('home');
          }}
        />
      );
      break;
    case 'play':
      content = <Play onFinish={() => setScreen('finish')} onHome={() => setScreen('home')} />;
      break;
    case 'compare':
      content = (
        <Compare
          code={resultCode ?? ''}
          onPlay={(t) => {
            setShared(t);
            setScreen('setup');
          }}
          onHome={() => setScreen('home')}
        />
      );
      break;
    case 'finish':
      content = <Finish onHome={() => setScreen('home')} />;
      break;
    case 'album':
      content = <Album mode="cards" />;
      break;
    case 'badges':
      content = <Album mode="badges" />;
      break;
    case 'settings':
      content = <Settings />;
      break;
    default:
      content = (
        <Home onNew={() => setScreen('setup')} onContinue={() => setScreen('play')} onAlbum={() => setScreen('album')} onBadges={() => setScreen('badges')} />
      );
  }

  return (
    <>
      <div key={screen} className={`screen-enter nav-${dir}`}>
        <ErrorBoundary onHome={() => setScreen('home')}>
          <Suspense fallback={<div className="screen-loading" aria-hidden="true" />}>{content}</Suspense>
        </ErrorBoundary>
      </div>
      {tab && <TabBar active={tab} onChange={setScreen} dark={tab === 'home'} />}
      <EffectsLayer />
      <UndoToast onUndone={(label) => label === 'Tour gelöscht' && setScreen('play')} />
    </>
  );
}
