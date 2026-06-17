// Phase 3.3 — "Used in" chains.
// A mineral's journey from ground to real-world use, as a sequence of pills.
// Minerals without an authored chain fall back to a single pill built from
// their `uses` sentence (see UsesChain.tsx).

export interface UsesStep {
  label: string;
  icon: string;    // emoji for MVP
  detail: string;  // 1–2 sentences
  stat: string;    // one real-world statistic
}

export interface UsesChain {
  mineralId: string;
  steps: UsesStep[];
}

export const USES_CHAINS: Record<string, UsesStep[]> = {
  gold: [
    { label: 'Gold ore',    icon: '⛏️', detail: 'Extracted from quartz reefs and alluvial deposits, often just grams per tonne of rock.', stat: 'Kalgoorlie’s Super Pit yields ~2 g of gold per tonne of ore.' },
    { label: 'Refining',    icon: '🔥', detail: 'Smelted and electro-refined to 99.99% purity bullion.', stat: 'A 400 oz "good delivery" bar weighs ~12.4 kg.' },
    { label: 'Electronics', icon: '🔌', detail: 'Its unmatched corrosion resistance makes it ideal for connectors and chip bonding.', stat: 'About 7% of gold demand goes to electronics.' },
    { label: 'Reserve',     icon: '🏦', detail: 'Central banks hold gold as a store of value backing currencies.', stat: 'Roughly 17% of all gold ever mined sits in bank vaults.' },
  ],
  copper: [
    { label: 'Copper ore',  icon: '⛏️', detail: 'Mined as chalcopyrite and native copper, then concentrated by flotation.', stat: 'Olympic Dam is one of the world’s largest copper deposits.' },
    { label: 'Smelting',    icon: '🔥', detail: 'Roasted and electro-refined to 99.99% cathode copper.', stat: 'Refined copper is >99.99% pure.' },
    { label: 'Wiring',      icon: '⚡', detail: 'Second only to silver in conductivity, it carries most of the world’s electricity.', stat: 'A typical home holds ~90 kg of copper.' },
    { label: 'EV motor',    icon: '🚗', detail: 'Electric vehicles use several times more copper than petrol cars.', stat: 'An EV contains ~83 kg of copper.' },
  ],
  iron: [
    { label: 'Iron ore',    icon: '⛏️', detail: 'Dug from banded iron formations as hematite and magnetite.', stat: 'The Pilbara ships over 800 Mt of iron ore a year.' },
    { label: 'Blast furnace', icon: '🔥', detail: 'Reduced with coke at ~1,500°C into molten pig iron.', stat: 'A blast furnace runs non-stop for years between rebuilds.' },
    { label: 'Steel',       icon: '🏗️', detail: 'Alloyed with carbon into the world’s most-used structural metal.', stat: 'Steel is ~95% of all metal produced by tonnage.' },
    { label: 'Construction', icon: '🌉', detail: 'Frames skyscrapers, bridges, ships and railways.', stat: 'The Sydney Harbour Bridge holds ~52,800 t of steel.' },
  ],
  tin: [
    { label: 'Cassiterite', icon: '⛏️', detail: 'The tin oxide ore, panned and dredged from placer deposits.', stat: 'Renison Bell is Australia’s largest tin mine.' },
    { label: 'Smelting',    icon: '🔥', detail: 'Reduced to soft, silvery tin metal.', stat: 'Tin melts at just 232°C.' },
    { label: 'Bronze',      icon: '🗿', detail: 'Alloyed with copper into bronze — the metal that named an age.', stat: 'Bronze is ~88% copper, 12% tin.' },
    { label: 'Solder',      icon: '🔌', detail: 'Joins the electronics that run the modern world.', stat: 'Half of all tin is used in solder.' },
  ],
  quartz: [
    { label: 'Quartz',      icon: '⛏️', detail: 'The second most abundant mineral in the crust, grown as clear prisms.', stat: 'Quartz is 12% of Earth’s continental crust by volume.' },
    { label: 'Cut crystal', icon: '✂️', detail: 'Sliced and tuned because it vibrates at a precise frequency when charged.', stat: 'A watch crystal oscillates at 32,768 times a second.' },
    { label: 'Oscillator',  icon: '⚙️', detail: 'Its piezoelectric "tick" keeps time in clocks and computers.', stat: 'Quartz clocks drift <1 second per month.' },
    { label: 'Timekeeping', icon: '⌚', detail: 'Powers nearly every watch, phone and computer clock on Earth.', stat: 'Billions of quartz timers ship every year.' },
  ],
  diamond: [
    { label: 'Diamond',     icon: '⛏️', detail: 'Crystallised carbon forged 150+ km deep and erupted up kimberlite pipes.', stat: 'Argyle produced ~90% of the world’s pink diamonds.' },
    { label: 'Cutting',     icon: '✂️', detail: 'Cleaved and faceted — only a diamond can cut a diamond.', stat: 'A round brilliant has 57 or 58 facets.' },
    { label: 'Industry',    icon: '🛠️', detail: 'Most mined diamond is industrial — tipping drills, saws and grinders.', stat: '~70% of natural diamond is used industrially.' },
    { label: 'Jewellery',   icon: '💍', detail: 'The hardest natural material is also the most prized gem.', stat: 'Diamond scores a perfect 10 on the Mohs scale.' },
  ],
  graphite: [
    { label: 'Graphite',    icon: '⛏️', detail: 'Soft sheets of pure carbon, the opposite of diamond.', stat: 'Graphite is one of the softest minerals (Mohs 1–2).' },
    { label: 'Refining',    icon: '🔥', detail: 'Purified to 99.9%+ carbon for high-tech uses.', stat: 'Battery-grade graphite is >99.95% carbon.' },
    { label: 'Battery',     icon: '🔋', detail: 'Forms the anode of every lithium-ion battery.', stat: 'An EV battery needs ~50–100 kg of graphite.' },
    { label: 'Pencils',     icon: '✏️', detail: 'Mixed with clay, it’s still the "lead" in every pencil.', stat: 'One pencil can draw a line ~56 km long.' },
  ],
  halite: [
    { label: 'Rock salt',   icon: '⛏️', detail: 'Evaporated seawater and ancient salt beds, mined or solar-harvested.', stat: 'Seawater is ~3.5% dissolved salt.' },
    { label: 'Table salt',  icon: '🧂', detail: 'The only rock humans eat — essential to life.', stat: 'The body needs ~1.5 g of sodium a day.' },
    { label: 'Chemicals',   icon: '⚗️', detail: 'Split into chlorine and sodium hydroxide for industry.', stat: 'Most salt goes to the chemical industry, not food.' },
    { label: 'De-icing',    icon: '❄️', detail: 'Lowers water’s freezing point to clear winter roads.', stat: 'Salt can melt ice down to about −21°C.' },
  ],
};
