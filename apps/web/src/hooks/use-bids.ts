import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api, { apiRoutes } from "@/lib/api";
import { useAuctionStore, type Bid } from "@/stores/auction-store";

interface BidListResponse {
  data: Bid[];
  meta: {
    total: number;
    page: number;
    limit: number;
  };
}

interface PlaceBidPayload {
  auctionId: string;
  amount: number;
}

interface PlaceProxyBidPayload {
  auctionId: string;
  maxAmount: number;
}

interface PlaceBidResponse {
  id: string;
  auctionId: string;
  amount: number;
  timestamp: string;
  currentPrice: number;
  totalBids: number;
}

export function useBids(auctionId: string, page: number = 1, limit: number = 20) {
  return useQuery<BidListResponse>({
    queryKey: ["bids", auctionId, page, limit],
    queryFn: async () => {
      const { data } = await api.get(
        `${apiRoutes.bids.list(auctionId)}?page=${page}&limit=${limit}`
      );
      return data;
    },
    enabled: !!auctionId,
    staleTime: 5 * 1000,
    refetchInterval: 10 * 1000,
  });
}

export function usePlaceBid() {
  const queryClient = useQueryClient();
  const { addBid, setBidError } = useAuctionStore();

  return useMutation<PlaceBidResponse, Error, PlaceBidPayload>({
    mutationFn: async ({ auctionId, amount }) => {
      const { data } = await api.post(apiRoutes.bids.place(auctionId), {
        amount,
      });
      return data.data;
    },
    onSuccess: (data, variables) => {
      setBidError(null);

      const newBid: Bid = {
        id: data.id,
        auctionId: variables.auctionId,
        bidderId: "current-user",
        bidderName: "Siz",
        amount: data.amount,
        timestamp: data.timestamp,
        isAutoBid: false,
      };

      addBid(newBid);

      queryClient.invalidateQueries({
        queryKey: ["bids", variables.auctionId],
      });
      queryClient.invalidateQueries({
        queryKey: ["auction", variables.auctionId],
      });
    },
    onError: (error: unknown) => {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message || "Teklif verilemedi. Lütfen tekrar deneyin.";
      setBidError(message);
    },
  });
}

export function usePlaceProxyBid() {
  const queryClient = useQueryClient();
  const { setBidError } = useAuctionStore();

  return useMutation<PlaceBidResponse, Error, PlaceProxyBidPayload>({
    mutationFn: async ({ auctionId, maxAmount }) => {
      const { data } = await api.post(apiRoutes.bids.proxy(auctionId), {
        maxAmount,
      });
      return data.data;
    },
    onSuccess: (_data, variables) => {
      setBidError(null);

      queryClient.invalidateQueries({
        queryKey: ["bids", variables.auctionId],
      });
      queryClient.invalidateQueries({
        queryKey: ["auction", variables.auctionId],
      });
    },
    onError: (error: unknown) => {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message ||
        "Otomatik teklif ayarlanamadı. Lütfen tekrar deneyin.";
      setBidError(message);
    },
  });
}

export function useUserBids(page: number = 1, limit: number = 20) {
  return useQuery<BidListResponse>({
    queryKey: ["user-bids", page, limit],
    queryFn: async () => {
      const { data } = await api.get(
        `${apiRoutes.users.bids}?page=${page}&limit=${limit}`
      );
      return data;
    },
    staleTime: 15 * 1000,
  });
}
