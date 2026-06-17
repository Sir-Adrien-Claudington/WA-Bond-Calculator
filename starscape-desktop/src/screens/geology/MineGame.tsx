// ---------------------------------------------------------------------------
// GeoScape — Mine Game
// ---------------------------------------------------------------------------
// Phase machine: Australia map → zoom → first-person cave tap game → popup.
// Map uses real Natural Earth 1:110m coastline with cos-latitude correction.
// Cave: animated rock face, mineralogically-styled ore deposits (per-mineral
// crystal facets, specular highlights, glow), pickaxe overlay, score/combo
// system, particle feedback, and a rarity-tagged geological popup.
// ---------------------------------------------------------------------------

import { useEffect, useRef, useState, useCallback, useMemo, type CSSProperties } from 'react';
import { MINERALS, type Mineral } from '@data/geology';
import { AU_COAST, TAS_COAST } from '@data/australiaCoast';
import { GeoNav } from './GeoNav';
import { rollPurity, classifyBand, type BandInfo } from '../../utils/purity';
import { rollInclusions, INCLUSION_LABELS, type InclusionType } from '../../utils/inclusions';
import { drawInclusions } from '../../canvas/inclusionRenderer';
import { makeSpecimen, type Specimen } from '@data/specimen';
import { useMineGameStore } from '../../store/mineGameStore';

// ---- Mine site data -------------------------------------------------------

interface MineSite {
  id: string; name: string; lat: number; lon: number;
  minerals: string[]; state: string; desc: string;
}

const MINE_SITES: MineSite[] = [
  { id: 'kalgoorlie', name: 'Kalgoorlie', lat: -30.75, lon: 121.46,
    minerals: ['gold', 'pyrite'], state: 'WA',
    desc: "Super Pit — one of the world's largest open-cut gold mines, over 3.5 km long." },
  { id: 'broken-hill', name: 'Broken Hill', lat: -31.95, lon: 141.47,
    minerals: ['galena', 'pyrite'], state: 'NSW',
    desc: 'The Line of Lode — silver, lead and zinc ore body discovered in 1883, still producing.' },
  { id: 'mount-isa', name: 'Mount Isa', lat: -20.73, lon: 139.49,
    minerals: ['copper', 'galena'], state: 'QLD',
    desc: 'One of the most productive copper, lead, zinc and silver mines in the world.' },
  { id: 'newman', name: 'Mount Whaleback', lat: -23.35, lon: 119.73,
    minerals: ['hematite', 'magnetite'], state: 'WA',
    desc: 'Pilbara iron ore — the largest single-pit open-cut iron ore mine in the world.' },
  { id: 'argyle', name: 'Argyle Mine', lat: -16.71, lon: 128.39,
    minerals: ['diamond'], state: 'WA',
    desc: "World's leading producer of pink diamonds — now underground after pit exhaustion." },
  { id: 'olympic-dam', name: 'Olympic Dam', lat: -30.44, lon: 136.87,
    minerals: ['copper', 'gold'], state: 'SA',
    desc: "The world's largest known uranium deposit — also rich in copper and gold." },
  { id: 'mount-lyell', name: 'Mount Lyell', lat: -42.10, lon: 145.73,
    minerals: ['pyrite', 'copper'], state: 'TAS',
    desc: 'Over a century of copper extraction in the rugged West Coast wilderness of Tasmania.' },
];

// ---- Map projection -------------------------------------------------------

const AU_N = -9.5, AU_S = -43.8, AU_W = 113.0, AU_E = 153.8;
const COS_CORR = Math.cos(26 * Math.PI / 180);

function projectCoord(lat: number, lon: number, w: number, h: number): [number, number] {
  const pad    = Math.min(w, h) * 0.04;
  const lonExt = (AU_E - AU_W) * COS_CORR;
  const latExt = Math.abs(AU_N - AU_S);
  const avW    = w - 2 * pad;
  const avH    = h - 2 * pad;
  const sc     = Math.min(avW / lonExt, avH / latExt);
  const ox     = pad + (avW - lonExt * sc) / 2;
  // Bias the map upward (40% of vertical slack above, 60% below). On a tall
  // portrait phone this trades a dead, perfectly-centred void for a clean lower
  // band that holds the legend; on a wide desktop the map is height-bound so
  // the slack is ~0 and this has no visible effect. Coastline and site markers
  // both go through here, so they stay perfectly aligned.
  const oy     = pad + (avH - latExt * sc) * 0.4;
  return [ox + (lon - AU_W) * COS_CORR * sc, oy + (AU_N - lat) * sc];
}

// ---- Cave game types + helpers --------------------------------------------

interface CaveDeposit {
  id: string; mineral: Mineral;
  cx: number; cy: number; rx: number; ry: number;
  hp: number; maxHp: number;
  blob:     [number, number][];
  cracks:   [number, number][][];
  sparkles: [number, number][];
  extracted: boolean;
  inclusions:  InclusionType[]; // intrinsic flaws, rendered on the ore
  depthFactor: number;          // 0–1 richness; feeds the purity roll
}

interface Particle {
  x: number; y: number; vx: number; vy: number;
  color: string; alpha: number; size: number;
}

interface Stal { x: number; w: number; h: number; shade: number; }

function seededRng(seed: number): () => number {
  let s = seed | 0;
  return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
}

function makeBlob(n: number, rng: () => number): [number, number][] {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    const r = 0.72 + rng() * 0.56;
    return [Math.cos(a) * r, Math.sin(a) * r] as [number, number];
  });
}

function makeCracks(count: number, rng: () => number): [number, number][][] {
  return Array.from({ length: count }, (_, i) => {
    let angle = (i / count) * Math.PI * 2 + (rng() - 0.5) * 0.6;
    const len  = 0.32 + rng() * 0.5;
    const segs: [number, number][] = [];
    let rem = len;
    while (rem > 0.05) {
      const segLen = Math.min(rem, 0.08 + rng() * 0.12);
      angle += (rng() - 0.5) * 0.9;
      segs.push([Math.cos(angle) * segLen, Math.sin(angle) * segLen]);
      rem -= segLen;
    }
    return segs;
  });
}

function makeSparkles(count: number, rng: () => number): [number, number][] {
  return Array.from({ length: count }, () => {
    const a = rng() * Math.PI * 2;
    const r = 0.15 + rng() * 0.55;
    return [Math.cos(a) * r, Math.sin(a) * r] as [number, number];
  });
}

function createDeposit(
  mineral: Mineral, cx: number, cy: number, rx: number, ry: number, hp: number
): CaveDeposit {
  const rng = seededRng(Math.floor(cx * 7919 + cy * 6271));
  // Intrinsic richness (0–1). Stands in for Phase-4 cave depth: it drives both
  // the visible inclusions and the extraction purity roll, so cloudy ore
  // reliably assays lower.
  const depthFactor = rng();
  const inclusions  = rollInclusions(depthFactor * 100, rng);
  return {
    id: `${mineral.id}-${(cx * 1000) | 0}`,
    mineral, cx, cy, rx, ry, hp, maxHp: hp,
    blob:     makeBlob(12, rng),
    cracks:   makeCracks(8, rng),
    sparkles: makeSparkles(7, rng),
    extracted: false,
    inclusions, depthFactor,
  };
}

const DEPOSIT_LAYOUTS: [number, number, number, number][][] = [
  [[0.50, 0.42, 0.13, 0.15]],
  [[0.30, 0.40, 0.11, 0.12], [0.70, 0.42, 0.11, 0.13]],
  [[0.22, 0.38, 0.10, 0.11], [0.52, 0.44, 0.11, 0.12], [0.78, 0.40, 0.10, 0.11]],
];

const STALS: Stal[] = (() => {
  const rng = seededRng(55721);
  const stals: Stal[] = [];
  let x = 0.01;
  while (x < 1.0) {
    const w = 0.03 + rng() * 0.08;
    stals.push({ x: x + w * 0.3, w, h: 0.04 + rng() * 0.16, shade: rng() });
    x += w * 0.55 + rng() * 0.05;
  }
  return stals;
})();

function hexToRgb(hex: string): [number, number, number] {
  const c = parseInt(hex.replace('#', ''), 16);
  return [(c >> 16) & 0xff, (c >> 8) & 0xff, c & 0xff];
}

// Mineral scoring and rarity -----------------------------------------------

const MINERAL_PTS: Record<string, number> = {
  diamond: 200, ruby: 180, sapphire: 160, emerald: 150, topaz: 130,
  tourmaline: 110, amethyst: 90, citrine: 85, peridot: 80,
  gold: 120, copper: 55, pyrite: 50, galena: 60,
  hematite: 45, magnetite: 40, fluorite: 35,
  malachite: 30, azurite: 30, rhodochrosite: 25,
  halite: 15, calcite: 18, gypsum: 12, sulfur: 20,
};

function mineralPts(id: string): number { return MINERAL_PTS[id] ?? 30; }

function getRarity(m: Mineral): { label: string; color: string } {
  const mohs = parseFloat(m.mohs);
  if (m.luster === 'Adamantine' || mohs >= 9)    return { label: 'Legendary', color: '#f4e8b3' };
  if (mohs >= 7   || m.transmission > 0.5)       return { label: 'Rare',      color: '#c77dff' };
  if (mohs >= 5   || m.metalness > 0.8)          return { label: 'Uncommon',  color: '#4cc9f0' };
  return { label: 'Common', color: '#8ecae6' };
}

// ---- Chemical test data --------------------------------------------------

interface ChemTest {
  reagent: string;
  equation: string;
  result: string;
  reaction: 'bubble' | 'dissolve' | 'colorChange' | 'fume' | 'precipitate' | 'none';
  solutionColor: string;
}

const MINERAL_TESTS: Record<string, ChemTest[]> = {
  gold: [
    { reagent: 'HCl', equation: 'Au + HCl → no reaction', result: 'Gold resists hydrochloric acid completely.', reaction: 'none', solutionColor: 'transparent' },
    { reagent: 'HNO₃', equation: 'Au + HNO₃ → no reaction', result: 'Even concentrated nitric acid cannot dissolve gold.', reaction: 'none', solutionColor: 'transparent' },
    { reagent: 'Aqua Regia', equation: 'Au + 3HCl + HNO₃ → HAuCl₄ + NO + 2H₂O', result: 'Only "royal water" (1:3 HNO₃:HCl) dissolves gold — forming a deep gold chloride solution.', reaction: 'dissolve', solutionColor: '#d4af52' },
  ],
  pyrite: [
    { reagent: 'HCl', equation: 'FeS₂ + 2HCl → FeCl₂ + H₂S↑ + S', result: 'Rotten-egg smell! Hydrogen sulfide gas bubbles off — the classic Fool\'s Gold test.', reaction: 'fume', solutionColor: '#d4b060' },
    { reagent: 'HNO₃', equation: 'FeS₂ + 8HNO₃ → FeSO₄ + 8NO₂ + 4H₂O', result: 'Yellow sulfur precipitates and brown NO₂ fumes rise as pyrite dissolves.', reaction: 'precipitate', solutionColor: '#c8b840' },
    { reagent: 'H₂SO₄', equation: 'FeS₂ + 2H₂SO₄ → FeSO₄ + 2H₂S↑', result: 'Decomposes slowly with heat, releasing sulfurous compounds.', reaction: 'bubble', solutionColor: '#c8c060' },
  ],
  galena: [
    { reagent: 'HNO₃', equation: 'PbS + 4HNO₃ → PbSO₄↓ + 4NO₂ + 4H₂O', result: 'White lead sulfate precipitates immediately — confirms lead content.', reaction: 'precipitate', solutionColor: '#e8e8f0' },
    { reagent: 'HCl', equation: 'PbS + 2HCl → PbCl₂ + H₂S↑', result: 'Slow reaction with faint sulfide odour. White PbCl₂ may precipitate.', reaction: 'fume', solutionColor: '#d8d8e8' },
    { reagent: 'H₂SO₄', equation: 'PbS + H₂SO₄ → PbSO₄↓ + H₂S↑', result: 'Insoluble white PbSO₄ crust forms immediately on the surface.', reaction: 'precipitate', solutionColor: '#f0f0f8' },
  ],
  copper: [
    { reagent: 'HNO₃', equation: 'Cu + 4HNO₃ → Cu(NO₃)₂ + 2NO₂ + 2H₂O', result: 'Dramatic blue-green solution with brown NO₂ fumes — a vivid copper test!', reaction: 'colorChange', solutionColor: '#00b4d8' },
    { reagent: 'HCl', equation: 'Cu + 2HCl → CuCl₂ + H₂↑', result: 'Slow green-blue solution forms as hydrogen bubbles off.', reaction: 'bubble', solutionColor: '#3fae74' },
    { reagent: 'H₂SO₄ (hot)', equation: 'Cu + 2H₂SO₄ → CuSO₄ + SO₂ + 2H₂O', result: 'Hot concentrated acid dissolves copper to vivid blue copper sulfate.', reaction: 'dissolve', solutionColor: '#1f4fb5' },
  ],
  hematite: [
    { reagent: 'HCl', equation: 'Fe₂O₃ + 6HCl → 2FeCl₃ + 3H₂O', result: 'Dissolves to a brown-yellow ferric chloride solution.', reaction: 'dissolve', solutionColor: '#b8610a' },
    { reagent: 'H₂SO₄', equation: 'Fe₂O₃ + 3H₂SO₄ → Fe₂(SO₄)₃ + 3H₂O', result: 'Dissolves in hot concentrated acid to rusty-red iron sulfate.', reaction: 'dissolve', solutionColor: '#c04820' },
    { reagent: 'Streak test', equation: 'Fe₂O₃ — blood-red streak', result: 'The definitive hematite test — always leaves a blood-red streak even though the mineral looks silver!', reaction: 'colorChange', solutionColor: '#8b1a1a' },
  ],
  magnetite: [
    { reagent: 'HCl', equation: 'Fe₃O₄ + 8HCl → FeCl₂ + 2FeCl₃ + 4H₂O', result: 'Dissolves to a dark greenish-brown mixed iron chloride solution.', reaction: 'dissolve', solutionColor: '#4a7050' },
    { reagent: 'Magnet', equation: 'Fe₃O₄ — ferrimagnetic mineral', result: 'Strongly attracted to any magnet — the most magnetic natural mineral on Earth!', reaction: 'none', solutionColor: '#2b2e33' },
    { reagent: 'H₂SO₄', equation: 'Fe₃O₄ + 4H₂SO₄ → FeSO₄ + Fe₂(SO₄)₃ + 4H₂O', result: 'Dissolves slowly in concentrated acid to a mixed iron sulfate solution.', reaction: 'dissolve', solutionColor: '#3a5040' },
  ],
  diamond: [
    { reagent: 'HCl', equation: 'C + HCl → no reaction', result: 'Diamond is utterly inert to all acids — pure carbon, perfectly bonded.', reaction: 'none', solutionColor: 'transparent' },
    { reagent: 'HNO₃', equation: 'C + HNO₃ → no reaction', result: 'Even concentrated nitric acid cannot touch diamond at room temperature.', reaction: 'none', solutionColor: 'transparent' },
    { reagent: 'O₂ (heat)', equation: 'C + O₂ → CO₂ (at ~850 °C)', result: 'Diamond burns in oxygen above 850 °C — converting entirely to CO₂ gas!', reaction: 'fume', solutionColor: '#ffe0b0' },
  ],
  quartz: [
    { reagent: 'HCl', equation: 'SiO₂ + HCl → no reaction', result: 'Quartz resists hydrochloric acid completely.', reaction: 'none', solutionColor: 'transparent' },
    { reagent: 'HF', equation: 'SiO₂ + 4HF → SiF₄ + 2H₂O', result: 'Only hydrofluoric acid etches and dissolves quartz — uniquely reactive!', reaction: 'dissolve', solutionColor: '#c8e8f8' },
    { reagent: 'NaOH (hot)', equation: 'SiO₂ + 2NaOH → Na₂SiO₃ + H₂O', result: 'Hot concentrated alkali slowly dissolves quartz, forming water glass.', reaction: 'dissolve', solutionColor: '#e8f0e0' },
  ],
  amethyst: [
    { reagent: 'HCl', equation: 'SiO₂ + HCl → no reaction', result: 'Amethyst (quartz) resists all common acids.', reaction: 'none', solutionColor: 'transparent' },
    { reagent: 'HF', equation: 'SiO₂ + 4HF → SiF₄ + 2H₂O', result: 'HF etches the surface, permanently dulling the violet lustre.', reaction: 'dissolve', solutionColor: '#9b5fc0' },
    { reagent: 'Heat (470 °C)', equation: 'Fe³⁺ → Fe²⁺ colour centres oxidise', result: 'Heat converts amethyst to golden citrine — most commercial citrine is heat-treated amethyst!', reaction: 'colorChange', solutionColor: '#e3a83a' },
  ],
  citrine: [
    { reagent: 'HCl', equation: 'SiO₂ + HCl → no reaction', result: 'Citrine (quartz) resists all common acids.', reaction: 'none', solutionColor: 'transparent' },
    { reagent: 'HF', equation: 'SiO₂ + 4HF → SiF₄ + 2H₂O', result: 'Surface etched and dulled — the golden lustre is permanently lost.', reaction: 'dissolve', solutionColor: '#e3a83a' },
    { reagent: 'Cool slowly', equation: 'Fe²⁺ → Fe³⁺ reversal possible', result: 'Some citrine can be reverted to amethyst by slow cooling from 400 °C.', reaction: 'colorChange', solutionColor: '#9b5fc0' },
  ],
  emerald: [
    { reagent: 'HCl', equation: 'Be₃Al₂Si₆O₁₈ + HCl → very slow', result: 'Very slow attack only in hot concentrated acid — extremely resistant.', reaction: 'none', solutionColor: 'transparent' },
    { reagent: 'HF', equation: 'Be₃Al₂Si₆O₁₈ + HF → BeF₂ + AlF₃ + SiF₄↑', result: 'HF decomposes beryl, releasing toxic fluoride fumes — dangerous!', reaction: 'fume', solutionColor: '#1f9e63' },
    { reagent: 'H₂SO₄ (hot)', equation: 'Be₃Al₂Si₆O₁₈ + H₂SO₄ → BeSO₄ + Al₂(SO₄)₃ + …', result: 'Hot concentrated H₂SO₄ slowly decomposes the beryl structure.', reaction: 'dissolve', solutionColor: '#1f9e6380' },
  ],
  ruby: [
    { reagent: 'HF', equation: 'Al₂O₃ + 6HF → 2AlF₃ + 3H₂O', result: 'Only HF attacks corundum — slowly etching the surface.', reaction: 'dissolve', solutionColor: '#c41f39' },
    { reagent: 'HCl', equation: 'Al₂O₃ + HCl → no reaction (cold)', result: 'Cold HCl has no effect. Ruby is highly acid resistant.', reaction: 'none', solutionColor: 'transparent' },
    { reagent: 'H₂SO₄ (hot)', equation: 'Al₂O₃ + 3H₂SO₄ → Al₂(SO₄)₃ + 3H₂O', result: 'Very hot H₂SO₄ slowly dissolves alumina — the basis of industrial Al₂O₃ processing.', reaction: 'dissolve', solutionColor: '#c41f3960' },
  ],
  sapphire: [
    { reagent: 'HF', equation: 'Al₂O₃ + 6HF → 2AlF₃ + 3H₂O', result: 'Only HF attacks corundum — slowly etching the surface.', reaction: 'dissolve', solutionColor: '#1f4fb5' },
    { reagent: 'HCl', equation: 'Al₂O₃ + HCl → no reaction (cold)', result: 'Cold HCl has no effect. Sapphire is highly acid resistant.', reaction: 'none', solutionColor: 'transparent' },
    { reagent: 'H₂SO₄ (hot)', equation: 'Al₂O₃ + 3H₂SO₄ → Al₂(SO₄)₃ + 3H₂O', result: 'Very hot concentrated H₂SO₄ eventually dissolves sapphire.', reaction: 'dissolve', solutionColor: '#1f4fb560' },
  ],
  fluorite: [
    { reagent: 'H₂SO₄', equation: 'CaF₂ + H₂SO₄ → CaSO₄ + 2HF↑', result: 'Generates hydrogen fluoride gas — the original industrial production route for HF!', reaction: 'fume', solutionColor: '#5fc0a8' },
    { reagent: 'HCl', equation: 'CaF₂ + 2HCl → CaCl₂ + 2HF↑', result: 'Slow attack with HF fumes rising above the beaker — handle with care.', reaction: 'fume', solutionColor: '#5fc0a860' },
    { reagent: 'UV light', equation: 'F⁻ defect centres → photon emission', result: 'Fluorite glows vivid blue-green under UV — giving "fluorescence" to science!', reaction: 'colorChange', solutionColor: '#5fc0a8' },
  ],
  malachite: [
    { reagent: 'HCl', equation: 'Cu₂CO₃(OH)₂ + 4HCl → 2CuCl₂ + 3H₂O + CO₂↑', result: 'Vigorous fizz! CO₂ bubbles off as the green mineral dissolves to blue-green CuCl₂.', reaction: 'bubble', solutionColor: '#3fae74' },
    { reagent: 'HNO₃', equation: 'Cu₂CO₃(OH)₂ + 4HNO₃ → 2Cu(NO₃)₂ + 3H₂O + CO₂↑', result: 'Brisk CO₂ effervescence, dissolving to a blue copper nitrate solution.', reaction: 'bubble', solutionColor: '#00b4d8' },
    { reagent: 'H₂SO₄', equation: 'Cu₂CO₃(OH)₂ + 2H₂SO₄ → 2CuSO₄ + 3H₂O + CO₂↑', result: 'Fizzes with CO₂ — vivid blue copper sulfate solution forms.', reaction: 'bubble', solutionColor: '#1f4fb5' },
  ],
  azurite: [
    { reagent: 'HCl', equation: 'Cu₃(CO₃)₂(OH)₂ + 6HCl → 3CuCl₂ + 4H₂O + 2CO₂↑', result: 'Brisk CO₂ effervescence — deep blue mineral dissolves to green solution.', reaction: 'bubble', solutionColor: '#3fae74' },
    { reagent: 'HNO₃', equation: 'Cu₃(CO₃)₂(OH)₂ + 6HNO₃ → 3Cu(NO₃)₂ + 4H₂O + 2CO₂↑', result: 'Vigorous CO₂ release — deep blue copper nitrate solution forms.', reaction: 'bubble', solutionColor: '#1b4ea8' },
    { reagent: 'Moisture', equation: 'Cu₃(CO₃)₂(OH)₂ + H₂O → Cu₂CO₃(OH)₂ + CO₂ (slow)', result: 'Azurite slowly weathers to green malachite over geological time — visible as green surface patches!', reaction: 'colorChange', solutionColor: '#1f7a52' },
  ],
  calcite: [
    { reagent: 'HCl', equation: 'CaCO₃ + 2HCl → CaCl₂ + H₂O + CO₂↑', result: 'Vigorous fizzing! CO₂ bubbles strongly — the quickest field test for limestone and marble.', reaction: 'bubble', solutionColor: '#f3ecd9' },
    { reagent: 'H₂SO₄', equation: 'CaCO₃ + H₂SO₄ → CaSO₄ + H₂O + CO₂↑', result: 'Initial fizz then stops — insoluble CaSO₄ coats the surface and blocks further reaction.', reaction: 'precipitate', solutionColor: '#f0f0e8' },
    { reagent: 'HNO₃', equation: 'CaCO₃ + 2HNO₃ → Ca(NO₃)₂ + H₂O + CO₂↑', result: 'Steady CO₂ effervescence — calcite fully dissolves in nitric acid.', reaction: 'bubble', solutionColor: '#f3ecd960' },
  ],
  rhodochrosite: [
    { reagent: 'HCl', equation: 'MnCO₃ + 2HCl → MnCl₂ + H₂O + CO₂↑', result: 'Fizzes with CO₂ — rose-pink mineral dissolves to a pale solution.', reaction: 'bubble', solutionColor: '#d24a6a' },
    { reagent: 'HNO₃', equation: 'MnCO₃ + 2HNO₃ → Mn(NO₃)₂ + H₂O + CO₂↑', result: 'Effervescent dissolution to a pale manganese nitrate solution.', reaction: 'bubble', solutionColor: '#d24a6a80' },
    { reagent: 'H₂O₂', equation: 'MnCO₃ + H₂O₂ → MnO₂ + H₂O + CO₂↑', result: 'Oxidises to dark manganese dioxide — the basis of Mn ore extraction!', reaction: 'colorChange', solutionColor: '#2b2b2b' },
  ],
  halite: [
    { reagent: 'Water', equation: 'NaCl → Na⁺ + Cl⁻ (aq)', result: 'Dissolves completely in water — it is literally table salt!', reaction: 'dissolve', solutionColor: '#f0f0ff' },
    { reagent: 'AgNO₃', equation: 'NaCl + AgNO₃ → AgCl↓ + NaNO₃', result: 'Immediate white precipitate of silver chloride — the classic chloride confirmation test!', reaction: 'precipitate', solutionColor: '#f0f0f8' },
    { reagent: 'Flame test', equation: 'Na⁺ → 589 nm photon emission', result: 'Burns vivid yellow-orange — sodium\'s bright spectral doublet at 589 nm.', reaction: 'colorChange', solutionColor: '#ff9933' },
  ],
  topaz: [
    { reagent: 'HCl', equation: 'Al₂SiO₄F₂ + HCl → no reaction', result: 'Topaz resists hydrochloric acid at room temperature.', reaction: 'none', solutionColor: 'transparent' },
    { reagent: 'HF', equation: 'Al₂SiO₄F₂ + HF → AlF₃ + SiF₄ + H₂O', result: 'HF attacks the fluorosilicate structure — etching and dulling the surface.', reaction: 'dissolve', solutionColor: '#a9d6e8' },
    { reagent: 'H₂SO₄ (hot)', equation: 'Al₂SiO₄F₂ + H₂SO₄ → Al₂(SO₄)₃ + SiO₂ + HF↑', result: 'Hot concentrated H₂SO₄ decomposes topaz, releasing HF fumes.', reaction: 'fume', solutionColor: '#a9d6e860' },
  ],
  tourmaline: [
    { reagent: 'HCl', equation: 'borosilicate + HCl → no reaction (cold)', result: 'Highly resistant — only very strong acids at high temperature attack tourmaline.', reaction: 'none', solutionColor: 'transparent' },
    { reagent: 'HF', equation: 'borosilicate + HF → fluoride salts + BF₃↑', result: 'HF attacks the complex borosilicate structure, releasing boron trifluoride gas.', reaction: 'fume', solutionColor: '#2f9158' },
    { reagent: 'H₂SO₄ (hot)', equation: 'borosilicate + H₂SO₄ → metal sulfates + SiO₂', result: 'Hot concentrated H₂SO₄ slowly decomposes the mineral matrix.', reaction: 'dissolve', solutionColor: '#2f915860' },
  ],
  peridot: [
    { reagent: 'HCl', equation: '(Mg,Fe)₂SiO₄ + 4HCl → 2MgCl₂ + SiO₂ + 2H₂O', result: 'Olivine decomposes — gelatinous silica forms as a distinctive slimy residue!', reaction: 'dissolve', solutionColor: '#9ac43a' },
    { reagent: 'H₂SO₄', equation: '(Mg,Fe)₂SiO₄ + 2H₂SO₄ → 2MgSO₄ + SiO₂ + 2H₂O', result: 'Decomposes with silica separation in hot acid.', reaction: 'dissolve', solutionColor: '#9ac43a80' },
    { reagent: 'HNO₃', equation: '(Mg,Fe)₂SiO₄ + 4HNO₃ → 2Mg(NO₃)₂ + SiO₂ + 2H₂O', result: 'Dissolves, leaving a gelatinous SiO₂ residue behind.', reaction: 'precipitate', solutionColor: '#9ac43a60' },
  ],
  sulfur: [
    { reagent: 'CS₂', equation: 'S(s) → S(CS₂ solution)', result: 'Carbon disulfide dissolves sulfur completely — a bright canary-yellow solution!', reaction: 'dissolve', solutionColor: '#f2dd2e' },
    { reagent: 'HNO₃ (hot)', equation: 'S + 2HNO₃ → H₂SO₄ + 2NO↑', result: 'Hot concentrated nitric acid oxidises sulfur directly to sulfuric acid.', reaction: 'fume', solutionColor: '#e8e060' },
    { reagent: 'HCl', equation: 'S + HCl → no reaction', result: 'Sulfur is inert to hydrochloric acid — no dissolving, no reaction.', reaction: 'none', solutionColor: 'transparent' },
  ],
  gypsum: [
    { reagent: 'HCl', equation: 'CaSO₄·2H₂O + 2HCl → CaCl₂ + H₂SO₄ + 2H₂O', result: 'Slowly dissolves — barely fizzes, as sulfate doesn\'t effervesce like carbonate.', reaction: 'dissolve', solutionColor: '#eef0ea' },
    { reagent: 'BaCl₂', equation: 'CaSO₄ + BaCl₂ → BaSO₄↓ + CaCl₂', result: 'White barium sulfate precipitates instantly — the classic sulfate confirmation test!', reaction: 'precipitate', solutionColor: '#f0f0f8' },
    { reagent: 'Flame test', equation: 'Ca²⁺ → 620 nm emission', result: 'Calcium burns brick-red in a flame — a quick and beautiful calcium test!', reaction: 'colorChange', solutionColor: '#c84820' },
  ],
};

function getTests(mineralId: string): ChemTest[] {
  return MINERAL_TESTS[mineralId] ?? [
    { reagent: 'HCl', equation: 'mineral + HCl → test', result: 'Reaction depends on mineral composition.', reaction: 'none', solutionColor: 'transparent' },
    { reagent: 'HNO₃', equation: 'mineral + HNO₃ → test', result: 'Nitric acid test helps identify metal content.', reaction: 'none', solutionColor: 'transparent' },
    { reagent: 'H₂SO₄', equation: 'mineral + H₂SO₄ → test', result: 'Sulfuric acid provides reactivity information.', reaction: 'none', solutionColor: 'transparent' },
  ];
}

// ---- Composition (parse chemical formula → element mass %) -----------------

interface ElementInfo { name: string; mass: number; color: string; }

const ELEMENTS: Record<string, ElementInfo> = {
  H:  { name: 'Hydrogen',   mass: 1.008,   color: '#e6edf3' },
  Li: { name: 'Lithium',    mass: 6.94,    color: '#c9a0ff' },
  Be: { name: 'Beryllium',  mass: 9.012,   color: '#6fd49c' },
  B:  { name: 'Boron',      mass: 10.81,   color: '#d6a06f' },
  C:  { name: 'Carbon',     mass: 12.011,  color: '#7a828c' },
  N:  { name: 'Nitrogen',   mass: 14.007,  color: '#5a8ad6' },
  O:  { name: 'Oxygen',     mass: 15.999,  color: '#4cc9f0' },
  F:  { name: 'Fluorine',   mass: 18.998,  color: '#7fd6c0' },
  Na: { name: 'Sodium',     mass: 22.990,  color: '#b07cf0' },
  Mg: { name: 'Magnesium',  mass: 24.305,  color: '#9ad24a' },
  Al: { name: 'Aluminium',  mass: 26.982,  color: '#b8c4cc' },
  Si: { name: 'Silicon',    mass: 28.085,  color: '#c89b6a' },
  P:  { name: 'Phosphorus', mass: 30.974,  color: '#e08a4a' },
  S:  { name: 'Sulfur',     mass: 32.06,   color: '#f2dd2e' },
  Cl: { name: 'Chlorine',   mass: 35.45,   color: '#5fc08a' },
  K:  { name: 'Potassium',  mass: 39.098,  color: '#a06fd0' },
  Ca: { name: 'Calcium',    mass: 40.078,  color: '#e8e3d3' },
  Mn: { name: 'Manganese',  mass: 54.938,  color: '#d24a6a' },
  Fe: { name: 'Iron',       mass: 55.845,  color: '#d9763c' },
  Cu: { name: 'Copper',     mass: 63.546,  color: '#c97a4a' },
  Zn: { name: 'Zinc',       mass: 65.38,   color: '#7f8fa0' },
  As: { name: 'Arsenic',    mass: 74.922,  color: '#9b8fd0' },
  Ag: { name: 'Silver',     mass: 107.868, color: '#c7ccd1' },
  Pb: { name: 'Lead',       mass: 207.2,   color: '#8a8f98' },
  Au: { name: 'Gold',       mass: 196.967, color: '#d4af52' },
};

const SUBSCRIPTS = '₀₁₂₃₄₅₆₇₈₉';

// Tokenise a clean (no commas, no hydrate dot) formula segment into element
// counts. Handles nested parentheses with multipliers, e.g. Cu₃(CO₃)₂(OH)₂.
function tokeniseFormula(str: string): Record<string, number> {
  let i = 0;
  const parseSeq = (): Record<string, number> => {
    const counts: Record<string, number> = {};
    while (i < str.length) {
      const c = str[i];
      if (c === ')') break;
      if (c === '(') {
        i++;
        const inner = parseSeq();
        if (str[i] === ')') i++;
        let num = '';
        while (i < str.length && /[0-9]/.test(str[i])) num += str[i++];
        const m = num ? parseInt(num, 10) : 1;
        for (const k in inner) counts[k] = (counts[k] ?? 0) + inner[k] * m;
      } else if (/[A-Z]/.test(c)) {
        let sym = c; i++;
        while (i < str.length && /[a-z]/.test(str[i])) sym += str[i++];
        let num = '';
        while (i < str.length && /[0-9]/.test(str[i])) num += str[i++];
        const m = num ? parseInt(num, 10) : 1;
        counts[sym] = (counts[sym] ?? 0) + m;
      } else {
        i++; // skip stray character
      }
    }
    return counts;
  };
  return parseSeq();
}

export interface CompositionItem { symbol: string; name: string; color: string; pct: number; }
export interface Composition { items: CompositionItem[]; approximate: boolean; }

// Parse a mineral formula into element mass percentages. Returns null when the
// formula is truncated/complex (e.g. tourmaline's "…") rather than guessing.
function getComposition(formula: string): Composition | null {
  if (!formula) return null;
  if (formula.includes('…') || formula.includes('...')) return null;

  // Unicode subscripts → ASCII digits.
  let s = formula.replace(/[₀-₉]/g, ch => String(SUBSCRIPTS.indexOf(ch)));

  // Solid solutions like (Mg,Fe)₂ are a range, not a fixed value — keep the
  // first (dominant) endmember and flag the whole result as approximate.
  let approximate = false;
  if (s.includes(',')) {
    approximate = true;
    s = s.replace(/\(([^)]*)\)/g, (m, inner: string) =>
      inner.includes(',') ? `(${inner.split(',')[0]})` : m);
  }

  // Hydrate / dot-joined parts, each with an optional leading coefficient
  // (e.g. CaSO₄·2H₂O → "CaSO4" + "2H2O").
  const counts: Record<string, number> = {};
  for (const part of s.split('·')) {
    if (!part) continue;
    const lead = part.match(/^(\d+)(.*)$/);
    const coeff = lead ? parseInt(lead[1], 10) : 1;
    const body = lead ? lead[2] : part;
    const c = tokeniseFormula(body);
    for (const k in c) counts[k] = (counts[k] ?? 0) + c[k] * coeff;
  }

  const symbols = Object.keys(counts);
  if (symbols.length === 0) return null;
  if (symbols.some(sym => !ELEMENTS[sym])) return null; // unknown element → bail

  let total = 0;
  const masses = symbols.map(sym => {
    const m = counts[sym] * ELEMENTS[sym].mass;
    total += m;
    return { sym, m };
  });
  if (total <= 0) return null;

  const items: CompositionItem[] = masses
    .map(({ sym, m }) => ({
      symbol: sym,
      name: ELEMENTS[sym].name,
      color: ELEMENTS[sym].color,
      pct: (m / total) * 100,
    }))
    .sort((a, b) => b.pct - a.pct);

  return { items, approximate };
}

// Ease-out count-up for assay numbers. Self-contained rAF with cleanup — does
// not touch the cave/map animation loops.
function useCountUp(target: number, active: boolean, durationMs = 900): number {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!active) { setVal(0); return; }
    let raf = 0;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      setVal(target * (1 - Math.pow(1 - t, 3)));
      if (t < 1) raf = requestAnimationFrame(step);
      else setVal(target);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, active, durationMs]);
  return val;
}

// ---- Chemical Analysis Lab (test phase) -----------------------------------

interface ChemLabProps {
  mineral: Mineral;
  tests: ChemTest[];
  testedSet: Set<number>;
  activeTest: number | null;
  selectedReagent: number | null;
  pourReagent: number | null;
  assayRevealed: boolean;
  purity: number;
  band: BandInfo | null;
  inclusions: InclusionType[];
  onSelectReagent: (i: number) => void;
  onPour: () => void;
  onContinue: () => void;
}

const PURITY_TIER = (p: number) =>
  p >= 90 ? '#f4e8b3' : p >= 75 ? '#d4af52' : p >= 50 ? '#d98e3c' : '#c0563c';

function ChemLab({
  mineral, tests, testedSet, activeTest, selectedReagent, pourReagent,
  assayRevealed, purity, band, inclusions, onSelectReagent, onPour, onContinue,
}: ChemLabProps) {
  const comp   = useMemo(() => getComposition(mineral.formula), [mineral.formula]);
  const reveal = useCountUp(1, assayRevealed, 1000);          // 0 → 1 ramp
  const pouring   = pourReagent !== null;
  const pourTest  = pourReagent !== null ? tests[pourReagent] : null;
  const resultTest = activeTest !== null ? tests[activeTest] : null;

  const ARC = Math.PI * 50; // semicircle circumference for r=50
  // Acid-test variance is driven by the purity band (blueprint 1.3).
  const bandColor = band?.color ?? PURITY_TIER(purity);
  const bubbleN   = band ? Math.min(18, Math.max(3, Math.round(band.bubbleCount * 0.5))) : 6;

  return (
    <div className="lab-overlay" role="dialog" aria-label="Chemical analysis lab">
      <div className="lab-panel">
        <header className="lab-head">
          <span className="lab-eyebrow">⚗ Field Assay</span>
          <h2 className="lab-title">{mineral.name}</h2>
          <span className="lab-formula">{mineral.formula}</span>
        </header>

        <div className="lab-body">
          {/* --- Stage: specimen + reagents -------------------------------- */}
          <section className="lab-stage">
            <button
              type="button"
              className={`lab-specimen-btn${selectedReagent !== null && !pouring ? ' lab-armed' : ''}`}
              onClick={onPour}
              aria-label={selectedReagent !== null ? 'Pour reagent on specimen' : 'Specimen'}
            >
              {pouring && pourTest && (
                <span
                  className="lab-pour-stream"
                  style={{ '--rc': pourTest.solutionColor, '--ms': `${band?.reactionMs ?? 1600}ms` } as CSSProperties}
                />
              )}
              <span
                className={`lab-specimen${pouring && pourTest ? ` lab-react-${pourTest.reaction}` : ''}`}
                style={{ '--mc': mineral.color } as CSSProperties}
              >
                {/* Purity solution: lower grades cloud the specimen during the reaction */}
                {pouring && band && (
                  <span
                    className="lab-solution"
                    style={{ background: band.solutionColor, opacity: band.cloudiness }}
                  />
                )}
                {pouring && pourTest && pourTest.reaction !== 'none' && (
                  <span className="lab-bubbles" style={{ '--rc': band?.solutionColor ?? pourTest.solutionColor } as CSSProperties}>
                    {Array.from({ length: bubbleN }, (_, b) => (
                      <span
                        key={b}
                        className="lab-bubble"
                        style={{
                          left: `${10 + (b * 80 / Math.max(1, bubbleN - 1))}%`,
                          animationDelay: `${(b % 6) * 0.13}s`,
                        }}
                      />
                    ))}
                  </span>
                )}
              </span>
              <span className="lab-stage-hint">
                {pouring ? 'Reacting…'
                  : selectedReagent !== null ? 'Tap specimen to pour'
                  : 'Select a reagent below'}
              </span>
            </button>

            <div className="lab-shelf">
              {tests.map((t, i) => (
                <button
                  key={i}
                  type="button"
                  className={`lab-bottle${selectedReagent === i ? ' lab-bottle-armed' : ''}${testedSet.has(i) ? ' lab-bottle-done' : ''}`}
                  style={{ '--rc': t.solutionColor === 'transparent' ? '#9bb0c4' : t.solutionColor } as CSSProperties}
                  onClick={() => onSelectReagent(i)}
                  disabled={pouring}
                >
                  <span className="lab-bottle-icon" aria-hidden="true" />
                  <span className="lab-bottle-name">{t.reagent}</span>
                </button>
              ))}
            </div>

            <div className="lab-progress" aria-hidden="true">
              {tests.map((_, i) => (
                <span key={i} className={`lab-dot${testedSet.has(i) ? ' lab-dot-done' : ''}`} />
              ))}
            </div>
          </section>

          {/* --- Assay report --------------------------------------------- */}
          <section className={`lab-report${assayRevealed ? ' lab-report-live' : ''}`}>
            <span className="lab-report-label">Assay Report</span>

            {!assayRevealed ? (
              <div className="lab-report-pending">Run a test to reveal analysis</div>
            ) : (
              <>
                <div className="lab-gauge">
                  <svg viewBox="0 0 120 72" className="lab-gauge-svg">
                    <path d="M10,62 A50,50 0 0 1 110,62" className="lab-gauge-track" />
                    <path
                      d="M10,62 A50,50 0 0 1 110,62"
                      className="lab-gauge-fill"
                      style={{
                        stroke: bandColor,
                        strokeDasharray: ARC,
                        strokeDashoffset: ARC * (1 - reveal * (purity / 100)),
                      }}
                    />
                  </svg>
                  <div className="lab-gauge-num" style={{ color: bandColor }}>
                    {Math.round(purity * reveal)}<span className="lab-gauge-pct">%</span>
                  </div>
                  <div className="lab-gauge-cap">Specimen Purity</div>
                  {band && <div className="lab-band" style={{ color: band.color }}>{band.label}</div>}
                </div>

                <div className="lab-comp">
                  <div className="lab-comp-head">
                    Composition{comp?.approximate ? ' (approx.)' : ''}
                  </div>
                  {comp ? comp.items.map(item => (
                    <div key={item.symbol} className="lab-comp-row">
                      <span className="lab-comp-chip" style={{ background: item.color }}>{item.symbol}</span>
                      <span className="lab-comp-name">{item.name}</span>
                      <span className="lab-comp-bar">
                        <span
                          className="lab-comp-fill"
                          style={{ width: `${item.pct * reveal}%`, background: item.color }}
                        />
                      </span>
                      <span className="lab-comp-pct">{(item.pct * reveal).toFixed(1)}%</span>
                    </div>
                  )) : (
                    <div className="lab-comp-na">Complex composition — field analysis only.</div>
                  )}
                </div>

                <div className="lab-inclusions">
                  <div className="lab-comp-head">Inclusions</div>
                  {inclusions.length > 0 ? (
                    <div className="lab-incl-tags">
                      {inclusions.map((inc, i) => (
                        <span key={i} className="lab-incl-tag">{INCLUSION_LABELS[inc]}</span>
                      ))}
                    </div>
                  ) : (
                    <div className="lab-incl-none">None detected — flawless</div>
                  )}
                </div>
              </>
            )}
          </section>
        </div>

        {/* --- Reaction result card ---------------------------------------- */}
        {resultTest && (
          <div className="lab-result" key={activeTest ?? -1}>
            <span className="lab-result-reagent" style={{ color: PURITY_TIER(70) }}>{resultTest.reagent}</span>
            <code className="lab-result-eq">{resultTest.equation}</code>
            <p className="lab-result-desc">{resultTest.result}</p>
          </div>
        )}

        {testedSet.size > 0 && (
          <button type="button" className="lab-continue" onClick={onContinue}>
            View Specimen Info →
          </button>
        )}
      </div>
    </div>
  );
}

// ---- Canvas helpers -------------------------------------------------------

function traceBlobPath(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, rx: number, ry: number,
  blob: [number, number][]
) {
  const n = blob.length;
  const bsx = (blob[n - 1][0] + blob[0][0]) / 2;
  const bsy = (blob[n - 1][1] + blob[0][1]) / 2;
  ctx.beginPath();
  ctx.moveTo(cx + bsx * rx, cy + bsy * ry);
  for (let i = 0; i < n; i++) {
    const [px, py] = blob[i];
    const [nx, ny] = blob[(i + 1) % n];
    ctx.quadraticCurveTo(
      cx + px * rx, cy + py * ry,
      cx + (px + nx) / 2 * rx, cy + (py + ny) / 2 * ry
    );
  }
  ctx.closePath();
}

// ---- Geological ore renderers --------------------------------------------

function oreStyle(m: Mineral): string {
  if (m.habit === 'nativeMass') return 'vein';
  if ((m.habit === 'cube' || m.habit === 'dodecahedron') && m.metalness > 0.5) return 'cubicMetal';
  if (m.habit === 'octahedron') return 'octahedral';
  if (m.habit === 'hexPrism' || m.habit === 'prismTrig' || m.habit === 'prismSquare') return 'prismatic';
  if (m.habit === 'cluster') return 'botryoidal';
  if (m.habit === 'bipyramid') return 'bipyramid';
  return 'generic';
}

function drawVeinOre(
  ctx: CanvasRenderingContext2D,
  dep: CaveDeposit, cx: number, cy: number, rx: number, ry: number
) {
  const [cr, cg, cb] = hexToRgb(dep.mineral.color);
  ctx.save();
  traceBlobPath(ctx, cx + 2, cy + 4, rx * 1.14, ry * 1.14, dep.blob);
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 14;
  ctx.fill(); ctx.shadowBlur = 0; ctx.restore();

  // Dark granite/schist matrix
  ctx.save();
  traceBlobPath(ctx, cx, cy, rx, ry, dep.blob);
  const mGrd = ctx.createRadialGradient(cx - rx*0.2, cy - ry*0.2, 0, cx, cy, Math.max(rx, ry));
  mGrd.addColorStop(0, '#2e2820'); mGrd.addColorStop(0.6, '#1e1810'); mGrd.addColorStop(1, '#110e08');
  ctx.fillStyle = mGrd; ctx.fill(); ctx.restore();

  // Quartz vein band
  const rng = seededRng(Math.floor(dep.cx * 3317 + dep.cy * 4441));
  ctx.save();
  traceBlobPath(ctx, cx, cy, rx, ry, dep.blob);
  ctx.clip();
  const vky = cy + (rng() - 0.5) * ry * 0.3;
  const veinW = ry * (0.32 + rng() * 0.18);
  ctx.lineWidth = veinW;
  ctx.strokeStyle = dep.mineral.id === 'gold' ? '#e5dbbf' : '#c2b99a';
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - rx * 0.8, cy - ry * (0.1 + rng() * 0.1));
  ctx.quadraticCurveTo(cx + (rng() - 0.5) * rx * 0.4, vky, cx + rx * 0.8, cy + ry * (0.05 + rng() * 0.1));
  ctx.stroke();
  ctx.restore();

  // Metal blobs/stringers within the vein
  ctx.save();
  traceBlobPath(ctx, cx, cy, rx, ry, dep.blob);
  ctx.clip();
  const mRng = seededRng(Math.floor(dep.cx * 7127 + dep.cy * 5381));
  const nBlobs = 4 + (mRng() * 6 | 0);
  for (let i = 0; i < nBlobs; i++) {
    const bx = cx + (mRng() - 0.5) * rx * 1.0;
    const by = cy + (mRng() - 0.5) * ry * 0.45 + (vky - cy) * 0.4;
    const br = (0.04 + mRng() * 0.10) * rx;
    const bg = ctx.createRadialGradient(bx - br*0.3, by - br*0.3, 0, bx, by, br * 1.5);
    bg.addColorStop(0, `rgb(${Math.min(255, cr+110)},${Math.min(255, cg+85)},${Math.min(255, cb+30)})`);
    bg.addColorStop(0.5, dep.mineral.color);
    bg.addColorStop(1, `rgb(${Math.max(0,cr-60)},${Math.max(0,cg-45)},${Math.max(0,cb-30)})`);
    ctx.beginPath();
    ctx.ellipse(bx, by, br * (0.7 + mRng()*0.7), br * (0.5 + mRng()*0.5), mRng() * Math.PI, 0, Math.PI*2);
    ctx.fillStyle = bg; ctx.fill();
  }
  // Bright specular flecks
  const fRng = seededRng(Math.floor(dep.cx * 9001 + dep.cy * 6173));
  for (let i = 0; i < 8; i++) {
    const fx = cx + (fRng() - 0.5) * rx * 0.85;
    const fy = cy + (fRng() - 0.5) * ry * 0.4 + (vky - cy) * 0.35;
    ctx.beginPath();
    ctx.arc(fx, fy, 1.2 + fRng() * 2.5, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,220,${0.5 + fRng() * 0.45})`; ctx.fill();
  }
  ctx.restore();

  ctx.save(); traceBlobPath(ctx, cx, cy, rx, ry, dep.blob);
  ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.restore();
}

function drawCubicMetalOre(
  ctx: CanvasRenderingContext2D,
  dep: CaveDeposit, cx: number, cy: number, rx: number, ry: number
) {
  const [cr, cg, cb] = hexToRgb(dep.mineral.color);
  const isPyrite = dep.mineral.id === 'pyrite';

  ctx.save();
  traceBlobPath(ctx, cx + 2, cy + 4, rx * 1.14, ry * 1.14, dep.blob);
  ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.shadowBlur = 12; ctx.fill(); ctx.shadowBlur = 0; ctx.restore();

  ctx.save(); traceBlobPath(ctx, cx, cy, rx, ry, dep.blob);
  ctx.fillStyle = '#1a1510'; ctx.fill(); ctx.restore();

  ctx.save(); traceBlobPath(ctx, cx, cy, rx, ry, dep.blob); ctx.clip();
  const rng = seededRng(Math.floor(dep.cx * 3137 + dep.cy * 5623));
  const cubes = [
    { ox: -rx * 0.22, oy: ry * 0.04, sz: ry * 0.40 },
    { ox:  rx * 0.26, oy: -ry * 0.06, sz: ry * 0.30 },
    { ox:  rx * 0.02, oy:  ry * 0.28, sz: ry * 0.22 },
  ];
  cubes.forEach(({ ox, oy, sz }) => {
    const bx = cx + ox + (rng() - 0.5) * rx * 0.10;
    const by = cy + oy + (rng() - 0.5) * ry * 0.10;
    const hiC = `rgb(${Math.min(255,cr+100)},${Math.min(255,cg+80)},${Math.min(255,cb+45)})`;
    const mdC = dep.mineral.color;
    const loC = `rgb(${Math.max(0,cr-75)},${Math.max(0,cg-60)},${Math.max(0,cb-40)})`;
    // Top face
    ctx.beginPath(); ctx.moveTo(bx, by - sz); ctx.lineTo(bx + sz*0.87, by - sz*0.5);
    ctx.lineTo(bx, by); ctx.lineTo(bx - sz*0.87, by - sz*0.5); ctx.closePath();
    ctx.fillStyle = hiC; ctx.fill();
    // Right face
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + sz*0.87, by - sz*0.5);
    ctx.lineTo(bx + sz*0.87, by + sz*0.5); ctx.lineTo(bx, by + sz); ctx.closePath();
    ctx.fillStyle = mdC; ctx.fill();
    // Left face
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx - sz*0.87, by - sz*0.5);
    ctx.lineTo(bx - sz*0.87, by + sz*0.5); ctx.lineTo(bx, by + sz); ctx.closePath();
    ctx.fillStyle = loC; ctx.fill();
    // Edges
    ctx.strokeStyle = `rgba(${Math.min(255,cr+130)},${Math.min(255,cg+110)},${Math.min(255,cb+70)},0.55)`;
    ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(bx, by - sz); ctx.lineTo(bx + sz*0.87, by - sz*0.5);
    ctx.lineTo(bx, by); ctx.lineTo(bx - sz*0.87, by - sz*0.5); ctx.closePath(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx, by + sz); ctx.stroke();
    // Pyrite striations
    if (isPyrite) {
      ctx.save(); ctx.globalAlpha = 0.2; ctx.strokeStyle = '#fff8cc'; ctx.lineWidth = 0.4;
      for (let s = -2; s <= 2; s++) {
        ctx.beginPath(); ctx.moveTo(bx + sz*0.05, by + s*sz*0.22);
        ctx.lineTo(bx + sz*0.82, by + s*sz*0.22 - sz*0.26); ctx.stroke();
      }
      ctx.restore();
    }
  });
  ctx.restore();
  ctx.save(); traceBlobPath(ctx, cx, cy, rx, ry, dep.blob);
  ctx.strokeStyle = 'rgba(255,255,255,0.14)'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.restore();
}

function drawOctahedralOre(
  ctx: CanvasRenderingContext2D,
  dep: CaveDeposit, cx: number, cy: number, rx: number, ry: number
) {
  const isDiamond = dep.mineral.id === 'diamond';
  const [cr, cg, cb] = hexToRgb(dep.mineral.color);

  ctx.save();
  traceBlobPath(ctx, cx + 2, cy + 4, rx * 1.14, ry * 1.14, dep.blob);
  ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 14; ctx.fill(); ctx.shadowBlur = 0; ctx.restore();

  ctx.save(); traceBlobPath(ctx, cx, cy, rx, ry, dep.blob);
  const matGrd = ctx.createRadialGradient(cx, cy - ry*0.3, 0, cx, cy, Math.max(rx, ry));
  if (isDiamond) { matGrd.addColorStop(0, '#2e2a38'); matGrd.addColorStop(1, '#161220'); }
  else { matGrd.addColorStop(0, '#242424'); matGrd.addColorStop(1, '#111111'); }
  ctx.fillStyle = matGrd; ctx.fill(); ctx.restore();

  ctx.save(); traceBlobPath(ctx, cx, cy, rx, ry, dep.blob); ctx.clip();
  const csz = Math.min(rx, ry) * 0.72;
  const upFill = isDiamond
    ? `rgba(${Math.min(255,cr+80)},${Math.min(255,cg+80)},${Math.min(255,cb+80)},0.88)`
    : `rgb(${Math.min(255,cr+65)},${Math.min(255,cg+65)},${Math.min(255,cb+65)})`;
  const dnFill = isDiamond
    ? `rgba(${Math.max(0,cr-20)},${Math.max(0,cg-20)},${Math.max(0,cb-15)},0.75)`
    : `rgb(${Math.max(0,cr-55)},${Math.max(0,cg-55)},${Math.max(0,cb-55)})`;
  // Upper half
  ctx.beginPath(); ctx.moveTo(cx, cy - csz); ctx.lineTo(cx + csz*0.78, cy);
  ctx.lineTo(cx, cy); ctx.lineTo(cx - csz*0.78, cy); ctx.closePath();
  ctx.fillStyle = upFill; ctx.fill();
  // Lower half
  ctx.beginPath(); ctx.moveTo(cx, cy + csz); ctx.lineTo(cx + csz*0.78, cy);
  ctx.lineTo(cx, cy); ctx.lineTo(cx - csz*0.78, cy); ctx.closePath();
  ctx.fillStyle = dnFill; ctx.fill();
  // Middle ridge
  ctx.beginPath(); ctx.moveTo(cx - csz*0.78, cy); ctx.lineTo(cx + csz*0.78, cy);
  ctx.strokeStyle = isDiamond ? 'rgba(255,255,255,0.75)' : `rgba(${Math.min(255,cr+110)},${Math.min(255,cg+110)},${Math.min(255,cb+110)},0.5)`;
  ctx.lineWidth = 1.3; ctx.stroke();
  // Outer edges
  ctx.strokeStyle = isDiamond ? 'rgba(200,220,255,0.45)' : `rgba(${Math.min(255,cr+80)},${Math.min(255,cg+80)},${Math.min(255,cb+80)},0.35)`;
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(cx, cy - csz); ctx.lineTo(cx + csz*0.78, cy); ctx.lineTo(cx, cy + csz);
  ctx.moveTo(cx, cy - csz); ctx.lineTo(cx - csz*0.78, cy); ctx.lineTo(cx, cy + csz);
  ctx.stroke();
  // Diamond: spectral fire
  if (isDiamond) {
    const fireGrd = ctx.createLinearGradient(cx - csz*0.5, cy - csz*0.5, cx + csz*0.5, cy + csz*0.5);
    fireGrd.addColorStop(0, 'rgba(255,50,50,0.2)'); fireGrd.addColorStop(0.25, 'rgba(255,200,50,0.16)');
    fireGrd.addColorStop(0.5, 'rgba(50,200,255,0.16)'); fireGrd.addColorStop(0.75, 'rgba(180,50,255,0.16)');
    fireGrd.addColorStop(1, 'rgba(255,50,50,0.14)');
    ctx.fillStyle = fireGrd;
    ctx.beginPath(); ctx.moveTo(cx, cy - csz); ctx.lineTo(cx + csz*0.78, cy);
    ctx.lineTo(cx, cy + csz); ctx.lineTo(cx - csz*0.78, cy); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
  ctx.save(); traceBlobPath(ctx, cx, cy, rx, ry, dep.blob);
  ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.restore();
}

function drawPrismaticCluster(
  ctx: CanvasRenderingContext2D,
  dep: CaveDeposit, cx: number, cy: number, rx: number, ry: number
) {
  const [cr, cg, cb] = hexToRgb(dep.mineral.color);

  ctx.save();
  traceBlobPath(ctx, cx + 2, cy + 4, rx * 1.14, ry * 1.14, dep.blob);
  ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.shadowBlur = 12; ctx.fill(); ctx.shadowBlur = 0; ctx.restore();
  ctx.save(); traceBlobPath(ctx, cx, cy, rx, ry, dep.blob); ctx.fillStyle = '#1c1510'; ctx.fill(); ctx.restore();

  ctx.save(); traceBlobPath(ctx, cx, cy, rx, ry, dep.blob); ctx.clip();
  const rng = seededRng(Math.floor(dep.cx * 4937 + dep.cy * 3821));
  const nPrisms = 3 + (rng() * 4 | 0);

  // Build prism list sorted large→small (back to front)
  const prisms: {bx:number;by:number;w:number;h:number;tilt:number}[] = [];
  for (let i = 0; i < nPrisms; i++) {
    const t = (i + 0.5) / nPrisms;
    prisms.push({
      bx: cx + (t - 0.5) * rx * 1.55 + (rng() - 0.5) * rx * 0.2,
      by: cy + ry * (0.52 + rng() * 0.28),
      w:  rx * (0.12 + rng() * 0.10),
      h:  ry * (0.58 + rng() * 0.65),
      tilt: (rng() - 0.5) * 0.22,
    });
  }
  prisms.sort((a, b) => b.h - a.h);

  prisms.forEach(({ bx, by, w, h, tilt }) => {
    const tx = bx + Math.sin(tilt) * h;
    const ty = by - h;
    // Prism body gradient (left dark, centre bright, right medium)
    const lFill = ctx.createLinearGradient(bx - w, ty, bx + w, ty);
    lFill.addColorStop(0, `rgb(${Math.max(0,cr-65)},${Math.max(0,cg-55)},${Math.max(0,cb-40)})`);
    lFill.addColorStop(0.38, dep.mineral.color);
    lFill.addColorStop(0.62, `rgb(${Math.min(255,cr+90)},${Math.min(255,cg+80)},${Math.min(255,cb+65)})`);
    lFill.addColorStop(1, `rgb(${Math.max(0,cr-38)},${Math.max(0,cg-28)},${Math.max(0,cb-18)})`);
    ctx.beginPath(); ctx.moveTo(bx - w, by); ctx.lineTo(bx + w, by);
    ctx.lineTo(tx + w*0.7, ty); ctx.lineTo(tx - w*0.7, ty); ctx.closePath();
    ctx.fillStyle = lFill; ctx.fill();
    // Pyramid tip
    if (dep.mineral.habit !== 'hexPrism' || dep.mineral.termination !== 'flat') {
      const tipH = h * 0.26;
      ctx.beginPath(); ctx.moveTo(tx - w*0.7, ty); ctx.lineTo(tx + w*0.7, ty);
      ctx.lineTo(tx, ty - tipH); ctx.closePath();
      const tipGrd = ctx.createLinearGradient(tx - w*0.7, ty, tx, ty - tipH);
      tipGrd.addColorStop(0, `rgb(${Math.min(255,cr+65)},${Math.min(255,cg+65)},${Math.min(255,cb+55)})`);
      tipGrd.addColorStop(1, `rgb(${Math.min(255,cr+115)},${Math.min(255,cg+105)},${Math.min(255,cb+95)})`);
      ctx.fillStyle = tipGrd; ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 0.6; ctx.stroke();
    }
    // Internal refraction streak
    const refX = tx + w * 0.22;
    const refGrd = ctx.createLinearGradient(refX, ty, refX + w*0.1, by);
    refGrd.addColorStop(0, 'rgba(255,255,255,0.38)');
    refGrd.addColorStop(0.55, 'rgba(255,255,255,0.08)'); refGrd.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = refGrd;
    ctx.beginPath(); ctx.moveTo(refX - w*0.05, ty); ctx.lineTo(refX + w*0.16, ty);
    ctx.lineTo(refX + w*0.13, by); ctx.lineTo(refX - w*0.08, by); ctx.closePath(); ctx.fill();
    // Edge lines
    ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(bx - w, by); ctx.lineTo(tx - w*0.7, ty);
    ctx.moveTo(bx + w, by); ctx.lineTo(tx + w*0.7, ty); ctx.stroke();
    // Striations
    if (dep.mineral.surface === 'striated') {
      ctx.save(); ctx.globalAlpha = 0.14; ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 0.4;
      const nStr = Math.floor(h / (ry * 0.09));
      for (let s = 1; s < nStr; s++) {
        const sy = by - (s / nStr) * h;
        const prog = s / nStr;
        const wAt = w + w*0.3*(1 - prog);
        ctx.beginPath(); ctx.moveTo(bx - wAt, sy); ctx.lineTo(bx + wAt, sy); ctx.stroke();
      }
      ctx.restore();
    }
  });
  ctx.restore();
  ctx.save(); traceBlobPath(ctx, cx, cy, rx, ry, dep.blob);
  ctx.strokeStyle = 'rgba(255,255,255,0.10)'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.restore();
}

function drawBotryoidalOre(
  ctx: CanvasRenderingContext2D,
  dep: CaveDeposit, cx: number, cy: number, rx: number, ry: number
) {
  const [cr, cg, cb] = hexToRgb(dep.mineral.color);
  const isBanded = dep.mineral.surface === 'banded';
  const bandColors = dep.mineral.bandColors ?? [dep.mineral.color, dep.mineral.color, dep.mineral.color];

  ctx.save();
  traceBlobPath(ctx, cx + 2, cy + 4, rx * 1.14, ry * 1.14, dep.blob);
  ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.shadowBlur = 12; ctx.fill(); ctx.shadowBlur = 0; ctx.restore();
  ctx.save(); traceBlobPath(ctx, cx, cy, rx, ry, dep.blob); ctx.fillStyle = '#18130e'; ctx.fill(); ctx.restore();

  ctx.save(); traceBlobPath(ctx, cx, cy, rx, ry, dep.blob); ctx.clip();
  const rng = seededRng(Math.floor(dep.cx * 5591 + dep.cy * 4703));
  const nBumps = 6 + (rng() * 5 | 0);
  for (let i = 0; i < nBumps; i++) {
    const bx = cx + (rng() - 0.5) * rx * 1.25;
    const by = cy + (rng() - 0.5) * ry * 1.1;
    const br = (0.17 + rng() * 0.26) * Math.min(rx, ry);
    const bGrd = ctx.createRadialGradient(bx - br*0.35, by - br*0.35, 0, bx, by, br * 1.2);
    bGrd.addColorStop(0, `rgb(${Math.min(255,cr+95)},${Math.min(255,cg+75)},${Math.min(255,cb+60)})`);
    bGrd.addColorStop(0.5, dep.mineral.color);
    bGrd.addColorStop(1, `rgb(${Math.max(0,cr-75)},${Math.max(0,cg-60)},${Math.max(0,cb-48)})`);
    ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2);
    ctx.fillStyle = bGrd; ctx.fill();
    if (isBanded) {
      const nBands = 3 + (rng() * 3 | 0);
      for (let b = nBands; b > 0; b--) {
        ctx.beginPath();
        ctx.arc(bx, by, br * (b / nBands) * 0.88, 0, Math.PI * 2);
        ctx.strokeStyle = bandColors[b % bandColors.length];
        ctx.lineWidth = br * 0.11; ctx.stroke();
      }
    }
  }
  ctx.restore();
  ctx.save(); traceBlobPath(ctx, cx, cy, rx, ry, dep.blob);
  ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.restore();
}

function drawBipyramidOre(
  ctx: CanvasRenderingContext2D,
  dep: CaveDeposit, cx: number, cy: number, rx: number, ry: number
) {
  const [cr, cg, cb] = hexToRgb(dep.mineral.color);
  const isGem = dep.mineral.transmission > 0.3;

  ctx.save();
  traceBlobPath(ctx, cx + 2, cy + 4, rx * 1.14, ry * 1.14, dep.blob);
  ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.shadowBlur = 12; ctx.fill(); ctx.shadowBlur = 0; ctx.restore();
  ctx.save(); traceBlobPath(ctx, cx, cy, rx, ry, dep.blob); ctx.fillStyle = '#1a1310'; ctx.fill(); ctx.restore();

  ctx.save(); traceBlobPath(ctx, cx, cy, rx, ry, dep.blob); ctx.clip();
  const w = rx * 0.56, h = ry * 0.76;
  // Upper half
  const upGrd = ctx.createLinearGradient(cx - w, cy, cx + w, cy - h*0.7);
  upGrd.addColorStop(0, `rgb(${Math.max(0,cr-55)},${Math.max(0,cg-45)},${Math.max(0,cb-32)})`);
  upGrd.addColorStop(0.4, dep.mineral.color);
  upGrd.addColorStop(1, `rgb(${Math.min(255,cr+95)},${Math.min(255,cg+80)},${Math.min(255,cb+65)})`);
  ctx.beginPath(); ctx.moveTo(cx, cy - h); ctx.lineTo(cx + w, cy); ctx.lineTo(cx, cy); ctx.lineTo(cx - w, cy); ctx.closePath();
  ctx.fillStyle = upGrd; ctx.fill();
  // Lower half
  const dnGrd = ctx.createLinearGradient(cx, cy, cx, cy + h*0.7);
  dnGrd.addColorStop(0, dep.mineral.color);
  dnGrd.addColorStop(1, `rgb(${Math.max(0,cr-85)},${Math.max(0,cg-68)},${Math.max(0,cb-52)})`);
  ctx.beginPath(); ctx.moveTo(cx + w, cy); ctx.lineTo(cx, cy + h); ctx.lineTo(cx - w, cy); ctx.closePath();
  ctx.fillStyle = dnGrd; ctx.fill();
  // Middle highlight
  ctx.beginPath(); ctx.moveTo(cx - w, cy); ctx.lineTo(cx + w, cy);
  ctx.strokeStyle = isGem ? 'rgba(255,255,255,0.58)' : `rgba(${Math.min(255,cr+80)},${Math.min(255,cg+80)},${Math.min(255,cb+80)},0.42)`;
  ctx.lineWidth = 1.5; ctx.stroke();
  if (isGem) {
    const glowGrd = ctx.createRadialGradient(cx - w*0.2, cy - h*0.3, 0, cx, cy, Math.max(w,h)*0.9);
    glowGrd.addColorStop(0, `rgba(${Math.min(255,cr+125)},${Math.min(255,cg+125)},${Math.min(255,cb+125)},0.32)`);
    glowGrd.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = glowGrd;
    ctx.beginPath(); ctx.moveTo(cx, cy-h); ctx.lineTo(cx+w, cy); ctx.lineTo(cx, cy+h); ctx.lineTo(cx-w, cy); ctx.closePath(); ctx.fill();
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(cx, cy-h); ctx.lineTo(cx+w, cy); ctx.moveTo(cx, cy-h); ctx.lineTo(cx-w, cy);
  ctx.moveTo(cx, cy+h); ctx.lineTo(cx+w, cy); ctx.moveTo(cx, cy+h); ctx.lineTo(cx-w, cy);
  ctx.stroke();
  ctx.restore();
  ctx.save(); traceBlobPath(ctx, cx, cy, rx, ry, dep.blob);
  ctx.strokeStyle = 'rgba(255,255,255,0.10)'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.restore();
}

function drawGenericOre(
  ctx: CanvasRenderingContext2D,
  dep: CaveDeposit, cx: number, cy: number, rx: number, ry: number, frame: number
) {
  const [cr, cg, cb] = hexToRgb(dep.mineral.color);
  const hiCol = `rgb(${Math.min(255,cr+85)},${Math.min(255,cg+65)},${Math.min(255,cb+45)})`;
  const loCol = `rgb(${Math.max(0,cr-65)},${Math.max(0,cg-45)},${Math.max(0,cb-35)})`;

  ctx.save();
  traceBlobPath(ctx, cx + 2, cy + 4, rx * 1.14, ry * 1.14, dep.blob);
  ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.shadowColor = 'rgba(0,0,0,0.95)'; ctx.shadowBlur = 12;
  ctx.fill(); ctx.shadowBlur = 0; ctx.restore();

  ctx.save(); traceBlobPath(ctx, cx, cy, rx, ry, dep.blob);
  const grd = ctx.createRadialGradient(cx - rx*0.28, cy - ry*0.32, 0, cx, cy, Math.max(rx, ry));
  grd.addColorStop(0, hiCol); grd.addColorStop(0.48, dep.mineral.color); grd.addColorStop(1, loCol);
  ctx.fillStyle = grd; ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.restore();

  if (dep.mineral.metalness > 0.5) {
    ctx.save(); traceBlobPath(ctx, cx, cy, rx, ry, dep.blob); ctx.clip();
    const sheen = ctx.createLinearGradient(cx - rx, cy - ry*0.18, cx + rx, cy + ry*0.18);
    sheen.addColorStop(0, 'rgba(255,255,255,0)'); sheen.addColorStop(0.5, 'rgba(255,255,255,0.32)');
    sheen.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sheen; ctx.fillRect(cx - rx, cy - ry, rx * 2, ry * 2); ctx.restore();
  }
  if (dep.mineral.luster === 'Adamantine') {
    const rc = ['#ff4444','#ff9933','#ffee22','#33dd55','#3399ff','#9944ff'];
    ctx.save(); traceBlobPath(ctx, cx, cy, rx * 1.15, ry * 1.15, dep.blob); ctx.clip();
    ctx.globalAlpha = 0.18; ctx.lineWidth = 3;
    rc.forEach((col, i) => {
      const ang = (i / rc.length) * Math.PI * 2 + frame * 0.012;
      ctx.strokeStyle = col; ctx.beginPath(); ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(ang)*rx*1.1, cy + Math.sin(ang)*ry*1.1); ctx.stroke();
    });
    ctx.restore();
  }
  ctx.save(); traceBlobPath(ctx, cx, cy, rx, ry, dep.blob); ctx.clip();
  const spec = ctx.createRadialGradient(cx - rx*0.32, cy - ry*0.38, 0, cx - rx*0.1, cy - ry*0.1, rx*0.7);
  spec.addColorStop(0, 'rgba(255,255,255,0.55)'); spec.addColorStop(0.3, 'rgba(255,255,255,0.12)');
  spec.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = spec;
  ctx.fillRect(cx - rx, cy - ry, rx * 2, ry * 2); ctx.restore();
}

function drawOreBody(
  ctx: CanvasRenderingContext2D,
  dep: CaveDeposit, cx: number, cy: number, rx: number, ry: number, frame: number
) {
  switch (oreStyle(dep.mineral)) {
    case 'vein':       return drawVeinOre(ctx, dep, cx, cy, rx, ry);
    case 'cubicMetal': return drawCubicMetalOre(ctx, dep, cx, cy, rx, ry);
    case 'octahedral': return drawOctahedralOre(ctx, dep, cx, cy, rx, ry);
    case 'prismatic':  return drawPrismaticCluster(ctx, dep, cx, cy, rx, ry);
    case 'botryoidal': return drawBotryoidalOre(ctx, dep, cx, cy, rx, ry);
    case 'bipyramid':  return drawBipyramidOre(ctx, dep, cx, cy, rx, ry);
    default:           return drawGenericOre(ctx, dep, cx, cy, rx, ry, frame);
  }
}

// ---- Cave background ------------------------------------------------------

function drawCaveBackground(ctx: CanvasRenderingContext2D, w: number, h: number, frame: number) {
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0,    '#0d0a06');
  bg.addColorStop(0.12, '#1d1610');
  bg.addColorStop(0.3,  '#2a1f14');
  bg.addColorStop(0.62, '#311e12');
  bg.addColorStop(0.86, '#251508');
  bg.addColorStop(1,    '#180e06');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Rock strata
  for (let i = 0; i < 6; i++) {
    const y = h * (0.18 + i * 0.12);
    ctx.fillStyle = `rgba(${170 + i * 8},${100 + i * 6},${50 + i * 4},${0.035 + i * 0.008})`;
    ctx.fillRect(0, y, w, 1 + (i % 2) * 2);
  }

  // Stalactites
  STALS.forEach(s => {
    const sx = s.x * w, sw = s.w * w, sh = s.h * h;
    const v = (s.shade * 28) | 0;
    ctx.beginPath();
    ctx.moveTo(sx - sw / 2, 0);
    ctx.lineTo(sx + sw / 2, 0);
    ctx.lineTo(sx + sw * 0.12, sh * 0.84);
    ctx.lineTo(sx, sh);
    ctx.lineTo(sx - sw * 0.12, sh * 0.84);
    ctx.closePath();
    ctx.fillStyle = `rgb(${10 + v},${7 + ((v * 2 / 3) | 0)},${4 + ((v / 2) | 0)})`;
    ctx.fill();
    ctx.strokeStyle = 'rgba(217,142,60,0.10)';
    ctx.lineWidth = 0.5;
    ctx.stroke();
  });

  // Ceiling darkening
  const ceil = ctx.createLinearGradient(0, 0, 0, h * 0.20);
  ceil.addColorStop(0, 'rgba(0,0,0,0.90)');
  ceil.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = ceil;
  ctx.fillRect(0, 0, w, h * 0.20);

  // Perspective floor
  ctx.beginPath();
  ctx.moveTo(-w * 0.05, h);
  ctx.lineTo(w * 1.05, h);
  ctx.lineTo(w * 0.63, h * 0.78);
  ctx.lineTo(w * 0.37, h * 0.78);
  ctx.closePath();
  const fg = ctx.createLinearGradient(0, h * 0.78, 0, h);
  fg.addColorStop(0, '#180e06');
  fg.addColorStop(1, '#0c0704');
  ctx.fillStyle = fg;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(w * 0.37, h * 0.78);
  ctx.lineTo(w * 0.63, h * 0.78);
  ctx.strokeStyle = 'rgba(217,142,60,0.10)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Side vignettes
  const vL = ctx.createLinearGradient(0, 0, w * 0.22, 0);
  vL.addColorStop(0, 'rgba(0,0,0,0.72)');
  vL.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = vL;
  ctx.fillRect(0, 0, w, h);

  const vR = ctx.createLinearGradient(w, 0, w * 0.78, 0);
  vR.addColorStop(0, 'rgba(0,0,0,0.72)');
  vR.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = vR;
  ctx.fillRect(0, 0, w, h);

  // Flickering torch glow — drifts slowly and pulses, so the cave is
  // visibly alive every frame instead of a static painted scene.
  const t       = frame * 0.02;
  const flicker = 0.78 + 0.22 * Math.sin(frame * 0.27) * Math.sin(frame * 0.11);
  const torchX  = w * (0.5 + 0.18 * Math.sin(t * 0.6));
  const torchY  = h * (0.34 + 0.05 * Math.sin(t * 0.9));
  const torchR  = Math.max(w, h) * (0.55 + 0.05 * Math.sin(frame * 0.05));
  const torch   = ctx.createRadialGradient(torchX, torchY, 0, torchX, torchY, torchR);
  torch.addColorStop(0,   `rgba(255,176,84,${(0.16 * flicker).toFixed(3)})`);
  torch.addColorStop(0.5, `rgba(217,142,60,${(0.06 * flicker).toFixed(3)})`);
  torch.addColorStop(1,   'rgba(0,0,0,0)');
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = torch;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();

  // Drifting dust motes catching the torchlight.
  ctx.save();
  for (let i = 0; i < 22; i++) {
    const seed = i * 12.9898;
    const baseX = ((Math.sin(seed) * 43758.5453) % 1 + 1) % 1;
    const baseY = ((Math.sin(seed * 1.7) * 24634.6345) % 1 + 1) % 1;
    const speed = 0.15 + (i % 5) * 0.06;
    const mx = (baseX + Math.sin(frame * 0.004 * speed + i) * 0.04) * w;
    const my = ((baseY + frame * 0.0006 * speed) % 1) * h;
    const tw = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(frame * 0.06 + i * 2.1));
    ctx.beginPath();
    ctx.arc(mx, my, 0.7 + (i % 3) * 0.5, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,224,170,${(0.12 * tw).toFixed(3)})`;
    ctx.fill();
  }
  ctx.restore();
}

// ---- Deposit rendering ----------------------------------------------------

function drawDeposits(
  ctx: CanvasRenderingContext2D, w: number, h: number,
  deposits: CaveDeposit[], frame: number
) {
  deposits.forEach(dep => {
    const cx = dep.cx * w, cy = dep.cy * h;
    const rx = dep.rx * w, ry = dep.ry * h;

    if (dep.extracted) {
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx * 0.9, ry * 0.9, 0, 0, Math.PI * 2);
      const eg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(rx, ry));
      eg.addColorStop(0, 'rgba(0,0,0,0.80)');
      eg.addColorStop(1, 'rgba(0,0,0,0.15)');
      ctx.fillStyle = eg;
      ctx.fill();
      return;
    }

    // Geological ore body rendering
    const [cr, cg, cb] = hexToRgb(dep.mineral.color);
    drawOreBody(ctx, dep, cx, cy, rx, ry, frame);

    // Intrinsic inclusions over the ore face (stable per deposit).
    drawInclusions(ctx, dep.inclusions, cx, cy, rx, ry,
      Math.floor(dep.cx * 9973 + dep.cy * 7561));

    // Breathing pulse glow — a halo that swells and brightens around the ore
    // so each deposit visibly throbs under the cave lighting.
    const beat   = 0.5 + 0.5 * Math.sin(frame * 0.06 + dep.cx * 13.7);
    const haloR  = 1.08 + 0.10 * beat;
    const glow   = ctx.createRadialGradient(cx, cy, Math.min(rx, ry) * 0.4, cx, cy, Math.max(rx, ry) * haloR);
    glow.addColorStop(0, `rgba(${cr},${cg},${cb},${(0.10 + 0.22 * beat).toFixed(3)})`);
    glow.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
    ctx.save();
    traceBlobPath(ctx, cx, cy, rx * haloR, ry * haloR, dep.blob);
    ctx.fillStyle = glow;
    ctx.fill();
    ctx.restore();

    // Vein tendrils into surrounding rock
    const rng2 = seededRng(Math.floor(dep.cx * 9337 + dep.cy * 8191));
    ctx.save();
    ctx.strokeStyle = `rgba(${cr},${cg},${cb},0.20)`;
    ctx.lineWidth = 1;
    for (let v = 0; v < 4; v++) {
      const ang = rng2() * Math.PI * 2;
      const len = 0.25 + rng2() * 0.3;
      const bx  = cx + Math.cos(ang) * rx;
      const by  = cy + Math.sin(ang) * ry;
      const ex  = bx + Math.cos(ang) * rx * len;
      const ey  = by + Math.sin(ang) * ry * len;
      const kx  = (bx + ex) / 2 + (rng2() - 0.5) * rx * 0.5;
      const ky  = (by + ey) / 2 + (rng2() - 0.5) * ry * 0.5;
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo(kx, ky, ex, ey); ctx.stroke();
    }
    ctx.restore();

    // Twinkling sparkles
    const isAdamantine = dep.mineral.luster === 'Adamantine';
    dep.sparkles.forEach(([spx, spy], si) => {
      if ((frame + si * 7) % 14 > 6) return;
      const sx = cx + spx * rx, sy = cy + spy * ry;
      ctx.beginPath(); ctx.arc(sx, sy, isAdamantine ? 2.5 : 1.8, 0, Math.PI * 2);
      ctx.fillStyle = isAdamantine ? `hsl(${(frame * 3 + si * 60) % 360},90%,90%)` : 'rgba(255,255,255,0.88)';
      ctx.fill();
    });

    // Progressive cracks
    const damage = 1 - dep.hp / dep.maxHp;
    const crackCount = Math.ceil(damage * dep.cracks.length);
    dep.cracks.slice(0, crackCount).forEach(segs => {
      ctx.beginPath(); ctx.moveTo(cx, cy);
      let ccx = cx, ccy = cy;
      segs.forEach(([ddx, ddy]) => { ccx += ddx * rx; ccy += ddy * ry; ctx.lineTo(ccx, ccy); });
      ctx.strokeStyle = 'rgba(0,0,0,0.80)'; ctx.lineWidth = 1.8; ctx.stroke();
      ctx.strokeStyle = 'rgba(255,240,200,0.18)'; ctx.lineWidth = 0.5; ctx.stroke();
    });

    // Name label
    const fontSize = Math.max(11, Math.min(rx * 0.38, 16));
    ctx.font = `bold ${fontSize}px Inter, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 7;
    ctx.fillText(dep.mineral.name, cx, cy + ry * 0.08); ctx.shadowBlur = 0;

    if (dep.hp === dep.maxHp) {
      ctx.font = `${Math.max(9, (fontSize * 0.62) | 0)}px JetBrains Mono, monospace`;
      ctx.fillStyle = 'rgba(255,255,255,0.42)';
      ctx.fillText('tap to mine', cx, cy + ry * 0.48);
    } else {
      const barW = rx * 1.6, barH = 5, barX = cx - barW / 2, barY = cy - ry - 13;
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(barX, barY, barW, barH);
      ctx.fillStyle = `rgba(${cr},${cg},${cb},0.88)`;
      ctx.fillRect(barX, barY, barW * (dep.hp / dep.maxHp), barH);
    }
  });
}

function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]) {
  particles.forEach(p => {
    ctx.globalAlpha = Math.max(0, p.alpha);
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

// ---- Phase types ----------------------------------------------------------

type GamePhase = 'map' | 'zoom' | 'cave' | 'test' | 'popup';
interface DotPos { id: string; x: number; y: number }
interface ExtractFlash { text: string; x: number; y: number; key: number }

// ---- Component ------------------------------------------------------------

interface MineGameProps { pathname: string; onNavigate: (path: string) => void; }

export function MineGame({ pathname, onNavigate }: MineGameProps) {
  const mapCanvasRef  = useRef<HTMLCanvasElement>(null);
  const caveCanvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef        = useRef(0);
  const depositsRef   = useRef<CaveDeposit[]>([]);
  const particlesRef  = useRef<Particle[]>([]);
  const frameRef      = useRef(0);
  const phaseRef      = useRef<GamePhase>('map');
  const zoomGuardRef  = useRef(false);

  // Game state
  const scoreRef    = useRef(0);
  const comboRef    = useRef(1);
  const lastTapRef  = useRef(0);
  const lastPtsRef  = useRef(0);

  const [phase,           setPhase]           = useState<GamePhase>('map');
  const [activeSite,      setActiveSite]       = useState<MineSite | null>(null);
  const [zoomPos,         setZoomPos]          = useState({ x: 0, y: 0 });
  const [zoomColor,       setZoomColor]        = useState('#d4af52');
  const [dotPositions,    setDotPositions]     = useState<DotPos[]>([]);
  const [selectedMineral, setSelectedMineral]  = useState<Mineral | null>(null);
  const [pickaxeSwing,    setPickaxeSwing]     = useState(false);
  const [score,           setScore]            = useState(0);
  const [combo,           setCombo]            = useState(1);
  const [comboAnim,       setComboAnim]        = useState(false);
  const [extractFlash,    setExtractFlash]     = useState<ExtractFlash | null>(null);
  const [lastPts,         setLastPts]          = useState(0);
  const [testedSet,       setTestedSet]        = useState<Set<number>>(new Set());
  const [activeTest,      setActiveTest]       = useState<number | null>(null);
  const [selectedReagent, setSelectedReagent]  = useState<number | null>(null);
  const [pourReagent,     setPourReagent]      = useState<number | null>(null);
  const [assayRevealed,   setAssayRevealed]    = useState(false);
  const [specimenPurity,  setSpecimenPurity]   = useState(0);
  const [specimenBand,       setSpecimenBand]       = useState<BandInfo | null>(null);
  const [specimenInclusions, setSpecimenInclusions] = useState<InclusionType[]>([]);
  const pourTimerRef      = useRef(0);

  // Phase 2: persistent collection. The mined specimen is built at extraction
  // and committed to the collection at the popup "acquired" moment.
  const addSpecimen = useMineGameStore(s => s.addSpecimen);
  const pendingSpecimenRef = useRef<Specimen | null>(null);
  const collectedRef       = useRef(false);

  // ---- Map drawing -------------------------------------------------------
  const drawMap = useCallback(() => {
    const canvas = mapCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const drawPoly = (coords: [number, number][], fill: string, stroke: string) => {
      ctx.beginPath();
      coords.forEach(([lat, lon], i) => {
        const [x, y] = projectCoord(lat, lon, w, h);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    };

    drawPoly(AU_COAST, '#2a2215', '#d98e3c');
    drawPoly(TAS_COAST, '#2a2215', '#d98e3c');

    ctx.fillStyle = 'rgba(242,232,216,0.22)';
    ctx.font = `${Math.max(9, w * 0.015)}px JetBrains Mono, monospace`;
    ctx.textAlign = 'center';
    const labels: [string, number, number][] = [
      ['WA', -25.0, 121.0], ['NT', -19.0, 133.5], ['QLD', -22.0, 143.5],
      ['SA', -31.0, 135.0], ['NSW', -33.0, 146.0], ['VIC', -37.0, 144.5],
    ];
    labels.forEach(([label, lat, lon]) => {
      const [x, y] = projectCoord(lat, lon, w, h);
      ctx.fillText(label, x, y);
    });

    setDotPositions(
      MINE_SITES.map(s => {
        const [x, y] = projectCoord(s.lat, s.lon, w, h);
        return { id: s.id, x, y };
      })
    );
  }, []);

  useEffect(() => {
    const canvas = mapCanvasRef.current;
    if (!canvas) return;
    const resize = () => {
      canvas.width  = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
      drawMap();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [drawMap]);

  useEffect(() => { if (phase === 'map') drawMap(); }, [phase, drawMap]);

  // ---- Cave rAF loop -----------------------------------------------------
  const startCave = useCallback((canvas: HTMLCanvasElement) => {
    cancelAnimationFrame(rafRef.current);

    const tick = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const w = canvas.clientWidth, h = canvas.clientHeight;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w; canvas.height = h;
      }

      particlesRef.current = particlesRef.current
        .map(p => ({ ...p, x: p.x + p.vx, y: p.y + p.vy, vy: p.vy + 0.15, alpha: p.alpha * 0.94 }))
        .filter(p => p.alpha > 0.03);

      try {
        drawCaveBackground(ctx, w, h, frameRef.current);
        drawDeposits(ctx, w, h, depositsRef.current, frameRef.current);
        drawParticles(ctx, particlesRef.current);
      } catch (err) {
        console.error('[MineGame] render error:', err);
      }
      frameRef.current++;
      rafRef.current = requestAnimationFrame(tick);
    };
    tick();
  }, []);

  // ---- Site click → zoom → cave -----------------------------------------
  const handleSiteClick = useCallback((site: MineSite, x: number, y: number) => {
    const primary = MINERALS.find(m => m.id === site.minerals[0]);
    setActiveSite(site);
    setZoomPos({ x, y });
    setZoomColor(primary?.color ?? '#d4af52');
    zoomGuardRef.current = false;
    setPhase('zoom');
    phaseRef.current = 'zoom';
  }, []);

  const onZoomEnd = useCallback(() => {
    // Idempotent: fires from either the CSS animationend OR the iOS fallback
    // timer below — whichever lands first wins, the other is a no-op.
    if (zoomGuardRef.current || !activeSite) return;
    zoomGuardRef.current = true;
    const minerals = activeSite.minerals
      .slice(0, 3)
      .map(id => MINERALS.find(m => m.id === id))
      .filter((m): m is Mineral => !!m);
    const n      = Math.min(minerals.length, 3);
    const layout = DEPOSIT_LAYOUTS[n - 1] ?? DEPOSIT_LAYOUTS[0];
    depositsRef.current = minerals.map((m, i) => {
      const [cx, cy, rx, ry] = layout[i] ?? layout[0];
      return createDeposit(m, cx, cy, rx, ry, 8);
    });
    particlesRef.current = [];
    frameRef.current = 0;
    // Reset combo on new cave
    comboRef.current  = 1;
    lastTapRef.current = 0;
    setCombo(1);
    setPhase('cave');
    phaseRef.current = 'cave';
  }, [activeSite]);

  // iOS Safari sometimes never fires `animationend` on the zoom circle, which
  // would strand the player on the map (the "pressing sites is unresponsive"
  // bug). This timer guarantees the cave opens even if the event is dropped.
  useEffect(() => {
    if (phase !== 'zoom') return;
    const t = window.setTimeout(onZoomEnd, 560);
    return () => window.clearTimeout(t);
  }, [phase, onZoomEnd]);

  useEffect(() => {
    if (phase === 'cave') {
      const canvas = caveCanvasRef.current;
      if (canvas) startCave(canvas);
    }
    if (phase !== 'cave') cancelAnimationFrame(rafRef.current);
  }, [phase, startCave]);

  // ---- Tap / click mechanic with score + combo --------------------------
  const onCaveTap = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = caveCanvasRef.current;
    if (!canvas || phaseRef.current !== 'cave') return;
    const rect = canvas.getBoundingClientRect();
    const px = (e.clientX - rect.left) / canvas.clientWidth;
    const py = (e.clientY - rect.top)  / canvas.clientHeight;

    for (const dep of depositsRef.current) {
      if (dep.extracted) continue;
      const dx = (px - dep.cx) / dep.rx;
      const dy = (py - dep.cy) / dep.ry;
      if (dx * dx + dy * dy > 1.6) continue;

      // Combo logic
      const now = Date.now();
      if (now - lastTapRef.current < 600) {
        comboRef.current = Math.min(comboRef.current + 1, 8);
      } else {
        comboRef.current = 1;
      }
      lastTapRef.current = now;
      setCombo(comboRef.current);
      if (comboRef.current > 1) {
        setComboAnim(true);
        setTimeout(() => setComboAnim(false), 220);
      }

      dep.hp = Math.max(0, dep.hp - 1);

      // Rock-chip particles
      const hitX = e.clientX - rect.left;
      const hitY = e.clientY - rect.top;
      const [pr, pg, pb] = hexToRgb(dep.mineral.color);
      for (let i = 0; i < 8; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1.5 + Math.random() * 3;
        particlesRef.current.push({
          x: hitX, y: hitY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 2,
          color: `rgb(${pr},${pg},${pb})`,
          alpha: 0.9 + Math.random() * 0.1,
          size: 2 + Math.random() * 3,
        });
      }

      // Tap points
      const tapPts = Math.ceil(parseFloat(dep.mineral.mohs) / 3) * comboRef.current;
      scoreRef.current += tapPts;
      setScore(scoreRef.current);

      setPickaxeSwing(true);
      setTimeout(() => setPickaxeSwing(false), 200);

      if (dep.hp === 0) {
        dep.extracted = true;
        const cw = canvas.clientWidth, ch = canvas.clientHeight;

        // Extraction burst particles
        for (let i = 0; i < 30; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 2 + Math.random() * 6.5;
          particlesRef.current.push({
            x: dep.cx * cw, y: dep.cy * ch,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 3.5,
            color: i % 3 === 0 ? '#fff' : `rgb(${pr},${pg},${pb})`,
            alpha: 1, size: 1.5 + Math.random() * 4.5,
          });
        }

        // Extraction bonus
        const extractPts = mineralPts(dep.mineral.id) * Math.max(1, comboRef.current - 1);
        scoreRef.current += extractPts;
        lastPtsRef.current = extractPts;
        setScore(scoreRef.current);
        setLastPts(extractPts);

        // "EXTRACTED!" flash text
        setExtractFlash({ text: 'EXTRACTED!', x: dep.cx * cw, y: dep.cy * ch, key: Date.now() });
        setTimeout(() => setExtractFlash(null), 1100);

        const mineral = dep.mineral;
        // Purity roll (Phase 1): driven by combo + the deposit's intrinsic
        // richness. Tool tier is 0 until Phase 4, so gem grade is gated behind
        // future tool upgrades.
        const purity     = rollPurity({
          comboMultiplier: comboRef.current,
          depthFactor: dep.depthFactor,
        });
        const band       = classifyBand(purity);
        const inclusions = dep.inclusions;
        if (activeSite) {
          pendingSpecimenRef.current = makeSpecimen(mineral, {
            siteId: activeSite.id,
            depthFactor: dep.depthFactor,
            purityScore: purity,
            purityBand: band.band,
            inclusions,
          });
          collectedRef.current = false;
        }
        setTimeout(() => {
          cancelAnimationFrame(rafRef.current);
          setSelectedMineral(mineral);
          setTestedSet(new Set());
          setActiveTest(null);
          setSelectedReagent(null);
          setPourReagent(null);
          setAssayRevealed(false);
          setSpecimenPurity(purity);
          setSpecimenBand(band);
          setSpecimenInclusions(inclusions);
          setPhase('test');
          phaseRef.current = 'test';
        }, 800);
      }
      break;
    }
  }, []);

  // Pour the armed reagent onto the specimen. The reaction plays for ~1.6s,
  // then the result + assay report are revealed. Redefined each render so it
  // reads the current selection (no stale closure).
  const handlePour = () => {
    if (selectedReagent === null || pourReagent !== null) return;
    const i = selectedReagent;
    setPourReagent(i);
    window.clearTimeout(pourTimerRef.current);
    pourTimerRef.current = window.setTimeout(() => {
      setTestedSet(p => new Set([...p, i]));
      setActiveTest(i);
      setAssayRevealed(true);
      setPourReagent(null);
      setSelectedReagent(null);
    }, 1600);
  };

  // Cancel any in-flight pour timer when leaving the lab or unmounting, so it
  // can't setState into the wrong phase.
  useEffect(() => {
    if (phase !== 'test') window.clearTimeout(pourTimerRef.current);
    return () => window.clearTimeout(pourTimerRef.current);
  }, [phase]);

  const goToMap = () => {
    cancelAnimationFrame(rafRef.current);
    setActiveSite(null);
    setSelectedMineral(null);
    setPhase('map');
    phaseRef.current = 'map';
  };

  const goToPopup = () => {
    // Commit the mined specimen to the persistent collection (once).
    if (!collectedRef.current && pendingSpecimenRef.current) {
      collectedRef.current = true;
      addSpecimen(pendingSpecimenRef.current);
    }
    setTestedSet(new Set());
    setActiveTest(null);
    setPhase('popup');
    phaseRef.current = 'popup';
  };

  const goToCave = () => {
    setSelectedMineral(null);
    depositsRef.current.forEach(d => { if (d.extracted) { d.extracted = false; d.hp = d.maxHp; } });
    setPhase('cave');
    phaseRef.current = 'cave';
  };

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  // ---- Render ------------------------------------------------------------
  return (
    <div className="mine-root">
      <GeoNav pathname={pathname} onNavigate={onNavigate} />

      {/* MAP + ZOOM phases */}
      <div
        className="mine-map-wrap"
        style={{ visibility: phase === 'cave' || phase === 'popup' || phase === 'test' ? 'hidden' : 'visible' }}
      >
        <canvas ref={mapCanvasRef} className="mine-map-canvas" />

        {phase === 'map' && dotPositions.map(({ id, x, y }) => {
          const site  = MINE_SITES.find(s => s.id === id)!;
          const color = MINERALS.find(m => m.id === site.minerals[0])?.color ?? '#d4af52';
          return (
            <button
              key={id}
              className="mine-dot"
              style={{ left: x, top: y, '--mc': color } as CSSProperties}
              onClick={() => handleSiteClick(site, x, y)}
              aria-label={`Mine site: ${site.name}, ${site.state}`}
            >
              <span className="mine-dot-ring" />
              <span className="mine-dot-label">{site.name}</span>
            </button>
          );
        })}

        {phase === 'zoom' && (
          <div
            className="mine-zoom-circle"
            style={{ left: zoomPos.x, top: zoomPos.y, background: zoomColor } as CSSProperties}
            onAnimationEnd={onZoomEnd}
          />
        )}

        <div className="mine-map-title">
          <span>Australian Mine Sites</span>
          <span className="mine-map-sub">Click a site to explore</span>
        </div>

        {/* Persistent score display on map */}
        {score > 0 && (
          <div className="mine-map-score">{score} pts</div>
        )}

        {/* Portrait-only legend strip — fills the lower band on tall phones */}
        {phase === 'map' && (
          <div className="mine-map-legend" aria-hidden="true">
            <span className="mine-legend-count">{MINE_SITES.length} active sites</span>
            <span className="mine-legend-hint">Tap a glowing marker to descend</span>
          </div>
        )}
      </div>

      {/* CAVE phase — first-person canvas */}
      {(phase === 'cave' || phase === 'popup' || phase === 'test') && activeSite && (
        <div className="mine-cave-root">
          {/* HUD — site info */}
          <div className="mine-cave-hud">
            <span className="mine-cave-site">{activeSite.name} — {activeSite.state}</span>
            <span className="mine-cave-sub">{activeSite.desc}</span>
          </div>

          {/* Score + combo (top right) */}
          {phase === 'cave' && (
            <div className="mine-cave-score">
              <span className="mine-score-val">{score}</span>
              <span className="mine-score-label">pts</span>
              {combo > 1 && (
                <span className={`mine-combo${comboAnim ? ' mine-combo-pop' : ''}`}>
                  ×{combo}
                </span>
              )}
            </div>
          )}

          {phase === 'cave' && (
            <>
              <canvas
                ref={caveCanvasRef}
                className="mine-cave-canvas"
                onPointerDown={onCaveTap}
                style={{ touchAction: 'none' }}
              />
              {/* "EXTRACTED!" float text */}
              {extractFlash && (
                <div
                  key={extractFlash.key}
                  className="mine-extract-flash"
                  style={{ left: extractFlash.x, top: extractFlash.y }}
                >
                  {extractFlash.text}
                </div>
              )}
              <div
                className={`mine-pickaxe${pickaxeSwing ? ' mine-pickaxe-swing' : ''}`}
                aria-hidden="true"
              >
                ⛏️
              </div>
            </>
          )}

          <button className="mine-back-btn" onClick={goToMap}>← Back to Map</button>
        </div>
      )}

      {/* TEST phase — chemical analysis lab */}
      {phase === 'test' && selectedMineral && (
        <ChemLab
          mineral={selectedMineral}
          tests={getTests(selectedMineral.id)}
          testedSet={testedSet}
          activeTest={activeTest}
          selectedReagent={selectedReagent}
          pourReagent={pourReagent}
          assayRevealed={assayRevealed}
          purity={specimenPurity}
          band={specimenBand}
          inclusions={specimenInclusions}
          onSelectReagent={setSelectedReagent}
          onPour={handlePour}
          onContinue={goToPopup}
        />
      )}

      {/* POPUP phase */}
      {phase === 'popup' && selectedMineral && (() => {
        const rarity = getRarity(selectedMineral);
        return (
          <div className="mine-popup-overlay" role="dialog" aria-label={`Mineral info: ${selectedMineral.name}`}>
            <div className="mine-popup">
              <div
                className="mine-popup-gem"
                style={{ background: `radial-gradient(ellipse at 35% 30%, ${selectedMineral.color}ee, ${selectedMineral.color}55)` }}
              />
              <div className="mine-popup-formula">{selectedMineral.formula}</div>
              <div className="mine-popup-rarity" style={{ color: rarity.color }}>{rarity.label}</div>
              <h2 className="mine-popup-name">{selectedMineral.name}</h2>
              {lastPts > 0 && (
                <div className="mine-popup-pts">+{lastPts} extraction bonus</div>
              )}
              <p className="mine-popup-blurb">{selectedMineral.blurb}</p>
              <div className="mine-popup-grid">
                <div><span>Hardness</span><b>{selectedMineral.mohs} Mohs</b></div>
                <div><span>System</span><b>{selectedMineral.system}</b></div>
                <div><span>Luster</span><b>{selectedMineral.luster}</b></div>
                <div><span>Class</span><b>{selectedMineral.group}</b></div>
              </div>
              <p className="mine-popup-uses">{selectedMineral.uses}</p>
              <div className="mine-popup-score-total">
                <span>Total Score</span>
                <strong>{score} pts</strong>
              </div>
              <div className="mine-popup-actions">
                <button className="mine-action-btn mine-action-primary" onClick={goToCave}>Mine More</button>
                <button className="mine-action-btn" onClick={goToMap}>New Site</button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
