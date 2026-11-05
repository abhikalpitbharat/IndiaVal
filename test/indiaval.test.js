import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  pan, gstin, gstinChecksum, ifsc, pin, mobile, aadhaar, maskAadhaar,
  verhoeffCheckDigit, verhoeffValid, validate, is,
} from '../src/index.js';

// ---------- PAN ----------
test('pan: accepts a well-formed PAN and reads holder type', () => {
  const r = pan('ABCPE1234F');
  assert.equal(r.valid, true);
  assert.equal(r.holderType, 'Individual');
});

test('pan: normalises case and spaces', () => {
  assert.equal(pan(' abcpe 1234 f ').normalized, 'ABCPE1234F');
});

test('pan: rejects bad length, format and holder letter', () => {
  assert.equal(pan('ABCPE1234').valid, false);
  assert.equal(pan('ABCPE12345').valid, false);
  assert.equal(pan('ABCXE1234F').valid, false); // X is not a holder type
  assert.equal(pan(null).valid, false);
});

// ---------- GSTIN ----------
test('gstin: accepts a commonly cited sample GSTIN', () => {
  const r = gstin('27AAPFU0939F1ZV');
  assert.equal(r.valid, true);
  assert.equal(r.state, 'Maharashtra');
  assert.equal(r.pan, 'AAPFU0939F');
  assert.equal(r.holderType, 'Firm / LLP');
});

test('gstin: accepts GSTINs with a computed checksum', () => {
  for (const base of ['07AABCT1332L1Z', '29AAACR5055K1Z', '36AAGCA1234B2Z']) {
    const full = base + gstinChecksum(base);
    assert.equal(gstin(full).valid, true, full);
  }
});

test('gstin: rejects a wrong checksum', () => {
  const r = gstin('27AAPFU0939F1ZA');
  assert.equal(r.valid, false);
  assert.match(r.reason, /checksum/i);
});

test('gstin: rejects unknown state code and malformed input', () => {
  const base = '50AAPFU0939F1Z';
  assert.equal(gstin(base + gstinChecksum(base)).valid, false);
  assert.equal(gstin('27AAPFU0939F1').valid, false);
  assert.equal(gstin('27AAPFU0939F1XV').valid, false); // 14th char must be Z
});

// ---------- IFSC ----------
test('ifsc: accepts and splits bank and branch code', () => {
  const r = ifsc('sbin0001234');
  assert.equal(r.valid, true);
  assert.equal(r.bankCode, 'SBIN');
  assert.equal(r.branchCode, '001234');
});

test('ifsc: rejects when the fifth character is not zero', () => {
  assert.equal(ifsc('SBIN1001234').valid, false);
  assert.equal(ifsc('SBIN000123').valid, false);
});

// ---------- PIN ----------
test('pin: accepts six digits and gives the region', () => {
  const r = pin('110092');
  assert.equal(r.valid, true);
  assert.match(r.region, /Delhi/);
  assert.equal(r.sortingDistrict, '110');
});

test('pin: rejects leading zero, wrong length and letters', () => {
  assert.equal(pin('010001').valid, false);
  assert.equal(pin('11009').valid, false);
  assert.equal(pin('11009A').valid, false);
});

// ---------- Mobile ----------
test('mobile: normalises the usual ways people type it', () => {
  for (const v of ['9876543210', '09876543210', '919876543210', '+91 98765 43210', '+91-98765-43210', '0091 9876543210']) {
    const r = mobile(v);
    assert.equal(r.valid, true, v);
    assert.equal(r.normalized, '9876543210', v);
    assert.equal(r.e164, '+919876543210', v);
  }
});

test('mobile: rejects bad prefixes, lengths and placeholders', () => {
  assert.equal(mobile('5876543210').valid, false);
  assert.equal(mobile('98765432').valid, false);
  assert.equal(mobile('9999999999').valid, false);
  assert.equal(mobile('').valid, false);
});

// ---------- Aadhaar ----------
// Test numbers are generated from the checksum algorithm, not real Aadhaar numbers.
const makeAadhaar = (base11) => base11 + verhoeffCheckDigit(base11);

test('verhoeff: matches the published textbook example', () => {
  assert.equal(verhoeffCheckDigit('236'), '3');
  assert.equal(verhoeffValid('2363'), true);
  assert.equal(verhoeffValid('2364'), false);
});

test('aadhaar: accepts generated numbers, with spaces or dashes', () => {
  const n = makeAadhaar('23456789012');
  assert.equal(aadhaar(n).valid, true);
  assert.equal(aadhaar(`${n.slice(0, 4)} ${n.slice(4, 8)} ${n.slice(8)}`).valid, true);
  assert.equal(aadhaar(`${n.slice(0, 4)}-${n.slice(4, 8)}-${n.slice(8)}`).valid, true);
});

test('aadhaar: rejects a wrong checksum, bad length and leading 0 or 1', () => {
  const n = makeAadhaar('34567890123');
  const wrong = n.slice(0, 11) + ((Number(n[11]) + 1) % 10);
  assert.equal(aadhaar(wrong).valid, false);
  assert.equal(aadhaar('12345').valid, false);
  assert.equal(aadhaar(makeAadhaar('02345678901')).valid, false);
  assert.equal(aadhaar(makeAadhaar('12345678901')).valid, false);
});

test('aadhaar: masks all but the last four digits', () => {
  const n = makeAadhaar('23456789012');
  assert.equal(maskAadhaar(n), `XXXX XXXX ${n.slice(8)}`);
  assert.equal(aadhaar(n).masked, `XXXX XXXX ${n.slice(8)}`);
  assert.equal(maskAadhaar('abc'), '');
});

// ---------- Convenience ----------
test('validate: routes to the right validator, ignoring case of the type', () => {
  assert.deepEqual(validate('pan', 'ABCPE1234F'), pan('ABCPE1234F'));
  assert.deepEqual(validate('GSTIN', '27AAPFU0939F1ZV'), gstin('27AAPFU0939F1ZV'));
  assert.equal(validate('mobile', '+91 98765 43210').e164, '+919876543210');
});

test('validate: throws a helpful error for an unknown type', () => {
  assert.throws(() => validate('passport', 'X'), /Unknown type "passport".*pan, gstin, ifsc, pin, mobile, aadhaar/);
});

test('is: returns plain true or false for every type', () => {
  assert.equal(is.pan('ABCPE1234F'), true);
  assert.equal(is.pan('nope'), false);
  assert.equal(is.ifsc('SBIN0001234'), true);
  assert.equal(is.pin('110092'), true);
  assert.equal(is.mobile('9876543210'), true);
  assert.equal(is.gstin('27AAPFU0939F1ZA'), false);
  assert.equal(is.aadhaar('123'), false);
});
