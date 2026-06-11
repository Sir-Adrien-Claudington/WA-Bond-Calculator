// ---------------------------------------------------------------------------
// StarScape — Hipparcos star catalogue loader
// ---------------------------------------------------------------------------
// Licence: ESA Hipparcos Catalogue (1997) — public domain
// Attribution: "Star data: ESA Hipparcos Catalogue (1997), public domain"
// Source: bundled at assets/data/hipparcos_bright.json (187 bright stars)
// No network request. Loaded once at startup via static import.
// ---------------------------------------------------------------------------

import type { HipparcosStarRecord, ApiResult, StarPoint } from './types';
import { MAGNITUDE_LIMIT, DEG_TO_RAD, STAR_SPHERE_RADIUS, STAR_BASE_SIZE, STAR_SIZE_SCALE } from '@constants/config';

// Static import — Vite bundles this JSON into the chunk at build time
import rawStars from '../../assets/data/hipparcos_bright.json';

// ---------------------------------------------------------------------------
// Module-level in-memory singletons (computed once)
// ---------------------------------------------------------------------------
let _stars: HipparcosStarRecord[] | null = null;
let _starPoints: StarPoint[] | null = null;

function getAllStars(): HipparcosStarRecord[] {
  if (_stars) return _stars;
  _stars = (rawStars as HipparcosStarRecord[]).filter(
    (s) => s.vmag <= MAGNITUDE_LIMIT
  );
  return _stars;
}

// ---------------------------------------------------------------------------
// B-V colour index → approximate RGB [0..1]
// Mapping follows standard stellar spectral class colours.
// ---------------------------------------------------------------------------
function bvToRgb(bv: number): [number, number, number] {
  if (bv < 0) return [0.792, 0.878, 1.0];       // O/B — blue-white
  if (bv < 0.3) return [1.0, 1.0, 1.0];          // A/F — white
  if (bv < 0.8) return [1.0, 0.965, 0.835];      // G — warm white/yellow
  if (bv < 1.4) return [1.0, 0.8, 0.6];          // K — orange
  return [1.0, 0.6, 0.4];                         // M — red-orange
}

// ---------------------------------------------------------------------------
// Convert RA/Dec to 3D Cartesian on a sphere of STAR_SPHERE_RADIUS
// Convention: +Z = north celestial pole, +X = RA 0h
// ---------------------------------------------------------------------------
function equatorialToCartesian(
  raDeg: number,
  decDeg: number,
  radius: number
): [number, number, number] {
  const ra = raDeg * DEG_TO_RAD;
  const dec = decDeg * DEG_TO_RAD;
  const x = radius * Math.cos(dec) * Math.cos(ra);
  const y = radius * Math.sin(dec);           // up = north pole
  const z = -radius * Math.cos(dec) * Math.sin(ra);  // right-hand, -Z = RA 90°
  return [x, y, z];
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Return all star records within the magnitude limit.
 * Synchronous — data is bundled.
 */
export function getStars(): ApiResult<HipparcosStarRecord[]> {
  try {
    return { ok: true, data: getAllStars(), fromCache: false };
  } catch (err) {
    return {
      ok: false,
      error: `Failed to load Hipparcos data: ${String(err)}`,
      fromCache: false,
    };
  }
}

/**
 * Return pre-computed StarPoint array suitable for a Three.js Points geometry.
 * Computed once and cached in-process.
 */
export function getStarPoints(): StarPoint[] {
  if (_starPoints) return _starPoints;

  const stars = getAllStars();
  _starPoints = stars.map((s) => {
    const [x, y, z] = equatorialToCartesian(s.raDeg, s.decDeg, STAR_SPHERE_RADIUS);
    // Brighter stars (lower vmag) get a larger point size
    const size = STAR_BASE_SIZE + Math.max(0, (3.0 - s.vmag)) * STAR_SIZE_SCALE;
    const [r, g, b] = bvToRgb(s.bv ?? 0.4);
    return { x, y, z, size, r, g, b, record: s };
  });

  return _starPoints;
}

/**
 * Look up a single star by Hipparcos catalogue number.
 */
export function getStarByHip(hip: number): HipparcosStarRecord | null {
  return getAllStars().find((s) => s.hip === hip) ?? null;
}

/**
 * Return stars with a known common name (e.g. "Betelgeuse", "Sirius").
 */
export function getNamedStars(): HipparcosStarRecord[] {
  return getAllStars().filter((s) => Boolean(s.commonName));
}
