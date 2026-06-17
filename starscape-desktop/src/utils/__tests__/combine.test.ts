import { describe, it, expect } from 'vitest';
import { matchRecipe, combineYield, rollOutputInclusions, smelt } from '../combine';
import type { Specimen } from '../../data/specimen';
import type { PurityBand } from '../purity';

function spec(mineralId: string, purityScore: number, purityBand: PurityBand): Specimen {
  return {
    id: `id-${mineralId}-${purityScore}`,
    mineralId, name: mineralId, formula: '', mohs: 5,
    crystalSystem: 'cubic', rarity: 'common', colour: '#fff',
    siteId: 's', depthFactor: 0.5, purityScore, purityBand, inclusions: [],
  };
}

describe('matchRecipe', () => {
  it('matches order-independently', () => {
    expect(matchRecipe(['copper', 'tin'])?.id).toBe('bronze');
    expect(matchRecipe(['tin', 'copper'])?.id).toBe('bronze');
    expect(matchRecipe(['quartz', 'pyrite'])?.id).toBe('amethyst');
  });
  it('returns null when no recipe matches', () => {
    expect(matchRecipe(['copper', 'gold'])).toBeNull();
    expect(matchRecipe(['copper'])).toBeNull();
  });
});

describe('combineYield', () => {
  it('two metallurgical → average × 1.0', () => {
    expect(combineYield(spec('copper', 80, 'metallurgical'), spec('tin', 70, 'metallurgical'))).toBe(75);
  });
  it('mixed grades → average × 0.85', () => {
    expect(combineYield(spec('copper', 60, 'industrial'), spec('tin', 80, 'metallurgical'))).toBe(60); // 70 × 0.85 = 59.5 → 60
  });
  it('both gem → average × 1.2, clamped to 100', () => {
    expect(combineYield(spec('corundum', 95, 'gem'), spec('crocoite', 92, 'gem'))).toBe(100);
  });
});

describe('rollOutputInclusions', () => {
  it('clean output above 50 has none', () => {
    expect(rollOutputInclusions(70, () => 0)).toHaveLength(0);
  });
  it('low output gets 1–2 structural flaws', () => {
    expect(rollOutputInclusions(30, () => 0)).toEqual(['structural']);
    expect(rollOutputInclusions(30, () => 0.9)).toEqual(['structural', 'structural']);
  });
});

describe('smelt', () => {
  it('produces the recipe output with parent + flags set', () => {
    const res = smelt(spec('copper', 80, 'metallurgical'), spec('tin', 70, 'metallurgical'), () => 0);
    expect(res).not.toBeNull();
    expect(res!.recipe.id).toBe('bronze');
    expect(res!.output.mineralId).toBe('bronze');
    expect(res!.output.isAlloy).toBe(true);
    expect(res!.output.purityScore).toBe(75);
    expect(res!.output.parentIds).toEqual(['id-copper-80', 'id-tin-70']);
  });
  it('returns null for an invalid pair', () => {
    expect(smelt(spec('copper', 80, 'metallurgical'), spec('gold', 80, 'metallurgical'))).toBeNull();
  });
});
