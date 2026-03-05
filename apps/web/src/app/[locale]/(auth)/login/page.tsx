/**
 * Giris Sayfasi (Login Page)
 *
 * Kullanicilarin platforma giris yapmasini saglayan kimlik dogrulama sayfasidir.
 *
 * Desteklenen giris yontemleri:
 * - E-posta + sifre ile giris
 * - Telefon + sifre ile giris
 * - OTP (tek kullanimlik sifre) ile giris
 * - OAuth (Google, Apple, Facebook) ile giris
 *
 * Giris sonrasi kullanici rolune gore yonlendirme yapilir:
 * - ADMIN/SUPER_ADMIN -> admin paneline
 * - Diger roller -> ana sayfaya
 * - callbackUrl varsa -> belirtilen sayfaya
 */
"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Mail, Lock, Phone, Eye, EyeOff } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/stores/auth-store";

// Zod ile e-posta giris formu dogrulama semasi
const loginSchema = z.object({
  email: z.string().email("Gecerli bir e-posta adresi girin"),
  password: z.string().min(8, "Sifre en az 8 karakter olmalidir"),
});

export default function LoginPage() {
  const locale = useLocale();
  const t = useTranslations("auth");
  const router = useRouter();
  // Giris sonrasi yonlendirme URL'si icin query parametrelerini oku
  const searchParams = useSearchParams();
  // Zustand auth store'dan giris fonksiyonu ve durum bilgilerini al
  const { login, isLoading, error, clearError } = useAuthStore();

  // Aktif giris yontemi (e-posta, telefon veya OTP)
  const [loginMethod, setLoginMethod] = useState<"email" | "phone" | "otp">(
    "email"
  );
  const [showPassword, setShowPassword] = useState(false); // Sifre goster/gizle
  // Form alanlari icin state
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    phone: "",
    otp: "",
    rememberMe: false,
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

  // Form gonderildiginde dogrulama yap ve giris API'sini cagir
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (loginMethod === "email") {
      // Zod ile form verilerini dogrula
      const result = loginSchema.safeParse({
        email: formData.email,
        password: formData.password,
      });

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
        // Auth store uzerinden giris API'sine istek gonder
        await login({
          email: formData.email,
          password: formData.password,
        });
        // Giris basarili olduktan sonra yonlendirme hedefini belirle
        const explicitCallback = searchParams.get("callbackUrl");
        if (explicitCallback) {
          router.push(explicitCallback);
        } else {
          const { user: loggedInUser } = useAuthStore.getState();
          const role = loggedInUser?.role;
          if (role === "SUPER_ADMIN" || role === "ADMIN") {
            router.push(`/${locale}/admin/dashboard`);
          } else {
            router.push(`/${locale}`);
          }
        }
      } catch {
        // Error is handled by the store
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="font-display text-2xl font-bold">{t("loginTitle")}</h1>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
          {t("loginSubtitle")}
        </p>
      </div>

      {/* Login Method Tabs */}
      <div className="flex rounded-lg border border-[var(--border)] p-1">
        <button
          className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
            loginMethod === "email"
              ? "bg-primary-500 text-white"
              : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          }`}
          onClick={() => setLoginMethod("email")}
        >
          <Mail className="mr-1.5 inline h-4 w-4" />
          E-posta
        </button>
        <button
          className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
            loginMethod === "phone"
              ? "bg-primary-500 text-white"
              : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          }`}
          onClick={() => setLoginMethod("phone")}
        >
          <Phone className="mr-1.5 inline h-4 w-4" />
          Telefon
        </button>
        <button
          className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
            loginMethod === "otp"
              ? "bg-primary-500 text-white"
              : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          }`}
          onClick={() => setLoginMethod("otp")}
        >
          OTP
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-500">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {loginMethod === "email" && (
          <>
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
                autoComplete="current-password"
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
          </>
        )}

        {loginMethod === "phone" && (
          <>
            <Input
              name="phone"
              type="tel"
              label={t("phone")}
              placeholder="+90 5XX XXX XX XX"
              value={formData.phone}
              onChange={handleChange}
              icon={<Phone className="h-4 w-4" />}
            />
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
                autoComplete="current-password"
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
          </>
        )}

        {loginMethod === "otp" && (
          <>
            <Input
              name="phone"
              type="tel"
              label={t("emailOrPhone")}
              placeholder="+90 5XX XXX XX XX veya ornek@email.com"
              value={formData.phone}
              onChange={handleChange}
              icon={<Phone className="h-4 w-4" />}
            />
            <Input
              name="otp"
              type="text"
              label={t("otpTitle")}
              placeholder={t("otpPlaceholder")}
              value={formData.otp}
              onChange={handleChange}
              maxLength={6}
              className="text-center text-2xl tracking-[0.5em]"
            />
            <Button type="button" variant="outline" className="w-full" size="sm">
              {t("resendOtp")}
            </Button>
          </>
        )}

        {/* Remember Me & Forgot Password */}
        {loginMethod !== "otp" && (
          <div className="flex items-center justify-between">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="rememberMe"
                checked={formData.rememberMe}
                onChange={handleChange}
                className="h-4 w-4 rounded border-[var(--border)] text-primary-500"
              />
              {t("rememberMe")}
            </label>
            <Link
              href={`/${locale}/forgot-password`}
              className="text-sm text-primary-500 hover:text-primary-600"
            >
              {t("forgotPassword")}
            </Link>
          </div>
        )}

        {/* Submit Button */}
        <Button
          type="submit"
          className="w-full"
          size="lg"
          loading={isLoading}
        >
          {loginMethod === "otp" ? t("verifyOtp") : t("loginButton")}
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
      <div className="space-y-2">
        <Button variant="outline" className="w-full" type="button">
          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
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
          {t("continueWithGoogle")}
        </Button>

        <Button variant="outline" className="w-full" type="button">
          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
          </svg>
          {t("continueWithApple")}
        </Button>

        <Button variant="outline" className="w-full" type="button">
          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="#1877F2">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
          {t("continueWithFacebook")}
        </Button>
      </div>

      {/* Register Link */}
      <p className="text-center text-sm text-[var(--muted-foreground)]">
        {t("noAccount")}{" "}
        <Link
          href={`/${locale}/register`}
          className="font-medium text-primary-500 hover:text-primary-600"
        >
          {t("createAccount")}
        </Link>
      </p>
    </div>
  );
}
