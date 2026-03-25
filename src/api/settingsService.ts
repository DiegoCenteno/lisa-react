import apiClient from './client';

export interface SettingsProfileData {
  id: number;
  specialty_id: number | null;
  name: string;
  last_name: string;
  full_name: string;
  email: string;
  phone: string;
  phone_code: string;
  specialties: Array<{
    id: number;
    title: string;
  }>;
}

export interface SettingsCompanyData {
  office_id: number;
  title: string;
  address: string;
  suburb: string;
  phone: string;
}

export interface SettingsAgendaDayInput {
  day: number;
  enabled: boolean;
  start: string;
  end: string;
  breakstart?: string;
  breakend?: string;
}

export interface SettingsAgendaData {
  office_id: number;
  firsttime: number | null;
  recurrent: number | null;
  opendays: SettingsAgendaDayInput[];
}

export interface SettingsUnavailableDayItem {
  id: number;
  start_date: string;
  end_date: string;
  start_date_label: string;
  end_date_label: string;
}

export interface SettingsAvailableDayItem {
  id: number;
  date: string;
  start: string;
  end: string;
  date_label: string;
  start_label: string;
  end_label: string;
}

const settingsService = {
  async getProfile(): Promise<SettingsProfileData> {
    const response = await apiClient.get<{ status: string; data: SettingsProfileData }>(
      '/v2/settings/profile'
    );

    return response.data.data;
  },

  async updateProfile(payload: {
    specialty_id: number | null;
    name: string;
    last_name: string;
    phone: string;
    phone_code?: string;
  }): Promise<SettingsProfileData> {
    const response = await apiClient.put<{ status: string; data: SettingsProfileData }>(
      '/v2/settings/profile',
      payload
    );

    return response.data.data;
  },

  async updatePassword(payload: {
    current_password: string;
    new_password: string;
    new_password_confirmation: string;
  }): Promise<void> {
    await apiClient.put('/v2/settings/password', payload);
  },

  async updateCompany(payload: SettingsCompanyData): Promise<{
    id: number;
    title: string;
    address?: string;
    suburb?: string;
    phone?: string;
  }> {
    const response = await apiClient.put<{
      status: string;
      data: {
        id: number;
        title: string;
        address?: string;
        suburb?: string;
        phone?: string;
      };
    }>('/v2/settings/company', {
      office_id: payload.office_id,
      title: payload.title,
      address: payload.address,
      suburb: payload.suburb,
      phone: payload.phone,
    });

    return response.data.data;
  },

  async updateAgenda(payload: SettingsAgendaData): Promise<{
    id: number;
    opendays: Array<{
      day: number;
      start: string;
      end: string;
      breakstart?: string;
      breakend?: string;
    }>;
    firsttime: number | null;
    recurrent: number | null;
  }> {
    const response = await apiClient.put<{
      status: string;
      data: {
        id: number;
        opendays: Array<{
          day: number;
          start: string;
          end: string;
          breakstart?: string;
          breakend?: string;
        }>;
        firsttime: number | null;
        recurrent: number | null;
      };
    }>('/v2/settings/agenda', payload);

    return response.data.data;
  },

  async getUnavailableDays(officeId: number): Promise<SettingsUnavailableDayItem[]> {
    const response = await apiClient.get<{ status: string; data: SettingsUnavailableDayItem[] }>(
      '/v2/settings/unavailable-days',
      { params: { office_id: officeId } }
    );

    return response.data.data ?? [];
  },

  async createUnavailableDay(payload: {
    office_id: number;
    start_date: string;
    end_date: string;
  }): Promise<SettingsUnavailableDayItem> {
    const response = await apiClient.post<{ status: string; data: SettingsUnavailableDayItem }>(
      '/v2/settings/unavailable-days',
      payload
    );

    return response.data.data;
  },

  async deleteUnavailableDay(id: number): Promise<void> {
    await apiClient.delete(`/v2/settings/unavailable-days/${id}`);
  },

  async getAvailableDays(officeId: number): Promise<SettingsAvailableDayItem[]> {
    const response = await apiClient.get<{ status: string; data: SettingsAvailableDayItem[] }>(
      '/v2/settings/available-days',
      { params: { office_id: officeId } }
    );

    return response.data.data ?? [];
  },

  async createAvailableDay(payload: {
    office_id: number;
    date: string;
    start: string;
    end: string;
  }): Promise<{ record: SettingsAvailableDayItem; warning?: string | null }> {
    const response = await apiClient.post<{
      status: string;
      data: SettingsAvailableDayItem;
      warning?: string | null;
    }>('/v2/settings/available-days', payload);

    return {
      record: response.data.data,
      warning: response.data.warning ?? null,
    };
  },

  async deleteAvailableDay(id: number): Promise<void> {
    await apiClient.delete(`/v2/settings/available-days/${id}`);
  },
};

export default settingsService;
