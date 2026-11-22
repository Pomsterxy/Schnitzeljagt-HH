import { useEffect, useState } from 'react';
import { Home } from './screens/Home';
import { Setup } from './screens/Setup';
import { Play } from './screens/Play';
import { Finish } from './screens/Finish';
import { Album } from './screens/Album';
import { Settings } from './screens/Settings';
import { getGame } from './state/game';
import { setSimulated } from './lib/location';

type Screen = 'home' | 'setup' | 'play' | 'finish' | 'album' | 'settings';

export default function App() {
  const [screen, setScreen] = useState<Screen>(() => {
    const g = getGame();
    return g && !g.finishedAt && g.index < g.stops.length ? 'play' : 'home';
  });

  useEffect(() => {
    // ?test=1 schaltet den Testmodus ein (Standort simulieren)
    const q = new URLSearchParams(location.search);
    if (q.get('test') === '1') setSimulated(true);
    if (q.get('test') === '0') setSimulated(false);
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [screen]);

  switch (screen) {
    case 'setup':
      return <Setup onStarted={() => setScreen('play')} onCancel={() => setScreen('home')} />;
    case 'play':
      return <Play onFinish={() => setScreen('finish')} onHome={() => setScreen('home')} />;
    case 'finish':
      return <Finish onHome={() => setScreen('home')} />;
    case 'album':
      return <Album onBack={() => setScreen('home')} />;
    case 'settings':
      return <Settings onBack={() => setScreen('home')} />;
    default:
      return (
        <Home
          onNew={() => setScreen('setup')}
          onContinue={() => setScreen('play')}
          onAlbum={() => setScreen('album')}
          onSettings={() => setScreen('settings')}
        />
      );
  }
}
