/**
 * Dashboard Yonlendirme Sayfasi (Dashboard Redirect Page)
 *
 * Kullanici rolune gore uygun panele otomatik yonlendirme yapar:
 * - ADMIN veya SUPER_ADMIN -> /admin/dashboard (yonetici paneli)
 * - Diger roller -> /profile (kullanici profili)
 *
 * Yonlendirme gerceklesene kadar bir yukleniyor animasyonu gosterir.
 */
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { useAuthStore } from "@/stores/auth-store";

export default function DashboardRedirectPage() {
  const router = useRouter();
  const locale = useLocale();
  // Auth store'dan kullanici bilgilerini al (rol kontrolu icin)
  const { user } = useAuthStore();

  // Kullanici rolune gore yonlendirme yap
  useEffect(() => {
    const role = user?.role;
    if (role === "SUPER_ADMIN" || role === "ADMIN") {
      router.replace(`/${locale}/admin/dashboard`);
    } else {
      router.replace(`/${locale}/profile`);
    }
  }, [user, router, locale]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
    </div>
  );
}
