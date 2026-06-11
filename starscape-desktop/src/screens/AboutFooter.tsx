// ---------------------------------------------------------------------------
// StarScape — About / Footer section
// ---------------------------------------------------------------------------
// IMPORTANT: All required attribution strings MUST appear here.
// Open Meteo: CC BY 4.0 — legally required
// Hipparcos: public domain — recommended
// JPL Horizons: public domain — recommended
// ---------------------------------------------------------------------------

import {
  ATTRIBUTION_HIPPARCOS,
  ATTRIBUTION_JPL,
  ATTRIBUTION_OPEN_METEO,
  ATTRIBUTION_IAU,
  APP_VERSION,
} from '@constants/config';
import { colors } from '@constants/theme';

export function AboutFooter() {
  return (
    <footer
      style={{
        background: '#000814',
        borderTop: `1px solid ${colors.constellationLine}`,
        padding: '4rem 2rem 2rem',
        color: colors.textMuted,
        fontSize: '0.8125rem',
      }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '2rem',
            marginBottom: '3rem',
          }}
        >
          {/* About */}
          <div>
            <h3
              style={{
                fontSize: '0.75rem',
                letterSpacing: '0.25em',
                textTransform: 'uppercase',
                color: colors.textSecondary,
                marginBottom: '0.75rem',
              }}
            >
              About StarScape
            </h3>
            <p style={{ lineHeight: 1.6, margin: 0 }}>
              An immersive desktop journey through the night sky. Built with
              Three.js, GSAP, and public-domain astronomical data. v{APP_VERSION}.
            </p>
          </div>

          {/* Data sources — attribution section */}
          <div>
            <h3
              style={{
                fontSize: '0.75rem',
                letterSpacing: '0.25em',
                textTransform: 'uppercase',
                color: colors.textSecondary,
                marginBottom: '0.75rem',
              }}
            >
              Data Attribution
            </h3>
            <ul
              style={{
                margin: 0,
                padding: 0,
                listStyle: 'none',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                lineHeight: 1.5,
              }}
            >
              {/* CC BY 4.0 — legally required */}
              <li style={{ color: colors.textSecondary }}>{ATTRIBUTION_OPEN_METEO}</li>
              <li>{ATTRIBUTION_HIPPARCOS}</li>
              <li>{ATTRIBUTION_JPL}</li>
              <li>{ATTRIBUTION_IAU}</li>
              <li>
                Mythology text: original writing and{' '}
                <a
                  href="https://en.wikipedia.org/wiki/Wikipedia:Copyrights"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: colors.accentBlue }}
                >
                  Wikipedia CC BY-SA 4.0
                </a>{' '}
                (where noted per card)
              </li>
            </ul>
          </div>

          {/* Technology */}
          <div>
            <h3
              style={{
                fontSize: '0.75rem',
                letterSpacing: '0.25em',
                textTransform: 'uppercase',
                color: colors.textSecondary,
                marginBottom: '0.75rem',
              }}
            >
              Technology
            </h3>
            <ul
              style={{
                margin: 0,
                padding: 0,
                listStyle: 'none',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem',
              }}
            >
              <li>Three.js r165 — MIT licence</li>
              <li>GSAP 3 + ScrollTrigger — Standard No Charge licence</li>
              <li>Framer Motion — MIT licence</li>
              <li>React 18 + Vite — MIT licence</li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          style={{
            borderTop: `1px solid ${colors.constellationLine}`,
            paddingTop: '1.5rem',
            textAlign: 'center',
          }}
        >
          <p style={{ margin: 0 }}>
            StarScape — no personal data collected, no cookies, no tracking.{' '}
            <a
              href="/privacy"
              style={{ color: colors.accentBlue }}
            >
              Privacy Policy
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
