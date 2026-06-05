/*
 * app.js — UI wiring for the Australian Property Investment Estimator.
 *
 * Reads the form, calls the three calculation modules, and renders results
 * into the DOM. No external requests. No persistence.
 */

(function () {
  'use strict';

  // ---- Helpers -------------------------------------------------------

  function $(id) { return document.getElementById(id); }

  function stripCommas(s) {
    return String(s).replace(/,/g, '');
  }

  function numVal(id) {
    var el = $(id.indexOf('ape-') === 0 ? id : 'ape-' + id);
    if (!el) return 0;
    var v = parseFloat(stripCommas(el.value));
    return isFinite(v) ? v : 0;
  }

  function rawVal(id) {
    var el = $(id.indexOf('ape-') === 0 ? id : 'ape-' + id);
    return el ? stripCommas(el.value).trim() : '';
  }

  function strVal(id) {
    var el = $(id.indexOf('ape-') === 0 ? id : 'ape-' + id);
    return el ? el.value : '';
  }

  function fmt(n) {
    return '$' + Math.abs(Math.round((n + Number.EPSILON) * 100) / 100)
      .toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function fmtSigned(n) {
    return (n < 0 ? '−' : '+') + fmt(n);
  }

  function fmtNum(n) {
    return Math.round(n).toLocaleString('en-AU');
  }

  function el(tag, props, children) {
    var node = document.createElement(tag);
    if (props) {
      Object.keys(props).forEach(function (k) {
        if (k === 'class') node.className = props[k];
        else if (k === 'html') node.innerHTML = props[k];
        else node.setAttribute(k, props[k]);
      });
    }
    if (children) {
      children.forEach(function (c) {
        if (c) node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
      });
    }
    return node;
  }

  function td(text, cls) {
    return el('td', cls ? { class: cls } : null, [text]);
  }

  // ---- Thousands-separator formatting for text inputs ----------------

  function formatCurrencyInput(inputEl) {
    var raw = stripCommas(inputEl.value);
    if (raw === '' || raw === '-') return;
    var n = parseFloat(raw);
    if (!isFinite(n)) return;
    var formatted = Math.abs(n).toLocaleString('en-AU', { maximumFractionDigits: 2 });
    if (inputEl.value !== formatted) inputEl.value = formatted;
  }

  var currencyInputIds = [
    'ape-purchase-price', 'ape-land-value', 'ape-loan-amount',
    'ape-weekly-rent', 'ape-council-rates', 'ape-insurance',
    'ape-maintenance', 'ape-depreciation'
  ];

  // ---- Validation ----------------------------------------------------

  var validationRules = {
    'ape-state': function (v) {
      if (!v || v === '') return 'Please select a state or territory.';
      return null;
    },
    'ape-purchase-price': function (v) {
      var n = parseFloat(stripCommas(v));
      if (!v || isNaN(n)) return 'Purchase price is required.';
      if (n <= 0) return 'Purchase price must be greater than zero.';
      if (n < 50000) return 'Purchase price must be at least $50,000.';
      return null;
    },
    'ape-land-value': function (v, allVals) {
      var n = parseFloat(stripCommas(v));
      if (v === '' || v === null || v === undefined) return null; // optional
      if (!isNaN(n) && n < 0) return 'Land value must be zero or more.';
      var price = parseFloat(stripCommas(allVals['ape-purchase-price']));
      if (!isNaN(n) && !isNaN(price) && price > 0 && n >= price) {
        return 'Land value must be less than the purchase price.';
      }
      return null;
    },
    'ape-loan-amount': function (v, allVals) {
      var n = parseFloat(stripCommas(v));
      if (!v || isNaN(n)) return 'Loan amount is required.';
      if (n <= 0) return 'Loan amount must be greater than zero.';
      var price = parseFloat(stripCommas(allVals['ape-purchase-price']));
      if (!isNaN(price) && price > 0 && n > price) {
        return 'Loan amount cannot exceed the purchase price.';
      }
      return null;
    },
    'ape-interest-rate': function (v) {
      var n = parseFloat(stripCommas(v));
      if (!v || isNaN(n)) return 'Interest rate is required.';
      if (n < 0.1 || n > 20) return 'Interest rate must be between 0.1% and 20%.';
      return null;
    },
    'ape-weekly-rent': function (v) {
      var n = parseFloat(stripCommas(v));
      if (!v || isNaN(n)) return 'Weekly rent is required.';
      if (n <= 0) return 'Weekly rent must be greater than zero.';
      return null;
    },
    'ape-management-fee': function (v) {
      var n = parseFloat(stripCommas(v));
      if (!v || isNaN(n)) return 'Management fee is required.';
      if (n < 0 || n > 20) return 'Management fee must be between 0% and 20%.';
      return null;
    },
    'ape-council-rates': function (v) {
      var n = parseFloat(stripCommas(v));
      if (isNaN(n)) return null; // optional, but if present must be >= 0
      if (n < 0) return 'Council rates must be zero or more.';
      return null;
    },
    'ape-insurance': function (v) {
      var n = parseFloat(stripCommas(v));
      if (isNaN(n)) return null;
      if (n < 0) return 'Insurance must be zero or more.';
      return null;
    },
    'ape-maintenance': function (v) {
      var n = parseFloat(stripCommas(v));
      if (isNaN(n)) return null;
      if (n < 0) return 'Maintenance must be zero or more.';
      return null;
    },
    'ape-depreciation': function (v) {
      var n = parseFloat(stripCommas(v));
      if (isNaN(n)) return null;
      if (n < 0) return 'Depreciation must be zero or more.';
      return null;
    }
  };

  function getFieldValue(id) {
    var el = $(id);
    return el ? el.value : '';
  }

  function getAllFieldValues() {
    var vals = {};
    Object.keys(validationRules).forEach(function (id) {
      vals[id] = getFieldValue(id);
    });
    return vals;
  }

  function showError(fieldId, msg) {
    var errId = 'err-' + fieldId.replace('ape-', '');
    var errEl = $(errId);
    var inputEl = $(fieldId);
    if (errEl) {
      errEl.textContent = msg;
      errEl.hidden = false;
    }
    if (inputEl) inputEl.classList.add('input-error');
  }

  function clearError(fieldId) {
    var errId = 'err-' + fieldId.replace('ape-', '');
    var errEl = $(errId);
    var inputEl = $(fieldId);
    if (errEl) {
      errEl.textContent = '';
      errEl.hidden = true;
    }
    if (inputEl) inputEl.classList.remove('input-error');
  }

  function validateForm() {
    var allVals = getAllFieldValues();
    var valid = true;
    Object.keys(validationRules).forEach(function (id) {
      var msg = validationRules[id](allVals[id], allVals);
      if (msg) {
        showError(id, msg);
        valid = false;
      } else {
        clearError(id);
      }
    });
    return valid;
  }

  function validateField(fieldId) {
    var rule = validationRules[fieldId];
    if (!rule) return;
    var allVals = getAllFieldValues();
    var msg = rule(allVals[fieldId], allVals);
    if (msg) {
      showError(fieldId, msg);
    } else {
      clearError(fieldId);
    }
  }

  // ---- LVR live label ------------------------------------------------

  function updateLvr() {
    var price = numVal('ape-purchase-price');
    var loan  = numVal('ape-loan-amount');
    var badge = $('lvr-badge');
    if (price > 0 && loan > 0) {
      var lvr = Math.round((loan / price) * 1000) / 10;
      badge.textContent = lvr.toFixed(1) + '% LVR';
      badge.hidden = false;
    } else {
      badge.hidden = true;
    }
  }

  // ---- State defaults ------------------------------------------------

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

  function updateStateDefaults(state) {
    var d = stateDefaults[state];
    if (!d) return;

    var mgmtEl = $('ape-management-fee');
    var councilEl = $('ape-council-rates');
    var insuranceEl = $('ape-insurance');
    var landHint = $('land-value-hint');

    if (mgmtEl && !mgmtEl.dataset.userEdited) {
      mgmtEl.placeholder = d.managementFee.toString();
    }
    if (councilEl && !councilEl.dataset.userEdited) {
      councilEl.placeholder = d.councilRates.toLocaleString('en-AU');
    }
    if (insuranceEl && !insuranceEl.dataset.userEdited) {
      insuranceEl.placeholder = d.insurance.toLocaleString('en-AU');
    }
    if (landHint) {
      landHint.textContent = 'Used for land tax. Typically ' + d.landValuePct + ' of purchase price in ' + state + '. ' +
        'Varies widely by location — inner-city land can be 60–80% of purchase price; regional properties are often 20–30%. ' +
        'The most accurate source is your council rates notice or a registered valuer.';
    }
  }

  function updateFhbInfoBox(state) {
    var isFhb = $('ape-fhb').checked;
    var box = $('fhb-info-box');
    if (!isFhb || !state) { box.hidden = true; return; }
    var c = fhbConcessions[state];
    if (!c) { box.hidden = true; return; }

    while (box.firstChild) box.removeChild(box.firstChild);

    function addLine(boldText, restText) {
      var p = document.createElement('p');
      p.style.margin = '2px 0';
      if (boldText) {
        var strong = document.createElement('strong');
        strong.textContent = boldText;
        p.appendChild(strong);
      }
      p.appendChild(document.createTextNode(restText));
      box.appendChild(p);
    }

    if (c.grantAmount > 0) {
      addLine('First Home Owner Grant (FHOG): ', fmt(c.grantAmount) + ' (eligibility criteria apply).');
    }
    if (c.fullyExemptThreshold !== null) {
      addLine('Full stamp duty exemption ', 'for purchase prices up to ' + fmt(c.fullyExemptThreshold) + '.');
    }
    if (c.stampDutyThreshold !== null && c.fullyExemptThreshold !== null) {
      addLine('Partial concession ', 'for purchase prices between ' + fmt(c.fullyExemptThreshold) + ' and ' + fmt(c.stampDutyThreshold) + '.');
    } else if (c.stampDutyThreshold !== null) {
      addLine('Stamp duty concession ', 'available up to ' + fmt(c.stampDutyThreshold) + '.');
    }
    if (!box.firstChild) {
      addLine('', 'No specific stamp duty concession in this state, but a FHOG may apply. Check with your state revenue office.');
    }
    addLine('', 'Eligibility criteria apply. Always confirm with your state revenue office.');

    box.hidden = false;
  }

  // ---- Read form -----------------------------------------------------

  function readParams() {
    var loanTypeEl = document.querySelector('input[name="loan-type"]:checked');
    var loanType = loanTypeEl ? loanTypeEl.value : 'io';
    return {
      state:             strVal('ape-state'),
      purchasePrice:     numVal('ape-purchase-price'),
      landValue:         numVal('ape-land-value'),
      loanAmount:        numVal('ape-loan-amount'),
      interestRate:      numVal('ape-interest-rate') / 100,
      weeklyRent:        numVal('ape-weekly-rent'),
      vacancyWeeks:      numVal('ape-vacancy'),
      managementFeeRate: numVal('ape-management-fee') / 100,
      councilRates:      numVal('ape-council-rates'),
      insurance:         numVal('ape-insurance'),
      maintenance:       numVal('ape-maintenance'),
      depreciation:      numVal('ape-depreciation'),
      marginalTaxRate:   parseFloat(strVal('ape-marginal-tax-rate')) || 0,
      loanType:          loanType,
      loanTermYears:     numVal('ape-loan-term') || 30,
      isFirstHomeBuyer:  $('ape-fhb').checked,
      cgtGrowthRate:     numVal('ape-cgt-growth') / 100,
      cgtYears:          numVal('ape-cgt-years') || 10,
      cgtSaleCostsPct:   numVal('ape-cgt-sale-costs') / 100
    };
  }

  // ---- URL sharing ---------------------------------------------------

  var urlParamFields = [
    'ape-state', 'ape-purchase-price', 'ape-land-value', 'ape-loan-amount',
    'ape-interest-rate', 'ape-weekly-rent', 'ape-vacancy', 'ape-management-fee',
    'ape-council-rates', 'ape-insurance', 'ape-maintenance', 'ape-depreciation',
    'ape-marginal-tax-rate', 'ape-loan-term', 'ape-cgt-growth', 'ape-cgt-years',
    'ape-cgt-sale-costs'
  ];

  function encodeToUrl(params) {
    var q = new URLSearchParams();
    urlParamFields.forEach(function (id) {
      var e = $(id);
      if (e && e.value) q.set(id, e.value);
    });
    // Include loan-type and fhb
    var ltEl = document.querySelector('input[name="loan-type"]:checked');
    if (ltEl) q.set('loan-type', ltEl.value);
    if ($('ape-fhb').checked) q.set('ape-fhb', '1');
    window.history.pushState(null, '', '?' + q.toString());
  }

  function loadFromUrl() {
    var q = new URLSearchParams(window.location.search);
    if (!q.toString()) return false;
    var hasAny = false;
    urlParamFields.forEach(function (id) {
      if (q.has(id)) {
        var e = $(id);
        if (e) { e.value = q.get(id); hasAny = true; }
      }
    });
    if (q.has('loan-type')) {
      var ltVal = q.get('loan-type');
      if (ltVal === 'io' || ltVal === 'pi') {
        var ltEl = document.querySelector('input[name="loan-type"][value="' + ltVal + '"]');
        if (ltEl) ltEl.checked = true;
      }
      toggleLoanType();
    }
    if (q.has('ape-fhb') && q.get('ape-fhb') === '1') {
      $('ape-fhb').checked = true;
    }
    return hasAny;
  }

  // ---- SVG bar chart -------------------------------------------------

  function buildBarChart(ng, isFhb) {
    var items = [
      { label: 'Gross Rent',      value: ng.annualRent,      color: '#0d9488' },
      { label: 'Loan Interest',   value: ng.interestCost,    color: '#dc2626' },
      { label: 'Mgmt Fees',       value: ng.managementFees,  color: '#d97706' },
      { label: 'Rates/Ins/Maint', value: ng.otherExpenses,   color: '#ea580c' },
      { label: 'Depreciation',    value: ng.depreciation,    color: '#94a3b8' },
      { label: 'Net Position',    value: Math.abs(ng.netRentalIncome), color: '#7c3aed', signed: ng.netRentalIncome },
      { label: 'Tax Benefit',     value: ng.taxBenefit,      color: '#16a34a' }
    ].filter(function (item) { return item.value > 0; });

    if (!items.length) return null;

    var maxVal = Math.max.apply(null, items.map(function (i) { return i.value; }));
    var barH = 22;
    var gap = 8;
    var labelW = 110;
    var valueW = 90;
    var barMaxW = 320;
    var chartW = labelW + barMaxW + valueW + 20;
    var chartH = items.length * (barH + gap) + 10;

    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 ' + chartW + ' ' + chartH);
    svg.setAttribute('class', 'bar-chart-svg');
    svg.setAttribute('aria-hidden', 'true');

    items.forEach(function (item, i) {
      var y = i * (barH + gap);
      var barW = maxVal > 0 ? Math.max(2, (item.value / maxVal) * barMaxW) : 2;

      var labelEl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      labelEl.setAttribute('x', labelW - 6);
      labelEl.setAttribute('y', y + barH / 2 + 5);
      labelEl.setAttribute('text-anchor', 'end');
      labelEl.setAttribute('font-size', '11');
      labelEl.setAttribute('fill', '#64748b');
      labelEl.textContent = item.label;
      svg.appendChild(labelEl);

      var rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', labelW);
      rect.setAttribute('y', y);
      rect.setAttribute('width', barW);
      rect.setAttribute('height', barH);
      rect.setAttribute('fill', item.color);
      rect.setAttribute('rx', '3');
      svg.appendChild(rect);

      var valEl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      valEl.setAttribute('x', labelW + barW + 6);
      valEl.setAttribute('y', y + barH / 2 + 5);
      valEl.setAttribute('font-size', '11');
      valEl.setAttribute('fill', '#1e293b');
      var displayVal = item.signed !== undefined
        ? (item.signed < 0 ? '−' : '+') + fmt(Math.abs(item.signed))
        : fmt(item.value);
      valEl.textContent = displayVal;
      svg.appendChild(valEl);
    });

    return svg;
  }

  // ---- Break-even projection -----------------------------------------

  function buildBreakevenTable(params, ng) {
    var weeklyRent = params.weeklyRent;
    var vacancyWeeks = params.vacancyWeeks || 0;
    var initialAnnualRent = weeklyRent * (52 - vacancyWeeks);

    // Growth rate input
    var growthInputId = 'ape-breakeven-growth';

    var wrapper = el('div', { class: 'breakeven-card card' });
    var title = el('h2', {}, ['Break-Even Projection']);

    var rentInputRow = el('div', { class: 'breakeven-rent-input' });
    rentInputRow.appendChild(document.createTextNode('Assumed annual rent growth: '));
    var growthInput = el('input', {
      type: 'text',
      id: growthInputId,
      value: '3',
      inputmode: 'decimal',
      autocomplete: 'off'
    });
    rentInputRow.appendChild(growthInput);
    rentInputRow.appendChild(document.createTextNode(' %'));

    var tableContainer = el('div', { class: 'breakeven-table-wrap' });

    function rebuildTable() {
      tableContainer.innerHTML = '';
      var growthRate = parseFloat(growthInput.value) / 100;
      if (!isFinite(growthRate)) growthRate = 0.03;

      // Annual fixed costs (non-interest expenses that don't change with rent)
      var fixedCosts = ng.interestCost + ng.otherExpenses;
      var mgmtRate = params.managementFeeRate;

      var beYear = null;
      var rows = [];
      var cumTaxBenefit = 0;

      for (var yr = 1; yr <= 15; yr++) {
        var annualRent = initialAnnualRent * Math.pow(1 + growthRate, yr - 1);
        var mgmtFees = annualRent * mgmtRate;
        var totalCosts = fixedCosts + mgmtFees + ng.depreciation;
        var netPos = annualRent - totalCosts;
        var isPositive = netPos >= 0;
        var taxBen = isPositive ? 0 : (-netPos) * params.marginalTaxRate;
        cumTaxBenefit += taxBen;

        if (beYear === null && isPositive) beYear = yr;

        rows.push({
          yr: yr,
          annualRent: annualRent,
          totalCosts: totalCosts,
          netPos: netPos,
          cumTaxBenefit: cumTaxBenefit,
          isPositive: isPositive
        });
      }

      var statusEl = el('p', { class: 'breakeven-status' + (ng.gearingStatus === 'positive' ? ' positive-status' : '') });
      if (ng.gearingStatus === 'positive') {
        statusEl.textContent = 'Currently positively geared.';
      } else if (beYear !== null) {
        statusEl.textContent = 'Estimated break-even: Year ' + beYear + ' (at ' + (growthRate * 100).toFixed(1) + '% annual rent growth).';
      } else {
        statusEl.textContent = '> 15 years to positive gearing at ' + (growthRate * 100).toFixed(1) + '% rent growth.';
      }

      var table = el('table', { class: 'breakeven-table' });
      var thead = el('tr', {}, [
        el('th', {}, ['Year']),
        el('th', {}, ['Annual Rent']),
        el('th', {}, ['Annual Costs']),
        el('th', {}, ['Net Position']),
        el('th', {}, ['Cum. Tax Benefit'])
      ]);
      table.appendChild(thead);

      rows.forEach(function (r) {
        var cls = '';
        if (r.yr === beYear) cls = 'be-breakeven';
        else if (r.isPositive) cls = 'be-positive';
        else cls = 'be-negative';
        var row = el('tr', { class: cls }, [
          td(String(r.yr)),
          td(fmt(r.annualRent)),
          td(fmt(r.totalCosts)),
          td((r.netPos >= 0 ? '+' : '−') + fmt(Math.abs(r.netPos))),
          td(fmt(r.cumTaxBenefit))
        ]);
        table.appendChild(row);
      });

      tableContainer.appendChild(statusEl);
      tableContainer.appendChild(table);
    }

    rebuildTable();
    growthInput.addEventListener('input', rebuildTable);

    wrapper.appendChild(title);
    wrapper.appendChild(rentInputRow);
    wrapper.appendChild(tableContainer);
    return wrapper;
  }

  // ---- CGT calculation -----------------------------------------------

  function calcCgt(params) {
    var price = params.purchasePrice;
    var growthRate = params.cgtGrowthRate || 0.05;
    var years = params.cgtYears || 10;
    var saleCostsPct = params.cgtSaleCostsPct || 0.025;
    var taxRate = params.marginalTaxRate || 0;

    var salePrice = price * Math.pow(1 + growthRate, years);
    var saleCosts = salePrice * saleCostsPct;
    var netSaleProceeds = salePrice - saleCosts;
    var capitalGain = netSaleProceeds - price;
    var taxableGain = capitalGain > 0 ? (years >= 1 ? capitalGain * 0.5 : capitalGain) : capitalGain;
    var cgtPayable = taxableGain > 0 ? taxableGain * taxRate : 0;
    var netAfterTaxProfit = capitalGain - cgtPayable;

    return {
      salePrice: salePrice,
      saleCosts: saleCosts,
      netSaleProceeds: netSaleProceeds,
      capitalGain: capitalGain,
      taxableGain: taxableGain,
      cgtPayable: cgtPayable,
      netAfterTaxProfit: netAfterTaxProfit,
      years: years,
      discount50pct: years >= 1
    };
  }

  function buildCgtSection(params) {
    if (!params.purchasePrice || !$('cgt-section').open) return null;

    var cgt = calcCgt(params);

    var wrapper = el('div', { class: 'cgt-result-card card' });
    wrapper.appendChild(el('h2', {}, ['CGT Projection (' + cgt.years + ' years)']));

    var table = el('table', { class: 'result-table' });
    var rows = [
      ['Projected sale price', fmt(cgt.salePrice)],
      ['Sale costs (' + (params.cgtSaleCostsPct * 100).toFixed(1) + '%)', '−' + fmt(cgt.saleCosts)],
      ['Net sale proceeds', fmt(cgt.netSaleProceeds)],
      ['Cost base (purchase price)', '−' + fmt(params.purchasePrice)],
      ['Capital gain', fmt(cgt.capitalGain)],
      ['50% CGT discount (held > 12 months)', cgt.discount50pct ? '50% applied' : 'Not applicable'],
      ['Taxable gain', fmt(cgt.taxableGain)],
      ['CGT payable (' + (params.marginalTaxRate * 100).toFixed(1) + '% marginal rate)', '−' + fmt(cgt.cgtPayable)],
      ['Net after-tax profit', fmt(cgt.netAfterTaxProfit)]
    ];

    rows.forEach(function (r, i) {
      var cls = i === rows.length - 1 ? 'row-total' : '';
      table.appendChild(el('tr', { class: cls }, [td(r[0]), td(r[1])]));
    });

    wrapper.appendChild(table);
    wrapper.appendChild(el('p', { class: 'cgt-disclaimer' }, [
      'CGT estimate is indicative only. Actual liability depends on your complete tax position, any cost base adjustments, and other CGT events. Consult a registered tax agent.'
    ]));
    return wrapper;
  }

  // ---- Render --------------------------------------------------------

  function renderRow(label, value, cls, indent) {
    var labelText = indent ? '    ' + label : label;
    return el('tr', { class: cls || '' }, [
      td(labelText),
      td(value, 'num')
    ]);
  }

  function renderResults(params, ng, sd, lt) {
    var panel = $('results');
    panel.innerHTML = '';

    // ---- Verdict card ----------------------------------------
    var isNeg = ng.gearingStatus === 'negative';
    var isPos = ng.gearingStatus === 'positive';
    var statusLabel = isNeg ? 'Negatively Geared' : (isPos ? 'Positively Geared' : 'Neutrally Geared');

    var verdict = el('div', { class: 'verdict-card ' + ng.gearingStatus }, [
      el('div', { class: 'verdict-badge' }, [statusLabel]),
      el('div', { class: 'verdict-headline' }, [
        isNeg ? '−' + fmt(ng.weeklyNetCost) : '+' + fmt(-ng.weeklyNetCost)
      ]),
      el('div', { class: 'verdict-subline' }, ['per week net of tax benefit']),
      el('div', { class: 'verdict-meta' }, [
        el('div', { class: 'verdict-meta-item' }, [
          el('div', { class: 'vmi-label' }, ['Annual rent']),
          el('div', { class: 'vmi-value' }, [fmt(ng.annualRent)])
        ]),
        el('div', { class: 'verdict-meta-item' }, [
          el('div', { class: 'vmi-label' }, ['Annual deductions']),
          el('div', { class: 'vmi-value' }, [fmt(ng.totalDeductions)])
        ]),
        el('div', { class: 'verdict-meta-item' }, [
          el('div', { class: 'vmi-label' }, [isNeg ? 'Tax saving' : 'Net income']),
          el('div', { class: 'vmi-value' }, [isNeg ? fmt(ng.taxBenefit) : fmt(ng.netCashFlow)])
        ])
      ])
    ]);
    panel.appendChild(verdict);

    // ---- Results grid ----------------------------------------
    var grid = el('div', { class: 'results-grid card', style: 'margin-top:20px; padding:0; overflow:hidden;' });

    // Left: annual cash flow
    var leftCol = el('div', { style: 'padding:24px;' });
    var leftTitle = el('h2', {}, ['Annual Cash Flow']);
    var cfTable = el('table', { class: 'result-table' });

    cfTable.appendChild(renderRow('Gross rental income', fmt(ng.annualRent), 'row-income'));

    if (ng.loanType === 'pi' && ng.monthlyRepayment > 0) {
      cfTable.appendChild(renderRow('Total P&I repayment (annual)', '−' + fmt(ng.monthlyRepayment * 12), 'row-expense'));
      cfTable.appendChild(renderRow('  of which: interest (deductible)', '−' + fmt(ng.interestCost), 'row-expense'));
      var principal = ng.monthlyRepayment * 12 - ng.interestCost;
      cfTable.appendChild(renderRow('  of which: principal (not deductible)', '−' + fmt(principal), 'row-expense'));
    } else {
      cfTable.appendChild(renderRow('Interest cost', '−' + fmt(ng.interestCost), 'row-expense'));
    }
    cfTable.appendChild(renderRow('Management fees', '−' + fmt(ng.managementFees), 'row-expense'));
    cfTable.appendChild(renderRow('Council, insurance & maintenance', '−' + fmt(ng.otherExpenses), 'row-expense'));
    if (ng.depreciation > 0) {
      cfTable.appendChild(renderRow('Depreciation', '−' + fmt(ng.depreciation), 'row-expense'));
    }
    cfTable.appendChild(renderRow(
      isNeg ? 'Net rental loss (before tax)' : 'Net rental income (before tax)',
      (isNeg ? '−' : '+') + fmt(Math.abs(ng.netRentalIncome)),
      'row-total'
    ));
    if (isNeg && params.marginalTaxRate > 0) {
      cfTable.appendChild(renderRow('Tax saving', '+' + fmt(ng.taxBenefit), 'row-saving'));
    }
    cfTable.appendChild(renderRow(
      isNeg ? 'Net annual cost (after tax)' : 'Net annual surplus (after tax)',
      (isNeg ? '−' : '+') + fmt(Math.abs(ng.netCashFlow)),
      isNeg ? 'row-net-neg row-total' : 'row-net-pos row-total'
    ));

    leftCol.appendChild(leftTitle);
    leftCol.appendChild(cfTable);
    if (ng.loanType === 'pi') {
      leftCol.appendChild(el('p', { class: 'pi-notice' }, [
        'P&I loan: only the interest portion (' + fmt(ng.interestCost) + '/yr) is tax-deductible. Principal repayments are not.'
      ]));
    }
    grid.appendChild(leftCol);

    // Divider on desktop
    grid.appendChild(el('div', { style: 'border-left:1px solid #e2e8f0;' }));

    // Right: upfront + annual holding
    var rightCol = el('div', { style: 'padding:24px;' });
    var rightTitle = el('h2', {}, ['Upfront & Annual Costs']);
    var holdTable = el('table', { class: 'result-table' });

    var deposit = params.purchasePrice > 0
      ? Math.max(0, params.purchasePrice - params.loanAmount)
      : 0;

    holdTable.appendChild(renderRow('Upfront costs', '', ''));
    holdTable.appendChild(renderRow('Deposit (price − loan)',
      deposit > 0 ? fmt(deposit) : '—', 'row-upfront'));
    holdTable.appendChild(renderRow('Stamp duty (est.)',
      sd.value !== null ? fmt(sd.value) : 'n/a', 'row-upfront'));

    if (params.isFirstHomeBuyer && sd.fhogAmount && sd.fhogAmount > 0) {
      holdTable.appendChild(renderRow('First Home Owner Grant',
        '+' + fmt(sd.fhogAmount), 'row-upfront row-saving'));
    }

    var totalUpfront = (sd.value !== null && deposit > 0)
      ? deposit + sd.value - (params.isFirstHomeBuyer && sd.fhogAmount ? sd.fhogAmount : 0)
      : null;
    holdTable.appendChild(renderRow('Total upfront (est.)',
      totalUpfront !== null ? fmt(totalUpfront) : '—',
      'row-total'));

    holdTable.appendChild(el('tr', { style: 'height:14px' }));
    holdTable.appendChild(renderRow('Annual holding costs', '', ''));
    holdTable.appendChild(renderRow('Land tax (est.)',
      (lt.value !== null && lt.value > 0) ? fmt(lt.value)
        : (lt.value === 0 ? '$0.00 (below threshold)' : 'n/a'),
      'row-upfront'));
    holdTable.appendChild(renderRow(
      isNeg ? 'Net cash cost' : 'Net cash surplus',
      (isNeg ? '−' : '+') + fmt(Math.abs(ng.netCashFlow)),
      isNeg ? 'row-net-neg row-total' : 'row-net-pos row-total'
    ));

    rightCol.appendChild(rightTitle);
    rightCol.appendChild(holdTable);
    grid.appendChild(rightCol);

    panel.appendChild(grid);

    // ---- Bar chart -------------------------------------------
    var chartSvg = buildBarChart(ng, params.isFirstHomeBuyer);
    if (chartSvg) {
      var chartCard = el('div', { class: 'chart-card card' });
      chartCard.appendChild(el('h2', {}, ['Income vs. Expenses']));
      chartCard.appendChild(chartSvg);
      panel.appendChild(chartCard);
    }

    // ---- Break-even table ------------------------------------
    panel.appendChild(buildBreakevenTable(params, ng));

    // ---- CGT section -----------------------------------------
    var cgtCard = buildCgtSection(params);
    if (cgtCard) panel.appendChild(cgtCard);

    // ---- Rate caveats ----------------------------------------
    var allAssumptions = [];
    if (ng.assumptions) ng.assumptions.forEach(function (a) { allAssumptions.push(a); });
    if (sd.assumptions) sd.assumptions.forEach(function (a) {
      if (a.indexOf('VERIFY') !== 0) allAssumptions.push(a);
    });
    if (lt.assumptions) lt.assumptions.forEach(function (a) {
      if (a.indexOf('VERIFY') !== 0 && allAssumptions.indexOf(a) === -1) allAssumptions.push(a);
    });

    var detailsEl = el('details', { class: 'assumptions-toggle' });
    var sumEl = el('summary', {}, ['Assumptions & limitations (' + allAssumptions.length + ')']);
    var ul = el('ul', { class: 'assumptions-list' });
    allAssumptions.forEach(function (a) {
      ul.appendChild(el('li', {}, [a]));
    });
    detailsEl.appendChild(sumEl);
    detailsEl.appendChild(ul);
    panel.appendChild(detailsEl);

    // ---- Disclaimer ------------------------------------------
    panel.appendChild(el('p', { class: 'disclaimer' }, [
      'This tool provides estimates only and is not financial, tax, or legal advice. ' +
      'Stamp duty and land tax rates are approximations based on publicly available schedules ' +
      'and may not reflect recent legislative changes. Always verify figures with the relevant ' +
      'state revenue office and consult a licensed accountant or financial adviser before making ' +
      'investment decisions. Rate tables are marked VERIFY where not yet confirmed against ' +
      'current official sources.'
    ]));

    // ---- Print button ----------------------------------------
    var printBtn = el('button', { type: 'button', class: 'btn-print' }, ['Print Summary']);
    printBtn.addEventListener('click', function () { window.print(); });
    panel.appendChild(printBtn);

    panel.hidden = false;
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ---- Sensitivity slider --------------------------------------------

  function updateSensitivity(params) {
    var sliderEl = $('ape-rate-slider');
    var previewEl = $('sensitivity-preview');
    if (!sliderEl || !previewEl) return;

    var baseRate = params.interestRate;
    var sliderRate = parseFloat(sliderEl.value) / 100;
    if (!isFinite(sliderRate)) return;

    var altParams = {};
    Object.keys(params).forEach(function (k) { altParams[k] = params[k]; });
    altParams.interestRate = sliderRate;

    var altNg = APE_NegativeGearing.calculate(altParams);
    var rateLabel = (sliderRate * 100).toFixed(1);
    var cashLabel = altNg.gearingStatus === 'negative'
      ? '−' + fmt(Math.abs(altNg.netCashFlow)) + '/yr'
      : '+' + fmt(altNg.netCashFlow) + '/yr';
    previewEl.textContent = 'At ' + rateLabel + '%: ' + cashLabel + ' cash position';
  }

  // ---- Loan type toggle -----------------------------------------------

  function toggleLoanType() {
    var loanTypeEl = document.querySelector('input[name="loan-type"]:checked');
    var loanType = loanTypeEl ? loanTypeEl.value : 'io';
    var piField = $('pi-loan-term-field');
    var ioHint = $('io-hint');
    var piHint = $('pi-hint');
    if (piField) piField.hidden = loanType !== 'pi';
    if (ioHint) ioHint.hidden = loanType !== 'io';
    if (piHint) piHint.hidden = loanType !== 'pi';
  }

  // ---- Debounced recalc -----------------------------------------------

  var hasCalculatedOnce = false;
  var debounceTimer = null;

  function triggerDebounceRecalc() {
    if (!hasCalculatedOnce) return;
    var updEl = $('updating-indicator');
    if (updEl) updEl.hidden = false;
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(function () {
      if (updEl) updEl.hidden = true;
      runCalculation();
    }, 300);
  }

  function runCalculation() {
    if (!validateForm()) return;
    var params = readParams();
    var ng = APE_NegativeGearing.calculate(params);
    var sd = APE_StampDuty.calculate(params.state, params.purchasePrice, params.isFirstHomeBuyer);
    var lt = APE_LandTax.calculate(params.state, params.landValue);
    renderResults(params, ng, sd, lt);
    encodeToUrl(params);
    // Show/update sensitivity slider
    var wrapEl = $('sensitivity-wrap');
    if (wrapEl) {
      wrapEl.hidden = false;
      var sliderEl = $('ape-rate-slider');
      if (sliderEl) {
        var rate = params.interestRate * 100;
        sliderEl.min = Math.max(0.5, rate - 2).toFixed(1);
        sliderEl.max = Math.min(15, rate + 3).toFixed(1);
        sliderEl.value = rate.toFixed(1);
        updateSensitivity(params);
      }
    }
    hasCalculatedOnce = true;
  }

  // ---- Init ----------------------------------------------------------

  window.addEventListener('DOMContentLoaded', function () {

    // Currency input formatting
    currencyInputIds.forEach(function (id) {
      var inputEl = $(id);
      if (!inputEl) return;
      inputEl.addEventListener('blur', function () { formatCurrencyInput(inputEl); });
    });

    // Mark user-edited fields
    ['ape-management-fee', 'ape-council-rates', 'ape-insurance', 'ape-maintenance', 'ape-depreciation'].forEach(function (id) {
      var e = $(id);
      if (e) e.addEventListener('input', function () { e.dataset.userEdited = '1'; });
    });

    // LVR live update
    $('ape-purchase-price').addEventListener('input', updateLvr);
    $('ape-loan-amount').addEventListener('input', updateLvr);

    // Land value auto-hint from purchase price
    $('ape-purchase-price').addEventListener('input', function () {
      var lv = $('ape-land-value');
      if (!lv.dataset.userEdited) {
        var price = numVal('ape-purchase-price');
        if (price > 0) lv.value = fmtNum(Math.round(price * 0.35));
        else lv.value = '';
      }
    });
    $('ape-land-value').addEventListener('input', function () {
      $('ape-land-value').dataset.userEdited = '1';
    });

    // State change: update defaults and FHB box
    $('ape-state').addEventListener('change', function () {
      var state = strVal('ape-state');
      updateStateDefaults(state);
      updateFhbInfoBox(state);
      validateField('ape-state');
      triggerDebounceRecalc();
    });

    // FHB checkbox
    $('ape-fhb').addEventListener('change', function () {
      updateFhbInfoBox(strVal('ape-state'));
      triggerDebounceRecalc();
    });

    // Loan type toggle
    document.querySelectorAll('input[name="loan-type"]').forEach(function (radio) {
      radio.addEventListener('change', function () {
        toggleLoanType();
        triggerDebounceRecalc();
      });
    });
    toggleLoanType();

    // Per-field validation on blur + debounce recalc on input
    Object.keys(validationRules).forEach(function (id) {
      var inputEl = $(id);
      if (!inputEl) return;
      inputEl.addEventListener('blur', function () { validateField(id); });
      var eventType = inputEl.tagName === 'SELECT' ? 'change' : 'input';
      inputEl.addEventListener(eventType, function () {
        clearError(id);
        triggerDebounceRecalc();
      });
    });

    // Sensitivity slider
    var sliderEl = $('ape-rate-slider');
    if (sliderEl) {
      sliderEl.addEventListener('input', function () {
        var params = readParams();
        updateSensitivity(params);
      });
    }

    // CGT section toggle
    var cgtSection = $('cgt-section');
    if (cgtSection) {
      cgtSection.addEventListener('toggle', function () {
        triggerDebounceRecalc();
      });
    }

    // Form submit
    $('estimator-form').addEventListener('submit', function (e) {
      e.preventDefault();
      if (!validateForm()) return;
      hasCalculatedOnce = true;
      runCalculation();
      // Show estimate notice
      var noticeEl = $('results-estimate-notice');
      if (noticeEl) noticeEl.hidden = false;
    });

    // Load from URL if params present
    if (loadFromUrl()) {
      var state = strVal('ape-state');
      if (state) {
        updateStateDefaults(state);
        updateFhbInfoBox(state);
      }
      updateLvr();
      if (validateForm()) {
        hasCalculatedOnce = true;
        runCalculation();
        var noticeEl = $('results-estimate-notice');
        if (noticeEl) noticeEl.hidden = false;
      }
    }

  });

})();
