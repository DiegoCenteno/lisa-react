import type { AuthResponse, User, UserRole } from '../types';
import apiClient from './client';

const ROL_ID_MAP: Record<number, UserRole> = {
  1: 'medico',
  2: 'asistente',
};

interface PassportLoginResponse {
  status: string;
  data: {
    user: {
      id: number;
      name: string;
      last_name: string;
      email: string;
      phone: string;
      rol_id: number | null;
      specialty_id: number | null;
      assistant_access_level?: 'full' | 'limited' | null;
      permissions?: string[];
    };
    tokens: {
      auth: {
        access_token: string;
        refresh_token: string;
        expires_in: number;
      };
    };
  };
}

export const authService = {
  async login(emailOrPhone: string, password: string): Promise<AuthResponse> {
    const response = await apiClient.post<PassportLoginResponse>('/login', {
      emailOrPhone,
      password,
    });

    const apiUser = response.data.data.user;
    const access = response.data.data.tokens.auth;

    const user: User = {
      id: apiUser.id,
      name: `${apiUser.name} ${apiUser.last_name}`.trim(),
      email: apiUser.email,
      role: (apiUser.rol_id !== null && ROL_ID_MAP[apiUser.rol_id]) ? ROL_ID_MAP[apiUser.rol_id] : 'paciente',
      phone: apiUser.phone,
      assistant_access_level: apiUser.assistant_access_level ?? undefined,
      permissions: apiUser.permissions ?? [],
    };

    return {
      user,
      token: access.access_token,
      refresh_token: access.refresh_token,
    };
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post('/sign-out');
    } catch {
      // Ignore errors on logout - token may already be invalid
    }
  },

  async getProfile(): Promise<User> {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      return JSON.parse(userStr) as User;
    }
    throw new Error('No autenticado');
  },
};
