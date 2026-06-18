import { describe, it, expect } from 'vitest';
import { scratchTest } from '../mohs';
import type { Specimen } from '../../data/specimen';

const spec = (id: string, mohs: number): Specimen => ({
  id, mineralId: id, name: id, formula: '', mohs,
  crystalSystem: 'cubic', rarity: 'common', colour: '#fff',
  siteId: 's', depthFactor: 0.5, purityScore: 70, purityBand: 'metallurgical', inclusions: [],
});

describe('scratchTest', () => {
  it('the harder mineral scratches the softer, regardless of argument order', () => {
    const r1 = scratchTest(spec('diamond', 10), spec('talc', 1));
    expect(r1.tie).toBe(false);
    expect(r1.harder?.id).toBe('diamond');
    expect(r1.softer?.id).toBe('talc');

    const r2 = scratchTest(spec('talc', 1), spec('diamond', 10));
    expect(r2.harder?.id).toBe('diamond');
    expect(r2.softer?.id).toBe('talc');
  });

  it('near-equal hardness is a tie', () => {
    expect(scratchTest(spec('quartz', 7), spec('amethyst', 7)).tie).toBe(true);
    expect(scratchTest(spec('a', 6.0), spec('b', 6.2)).tie).toBe(true);
  });
});
