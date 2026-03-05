/**
 * Header (Ust Menu) Bileseni
 *
 * Uygulamanin tum sayfalarda gorunen ust navigasyon cubugunu olusturur.
 * Icerir:
 * - Ust bilgi cubugu (yardim hatti, calisma saatleri - sadece masaustu)
 * - Logo ve ana navigasyon linkleri
 * - Arama cubugu (acilir/kapanir)
 * - Tema degistirme (acik/koyu mod)
 * - Dil secici (Turkce, English, Arapca)
 * - Bildirim ikonu (giris yapmis kullanicilar icin)
 * - Kullanici menusu veya giris/kayit butonlari
 * - Mobil navigasyon menusu
 */
"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import {
  Search,
  Sun,
  Moon,
  Globe,
  User,
  LogOut,
  Settings,
  Heart,
  Gavel,
  Bell,
  Menu,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";
import { MobileNav } from "./mobile-nav";

// Desteklenen diller listesi - dil secici acilir menude kullanilir
const languages = [
  { code: "tr", label: "Turkce", flag: "🇹🇷" },
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "ar", label: "العربية", flag: "🇸🇦" },
];

export function Header() {
  // Aktif dil kodu (tr, en, ar)
  const locale = useLocale();
  // Genel (common) ceviri fonksiyonu
  const t = useTranslations("common");
  // Tema bilgisi ve degistirme fonksiyonu (acik/koyu mod)
  const { theme, setTheme } = useTheme();
  // Kimlik dogrulama bilgileri - kullanici, giris durumu ve cikis fonksiyonu
  const { user, isAuthenticated, logout } = useAuthStore();

  // Arama cubugunun gorunurluk durumu
  const [showSearch, setShowSearch] = useState(false);
  // Dil secici acilir menunun gorunurluk durumu
  const [showLangMenu, setShowLangMenu] = useState(false);
  // Kullanici profil acilir menusunun gorunurluk durumu
  const [showUserMenu, setShowUserMenu] = useState(false);
  // Mobil navigasyon menusunun gorunurluk durumu
  const [showMobileNav, setShowMobileNav] = useState(false);

  // --- Ana Navigasyon Ogeleri ---
  const navItems = [
    { href: `/${locale}`, label: t("home") },
    { href: `/${locale}/auctions`, label: t("auctions") },
    { href: `/${locale}/auctions?status=upcoming`, label: t("upcoming") },
    { href: `/${locale}/auctions?category=featured`, label: t("featured") },
  ];

  // --- JSX Render ---
  return (
    <>
      {/* --- Yapisan (sticky) Header ---
          Sayfa kaydirildiginda ust kisimda sabit kalir, arka plan bulanik efekti uygulanir */}
      <header className="sticky top-0 z-40 w-full border-b border-[var(--border)] bg-[var(--background)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--background)]/60">
        {/* --- Ust Bilgi Cubugu ---
            Karsilama mesaji, yardim hatti ve calisma saatlerini gosterir.
            Sadece masaustunde (lg ve uzeri) gorunur */}
        <div className="hidden border-b border-[var(--border)] bg-navy-950 text-white lg:block">
          <div className="mx-auto flex h-8 max-w-7xl items-center justify-between px-4 text-xs">
            <p>{t("welcomeMessage")}</p>
            <div className="flex items-center gap-4">
              <span>{t("helpLine")}: 0850 123 45 67</span>
              <span>|</span>
              <span>{t("workingHours")}: 09:00 - 22:00</span>
            </div>
          </div>
        </div>

        {/* --- Ana Header Alani ---
            Logo, navigasyon linkleri ve sag taraftaki aksiyonlari icerir */}
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          {/* --- Sol Kisim: Logo ve Navigasyon --- */}
          <div className="flex items-center gap-8">
            {/* Mobil Menu Butonu - sadece kucuk ekranlarda gorunur */}
            <button
              className="lg:hidden"
              onClick={() => setShowMobileNav(true)}
            >
              <Menu className="h-6 w-6" />
            </button>

            {/* --- Logo ---
                Cekic ikonu ve "Muzayede" marka ismi.
                Marka ismi sadece sm ve uzerinde gorunur */}
            <Link href={`/${locale}`} className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-500">
                <Gavel className="h-5 w-5 text-white" />
              </div>
              <span className="hidden font-display text-xl font-bold sm:block">
                <span className="text-gold-gradient">Muzayede</span>
              </span>
            </Link>

            {/* --- Masaustu Navigasyon Linkleri ---
                Ana sayfa, muzayedeler, yaklasan, one cikanlar */}
            <nav className="hidden items-center gap-1 lg:flex">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* --- Sag Kisim: Aksiyon Butonlari --- */}
          <div className="flex items-center gap-2">
            {/* --- Arama Butonu ---
                Tiklandiginda header altinda arama cubugu acilir/kapanir */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSearch(!showSearch)}
              className="hidden sm:flex"
            >
              <Search className="h-5 w-5" />
            </Button>

            {/* --- Tema Degistirme Butonu ---
                Gunes (acik mod) ve Ay (koyu mod) ikonlari arasinda gecis yapar.
                CSS transition ile ikon animasyonu uygulanir */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </Button>

            {/* --- Dil Secici (Dropdown) ---
                Dunya ikonu tiklandiginda dil listesini acar.
                Secilen dil vurgulanir; tiklama ile dil degistirilir.
                Arka plandaki gorunmez katman, menu disina tiklandiginda kapatir */}
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowLangMenu(!showLangMenu)}
              >
                <Globe className="h-5 w-5" />
              </Button>

              {showLangMenu && (
                <>
                  {/* Menu disina tiklandiginda kapatmak icin gorunmez katman */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowLangMenu(false)}
                  />
                  <div className="absolute right-0 top-full z-50 mt-1 w-40 rounded-lg border border-[var(--border)] bg-[var(--card)] py-1 shadow-lg">
                    {languages.map((lang) => (
                      <Link
                        key={lang.code}
                        href={`/${lang.code}`}
                        className={cn(
                          "flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-[var(--muted)]",
                          locale === lang.code && "bg-primary-500/10 text-primary-500"
                        )}
                        onClick={() => setShowLangMenu(false)}
                      >
                        <span>{lang.flag}</span>
                        <span>{lang.label}</span>
                      </Link>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* --- Bildirim Ikonu ---
                Sadece giris yapmis kullanicilar icin gorunur.
                Sag ustte kirmizi rozet ile okunmamis bildirim sayisini gosterir */}
            {isAuthenticated && (
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
                  3
                </span>
              </Button>
            )}

            {/* --- Kullanici Menusu / Giris-Kayit Butonlari ---
                Giris yapmissa: Avatar, isim ve dropdown menu gosterilir
                Giris yapmamissa: Giris Yap ve Kayit Ol butonlari gosterilir */}
            {isAuthenticated && user ? (
              <div className="relative">
                {/* Kullanici avatari ve ismi - tiklandiginda dropdown acilir */}
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-[var(--muted)]"
                >
                  {/* Avatar: Isim ve soyismin bas harflerinden olusur */}
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-500 text-sm font-medium text-white">
                    {user.firstName[0]}
                    {user.lastName[0]}
                  </div>
                  <span className="hidden text-sm font-medium md:block">
                    {user.firstName}
                  </span>
                  <ChevronDown className="hidden h-4 w-4 md:block" />
                </button>

                {/* --- Kullanici Dropdown Menusu --- */}
                {showUserMenu && (
                  <>
                    {/* Menu disina tiklandiginda kapatmak icin gorunmez katman */}
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowUserMenu(false)}
                    />
                    <div className="absolute right-0 top-full z-50 mt-1 w-56 rounded-lg border border-[var(--border)] bg-[var(--card)] py-1 shadow-lg">
                      {/* Kullanici bilgileri baslik alani */}
                      <div className="border-b border-[var(--border)] px-3 py-2">
                        <p className="text-sm font-medium">
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="text-xs text-[var(--muted-foreground)]">
                          {user.email}
                        </p>
                      </div>

                      {/* Kontrol paneli linki */}
                      <Link
                        href={`/${locale}/dashboard`}
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-[var(--muted)]"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <User className="h-4 w-4" />
                        {t("dashboard")}
                      </Link>

                      {/* Favoriler linki */}
                      <Link
                        href={`/${locale}/favorites`}
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-[var(--muted)]"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <Heart className="h-4 w-4" />
                        {t("watchlist")}
                      </Link>

                      {/* Tekliflerim linki */}
                      <Link
                        href={`/${locale}/my-bids`}
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-[var(--muted)]"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <Gavel className="h-4 w-4" />
                        {t("myBids")}
                      </Link>

                      {/* Ayarlar linki */}
                      <Link
                        href={`/${locale}/profile`}
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-[var(--muted)]"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <Settings className="h-4 w-4" />
                        {t("settings")}
                      </Link>

                      {/* --- Admin Paneli Linki ---
                          Sadece admin rolune sahip kullanicilar icin gorunur */}
                      {user.role === "admin" && (
                        <>
                          <div className="my-1 border-t border-[var(--border)]" />
                          <Link
                            href={`/${locale}/admin/dashboard`}
                            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-primary-500 transition-colors hover:bg-[var(--muted)]"
                            onClick={() => setShowUserMenu(false)}
                          >
                            <Settings className="h-4 w-4" />
                            {t("adminPanel")}
                          </Link>
                        </>
                      )}

                      {/* --- Cikis Yap Butonu ---
                          Menuyu kapatir ve oturumu sonlandirir */}
                      <div className="my-1 border-t border-[var(--border)]" />
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          logout();
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-500 transition-colors hover:bg-[var(--muted)]"
                      >
                        <LogOut className="h-4 w-4" />
                        {t("logout")}
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              /* --- Giris Yapmamis Kullanicilar Icin Butonlar --- */
              <div className="flex items-center gap-2">
                <Link href={`/${locale}/login`}>
                  <Button variant="ghost" size="sm">
                    {t("login")}
                  </Button>
                </Link>
                <Link href={`/${locale}/register`}>
                  <Button size="sm">{t("register")}</Button>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* --- Genisleyen Arama Cubugu ---
            showSearch true oldugunda header altinda kayarak acilir.
            Escape tusuna basildiginda kapatilir */}
        {showSearch && (
          <div className="border-t border-[var(--border)] px-4 py-3 animate-slide-down">
            <div className="mx-auto max-w-2xl">
              <Input
                placeholder={t("searchPlaceholder")}
                icon={<Search className="h-4 w-4" />}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Escape") setShowSearch(false);
                }}
              />
            </div>
          </div>
        )}
      </header>

      {/* --- Mobil Navigasyon Bileseni ---
          Kucuk ekranlarda tam ekran navigasyon menusu gosterir */}
      <MobileNav
        isOpen={showMobileNav}
        onClose={() => setShowMobileNav(false)}
      />
    </>
  );
}
