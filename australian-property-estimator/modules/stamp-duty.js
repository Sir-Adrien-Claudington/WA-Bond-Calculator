/*
 * stamp-duty.js
 *
 * Stamp (transfer) duty calculation module.
 *
 * Consumes the frozen rate table at window.APE_STAMP_DUTY_RATES and returns a
 * standard result object:
 *   {
 *     type: 'objective',
 *     value: <number>,            // duty in dollars
 *     label: <string>,            // human label for the figure
 *     state: <string>,            // state code, e.g. 'NSW'
 *     breakdown: [<string>...],   // step-by-step lines, plain text
 *     assumptions: [<string>...], // what we assumed / excluded
 *     source: <string>            // citation for the rate table used
 *   }
 *
 * No DOM access here. No persistence. Pure function of its inputs.
 */

var APE_StampDuty = (function () {
  'use strict';

  var RATES = window.APE_STAMP_DUTY_RATES;

  function round2(n) {
    return Math.round((n + Number.EPSILON) * 100) / 100;
  }

  function formatMoney(n) {
    return '$' + round2(n).toLocaleString('en-AU', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  // Find the bracket whose [over, upTo] range contains the value.
  function pickBracket(brackets, value) {
    for (var i = 0; i < brackets.length; i++) {
      var b = brackets[i];
      if (b.upTo === null || value <= b.upTo) {
        return b;
      }
    }
    return brackets[brackets.length - 1];
  }

  /*
   * calculate(stateCode, dutiableValue)
   * Returns the standard result object, or an error-shaped result object.
   */
  function calculate(stateCode, dutiableValue) {
    var table = RATES && RATES[stateCode];

    if (!table) {
      return {
        type: 'objective',
        value: null,
        label: 'Estimated stamp duty',
        state: stateCode || '',
        breakdown: ['No rate table is available for the selected state.'],
        assumptions: [],
        source: 'n/a'
      };
    }

    var value = Number(dutiableValue);
    if (!isFinite(value) || value < 0) {
      return {
        type: 'objective',
        value: null,
        label: 'Estimated stamp duty',
        state: stateCode,
        breakdown: ['Enter a property value of zero or more to estimate duty.'],
        assumptions: [],
        source: table.source
      };
    }

    var bracket = pickBracket(table.brackets, value);
    var marginal = value - bracket.over;
    var duty = bracket.base + bracket.rate * marginal;
    duty = round2(duty);

    var breakdown = [];
    breakdown.push('Property value entered: ' + formatMoney(value) + '.');
    breakdown.push(
      'Applicable bracket: amounts over ' + formatMoney(bracket.over) +
      ' are charged at ' + (bracket.rate * 100).toFixed(2) + '%' +
      (bracket.base > 0 ? ', plus a fixed ' + formatMoney(bracket.base) + '.' : '.')
    );
    breakdown.push(
      'Calculation: ' + formatMoney(bracket.base) + ' + ' +
      (bracket.rate * 100).toFixed(2) + '% of ' + formatMoney(marginal) +
      ' = ' + formatMoney(duty) + '.'
    );

    var assumptions = [];
    assumptions.push('Standard transfer duty for an established residence.');
    assumptions.push('No first home buyer, owner-occupier, off-the-plan, pensioner or other concession applied.');
    assumptions.push('No foreign purchaser additional duty / surcharge included.');
    if (table.verify) {
      assumptions.push('VERIFY: rate table for ' + table.name + ' has not been confirmed against the live revenue office page and may be out of date.');
    }
    if (table.formulaBased) {
      assumptions.push('VERIFY: ' + table.name + ' uses a formula-based scale that this estimator only approximates with brackets — treat the figure as indicative only.');
    }

    return {
      type: 'objective',
      value: duty,
      label: 'Estimated stamp duty',
      state: stateCode,
      breakdown: breakdown,
      assumptions: assumptions,
      source: table.source + ' (' + table.sourceUrl + ')'
    };
  }

  return Object.freeze({ calculate: calculate });
})();
