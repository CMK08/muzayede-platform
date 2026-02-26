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
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";
import { MobileNav } from "./mobile-nav";

const languages = [
  { code: "tr", label: "Turkce", flag: "🇹🇷" },
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "ar", label: "العربية", flag: "🇸🇦" },
];

export function Header() {
  const locale = useLocale();
  const t = useTranslations("common");
  const { theme, setTheme } = useTheme();
  const { user, isAuthenticated, logout } = useAuthStore();

  const [showSearch, setShowSearch] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileNav, setShowMobileNav] = useState(false);

  const navItems = [
    { href: `/${locale}`, label: t("home") },
    { href: `/${locale}/auctions`, label: t("auctions") },
    { href: `/${locale}/auctions?status=upcoming`, label: t("upcoming") },
    { href: `/${locale}/auctions?category=featured`, label: t("featured") },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-[var(--border)] bg-[var(--background)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--background)]/60">
        {/* Top Bar */}
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

        {/* Main Header */}
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          {/* Left: Logo + Nav */}
          <div className="flex items-center gap-8">
            {/* Mobile Menu Button */}
            <button
              className="lg:hidden"
              onClick={() => setShowMobileNav(true)}
            >
              <Menu className="h-6 w-6" />
            </button>

            {/* Logo */}
            <Link href={`/${locale}`} className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-500">
                <Gavel className="h-5 w-5 text-white" />
              </div>
              <span className="hidden font-display text-xl font-bold sm:block">
                <span className="text-gold-gradient">Muzayede</span>
              </span>
            </Link>

            {/* Desktop Navigation */}
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

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            {/* Search Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSearch(!showSearch)}
              className="hidden sm:flex"
            >
              <Search className="h-5 w-5" />
            </Button>

            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </Button>

            {/* Language Selector */}
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

            {/* Notifications */}
            {isAuthenticated && (
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
                  3
                </span>
              </Button>
            )}

            {/* User Menu / Auth Buttons */}
            {isAuthenticated && user ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-[var(--muted)]"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-500 text-sm font-medium text-white">
                    {user.firstName[0]}
                    {user.lastName[0]}
                  </div>
                  <span className="hidden text-sm font-medium md:block">
                    {user.firstName}
                  </span>
                  <ChevronDown className="hidden h-4 w-4 md:block" />
                </button>

                {showUserMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowUserMenu(false)}
                    />
                    <div className="absolute right-0 top-full z-50 mt-1 w-56 rounded-lg border border-[var(--border)] bg-[var(--card)] py-1 shadow-lg">
                      <div className="border-b border-[var(--border)] px-3 py-2">
                        <p className="text-sm font-medium">
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="text-xs text-[var(--muted-foreground)]">
                          {user.email}
                        </p>
                      </div>

                      <Link
                        href={`/${locale}/dashboard`}
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-[var(--muted)]"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <User className="h-4 w-4" />
                        {t("dashboard")}
                      </Link>

                      <Link
                        href={`/${locale}/dashboard/watchlist`}
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-[var(--muted)]"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <Heart className="h-4 w-4" />
                        {t("watchlist")}
                      </Link>

                      <Link
                        href={`/${locale}/dashboard/bids`}
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-[var(--muted)]"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <Gavel className="h-4 w-4" />
                        {t("myBids")}
                      </Link>

                      <Link
                        href={`/${locale}/dashboard/settings`}
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-[var(--muted)]"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <Settings className="h-4 w-4" />
                        {t("settings")}
                      </Link>

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

        {/* Search Bar (Expandable) */}
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

      {/* Mobile Navigation */}
      <MobileNav
        isOpen={showMobileNav}
        onClose={() => setShowMobileNav(false)}
      />
    </>
  );
}
