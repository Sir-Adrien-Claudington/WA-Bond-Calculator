// ---------------------------------------------------------------------------
// StarScape — deep space objects (beyond the eight planets)
// ---------------------------------------------------------------------------
// All facts are public scientific data. Positions are scene-space (artistic,
// not to scale — the explorer compresses ~100,000 light-years into one view).
// ---------------------------------------------------------------------------

export interface DeepSpaceObject {
  id: string;
  name: string;
  kind: 'Star' | 'Star System' | 'Black Hole' | 'Nebula' | 'Cluster' | 'Dwarf Planet' | 'Region';
  color: string; // glow / accent colour
  distance: string; // human-readable true distance
  description: string;
  facts: Array<[string, string]>;
  /** scene-space position; omitted for objects placed procedurally */
  pos?: [number, number, number];
  /** sprite scale in scene units */
  size?: number;
}

export const SUN_INFO: DeepSpaceObject = {
  id: 'sun',
  name: 'The Sun',
  kind: 'Star',
  color: '#FFB347',
  distance: '1 AU from Earth',
  description:
    'A G-type main-sequence star holding 99.86% of the solar system’s mass. Every second it fuses 600 million tonnes of hydrogen into helium.',
  facts: [
    ['Diameter', '1.39M km'],
    ['Surface', '5,505°C'],
    ['Core', '15M °C'],
    ['Age', '4.6B years'],
  ],
};

export const PLUTO_INFO: DeepSpaceObject = {
  id: 'pluto',
  name: 'Pluto',
  kind: 'Dwarf Planet',
  color: '#C9B29B',
  distance: '39.5 AU from the Sun',
  description:
    'The largest known Kuiper Belt object. Reclassified as a dwarf planet in 2006, it has a heart-shaped nitrogen glacier the size of Texas.',
  facts: [
    ['Diameter', '2,377 km'],
    ['Year', '248 years'],
    ['Moons', '5'],
    ['Temp', '−229°C'],
  ],
};

export const KUIPER_INFO: DeepSpaceObject = {
  id: 'kuiper',
  name: 'Kuiper Belt',
  kind: 'Region',
  color: '#7FB8C4',
  distance: '30–55 AU from the Sun',
  description:
    'A vast torus of icy bodies beyond Neptune — leftovers from the solar system’s formation. Home to Pluto, Eris, Makemake, and trillions of comets.',
  facts: [
    ['Span', '30–55 AU'],
    ['Known objects', '3,000+'],
    ['Est. total', '100,000+ >100 km'],
    ['Discovered', '1992'],
  ],
};

export const SAG_A: DeepSpaceObject = {
  id: 'sag-a',
  name: 'Sagittarius A*',
  kind: 'Black Hole',
  color: '#FF8C42',
  distance: '26,000 light-years',
  description:
    'The supermassive black hole at the centre of the Milky Way — 4.3 million solar masses compressed inside an event horizon smaller than Mercury’s orbit. First imaged by the Event Horizon Telescope in 2022.',
  facts: [
    ['Mass', '4.3M suns'],
    ['Event horizon', '~24M km'],
    ['Imaged', '2022 (EHT)'],
    ['Nobel Prize', '2020'],
  ],
};

export const MILKY_WAY: DeepSpaceObject = {
  id: 'milky-way',
  name: 'Milky Way',
  kind: 'Region',
  color: '#B8C8FF',
  distance: 'You are here',
  description:
    'Our barred spiral galaxy: 100–400 billion stars in a disc 100,000 light-years across. The Sun sits in the Orion Arm, orbiting the centre once every 230 million years.',
  facts: [
    ['Stars', '100–400B'],
    ['Diameter', '~100,000 ly'],
    ['Sun’s orbit', '230M years'],
    ['Age', '13.6B years'],
  ],
};

// Nearby / notable stars rendered as glowing sprites at interstellar zoom.
// Scene positions are directional art — relative brightness/colour are real.
export const DEEP_STARS: DeepSpaceObject[] = [
  {
    id: 'alpha-cen',
    name: 'Alpha Centauri',
    kind: 'Star System',
    color: '#FFE9C4',
    distance: '4.37 light-years',
    pos: [260, 40, -180],
    size: 16,
    description:
      'The closest star system to the Sun — a triple system. Proxima Centauri hosts a rocky planet in its habitable zone.',
    facts: [
      ['Distance', '4.37 ly'],
      ['Stars', '3'],
      ['Planet', 'Proxima b'],
      ['Travel @ Voyager speed', '~75,000 yrs'],
    ],
  },
  {
    id: 'sirius',
    name: 'Sirius',
    kind: 'Star',
    color: '#CFE4FF',
    distance: '8.6 light-years',
    pos: [-310, 90, 220],
    size: 20,
    description:
      'The brightest star in Earth’s night sky. A blue-white main-sequence star orbited by Sirius B — a white dwarf the size of Earth with the mass of the Sun.',
    facts: [
      ['Distance', '8.6 ly'],
      ['Magnitude', '−1.46'],
      ['Mass', '2× Sun'],
      ['Companion', 'White dwarf'],
    ],
  },
  {
    id: 'vega',
    name: 'Vega',
    kind: 'Star',
    color: '#E8F0FF',
    distance: '25 light-years',
    pos: [150, 200, 340],
    size: 17,
    description:
      'The northern summer beacon. Spins so fast it bulges at the equator. Was the pole star 12,000 BCE — and will be again in 13,700 CE.',
    facts: [
      ['Distance', '25 ly'],
      ['Rotation', '12.5 hrs'],
      ['Temp', '9,600 K'],
      ['Debris disc', 'Yes'],
    ],
  },
  {
    id: 'betelgeuse',
    name: 'Betelgeuse',
    kind: 'Star',
    color: '#FF9E6B',
    distance: '~550 light-years',
    pos: [-220, -110, -380],
    size: 26,
    description:
      'A red supergiant on the edge of collapse. If placed at the Sun’s position it would swallow Jupiter. It will go supernova within 100,000 years — bright enough to see in daylight.',
    facts: [
      ['Radius', '~760× Sun'],
      ['Fate', 'Supernova'],
      ['Age', '~10M years'],
      ['Dimming event', '2019–20'],
    ],
  },
  {
    id: 'pleiades',
    name: 'Pleiades',
    kind: 'Cluster',
    color: '#A9C8FF',
    distance: '444 light-years',
    pos: [420, 130, 120],
    size: 30,
    description:
      'The Seven Sisters — an open cluster of hot blue stars under 100 million years old, still wrapped in wisps of reflecting dust. Visible to the naked eye from anywhere on Earth.',
    facts: [
      ['Stars', '~1,000'],
      ['Age', '<100M years'],
      ['Naked-eye', '6–9 stars'],
      ['Catalogued', 'M45'],
    ],
  },
  {
    id: 'orion-nebula',
    name: 'Orion Nebula',
    kind: 'Nebula',
    color: '#E8A0C8',
    distance: '1,344 light-years',
    pos: [-440, 60, -120],
    size: 34,
    description:
      'The nearest massive star-forming region to Earth — a stellar nursery 24 light-years across where new suns ignite inside collapsing gas. Visible as the middle "star" of Orion’s sword.',
    facts: [
      ['Span', '24 ly'],
      ['Mass', '~2,000 suns'],
      ['New stars', '~700 forming'],
      ['Catalogued', 'M42'],
    ],
  },
];
