// Type definitions for IndiaVal.
// Results are "discriminated unions": once you check `result.valid`, your editor
// knows exactly which fields exist (`reason` when invalid, the details when valid).

export interface Invalid {
  valid: false;
  /** Plain-English explanation, safe to show to the user. */
  reason: string;
}

export interface PanValid {
  valid: true;
  normalized: string;
  holderType: string;
}

export interface GstinValid {
  valid: true;
  normalized: string;
  stateCode: string;
  state: string;
  pan: string;
  holderType: string;
  entityNumber: string;
}

export interface IfscValid {
  valid: true;
  normalized: string;
  bankCode: string;
  branchCode: string;
}

export interface PinValid {
  valid: true;
  normalized: string;
  region: string;
  sortingDistrict: string;
}

export interface MobileValid {
  valid: true;
  /** 10 digits, no country code. */
  normalized: string;
  /** International format, e.g. +919876543210 */
  e164: string;
}

export interface AadhaarValid {
  valid: true;
  normalized: string;
  /** e.g. "XXXX XXXX 1234" — safe to display or log. */
  masked: string;
}

export type PanResult = PanValid | Invalid;
export type GstinResult = GstinValid | Invalid;
export type IfscResult = IfscValid | Invalid;
export type PinResult = PinValid | Invalid;
export type MobileResult = MobileValid | Invalid;
export type AadhaarResult = AadhaarValid | Invalid;

export type IdType = 'pan' | 'gstin' | 'ifsc' | 'pin' | 'mobile' | 'aadhaar';
export type ValidationResult =
  | PanResult
  | GstinResult
  | IfscResult
  | PinResult
  | MobileResult
  | AadhaarResult;

export function pan(input: unknown): PanResult;
export function gstin(input: unknown): GstinResult;
export function ifsc(input: unknown): IfscResult;
export function pin(input: unknown): PinResult;
export function mobile(input: unknown): MobileResult;
export function aadhaar(input: unknown): AadhaarResult;

/** Shows only the last four digits: "XXXX XXXX 1234". Returns "" for invalid input. */
export function maskAadhaar(input: unknown): string;

/** Pick the validator at run time. Throws a TypeError for an unknown type. */
export function validate(type: 'pan', input: unknown): PanResult;
export function validate(type: 'gstin', input: unknown): GstinResult;
export function validate(type: 'ifsc', input: unknown): IfscResult;
export function validate(type: 'pin', input: unknown): PinResult;
export function validate(type: 'mobile', input: unknown): MobileResult;
export function validate(type: 'aadhaar', input: unknown): AadhaarResult;
export function validate(type: IdType, input: unknown): ValidationResult;

/** True/false shortcuts: is.pan('ABCPE1234F') */
export const is: Record<IdType, (input: unknown) => boolean>;

/** Lower-level helpers, exported for people who want them. */
export function gstinChecksum(first14: string): string | null;
export function verhoeffValid(digits: string): boolean;
export function verhoeffCheckDigit(digits: string): string;

declare const indiaval: {
  pan: typeof pan;
  gstin: typeof gstin;
  ifsc: typeof ifsc;
  pin: typeof pin;
  mobile: typeof mobile;
  aadhaar: typeof aadhaar;
  maskAadhaar: typeof maskAadhaar;
  validate: typeof validate;
  is: typeof is;
};
export default indiaval;
