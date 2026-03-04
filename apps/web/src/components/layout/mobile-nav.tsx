"use client";

import React from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import {
  X,
  Home,
  Gavel,
  Clock,
  Star,
  User,
  Heart,
  Settings,
  LogOut,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileNav({ isOpen, onClose }: MobileNavProps) {
  const locale = useLocale();
  const t = useTranslations("common");
  const { user, isAuthenticated, logout } = useAuthStore();

  const navItems = [
    { href: `/${locale}`, label: t("home"), icon: Home },
    { href: `/${locale}/auctions`, label: t("auctions"), icon: Gavel },
    {
      href: `/${locale}/auctions?status=upcoming`,
      label: t("upcoming"),
      icon: Clock,
    },
    {
      href: `/${locale}/auctions?category=featured`,
      label: t("featured"),
      icon: Star,
    },
  ];

  const userNavItems = isAuthenticated
    ? [
        { href: `/${locale}/profile`, label: t("dashboard"), icon: User },
        {
          href: `/${locale}/favorites`,
          label: t("watchlist"),
          icon: Heart,
        },
        {
          href: `/${locale}/my-bids`,
          label: t("myBids"),
          icon: Gavel,
        },
        {
          href: `/${locale}/profile`,
          label: t("settings"),
          icon: Settings,
        },
      ]
    : [];

  return (
    <>
      {/* Overlay */}
      <div
        className={cn(
          "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity duration-300 lg:hidden",
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={onClose}
      />

      {/* Sidebar */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-80 transform bg-[var(--card)] shadow-xl transition-transform duration-300 lg:hidden",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] p-4">
          <Link
            href={`/${locale}`}
            className="flex items-center gap-2"
            onClick={onClose}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-500">
              <Gavel className="h-4 w-4 text-white" />
            </div>
            <span className="font-display text-lg font-bold">
              <span className="text-gold-gradient">Muzayede</span>
            </span>
          </Link>
          <button
            onClick={onClose}
            className="rounded-lg p-1 hover:bg-[var(--muted)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search */}
        <div className="border-b border-[var(--border)] p-4">
          <Input
            placeholder={t("searchPlaceholder")}
            icon={<Search className="h-4 w-4" />}
          />
        </div>

        {/* User Info */}
        {isAuthenticated && user && (
          <div className="border-b border-[var(--border)] p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-500 text-sm font-medium text-white">
                {user.firstName[0]}
                {user.lastName[0]}
              </div>
              <div>
                <p className="text-sm font-medium">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  {user.email}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4">
          <div className="space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--muted)]"
                onClick={onClose}
              >
                <item.icon className="h-5 w-5 text-[var(--muted-foreground)]" />
                {item.label}
              </Link>
            ))}
          </div>

          {userNavItems.length > 0 && (
            <>
              <div className="my-4 border-t border-[var(--border)]" />
              <p className="mb-2 px-3 text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                {t("myAccount")}
              </p>
              <div className="space-y-1">
                {userNavItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--muted)]"
                    onClick={onClose}
                  >
                    <item.icon className="h-5 w-5 text-[var(--muted-foreground)]" />
                    {item.label}
                  </Link>
                ))}
              </div>
            </>
          )}
        </nav>

        {/* Bottom Actions */}
        <div className="border-t border-[var(--border)] p-4">
          {isAuthenticated ? (
            <Button
              variant="outline"
              className="w-full text-red-500"
              onClick={() => {
                logout();
                onClose();
              }}
            >
              <LogOut className="mr-2 h-4 w-4" />
              {t("logout")}
            </Button>
          ) : (
            <div className="flex gap-2">
              <Link href={`/${locale}/login`} className="flex-1" onClick={onClose}>
                <Button variant="outline" className="w-full">
                  {t("login")}
                </Button>
              </Link>
              <Link href={`/${locale}/register`} className="flex-1" onClick={onClose}>
                <Button className="w-full">{t("register")}</Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
