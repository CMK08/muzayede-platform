import { create } from 'zustand';
import type { Auction, Bid } from '@/types';

interface AuctionState {
  currentAuction: Auction | null;
  bids: Bid[];
  isConnected: boolean;
  liveBidCount: number;
  livePrice: number;

  setCurrentAuction: (auction: Auction | null) => void;
  setBids: (bids: Bid[]) => void;
  addBid: (bid: Bid) => void;
  updatePrice: (price: number, bidCount: number) => void;
  setConnected: (connected: boolean) => void;
  reset: () => void;
}

export const useAuctionStore = create<AuctionState>((set, get) => ({
  currentAuction: null,
  bids: [],
  isConnected: false,
  liveBidCount: 0,
  livePrice: 0,

  setCurrentAuction: (auction) => {
    set({
      currentAuction: auction,
      livePrice: auction?.currentPrice ?? 0,
      liveBidCount: auction?.bidCount ?? 0,
    });
  },

  setBids: (bids) => {
    set({ bids });
  },

  addBid: (bid) => {
    const { bids } = get();
    set({
      bids: [bid, ...bids],
      livePrice: bid.amount,
      liveBidCount: get().liveBidCount + 1,
    });
  },

  updatePrice: (price, bidCount) => {
    set({ livePrice: price, liveBidCount: bidCount });
  },

  setConnected: (connected) => {
    set({ isConnected: connected });
  },

  reset: () => {
    set({
      currentAuction: null,
      bids: [],
      isConnected: false,
      liveBidCount: 0,
      livePrice: 0,
    });
  },
}));
