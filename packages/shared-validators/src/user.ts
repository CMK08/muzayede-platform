// ---------------------------------------------------------------------------
// User Validation Schemas
// ---------------------------------------------------------------------------

import { z } from 'zod';

const addressSchema = z.object({
  street: z.string().min(3, 'Adres en az 3 karakter olmalidir').max(300),
  city: z.string().min(2, 'Sehir en az 2 karakter olmalidir').max(100),
  state: z.string().max(100).optional(),
  postalCode: z.string().min(3).max(20),
  country: z.string().min(2).max(100),
});

const socialLinksSchema = z.object({
  instagram: z.string().url().optional().or(z.literal('')),
  twitter: z.string().url().optional().or(z.literal('')),
  linkedin: z.string().url().optional().or(z.literal('')),
});

/** Update user profile */
export const updateProfileSchema = z.object({
  displayName: z
    .string()
    .min(2, 'Gorunen ad en az 2 karakter olmalidir')
    .max(50, 'Gorunen ad en fazla 50 karakter olmalidir')
    .optional(),
  bio: z.string().max(1000, 'Biyografi en fazla 1000 karakter olmalidir').optional(),
  companyName: z.string().max(200).optional(),
  phone: z
    .string()
    .regex(
      /^\+?[1-9]\d{1,14}$/,
      'Gecerli bir telefon numarasi giriniz (ornek: +905551234567)',
    )
    .optional(),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Tarih YYYY-MM-DD formatinda olmalidir')
    .optional(),
  address: addressSchema.optional(),
  preferredLanguage: z.enum(['tr', 'en', 'de', 'fr', 'ar']).optional(),
  theme: z.enum(['light', 'dark', 'system']).optional(),
  notificationEmail: z.string().email('Gecerli bir e-posta adresi giriniz').optional(),
  website: z.string().url('Gecerli bir URL giriniz').optional().or(z.literal('')),
  socialLinks: socialLinksSchema.optional(),
});

/** KYC (identity verification) submission */
export const kycSubmitSchema = z.object({
  firstName: z.string().min(2, 'Ad en az 2 karakter olmalidir').max(100),
  lastName: z.string().min(2, 'Soyad en az 2 karakter olmalidir').max(100),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Tarih YYYY-MM-DD formatinda olmalidir'),
  nationality: z.string().min(2).max(100),
  idType: z.enum(['tc_kimlik', 'passport', 'driver_license', 'residence_permit'], {
    errorMap: () => ({ message: 'Gecerli bir kimlik tipi seciniz' }),
  }),
  idNumber: z
    .string()
    .min(5, 'Kimlik numarasi en az 5 karakter olmalidir')
    .max(30),
  /** TC Kimlik Number (11-digit) */
  tckn: z
    .string()
    .length(11, 'TC Kimlik Numarasi 11 haneli olmalidir')
    .regex(/^\d+$/, 'TC Kimlik Numarasi sadece rakamlardan olusmalidir')
    .optional(),
  taxId: z.string().max(30).optional(),
  address: addressSchema,
  idFrontImageUrl: z.string().url('Gecerli bir gorsel URL giriniz'),
  idBackImageUrl: z.string().url('Gecerli bir gorsel URL giriniz').optional(),
  selfieImageUrl: z.string().url('Gecerli bir gorsel URL giriniz'),
  consentGiven: z.literal(true, {
    errorMap: () => ({ message: 'KVKK muvafakatnamesi onaylanmalidir' }),
  }),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type KycSubmitInput = z.infer<typeof kycSubmitSchema>;
