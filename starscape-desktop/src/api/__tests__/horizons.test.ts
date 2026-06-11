import { describe, it, expect } from 'vitest';
import { parseHorizonsResponse } from '../horizons';

// Matches the real JPL CSV format returned by the batch API
const VALID_JPL_CSV = `
*******************************************************************************
$$SOE
 2026-Jun-11 12:00,*,m, 07 02 17.28, +24 17 44.3,    0.247,  3.526,
 2026-Jun-11 12:01,*,m, 07 02 17.49, +24 17 43.7,    0.247,  3.526,
$$EOE
*******************************************************************************
`;

describe('parseHorizonsResponse', () => {
  it('parses a valid JPL response and returns a HorizonsResult', () => {
    const result = parseHorizonsResponse(VALID_JPL_CSV, '199', 'Mercury', '2026-06-11 12:00');
    expect(result).not.toBeNull();
    expect(result!.body).toBe('Mercury');
    expect(result!.bodyCode).toBe('199');
    // parseFloat("07 02 17.28") = 7 hours, 7 * 15 = 105 degrees
    expect(result!.raDeg).toBe(105);
    // parseFloat("+24 17 44.3") = 24 degrees
    expect(result!.decDeg).toBe(24);
    expect(result!.magnitude).toBeCloseTo(0.247);
    expect(result!.epochUtc).toBe('2026-06-11 12:00');
  });

  it('returns null when $$SOE marker is absent', () => {
    const text = '$$EOE\n 2026-Jun-11 12:00,*,m, 07,+24,0.247,3.5,\n';
    expect(parseHorizonsResponse(text, '199', 'Mercury', '2026-06-11 12:00')).toBeNull();
  });

  it('returns null when $$EOE marker is absent', () => {
    const text = '$$SOE\n 2026-Jun-11 12:00,*,m, 07,+24,0.247,3.5,\n';
    expect(parseHorizonsResponse(text, '199', 'Mercury', '2026-06-11 12:00')).toBeNull();
  });

  it('returns null when data block between markers is empty', () => {
    expect(parseHorizonsResponse('$$SOE\n$$EOE\n', '199', 'Mercury', '2026-06-11 12:00')).toBeNull();
  });

  it('returns null when fewer than 6 CSV columns', () => {
    const text = '$$SOE\n 2026-Jun-11 12:00,*,m, 07,\n$$EOE\n';
    expect(parseHorizonsResponse(text, '199', 'Mercury', '2026-06-11 12:00')).toBeNull();
  });

  it('returns null when RA is non-numeric (n.a.)', () => {
    const text = '$$SOE\n 2026-Jun-11 12:00,*,m, n.a., +24 17 44.3,    0.247,  3.526,\n$$EOE\n';
    expect(parseHorizonsResponse(text, '199', 'Mercury', '2026-06-11 12:00')).toBeNull();
  });

  it('uses first data line only — ignores subsequent rows', () => {
    const result = parseHorizonsResponse(VALID_JPL_CSV, '199', 'Mercury', '2026-06-11 12:00');
    // raDeg must come from first row (col[3] = "07 02 17.28"), not second
    expect(result!.raDeg).toBe(105);
  });
});
