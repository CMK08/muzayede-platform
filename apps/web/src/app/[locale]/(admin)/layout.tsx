"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  LayoutDashboard,
  Users,
  Gavel,
  BarChart3,
  Settings,
  Shield,
  Menu,
  X,
  ChevronLeft,
  Bell,
  FileText,
  CreditCard,
  Tag,
  Package,
  ShoppingCart,
  DollarSign,
} from "lucide-react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const locale = useLocale();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = [
    {
      href: `/${locale}/admin/dashboard`,
      label: "Dashboard",
      icon: LayoutDashboard,
    },
    {
      href: `/${locale}/admin/auctions`,
      label: "Muzayedeler",
      icon: Gavel,
      badge: "342",
    },
    {
      href: `/${locale}/admin/users`,
      label: "Kullanicilar",
      icon: Users,
    },
    {
      href: `/${locale}/admin/products`,
      label: "Urunler",
      icon: Package,
    },
    {
      href: `/${locale}/admin/orders`,
      label: "Siparisler",
      icon: ShoppingCart,
    },
    {
      href: `/${locale}/admin/finance`,
      label: "Finans",
      icon: DollarSign,
    },
    {
      href: `/${locale}/admin/cms`,
      label: "Icerik Yonetimi",
      icon: FileText,
    },
    {
      href: `/${locale}/admin/settings`,
      label: "Ayarlar",
      icon: Settings,
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
            "fixed inset-y-0 left-0 z-50 w-64 transform border-r border-[var(--border)] bg-navy-950 text-white pt-16 transition-transform duration-200 lg:static lg:z-auto lg:translate-x-0 lg:pt-0",
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          {/* Admin Header */}
          <div className="flex items-center gap-2 border-b border-white/10 p-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-500">
              <Shield className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold">Yonetim Paneli</p>
              <p className="text-[10px] text-gray-400">Admin Console</p>
            </div>
            <button
              className="ml-auto lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="space-y-1 p-3">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== `/${locale}/admin/dashboard` &&
                  pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary-500/20 text-primary-400"
                      : "text-gray-400 hover:bg-white/5 hover:text-white"
                  )}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="flex-1">{item.label}</span>
                  {item.badge && (
                    <Badge
                      variant="default"
                      className="bg-primary-500/30 text-primary-300 text-[10px]"
                    >
                      {item.badge}
                    </Badge>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Back to Site */}
          <div className="mt-auto border-t border-white/10 p-4">
            <Link
              href={`/${locale}`}
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-white"
            >
              <ChevronLeft className="h-4 w-4" />
              Siteye Don
            </Link>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 bg-[var(--muted)]">
          {/* Mobile Menu Button */}
          <div className="p-4 lg:hidden">
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
