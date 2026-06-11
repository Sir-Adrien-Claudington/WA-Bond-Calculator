// ---------------------------------------------------------------------------
// StarScape — Privacy Policy screen (/privacy)
// ---------------------------------------------------------------------------

import { colors, fonts } from '@constants/theme';

export function PrivacyPolicy() {
  return (
    <div
      style={{
        background: colors.bgDeepest,
        color: colors.textPrimary,
        fontFamily: fonts.body,
        minHeight: '100vh',
        padding: '4rem 2rem',
      }}
    >
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        {/* Back link */}
        <a
          href="/"
          style={{
            color: colors.accentBlue,
            textDecoration: 'none',
            fontSize: '0.875rem',
            letterSpacing: '0.05em',
            display: 'inline-block',
            marginBottom: '2.5rem',
          }}
        >
          ← Back to StarScape
        </a>

        <h1
          style={{
            fontSize: '2rem',
            fontWeight: 700,
            color: colors.textPrimary,
            marginBottom: '0.5rem',
          }}
        >
          Privacy Policy
        </h1>
        <p style={{ color: colors.textMuted, marginBottom: '3rem', fontSize: '0.875rem' }}>
          Last updated: June 2026
        </p>

        <Section title="Overview">
          StarScape is a browser-based astronomy app. We do not collect, store, or
          share any personal data. There are no user accounts, no cookies, and no
          third-party analytics or tracking scripts.
        </Section>

        <Section title="Location Data">
          If you grant location permission, your browser provides approximate
          coordinates (latitude and longitude) to two external services:
          <ul style={{ marginTop: '0.75rem', paddingLeft: '1.25rem', lineHeight: 1.8 }}>
            <li>
              <strong style={{ color: colors.textSecondary }}>Open Meteo</strong> —
              to fetch local sky conditions (cloud cover, visibility). Open Meteo
              operates under CC&nbsp;BY&nbsp;4.0 and does not retain individual requests.
            </li>
            <li>
              <strong style={{ color: colors.textSecondary }}>JPL Horizons (NASA)</strong> —
              to calculate planet positions for your viewing location. This is a
              US federal government API; requests are not stored by NASA.
            </li>
          </ul>
          <p style={{ marginTop: '0.75rem' }}>
            Coordinates are sent only when you use the planet tracker or sky
            conditions widget. They are never stored by StarScape.
          </p>
        </Section>

        <Section title="Caching">
          StarScape caches API responses in your browser's{' '}
          <code style={{ color: colors.accentBlue }}>localStorage</code> for up to
          10 minutes to avoid redundant requests. This data (weather and planet
          positions) stays on your device and is not transmitted anywhere else.
          You can clear it at any time through your browser's developer tools.
        </Section>

        <Section title="No Cookies, No Tracking">
          StarScape sets no cookies. It does not use Google Analytics, Facebook
          Pixel, Hotjar, Mixpanel, or any other tracking service.
        </Section>

        <Section title="Third-Party Libraries">
          The app uses Three.js, GSAP, and Framer Motion. These run entirely
          in your browser and make no network requests of their own.
        </Section>

        <Section title="Contact">
          Questions? Reach out via the project's GitHub repository.
        </Section>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section style={{ marginBottom: '2.5rem' }}>
      <h2
        style={{
          fontSize: '1rem',
          fontWeight: 600,
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          color: colors.textSecondary,
          marginBottom: '0.75rem',
        }}
      >
        {title}
      </h2>
      <div style={{ lineHeight: 1.75, color: colors.textPrimary }}>{children}</div>
    </section>
  );
}
