// ---------------------------------------------------------------------------
// Validation Utilities
// ---------------------------------------------------------------------------

/**
 * Validate an email address (RFC 5322 simplified).
 */
export function isValidEmail(email: string): boolean {
  if (!email || email.length > 320) return false;
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(email);
}

/**
 * Validate an international phone number (E.164 format).
 *
 * @example
 * isValidPhone('+905551234567') // true
 * isValidPhone('05551234567')   // false (missing country code)
 */
export function isValidPhone(phone: string): boolean {
  if (!phone) return false;
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(phone.replace(/[\s()-]/g, ''));
}

/**
 * Validate a Turkish National ID Number (TC Kimlik No).
 *
 * Rules:
 * - Exactly 11 digits, first digit is not 0.
 * - 10th digit = ((d1+d3+d5+d7+d9)*7 - (d2+d4+d6+d8)) mod 10
 * - 11th digit = (d1+d2+d3+d4+d5+d6+d7+d8+d9+d10) mod 10
 *
 * @example
 * isValidTCKN('10000000146') // true  (valid test TCKN)
 * isValidTCKN('12345678901') // depends on checksum
 */
export function isValidTCKN(tckn: string): boolean {
  if (!tckn || tckn.length !== 11) return false;
  if (!/^\d{11}$/.test(tckn)) return false;
  if (tckn[0] === '0') return false;

  const digits = tckn.split('').map(Number);

  // 10th digit check
  const oddSum = digits[0] + digits[2] + digits[4] + digits[6] + digits[8];
  const evenSum = digits[1] + digits[3] + digits[5] + digits[7];
  const tenthDigit = (oddSum * 7 - evenSum) % 10;

  // Handle negative modulo
  const expectedTenth = tenthDigit < 0 ? tenthDigit + 10 : tenthDigit;
  if (digits[9] !== expectedTenth) return false;

  // 11th digit check
  const sumFirstTen = digits.slice(0, 10).reduce((sum, d) => sum + d, 0);
  if (digits[10] !== sumFirstTen % 10) return false;

  return true;
}

/**
 * Validate a Turkish tax identification number (Vergi Kimlik No).
 * Must be exactly 10 digits.
 */
export function isValidVKN(vkn: string): boolean {
  if (!vkn || vkn.length !== 10) return false;
  return /^\d{10}$/.test(vkn);
}

/**
 * Validate an IBAN.
 * Basic check: 2 letter country code, 2 check digits, up to 30 alphanumeric BBAN.
 */
export function isValidIBAN(iban: string): boolean {
  if (!iban) return false;
  const cleaned = iban.replace(/\s/g, '').toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{4,30}$/.test(cleaned)) return false;

  // MOD-97 validation (ISO 7064)
  const rearranged = cleaned.slice(4) + cleaned.slice(0, 4);
  const numericString = rearranged.replace(/[A-Z]/g, (char) =>
    String(char.charCodeAt(0) - 55),
  );

  // Process in chunks to avoid BigInt requirement
  let remainder = 0;
  for (let i = 0; i < numericString.length; i += 7) {
    const chunk = String(remainder) + numericString.slice(i, i + 7);
    remainder = parseInt(chunk, 10) % 97;
  }

  return remainder === 1;
}
