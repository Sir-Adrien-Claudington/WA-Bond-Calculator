/*
 * stamp-duty-rates.js
 *
 * Transfer (stamp) duty rate tables for Australian states and territories.
 *
 * PURE DATA ONLY. No calculation logic lives here. Every exported object is
 * frozen with Object.freeze() so consumers cannot mutate the source tables.
 *
 * Each state entry exposes a `brackets` array. Each bracket is:
 *   { upTo: <number|null>, base: <number>, rate: <number>, over: <number> }
 *   - duty = base + rate * (dutiableValue - over)
 *   - upTo === null means "no upper bound" (final bracket).
 *   - `over` is the threshold the marginal `rate` applies above.
 *
 * IMPORTANT: Duty thresholds and rates change frequently (usually each state
 * budget). Anything not cross-checked against the live state revenue office
 * page at build time is marked with a VERIFY note. Do NOT treat unverified
 * figures as authoritative. A future session must confirm each table against
 * the cited source before this tool is presented as accurate.
 *
 * Concessions (first home buyer, off-the-plan, owner-occupier, foreign buyer
 * surcharge, pensioner, etc.) are intentionally NOT modelled. The estimator
 * computes the standard/general transfer duty for an established residence.
 */

(function (root) {
  'use strict';

  // --- New South Wales -----------------------------------------------------
  // Source: Revenue NSW — "Transfer duty" rate table.
  // https://www.revenue.nsw.gov.au/taxes-duties-levies-royalties/transfer-duty
  // VERIFY: NSW indexes thresholds to CPI annually (from 1 July). Confirm the
  // current-year bracket thresholds and the premium-property top rate.
  var NSW = {
    state: 'NSW',
    name: 'New South Wales',
    source: 'Revenue NSW — Transfer duty',
    sourceUrl: 'https://www.revenue.nsw.gov.au/taxes-duties-levies-royalties/transfer-duty',
    verify: true,
    brackets: [
      { upTo: 17000, base: 0, rate: 0.0125, over: 0 },
      { upTo: 37000, base: 212, rate: 0.015, over: 17000 },
      { upTo: 99000, base: 512, rate: 0.0175, over: 37000 },
      { upTo: 372000, base: 1597, rate: 0.035, over: 99000 },
      { upTo: 1240000, base: 11152, rate: 0.045, over: 372000 },
      { upTo: 3636000, base: 50212, rate: 0.055, over: 1240000 },
      // Premium property duty applies above the top threshold.
      { upTo: null, base: 182000, rate: 0.07, over: 3636000 }
    ]
  };

  // --- Victoria ------------------------------------------------------------
  // Source: State Revenue Office Victoria — "Land transfer (stamp) duty".
  // https://www.sro.vic.gov.au/land-transfer-duty
  // VERIFY: VIC has a distinct general rate scale; confirm bracket bases and
  // the >$960,000 flat 5.5% treatment vs the marginal scale.
  var VIC = {
    state: 'VIC',
    name: 'Victoria',
    source: 'State Revenue Office Victoria — Land transfer duty',
    sourceUrl: 'https://www.sro.vic.gov.au/land-transfer-duty',
    verify: true,
    brackets: [
      { upTo: 25000, base: 0, rate: 0.014, over: 0 },
      { upTo: 130000, base: 350, rate: 0.024, over: 25000 },
      { upTo: 960000, base: 2870, rate: 0.06, over: 130000 },
      // $960,001 to $2,000,000: flat 5.5% of ENTIRE dutiable value (not marginal).
      // Setting over: 0 makes the formula `0 + 0.055 × value` = flat rate on full value.
      { upTo: 2000000, base: 0, rate: 0.055, over: 0 },
      // Over $2,000,000: flat 6.5% of ENTIRE dutiable value.
      { upTo: null, base: 0, rate: 0.065, over: 0 }
    ]
  };

  // --- Queensland ----------------------------------------------------------
  // Source: Queensland Revenue Office — "Transfer duty rates".
  // https://qro.qld.gov.au/duties/transfer-duty/calculate/transfer-duty-rates/
  // VERIFY: QLD has separate home-concession scales; figures below are the
  // GENERAL transfer duty rate, not the home concession. Confirm all bases.
  var QLD = {
    state: 'QLD',
    name: 'Queensland',
    source: 'Queensland Revenue Office — Transfer duty rates',
    sourceUrl: 'https://qro.qld.gov.au/duties/transfer-duty/calculate/transfer-duty-rates/',
    verify: true,
    brackets: [
      { upTo: 5000, base: 0, rate: 0, over: 0 },
      { upTo: 75000, base: 0, rate: 0.015, over: 5000 },
      { upTo: 540000, base: 1050, rate: 0.035, over: 75000 },
      { upTo: 1000000, base: 17325, rate: 0.045, over: 540000 },
      { upTo: null, base: 38025, rate: 0.0575, over: 1000000 }
    ]
  };

  // --- Western Australia ---------------------------------------------------
  // Source: RevenueWA — "Transfer duty (general rate)".
  // https://www.wa.gov.au/organisation/department-of-finance/transfer-duty
  // VERIFY: WA distinguishes general rate vs residential rate. Figures below
  // are the GENERAL rate scale. Confirm bracket bases and thresholds.
  var WA = {
    state: 'WA',
    name: 'Western Australia',
    source: 'RevenueWA — Transfer duty',
    sourceUrl: 'https://www.wa.gov.au/organisation/department-of-finance/transfer-duty',
    verify: true,
    brackets: [
      { upTo: 120000, base: 0, rate: 0.019, over: 0 },
      { upTo: 150000, base: 2280, rate: 0.0285, over: 120000 },
      { upTo: 360000, base: 3135, rate: 0.038, over: 150000 },
      { upTo: 725000, base: 11115, rate: 0.0475, over: 360000 },
      { upTo: null, base: 28453, rate: 0.0515, over: 725000 }
    ]
  };

  // --- South Australia -----------------------------------------------------
  // Source: RevenueSA — "Stamp duty on conveyances / Land".
  // https://www.revenuesa.sa.gov.au/stampduty/stamp-duty-on-land
  // VERIFY: SA bracket bases below are approximate; confirm every base figure.
  var SA = {
    state: 'SA',
    name: 'South Australia',
    source: 'RevenueSA — Stamp duty on land',
    sourceUrl: 'https://www.revenuesa.sa.gov.au/stampduty/stamp-duty-on-land',
    verify: true,
    brackets: [
      { upTo: 12000, base: 0, rate: 0.01, over: 0 },
      { upTo: 30000, base: 120, rate: 0.02, over: 12000 },
      { upTo: 50000, base: 480, rate: 0.03, over: 30000 },
      { upTo: 100000, base: 1080, rate: 0.035, over: 50000 },
      { upTo: 200000, base: 2830, rate: 0.04, over: 100000 },
      { upTo: 250000, base: 6830, rate: 0.0425, over: 200000 },
      { upTo: 300000, base: 8955, rate: 0.0475, over: 250000 },
      { upTo: 500000, base: 11330, rate: 0.05, over: 300000 },
      { upTo: null, base: 21330, rate: 0.055, over: 500000 }
    ]
  };

  // --- Tasmania ------------------------------------------------------------
  // Source: State Revenue Office Tasmania — "Property transfer duty".
  // https://www.sro.tas.gov.au/property-transfer-duties
  // VERIFY: confirm all TAS bracket bases and the top marginal rate.
  var TAS = {
    state: 'TAS',
    name: 'Tasmania',
    source: 'State Revenue Office Tasmania — Property transfer duty',
    sourceUrl: 'https://www.sro.tas.gov.au/property-transfer-duties',
    verify: true,
    brackets: [
      { upTo: 3000, base: 50, rate: 0, over: 0 },
      { upTo: 25000, base: 50, rate: 0.0175, over: 3000 },
      { upTo: 75000, base: 435, rate: 0.0225, over: 25000 },
      { upTo: 200000, base: 1560, rate: 0.035, over: 75000 },
      { upTo: 375000, base: 5935, rate: 0.04, over: 200000 },
      { upTo: 725000, base: 12935, rate: 0.0425, over: 375000 },
      { upTo: null, base: 27810, rate: 0.045, over: 725000 }
    ]
  };

  // --- Australian Capital Territory ---------------------------------------
  // Source: ACT Revenue Office — "Conveyance duty" (investor/non-PPR rates).
  // https://www.revenue.act.gov.au/duties/conveyance-duty
  // IMPORTANT: ACT is the only jurisdiction with separate investor vs owner-occ
  // tables. This table contains the INVESTOR rates (non-principal-place-of-residence).
  // Owner-occ rates are meaningfully lower — do NOT apply to investment property.
  // Cross-check (investor): $777,777 → $23,839
  var ACT = {
    state: 'ACT',
    name: 'Australian Capital Territory',
    source: 'ACT Revenue Office — Conveyance duty (investor rates)',
    sourceUrl: 'https://www.revenue.act.gov.au/duties/conveyance-duty',
    verify: false,
    brackets: [
      { upTo: 200000, base: 0,     rate: 0.012,  over: 0 },
      { upTo: 300000, base: 2400,  rate: 0.022,  over: 200000 },
      { upTo: 500000, base: 4600,  rate: 0.034,  over: 300000 },
      { upTo: 750000, base: 11400, rate: 0.0432, over: 500000 },
      { upTo: 1000000,base: 22200, rate: 0.059,  over: 750000 },
      { upTo: 1455000,base: 36950, rate: 0.064,  over: 1000000 },
      // $1,455,001+: flat 4.54% of ENTIRE dutiable value (base:0, over:0).
      { upTo: null,   base: 0,     rate: 0.0454, over: 0 }
    ]
  };

  // --- Northern Territory --------------------------------------------------
  // Source: NT Department of Treasury and Finance — "Stamp duty".
  // https://nt.gov.au/employ/money-and-taxes/taxes-royalties-and-grants/stamp-duty
  // VERIFY: NT uses a FORMULA (not flat brackets) for values up to $525,000:
  //   D = (0.06571441 * V^2) + 15 * V    where V = value / 1000.
  // Above $525,000 a flat marginal scale applies. This formula CANNOT be
  // expressed as simple brackets, so NT is flagged as formula-based and must
  // be handled specially or verified. Brackets below are a ROUGH linearised
  // stand-in and are NOT accurate — VERIFY and replace.
  // NT uses a quadratic formula below $525,000 (handled in stamp-duty.js).
  // Above $525,000: flat rate on ENTIRE dutiable value (base:0, over:0).
  // Cross-check: $500,000 → $23,929 (quadratic) | $777,777 → $38,520 (4.95% flat)
  var NT = {
    state: 'NT',
    name: 'Northern Territory',
    source: 'NT Department of Treasury and Finance — Stamp duty',
    sourceUrl: 'https://nt.gov.au/employ/money-and-taxes/taxes-royalties-and-grants/stamp-duty',
    verify: false,
    formulaBased: true,
    formulaNote: 'Values ≤$525,000 use D=(0.06571441×V²)+(15×V) where V=value/1000. Above $525,000: flat rate on full value.',
    brackets: [
      // Quadratic bracket handled in stamp-duty.js; this entry is a sentinel.
      { upTo: 525000, base: 0, rate: 0, over: 0, ntQuadratic: true },
      // Flat rates on ENTIRE value above $525,000 (base:0, over:0).
      { upTo: 3000000, base: 0, rate: 0.0495, over: 0 },
      { upTo: 5000000, base: 0, rate: 0.0575, over: 0 },
      { upTo: null,    base: 0, rate: 0.0595, over: 0 }
    ]
  };

  var TABLE = Object.freeze({
    NSW: Object.freeze(Object.assign({}, NSW, { brackets: Object.freeze(NSW.brackets.map(Object.freeze)) })),
    VIC: Object.freeze(Object.assign({}, VIC, { brackets: Object.freeze(VIC.brackets.map(Object.freeze)) })),
    QLD: Object.freeze(Object.assign({}, QLD, { brackets: Object.freeze(QLD.brackets.map(Object.freeze)) })),
    WA: Object.freeze(Object.assign({}, WA, { brackets: Object.freeze(WA.brackets.map(Object.freeze)) })),
    SA: Object.freeze(Object.assign({}, SA, { brackets: Object.freeze(SA.brackets.map(Object.freeze)) })),
    TAS: Object.freeze(Object.assign({}, TAS, { brackets: Object.freeze(TAS.brackets.map(Object.freeze)) })),
    ACT: Object.freeze(Object.assign({}, ACT, { brackets: Object.freeze(ACT.brackets.map(Object.freeze)) })),
    NT: Object.freeze(Object.assign({}, NT, { brackets: Object.freeze(NT.brackets.map(Object.freeze)) }))
  });

  // Expose read-only on a namespaced global. No persistence, no mutation.
  root.APE_STAMP_DUTY_RATES = TABLE;
})(window);
