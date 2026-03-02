"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import {
  ChevronLeft,
  ChevronRight,
  Heart,
  Share2,
  Flag,
  MapPin,
  Truck,
  Shield,
  User,
  Calendar,
  Eye,
  ZoomIn,
  Gavel,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { BidPanel } from "@/components/auction/bid-panel";
import { BidHistory } from "@/components/auction/bid-history";
import { AuctionCard } from "@/components/auction/auction-card";
import { AuctionImage, AuctionImagePlaceholder } from "@/components/auction/auction-image";
import { useAuctionStore, type AuctionItem } from "@/stores/auction-store";
import { useAuctionSocket } from "@/hooks/use-socket";
import { useAuction, } from "@/hooks/use-auction";
import { useBids } from "@/hooks/use-bids";
import { useSimilarAuctions } from "@/hooks/use-dashboard";
import { formatCurrency, formatDate, cn } from "@/lib/utils";

const conditionLabels: Record<string, string> = {
  new: "Sifir",
  like_new: "Sifir Gibi",
  good: "Iyi",
  fair: "Orta",
  poor: "Kotu",
};

interface AuctionDetailPageProps {
  params: Promise<{ id: string; locale: string }>;
}

function DetailSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex items-center gap-2">
        <div className="h-4 w-20 animate-pulse rounded bg-[var(--muted)]" />
        <div className="h-4 w-4 animate-pulse rounded bg-[var(--muted)]" />
        <div className="h-4 w-24 animate-pulse rounded bg-[var(--muted)]" />
      </div>
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-8">
          <div className="aspect-[4/3] animate-pulse rounded-xl bg-[var(--muted)]" />
          <div className="space-y-3">
            <div className="h-4 w-32 animate-pulse rounded bg-[var(--muted)]" />
            <div className="h-8 w-full animate-pulse rounded bg-[var(--muted)]" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-[var(--muted)]" />
          </div>
        </div>
        <div>
          <div className="h-96 animate-pulse rounded-xl bg-[var(--muted)]" />
        </div>
      </div>
    </div>
  );
}

export default function AuctionDetailPage({ params }: AuctionDetailPageProps) {
  const { id } = use(params);
  const locale = useLocale();
  const t = useTranslations("auction");

  const { setCurrentAuction, setBids, currentAuction, bids: storeBids } =
    useAuctionStore();

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [activeTab, setActiveTab] = useState<"description" | "details" | "shipping">(
    "description"
  );

  // Fetch auction data from API
  const { data: auctionData, isLoading: auctionLoading, isError: auctionError } = useAuction(id);
  const { data: bidsData } = useBids(id);
  const { data: similarAuctions } = useSimilarAuctions(id);

  // Sync API data to store
  useEffect(() => {
    if (auctionData) {
      setCurrentAuction(auctionData);
    }
  }, [auctionData, setCurrentAuction]);

  useEffect(() => {
    if (bidsData?.data) {
      setBids(bidsData.data);
    }
  }, [bidsData, setBids]);

  // Connect to real-time updates
  useAuctionSocket(id);

  const auction = currentAuction || auctionData;
  const bids = storeBids.length > 0 ? storeBids : (bidsData?.data || []);

  if (auctionLoading) {
    return <DetailSkeleton />;
  }

  if (auctionError || !auction) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-20 text-center">
        <Gavel className="mx-auto h-16 w-16 text-[var(--muted-foreground)]" />
        <h2 className="mt-4 font-display text-2xl font-bold">Muzayede Bulunamadi</h2>
        <p className="mt-2 text-[var(--muted-foreground)]">
          Aradığınız muzayede bulunamadi veya kaldirilmis olabilir.
        </p>
        <Link href={`/${locale}/auctions`}>
          <Button className="mt-6">Muzayedelere Don</Button>
        </Link>
      </div>
    );
  }

  const images = auction.images?.length > 0 ? auction.images : [];

  const nextImage = () => {
    if (images.length > 0) {
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
    }
  };

  const prevImage = () => {
    if (images.length > 0) {
      setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
        <Link href={`/${locale}`} className="hover:text-primary-500">
          Ana Sayfa
        </Link>
        <ChevronRight className="h-3 w-3" />
        <Link href={`/${locale}/auctions`} className="hover:text-primary-500">
          Muzayedeler
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-[var(--foreground)]">{auction.category}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left Column: Gallery + Info */}
        <div className="lg:col-span-2 space-y-8">
          {/* Image Gallery */}
          <div className="space-y-3">
            {/* Main Image */}
            <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-[var(--muted)]">
              {images.length > 0 ? (
                <AuctionImage
                  src={images[currentImageIndex]}
                  alt={`${auction.title} - ${currentImageIndex + 1}`}
                  fill
                  className="object-cover"
                  priority
                />
              ) : (
                <AuctionImagePlaceholder />
              )}

              {/* Navigation Arrows */}
              {images.length > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white backdrop-blur-sm transition-all hover:bg-black/60"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white backdrop-blur-sm transition-all hover:bg-black/60"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              )}

              {/* Fullscreen Button */}
              {images.length > 0 && (
                <button
                  onClick={() => setShowFullscreen(true)}
                  className="absolute bottom-3 right-3 rounded-lg bg-black/40 p-2 text-white backdrop-blur-sm transition-all hover:bg-black/60"
                >
                  <ZoomIn className="h-5 w-5" />
                </button>
              )}

              {/* Image Counter */}
              {images.length > 0 && (
                <div className="absolute bottom-3 left-3 rounded-lg bg-black/40 px-3 py-1 text-sm text-white backdrop-blur-sm">
                  {currentImageIndex + 1} / {images.length}
                </div>
              )}
            </div>

            {/* Thumbnails */}
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={cn(
                      "relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border-2 transition-all",
                      index === currentImageIndex
                        ? "border-primary-500 ring-2 ring-primary-500/30"
                        : "border-transparent opacity-60 hover:opacity-100"
                    )}
                  >
                    <AuctionImage
                      src={image}
                      alt={`Thumbnail ${index + 1}`}
                      fill
                      className="object-cover"
                      compact
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Auction Title & Actions */}
          <div>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="mb-1 text-sm font-medium uppercase tracking-wider text-primary-500">
                  {auction.category}
                </p>
                <h1 className="font-display text-2xl font-bold sm:text-3xl">
                  {auction.title}
                </h1>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="icon">
                  <Heart className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon">
                  <Share2 className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon">
                  <Flag className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="mt-4 flex flex-wrap gap-4 text-sm text-[var(--muted-foreground)]">
              <span className="flex items-center gap-1">
                <Eye className="h-4 w-4" />
                {auction.watchCount} kisi takip ediyor
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {formatDate(auction.startTime)}
              </span>
              {auction.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {auction.location}
                </span>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div>
            <div className="flex border-b border-[var(--border)]">
              {(
                [
                  { key: "description", label: t("description") },
                  { key: "details", label: t("details") },
                  { key: "shipping", label: t("shipping") },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    "border-b-2 px-4 py-3 text-sm font-medium transition-colors",
                    activeTab === tab.key
                      ? "border-primary-500 text-primary-500"
                      : "border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="py-6">
              {activeTab === "description" && (
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  {auction.description.split("\n\n").map((paragraph, i) => (
                    <p key={i} className="mb-4 leading-relaxed text-[var(--foreground)]">
                      {paragraph}
                    </p>
                  ))}
                </div>
              )}

              {activeTab === "details" && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-lg bg-[var(--muted)] p-4">
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {t("condition")}
                    </p>
                    <p className="mt-1 font-medium">
                      {auction.condition
                        ? conditionLabels[auction.condition]
                        : "-"}
                    </p>
                  </div>
                  <div className="rounded-lg bg-[var(--muted)] p-4">
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {t("category")}
                    </p>
                    <p className="mt-1 font-medium">{auction.category}</p>
                  </div>
                  <div className="rounded-lg bg-[var(--muted)] p-4">
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {t("startingPrice")}
                    </p>
                    <p className="mt-1 font-medium">
                      {formatCurrency(auction.startingPrice)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-[var(--muted)] p-4">
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {t("location")}
                    </p>
                    <p className="mt-1 font-medium">
                      {auction.location || "-"}
                    </p>
                  </div>
                </div>
              )}

              {activeTab === "shipping" && (
                <div className="space-y-4">
                  <div className="flex items-start gap-3 rounded-lg bg-[var(--muted)] p-4">
                    <Truck className="mt-0.5 h-5 w-5 text-primary-500" />
                    <div>
                      <p className="font-medium">Kargo Bilgisi</p>
                      <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                        {auction.shippingInfo ||
                          "Kargo bilgisi satici tarafindan paylasilacaktir."}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-lg bg-[var(--muted)] p-4">
                    <Shield className="mt-0.5 h-5 w-5 text-primary-500" />
                    <div>
                      <p className="font-medium">Alici Korumasi</p>
                      <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                        Tum satin alimlariniz Muzayede Alici Koruma Programi
                        kapsamindadir.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Seller Info */}
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-500/10">
                <User className="h-6 w-6 text-primary-500" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-[var(--muted-foreground)]">
                  {t("seller")}
                </p>
                <p className="font-medium">{auction.sellerName}</p>
                <div className="mt-1 flex items-center gap-2">
                  <Badge variant="success" className="text-[10px]">
                    Dogrulanmis
                  </Badge>
                </div>
              </div>
              <Button variant="outline" size="sm">
                Profili Gor
              </Button>
            </CardContent>
          </Card>

          {/* Bid History */}
          <BidHistory bids={bids} />
        </div>

        {/* Right Column: Bid Panel */}
        <div>
          <BidPanel auctionId={id} />
        </div>
      </div>

      {/* Similar Auctions */}
      {similarAuctions && similarAuctions.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-6 font-display text-2xl font-bold">
            {t("similarAuctions")}
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {similarAuctions.map((similarAuction: { id: string; [key: string]: unknown }) => (
              <AuctionCard key={similarAuction.id} auction={similarAuction as unknown as AuctionItem} />
            ))}
          </div>
        </section>
      )}

      {/* Fullscreen Image Modal */}
      {showFullscreen && images.length > 0 && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onClick={() => setShowFullscreen(false)}
        >
          <button
            className="absolute right-4 top-4 text-white"
            onClick={() => setShowFullscreen(false)}
          >
            <span className="text-2xl">&times;</span>
          </button>
          <div className="relative h-[80vh] w-[80vw]">
            <AuctionImage
              src={images[currentImageIndex]}
              alt={auction.title}
              fill
              className="object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}
