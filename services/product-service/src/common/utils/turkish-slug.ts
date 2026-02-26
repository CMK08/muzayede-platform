/**
 * Generates a URL-safe slug from Turkish text.
 * Transliterates Turkish characters and normalizes the string.
 */
export function turkishSlug(text: string): string {
  const turkishMap: Record<string, string> = {
    '\u011f': 'g',
    '\u011e': 'g',
    '\u015f': 's',
    '\u015e': 's',
    '\u0131': 'i',
    '\u0130': 'i',
    '\u00f6': 'o',
    '\u00d6': 'o',
    '\u00fc': 'u',
    '\u00dc': 'u',
    '\u00e7': 'c',
    '\u00c7': 'c',
  };

  let slug = text;

  for (const [turkishChar, latinChar] of Object.entries(turkishMap)) {
    slug = slug.split(turkishChar).join(latinChar);
  }

  return slug
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}
