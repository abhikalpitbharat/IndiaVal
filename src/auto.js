// indiaval/auto — the one-line setup.
//
//   import 'indiaval/auto';
//
// As soon as the page is ready, every matching field on it is validated.
// To switch this off and call attach() yourself, set  window.INDIAVAL_MANUAL = true  first.

import { attach } from './dom.js';

if (typeof document !== 'undefined' && !globalThis.INDIAVAL_MANUAL) {
  const start = () => attach(document);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
}

export { attach };
