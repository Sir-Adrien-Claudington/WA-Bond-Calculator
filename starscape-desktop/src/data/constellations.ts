// ---------------------------------------------------------------------------
// StarScape — constellation stick-figures (real equatorial coordinates)
// ---------------------------------------------------------------------------
// A curated set of prominent constellations. Each star is a real bright star
// at its J2000 right ascension / declination (degrees); `lines` are index
// pairs forming the traditional stick figure; `center` is used to place the
// constellation's name label. Public astronomical data.
// ---------------------------------------------------------------------------

export interface Constellation {
  name: string;
  /** [raDeg, decDeg] for each star in the figure */
  stars: Array<[number, number]>;
  /** index pairs into `stars` */
  lines: Array<[number, number]>;
  /** [raDeg, decDeg] label anchor */
  center: [number, number];
}

export const CONSTELLATIONS: Constellation[] = [
  {
    name: 'Orion',
    stars: [
      [88.79, 7.41],   // 0 Betelgeuse
      [81.28, 6.35],   // 1 Bellatrix
      [83.0, -0.3],    // 2 Mintaka
      [84.05, -1.2],   // 3 Alnilam
      [85.19, -1.94],  // 4 Alnitak
      [86.94, -9.67],  // 5 Saiph
      [78.63, -8.2],   // 6 Rigel
    ],
    lines: [[0, 1], [0, 4], [1, 2], [2, 3], [3, 4], [4, 5], [2, 6], [5, 6]],
    center: [83, -1],
  },
  {
    name: 'Ursa Major',
    stars: [
      [165.93, 61.75], // 0 Dubhe
      [165.46, 56.38], // 1 Merak
      [178.46, 53.69], // 2 Phecda
      [183.86, 57.03], // 3 Megrez
      [193.51, 55.96], // 4 Alioth
      [200.98, 54.93], // 5 Mizar
      [206.89, 49.31], // 6 Alkaid
    ],
    lines: [[0, 1], [1, 2], [2, 3], [3, 0], [3, 4], [4, 5], [5, 6]],
    center: [185, 56],
  },
  {
    name: 'Cassiopeia',
    stars: [
      [2.29, 59.15],  // 0 Caph
      [10.13, 56.54], // 1 Schedar
      [14.18, 60.72], // 2 Gamma Cas
      [21.45, 60.24], // 3 Ruchbah
      [28.6, 63.67],  // 4 Segin
    ],
    lines: [[0, 1], [1, 2], [2, 3], [3, 4]],
    center: [14, 60],
  },
  {
    name: 'Cygnus',
    stars: [
      [310.36, 45.28], // 0 Deneb
      [305.56, 40.26], // 1 Sadr
      [305.25, 33.97], // 2 Gienah
      [296.24, 45.13], // 3 Delta Cyg
      [292.43, 27.96], // 4 Albireo
    ],
    lines: [[0, 1], [1, 2], [1, 3], [1, 4]],
    center: [305, 39],
  },
  {
    name: 'Lyra',
    stars: [
      [279.23, 38.78], // 0 Vega
      [282.52, 33.36], // 1 Sheliak
      [284.74, 32.69], // 2 Sulafat
    ],
    lines: [[0, 1], [1, 2], [2, 0]],
    center: [282, 36],
  },
  {
    name: 'Scorpius',
    stars: [
      [247.35, -26.43], // 0 Antares
      [241.36, -19.81], // 1 Graffias
      [240.08, -22.62], // 2 Dschubba
      [245.3, -25.59],  // 3 Sigma Sco
      [248.97, -28.22], // 4 Tau Sco
      [263.4, -37.1],   // 5 Shaula
      [264.33, -43.0],  // 6 Sargas
    ],
    lines: [[1, 2], [2, 3], [3, 0], [0, 4], [4, 5], [5, 6]],
    center: [252, -30],
  },
  {
    name: 'Leo',
    stars: [
      [152.09, 11.97], // 0 Regulus
      [177.26, 14.57], // 1 Denebola
      [154.99, 19.84], // 2 Algieba
      [168.53, 20.52], // 3 Zosma
      [168.56, 15.43], // 4 Chort
    ],
    lines: [[0, 2], [2, 3], [3, 1], [1, 4], [4, 0]],
    center: [164, 16],
  },
  {
    name: 'Taurus',
    stars: [
      [68.98, 16.51], // 0 Aldebaran
      [81.57, 28.61], // 1 Elnath
      [64.95, 15.63], // 2 Gamma Tau
    ],
    lines: [[0, 1], [0, 2]],
    center: [70, 19],
  },
  {
    name: 'Gemini',
    stars: [
      [113.65, 31.89], // 0 Castor
      [116.33, 28.03], // 1 Pollux
      [99.43, 16.4],   // 2 Alhena
      [100.98, 25.13], // 3 Mebsuta
    ],
    lines: [[0, 1], [0, 3], [3, 2]],
    center: [109, 26],
  },
  {
    name: 'Canis Major',
    stars: [
      [101.29, -16.72], // 0 Sirius
      [95.67, -17.96],  // 1 Mirzam
      [107.1, -26.39],  // 2 Wezen
      [104.66, -28.97], // 3 Adhara
      [111.02, -29.3],  // 4 Aludra
    ],
    lines: [[1, 0], [0, 2], [2, 3], [3, 4], [2, 4]],
    center: [104, -24],
  },
  {
    name: 'Crux',
    stars: [
      [186.65, -63.1],  // 0 Acrux
      [191.93, -59.69], // 1 Mimosa
      [187.79, -57.11], // 2 Gacrux
      [183.79, -58.75], // 3 Delta Cru
    ],
    lines: [[0, 2], [1, 3]],
    center: [187, -60],
  },
];
