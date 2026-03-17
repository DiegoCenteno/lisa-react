import type { DashboardStats } from '../types';
import apiClient from './client';

const USE_MOCK = true;

export const dashboardService = {
  async getStats(): Promise<DashboardStats> {
    if (USE_MOCK) {
      return {
        today_appointments: 5,
        week_appointments: 23,
        total_patients: 148,
        confirmed_appointments: 3,
        pending_appointments: 2,
        cancelled_appointments: 0,
      };
    }
    const response = await apiClient.get<DashboardStats>('/dashboard/stats');
    return response.data;
  },
};
