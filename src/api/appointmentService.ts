import type { Appointment, Office, AvailableDatesResponse, AvailableSlot, PatientSimple, PatientSearchResult, LastConsultationSummary, ActivityLogItem } from '../types';
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

interface ApiSlotsResponse {
  status: string;
  data: AvailableSlot[];
}

interface ApiPatientsResponse {
  status: string;
  data: {
    current_page: number;
    data: PatientSimple[];
  };
}

interface ApiLastConsultationSummaryResponse {
  status: string;
  data: LastConsultationSummary;
}

interface ApiActivityLogListResponse {
  status: string;
  data: ActivityLogItem[];
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
    activity_action?: 'create' | 'assign';
    notify_patient?: boolean;
  }): Promise<Appointment> {
    const response = await apiClient.post<ApiSingleResponse>(
      '/v2/appointments',
      data
    );
    return response.data.data;
  },

  async updateAppointment(
    id: number,
    data: Partial<Pick<Appointment, 'datestart' | 'dateend' | 'status' | 'reason'>> & {
      notify_patient?: boolean;
    }
  ): Promise<Appointment> {
    const response = await apiClient.put<ApiSingleResponse>(
      `/v2/appointments/${id}`,
      data
    );
    return response.data.data;
  },

  async createAppointmentWithNewPatient(data: {
    office_id: number;
    datestart: string;
    dateend: string;
    reason?: string;
    name: string;
    last_name: string;
    phone: string;
    phone_code: string;
    gender?: string;
    birth_date?: string;
    activity_action?: 'create' | 'assign';
    notify_patient?: boolean;
  }): Promise<Appointment> {
    const response = await apiClient.post<ApiSingleResponse>(
      '/v2/appointments',
      data
    );
    return response.data.data;
  },

  async getAvailableDates(officeId: number, minutes: number = 50): Promise<AvailableDatesResponse> {
    const response = await apiClient.get<AvailableDatesResponse>(
      '/v2/appointments/available-dates',
      { params: { office_id: officeId, minutes } }
    );
    return response.data;
  },

  async getAvailableSlots(
    officeId: number,
    date: string,
    minutes: number = 50
  ): Promise<AvailableSlot[]> {
    const response = await apiClient.get<ApiSlotsResponse>(
      '/v2/appointments/available-slots',
      { params: { office_id: officeId, date, mode: 'full', minutes } }
    );
    return response.data.data;
  },

  async getPatients(officeId: number): Promise<PatientSimple[]> {
    const response = await apiClient.get<ApiPatientsResponse>(
      '/v2/patients',
      { params: { office_id: officeId, simple: 1 } }
    );
    // Handle both paginated { data: { data: [...] } } and direct { data: [...] } formats
    const outer = response.data.data;
    if (Array.isArray(outer)) {
      return outer as unknown as PatientSimple[];
    }
    return outer.data ?? [];
  },

  async searchPatientsByPhone(phone: string): Promise<PatientSearchResult[]> {
    const response = await apiClient.get<{ status: string; data: PatientSearchResult[] }>(
      '/v2/patients/search',
      { params: { phone } }
    );
    return response.data.data ?? [];
  },

  async searchPatientsByName(search: string): Promise<PatientSearchResult[]> {
    const response = await apiClient.get<{ status: string; data: PatientSearchResult[] }>(
      '/v2/patients/search',
      { params: { search } }
    );
    return response.data.data ?? [];
  },

  async getOffices(): Promise<Office[]> {
    const response = await apiClient.get<ApiOfficesResponse>('/v2/offices');
    return response.data.data;
  },

  async getLastConsultationSummary(patientId: number): Promise<LastConsultationSummary> {
    const response = await apiClient.get<ApiLastConsultationSummaryResponse>(
      `/v2/patients/${patientId}/last-consultation-summary`
    );
    return response.data.data;
  },

  async getAppointmentActivityLogs(appointmentId: number): Promise<ActivityLogItem[]> {
    const response = await apiClient.get<ApiActivityLogListResponse>(
      `/v2/appointments/${appointmentId}/activity-logs`
    );
    return response.data.data ?? [];
  },
};
