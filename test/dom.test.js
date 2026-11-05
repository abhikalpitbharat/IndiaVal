import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { attach, detectType } from '../src/dom.js';

// A form the way a developer might already have built it, with no IndiaVal-specific markup
// except the two deliberate data-indiaval examples at the bottom.
const FORM = `
<form id="f">
  <input name="full_name">
  <input name="pan_number">
  <input id="GSTIN">
  <input name="ifsc-code">
  <input name="pincode">
  <input name="mobile" type="tel">
  <input name="aadhaar_no">
  <input name="email" type="email">
  <input name="pin" type="password">
  <input name="custom_tax_id" data-indiaval="pan">
  <input name="pan_backup" data-indiaval="off">
</form>`;

function page(html = FORM) {
  const { window } = new JSDOM(`<!doctype html><body>${html}</body>`);
  const { document } = window;
  const fire = (el, name) => el.dispatchEvent(new window.Event(name, { bubbles: true, cancelable: true }));
  return {
    window,
    document,
    fire,
    $: (selector) => document.querySelector(selector),
    type(el, value) { el.value = value; fire(el, 'input'); },
    commit(el) { fire(el, 'change'); },
  };
}
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
const flagged = (el) => el.validity.customError;

test('finds the right fields in a form it knows nothing about', () => {
  const p = page();
  attach(p.document);

  const shouldValidate = [
    '[name=pan_number]', '#GSTIN', '[name="ifsc-code"]', '[name=pincode]',
    '[name=mobile]', '[name=aadhaar_no]', '[name=custom_tax_id]',
  ];
  for (const selector of shouldValidate) {
    const el = p.$(selector);
    p.type(el, 'x');
    assert.equal(flagged(el), true, `${selector} should be flagged`);
  }

  const shouldBeLeftAlone = ['[name=full_name]', '[name=email]', '[name=pin]', '[name=pan_backup]'];
  for (const selector of shouldBeLeftAlone) {
    const el = p.$(selector);
    p.type(el, 'x');
    assert.equal(flagged(el), false, `${selector} should be left alone`);
  }
});

test('blocks the form until the field is right, with a readable message', () => {
  const p = page();
  attach(p.document);
  const pan = p.$('[name=pan_number]');

  p.type(pan, 'ABCPE12345');
  assert.equal(pan.validationMessage, 'PAN format is AAAAA9999A');
  assert.equal(pan.getAttribute('aria-invalid'), 'true');
  assert.equal(p.$('#f').checkValidity(), false);

  p.type(pan, 'ABCPE1234F');
  assert.equal(pan.validationMessage, '');
  assert.equal(pan.hasAttribute('aria-invalid'), false);
  assert.equal(p.$('#f').checkValidity(), true);
});

test('leaves empty fields to the required attribute', () => {
  const p = page();
  attach(p.document);
  const pan = p.$('[name=pan_number]');
  p.type(pan, 'bad');
  p.type(pan, '');
  assert.equal(flagged(pan), false);
});

test('tidies valid values when the user leaves the field, not while typing', () => {
  const p = page();
  attach(p.document);
  const pan = p.$('[name=pan_number]');
  const mobile = p.$('[name=mobile]');

  p.type(pan, 'abcpe1234f');
  assert.equal(pan.value, 'abcpe1234f');
  p.commit(pan);
  assert.equal(pan.value, 'ABCPE1234F');

  p.type(mobile, '+91 98765-43210');
  p.commit(mobile);
  assert.equal(mobile.value, '9876543210');
});

test('normalize: false leaves what the user typed', () => {
  const p = page();
  attach(p.document, { normalize: false });
  const pan = p.$('[name=pan_number]');
  p.type(pan, 'abcpe1234f');
  p.commit(pan);
  assert.equal(pan.value, 'abcpe1234f');
  assert.equal(flagged(pan), false);
});

test('checks values that were pre-filled before it started', () => {
  const p = page('<form><input name="pan" value="nonsense"></form>');
  attach(p.document);
  assert.equal(flagged(p.$('[name=pan]')), true);
});

test('picks up fields added to the page later', async () => {
  const p = page('<form id="f"></form>');
  attach(p.document);
  const late = p.document.createElement('input');
  late.name = 'gst_number';
  p.$('#f').append(late);
  await tick();
  p.type(late, 'x');
  assert.equal(flagged(late), true);
});

test('detect: false only validates fields marked with data-indiaval', () => {
  const p = page();
  attach(p.document, { detect: false });
  const byName = p.$('[name=pan_number]');
  const marked = p.$('[name=custom_tax_id]');
  p.type(byName, 'x');
  p.type(marked, 'x');
  assert.equal(flagged(byName), false);
  assert.equal(flagged(marked), true);
});

test('warns about a mistyped data-indiaval value instead of failing silently', () => {
  const warn = mock.method(console, 'warn', () => {});
  try {
    const p = page('<form><input name="x" data-indiaval="pam"></form>');
    attach(p.document);
    assert.equal(warn.mock.callCount(), 1);
    assert.match(String(warn.mock.calls[0].arguments[0]), /unknown data-indiaval="pam"/);
  } finally {
    warn.mock.restore();
  }
});

test('stops the submit itself on forms marked novalidate', () => {
  const p = page('<form id="f" novalidate><input name="pan"></form>');
  attach(p.document);
  const form = p.$('#f');
  const pan = p.$('[name=pan]');

  pan.value = 'bad'; // set without firing events, as a script might
  assert.equal(form.dispatchEvent(new p.window.Event('submit', { bubbles: true, cancelable: true })), false);

  p.type(pan, 'ABCPE1234F');
  assert.equal(form.dispatchEvent(new p.window.Event('submit', { bubbles: true, cancelable: true })), true);
});

test('announces every result as an indiaval:validate event', () => {
  const p = page();
  attach(p.document);
  const seen = [];
  p.document.addEventListener('indiaval:validate', (e) => seen.push(e.detail));

  p.type(p.$('[name=pan_number]'), 'ABCPE1234F');
  p.type(p.$('[name=pincode]'), '12');

  assert.equal(seen.length, 2);
  assert.equal(seen[0].type, 'pan');
  assert.equal(seen[0].result.valid, true);
  assert.equal(seen[1].type, 'pin');
  assert.equal(seen[1].result.valid, false);
});

test('detach stops validating and clears the errors it set', () => {
  const p = page();
  const detach = attach(p.document);
  const pan = p.$('[name=pan_number]');
  p.type(pan, 'x');
  assert.equal(flagged(pan), true);

  detach();
  assert.equal(flagged(pan), false);
  p.type(pan, 'still wrong');
  assert.equal(flagged(pan), false);
});

test('detectType: explicit marking, detection by name or id, and the cases it refuses', () => {
  const { document } = page('').window;
  const make = (attrs) => {
    const el = document.createElement('input');
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    return el;
  };
  assert.equal(detectType(make({ name: 'PAN-Number' })), 'pan');
  assert.equal(detectType(make({ id: 'Aadhar_No' })), 'aadhaar');
  assert.equal(detectType(make({ name: 'x', 'data-indiaval': 'IFSC' })), 'ifsc');
  assert.equal(detectType(make({ name: 'pan', 'data-indiaval': 'off' })), null);
  assert.equal(detectType(make({ name: 'pin' })), null); // could be a security PIN
  assert.equal(detectType(make({ name: 'phone' })), null); // could be a landline
  assert.equal(detectType(make({ name: 'pan', type: 'password' })), null);
  assert.equal(detectType(document.createElement('textarea')), null);
});
