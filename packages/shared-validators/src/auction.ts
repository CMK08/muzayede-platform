// ---------------------------------------------------------------------------
// Auction Validation Schemas
// ---------------------------------------------------------------------------

import { z } from 'zod';
import { moneySchema, paginationSchema } from './common';

const antiSnipeConfigSchema = z.object({
  enabled: z.boolean().default(true),
  thresholdSeconds: z
    .number()
    .int()
    .min(30, 'Anti-snipe esigi en az 30 saniye olmalidir')
    .max(600)
    .default(120),
  extensionSeconds: z
    .number()
    .int()
    .min(30, 'Uzatma suresi en az 30 saniye olmalidir')
    .max(600)
    .default(120),
  maxExtensions: z
    .number()
    .int()
    .min(1)
    .max(50, 'Maksimum uzatma sayisi 50 yi gecemez')
    .default(10),
});

const auctionScheduleSchema = z
  .object({
    startDate: z.string().datetime('Gecerli bir baslangic tarihi giriniz'),
    endDate: z.string().datetime('Gecerli bir bitis tarihi giriniz'),
    previewStartDate: z.string().datetime().optional(),
    preBidStartDate: z.string().datetime().optional(),
    timezone: z.string().default('Europe/Istanbul'),
  })
  .refine((data) => new Date(data.endDate) > new Date(data.startDate), {
    message: 'Bitis tarihi baslangic tarihinden sonra olmalidir',
    path: ['endDate'],
  });

const lotSchema = z.object({
  title: z.string().min(3, 'Lot basligi en az 3 karakter olmalidir').max(200),
  description: z.string().min(10, 'Lot aciklamasi en az 10 karakter olmalidir').max(5000),
  productId: z.string().uuid('Gecerli bir urun ID giriniz'),
  startingPrice: moneySchema,
  estimateLow: moneySchema.optional(),
  estimateHigh: moneySchema.optional(),
  reservePrice: z
    .object({
      amount: moneySchema,
      isPublic: z.boolean().default(false),
    })
    .optional(),
  sortOrder: z.number().int().min(0).default(0),
});

/** Create auction schema */
export const createAuctionSchema = z.object({
  title: z
    .string()
    .min(5, 'Muzayede basligi en az 5 karakter olmalidir')
    .max(200, 'Muzayede basligi en fazla 200 karakter olmalidir'),
  description: z
    .string()
    .min(20, 'Aciklama en az 20 karakter olmalidir')
    .max(10000, 'Aciklama en fazla 10000 karakter olmalidir'),
  type: z.enum(['english', 'dutch', 'sealed_bid', 'vickrey', 'timed', 'hybrid'], {
    errorMap: () => ({ message: 'Gecerli bir muzayede tipi seciniz' }),
  }),
  schedule: auctionScheduleSchema,
  antiSnipeConfig: antiSnipeConfigSchema.optional(),
  startingPrice: moneySchema,
  buyNowPrice: moneySchema.optional(),
  bidIncrement: moneySchema,
  reservePrice: z
    .object({
      amount: moneySchema,
      isPublic: z.boolean().default(false),
    })
    .optional(),
  lots: z.array(lotSchema).optional(),
  categoryId: z.string().uuid('Gecerli bir kategori ID giriniz'),
  tags: z.array(z.string().max(50)).max(20, 'En fazla 20 etiket eklenebilir').optional(),
  coverImageUrl: z.string().url('Gecerli bir gorsel URL giriniz').optional(),
  galleryUrls: z.array(z.string().url()).max(50).optional(),
  depositAmount: moneySchema.optional(),
  commissionRate: z
    .number()
    .min(0, 'Komisyon orani 0 veya daha buyuk olmalidir')
    .max(50, 'Komisyon orani %50 yi gecemez')
    .default(10),
  termsAndConditions: z.string().max(20000).optional(),
});

/** Update auction schema (partial) */
export const updateAuctionSchema = createAuctionSchema.partial().extend({
  id: z.string().uuid(),
});

/** Filter / search auctions */
export const auctionFilterSchema = paginationSchema.extend({
  query: z.string().max(200).optional(),
  type: z.enum(['english', 'dutch', 'sealed_bid', 'vickrey', 'timed', 'hybrid']).optional(),
  status: z
    .enum(['draft', 'published', 'pre_bid', 'live', 'completed', 'cancelled'])
    .optional(),
  categoryId: z.string().uuid().optional(),
  auctioneerId: z.string().uuid().optional(),
  minPrice: z.number({ coerce: true }).min(0).optional(),
  maxPrice: z.number({ coerce: true }).min(0).optional(),
  currency: z.enum(['TRY', 'USD', 'EUR', 'GBP']).default('TRY'),
  startDateFrom: z.string().datetime().optional(),
  startDateTo: z.string().datetime().optional(),
  featured: z.boolean().optional(),
  hasReserve: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
});

export type CreateAuctionInput = z.infer<typeof createAuctionSchema>;
export type UpdateAuctionInput = z.infer<typeof updateAuctionSchema>;
export type AuctionFilterInput = z.infer<typeof auctionFilterSchema>;
