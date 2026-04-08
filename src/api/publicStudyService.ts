import axios from 'axios';
import type {
  AvailableSlot,
  PublicAppLinkResponse,
  PublicAssistantLinkResponse,
  PublicAssistantRegisterResponse,
  PublicBookingCandidateResponse,
  PublicRescheduleDateOption,
  PublicRescheduleLinkResponse,
  PublicRescheduleSuccessResponse,
} from '../types';

type PublicAppointmentPayload = NonNullable<PublicAppLinkResponse['appointment']>;

const publicApiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://lisamedic.com/api',
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

const publicStudyService = {
  async resolvePublicCode(code: string, options?: { preview?: boolean }): Promise<PublicAppLinkResponse> {
    const response = await publicApiClient.get<{ status: string; data: PublicAppLinkResponse }>(
      `/v2/public/app-links/${code}`,
      {
        params: {
          preview: options?.preview ? 1 : undefined,
        },
      }
    );

    return response.data.data;
  },

  async respondToAppointment(code: string, action: 'confirm' | 'cancel'): Promise<PublicAppointmentPayload> {
    const response = await publicApiClient.post<{ status: string; data: PublicAppointmentPayload }>(
      `/v2/public/app-links/${code}/appointment-response`,
      { action }
    );

    return response.data.data;
  },

  async saveAppointmentHistoryForm(
    code: string,
    payload: Record<string, unknown>
  ): Promise<PublicAppointmentPayload> {
    const response = await publicApiClient.post<{ status: string; data: PublicAppointmentPayload }>(
      `/v2/public/app-links/${code}/history-form`,
      payload
    );

    return response.data.data;
  },

  async getStudyFileBlob(code: string): Promise<Blob> {
    const response = await publicApiClient.get<Blob>(`/v2/public/app-links/${code}/file`, {
      responseType: 'blob',
    });

    return response.data;
  },

  async resolvePublicRescheduleCode(code: string): Promise<PublicRescheduleLinkResponse> {
    const response = await publicApiClient.get<{ status: string; data: PublicRescheduleLinkResponse }>(
      `/v2/public/reschedule-links/${code}`
    );

    return response.data.data;
  },

  async resolvePublicAssistantCode(code: string): Promise<PublicAssistantLinkResponse> {
    const response = await publicApiClient.get<{ status: string; data: PublicAssistantLinkResponse }>(
      `/v2/public/assistant-links/${code}`
    );

    return response.data.data;
  },

  async registerAssistant(
    code: string,
    payload: {
      code: string;
      name: string;
      last_name: string;
      email: string;
      phone: string;
      password: string;
      password_confirmation: string;
    }
  ): Promise<PublicAssistantRegisterResponse> {
    const response = await publicApiClient.post<{ status: string; message: string; data: PublicAssistantRegisterResponse }>(
      `/v2/public/assistant-links/${code}/register`,
      payload
    );

    return {
      ...response.data.data,
      message: response.data.message ?? response.data.data.message,
    };
  },

  async getPublicRescheduleDates(code: string): Promise<PublicRescheduleDateOption[]> {
    const response = await publicApiClient.get<{ status: string; data: { dates: PublicRescheduleDateOption[] } }>(
      `/v2/public/reschedule-links/${code}/available-dates`
    );

    return response.data.data.dates;
  },

  async getPublicRescheduleSlots(code: string, date: string): Promise<AvailableSlot[]> {
    const response = await publicApiClient.get<{ status: string; data: AvailableSlot[] }>(
      `/v2/public/reschedule-links/${code}/available-slots`,
      {
        params: { date },
      }
    );

    return response.data.data;
  },

  async checkPublicBookingCandidates(
    code: string,
    payload: { name: string; last_name: string; phone: string }
  ): Promise<PublicBookingCandidateResponse> {
    const response = await publicApiClient.post<{ status: string; data: PublicBookingCandidateResponse }>(
      `/v2/public/reschedule-links/${code}/check-patient-candidates`,
      payload
    );

    return response.data.data;
  },

  async submitPublicReschedule(
    code: string,
    payload: {
      datestart: string;
      dateend: string;
      name?: string;
      last_name?: string;
      phone?: string;
      reason?: string;
      website?: string;
      selected_user_id?: number;
    }
  ): Promise<PublicRescheduleSuccessResponse> {
    const response = await publicApiClient.post<{ status: string; data: PublicRescheduleSuccessResponse }>(
      `/v2/public/reschedule-links/${code}/appointments`,
      payload
    );

    return response.data.data;
  },
};

export default publicStudyService;
