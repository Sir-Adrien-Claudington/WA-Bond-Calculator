/*
 * land-tax-rates.js
 *
 * Annual land tax rate tables for Australian states and territories.
 *
 * PURE DATA ONLY. No calculation logic. Every export is Object.freeze()'d.
 *
 * Land tax is levied on the UNIMPROVED / taxable land value (not the property
 * purchase price) held by an owner as at a fixed assessment date, aggregated
 * across their landholdings in that jurisdiction. This estimator treats the
 * single "land value" the user enters as their total taxable holding in that
 * state, for general (non-trust, non-absentee, non-foreign) ownership.
 *
 * Each state entry exposes a `brackets` array. Each bracket is:
 *   { upTo: <number|null>, base: <number>, rate: <number>, over: <number> }
 *   - tax = base + rate * (landValue - over)
 *   - upTo === null means "no upper bound".
 *   - `over` is the threshold the marginal `rate` applies above.
 *
 * The principal place of residence (owner-occupied home) is generally EXEMPT
 * from land tax in every state. This tool models the INVESTMENT/general case
 * (no PPR exemption). That assumption is surfaced to the user in the result.
 *
 * IMPORTANT: thresholds change yearly. Unverified figures carry a VERIFY note.
 *
 * NT has NO land tax. It is included for completeness with a null table.
 */

(function (root) {
  'use strict';

  // --- New South Wales -----------------------------------------------------
  // Source: Revenue NSW — "Land tax".
  // https://www.revenue.nsw.gov.au/taxes-duties-levies-royalties/land-tax
  // VERIFY: NSW general threshold and premium threshold are indexed yearly.
  // Below the threshold no land tax is payable.
  var NSW = {
    state: 'NSW',
    name: 'New South Wales',
    source: 'Revenue NSW — Land tax',
    sourceUrl: 'https://www.revenue.nsw.gov.au/taxes-duties-levies-royalties/land-tax',
    verify: true,
    hasLandTax: true,
    brackets: [
      { upTo: 1075000, base: 0, rate: 0, over: 0 },
      // General rate: $100 + 1.6% over the general threshold.
      { upTo: 6571000, base: 100, rate: 0.016, over: 1075000 },
      // Premium rate above the premium threshold.
      { upTo: null, base: 88036, rate: 0.02, over: 6571000 }
    ]
  };

  // --- Victoria ------------------------------------------------------------
  // Source: State Revenue Office Victoria — "Land tax current rates".
  // https://www.sro.vic.gov.au/rates-taxes-duties-and-levies/land-tax-current-rates
  // VERIFY: VIC lowered its tax-free threshold to $50,000 with a temporary
  // COVID-debt levy ($500 fixed + 0.1% style add-ons). Confirm current scale.
  var VIC = {
    state: 'VIC',
    name: 'Victoria',
    source: 'State Revenue Office Victoria — Land tax current rates',
    sourceUrl: 'https://www.sro.vic.gov.au/rates-taxes-duties-and-levies/land-tax-current-rates',
    verify: true,
    hasLandTax: true,
    brackets: [
      { upTo: 50000, base: 0, rate: 0, over: 0 },
      { upTo: 100000, base: 500, rate: 0, over: 50000 },
      { upTo: 300000, base: 975, rate: 0, over: 100000 },
      { upTo: 600000, base: 1350, rate: 0.003, over: 300000 },
      { upTo: 1000000, base: 2250, rate: 0.005, over: 600000 },
      { upTo: 1800000, base: 4250, rate: 0.008, over: 1000000 },
      { upTo: 3000000, base: 10650, rate: 0.013, over: 1800000 },
      { upTo: null, base: 26250, rate: 0.0265, over: 3000000 }
    ]
  };

  // --- Queensland ----------------------------------------------------------
  // Source: Queensland Revenue Office — "Land tax rates".
  // https://qro.qld.gov.au/land-tax/calculate/
  // VERIFY: figures are the INDIVIDUAL (non-company/trust) scale. Confirm bases.
  var QLD = {
    state: 'QLD',
    name: 'Queensland',
    source: 'Queensland Revenue Office — Land tax rates',
    sourceUrl: 'https://qro.qld.gov.au/land-tax/calculate/',
    verify: true,
    hasLandTax: true,
    brackets: [
      { upTo: 600000, base: 0, rate: 0, over: 0 },
      { upTo: 1000000, base: 500, rate: 0.01, over: 600000 },
      { upTo: 3000000, base: 4500, rate: 0.0165, over: 1000000 },
      { upTo: 5000000, base: 37500, rate: 0.0125, over: 3000000 },
      { upTo: 10000000, base: 62500, rate: 0.0175, over: 5000000 },
      { upTo: null, base: 150000, rate: 0.0225, over: 10000000 }
    ]
  };

  // --- Western Australia ---------------------------------------------------
  // Source: RevenueWA — "Land tax rates".
  // https://www.wa.gov.au/organisation/department-of-finance/land-tax
  // VERIFY: confirm WA bracket bases and thresholds.
  var WA = {
    state: 'WA',
    name: 'Western Australia',
    source: 'RevenueWA — Land tax',
    sourceUrl: 'https://www.wa.gov.au/organisation/department-of-finance/land-tax',
    verify: true,
    hasLandTax: true,
    brackets: [
      { upTo: 300000, base: 0, rate: 0, over: 0 },
      { upTo: 420000, base: 0, rate: 0.0025, over: 300000 },
      { upTo: 1000000, base: 300, rate: 0.009, over: 420000 },
      { upTo: 1800000, base: 5520, rate: 0.018, over: 1000000 },
      { upTo: 5000000, base: 19920, rate: 0.02, over: 1800000 },
      { upTo: 11000000, base: 83920, rate: 0.023, over: 5000000 },
      { upTo: null, base: 221920, rate: 0.0267, over: 11000000 }
    ]
  };

  // --- South Australia -----------------------------------------------------
  // Source: RevenueSA — "Land tax rates".
  // https://www.revenuesa.sa.gov.au/landtax/land-tax-rates-and-thresholds
  // VERIFY: SA reformed land tax aggregation recently; confirm thresholds.
  var SA = {
    state: 'SA',
    name: 'South Australia',
    source: 'RevenueSA — Land tax rates and thresholds',
    sourceUrl: 'https://www.revenuesa.sa.gov.au/landtax/land-tax-rates-and-thresholds',
    verify: true,
    hasLandTax: true,
    brackets: [
      { upTo: 732000, base: 0, rate: 0, over: 0 },
      { upTo: 1176000, base: 0, rate: 0.005, over: 732000 },
      { upTo: 1711000, base: 2220, rate: 0.01, over: 1176000 },
      { upTo: 2738000, base: 7570, rate: 0.02, over: 1711000 },
      { upTo: null, base: 28110, rate: 0.024, over: 2738000 }
    ]
  };

  // --- Tasmania ------------------------------------------------------------
  // Source: State Revenue Office Tasmania — "Land tax".
  // https://www.sro.tas.gov.au/land-tax
  // VERIFY: confirm TAS thresholds and rates.
  var TAS = {
    state: 'TAS',
    name: 'Tasmania',
    source: 'State Revenue Office Tasmania — Land tax',
    sourceUrl: 'https://www.sro.tas.gov.au/land-tax',
    verify: true,
    hasLandTax: true,
    brackets: [
      { upTo: 124999, base: 0, rate: 0, over: 0 },
      { upTo: 499999, base: 0, rate: 0.0045, over: 125000 },
      { upTo: null, base: 1687.5, rate: 0.015, over: 500000 }
    ]
  };

  // --- Australian Capital Territory ---------------------------------------
  // Source: ACT Revenue Office — "Land tax".
  // https://www.revenue.act.gov.au/land-tax
  // VERIFY: ACT land tax = fixed charge + marginal rate on AUV, charged on
  // rateable (not unimproved purchase) value and billed quarterly. The model
  // here is a SIMPLIFICATION. Confirm the fixed charge and marginal scale.
  var ACT = {
    state: 'ACT',
    name: 'Australian Capital Territory',
    source: 'ACT Revenue Office — Land tax',
    sourceUrl: 'https://www.revenue.act.gov.au/land-tax',
    verify: true,
    hasLandTax: true,
    fixedCharge: 1462,
    fixedChargeNote: 'ACT adds a yearly fixed charge (VERIFY amount) plus marginal rates on the average unimproved value. Fixed charge is folded into the first bracket base below as an approximation.',
    brackets: [
      { upTo: 150000, base: 1462, rate: 0.0054, over: 0 },
      { upTo: 275000, base: 2272, rate: 0.0064, over: 150000 },
      { upTo: 2000000, base: 3072, rate: 0.0114, over: 275000 },
      { upTo: null, base: 22737, rate: 0.0114, over: 2000000 }
    ]
  };

  // --- Northern Territory --------------------------------------------------
  // NT does NOT levy land tax. Included for UI completeness with a null table.
  var NT = {
    state: 'NT',
    name: 'Northern Territory',
    source: 'NT Department of Treasury and Finance',
    sourceUrl: 'https://nt.gov.au/employ/money-and-taxes/taxes-royalties-and-grants',
    verify: false,
    hasLandTax: false,
    brackets: []
  };

  function freezeState(s) {
    return Object.freeze(Object.assign({}, s, {
      brackets: Object.freeze((s.brackets || []).map(Object.freeze))
    }));
  }

  var TABLE = Object.freeze({
    NSW: freezeState(NSW),
    VIC: freezeState(VIC),
    QLD: freezeState(QLD),
    WA: freezeState(WA),
    SA: freezeState(SA),
    TAS: freezeState(TAS),
    ACT: freezeState(ACT),
    NT: freezeState(NT)
  });

  root.APE_LAND_TAX_RATES = TABLE;
})(window);
