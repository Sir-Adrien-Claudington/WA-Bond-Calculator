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

export type CrystalHabit =
  | 'cube' | 'octahedron' | 'dodecahedron' | 'rhomb' | 'cluster'
  | 'hexPrism' | 'prismTrig' | 'prismSquare' | 'bipyramid' | 'bladed'
  | 'tabular' | 'nativeMass';

export type SurfaceStyle = 'smooth' | 'striated' | 'metallic' | 'banded';

export interface Mineral {
  id: string;
  name: string;
  formula: string;
  system: string; // crystal system
  mohs: string; // hardness
  luster: string;
  uses: string;
  blurb: string;
  group: string; // mineral class (for grouping the tray)
  habit: CrystalHabit;
  // PBR material
  color: string;
  metalness: number;
  roughness: number;
  transmission: number; // 0 = opaque, >0 = glassy/gem
  ior?: number;
  dispersion?: number; // chromatic "fire" for gems
  anisotropy?: number; // brushed/directional metals
  sheen?: number; // silky lustre
  surface?: SurfaceStyle; // procedural surface detail
  termination?: 'pyramid' | 'flat'; // for prisms
  bandColors?: [string, string, string]; // for banded surfaces
}

export const MINERALS: Mineral[] = [
  // --- Silica (quartz family) -------------------------------------------------
  {
    id: 'quartz', name: 'Quartz', formula: 'SiO₂', system: 'Hexagonal', mohs: '7',
    luster: 'Vitreous', group: 'Silicate', uses: 'Glass, watches, electronics (piezoelectric timing).',
    blurb: 'The second most abundant mineral in Earth’s crust. Six-sided prisms striated across the faces, tipped with a six-faced point.',
    habit: 'hexPrism', termination: 'pyramid', surface: 'striated',
    color: '#eaf4fb', metalness: 0, roughness: 0.03, transmission: 0.93, ior: 1.544, dispersion: 0.013,
  },
  {
    id: 'amethyst', name: 'Amethyst', formula: 'SiO₂', system: 'Hexagonal', mohs: '7',
    luster: 'Vitreous', group: 'Silicate', uses: 'Gemstone; the violet variety of quartz.',
    blurb: 'Quartz coloured violet by trace iron and natural irradiation — February’s birthstone.',
    habit: 'hexPrism', termination: 'pyramid', surface: 'striated',
    color: '#9b5fc0', metalness: 0, roughness: 0.05, transmission: 0.85, ior: 1.544, dispersion: 0.013,
  },
  {
    id: 'citrine', name: 'Citrine', formula: 'SiO₂', system: 'Hexagonal', mohs: '7',
    luster: 'Vitreous', group: 'Silicate', uses: 'Gemstone; the golden variety of quartz.',
    blurb: 'Quartz tinted gold by traces of iron — most natural citrine is pale; deep tones are often heat-treated amethyst.',
    habit: 'hexPrism', termination: 'pyramid', surface: 'striated',
    color: '#e3a83a', metalness: 0, roughness: 0.05, transmission: 0.85, ior: 1.544, dispersion: 0.013,
  },
  // --- Gemstone silicates & oxides -------------------------------------------
  {
    id: 'emerald', name: 'Emerald', formula: 'Be₃Al₂Si₆O₁₈', system: 'Hexagonal', mohs: '7.5 – 8',
    luster: 'Vitreous', group: 'Silicate', uses: 'Precious gemstone (green beryl).',
    blurb: 'The green gem variety of beryl, coloured by chromium. Grows as flat-topped hexagonal prisms — May’s birthstone.',
    habit: 'hexPrism', termination: 'flat',
    color: '#1f9e63', metalness: 0, roughness: 0.07, transmission: 0.68, ior: 1.577,
  },
  {
    id: 'ruby', name: 'Ruby', formula: 'Al₂O₃', system: 'Trigonal', mohs: '9',
    luster: 'Vitreous', group: 'Oxide', uses: 'Precious gemstone; lasers, watch bearings.',
    blurb: 'Red corundum, coloured by chromium. Second only to diamond in hardness — July’s birthstone.',
    habit: 'bipyramid', surface: 'smooth',
    color: '#c41f39', metalness: 0, roughness: 0.06, transmission: 0.5, ior: 1.77,
  },
  {
    id: 'sapphire', name: 'Sapphire', formula: 'Al₂O₃', system: 'Trigonal', mohs: '9',
    luster: 'Vitreous', group: 'Oxide', uses: 'Precious gemstone; scratch-proof glass.',
    blurb: 'Corundum in any colour but red — blue from traces of iron and titanium. September’s birthstone.',
    habit: 'bipyramid', surface: 'smooth',
    color: '#1f4fb5', metalness: 0, roughness: 0.06, transmission: 0.5, ior: 1.77,
  },
  {
    id: 'topaz', name: 'Topaz', formula: 'Al₂SiO₄(F,OH)₂', system: 'Orthorhombic', mohs: '8',
    luster: 'Vitreous', group: 'Silicate', uses: 'Gemstone; defines hardness 8 on the Mohs scale.',
    blurb: 'Forms long prisms with lengthwise striations and a chisel-like top — colourless to sky-blue or imperial gold.',
    habit: 'prismSquare', termination: 'pyramid', surface: 'striated',
    color: '#a9d6e8', metalness: 0, roughness: 0.05, transmission: 0.78, ior: 1.62,
  },
  {
    id: 'tourmaline', name: 'Tourmaline', formula: '(Na,Ca)(Li,Mg,Al)₆…', system: 'Trigonal', mohs: '7 – 7.5',
    luster: 'Vitreous', group: 'Silicate', uses: 'Gemstone; pyroelectric / piezoelectric.',
    blurb: 'Rounded triangular prisms deeply grooved along their length, often colour-zoned green-to-pink (“watermelon”).',
    habit: 'prismTrig', surface: 'striated',
    color: '#2f9158', metalness: 0, roughness: 0.07, transmission: 0.52, ior: 1.62,
  },
  {
    id: 'peridot', name: 'Peridot', formula: '(Mg,Fe)₂SiO₄', system: 'Orthorhombic', mohs: '6.5 – 7',
    luster: 'Vitreous', group: 'Silicate', uses: 'Gemstone (gem olivine); August’s birthstone.',
    blurb: 'The olive-green gem form of olivine — one of the few gems found in just one colour, born deep in the mantle.',
    habit: 'prismSquare', termination: 'flat', surface: 'smooth',
    color: '#9ac43a', metalness: 0, roughness: 0.08, transmission: 0.6, ior: 1.65,
  },
  {
    id: 'diamond', name: 'Diamond', formula: 'C', system: 'Cubic', mohs: '10',
    luster: 'Adamantine', group: 'Native element', uses: 'Hardest gem; cutting tools, abrasives.',
    blurb: 'Pure carbon crystallised under immense pressure — the hardest natural material, with intense dispersion (“fire”). April’s birthstone.',
    habit: 'octahedron', surface: 'smooth',
    color: '#f4f8ff', metalness: 0, roughness: 0.02, transmission: 0.95, ior: 2.418, dispersion: 0.044,
  },
  // --- Halides & carbonates ---------------------------------------------------
  {
    id: 'fluorite', name: 'Fluorite', formula: 'CaF₂', system: 'Cubic', mohs: '4',
    luster: 'Vitreous', group: 'Halide', uses: 'Optical lenses; flux in steelmaking; UV fluorescence.',
    blurb: 'Defines hardness 4 on the Mohs scale and gave the word “fluorescence” to science. Often green or purple octahedra.',
    habit: 'octahedron', surface: 'smooth',
    color: '#5fc0a8', metalness: 0, roughness: 0.05, transmission: 0.82, ior: 1.434,
  },
  {
    id: 'halite', name: 'Halite', formula: 'NaCl', system: 'Cubic', mohs: '2.5',
    luster: 'Vitreous', group: 'Halide', uses: 'Rock salt — food, de-icing, chemical feedstock.',
    blurb: 'Common table salt as a mineral. Grows as glassy cubes, sometimes blushed pink by trapped algae or impurities.',
    habit: 'cube', surface: 'smooth',
    color: '#f6e3ea', metalness: 0, roughness: 0.06, transmission: 0.82, ior: 1.544,
  },
  {
    id: 'calcite', name: 'Calcite', formula: 'CaCO₃', system: 'Trigonal', mohs: '3',
    luster: 'Vitreous', group: 'Carbonate', uses: 'Cement, lime, optics; builds limestone & marble.',
    blurb: 'Cleaves into slanted rhombs and splits light into a double image — “double refraction.”',
    habit: 'rhomb', surface: 'smooth',
    color: '#f3ecd9', metalness: 0, roughness: 0.07, transmission: 0.72, ior: 1.49,
  },
  {
    id: 'rhodochrosite', name: 'Rhodochrosite', formula: 'MnCO₃', system: 'Trigonal', mohs: '3.5 – 4',
    luster: 'Vitreous', group: 'Carbonate', uses: 'Manganese ore; ornamental “Inca rose.”',
    blurb: 'A rose-pink carbonate famous for concentric rosy-and-white banding in its massive form.',
    habit: 'cluster', surface: 'banded', bandColors: ['#d24a6a', '#f0b9c8', '#a83253'],
    color: '#d24a6a', metalness: 0, roughness: 0.25, transmission: 0,
  },
  {
    id: 'malachite', name: 'Malachite', formula: 'Cu₂CO₃(OH)₂', system: 'Monoclinic', mohs: '3.5 – 4',
    luster: 'Silky', group: 'Carbonate', uses: 'Green pigment, ornamental stone; a copper ore.',
    blurb: 'Bubbly, botryoidal masses with vivid concentric green banding — a weathering product of copper deposits.',
    habit: 'cluster', surface: 'banded', bandColors: ['#1f7a52', '#3fae74', '#0e4a30'],
    color: '#1f7a52', metalness: 0, roughness: 0.4, transmission: 0, sheen: 0.5,
  },
  {
    id: 'azurite', name: 'Azurite', formula: 'Cu₃(CO₃)₂(OH)₂', system: 'Monoclinic', mohs: '3.5 – 4',
    luster: 'Vitreous', group: 'Carbonate', uses: 'Deep-blue pigment; copper ore; pairs with malachite.',
    blurb: 'An intense azure-blue copper carbonate that slowly alters to green malachite over geological time.',
    habit: 'cluster', surface: 'smooth',
    color: '#1b4ea8', metalness: 0, roughness: 0.18, transmission: 0.15, ior: 1.73,
  },
  // --- Sulfides & ores --------------------------------------------------------
  {
    id: 'pyrite', name: 'Pyrite', formula: 'FeS₂', system: 'Cubic', mohs: '6 – 6.5',
    luster: 'Metallic', group: 'Sulfide', uses: 'Once struck for sparks; a source of sulphur.',
    blurb: '“Fool’s Gold.” Forms astonishingly perfect brassy cubes, their faces grooved with fine striations.',
    habit: 'cube', surface: 'metallic',
    color: '#d4af52', metalness: 1, roughness: 0.3, transmission: 0,
  },
  {
    id: 'galena', name: 'Galena', formula: 'PbS', system: 'Cubic', mohs: '2.5',
    luster: 'Metallic', group: 'Sulfide', uses: 'The primary ore of lead; early radio crystal detectors.',
    blurb: 'Heavy, silvery lead ore that cleaves into perfect cubes with mirror-bright faces.',
    habit: 'cube', surface: 'metallic',
    color: '#9aa3ad', metalness: 1, roughness: 0.16, transmission: 0,
  },
  {
    id: 'sulfur', name: 'Sulfur', formula: 'S', system: 'Orthorhombic', mohs: '1.5 – 2.5',
    luster: 'Resinous', group: 'Native element', uses: 'Gunpowder, fertiliser, sulphuric acid.',
    blurb: 'Vivid lemon-yellow native sulphur, forming dipyramids around volcanic vents and hot springs.',
    habit: 'bipyramid', surface: 'smooth',
    color: '#f2dd2e', metalness: 0, roughness: 0.22, transmission: 0.4, ior: 1.96,
  },
  // --- Oxides & native metals -------------------------------------------------
  {
    id: 'magnetite', name: 'Magnetite', formula: 'Fe₃O₄', system: 'Cubic', mohs: '5.5 – 6.5',
    luster: 'Metallic', group: 'Oxide', uses: 'Iron ore; naturally magnetic (lodestone).',
    blurb: 'The most magnetic natural mineral on Earth, crystallising as gleaming black octahedra.',
    habit: 'octahedron', surface: 'metallic',
    color: '#2b2e33', metalness: 0.9, roughness: 0.36, transmission: 0,
  },
  {
    id: 'hematite', name: 'Hematite', formula: 'Fe₂O₃', system: 'Trigonal', mohs: '5.5 – 6.5',
    luster: 'Metallic', group: 'Oxide', uses: 'The chief ore of iron; red ochre pigment.',
    blurb: 'Steel-grey metallic plates that always leave a blood-red streak — the main source of the world’s iron.',
    habit: 'tabular', surface: 'metallic',
    color: '#6a4f4f', metalness: 0.85, roughness: 0.32, transmission: 0,
  },
  {
    id: 'gold', name: 'Gold', formula: 'Au', system: 'Cubic', mohs: '2.5 – 3',
    luster: 'Metallic', group: 'Native element', uses: 'Currency, jewellery, electronics.',
    blurb: 'A native metal so unreactive it stays bright forever — found as nuggets, wires and dendritic crystals.',
    habit: 'nativeMass', surface: 'metallic',
    color: '#ffd76a', metalness: 1, roughness: 0.26, transmission: 0, anisotropy: 0.4,
  },
  {
    id: 'copper', name: 'Copper', formula: 'Cu', system: 'Cubic', mohs: '2.5 – 3',
    luster: 'Metallic', group: 'Native element', uses: 'Wiring, plumbing, alloys (bronze, brass).',
    blurb: 'One of the first metals worked by humans — found native as twisted, branching dendritic masses.',
    habit: 'nativeMass', surface: 'metallic',
    color: '#c8642f', metalness: 1, roughness: 0.32, transmission: 0, anisotropy: 0.4,
  },
  // --- Evaporites -------------------------------------------------------------
  {
    id: 'gypsum', name: 'Gypsum (Selenite)', formula: 'CaSO₄·2H₂O', system: 'Monoclinic', mohs: '2',
    luster: 'Vitreous / pearly', group: 'Sulfate', uses: 'Plaster of Paris, drywall, cement retarder.',
    blurb: 'Soft enough to scratch with a fingernail. The clear variety, selenite, grows as glassy striated blades.',
    habit: 'bladed', surface: 'striated',
    color: '#eef0ea', metalness: 0, roughness: 0.12, transmission: 0.72, ior: 1.52,
  },
];

export const MINERAL_GROUPS = [
  'Silicate', 'Oxide', 'Halide', 'Carbonate', 'Sulfide', 'Sulfate', 'Native element',
];
