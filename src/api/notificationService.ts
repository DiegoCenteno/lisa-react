import apiClient from './client';
import type { NotificationAssistantRecipientsData, NotificationSettingsData } from '../types';

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
};

export default notificationService;
