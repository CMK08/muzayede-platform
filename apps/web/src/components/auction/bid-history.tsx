"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { User, TrendingUp, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatRelativeTime, cn } from "@/lib/utils";
import type { Bid } from "@/stores/auction-store";

interface BidHistoryProps {
  bids: Bid[];
  isLoading?: boolean;
  maxItems?: number;
  className?: string;
}

export function BidHistory({
  bids,
  isLoading = false,
  maxItems = 10,
  className,
}: BidHistoryProps) {
  const t = useTranslations("bid");
  const displayedBids = bids.slice(0, maxItems);

  if (isLoading) {
    return (
      <div className={cn("space-y-3", className)}>
        <h3 className="font-display text-lg font-semibold">
          {t("bidHistory")}
        </h3>
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between rounded-lg bg-[var(--muted)] p-3 animate-pulse"
          >
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-[var(--border)]" />
              <div className="space-y-1.5">
                <div className="h-3 w-24 rounded bg-[var(--border)]" />
                <div className="h-2.5 w-16 rounded bg-[var(--border)]" />
              </div>
            </div>
            <div className="h-4 w-20 rounded bg-[var(--border)]" />
          </div>
        ))}
      </div>
    );
  }

  if (bids.length === 0) {
    return (
      <div className={cn("space-y-3", className)}>
        <h3 className="font-display text-lg font-semibold">
          {t("bidHistory")}
        </h3>
        <div className="rounded-lg bg-[var(--muted)] p-8 text-center">
          <TrendingUp className="mx-auto h-8 w-8 text-[var(--muted-foreground)]" />
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">
            {t("noBidsYet")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-semibold">
          {t("bidHistory")}
        </h3>
        <span className="text-sm text-[var(--muted-foreground)]">
          {bids.length} {t("totalBids")}
        </span>
      </div>

      <div className="space-y-2">
        {displayedBids.map((bid, index) => (
          <div
            key={bid.id}
            className={cn(
              "flex items-center justify-between rounded-lg p-3 transition-colors",
              index === 0
                ? "bg-primary-500/10 border border-primary-500/20"
                : "bg-[var(--muted)] hover:bg-[var(--muted)]/80"
            )}
          >
            <div className="flex items-center gap-3">
              {/* Avatar */}
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full",
                  index === 0
                    ? "bg-primary-500 text-white"
                    : "bg-[var(--border)] text-[var(--muted-foreground)]"
                )}
              >
                <User className="h-4 w-4" />
              </div>

              {/* Bidder Info */}
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {bid.bidderName}
                  </span>
                  {index === 0 && (
                    <Badge variant="default" className="text-[10px] px-1.5 py-0">
                      {t("highestBid")}
                    </Badge>
                  )}
                  {bid.isAutoBid && (
                    <Badge
                      variant="secondary"
                      className="text-[10px] px-1.5 py-0"
                    >
                      {t("auto")}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1 text-xs text-[var(--muted-foreground)]">
                  <Clock className="h-3 w-3" />
                  {formatRelativeTime(bid.timestamp)}
                </div>
              </div>
            </div>

            {/* Amount */}
            <span
              className={cn(
                "text-sm font-bold tabular-nums",
                index === 0 ? "text-primary-500" : "text-[var(--foreground)]"
              )}
            >
              {formatCurrency(bid.amount)}
            </span>
          </div>
        ))}
      </div>

      {bids.length > maxItems && (
        <button className="w-full rounded-lg border border-[var(--border)] py-2 text-center text-sm font-medium text-primary-500 transition-colors hover:bg-primary-500/5">
          {t("showAllBids")} ({bids.length})
        </button>
      )}
    </div>
  );
}
