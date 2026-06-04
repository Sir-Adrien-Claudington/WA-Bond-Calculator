/*
 * negative-gearing.js
 *
 * Investment property cash-flow and negative gearing calculator.
 *
 * Takes income and expense parameters and returns an annualised cash-flow
 * result including the tax benefit from a negatively geared loss.
 *
 * No DOM access. No persistence. Pure function of its inputs.
 *
 * Australian income tax rates used (2024-25, incl. Medicare levy):
 *   0%    — $0 to $18,200
 *   21%   — $18,201 to $45,000   (19% + 2% ML)
 *   34.5% — $45,001 to $120,000  (32.5% + 2% ML)
 *   39%   — $120,001 to $180,000 (37% + 2% ML)
 *   47%   — $180,001+            (45% + 2% ML)
 */

var APE_NegativeGearing = (function () {
  'use strict';

  function round2(n) {
    return Math.round((n + Number.EPSILON) * 100) / 100;
  }

  function fmtMoney(n) {
    return '$' + round2(Math.abs(n)).toLocaleString('en-AU', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function fmtPct(rate) {
    return (rate * 100).toFixed(1) + '%';
  }

  /*
   * calculate(params)
   *
   * params: {
   *   loanAmount:        number  — loan principal in $
   *   interestRate:      number  — annual rate as decimal (0.065 = 6.5%)
   *   weeklyRent:        number  — expected gross weekly rent in $
   *   managementFeeRate: number  — property mgmt fee as decimal (0.085 = 8.5%)
   *   councilRates:      number  — annual council rates in $
   *   insurance:         number  — annual landlord insurance in $
   *   maintenance:       number  — annual maintenance & repairs in $
   *   depreciation:      number  — annual depreciation allowance in $ (0 if unknown)
   *   marginalTaxRate:   number  — investor's marginal rate incl. Medicare as decimal
   * }
   *
   * Returns a result object with all annual figures plus a breakdown array.
   */
  function calculate(params) {
    var loan        = round2(Number(params.loanAmount)        || 0);
    var rate        = Number(params.interestRate)             || 0;
    var wkRent      = round2(Number(params.weeklyRent)        || 0);
    var mgmtRate    = Number(params.managementFeeRate)        || 0;
    var council     = round2(Number(params.councilRates)      || 0);
    var insurance   = round2(Number(params.insurance)         || 0);
    var maintenance = round2(Number(params.maintenance)       || 0);
    var depreciation = round2(Number(params.depreciation)     || 0);
    var taxRate     = Number(params.marginalTaxRate)          || 0;

    // --- Income ---
    var annualRent = round2(wkRent * 52);

    // --- Deductions ---
    var interestCost    = round2(loan * rate);
    var managementFees  = round2(annualRent * mgmtRate);
    var otherExpenses   = round2(council + insurance + maintenance);
    var totalDeductions = round2(interestCost + managementFees + otherExpenses + depreciation);

    // --- Net rental position ---
    var netRentalIncome = round2(annualRent - totalDeductions);
    var isNegative      = netRentalIncome < 0;
    var isNeutral       = netRentalIncome === 0;

    // --- Tax benefit (loss offsets other income at marginal rate) ---
    var taxableRentalLoss = isNegative ? -netRentalIncome : 0;
    var taxBenefit        = round2(taxableRentalLoss * taxRate);

    // --- After-tax cash flow ---
    var netCashFlow  = round2(netRentalIncome + taxBenefit);
    var weeklyNetCost = round2(-netCashFlow / 52); // positive = out of pocket

    var gearingStatus = isNegative ? 'negative' : (isNeutral ? 'neutral' : 'positive');

    // --- Breakdown lines ---
    var bd = [];
    bd.push('Annual rental income: ' + fmtMoney(annualRent) + ' (' + fmtMoney(wkRent) + '/wk \xd7 52 weeks).');
    bd.push('Interest cost: ' + fmtMoney(interestCost) + ' (' + fmtPct(rate) + ' p.a. on ' + fmtMoney(loan) + ' loan, interest-only basis).');
    bd.push('Property management fees: ' + fmtMoney(managementFees) + ' (' + fmtPct(mgmtRate) + ' of rent).');
    bd.push('Council rates, insurance & maintenance: ' + fmtMoney(otherExpenses) + '.');
    if (depreciation > 0) {
      bd.push('Depreciation allowance: ' + fmtMoney(depreciation) + '.');
    }
    bd.push('Total deductions: ' + fmtMoney(totalDeductions) + '.');
    bd.push(
      'Net rental ' + (isNegative ? 'loss' : 'income') + ': ' +
      (isNegative ? '−' : '+') + fmtMoney(Math.abs(netRentalIncome)) + '.'
    );
    if (isNegative && taxRate > 0) {
      bd.push(
        'Tax saving (' + fmtMoney(taxableRentalLoss) + ' loss \xd7 ' + fmtPct(taxRate) +
        ' marginal rate): +' + fmtMoney(taxBenefit) + '.'
      );
      bd.push(
        'Net after-tax out-of-pocket: ' + fmtMoney(-netCashFlow) + '/yr (' +
        fmtMoney(weeklyNetCost) + '/wk).'
      );
    } else if (!isNegative) {
      bd.push(
        'Net after-tax cash surplus: +' + fmtMoney(netCashFlow) + '/yr (+' +
        fmtMoney(-weeklyNetCost) + '/wk).'
      );
    }

    var assumptions = [
      'Interest calculated on full loan (interest-only) — principal repayments are not tax-deductible.',
      'Tax benefit assumes the rental loss is fully offset against other income at the stated marginal rate.',
      'No vacancy periods have been applied to rental income.',
      'Depreciation (if entered) assumes a quantity surveyor has confirmed the eligible amount.',
      'This is a simplified estimate only. Seek qualified tax advice for your specific situation.'
    ];

    return Object.freeze({
      type:            'negative-gearing',
      gearingStatus:   gearingStatus,
      annualRent:      annualRent,
      interestCost:    interestCost,
      managementFees:  managementFees,
      otherExpenses:   otherExpenses,
      depreciation:    depreciation,
      totalDeductions: totalDeductions,
      netRentalIncome: netRentalIncome,
      taxBenefit:      taxBenefit,
      netCashFlow:     netCashFlow,
      weeklyNetCost:   weeklyNetCost,
      breakdown:       Object.freeze(bd),
      assumptions:     Object.freeze(assumptions)
    });
  }

  return Object.freeze({ calculate: calculate });
})();
