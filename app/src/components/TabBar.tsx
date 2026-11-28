import { useLayoutEffect, useRef, useState } from 'react';
import { Icon, type IconName } from './Icon';
import { play } from '../lib/feedback';

export type Tab = 'home' | 'album' | 'badges' | 'settings';

const TABS: { id: Tab; label: string; icon: IconName }[] = [
  { id: 'home', label: 'Touren', icon: 'compass' },
  { id: 'album', label: 'Album', icon: 'album' },
  { id: 'badges', label: 'Abzeichen', icon: 'medal' },
  { id: 'settings', label: 'Mehr', icon: 'more' },
];

/** Tab-Leiste: die schwarze Pille gleitet zum gewählten Reiter, die Beschriftung klappt weich auf */
export function TabBar({ active, onChange, dark }: { active: Tab; onChange: (t: Tab) => void; dark?: boolean }) {
  const refs = useRef<Partial<Record<Tab, HTMLButtonElement | null>>>({});
  const [pill, setPill] = useState<{ x: number; w: number } | null>(null);

  // Der Pill folgt dem aktiven Knopf, auch während dieser breiter wird
  useLayoutEffect(() => {
    const el = refs.current[active];
    if (!el) return;
    const measure = () => setPill({ x: el.offsetLeft, w: el.offsetWidth });
    measure();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, [active]);

  return (
    <nav className={`tabbar${dark ? ' dark' : ''}`} aria-label="Hauptnavigation">
      <div className="tabbar-inner">
        {pill && <span className="tab-pill" aria-hidden="true" style={{ transform: `translateX(${pill.x}px)`, width: pill.w }} />}
        {TABS.map((t) => (
          <button
            key={t.id}
            ref={(el) => {
              refs.current[t.id] = el;
            }}
            type="button"
            className={t.id === active ? 'on' : ''}
            aria-current={t.id === active ? 'page' : undefined}
            aria-label={t.label}
            onClick={() => {
              if (t.id === active) return;
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
