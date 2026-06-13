// ---------------------------------------------------------------------------
// StarScape — Sky conditions widget (Open Meteo)
// ---------------------------------------------------------------------------
// Licence: CC BY 4.0 — attribution string is rendered in this component.
// Adapted from ConstellationMap's SkyConditionsScreen.
// ---------------------------------------------------------------------------

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useLocationStore } from '@store/useLocationStore';
import { useSkyStore } from '@store/useSkyStore';
import { colors } from '@constants/theme';
import { ATTRIBUTION_OPEN_METEO } from '@constants/config';

function CloudIcon({ percent }: { percent: number }) {
  // Simple SVG cloud that scales opacity/size with cloud cover
  const opacity = 0.2 + (percent / 100) * 0.8;
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="20" cy="36" r="12" fill={colors.textMuted} opacity={opacity * 0.7} />
      <circle cx="32" cy="28" r="16" fill={colors.textMuted} opacity={opacity} />
      <circle cx="44" cy="36" r="12" fill={colors.textMuted} opacity={opacity * 0.7} />
      <rect x="8" y="36" width="48" height="16" rx="8" fill={colors.textMuted} opacity={opacity} />
    </svg>
  );
}

export function SkyConditionsWidget() {
  const { location, geoState } = useLocationStore();
  const { conditions, loadState, error, fetchConditions } = useSkyStore();

  useEffect(() => {
    if (location && loadState === 'idle') {
      fetchConditions(location.latitude, location.longitude);
    }
  }, [location, loadState, fetchConditions]);

  const limitingMagLabel = conditions
    ? conditions.limitingMagnitude >= 6.0
      ? 'Excellent — naked eye to mag 6.5'
      : conditions.limitingMagnitude >= 5.0
      ? 'Good — most stars visible'
      : conditions.limitingMagnitude >= 3.5
      ? 'Fair — bright stars only'
      : 'Poor — heavy cloud cover'
    : null;

  return (
    <section
      style={{
        background: `linear-gradient(to bottom, #001233, #000814)`,
        padding: '4rem 0',
        borderTop: `1px solid ${colors.constellationLine}`,
      }}
      aria-labelledby="sky-heading"
    >
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '0 clamp(1rem, 4vw, 3rem)', textAlign: 'center' }}>
        <h2
          id="sky-heading"
          style={{
            fontSize: 'clamp(1.25rem, 3vw, 1.75rem)',
            fontWeight: 200,
            letterSpacing: '0.15em',
            color: colors.textPrimary,
            marginBottom: '2rem',
          }}
        >
          SKY CONDITIONS
        </h2>

        {geoState === 'idle' || geoState === 'requesting' ? (
          <p
            role="status"
            aria-live="polite"
            style={{ color: colors.textMuted }}
          >
            Requesting location...
          </p>
        ) : loadState === 'loading' ? (
          <p
            role="status"
            aria-live="polite"
            style={{ color: colors.textMuted }}
          >
            Checking sky conditions...
          </p>
        ) : loadState === 'error' ? (
          <p role="alert" style={{ color: '#FF6B6B' }}>
            Sky conditions unavailable: {error}
          </p>
        ) : conditions ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            style={{
              background: colors.cardBg,
              backdropFilter: 'blur(20px)',
              border: `1px solid ${colors.cardBorder}`,
              borderRadius: '16px',
              padding: '2rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1.5rem',
            }}
          >
            <CloudIcon percent={conditions.cloudCoverPercent} />

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '1.5rem',
                width: '100%',
              }}
            >
              <div>
                <div style={{ fontSize: '0.6875rem', color: colors.textMuted, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                  Cloud Cover
                </div>
                <div style={{ fontSize: '1.5rem', color: colors.textPrimary, fontVariantNumeric: 'tabular-nums' }}>
                  {conditions.cloudCoverPercent}%
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.6875rem', color: colors.textMuted, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                  Visibility
                </div>
                <div style={{ fontSize: '1.5rem', color: colors.textPrimary, fontVariantNumeric: 'tabular-nums' }}>
                  {conditions.visibilityKm.toFixed(0)} km
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.6875rem', color: colors.textMuted, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                  Limiting Mag
                </div>
                <div style={{ fontSize: '1.5rem', color: colors.accentGold, fontVariantNumeric: 'tabular-nums' }}>
                  {conditions.limitingMagnitude.toFixed(1)}
                </div>
              </div>
            </div>

            {limitingMagLabel && (
              <p style={{ color: colors.textSecondary, fontSize: '0.9375rem', margin: 0 }}>
                {limitingMagLabel}
              </p>
            )}
          </motion.div>
        ) : null}

        {/* Attribution — required by CC BY 4.0 */}
        <p
          style={{
            marginTop: '1.5rem',
            fontSize: '0.75rem',
            color: colors.textMuted,
            fontStyle: 'italic',
          }}
        >
          {ATTRIBUTION_OPEN_METEO}
        </p>
      </div>
    </section>
  );
}
