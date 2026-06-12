// ---------------------------------------------------------------------------
// StarScape — Learning Games content
// ---------------------------------------------------------------------------
// Tiered educational mini-games about the universe, designed to slot into
// EduTrack as "learning accessories". Three levels:
//   beginner       — recognition, ordering, simple facts
//   intermediate   — comparisons, clues, reasoning
//   knowledgeable  — deep space, classification, cosmic scale
// All content is public scientific fact, consistent with planets.ts /
// deepSpace.ts. No network, no PII — pure client-side play.
// ---------------------------------------------------------------------------

export type Tier = 'beginner' | 'intermediate' | 'knowledgeable';
export type GameKind = 'quiz' | 'order';

export interface GameDef {
  id: string;
  tier: Tier;
  kind: GameKind;
  title: string;
  blurb: string;
  icon: string; // emoji
  accent: string; // hex
}

export interface QuizQuestion {
  q: string;
  options: string[];
  answer: number; // index into options
  explain: string;
}

export interface OrderChallenge {
  instruction: string;
  // items listed in the CORRECT order; the game shuffles them for play
  items: Array<{ label: string; sub: string }>;
}

export const TIER_META: Record<Tier, { label: string; level: string; color: string; note: string }> = {
  beginner: {
    label: 'Beginner',
    level: 'Level 1',
    color: '#00BFA5',
    note: 'First steps into space — names, sizes, and the order of the planets.',
  },
  intermediate: {
    label: 'Intermediate',
    level: 'Level 2',
    color: '#FFB347',
    note: 'Compare worlds, follow the clues, and tell fact from fiction.',
  },
  knowledgeable: {
    label: 'Knowledgeable',
    level: 'Level 3',
    color: '#C792EA',
    note: 'Stars, black holes, and the true scale of the cosmos.',
  },
};

export const GAMES: GameDef[] = [
  // --- Beginner ---------------------------------------------------------------
  {
    id: 'b-planet-basics', tier: 'beginner', kind: 'quiz',
    title: 'Planet Basics', icon: '🪐', accent: '#4F9AF2',
    blurb: 'Meet the eight planets and learn what makes each one special.',
  },
  {
    id: 'b-order-sun', tier: 'beginner', kind: 'order',
    title: 'Order from the Sun', icon: '☀️', accent: '#FFB347',
    blurb: 'Put the planets in order, closest to the Sun first.',
  },
  {
    id: 'b-big-small', tier: 'beginner', kind: 'quiz',
    title: 'Big & Small', icon: '📏', accent: '#00BFA5',
    blurb: 'Which planet is bigger? Spot the giants and the tiddlers.',
  },
  // --- Intermediate -----------------------------------------------------------
  {
    id: 'i-mystery-planet', tier: 'intermediate', kind: 'quiz',
    title: 'Mystery Planet', icon: '🔍', accent: '#C1440E',
    blurb: 'Read the clues and work out which world is being described.',
  },
  {
    id: 'i-match-stat', tier: 'intermediate', kind: 'quiz',
    title: 'Match the Stat', icon: '📊', accent: '#E4D191',
    blurb: 'Days, years, moons and temperatures — match them to the right planet.',
  },
  {
    id: 'i-fact-fiction', tier: 'intermediate', kind: 'quiz',
    title: 'Fact or Fiction', icon: '⚖️', accent: '#7DE8E8',
    blurb: 'True or false? Test what you really know about the solar system.',
  },
  // --- Knowledgeable ----------------------------------------------------------
  {
    id: 'k-deep-space', tier: 'knowledgeable', kind: 'quiz',
    title: 'Deep Space', icon: '🌌', accent: '#B8C8FF',
    blurb: 'Stars, nebulae, black holes and the edge of the solar system.',
  },
  {
    id: 'k-classify', tier: 'knowledgeable', kind: 'quiz',
    title: 'Classify the Object', icon: '🔭', accent: '#C792EA',
    blurb: 'Star, nebula, dwarf planet or black hole? Identify it from the description.',
  },
  {
    id: 'k-cosmic-distance', tier: 'knowledgeable', kind: 'order',
    title: 'Cosmic Distances', icon: '📐', accent: '#FF8C42',
    blurb: 'Order these objects from nearest to most unimaginably far.',
  },
];

// ---------------------------------------------------------------------------
// Quiz banks
// ---------------------------------------------------------------------------

export const QUIZZES: Record<string, QuizQuestion[]> = {
  'b-planet-basics': [
    {
      q: 'Which planet do we live on?',
      options: ['Mars', 'Earth', 'Jupiter', 'Venus'],
      answer: 1,
      explain: 'Earth is the only planet known to have life and liquid water on its surface.',
    },
    {
      q: 'Which planet is known as the "Red Planet"?',
      options: ['Mercury', 'Neptune', 'Mars', 'Saturn'],
      answer: 2,
      explain: 'Mars looks red because its soil is full of rusty iron oxide.',
    },
    {
      q: 'Which planet has the most beautiful rings?',
      options: ['Saturn', 'Earth', 'Mercury', 'Venus'],
      answer: 0,
      explain: 'Saturn’s rings span 282,000 km but are less than 1 km thick — mostly ice and rock.',
    },
    {
      q: 'Which is the largest planet in our solar system?',
      options: ['Earth', 'Neptune', 'Jupiter', 'Mars'],
      answer: 2,
      explain: 'Jupiter is so big that all the other planets could fit inside it.',
    },
    {
      q: 'Which planet is closest to the Sun?',
      options: ['Venus', 'Mercury', 'Earth', 'Mars'],
      answer: 1,
      explain: 'Mercury is the closest planet and races around the Sun in just 88 days.',
    },
    {
      q: 'What do we call the star at the centre of our solar system?',
      options: ['The Moon', 'Polaris', 'The Sun', 'Sirius'],
      answer: 2,
      explain: 'The Sun holds 99.86% of all the mass in the solar system.',
    },
  ],
  'b-big-small': [
    {
      q: 'Which planet is bigger?',
      options: ['Jupiter', 'Earth'],
      answer: 0,
      explain: 'Jupiter is about 11 times wider than Earth.',
    },
    {
      q: 'Which planet is smaller?',
      options: ['Saturn', 'Mercury'],
      answer: 1,
      explain: 'Mercury is the smallest planet — barely bigger than our Moon.',
    },
    {
      q: 'Which is the biggest planet of all?',
      options: ['Saturn', 'Jupiter', 'Neptune'],
      answer: 1,
      explain: 'Jupiter is the largest — more massive than all the other planets combined.',
    },
    {
      q: 'Which planet is about the same size as Earth?',
      options: ['Venus', 'Jupiter', 'Mercury'],
      answer: 0,
      explain: 'Venus is often called Earth’s twin because they are nearly the same size.',
    },
    {
      q: 'Which planet is bigger?',
      options: ['Mars', 'Neptune'],
      answer: 1,
      explain: 'Neptune is an ice giant — much larger than the small, rocky Mars.',
    },
  ],
  'i-mystery-planet': [
    {
      q: 'I am a gas giant with a storm bigger than Earth that has raged for centuries. Who am I?',
      options: ['Saturn', 'Jupiter', 'Neptune', 'Uranus'],
      answer: 1,
      explain: 'Jupiter’s Great Red Spot is a storm wider than our entire planet.',
    },
    {
      q: 'I am the hottest planet, wrapped in thick clouds of sulphuric acid. Who am I?',
      options: ['Mercury', 'Mars', 'Venus', 'Jupiter'],
      answer: 2,
      explain: 'Venus traps heat in a runaway greenhouse effect — about 465°C, hotter even than Mercury.',
    },
    {
      q: 'I spin on my side because of an ancient collision, giving 42-year seasons. Who am I?',
      options: ['Uranus', 'Neptune', 'Saturn', 'Earth'],
      answer: 0,
      explain: 'Uranus has a 98° axial tilt — it essentially rolls around the Sun.',
    },
    {
      q: 'I am home to Olympus Mons, the tallest volcano in the solar system. Who am I?',
      options: ['Venus', 'Mars', 'Mercury', 'Earth'],
      answer: 1,
      explain: 'Olympus Mons on Mars stands 21.9 km tall — nearly three times the height of Everest.',
    },
    {
      q: 'I am the windiest planet, with storms reaching 2,100 km/h. Who am I?',
      options: ['Jupiter', 'Saturn', 'Neptune', 'Uranus'],
      answer: 2,
      explain: 'Neptune has the fastest winds in the solar system.',
    },
    {
      q: 'I have almost no atmosphere, so I swing from 430°C to −180°C. Who am I?',
      options: ['Mercury', 'Mars', 'Venus', 'Pluto'],
      answer: 0,
      explain: 'With no atmosphere to hold heat, Mercury has the most extreme temperature swings.',
    },
  ],
  'i-match-stat': [
    {
      q: 'Which planet has 146 known moons and a giant ring system?',
      options: ['Jupiter', 'Saturn', 'Uranus', 'Neptune'],
      answer: 1,
      explain: 'Saturn leads the moon count with around 146 confirmed moons.',
    },
    {
      q: 'Which planet has a day longer than its year?',
      options: ['Venus', 'Mercury', 'Mars', 'Earth'],
      answer: 0,
      explain: 'Venus rotates so slowly that one day (243 Earth days) is longer than its year (225 days).',
    },
    {
      q: 'A year here lasts 165 Earth years. Which planet?',
      options: ['Uranus', 'Neptune', 'Saturn', 'Pluto'],
      answer: 1,
      explain: 'Neptune is so far out that it takes 165 Earth years to orbit the Sun once.',
    },
    {
      q: 'Which planet has exactly one moon?',
      options: ['Mars', 'Venus', 'Earth', 'Mercury'],
      answer: 2,
      explain: 'Earth has a single moon; Mars has two, and Venus and Mercury have none.',
    },
    {
      q: 'A day here is only about 9.9 hours — the fastest spin of any planet. Which?',
      options: ['Jupiter', 'Saturn', 'Neptune', 'Earth'],
      answer: 0,
      explain: 'Despite being the biggest, Jupiter spins fastest — a day lasts under 10 hours.',
    },
  ],
  'i-fact-fiction': [
    {
      q: 'TRUE or FALSE: The Sun is a planet.',
      options: ['True', 'False'],
      answer: 1,
      explain: 'False — the Sun is a star. Planets orbit around it.',
    },
    {
      q: 'TRUE or FALSE: Jupiter has more mass than all the other planets combined.',
      options: ['True', 'False'],
      answer: 0,
      explain: 'True — Jupiter is more massive than all seven other planets put together.',
    },
    {
      q: 'TRUE or FALSE: You could stand on the surface of Saturn.',
      options: ['True', 'False'],
      answer: 1,
      explain: 'False — Saturn is a gas giant with no solid surface to stand on.',
    },
    {
      q: 'TRUE or FALSE: Mars has the tallest volcano in the solar system.',
      options: ['True', 'False'],
      answer: 0,
      explain: 'True — Olympus Mons on Mars is 21.9 km tall.',
    },
    {
      q: 'TRUE or FALSE: Venus is the closest planet to the Sun.',
      options: ['True', 'False'],
      answer: 1,
      explain: 'False — Mercury is closest; Venus is the second planet.',
    },
    {
      q: 'TRUE or FALSE: Light from the Sun takes about 8 minutes to reach Earth.',
      options: ['True', 'False'],
      answer: 0,
      explain: 'True — sunlight travels 150 million km in roughly 8 minutes and 20 seconds.',
    },
  ],
  'k-deep-space': [
    {
      q: 'What is Sagittarius A*?',
      options: [
        'A nearby star',
        'The supermassive black hole at the centre of the Milky Way',
        'A comet',
        'A moon of Saturn',
      ],
      answer: 1,
      explain: 'Sagittarius A* is a 4.3-million-solar-mass black hole, first imaged in 2022.',
    },
    {
      q: 'The Kuiper Belt is a region of icy bodies found where?',
      options: [
        'Between Mars and Jupiter',
        'Inside Mercury’s orbit',
        'Beyond Neptune',
        'At the centre of the galaxy',
      ],
      answer: 2,
      explain: 'The Kuiper Belt lies 30–55 AU from the Sun, beyond Neptune — Pluto lives there.',
    },
    {
      q: 'Betelgeuse is a red supergiant expected to one day become a…',
      options: ['Black hole instantly', 'Supernova', 'Planet', 'Comet'],
      answer: 1,
      explain: 'Betelgeuse will explode as a supernova within ~100,000 years, briefly visible in daylight.',
    },
    {
      q: 'Which is the closest star system to our Sun?',
      options: ['Sirius', 'Vega', 'Alpha Centauri', 'Betelgeuse'],
      answer: 2,
      explain: 'Alpha Centauri is 4.37 light-years away and includes Proxima Centauri.',
    },
    {
      q: 'What is the Orion Nebula?',
      options: [
        'A dying star',
        'A stellar nursery where new stars are born',
        'A black hole',
        'A planet',
      ],
      answer: 1,
      explain: 'The Orion Nebula is the nearest massive star-forming region — about 1,344 light-years away.',
    },
    {
      q: 'Roughly how wide is the Milky Way galaxy?',
      options: ['100 light-years', '1,000 light-years', '100,000 light-years', '1 light-year'],
      answer: 2,
      explain: 'The Milky Way is about 100,000 light-years across and holds 100–400 billion stars.',
    },
  ],
  'k-classify': [
    {
      q: 'The Pleiades — a group of about 1,000 young blue stars wrapped in dust. What is it?',
      options: ['A nebula', 'An open star cluster', 'A black hole', 'A dwarf planet'],
      answer: 1,
      explain: 'The Pleiades (M45) is an open cluster of hot young stars, visible to the naked eye.',
    },
    {
      q: 'Pluto — 2,377 km wide, orbits in the Kuiper Belt, reclassified in 2006. What is it?',
      options: ['A planet', 'A dwarf planet', 'A comet', 'A moon'],
      answer: 1,
      explain: 'Pluto was reclassified as a dwarf planet in 2006 — the largest known Kuiper Belt object.',
    },
    {
      q: 'Sirius — the brightest star in our night sky, 8.6 light-years away. What is it?',
      options: ['A planet', 'A nebula', 'A star', 'A galaxy'],
      answer: 2,
      explain: 'Sirius is a blue-white main-sequence star with a white-dwarf companion, Sirius B.',
    },
    {
      q: 'An object so dense that not even light can escape its event horizon. What is it?',
      options: ['A white dwarf', 'A black hole', 'A red giant', 'A nebula'],
      answer: 1,
      explain: 'A black hole’s gravity is so strong that light cannot escape past its event horizon.',
    },
    {
      q: 'A vast cloud of gas and dust where new stars ignite. What is it?',
      options: ['A nebula', 'A comet', 'A dwarf planet', 'A star cluster'],
      answer: 0,
      explain: 'A nebula is a cloud of gas and dust — many are stellar nurseries.',
    },
  ],
};

// ---------------------------------------------------------------------------
// Ordering challenges
// ---------------------------------------------------------------------------

export const ORDERS: Record<string, OrderChallenge> = {
  'b-order-sun': {
    instruction: 'Tap the planets in order, starting with the one closest to the Sun.',
    items: [
      { label: 'Mercury', sub: '1st from the Sun' },
      { label: 'Venus', sub: '2nd from the Sun' },
      { label: 'Earth', sub: '3rd from the Sun' },
      { label: 'Mars', sub: '4th from the Sun' },
      { label: 'Jupiter', sub: '5th from the Sun' },
      { label: 'Saturn', sub: '6th from the Sun' },
      { label: 'Uranus', sub: '7th from the Sun' },
      { label: 'Neptune', sub: '8th from the Sun' },
    ],
  },
  'k-cosmic-distance': {
    instruction: 'Tap these objects in order, from the nearest to Earth to the most distant.',
    items: [
      { label: 'The Moon', sub: '384,400 km' },
      { label: 'The Sun', sub: '1 AU (150M km)' },
      { label: 'Pluto', sub: '39.5 AU' },
      { label: 'Alpha Centauri', sub: '4.37 light-years' },
      { label: 'Betelgeuse', sub: '~550 light-years' },
      { label: 'Sagittarius A*', sub: '26,000 light-years' },
    ],
  },
};
