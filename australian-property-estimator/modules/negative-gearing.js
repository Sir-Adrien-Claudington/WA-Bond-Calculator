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
 * Australian income tax rates used (2025-26, Stage 3 cuts, incl. Medicare levy):
 *   0%    — $0 to $18,200
 *   18%   — $18,201 to $45,000   (16% + 2% ML)
 *   32%   — $45,001 to $135,000  (30% + 2% ML)
 *   39%   — $135,001 to $190,000 (37% + 2% ML)
 *   47%   — $190,001+            (45% + 2% ML)
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
   *   vacancyWeeks:      number  — vacancy weeks per year (default 0)
   *   managementFeeRate: number  — property mgmt fee as decimal (0.085 = 8.5%)
   *   councilRates:      number  — annual council rates in $
   *   insurance:         number  — annual landlord insurance in $
   *   maintenance:       number  — annual maintenance & repairs in $
   *   depreciation:      number  — annual depreciation allowance in $ (0 if unknown)
   *   marginalTaxRate:   number  — investor's marginal rate incl. Medicare as decimal
   *   loanType:          string  — 'io' (interest-only, default) or 'pi' (P&I)
   *   loanTermYears:     number  — loan term for P&I (default 30)
   * }
   *
   * Returns a result object with all annual figures plus a breakdown array.
   */
  function calculate(params) {
    var loan         = round2(Number(params.loanAmount)        || 0);
    var rate         = Number(params.interestRate)             || 0;
    var wkRent       = round2(Number(params.weeklyRent)        || 0);
    var vacancyWeeks = Math.max(0, Math.min(52, Number(params.vacancyWeeks) || 0));
    var mgmtRate     = Number(params.managementFeeRate)        || 0;
    var council      = round2(Number(params.councilRates)      || 0);
    var insurance    = round2(Number(params.insurance)         || 0);
    var maintenance  = round2(Number(params.maintenance)       || 0);
    var landTax      = round2(Number(params.landTax)           || 0);
    var depreciation = round2(Number(params.depreciation)      || 0);
    var taxRate      = Number(params.marginalTaxRate)          || 0;
    var loanType     = params.loanType === 'pi' ? 'pi' : 'io';
    var loanTermYears = Math.max(5, Math.min(40, Number(params.loanTermYears) || 30));

    // --- Income (adjusted for vacancy) ---
    var rentWeeks  = 52 - vacancyWeeks;
    var annualRent = round2(wkRent * rentWeeks);

    // --- Interest / repayment calculation ---
    var interestCost;
    var annualPrincipal = 0;
    var monthlyRepayment = 0;

    if (loanType === 'pi' && loan > 0 && rate > 0) {
      var monthlyRate = rate / 12;
      var numPayments = loanTermYears * 12;
      monthlyRepayment = round2(loan * monthlyRate * Math.pow(1 + monthlyRate, numPayments) /
        (Math.pow(1 + monthlyRate, numPayments) - 1));
      var annualRepayment = round2(monthlyRepayment * 12);
      // First-year interest approximation (actual first-year interest on amortising loan)
      var balance = loan;
      var firstYearInterest = 0;
      for (var m = 0; m < 12; m++) {
        var monthInterest = round2(balance * monthlyRate);
        firstYearInterest = round2(firstYearInterest + monthInterest);
        balance = round2(balance - (monthlyRepayment - monthInterest));
      }
      interestCost = firstYearInterest;
      annualPrincipal = round2(annualRepayment - firstYearInterest);
    } else {
      interestCost = round2(loan * rate);
    }

    // --- Deductions (only interest is deductible for P&I) ---
    var managementFees           = round2(annualRent * mgmtRate);
    var councilInsuranceMaint    = round2(council + insurance + maintenance);
    var otherExpenses            = round2(councilInsuranceMaint + landTax);
    var totalDeductions          = round2(interestCost + managementFees + otherExpenses + depreciation);

    // --- Net rental position ---
    var netRentalIncome = round2(annualRent - totalDeductions);
    var isNegative      = netRentalIncome < 0;
    var isNeutral       = netRentalIncome === 0;

    // --- Tax benefit (loss offsets other income at marginal rate) ---
    var taxableRentalLoss = isNegative ? -netRentalIncome : 0;
    var taxBenefit        = round2(taxableRentalLoss * taxRate);

    // --- After-tax cash flow ---
    var netCashFlow   = round2(netRentalIncome + taxBenefit);
    var weeklyNetCost = round2(-netCashFlow / 52); // positive = out of pocket

    var gearingStatus = isNegative ? 'negative' : (isNeutral ? 'neutral' : 'positive');

    // --- Breakdown lines ---
    var bd = [];
    if (vacancyWeeks > 0) {
      bd.push('Annual rental income: ' + fmtMoney(annualRent) + ' (' + fmtMoney(wkRent) + '/wk \xd7 ' + rentWeeks + ' weeks; ' + vacancyWeeks + ' vacancy week' + (vacancyWeeks !== 1 ? 's' : '') + ' deducted).');
    } else {
      bd.push('Annual rental income: ' + fmtMoney(annualRent) + ' (' + fmtMoney(wkRent) + '/wk \xd7 52 weeks).');
    }
    if (loanType === 'pi') {
      bd.push('Monthly P&I repayment: ' + fmtMoney(monthlyRepayment) + ' (interest-only portion deductible: ' + fmtMoney(interestCost) + '; principal not deductible: ' + fmtMoney(annualPrincipal) + ').');
    } else {
      bd.push('Interest cost: ' + fmtMoney(interestCost) + ' (' + fmtPct(rate) + ' p.a. on ' + fmtMoney(loan) + ' loan, interest-only basis).');
    }
    if (mgmtRate === 0) {
      bd.push('Property management: Self-managed (no management fee).');
    } else {
      bd.push('Property management fees: ' + fmtMoney(managementFees) + ' (' + fmtPct(mgmtRate) + ' of rent).');
    }
    bd.push('Council rates, insurance & maintenance: ' + fmtMoney(councilInsuranceMaint) + '.');
    if (landTax > 0) {
      bd.push('Land tax (tax-deductible investment expense): ' + fmtMoney(landTax) + '.');
    }
    if (depreciation > 0) {
      bd.push('Depreciation allowance: ' + fmtMoney(depreciation) + ' (non-cash deduction — reduces taxable income without being an out-of-pocket expense).');
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
      loanType === 'pi'
        ? 'P&I repayment shown — only the interest component is tax-deductible. Principal repayments are not deductible.'
        : 'Interest calculated on full loan (interest-only) — principal repayments are not tax-deductible.',
      'Tax benefit assumes the rental loss is fully offset against other income at the stated marginal rate.',
      vacancyWeeks > 0
        ? 'Vacancy of ' + vacancyWeeks + ' week' + (vacancyWeeks !== 1 ? 's' : '') + ' per year applied to rental income.'
        : 'No vacancy periods have been applied to rental income.',
      'Depreciation (if entered) assumes a quantity surveyor has confirmed the eligible amount.',
      'This is a simplified estimate only. Seek qualified tax advice for your specific situation.'
    ];

    // Cash position excludes depreciation (non-cash). Useful for showing
    // that a property may be operationally cash-positive before depreciation.
    var cashDeductions   = round2(totalDeductions - depreciation);
    var cashRentalPos    = round2(annualRent - cashDeductions); // positive = cash surplus ex-depr

    return Object.freeze({
      type:                    'negative-gearing',
      gearingStatus:           gearingStatus,
      annualRent:              annualRent,
      interestCost:            interestCost,
      managementFees:          managementFees,
      councilInsuranceMaint:   councilInsuranceMaint,
      landTax:                 landTax,
      otherExpenses:           otherExpenses,
      depreciation:            depreciation,
      cashDeductions:          cashDeductions,
      cashRentalPos:           cashRentalPos,
      totalDeductions:         totalDeductions,
      netRentalIncome:  netRentalIncome,
      taxBenefit:       taxBenefit,
      netCashFlow:      netCashFlow,
      weeklyNetCost:    weeklyNetCost,
      monthlyRepayment: monthlyRepayment,
      loanType:         loanType,
      breakdown:        Object.freeze(bd),
      assumptions:      Object.freeze(assumptions)
    });
  }

  return Object.freeze({ calculate: calculate });
})();
