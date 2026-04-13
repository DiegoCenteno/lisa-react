import { useState, useCallback, useMemo, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { User, UserRole } from '../types';
import { authService } from '../api/authService';
import { appointmentService } from '../api/appointmentService';
import { AuthContext } from './authTypes';
import { clearBrowserClientState } from '../utils/clientReset';

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
    let active = true;

    const ensureSessionOfficeId = async () => {
      if (!user || !token) return;
      if (sessionStorage.getItem('cached_office_id')) return;

      localStorage.removeItem('cached_office_id');

      try {
        const offices = await appointmentService.getOffices();
        if (!active) return;
        if (offices.length > 0) {
          sessionStorage.setItem('cached_office_id', String(offices[0].id));
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
    setUser(response.user);
    setToken(response.token);
    localStorage.setItem('token', response.token);
    localStorage.setItem('user', JSON.stringify(response.user));
    localStorage.removeItem('cached_office_id');
    sessionStorage.removeItem('cached_office_id');
    if (response.refresh_token) {
      localStorage.setItem('refresh_token', response.refresh_token);
    }

    try {
      const offices = await appointmentService.getOffices();
      if (offices.length > 0) {
        sessionStorage.setItem('cached_office_id', String(offices[0].id));
      }
    } catch {
      sessionStorage.removeItem('cached_office_id');
    }
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('cached_office_id');
    sessionStorage.removeItem('cached_office_id');
  }, []);

  const hardResetClientAuth = useCallback(async () => {
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
