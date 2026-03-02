import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { Config } from '@/constants/config';
import type { User } from '@/types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;

  setUser: (user: User | null) => void;
  setTokens: (accessToken: string, refreshToken: string) => Promise<void>;
  initialize: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,

  setUser: (user) => {
    set({ user, isAuthenticated: !!user });
  },

  setTokens: async (accessToken, refreshToken) => {
    try {
      await SecureStore.setItemAsync(
        Config.SECURE_STORE_KEYS.ACCESS_TOKEN,
        accessToken
      );
      await SecureStore.setItemAsync(
        Config.SECURE_STORE_KEYS.REFRESH_TOKEN,
        refreshToken
      );
    } catch (error) {
      console.warn('[AuthStore] Failed to store tokens:', error);
    }
  },

  initialize: async () => {
    set({ isLoading: true });
    try {
      const token = await SecureStore.getItemAsync(
        Config.SECURE_STORE_KEYS.ACCESS_TOKEN
      );

      if (token) {
        // Token exists, attempt to load user data from API
        // The actual user fetch happens via useAuth hook
        set({ isAuthenticated: true });
      }
    } catch {
      // No stored credentials
    } finally {
      set({ isLoading: false, isInitialized: true });
    }
  },

  logout: async () => {
    try {
      await SecureStore.deleteItemAsync(
        Config.SECURE_STORE_KEYS.ACCESS_TOKEN
      );
      await SecureStore.deleteItemAsync(
        Config.SECURE_STORE_KEYS.REFRESH_TOKEN
      );
    } catch {
      // Ignore cleanup errors
    }
    set({ user: null, isAuthenticated: false });
  },
}));
