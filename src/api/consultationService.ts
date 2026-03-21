import type { ConsultationListItem } from '../types';
import apiClient from './client';

interface ApiConsultationsResponse {
  status: string;
  data: ConsultationListItem[];
}

export const consultationService = {
  async getLatestConsultations(): Promise<ConsultationListItem[]> {
    const response = await apiClient.get<ApiConsultationsResponse>('/v2/consultations');
    return response.data.data ?? [];
  },
};
