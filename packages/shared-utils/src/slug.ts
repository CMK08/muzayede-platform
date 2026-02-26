// ---------------------------------------------------------------------------
// Slug & Identifier Generation Utilities
// ---------------------------------------------------------------------------

/** Turkish character mapping for transliteration */
const TURKISH_CHAR_MAP: Record<string, string> = {
  '\u00E7': 'c',
  '\u00C7': 'C',
  '\u011F': 'g',
  '\u011E': 'G',
  '\u0131': 'i',
  '\u0130': 'I',
  '\u00F6': 'o',
  '\u00D6': 'O',
  '\u015F': 's',
  '\u015E': 'S',
  '\u00FC': 'u',
  '\u00DC': 'U',
};

/**
 * Generate a URL-safe slug from a string, with Turkish character support.
 *
 * @param text  Input string (title, name, etc.)
 * @param maxLength Maximum length of the resulting slug (default 120).
 * @returns Lowercase, hyphen-separated slug.
 *
 * @example
 * generateSlug('Osmanli Donemi Seramik Vazo')
 * // "osmanli-donemi-seramik-vazo"
 *
 * generateSlug('  Ozel Muzayede -- 2025  ')
 * // "ozel-muzayede-2025"
 */
export function generateSlug(text: string, maxLength = 120): string {
  let slug = text;

  // Transliterate Turkish characters
  slug = slug.replace(/[^\u0000-\u007F]/g, (char) => TURKISH_CHAR_MAP[char] ?? char);

  slug = slug
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')   // remove non-alphanumeric except space & hyphen
    .replace(/[\s_]+/g, '-')         // spaces/underscores to hyphens
    .replace(/-+/g, '-')             // collapse consecutive hyphens
    .replace(/^-|-$/g, '');          // trim leading/trailing hyphens

  if (slug.length > maxLength) {
    slug = slug.substring(0, maxLength).replace(/-$/, '');
  }

  return slug;
}

/**
 * Generate a lot number in the format "LOT-YYYYMMDD-XXXXX".
 *
 * @param sequenceNumber Incrementing sequence number.
 * @param date           Optional date (defaults to now).
 * @returns Formatted lot number string.
 *
 * @example
 * generateLotNumber(42)
 * // "LOT-20250615-00042"
 */
export function generateLotNumber(sequenceNumber: number, date?: Date): string {
  const d = date ?? new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const seq = String(sequenceNumber).padStart(5, '0');
  return `LOT-${year}${month}${day}-${seq}`;
}

/**
 * Generate an order number in the format "ORD-YYYYMMDD-XXXXX".
 */
export function generateOrderNumber(sequenceNumber: number, date?: Date): string {
  const d = date ?? new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const seq = String(sequenceNumber).padStart(5, '0');
  return `ORD-${year}${month}${day}-${seq}`;
}

/**
 * Generate an invoice number in the format "INV-YYYYMM-XXXXX".
 */
export function generateInvoiceNumber(sequenceNumber: number, date?: Date): string {
  const d = date ?? new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const seq = String(sequenceNumber).padStart(5, '0');
  return `INV-${year}${month}-${seq}`;
}
