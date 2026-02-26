// ---------------------------------------------------------------------------
// Price Calculation Utilities
// ---------------------------------------------------------------------------

/**
 * Calculate the platform commission (buyer's premium) on a hammer price.
 *
 * Supports tiered commission: each tier's rate applies only to the portion
 * of the price within that tier.
 *
 * @param hammerPrice The winning bid amount.
 * @param tiers      Sorted array of { upTo, rate } pairs.
 *                   The last tier's `upTo` can be `Infinity`.
 * @returns Commission amount (rounded to 2 decimals).
 *
 * @example
 * // 15% on first 100k, 12% on 100k-500k, 10% above 500k
 * const tiers = [
 *   { upTo: 100_000, rate: 0.15 },
 *   { upTo: 500_000, rate: 0.12 },
 *   { upTo: Infinity, rate: 0.10 },
 * ];
 * calculateCommission(750_000, tiers); // 15000 + 48000 + 25000 = 88000
 */
export function calculateCommission(
  hammerPrice: number,
  tiers: { upTo: number; rate: number }[],
): number {
  if (hammerPrice <= 0) return 0;

  let commission = 0;
  let remaining = hammerPrice;
  let previousBound = 0;

  for (const tier of tiers) {
    const bracketSize = tier.upTo - previousBound;
    const taxable = Math.min(remaining, bracketSize);
    commission += taxable * tier.rate;
    remaining -= taxable;
    previousBound = tier.upTo;
    if (remaining <= 0) break;
  }

  return Math.round(commission * 100) / 100;
}

/**
 * Calculate the flat-rate commission for a simple percentage.
 */
export function calculateFlatCommission(hammerPrice: number, rate: number): number {
  if (hammerPrice <= 0 || rate <= 0) return 0;
  return Math.round(hammerPrice * rate * 100) / 100;
}

/**
 * Determine the minimum bid increment for a given current price
 * based on configurable price brackets.
 *
 * @param currentPrice  The current highest bid.
 * @param brackets      Sorted array of { upTo, increment } pairs.
 * @returns The increment amount for the next valid bid.
 *
 * @example
 * const brackets = [
 *   { upTo: 1_000,    increment: 50 },
 *   { upTo: 10_000,   increment: 250 },
 *   { upTo: 100_000,  increment: 1_000 },
 *   { upTo: Infinity, increment: 5_000 },
 * ];
 * calculateBidIncrement(7500, brackets); // 250
 */
export function calculateBidIncrement(
  currentPrice: number,
  brackets: { upTo: number; increment: number }[],
): number {
  for (const bracket of brackets) {
    if (currentPrice < bracket.upTo) {
      return bracket.increment;
    }
  }
  // Fallback: return the last bracket's increment
  return brackets[brackets.length - 1]?.increment ?? 0;
}

/**
 * Calculate the total including VAT.
 *
 * @param subtotal Base amount (hammer price + buyer premium + shipping etc.)
 * @param vatRate  VAT percentage as a decimal (e.g. 0.20 for 20%)
 * @returns Object with vat amount and total, both rounded to 2 decimals.
 */
export function calculateTotalWithVat(
  subtotal: number,
  vatRate: number,
): { vatAmount: number; total: number } {
  const vatAmount = Math.round(subtotal * vatRate * 100) / 100;
  const total = Math.round((subtotal + vatAmount) * 100) / 100;
  return { vatAmount, total };
}

/**
 * Calculate the minimum next bid amount.
 */
export function calculateMinimumBid(
  currentPrice: number,
  increment: number,
): number {
  return Math.round((currentPrice + increment) * 100) / 100;
}

/**
 * Calculate the seller's net payout after platform commission.
 */
export function calculateSellerPayout(
  hammerPrice: number,
  commissionRate: number,
): { grossAmount: number; commissionAmount: number; netAmount: number } {
  const commissionAmount = Math.round(hammerPrice * commissionRate * 100) / 100;
  const netAmount = Math.round((hammerPrice - commissionAmount) * 100) / 100;
  return { grossAmount: hammerPrice, commissionAmount, netAmount };
}
