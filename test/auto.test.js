import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

// This file runs in its own process, so setting globals here cannot leak into other tests.
const { window } = new JSDOM(`<!doctype html><body>
  <form><input name="pan_number"><input name="pincode"><input name="notes"></form>
</body>`);
globalThis.document = window.document;

test("import 'indiaval/auto' validates a pre-built form with no other code", async () => {
  await import('../src/auto.js'); // the one line a developer adds

  const set = (selector, value) => {
    const el = window.document.querySelector(selector);
    el.value = value;
    el.dispatchEvent(new window.Event('input', { bubbles: true }));
    return el;
  };

  assert.equal(set('[name=pan_number]', 'nope').validity.customError, true);
  assert.equal(set('[name=pincode]', '123').validity.customError, true);
  assert.equal(set('[name=notes]', 'nope').validity.customError, false);

  assert.equal(set('[name=pan_number]', 'ABCPE1234F').validity.customError, false);
  assert.equal(set('[name=pincode]', '110092').validity.customError, false);
  assert.equal(window.document.querySelector('form').checkValidity(), true);
});

test('INDIAVAL_MANUAL switches the automatic start off', async () => {
  const other = new JSDOM('<!doctype html><body><form><input name="pan"></form></body>').window;
  globalThis.document = other.document;
  globalThis.INDIAVAL_MANUAL = true;
  try {
    await import('../src/auto.js?manual'); // a different URL forces a fresh run of the module
    const el = other.document.querySelector('[name=pan]');
    el.value = 'nope';
    el.dispatchEvent(new other.Event('input', { bubbles: true }));
    assert.equal(el.validity.customError, false);
  } finally {
    delete globalThis.INDIAVAL_MANUAL;
    globalThis.document = window.document;
  }
});
