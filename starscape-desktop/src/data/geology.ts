// ---------------------------------------------------------------------------
// GeoScape — geology content model
// ---------------------------------------------------------------------------
// Earth's interior layers, the rock cycle, the geologic time scale, and a
// mineral reference set for the interactive lab. All facts are public science.
// ---------------------------------------------------------------------------

export type RockKind =
  | 'granite' | 'basalt' | 'obsidian'
  | 'sandstone' | 'limestone' | 'shale'
  | 'marble' | 'slate' | 'gneiss';

// --- Earth's interior ---------------------------------------------------------

export interface EarthLayer {
  id: string;
  name: string;
  depth: string; // depth range
  state: string; // solid / liquid / plastic
  composition: string;
  temperature: string;
  fact: string;
  color: string; // cross-section colour (earth tones)
}

export const EARTH_LAYERS: EarthLayer[] = [
  {
    id: 'crust', name: 'Crust', depth: '0 – 35 km', state: 'Solid (brittle)',
    composition: 'Granite & basalt', temperature: '20 – 400 °C',
    fact: 'The thin, fractured skin we live on — only about 1% of Earth’s radius, like the skin on an apple.',
    color: '#8a6a48',
  },
  {
    id: 'mantle', name: 'Mantle', depth: '35 – 2,890 km', state: 'Solid rock that flows',
    composition: 'Silicate rock (peridotite)', temperature: '500 – 4,000 °C',
    fact: 'Hot enough to creep like thick tar over millions of years — its slow convection drags the tectonic plates.',
    color: '#b5522e',
  },
  {
    id: 'outer-core', name: 'Outer Core', depth: '2,890 – 5,150 km', state: 'Liquid',
    composition: 'Molten iron & nickel', temperature: '4,000 – 5,000 °C',
    fact: 'Swirling liquid metal acts as a dynamo, generating the magnetic field that shields life from solar radiation.',
    color: '#e8862e',
  },
  {
    id: 'inner-core', name: 'Inner Core', depth: '5,150 – 6,371 km', state: 'Solid',
    composition: 'Iron & nickel', temperature: '~5,200 °C',
    fact: 'As hot as the Sun’s surface, yet solid — crushing pressure forces the metal to freeze despite the heat.',
    color: '#ffd27a',
  },
];

// --- Rock cycle ---------------------------------------------------------------

export interface RockType {
  id: string;
  name: string;
  origin: string;
  formation: string;
  examples: Array<{ name: string; kind: RockKind }>;
  accent: string;
}

export const ROCK_TYPES: RockType[] = [
  {
    id: 'igneous', name: 'Igneous', origin: 'Fire-born',
    formation: 'Crystallised from molten magma or lava. Slow cooling underground grows large crystals (granite); fast cooling at the surface gives fine or glassy rock (basalt, obsidian).',
    examples: [{ name: 'Granite', kind: 'granite' }, { name: 'Basalt', kind: 'basalt' }, { name: 'Obsidian', kind: 'obsidian' }],
    accent: '#d98e3c',
  },
  {
    id: 'sedimentary', name: 'Sedimentary', origin: 'Built in layers',
    formation: 'Sediment, shells and grains settle, then compact and cement over millions of years. These layered rocks are where almost all fossils are found.',
    examples: [{ name: 'Sandstone', kind: 'sandstone' }, { name: 'Limestone', kind: 'limestone' }, { name: 'Shale', kind: 'shale' }],
    accent: '#c9a36b',
  },
  {
    id: 'metamorphic', name: 'Metamorphic', origin: 'Changed by heat & pressure',
    formation: 'Existing rock is cooked and squeezed deep in the crust — without melting — recrystallising into something new: limestone becomes marble, shale becomes slate.',
    examples: [{ name: 'Marble', kind: 'marble' }, { name: 'Slate', kind: 'slate' }, { name: 'Gneiss', kind: 'gneiss' }],
    accent: '#4fa88b',
  },
];

// --- Geologic time scale ------------------------------------------------------

export interface TimeSpan {
  id: string;
  name: string;
  span: string;
  event: string;
  color: string;
}

export const GEO_TIME: TimeSpan[] = [
  { id: 'hadean', name: 'Hadean', span: '4.6 – 4.0 Ga', event: 'A molten world forms; the Moon is born from a colossal impact.', color: '#7a2e23' },
  { id: 'archean', name: 'Archean', span: '4.0 – 2.5 Ga', event: 'Oceans condense and the first single-celled life appears.', color: '#9c5a2e' },
  { id: 'proterozoic', name: 'Proterozoic', span: '2.5 Ga – 541 Ma', event: 'Photosynthesis floods the air with oxygen — the Great Oxidation.', color: '#b5823a' },
  { id: 'paleozoic', name: 'Paleozoic', span: '541 – 252 Ma', event: 'The Cambrian explosion; fish, plants, and the first life on land.', color: '#4f8a6b' },
  { id: 'mesozoic', name: 'Mesozoic', span: '252 – 66 Ma', event: 'The age of dinosaurs, ended by an asteroid strike.', color: '#3a7a8a' },
  { id: 'cenozoic', name: 'Cenozoic', span: '66 Ma – today', event: 'Mammals rise, the Ice Ages come and go, and humans emerge.', color: '#5a6a9c' },
];

// --- Minerals (for the lab) ---------------------------------------------------

export type CrystalHabit = 'cube' | 'octahedron' | 'dodecahedron' | 'hexPrism' | 'rhomb' | 'cluster';

export interface Mineral {
  id: string;
  name: string;
  formula: string;
  system: string; // crystal system
  mohs: string; // hardness
  luster: string;
  uses: string;
  blurb: string;
  habit: CrystalHabit;
  // PBR material
  color: string;
  metalness: number;
  roughness: number;
  transmission: number; // 0 = opaque, >0 = glassy/gem
  ior?: number;
  emissive?: string;
}

export const MINERALS: Mineral[] = [
  {
    id: 'quartz', name: 'Quartz', formula: 'SiO₂', system: 'Hexagonal', mohs: '7',
    luster: 'Vitreous', uses: 'Glass, watches, electronics (piezoelectric timing).',
    blurb: 'The second most abundant mineral in Earth’s crust. Its clean six-sided prisms tip with a six-faced point.',
    habit: 'hexPrism', color: '#eaf4fb', metalness: 0, roughness: 0.04, transmission: 0.92, ior: 1.54,
  },
  {
    id: 'amethyst', name: 'Amethyst', formula: 'SiO₂', system: 'Hexagonal', mohs: '7',
    luster: 'Vitreous', uses: 'Gemstone; the purple variety of quartz.',
    blurb: 'Quartz coloured violet by trace iron and natural irradiation — February’s birthstone.',
    habit: 'hexPrism', color: '#9b5fc0', metalness: 0, roughness: 0.05, transmission: 0.85, ior: 1.54,
  },
  {
    id: 'pyrite', name: 'Pyrite', formula: 'FeS₂', system: 'Cubic', mohs: '6 – 6.5',
    luster: 'Metallic', uses: 'Once struck for sparks; a source of sulphur.',
    blurb: '“Fool’s Gold.” Forms astonishingly perfect brassy cubes — geometry grown by chemistry.',
    habit: 'cube', color: '#d4af52', metalness: 1, roughness: 0.28, transmission: 0,
  },
  {
    id: 'galena', name: 'Galena', formula: 'PbS', system: 'Cubic', mohs: '2.5',
    luster: 'Metallic', uses: 'The primary ore of lead; early radio crystal detectors.',
    blurb: 'Heavy, silvery lead ore that cleaves into perfect cubes and mirror-bright faces.',
    habit: 'cube', color: '#9aa3ad', metalness: 1, roughness: 0.15, transmission: 0,
  },
  {
    id: 'fluorite', name: 'Fluorite', formula: 'CaF₂', system: 'Cubic', mohs: '4',
    luster: 'Vitreous', uses: 'Optical lenses; flux in steelmaking; glows under UV (fluorescence).',
    blurb: 'Defines hardness 4 on the Mohs scale and gave the word “fluorescence” to science.',
    habit: 'octahedron', color: '#5fc0a8', metalness: 0, roughness: 0.06, transmission: 0.8, ior: 1.43,
  },
  {
    id: 'garnet', name: 'Garnet', formula: 'X₃Y₂(SiO₄)₃', system: 'Cubic', mohs: '6.5 – 7.5',
    luster: 'Vitreous', uses: 'Gemstone; abrasive for waterjet cutting and sandpaper.',
    blurb: 'Grows as nearly perfect 12-sided dodecahedra, often deep blood-red — January’s birthstone.',
    habit: 'dodecahedron', color: '#8e2436', metalness: 0, roughness: 0.12, transmission: 0.45, ior: 1.78,
  },
  {
    id: 'magnetite', name: 'Magnetite', formula: 'Fe₃O₄', system: 'Cubic', mohs: '5.5 – 6.5',
    luster: 'Metallic', uses: 'Iron ore; naturally magnetic (lodestone) — early compasses.',
    blurb: 'The most magnetic natural mineral on Earth, crystallising as gleaming black octahedra.',
    habit: 'octahedron', color: '#2b2e33', metalness: 0.9, roughness: 0.35, transmission: 0,
  },
  {
    id: 'calcite', name: 'Calcite', formula: 'CaCO₃', system: 'Trigonal', mohs: '3',
    luster: 'Vitreous', uses: 'Cement, lime, optics; the rock-builder of limestone & marble.',
    blurb: 'Cleaves into slanted rhombs and splits light into a double image — “double refraction.”',
    habit: 'rhomb', color: '#f3ecd9', metalness: 0, roughness: 0.08, transmission: 0.7, ior: 1.49,
  },
  {
    id: 'malachite', name: 'Malachite', formula: 'Cu₂CO₃(OH)₂', system: 'Monoclinic', mohs: '3.5 – 4',
    luster: 'Silky / dull', uses: 'Green pigment, ornamental stone; a copper ore.',
    blurb: 'Forms bubbly, banded green masses — a weathering product of copper deposits.',
    habit: 'cluster', color: '#1f7a52', metalness: 0, roughness: 0.45, transmission: 0,
  },
];
