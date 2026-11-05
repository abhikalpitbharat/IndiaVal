// indiaval/dom — attach validation to the fields of a form that already exists.
//
// How a field gets picked up (in this order):
//   1. data-indiaval="pan"   (or gstin, ifsc, pin, mobile, aadhaar)  -> always validated
//   2. data-indiaval="off"                                            -> never touched
//   3. otherwise, an unambiguous name or id such as "pan_number" or "pincode"
//
// How errors are shown: through the browser's own form validation. Invalid fields get
// the browser's error bubble on submit, match the :invalid CSS selector and carry
// aria-invalid="true". No extra markup is added to your page.

import { validate } from './index.js';

const KNOWN = {
  pan: ['pan', 'pannumber', 'panno', 'pancard', 'pancardnumber'],
  gstin: ['gstin', 'gst', 'gstnumber', 'gstno', 'gstinnumber'],
  ifsc: ['ifsc', 'ifsccode'],
  // Plain "pin" is left out on purpose: it is often a security PIN, not a postal code.
  pin: ['pincode'],
  mobile: ['mobile', 'mobilenumber', 'mobileno', 'mobilephone'],
  aadhaar: ['aadhaar', 'aadhar', 'aadhaarnumber', 'aadharnumber', 'aadhaarno', 'aadharno'],
};
const TYPES = Object.keys(KNOWN);
const BY_NAME = new Map(Object.entries(KNOWN).flatMap(([type, names]) => names.map((n) => [n, type])));
const TEXT_LIKE = new Set(['', 'text', 'tel', 'search']);
const compact = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

/** Which IndiaVal validator (if any) applies to this input element. */
export function detectType(el, { detect = true } = {}) {
  if (!el || el.tagName !== 'INPUT') return null;
  if (!TEXT_LIKE.has((el.getAttribute('type') || '').toLowerCase())) return null;

  const explicit = el.getAttribute('data-indiaval');
  if (explicit !== null) {
    const value = explicit.trim().toLowerCase();
    if (TYPES.includes(value)) return value;
    if (value !== 'off') {
      console.warn(`indiaval: unknown data-indiaval="${explicit}". Use one of: ${TYPES.join(', ')}, or "off".`);
    }
    return null;
  }
  if (!detect) return null;
  return BY_NAME.get(compact(el.name)) ?? BY_NAME.get(compact(el.id)) ?? null;
}

function markValid(el) {
  el.setCustomValidity('');
  el.removeAttribute('aria-invalid');
}

function check(el, type, normalize) {
  const raw = el.value;
  let result = null;

  if (raw.trim() === '') {
    markValid(el); // empty is the business of the `required` attribute, not ours
  } else {
    result = validate(type, raw);
    if (result.valid) {
      markValid(el);
      if (normalize && el.value !== result.normalized) el.value = result.normalized;
    } else {
      el.setCustomValidity(result.reason);
      el.setAttribute('aria-invalid', 'true');
    }
  }

  const win = el.ownerDocument.defaultView;
  el.dispatchEvent(new win.CustomEvent('indiaval:validate', { bubbles: true, detail: { type, result } }));
  return !el.validationMessage;
}

/**
 * Start validating every matching field inside `root` (default: the whole page).
 * Returns a function that stops everything and clears the errors it set.
 *
 * Options: normalize (default true)  tidy valid values when the user leaves the field
 *          detect    (default true)  also pick fields by name/id, not just data-indiaval
 *          observe   (default true)  pick up fields added to the page later
 */
export function attach(root, options = {}) {
  const { normalize = true, detect = true, observe = true } = options;
  const scope = root ?? document;
  const win = (scope.ownerDocument ?? scope).defaultView;
  const wired = new Map(); // input element -> { type, stop }

  function wire(el) {
    if (wired.has(el)) return;
    const type = detectType(el, { detect });
    if (!type) return;
    const onInput = () => check(el, type, false);
    const onChange = () => check(el, type, normalize);
    el.addEventListener('input', onInput);
    el.addEventListener('change', onChange);
    wired.set(el, {
      type,
      stop() {
        el.removeEventListener('input', onInput);
        el.removeEventListener('change', onChange);
        markValid(el);
      },
    });
    check(el, type, false); // covers values the browser or the app pre-filled
  }

  function unwire(el) {
    wired.get(el)?.stop();
    wired.delete(el);
  }

  const inputsIn = (node) => [
    ...(node.tagName === 'INPUT' ? [node] : []),
    ...(node.querySelectorAll ? node.querySelectorAll('input') : []),
  ];
  const isNode = (n) => n.nodeType === 1 || n.nodeType === 9 || n.nodeType === 11;

  inputsIn(scope).forEach(wire);

  // Forms marked novalidate skip the browser's own check, so we stop the submit ourselves.
  function onSubmit(event) {
    const form = event.target;
    if (!form.noValidate) return; // the browser will block it, showing our messages
    const bad = [];
    for (const [el, { type }] of wired) {
      if (form.contains(el) && !check(el, type, false)) bad.push(el);
    }
    if (bad.length) {
      event.preventDefault();
      bad[0].reportValidity();
    }
  }
  scope.addEventListener('submit', onSubmit, true);

  let observer = null;
  if (observe && win?.MutationObserver) {
    observer = new win.MutationObserver((records) => {
      for (const r of records) {
        r.removedNodes.forEach((n) => isNode(n) && inputsIn(n).forEach(unwire));
        r.addedNodes.forEach((n) => isNode(n) && inputsIn(n).forEach(wire));
      }
    });
    observer.observe(scope, { childList: true, subtree: true });
  }

  return function detach() {
    observer?.disconnect();
    scope.removeEventListener('submit', onSubmit, true);
    for (const el of [...wired.keys()]) unwire(el);
  };
}
