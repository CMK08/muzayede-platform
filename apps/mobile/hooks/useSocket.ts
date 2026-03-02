import { useEffect, useRef, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import {
  connectSocket,
  disconnectSocket,
  getSocket,
  joinAuctionRoom,
  leaveAuctionRoom,
} from '@/lib/socket';
import { useAuctionStore } from '@/stores/auction-store';
import type { SocketBidEvent, SocketAuctionEvent } from '@/types';

export function useSocketConnection() {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const connect = async () => {
      socketRef.current = await connectSocket();
    };
    connect();

    return () => {
      disconnectSocket();
    };
  }, []);

  return socketRef;
}

export function useAuctionSocket(auctionId: string | undefined) {
  const { addBid, updatePrice, setConnected } = useAuctionStore();

  const handleBidUpdate = useCallback(
    (event: SocketBidEvent) => {
      if (event.auctionId === auctionId) {
        addBid(event.bid);
        updatePrice(event.currentPrice, event.bidCount);
      }
    },
    [auctionId, addBid, updatePrice]
  );

  const handleAuctionUpdate = useCallback(
    (event: SocketAuctionEvent) => {
      if (event.auctionId === auctionId) {
        // Auction status changed -- could trigger a refetch
        console.log('[Socket] Auction status update:', event.status);
      }
    },
    [auctionId]
  );

  useEffect(() => {
    if (!auctionId) return;

    const setup = async () => {
      const socket = getSocket() ?? (await connectSocket());

      socket.on('connect', () => setConnected(true));
      socket.on('disconnect', () => setConnected(false));

      joinAuctionRoom(auctionId);
      setConnected(socket.connected);

      socket.on('bid:update', handleBidUpdate);
      socket.on('auction:update', handleAuctionUpdate);
    };

    setup();

    return () => {
      const socket = getSocket();
      if (socket) {
        socket.off('bid:update', handleBidUpdate);
        socket.off('auction:update', handleAuctionUpdate);
        leaveAuctionRoom(auctionId);
      }
      setConnected(false);
    };
  }, [auctionId, handleBidUpdate, handleAuctionUpdate, setConnected]);
}
