import { describe, it, expect } from 'vitest';
import { bvToRgb } from '../hipparcos';

describe('bvToRgb', () => {
  it('returns blue-white for hot O/B stars (bv < 0)', () => {
    expect(bvToRgb(-0.3)).toEqual([0.792, 0.878, 1.0]);
  });

  it('returns white for A/F stars (0 ≤ bv < 0.3)', () => {
    expect(bvToRgb(0.15)).toEqual([1.0, 1.0, 1.0]);
  });

  it('returns warm yellow for G stars (0.3 ≤ bv < 0.8)', () => {
    expect(bvToRgb(0.5)).toEqual([1.0, 0.965, 0.835]);
  });

  it('returns orange for K stars (0.8 ≤ bv < 1.4)', () => {
    expect(bvToRgb(1.0)).toEqual([1.0, 0.8, 0.6]);
  });

  it('returns red-orange for M stars (bv ≥ 1.4)', () => {
    expect(bvToRgb(1.5)).toEqual([1.0, 0.6, 0.4]);
  });

  it('handles exact boundary bv=0 (A not B)', () => {
    expect(bvToRgb(0)).toEqual([1.0, 1.0, 1.0]);
  });

  it('handles exact boundary bv=0.3 (G not A)', () => {
    expect(bvToRgb(0.3)).toEqual([1.0, 0.965, 0.835]);
  });

  it('handles exact boundary bv=0.8 (K not G)', () => {
    expect(bvToRgb(0.8)).toEqual([1.0, 0.8, 0.6]);
  });

  it('handles exact boundary bv=1.4 (M not K)', () => {
    expect(bvToRgb(1.4)).toEqual([1.0, 0.6, 0.4]);
  });
});
