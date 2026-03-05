/**
 * Ana Sayfa (Home Page)
 *
 * Platformun giris sayfasidir. Ziyaretcilere ve kullanicilara platformun
 * genel gorunumunu sunar.
 *
 * Bolumler:
 * - Hero: Baslik, aciklama, CTA butonlari ve one cikan muzayede onizlemesi
 * - Istatistikler: Platform sayisal verileri (toplam muzayede, teklif, uye, hacim)
 * - One Cikan Muzayedeler: API'den cekilen vitrin muzayedeleri
 * - Kategoriler: Muzayede kategorileri (mucevher, saat, otomobil, sanat vb.)
 * - Yaklasan Muzayedeler: Henuz baslamayan muzayedeler ve geri sayim
 * - Neden Biz: Platformun avantajlari (guvenlik, dogrulama, canli teklif, destek)
 * - CTA: Kayit olma ve muzayede kesfetme cagrisi
 */
"use client";

import React from "react";
import Link from "next/link";
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
import { AuctionImage } from "@/components/auction/auction-image";
import { CountdownTimer } from "@/components/auction/countdown-timer";
import { formatCurrency } from "@/lib/utils";
import { useFeaturedAuctions, useUpcomingAuctions, useAuctionCategories } from "@/hooks/use-auction";

// Kategori ID'leri ile Lucide ikon bilesenleri arasindaki eslestirme
const categoryIcons: Record<string, typeof Gem> = {
  jewelry: Gem,
  watches: Watch,
  cars: Car,
  art: Palette,
  property: HomeIcon,
  electronics: Smartphone,
};

// API'den kategori verisi yuklenemediginde kullanilacak varsayilan kategoriler
const defaultCategories = [
  { id: "jewelry", name: "Mucevher", icon: Gem },
  { id: "watches", name: "Luks Saat", icon: Watch },
  { id: "cars", name: "Klasik Otomobil", icon: Car },
  { id: "art", name: "Sanat", icon: Palette },
  { id: "property", name: "Gayrimenkul", icon: HomeIcon },
  { id: "electronics", name: "Elektronik", icon: Smartphone },
];

// Muzayede karti yukleniyor durumunda gosterilen iskelet (skeleton) bileseni
function AuctionCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <div className="aspect-[4/3] animate-pulse bg-[var(--muted)]" />
      <CardContent className="p-4 space-y-3">
        <div className="h-3 w-20 animate-pulse rounded bg-[var(--muted)]" />
        <div className="h-4 w-full animate-pulse rounded bg-[var(--muted)]" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-[var(--muted)]" />
        <div className="flex justify-between">
          <div className="h-5 w-24 animate-pulse rounded bg-[var(--muted)]" />
          <div className="h-5 w-16 animate-pulse rounded bg-[var(--muted)]" />
        </div>
      </CardContent>
    </Card>
  );
}

// Yaklasan muzayede karti icin iskelet (skeleton) bileseni
function UpcomingAuctionSkeleton() {
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col sm:flex-row">
        <div className="aspect-square w-full sm:w-48 shrink-0 animate-pulse bg-[var(--muted)]" />
        <CardContent className="flex flex-1 flex-col justify-between p-4 space-y-3">
          <div className="space-y-2">
            <div className="h-3 w-20 animate-pulse rounded bg-[var(--muted)]" />
            <div className="h-4 w-full animate-pulse rounded bg-[var(--muted)]" />
          </div>
          <div className="space-y-2">
            <div className="h-3 w-24 animate-pulse rounded bg-[var(--muted)]" />
            <div className="h-6 w-32 animate-pulse rounded bg-[var(--muted)]" />
          </div>
        </CardContent>
      </div>
    </Card>
  );
}

export default function HomePage() {
  const locale = useLocale();
  const t = useTranslations("home");
  const tCommon = useTranslations("common");

  // API'den one cikan muzayedeleri, yaklasan muzayedeleri ve kategorileri cek
  const { data: featuredAuctions, isLoading: featuredLoading } = useFeaturedAuctions();
  const { data: upcomingAuctions, isLoading: upcomingLoading } = useUpcomingAuctions();
  const { data: apiCategories } = useAuctionCategories();

  // API kategorilerine ikon ekle; API'den veri gelmezse varsayilanlari kullan
  const categories = apiCategories?.map((cat) => ({
    ...cat,
    icon: categoryIcons[cat.id] || Gem,
  })) || defaultCategories;

  // Hero bolumunde gosterilecek ilk one cikan muzayede
  const heroAuction = featuredAuctions?.[0];

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
                {heroAuction ? (
                  <Card className="relative overflow-hidden border-white/10 bg-white/5 backdrop-blur-sm">
                    <div className="relative aspect-[4/3]">
                      <AuctionImage
                        src={heroAuction.images?.[0]}
                        alt={heroAuction.title}
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
                        {heroAuction.category}
                      </p>
                      <h3 className="mt-1 font-display text-lg font-semibold">
                        {heroAuction.title}
                      </h3>
                      <div className="mt-3 flex items-end justify-between">
                        <div>
                          <p className="text-xs text-gray-400">Guncel Fiyat</p>
                          <p className="text-2xl font-bold text-primary-400">
                            {formatCurrency(heroAuction.currentPrice)}
                          </p>
                        </div>
                        <CountdownTimer
                          endDate={heroAuction.endTime}
                          compact
                          showIcon
                        />
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="relative overflow-hidden border-white/10 bg-white/5 backdrop-blur-sm">
                    <div className="aspect-[4/3] animate-pulse bg-white/10" />
                    <CardContent className="p-5 space-y-3">
                      <div className="h-3 w-20 animate-pulse rounded bg-white/10" />
                      <div className="h-5 w-full animate-pulse rounded bg-white/10" />
                      <div className="flex justify-between">
                        <div className="h-8 w-32 animate-pulse rounded bg-white/10" />
                        <div className="h-6 w-20 animate-pulse rounded bg-white/10" />
                      </div>
                    </CardContent>
                  </Card>
                )}
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
          {featuredLoading ? (
            <>
              <AuctionCardSkeleton />
              <AuctionCardSkeleton />
              <AuctionCardSkeleton />
              <AuctionCardSkeleton />
            </>
          ) : featuredAuctions && featuredAuctions.length > 0 ? (
            featuredAuctions.map((auction) => (
              <AuctionCard key={auction.id} auction={auction} />
            ))
          ) : (
            <div className="col-span-full text-center py-12 text-[var(--muted-foreground)]">
              Henuz one cikan muzayede bulunmuyor.
            </div>
          )}
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
            {categories.map((category) => {
              const IconComponent = category.icon;
              return (
                <Link
                  key={category.id}
                  href={`/${locale}/auctions?category=${category.id}`}
                >
                  <Card
                    hover
                    className="group flex flex-col items-center p-6 text-center"
                  >
                    <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-primary-500/10 transition-colors group-hover:bg-primary-500 group-hover:text-white">
                      <IconComponent className="h-7 w-7 text-primary-500 group-hover:text-white" />
                    </div>
                    <h3 className="font-display text-sm font-semibold">
                      {category.name}
                    </h3>
                    {"count" in category && (
                      <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                        {(category as { count?: number }).count} muzayede
                      </p>
                    )}
                  </Card>
                </Link>
              );
            })}
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
          {upcomingLoading ? (
            <>
              <UpcomingAuctionSkeleton />
              <UpcomingAuctionSkeleton />
            </>
          ) : upcomingAuctions && upcomingAuctions.length > 0 ? (
            upcomingAuctions.map((auction) => (
              <Card key={auction.id} hover className="overflow-hidden">
                <div className="flex flex-col sm:flex-row">
                  <div className="relative aspect-square w-full sm:w-48 shrink-0">
                    <AuctionImage
                      src={auction.images?.[0]}
                      alt={auction.title}
                      fill
                      className="object-cover"
                      compact
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
            ))
          ) : (
            <div className="col-span-full text-center py-12 text-[var(--muted-foreground)]">
              Yaklasan muzayede bulunmuyor.
            </div>
          )}
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
