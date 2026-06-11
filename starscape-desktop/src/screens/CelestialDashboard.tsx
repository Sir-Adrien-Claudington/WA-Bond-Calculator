// ---------------------------------------------------------------------------
// StarScape — Celestial Dashboard
// ---------------------------------------------------------------------------
// Real-time positions, rise/set times, and current data for all planets and
// the Moon — computed locally via astronomy-engine (no network requests).
// Default observer: Perth WA. Coordinates editable.
// ---------------------------------------------------------------------------

import { useState } from 'react';
import { useCelestialData } from '@hooks/useCelestialData';

const BODY_TYPE: Record<string, string> = {
  Mercury: 'Terrestrial',
  Venus: 'Terrestrial',
  Mars: 'Terrestrial',
  Jupiter: 'Gas Giant',
  Saturn: 'Gas Giant',
  Uranus: 'Ice Giant',
  Neptune: 'Ice Giant',
  Moon: 'Natural Satellite',
};

const COMPASS = [
  'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
  'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW',
];

function compassDir(azimuth: number): string {
  return COMPASS[Math.round(azimuth / 22.5) % 16];
}

function fmtTime(d: Date | null): string {
  if (!d) return '—';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const mono: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace" };

export function CelestialDashboard() {
  const [lat, setLat] = useState(-31.9505); // Perth WA default
  const [lng, setLng] = useState(115.8605);
  const { bodies, updatedAt } = useCelestialData(lat, lng);

  const entries = Object.values(bodies);

  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#050714',
        color: '#FFF8E7',
        padding: '76px 2rem 4rem',
      }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <h1
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 700,
            fontSize: 'clamp(1.5rem, 3vw, 2.25rem)',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            marginBottom: '0.5rem',
          }}
        >
          Celestial Dashboard
        </h1>
        <p style={{ color: 'rgba(255,248,231,0.65)', marginBottom: '2rem', fontSize: '0.9375rem' }}>
          Live positions computed locally with astronomy-engine — refreshed every minute.
        </p>

        {/* Observer coordinates */}
        <div
          style={{
            display: 'flex',
            gap: '1rem',
            alignItems: 'center',
            flexWrap: 'wrap',
            marginBottom: '2.5rem',
            ...mono,
            fontSize: '0.8125rem',
          }}
        >
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: 'rgba(255,248,231,0.6)', textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.6875rem' }}>
              Lat
            </span>
            <input
              type="number"
              value={lat}
              step="0.0001"
              min={-90}
              max={90}
              onChange={(e) => setLat(Number(e.target.value))}
              style={{
                background: 'rgba(6,10,28,0.88)',
                border: '1px solid rgba(0,191,165,0.32)',
                borderRadius: 6,
                color: '#FFF8E7',
                padding: '0.4rem 0.6rem',
                width: 110,
                ...mono,
                fontSize: '0.8125rem',
              }}
            />
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: 'rgba(255,248,231,0.6)', textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.6875rem' }}>
              Lng
            </span>
            <input
              type="number"
              value={lng}
              step="0.0001"
              min={-180}
              max={180}
              onChange={(e) => setLng(Number(e.target.value))}
              style={{
                background: 'rgba(6,10,28,0.88)',
                border: '1px solid rgba(0,191,165,0.32)',
                borderRadius: 6,
                color: '#FFF8E7',
                padding: '0.4rem 0.6rem',
                width: 110,
                ...mono,
                fontSize: '0.8125rem',
              }}
            />
          </label>
          {updatedAt && (
            <span style={{ color: 'rgba(255,248,231,0.58)', fontSize: '0.6875rem' }}>
              UPDATED {updatedAt.toLocaleTimeString()}
            </span>
          )}
        </div>

        {/* Body cards — fixed-height skeletons reserve space before data
            arrives so the grid populating causes zero layout shift */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '1.25rem',
          }}
        >
          {entries.length === 0 &&
            Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                aria-hidden="true"
                style={{
                  minHeight: 252,
                  background: 'rgba(6,10,28,0.88)',
                  border: '1px solid rgba(0,191,165,0.18)',
                  borderRadius: 12,
                }}
              />
            ))}
          {entries.map((b) => (
            <div
              key={b.name}
              style={{
                background: 'rgba(6,10,28,0.88)',
                border: `1px solid ${b.visible ? 'rgba(0,191,165,0.5)' : 'rgba(0,191,165,0.18)'}`,
                borderRadius: 12,
                padding: '1.5rem',
              }}
              role="article"
              aria-label={`${b.name} current position`}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.25rem' }}>
                <span
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontWeight: 700,
                    fontSize: '1.25rem',
                  }}
                >
                  {b.name}
                </span>
                {b.visible && (
                  <span style={{ ...mono, fontSize: '0.625rem', color: '#00BFA5', letterSpacing: '0.15em' }}>
                    ● ABOVE HORIZON
                  </span>
                )}
              </div>
              <div style={{ ...mono, fontSize: '0.625rem', color: 'rgba(255,248,231,0.58)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>
                {BODY_TYPE[b.name] ?? 'Body'}
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '0.75rem',
                  borderTop: '1px solid rgba(255,255,255,0.07)',
                  paddingTop: '0.875rem',
                }}
              >
                <div>
                  <div style={{ ...mono, fontSize: '0.5625rem', color: 'rgba(255,248,231,0.58)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    Altitude
                  </div>
                  <div style={{ ...mono, fontSize: '0.875rem', color: b.visible ? '#00BFA5' : '#FFF8E7' }}>
                    {b.altitude.toFixed(1)}°
                  </div>
                </div>
                <div>
                  <div style={{ ...mono, fontSize: '0.5625rem', color: 'rgba(255,248,231,0.58)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    Azimuth
                  </div>
                  <div style={{ ...mono, fontSize: '0.875rem' }}>
                    {b.azimuth.toFixed(0)}° {compassDir(b.azimuth)}
                  </div>
                </div>
                <div>
                  <div style={{ ...mono, fontSize: '0.5625rem', color: 'rgba(255,248,231,0.58)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    Distance
                  </div>
                  <div style={{ ...mono, fontSize: '0.875rem' }}>{b.distance.toFixed(3)} AU</div>
                </div>
                <div>
                  <div style={{ ...mono, fontSize: '0.5625rem', color: 'rgba(255,248,231,0.58)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    Illumination
                  </div>
                  <div style={{ ...mono, fontSize: '0.875rem' }}>
                    {(b.illumination * 100).toFixed(0)}%
                  </div>
                </div>
                <div>
                  <div style={{ ...mono, fontSize: '0.5625rem', color: 'rgba(255,248,231,0.58)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    Rise
                  </div>
                  <div style={{ ...mono, fontSize: '0.875rem' }}>{fmtTime(b.riseTime)}</div>
                </div>
                <div>
                  <div style={{ ...mono, fontSize: '0.5625rem', color: 'rgba(255,248,231,0.58)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    Set
                  </div>
                  <div style={{ ...mono, fontSize: '0.875rem' }}>{fmtTime(b.setTime)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <p style={{ ...mono, fontSize: '0.6875rem', color: 'rgba(255,248,231,0.58)', marginTop: '2.5rem', textAlign: 'center' }}>
          Ephemeris: astronomy-engine (MIT) — VSOP87 / NOVAS models, computed in your browser
        </p>
      </div>
    </main>
  );
}
