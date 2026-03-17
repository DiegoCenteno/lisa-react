import type { Appointment, Office } from '../types';
import apiClient from './client';

interface ApiListResponse {
  status: string;
  data: Appointment[];
}

interface ApiSingleResponse {
  status: string;
  data: Appointment;
}

interface ApiOfficesResponse {
  status: string;
  data: Office[];
}

export const appointmentService = {
  async getAppointmentsByRange(
    startDate: string,
    endDate: string
  ): Promise<Appointment[]> {
    const response = await apiClient.get<ApiListResponse>('/v2/appointments', {
      params: {
        start_date: startDate,
        end_date: endDate,
      },
    });
    return response.data.data;
  },

  async createAppointment(data: {
    office_id: number;
    patient_id: number;
    datestart: string;
    dateend: string;
    reason?: string;
  }): Promise<Appointment> {
    const response = await apiClient.post<ApiSingleResponse>(
      '/v2/appointments',
      data
    );
    return response.data.data;
  },

  async updateAppointment(
    id: number,
    data: Partial<Pick<Appointment, 'datestart' | 'dateend' | 'status' | 'reason'>>
  ): Promise<Appointment> {
    const response = await apiClient.put<ApiSingleResponse>(
      `/v2/appointments/${id}`,
      data
    );
    return response.data.data;
  },

  async getOffices(): Promise<Office[]> {
    const response = await apiClient.get<ApiOfficesResponse>('/v2/offices');
    return response.data.data;
  },
};
