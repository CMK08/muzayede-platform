// ---------------------------------------------------------------------------
// Product Validation Schemas
// ---------------------------------------------------------------------------

import { z } from 'zod';
import { moneySchema, paginationSchema } from './common';

const productAttributeSchema = z.object({
  key: z.string().min(1).max(100),
  value: z.string().min(1).max(500),
  unit: z.string().max(20).optional(),
  group: z.string().max(100).optional(),
});

const dimensionsSchema = z.object({
  width: z.number().positive('Genislik pozitif olmalidir'),
  height: z.number().positive('Yukseklik pozitif olmalidir'),
  depth: z.number().positive('Derinlik pozitif olmalidir'),
  unit: z.enum(['cm', 'in']).default('cm'),
});

const weightSchema = z.object({
  value: z.number().positive('Agirlik pozitif olmalidir'),
  unit: z.enum(['kg', 'lb']).default('kg'),
});

/** Create product schema */
export const createProductSchema = z.object({
  title: z
    .string()
    .min(3, 'Urun basligi en az 3 karakter olmalidir')
    .max(200, 'Urun basligi en fazla 200 karakter olmalidir'),
  description: z
    .string()
    .min(20, 'Aciklama en az 20 karakter olmalidir')
    .max(10000, 'Aciklama en fazla 10000 karakter olmalidir'),
  shortDescription: z.string().max(500).optional(),
  categoryId: z.string().uuid('Gecerli bir kategori ID giriniz'),
  condition: z.enum(
    ['new', 'like_new', 'excellent', 'very_good', 'good', 'fair', 'poor', 'for_parts'],
    { errorMap: () => ({ message: 'Gecerli bir urun durumu seciniz' }) },
  ),
  tags: z.array(z.string().max(50)).max(20, 'En fazla 20 etiket eklenebilir').optional(),
  attributes: z.array(productAttributeSchema).max(50).optional(),
  estimatedValueLow: moneySchema.optional(),
  estimatedValueHigh: moneySchema.optional(),
  startingPrice: moneySchema.optional(),
  dimensions: dimensionsSchema.optional(),
  weight: weightSchema.optional(),
  origin: z.string().max(100).optional(),
  year: z
    .number()
    .int()
    .min(0, 'Yil 0 veya daha buyuk olmalidir')
    .max(new Date().getFullYear(), 'Yil gelecekte olamaz')
    .optional(),
  artist: z.string().max(200).optional(),
  mediaUrls: z
    .array(z.string().url('Gecerli bir medya URL giriniz'))
    .min(1, 'En az bir gorsel eklemelisiniz')
    .max(50, 'En fazla 50 medya dosyasi eklenebilir'),
});

/** Update product schema (partial) */
export const updateProductSchema = createProductSchema.partial().extend({
  id: z.string().uuid(),
});

/** Bulk upload CSV/JSON validation */
export const bulkUploadSchema = z.object({
  products: z
    .array(
      z.object({
        title: z.string().min(3).max(200),
        description: z.string().min(20).max(10000),
        categoryId: z.string().uuid(),
        condition: z.enum([
          'new',
          'like_new',
          'excellent',
          'very_good',
          'good',
          'fair',
          'poor',
          'for_parts',
        ]),
        estimatedValueLow: moneySchema.optional(),
        estimatedValueHigh: moneySchema.optional(),
        origin: z.string().max(100).optional(),
        year: z.number().int().optional(),
        artist: z.string().max(200).optional(),
        mediaUrls: z.array(z.string().url()).min(1),
      }),
    )
    .min(1, 'En az bir urun eklemelisiniz')
    .max(500, 'Tek seferde en fazla 500 urun yuklenebilir'),
});

/** Product search / filter */
export const productFilterSchema = paginationSchema.extend({
  query: z.string().max(200).optional(),
  categoryId: z.string().uuid().optional(),
  condition: z
    .enum(['new', 'like_new', 'excellent', 'very_good', 'good', 'fair', 'poor', 'for_parts'])
    .optional(),
  sellerId: z.string().uuid().optional(),
  minPrice: z.number({ coerce: true }).min(0).optional(),
  maxPrice: z.number({ coerce: true }).min(0).optional(),
  currency: z.enum(['TRY', 'USD', 'EUR', 'GBP']).default('TRY'),
  tags: z.array(z.string()).optional(),
  isVerified: z.boolean().optional(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type BulkUploadInput = z.infer<typeof bulkUploadSchema>;
export type ProductFilterInput = z.infer<typeof productFilterSchema>;
