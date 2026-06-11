// ---------------------------------------------------------------------------
// StarScape — Zustand store for sky conditions (Open Meteo)
// ---------------------------------------------------------------------------
import { create } from 'zustand';
import type { SkyConditions } from '@api/types';
import { fetchSkyConditions } from '@api/openMeteo';

type LoadState = 'idle' | 'loading' | 'success' | 'error';

interface SkyState {
  conditions: SkyConditions | null;
  loadState: LoadState;
  error: string | null;
  fromCache: boolean;
  // Actions
  fetchConditions: (lat: number, lon: number) => Promise<void>;
}

export const useSkyStore = create<SkyState>((set) => ({
  conditions: null,
  loadState: 'idle',
  error: null,
  fromCache: false,

  fetchConditions: async (lat, lon) => {
    set({ loadState: 'loading', error: null });
    const result = await fetchSkyConditions(lat, lon);
    if (result.ok) {
      set({
        conditions: result.data,
        loadState: 'success',
        fromCache: result.fromCache,
      });
    } else {
      set({ loadState: 'error', error: result.error });
    }
  },
}));
