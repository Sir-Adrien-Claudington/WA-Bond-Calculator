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

  // ================================================================
  // HELPERS
  // ================================================================

  function $(id) { return document.getElementById(id); }

  function stripCommas(s) { return String(s).replace(/,/g, ''); }

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
    return {
      state:             getStr('ape-state'),
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
      cgtGrowthRate:     getNum('cgt-growth') / 100,
      cgtYears:          getNum('cgt-years') || 10,
      cgtSaleCostsPct:   getNum('cgt-sale-costs') / 100
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
    'cgt-growth', 'cgt-years', 'cgt-sale-costs'
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
    var altNg = APE_NegativeGearing.calculate(altParams);
    var cashLabel = altNg.netCashFlow < 0
      ? fmtMoney(altNg.netCashFlow) + '/yr'
      : '+' + fmtMoney(altNg.netCashFlow) + '/yr';
    previewEl.textContent = 'At ' + (sliderRate * 100).toFixed(1) + '%: ' + cashLabel;

    // Update line chart for slider (no debounce)
    if (chartInstances.line) {
      var proj = buildProjection(sliderRate, 0.03);
      var ds = chartInstances.line.data.datasets;
      ds[0].data = proj.beforeTax;
      ds[1].data = proj.afterTax;
      chartInstances.line.update('none');
    }
  }

  // ================================================================
  // 10-YEAR PROJECTION
  // ================================================================

  function buildProjection(interestRate, rentGrowthRate) {
    var loanAmount   = getNum('ape-loan-amount');
    var weeklyRent   = getNum('ape-weekly-rent');
    var vacancyWks   = getNum('ape-vacancy') || 0;
    var mgmtRate     = getNum('ape-management-fee') / 100;
    var otherExp     = getNum('ape-council-rates') + getNum('ape-insurance') + getNum('ape-maintenance');
    var depreciation = getNum('ape-depreciation');
    var taxRate      = parseFloat(getStr('ape-marginal-tax-rate')) || 0;
    var annualInterest = loanAmount * interestRate;
    var beforeTax = [], afterTax = [];
    for (var yr = 0; yr < 10; yr++) {
      var rent = weeklyRent * (52 - vacancyWks) * Math.pow(1 + rentGrowthRate, yr);
      var mgmt = rent * mgmtRate;
      var totalCosts = annualInterest + mgmt + otherExp + depreciation;
      var netPos = rent - totalCosts;
      var taxBenefit = netPos < 0 ? Math.abs(netPos) * taxRate : 0;
      beforeTax.push(Math.round(netPos));
      afterTax.push(Math.round(netPos + taxBenefit));
    }
    return { beforeTax: beforeTax, afterTax: afterTax };
  }

  function estimateBreakevenYear(params) {
    var weeklyRent   = params.weeklyRent;
    var vacancyWks   = params.vacancyWeeks || 0;
    var mgmtRate     = params.managementFeeRate;
    var otherExp     = params.councilRates + params.insurance + params.maintenance;
    var depreciation = params.depreciation;
    var annualInterest = params.loanAmount * params.interestRate;
    var rentGrowth = 0.03;
    for (var yr = 1; yr <= 20; yr++) {
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
    var price       = params.purchasePrice;
    var growthRate  = params.cgtGrowthRate || 0.05;
    var years       = params.cgtYears || 10;
    var saleCostPct = params.cgtSaleCostsPct || 0.025;
    var taxRate     = params.marginalTaxRate || 0;
    var salePrice       = price * Math.pow(1 + growthRate, years);
    var saleCosts       = salePrice * saleCostPct;
    var netProceeds     = salePrice - saleCosts;
    var capitalGain     = netProceeds - price;
    var taxableGain     = capitalGain > 0 ? capitalGain * 0.5 : capitalGain; // 50% discount (held > 12mo assumed)
    var cgtPayable      = taxableGain > 0 ? taxableGain * taxRate : 0;
    var netAfterTax     = capitalGain - cgtPayable;
    return {
      salePrice: salePrice, saleCosts: saleCosts, netProceeds: netProceeds,
      capitalGain: capitalGain, taxableGain: taxableGain,
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
    var cgt = calcCgt(params);
    var rows = [
      ['Projected sale price', fmtMoney(cgt.salePrice)],
      ['Sale costs (' + (params.cgtSaleCostsPct * 100).toFixed(1) + '%)', '−' + fmtMoney(cgt.saleCosts)],
      ['Net proceeds', fmtMoney(cgt.netProceeds)],
      ['Cost base', '−' + fmtMoney(params.purchasePrice)],
      ['Capital gain', fmtMoney(cgt.capitalGain)],
      ['50% CGT discount applied', 'Yes (held > 12 months)'],
      ['Taxable gain', fmtMoney(cgt.taxableGain)],
      ['CGT payable (' + (params.marginalTaxRate * 100).toFixed(1) + '%)', '−' + fmtMoney(cgt.cgtPayable)],
      ['Net after-tax profit', fmtMoney(cgt.netAfterTax)]
    ];
    var html = '';
    rows.forEach(function (r, i) {
      var isLast = i === rows.length - 1;
      html += '<div class="summary-row' + (isLast ? ' summary-row-total' : '') + '">' +
              '<span class="label">' + r[0] + '</span>' +
              '<span class="value">' + r[1] + '</span></div>';
    });
    resultsEl.innerHTML = html;
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

  function getOrCreateLine(projection) {
    var ctx = $('lineChart').getContext('2d');
    var textColor = chartTextColor();
    var gridColor = chartGridColor();
    var labels = ['Yr 1','Yr 2','Yr 3','Yr 4','Yr 5','Yr 6','Yr 7','Yr 8','Yr 9','Yr 10'];

    if (chartInstances.line) {
      var chart = chartInstances.line;
      chart.data.datasets[0].data = projection.beforeTax;
      chart.data.datasets[1].data = projection.afterTax;
      chart.update('none');
      return chart;
    }

    chartInstances.line = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
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
            label: 'After tax',
            data: projection.afterTax,
            borderColor: '#10b981',
            backgroundColor: 'rgba(16,185,129,0.08)',
            fill: true,
            tension: 0.3,
            pointRadius: 3,
            borderWidth: 2
          }
        ]
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
      summaryRow('Annual land tax', taxLabel) +
      '<div class="summary-row"><span class="label">Status</span><span class="value">' + statusBadge + '</span></div>';
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
    if (taxEl) {
      if (ng.taxBenefit > 0) {
        taxEl.textContent = fmtMoney(ng.taxBenefit);
        taxEl.className = 'metric-value val-positive';
      } else {
        taxEl.textContent = '$0';
        taxEl.className = 'metric-value val-neutral';
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
      if (detailEl) detailEl.textContent = fmtMoney(ng.netCashFlow) + '/yr after-tax cost';
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

  function renderDashboard(params, ng, sd, lt) {
    // Status banner
    renderStatusBanner(ng);

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
    var projection = buildProjection(params.interestRate, 0.03);
    getOrCreateLine(projection);

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

  function updateTaxCards() {
    var state = getStr('ape-state');
    if (!state) return;
    var purchasePrice = getNum('ape-purchase-price');
    var landValue     = getNum('ape-land-value');
    var isFhb         = $('ape-fhb') ? $('ape-fhb').checked : false;
    var sd = APE_StampDuty.calculate(state, purchasePrice, isFhb);
    var lt = APE_LandTax.calculate(state, landValue);
    renderStampDuty(sd, { state: state, purchasePrice: purchasePrice, landValue: landValue, isFirstHomeBuyer: isFhb });
    renderLandTax(lt,  { state: state, purchasePrice: purchasePrice, landValue: landValue, isFirstHomeBuyer: isFhb });
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
    lastParams = params;
    var ng = APE_NegativeGearing.calculate(params);

    // Patch ng with individual expense fields for donut chart
    ng = Object.assign({}, ng, {
      councilRates: params.councilRates,
      insurance:    params.insurance,
      maintenance:  params.maintenance
    });

    var sd = APE_StampDuty.calculate(params.state, params.purchasePrice, params.isFirstHomeBuyer);
    var lt = APE_LandTax.calculate(params.state, params.landValue);
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

    // CGT inputs trigger re-render
    ['cgt-growth', 'cgt-years', 'cgt-sale-costs'].forEach(function (id) {
      var el = $(id);
      if (el) {
        el.addEventListener('input', function () {
          if (!body.hidden && lastParams) renderCgtResults(lastParams);
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
        validateField('ape-state');
        updateTaxCards();
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
      }
      updateLvr();
      if (validateForm()) {
        hasCalculatedOnce = true;
        runCalculation();
      }
    }

  });

})();
