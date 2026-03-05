/**
 * Kayit Sayfasi (Register Page)
 *
 * Yeni kullanicilarin platforma uye olmasini saglayan kayit formudur.
 *
 * Ozellikler:
 * - Ad, soyad, e-posta, telefon ve sifre alanlari
 * - Zod ile kapsamli form dogrulamasi
 * - Sifre guc gostergesi (zayif/orta/iyi/guclu/cok guclu)
 * - KVKK ve kullanim sartlari onay kutucuklari
 * - OAuth ile kayit (Google, Apple, Facebook)
 * - Basarili kayit sonrasi profil sayfasina yonlendirme
 */
"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Mail, Lock, Phone, User, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/stores/auth-store";

/**
 * Kayit formu dogrulama semasi (Zod)
 * - Ad/soyad: en az 2 karakter
 * - E-posta: gecerli format
 * - Telefon: en az 10 karakter, sadece rakam/bosluk/tire
 * - Sifre: en az 8 karakter, bir buyuk harf ve bir rakam icermeli
 * - Sifre onay: sifreyle eslesme kontrolu
 * - KVKK ve kullanim sartlari onayi zorunlu
 */
const registerSchema = z
  .object({
    firstName: z.string().min(2, "Ad en az 2 karakter olmalidir"),
    lastName: z.string().min(2, "Soyad en az 2 karakter olmalidir"),
    email: z.string().email("Gecerli bir e-posta adresi girin"),
    phone: z
      .string()
      .min(10, "Gecerli bir telefon numarasi girin")
      .regex(/^[+]?[\d\s-]+$/, "Gecerli bir telefon numarasi girin"),
    password: z
      .string()
      .min(8, "Sifre en az 8 karakter olmalidir")
      .regex(/[A-Z]/, "Sifre en az bir buyuk harf icermeli")
      .regex(/[0-9]/, "Sifre en az bir rakam icermeli"),
    confirmPassword: z.string(),
    kvkkConsent: z.literal(true, {
      errorMap: () => ({ message: "KVKK onayı zorunludur" }),
    }),
    termsConsent: z.literal(true, {
      errorMap: () => ({ message: "Kullanim sartlari onayı zorunludur" }),
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Sifreler eslesmiyor",
    path: ["confirmPassword"],
  });

export default function RegisterPage() {
  const locale = useLocale();
  const t = useTranslations("auth");
  const router = useRouter();

  // Zustand auth store'dan kayit fonksiyonu ve durum bilgilerini al
  const { register, isLoading, error, clearError } = useAuthStore();

  const [showPassword, setShowPassword] = useState(false); // Sifre goster/gizle
  const [showConfirmPassword, setShowConfirmPassword] = useState(false); // Sifre onay goster/gizle
  // Form alanlari icin state
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    kvkkConsent: false,
    termsConsent: false,
  });
  // Form dogrulama hata mesajlari
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});

  // Form alani degistiginde state'i guncelle ve ilgili dogrulama hatasini temizle
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    setValidationErrors((prev) => ({ ...prev, [name]: "" }));
    clearError();
  };

  // Form gonderildiginde dogrulama yap ve kayit API'sini cagir
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Zod ile tum form verilerini dogrula
    const result = registerSchema.safeParse(formData);
    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          errors[String(err.path[0])] = err.message;
        }
      });
      setValidationErrors(errors);
      return;
    }

    try {
      // Auth store uzerinden kayit API'sine istek gonder
      await register({
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        kvkkConsent: formData.kvkkConsent,
      });
      router.push(`/${locale}/profile`);
    } catch {
      // Error is handled by the store
    }
  };

  // Sifre guc gostergesi - sifrenin karmasikligina gore puan ve etiket dondurur
  const getPasswordStrength = (
    password: string
  ): { score: number; label: string; color: string } => {
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 1) return { score, label: "Zayif", color: "bg-red-500" };
    if (score <= 2) return { score, label: "Orta", color: "bg-amber-500" };
    if (score <= 3) return { score, label: "Iyi", color: "bg-yellow-500" };
    if (score <= 4) return { score, label: "Guclu", color: "bg-emerald-500" };
    return { score, label: "Cok Guclu", color: "bg-green-600" };
  };

  const passwordStrength = getPasswordStrength(formData.password);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="font-display text-2xl font-bold">
          {t("registerTitle")}
        </h1>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
          {t("registerSubtitle")}
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-500">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name Fields */}
        <div className="grid grid-cols-2 gap-4">
          <Input
            name="firstName"
            type="text"
            label={t("firstName")}
            placeholder="Ahmet"
            value={formData.firstName}
            onChange={handleChange}
            icon={<User className="h-4 w-4" />}
            error={validationErrors.firstName}
            autoComplete="given-name"
          />
          <Input
            name="lastName"
            type="text"
            label={t("lastName")}
            placeholder="Yilmaz"
            value={formData.lastName}
            onChange={handleChange}
            error={validationErrors.lastName}
            autoComplete="family-name"
          />
        </div>

        {/* Email */}
        <Input
          name="email"
          type="email"
          label={t("email")}
          placeholder="ornek@email.com"
          value={formData.email}
          onChange={handleChange}
          icon={<Mail className="h-4 w-4" />}
          error={validationErrors.email}
          autoComplete="email"
        />

        {/* Phone */}
        <Input
          name="phone"
          type="tel"
          label={t("phone")}
          placeholder="+90 5XX XXX XX XX"
          value={formData.phone}
          onChange={handleChange}
          icon={<Phone className="h-4 w-4" />}
          error={validationErrors.phone}
          autoComplete="tel"
        />

        {/* Password */}
        <div className="relative">
          <Input
            name="password"
            type={showPassword ? "text" : "password"}
            label={t("password")}
            placeholder="********"
            value={formData.password}
            onChange={handleChange}
            icon={<Lock className="h-4 w-4" />}
            error={validationErrors.password}
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-9 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Password Strength */}
        {formData.password && (
          <div className="space-y-2">
            <div className="flex gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 flex-1 rounded-full ${
                    i < passwordStrength.score
                      ? passwordStrength.color
                      : "bg-[var(--muted)]"
                  }`}
                />
              ))}
            </div>
            <p className="text-xs text-[var(--muted-foreground)]">
              Sifre gucu: {passwordStrength.label}
            </p>
            <div className="space-y-1 text-xs text-[var(--muted-foreground)]">
              <div className="flex items-center gap-1">
                <CheckCircle2
                  className={`h-3 w-3 ${
                    formData.password.length >= 8
                      ? "text-emerald-500"
                      : "text-[var(--muted-foreground)]"
                  }`}
                />
                En az 8 karakter
              </div>
              <div className="flex items-center gap-1">
                <CheckCircle2
                  className={`h-3 w-3 ${
                    /[A-Z]/.test(formData.password)
                      ? "text-emerald-500"
                      : "text-[var(--muted-foreground)]"
                  }`}
                />
                En az bir buyuk harf
              </div>
              <div className="flex items-center gap-1">
                <CheckCircle2
                  className={`h-3 w-3 ${
                    /[0-9]/.test(formData.password)
                      ? "text-emerald-500"
                      : "text-[var(--muted-foreground)]"
                  }`}
                />
                En az bir rakam
              </div>
            </div>
          </div>
        )}

        {/* Confirm Password */}
        <div className="relative">
          <Input
            name="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            label={t("confirmPassword")}
            placeholder="********"
            value={formData.confirmPassword}
            onChange={handleChange}
            icon={<Lock className="h-4 w-4" />}
            error={validationErrors.confirmPassword}
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-9 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          >
            {showConfirmPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Consent Checkboxes */}
        <div className="space-y-3">
          <label className="flex cursor-pointer items-start gap-2 text-sm">
            <input
              type="checkbox"
              name="kvkkConsent"
              checked={formData.kvkkConsent}
              onChange={handleChange}
              className="mt-0.5 h-4 w-4 rounded border-[var(--border)] text-primary-500"
            />
            <span>
              <Link
                href={`/${locale}/kvkk`}
                className="text-primary-500 hover:underline"
                target="_blank"
              >
                KVKK Aydinlatma Metni
              </Link>
              &apos;ni okudum ve kabul ediyorum
            </span>
          </label>
          {validationErrors.kvkkConsent && (
            <p className="text-xs text-red-500">
              {validationErrors.kvkkConsent}
            </p>
          )}

          <label className="flex cursor-pointer items-start gap-2 text-sm">
            <input
              type="checkbox"
              name="termsConsent"
              checked={formData.termsConsent}
              onChange={handleChange}
              className="mt-0.5 h-4 w-4 rounded border-[var(--border)] text-primary-500"
            />
            <span>
              <Link
                href={`/${locale}/terms`}
                className="text-primary-500 hover:underline"
                target="_blank"
              >
                Kullanim Sartlari
              </Link>
              &apos;ni kabul ediyorum
            </span>
          </label>
          {validationErrors.termsConsent && (
            <p className="text-xs text-red-500">
              {validationErrors.termsConsent}
            </p>
          )}
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          className="w-full"
          size="lg"
          loading={isLoading}
        >
          {t("registerButton")}
        </Button>
      </form>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[var(--border)]" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-[var(--background)] px-2 text-[var(--muted-foreground)]">
            {t("orContinueWith")}
          </span>
        </div>
      </div>

      {/* OAuth Buttons */}
      <div className="grid grid-cols-3 gap-2">
        <Button variant="outline" type="button" className="w-full">
          <svg className="h-4 w-4" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
        </Button>
        <Button variant="outline" type="button" className="w-full">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
          </svg>
        </Button>
        <Button variant="outline" type="button" className="w-full">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="#1877F2">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
        </Button>
      </div>

      {/* Login Link */}
      <p className="text-center text-sm text-[var(--muted-foreground)]">
        {t("hasAccount")}{" "}
        <Link
          href={`/${locale}/login`}
          className="font-medium text-primary-500 hover:text-primary-600"
        >
          {t("loginHere")}
        </Link>
      </p>
    </div>
  );
}
