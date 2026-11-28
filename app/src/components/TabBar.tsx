import { Icon, type IconName } from './Icon';
import { play } from '../lib/feedback';

export type Tab = 'home' | 'album' | 'badges' | 'settings';

const TABS: { id: Tab; label: string; icon: IconName }[] = [
  { id: 'home', label: 'Touren', icon: 'compass' },
  { id: 'album', label: 'Album', icon: 'album' },
  { id: 'badges', label: 'Abzeichen', icon: 'medal' },
  { id: 'settings', label: 'Mehr', icon: 'more' },
];

export function TabBar({ active, onChange, dark }: { active: Tab; onChange: (t: Tab) => void; dark?: boolean }) {
  return (
    <nav className={`tabbar${dark ? ' dark' : ''}`} aria-label="Hauptnavigation">
      <div className="tabbar-inner">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={t.id === active ? 'on' : ''}
            aria-current={t.id === active ? 'page' : undefined}
            aria-label={t.label}
            onClick={() => {
              play('tap');
              onChange(t.id);
            }}
          >
            <Icon name={t.icon} size={22} />
            <span className="tab-label">{t.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
