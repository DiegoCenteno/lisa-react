import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
const TOKEN_EXPIRES_AT_KEY = 'token_expires_at';
const MOBILE_REFRESH_LEAD_MS = 2 * 60 * 1000;

export const AUTH_STATE_CHANGED_EVENT = 'auth-state-changed';

interface PassportRefreshResponse {
  status: string;
  data: {
    tokens: {
      auth: {
        access_token: string;
        refresh_token: string;
        expires_in: number;
      };
    };
  };
}

export function notifyAuthStateChanged(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(AUTH_STATE_CHANGED_EVENT));
  }
}

function isStandaloneMode(): boolean {
  if (typeof window === 'undefined') return false;

  const nav = window.navigator as Navigator & { standalone?: boolean };
  return window.matchMedia?.('(display-mode: standalone)').matches || nav.standalone === true;
}

function isLikelyMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false;

  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

export function isExtendedSessionEnabled(): boolean {
  return isStandaloneMode() || isLikelyMobileDevice();
}

export function getStoredTokenExpiresAt(): number | null {
  const value = localStorage.getItem(TOKEN_EXPIRES_AT_KEY);
  if (!value) {
    return null;
  }

  const expiresAt = Number(value);
  return Number.isFinite(expiresAt) ? expiresAt : null;
}

export function shouldRefreshSoon(now = Date.now()): boolean {
  const expiresAt = getStoredTokenExpiresAt();
  if (!expiresAt) {
    return false;
  }

  return expiresAt - now <= MOBILE_REFRESH_LEAD_MS;
}

export function getProactiveRefreshDelayMs(now = Date.now()): number | null {
  const expiresAt = getStoredTokenExpiresAt();
  if (!expiresAt) {
    return null;
  }

  return Math.max(expiresAt - now - MOBILE_REFRESH_LEAD_MS, 0);
}

export function persistAuthTokens(accessToken: string, refreshToken?: string, expiresInSeconds?: number): void {
  localStorage.setItem('token', accessToken);
  if (refreshToken) {
    localStorage.setItem('refresh_token', refreshToken);
  }
  if (typeof expiresInSeconds === 'number' && expiresInSeconds > 0) {
    localStorage.setItem(TOKEN_EXPIRES_AT_KEY, String(Date.now() + (expiresInSeconds * 1000)));
  }
  notifyAuthStateChanged();
}

export function clearStoredAuthState(): void {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem(TOKEN_EXPIRES_AT_KEY);
  localStorage.removeItem('cached_office_id');
  sessionStorage.removeItem('cached_office_id');
  notifyAuthStateChanged();
}

export async function refreshAccessToken(refreshToken: string): Promise<string> {
  const response = await axios.post<PassportRefreshResponse>(
    `${API_BASE_URL}/refresh-token`,
    { refresh_token: refreshToken },
    {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    }
  );

  const tokens = response.data.data.tokens.auth;
  persistAuthTokens(tokens.access_token, tokens.refresh_token, tokens.expires_in);

  return tokens.access_token;
}
