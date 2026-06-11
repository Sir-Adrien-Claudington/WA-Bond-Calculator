// ---------------------------------------------------------------------------
// StarScape — Root application component
// ---------------------------------------------------------------------------

import { useState, useEffect } from 'react';
import { HeroSection } from '@screens/HeroSection';
import { ConstellationJourney } from '@screens/ConstellationJourney';
import { PlanetTrackerSection } from '@screens/PlanetTrackerSection';
import { SkyConditionsWidget } from '@screens/SkyConditionsWidget';
import { AboutFooter } from '@screens/AboutFooter';
import { PrivacyPolicy } from '@screens/PrivacyPolicy';

export function App() {
  const [pathname, setPathname] = useState(window.location.pathname);

  useEffect(() => {
    const onPop = () => setPathname(window.location.pathname);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  if (pathname === '/privacy') return <PrivacyPolicy />;

  return (
    <main
      style={{
        fontFamily: "'Inter', system-ui, sans-serif",
        background: '#000814',
        color: '#E8F4FD',
        minHeight: '100vh',
        overflowX: 'hidden',
      }}
    >
      {/* 1. Hero — immersive 3D starfield, scroll-driven camera drift */}
      <HeroSection />

      {/* 2. Constellation mythology journey — scroll-revealed cards */}
      <ConstellationJourney />

      {/* 3. Planet tracker — live JPL Horizons positions */}
      <PlanetTrackerSection />

      {/* 4. Sky conditions — Open Meteo (CC BY 4.0) */}
      <SkyConditionsWidget />

      {/* 5. Footer — attribution strings (legally required for CC BY 4.0) */}
      <AboutFooter />
    </main>
  );
}
