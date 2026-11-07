// test/words.test.js
const { test } = require('node:test');
const assert = require('node:assert');
const { numberToWords, applyTextCase, formatDateDigits, formatAmount } = require('../lib/words');

test('numberToWords formats amounts into Title Case with international million/billion standard', () => {
  assert.strictEqual(
    numberToWords(135000),
    'One Hundred And Thirty Five Thousand And Cents Zero Only'
  );

  assert.strictEqual(
    numberToWords(1234567.89),
    'One Million Two Hundred And Thirty Four Thousand Five Hundred And Sixty Seven And Cents Eighty Nine Only'
  );

  assert.strictEqual(
    numberToWords(0),
    'Zero And Cents Zero Only'
  );

  assert.strictEqual(
    numberToWords(25.50),
    'Twenty Five And Cents Fifty Only'
  );
});

test('applyTextCase preserves initials and formats casing correctly', () => {
  // as_is preserves exact original text
  assert.strictEqual(applyTextCase('N.G.L Hashan', 'as_is'), 'N.G.L Hashan');
  assert.strictEqual(applyTextCase('Chill Air Auto A/C (Pvt) Ltd', 'as_is'), 'Chill Air Auto A/C (Pvt) Ltd');

  // title case keeps dot-separated initials uppercase
  assert.strictEqual(applyTextCase('n.g.l hashan', 'title'), 'N.G.L Hashan');
  assert.strictEqual(applyTextCase('A.B.C. Perera', 'title'), 'A.B.C. Perera');
  assert.strictEqual(applyTextCase('chill air (pvt) ltd', 'title'), 'Chill Air (Pvt) Ltd');

  // upper case
  assert.strictEqual(applyTextCase('N.G.L Hashan', 'upper'), 'N.G.L HASHAN');

  // sentence case
  assert.strictEqual(applyTextCase('one hundred and thirty five', 'sentence'), 'One hundred and thirty five');
});

test('formatDateDigits splits YYYY-MM-DD into individual cells', () => {
  const d = formatDateDigits('2026-10-30');
  assert.deepStrictEqual(d, {
    d1: '3', d2: '0',
    m1: '1', m2: '0',
    y1: '2', y2: '0', y3: '2', y4: '6',
    formatted: '30/10/2026',
  });
});

test('formatAmount formats numbers with thousand separators and two decimals', () => {
  assert.strictEqual(formatAmount(135000), '135,000.00');
  assert.strictEqual(formatAmount(1234567.8), '1,234,567.80');
  assert.strictEqual(formatAmount(0), '0.00');
});

