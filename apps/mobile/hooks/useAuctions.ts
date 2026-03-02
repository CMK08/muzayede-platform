import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type {
  Auction,
  AuctionFilters,
  Category,
  PaginatedResponse,
} from '@/types';

export function useAuctions(filters: AuctionFilters = {}) {
  return useInfiniteQuery<PaginatedResponse<Auction>>({
    queryKey: ['auctions', filters],
    queryFn: async ({ pageParam = 1 }) => {
      const { data } = await api.get<PaginatedResponse<Auction>>(
        '/auctions',
        {
          params: {
            ...filters,
            page: pageParam,
            limit: filters.limit ?? 20,
          },
        }
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
    staleTime: 30 * 1000,
  });
}

export function useAuctionDetail(id: string) {
  return useQuery<Auction>({
    queryKey: ['auction', id],
    queryFn: async () => {
      const { data } = await api.get<{ data: Auction }>(`/auctions/${id}`);
      return data.data;
    },
    enabled: !!id,
    staleTime: 10 * 1000,
  });
}

export function useFeaturedAuctions() {
  return useQuery<Auction[]>({
    queryKey: ['auctions', 'featured'],
    queryFn: async () => {
      const { data } = await api.get<{ data: Auction[] }>(
        '/auctions/featured'
      );
      return data.data;
    },
    staleTime: 60 * 1000,
  });
}

export function useUpcomingAuctions() {
  return useQuery<Auction[]>({
    queryKey: ['auctions', 'upcoming'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Auction>>(
        '/auctions',
        {
          params: {
            status: 'SCHEDULED',
            sortBy: 'startTime',
            sortOrder: 'asc',
            limit: 10,
          },
        }
      );
      return data.data;
    },
    staleTime: 60 * 1000,
  });
}

export function useLatestAuctions() {
  return useQuery<Auction[]>({
    queryKey: ['auctions', 'latest'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Auction>>(
        '/auctions',
        {
          params: {
            sortBy: 'createdAt',
            sortOrder: 'desc',
            limit: 10,
          },
        }
      );
      return data.data;
    },
    staleTime: 30 * 1000,
  });
}

export function useCategories() {
  return useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await api.get<{ data: Category[] }>('/categories');
      return data.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useSearchAuctions(query: string) {
  return useQuery<Auction[]>({
    queryKey: ['auctions', 'search', query],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Auction>>(
        '/auctions',
        {
          params: {
            search: query,
            limit: 20,
          },
        }
      );
      return data.data;
    },
    enabled: query.length >= 2,
    staleTime: 30 * 1000,
  });
}

export function useMyFavorites() {
  return useQuery<Auction[]>({
    queryKey: ['favorites'],
    queryFn: async () => {
      const { data } = await api.get<{ data: Auction[] }>('/users/favorites');
      return data.data;
    },
    staleTime: 30 * 1000,
  });
}
