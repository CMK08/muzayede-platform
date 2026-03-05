/**
 * Admin Panel Layout Bileseni
 *
 * Yonetim panelinin genel sayfa duzeni bu bilesende tanimlanir.
 * Sol tarafta navigasyon menusu (sidebar), ust tarafta site Header'i ve
 * ana icerik alani bulunur. Sidebar, mobilde acilir-kapanir (hamburger menu),
 * masaustunde sabit olarak gorunur. Tum admin alt sayfalari bu layout icerisinde render edilir.
 */
"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale } from "next-intl";
import {
  LayoutDashboard,
  Users,
  Gavel,
  Settings,
  Shield,
  Menu,
  X,
  ChevronLeft,
  FileText,
  Package,
  ShoppingCart,
  DollarSign,
  Radio,
} from "lucide-react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";

import { cn } from "@/lib/utils";

/** Layout bileseninin prop tipi - children olarak admin alt sayfalarini alir */
interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const locale = useLocale(); // Aktif dil (tr, en vb.) - linklerde locale prefix'i icin kullanilir
  const pathname = usePathname(); // Aktif sayfa yolu - sidebar'da aktif menunun vurgulanmasi icin
  const [sidebarOpen, setSidebarOpen] = useState(false); // Mobilde sidebar'in acik/kapali durumu

  // --- Sidebar Navigasyon Ogeleri ---
  // Her oge: hedef URL, Turkce etiket ve lucide ikonu icerir
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
    },
    {
      href: `/${locale}/admin/live-auction`,
      label: "Canli Yayin",
      icon: Radio,
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

  // --- JSX Render ---
  return (
    <div className="min-h-screen">
      {/* --- Site Ust Basligi (Header) --- */}
      <Header />

      <div className="flex">
        {/* --- Mobil Sidebar Arka Plan Perdesi: Sidebar acikken tiklayinca kapatir --- */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* --- Sidebar: Sol navigasyon paneli. Mobilde kaydirarak acilir, masaustunde sabit --- */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 w-64 transform border-r border-[var(--border)] bg-navy-950 text-white pt-16 transition-transform duration-200 lg:static lg:z-auto lg:translate-x-0 lg:pt-0",
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          {/* --- Sidebar Ust Kismi: Yonetim paneli logosu ve basligi, mobilde kapatma butonu --- */}
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

          {/* --- Navigasyon Menusu: Her oge icin aktif sayfa kontrolu yapilir --- */}
          <nav className="space-y-1 p-3">
            {navItems.map((item) => {
              // Aktif sayfa kontrolu: tam esleme veya alt sayfa eslesmesi
              // Dashboard icin sadece tam esleme kullanilir (diger /admin/* yollariyla karismasin diye)
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
                </Link>
              );
            })}
          </nav>

          {/* --- Siteye Don Linki: Admin panelinden ana siteye geri donmek icin --- */}
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

        {/* --- Ana Icerik Alani: Admin alt sayfalari burada render edilir --- */}
        <main className="flex-1 bg-[var(--muted)]">
          {/* --- Mobil Menu Butonu: Sadece kucuk ekranlarda gorunur, sidebar'i acar --- */}
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
