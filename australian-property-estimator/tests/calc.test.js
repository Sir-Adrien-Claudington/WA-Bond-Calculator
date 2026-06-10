/**
 * Unit tests for the three pure calculation modules.
 * No framework required — run with: node tests/calc.test.js
 */
'use strict';

const assert = require('assert');
const vm = require('vm');
const fs = require('fs');
const path = require('path');

// Boot the modules exactly as the browser does: set window = global, then
// execute each file in this context so their var declarations become globals.
global.window = global;
const root = path.join(__dirname, '..');

function load(rel) {
  vm.runInThisContext(fs.readFileSync(path.join(root, rel), 'utf8'), { filename: rel });
}

load('data/stamp-duty-rates.js');
load('data/land-tax-rates.js');
load('modules/stamp-duty.js');
load('modules/land-tax.js');
load('modules/negative-gearing.js');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (e) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${e.message}`);
    failed++;
  }
}

// ---------------------------------------------------------------------------
// stamp-duty
// ---------------------------------------------------------------------------
console.log('\nstamp-duty');

test('NSW: $500,000 returns a positive duty value', () => {
  const r = APE_StampDuty.calculate('NSW', 500000, false);
  assert.strictEqual(r.type, 'objective');
  assert.ok(r.value > 0, `expected value > 0, got ${r.value}`);
});

test('NSW FHB: $600,000 → full exemption (≤ $650,000 threshold)', () => {
  const r = APE_StampDuty.calculate('NSW', 600000, true);
  assert.strictEqual(r.value, 0, `expected 0, got ${r.value}`);
});

test('NSW FHB: $700,000 → partial concession (between $650k and $800k)', () => {
  const full = APE_StampDuty.calculate('NSW', 700000, false);
  const fhb  = APE_StampDuty.calculate('NSW', 700000, true);
  assert.ok(fhb.value < full.value, 'FHB duty should be less than standard duty');
  assert.ok(fhb.value > 0, 'FHB partial concession should still produce some duty');
});

test('NSW FHB: $900,000 → no concession (above $800,000 threshold)', () => {
  const full = APE_StampDuty.calculate('NSW', 900000, false);
  const fhb  = APE_StampDuty.calculate('NSW', 900000, true);
  assert.strictEqual(fhb.value, full.value, 'no concession above threshold');
});

test('QLD FHB: $450,000 → full exemption (≤ $500,000 threshold)', () => {
  const r = APE_StampDuty.calculate('QLD', 450000, true);
  assert.strictEqual(r.value, 0, `expected 0, got ${r.value}`);
});

test('NT: $524,999 uses quadratic formula (below $525k boundary)', () => {
  const r = APE_StampDuty.calculate('NT', 524999, false);
  assert.ok(r.value > 0);
  assert.ok(r.breakdown.some(l => l.includes('quadratic')), 'should mention quadratic formula');
});

test('NT: $525,001 uses bracket table (above $525k boundary)', () => {
  const below = APE_StampDuty.calculate('NT', 524999, false);
  const above = APE_StampDuty.calculate('NT', 525001, false);
  // Both should produce a positive result and be very close
  assert.ok(above.value > 0);
  assert.ok(Math.abs(above.value - below.value) < 5000, 'values should be close at boundary');
});

test('invalid state returns value: null (not an error throw)', () => {
  const r = APE_StampDuty.calculate('XX', 500000, false);
  assert.strictEqual(r.value, null);
});

test('negative value returns value: null', () => {
  const r = APE_StampDuty.calculate('NSW', -1, false);
  assert.strictEqual(r.value, null);
});

test('zero value returns zero duty', () => {
  const r = APE_StampDuty.calculate('NSW', 0, false);
  assert.strictEqual(r.value, 0);
});

// ---------------------------------------------------------------------------
// land-tax
// ---------------------------------------------------------------------------
console.log('\nland-tax');

test('NSW: below threshold returns value: 0', () => {
  const r = APE_LandTax.calculate('NSW', 100000);
  assert.strictEqual(r.value, 0, `expected 0, got ${r.value}`);
});

test('VIC: below threshold returns value: 0', () => {
  const r = APE_LandTax.calculate('VIC', 50000);
  assert.strictEqual(r.value, 0, `expected 0, got ${r.value}`);
});

test('NSW: $2,000,000 returns a positive land tax', () => {
  const r = APE_LandTax.calculate('NSW', 2000000);
  assert.ok(r.value > 0, `expected value > 0, got ${r.value}`);
});

test('QLD: $700,000 returns a positive land tax', () => {
  const r = APE_LandTax.calculate('QLD', 700000);
  assert.ok(r.value > 0, `expected value > 0, got ${r.value}`);
});

test('invalid state returns value: null', () => {
  const r = APE_LandTax.calculate('XX', 1000000);
  assert.strictEqual(r.value, null);
});

test('zero land value returns value: 0', () => {
  const r = APE_LandTax.calculate('NSW', 0);
  assert.strictEqual(r.value, 0);
});

// ---------------------------------------------------------------------------
// negative-gearing
// ---------------------------------------------------------------------------
console.log('\nnegative-gearing');

const BASE_PARAMS = {
  loanAmount: 500000,
  interestRate: 0.065,
  weeklyRent: 600,
  vacancyWeeks: 2,
  managementFeeRate: 0.085,
  councilRates: 1500,
  insurance: 1200,
  maintenance: 1000,
  depreciation: 5000,
  marginalTaxRate: 0.39,
  loanType: 'io',
  loanTermYears: 30,
};

test('standard params return a result object with netCashFlow', () => {
  const r = APE_NegativeGearing.calculate(BASE_PARAMS);
  assert.ok(r && typeof r === 'object');
  assert.ok(typeof r.netCashFlow === 'number');
});

test('loanAmount: 0 returns zero interest cost (no crash)', () => {
  const r = APE_NegativeGearing.calculate({ ...BASE_PARAMS, loanAmount: 0 });
  assert.ok(r && typeof r === 'object');
  assert.strictEqual(r.interestCost, 0);
});

test('zero rent produces negative net cash flow', () => {
  const r = APE_NegativeGearing.calculate({ ...BASE_PARAMS, weeklyRent: 0 });
  assert.ok(r.netCashFlow < 0, 'zero rent should produce negative net cash flow');
});

test('high rent returns positive annualRent', () => {
  const r = APE_NegativeGearing.calculate({
    ...BASE_PARAMS,
    weeklyRent: 2000,
  });
  assert.ok(r.annualRent > 0);
});

test('P&I loan type populates monthlyRepayment', () => {
  const pi = APE_NegativeGearing.calculate({ ...BASE_PARAMS, loanType: 'pi' });
  assert.ok(pi.monthlyRepayment > 0, 'P&I should have a positive monthly repayment');
});

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
