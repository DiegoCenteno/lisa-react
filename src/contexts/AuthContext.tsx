import { useState, useCallback, useMemo, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { User, UserRole } from '../types';
import { authService } from '../api/authService';
import {
  AUTH_STATE_CHANGED_EVENT,
  clearStoredAuthState,
  getProactiveRefreshDelayMs,
  isExtendedSessionEnabled,
  persistAuthTokens,
  refreshAccessToken,
  shouldRefreshSoon,
} from '../api/authSession';
import { appointmentService } from '../api/appointmentService';
import { primeResolvedOfficeIdCache as primePatientOfficeIdCache, resetResolvedOfficeIdCache as resetPatientOfficeIdCache } from '../api/patientService';
import { primeResolvedOfficeIdCache as primeConsultationOfficeIdCache, resetResolvedOfficeIdCache as resetConsultationOfficeIdCache } from '../api/consultationService';
import { AuthContext } from './authTypes';
import { clearBrowserClientState } from '../utils/clientReset';
import { isPermissionAllowedByAssistantAccessLevel } from '../utils/assistantAccess';

export type { AuthContextType } from './authTypes';
export { AuthContext } from './authTypes';

function getInitialUser(): User | null {
  const savedUser = localStorage.getItem('user');
  if (savedUser) {
    return JSON.parse(savedUser) as User;
  }
  return null;
}

function getInitialToken(): string | null {
  return localStorage.getItem('token');
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(getInitialUser);
  const [token, setToken] = useState<string | null>(getInitialToken);

  useEffect(() => {
    const syncAuthState = () => {
      setUser(getInitialUser());
      setToken(getInitialToken());
    };

    window.addEventListener(AUTH_STATE_CHANGED_EVENT, syncAuthState);
    window.addEventListener('storage', syncAuthState);

    return () => {
      window.removeEventListener(AUTH_STATE_CHANGED_EVENT, syncAuthState);
      window.removeEventListener('storage', syncAuthState);
    };
  }, []);

  useEffect(() => {
    if (!user || !token || !isExtendedSessionEnabled()) {
      return;
    }

    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
      return;
    }

    let cancelled = false;
    let timerId: ReturnType<typeof setTimeout> | null = null;

    const redirectToLogin = () => {
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    };

    const refreshSession = async () => {
      try {
        await refreshAccessToken(refreshToken);
      } catch {
        if (!cancelled) {
          clearStoredAuthState();
          redirectToLogin();
        }
      }
    };

    if (shouldRefreshSoon()) {
      void refreshSession();
      return () => {
        cancelled = true;
      };
    }

    const delayMs = getProactiveRefreshDelayMs();
    if (delayMs === null) {
      return;
    }

    timerId = setTimeout(() => {
      void refreshSession();
    }, delayMs);

    return () => {
      cancelled = true;
      if (timerId !== null) {
        clearTimeout(timerId);
      }
    };
  }, [user, token]);

  useEffect(() => {
    let active = true;

    const ensureSessionOfficeId = async () => {
      if (!user || !token) return;
      if (user.role === 'system_admin') return;
      if (sessionStorage.getItem('cached_office_id')) return;

      localStorage.removeItem('cached_office_id');

      try {
        const offices = await appointmentService.getOffices();
        if (!active) return;
        if (offices.length > 0) {
          primePatientOfficeIdCache(offices[0].id);
          primeConsultationOfficeIdCache(offices[0].id);
        }
      } catch {
        // Ignore office bootstrap failures here; services will fallback as needed.
      }
    };

    void ensureSessionOfficeId();

    return () => {
      active = false;
    };
  }, [user, token]);

  const login = useCallback(async (email: string, password: string) => {
    const response = await authService.login(email, password);
    resetPatientOfficeIdCache();
    resetConsultationOfficeIdCache();
    setUser(response.user);
    setToken(response.token);
    localStorage.setItem('user', JSON.stringify(response.user));
    persistAuthTokens(response.token, response.refresh_token, response.expires_in);

    try {
      if (response.user.role !== 'system_admin') {
        const offices = await appointmentService.getOffices();
        if (offices.length > 0) {
          primePatientOfficeIdCache(offices[0].id);
          primeConsultationOfficeIdCache(offices[0].id);
        }
      }
    } catch {
      resetPatientOfficeIdCache();
      resetConsultationOfficeIdCache();
    }
  }, []);

  const logout = useCallback(() => {
    void authService.logout();
    resetPatientOfficeIdCache();
    resetConsultationOfficeIdCache();
    setUser(null);
    setToken(null);
    clearStoredAuthState();
  }, []);

  const hardResetClientAuth = useCallback(async () => {
    resetPatientOfficeIdCache();
    resetConsultationOfficeIdCache();
    setUser(null);
    setToken(null);
    await clearBrowserClientState();
  }, []);

  const hasRole = useCallback(
    (roles: UserRole[]) => {
      if (!user) return false;
      return roles.includes(user.role);
    },
    [user]
  );

  const can = useCallback(
    (permission: string) => {
      if (!user) return false;
      if (user.role === 'medico') return true;
      if (user.role === 'system_admin') {
        return permission.startsWith('system.');
      }
      if (!isPermissionAllowedByAssistantAccessLevel(user, permission)) {
        return false;
      }
      const permissions = user.permissions ?? [];
      if (permissions.includes('*') || permissions.includes(permission)) {
        return true;
      }

      const segments = permission.split('.');
      if (segments.length > 1) {
        const scopeManagePermission = `${segments[0]}.manage`;
        if (permissions.includes(scopeManagePermission)) {
          return true;
        }
      }

      return false;
    },
    [user]
  );

  const updateUser = useCallback((updater: Partial<User> | ((current: User | null) => User | null)) => {
    setUser((current) => {
      const nextUser = typeof updater === 'function'
        ? updater(current)
        : (current ? { ...current, ...updater } : current);

      if (nextUser) {
        localStorage.setItem('user', JSON.stringify(nextUser));
      } else {
        localStorage.removeItem('user');
      }

      return nextUser;
    });
  }, []);

  const value = useMemo(() => ({
    user,
    token,
    isAuthenticated: !!user && !!token,
    isLoading: false,
    login,
    logout,
    hardResetClientAuth,
    hasRole,
    can,
    updateUser,
  }), [user, token, login, logout, hardResetClientAuth, hasRole, can, updateUser]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
