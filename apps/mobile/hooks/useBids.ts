import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuctionStore } from '@/stores/auction-store';
import type { Bid, BidRequest, PaginatedResponse } from '@/types';

export function useAuctionBids(auctionId: string) {
  return useQuery<Bid[]>({
    queryKey: ['bids', auctionId],
    queryFn: async () => {
      const { data } = await api.get<{ data: Bid[] }>(
        `/auctions/${auctionId}/bids`
      );
      return data.data;
    },
    enabled: !!auctionId,
    staleTime: 5 * 1000,
  });
}

export function usePlaceBid() {
  const queryClient = useQueryClient();
  const { addBid } = useAuctionStore();

  return useMutation<Bid, Error, BidRequest>({
    mutationFn: async (bidData) => {
      const { data } = await api.post<{ data: Bid }>(
        `/auctions/${bidData.auctionId}/bids`,
        {
          amount: bidData.amount,
          isAutoBid: bidData.isAutoBid,
          maxAutoBidAmount: bidData.maxAutoBidAmount,
        }
      );
      return data.data;
    },
    onSuccess: (bid) => {
      addBid(bid);
      queryClient.invalidateQueries({
        queryKey: ['bids', bid.auctionId],
      });
      queryClient.invalidateQueries({
        queryKey: ['auction', bid.auctionId],
      });
    },
  });
}

export function useMyBids() {
  return useQuery<Bid[]>({
    queryKey: ['myBids'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Bid>>(
        '/users/bids',
        {
          params: { limit: 50, sortBy: 'createdAt', sortOrder: 'desc' },
        }
      );
      return data.data;
    },
    staleTime: 30 * 1000,
  });
}
