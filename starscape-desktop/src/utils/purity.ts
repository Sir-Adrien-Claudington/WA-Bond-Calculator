// Phase 1 — Purity System
// Hidden purity roll on extraction + four-band classifier. The band metadata
// is the single source of truth for the assay gauge AND the acid-test variance
// (bubble count, solution colour, reaction speed, cloudiness), per the
// expansion blueprint's section 1.3 table.

export type PurityBand = 'gem' | 'metallurgical' | 'industrial' | 'ore';

export interface BandInfo {
  band: PurityBand;
  label: string;          // shown in the assay report
  min: number;            // inclusive lower bound of the band
  color: string;          // gauge + label colour
  bubbleCount: number;    // acid-test bubble particles
  solutionColor: string;  // acid solution tint (rgba)
  reactionMs: number;     // acid-test animation duration
  cloudiness: number;     // 0 = clear, 1 = opaque sediment/murk
}

// Ordered high → low so classifyBand can return the first match.
export const PURITY_BANDS: BandInfo[] = [
  { band: 'gem',           label: 'Gem grade',           min: 90, color: '#9fe7ff', bubbleCount: 40, solutionColor: 'rgba(120, 220, 200, 0.50)', reactionMs: 900,  cloudiness: 0.00 },
  { band: 'metallurgical', label: 'Metallurgical grade', min: 70, color: '#bfe3a0', bubbleCount: 25, solutionColor: 'rgba(190, 205, 120, 0.60)', reactionMs: 1200, cloudiness: 0.22 },
  { band: 'industrial',    label: 'Industrial grade',    min: 50, color: '#e0b15a', bubbleCount: 12, solutionColor: 'rgba(170, 120, 60, 0.72)',  reactionMs: 1600, cloudiness: 0.55 },
  { band: 'ore',           label: 'Ore grade',           min: 0,  color: '#b07a55', bubbleCount: 5,  solutionColor: 'rgba(90, 70, 55, 0.85)',    reactionMs: 2100, cloudiness: 0.88 },
];

export function classifyBand(purity: number): BandInfo {
  return PURITY_BANDS.find(b => purity >= b.min) ?? PURITY_BANDS[PURITY_BANDS.length - 1];
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export interface PurityInputs {
  comboMultiplier: number;   // 1–8 (current combo at extraction)
  depthFactor: number;       // 0–1 — deposit richness / cave depth
  toolTier?: number;         // 0–maxToolTier (Phase 4; 0 = basic pick for now)
  maxToolTier?: number;      // default 3
  rng?: () => number;        // injectable for deterministic tests
}

// Blueprint formula (section 1.1). depthFactor + toolTier come from later
// phases; until then depthFactor is the deposit's intrinsic richness and
// toolTier is 0, so purity tops out around the metallurgical band — gem grade
// is intentionally gated behind Phase 4 tool upgrades.
export function rollPurity({
  comboMultiplier, depthFactor, toolTier = 0, maxToolTier = 3, rng = Math.random,
}: PurityInputs): number {
  const score =
      (clamp(comboMultiplier, 0, 8) / 8) * 40
    + clamp(depthFactor, 0, 1) * 30
    + (clamp(toolTier, 0, maxToolTier) / maxToolTier) * 20
    + rng() * 10;
  return Math.round(clamp(score, 0, 100));
}
