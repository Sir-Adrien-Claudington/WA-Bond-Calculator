// ---------------------------------------------------------------------------
// StarScape — Zustand store for planet tracker
// ---------------------------------------------------------------------------
import { create } from 'zustand';
import type { PlanetCard, ApiResult } from '@api/types';
import { fetchPlanetPositions } from '@api/horizons';

type LoadState = 'idle' | 'loading' | 'success' | 'error';

interface PlanetState {
  planets: PlanetCard[];
  loadState: LoadState;
  error: string | null;
  fromCache: boolean;
  // Actions
  fetchPlanets: (lat: number, lon: number) => Promise<void>;
}

export const usePlanetStore = create<PlanetState>((set) => ({
  planets: [],
  loadState: 'idle',
  error: null,
  fromCache: false,

  fetchPlanets: async (lat, lon) => {
    set({ loadState: 'loading', error: null });
    const result: ApiResult<PlanetCard[]> = await fetchPlanetPositions(lat, lon);
    if (result.ok) {
      set({
        planets: result.data,
        loadState: 'success',
        fromCache: result.fromCache,
      });
    } else {
      set({ loadState: 'error', error: result.error });
    }
  },
}));
