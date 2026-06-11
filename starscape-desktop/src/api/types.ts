// ---------------------------------------------------------------------------
// StarScape — shared TypeScript interfaces
// Adapted from ConstellationMap (React Native) — rendering refs removed,
// MMKV replaced with localStorage, device orientation removed.
// ---------------------------------------------------------------------------

// ---- JPL Horizons ---------------------------------------------------------

export interface HorizonsResult {
  body: string;
  bodyCode: string;
  /** Right Ascension in decimal degrees (0–360) */
  raDeg: number;
  /** Declination in decimal degrees (-90 to +90) */
  decDeg: number;
  /** Visual magnitude */
  magnitude: number;
  epochUtc: string;
}

// ---- Hipparcos star record (bundled static JSON) --------------------------

export interface HipparcosStarRecord {
  hip: number;
  /** Right Ascension J2000, degrees */
  raDeg: number;
  /** Declination J2000, degrees */
  decDeg: number;
  /** Johnson V magnitude */
  vmag: number;
  /** B-V colour index — used to tint star colour in Three.js */
  bv?: number;
  bayer?: string;
  commonName?: string;
}

// ---- IAU Constellation ----------------------------------------------------

export interface ConstellationDefinition {
  abbr: string;
  name: string;
  genitive: string;
  stickFigure: number[][];
  labelRaDeg: number;
  labelDecDeg: number;
  /** Short mythology paragraph — original text or Wikipedia CC-BY-SA with attribution */
  mythology?: string;
}

// ---- Open Meteo -----------------------------------------------------------

export interface OpenMeteoResponse {
  latitude: number;
  longitude: number;
  elevation: number;
  current_weather?: {
    temperature: number;
    windspeed: number;
    weathercode: number;
    time: string;
  };
  hourly?: {
    time: string[];
    cloudcover: number[];
    visibility: number[];
  };
}

export interface SkyConditions {
  cloudCoverPercent: number;
  visibilityKm: number;
  limitingMagnitude: number;
  fetchedAt: number;
}

// ---- Observer location (from browser Geolocation API) --------------------

export interface ObserverLocation {
  latitude: number;
  longitude: number;
  altitude?: number;
  acquiredAt: number;
}

// ---- Sky coordinate (equatorial J2000) ------------------------------------

export interface EquatorialCoord {
  raDeg: number;
  decDeg: number;
}

// ---- Generic API result wrapper -------------------------------------------

export type ApiResult<T> =
  | { ok: true; data: T; fromCache: boolean }
  | { ok: false; error: string; fromCache: false };

// ---- Three.js star point (pre-computed for GPU upload) --------------------

export interface StarPoint {
  /** 3D position on the star sphere */
  x: number;
  y: number;
  z: number;
  /** Point size (pre-scaled from vmag) */
  size: number;
  /** RGB colour components [0..1] derived from B-V */
  r: number;
  g: number;
  b: number;
  /** Original record — for tooltip lookup */
  record: HipparcosStarRecord;
}

// ---- Planet card (for the planet tracker UI) ------------------------------

export interface PlanetCard {
  name: string;
  bodyCode: string;
  raDeg: number;
  decDeg: number;
  magnitude: number;
  /** 3D position on the star sphere (same coordinate space as stars) */
  x: number;
  y: number;
  z: number;
  /** Approximate angular diameter in arcseconds — for planet icon sizing */
  angularDiameterArcsec?: number;
}
