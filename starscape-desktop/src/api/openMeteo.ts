// ---------------------------------------------------------------------------
// StarScape — Open Meteo API integration
// ---------------------------------------------------------------------------
// Licence: CC BY 4.0 — attribution MUST appear in About / footer.
// Attribution: "Weather data by Open Meteo (open-meteo.com), licensed under CC BY 4.0"
// Endpoint: https://api.open-meteo.com/v1/forecast
// No API key required. CORS-enabled — works directly in browser.
// Ported from ConstellationMap (React Native) — MMKV replaced with localStorage cache.
// ---------------------------------------------------------------------------

import { CACHE_TTL } from '@constants/config';
import { Endpoints } from '@constants/endpoints';
import { cacheGet, cacheSet, CacheKeys } from './cache';
import type { OpenMeteoResponse, SkyConditions, ApiResult } from './types';

// ---------------------------------------------------------------------------
// Helpers (unchanged from mobile version)
// ---------------------------------------------------------------------------

function deriveLimitingMagnitude(cloudCoverPercent: number): number {
  if (cloudCoverPercent >= 80) return 2.0;
  if (cloudCoverPercent >= 50) return 3.5;
  if (cloudCoverPercent >= 20) return 5.0;
  return 6.5;
}

function buildOpenMeteoUrl(lat: number, lon: number): string {
  const params = new URLSearchParams({
    latitude: lat.toFixed(4),
    longitude: lon.toFixed(4),
    hourly: 'cloudcover,visibility',
    current_weather: 'true',
    forecast_days: '1',
    timezone: 'auto',
  });
  return `${Endpoints.OPEN_METEO_FORECAST}?${params.toString()}`;
}

function extractCurrentHour(response: OpenMeteoResponse): {
  cloudCoverPercent: number;
  visibilityKm: number;
} {
  if (!response.hourly) {
    return { cloudCoverPercent: 0, visibilityKm: 10 };
  }
  const now = Date.now();
  const times = response.hourly.time;
  let closestIdx = 0;
  let minDiff = Infinity;
  for (let i = 0; i < times.length; i++) {
    const diff = Math.abs(new Date(times[i]).getTime() - now);
    if (diff < minDiff) {
      minDiff = diff;
      closestIdx = i;
    }
  }
  const cloudCoverPercent = response.hourly.cloudcover[closestIdx] ?? 0;
  const visibilityM = response.hourly.visibility[closestIdx] ?? 10000;
  return { cloudCoverPercent, visibilityKm: visibilityM / 1000 };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetch current sky conditions for the observer's location.
 * Results cached for 30 minutes in localStorage.
 */
export async function fetchSkyConditions(
  lat: number,
  lon: number
): Promise<ApiResult<SkyConditions>> {
  const key = CacheKeys.skyConditions(lat, lon);

  const cached = cacheGet<SkyConditions>(key);
  if (cached) {
    return { ok: true, data: cached, fromCache: true };
  }

  try {
    const url = buildOpenMeteoUrl(lat, lon);
    const response = await fetch(url);

    if (!response.ok) {
      return {
        ok: false,
        error: `Open Meteo HTTP ${response.status}: ${response.statusText}`,
        fromCache: false,
      };
    }

    const json = (await response.json()) as OpenMeteoResponse;
    const { cloudCoverPercent, visibilityKm } = extractCurrentHour(json);
    const limitingMagnitude = deriveLimitingMagnitude(cloudCoverPercent);

    const conditions: SkyConditions = {
      cloudCoverPercent,
      visibilityKm,
      limitingMagnitude,
      fetchedAt: Date.now(),
    };

    cacheSet(key, conditions, CACHE_TTL.WEATHER);
    return { ok: true, data: conditions, fromCache: false };
  } catch (err) {
    return {
      ok: false,
      error: `Open Meteo fetch failed: ${String(err)}`,
      fromCache: false,
    };
  }
}
