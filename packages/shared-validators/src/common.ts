// ---------------------------------------------------------------------------
// Common Validation Schemas
// ---------------------------------------------------------------------------

import { z } from 'zod';

/** Pagination query parameters */
export const paginationSchema = z.object({
  page: z
    .number({ coerce: true })
    .int()
    .min(1, 'Sayfa numarasi en az 1 olmalidir')
    .default(1),
  perPage: z
    .number({ coerce: true })
    .int()
    .min(1)
    .max(100, 'Sayfa basina en fazla 100 kayit getirilebilir')
    .default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

/** Date range filter */
export const dateRangeSchema = z
  .object({
    startDate: z.string().datetime({ message: 'Gecerli bir baslangic tarihi giriniz (ISO 8601)' }),
    endDate: z.string().datetime({ message: 'Gecerli bir bitis tarihi giriniz (ISO 8601)' }),
  })
  .refine((data) => new Date(data.endDate) > new Date(data.startDate), {
    message: 'Bitis tarihi baslangic tarihinden sonra olmalidir',
    path: ['endDate'],
  });

/** Price range filter */
export const priceRangeSchema = z
  .object({
    minPrice: z
      .number({ coerce: true })
      .min(0, 'Minimum fiyat 0 veya daha buyuk olmalidir')
      .optional(),
    maxPrice: z
      .number({ coerce: true })
      .min(0, 'Maksimum fiyat 0 veya daha buyuk olmalidir')
      .optional(),
    currency: z.enum(['TRY', 'USD', 'EUR', 'GBP']).default('TRY'),
  })
  .refine(
    (data) => {
      if (data.minPrice != null && data.maxPrice != null) {
        return data.maxPrice >= data.minPrice;
      }
      return true;
    },
    {
      message: 'Maksimum fiyat minimum fiyattan buyuk veya esit olmalidir',
      path: ['maxPrice'],
    },
  );

/** Monetary value */
export const moneySchema = z.object({
  amount: z.number().min(0, 'Tutar 0 veya daha buyuk olmalidir'),
  currency: z.enum(['TRY', 'USD', 'EUR', 'GBP']),
});

export type PaginationInput = z.infer<typeof paginationSchema>;
export type DateRangeInput = z.infer<typeof dateRangeSchema>;
export type PriceRangeInput = z.infer<typeof priceRangeSchema>;
