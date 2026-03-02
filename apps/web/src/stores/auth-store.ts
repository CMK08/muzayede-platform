import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import api, { apiRoutes } from "@/lib/api";
import { updateSocketAuth, disconnectSocket } from "@/lib/socket";

export interface User {
  id: string;
  email: string;
  phone?: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  role: string;
  isVerified: boolean;
  createdAt: string;
}

interface LoginPayload {
  email: string;
  password: string;
}

interface RegisterPayload {
  email: string;
  phone: string;
  password: string;
  firstName: string;
  lastName: string;
  kvkkConsent: boolean;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;

  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  clearError: () => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isLoading: false,
      isAuthenticated: false,
      error: null,

      login: async (payload: LoginPayload) => {
        set({ isLoading: true, error: null });
        try {
          const { data } = await api.post(apiRoutes.auth.login, payload);
          const { user, accessToken, refreshToken } = data.data || data;

          localStorage.setItem("access_token", accessToken);
          localStorage.setItem("refresh_token", refreshToken);
          document.cookie = `access_token=${accessToken}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;

          updateSocketAuth(accessToken);

          set({
            user,
            accessToken,
            refreshToken,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error: unknown) {
          const message =
            (error as { response?: { data?: { message?: string } } })?.response
              ?.data?.message || "Giriş başarısız. Lütfen tekrar deneyin.";
          set({ isLoading: false, error: message });
          throw error;
        }
      },

      register: async (payload: RegisterPayload) => {
        set({ isLoading: true, error: null });
        try {
          const { data } = await api.post(apiRoutes.auth.register, payload);
          const { user, accessToken, refreshToken } = data.data || data;

          localStorage.setItem("access_token", accessToken);
          localStorage.setItem("refresh_token", refreshToken);
          document.cookie = `access_token=${accessToken}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;

          updateSocketAuth(accessToken);

          set({
            user,
            accessToken,
            refreshToken,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error: unknown) {
          const message =
            (error as { response?: { data?: { message?: string } } })?.response
              ?.data?.message || "Kayıt başarısız. Lütfen tekrar deneyin.";
          set({ isLoading: false, error: message });
          throw error;
        }
      },

      logout: async () => {
        try {
          await api.post(apiRoutes.auth.logout);
        } catch {
          // Ignore logout API errors
        } finally {
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
          document.cookie = "access_token=; path=/; max-age=0";
          disconnectSocket();

          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
        }
      },

      setUser: (user: User) => {
        set({ user });
      },

      setTokens: (accessToken: string, refreshToken: string) => {
        localStorage.setItem("access_token", accessToken);
        localStorage.setItem("refresh_token", refreshToken);
        set({ accessToken, refreshToken, isAuthenticated: true });
      },

      clearError: () => {
        set({ error: null });
      },

      checkAuth: async () => {
        const { accessToken } = get();
        if (!accessToken) {
          set({ isAuthenticated: false });
          return;
        }

        try {
          const { data } = await api.get(apiRoutes.users.profile);
          set({ user: data.data, isAuthenticated: true });
        } catch {
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
          });
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
        }
      },
    }),
    {
      name: "muzayede-auth",
      storage: createJSONStorage(() => {
        if (typeof window !== "undefined") {
          return localStorage;
        }
        return {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
        };
      }),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
