import { create } from "zustand";
import type { BidUpdate, AuctionStatusUpdate } from "@/lib/socket";

export interface AuctionItem {
  id: string;
  title: string;
  description: string;
  images: string[];
  category: string;
  startingPrice: number;
  currentPrice: number;
  minBidIncrement: number;
  startTime: string;
  endTime: string;
  status: "upcoming" | "active" | "ending_soon" | "ended" | "sold" | "cancelled";
  sellerId: string;
  sellerName: string;
  totalBids: number;
  watchCount: number;
  winnerId?: string;
  winnerName?: string;
  condition?: "new" | "like_new" | "good" | "fair" | "poor";
  location?: string;
  shippingInfo?: string;
}

export interface Bid {
  id: string;
  auctionId: string;
  bidderId: string;
  bidderName: string;
  amount: number;
  timestamp: string;
  isAutoBid: boolean;
}

interface AuctionState {
  currentAuction: AuctionItem | null;
  bids: Bid[];
  isLoadingAuction: boolean;
  isLoadingBids: boolean;
  bidError: string | null;
  realtimeConnected: boolean;

  setCurrentAuction: (auction: AuctionItem) => void;
  clearCurrentAuction: () => void;
  setBids: (bids: Bid[]) => void;
  addBid: (bid: Bid) => void;
  handleBidUpdate: (update: BidUpdate) => void;
  handleStatusUpdate: (update: AuctionStatusUpdate) => void;
  setLoading: (key: "auction" | "bids", value: boolean) => void;
  setBidError: (error: string | null) => void;
  setRealtimeConnected: (connected: boolean) => void;
  updateCurrentPrice: (price: number, totalBids: number) => void;
}

export const useAuctionStore = create<AuctionState>()((set, get) => ({
  currentAuction: null,
  bids: [],
  isLoadingAuction: false,
  isLoadingBids: false,
  bidError: null,
  realtimeConnected: false,

  setCurrentAuction: (auction: AuctionItem) => {
    set({ currentAuction: auction, isLoadingAuction: false });
  },

  clearCurrentAuction: () => {
    set({
      currentAuction: null,
      bids: [],
      bidError: null,
    });
  },

  setBids: (bids: Bid[]) => {
    set({ bids, isLoadingBids: false });
  },

  addBid: (bid: Bid) => {
    const { bids, currentAuction } = get();
    const updatedBids = [bid, ...bids];

    set({
      bids: updatedBids,
      currentAuction: currentAuction
        ? {
            ...currentAuction,
            currentPrice: bid.amount,
            totalBids: currentAuction.totalBids + 1,
          }
        : null,
    });
  },

  handleBidUpdate: (update: BidUpdate) => {
    const { currentAuction } = get();

    const newBid: Bid = {
      id: update.bidId,
      auctionId: update.auctionId,
      bidderId: update.bidderId,
      bidderName: update.bidderName,
      amount: update.amount,
      timestamp: update.timestamp,
      isAutoBid: false,
    };

    set((state) => ({
      bids: [newBid, ...state.bids],
      currentAuction:
        currentAuction && currentAuction.id === update.auctionId
          ? {
              ...currentAuction,
              currentPrice: update.amount,
              totalBids: update.totalBids,
            }
          : state.currentAuction,
    }));
  },

  handleStatusUpdate: (update: AuctionStatusUpdate) => {
    const { currentAuction } = get();

    if (currentAuction && currentAuction.id === update.auctionId) {
      set({
        currentAuction: {
          ...currentAuction,
          status: update.status,
          endTime: update.endTime || currentAuction.endTime,
          winnerId: update.winnerId,
          winnerName: update.winnerName,
          currentPrice: update.finalPrice || currentAuction.currentPrice,
        },
      });
    }
  },

  setLoading: (key: "auction" | "bids", value: boolean) => {
    if (key === "auction") {
      set({ isLoadingAuction: value });
    } else {
      set({ isLoadingBids: value });
    }
  },

  setBidError: (error: string | null) => {
    set({ bidError: error });
  },

  setRealtimeConnected: (connected: boolean) => {
    set({ realtimeConnected: connected });
  },

  updateCurrentPrice: (price: number, totalBids: number) => {
    const { currentAuction } = get();
    if (currentAuction) {
      set({
        currentAuction: {
          ...currentAuction,
          currentPrice: price,
          totalBids,
        },
      });
    }
  },
}));
