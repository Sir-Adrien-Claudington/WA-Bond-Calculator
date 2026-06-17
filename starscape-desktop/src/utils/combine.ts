// Phase 2 — pure combine logic (no React, no store, no Math.random in the
// matcher). The Zustand smelt action is a thin wrapper around this.

import { ALL_RECIPES, type Recipe } from '../data/recipes';
import { classifyBand } from './purity';
import { nextSpecimenId, type Specimen } from '../data/specimen';
import type { InclusionType } from './inclusions';

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const keyOf = (ids: string[]) => [...ids].sort().join('+');

// Order-independent, N-ary recipe match. Returns null when no recipe uses
// exactly this multiset of inputs.
export function matchRecipe(inputMineralIds: string[], recipes: Recipe[] = ALL_RECIPES): Recipe | null {
  const target = keyOf(inputMineralIds);
  return recipes.find(r => keyOf(r.inputs) === target) ?? null;
}

// Purity-gated yield (blueprint 2.4): average input purity, scaled by how well
// the grades match. Gem grade is Phase-4 gated, so in practice the 0.85 branch
// dominates — combining trades raw purity for a more valuable output type.
export function combineYield(a: Specimen, b: Specimen): number {
  let p = (a.purityScore + b.purityScore) / 2;
  const bothGem = a.purityBand === 'gem' && b.purityBand === 'gem';
  const bothMet = a.purityBand === 'metallurgical' && b.purityBand === 'metallurgical';
  p *= bothGem ? 1.2 : bothMet ? 1.0 : 0.85;
  return Math.round(clamp(p, 0, 100));
}

// Low-purity outputs carry hidden structural flaws (blueprint 2.4).
export function rollOutputInclusions(outputPurity: number, rng: () => number = Math.random): InclusionType[] {
  if (outputPurity >= 50) return [];
  const n = rng() < 0.5 ? 1 : 2;
  return Array.from({ length: n }, () => 'structural' as InclusionType);
}

export interface SmeltResult {
  recipe: Recipe;
  output: Specimen;
}

// Smelt two specimens. Pure: returns null on no matching recipe, otherwise the
// recipe + the produced output specimen. Caller (store) handles inventory.
export function smelt(a: Specimen, b: Specimen, rng: () => number = Math.random): SmeltResult | null {
  const recipe = matchRecipe([a.mineralId, b.mineralId]);
  if (!recipe) return null;

  const purityScore = combineYield(a, b);
  const output: Specimen = {
    id: nextSpecimenId(),
    mineralId: recipe.output,
    name: recipe.outputName,
    formula: recipe.outputFormula,
    mohs: (a.mohs + b.mohs) / 2,
    crystalSystem: a.crystalSystem,
    rarity: recipe.type === 'gem' ? 'rare' : 'uncommon',
    colour: recipe.outputColor,
    siteId: 'combine-lab',
    depthFactor: (a.depthFactor + b.depthFactor) / 2,
    purityScore,
    purityBand: classifyBand(purityScore).band,
    inclusions: rollOutputInclusions(purityScore, rng),
    isAlloy: recipe.type === 'alloy',
    isSynthetic: recipe.type === 'gem',
    parentIds: [a.id, b.id],
  };
  return { recipe, output };
}
