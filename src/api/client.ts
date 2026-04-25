import axios from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';
import { clearStoredAuthState, isExtendedSessionEnabled, refreshAccessToken } from './authSession';

export const SUBSCRIPTION_EXPIRED_EVENT = 'subscription:expired';

interface RetriableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshPromise: Promise<string> | null = null;

function shouldSkipRefresh(config?: InternalAxiosRequestConfig): boolean {
  const url = config?.url ?? '';
  return (
    url.includes('/login') ||
    url.includes('/loginApp') ||
    url.includes('/refresh-token') ||
    url.includes('/sign-out')
  );
}

async function getRefreshedAccessToken(): Promise<string> {
  const refreshToken = localStorage.getItem('refresh_token');
  if (!refreshToken) {
    throw new Error('Missing refresh token');
  }

  if (!refreshPromise) {
    refreshPromise = refreshAccessToken(refreshToken).finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

function redirectToLogin(): void {
  if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as RetriableRequestConfig | undefined;

    if (
      error.response?.status === 403 &&
      error.response?.data?.error_code === 'subscription_expired'
    ) {
      window.dispatchEvent(new CustomEvent(SUBSCRIPTION_EXPIRED_EVENT));
      return Promise.reject(error);
    }

    if (
      error.response?.status === 401 &&
      isExtendedSessionEnabled() &&
      originalRequest &&
      !shouldSkipRefresh(originalRequest) &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      try {
        const accessToken = await getRefreshedAccessToken();
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(originalRequest);
      } catch {
        clearStoredAuthState();
        redirectToLogin();
      }
    }

    if (error.response?.status === 401) {
      clearStoredAuthState();
      redirectToLogin();
    }

    return Promise.reject(error);
  }
);

export default apiClient;
