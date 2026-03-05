/**
 * Tekliflerim Sayfasi (My Bids Page)
 *
 * Kullanicinin verdigi tum teklifleri listeleyen ve yonetmesini saglayan sayfadir.
 *
 * Ozellikler:
 * - Teklif listesini sekmelere gore filtreleme (tumu, aktif, kazanilan, kaybedilen)
 * - Ozet istatistik kartlari (toplam, aktif, kazanilan, kaybedilen teklif sayilari)
 * - Her teklif icin detay bilgisi (teklif tutari, guncel fiyat, kalan sure)
 * - Teklif artirma dialog penceresi
 * - Teklif durumu gostergesi (aktif, kazanildi, kaybedildi, asildi)
 * - En yuksek teklif sahibi bilgilendirmesi
 */
"use client";

import React, { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import {
  Gavel,
  Clock,
  Trophy,
  XCircle,
  ArrowUpRight,
  TrendingUp,
  Loader2,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { AuctionImage } from "@/components/auction/auction-image";
import { formatCurrency, formatRelativeTime } from "@/lib/utils";
import { useUserBids } from "@/hooks/use-bids";

// Teklif ogesi tipini tanimlar
interface BidItem {
  id: string;
  auctionId: string;
  auctionTitle: string;
  auctionImage: string | null;
  myBidAmount: number;
  currentPrice: number;
  status: "active" | "won" | "lost" | "outbid";
  endDate: string;
  bidDate: string;
  category: string;
}

// Her teklif durumu icin etiket, badge rengi ve ikon eslestirmesi
const statusConfig: Record<
  string,
  { label: string; variant: "live" | "success" | "destructive" | "warning"; icon: typeof Gavel }
> = {
  active: { label: "Aktif", variant: "live", icon: Clock },
  won: { label: "Kazanildi", variant: "success", icon: Trophy },
  lost: { label: "Kaybedildi", variant: "destructive", icon: XCircle },
  outbid: { label: "Asildi", variant: "warning", icon: TrendingUp },
};

export default function MyBidsPage() {
  const t = useTranslations("common");
  void t; // TODO: sabit yazilmis metinleri t() cagrilariyla degistir
  const locale = useLocale();
  const [activeTab, setActiveTab] = useState("all"); // Aktif sekme filtresi
  // Teklif artirma dialog penceresi durumu
  const [increaseBidDialog, setIncreaseBidDialog] = useState<{
    open: boolean;
    bid: BidItem | null;
  }>({ open: false, bid: null });
  const [newBidAmount, setNewBidAmount] = useState(""); // Yeni teklif tutari

  // API'den kullanicinin tum tekliflerini cek
  const { data: bidsData, isLoading } = useUserBids(1, 50);
  // API verisini BidItem formatina donustur (farkli API yapilarini normalize eder)
  const allBids: BidItem[] = (bidsData?.data || []).map((b) => {
    const bid = b as unknown as Record<string, unknown>;
    const auction = (bid.auction || {}) as Record<string, unknown>;
    const images = (auction.images || []) as string[];
    return {
      id: bid.id as string,
      auctionId: bid.auctionId as string,
      auctionTitle: (bid.auctionTitle || auction.title || "") as string,
      auctionImage: (bid.auctionImage || images[0] || null) as string | null,
      myBidAmount: (bid.amount || bid.myBidAmount || 0) as number,
      currentPrice: (bid.currentPrice || auction.currentPrice || 0) as number,
      status: (bid.status || "active") as BidItem["status"],
      endDate: (bid.endDate || auction.endTime || "") as string,
      bidDate: (bid.timestamp || bid.bidDate || bid.createdAt || "") as string,
      category: (bid.category || auction.category || "") as string,
    };
  });

  // Secili sekmeye gore teklifleri filtrele
  const filterBids = (tab: string): BidItem[] => {
    switch (tab) {
      case "active":
        return allBids.filter(
          (b) => b.status === "active" || b.status === "outbid"
        );
      case "won":
        return allBids.filter((b) => b.status === "won");
      case "lost":
        return allBids.filter((b) => b.status === "lost");
      default:
        return allBids;
    }
  };

  const bids = filterBids(activeTab);

  // Ozet istatistik sayaclari
  const activeBidsCount = allBids.filter(
    (b) => b.status === "active" || b.status === "outbid"
  ).length; // Aktif ve asilmis teklifler
  const wonCount = allBids.filter((b) => b.status === "won").length; // Kazanilan teklifler
  const lostCount = allBids.filter((b) => b.status === "lost").length; // Kaybedilen teklifler

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="font-display text-3xl font-bold">Tekliflerim</h1>
        <p className="mt-1 text-[var(--muted-foreground)]">
          Tum tekliflerinizi takip edin
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Gavel className="mx-auto h-5 w-5 text-primary-500" />
            <p className="mt-2 text-2xl font-bold">{allBids.length}</p>
            <p className="text-xs text-[var(--muted-foreground)]">Toplam</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="mx-auto h-5 w-5 text-blue-500" />
            <p className="mt-2 text-2xl font-bold">{activeBidsCount}</p>
            <p className="text-xs text-[var(--muted-foreground)]">Aktif</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Trophy className="mx-auto h-5 w-5 text-emerald-500" />
            <p className="mt-2 text-2xl font-bold">{wonCount}</p>
            <p className="text-xs text-[var(--muted-foreground)]">Kazanilan</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <XCircle className="mx-auto h-5 w-5 text-red-500" />
            <p className="mt-2 text-2xl font-bold">{lostCount}</p>
            <p className="text-xs text-[var(--muted-foreground)]">Kaybedilen</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">Tumu ({allBids.length})</TabsTrigger>
          <TabsTrigger value="active">Aktif ({activeBidsCount})</TabsTrigger>
          <TabsTrigger value="won">Kazanilan ({wonCount})</TabsTrigger>
          <TabsTrigger value="lost">Kaybedilen ({lostCount})</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab}>
          <div className="space-y-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
              </div>
            ) : bids.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Gavel className="h-12 w-12 text-[var(--muted-foreground)]" />
                  <p className="mt-4 font-medium">Teklif bulunamadi</p>
                  <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                    Bu kategoride henuz teklifiniz yok
                  </p>
                  <Link href={`/${locale}/auctions`}>
                    <Button className="mt-4" size="sm">
                      Muzayedeleri Kesfet
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              bids.map((bid) => {
                const config = statusConfig[bid.status];
                // Kullanicinin teklifi su anki en yuksek teklif mi kontrol et
                const isLeading =
                  bid.status === "active" &&
                  bid.myBidAmount >= bid.currentPrice;
                return (
                  <Card key={bid.id} className="overflow-hidden">
                    <CardContent className="p-0">
                      <div className="flex gap-4 p-4">
                        {/* Image */}
                        <div className="relative hidden h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-[var(--muted)] sm:flex">
                          <AuctionImage
                            src={bid.auctionImage}
                            alt={bid.auctionTitle}
                            fill
                            className="object-cover"
                            compact
                          />
                        </div>

                        {/* Content */}
                        <div className="flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-xs font-medium uppercase tracking-wider text-primary-500">
                                {bid.category}
                              </p>
                              <Link
                                href={`/${locale}/auctions/${bid.auctionId}`}
                                className="font-display text-base font-semibold hover:text-primary-500"
                              >
                                {bid.auctionTitle}
                              </Link>
                            </div>
                            <Badge variant={config.variant}>
                              {config.label}
                            </Badge>
                          </div>

                          <div className="mt-3 flex flex-wrap items-end gap-4 text-sm">
                            <div>
                              <p className="text-xs text-[var(--muted-foreground)]">
                                Teklifim
                              </p>
                              <p className="font-bold text-primary-500">
                                {formatCurrency(bid.myBidAmount)}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-[var(--muted-foreground)]">
                                Guncel Fiyat
                              </p>
                              <p className="font-medium">
                                {formatCurrency(bid.currentPrice)}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-[var(--muted-foreground)]">
                                {bid.status === "active" || bid.status === "outbid"
                                  ? "Kalan Sure"
                                  : "Bitis"}
                              </p>
                              <p className="text-xs">
                                {formatRelativeTime(bid.endDate)}
                              </p>
                            </div>
                            <div className="ml-auto flex gap-2">
                              {(bid.status === "outbid" ||
                                bid.status === "active") && (
                                <Button
                                  size="sm"
                                  variant={
                                    bid.status === "outbid" ? "default" : "outline"
                                  }
                                  onClick={() => {
                                    setIncreaseBidDialog({ open: true, bid });
                                    setNewBidAmount("");
                                  }}
                                >
                                  <TrendingUp className="mr-1 h-3.5 w-3.5" />
                                  {bid.status === "outbid"
                                    ? "Teklif Artir"
                                    : "Teklifi Yukselt"}
                                </Button>
                              )}
                              <Link
                                href={`/${locale}/auctions/${bid.auctionId}`}
                              >
                                <Button size="sm" variant="ghost">
                                  <ArrowUpRight className="h-4 w-4" />
                                </Button>
                              </Link>
                            </div>
                          </div>
                        </div>
                      </div>
                      {isLeading && (
                        <div className="border-t border-emerald-500/20 bg-emerald-500/5 px-4 py-2 text-xs text-emerald-600 dark:text-emerald-400">
                          En yuksek teklif sizin!
                        </div>
                      )}
                      {bid.status === "outbid" && (
                        <div className="border-t border-amber-500/20 bg-amber-500/5 px-4 py-2 text-xs text-amber-600 dark:text-amber-400">
                          Teklifiniz asildi. Teklif artirarak muzayedeye devam edebilirsiniz.
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Increase Bid Dialog */}
      <Dialog
        open={increaseBidDialog.open}
        onOpenChange={(open) =>
          setIncreaseBidDialog({ ...increaseBidDialog, open })
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Teklif Artir</DialogTitle>
            <DialogDescription>
              {increaseBidDialog.bid?.auctionTitle} icin yeni teklifinizi girin
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <div className="rounded-lg bg-[var(--muted)] p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--muted-foreground)]">Mevcut Teklifiniz</span>
                <span className="font-medium">
                  {formatCurrency(increaseBidDialog.bid?.myBidAmount || 0)}
                </span>
              </div>
              <div className="mt-1 flex justify-between">
                <span className="text-[var(--muted-foreground)]">Guncel En Yuksek</span>
                <span className="font-medium">
                  {formatCurrency(increaseBidDialog.bid?.currentPrice || 0)}
                </span>
              </div>
            </div>
            <Input
              label="Yeni Teklif Tutari (TL)"
              type="number"
              value={newBidAmount}
              onChange={(e) => setNewBidAmount(e.target.value)}
              placeholder={String(
                (increaseBidDialog.bid?.currentPrice || 0) + 1000
              )}
            />
            <p className="text-xs text-[var(--muted-foreground)]">
              Minimum teklif:{" "}
              {formatCurrency((increaseBidDialog.bid?.currentPrice || 0) + 100)}
            </p>
          </div>
          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() =>
                setIncreaseBidDialog({ open: false, bid: null })
              }
            >
              Vazgec
            </Button>
            <Button
              onClick={() =>
                setIncreaseBidDialog({ open: false, bid: null })
              }
            >
              <Gavel className="mr-2 h-4 w-4" />
              Teklif Ver
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
