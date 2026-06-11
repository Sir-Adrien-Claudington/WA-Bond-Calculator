// ---------------------------------------------------------------------------
// StarScape — Zustand store for browser geolocation
// ---------------------------------------------------------------------------
import { create } from 'zustand';
import type { ObserverLocation } from '@api/types';

type GeoState = 'idle' | 'requesting' | 'granted' | 'denied' | 'unavailable';

interface LocationState {
  location: ObserverLocation | null;
  geoState: GeoState;
  error: string | null;
  // Actions
  requestLocation: () => void;
  setManualLocation: (lat: number, lon: number) => void;
}

export const useLocationStore = create<LocationState>((set) => ({
  location: null,
  geoState: 'idle',
  error: null,

  requestLocation: () => {
    if (!navigator.geolocation) {
      set({ geoState: 'unavailable', error: 'Geolocation not supported by this browser.' });
      return;
    }
    set({ geoState: 'requesting' });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        set({
          geoState: 'granted',
          location: {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            altitude: pos.coords.altitude ?? undefined,
            acquiredAt: Date.now(),
          },
          error: null,
        });
      },
      (err) => {
        set({
          geoState: 'denied',
          error: `Location denied: ${err.message}. Using default location (Greenwich).`,
          // Default to Greenwich for graceful degradation
          location: { latitude: 51.4779, longitude: -0.0015, acquiredAt: Date.now() },
        });
      },
      { timeout: 10000, maximumAge: 300000 }
    );
  },

  setManualLocation: (lat, lon) => {
    set({
      geoState: 'granted',
      location: { latitude: lat, longitude: lon, acquiredAt: Date.now() },
      error: null,
    });
  },
}));
