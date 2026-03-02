import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import api, { apiRoutes } from "@/lib/api";
import type { AuctionItem } from "@/stores/auction-store";

interface AuctionListParams {
  page?: number;
  limit?: number;
  category?: string;
  status?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: string;
  search?: string;
}

interface AuctionListResponse {
  data: AuctionItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// ---------------------------------------------------------------------------
// API → Frontend veri dönüştürücü
// Backend'den gelen alan adları (endDate, startPrice, bidCount, vb.)
// Frontend AuctionItem tipine (endTime, startingPrice, totalBids, vb.) çevrilir.
// ---------------------------------------------------------------------------
function mapApiStatus(status: string): AuctionItem["status"] {
  switch (status) {
    case "LIVE":
      return "active";
    case "PRE_BID":
    case "PUBLISHED":
      return "upcoming";
    case "COMPLETED":
      return "ended";
    case "CANCELLED":
      return "cancelled";
    default:
      return "upcoming";
  }
}

function mapApiAuction(raw: Record<string, unknown>): AuctionItem {
  const lots = (raw.lots as Record<string, unknown>[]) || [];
  const firstLot = lots[0] as Record<string, unknown> | undefined;
  const product = firstLot?.product as Record<string, unknown> | undefined;
  const media = (product?.media as Record<string, unknown>[]) || [];
  const category = product?.category as Record<string, unknown> | undefined;

  // Collect images: cover image + product media
  const images: string[] = [];
  if (raw.coverImageUrl) images.push(raw.coverImageUrl as string);
  for (const m of media) {
    if (m.url) images.push(m.url as string);
  }
  // No fallback push here; the AuctionImage component handles missing images
  // gracefully with an inline placeholder UI.

  const status = mapApiStatus(raw.status as string);

  // Determine if ending soon (< 24h remaining and LIVE)
  const endDate = raw.endDate as string | undefined;
  const finalStatus =
    status === "active" && endDate
      ? new Date(endDate).getTime() - Date.now() < 24 * 60 * 60 * 1000
        ? "ending_soon"
        : "active"
      : status;

  const count = raw._count as Record<string, number> | undefined;

  return {
    id: raw.id as string,
    title: raw.title as string,
    description: (raw.description as string) || "",
    images,
    category: category?.name as string || "",
    startingPrice: Number(raw.startPrice) || 0,
    currentPrice: Number(raw.currentPrice) || Number(raw.startPrice) || 0,
    minBidIncrement: Number(raw.minIncrement) || 0,
    startTime: (raw.startDate as string) || "",
    endTime: endDate || "",
    status: finalStatus,
    sellerId: (raw.createdBy as string) || "",
    sellerName: "",
    totalBids: count?.bids ?? (raw.bidCount as number) ?? 0,
    watchCount: (raw.viewCount as number) || 0,
  };
}

function mapApiAuctionList(rawList: Record<string, unknown>[]): AuctionItem[] {
  return (rawList || []).map(mapApiAuction);
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export function useAuction(id: string) {
  return useQuery<AuctionItem>({
    queryKey: ["auction", id],
    queryFn: async () => {
      const { data } = await api.get(apiRoutes.auctions.detail(id));
      return mapApiAuction(data);
    },
    enabled: !!id,
    staleTime: 10 * 1000,
    refetchInterval: 30 * 1000,
  });
}

export function useAuctions(params: AuctionListParams = {}) {
  const searchParams = new URLSearchParams();

  if (params.page) searchParams.set("page", String(params.page));
  if (params.limit) searchParams.set("limit", String(params.limit));
  if (params.category) searchParams.set("category", params.category);
  if (params.status) searchParams.set("status", params.status);
  if (params.minPrice) searchParams.set("minPrice", String(params.minPrice));
  if (params.maxPrice) searchParams.set("maxPrice", String(params.maxPrice));
  if (params.sort) searchParams.set("sort", params.sort);
  if (params.search) searchParams.set("search", params.search);

  return useQuery<AuctionListResponse>({
    queryKey: ["auctions", params],
    queryFn: async () => {
      const { data } = await api.get(
        `${apiRoutes.auctions.list}?${searchParams.toString()}`
      );
      return {
        data: mapApiAuctionList(data.data),
        meta: data.meta,
      };
    },
    staleTime: 15 * 1000,
  });
}

export function useInfiniteAuctions(params: Omit<AuctionListParams, "page"> = {}) {
  return useInfiniteQuery<AuctionListResponse>({
    queryKey: ["auctions-infinite", params],
    queryFn: async ({ pageParam }) => {
      const searchParams = new URLSearchParams();
      searchParams.set("page", String(pageParam));
      if (params.limit) searchParams.set("limit", String(params.limit));
      if (params.category) searchParams.set("category", params.category);
      if (params.status) searchParams.set("status", params.status);
      if (params.sort) searchParams.set("sort", params.sort);
      if (params.search) searchParams.set("search", params.search);

      const { data } = await api.get(
        `${apiRoutes.auctions.list}?${searchParams.toString()}`
      );
      return {
        data: mapApiAuctionList(data.data),
        meta: data.meta,
      };
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage.meta.page < lastPage.meta.totalPages) {
        return lastPage.meta.page + 1;
      }
      return undefined;
    },
    staleTime: 15 * 1000,
  });
}

export function useFeaturedAuctions() {
  return useQuery<AuctionItem[]>({
    queryKey: ["auctions", "featured"],
    queryFn: async () => {
      const { data } = await api.get(apiRoutes.auctions.featured);
      return mapApiAuctionList(data.data);
    },
    staleTime: 30 * 1000,
  });
}

export function useUpcomingAuctions() {
  return useQuery<AuctionItem[]>({
    queryKey: ["auctions", "upcoming"],
    queryFn: async () => {
      const { data } = await api.get(apiRoutes.auctions.upcoming);
      return mapApiAuctionList(data.data);
    },
    staleTime: 30 * 1000,
  });
}

export function useAuctionCategories() {
  return useQuery<{ id: string; name: string; count: number; icon?: string }[]>({
    queryKey: ["auction-categories"],
    queryFn: async () => {
      const { data } = await api.get(apiRoutes.auctions.categories);
      return data.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}
