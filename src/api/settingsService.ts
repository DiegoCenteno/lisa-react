import apiClient from './client';
import type { OfficeLabelItem } from '../types';

export interface SettingsProfileData {
  id: number;
  specialty_id: number | null;
  name: string;
  last_name: string;
  full_name: string;
  email: string;
  phone: string;
  phone_code: string;
  cedula_profesional: string;
  cedula_especialidad: string;
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

export interface SettingsPrintData {
  office_id: number;
  print_type: number;
  prescriptionsex: boolean;
  prescriptionbirthdate: boolean;
  prescriptionsignosvitales: boolean;
  prescriptionindicaciones: boolean;
  prescriptiondiagnostico: boolean;
}

export interface SettingsFormsData {
  office_id: number;
  clinical_history: Record<string, boolean>;
  daily_note: Record<string, boolean>;
  daily_note_clinical_history_visibility: Record<string, boolean>;
  patient_detail: {
    camera_menu_enabled: boolean;
    camera_menu_title: string;
    daily_note_title_enabled: boolean;
    daily_note_title: string;
  };
  new_appointment: {
    default_gender: 'M' | 'F' | '';
  };
  consultation_reasons: Array<{
    key: string;
    label: string;
    minutes: number | null;
  }>;
  custom_history_fields: Record<
    'heredofamiliares' | 'personales_no_patologicos' | 'personales_patologicos' | 'ginecologicos',
    Array<{
      key: string;
      label: string;
      input_type: 'checkbox' | 'text' | 'textarea' | 'select' | 'checkbox_with_text';
      enabled: boolean;
      required: boolean;
      sort_order: number;
      options: string[];
    }>
  >;
}

export interface SettingsReportsData {
  office_id: number;
  enabled_report_keys: string[];
  reports: Array<{
    key: string;
    label: string;
    enabled: boolean;
  }>;
  show_in_new_appointment: boolean;
}

export interface SettingsLabelStatusItem {
  id: number;
  code: string;
  identify: number;
  status?: number | null;
  created_at?: string;
  data?: {
    visible_days?: number | null;
  } | string | null;
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
    cedula_profesional?: string;
    cedula_especialidad?: string;
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

  async getPrintSettings(officeId: number): Promise<SettingsPrintData> {
    const response = await apiClient.get<{ status: string; data: SettingsPrintData }>(
      '/v2/settings/print',
      { params: { office_id: officeId } }
    );

    return response.data.data;
  },

  async updatePrintSettings(payload: SettingsPrintData): Promise<SettingsPrintData> {
    const response = await apiClient.put<{ status: string; data: SettingsPrintData }>(
      '/v2/settings/print',
      payload
    );

    return response.data.data;
  },

  async getFormSettings(officeId: number): Promise<SettingsFormsData> {
    const response = await apiClient.get<{ status: string; data: SettingsFormsData }>(
      '/v2/settings/forms',
      { params: { office_id: officeId } }
    );

    return response.data.data;
  },

  async updateFormSettings(payload: SettingsFormsData): Promise<SettingsFormsData> {
    const response = await apiClient.put<{ status: string; data: SettingsFormsData }>(
      '/v2/settings/forms',
      payload
    );

    return response.data.data;
  },

  async getReportSettings(officeId: number): Promise<SettingsReportsData> {
    const response = await apiClient.get<{ status: string; data: SettingsReportsData }>(
      '/v2/settings/reports',
      { params: { office_id: officeId } }
    );

    return response.data.data;
  },

  async getOfficeLabels(officeId: number): Promise<OfficeLabelItem[]> {
    const response = await apiClient.get<{ status: string; data: OfficeLabelItem[] }>(
      '/v2/datahelp/office-labels',
      { params: { office_id: officeId } }
    );

    return response.data.data ?? [];
  },

  async createOfficeLabel(payload: {
    office_id: number;
    code: string;
    identify?: string;
    status?: number;
  }): Promise<OfficeLabelItem> {
    const response = await apiClient.post<{ status: string; data: OfficeLabelItem }>(
      '/v2/datahelp/office-labels',
      payload
    );

    return response.data.data;
  },

  async updateOfficeLabel(
    id: number,
    payload: {
      office_id: number;
      code?: string;
      identify?: string;
      status?: number;
    }
  ): Promise<OfficeLabelItem> {
    const response = await apiClient.put<{ status: string; data: OfficeLabelItem }>(
      `/v2/datahelp/office-labels/${id}`,
      payload
    );

    return response.data.data;
  },

  async getOfficeLabelStatuses(officeId: number): Promise<SettingsLabelStatusItem[]> {
    const response = await apiClient.get<{ status: string; data: SettingsLabelStatusItem[] }>(
      '/v2/datahelp/office-label-statuses',
      { params: { office_id: officeId } }
    );

    return response.data.data ?? [];
  },

  async createOfficeLabelStatus(payload: {
    office_id: number;
    code: string;
    identify: number;
    data?: {
      visible_days?: number | null;
    };
    status?: number;
  }): Promise<SettingsLabelStatusItem> {
    const response = await apiClient.post<{ status: string; data: SettingsLabelStatusItem }>(
      '/v2/datahelp/office-label-statuses',
      payload
    );

    return response.data.data;
  },

  async updateOfficeLabelStatus(
    id: number,
    payload: {
      office_id: number;
      code?: string;
      identify?: number;
      data?: {
        visible_days?: number | null;
      };
      status?: number;
    }
  ): Promise<SettingsLabelStatusItem> {
    const response = await apiClient.put<{ status: string; data: SettingsLabelStatusItem }>(
      `/v2/datahelp/office-label-statuses/${id}`,
      payload
    );

    return response.data.data;
  },

  async updateReportSettings(payload: SettingsReportsData): Promise<SettingsReportsData> {
    const response = await apiClient.put<{ status: string; data: SettingsReportsData }>(
      '/v2/settings/reports',
      payload
    );

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
