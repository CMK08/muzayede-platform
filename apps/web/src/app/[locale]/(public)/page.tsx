"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import {
  ArrowRight,
  Gavel,
  Shield,
  Users,
  TrendingUp,
  Clock,
  BadgeCheck,
  Headphones,
  ChevronRight,
  Gem,
  Watch,
  Car,
  Palette,
  Home as HomeIcon,
  Smartphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AuctionCard } from "@/components/auction/auction-card";
import { CountdownTimer } from "@/components/auction/countdown-timer";
import { formatCurrency } from "@/lib/utils";
import type { AuctionItem } from "@/stores/auction-store";

// Mock data for demonstration
const mockFeaturedAuctions: AuctionItem[] = [
  {
    id: "1",
    title: "Osmanli Donemi Altin Kupe Seti - 18. Yuzyil",
    description: "Nadir bulunan Osmanli donemi el isciliginde altin kupe seti",
    images: ["https://images.unsplash.com/photo-1515562141589-67f0d569b6c6?w=600"],
    category: "Antika Takı",
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
  },
  {
    id: "2",
    title: "1967 Ford Mustang Shelby GT500 - Restore Edilmis",
    description: "Tam restore edilmis klasik Amerikan muscle car",
    images: ["https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=600"],
    category: "Klasik Otomobil",
    startingPrice: 500000,
    currentPrice: 875000,
    minBidIncrement: 25000,
    startTime: "2026-02-18T10:00:00Z",
    endTime: "2026-03-02T20:00:00Z",
    status: "active",
    sellerId: "s2",
    sellerName: "Klasik Motor",
    totalBids: 15,
    watchCount: 342,
  },
  {
    id: "3",
    title: "Rolex Daytona 116500LN - 2024 Model",
    description: "Kutusunda, garantili Rolex Daytona",
    images: ["https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=600"],
    category: "Luks Saat",
    startingPrice: 750000,
    currentPrice: 1250000,
    minBidIncrement: 50000,
    startTime: "2026-02-22T14:00:00Z",
    endTime: "2026-03-08T18:00:00Z",
    status: "active",
    sellerId: "s3",
    sellerName: "Saat Galerisi",
    totalBids: 12,
    watchCount: 521,
  },
  {
    id: "4",
    title: "Yagli Boya Tablo - Istanbul Bogazi Manzarasi",
    description: "Unlu Turk ressamin orijinal Istanbul Bogazi tablosu",
    images: ["https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=600"],
    category: "Sanat",
    startingPrice: 25000,
    currentPrice: 68000,
    minBidIncrement: 2500,
    startTime: "2026-02-24T10:00:00Z",
    endTime: "2026-03-10T22:00:00Z",
    status: "active",
    sellerId: "s4",
    sellerName: "Sanat Evi",
    totalBids: 19,
    watchCount: 203,
  },
];

const mockUpcomingAuctions: AuctionItem[] = [
  {
    id: "5",
    title: "Elmas Yuzuk - 3.5 Karat Oval Kesim",
    description: "GIA sertifikali 3.5 karat oval kesim elmas yuzuk",
    images: ["https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=600"],
    category: "Mucevher",
    startingPrice: 200000,
    currentPrice: 200000,
    minBidIncrement: 10000,
    startTime: "2026-03-01T14:00:00Z",
    endTime: "2026-03-15T20:00:00Z",
    status: "upcoming",
    sellerId: "s5",
    sellerName: "Mucevher Sarayi",
    totalBids: 0,
    watchCount: 89,
  },
  {
    id: "6",
    title: "Antika Hali - 19. Yuzyil Hereke",
    description: "El dokuması Hereke halisi, mükemmel durumda",
    images: ["https://images.unsplash.com/photo-1600166898405-da9535204843?w=600"],
    category: "Antika",
    startingPrice: 85000,
    currentPrice: 85000,
    minBidIncrement: 5000,
    startTime: "2026-03-03T10:00:00Z",
    endTime: "2026-03-17T22:00:00Z",
    status: "upcoming",
    sellerId: "s6",
    sellerName: "Hali Dunyasi",
    totalBids: 0,
    watchCount: 67,
  },
];

const categories = [
  { id: "jewelry", name: "Mucevher", icon: Gem, count: 234 },
  { id: "watches", name: "Luks Saat", icon: Watch, count: 156 },
  { id: "cars", name: "Klasik Otomobil", icon: Car, count: 89 },
  { id: "art", name: "Sanat", icon: Palette, count: 312 },
  { id: "property", name: "Gayrimenkul", icon: HomeIcon, count: 67 },
  { id: "electronics", name: "Elektronik", icon: Smartphone, count: 178 },
];

export default function HomePage() {
  const locale = useLocale();
  const t = useTranslations("home");
  const tCommon = useTranslations("common");

  return (
    <div>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-navy-950 via-navy-900 to-navy-950 text-white">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: "radial-gradient(circle at 25% 25%, rgba(212, 168, 67, 0.3) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(212, 168, 67, 0.2) 0%, transparent 50%)"
          }} />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:py-28 lg:py-36">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div className="space-y-8">
              <Badge variant="default" className="px-4 py-1.5 text-sm">
                <Gavel className="mr-1.5 h-3.5 w-3.5" />
                Turkiye&apos;nin 1 Numarali Muzayede Platformu
              </Badge>

              <h1 className="font-display text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
                {t("heroTitle")}
                <span className="block text-gold-gradient">Muzayede</span>
              </h1>

              <p className="max-w-lg text-lg text-gray-300">
                {t("heroSubtitle")}
              </p>

              <div className="flex flex-wrap gap-4">
                <Link href={`/${locale}/auctions`}>
                  <Button size="lg" className="text-base">
                    {t("heroCta")}
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Button variant="outline" size="lg" className="border-white/20 text-white hover:bg-white/10">
                  {t("heroSecondaryCta")}
                </Button>
              </div>

              {/* Trust Indicators */}
              <div className="flex items-center gap-6 pt-4 text-sm text-gray-400">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary-400" />
                  <span>SSL Guvenli</span>
                </div>
                <div className="flex items-center gap-2">
                  <BadgeCheck className="h-4 w-4 text-primary-400" />
                  <span>Lisansli</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary-400" />
                  <span>50.000+ Uye</span>
                </div>
              </div>
            </div>

            {/* Hero Auction Preview */}
            <div className="hidden lg:block">
              <div className="relative">
                <div className="absolute -inset-4 rounded-2xl bg-gradient-to-r from-primary-500/20 to-primary-400/10 blur-xl" />
                <Card className="relative overflow-hidden border-white/10 bg-white/5 backdrop-blur-sm">
                  <div className="relative aspect-[4/3]">
                    <Image
                      src="https://images.unsplash.com/photo-1515562141589-67f0d569b6c6?w=800"
                      alt="One cikan muzayede"
                      fill
                      className="object-cover"
                      priority
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <Badge variant="live" className="absolute left-4 top-4">
                      CANLI
                    </Badge>
                  </div>
                  <CardContent className="p-5 text-white">
                    <p className="text-xs uppercase tracking-wider text-primary-400">
                      Antika Taki
                    </p>
                    <h3 className="mt-1 font-display text-lg font-semibold">
                      Osmanli Donemi Altin Kupe Seti
                    </h3>
                    <div className="mt-3 flex items-end justify-between">
                      <div>
                        <p className="text-xs text-gray-400">Guncel Fiyat</p>
                        <p className="text-2xl font-bold text-primary-400">
                          {formatCurrency(42500)}
                        </p>
                      </div>
                      <CountdownTimer
                        endDate="2026-03-05T22:00:00Z"
                        compact
                        showIcon
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="border-b border-[var(--border)] bg-[var(--muted)]">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-4 px-4 py-8 lg:grid-cols-4">
          {[
            { label: t("totalAuctions"), value: "12,450+", icon: Gavel },
            { label: t("totalBids"), value: "2.5M+", icon: TrendingUp },
            { label: t("totalUsers"), value: "50,000+", icon: Users },
            { label: t("totalVolume"), value: "500M+ TRY", icon: Shield },
          ].map((stat) => (
            <div
              key={stat.label}
              className="flex items-center gap-3 rounded-xl bg-[var(--card)] p-4 shadow-card"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary-500/10">
                <stat.icon className="h-6 w-6 text-primary-500" />
              </div>
              <div>
                <p className="text-xl font-bold text-[var(--foreground)]">
                  {stat.value}
                </p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  {stat.label}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Featured Auctions */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="font-display text-3xl font-bold">
              {t("featuredTitle")}
            </h2>
            <p className="mt-2 text-[var(--muted-foreground)]">
              {t("featuredSubtitle")}
            </p>
          </div>
          <Link
            href={`/${locale}/auctions?category=featured`}
            className="hidden items-center gap-1 text-sm font-medium text-primary-500 hover:text-primary-600 sm:flex"
          >
            {tCommon("all")}
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {mockFeaturedAuctions.map((auction) => (
            <AuctionCard key={auction.id} auction={auction} />
          ))}
        </div>

        <div className="mt-6 text-center sm:hidden">
          <Link href={`/${locale}/auctions?category=featured`}>
            <Button variant="outline">
              {tCommon("all")}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Categories */}
      <section className="bg-[var(--muted)] py-16">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-8 text-center">
            <h2 className="font-display text-3xl font-bold">
              {t("categoriesTitle")}
            </h2>
            <p className="mt-2 text-[var(--muted-foreground)]">
              {t("categoriesSubtitle")}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/${locale}/auctions?category=${category.id}`}
              >
                <Card
                  hover
                  className="group flex flex-col items-center p-6 text-center"
                >
                  <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-primary-500/10 transition-colors group-hover:bg-primary-500 group-hover:text-white">
                    <category.icon className="h-7 w-7 text-primary-500 group-hover:text-white" />
                  </div>
                  <h3 className="font-display text-sm font-semibold">
                    {category.name}
                  </h3>
                  <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                    {category.count} muzayede
                  </p>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Upcoming Auctions */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="font-display text-3xl font-bold">
              {t("upcomingTitle")}
            </h2>
            <p className="mt-2 text-[var(--muted-foreground)]">
              {t("upcomingSubtitle")}
            </p>
          </div>
          <Link
            href={`/${locale}/auctions?status=upcoming`}
            className="hidden items-center gap-1 text-sm font-medium text-primary-500 hover:text-primary-600 sm:flex"
          >
            {tCommon("all")}
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {mockUpcomingAuctions.map((auction) => (
            <Card key={auction.id} hover className="overflow-hidden">
              <div className="flex flex-col sm:flex-row">
                <div className="relative aspect-square w-full sm:w-48 shrink-0">
                  <Image
                    src={auction.images[0]}
                    alt={auction.title}
                    fill
                    className="object-cover"
                  />
                  <Badge variant="secondary" className="absolute left-3 top-3">
                    <Clock className="mr-1 h-3 w-3" />
                    Yakinda
                  </Badge>
                </div>
                <CardContent className="flex flex-1 flex-col justify-between p-4">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-primary-500">
                      {auction.category}
                    </p>
                    <h3 className="mt-1 font-display text-base font-semibold line-clamp-2">
                      {auction.title}
                    </h3>
                  </div>
                  <div className="mt-3">
                    <p className="text-xs text-[var(--muted-foreground)]">
                      Baslangic Fiyati
                    </p>
                    <p className="text-lg font-bold text-primary-500">
                      {formatCurrency(auction.startingPrice)}
                    </p>
                    <div className="mt-2">
                      <CountdownTimer
                        endDate={auction.startTime}
                        compact
                        showIcon
                      />
                    </div>
                  </div>
                </CardContent>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="bg-gradient-to-br from-navy-950 to-navy-900 py-16 text-white">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-12 text-center">
            <h2 className="font-display text-3xl font-bold">
              {t("whyChooseUs")}
            </h2>
            <p className="mt-2 text-gray-400">{t("trustedBy")}</p>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: Shield,
                title: t("securePayments"),
                description: t("securePaymentsDesc"),
              },
              {
                icon: BadgeCheck,
                title: t("verifiedSellers"),
                description: t("verifiedSellersDesc"),
              },
              {
                icon: TrendingUp,
                title: t("realTimeBidding"),
                description: t("realTimeBiddingDesc"),
              },
              {
                icon: Headphones,
                title: t("customerSupport"),
                description: t("customerSupportDesc"),
              },
            ].map((feature) => (
              <div key={feature.title} className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-500/20">
                  <feature.icon className="h-8 w-8 text-primary-400" />
                </div>
                <h3 className="font-display text-lg font-semibold">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm text-gray-400">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <Card className="overflow-hidden bg-gradient-to-r from-primary-500 to-primary-600 text-white">
          <CardContent className="flex flex-col items-center p-8 text-center sm:p-12">
            <Gavel className="mb-4 h-12 w-12" />
            <h2 className="font-display text-2xl font-bold sm:text-3xl">
              Muzayede Dunyasina Katilmaya Hazir Misiniz?
            </h2>
            <p className="mt-3 max-w-md text-primary-100">
              Hemen ucretsiz hesap olusturun ve benzersiz urunlere teklif
              vermeye baslayin.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link href={`/${locale}/register`}>
                <Button
                  size="lg"
                  className="bg-white text-primary-600 hover:bg-gray-100"
                >
                  Ucretsiz Kayit Ol
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href={`/${locale}/auctions`}>
                <Button
                  variant="outline"
                  size="lg"
                  className="border-white/30 text-white hover:bg-white/10"
                >
                  Muzayedelere Goz At
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
