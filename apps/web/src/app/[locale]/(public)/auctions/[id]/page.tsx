"use client";

import React, { useState, useEffect, use } from "react";
import Image from "next/image";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { BidPanel } from "@/components/auction/bid-panel";
import { BidHistory } from "@/components/auction/bid-history";
import { CountdownTimer } from "@/components/auction/countdown-timer";
import { AuctionCard } from "@/components/auction/auction-card";
import { useAuctionStore, type Bid, type AuctionItem } from "@/stores/auction-store";
import { useAuctionSocket } from "@/hooks/use-socket";
import { formatCurrency, formatDate, cn } from "@/lib/utils";

// Mock data
const mockAuction: AuctionItem = {
  id: "1",
  title: "Osmanli Donemi Altin Kupe Seti - 18. Yuzyil",
  description: `Bu essiz Osmanli donemi altin kupe seti, 18. yuzyilin baslarina tarihlenmektedir. El isciligindeki ince detaylar, donemin zanaatkarlik seviyesini gozler onune sermektedir.

Kupeler, 22 ayar saf altindan imal edilmis olup, her biri yaklasik 8 gram agirligindadir. Uzerindeki motifler, Osmanli saray sanatinin tipik orneklerini tasimaktadir.

Tarihi Onemi:
Bu kupe seti, Osmanli donemi kuyumculuk sanatinin en guzel orneklerinden biridir. Donemin estetik anlayisini ve teknik ustaligini yansitmaktadir.

Durum:
Urunler antika ozelligine ragmen mukemmel durumda korunmustur. Kutu ve sertifikasi mevcuttur.`,
  images: [
    "https://images.unsplash.com/photo-1515562141589-67f0d569b6c6?w=1200",
    "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=1200",
    "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=1200",
    "https://images.unsplash.com/photo-1603561591411-07134e71a2a9?w=1200",
  ],
  category: "Antika Taki",
  startingPrice: 15000,
  currentPrice: 42500,
  minBidIncrement: 500,
  startTime: "2026-02-20T10:00:00Z",
  endTime: "2026-03-05T22:00:00Z",
  status: "active",
  sellerId: "s1",
  sellerName: "Antika Dunyasi",
  totalBids: 28,
  watchCount: 156,
  condition: "good",
  location: "Istanbul, Turkiye",
  shippingInfo: "Ucretsiz sigortalı kargo ile gonderim yapilmaktadir.",
};

const mockBids: Bid[] = [
  {
    id: "b1",
    auctionId: "1",
    bidderId: "u1",
    bidderName: "Ahm***",
    amount: 42500,
    timestamp: "2026-02-26T14:30:00Z",
    isAutoBid: false,
  },
  {
    id: "b2",
    auctionId: "1",
    bidderId: "u2",
    bidderName: "Meh***",
    amount: 41000,
    timestamp: "2026-02-26T14:15:00Z",
    isAutoBid: true,
  },
  {
    id: "b3",
    auctionId: "1",
    bidderId: "u3",
    bidderName: "Fat***",
    amount: 39500,
    timestamp: "2026-02-26T13:45:00Z",
    isAutoBid: false,
  },
  {
    id: "b4",
    auctionId: "1",
    bidderId: "u1",
    bidderName: "Ahm***",
    amount: 38000,
    timestamp: "2026-02-26T12:30:00Z",
    isAutoBid: false,
  },
  {
    id: "b5",
    auctionId: "1",
    bidderId: "u4",
    bidderName: "Zel***",
    amount: 35000,
    timestamp: "2026-02-26T11:00:00Z",
    isAutoBid: false,
  },
  {
    id: "b6",
    auctionId: "1",
    bidderId: "u2",
    bidderName: "Meh***",
    amount: 32000,
    timestamp: "2026-02-25T22:15:00Z",
    isAutoBid: true,
  },
];

const mockSimilarAuctions: AuctionItem[] = [
  {
    id: "7",
    title: "Antika Gumus Bilezik - Selcuklu Donemi",
    description: "Selcuklu donemi gumus bilezik",
    images: ["https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=600"],
    category: "Antika Taki",
    startingPrice: 8000,
    currentPrice: 18500,
    minBidIncrement: 250,
    startTime: "2026-02-21T10:00:00Z",
    endTime: "2026-03-06T22:00:00Z",
    status: "active",
    sellerId: "s7",
    sellerName: "Taki Koleksiyonu",
    totalBids: 14,
    watchCount: 88,
  },
  {
    id: "8",
    title: "Osmanli Brosu - 19. Yuzyil",
    description: "19. yuzyil Osmanli donemi altin bros",
    images: ["https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=600"],
    category: "Antika Taki",
    startingPrice: 12000,
    currentPrice: 29000,
    minBidIncrement: 500,
    startTime: "2026-02-23T10:00:00Z",
    endTime: "2026-03-07T22:00:00Z",
    status: "active",
    sellerId: "s8",
    sellerName: "Antika Hazine",
    totalBids: 21,
    watchCount: 112,
  },
  {
    id: "9",
    title: "Viktorya Donemi Yakut Kolye",
    description: "Viktorya donemi yakut tasli altin kolye",
    images: ["https://images.unsplash.com/photo-1603561591411-07134e71a2a9?w=600"],
    category: "Antika Taki",
    startingPrice: 35000,
    currentPrice: 62000,
    minBidIncrement: 1000,
    startTime: "2026-02-25T10:00:00Z",
    endTime: "2026-03-09T22:00:00Z",
    status: "active",
    sellerId: "s9",
    sellerName: "Deger Antika",
    totalBids: 16,
    watchCount: 178,
  },
];

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

export default function AuctionDetailPage({ params }: AuctionDetailPageProps) {
  const { id } = use(params);
  const locale = useLocale();
  const t = useTranslations("auction");
  const tBid = useTranslations("bid");

  const { setCurrentAuction, setBids, currentAuction, bids } =
    useAuctionStore();

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [activeTab, setActiveTab] = useState<"description" | "details" | "shipping">(
    "description"
  );

  // Initialize with mock data
  useEffect(() => {
    setCurrentAuction(mockAuction);
    setBids(mockBids);
  }, [id, setCurrentAuction, setBids]);

  // Connect to real-time updates
  useAuctionSocket(id);

  const auction = currentAuction || mockAuction;
  const images = auction.images;

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
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
              <Image
                src={images[currentImageIndex]}
                alt={`${auction.title} - ${currentImageIndex + 1}`}
                fill
                className="object-cover"
                priority
              />

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
              <button
                onClick={() => setShowFullscreen(true)}
                className="absolute bottom-3 right-3 rounded-lg bg-black/40 p-2 text-white backdrop-blur-sm transition-all hover:bg-black/60"
              >
                <ZoomIn className="h-5 w-5" />
              </button>

              {/* Image Counter */}
              <div className="absolute bottom-3 left-3 rounded-lg bg-black/40 px-3 py-1 text-sm text-white backdrop-blur-sm">
                {currentImageIndex + 1} / {images.length}
              </div>
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
                    <Image
                      src={image}
                      alt={`Thumbnail ${index + 1}`}
                      fill
                      className="object-cover"
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
                  <span className="text-xs text-[var(--muted-foreground)]">
                    {t("sellerSince")}: 2022
                  </span>
                </div>
              </div>
              <Button variant="outline" size="sm">
                Profili Gor
              </Button>
            </CardContent>
          </Card>

          {/* Bid History */}
          <BidHistory bids={bids.length > 0 ? bids : mockBids} />
        </div>

        {/* Right Column: Bid Panel */}
        <div>
          <BidPanel auctionId={id} />
        </div>
      </div>

      {/* Similar Auctions */}
      <section className="mt-16">
        <h2 className="mb-6 font-display text-2xl font-bold">
          {t("similarAuctions")}
        </h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {mockSimilarAuctions.map((auction) => (
            <AuctionCard key={auction.id} auction={auction} />
          ))}
        </div>
      </section>

      {/* Fullscreen Image Modal */}
      {showFullscreen && (
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
            <Image
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
