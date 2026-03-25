import { useState, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import type { User, UserRole } from '../types';
import { authService } from '../api/authService';
import { AuthContext } from './authTypes';

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

  const login = useCallback(async (email: string, password: string) => {
    const response = await authService.login(email, password);
    setUser(response.user);
    setToken(response.token);
    localStorage.setItem('token', response.token);
    localStorage.setItem('user', JSON.stringify(response.user));
    if (response.refresh_token) {
      localStorage.setItem('refresh_token', response.refresh_token);
    }
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('refresh_token');
  }, []);

  const hasRole = useCallback(
    (roles: UserRole[]) => {
      if (!user) return false;
      return roles.includes(user.role);
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
    hasRole,
    updateUser,
  }), [user, token, login, logout, hasRole, updateUser]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
