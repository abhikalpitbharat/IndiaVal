# IndiaVal

Tiny, zero-dependency validators for Indian identifiers. Short for "India validate". Website: [abhikalpitbharat.org/IndiaVal](https://abhikalpitbharat.org/IndiaVal)

A project by Mukesh Gupta ([mukeshgupta.co](https://mukeshgupta.co)), under the Abhikalpit Bharat Vision ([abhikalpitbharat.org](https://abhikalpitbharat.org)). Independent, and not affiliated with any government body.

Covers PAN, GSTIN, IFSC, PIN code, mobile number and Aadhaar. Works in Node 18+ and any modern bundler.

## Fastest way: add one line to a form you already have

```
npm install indiaval
```

```js
import 'indiaval/auto';
```

That's it. IndiaVal finds the PAN, GSTIN, IFSC, PIN code, mobile and Aadhaar fields on the page and validates them. No per-field code.

No build tool? Use one script tag instead:

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/indiaval/src/auto.js"></script>
```

**How it finds fields.** A field is picked up if its `name` or `id` is an unambiguous match (`pan`, `pan_number`, `gstin`, `ifsc_code`, `pincode`, `mobile`, `aadhaar_no` and similar), or if you mark it yourself:

```html
<input name="tax_id" data-indiaval="pan">     <!-- always validated as a PAN -->
<input name="pan_notes" data-indiaval="off">  <!-- never touched -->
```

Plain `pin` and `phone` are deliberately not guessed, since they are often a security PIN or a landline. Mark those with `data-indiaval` if you want them checked.

**How errors show.** IndiaVal uses the browser's own form validation, so there is no extra markup. Invalid fields block the submit and show the browser's error bubble with a plain-English message, match the `:invalid` CSS selector, and carry `aria-invalid="true"`. Empty fields are left to your `required` attribute. Valid values are tidied when the user leaves the field (`abcpe1234f` becomes `ABCPE1234F`).

**Want your own error design?** Every check fires an `indiaval:validate` event you can listen for:

```js
document.addEventListener('indiaval:validate', (e) => {
  const { type, result } = e.detail;      // result.valid, result.reason
  showMyOwnMessage(e.target, result.reason);
});
```

**Want more control?** Skip the automatic start and call it yourself:

```js
window.INDIAVAL_MANUAL = true;   // set before importing indiaval/auto, or just import from 'indiaval/dom'
import { attach } from 'indiaval/dom';

const stop = attach(document.querySelector('#signup'), { normalize: false });
// later: stop();
```

Fields added to the page later (by React, Vue or your own scripts) are picked up automatically.

## Use

```js
import { pan, gstin, ifsc, pin, mobile, aadhaar } from 'indiaval';

pan('abcpe 1234 f');
// { valid: true, normalized: 'ABCPE1234F', holderType: 'Individual' }

gstin('27AAPFU0939F1ZV');
// { valid: true, normalized: '27AAPFU0939F1ZV', stateCode: '27', state: 'Maharashtra',
//   pan: 'AAPFU0939F', holderType: 'Firm / LLP', entityNumber: '1' }

mobile('+91 98765-43210');
// { valid: true, normalized: '9876543210', e164: '+919876543210' }

pin('999');
// { valid: false, reason: 'PIN code must be 6 digits' }
```

Every validator returns `{ valid: boolean }`. Invalid results include a plain-English `reason` you can show to users. Valid results include a `normalized` value and whatever can be read from the ID itself.

| Validator | Checks |
|---|---|
| `pan` | Format, holder-type letter |
| `gstin` | Format, state code, embedded PAN, checksum |
| `ifsc` | Format, splits bank code and branch code |
| `pin` | Six digits, no leading zero, postal region |
| `mobile` | Strips +91 / 0 / 91 prefixes, starts with 6-9, rejects placeholders |
| `aadhaar` | 12 digits, first digit 2-9, Verhoeff checksum, masked form |

`maskAadhaar(value)` returns `XXXX XXXX 1234`. Never log or store a full Aadhaar number if you can avoid it.

## Shortcuts

**Just need true or false?**

```js
import { is } from 'indiaval';

is.pan('ABCPE1234F');     // true
is.mobile('12345');       // false
```

**Field type decided at run time?** (for example, a form built from a config file)

```js
import { validate } from 'indiaval';

validate('gstin', value); // same as gstin(value)
validate('passport', x);  // throws: Unknown type "passport". Use one of: pan, gstin, ...
```

## TypeScript

Types are included, so there is nothing extra to install. After you check `valid`, your editor knows which fields exist:

```ts
const r = pan(input);
if (r.valid) {
  r.holderType;   // autocompletes
} else {
  r.reason;       // autocompletes
}
```

## What this does not do

These check format and checksums only. A valid result means the ID *could* exist, not that it has been issued or belongs to the person in front of you. For that you need the issuing authority's own verification service.

## Develop

```
npm test
```

Tests use `node:test`, so there is nothing to install.

## Roadmap

1. Today: six validators, one file, tests.
2. Next: IFSC bank-name lookup, PIN to district lookup.
3. Later: Indian name and address normalisation, a hosted `/validate` API, form-library adapters.

## Licence

MIT © 2026 Mukesh Gupta ([mukeshgupta.co](https://mukeshgupta.co)). See [LICENSE](LICENSE).
