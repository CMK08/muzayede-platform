// ---------------------------------------------------------------------------
// Bid Validation Schemas
// ---------------------------------------------------------------------------

import { z } from 'zod';
import { moneySchema } from './common';

/** Place a manual or buy-now bid */
export const placeBidSchema = z.object({
  auctionId: z.string().uuid('Gecerli bir muzayede ID giriniz'),
  lotId: z.string().uuid().optional(),
  amount: moneySchema.refine((m) => m.amount > 0, {
    message: 'Teklif tutari sifirdan buyuk olmalidir',
  }),
  type: z.enum(['manual', 'buy_now'], {
    errorMap: () => ({ message: 'Gecerli bir teklif tipi seciniz' }),
  }),
});

/** Set up a proxy / automatic bid */
export const proxyBidSchema = z
  .object({
    auctionId: z.string().uuid('Gecerli bir muzayede ID giriniz'),
    lotId: z.string().uuid().optional(),
    maxAmount: moneySchema.refine((m) => m.amount > 0, {
      message: 'Maksimum teklif tutari sifirdan buyuk olmalidir',
    }),
    startAmount: moneySchema
      .refine((m) => m.amount > 0, {
        message: 'Baslangic tutari sifirdan buyuk olmalidir',
      })
      .optional(),
  })
  .refine(
    (data) => {
      if (data.startAmount) {
        return data.maxAmount.amount > data.startAmount.amount;
      }
      return true;
    },
    {
      message: 'Maksimum teklif baslangic tutarindan buyuk olmalidir',
      path: ['maxAmount'],
    },
  );

/** Retract a bid (requires valid reason) */
export const retractBidSchema = z.object({
  bidId: z.string().uuid('Gecerli bir teklif ID giriniz'),
  reason: z
    .string()
    .min(10, 'Geri cekme nedeni en az 10 karakter olmalidir')
    .max(500, 'Geri cekme nedeni en fazla 500 karakter olmalidir'),
});

export type PlaceBidInput = z.infer<typeof placeBidSchema>;
export type ProxyBidInput = z.infer<typeof proxyBidSchema>;
export type RetractBidInput = z.infer<typeof retractBidSchema>;
