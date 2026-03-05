/**
 * Dashboard Layout Bileseni
 *
 * Kullanici paneli (dashboard) sayfalarini saran ana yapi bileseni.
 * Sol tarafta navigasyon menusu (sidebar) ve sag tarafta icerik alani icerir.
 * Mobil cihazlarda sidebar gizlenir ve hamburger menu butonu ile acilir.
 * Tum dashboard alt sayfalari (profil, tekliflerim, favorilerim vb.) bu layout icinde gosterilir.
 */
"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  LayoutDashboard,
  Heart,
  Settings,
  Menu,
  X,
  TrendingUp,
  ChevronLeft,
  User,
  ShoppingBag,
  Bell,
} from "lucide-react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Dashboard layout bileseninin props tipi */
interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  // Aktif dil bilgisini al (tr, en, ar vb.)
  const locale = useLocale();
  // Sidebar icin ceviri fonksiyonunu yukle
  const t = useTranslations("dashboard.sidebar");
  // Mevcut sayfa yolunu al (aktif menu ogesi belirlemek icin)
  const pathname = usePathname();
  // Mobil cihazlarda sidebar'in acik/kapali durumunu tutan state
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // --- Sidebar Navigasyon Ogeleri ---
  // Her oge: href (sayfa yolu), label (gorunen metin), icon (Lucide ikonu)
  const navItems = [
    {
      href: `/${locale}/dashboard`,
      label: t("overview"),
      icon: LayoutDashboard,
    },
    {
      href: `/${locale}/profile`,
      label: "Profilim",
      icon: User,
    },
    {
      href: `/${locale}/my-bids`,
      label: t("myBids"),
      icon: TrendingUp,
    },
    {
      href: `/${locale}/my-orders`,
      label: "Siparislerim",
      icon: ShoppingBag,
    },
    {
      href: `/${locale}/favorites`,
      label: t("watchlist"),
      icon: Heart,
    },
    {
      href: `/${locale}/notifications`,
      label: "Bildirimler",
      icon: Bell,
    },
    {
      href: `/${locale}/profile`,
      label: t("settings"),
      icon: Settings,
    },
  ];

  // --- JSX Render ---
  return (
    <div className="min-h-screen">
      {/* --- Ust Header Bileseni --- */}
      <Header />

      <div className="flex">
        {/* --- Sidebar Arka Plan Katmani (Sadece Mobil) ---
            Sidebar acikken arka plani karartir, tiklandiginda sidebar kapanir */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* --- Sol Sidebar (Navigasyon Menusu) ---
            Masaustunde her zaman gorunur, mobilde kaydirilarak acilir/kapanir */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 w-64 transform border-r border-[var(--border)] bg-[var(--card)] pt-16 transition-transform duration-200 lg:static lg:z-auto lg:translate-x-0 lg:pt-0",
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          {/* --- Mobil Kapatma Butonu ---
              Sadece mobilde gorunur, sidebar basligini ve kapatma ikonunu icerir */}
          <div className="flex items-center justify-between border-b border-[var(--border)] p-4 lg:hidden">
            <span className="font-display font-semibold">Hesabim</span>
            <button onClick={() => setSidebarOpen(false)}>
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* --- Navigasyon Linkleri ---
              navItems dizisini donguye alarak her menu ogesini olusturur.
              Aktif sayfa vurgulanir (isActive kontrolu ile) */}
          <nav className="space-y-1 p-4">
            {navItems.map((item) => {
              // Mevcut URL ile karsilastirarak aktif sayfa belirlenir
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary-500/10 text-primary-500"
                      : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
                  )}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* --- Ana Sayfaya Donus Linki ---
              Sidebar'in en altinda yer alir */}
          <div className="mt-auto border-t border-[var(--border)] p-4">
            <Link
              href={`/${locale}`}
              className="flex items-center gap-2 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            >
              <ChevronLeft className="h-4 w-4" />
              Ana Sayfaya Don
            </Link>
          </div>
        </aside>

        {/* --- Ana Icerik Alani ---
            Dashboard alt sayfalari burada renderlanir (children) */}
        <main className="flex-1 p-4 lg:p-8">
          {/* --- Mobil Menu Acma Butonu ---
              Sadece mobilde gorunur, sidebar'i acar */}
          <div className="mb-4 lg:hidden">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="mr-2 h-4 w-4" />
              Menu
            </Button>
          </div>

          {children}
        </main>
      </div>
    </div>
  );
}
