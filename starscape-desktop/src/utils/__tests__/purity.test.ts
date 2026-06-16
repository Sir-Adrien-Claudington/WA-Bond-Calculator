import { describe, it, expect } from 'vitest';
import { rollPurity, classifyBand, PURITY_BANDS } from '../purity';
import { rollInclusions } from '../inclusions';

describe('classifyBand', () => {
  it('maps boundary values to the right band', () => {
    expect(classifyBand(100).band).toBe('gem');
    expect(classifyBand(90).band).toBe('gem');
    expect(classifyBand(89).band).toBe('metallurgical');
    expect(classifyBand(70).band).toBe('metallurgical');
    expect(classifyBand(69).band).toBe('industrial');
    expect(classifyBand(50).band).toBe('industrial');
    expect(classifyBand(49).band).toBe('ore');
    expect(classifyBand(0).band).toBe('ore');
  });

  it('bands are ordered high → low and cover 0–100', () => {
    expect(PURITY_BANDS.map(b => b.min)).toEqual([90, 70, 50, 0]);
  });
});

describe('rollPurity', () => {
  const zero = () => 0;       // no noise
  const high = () => 0.999;   // ~full noise

  it('applies the documented weighting (combo 40 / depth 30 / tool 20 / noise 10)', () => {
    expect(rollPurity({ comboMultiplier: 8, depthFactor: 1, toolTier: 0, rng: zero })).toBe(70);
    expect(rollPurity({ comboMultiplier: 8, depthFactor: 1, toolTier: 3, maxToolTier: 3, rng: zero })).toBe(90);
    expect(rollPurity({ comboMultiplier: 1, depthFactor: 0, toolTier: 0, rng: zero })).toBe(5);
  });

  it('clamps to 0–100 and rises with combo', () => {
    const low  = rollPurity({ comboMultiplier: 1, depthFactor: 0, rng: zero });
    const big  = rollPurity({ comboMultiplier: 8, depthFactor: 1, rng: high });
    expect(low).toBeGreaterThanOrEqual(0);
    expect(big).toBeLessThanOrEqual(100);
    expect(big).toBeGreaterThan(low);
  });

  it('without tools, purity stays below gem grade (gem is Phase-4 gated)', () => {
    const best = rollPurity({ comboMultiplier: 8, depthFactor: 1, toolTier: 0, rng: high });
    expect(best).toBeLessThan(90);
  });
});

describe('rollInclusions', () => {
  it('rolls the documented count per purity band', () => {
    expect(rollInclusions(95, () => 0)).toHaveLength(0);          // 90+  → 0
    expect(rollInclusions(80, () => 0)).toHaveLength(0);          // 70–89 → 0–1 (low roll)
    expect(rollInclusions(80, () => 0.6)).toHaveLength(1);        // 70–89 → 0–1 (high roll)
    expect(rollInclusions(60, () => 0)).toHaveLength(1);          // 50–69 → 1–2
    expect(rollInclusions(60, () => 0.6)).toHaveLength(2);
    expect(rollInclusions(30, () => 0)).toHaveLength(2);          // <50  → 2–3
    expect(rollInclusions(30, () => 0.6)).toHaveLength(3);
  });

  it('only emits known inclusion types', () => {
    const valid = new Set(['fluid', 'mineral', 'structural', 'gangue']);
    for (const inc of rollInclusions(20, Math.random)) {
      expect(valid.has(inc)).toBe(true);
    }
  });
});
