import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../integrations/supabase/client';
import { computeAllPredictions } from '../engine/prediction';
import { STATES_AND_CITIES, STATE_LIST } from '../data/historicalData';
import { t, LANG_NAMES, type LangCode } from '../data/languages';
import Dashboard from '../components/Dashboard';
import Trends from '../components/Trends';
import MapView from '../components/MapView';
import CoolingAdvisor from '../components/CoolingAdvisor';
import AIChatbot from '../components/AIChatbot';
import Profile from '../components/Profile';
import BottomNav, { type MobileTab } from '../components/BottomNav';
import { ChevronDown } from 'lucide-react';

type DesktopTab = 'dashboard' | 'trends' | 'map' | 'cooling' | 'ai';

const DESKTOP_TABS: { id: DesktopTab; icon: string; key: string }[] = [
  { id: 'dashboard', icon: '🏠', key: 'dashboard' },
  { id: 'trends', icon: '📈', key: 'trends' },
  { id: 'map', icon: '🗺️', key: 'map' },
  { id: 'cooling', icon: '🏢', key: 'cooling' },
  { id: 'ai', icon: '🤖', key: 'ai' },
];

// Map mobile tabs to desktop tabs for content rendering
const MOBILE_TO_CONTENT: Record<MobileTab, DesktopTab | 'profile'> = {
  dashboard: 'dashboard',
  map: 'map',
  insights: 'trends',
  profile: 'profile',
};

const Index: React.FC = () => {
  const predictions = useMemo(() => computeAllPredictions(), []);
  const [lang, setLang] = useState<LangCode>('en');
  const [desktopTab, setDesktopTab] = useState<DesktopTab>('dashboard');
  const [mobileTab, setMobileTab] = useState<MobileTab>('dashboard');
  const [showMobileCamera, setShowMobileCamera] = useState(false);
  const [selectedState, setSelectedState] = useState(STATE_LIST[0]);
  const [selectedCity, setSelectedCity] = useState(STATES_AND_CITIES[STATE_LIST[0]][0]);
  const [userId, setUserId] = useState<string | null>(null);
  const navigate = useNavigate();

  useMemo(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const handleStateChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const state = e.target.value;
    setSelectedState(state);
    setSelectedCity(STATES_AND_CITIES[state][0]);
  }, []);

  const handleCityChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedCity(e.target.value);
  }, []);

  const handleCitySelect = useCallback((city: string) => {
    const pred = predictions[city];
    if (pred) {
      setSelectedState(pred.state);
      setSelectedCity(city);
      setDesktopTab('dashboard');
      setMobileTab('dashboard');
    }
  }, [predictions]);

  const handleLangChange = useCallback((newLang: LangCode) => {
    setLang(newLang);
  }, []);

  const currentPrediction = predictions[selectedCity];
  const langKeys = Object.keys(LANG_NAMES) as LangCode[];

  // Determine active content tab based on viewport
  const activeContentTab = mobileTab === 'profile' ? 'profile' : MOBILE_TO_CONTENT[mobileTab];

  const renderContent = (tab: string) => {
    switch (tab) {
      case 'dashboard':
        return currentPrediction && (
          <div className="space-y-6">
            <Dashboard city={selectedCity} prediction={currentPrediction} lang={lang} />
          </div>
        );
      case 'trends':
        return currentPrediction && <Trends city={selectedCity} prediction={currentPrediction} lang={lang} />;
      case 'map':
        return <MapView predictions={predictions} lang={lang} onCitySelect={handleCitySelect} />;
      case 'cooling':
        return currentPrediction && <CoolingAdvisor city={selectedCity} prediction={currentPrediction} lang={lang} />;
      case 'ai':
        return <AIChatbot lang={lang} cityContext={selectedCity} />;
      case 'profile':
        return <Profile lang={lang} onLangChange={handleLangChange} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-black tracking-tight text-primary">ENVIQ AI</h1>
            <span className="hidden md:inline text-xs text-muted-foreground">{t(lang, 'appTagline')}</span>
          </div>

          {/* Location selectors - always visible */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <select value={selectedState} onChange={handleStateChange}
                className="appearance-none bg-secondary text-foreground rounded-xl pl-3 pr-8 py-1.5 text-sm font-semibold border border-border focus:outline-none focus:ring-2 focus:ring-primary transition-colors">
                {STATE_LIST.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            </div>
            <div className="relative">
              <select value={selectedCity} onChange={handleCityChange}
                className="appearance-none bg-secondary text-foreground rounded-xl pl-3 pr-8 py-1.5 text-sm font-semibold border border-border focus:outline-none focus:ring-2 focus:ring-primary transition-colors">
                {(STATES_AND_CITIES[selectedState] ?? []).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            </div>

            {/* Desktop-only: language selector */}
            <div className="hidden md:flex items-center gap-2">
              <div className="relative">
                <select value={lang} onChange={(e) => setLang(e.target.value as LangCode)}
                  className="appearance-none bg-secondary text-foreground rounded-xl pl-3 pr-8 py-1.5 text-sm font-semibold border border-border focus:outline-none focus:ring-2 focus:ring-primary transition-colors">
                  {langKeys.map(l => <option key={l} value={l}>{LANG_NAMES[l]}</option>)}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Desktop Tabs */}
        <div className="max-w-7xl mx-auto px-4 hidden md:flex gap-1 pb-1 overflow-x-auto">
          {DESKTOP_TABS.map(tab => (
            <button key={tab.id} onClick={() => setDesktopTab(tab.id)}
              className={`px-4 py-2 rounded-t-xl text-sm font-semibold transition-colors whitespace-nowrap ${
                desktopTab === tab.id
                  ? 'bg-background text-primary border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}>
              {tab.icon} {t(lang, tab.key)}
            </button>
          ))}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6 pb-28 md:pb-6">
        {/* Desktop: use desktopTab, Mobile: use mapped mobileTab */}
        <div className="hidden md:block">
          {renderContent(desktopTab)}
        </div>
        <div className="md:hidden">
          {showMobileCamera ? (
            <div className="space-y-3">
              <button
                onClick={() => setShowMobileCamera(false)}
                className="text-sm text-primary font-semibold"
              >
                ← Back
              </button>
              {currentPrediction && (
                <FieldCamera city={selectedCity} envScore={currentPrediction.envScore2025} lang={lang} userId={userId} />
              )}
            </div>
          ) : (
            renderContent(activeContentTab)
          )}
        </div>
      </main>

      {/* Mobile FAB - Camera */}
      {!showMobileCamera && (
        <button
          onClick={() => setShowMobileCamera(true)}
          className="md:hidden fixed bottom-20 right-4 z-50 w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 flex items-center justify-center transition-transform active:scale-90"
        >
          <Camera size={20} strokeWidth={2} />
        </button>
      )}

      {/* Mobile Bottom Nav */}
      <BottomNav activeTab={mobileTab} onTabChange={(tab) => { setShowMobileCamera(false); setMobileTab(tab); }} lang={lang} />
    </div>
  );
};

export default Index;
