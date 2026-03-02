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
  Loader2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AuctionImage } from "@/components/auction/auction-image";
import { formatCurrency, formatRelativeTime } from "@/lib/utils";
import { useFavorites, useToggleFavorite } from "@/hooks/use-dashboard";

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
  void t; // TODO: replace hardcoded strings with t() calls
  const locale = useLocale();

  const { data: favoritesData, isLoading } = useFavorites(1, 50);
  const toggleFavoriteMutation = useToggleFavorite();

  const apiFavorites: FavoriteItem[] = (favoritesData?.data || []).map((f: Record<string, unknown>) => {
    const auction = (f.auction || {}) as Record<string, unknown>;
    const images = (auction.images || []) as string[];
    return {
      id: f.id as string,
      auctionId: (f.auctionId || auction.id || f.id) as string,
      title: (f.title || auction.title || "") as string,
      image: (f.image || images[0] || null) as string | null,
      category: (f.category || auction.category || "") as string,
      currentPrice: (f.currentPrice || auction.currentPrice || 0) as number,
      status: (f.status || auction.status || "active") as FavoriteItem["status"],
      endDate: (f.endDate || auction.endTime || "") as string,
      bidCount: (f.bidCount || auction.totalBids || 0) as number,
      notifyOnStart: (f.notifyOnStart || false) as boolean,
    };
  });

  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);

  // Sync API data to local state
  React.useEffect(() => {
    if (apiFavorites.length > 0) {
      setFavorites(apiFavorites);
    }
  }, [favoritesData]);

  const removeFavorite = (id: string) => {
    const fav = favorites.find((f) => f.id === id);
    if (fav) {
      toggleFavoriteMutation.mutate(fav.auctionId);
    }
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
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
        </div>
      ) : favorites.length === 0 ? (
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
                    <AuctionImage
                      src={item.image}
                      alt={item.title}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-110"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      compact
                    />
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
