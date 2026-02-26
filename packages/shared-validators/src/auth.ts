// ---------------------------------------------------------------------------
// Auth Validation Schemas
// ---------------------------------------------------------------------------

import { z } from 'zod';

/** Login with email + password */
export const loginSchema = z.object({
  email: z
    .string()
    .email('Gecerli bir e-posta adresi giriniz')
    .max(255)
    .transform((v) => v.toLowerCase().trim()),
  password: z.string().min(1, 'Sifre gereklidir'),
  rememberMe: z.boolean().optional().default(false),
});

/** New user registration */
export const registerSchema = z
  .object({
    email: z
      .string()
      .email('Gecerli bir e-posta adresi giriniz')
      .max(255)
      .transform((v) => v.toLowerCase().trim()),
    username: z
      .string()
      .min(3, 'Kullanici adi en az 3 karakter olmalidir')
      .max(30, 'Kullanici adi en fazla 30 karakter olmalidir')
      .regex(
        /^[a-zA-Z0-9_-]+$/,
        'Kullanici adi sadece harf, rakam, tire ve alt cizgi icerebilir',
      ),
    password: z
      .string()
      .min(8, 'Sifre en az 8 karakter olmalidir')
      .max(128, 'Sifre en fazla 128 karakter olmalidir')
      .regex(/[A-Z]/, 'Sifre en az bir buyuk harf icermelidir')
      .regex(/[a-z]/, 'Sifre en az bir kucuk harf icermelidir')
      .regex(/[0-9]/, 'Sifre en az bir rakam icermelidir')
      .regex(/[^A-Za-z0-9]/, 'Sifre en az bir ozel karakter icermelidir'),
    confirmPassword: z.string(),
    acceptTerms: z.literal(true, {
      errorMap: () => ({ message: 'Kullanim kosullarini kabul etmelisiniz' }),
    }),
    preferredLanguage: z.enum(['tr', 'en', 'de', 'fr', 'ar']).default('tr'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Sifreler eslesmiyor',
    path: ['confirmPassword'],
  });

/** OTP / 2FA verification */
export const otpVerifySchema = z.object({
  code: z
    .string()
    .length(6, 'Dogrulama kodu 6 haneli olmalidir')
    .regex(/^\d+$/, 'Dogrulama kodu sadece rakamlardan olusmalidir'),
  sessionToken: z.string().min(1, 'Oturum jetonu gereklidir'),
});

/** Password reset request */
export const passwordResetSchema = z.object({
  email: z
    .string()
    .email('Gecerli bir e-posta adresi giriniz')
    .transform((v) => v.toLowerCase().trim()),
});

/** Set new password after reset */
export const passwordResetConfirmSchema = z
  .object({
    token: z.string().min(1, 'Sifirlama jetonu gereklidir'),
    newPassword: z
      .string()
      .min(8, 'Sifre en az 8 karakter olmalidir')
      .max(128)
      .regex(/[A-Z]/, 'Sifre en az bir buyuk harf icermelidir')
      .regex(/[a-z]/, 'Sifre en az bir kucuk harf icermelidir')
      .regex(/[0-9]/, 'Sifre en az bir rakam icermelidir')
      .regex(/[^A-Za-z0-9]/, 'Sifre en az bir ozel karakter icermelidir'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Sifreler eslesmiyor',
    path: ['confirmPassword'],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type OtpVerifyInput = z.infer<typeof otpVerifySchema>;
export type PasswordResetInput = z.infer<typeof passwordResetSchema>;
export type PasswordResetConfirmInput = z.infer<typeof passwordResetConfirmSchema>;
