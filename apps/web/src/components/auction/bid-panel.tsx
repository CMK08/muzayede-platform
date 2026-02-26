"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { Gavel, TrendingUp, Shield, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { CountdownTimer } from "@/components/auction/countdown-timer";
import { usePlaceBid, usePlaceProxyBid } from "@/hooks/use-bids";
import { useAuctionStore } from "@/stores/auction-store";
import { useAuthStore } from "@/stores/auth-store";
import { formatCurrency, generateBidIncrements, cn } from "@/lib/utils";

interface BidPanelProps {
  auctionId: string;
  className?: string;
}

export function BidPanel({ auctionId, className }: BidPanelProps) {
  const t = useTranslations("bid");
  const { currentAuction, bidError } = useAuctionStore();
  const { isAuthenticated } = useAuthStore();
  const placeBid = usePlaceBid();
  const placeProxyBid = usePlaceProxyBid();

  const [bidAmount, setBidAmount] = useState<string>("");
  const [proxyMaxAmount, setProxyMaxAmount] = useState<string>("");
  const [showProxyDialog, setShowProxyDialog] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  if (!currentAuction) return null;

  const currentPrice = currentAuction.currentPrice;
  const minBidAmount = currentPrice + currentAuction.minBidIncrement;
  const increments = generateBidIncrements(currentPrice);
  const isActive =
    currentAuction.status === "active" ||
    currentAuction.status === "ending_soon";

  const handleQuickBid = (increment: number) => {
    const newAmount = currentPrice + increment;
    setBidAmount(String(newAmount));
  };

  const handlePlaceBid = () => {
    const amount = Number(bidAmount);
    if (amount < minBidAmount) return;
    setShowConfirmDialog(true);
  };

  const confirmBid = () => {
    const amount = Number(bidAmount);
    placeBid.mutate(
      { auctionId, amount },
      {
        onSuccess: () => {
          setBidAmount("");
          setShowConfirmDialog(false);
        },
      }
    );
  };

  const handleProxyBid = () => {
    const maxAmount = Number(proxyMaxAmount);
    if (maxAmount < minBidAmount) return;
    placeProxyBid.mutate(
      { auctionId, maxAmount },
      {
        onSuccess: () => {
          setProxyMaxAmount("");
          setShowProxyDialog(false);
        },
      }
    );
  };

  return (
    <Card className={cn("sticky top-4", className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{t("bidPanel")}</CardTitle>
          {isActive && <Badge variant="live">{t("live")}</Badge>}
        </div>

        {/* Countdown */}
        {isActive && (
          <div className="mt-3">
            <CountdownTimer
              endDate={currentAuction.endTime}
              showIcon
            />
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Current Price Display */}
        <div className="rounded-xl bg-gradient-to-r from-primary-500/10 to-primary-400/5 p-4">
          <p className="text-sm text-[var(--muted-foreground)]">
            {t("currentPrice")}
          </p>
          <p className="text-3xl font-bold text-primary-500">
            {formatCurrency(currentPrice)}
          </p>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
            {currentAuction.totalBids} {t("totalBids")}
          </p>
        </div>

        {isActive && isAuthenticated && (
          <>
            {/* Quick Bid Buttons */}
            <div>
              <p className="mb-2 text-sm font-medium text-[var(--muted-foreground)]">
                {t("quickBid")}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {increments.map((increment) => (
                  <Button
                    key={increment}
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickBid(increment)}
                    className="text-xs"
                  >
                    <TrendingUp className="mr-1 h-3 w-3" />+
                    {formatCurrency(increment)}
                  </Button>
                ))}
              </div>
            </div>

            {/* Custom Bid Input */}
            <div>
              <Input
                type="number"
                label={t("yourBid")}
                placeholder={`${t("minimum")}: ${formatCurrency(minBidAmount)}`}
                value={bidAmount}
                onChange={(e) => setBidAmount(e.target.value)}
                min={minBidAmount}
                step={currentAuction.minBidIncrement}
                icon={<span className="text-xs font-medium">TRY</span>}
                iconPosition="right"
                error={
                  bidAmount && Number(bidAmount) < minBidAmount
                    ? `${t("minimumBid")}: ${formatCurrency(minBidAmount)}`
                    : undefined
                }
              />
            </div>

            {/* Place Bid Button */}
            <Button
              className="w-full text-base"
              size="lg"
              onClick={handlePlaceBid}
              disabled={
                !bidAmount ||
                Number(bidAmount) < minBidAmount ||
                placeBid.isPending
              }
              loading={placeBid.isPending}
            >
              <Gavel className="mr-2 h-5 w-5" />
              {placeBid.isPending ? t("placing") : t("placeBid")}
            </Button>

            {/* Proxy Bid */}
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowProxyDialog(true)}
            >
              <Shield className="mr-2 h-4 w-4" />
              {t("autoBid")}
            </Button>

            {/* Error Display */}
            {bidError && (
              <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-500">
                {bidError}
              </div>
            )}

            {/* Info */}
            <div className="flex items-start gap-2 text-xs text-[var(--muted-foreground)]">
              <Info className="mt-0.5 h-3 w-3 shrink-0" />
              <p>{t("bidInfo")}</p>
            </div>
          </>
        )}

        {isActive && !isAuthenticated && (
          <div className="rounded-lg bg-[var(--muted)] p-4 text-center">
            <p className="text-sm text-[var(--muted-foreground)]">
              {t("loginRequired")}
            </p>
            <Button className="mt-3" size="sm" asChild>
              <a href="/tr/login">{t("loginToBid")}</a>
            </Button>
          </div>
        )}

        {!isActive && (
          <div className="rounded-lg bg-[var(--muted)] p-4 text-center">
            <p className="text-sm font-medium">
              {currentAuction.status === "ended" || currentAuction.status === "sold"
                ? t("auctionEnded")
                : currentAuction.status === "upcoming"
                ? t("auctionNotStarted")
                : t("auctionCancelled")}
            </p>
            {currentAuction.winnerName && (
              <p className="mt-1 text-sm text-primary-500">
                {t("winner")}: {currentAuction.winnerName}
              </p>
            )}
          </div>
        )}
      </CardContent>

      {/* Confirm Bid Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("confirmBid")}</DialogTitle>
            <DialogDescription>{t("confirmBidDescription")}</DialogDescription>
          </DialogHeader>
          <div className="py-4 text-center">
            <p className="text-sm text-[var(--muted-foreground)]">
              {t("bidAmount")}
            </p>
            <p className="text-3xl font-bold text-primary-500">
              {formatCurrency(Number(bidAmount))}
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
            >
              {t("cancel")}
            </Button>
            <Button onClick={confirmBid} loading={placeBid.isPending}>
              <Gavel className="mr-2 h-4 w-4" />
              {t("confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Proxy Bid Dialog */}
      <Dialog open={showProxyDialog} onOpenChange={setShowProxyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("autoBidTitle")}</DialogTitle>
            <DialogDescription>{t("autoBidDescription")}</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              type="number"
              label={t("maxBidAmount")}
              placeholder={formatCurrency(minBidAmount)}
              value={proxyMaxAmount}
              onChange={(e) => setProxyMaxAmount(e.target.value)}
              min={minBidAmount}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowProxyDialog(false)}
            >
              {t("cancel")}
            </Button>
            <Button
              onClick={handleProxyBid}
              disabled={
                !proxyMaxAmount || Number(proxyMaxAmount) < minBidAmount
              }
              loading={placeProxyBid.isPending}
            >
              <Shield className="mr-2 h-4 w-4" />
              {t("setAutoBid")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
