import { useEffect, useState } from 'react';
import { Home } from './screens/Home';
import { Setup } from './screens/Setup';
import { Play } from './screens/Play';
import { Finish } from './screens/Finish';
import { Album } from './screens/Album';
import { Settings } from './screens/Settings';
import { TabBar, type Tab } from './components/TabBar';
import { getGame } from './state/game';
import { setSimulated } from './lib/location';
import { Intro, shouldShowIntro } from './components/Intro';

type Screen = Tab | 'setup' | 'play' | 'finish';

export default function App() {
  const [screen, setScreen] = useState<Screen>(() => {
    const g = getGame();
    return g && !g.finishedAt && g.index < g.stops.length ? 'play' : 'home';
  });

  const [intro, setIntro] = useState(shouldShowIntro);

  useEffect(() => {
    // ?test=1 schaltet den Testmodus ein (Standort simulieren)
    const q = new URLSearchParams(location.search);
    if (q.get('test') === '1') setSimulated(true);
    if (q.get('test') === '0') setSimulated(false);
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [screen]);

  const tab = screen === 'home' || screen === 'album' || screen === 'badges' || screen === 'settings' ? screen : null;

  let content: React.ReactNode;
  switch (screen) {
    case 'setup':
      content = <Setup onStarted={() => setScreen('play')} onCancel={() => setScreen('home')} />;
      break;
    case 'play':
      content = <Play onFinish={() => setScreen('finish')} onHome={() => setScreen('home')} />;
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
      <div key={screen} className="screen-enter">
        {content}
      </div>
      {tab && <TabBar active={tab} onChange={setScreen} dark={tab === 'home'} />}
      {intro && <Intro onDone={() => setIntro(false)} />}
    </>
  );
}
