// ---------------------------------------------------------------------------
// StarScape — app-wide constants and configuration
// ---------------------------------------------------------------------------

export const APP_NAME = 'StarScape';
export const APP_VERSION = '1.0.0';

// Cache TTLs (milliseconds)
export const CACHE_TTL = {
  PLANETS: 10 * 60 * 1000,   // 10 min — ephemeris changes slowly
  WEATHER: 30 * 60 * 1000,   // 30 min
  LOCATION: 5 * 60 * 1000,   // 5 min
} as const;

// Star magnitude filter — show all 187 bright stars in the free tier (no paywall on web)
export const MAGNITUDE_LIMIT = 6.5;

// Coordinate system constants
export const DEG_TO_RAD = Math.PI / 180;
export const RAD_TO_DEG = 180 / Math.PI;

// ---------------------------------------------------------------------------
// Attribution strings — required by licences
// Open Meteo: CC-BY 4.0 — MUST appear in About / footer
// ---------------------------------------------------------------------------
export const ATTRIBUTION_OPEN_METEO =
  'Weather data by Open Meteo (open-meteo.com), licensed under CC BY 4.0';
export const ATTRIBUTION_HIPPARCOS =
  'Star data: ESA Hipparcos Catalogue (1997), public domain';
export const ATTRIBUTION_JPL =
  'Planet ephemeris: JPL Horizons (NASA/JPL-Caltech), public domain';
export const ATTRIBUTION_IAU =
  'Constellation definitions: International Astronomical Union (iau.org)';

// ---------------------------------------------------------------------------
// Three.js / WebGL tuning
// ---------------------------------------------------------------------------
export const STAR_SPHERE_RADIUS = 500;     // radius of the star-sphere (world units)
export const CAMERA_FOV = 60;
export const STAR_BASE_SIZE = 0.8;         // base point size for magnitude 0 star
export const STAR_SIZE_SCALE = 0.5;        // additional size per magnitude unit (brighter = bigger)
