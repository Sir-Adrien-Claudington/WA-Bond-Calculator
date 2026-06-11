// ---------------------------------------------------------------------------
// StarScape — Netlify Edge Function: JPL Horizons CORS proxy
// ---------------------------------------------------------------------------
// Runs server-side at /.netlify/functions/horizons-proxy
// Proxies requests to ssd.jpl.nasa.gov/horizons_batch.cgi, which does not
// send CORS headers, and returns results with permissive CORS headers.
//
// Query params accepted: lat, lon, epoch (UTC string "YYYY-MM-DD HH:MM")
//
// Data: US federal government work — public domain (17 U.S.C. § 105)
// ---------------------------------------------------------------------------

import type { Handler } from '@netlify/functions';

const HORIZONS_BASE = 'https://ssd.jpl.nasa.gov/horizons_batch.cgi';

// Set ALLOWED_ORIGIN in Netlify env vars to your production domain
// (e.g. "https://starscape-desktop.netlify.app"). Unset = allow all (local dev).
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN ?? null;

const BODIES: { code: string; name: string }[] = [
  { code: '199', name: 'Mercury' },
  { code: '299', name: 'Venus' },
  { code: '499', name: 'Mars' },
  { code: '599', name: 'Jupiter' },
  { code: '699', name: 'Saturn' },
  { code: '301', name: 'Moon' },
];

function buildCorsHeaders(requestOrigin?: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN ?? requestOrigin ?? '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };
}

function buildQuery(
  bodyCode: string,
  lat: number,
  lon: number,
  epoch: string
): string {
  // Add 1 minute to epoch for the stop time window
  const epochMs = new Date(epoch.replace(' ', 'T') + ':00Z').getTime();
  const stopEpoch = new Date(epochMs + 60_000).toISOString().slice(0, 16).replace('T', ' ');
  const params = new URLSearchParams({
    batch: '1',
    COMMAND: `'${bodyCode}'`,
    OBJ_DATA: "'NO'",
    MAKE_EPHEM: "'YES'",
    TABLE_TYPE: "'OBSERVER'",
    CENTER: "'coord@399'",
    COORD_TYPE: "'GEODETIC'",
    SITE_COORD: `'${lon.toFixed(4)},${lat.toFixed(4)},0'`,
    START_TIME: `'${epoch}'`,
    STOP_TIME: `'${stopEpoch}'`,
    STEP_SIZE: "'1 m'",
    QUANTITIES: "'1,9'",
    CSV_FORMAT: "'YES'",
  });
  return `${HORIZONS_BASE}?${params.toString()}`;
}

function parseHorizons(
  text: string,
  bodyCode: string,
  bodyName: string,
  epoch: string
): object | null {
  const soeIdx = text.indexOf('$$SOE');
  const eoeIdx = text.indexOf('$$EOE');
  if (soeIdx === -1 || eoeIdx === -1) return null;

  const block = text.slice(soeIdx + 5, eoeIdx).trim();
  const lines = block.split('\n').filter((l) => l.trim().length > 0);
  if (lines.length === 0) return null;

  const cols = lines[0].split(',');
  if (cols.length < 6) return null;

  const raDeg = parseFloat(cols[3].trim()) * (360 / 24);
  const decDeg = parseFloat(cols[4].trim());
  const magnitude = parseFloat(cols[5].trim());

  if (isNaN(raDeg) || isNaN(decDeg)) return null;

  return { body: bodyName, bodyCode, raDeg, decDeg, magnitude, epochUtc: epoch };
}

export const handler: Handler = async (event) => {
  const requestOrigin = event.headers['origin'];
  const cors = buildCorsHeaders(requestOrigin);

  // Block requests from unknown origins when ALLOWED_ORIGIN is set
  if (ALLOWED_ORIGIN && requestOrigin && requestOrigin !== ALLOWED_ORIGIN) {
    return {
      statusCode: 403,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Forbidden' }),
    };
  }

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: cors, body: '' };
  }

  const { lat, lon, epoch } = event.queryStringParameters ?? {};

  if (!lat || !lon || !epoch) {
    return {
      statusCode: 400,
      headers: cors,
      body: JSON.stringify({ error: 'lat, lon, and epoch are required' }),
    };
  }

  const latNum = parseFloat(lat);
  const lonNum = parseFloat(lon);

  if (isNaN(latNum) || isNaN(lonNum)) {
    return {
      statusCode: 400,
      headers: cors,
      body: JSON.stringify({ error: 'lat and lon must be numbers' }),
    };
  }

  const settled = await Promise.allSettled(
    BODIES.map(async (body) => {
      const url = buildQuery(body.code, latNum, lonNum, epoch);
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const text = await response.text();
      return parseHorizons(text, body.code, body.name, epoch);
    })
  );

  const results: object[] = settled
    .filter((r): r is PromiseFulfilledResult<object> => r.status === 'fulfilled' && r.value !== null)
    .map((r) => r.value);

  if (results.length === 0) {
    return {
      statusCode: 502,
      headers: cors,
      body: JSON.stringify({ error: 'All Horizons requests failed' }),
    };
  }

  return {
    statusCode: 200,
    headers: {
      ...cors,
      'Cache-Control': 'public, max-age=600', // 10 min — matches client TTL
    },
    body: JSON.stringify(results),
  };
};
