// ---------------------------------------------------------------------------
// StarScape — Planet tracker section
// ---------------------------------------------------------------------------
// Shows live planet positions from JPL Horizons (via Netlify proxy).
// Uses the browser Geolocation API. Gracefully degrades to Greenwich if denied.
// Planets are displayed as CSS 3D spatial cards with Framer Motion depth.
// ---------------------------------------------------------------------------

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useLocationStore } from '@store/useLocationStore';
import { usePlanetStore } from '@store/usePlanetStore';
import { colors } from '@constants/theme';
import type { PlanetCard } from '@api/types';

gsap.registerPlugin(ScrollTrigger);

// Approximate right ascension of the sun by month — to show which planets
// are visible tonight (rough check: |planet RA - sun RA| > 30°)
function isBroadlyVisible(planet: PlanetCard): boolean {
  // Simplified: all planets shown (detailed rise/set calc beyond current scope)
  return planet.magnitude < 5.0;
}

function PlanetCardUI({
  planet,
  index,
}: {
  planet: PlanetCard;
  index: number;
}) {
  const PLANET_ICONS: Record<string, string> = {
    Mercury: '☿',
    Venus: '♀',
    Mars: '♂',
    Jupiter: '♃',
    Saturn: '♄',
    Moon: '☽',
  };

  const PLANET_DESC: Record<string, string> = {
    Mercury: 'Fastest planet — one orbit in 88 Earth days',
    Venus: 'Brightest object after Sun and Moon',
    Mars: 'The red planet, next human destination',
    Jupiter: 'Largest planet — 1,300 Earths fit inside',
    Saturn: 'Ringed giant, visible to the naked eye',
    Moon: 'Our natural satellite, 384,400 km distant',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 40, rotateX: 15 }}
      whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.6, delay: index * 0.1, ease: 'easeOut' }}
      whileHover={{
        scale: 1.04,
        rotateY: 3,
        boxShadow: `0 20px 60px rgba(76, 201, 240, 0.12)`,
      }}
      style={{
        background: colors.cardBg,
        backdropFilter: 'blur(20px)',
        border: `1px solid ${colors.cardBorder}`,
        borderRadius: '12px',
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        transformStyle: 'preserve-3d',
        cursor: 'default',
      }}
      role="article"
      aria-label={`${planet.name} position data`}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <span
          style={{ fontSize: '2rem', lineHeight: 1 }}
          aria-hidden="true"
        >
          {PLANET_ICONS[planet.name] ?? '○'}
        </span>
        <div>
          <div
            style={{
              fontSize: '1.125rem',
              fontWeight: 500,
              color: colors.textPrimary,
              letterSpacing: '0.05em',
            }}
          >
            {planet.name}
          </div>
          <div
            style={{ fontSize: '0.8125rem', color: colors.accentBlue }}
          >
            mag {planet.magnitude.toFixed(1)}
          </div>
        </div>
      </div>

      <p
        style={{
          fontSize: '0.875rem',
          color: colors.textSecondary,
          margin: 0,
          lineHeight: 1.5,
        }}
      >
        {PLANET_DESC[planet.name] ?? ''}
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '0.5rem',
          paddingTop: '0.75rem',
          borderTop: `1px solid ${colors.constellationLine}`,
        }}
      >
        <div>
          <div style={{ fontSize: '0.6875rem', color: colors.textMuted, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
            RA
          </div>
          <div style={{ fontSize: '0.9375rem', color: colors.textPrimary, fontVariantNumeric: 'tabular-nums' }}>
            {(planet.raDeg / 15).toFixed(2)}h
          </div>
        </div>
        <div>
          <div style={{ fontSize: '0.6875rem', color: colors.textMuted, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
            Dec
          </div>
          <div style={{ fontSize: '0.9375rem', color: colors.textPrimary, fontVariantNumeric: 'tabular-nums' }}>
            {planet.decDeg > 0 ? '+' : ''}{planet.decDeg.toFixed(2)}°
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function PlanetTrackerSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const { location, geoState, requestLocation } = useLocationStore();
  const { planets, loadState, error, fetchPlanets } = usePlanetStore();

  // Request location on mount
  useEffect(() => {
    if (geoState === 'idle') {
      requestLocation();
    }
  }, [geoState, requestLocation]);

  // Fetch planets once we have a location
  useEffect(() => {
    if (location && loadState === 'idle') {
      fetchPlanets(location.latitude, location.longitude);
    }
  }, [location, loadState, fetchPlanets]);

  // Heading entrance animation
  useEffect(() => {
    if (!headingRef.current) return;
    gsap.fromTo(
      headingRef.current,
      { opacity: 0, y: 30 },
      {
        opacity: 1,
        y: 0,
        duration: 1,
        scrollTrigger: { trigger: headingRef.current, start: 'top 80%' },
      }
    );
  }, []);

  const visiblePlanets = planets.filter(isBroadlyVisible);

  return (
    <section
      ref={sectionRef}
      style={{ background: '#000814', padding: '6rem 0' }}
      aria-labelledby="planets-heading"
    >
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 2rem' }}>
        <h2
          ref={headingRef}
          id="planets-heading"
          style={{
            fontSize: 'clamp(1.5rem, 4vw, 2.25rem)',
            fontWeight: 200,
            letterSpacing: '0.15em',
            textAlign: 'center',
            color: colors.textPrimary,
            marginBottom: '0.75rem',
            opacity: 0,
          }}
        >
          TONIGHT'S PLANETS
        </h2>
        <p
          style={{
            textAlign: 'center',
            color: colors.textSecondary,
            marginBottom: '3rem',
            fontSize: '0.9375rem',
          }}
        >
          Live positions from JPL Horizons (NASA/JPL-Caltech), public domain
          {location &&
            ` — observer at ${location.latitude.toFixed(2)}°, ${location.longitude.toFixed(2)}°`}
        </p>

        {/* Loading state */}
        {loadState === 'loading' && (
          <div
            role="status"
            aria-live="polite"
            style={{ textAlign: 'center', color: colors.textMuted, padding: '3rem' }}
          >
            Fetching planet positions...
          </div>
        )}

        {/* Error state */}
        {loadState === 'error' && (
          <div
            role="alert"
            style={{
              background: 'rgba(255, 107, 107, 0.08)',
              border: '1px solid rgba(255, 107, 107, 0.2)',
              borderRadius: '8px',
              padding: '1.5rem',
              color: '#FF6B6B',
              textAlign: 'center',
              fontSize: '0.9375rem',
            }}
          >
            <strong>Planet data unavailable.</strong>
            <br />
            {error}
            <br />
            <span style={{ fontSize: '0.875rem', color: colors.textMuted }}>
              Deploy to Netlify for live planet tracking.
            </span>
          </div>
        )}

        {/* Planet grid */}
        {loadState === 'success' && (
          <>
            {visiblePlanets.length === 0 ? (
              <p style={{ textAlign: 'center', color: colors.textMuted }}>
                No bright planets detected. Check back at a different time.
              </p>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                  gap: '1.5rem',
                  perspective: '1000px',
                }}
              >
                {visiblePlanets.map((planet, i) => (
                  <PlanetCardUI key={planet.bodyCode} planet={planet} index={i} />
                ))}
              </div>
            )}
            <p
              style={{
                textAlign: 'center',
                color: colors.textMuted,
                fontSize: '0.8125rem',
                marginTop: '2rem',
              }}
            >
              Data: JPL Horizons (NASA/JPL-Caltech), public domain — updated every 10 minutes
            </p>
          </>
        )}
      </div>
    </section>
  );
}
