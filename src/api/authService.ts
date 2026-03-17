import type { AuthResponse, User } from '../types';
import apiClient from './client';

const MOCK_USERS: (User & { password: string })[] = [
  {
    id: 1,
    name: 'Dr. Carlos Mendoza',
    email: 'medico@lisamedic.com',
    role: 'medico' as User['role'],
    specialty: 'Ginecología',
    phone: '3312345678',
    password: 'demo123',
  },
  {
    id: 2,
    name: 'Ana García',
    email: 'asistente@lisamedic.com',
    role: 'asistente' as User['role'],
    phone: '3312345679',
    password: 'demo123',
  },
  {
    id: 3,
    name: 'Admin Sistema',
    email: 'admin@lisamedic.com',
    role: 'admin_system' as User['role'],
    password: 'demo123',
  },
  {
    id: 4,
    name: 'Dr. Roberto Núcleo',
    email: 'nucleo@lisamedic.com',
    role: 'admin_nucleo' as User['role'],
    password: 'demo123',
  },
  {
    id: 5,
    name: 'Dr. Laura Pérez',
    email: 'compartido@lisamedic.com',
    role: 'medico_compartido' as User['role'],
    specialty: 'Medicina General',
    consultorio_id: 1,
    password: 'demo123',
  },
];

const USE_MOCK = true;

export const authService = {
  async login(email: string, password: string): Promise<AuthResponse> {
    if (USE_MOCK) {
      const user = MOCK_USERS.find(
        (u) => u.email === email && u.password === password
      );
      if (!user) {
        throw new Error('Credenciales inválidas');
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password: _password, ...userData } = user;
      return {
        user: userData,
        token: 'mock-token-' + user.id,
      };
    }
    const response = await apiClient.post<AuthResponse>('/auth/login', {
      email,
      password,
    });
    return response.data;
  },

  async logout(): Promise<void> {
    if (USE_MOCK) {
      return;
    }
    await apiClient.post('/auth/logout');
  },

  async getProfile(): Promise<User> {
    if (USE_MOCK) {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        return JSON.parse(userStr) as User;
      }
      throw new Error('No autenticado');
    }
    const response = await apiClient.get<User>('/auth/profile');
    return response.data;
  },
};
