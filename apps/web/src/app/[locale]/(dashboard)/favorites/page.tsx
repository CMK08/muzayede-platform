"use client";

import React, { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import {
  Heart,
  Bell,
  BellOff,
  Trash2,
  Gavel,
  Clock,
  Image as ImageIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { formatCurrency, formatRelativeTime } from "@/lib/utils";

interface FavoriteItem {
  id: string;
  auctionId: string;
  title: string;
  image: string | null;
  category: string;
  currentPrice: number;
  status: "active" | "upcoming" | "ended" | "sold";
  endDate: string;
  bidCount: number;
  notifyOnStart: boolean;
}

const mockFavorites: FavoriteItem[] = [
  {
    id: "FAV-001",
    auctionId: "AUC-001",
    title: "Osmanli Donemi Altin Kupe Seti",
    image: null,
    category: "Antika Taki",
    currentPrice: 42500,
    status: "active",
    endDate: "2026-03-05T22:00:00Z",
    bidCount: 28,
    notifyOnStart: true,
  },
  {
    id: "FAV-002",
    auctionId: "AUC-003",
    title: "Rolex Daytona 116500LN Sifir",
    image: null,
    category: "Luks Saat",
    currentPrice: 850000,
    status: "upcoming",
    endDate: "2026-03-20T22:00:00Z",
    bidCount: 0,
    notifyOnStart: true,
  },
  {
    id: "FAV-003",
    auctionId: "AUC-008",
    title: "Patek Philippe Nautilus 5711/1A",
    image: null,
    category: "Luks Saat",
    currentPrice: 2150000,
    status: "active",
    endDate: "2026-03-12T22:00:00Z",
    bidCount: 8,
    notifyOnStart: false,
  },
  {
    id: "FAV-004",
    auctionId: "AUC-009",
    title: "Iznik Cinisi Tabak Koleksiyonu (6 Adet)",
    image: null,
    category: "Antika",
    currentPrice: 55000,
    status: "upcoming",
    endDate: "2026-03-15T22:00:00Z",
    bidCount: 0,
    notifyOnStart: false,
  },
  {
    id: "FAV-005",
    auctionId: "AUC-006",
    title: "Antika Osmanli Hancer - 18. Yuzyil",
    image: null,
    category: "Antika",
    currentPrice: 35000,
    status: "active",
    endDate: "2026-03-08T20:00:00Z",
    bidCount: 22,
    notifyOnStart: true,
  },
  {
    id: "FAV-006",
    auctionId: "AUC-010",
    title: "Mercedes-Benz 300SL Gullwing 1955",
    image: null,
    category: "Klasik Otomobil",
    currentPrice: 4250000,
    status: "sold",
    endDate: "2026-02-10T22:00:00Z",
    bidCount: 34,
    notifyOnStart: false,
  },
];

const statusConfig: Record<
  string,
  { label: string; variant: "live" | "secondary" | "success" | "default" }
> = {
  active: { label: "Canli", variant: "live" },
  upcoming: { label: "Yakinda", variant: "secondary" },
  ended: { label: "Sona Erdi", variant: "default" },
  sold: { label: "Satildi", variant: "success" },
};

export default function FavoritesPage() {
  const t = useTranslations("common");
  const locale = useLocale();
  const [favorites, setFavorites] = useState(mockFavorites);

  const removeFavorite = (id: string) => {
    setFavorites((prev) => prev.filter((f) => f.id !== id));
  };

  const toggleNotify = (id: string) => {
    setFavorites((prev) =>
      prev.map((f) =>
        f.id === id ? { ...f, notifyOnStart: !f.notifyOnStart } : f
      )
    );
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Takip Listesi</h1>
          <p className="mt-1 text-[var(--muted-foreground)]">
            Favori muzayedelerinizi takip edin ({favorites.length} urun)
          </p>
        </div>
      </div>

      {/* Favorites Grid */}
      {favorites.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Heart className="h-16 w-16 text-[var(--muted-foreground)]" />
            <p className="mt-4 text-lg font-medium">Favori listeniz bos</p>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Begendige muzayedeleri takip listesine ekleyin
            </p>
            <Link href={`/${locale}/auctions`}>
              <Button className="mt-4">
                <Gavel className="mr-2 h-4 w-4" />
                Muzayedeleri Kesfet
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {favorites.map((item) => {
            const config = statusConfig[item.status] || statusConfig.active;
            return (
              <Card key={item.id} hover className="group overflow-hidden">
                <Link href={`/${locale}/auctions/${item.auctionId}`}>
                  {/* Image */}
                  <div className="relative aspect-[4/3] overflow-hidden bg-[var(--muted)]">
                    <div className="flex h-full items-center justify-center">
                      <ImageIcon className="h-12 w-12 text-[var(--muted-foreground)]" />
                    </div>
                    <div className="absolute left-3 top-3">
                      <Badge variant={config.variant}>{config.label}</Badge>
                    </div>
                    <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/50 to-transparent" />
                    <div className="absolute bottom-3 left-3 flex items-center gap-2 text-white text-xs">
                      <Gavel className="h-3.5 w-3.5" />
                      <span>{item.bidCount} teklif</span>
                    </div>
                  </div>
                </Link>

                <div className="p-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-primary-500">
                    {item.category}
                  </p>
                  <Link href={`/${locale}/auctions/${item.auctionId}`}>
                    <h3 className="mt-1 font-display text-sm font-semibold line-clamp-2 hover:text-primary-500">
                      {item.title}
                    </h3>
                  </Link>
                  <div className="mt-2">
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {item.status === "upcoming" ? "Baslangic Fiyati" : "Guncel Fiyat"}
                    </p>
                    <p className="text-lg font-bold text-primary-500">
                      {formatCurrency(item.currentPrice)}
                    </p>
                  </div>
                  {(item.status === "active" || item.status === "upcoming") && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-[var(--muted-foreground)]">
                      <Clock className="h-3 w-3" />
                      {formatRelativeTime(item.endDate)}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="mt-3 flex items-center justify-between border-t border-[var(--border)] pt-3">
                    <button
                      onClick={() => toggleNotify(item.id)}
                      className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
                    >
                      {item.notifyOnStart ? (
                        <>
                          <Bell className="h-3.5 w-3.5 text-primary-500" />
                          <span className="text-primary-500">Bildirim Acik</span>
                        </>
                      ) : (
                        <>
                          <BellOff className="h-3.5 w-3.5" />
                          <span>Bildirim Kapali</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => removeFavorite(item.id)}
                      className="flex items-center gap-1 text-xs text-red-500 transition-colors hover:text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Kaldir
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
