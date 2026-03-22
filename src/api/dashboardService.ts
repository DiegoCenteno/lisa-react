import type { DashboardStats } from '../types';
import apiClient from './client';

interface ApiDashboardStatsResponse {
  status: string;
  data: DashboardStats;
}

export const dashboardService = {
  async getStats(): Promise<DashboardStats> {
    const response = await apiClient.get<ApiDashboardStatsResponse>('/v2/dashboard/stats');
    return response.data.data;
  },
};
