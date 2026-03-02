import { io, Socket } from 'socket.io-client';
import * as SecureStore from 'expo-secure-store';
import { Config } from '@/constants/config';

let socket: Socket | null = null;

export const getSocket = (): Socket | null => socket;

export const connectSocket = async (): Promise<Socket> => {
  if (socket?.connected) {
    return socket;
  }

  let token: string | null = null;
  try {
    token = await SecureStore.getItemAsync(
      Config.SECURE_STORE_KEYS.ACCESS_TOKEN
    );
  } catch {
    // Continue without auth
  }

  socket = io(Config.SOCKET_URL, {
    transports: ['websocket'],
    autoConnect: true,
    reconnection: true,
    reconnectionDelay: Config.SOCKET_RECONNECT_DELAY,
    reconnectionAttempts: Config.SOCKET_MAX_RETRIES,
    auth: token ? { token } : undefined,
  });

  socket.on('connect', () => {
    console.log('[Socket] Connected:', socket?.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.log('[Socket] Connection error:', error.message);
  });

  return socket;
};

export const disconnectSocket = (): void => {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
};

export const joinAuctionRoom = (auctionId: string): void => {
  if (socket?.connected) {
    socket.emit('auction:join', { auctionId });
  }
};

export const leaveAuctionRoom = (auctionId: string): void => {
  if (socket?.connected) {
    socket.emit('auction:leave', { auctionId });
  }
};

export const emitBid = (
  auctionId: string,
  amount: number
): Promise<{ success: boolean; error?: string }> => {
  return new Promise((resolve) => {
    if (!socket?.connected) {
      resolve({ success: false, error: 'Bağlantı yok' });
      return;
    }

    socket.emit('bid:place', { auctionId, amount }, (response: { success: boolean; error?: string }) => {
      resolve(response);
    });
  });
};
