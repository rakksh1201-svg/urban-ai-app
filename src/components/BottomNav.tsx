import React from 'react';
import { Home, Map, TrendingUp, Bell, User } from 'lucide-react';
import { t, type LangCode } from '../data/languages';

export type MobileTab = 'dashboard' | 'map' | 'insights' | 'profile';

interface BottomNavProps {
  activeTab: MobileTab;
  onTabChange: (tab: MobileTab) => void;
  lang: LangCode;
}

const TABS: { id: MobileTab; icon: typeof Home; labelKey: string }[] = [
  { id: 'dashboard', icon: Home, labelKey: 'home' },
  { id: 'map', icon: Map, labelKey: 'map' },
  { id: 'insights', icon: TrendingUp, labelKey: 'insights' },
  { id: 'profile', icon: User, labelKey: 'profile' },
];

const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange, lang }) => {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50">
      <div className="bg-[hsl(220,33%,7%)]/[0.97] backdrop-blur-2xl border-t border-border/40 shadow-[0_-2px_20px_rgba(0,0,0,0.5)]">
        <div className="flex items-center justify-around px-1 pb-[env(safe-area-inset-bottom,6px)] pt-2">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`relative flex flex-col items-center justify-center gap-[3px] py-1 w-16 rounded-xl transition-all duration-300 ease-out ${
                  isActive ? 'scale-[1.02]' : 'active:scale-95'
                }`}
              >
                {/* Active pill background */}
                <div
                  className={`absolute inset-x-2 -top-0.5 bottom-0 rounded-xl transition-all duration-300 ${
                    isActive ? 'bg-primary/10' : 'bg-transparent'
                  }`}
                />
                <Icon
                  className={`relative z-10 transition-all duration-300 ${
                    isActive
                      ? 'text-primary drop-shadow-[0_0_8px_hsl(160,84%,39%,0.4)]'
                      : 'text-muted-foreground/70'
                  }`}
                  size={22}
                  strokeWidth={isActive ? 2 : 1.5}
                />
                <span
                  className={`relative z-10 text-[10px] leading-none font-medium tracking-wide transition-all duration-300 ${
                    isActive ? 'text-primary' : 'text-muted-foreground/60'
                  }`}
                >
                  {t(lang, tab.labelKey)}
                </span>
                {/* Active indicator dot */}
                {isActive && (
                  <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-5 h-[2.5px] rounded-full bg-primary shadow-[0_0_6px_hsl(160,84%,39%,0.5)] transition-all duration-300" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default BottomNav;
