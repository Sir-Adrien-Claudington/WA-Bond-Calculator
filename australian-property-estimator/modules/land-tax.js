/*
 * land-tax.js
 *
 * Annual land tax calculation module.
 *
 * Consumes the frozen rate table at window.APE_LAND_TAX_RATES and returns a
 * standard result object:
 *   {
 *     type: 'objective',
 *     value: <number>,            // annual land tax in dollars
 *     label: <string>,
 *     state: <string>,
 *     breakdown: [<string>...],
 *     assumptions: [<string>...],
 *     source: <string>
 *   }
 *
 * No DOM access. No persistence. Pure function of its inputs.
 */

var APE_LandTax = (function () {
  'use strict';

  var RATES = window.APE_LAND_TAX_RATES;

  function round2(n) {
    return Math.round((n + Number.EPSILON) * 100) / 100;
  }

  function formatMoney(n) {
    return '$' + round2(Math.abs(n)).toLocaleString('en-AU', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function pct(rate) {
    return (rate * 100).toFixed(3).replace(/\.?0+$/, '') + '%';
  }

  function pickBracket(brackets, value) {
    for (var i = 0; i < brackets.length; i++) {
      var b = brackets[i];
      if (b.upTo === null || value <= b.upTo) {
        return b;
      }
    }
    return brackets[brackets.length - 1];
  }

  function calculate(stateCode, landValue) {
    var table = RATES && RATES[stateCode];

    if (!table) {
      return {
        type: 'objective',
        value: null,
        label: 'Estimated annual land tax',
        state: stateCode || '',
        breakdown: ['No rate table available for the selected state.'],
        assumptions: [],
        source: 'n/a'
      };
    }

    if (!table.hasLandTax) {
      return {
        type: 'objective',
        value: 0,
        label: 'Estimated annual land tax',
        state: stateCode,
        breakdown: [table.name + ' does not levy land tax on investment properties.'],
        assumptions: ['Northern Territory has no land tax.'],
        source: table.source + ' (' + table.sourceUrl + ')'
      };
    }

    var value = Number(landValue);
    if (!isFinite(value) || value < 0) {
      return {
        type: 'objective',
        value: null,
        label: 'Estimated annual land tax',
        state: stateCode,
        breakdown: ['Enter a land value of zero or more to estimate land tax.'],
        assumptions: [],
        source: table.source
      };
    }

    var bracket = pickBracket(table.brackets, value);
    var tax = round2(bracket.base + bracket.rate * (value - bracket.over));

    var breakdown = [];
    breakdown.push('Land value entered: ' + formatMoney(value) + '.');
    if (bracket.rate === 0 && tax === 0) {
      breakdown.push('Below the taxable threshold — no land tax payable.');
    } else if (bracket.rate === 0) {
      breakdown.push('Fixed amount applies: ' + formatMoney(tax) + '.');
    } else {
      breakdown.push(
        'Applicable bracket: ' + pct(bracket.rate) + ' on amounts over ' +
        formatMoney(bracket.over) +
        (bracket.base > 0 ? ', plus a fixed ' + formatMoney(bracket.base) + '.' : '.')
      );
      breakdown.push(
        'Calculation: ' + formatMoney(bracket.base) + ' + ' +
        pct(bracket.rate) + ' \xd7 ' + formatMoney(value - bracket.over) +
        ' = ' + formatMoney(tax) + '.'
      );
    }

    var assumptions = [];
    assumptions.push('General ownership (individual, non-trust, non-absentee, non-foreign).');
    assumptions.push('Principal place of residence exemption NOT applied — investment property assumed.');
    if (stateCode === 'ACT') {
      assumptions.push('ACT land tax is assessed quarterly based on Average Unimproved Value (AUV). This estimate uses the site value entered as a proxy for AUV.');
    } else {
      assumptions.push('Land value entered is treated as your total taxable landholding in ' + table.name + '.');
    }
    if (table.verify) {
      assumptions.push('VERIFY: rate table for ' + table.name + ' has not been confirmed against the current revenue office page and may be out of date.');
    }
    if (table.fixedChargeNote) {
      assumptions.push(table.fixedChargeNote);
    }

    return {
      type: 'objective',
      value: tax,
      label: 'Estimated annual land tax',
      state: stateCode,
      breakdown: breakdown,
      assumptions: assumptions,
      source: table.source + ' (' + table.sourceUrl + ')'
    };
  }

  return Object.freeze({ calculate: calculate });
})();
