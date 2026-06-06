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

  var FHB_CONCESSIONS = {
    NSW: { grantAmount: 10000, stampDutyThreshold: 800000, fullyExemptThreshold: 650000 },
    VIC: { grantAmount: 10000, stampDutyThreshold: 750000, fullyExemptThreshold: 600000 },
    QLD: { grantAmount: 30000, stampDutyThreshold: 700000, fullyExemptThreshold: 500000 },
    WA:  { grantAmount: 10000, stampDutyThreshold: 530000, fullyExemptThreshold: 430000 },
    SA:  { grantAmount: 15000, stampDutyThreshold: null,   fullyExemptThreshold: null   },
    TAS: { grantAmount: 30000, stampDutyThreshold: null,   fullyExemptThreshold: null   },
    ACT: { grantAmount: 0,     stampDutyThreshold: 1000000,fullyExemptThreshold: null   },
    NT:  { grantAmount: 10000, stampDutyThreshold: null,   fullyExemptThreshold: null   }
  };

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
   * calculate(stateCode, dutiableValue, isFirstHomeBuyer)
   * Returns the standard result object, or an error-shaped result object.
   */
  function calculate(stateCode, dutiableValue, isFirstHomeBuyer) {
    var table = RATES && RATES[stateCode];

    if (!table) {
      return {
        type: 'objective',
        value: null,
        label: 'Estimated stamp duty',
        state: stateCode || '',
        breakdown: ['No rate table is available for the selected state.'],
        assumptions: [],
        source: 'n/a',
        fhogAmount: 0
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
        source: table.source,
        fhogAmount: 0
      };
    }

    // NT: quadratic formula applies below $525,000; flat rate on full value above.
    var duty;
    if (stateCode === 'NT' && value <= 525000) {
      var V = value / 1000;
      duty = round2((0.06571441 * V * V) + (15 * V));
    } else {
      var bracket = pickBracket(table.brackets, value);
      // Skip the NT sentinel bracket (ntQuadratic:true) — won't reach it above $525k.
      var marginal = value - bracket.over;
      duty = round2(bracket.base + bracket.rate * marginal);
    }

    var fhogAmount = 0;
    var fhbNote = '';

    if (isFirstHomeBuyer) {
      var concession = FHB_CONCESSIONS[stateCode];
      if (concession) {
        fhogAmount = concession.grantAmount || 0;
        if (concession.fullyExemptThreshold !== null && value <= concession.fullyExemptThreshold) {
          duty = 0;
          fhbNote = 'Full stamp duty exemption applied (purchase price ≤ ' + formatMoney(concession.fullyExemptThreshold) + ' FHB threshold).';
        } else if (concession.stampDutyThreshold !== null && value <= concession.stampDutyThreshold && concession.fullyExemptThreshold !== null) {
          // Linear partial concession between fullyExemptThreshold and stampDutyThreshold
          var range = concession.stampDutyThreshold - concession.fullyExemptThreshold;
          var excess = value - concession.fullyExemptThreshold;
          var concessionFraction = 1 - (excess / range);
          duty = round2(duty * (1 - concessionFraction));
          fhbNote = 'Partial stamp duty concession applied (purchase price between ' + formatMoney(concession.fullyExemptThreshold) + ' and ' + formatMoney(concession.stampDutyThreshold) + ' FHB thresholds).';
        } else {
          fhbNote = 'No stamp duty concession applies at this purchase price for first home buyers in ' + table.name + '.';
        }
      }
    }

    var breakdown = [];
    breakdown.push('Property value entered: ' + formatMoney(value) + '.');
    if (stateCode === 'NT' && value <= 525000) {
      breakdown.push('NT quadratic formula: D = (0.06571441 × V²) + (15 × V) where V = value ÷ 1000.');
      breakdown.push('Calculation: V = ' + (value / 1000).toFixed(3) + ' → D = ' + formatMoney(duty) + '.');
    } else if (bracket) {
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
    }
    if (fhbNote) breakdown.push(fhbNote);
    if (isFirstHomeBuyer && fhogAmount > 0) {
      breakdown.push('First Home Owner Grant (FHOG): ' + formatMoney(fhogAmount) + ' (eligibility criteria apply).');
    }

    var assumptions = [];
    if (isFirstHomeBuyer) {
      assumptions.push('First Home Buyer concessions applied where eligible. Eligibility criteria apply — confirm with your state revenue office.');
    } else {
      assumptions.push('Standard transfer duty for an established residence.');
      assumptions.push('No first home buyer, owner-occupier, off-the-plan, pensioner or other concession applied.');
    }
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
      source: table.source + ' (' + table.sourceUrl + ')',
      fhogAmount: fhogAmount
    };
  }

  return Object.freeze({ calculate: calculate });
})();
