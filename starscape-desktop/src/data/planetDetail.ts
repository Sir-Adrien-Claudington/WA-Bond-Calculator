// ---------------------------------------------------------------------------
// StarScape — per-planet 3D detail configuration for the Journey viewer
// ---------------------------------------------------------------------------
// Drives the interactive high-resolution planet: axial tilt, atmosphere shell,
// cloud layer, ring style, and the clickable topographic / atmospheric
// hotspots the learner can zoom into. Hotspot lat/lon are approximate and for
// illustration; the facts are accurate public science.
// ---------------------------------------------------------------------------

export type HotspotKind = 'topographic' | 'atmospheric';

export interface Hotspot {
  id: string;
  lat: number; // degrees, -90..90
  lon: number; // degrees, -180..180
  title: string;
  kind: HotspotKind;
  text: string;
}

export interface PlanetDetail {
  tilt: number; // axial tilt, radians
  atmosphere?: { color: string; intensity: number };
  clouds?: boolean;
  ring?: 'saturn' | 'uranus';
  hotspots: Hotspot[];
}

export const PLANET_DETAIL: Record<string, PlanetDetail> = {
  mercury: {
    tilt: 0.001,
    hotspots: [
      {
        id: 'craters', lat: 18, lon: -35, kind: 'topographic',
        title: 'Impact craters',
        text: 'With no atmosphere to erode it, Mercury’s surface is saturated with craters virtually unchanged for billions of years.',
      },
      {
        id: 'caloris', lat: 32, lon: 70, kind: 'topographic',
        title: 'Caloris Basin',
        text: 'One of the largest impact basins in the solar system — about 1,550 km across, gouged by an ancient asteroid strike.',
      },
    ],
  },
  venus: {
    tilt: 3.09,
    atmosphere: { color: '#E8C87A', intensity: 0.6 },
    hotspots: [
      {
        id: 'clouds', lat: 5, lon: 0, kind: 'atmospheric',
        title: 'Sulphuric acid clouds',
        text: 'A crushing CO₂ atmosphere topped with sulphuric-acid clouds traps heat in a runaway greenhouse — the surface sits near 465 °C.',
      },
      {
        id: 'plains', lat: -25, lon: 95, kind: 'topographic',
        title: 'Volcanic plains',
        text: 'Vast lava plains resurface around 80% of Venus, dotted with thousands of volcanoes and almost no impact craters.',
      },
    ],
  },
  earth: {
    tilt: 0.41,
    atmosphere: { color: '#4FA8FF', intensity: 0.9 },
    clouds: true,
    hotspots: [
      {
        id: 'oceans', lat: 15, lon: 5, kind: 'topographic',
        title: 'Continents & oceans',
        text: 'Liquid water covers 71% of the surface — Earth is the only known world with stable oceans and a biosphere.',
      },
      {
        id: 'weather', lat: 0, lon: -65, kind: 'atmospheric',
        title: 'Weather systems',
        text: 'A nitrogen–oxygen atmosphere drives clouds, storms and an ozone layer that shields the surface from UV radiation.',
      },
      {
        id: 'ice', lat: 82, lon: 0, kind: 'topographic',
        title: 'Polar ice caps',
        text: 'Frozen water at both poles anchors a climate system found nowhere else in the solar system.',
      },
    ],
  },
  mars: {
    tilt: 0.44,
    atmosphere: { color: '#D88B5A', intensity: 0.35 },
    hotspots: [
      {
        id: 'olympus', lat: 18, lon: -133, kind: 'topographic',
        title: 'Olympus Mons',
        text: 'The tallest volcano in the solar system — 21.9 km high and nearly three times the height of Mount Everest.',
      },
      {
        id: 'ice', lat: 85, lon: 0, kind: 'topographic',
        title: 'Polar ice caps',
        text: 'Caps of frozen water and CO₂ grow and shrink with the Martian seasons, like Earth’s but far colder.',
      },
      {
        id: 'atmo', lat: -12, lon: 60, kind: 'atmospheric',
        title: 'Thin CO₂ atmosphere',
        text: 'Less than 1% of Earth’s pressure — too thin for liquid water to last on the surface today.',
      },
    ],
  },
  jupiter: {
    tilt: 0.05,
    atmosphere: { color: '#E8C89A', intensity: 0.35 },
    hotspots: [
      {
        id: 'grs', lat: -20, lon: 28, kind: 'atmospheric',
        title: 'Great Red Spot',
        text: 'A storm wider than Earth that has raged for centuries, with winds reaching about 432 km/h.',
      },
      {
        id: 'bands', lat: 26, lon: -45, kind: 'atmospheric',
        title: 'Cloud bands',
        text: 'Alternating jets of ammonia cloud race in opposite directions, painting Jupiter’s signature stripes.',
      },
    ],
  },
  saturn: {
    tilt: 0.47,
    atmosphere: { color: '#E4D191', intensity: 0.3 },
    ring: 'saturn',
    hotspots: [
      {
        id: 'rings', lat: 2, lon: 0, kind: 'topographic',
        title: 'Ring system',
        text: 'Billions of ice and rock particles span 282,000 km yet are under 1 km thick — the jewel of the solar system.',
      },
      {
        id: 'hex', lat: 80, lon: 0, kind: 'atmospheric',
        title: 'Hexagonal polar storm',
        text: 'A bizarre six-sided jet stream wider than Earth circles Saturn’s north pole.',
      },
    ],
  },
  uranus: {
    tilt: 1.71,
    atmosphere: { color: '#7DE8E8', intensity: 0.4 },
    ring: 'uranus',
    hotspots: [
      {
        id: 'haze', lat: 0, lon: 0, kind: 'atmospheric',
        title: 'Methane haze',
        text: 'Methane in the upper atmosphere absorbs red light, giving Uranus its pale cyan colour.',
      },
      {
        id: 'tilt', lat: 60, lon: 40, kind: 'topographic',
        title: '98° axial tilt',
        text: 'Knocked on its side by an ancient impact, each pole endures 42 years of sunlight then 42 of darkness.',
      },
    ],
  },
  neptune: {
    tilt: 0.49,
    atmosphere: { color: '#4B70DD', intensity: 0.4 },
    hotspots: [
      {
        id: 'winds', lat: -15, lon: -25, kind: 'atmospheric',
        title: 'Supersonic winds',
        text: 'The fastest winds in the solar system — gusting up to about 2,100 km/h.',
      },
      {
        id: 'spot', lat: -28, lon: 45, kind: 'atmospheric',
        title: 'Dark storms',
        text: 'Great Dark Spots — Earth-sized storms that appear and vanish over a few years.',
      },
    ],
  },
};
