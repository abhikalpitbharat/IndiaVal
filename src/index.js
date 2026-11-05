// indiaval — tiny validators for Indian identifiers.
// Every validator returns { valid: boolean, ... }. Invalid results carry a `reason`.
// Valid results carry a `normalized` value plus any details we can read from the ID itself.
// Note: these check format and checksums only. They cannot tell you an ID is actually issued.

const clean = (v) => String(v ?? '').replace(/[\s-]/g, '').toUpperCase();
const fail = (reason) => ({ valid: false, reason });

// ---------- PAN ----------
const PAN_TYPES = {
  P: 'Individual',
  C: 'Company',
  H: 'Hindu Undivided Family',
  F: 'Firm / LLP',
  A: 'Association of Persons',
  T: 'Trust',
  B: 'Body of Individuals',
  L: 'Local Authority',
  J: 'Artificial Juridical Person',
  G: 'Government',
};

export function pan(input) {
  const v = clean(input);
  if (v.length !== 10) return fail('PAN must be 10 characters');
  if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(v)) return fail('PAN format is AAAAA9999A');
  const type = PAN_TYPES[v[3]];
  if (!type) return fail('PAN has an unknown holder-type letter');
  return { valid: true, normalized: v, holderType: type };
}

// ---------- GSTIN ----------
const GST_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

// Valid state / UT codes used in GSTIN (97 = Other Territory, 99 = Centre Jurisdiction)
const GST_STATES = {
  '01': 'Jammu and Kashmir', '02': 'Himachal Pradesh', '03': 'Punjab', '04': 'Chandigarh',
  '05': 'Uttarakhand', '06': 'Haryana', '07': 'Delhi', '08': 'Rajasthan', '09': 'Uttar Pradesh',
  '10': 'Bihar', '11': 'Sikkim', '12': 'Arunachal Pradesh', '13': 'Nagaland', '14': 'Manipur',
  '15': 'Mizoram', '16': 'Tripura', '17': 'Meghalaya', '18': 'Assam', '19': 'West Bengal',
  '20': 'Jharkhand', '21': 'Odisha', '22': 'Chhattisgarh', '23': 'Madhya Pradesh', '24': 'Gujarat',
  '26': 'Dadra and Nagar Haveli and Daman and Diu', '27': 'Maharashtra', '29': 'Karnataka',
  '30': 'Goa', '31': 'Lakshadweep', '32': 'Kerala', '33': 'Tamil Nadu', '34': 'Puducherry',
  '35': 'Andaman and Nicobar Islands', '36': 'Telangana', '37': 'Andhra Pradesh', '38': 'Ladakh',
  '97': 'Other Territory', '99': 'Centre Jurisdiction',
};

export function gstinChecksum(first14) {
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    const code = GST_CHARS.indexOf(first14[i]);
    if (code < 0) return null;
    const product = code * (i % 2 === 0 ? 1 : 2);
    sum += Math.floor(product / 36) + (product % 36);
  }
  return GST_CHARS[(36 - (sum % 36)) % 36];
}

export function gstin(input) {
  const v = clean(input);
  if (v.length !== 15) return fail('GSTIN must be 15 characters');
  if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(v)) {
    return fail('GSTIN format is 99AAAAA9999A9Z9');
  }
  const state = GST_STATES[v.slice(0, 2)];
  if (!state) return fail('GSTIN has an unknown state code');
  const panPart = pan(v.slice(2, 12));
  if (!panPart.valid) return fail('GSTIN contains an invalid PAN');
  if (gstinChecksum(v.slice(0, 14)) !== v[14]) return fail('GSTIN checksum does not match');
  return {
    valid: true,
    normalized: v,
    stateCode: v.slice(0, 2),
    state,
    pan: v.slice(2, 12),
    holderType: panPart.holderType,
    entityNumber: v[12],
  };
}

// ---------- IFSC ----------
export function ifsc(input) {
  const v = clean(input);
  if (v.length !== 11) return fail('IFSC must be 11 characters');
  if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(v)) return fail('IFSC format is AAAA0XXXXXX');
  return { valid: true, normalized: v, bankCode: v.slice(0, 4), branchCode: v.slice(5) };
}

// ---------- PIN code ----------
const PIN_REGIONS = {
  1: 'Delhi, Haryana, Punjab, Himachal Pradesh, Jammu and Kashmir, Ladakh, Chandigarh',
  2: 'Uttar Pradesh, Uttarakhand',
  3: 'Rajasthan, Gujarat, Daman and Diu, Dadra and Nagar Haveli',
  4: 'Maharashtra, Goa, Madhya Pradesh, Chhattisgarh',
  5: 'Andhra Pradesh, Telangana, Karnataka',
  6: 'Kerala, Tamil Nadu, Puducherry, Lakshadweep',
  7: 'West Bengal, Odisha, Assam and the North East, Andaman and Nicobar Islands',
  8: 'Bihar, Jharkhand',
  9: 'Army Post Office (APO) and Field Post Office (FPO)',
};

export function pin(input) {
  const v = String(input ?? '').replace(/\s/g, '');
  if (!/^[0-9]{6}$/.test(v)) return fail('PIN code must be 6 digits');
  if (v[0] === '0') return fail('PIN code cannot start with 0');
  return { valid: true, normalized: v, region: PIN_REGIONS[v[0]], sortingDistrict: v.slice(0, 3) };
}

// ---------- Mobile ----------
// Accepts 9876543210, 09876543210, 919876543210, +91 98765 43210, +91-98765-43210.
export function mobile(input) {
  let v = String(input ?? '').replace(/[\s()-]/g, '');
  if (v.startsWith('+91')) v = v.slice(3);
  else if (v.startsWith('0091')) v = v.slice(4);
  else if (v.length === 12 && v.startsWith('91')) v = v.slice(2);
  else if (v.length === 11 && v.startsWith('0')) v = v.slice(1);
  if (!/^[0-9]{10}$/.test(v)) return fail('Mobile number must have 10 digits after the country code');
  if (!/^[6-9]/.test(v)) return fail('Indian mobile numbers start with 6, 7, 8 or 9');
  if (/^(\d)\1{9}$/.test(v)) return fail('Mobile number looks like a placeholder');
  return { valid: true, normalized: v, e164: `+91${v}` };
}

// ---------- Aadhaar (format + Verhoeff checksum) ----------
const VERHOEFF_D = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [1, 2, 3, 4, 0, 6, 7, 8, 9, 5], [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7], [4, 0, 1, 2, 3, 9, 5, 6, 7, 8], [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2], [7, 6, 5, 9, 8, 2, 1, 0, 4, 3], [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
];
const VERHOEFF_P = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [1, 5, 7, 6, 2, 8, 3, 0, 9, 4], [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7], [9, 4, 5, 3, 1, 2, 6, 8, 7, 0], [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5], [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
];
const VERHOEFF_INV = [0, 4, 3, 2, 1, 5, 6, 7, 8, 9];

export function verhoeffValid(digits) {
  let c = 0;
  const rev = digits.split('').reverse();
  for (let i = 0; i < rev.length; i++) c = VERHOEFF_D[c][VERHOEFF_P[i % 8][Number(rev[i])]];
  return c === 0;
}

export function verhoeffCheckDigit(digits) {
  let c = 0;
  const rev = digits.split('').reverse();
  for (let i = 0; i < rev.length; i++) c = VERHOEFF_D[c][VERHOEFF_P[(i + 1) % 8][Number(rev[i])]];
  return String(VERHOEFF_INV[c]);
}

export function aadhaar(input) {
  const v = String(input ?? '').replace(/[\s-]/g, '');
  if (!/^[0-9]{12}$/.test(v)) return fail('Aadhaar must be 12 digits');
  if (/^[01]/.test(v)) return fail('Aadhaar cannot start with 0 or 1');
  if (!verhoeffValid(v)) return fail('Aadhaar checksum does not match');
  return { valid: true, normalized: v, masked: maskAadhaar(v) };
}

// Show only the last four digits, in the standard grouped style.
export function maskAadhaar(input) {
  const v = String(input ?? '').replace(/[\s-]/g, '');
  if (!/^[0-9]{12}$/.test(v)) return '';
  return `XXXX XXXX ${v.slice(8)}`;
}

// ---------- Convenience ----------
const VALIDATORS = { pan, gstin, ifsc, pin, mobile, aadhaar };

// One entry point for forms that decide the field type at run time:
//   validate('pan', value)  is the same as  pan(value)
export function validate(type, input) {
  const fn = VALIDATORS[String(type).toLowerCase()];
  if (!fn) {
    throw new TypeError(`Unknown type "${type}". Use one of: ${Object.keys(VALIDATORS).join(', ')}`);
  }
  return fn(input);
}

// True/false shortcuts for the simple cases:  is.pan(value)  ->  true or false
export const is = Object.fromEntries(
  Object.entries(VALIDATORS).map(([name, fn]) => [name, (input) => fn(input).valid]),
);

export default { pan, gstin, ifsc, pin, mobile, aadhaar, maskAadhaar, validate, is };
