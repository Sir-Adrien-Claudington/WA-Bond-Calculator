// ---------------------------------------------------------------------------
// StarScape — API endpoint constants
// ---------------------------------------------------------------------------

export const Endpoints = {
  // Open Meteo — browser-safe, CORS enabled, CC BY 4.0, no key required
  OPEN_METEO_FORECAST: 'https://api.open-meteo.com/v1/forecast',

  // JPL Horizons CORS proxy — Netlify Edge Function proxies the request
  // server-side to avoid browser CORS restrictions on ssd.jpl.nasa.gov
  HORIZONS_PROXY: '/.netlify/functions/horizons-proxy',

  // Fallback: precomputed ephemeris bundled at build time
  HORIZONS_FALLBACK: '/data/ephemeris-fallback.json',
} as const;

// JPL Horizons target body codes (NAIF IDs)
export const HorizonsBodyCode = {
  MERCURY: '199',
  VENUS: '299',
  MARS: '499',
  JUPITER: '599',
  SATURN: '699',
  MOON: '301',
} as const;

export type HorizonsBodyKey = keyof typeof HorizonsBodyCode;
