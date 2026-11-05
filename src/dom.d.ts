import type { IdType } from './index.js';

export interface AttachOptions {
  /** Tidy valid values (uppercase PAN, 10-digit mobile…) when the user leaves the field. Default true. */
  normalize?: boolean;
  /** Also pick fields by an unambiguous name or id, not only data-indiaval. Default true. */
  detect?: boolean;
  /** Pick up fields added to the page later. Default true. */
  observe?: boolean;
}

/** Which validator applies to this input, or null if none. */
export function detectType(el: Element | null, options?: { detect?: boolean }): IdType | null;

/**
 * Start validating matching fields inside `root` (default: the whole page).
 * Returns a function that stops validation and clears the errors it set.
 */
export function attach(root?: Document | Element | DocumentFragment, options?: AttachOptions): () => void;
