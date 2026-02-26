import { io, Socket } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4000";

let socket: Socket | null = null;

export interface BidUpdate {
  auctionId: string;
  bidId: string;
  amount: number;
  bidderId: string;
  bidderName: string;
  timestamp: string;
  totalBids: number;
}

export interface AuctionStatusUpdate {
  auctionId: string;
  status: "active" | "ending_soon" | "ended" | "sold";
  endTime?: string;
  winnerId?: string;
  winnerName?: string;
  finalPrice?: number;
}

export interface NotificationPayload {
  id: string;
  type: "outbid" | "auction_won" | "auction_ending" | "bid_placed" | "system";
  title: string;
  message: string;
  auctionId?: string;
  timestamp: string;
}

export function getSocket(): Socket {
  if (!socket) {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("access_token")
        : null;

    socket = io(SOCKET_URL, {
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      timeout: 20000,
      transports: ["websocket", "polling"],
      auth: token ? { token } : undefined,
    });

    socket.on("connect", () => {
      console.log("[Socket] Connected:", socket?.id);
    });

    socket.on("disconnect", (reason) => {
      console.log("[Socket] Disconnected:", reason);
    });

    socket.on("connect_error", (error) => {
      console.error("[Socket] Connection error:", error.message);
    });

    socket.on("reconnect", (attempt) => {
      console.log("[Socket] Reconnected after", attempt, "attempts");
    });
  }

  return socket;
}

export function connectSocket(): void {
  const s = getSocket();
  if (!s.connected) {
    s.connect();
  }
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function joinAuctionRoom(auctionId: string): void {
  const s = getSocket();
  s.emit("auction:join", { auctionId });
}

export function leaveAuctionRoom(auctionId: string): void {
  const s = getSocket();
  s.emit("auction:leave", { auctionId });
}

export function onBidUpdate(callback: (data: BidUpdate) => void): () => void {
  const s = getSocket();
  s.on("bid:new", callback);
  return () => {
    s.off("bid:new", callback);
  };
}

export function onAuctionStatusUpdate(
  callback: (data: AuctionStatusUpdate) => void
): () => void {
  const s = getSocket();
  s.on("auction:status", callback);
  return () => {
    s.off("auction:status", callback);
  };
}

export function onNotification(
  callback: (data: NotificationPayload) => void
): () => void {
  const s = getSocket();
  s.on("notification", callback);
  return () => {
    s.off("notification", callback);
  };
}

export function updateSocketAuth(token: string): void {
  const s = getSocket();
  s.auth = { token };
  if (s.connected) {
    s.disconnect().connect();
  }
}
