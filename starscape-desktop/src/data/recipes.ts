// Phase 2 — Combine recipes.
// Inputs are mineralId arrays (order-independent). Outputs are self-describing
// (name/formula/colour) so an alloy output needs no entry in MINERALS. Several
// input minerals (tin, zinc, graphite, iron, aluminium, magnesite, corundum,
// beryl, crocoite, ilmenite) are added to geology.ts in the Combine-Lab commit;
// the recipe data + matcher are valid and testable before then.

export type RecipeType = 'alloy' | 'gem';

export interface Recipe {
  id: string;
  inputs: string[];       // mineralId array, order-independent
  output: string;         // output id (alloy id, or an existing mineral id)
  outputName: string;
  outputFormula: string;  // display label, e.g. 'Cu·Sn'
  outputColor: string;    // hex
  type: RecipeType;
  unlocks: string;        // badge / feature label
}

export const ALLOY_RECIPES: Recipe[] = [
  { id: 'bronze',    inputs: ['copper', 'tin'],                      output: 'bronze',    outputName: 'Bronze',    outputFormula: 'Cu·Sn',    outputColor: '#cd7f32', type: 'alloy', unlocks: 'Ancient Civilisations' },
  { id: 'steel',     inputs: ['iron', 'graphite'],                  output: 'steel',     outputName: 'Steel',     outputFormula: 'Fe·C',     outputColor: '#8a8f98', type: 'alloy', unlocks: 'Industrial Age' },
  { id: 'brass',     inputs: ['copper', 'zinc'],                    output: 'brass',     outputName: 'Brass',     outputFormula: 'Cu·Zn',    outputColor: '#d4b14a', type: 'alloy', unlocks: 'Acoustic resonance demo' },
  // duralumin has THREE inputs but the Combine UI is two slots — it stays in the
  // data (the matcher is order-independent and N-ary) but is unreachable until a
  // third slot is added. Resolved in the Combine-Lab commit.
  { id: 'duralumin', inputs: ['aluminium', 'copper', 'magnesite'],  output: 'duralumin', outputName: 'Duralumin',  outputFormula: 'Al·Cu·Mg', outputColor: '#b8c4cc', type: 'alloy', unlocks: 'Aviation badge' },
  { id: 'solder',    inputs: ['tin', 'galena'],                     output: 'solder',    outputName: 'Solder',    outputFormula: 'Sn·Pb',    outputColor: '#9fa6ad', type: 'alloy', unlocks: 'Electronics lab' },
];

export const GEM_RECIPES: Recipe[] = [
  { id: 'ruby',     inputs: ['corundum', 'crocoite'],  output: 'ruby',     outputName: 'Ruby',     outputFormula: 'Al₂O₃:Cr', outputColor: '#e0115f', type: 'gem', unlocks: 'Chromium badge' },
  { id: 'sapphire', inputs: ['corundum', 'ilmenite'],  output: 'sapphire', outputName: 'Sapphire', outputFormula: 'Al₂O₃:Ti', outputColor: '#0f52ba', type: 'gem', unlocks: 'Titanium badge' },
  { id: 'emerald',  inputs: ['beryl', 'crocoite'],     output: 'emerald',  outputName: 'Emerald',  outputFormula: 'Be₃Al₂Si₆O₁₈:Cr', outputColor: '#50c878', type: 'gem', unlocks: 'Emerald lore' },
  { id: 'amethyst', inputs: ['quartz', 'pyrite'],      output: 'amethyst', outputName: 'Amethyst', outputFormula: 'SiO₂:Fe', outputColor: '#9966cc', type: 'gem', unlocks: 'Crystal colour lore' },
];

export const ALL_RECIPES: Recipe[] = [...ALLOY_RECIPES, ...GEM_RECIPES];
