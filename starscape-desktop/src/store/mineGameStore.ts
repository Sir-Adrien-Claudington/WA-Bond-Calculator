// ---------------------------------------------------------------------------
// GeoScape Mine Game — persistent collection + combine state (Phase 2)
// ---------------------------------------------------------------------------
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Specimen } from '../data/specimen';
import { smelt as smeltPure } from '../utils/combine';

interface MineGameState {
  // --- Collection (persisted) ---
  collection: Specimen[];
  addSpecimen: (s: Specimen) => void;
  removeSpecimen: (id: string) => void;

  // --- Combine slice ---
  slotA: Specimen | null;
  slotB: Specimen | null;
  lastResult: Specimen | null;
  discoveredRecipes: string[];   // persisted
  unlockedBadges: string[];      // persisted
  setSlot: (slot: 'A' | 'B', specimen: Specimen | null) => void;
  smelt: () => Specimen | null;  // null when no valid recipe
  clearSlots: () => void;

  // --- Mohs scratch ladder (persisted) ---
  testedMinerals: string[];                       // mineralIds empirically ranked
  recordScratch: (idA: string, idB: string) => void;
  clearTested: () => void;
}

export const useMineGameStore = create<MineGameState>()(
  persist(
    (set, get) => ({
      collection: [],
      addSpecimen: (s) => set(st => ({ collection: [...st.collection, s] })),
      removeSpecimen: (id) => set(st => ({
        collection: st.collection.filter(x => x.id !== id),
        slotA: st.slotA?.id === id ? null : st.slotA,
        slotB: st.slotB?.id === id ? null : st.slotB,
      })),

      slotA: null,
      slotB: null,
      lastResult: null,
      discoveredRecipes: [],
      unlockedBadges: [],

      setSlot: (slot, specimen) =>
        set(slot === 'A' ? { slotA: specimen } : { slotB: specimen }),

      clearSlots: () => set({ slotA: null, slotB: null }),

      testedMinerals: [],
      recordScratch: (idA, idB) => set(st => {
        const next = new Set(st.testedMinerals);
        next.add(idA);
        next.add(idB);
        return { testedMinerals: [...next] };
      }),
      // Wipe the ladder. Setting testedMinerals back to [] also rewrites the
      // persisted copy in localStorage, because testedMinerals is in partialize.
      clearTested: () => set({ testedMinerals: [] }),

      smelt: () => {
        const { slotA, slotB } = get();
        if (!slotA || !slotB) return null;
        const res = smeltPure(slotA, slotB);
        if (!res) return null;
        set(st => ({
          // inputs are consumed, output added
          collection: [
            ...st.collection.filter(x => x.id !== slotA.id && x.id !== slotB.id),
            res.output,
          ],
          lastResult: res.output,
          discoveredRecipes: st.discoveredRecipes.includes(res.recipe.id)
            ? st.discoveredRecipes
            : [...st.discoveredRecipes, res.recipe.id],
          unlockedBadges: st.unlockedBadges.includes(res.recipe.unlocks)
            ? st.unlockedBadges
            : [...st.unlockedBadges, res.recipe.unlocks],
          slotA: null,
          slotB: null,
        }));
        return res.output;
      },
    }),
    {
      name: 'starscape:minegame',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      // Only durable data is persisted; slots + lastResult are transient.
      partialize: (s) => ({
        collection: s.collection,
        discoveredRecipes: s.discoveredRecipes,
        unlockedBadges: s.unlockedBadges,
        testedMinerals: s.testedMinerals,
      }),
      // No-op for v1; bump `version` and migrate here on any Specimen-shape
      // change so old saved data can't deserialise into undefined fields.
      migrate: (persisted): MineGameState => persisted as MineGameState,
    },
  ),
);
