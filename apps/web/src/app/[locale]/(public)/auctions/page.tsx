"use client";

import React, { useState, useMemo } from "react";
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
import type { AuctionItem } from "@/stores/auction-store";

// Mock auction data
const mockAuctions: AuctionItem[] = [
  {
    id: "1",
    title: "Osmanli Donemi Altin Kupe Seti - 18. Yuzyil",
    description: "Nadir bulunan Osmanli donemi el isciliginde altin kupe seti",
    images: ["https://images.unsplash.com/photo-1515562141589-67f0d569b6c6?w=600"],
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
  },
  {
    id: "2",
    title: "1967 Ford Mustang Shelby GT500",
    description: "Tam restore edilmis klasik Amerikan muscle car",
    images: ["https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=600"],
    category: "Klasik Otomobil",
    startingPrice: 500000,
    currentPrice: 875000,
    minBidIncrement: 25000,
    startTime: "2026-02-18T10:00:00Z",
    endTime: "2026-03-02T20:00:00Z",
    status: "ending_soon",
    sellerId: "s2",
    sellerName: "Klasik Motor",
    totalBids: 15,
    watchCount: 342,
  },
  {
    id: "3",
    title: "Rolex Daytona 116500LN - 2024",
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
    title: "Yagli Boya Tablo - Istanbul Bogazi",
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
  {
    id: "5",
    title: "Elmas Yuzuk - 3.5 Karat Oval Kesim",
    description: "GIA sertifikali oval kesim elmas",
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
    description: "El dokuması Hereke halisi",
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

const allCategories = [
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

  const filteredAuctions = useMemo(() => {
    let results = [...mockAuctions];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      results = results.filter(
        (a) =>
          a.title.toLowerCase().includes(query) ||
          a.description.toLowerCase().includes(query) ||
          a.category.toLowerCase().includes(query)
      );
    }

    if (selectedCategories.length > 0) {
      results = results.filter((a) =>
        selectedCategories.some(
          (c) =>
            a.category.toLowerCase().includes(c.toLowerCase()) ||
            c.toLowerCase().includes(a.category.toLowerCase())
        )
      );
    }

    if (selectedStatus.length > 0) {
      results = results.filter((a) => selectedStatus.includes(a.status));
    }

    if (minPrice) {
      results = results.filter((a) => a.currentPrice >= Number(minPrice));
    }
    if (maxPrice) {
      results = results.filter((a) => a.currentPrice <= Number(maxPrice));
    }

    switch (sortBy) {
      case "price_asc":
        results.sort((a, b) => a.currentPrice - b.currentPrice);
        break;
      case "price_desc":
        results.sort((a, b) => b.currentPrice - a.currentPrice);
        break;
      case "most_bids":
        results.sort((a, b) => b.totalBids - a.totalBids);
        break;
      case "ending_soon":
        results.sort(
          (a, b) => new Date(a.endTime).getTime() - new Date(b.endTime).getTime()
        );
        break;
      default:
        results.sort(
          (a, b) =>
            new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
        );
    }

    return results;
  }, [searchQuery, selectedCategories, selectedStatus, minPrice, maxPrice, sortBy]);

  const toggleCategory = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const toggleStatus = (status: string) => {
    setSelectedStatus((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status]
    );
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedCategories([]);
    setSelectedStatus([]);
    setMinPrice("");
    setMaxPrice("");
    setSortBy("newest");
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
          {filteredAuctions.length} {t("results")}
        </p>
      </div>

      {/* Search and Controls */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1 max-w-md">
          <Input
            placeholder={t("filters") + "..."}
            icon={<Search className="h-4 w-4" />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
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
                onChange={(e) => setMinPrice(e.target.value)}
              />
              <Input
                type="number"
                placeholder={t("maxPrice")}
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
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
          {filteredAuctions.length === 0 ? (
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
              {filteredAuctions.map((auction) => (
                <AuctionCard
                  key={auction.id}
                  auction={auction}
                  compact={viewMode === "list"}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {filteredAuctions.length > 0 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <Button variant="outline" size="sm" disabled>
                Onceki
              </Button>
              {[1, 2, 3].map((page) => (
                <Button
                  key={page}
                  variant={page === 1 ? "default" : "outline"}
                  size="sm"
                  className="w-10"
                >
                  {page}
                </Button>
              ))}
              <Button variant="outline" size="sm">
                Sonraki
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
