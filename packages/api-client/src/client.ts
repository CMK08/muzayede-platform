// ---------------------------------------------------------------------------
// Base API Client — Axios wrapper with JWT refresh & interceptors
// ---------------------------------------------------------------------------

import axios, {
  type AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
import type { ApiResponse } from '@muzayede/shared-types';

/** Configuration required to instantiate the API client */
export interface ApiClientConfig {
  /** Base URL of the API (e.g. "https://api.muzayede.com/v1") */
  baseURL: string;
  /** Function that returns the current access token (or null) */
  getAccessToken: () => string | null;
  /** Function that returns the current refresh token (or null) */
  getRefreshToken: () => string | null;
  /** Callback invoked with new tokens after a successful refresh */
  onTokenRefreshed: (accessToken: string, refreshToken: string) => void;
  /** Callback invoked when token refresh fails (e.g. redirect to login) */
  onAuthError: () => void;
  /** Optional request timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Optional additional default headers */
  headers?: Record<string, string>;
}

/**
 * BaseApiClient wraps Axios with:
 *  - Automatic Authorization header injection
 *  - Transparent JWT refresh on 401
 *  - Request / response interceptors
 *  - Typed response unwrapping
 */
export class BaseApiClient {
  protected readonly axios: AxiosInstance;
  private readonly config: ApiClientConfig;
  private isRefreshing = false;
  private failedQueue: Array<{
    resolve: (token: string) => void;
    reject: (error: unknown) => void;
  }> = [];

  constructor(config: ApiClientConfig) {
    this.config = config;

    this.axios = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout ?? 30_000,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...config.headers,
      },
    });

    this.setupRequestInterceptor();
    this.setupResponseInterceptor();
  }

  // -----------------------------------------------------------------------
  // Interceptors
  // -----------------------------------------------------------------------

  private setupRequestInterceptor(): void {
    this.axios.interceptors.request.use(
      (reqConfig: InternalAxiosRequestConfig) => {
        const token = this.config.getAccessToken();
        if (token && reqConfig.headers) {
          reqConfig.headers.Authorization = `Bearer ${token}`;
        }
        return reqConfig;
      },
      (error: AxiosError) => Promise.reject(error),
    );
  }

  private setupResponseInterceptor(): void {
    this.axios.interceptors.response.use(
      (response: AxiosResponse) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & {
          _retry?: boolean;
        };

        // Only attempt refresh on 401 and if we haven't retried yet
        if (error.response?.status !== 401 || originalRequest._retry) {
          return Promise.reject(error);
        }

        if (this.isRefreshing) {
          // Queue this request until the refresh completes
          return new Promise<AxiosResponse>((resolve, reject) => {
            this.failedQueue.push({
              resolve: (token: string) => {
                if (originalRequest.headers) {
                  originalRequest.headers.Authorization = `Bearer ${token}`;
                }
                resolve(this.axios(originalRequest));
              },
              reject,
            });
          });
        }

        originalRequest._retry = true;
        this.isRefreshing = true;

        try {
          const refreshToken = this.config.getRefreshToken();
          if (!refreshToken) {
            throw new Error('No refresh token available');
          }

          const { data } = await axios.post<{
            accessToken: string;
            refreshToken: string;
          }>(`${this.config.baseURL}/auth/refresh`, { refreshToken });

          this.config.onTokenRefreshed(data.accessToken, data.refreshToken);

          // Retry all queued requests
          this.failedQueue.forEach((pending) => pending.resolve(data.accessToken));
          this.failedQueue = [];

          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
          }

          return this.axios(originalRequest);
        } catch (refreshError) {
          this.failedQueue.forEach((pending) => pending.reject(refreshError));
          this.failedQueue = [];
          this.config.onAuthError();
          return Promise.reject(refreshError);
        } finally {
          this.isRefreshing = false;
        }
      },
    );
  }

  // -----------------------------------------------------------------------
  // Convenience HTTP Methods
  // -----------------------------------------------------------------------

  protected async get<T>(
    url: string,
    config?: AxiosRequestConfig,
  ): Promise<ApiResponse<T>> {
    const response = await this.axios.get<ApiResponse<T>>(url, config);
    return response.data;
  }

  protected async post<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<ApiResponse<T>> {
    const response = await this.axios.post<ApiResponse<T>>(url, data, config);
    return response.data;
  }

  protected async put<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<ApiResponse<T>> {
    const response = await this.axios.put<ApiResponse<T>>(url, data, config);
    return response.data;
  }

  protected async patch<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<ApiResponse<T>> {
    const response = await this.axios.patch<ApiResponse<T>>(url, data, config);
    return response.data;
  }

  protected async delete<T>(
    url: string,
    config?: AxiosRequestConfig,
  ): Promise<ApiResponse<T>> {
    const response = await this.axios.delete<ApiResponse<T>>(url, config);
    return response.data;
  }

  /**
   * Upload a file via multipart/form-data.
   */
  protected async upload<T>(
    url: string,
    formData: FormData,
    onProgress?: (percentage: number) => void,
  ): Promise<ApiResponse<T>> {
    const response = await this.axios.post<ApiResponse<T>>(url, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (event) => {
        if (onProgress && event.total) {
          onProgress(Math.round((event.loaded * 100) / event.total));
        }
      },
    });
    return response.data;
  }
}
