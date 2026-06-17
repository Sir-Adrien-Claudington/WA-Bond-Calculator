// Phase 2 foundation — the persistent Specimen.
// The mine game stored only an ephemeral selectedMineral; a saved collection
// needs a richer, serialisable record. This also bridges the data-shape gaps
// the expansion blueprint assumed away: mohs is a string range in `Mineral`,
// `system` is the crystal-system field, and rarity is computed not stored.

import type { Mineral } from './geology';
import type { PurityBand } from '../utils/purity';
import type { InclusionType } from '../utils/inclusions';

export type CrystalSystem =
  | 'cubic' | 'tetragonal' | 'orthorhombic' | 'hexagonal'
  | 'trigonal' | 'monoclinic' | 'triclinic';

export type Rarity = 'common' | 'uncommon' | 'rare' | 'legendary';

export interface Specimen {
  id: string;                 // unique per extracted instance
  mineralId: string;
  name: string;
  formula: string;
  mohs: number;               // parsed from the Mineral's string range
  crystalSystem: CrystalSystem;
  rarity: Rarity;
  colour: string;             // hex
  siteId: string;
  depthFactor: number;
  purityScore: number;        // 0–100
  purityBand: PurityBand;
  inclusions: InclusionType[];
  // Phase 2 combine outputs:
  isAlloy?: boolean;
  isSynthetic?: boolean;      // gem dopant outputs
  parentIds?: [string, string];
}

// '5.5 – 6.5' → 6.0, '7' → 7, '7.5 – 8' → 7.75. Averages any numbers found.
export function parseMohs(s: string): number {
  const nums = (s.match(/[\d.]+/g) ?? []).map(Number).filter(n => !Number.isNaN(n));
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

const CRYSTAL_SYSTEMS = new Set<CrystalSystem>([
  'cubic', 'tetragonal', 'orthorhombic', 'hexagonal', 'trigonal', 'monoclinic', 'triclinic',
]);

export function toCrystalSystem(s: string): CrystalSystem {
  const k = s.trim().toLowerCase();
  if (k === 'isometric') return 'cubic';
  return CRYSTAL_SYSTEMS.has(k as CrystalSystem) ? (k as CrystalSystem) : 'triclinic';
}

// Mirrors the in-game getRarity thresholds, returning the lowercase union.
export function toRarity(m: Mineral): Rarity {
  const mohs = parseMohs(m.mohs);
  if (m.luster === 'Adamantine' || mohs >= 9)   return 'legendary';
  if (mohs >= 7 || m.transmission > 0.5)         return 'rare';
  if (mohs >= 5 || m.metalness > 0.8)            return 'uncommon';
  return 'common';
}

let seq = 0;
export function nextSpecimenId(): string {
  return `spec-${Date.now().toString(36)}-${(seq++).toString(36)}`;
}

export interface SpecimenRoll {
  siteId: string;
  depthFactor: number;
  purityScore: number;
  purityBand: PurityBand;
  inclusions: InclusionType[];
}

// Build a persistent Specimen from a mined mineral + its extraction roll.
export function makeSpecimen(m: Mineral, roll: SpecimenRoll): Specimen {
  return {
    id: nextSpecimenId(),
    mineralId: m.id,
    name: m.name,
    formula: m.formula,
    mohs: parseMohs(m.mohs),
    crystalSystem: toCrystalSystem(m.system),
    rarity: toRarity(m),
    colour: m.color,
    siteId: roll.siteId,
    depthFactor: roll.depthFactor,
    purityScore: roll.purityScore,
    purityBand: roll.purityBand,
    inclusions: roll.inclusions,
  };
}
