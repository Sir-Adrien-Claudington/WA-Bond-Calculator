// Phase 1 — Inclusion types
// A specimen's inclusions are intrinsic flaws rolled from its quality. More
// flaws at lower quality (blueprint section 1.2 bands).

export type InclusionType =
  | 'fluid'       // trapped water/gas — bubble clusters in the ore
  | 'mineral'     // foreign crystal needles — hair-thin streaks
  | 'structural'  // fracture planes — jagged crack lines
  | 'gangue';     // host-rock contamination — grey mottling

export const INCLUSION_TYPES: InclusionType[] = ['fluid', 'mineral', 'structural', 'gangue'];

export const INCLUSION_LABELS: Record<InclusionType, string> = {
  fluid:      'Fluid',
  mineral:    'Mineral needles',
  structural: 'Fracture planes',
  gangue:     'Gangue',
};

// Roll inclusions from a 0–100 quality/purity value. Counts per blueprint:
//   <50 → 2–3,  50–69 → 1–2,  70–89 → 0–1,  90+ → 0
export function rollInclusions(quality: number, rng: () => number = Math.random): InclusionType[] {
  let count: number;
  if (quality >= 90)      count = 0;
  else if (quality >= 70) count = rng() < 0.5 ? 0 : 1;
  else if (quality >= 50) count = rng() < 0.5 ? 1 : 2;
  else                    count = rng() < 0.5 ? 2 : 3;

  const out: InclusionType[] = [];
  for (let i = 0; i < count; i++) {
    out.push(INCLUSION_TYPES[Math.floor(rng() * INCLUSION_TYPES.length)]);
  }
  return out;
}
