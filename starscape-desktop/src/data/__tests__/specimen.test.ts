import { describe, it, expect } from 'vitest';
import { parseMohs, toCrystalSystem } from '../specimen';

describe('parseMohs', () => {
  it('parses single values and ranges (en-dash or hyphen)', () => {
    expect(parseMohs('7')).toBe(7);
    expect(parseMohs('7.5 – 8')).toBeCloseTo(7.75);
    expect(parseMohs('5.5 – 6.5')).toBeCloseTo(6.0);
    expect(parseMohs('2.5 - 3')).toBeCloseTo(2.75);
  });
  it('returns 0 for non-numeric input', () => {
    expect(parseMohs('n/a')).toBe(0);
  });
});

describe('toCrystalSystem', () => {
  it('lowercases known systems and maps isometric → cubic', () => {
    expect(toCrystalSystem('Hexagonal')).toBe('hexagonal');
    expect(toCrystalSystem('Trigonal')).toBe('trigonal');
    expect(toCrystalSystem('Isometric')).toBe('cubic');
  });
  it('falls back to triclinic for anything unrecognised', () => {
    expect(toCrystalSystem('Amorphous')).toBe('triclinic');
  });
});
