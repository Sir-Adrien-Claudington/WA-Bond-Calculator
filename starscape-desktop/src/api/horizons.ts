// ---------------------------------------------------------------------------
// StarScape — JPL Horizons planet ephemeris
// ---------------------------------------------------------------------------
// Licence: US Federal Government work — public domain (17 U.S.C. § 105)
// Attribution: "Planet ephemeris: JPL Horizons (NASA/JPL-Caltech), public domain"
//
// CORS NOTE: ssd.jpl.nasa.gov does NOT send Access-Control-Allow-Origin headers.
// Direct browser fetch is blocked. This module calls the Netlify Edge Function
// at /.netlify/functions/horizons-proxy which proxies the request server-side.
//
// In local dev (npm run dev), the proxy is unavailable. The module falls back
// to the bundled ephemeris snapshot at /data/ephemeris-fallback.json.
// To regenerate the fallback: node scripts/generate-ephemeris-fallback.js
// ---------------------------------------------------------------------------

import { CACHE_TTL, DEG_TO_RAD, STAR_SPHERE_RADIUS } from '@constants/config';
import { Endpoints, HorizonsBodyCode, HorizonsBodyKey } from '@constants/endpoints';
import { cacheGet, cacheSet, CacheKeys } from './cache';
import type { HorizonsResult, PlanetCard, ApiResult } from './types';

// ---------------------------------------------------------------------------
// Helpers — same parse logic as mobile version (parse happens after proxy)
// ---------------------------------------------------------------------------

/**
 * Parse Horizons CSV response text. The data block is between $$SOE / $$EOE.
 */
function parseHorizonsResponse(
  text: string,
  bodyCode: string,
  bodyName: string,
  epochUtc: string
): HorizonsResult | null {
  const soeIdx = text.indexOf('$$SOE');
  const eoeIdx = text.indexOf('$$EOE');
  if (soeIdx === -1 || eoeIdx === -1) return null;

  const dataBlock = text.slice(soeIdx + 5, eoeIdx).trim();
  const lines = dataBlock.split('\n').filter((l) => l.trim().length > 0);
  if (lines.length === 0) return null;

  const cols = lines[0].split(',');
  if (cols.length < 6) return null;

  const raHours = parseFloat(cols[3].trim());
  const raDeg = raHours * (360 / 24);
  const decDeg = parseFloat(cols[4].trim());
  const magnitude = parseFloat(cols[5].trim());

  if (isNaN(raDeg) || isNaN(decDeg)) return null;

  return { body: bodyName, bodyCode, raDeg, decDeg, magnitude, epochUtc };
}

/**
 * Convert a HorizonsResult to a PlanetCard (adds 3D position on star sphere).
 */
function toPlanetCard(result: HorizonsResult): PlanetCard {
  const ra = result.raDeg * DEG_TO_RAD;
  const dec = result.decDeg * DEG_TO_RAD;
  // Place planets slightly inside the star sphere so they don't z-fight
  const r = STAR_SPHERE_RADIUS * 0.9;
  const x = r * Math.cos(dec) * Math.cos(ra);
  const y = r * Math.sin(dec);
  const z = -r * Math.cos(dec) * Math.sin(ra);
  return {
    name: result.body,
    bodyCode: result.bodyCode,
    raDeg: result.raDeg,
    decDeg: result.decDeg,
    magnitude: result.magnitude,
    x,
    y,
    z,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetch current planet positions via the Netlify proxy.
 * On failure (or during local dev), falls back to the bundled snapshot.
 * Results cached for 10 minutes.
 */
export async function fetchPlanetPositions(
  lat: number,
  lon: number
): Promise<ApiResult<PlanetCard[]>> {
  const epochDate = new Date().toISOString().slice(0, 16).replace('T', ' ');
  const key = CacheKeys.planets(epochDate.slice(0, 13)); // hourly bucket

  const cached = cacheGet<PlanetCard[]>(key);
  if (cached) {
    return { ok: true, data: cached, fromCache: true };
  }

  const bodies: { key: HorizonsBodyKey; name: string }[] = [
    { key: 'MERCURY', name: 'Mercury' },
    { key: 'VENUS', name: 'Venus' },
    { key: 'MARS', name: 'Mars' },
    { key: 'JUPITER', name: 'Jupiter' },
    { key: 'SATURN', name: 'Saturn' },
    { key: 'MOON', name: 'Moon' },
  ];

  // Try proxy first
  try {
    const proxyUrl = `${Endpoints.HORIZONS_PROXY}?lat=${lat}&lon=${lon}&epoch=${encodeURIComponent(epochDate)}`;
    const proxyResponse = await fetch(proxyUrl);

    if (proxyResponse.ok) {
      const proxyData = (await proxyResponse.json()) as HorizonsResult[];
      const cards = proxyData.map(toPlanetCard);
      cacheSet(key, cards, CACHE_TTL.PLANETS);
      return { ok: true, data: cards, fromCache: false };
    }
  } catch {
    // Proxy unavailable — fall through to fallback
  }

  // Fallback: bundled ephemeris snapshot
  try {
    const fallbackResponse = await fetch(Endpoints.HORIZONS_FALLBACK);
    if (fallbackResponse.ok) {
      const fallback = (await fallbackResponse.json()) as HorizonsResult[];
      const cards = fallback.map(toPlanetCard);
      // Don't cache the fallback — try fresh data next time
      return { ok: true, data: cards, fromCache: true };
    }
  } catch {
    // Fallback also unavailable
  }

  // Last resort: fetch each body directly — will only succeed in server-side or
  // CORS-permissive environments (Netlify functions, Node scripts)
  const results: HorizonsResult[] = [];

  for (const body of bodies) {
    try {
      const params = new URLSearchParams({
        batch: '1',
        COMMAND: `'${HorizonsBodyCode[body.key]}'`,
        OBJ_DATA: "'NO'",
        MAKE_EPHEM: "'YES'",
        TABLE_TYPE: "'OBSERVER'",
        CENTER: "'coord@399'",
        COORD_TYPE: "'GEODETIC'",
        SITE_COORD: `'${lon.toFixed(4)},${lat.toFixed(4)},0'`,
        START_TIME: `'${epochDate}'`,
        STOP_TIME: `'${epochDate} 00:01'`,
        STEP_SIZE: "'1 m'",
        QUANTITIES: "'1,9'",
        CSV_FORMAT: "'YES'",
        CAL_FORMAT: "'ISO'",
      });
      const url = `https://ssd.jpl.nasa.gov/horizons_batch.cgi?${params.toString()}`;
      const response = await fetch(url);
      if (response.ok) {
        const text = await response.text();
        const parsed = parseHorizonsResponse(
          text,
          HorizonsBodyCode[body.key],
          body.name,
          epochDate
        );
        if (parsed) results.push(parsed);
      }
    } catch {
      // Individual body failure — skip, continue with others
    }
  }

  if (results.length > 0) {
    const cards = results.map(toPlanetCard);
    cacheSet(key, cards, CACHE_TTL.PLANETS);
    return { ok: true, data: cards, fromCache: false };
  }

  return {
    ok: false,
    error:
      'Planet positions unavailable: proxy unreachable and fallback not found. ' +
      'Deploy to Netlify or run the generate-ephemeris-fallback script.',
    fromCache: false,
  };
}
