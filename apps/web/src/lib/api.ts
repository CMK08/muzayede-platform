import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

interface QueueItem {
  resolve: (value: string | null) => void;
  reject: (reason?: unknown) => void;
}

let isRefreshing = false;
let failedQueue: QueueItem[] = [];

const processQueue = (error: AxiosError | null, token: string | null = null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve(token);
    }
  });
  failedQueue = [];
};

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("access_token");
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      const locale = localStorage.getItem("locale") || "tr";
      if (config.headers) {
        config.headers["Accept-Language"] = locale;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = localStorage.getItem("refresh_token");

        if (!refreshToken) {
          throw new Error("No refresh token available");
        }

        const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken,
        });

        const { accessToken, refreshToken: newRefreshToken } = data.data;

        localStorage.setItem("access_token", accessToken);
        localStorage.setItem("refresh_token", newRefreshToken);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        }

        processQueue(null, accessToken);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError as AxiosError, null);

        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("user");

        if (typeof window !== "undefined") {
          window.location.href = "/tr/login";
        }

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;

export const apiRoutes = {
  auth: {
    login: "/auth/login",
    register: "/auth/register",
    logout: "/auth/logout",
    refresh: "/auth/refresh",
    forgotPassword: "/auth/forgot-password",
    resetPassword: "/auth/reset-password",
    verifyOtp: "/auth/verify-otp",
    sendOtp: "/auth/send-otp",
  },
  auctions: {
    list: "/auctions",
    detail: (id: string) => `/auctions/${id}`,
    create: "/auctions",
    update: (id: string) => `/auctions/${id}`,
    delete: (id: string) => `/auctions/${id}`,
    featured: "/auctions/featured",
    upcoming: "/auctions/upcoming",
    categories: "/auctions/categories",
  },
  bids: {
    list: (auctionId: string) => `/auctions/${auctionId}/bids`,
    place: (auctionId: string) => `/auctions/${auctionId}/bids`,
    proxy: (auctionId: string) => `/auctions/${auctionId}/bids/proxy`,
  },
  users: {
    profile: "/users/profile",
    update: "/users/profile",
    bids: "/users/bids",
    auctions: "/users/auctions",
    watchlist: "/users/watchlist",
  },
  admin: {
    dashboard: "/admin/dashboard",
    users: "/admin/users",
    auctions: "/admin/auctions",
    reports: "/admin/reports",
    settings: "/admin/settings",
  },
} as const;
