import { createContext } from 'react';
import type { User, UserRole } from '../types';

export interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hasRole: (roles: UserRole[]) => boolean;
  updateUser: (updater: Partial<User> | ((current: User | null) => User | null)) => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
