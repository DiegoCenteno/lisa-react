import apiClient from './client';
import type {
  NotificationAssistantRecipientsData,
  NotificationSettingsData,
  PatientResultTemplate,
} from '../types';

const notificationService = {
  async getSettings(): Promise<NotificationSettingsData> {
    const response = await apiClient.get<{ status: string; data: NotificationSettingsData }>(
      '/v2/notifications/settings'
    );

    return response.data.data;
  },

  async updateSettings(preferences: Record<string, boolean>): Promise<NotificationSettingsData> {
    const response = await apiClient.put<{ status: string; data: NotificationSettingsData }>(
      '/v2/notifications/settings',
      { preferences }
    );

    return response.data.data;
  },

  async getAssistantRecipients(officeId: number): Promise<NotificationAssistantRecipientsData> {
    const response = await apiClient.get<{ status: string; data: NotificationAssistantRecipientsData }>(
      '/v2/notifications/assistant-recipients',
      { params: { office_id: officeId } }
    );

    return response.data.data;
  },

  async updateAssistantRecipient(officeId: number, assistantId: number, enabled: boolean): Promise<NotificationAssistantRecipientsData> {
    const response = await apiClient.put<{ status: string; data: NotificationAssistantRecipientsData }>(
      '/v2/notifications/assistant-recipients',
      { office_id: officeId, assistant_id: assistantId, enabled }
    );

    return response.data.data;
  },

  async addLegacyRecipient(officeId: number, phone: string): Promise<NotificationAssistantRecipientsData> {
    const response = await apiClient.post<{ status: string; data: NotificationAssistantRecipientsData }>(
      '/v2/notifications/assistant-recipients',
      { office_id: officeId, phone }
    );

    return response.data.data;
  },

  async updateLegacyRecipient(id: number, enabled: boolean): Promise<NotificationAssistantRecipientsData> {
    const response = await apiClient.put<{ status: string; data: NotificationAssistantRecipientsData }>(
      `/v2/notifications/assistant-recipients/${id}`,
      { enabled }
    );

    return response.data.data;
  },

  async removeLegacyRecipient(id: number): Promise<NotificationAssistantRecipientsData> {
    const response = await apiClient.delete<{ status: string; data: NotificationAssistantRecipientsData }>(
      `/v2/notifications/assistant-recipients/${id}`
    );

    return response.data.data;
  },

  async disableAssistant(id: number): Promise<NotificationAssistantRecipientsData> {
    const response = await apiClient.delete<{ status: string; data: NotificationAssistantRecipientsData }>(
      `/v2/notifications/assistants/${id}`
    );

    return response.data.data;
  },

  async addPreassistant(officeId: number): Promise<NotificationAssistantRecipientsData> {
    const response = await apiClient.post<{ status: string; data: NotificationAssistantRecipientsData }>(
      '/v2/notifications/preassistants',
      { office_id: officeId }
    );

    return response.data.data;
  },

  async removePreassistant(id: number): Promise<NotificationAssistantRecipientsData> {
    const response = await apiClient.delete<{ status: string; data: NotificationAssistantRecipientsData }>(
      `/v2/notifications/preassistants/${id}`
    );

    return response.data.data;
  },

  async getResultTemplates(officeId: number): Promise<PatientResultTemplate[]> {
    const response = await apiClient.get<{ status: string; data: PatientResultTemplate[] }>(
      '/v2/datahelp/office-result-templates',
      { params: { office_id: officeId } }
    );

    return response.data.data ?? [];
  },

  async createResultTemplate(officeId: number, code: string, data: string): Promise<PatientResultTemplate> {
    const response = await apiClient.post<{ status: string; data: PatientResultTemplate }>(
      '/v2/datahelp/office-result-templates',
      { office_id: officeId, code, data, status: 1 }
    );

    return response.data.data;
  },

  async updateResultTemplate(
    id: number,
    officeId: number,
    payload: Partial<Pick<PatientResultTemplate, 'code' | 'data'>> & { status?: number }
  ): Promise<PatientResultTemplate> {
    const response = await apiClient.put<{ status: string; data: PatientResultTemplate }>(
      `/v2/datahelp/office-result-templates/${id}`,
      { office_id: officeId, ...payload }
    );

    return response.data.data;
  },
};

export default notificationService;
