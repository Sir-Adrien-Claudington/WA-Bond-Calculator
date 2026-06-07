/*
 * app.js — UI layer for the Australian Property Investment Estimator.
 * Full two-panel dashboard redesign with Chart.js charts, dark mode,
 * URL sharing, real-time debounced updates, and CGT projection.
 */

(function () {
  'use strict';

  // ================================================================
  // CONSTANTS & DATA
  // ================================================================

  var fhbConcessions = {
    NSW: { grantAmount: 10000, stampDutyThreshold: 800000, fullyExemptThreshold: 650000 },
    VIC: { grantAmount: 10000, stampDutyThreshold: 750000, fullyExemptThreshold: 600000 },
    QLD: { grantAmount: 30000, stampDutyThreshold: 700000, fullyExemptThreshold: 500000 },
    WA:  { grantAmount: 10000, stampDutyThreshold: 530000, fullyExemptThreshold: 430000 },
    SA:  { grantAmount: 15000, stampDutyThreshold: null,   fullyExemptThreshold: null   },
    TAS: { grantAmount: 30000, stampDutyThreshold: null,   fullyExemptThreshold: null   },
    ACT: { grantAmount: 0,     stampDutyThreshold: 1000000,fullyExemptThreshold: null   },
    NT:  { grantAmount: 10000, stampDutyThreshold: null,   fullyExemptThreshold: null   }
  };

  var stateDefaults = {
    NSW: { managementFee: 8,  councilRates: 1800, insurance: 1400, landValuePct: '40–60%' },
    VIC: { managementFee: 7,  councilRates: 1600, insurance: 1300, landValuePct: '35–55%' },
    QLD: { managementFee: 9,  councilRates: 1400, insurance: 1500, landValuePct: '30–50%' },
    WA:  { managementFee: 9,  councilRates: 1200, insurance: 1200, landValuePct: '25–45%' },
    SA:  { managementFee: 9,  councilRates: 1100, insurance: 1100, landValuePct: '25–40%' },
    TAS: { managementFee: 9,  councilRates: 1000, insurance: 1000, landValuePct: '20–35%' },
    ACT: { managementFee: 8,  councilRates: 2200, insurance: 1300, landValuePct: '35–50%' },
    NT:  { managementFee: 10, councilRates: 1000, insurance: 1200, landValuePct: '20–35%' }
  };

  var DONUT_COLORS = ['#1e5fad', '#0f9e76', '#d97706', '#9333ea', '#ef4444', '#6b7280'];

  // WA Metropolitan Region Improvement Tax rate (0.14% on land value above $300k).
  var WA_MRIT_RATE = 0.0014;
  var WA_MRIT_THRESHOLD = 300000;

  function calcMrit(state, landValue, isMetro) {
    if (state !== 'WA' || !isMetro || landValue <= WA_MRIT_THRESHOLD) return 0;
    return round2((landValue - WA_MRIT_THRESHOLD) * WA_MRIT_RATE);
  }

  // ----------------------------------------------------------------
  // POLICY REGIME (2026-27 Federal Budget — announced, not yet law)
  // ----------------------------------------------------------------
  // Negative gearing changes apply to contracts entered AFTER 7:30pm
  // AEST on 12 May 2026. Contracts on/before that moment are grandfathered.
  // The quarantining of losses and split-CGT treatment commence 1 Jul 2027.
  var NEGATIVE_GEARING_CUTOFF = new Date('2026-05-12T19:30:00+10:00');
  var CGT_REFORM_DATE = new Date('2027-07-01');

  // Shared disclaimer that must accompany every new-regime output.
  var REGIME_DISCLAIMER = 'Announced in the 2026-27 Federal Budget — not yet law. Seek advice from a registered tax agent before making decisions.';

  function getRegime(contractDate, propertyType) {
    var isNewBuild = propertyType === 'new_build';
    var isGrandfathered = contractDate <= NEGATIVE_GEARING_CUTOFF;
    return {
      negativeGearingUnrestricted: isNewBuild || isGrandfathered,
      cgtFullDiscount: isNewBuild,
      cgtSplitTreatment: !isNewBuild && !isGrandfathered,
      isNewBuild: isNewBuild,
      isGrandfathered: isGrandfathered
    };
  }

  // ================================================================
  // HELPERS
  // ================================================================

  function $(id) { return document.getElementById(id); }

  function stripCommas(s) { return String(s).replace(/,/g, ''); }

  function round2(n) { return Math.round((n + Number.EPSILON) * 100) / 100; }

  // Shared P&I monthly-repayment helper — used by updateLoanTypeHint and buildProjection.
  // negative-gearing.js keeps its own copy (standalone module, no imports).
  function piMonthlyPayment(loan, monthlyRate, numPayments) {
    if (loan <= 0 || monthlyRate <= 0 || numPayments <= 0) return 0;
    var f = Math.pow(1 + monthlyRate, numPayments);
    return round2(loan * monthlyRate * f / (f - 1));
  }

  function getNum(id) {
    var el = $(id);
    if (!el) return 0;
    var v = parseFloat(stripCommas(el.value));
    return isFinite(v) ? v : 0;
  }

  function getStr(id) {
    var el = $(id);
    return el ? el.value : '';
  }

  function fmtMoney(n) {
    return (n < 0 ? '−$' : '$') + Math.abs(Math.round(n)).toLocaleString('en-AU');
  }

  function fmtMoneyShort(n) {
    var abs = Math.abs(Math.round(n));
    if (abs >= 1000) return (n < 0 ? '−$' : '$') + (abs / 1000).toFixed(1) + 'k';
    return (n < 0 ? '−$' : '$') + abs;
  }

  function fmtPct(n, dec) {
    return (n * 100).toFixed(dec !== undefined ? dec : 1) + '%';
  }

  function isDark() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  function chartTextColor() {
    return isDark() ? '#8b949e' : '#6b7280';
  }

  function chartGridColor() {
    return isDark() ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)';
  }

  // ================================================================
  // CURRENCY INPUT FORMATTING
  // ================================================================

  var currencyInputIds = [
    'ape-purchase-price', 'ape-land-value', 'ape-loan-amount',
    'ape-weekly-rent', 'ape-council-rates', 'ape-insurance',
    'ape-maintenance', 'ape-depreciation'
  ];

  function formatCurrencyInput(inputEl) {
    var raw = stripCommas(inputEl.value);
    if (raw === '' || raw === '-') return;
    var n = parseFloat(raw);
    if (!isFinite(n)) return;
    var formatted = Math.abs(n).toLocaleString('en-AU', { maximumFractionDigits: 0 });
    if (inputEl.value !== formatted) inputEl.value = formatted;
  }

  // ================================================================
  // VALIDATION
  // ================================================================

  var validationRules = {
    'ape-state': function (v) {
      if (!v) return 'Please select a state or territory.';
      return null;
    },
    'ape-purchase-price': function (v) {
      var n = parseFloat(stripCommas(v));
      if (!v || isNaN(n)) return 'Purchase price is required.';
      if (n <= 0) return 'Must be greater than zero.';
      if (n < 50000) return 'Must be at least $50,000.';
      return null;
    },
    'ape-land-value': function (v, all) {
      if (!v) return null;
      var n = parseFloat(stripCommas(v));
      if (isNaN(n)) return null;
      if (n < 0) return 'Must be zero or more.';
      var price = parseFloat(stripCommas(all['ape-purchase-price'] || ''));
      if (!isNaN(price) && price > 0 && n >= price) return 'Must be less than purchase price.';
      return null;
    },
    'ape-loan-amount': function (v, all) {
      var n = parseFloat(stripCommas(v));
      if (!v || isNaN(n)) return 'Loan amount is required.';
      if (n <= 0) return 'Must be greater than zero.';
      var price = parseFloat(stripCommas(all['ape-purchase-price'] || ''));
      if (!isNaN(price) && price > 0 && n > price) return 'Cannot exceed purchase price.';
      return null;
    },
    'ape-interest-rate': function (v) {
      var n = parseFloat(v);
      if (!v || isNaN(n)) return 'Interest rate is required.';
      if (n < 0.1 || n > 20) return 'Must be between 0.1% and 20%.';
      return null;
    },
    'ape-weekly-rent': function (v) {
      var n = parseFloat(stripCommas(v));
      if (!v || isNaN(n)) return 'Weekly rent is required.';
      if (n <= 0) return 'Must be greater than zero.';
      return null;
    },
    'ape-management-fee': function (v) {
      var n = parseFloat(v);
      if (!v || isNaN(n)) return 'Management fee is required.';
      if (n < 0 || n > 20) return 'Must be between 0% and 20%.';
      return null;
    }
  };

  function getAllFieldValues() {
    var vals = {};
    Object.keys(validationRules).forEach(function (id) {
      var el = $(id);
      vals[id] = el ? el.value : '';
    });
    return vals;
  }

  function showError(fieldId, msg) {
    var errId = 'err-' + fieldId.replace('ape-', '');
    var errEl = $(errId);
    var inputEl = $(fieldId);
    if (errEl) { errEl.textContent = msg; errEl.hidden = false; }
    if (inputEl) inputEl.classList.add('input-error');
  }

  function clearError(fieldId) {
    var errId = 'err-' + fieldId.replace('ape-', '');
    var errEl = $(errId);
    var inputEl = $(fieldId);
    if (errEl) { errEl.textContent = ''; errEl.hidden = true; }
    if (inputEl) inputEl.classList.remove('input-error');
  }

  function validateForm() {
    var all = getAllFieldValues();
    var valid = true;
    Object.keys(validationRules).forEach(function (id) {
      var msg = validationRules[id](all[id], all);
      if (msg) { showError(id, msg); valid = false; }
      else { clearError(id); }
    });
    return valid;
  }

  function validateField(id) {
    var rule = validationRules[id];
    if (!rule) return;
    var all = getAllFieldValues();
    var msg = rule(all[id], all);
    if (msg) showError(id, msg);
    else clearError(id);
  }

  // ================================================================
  // READ FORM
  // ================================================================

  function readParams() {
    var loanType = getStr('ape-loan-type') || 'io';
    var propertyType = getStr('ape-property-type') || 'established';
    var contractStr = getStr('ape-contract-date');
    // Parse the date input (YYYY-MM-DD) as a local date if provided.
    var contractDate = contractStr ? new Date(contractStr + 'T00:00:00+10:00') : null;
    var regime = contractDate ? getRegime(contractDate, propertyType) : null;
    return {
      state:             getStr('ape-state'),
      contractDate:      contractDate,
      propertyType:      propertyType,
      regime:            regime,
      purchasePrice:     getNum('ape-purchase-price'),
      landValue:         getNum('ape-land-value'),
      loanAmount:        getNum('ape-loan-amount'),
      interestRate:      getNum('ape-interest-rate') / 100,
      weeklyRent:        getNum('ape-weekly-rent'),
      vacancyWeeks:      getNum('ape-vacancy'),
      managementFeeRate: getNum('ape-management-fee') / 100,
      councilRates:      getNum('ape-council-rates'),
      insurance:         getNum('ape-insurance'),
      maintenance:       getNum('ape-maintenance'),
      depreciation:      getNum('ape-depreciation'),
      marginalTaxRate:   parseFloat(getStr('ape-marginal-tax-rate')) || 0,
      loanType:          loanType,
      loanTermYears:     getNum('ape-loan-term') || 30,
      isFirstHomeBuyer:  $('ape-fhb') ? $('ape-fhb').checked : false,
      waMetro:           getStr('ape-state') === 'WA' && !!($('ape-wa-metro') && $('ape-wa-metro').checked),
      cgtGrowthRate:     getNum('cgt-growth') / 100,
      cgtYears:          getNum('cgt-years') || 10,
      cgtSaleCostsPct:   getNum('cgt-sale-costs') / 100,
      cgtCurrentValue:   getNum('cgt-current-value') || 0
    };
  }

  // ================================================================
  // URL SHARING
  // ================================================================

  var urlParamFields = [
    'ape-state', 'ape-purchase-price', 'ape-land-value', 'ape-loan-amount',
    'ape-interest-rate', 'ape-weekly-rent', 'ape-vacancy', 'ape-management-fee',
    'ape-council-rates', 'ape-insurance', 'ape-maintenance', 'ape-depreciation',
    'ape-marginal-tax-rate', 'ape-loan-term', 'ape-loan-type',
    'ape-contract-date', 'ape-property-type',
    'cgt-growth', 'cgt-years', 'cgt-sale-costs', 'cgt-current-value'
  ];

  function encodeToUrl() {
    var q = new URLSearchParams();
    urlParamFields.forEach(function (id) {
      var el = $(id);
      if (el && el.value) q.set(id, el.value);
    });
    if ($('ape-fhb') && $('ape-fhb').checked) q.set('ape-fhb', '1');
    window.history.pushState(null, '', '?' + q.toString());
  }

  function loadFromUrl() {
    var q = new URLSearchParams(window.location.search);
    if (!q.toString()) return false;
    var hasAny = false;
    urlParamFields.forEach(function (id) {
      if (q.has(id)) {
        var el = $(id);
        if (el) { el.value = q.get(id); hasAny = true; }
      }
    });
    if (q.has('ape-fhb') && q.get('ape-fhb') === '1') {
      if ($('ape-fhb')) $('ape-fhb').checked = true;
    }
    if (q.has('ape-loan-type')) {
      setLoanType(q.get('ape-loan-type') === 'pi' ? 'pi' : 'io');
    }
    if (q.has('ape-property-type')) {
      setPropertyType(q.get('ape-property-type') === 'new_build' ? 'new_build' : 'established');
    }
    // Remap pre-Stage-3 tax rate values to the current 2025-26 schedule.
    var taxEl = $('ape-marginal-tax-rate');
    if (taxEl) {
      var OLD_RATE_MAP = { '0.21': '0.18', '0.345': '0.32' };
      var mapped = OLD_RATE_MAP[taxEl.value];
      if (mapped) taxEl.value = mapped;
    }
    return hasAny;
  }

  // ================================================================
  // LOAN TYPE TOGGLE
  // ================================================================

  function setLoanType(type) {
    var hiddenInput = $('ape-loan-type');
    var btnIo = $('btn-io');
    var btnPi = $('btn-pi');
    var termField = $('pi-loan-term-field');
    if (hiddenInput) hiddenInput.value = type;
    if (btnIo) btnIo.classList.toggle('active', type === 'io');
    if (btnPi) btnPi.classList.toggle('active', type === 'pi');
    if (termField) termField.hidden = (type !== 'pi');
    updateLoanTypeHint();
  }

  function updateLoanTypeHint() {
    var hintEl = $('loan-type-hint');
    if (!hintEl) return;
    var type = getStr('ape-loan-type') || 'io';
    if (type === 'pi') {
      var loan = getNum('ape-loan-amount');
      var rate = getNum('ape-interest-rate') / 100;
      var term = getNum('ape-loan-term') || 30;
      var yr1Interest = '';
      if (loan > 0 && rate > 0) {
        var mr = rate / 12;
        var n  = term * 12;
        var mp = piMonthlyPayment(loan, mr, n);
        var bal = loan, interest = 0;
        for (var m = 0; m < 12; m++) {
          var mi = round2(bal * mr);
          interest = round2(interest + mi);
          bal = round2(bal - (mp - mi));
        }
        yr1Interest = ' (~' + fmtMoney(interest) + ' yr 1 on this loan)';
      }
      hintEl.textContent = 'Principal & interest. Only the interest component is tax-deductible' + yr1Interest + '. Principal repayments are not deductible.';
    } else {
      hintEl.textContent = 'Interest-only basis. Principal repayments are not tax-deductible.';
    }
  }

  // ================================================================
  // PROPERTY TYPE TOGGLE
  // ================================================================

  function setPropertyType(type) {
    var hiddenInput = $('ape-property-type');
    var btnEst = $('btn-established');
    var btnNew = $('btn-newbuild');
    var hint   = $('newbuild-hint');
    if (hiddenInput) hiddenInput.value = type;
    if (btnEst) btnEst.classList.toggle('active', type === 'established');
    if (btnNew) btnNew.classList.toggle('active', type === 'new_build');
    if (hint) hint.hidden = (type !== 'new_build');
  }

  // ================================================================
  // LVR BADGE
  // ================================================================

  function updateLvr() {
    var price = getNum('ape-purchase-price');
    var loan  = getNum('ape-loan-amount');
    var badge = $('lvr-badge');
    if (!badge) return;
    if (price > 0 && loan > 0) {
      badge.textContent = ((loan / price) * 100).toFixed(1) + '% LVR';
      badge.hidden = false;
    } else {
      badge.hidden = true;
    }
  }

  // ================================================================
  // STATE DEFAULTS
  // ================================================================

  function applyStateDefaults(state) {
    var d = stateDefaults[state];
    if (!d) return;
    var mgmtEl   = $('ape-management-fee');
    var councilEl = $('ape-council-rates');
    var insEl     = $('ape-insurance');
    if (mgmtEl   && !mgmtEl.dataset.userEdited)   { mgmtEl.value = d.managementFee; }
    if (councilEl && !councilEl.dataset.userEdited) { councilEl.value = d.councilRates.toLocaleString('en-AU'); }
    if (insEl     && !insEl.dataset.userEdited)     { insEl.value = d.insurance.toLocaleString('en-AU'); }
  }

  // ================================================================
  // WA METRO (MRIT) ROW VISIBILITY
  // ================================================================

  function updateWaMritRow(state) {
    var row = $('wa-mrit-row');
    if (row) row.hidden = (state !== 'WA');
  }

  // ================================================================
  // FHB INFO BOX
  // ================================================================

  function updateFhbInfoBox(state) {
    var isFhb = $('ape-fhb') && $('ape-fhb').checked;
    var box = $('fhb-info-box');
    if (!box) return;
    if (!isFhb || !state) { box.hidden = true; return; }
    var c = fhbConcessions[state];
    if (!c) { box.hidden = true; return; }

    var lines = [];
    if (c.grantAmount > 0) {
      lines.push('<strong>FHOG: ' + fmtMoney(c.grantAmount) + '</strong> (eligibility criteria apply).');
    }
    if (c.fullyExemptThreshold !== null) {
      lines.push('Full stamp duty exemption for prices ≤ ' + fmtMoney(c.fullyExemptThreshold) + '.');
    }
    if (c.stampDutyThreshold !== null && c.fullyExemptThreshold !== null) {
      lines.push('Partial concession up to ' + fmtMoney(c.stampDutyThreshold) + '.');
    } else if (c.stampDutyThreshold !== null) {
      lines.push('Stamp duty concession available up to ' + fmtMoney(c.stampDutyThreshold) + '.');
    }
    if (lines.length === 0) {
      lines.push('No specific stamp duty concession in this state, but FHOG may apply.');
    }
    lines.push('Always confirm eligibility with your state revenue office.');

    box.innerHTML = lines.join('<br>');
    box.hidden = false;
  }

  // ================================================================
  // RATE SENSITIVITY
  // ================================================================

  function updateSensitivity(params) {
    var sliderEl  = $('ape-rate-slider');
    var previewEl = $('sensitivity-preview');
    if (!sliderEl || !previewEl) return;
    var sliderRate = parseFloat(sliderEl.value) / 100;
    if (!isFinite(sliderRate)) return;
    var altParams = {};
    Object.keys(params).forEach(function (k) { altParams[k] = params[k]; });
    altParams.interestRate = sliderRate;
    altParams.landTax = (params.landTaxAnnual || 0) + (params.mritAnnual || 0); // NG reads landTax
    var altNg = APE_NegativeGearing.calculate(altParams);
    var cashLabel = altNg.netCashFlow < 0
      ? fmtMoney(altNg.netCashFlow) + '/yr'
      : '+' + fmtMoney(altNg.netCashFlow) + '/yr';
    previewEl.textContent = 'At ' + (sliderRate * 100).toFixed(1) + '%: ' + cashLabel;

    // Update line chart for slider (no debounce)
    if (chartInstances.line) {
      var proj = buildProjection(Object.assign({}, params, { interestRate: sliderRate }), 0.03);
      var ds = chartInstances.line.data.datasets;
      ds[0].data = proj.beforeTax;
      ds[1].data = proj.afterTax;
      if (ds.length > 2) ds[2].data = proj.newRegime;
      chartInstances.line.update('none');
    }
  }

  // ================================================================
  // 10-YEAR PROJECTION
  // ================================================================

  function buildProjection(params, rentGrowthRate) {
    var loanAmount    = params.loanAmount;
    var interestRate  = params.interestRate;
    var loanType      = params.loanType || 'io';
    var loanTermYears = params.loanTermYears || 30;
    var weeklyRent    = params.weeklyRent;
    var vacancyWks    = params.vacancyWeeks || 0;
    var mgmtRate      = params.managementFeeRate;
    var otherExp      = params.councilRates + params.insurance + params.maintenance + (params.landTaxAnnual || 0) + (params.mritAnnual || 0);
    var depreciation  = params.depreciation;
    var taxRate       = params.marginalTaxRate;

    // For P&I: pre-compute monthly repayment so we can derive each year's interest from the declining balance.
    var monthlyRate = interestRate / 12;
    var numPayments = loanTermYears * 12;
    var piMonthlyPmt = (loanType === 'pi')
      ? piMonthlyPayment(loanAmount, monthlyRate, numPayments)
      : 0;

    var beforeTax = [], afterTax = [], newRegime = [];
    var carriedLoss = 0;
    for (var yr = 0; yr < 10; yr++) {
      // Deductible interest for this year.
      var annualInterest;
      if (loanType === 'pi' && piMonthlyPmt > 0) {
        // Outstanding balance at start of year = L × ((1+r)^n − (1+r)^(12·yr)) / ((1+r)^n − 1)
        var factor = Math.pow(1 + monthlyRate, numPayments);
        var paidFactor = Math.pow(1 + monthlyRate, 12 * yr);
        var balance = loanAmount * (factor - paidFactor) / (factor - 1);
        annualInterest = balance * interestRate; // approximate (balance × annual rate)
      } else {
        annualInterest = loanAmount * interestRate;
      }

      var rent = weeklyRent * (52 - vacancyWks) * Math.pow(1 + rentGrowthRate, yr);
      var mgmt = rent * mgmtRate;
      var totalCosts = annualInterest + mgmt + otherExp + depreciation;
      var netPos = rent - totalCosts;
      var taxBenefit = netPos < 0 ? Math.abs(netPos) * taxRate : 0;
      beforeTax.push(Math.round(netPos));
      afterTax.push(Math.round(netPos + taxBenefit));

      // --- New-regime after-tax line (quarantined losses carried forward) ---
      var newRegimeYear;
      if (netPos < 0) {
        // Negatively geared: no tax benefit, loss accumulates.
        carriedLoss += -netPos;
        newRegimeYear = netPos;
      } else {
        // Positively geared: carried losses offset taxable rental income first.
        var taxableIncome = netPos - carriedLoss;
        if (taxableIncome < 0) {
          carriedLoss = -taxableIncome; // some loss remains carried forward
          taxableIncome = 0;
        } else {
          carriedLoss = 0;
        }
        var taxOnIncome = taxableIncome * taxRate;
        newRegimeYear = netPos - taxOnIncome;
      }
      newRegime.push(Math.round(newRegimeYear));
    }
    return { beforeTax: beforeTax, afterTax: afterTax, newRegime: newRegime };
  }

  function estimateBreakevenYear(params) {
    var weeklyRent    = params.weeklyRent;
    var vacancyWks    = params.vacancyWeeks || 0;
    var mgmtRate      = params.managementFeeRate;
    var otherExp      = params.councilRates + params.insurance + params.maintenance + (params.landTaxAnnual || 0) + (params.mritAnnual || 0);
    var depreciation  = params.depreciation;
    var loanAmount    = params.loanAmount;
    var interestRate  = params.interestRate;
    var loanType      = params.loanType || 'io';
    var loanTermYears = params.loanTermYears || 30;
    var rentGrowth    = 0.03;

    // Pre-compute P&I amortisation constants (mirrors buildProjection).
    var monthlyRate = interestRate / 12;
    var numPayments = loanTermYears * 12;
    var piFactor    = (loanType === 'pi' && loanAmount > 0 && interestRate > 0)
      ? Math.pow(1 + monthlyRate, numPayments) : 0;

    for (var yr = 1; yr <= 20; yr++) {
      var annualInterest;
      if (loanType === 'pi' && piFactor > 0) {
        var paidFactor  = Math.pow(1 + monthlyRate, 12 * (yr - 1));
        var balance     = loanAmount * (piFactor - paidFactor) / (piFactor - 1);
        annualInterest  = balance * interestRate;
      } else {
        annualInterest = loanAmount * interestRate;
      }
      var rent = weeklyRent * (52 - vacancyWks) * Math.pow(1 + rentGrowth, yr - 1);
      var mgmt = rent * mgmtRate;
      var totalCosts = annualInterest + mgmt + otherExp + depreciation;
      if (rent >= totalCosts) return yr;
    }
    return null;
  }

  // ================================================================
  // CGT CALCULATION
  // ================================================================

  function calcCgt(params) {
    var price         = params.purchasePrice;
    var stampDuty     = params.stampDutyValue || 0;
    var costBase      = price + stampDuty; // stamp duty is part of the CGT cost base
    var growthRate    = params.cgtGrowthRate || 0.05;
    var years         = params.cgtYears || 10;
    var saleCostPct   = params.cgtSaleCostsPct || 0.025;
    var taxRate       = params.marginalTaxRate || 0;
    var currentValue  = params.cgtCurrentValue || 0; // optional "project from today" start value
    var startValue    = currentValue > 0 ? currentValue : price;
    var salePrice     = startValue * Math.pow(1 + growthRate, years);
    var saleCosts     = salePrice * saleCostPct;
    var netProceeds   = salePrice - saleCosts;
    var capitalGain   = Math.max(0, netProceeds - costBase);

    // Accumulate quarantined rental losses over the holding period (new regime only).
    // These offset the capital gain at sale before CGT is applied.
    var totalQuarantinedLoss = 0;
    if (params.regime && !params.regime.negativeGearingUnrestricted) {
      var qLoan      = params.loanAmount;
      var qRate      = params.interestRate;
      var qLoanType  = params.loanType || 'io';
      var qTermYears = params.loanTermYears || 30;
      var qRent      = params.weeklyRent;
      var qVac       = params.vacancyWeeks || 0;
      var qMgmt      = params.managementFeeRate;
      var qOther     = params.councilRates + params.insurance + params.maintenance + (params.landTaxAnnual || 0) + (params.mritAnnual || 0);
      var qDepr      = params.depreciation;
      var rentGrowth = 0.03;
      // Pre-compute P&I monthly constants for declining-balance interest.
      var qMonthlyRate = qRate / 12;
      var qNumPayments = qTermYears * 12;
      var qPiFactor    = (qLoanType === 'pi' && qLoan > 0 && qRate > 0)
        ? Math.pow(1 + qMonthlyRate, qNumPayments) : 0;
      for (var qy = 0; qy < years; qy++) {
        var qAnnualInterest;
        if (qLoanType === 'pi' && qPiFactor > 0) {
          var qPaidFactor = Math.pow(1 + qMonthlyRate, 12 * qy);
          var qBalance = qLoan * (qPiFactor - qPaidFactor) / (qPiFactor - 1);
          qAnnualInterest = qBalance * qRate;
        } else {
          qAnnualInterest = qLoan * qRate;
        }
        var qYearRent = qRent * (52 - qVac) * Math.pow(1 + rentGrowth, qy);
        var qYearCosts = qAnnualInterest + qYearRent * qMgmt + qOther + qDepr;
        var qNetPos = qYearRent - qYearCosts;
        if (qNetPos < 0) totalQuarantinedLoss += -qNetPos;
      }
    }
    var adjustedCapitalGain = Math.max(0, capitalGain - totalQuarantinedLoss);

    // --- CASE B: new regime, established property → split CGT treatment ---
    if (params.regime && params.regime.cgtSplitTreatment && params.contractDate && capitalGain > 0) {
      var msPerYear = 365.25 * 24 * 3600 * 1000;
      var yearsToReformDate = (CGT_REFORM_DATE - params.contractDate) / msPerYear;
      yearsToReformDate = Math.max(0, Math.min(years, yearsToReformDate));

      // Edge case A: if value at reform date is below cost base, no pre-reform gain.
      // Use startValue (respects cgtCurrentValue) so the reform-date projection is
      // consistent with the sale-price projection — both grow from the same base.
      var valueAtReformDate = startValue * Math.pow(1 + growthRate, yearsToReformDate);
      // Cap preSplitGain to adjustedCapitalGain so quarantined losses are allocated
      // to the post-reform period first; prevents preTax exceeding the adjusted gain.
      var preSplitGainRaw = Math.max(0, valueAtReformDate - costBase);
      var preSplitGain    = Math.min(preSplitGainRaw, adjustedCapitalGain);
      // Edge case B: if sold before reform date, all gain is pre-reform (yearsToReformDate === years → postSplitGain = 0).
      var postSplitGain = Math.max(0, adjustedCapitalGain - preSplitGain);

      // Pre-reform: 50% discount still applies.
      var taxablePreGain = preSplitGain * 0.5;
      // Post-reform: 30% minimum tax, no discount.
      var effectivePostRate = Math.max(0.30, taxRate);

      var preTax  = taxablePreGain * taxRate;
      var postTax = postSplitGain * effectivePostRate;
      var totalCGT = preTax + postTax;

      return {
        split: true,
        costBase: costBase, stampDuty: stampDuty,
        salePrice: salePrice, saleCosts: saleCosts, netProceeds: netProceeds,
        capitalGain: capitalGain, adjustedCapitalGain: adjustedCapitalGain,
        totalQuarantinedLoss: totalQuarantinedLoss,
        years: years,
        preSplitGain: preSplitGain, postSplitGain: postSplitGain,
        taxablePreGain: taxablePreGain,
        effectivePostRate: effectivePostRate,
        preTax: preTax, postTax: postTax,
        cgtPayable: totalCGT,
        netAfterTax: capitalGain - totalCGT
      };
    }

    // --- CASE A: grandfathered, new build, or no regime → 50% discount on adjusted gain ---
    var taxableGain = adjustedCapitalGain > 0 ? adjustedCapitalGain * 0.5 : 0;
    var cgtPayable  = taxableGain > 0 ? taxableGain * taxRate : 0;
    var netAfterTax = capitalGain - cgtPayable;
    return {
      split: false,
      costBase: costBase, stampDuty: stampDuty,
      salePrice: salePrice, saleCosts: saleCosts, netProceeds: netProceeds,
      capitalGain: capitalGain, adjustedCapitalGain: adjustedCapitalGain,
      totalQuarantinedLoss: totalQuarantinedLoss,
      taxableGain: taxableGain,
      cgtPayable: cgtPayable, netAfterTax: netAfterTax, years: years
    };
  }

  function renderCgtResults(params) {
    var resultsEl = $('cgtResults');
    if (!resultsEl) return;
    if (!params || !params.purchasePrice) {
      resultsEl.innerHTML = '<div class="empty-state">Calculate first to see CGT projection.</div>';
      return;
    }

    // Holding-years nudge: show tip if contract date is more than 5 years ago.
    var nudgeEl = $('cgt-holding-nudge');
    if (nudgeEl && params.contractDate) {
      var msPerYear = 365.25 * 24 * 3600 * 1000;
      var heldYears = (Date.now() - params.contractDate.getTime()) / msPerYear;
      if (heldYears > 5 && !(params.cgtCurrentValue > 0)) {
        nudgeEl.textContent = 'ⓘ This property has been held for ' + Math.floor(heldYears) +
          ' years. Consider entering a current market value above for a more realistic CGT projection.';
        nudgeEl.hidden = false;
      } else {
        nudgeEl.hidden = true;
      }
    } else if (nudgeEl) {
      nudgeEl.hidden = true;
    }

    var cgt = calcCgt(params);

    // "Projecting from current value" note.
    var startNote = (params.cgtCurrentValue > 0)
      ? '<p class="field-hint cgt-current-note">Projecting from current market value of ' +
        fmtMoney(params.cgtCurrentValue) + '. CGT cost base still uses original purchase price (' +
        fmtMoney(params.purchasePrice) + ') + stamp duty.</p>'
      : '';

    // --- CASE B: split-gain breakdown table ---
    if (cgt.split) {
      var tbl =
        '<table class="cgt-split-table">' +
          '<thead><tr>' +
            '<th>Period</th><th>Gain</th><th>Treatment</th><th>Tax payable</th>' +
          '</tr></thead><tbody>' +
          '<tr>' +
            '<td>Pre-1 Jul 2027</td>' +
            '<td>' + fmtMoney(cgt.preSplitGain) + '</td>' +
            '<td>50% discount</td>' +
            '<td>' + fmtMoney(cgt.preTax) + '</td>' +
          '</tr>' +
          '<tr>' +
            '<td>Post-1 Jul 2027</td>' +
            '<td>' + fmtMoney(cgt.postSplitGain) + '</td>' +
            '<td>30% minimum tax</td>' +
            '<td>' + fmtMoney(cgt.postTax) + '</td>' +
          '</tr>' +
          '<tr class="cgt-split-total">' +
            '<td>Total</td>' +
            '<td>' + fmtMoney(cgt.capitalGain) + '</td>' +
            '<td></td>' +
            '<td>' + fmtMoney(cgt.cgtPayable) + '</td>' +
          '</tr>' +
        '</tbody></table>';

      var summary =
        summaryRow('Projected sale price', fmtMoney(cgt.salePrice)) +
        summaryRow('Sale costs (' + (params.cgtSaleCostsPct * 100).toFixed(1) + '%)', '−' + fmtMoney(cgt.saleCosts)) +
        summaryRow('Net proceeds', fmtMoney(cgt.netProceeds)) +
        summaryRow('Cost base (purchase + stamp duty)', '−' + fmtMoney(cgt.costBase)) +
        summaryRow('Gross capital gain', fmtMoney(cgt.capitalGain)) +
        (cgt.totalQuarantinedLoss > 0 ? summaryRow('Accumulated quarantined losses', '−' + fmtMoney(cgt.totalQuarantinedLoss)) : '') +
        '<div class="summary-row summary-row-total"><span class="label">Net after-tax profit</span>' +
        '<span class="value">' + fmtMoney(cgt.netAfterTax) + '</span></div>';

      resultsEl.innerHTML = startNote +
        '<p class="cgt-split-intro">Split CGT treatment applies — the gain is taxed in two periods:</p>' +
        tbl + summary +
        '<p class="cgt-regime-disclaimer">' + REGIME_DISCLAIMER + '</p>';
      return;
    }

    // --- CASE A: standard 50% discount ---
    var rows = [
      ['Projected sale price', fmtMoney(cgt.salePrice)],
      ['Sale costs (' + (params.cgtSaleCostsPct * 100).toFixed(1) + '%)', '−' + fmtMoney(cgt.saleCosts)],
      ['Net proceeds', fmtMoney(cgt.netProceeds)],
      ['Cost base (purchase + stamp duty)', '−' + fmtMoney(cgt.costBase)],
      ['Gross capital gain', fmtMoney(cgt.capitalGain)]
    ];
    if (cgt.totalQuarantinedLoss > 0) {
      rows.push(['Accumulated quarantined losses', '−' + fmtMoney(cgt.totalQuarantinedLoss)]);
    }
    rows = rows.concat([
      ['50% CGT discount applied', 'Yes (held > 12 months)'],
      ['Taxable gain', fmtMoney(cgt.taxableGain)],
      ['CGT payable (' + (params.marginalTaxRate * 100).toFixed(1) + '%)', '−' + fmtMoney(cgt.cgtPayable)],
      ['Net after-tax profit', fmtMoney(cgt.netAfterTax)]
    ]);
    var html = '';
    rows.forEach(function (r, i) {
      var isLast = i === rows.length - 1;
      html += '<div class="summary-row' + (isLast ? ' summary-row-total' : '') + '">' +
              '<span class="label">' + r[0] + '</span>' +
              '<span class="value">' + r[1] + '</span></div>';
    });
    resultsEl.innerHTML = startNote + html;
  }

  // ================================================================
  // CHART INSTANCES
  // ================================================================

  var chartInstances = { donut: null, bar: null, line: null };

  function getOrCreateDonut(ng) {
    var ctx = $('donutChart').getContext('2d');
    var segments = [
      { label: 'Interest',    value: ng.interestCost },
      { label: 'Mgmt fees',  value: ng.managementFees },
      { label: 'Council',    value: ng.councilRates },
      { label: 'Insurance',  value: ng.insurance },
      { label: 'Maintenance',value: ng.maintenance },
      { label: 'Land tax',   value: ng.landTax || 0 },
      { label: 'MRIT',       value: ng.mrit || 0 },
      { label: 'Depreciation', value: ng.depreciation }
    ].filter(function (s) { return s.value > 0; });

    var labels = segments.map(function (s) { return s.label; });
    var data   = segments.map(function (s) { return s.value; });
    var colors = DONUT_COLORS.slice(0, segments.length);
    var textColor = chartTextColor();

    if (chartInstances.donut) {
      var chart = chartInstances.donut;
      chart.data.labels = labels;
      chart.data.datasets[0].data = data;
      chart.data.datasets[0].backgroundColor = colors;
      chart.update('none');
      return chart;
    }

    chartInstances.donut = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: colors,
          borderWidth: 2,
          borderColor: isDark() ? '#161b22' : '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '60%',
        plugins: {
          legend: {
            position: 'right',
            labels: {
              font: { size: 9, family: 'Inter, system-ui, sans-serif' },
              color: textColor,
              boxWidth: 10,
              padding: 6
            }
          },
          tooltip: {
            callbacks: {
              label: function (ctx) {
                return ' ' + ctx.label + ': ' + fmtMoney(ctx.raw);
              }
            }
          }
        }
      }
    });
    return chartInstances.donut;
  }

  function getOrCreateBar(ng) {
    var ctx = $('barChart').getContext('2d');
    var textColor = chartTextColor();
    var gridColor = chartGridColor();

    var barData = [
      { label: 'Gross rent',  value: ng.annualRent,     color: '#0f9e76' },
      { label: 'Interest',    value: -ng.interestCost,  color: '#1e5fad' },
      { label: 'Other costs', value: -(ng.managementFees + ng.otherExpenses + ng.depreciation), color: '#d97706' },
      { label: 'Tax benefit', value: ng.taxBenefit,     color: '#10b981' },
      { label: 'Net',         value: ng.netCashFlow,    color: ng.netCashFlow >= 0 ? '#10b981' : '#ef4444' }
    ];

    var labels = barData.map(function (d) { return d.label; });
    var values = barData.map(function (d) { return d.value; });
    var bkgs   = barData.map(function (d) { return d.color; });

    if (chartInstances.bar) {
      var chart = chartInstances.bar;
      chart.data.labels = labels;
      chart.data.datasets[0].data = values;
      chart.data.datasets[0].backgroundColor = bkgs;
      chart.update('none');
      return chart;
    }

    chartInstances.bar = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          data: values,
          backgroundColor: bkgs,
          borderRadius: 4,
          borderSkipped: false
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function (ctx) { return ' ' + fmtMoney(ctx.raw); }
            }
          }
        },
        scales: {
          x: {
            ticks: { font: { size: 9, family: 'Inter, system-ui, sans-serif' }, color: textColor },
            grid: { display: false }
          },
          y: {
            ticks: {
              font: { size: 9, family: 'Inter, system-ui, sans-serif' },
              color: textColor,
              callback: function (v) { return fmtMoneyShort(v); }
            },
            grid: { color: gridColor }
          }
        }
      }
    });
    return chartInstances.bar;
  }

  function makeNewRegimeDataset(data) {
    return {
      label: 'After tax, new regime',
      data: data,
      borderColor: '#d97706',
      backgroundColor: 'rgba(217,119,6,0.08)',
      fill: false,
      borderDash: [5, 4],
      tension: 0.3,
      pointRadius: 3,
      borderWidth: 2
    };
  }

  // Holds the fractional x-index (0-based) of 1 Jul 2027 for the vertical
  // marker, or null when the new regime does not apply. Read by the plugin.
  var reformLineIndex = null;

  // Chart.js plugin: draws a vertical dashed "New regime" marker at the
  // 1 Jul 2027 position. No external dependency — pure canvas drawing.
  var reformLinePlugin = {
    id: 'reformLine',
    afterDraw: function (chart) {
      if (reformLineIndex === null) return;
      var xScale = chart.scales.x;
      var yScale = chart.scales.y;
      if (!xScale || !yScale) return;
      var x = xScale.getPixelForValue(reformLineIndex);
      if (!isFinite(x)) return;
      var ctx = chart.ctx;
      ctx.save();
      ctx.beginPath();
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#d97706';
      ctx.moveTo(x, yScale.top);
      ctx.lineTo(x, yScale.bottom);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#d97706';
      ctx.font = '9px Inter, system-ui, sans-serif';
      ctx.textAlign = x > (xScale.left + xScale.right) / 2 ? 'right' : 'left';
      var labelX = ctx.textAlign === 'right' ? x - 4 : x + 4;
      ctx.fillText('New regime', labelX, yScale.top + 9);
      ctx.restore();
    }
  };

  function getOrCreateLine(projection, regime, reformIdx) {
    var ctx = $('lineChart').getContext('2d');
    var textColor = chartTextColor();
    var gridColor = chartGridColor();
    var labels = ['Yr 1','Yr 2','Yr 3','Yr 4','Yr 5','Yr 6','Yr 7','Yr 8','Yr 9','Yr 10'];
    var showNewRegime = !!(regime && regime.cgtSplitTreatment);
    reformLineIndex = showNewRegime && isFinite(reformIdx) ? reformIdx : null;

    if (chartInstances.line) {
      var chart = chartInstances.line;
      chart.data.datasets[0].data = projection.beforeTax;
      chart.data.datasets[1].data = projection.afterTax;
      // Add or remove the amber new-regime dataset as needed.
      var hasAmber = chart.data.datasets.length > 2;
      if (showNewRegime) {
        if (!hasAmber) {
          chart.data.datasets.push(makeNewRegimeDataset(projection.newRegime));
        } else {
          chart.data.datasets[2].data = projection.newRegime;
        }
      } else if (hasAmber) {
        chart.data.datasets.splice(2, 1);
      }
      chart.update('none');
      return chart;
    }

    var datasets = [
      {
        label: 'Before tax',
        data: projection.beforeTax,
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239,68,68,0.06)',
        fill: true,
        tension: 0.3,
        pointRadius: 3,
        borderWidth: 2
      },
      {
        label: 'After tax, current rules',
        data: projection.afterTax,
        borderColor: '#10b981',
        backgroundColor: 'rgba(16,185,129,0.08)',
        fill: true,
        tension: 0.3,
        pointRadius: 3,
        borderWidth: 2
      }
    ];
    if (showNewRegime) {
      datasets.push(makeNewRegimeDataset(projection.newRegime));
    }

    chartInstances.line = new Chart(ctx, {
      type: 'line',
      plugins: [reformLinePlugin],
      data: {
        labels: labels,
        datasets: datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: {
              font: { size: 9, family: 'Inter, system-ui, sans-serif' },
              color: textColor,
              boxWidth: 12,
              padding: 10
            }
          },
          tooltip: {
            callbacks: {
              label: function (ctx) { return ' ' + ctx.dataset.label + ': ' + fmtMoney(ctx.raw); }
            }
          }
        },
        scales: {
          x: {
            ticks: { font: { size: 9, family: 'Inter, system-ui, sans-serif' }, color: textColor },
            grid: { display: false }
          },
          y: {
            ticks: {
              font: { size: 9, family: 'Inter, system-ui, sans-serif' },
              color: textColor,
              callback: function (v) { return fmtMoneyShort(v); }
            },
            grid: { color: gridColor }
          }
        }
      }
    });
    return chartInstances.line;
  }

  // ================================================================
  // RENDER DASHBOARD
  // ================================================================

  function renderStampDuty(sd, params) {
    var el = $('stampRows');
    if (!el) return;
    if (!sd || sd.value === null) {
      el.innerHTML = '<div class="empty-state">Select a state to calculate</div>';
      return;
    }
    var effectiveRate = params.purchasePrice > 0 ? (sd.value / params.purchasePrice) * 100 : 0;
    var html =
      summaryRow('Purchase price', fmtMoney(params.purchasePrice)) +
      summaryRow('Stamp duty', fmtMoney(sd.value)) +
      summaryRow('Effective rate', effectiveRate.toFixed(2) + '%');
    if (params.isFirstHomeBuyer && sd.fhogAmount > 0) {
      html += summaryRow('FHOG', fmtMoney(sd.fhogAmount));
    }
    el.innerHTML = html;
  }

  function renderLandTax(lt, params) {
    var el = $('ltRows');
    if (!el) return;
    if (!lt || lt.value === null) {
      el.innerHTML = '<div class="empty-state">Enter land value to calculate</div>';
      return;
    }
    var isNT = params.state === 'NT';
    var statusBadge = '';
    if (isNT) {
      statusBadge = '<span class="badge-green">None — NT</span>';
    } else if (lt.value === 0) {
      statusBadge = '<span class="badge-green">Below threshold</span>';
    } else {
      statusBadge = '<span class="badge-amber">Liable</span>';
    }
    var taxLabel = isNT ? 'No land tax' : (lt.value === 0 ? 'Below threshold' : fmtMoney(lt.value));
    var html =
      summaryRow('Land value', fmtMoney(params.landValue)) +
      summaryRow('Annual land tax', taxLabel);

    // WA: show MRIT as a separate deductible line when metro is checked.
    var mrit = params.mritAnnual || 0;
    if (params.state === 'WA') {
      html += summaryRow('MRIT (metro levy)', mrit > 0 ? fmtMoney(mrit) : 'Not applicable');
      if (mrit > 0) {
        html += summaryRow('Total land charges', fmtMoney((lt.value || 0) + mrit));
      }
    }

    html += '<div class="summary-row"><span class="label">Status</span><span class="value">' + statusBadge + '</span></div>';
    el.innerHTML = html;
  }

  function summaryRow(label, value) {
    return '<div class="summary-row"><span class="label">' + label + '</span><span class="value">' + value + '</span></div>';
  }

  function renderMetrics(ng, params, sd) {
    // Weekly cost
    var weeklyEl = $('m-weekly');
    if (weeklyEl) {
      if (ng.gearingStatus === 'negative') {
        weeklyEl.textContent = fmtMoney(-ng.weeklyNetCost) + '/wk';
        weeklyEl.className = 'metric-value val-negative';
      } else {
        weeklyEl.textContent = '+' + fmtMoney(Math.abs(ng.weeklyNetCost)) + '/wk';
        weeklyEl.className = 'metric-value val-positive';
      }
    }

    // Tax benefit
    var taxEl = $('m-tax');
    var taxSubEl = $('m-tax-sub');
    if (taxEl) {
      if (ng.quarantined) {
        taxEl.textContent = 'Quarantined';
        taxEl.className = 'metric-value val-warning';
        if (taxSubEl) taxSubEl.textContent = 'loss carried forward';
      } else if (ng.taxBenefit > 0) {
        taxEl.textContent = fmtMoney(ng.taxBenefit);
        taxEl.className = 'metric-value val-positive';
        if (taxSubEl) taxSubEl.textContent = 'annual saving';
      } else {
        taxEl.textContent = '$0';
        taxEl.className = 'metric-value val-neutral';
        if (taxSubEl) taxSubEl.textContent = 'annual saving';
      }
    }

    // Rental yield
    var yieldEl = $('m-yield');
    if (yieldEl) {
      if (params.purchasePrice > 0) {
        var grossYield = (ng.annualRent / params.purchasePrice) * 100;
        yieldEl.textContent = grossYield.toFixed(2) + '%';
        yieldEl.className = 'metric-value ' + (grossYield >= 5 ? 'val-positive' : grossYield >= 3.5 ? 'val-warning' : 'val-negative');
      } else {
        yieldEl.textContent = '—';
        yieldEl.className = 'metric-value val-neutral';
      }
    }

    // Break-even
    var beEl = $('m-breakeven');
    if (beEl) {
      if (ng.gearingStatus === 'positive') {
        beEl.textContent = 'Now';
        beEl.className = 'metric-value val-positive';
      } else {
        var beYr = estimateBreakevenYear(params);
        if (beYr !== null) {
          beEl.textContent = 'Yr ' + beYr;
          beEl.className = 'metric-value ' + (beYr <= 5 ? 'val-positive' : beYr <= 10 ? 'val-warning' : 'val-negative');
        } else {
          beEl.textContent = '>20 yrs';
          beEl.className = 'metric-value val-negative';
        }
      }
    }
  }

  function renderStatusBanner(ng) {
    var banner = $('statusBanner');
    var labelEl = $('statusLabel');
    var detailEl = $('statusDetail');
    if (!banner || !labelEl) return;

    if (ng.gearingStatus === 'negative') {
      banner.className = 'status-banner negative';
      labelEl.textContent = 'Negatively Geared';
      if (detailEl) {
        if (ng.quarantined) {
          var loss = Math.abs(ng.netRentalIncome);
          detailEl.innerHTML = '<span class="quarantine-note">Quarantined loss: ' + fmtMoney(loss) +
            ' — carried forward to future rental income</span>';
        } else if (ng.depreciation > 0) {
          // Show cash vs accounting split when there is a non-cash depreciation deduction.
          var cashNote = ng.cashRentalPos >= 0
            ? 'Cash surplus ex-depreciation: +' + fmtMoney(ng.cashRentalPos) + '/yr'
            : 'Cash loss ex-depreciation: ' + fmtMoney(ng.cashRentalPos) + '/yr';
          detailEl.innerHTML = fmtMoney(ng.netCashFlow) + '/yr after-tax · <span class="depreciation-note" title="Depreciation (' +
            fmtMoney(ng.depreciation) + ') is a non-cash deduction">' + cashNote + ' (depreciation is non-cash)</span>';
        } else {
          detailEl.textContent = fmtMoney(ng.netCashFlow) + '/yr after-tax cost';
        }
      }
    } else if (ng.gearingStatus === 'positive') {
      banner.className = 'status-banner positive';
      labelEl.textContent = 'Positively Geared';
      if (detailEl) detailEl.textContent = '+' + fmtMoney(ng.netCashFlow) + '/yr after-tax income';
    } else {
      banner.className = 'status-banner neutral';
      labelEl.textContent = 'Neutrally Geared';
      if (detailEl) detailEl.textContent = 'Rent covers costs exactly';
    }
  }

  function renderRegimeBanner(regime) {
    var banner = $('regimeBanner');
    var iconEl = $('regimeIcon');
    var titleEl = $('regimeTitle');
    var subEl = $('regimeSub');
    if (!banner || !iconEl || !titleEl || !subEl) return;

    // Only show once a contract date has been entered.
    if (!regime) {
      banner.hidden = true;
      return;
    }

    var icon, title, cls;
    if (regime.isGrandfathered && regime.isNewBuild) {
      cls = 'regime-success';
      icon = '🏗️';
      title = 'Grandfathered and new build — full negative gearing applies. At sale, choose 50% CGT discount or cost-base indexation.';
    } else if (regime.isGrandfathered) {
      cls = 'regime-success';
      icon = '🛡️';
      title = 'Grandfathered — current negative gearing rules and 50% CGT discount apply';
    } else if (regime.isNewBuild) {
      cls = 'regime-success';
      icon = '🏗️';
      title = 'New build — full negative gearing retained; 50% CGT discount or cost-base indexation at sale';
    } else {
      cls = 'regime-warning';
      icon = '⚠️';
      title = 'New regime (post 12 May 2026) — negative gearing quarantined from 1 Jul 2027 · split CGT treatment applies';
    }

    banner.className = 'regime-banner ' + cls;
    iconEl.textContent = icon;
    titleEl.textContent = title;
    subEl.textContent = REGIME_DISCLAIMER;
    banner.hidden = false;
  }

  function renderDashboard(params, ng, sd, lt) {
    // Status banner
    renderStatusBanner(ng);

    // Regime banner (policy-aware)
    renderRegimeBanner(params.regime);

    // Metrics
    renderMetrics(ng, params, sd);

    // Donut chart
    var donutTotal = $('donutTotal');
    getOrCreateDonut(ng);
    if (donutTotal) {
      donutTotal.textContent = 'Total deductions: ' + fmtMoney(ng.totalDeductions) + '/yr';
    }

    // Bar chart
    getOrCreateBar(ng);

    // Line chart projection
    var projection = buildProjection(params, 0.03);
    var reformIdx = null;
    if (params.regime && params.regime.cgtSplitTreatment && params.contractDate) {
      var msPerYear = 365.25 * 24 * 3600 * 1000;
      reformIdx = (CGT_REFORM_DATE - params.contractDate) / msPerYear; // fractional year index
    }
    getOrCreateLine(projection, params.regime, reformIdx);

    // Stamp duty panel
    renderStampDuty(sd, params);

    // Land tax panel
    renderLandTax(lt, params);

    // CGT (if body is visible)
    var cgtBody = $('cgtBody');
    if (cgtBody && !cgtBody.hidden) {
      renderCgtResults(params);
    }

    // Rate sensitivity slider
    var sensWrap = $('sensitivity-wrap');
    if (sensWrap) {
      sensWrap.hidden = false;
      var slider = $('ape-rate-slider');
      if (slider) {
        var rate = params.interestRate * 100;
        slider.min  = Math.max(0.5, rate - 2).toFixed(1);
        slider.max  = Math.min(15, rate + 3).toFixed(1);
        slider.value = rate.toFixed(1);
        updateSensitivity(params);
      }
    }
  }

  // ================================================================
  // LIGHTWEIGHT TAX CARD UPDATE (runs before first full calculation)
  // ================================================================

  function updateStampDuty() {
    var state = getStr('ape-state');
    if (!state) return;
    var purchasePrice = getNum('ape-purchase-price');
    var landValue     = getNum('ape-land-value');
    var isFhb         = $('ape-fhb') ? $('ape-fhb').checked : false;
    var sd = APE_StampDuty.calculate(state, purchasePrice, isFhb);
    renderStampDuty(sd, { state: state, purchasePrice: purchasePrice, landValue: landValue, isFirstHomeBuyer: isFhb });
  }

  function updateLandTax() {
    var state = getStr('ape-state');
    if (!state) return;
    var purchasePrice = getNum('ape-purchase-price');
    var landValue     = getNum('ape-land-value');
    var isFhb         = $('ape-fhb') ? $('ape-fhb').checked : false;
    var isWaMetro  = state === 'WA' && !!($('ape-wa-metro') && $('ape-wa-metro').checked);
    var mritAnnual = calcMrit(state, landValue, isWaMetro);
    var lt = APE_LandTax.calculate(state, landValue);
    renderLandTax(lt, { state: state, purchasePrice: purchasePrice, landValue: landValue, isFirstHomeBuyer: isFhb, mritAnnual: mritAnnual });
  }

  function updateTaxCards() {
    updateStampDuty();
    updateLandTax();
  }

  // ================================================================
  // DEBOUNCED RECALC
  // ================================================================

  var hasCalculatedOnce = false;
  var debounceTimer = null;
  var lastParams = null;

  function triggerDebounce() {
    if (!hasCalculatedOnce) return;
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(function () {
      runCalculation();
    }, 320);
  }

  function runCalculation() {
    if (!validateForm()) return;
    var params = readParams();

    // Calculate land tax and stamp duty first so they feed into NG deductions and CGT cost base.
    var sd = APE_StampDuty.calculate(params.state, params.purchasePrice, params.isFirstHomeBuyer);
    var lt = APE_LandTax.calculate(params.state, params.landValue);
    params.landTaxAnnual  = (lt && lt.value !== null) ? lt.value : 0;
    params.stampDutyValue = (sd && sd.value !== null) ? sd.value : 0;

    params.mritAnnual = calcMrit(params.state, params.landValue, params.waMetro);

    var ng = APE_NegativeGearing.calculate(Object.assign({}, params, {
      landTax: params.landTaxAnnual + params.mritAnnual  // both are deductible
    }));

    // Patch ng with individual expense fields for donut chart
    ng = Object.assign({}, ng, {
      councilRates: params.councilRates,
      insurance:    params.insurance,
      maintenance:  params.maintenance,
      landTax:      params.landTaxAnnual,
      mrit:         params.mritAnnual
    });

    // Quarantine the loss when new rules apply.
    ng.quarantined = false;
    ng.quarantinedAmount = 0;
    if (params.regime && !params.regime.negativeGearingUnrestricted) {
      if (ng.gearingStatus === 'negative') {
        ng.quarantined = true;
        ng.quarantinedAmount = ng.taxBenefit;
        ng.taxBenefit = 0;
        ng.netCashFlow = round2(ng.netRentalIncome);
        ng.weeklyNetCost = round2(-ng.netCashFlow / 52);
      }
    }

    lastParams = params;
    renderDashboard(params, ng, sd, lt);
    encodeToUrl();
    hasCalculatedOnce = true;
  }

  // ================================================================
  // CGT COLLAPSIBLE
  // ================================================================

  function initCgtCollapsible() {
    var toggle   = $('cgtToggle');
    var body     = $('cgtBody');
    var chevron  = $('cgtChevron');
    if (!toggle || !body) return;

    toggle.addEventListener('click', function () {
      var isOpen = !body.hidden;
      body.hidden = isOpen;
      if (chevron) chevron.classList.toggle('open', !isOpen);
      toggle.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
      if (!isOpen && lastParams) renderCgtResults(lastParams);
    });

    // CGT inputs trigger re-render with fresh DOM values (avoids 320ms stale-params flash).
    ['cgt-growth', 'cgt-years', 'cgt-sale-costs', 'cgt-current-value'].forEach(function (id) {
      var el = $(id);
      if (el) {
        el.addEventListener('input', function () {
          if (!body.hidden && lastParams) {
            var freshCgtParams = Object.assign({}, lastParams, {
              cgtGrowthRate:   getNum('cgt-growth') / 100,
              cgtYears:        getNum('cgt-years') || 10,
              cgtSaleCostsPct: getNum('cgt-sale-costs') / 100,
              cgtCurrentValue: getNum('cgt-current-value') || 0
            });
            renderCgtResults(freshCgtParams);
          }
          triggerDebounce();
        });
      }
    });
  }

  // ================================================================
  // SHARE & PRINT
  // ================================================================

  function initHeaderButtons() {
    var shareBtn = $('shareBtn');
    var printBtn = $('printBtn');

    if (shareBtn) {
      shareBtn.addEventListener('click', function () {
        encodeToUrl();
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(window.location.href).then(function () {
            shareBtn.textContent = 'Copied!';
            setTimeout(function () { shareBtn.textContent = 'Share'; }, 1800);
          });
        } else {
          shareBtn.textContent = 'Copied!';
          setTimeout(function () { shareBtn.textContent = 'Share'; }, 1800);
        }
      });
    }

    if (printBtn) {
      printBtn.addEventListener('click', function () { window.print(); });
    }
  }

  // ================================================================
  // INIT
  // ================================================================

  window.addEventListener('DOMContentLoaded', function () {

    // Currency formatting on blur
    currencyInputIds.forEach(function (id) {
      var el = $(id);
      if (el) el.addEventListener('blur', function () { formatCurrencyInput(el); });
    });

    // Mark user-edited fields so state change doesn't overwrite
    ['ape-management-fee', 'ape-council-rates', 'ape-insurance', 'ape-maintenance', 'ape-depreciation'].forEach(function (id) {
      var el = $(id);
      if (el) el.addEventListener('input', function () { el.dataset.userEdited = '1'; });
    });

    // LVR
    var ppEl = $('ape-purchase-price');
    var laEl = $('ape-loan-amount');
    if (ppEl) ppEl.addEventListener('input', updateLvr);
    if (laEl) laEl.addEventListener('input', updateLvr);

    // Purchase price → auto land value
    if (ppEl) {
      ppEl.addEventListener('input', function () {
        var lvEl = $('ape-land-value');
        if (lvEl && !lvEl.dataset.userEdited) {
          var price = getNum('ape-purchase-price');
          lvEl.value = price > 0 ? Math.round(price * 0.35).toLocaleString('en-AU') : '';
        }
        updateTaxCards();
      });
    }

    var lvEl = $('ape-land-value');
    if (lvEl) {
      lvEl.addEventListener('input', function () {
        lvEl.dataset.userEdited = '1';
        updateTaxCards();
      });
    }

    // State change
    var stateEl = $('ape-state');
    if (stateEl) {
      stateEl.addEventListener('change', function () {
        var state = stateEl.value;
        applyStateDefaults(state);
        updateFhbInfoBox(state);
        updateWaMritRow(state);
        validateField('ape-state');
        // Refresh tax cards immediately so they stop showing the "Select a state" placeholder
        updateStampDuty();
        updateLandTax();
        triggerDebounce();
      });
    }

    // FHB checkbox
    var fhbEl = $('ape-fhb');
    if (fhbEl) {
      fhbEl.addEventListener('change', function () {
        updateFhbInfoBox(getStr('ape-state'));
        triggerDebounce();
      });
    }

    // WA metro checkbox
    var waMetroEl = $('ape-wa-metro');
    if (waMetroEl) {
      waMetroEl.addEventListener('change', function () {
        updateLandTax(); // refresh MRIT line in card immediately
        triggerDebounce();
      });
    }

    // Update loan-type hint when key inputs change
    ['ape-loan-amount', 'ape-interest-rate', 'ape-loan-term'].forEach(function (id) {
      var el = $(id);
      if (el) el.addEventListener('input', updateLoanTypeHint);
    });

    // Loan type toggle buttons
    var btnIo = $('btn-io');
    var btnPi = $('btn-pi');
    if (btnIo) {
      btnIo.addEventListener('click', function () {
        setLoanType('io');
        triggerDebounce();
      });
    }
    if (btnPi) {
      btnPi.addEventListener('click', function () {
        setLoanType('pi');
        triggerDebounce();
      });
    }

    // Property type toggle buttons
    var btnEst = $('btn-established');
    var btnNew = $('btn-newbuild');
    if (btnEst) {
      btnEst.addEventListener('click', function () {
        setPropertyType('established');
        if (lastParams) renderRegimeBanner(readParams().regime);
        triggerDebounce();
      });
    }
    if (btnNew) {
      btnNew.addEventListener('click', function () {
        setPropertyType('new_build');
        if (lastParams) renderRegimeBanner(readParams().regime);
        triggerDebounce();
      });
    }

    // Contract date input
    var contractEl = $('ape-contract-date');
    if (contractEl) {
      contractEl.addEventListener('change', function () {
        // Show the regime banner as soon as a date is entered.
        renderRegimeBanner(readParams().regime);
        triggerDebounce();
      });
    }

    // Per-field validation + debounce on all input fields
    Object.keys(validationRules).forEach(function (id) {
      var el = $(id);
      if (!el) return;
      el.addEventListener('blur', function () { validateField(id); });
      var evt = el.tagName === 'SELECT' ? 'change' : 'input';
      el.addEventListener(evt, function () { clearError(id); triggerDebounce(); });
    });

    // Additional inputs that should trigger recalc
    ['ape-vacancy', 'ape-loan-term', 'ape-council-rates', 'ape-insurance',
     'ape-maintenance', 'ape-depreciation', 'ape-marginal-tax-rate'].forEach(function (id) {
      var el = $(id);
      if (!el) return;
      var evt = el.tagName === 'SELECT' ? 'change' : 'input';
      el.addEventListener(evt, triggerDebounce);
    });

    // Rate sensitivity slider (no debounce — instant)
    var sliderEl = $('ape-rate-slider');
    if (sliderEl) {
      sliderEl.addEventListener('input', function () {
        if (lastParams) updateSensitivity(lastParams);
      });
    }

    // Form submit
    var form = $('estimator-form');
    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (!validateForm()) return;
        hasCalculatedOnce = true;
        runCalculation();
      });
    }

    // CGT collapsible
    initCgtCollapsible();

    // Header buttons
    initHeaderButtons();

    // Load from URL
    if (loadFromUrl()) {
      var state = getStr('ape-state');
      if (state) {
        applyStateDefaults(state);
        updateFhbInfoBox(state);
        updateWaMritRow(state);
      }
      updateLvr();
      renderRegimeBanner(readParams().regime);
      if (validateForm()) {
        hasCalculatedOnce = true;
        runCalculation();
      }
    }

  });

})();
