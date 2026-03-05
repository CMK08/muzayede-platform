/**
 * AuctionCard -- Muzayede (acik artirma) kart bileseni.
 *
 * Her bir muzayede ogesini gorsel, durum etiketi, fiyat, geri sayim
 * ve teklif/izlenme sayilari ile birlikte kart seklinde gosterir.
 * Kart tiklandiginda ilgili muzayede detay sayfasina yonlendirir.
 *
 * Props:
 *  - auction : Gosterilecek muzayede verisi (AuctionItem)
 *  - compact : true ise daha kucuk ic bosluk (padding) kullanilir
 */
"use client";

import React from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Heart, Eye, Gavel } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CountdownTimer } from "@/components/auction/countdown-timer";
import { AuctionImage } from "@/components/auction/auction-image";
import { formatCurrency } from "@/lib/utils";
import type { AuctionItem } from "@/stores/auction-store";

interface AuctionCardProps {
  auction: AuctionItem;
  compact?: boolean;
}

// Muzayede durumuna gore Badge bileseninin renk varyantini belirleyen esleme tablosu
const statusBadgeVariant: Record<
  AuctionItem["status"],
  "live" | "success" | "warning" | "secondary" | "destructive" | "default"
> = {
  active: "live",
  ending_soon: "warning",
  upcoming: "secondary",
  ended: "default",
  sold: "success",
  cancelled: "destructive",
};

// Muzayede durumunun kullaniciya gosterilecek Turkce karsiliklari
const statusLabels: Record<AuctionItem["status"], string> = {
  active: "Canlı",
  ending_soon: "Bitiyor",
  upcoming: "Yakında",
  ended: "Sona Erdi",
  sold: "Satıldı",
  cancelled: "İptal",
};

export function AuctionCard({ auction, compact = false }: AuctionCardProps) {
  // Aktif dil bilgisi -- link yollarinda kullanilir
  const locale = useLocale();
  // Cevirileri "auction" namespace'inden ceker
  const t = useTranslations("auction");

  return (
    <Link href={`/${locale}/auctions/${auction.id}`}>
      <Card hover className="group overflow-hidden">
        {/* Image */}
        <div className="relative aspect-[4/3] overflow-hidden">
          <AuctionImage
            src={auction.images?.[0]}
            alt={auction.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-110"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />

          {/* Status Badge */}
          <div className="absolute left-3 top-3">
            <Badge variant={statusBadgeVariant[auction.status]}>
              {statusLabels[auction.status]}
            </Badge>
          </div>

          {/* Favori / Izleme Listesi Butonu -- Link tiklamasini engellemek icin stopPropagation kullanilir */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            className="absolute right-3 top-3 rounded-full bg-white/80 p-2 backdrop-blur-sm transition-all hover:bg-white hover:scale-110 dark:bg-navy-950/80 dark:hover:bg-navy-950"
          >
            <Heart className="h-4 w-4 text-[var(--foreground)]" />
          </button>

          {/* Gradient Overlay */}
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/60 to-transparent" />

          {/* Bid Count Overlay */}
          <div className="absolute bottom-3 left-3 flex items-center gap-3 text-white text-xs">
            <span className="flex items-center gap-1">
              <Gavel className="h-3.5 w-3.5" />
              {auction.totalBids} {t("bids")}
            </span>
            <span className="flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" />
              {auction.watchCount}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className={compact ? "p-3" : "p-4"}>
          {/* Category */}
          <p className="mb-1 text-xs font-medium uppercase tracking-wider text-primary-500">
            {auction.category}
          </p>

          {/* Title */}
          <h3
            className={`font-display font-semibold text-[var(--foreground)] line-clamp-2 ${
              compact ? "text-sm" : "text-base"
            }`}
          >
            {auction.title}
          </h3>

          {/* Price */}
          <div className="mt-3 flex items-end justify-between">
            <div>
              <p className="text-xs text-[var(--muted-foreground)]">
                {t("currentPrice")}
              </p>
              <p className="text-lg font-bold text-primary-500">
                {formatCurrency(auction.currentPrice)}
              </p>
            </div>

            {/* Geri Sayim -- Yalnizca aktif veya bitmek uzere olan muzayedelerde gosterilir */}
            {(auction.status === "active" ||
              auction.status === "ending_soon") && (
              <CountdownTimer
                endDate={auction.endTime}
                compact
                className="text-right"
              />
            )}
          </div>

          {/* Baslangic Fiyati -- Guncel fiyat baslangictan farkliysa, eski fiyat ustu cizili gosterilir */}
          {auction.currentPrice !== auction.startingPrice && (
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
              {t("startingPrice")}:{" "}
              <span className="line-through">
                {formatCurrency(auction.startingPrice)}
              </span>
            </p>
          )}
        </div>
      </Card>
    </Link>
  );
}
