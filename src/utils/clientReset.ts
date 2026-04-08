const CLIENT_RESET_VERSION_KEY = 'client_reset_version';
const CLIENT_RESET_VERSION = '2026-04-login-reset-v2';

export async function clearBrowserClientState(): Promise<void> {
  try {
    localStorage.clear();
  } catch {
    // Ignore storage access errors.
  }

  try {
    sessionStorage.clear();
  } catch {
    // Ignore storage access errors.
  }

  if (typeof window !== 'undefined' && 'caches' in window) {
    try {
      const cacheKeys = await window.caches.keys();
      await Promise.all(cacheKeys.map((cacheKey) => window.caches.delete(cacheKey)));
    } catch {
      // Ignore cache cleanup errors.
    }
  }

  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    } catch {
      // Ignore service worker cleanup errors.
    }
  }

  try {
    localStorage.setItem(CLIENT_RESET_VERSION_KEY, CLIENT_RESET_VERSION);
  } catch {
    // Ignore storage access errors.
  }
}

export function shouldRunClientReset(): boolean {
  try {
    return localStorage.getItem(CLIENT_RESET_VERSION_KEY) !== CLIENT_RESET_VERSION;
  } catch {
    return true;
  }
}

export { CLIENT_RESET_VERSION_KEY, CLIENT_RESET_VERSION };
