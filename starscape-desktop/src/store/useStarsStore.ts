// ---------------------------------------------------------------------------
// StarScape — Zustand store for star data and Three.js geometry state
// ---------------------------------------------------------------------------
import { create } from 'zustand';
import type { HipparcosStarRecord, StarPoint } from '@api/types';
import { getStars, getStarPoints } from '@api/hipparcos';

interface StarsState {
  stars: HipparcosStarRecord[];
  starPoints: StarPoint[];
  isLoaded: boolean;
  error: string | null;
  // Which star the user is hovering (for tooltip)
  hoveredStarHip: number | null;
  // Which star is selected (for detail panel)
  selectedStarHip: number | null;
  // Actions
  loadStars: () => void;
  setHoveredStar: (hip: number | null) => void;
  setSelectedStar: (hip: number | null) => void;
}

export const useStarsStore = create<StarsState>((set) => ({
  stars: [],
  starPoints: [],
  isLoaded: false,
  error: null,
  hoveredStarHip: null,
  selectedStarHip: null,

  loadStars: () => {
    const result = getStars();
    if (result.ok) {
      set({
        stars: result.data,
        starPoints: getStarPoints(),
        isLoaded: true,
        error: null,
      });
    } else {
      set({ error: result.error, isLoaded: false });
    }
  },

  setHoveredStar: (hip) => set({ hoveredStarHip: hip }),
  setSelectedStar: (hip) => set({ selectedStarHip: hip }),
}));
