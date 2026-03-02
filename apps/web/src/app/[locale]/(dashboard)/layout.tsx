"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  LayoutDashboard,
  Heart,
  MessageSquare,
  CreditCard,
  Settings,
  HelpCircle,
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

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const locale = useLocale();
  const t = useTranslations("dashboard.sidebar");
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
      href: `/${locale}/dashboard/messages`,
      label: t("messages"),
      icon: MessageSquare,
    },
    {
      href: `/${locale}/dashboard/payments`,
      label: t("payments"),
      icon: CreditCard,
    },
    {
      href: `/${locale}/dashboard/settings`,
      label: t("settings"),
      icon: Settings,
    },
    {
      href: `/${locale}/dashboard/help`,
      label: t("help"),
      icon: HelpCircle,
    },
  ];

  return (
    <div className="min-h-screen">
      <Header />

      <div className="flex">
        {/* Sidebar Overlay (Mobile) */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 w-64 transform border-r border-[var(--border)] bg-[var(--card)] pt-16 transition-transform duration-200 lg:static lg:z-auto lg:translate-x-0 lg:pt-0",
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          {/* Mobile Close Button */}
          <div className="flex items-center justify-between border-b border-[var(--border)] p-4 lg:hidden">
            <span className="font-display font-semibold">Hesabim</span>
            <button onClick={() => setSidebarOpen(false)}>
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="space-y-1 p-4">
            {navItems.map((item) => {
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

          {/* Back to Home */}
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

        {/* Main Content */}
        <main className="flex-1 p-4 lg:p-8">
          {/* Mobile Menu Button */}
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
