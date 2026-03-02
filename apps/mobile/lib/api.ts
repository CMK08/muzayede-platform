import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Config } from '@/constants/config';
import type { ApiError } from '@/types';

const api = axios.create({
  baseURL: Config.API_URL,
  timeout: Config.REQUEST_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      const token = await SecureStore.getItemAsync(
        Config.SECURE_STORE_KEYS.ACCESS_TOKEN
      );
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      // SecureStore might fail in certain environments; continue without token
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiError>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = await SecureStore.getItemAsync(
          Config.SECURE_STORE_KEYS.REFRESH_TOKEN
        );

        if (refreshToken) {
          const { data } = await axios.post(
            `${Config.API_URL}/auth/refresh`,
            { refreshToken }
          );

          await SecureStore.setItemAsync(
            Config.SECURE_STORE_KEYS.ACCESS_TOKEN,
            data.accessToken
          );

          if (data.refreshToken) {
            await SecureStore.setItemAsync(
              Config.SECURE_STORE_KEYS.REFRESH_TOKEN,
              data.refreshToken
            );
          }

          originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
          return api(originalRequest);
        }
      } catch {
        await SecureStore.deleteItemAsync(
          Config.SECURE_STORE_KEYS.ACCESS_TOKEN
        );
        await SecureStore.deleteItemAsync(
          Config.SECURE_STORE_KEYS.REFRESH_TOKEN
        );
      }
    }

    return Promise.reject(error);
  }
);

export default api;
