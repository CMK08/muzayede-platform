// ---------------------------------------------------------------------------
// Currency Utilities
// ---------------------------------------------------------------------------

export type CurrencyCode = 'TRY' | 'USD' | 'EUR' | 'GBP';

export interface CurrencyInfo {
  code: CurrencyCode;
  symbol: string;
  name: string;
  locale: string;
  decimalDigits: number;
}

/** Registry of supported currencies */
export const supportedCurrencies: Record<CurrencyCode, CurrencyInfo> = {
  TRY: { code: 'TRY', symbol: '\u20BA', name: 'Turk Lirasi', locale: 'tr-TR', decimalDigits: 2 },
  USD: { code: 'USD', symbol: '$', name: 'US Dollar', locale: 'en-US', decimalDigits: 2 },
  EUR: { code: 'EUR', symbol: '\u20AC', name: 'Euro', locale: 'de-DE', decimalDigits: 2 },
  GBP: { code: 'GBP', symbol: '\u00A3', name: 'British Pound', locale: 'en-GB', decimalDigits: 2 },
};

/**
 * Format a numeric amount as a localised currency string.
 *
 * @example
 * formatCurrency(1250.5, 'TRY')           // "1.250,50 \u20BA"
 * formatCurrency(1250.5, 'USD')           // "$1,250.50"
 * formatCurrency(1250.5, 'TRY', { compact: true }) // "1,25 bin \u20BA" (browser-dependent)
 */
export function formatCurrency(
  amount: number,
  currency: CurrencyCode,
  options?: { compact?: boolean; showSymbol?: boolean },
): string {
  const info = supportedCurrencies[currency];
  if (!info) {
    throw new Error(`Unsupported currency: ${currency}`);
  }

  const formatOptions: Intl.NumberFormatOptions = {
    style: options?.showSymbol === false ? 'decimal' : 'currency',
    currency: info.code,
    minimumFractionDigits: info.decimalDigits,
    maximumFractionDigits: info.decimalDigits,
  };

  if (options?.compact) {
    formatOptions.notation = 'compact';
    formatOptions.compactDisplay = 'short';
  }

  return new Intl.NumberFormat(info.locale, formatOptions).format(amount);
}

/**
 * Convert an amount between two currencies using the provided exchange rates map.
 *
 * The `rates` object is keyed as `"FROM_TO"` (e.g. `"USD_TRY": 32.5`).
 * If the direct pair is unavailable, the function looks for the inverse pair.
 *
 * @returns The converted amount rounded to the target currency's decimal digits.
 */
export function convertCurrency(
  amount: number,
  from: CurrencyCode,
  to: CurrencyCode,
  rates: Record<string, number>,
): number {
  if (from === to) return amount;

  const directKey = `${from}_${to}`;
  const inverseKey = `${to}_${from}`;

  let rate: number;

  if (rates[directKey] != null) {
    rate = rates[directKey];
  } else if (rates[inverseKey] != null) {
    rate = 1 / rates[inverseKey];
  } else {
    throw new Error(`Exchange rate not found for ${from} -> ${to}`);
  }

  const targetInfo = supportedCurrencies[to];
  const factor = Math.pow(10, targetInfo.decimalDigits);
  return Math.round(amount * rate * factor) / factor;
}
