import { describe, it, expect } from 'vitest';
import { elementsInFormula, PERIODIC_LAYOUT } from '../periodicElements';

const sorted = (a: string[]) => [...a].sort();

describe('elementsInFormula', () => {
  it('extracts unique element symbols through subscripts and parentheses', () => {
    expect(sorted(elementsInFormula('FeS₂'))).toEqual(['Fe', 'S']);
    expect(sorted(elementsInFormula('Cu₃(CO₃)₂(OH)₂'))).toEqual(['C', 'Cu', 'H', 'O']);
    expect(sorted(elementsInFormula('Au'))).toEqual(['Au']);
  });
  it('handles solid-solution commas', () => {
    expect(sorted(elementsInFormula('(Mg,Fe)₂SiO₄'))).toEqual(['Fe', 'Mg', 'O', 'Si']);
    expect(sorted(elementsInFormula('(Na,Ca)(Li,Mg,Al)₆…'))).toEqual(['Al', 'Ca', 'Li', 'Mg', 'Na']);
  });
});

describe('PERIODIC_LAYOUT', () => {
  it('has unique symbols within valid grid bounds', () => {
    const symbols = new Set(PERIODIC_LAYOUT.map(e => e.symbol));
    expect(symbols.size).toBe(PERIODIC_LAYOUT.length);
    for (const e of PERIODIC_LAYOUT) {
      expect(e.group).toBeGreaterThanOrEqual(1);
      expect(e.group).toBeLessThanOrEqual(18);
      expect(e.period).toBeGreaterThanOrEqual(1);
      expect(e.period).toBeLessThanOrEqual(6);
    }
  });
});
