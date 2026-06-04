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

  function numVal(id) {
    var v = parseFloat($('ape-' + id).value);
    return isFinite(v) ? v : 0;
  }

  function strVal(id) {
    return $('ape-' + id).value;
  }

  function fmt(n) {
    return '$' + Math.abs(Math.round((n + Number.EPSILON) * 100) / 100)
      .toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function fmtSigned(n) {
    return (n < 0 ? '−' : '+') + fmt(n);
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

  // ---- LVR live label ------------------------------------------------

  function updateLvr() {
    var price = numVal('purchase-price');
    var loan  = numVal('loan-amount');
    var badge = $('lvr-badge');
    if (price > 0 && loan > 0) {
      var lvr = Math.round((loan / price) * 1000) / 10;
      badge.textContent = lvr.toFixed(1) + '% LVR';
      badge.hidden = false;
    } else {
      badge.hidden = true;
    }
  }

  // ---- Read form -----------------------------------------------------

  function readParams() {
    return {
      state:             strVal('state'),
      purchasePrice:     numVal('purchase-price'),
      landValue:         numVal('land-value'),
      loanAmount:        numVal('loan-amount'),
      interestRate:      numVal('interest-rate') / 100,
      weeklyRent:        numVal('weekly-rent'),
      managementFeeRate: numVal('management-fee') / 100,
      councilRates:      numVal('council-rates'),
      insurance:         numVal('insurance'),
      maintenance:       numVal('maintenance'),
      depreciation:      numVal('depreciation'),
      marginalTaxRate:   parseFloat(strVal('marginal-tax-rate')) || 0
    };
  }

  // ---- Render --------------------------------------------------------

  function renderRow(label, value, cls, indent) {
    var labelText = indent ? '    ' + label : label;
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
    var weeklyText  = isNeg
      ? fmt(ng.weeklyNetCost) + ' / week out of pocket (after tax)'
      : fmt(-ng.weeklyNetCost) + ' / week cash positive (after tax)';
    var annualText  = isNeg
      ? fmt(-ng.netCashFlow) + ' / year net cost'
      : fmt(ng.netCashFlow)  + ' / year net income';

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

    // Income
    cfTable.appendChild(renderRow('Gross rental income', fmt(ng.annualRent), 'row-income'));

    // Deductions
    cfTable.appendChild(renderRow('Interest cost', '−' + fmt(ng.interestCost), 'row-expense'));
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
    grid.appendChild(leftCol);

    // Divider on desktop
    grid.appendChild(el('div', { style: 'border-left:1px solid #e2e8f0;' }));

    // Right: upfront + annual holding
    var rightCol = el('div', { style: 'padding:24px;' });
    var rightTitle = el('h2', {}, ['Upfront & Annual Costs']);
    var holdTable = el('table', { class: 'result-table' });

    // Upfront
    var deposit = params.purchasePrice > 0
      ? Math.max(0, params.purchasePrice - params.loanAmount)
      : 0;

    holdTable.appendChild(renderRow('Upfront costs', '', ''));
    holdTable.appendChild(renderRow('Deposit (price − loan)',
      deposit > 0 ? fmt(deposit) : '—', 'row-upfront'));
    holdTable.appendChild(renderRow('Stamp duty (est.)',
      sd.value !== null ? fmt(sd.value) : 'n/a', 'row-upfront'));
    holdTable.appendChild(renderRow('Total upfront (est.)',
      (sd.value !== null && deposit > 0) ? fmt(deposit + sd.value) : '—',
      'row-total'));

    // Annual holding
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

    // ---- Rate caveats ----------------------------------------
    var caveats = [];
    if (sd.value !== null && sd.assumptions) {
      sd.assumptions.forEach(function (a) {
        if (a.indexOf('VERIFY') === 0) caveats.push(a);
      });
    }
    if (lt.value !== null && lt.assumptions) {
      lt.assumptions.forEach(function (a) {
        if (a.indexOf('VERIFY') === 0 && caveats.indexOf(a) === -1) caveats.push(a);
      });
    }

    // ---- All assumptions collapsed ---------------------------
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

    panel.hidden = false;
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ---- Init ----------------------------------------------------------

  window.addEventListener('DOMContentLoaded', function () {
    // LVR live update
    $('ape-purchase-price').addEventListener('input', updateLvr);
    $('ape-loan-amount').addEventListener('input', updateLvr);

    // Land value auto-hint from purchase price
    $('ape-purchase-price').addEventListener('input', function () {
      var lv = $('ape-land-value');
      if (!lv.dataset.userEdited) {
        var price = numVal('purchase-price');
        if (price > 0) lv.value = Math.round(price * 0.35);
        else lv.value = '';
      }
    });
    $('ape-land-value').addEventListener('input', function () {
      $('ape-land-value').dataset.userEdited = '1';
    });

    // Form submit
    $('estimator-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var params = readParams();
      if (!params.state) {
        alert('Please select a state or territory.');
        return;
      }
      var ng = APE_NegativeGearing.calculate(params);
      var sd = APE_StampDuty.calculate(params.state, params.purchasePrice);
      var lt = APE_LandTax.calculate(params.state, params.landValue);
      renderResults(params, ng, sd, lt);
    });
  });

})();
