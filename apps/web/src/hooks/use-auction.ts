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

export function useAuction(id: string) {
  return useQuery<AuctionItem>({
    queryKey: ["auction", id],
    queryFn: async () => {
      const { data } = await api.get(apiRoutes.auctions.detail(id));
      return data.data;
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
      return data;
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
      return data;
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
      return data.data;
    },
    staleTime: 30 * 1000,
  });
}

export function useUpcomingAuctions() {
  return useQuery<AuctionItem[]>({
    queryKey: ["auctions", "upcoming"],
    queryFn: async () => {
      const { data } = await api.get(apiRoutes.auctions.upcoming);
      return data.data;
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
