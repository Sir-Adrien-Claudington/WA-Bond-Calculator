// ---------------------------------------------------------------------------
// StarScape — Cosmos Explorer planet data
// ---------------------------------------------------------------------------
// Static reference data for the Solar System Explorer, Dashboard, and Scroll
// Journey views. All values are public scientific facts (not copyrightable).
// Visual radii / orbit radii are scene units, not to scale.
// ---------------------------------------------------------------------------

export interface Planet {
  id: string;
  name: string;
  type: 'Terrestrial' | 'Gas Giant' | 'Ice Giant' | 'Dwarf';
  // Three.js scene
  radius: number; // visual radius (Earth = 1)
  orbitRadius: number; // distance from sun in scene units
  orbitSpeed: number; // radians per second (scaled)
  color: string; // hex for Three.js material
  hasRings?: boolean;
  // UI
  displayColor: string; // hex for CSS panels and scroll sections
  // astronomy-engine body name
  astronomyId?: string;
  // Content
  type_label: string;
  stats: Array<[string, string]>;
  description: string;
  facts: Array<[string, string]>;
  surfaceTemp: string;
  moons: number;
  distanceAU: number;
}

export const PLANETS: Planet[] = [
  {
    id: 'mercury', name: 'Mercury', type: 'Terrestrial',
    radius: 0.4, orbitRadius: 8.5, orbitSpeed: 0.047, color: '#A8A8A8',
    displayColor: '#9B9B9B', astronomyId: 'Mercury',
    type_label: 'Terrestrial Planet', moons: 0, distanceAU: 0.39, surfaceTemp: '-180° to 430°C',
    stats: [['Distance', '77.3M km'], ['Day', '58.6 days'], ['Year', '88 days'], ['Temp', '-180° to 430°C']],
    description: 'The smallest planet. No atmosphere means temperatures swing from 430°C in sunlight to −180°C in darkness.',
    facts: [['Diameter', '4,879 km'], ['Gravity', '3.7 m/s²'], ['Moons', '0'], ['Max temp', '430°C']],
  },
  {
    id: 'venus', name: 'Venus', type: 'Terrestrial',
    radius: 0.9, orbitRadius: 12.5, orbitSpeed: 0.035, color: '#D4B896',
    displayColor: '#C8A070', astronomyId: 'Venus',
    type_label: 'Terrestrial Planet', moons: 0, distanceAU: 0.72, surfaceTemp: '465°C avg',
    stats: [['Distance', '261M km'], ['Day', '243 days'], ['Year', '225 days'], ['Temp', '465°C']],
    description: 'The hottest planet. Dense sulphuric acid clouds trap heat in a runaway greenhouse effect that never lifts.',
    facts: [['Diameter', '12,104 km'], ['Gravity', '8.87 m/s²'], ['Moons', '0'], ['Pressure', '92× Earth']],
  },
  {
    id: 'earth', name: 'Earth', type: 'Terrestrial',
    radius: 1, orbitRadius: 17, orbitSpeed: 0.029, color: '#4F9AF2',
    displayColor: '#2E7FCC', astronomyId: 'Earth',
    type_label: 'Terrestrial Planet', moons: 1, distanceAU: 1, surfaceTemp: '-89° to 58°C',
    stats: [['Distance', '150M km'], ['Day', '24 hours'], ['Year', '365.25 days'], ['Temp', '-89° to 58°C']],
    description: 'The only known world with life. Liquid water covers 71% of the surface, shielded by a magnetosphere.',
    facts: [['Diameter', '12,742 km'], ['Gravity', '9.81 m/s²'], ['Moons', '1'], ['Oceans', '71%']],
  },
  {
    id: 'mars', name: 'Mars', type: 'Terrestrial',
    radius: 0.55, orbitRadius: 23, orbitSpeed: 0.024, color: '#C1440E',
    displayColor: '#A03808', astronomyId: 'Mars',
    type_label: 'Terrestrial Planet', moons: 2, distanceAU: 1.52, surfaceTemp: '-125° to 20°C',
    stats: [['Distance', '228M km'], ['Day', '24h 37m'], ['Year', '687 days'], ['Temp', '-125° to 20°C']],
    description: "The Red Planet. Iron oxide coats everything. Olympus Mons stands 21.9 km tall — the solar system's highest peak.",
    facts: [['Diameter', '6,779 km'], ['Gravity', '3.72 m/s²'], ['Moons', '2'], ['Olympus Mons', '21.9 km']],
  },
  {
    id: 'jupiter', name: 'Jupiter', type: 'Gas Giant',
    radius: 3, orbitRadius: 33.5, orbitSpeed: 0.013, color: '#C88B3A',
    displayColor: '#A07020', astronomyId: 'Jupiter',
    type_label: 'Gas Giant', moons: 95, distanceAU: 5.2, surfaceTemp: '-108°C cloud tops',
    stats: [['Distance', '778M km'], ['Day', '9.9 hours'], ['Year', '11.9 years'], ['Winds', '540 km/h']],
    description: 'More mass than all other planets combined. The Great Red Spot is a storm larger than Earth that has raged for centuries.',
    facts: [['Diameter', '139,820 km'], ['Gravity', '24.79 m/s²'], ['Moons', '95'], ['Mass', '318× Earth']],
  },
  {
    id: 'saturn', name: 'Saturn', type: 'Gas Giant',
    radius: 2.5, orbitRadius: 44, orbitSpeed: 0.0097, color: '#E4D191',
    displayColor: '#C8B060', astronomyId: 'Saturn', hasRings: true,
    type_label: 'Gas Giant', moons: 146, distanceAU: 9.58, surfaceTemp: '-139°C cloud tops',
    stats: [['Distance', '1.43B km'], ['Day', '10.7 hours'], ['Year', '29.5 years'], ['Rings', '282,000 km']],
    description: 'The jewel of the solar system. Its ring system spans 282,000 km but is less than 1 km thick — mostly water ice and rock.',
    facts: [['Diameter', '116,460 km'], ['Gravity', '10.44 m/s²'], ['Moons', '146'], ['Ring span', '282,000 km']],
  },
  {
    id: 'uranus', name: 'Uranus', type: 'Ice Giant',
    radius: 1.9, orbitRadius: 55, orbitSpeed: 0.0068, color: '#7DE8E8',
    displayColor: '#40C8C8', astronomyId: 'Uranus',
    type_label: 'Ice Giant', moons: 28, distanceAU: 19.2, surfaceTemp: '-197°C',
    stats: [['Distance', '2.87B km'], ['Day', '17.2 hours'], ['Year', '84 years'], ['Tilt', '98°']],
    description: 'An ice giant on its side. A 98° axial tilt — from an ancient collision — means each pole gets 42-year seasons.',
    facts: [['Diameter', '50,724 km'], ['Gravity', '8.87 m/s²'], ['Moons', '28'], ['Axial tilt', '98°']],
  },
  {
    id: 'neptune', name: 'Neptune', type: 'Ice Giant',
    radius: 1.8, orbitRadius: 65, orbitSpeed: 0.0054, color: '#4B70DD',
    displayColor: '#3050B8', astronomyId: 'Neptune',
    type_label: 'Ice Giant', moons: 16, distanceAU: 30.1, surfaceTemp: '-201°C',
    stats: [['Distance', '4.5B km'], ['Day', '16.1 hours'], ['Year', '165 years'], ['Winds', '2,100 km/h']],
    description: 'The windiest planet. Storms reach 2,100 km/h. First predicted mathematically before it was ever observed through a telescope.',
    facts: [['Diameter', '49,244 km'], ['Gravity', '11.15 m/s²'], ['Moons', '16'], ['Wind speed', '2,100 km/h']],
  },
];
