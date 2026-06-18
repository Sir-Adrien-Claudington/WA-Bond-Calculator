// Phase 3.2 — Mohs scratch test (pure logic).
//
// Works on anything with a numeric Mohs hardness + identity, so it serves both
// the player's collected Specimens AND the canonical MINERALS reference set
// used by the Scratch Test lab. Specimen satisfies this shape, so the unit
// tests (which pass Specimens) stay valid.
export interface Scratchable {
  id: string;
  name: string;
  mohs: number;
}

export interface ScratchResult<T extends Scratchable = Scratchable> {
  tie: boolean;
  harder?: T;
  softer?: T;
}

// The harder mineral scratches the softer. Equal hardness (within 0.25 Mohs)
// is a draw — neither leaves a mark.
export function scratchTest<T extends Scratchable>(a: T, b: T): ScratchResult<T> {
  if (Math.abs(a.mohs - b.mohs) < 0.25) return { tie: true };
  return a.mohs > b.mohs
    ? { tie: false, harder: a, softer: b }
    : { tie: false, harder: b, softer: a };
}
