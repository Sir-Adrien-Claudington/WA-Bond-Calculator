// Phase 3.4 — periodic table data.
// Layout covers periods 1–6 (groups 1–2, 3–12 transition metals, 13–18), no
// lanthanides/actinides (per the blueprint MVP). Detail data (config + fact) is
// authored for the elements that occur in the game's mineral formulas; those
// are the only tappable (glowing) cells.

export interface PElement {
  symbol: string;
  number: number;
  group: number;   // 1–18 (grid column)
  period: number;  // 1–6 (grid row)
}

// [symbol, atomic number, group, period]
const RAW: [string, number, number, number][] = [
  ['H', 1, 1, 1], ['He', 2, 18, 1],
  ['Li', 3, 1, 2], ['Be', 4, 2, 2], ['B', 5, 13, 2], ['C', 6, 14, 2], ['N', 7, 15, 2], ['O', 8, 16, 2], ['F', 9, 17, 2], ['Ne', 10, 18, 2],
  ['Na', 11, 1, 3], ['Mg', 12, 2, 3], ['Al', 13, 13, 3], ['Si', 14, 14, 3], ['P', 15, 15, 3], ['S', 16, 16, 3], ['Cl', 17, 17, 3], ['Ar', 18, 18, 3],
  ['K', 19, 1, 4], ['Ca', 20, 2, 4], ['Sc', 21, 3, 4], ['Ti', 22, 4, 4], ['V', 23, 5, 4], ['Cr', 24, 6, 4], ['Mn', 25, 7, 4], ['Fe', 26, 8, 4], ['Co', 27, 9, 4], ['Ni', 28, 10, 4], ['Cu', 29, 11, 4], ['Zn', 30, 12, 4], ['Ga', 31, 13, 4], ['Ge', 32, 14, 4], ['As', 33, 15, 4], ['Se', 34, 16, 4], ['Br', 35, 17, 4], ['Kr', 36, 18, 4],
  ['Rb', 37, 1, 5], ['Sr', 38, 2, 5], ['Y', 39, 3, 5], ['Zr', 40, 4, 5], ['Nb', 41, 5, 5], ['Mo', 42, 6, 5], ['Tc', 43, 7, 5], ['Ru', 44, 8, 5], ['Rh', 45, 9, 5], ['Pd', 46, 10, 5], ['Ag', 47, 11, 5], ['Cd', 48, 12, 5], ['In', 49, 13, 5], ['Sn', 50, 14, 5], ['Sb', 51, 15, 5], ['Te', 52, 16, 5], ['I', 53, 17, 5], ['Xe', 54, 18, 5],
  ['Cs', 55, 1, 6], ['Ba', 56, 2, 6], ['Hf', 72, 4, 6], ['Ta', 73, 5, 6], ['W', 74, 6, 6], ['Re', 75, 7, 6], ['Os', 76, 8, 6], ['Ir', 77, 9, 6], ['Pt', 78, 10, 6], ['Au', 79, 11, 6], ['Hg', 80, 12, 6], ['Tl', 81, 13, 6], ['Pb', 82, 14, 6], ['Bi', 83, 15, 6], ['Po', 84, 16, 6], ['At', 85, 17, 6], ['Rn', 86, 18, 6],
];

export const PERIODIC_LAYOUT: PElement[] = RAW.map(([symbol, number, group, period]) => ({ symbol, number, group, period }));

export interface ElementDetail {
  name: string;
  config: string;  // abbreviated electron configuration
  fact: string;    // one-sentence "did you know"
}

export const ELEMENT_DETAILS: Record<string, ElementDetail> = {
  H:  { name: 'Hydrogen',   config: '1s¹',                fact: 'The most abundant element in the universe; in minerals it hides inside hydroxyl (OH) and water groups.' },
  Li: { name: 'Lithium',    config: '[He] 2s¹',           fact: 'The lightest metal — light enough to float on water before it reacts.' },
  Be: { name: 'Beryllium',  config: '[He] 2s²',           fact: 'Gives beryl its identity; emerald and aquamarine are coloured varieties of beryllium silicate.' },
  B:  { name: 'Boron',      config: '[He] 2s² 2p¹',       fact: 'A backbone of tourmaline; its compounds give borosilicate glass its heat resistance.' },
  C:  { name: 'Carbon',     config: '[He] 2s² 2p²',       fact: 'The same element forms both graphite (soft) and diamond (hardest) — just bonded differently.' },
  N:  { name: 'Nitrogen',   config: '[He] 2s² 2p³',       fact: 'Trace nitrogen trapped in diamond gives many stones a yellow tint.' },
  O:  { name: 'Oxygen',     config: '[He] 2s² 2p⁴',       fact: 'By weight, oxygen makes up nearly half of Earth’s crust — most minerals are oxides or silicates.' },
  F:  { name: 'Fluorine',   config: '[He] 2s² 2p⁵',       fact: 'The most reactive element; fluorite was the original source that gave "fluorescence" its name.' },
  Na: { name: 'Sodium',     config: '[Ne] 3s¹',           fact: 'Burns bright yellow in a flame — the 589 nm glow of street sodium lamps.' },
  Mg: { name: 'Magnesium',  config: '[Ne] 3s²',           fact: 'A key ingredient of olivine and the green peridot gem; also burns with a blinding white light.' },
  Al: { name: 'Aluminium',  config: '[Ne] 3s² 3p¹',       fact: 'The most abundant metal in the crust; corundum (ruby, sapphire) is nearly pure aluminium oxide.' },
  Si: { name: 'Silicon',    config: '[Ne] 3s² 3p²',       fact: 'With oxygen it builds the silicate framework of most rock-forming minerals.' },
  P:  { name: 'Phosphorus', config: '[Ne] 3s² 3p³',       fact: 'Essential to life and to apatite — the mineral your bones and teeth are made of.' },
  S:  { name: 'Sulfur',     config: '[Ne] 3s² 3p⁴',       fact: 'Forms bright yellow crystals around volcanic vents and binds metals into sulfide ores.' },
  Cl: { name: 'Chlorine',   config: '[Ne] 3s² 3p⁵',       fact: 'Half of common salt (halite); a green, choking gas in its pure form.' },
  K:  { name: 'Potassium',  config: '[Ar] 4s¹',           fact: 'Colours feldspars and burns lilac in a flame test.' },
  Ca: { name: 'Calcium',    config: '[Ar] 4s²',           fact: 'The carbonate backbone of calcite, limestone and marble; burns brick-red in flame.' },
  Ti: { name: 'Titanium',   config: '[Ar] 3d² 4s²',       fact: 'Extracted from ilmenite; as strong as steel but far lighter, prized for aircraft and implants.' },
  Cr: { name: 'Chromium',   config: '[Ar] 3d⁵ 4s¹',       fact: 'A pinch of chromium turns colourless corundum into a blood-red ruby.' },
  Mn: { name: 'Manganese',  config: '[Ar] 3d⁵ 4s²',       fact: 'Gives rhodochrosite its rose-pink colour and hardens steel.' },
  Fe: { name: 'Iron',       config: '[Ar] 3d⁶ 4s²',       fact: 'The metal of Earth’s core and of hematite, magnetite and pyrite; rusts to the red of the Outback.' },
  Cu: { name: 'Copper',     config: '[Ar] 3d¹⁰ 4s¹',      fact: 'One of the first metals worked by humans; weathers to the green of malachite and azurite.' },
  Zn: { name: 'Zinc',       config: '[Ar] 3d¹⁰ 4s²',      fact: 'Mined from sphalerite; galvanising coats steel in zinc to stop it rusting.' },
  As: { name: 'Arsenic',    config: '[Ar] 3d¹⁰ 4s² 4p³',  fact: 'A metalloid notorious as a poison; often shadows gold and silver ores.' },
  Ag: { name: 'Silver',     config: '[Kr] 4d¹⁰ 5s¹',      fact: 'The best electrical conductor of all metals; Broken Hill is one of the world’s great silver lodes.' },
  Sn: { name: 'Tin',        config: '[Kr] 4d¹⁰ 5s² 5p²',  fact: 'Alloyed with copper it makes bronze — the metal that named an age.' },
  Pb: { name: 'Lead',       config: '[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p²', fact: 'Dense and soft; mined from galena, which often carries valuable silver too.' },
  Au: { name: 'Gold',       config: '[Xe] 4f¹⁴ 5d¹⁰ 6s¹', fact: 'So unreactive it stays bright forever — which is why ancient gold still gleams.' },
};

// Unique element symbols appearing in a chemical formula (handles subscripts,
// parentheses and solid-solution commas). Filtered to elements in the layout.
const LAYOUT_SYMBOLS = new Set(PERIODIC_LAYOUT.map(e => e.symbol));
export function elementsInFormula(formula: string): string[] {
  const found = formula.match(/[A-Z][a-z]?/g) ?? [];
  return [...new Set(found)].filter(s => LAYOUT_SYMBOLS.has(s));
}
