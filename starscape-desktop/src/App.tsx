// ---------------------------------------------------------------------------
// StarScape — Root application component
// ---------------------------------------------------------------------------
// Views: '/' (scroll experience), '/explorer' (3D solar system),
// '/dashboard' (live celestial data), '/journey' (CSS scroll tour),
// '/privacy'. Keyboard: E / D / J jump to views, Escape returns home.
// ---------------------------------------------------------------------------

import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { ConstellationJourney } from '@screens/ConstellationJourney';
import { PlanetTrackerSection } from '@screens/PlanetTrackerSection';
import { SkyConditionsWidget } from '@screens/SkyConditionsWidget';
import { AboutFooter } from '@screens/AboutFooter';
import { PrivacyPolicy } from '@screens/PrivacyPolicy';
import { TopNav } from '@screens/TopNav';

// Three.js is ~262 KB gzip — defer parsing until after initial paint to cut TBT
const HeroSection = lazy(() =>
  import('@screens/HeroSection').then((m) => ({ default: m.HeroSection }))
);
const SolarSystemExplorer = lazy(() =>
  import('@screens/SolarSystemExplorer').then((m) => ({ default: m.SolarSystemExplorer }))
);
const CelestialDashboard = lazy(() =>
  import('@screens/CelestialDashboard').then((m) => ({ default: m.CelestialDashboard }))
);
const ScrollJourney = lazy(() =>
  import('@screens/ScrollJourney').then((m) => ({ default: m.ScrollJourney }))
);

const viewFallback = (
  <div
    style={{ position: 'fixed', inset: 0, background: '#050714' }}
    aria-label="Loading view…"
  />
);

export function App() {
  const [pathname, setPathname] = useState(window.location.pathname);

  const navigate = useCallback((path: string) => {
    window.history.pushState({}, '', path);
    setPathname(path);
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const onPop = () => setPathname(window.location.pathname);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // Keyboard shortcuts — skipped while typing in form fields
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      switch (e.key.toLowerCase()) {
        case 'e':
          navigate('/explorer');
          break;
        case 'd':
          navigate('/dashboard');
          break;
        case 'j':
          navigate('/journey');
          break;
        case 'escape':
          // In the explorer, Esc releases the focused object (handled there);
          // elsewhere it returns to the home experience.
          if (window.location.pathname !== '/explorer') navigate('/');
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate]);

  if (pathname === '/privacy') return <PrivacyPolicy />;

  let view: JSX.Element;
  if (pathname === '/explorer') {
    view = (
      <Suspense fallback={viewFallback}>
        <SolarSystemExplorer />
      </Suspense>
    );
  } else if (pathname === '/dashboard') {
    view = (
      <Suspense fallback={viewFallback}>
        <CelestialDashboard />
      </Suspense>
    );
  } else if (pathname === '/journey') {
    view = (
      <Suspense fallback={viewFallback}>
        <ScrollJourney />
      </Suspense>
    );
  } else {
    view = (
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

  return (
    <>
      <TopNav pathname={pathname} onNavigate={navigate} />
      {view}
    </>
  );
}
