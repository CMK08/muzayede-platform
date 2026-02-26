"use client";

import { useEffect, useRef, useCallback } from "react";
import {
  getSocket,
  connectSocket,
  disconnectSocket,
  joinAuctionRoom,
  leaveAuctionRoom,
  onBidUpdate,
  onAuctionStatusUpdate,
  onNotification,
  type BidUpdate,
  type AuctionStatusUpdate,
  type NotificationPayload,
} from "@/lib/socket";
import { useAuctionStore } from "@/stores/auction-store";
import { useAuthStore } from "@/stores/auth-store";

interface UseSocketOptions {
  autoConnect?: boolean;
}

export function useSocket(options: UseSocketOptions = {}) {
  const { autoConnect = true } = options;
  const { isAuthenticated } = useAuthStore();
  const { setRealtimeConnected } = useAuctionStore();
  const connectedRef = useRef(false);

  useEffect(() => {
    if (autoConnect && !connectedRef.current) {
      connectSocket();
      connectedRef.current = true;

      const socket = getSocket();

      socket.on("connect", () => {
        setRealtimeConnected(true);
      });

      socket.on("disconnect", () => {
        setRealtimeConnected(false);
      });
    }

    return () => {
      if (connectedRef.current) {
        disconnectSocket();
        connectedRef.current = false;
        setRealtimeConnected(false);
      }
    };
  }, [autoConnect, isAuthenticated, setRealtimeConnected]);

  const joinAuction = useCallback((auctionId: string) => {
    joinAuctionRoom(auctionId);
  }, []);

  const leaveAuction = useCallback((auctionId: string) => {
    leaveAuctionRoom(auctionId);
  }, []);

  const subscribeToBids = useCallback(
    (callback: (data: BidUpdate) => void) => {
      return onBidUpdate(callback);
    },
    []
  );

  const subscribeToStatus = useCallback(
    (callback: (data: AuctionStatusUpdate) => void) => {
      return onAuctionStatusUpdate(callback);
    },
    []
  );

  const subscribeToNotifications = useCallback(
    (callback: (data: NotificationPayload) => void) => {
      return onNotification(callback);
    },
    []
  );

  return {
    joinAuction,
    leaveAuction,
    subscribeToBids,
    subscribeToStatus,
    subscribeToNotifications,
  };
}

export function useAuctionSocket(auctionId: string | null) {
  const { handleBidUpdate, handleStatusUpdate } = useAuctionStore();
  const { joinAuction, leaveAuction, subscribeToBids, subscribeToStatus } =
    useSocket();

  useEffect(() => {
    if (!auctionId) return;

    joinAuction(auctionId);

    const unsubBids = subscribeToBids((data: BidUpdate) => {
      if (data.auctionId === auctionId) {
        handleBidUpdate(data);
      }
    });

    const unsubStatus = subscribeToStatus((data: AuctionStatusUpdate) => {
      if (data.auctionId === auctionId) {
        handleStatusUpdate(data);
      }
    });

    return () => {
      leaveAuction(auctionId);
      unsubBids();
      unsubStatus();
    };
  }, [
    auctionId,
    joinAuction,
    leaveAuction,
    subscribeToBids,
    subscribeToStatus,
    handleBidUpdate,
    handleStatusUpdate,
  ]);
}
