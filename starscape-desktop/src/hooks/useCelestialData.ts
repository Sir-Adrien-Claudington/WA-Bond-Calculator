// ---------------------------------------------------------------------------
// StarScape — astronomy-engine wrapper hook
// ---------------------------------------------------------------------------
// Computes live altitude/azimuth, distance, illumination, and rise/set times
// for the planets and Moon, entirely locally (no network calls).
// astronomy-engine: MIT licence, based on public-domain NOVAS/VSOP87 models.
// ---------------------------------------------------------------------------

import { useEffect, useState } from 'react';
import {
  Body,
  Observer,
  Equator,
  Horizon,
  Illumination,
  SearchRiseSet,
} from 'astronomy-engine';

export interface CelestialBodyData {
  name: string;
  altitude: number; // degrees above/below horizon
  azimuth: number; // compass degrees
  distance: number; // AU from Earth
  illumination: number; // 0–1 phase fraction
  riseTime: Date | null;
  setTime: Date | null;
  visible: boolean;
}

const BODIES: Body[] = [
  Body.Mercury,
  Body.Venus,
  Body.Mars,
  Body.Jupiter,
  Body.Saturn,
  Body.Uranus,
  Body.Neptune,
  Body.Moon,
];

export function useCelestialData(lat: number, lng: number) {
  const [bodies, setBodies] = useState<Record<string, CelestialBodyData>>({});
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  useEffect(() => {
    function update() {
      const now = new Date();
      const observer = new Observer(lat, lng, 0);
      const result: Record<string, CelestialBodyData> = {};

      for (const body of BODIES) {
        try {
          const eq = Equator(body, now, observer, true, true);
          const hor = Horizon(now, observer, eq.ra, eq.dec, 'normal');
          const illum = Illumination(body, now);
          const rise = SearchRiseSet(body, observer, +1, now, 1);
          const set = SearchRiseSet(body, observer, -1, now, 1);

          result[body] = {
            name: body,
            altitude: hor.altitude,
            azimuth: hor.azimuth,
            distance: eq.dist,
            illumination: illum.phase_fraction,
            riseTime: rise ? rise.date : null,
            setTime: set ? set.date : null,
            visible: hor.altitude > 0,
          };
        } catch {
          // astronomy-engine throws for degenerate cases (e.g. circumpolar
          // rise/set search at extreme latitudes) — omit that body this tick
        }
      }

      setBodies(result);
      setUpdatedAt(now);
    }

    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, [lat, lng]);

  return { bodies, updatedAt };
}
