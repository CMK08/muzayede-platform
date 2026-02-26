"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale } from "next-intl";
import {
  LayoutDashboard,
  Package,
  DollarSign,
  Gavel,
  Plus,
  Menu,
  X,
  ChevronLeft,
  Store,
} from "lucide-react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SellerLayoutProps {
  children: React.ReactNode;
}

export default function SellerLayout({ children }: SellerLayoutProps) {
  const locale = useLocale();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = [
    {
      href: `/${locale}/seller-dashboard`,
      label: "Dashboard",
      icon: LayoutDashboard,
    },
    {
      href: `/${locale}/my-products`,
      label: "Urunlerim",
      icon: Package,
    },
    {
      href: `/${locale}/earnings`,
      label: "Kazanclarim",
      icon: DollarSign,
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
          {/* Seller Header */}
          <div className="flex items-center gap-2 border-b border-[var(--border)] p-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-500/10">
              <Store className="h-4 w-4 text-primary-500" />
            </div>
            <div>
              <p className="text-sm font-semibold">Satici Paneli</p>
              <p className="text-[10px] text-[var(--muted-foreground)]">Seller Console</p>
            </div>
            <button
              className="ml-auto lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="space-y-1 p-4">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== `/${locale}/seller-dashboard` &&
                  pathname.startsWith(item.href));
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

          {/* Quick Actions */}
          <div className="border-t border-[var(--border)] p-4">
            <Button size="sm" className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              Urun Ekle
            </Button>
          </div>

          {/* Back to Home */}
          <div className="border-t border-[var(--border)] p-4">
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
