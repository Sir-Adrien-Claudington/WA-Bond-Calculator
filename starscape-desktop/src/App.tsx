// ---------------------------------------------------------------------------
// StarScape — Root application component
// ---------------------------------------------------------------------------

import { useState, useEffect, lazy, Suspense } from 'react';
import { ConstellationJourney } from '@screens/ConstellationJourney';
import { PlanetTrackerSection } from '@screens/PlanetTrackerSection';
import { SkyConditionsWidget } from '@screens/SkyConditionsWidget';
import { AboutFooter } from '@screens/AboutFooter';
import { PrivacyPolicy } from '@screens/PrivacyPolicy';

// Three.js is ~262 KB gzip — defer parsing until after initial paint to cut TBT
const HeroSection = lazy(() =>
  import('@screens/HeroSection').then((m) => ({ default: m.HeroSection }))
);

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
      {/* 1. Hero — Three.js loaded lazily to keep TBT low on initial paint */}
      <Suspense
        fallback={
          <div
            style={{ width: '100%', height: '100vh', background: '#000814' }}
            aria-label="Loading starfield…"
          />
        }
      >
        <HeroSection />
      </Suspense>

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
