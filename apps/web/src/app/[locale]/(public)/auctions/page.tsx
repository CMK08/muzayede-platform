"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import {
  Search,
  SlidersHorizontal,
  Grid3X3,
  List,
  ChevronDown,
  X,
  ArrowUpDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AuctionCard } from "@/components/auction/auction-card";
import { cn } from "@/lib/utils";
import { useAuctions, useAuctionCategories } from "@/hooks/use-auction";

const defaultCategories = [
  "Antika Taki",
  "Klasik Otomobil",
  "Luks Saat",
  "Sanat",
  "Mucevher",
  "Antika",
  "Elektronik",
  "Gayrimenkul",
];

const statusOptions = [
  { value: "active", label: "Aktif" },
  { value: "ending_soon", label: "Bitmek Uzere" },
  { value: "upcoming", label: "Yakinda" },
  { value: "ended", label: "Sona Erdi" },
];

const sortOptions = [
  { value: "newest", label: "En Yeni" },
  { value: "ending_soon", label: "Bitmek Uzere" },
  { value: "price_asc", label: "Fiyat (Artan)" },
  { value: "price_desc", label: "Fiyat (Azalan)" },
  { value: "most_bids", label: "En Cok Teklif" },
];

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

export default function AuctionsPage() {
  const t = useTranslations("auction");
  const searchParams = useSearchParams();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    searchParams.get("category") ? [searchParams.get("category")!] : []
  );
  const [selectedStatus, setSelectedStatus] = useState<string[]>(
    searchParams.get("status") ? [searchParams.get("status")!] : []
  );
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showFilters, setShowFilters] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const { data: apiCategories } = useAuctionCategories();
  const allCategories = apiCategories?.map((c) => c.name) || defaultCategories;

  const { data: auctionsData, isLoading, isError } = useAuctions({
    page: currentPage,
    limit: 12,
    search: searchQuery || undefined,
    category: selectedCategories.length > 0 ? selectedCategories[0] : undefined,
    status: selectedStatus.length > 0 ? selectedStatus[0] : undefined,
    minPrice: minPrice ? Number(minPrice) : undefined,
    maxPrice: maxPrice ? Number(maxPrice) : undefined,
    sort: sortBy,
  });

  const auctions = auctionsData?.data || [];
  const meta = auctionsData?.meta;

  const toggleCategory = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
    setCurrentPage(1);
  };

  const toggleStatus = (status: string) => {
    setSelectedStatus((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status]
    );
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedCategories([]);
    setSelectedStatus([]);
    setMinPrice("");
    setMaxPrice("");
    setSortBy("newest");
    setCurrentPage(1);
  };

  const hasActiveFilters =
    selectedCategories.length > 0 ||
    selectedStatus.length > 0 ||
    minPrice ||
    maxPrice;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold">{t("allAuctions")}</h1>
        <p className="mt-2 text-[var(--muted-foreground)]">
          {meta ? `${meta.total} ${t("results")}` : t("results")}
        </p>
      </div>

      {/* Search and Controls */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1 max-w-md">
          <Input
            placeholder={t("filters") + "..."}
            icon={<Search className="h-4 w-4" />}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Mobile Filter Toggle */}
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="lg:hidden"
          >
            <SlidersHorizontal className="mr-2 h-4 w-4" />
            {t("filters")}
            {hasActiveFilters && (
              <Badge variant="default" className="ml-2">
                {selectedCategories.length + selectedStatus.length}
              </Badge>
            )}
          </Button>

          {/* Sort Dropdown */}
          <div className="relative">
            <Button
              variant="outline"
              onClick={() => setShowSortMenu(!showSortMenu)}
            >
              <ArrowUpDown className="mr-2 h-4 w-4" />
              {t("sortBy")}
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>

            {showSortMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowSortMenu(false)}
                />
                <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-lg border border-[var(--border)] bg-[var(--card)] py-1 shadow-lg">
                  {sortOptions.map((option) => (
                    <button
                      key={option.value}
                      className={cn(
                        "flex w-full items-center px-3 py-2 text-sm transition-colors hover:bg-[var(--muted)]",
                        sortBy === option.value && "text-primary-500 bg-primary-500/5"
                      )}
                      onClick={() => {
                        setSortBy(option.value);
                        setShowSortMenu(false);
                        setCurrentPage(1);
                      }}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* View Mode */}
          <div className="hidden items-center rounded-lg border border-[var(--border)] sm:flex">
            <button
              className={cn(
                "p-2 transition-colors",
                viewMode === "grid" && "bg-[var(--muted)] text-primary-500"
              )}
              onClick={() => setViewMode("grid")}
            >
              <Grid3X3 className="h-4 w-4" />
            </button>
            <button
              className={cn(
                "p-2 transition-colors",
                viewMode === "list" && "bg-[var(--muted)] text-primary-500"
              )}
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Active Filters */}
      {hasActiveFilters && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {selectedCategories.map((cat) => (
            <Badge key={cat} variant="secondary" className="gap-1">
              {cat}
              <button onClick={() => toggleCategory(cat)}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {selectedStatus.map((status) => (
            <Badge key={status} variant="secondary" className="gap-1">
              {statusOptions.find((s) => s.value === status)?.label || status}
              <button onClick={() => toggleStatus(status)}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {(minPrice || maxPrice) && (
            <Badge variant="secondary" className="gap-1">
              {minPrice || "0"} - {maxPrice || "..."} TRY
              <button
                onClick={() => {
                  setMinPrice("");
                  setMaxPrice("");
                }}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          <button
            onClick={clearFilters}
            className="text-sm text-primary-500 hover:text-primary-600"
          >
            {t("clearFilters")}
          </button>
        </div>
      )}

      <div className="flex gap-8">
        {/* Filter Sidebar */}
        <aside
          className={cn(
            "w-64 shrink-0 space-y-6",
            "hidden lg:block",
            showFilters && "!block fixed inset-0 z-50 w-full bg-[var(--background)] p-4 lg:relative lg:w-64 lg:p-0"
          )}
        >
          {/* Mobile Close */}
          <div className="flex items-center justify-between lg:hidden">
            <h3 className="font-display text-lg font-semibold">
              {t("filters")}
            </h3>
            <button onClick={() => setShowFilters(false)}>
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Category Filter */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">{t("category")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {allCategories.map((category) => (
                <label
                  key={category}
                  className="flex cursor-pointer items-center gap-2 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(category)}
                    onChange={() => toggleCategory(category)}
                    className="h-4 w-4 rounded border-[var(--border)] text-primary-500 focus:ring-primary-500"
                  />
                  {category}
                </label>
              ))}
            </CardContent>
          </Card>

          {/* Price Range Filter */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">{t("priceRange")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                type="number"
                placeholder={t("minPrice")}
                value={minPrice}
                onChange={(e) => {
                  setMinPrice(e.target.value);
                  setCurrentPage(1);
                }}
              />
              <Input
                type="number"
                placeholder={t("maxPrice")}
                value={maxPrice}
                onChange={(e) => {
                  setMaxPrice(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </CardContent>
          </Card>

          {/* Status Filter */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">{t("status")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {statusOptions.map((option) => (
                <label
                  key={option.value}
                  className="flex cursor-pointer items-center gap-2 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={selectedStatus.includes(option.value)}
                    onChange={() => toggleStatus(option.value)}
                    className="h-4 w-4 rounded border-[var(--border)] text-primary-500 focus:ring-primary-500"
                  />
                  {option.label}
                </label>
              ))}
            </CardContent>
          </Card>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <Button
              variant="outline"
              className="w-full"
              onClick={clearFilters}
            >
              {t("clearFilters")}
            </Button>
          )}
        </aside>

        {/* Auction Grid */}
        <div className="flex-1">
          {isLoading ? (
            <div
              className={cn(
                viewMode === "grid"
                  ? "grid gap-6 sm:grid-cols-2 xl:grid-cols-3"
                  : "space-y-4"
              )}
            >
              <AuctionCardSkeleton />
              <AuctionCardSkeleton />
              <AuctionCardSkeleton />
              <AuctionCardSkeleton />
              <AuctionCardSkeleton />
              <AuctionCardSkeleton />
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border)] py-20">
              <Search className="mb-4 h-12 w-12 text-[var(--muted-foreground)]" />
              <h3 className="font-display text-lg font-semibold">
                Bir hata olustu
              </h3>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                Muzayedeler yuklenirken hata olustu. Lutfen tekrar deneyin.
              </p>
            </div>
          ) : auctions.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border)] py-20">
              <Search className="mb-4 h-12 w-12 text-[var(--muted-foreground)]" />
              <h3 className="font-display text-lg font-semibold">
                {t("noAuctions")}
              </h3>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                {t("noAuctionsDesc")}
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={clearFilters}
              >
                {t("clearFilters")}
              </Button>
            </div>
          ) : (
            <div
              className={cn(
                viewMode === "grid"
                  ? "grid gap-6 sm:grid-cols-2 xl:grid-cols-3"
                  : "space-y-4"
              )}
            >
              {auctions.map((auction) => (
                <AuctionCard
                  key={auction.id}
                  auction={auction}
                  compact={viewMode === "list"}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {meta && meta.totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                Onceki
              </Button>
              {Array.from({ length: Math.min(meta.totalPages, 5) }, (_, i) => {
                let page: number;
                if (meta.totalPages <= 5) {
                  page = i + 1;
                } else if (currentPage <= 3) {
                  page = i + 1;
                } else if (currentPage >= meta.totalPages - 2) {
                  page = meta.totalPages - 4 + i;
                } else {
                  page = currentPage - 2 + i;
                }
                return (
                  <Button
                    key={page}
                    variant={page === currentPage ? "default" : "outline"}
                    size="sm"
                    className="w-10"
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </Button>
                );
              })}
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= meta.totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
              >
                Sonraki
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
