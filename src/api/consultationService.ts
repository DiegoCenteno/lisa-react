import type { ConsultationListItem } from '../types';
import apiClient from './client';
import { appointmentService } from './appointmentService';

interface ApiConsultationsResponse {
  status: string;
  data: ConsultationListItem[];
}

interface DailyNotePayload {
  patient_id: number;
  office_id: number;
  currentcondition?: string;
  ailingdate?: string;
  height?: string;
  weight?: string;
  ta?: string;
  temp?: string;
  fc?: string;
  os?: string;
  studies?: string;
  furupdate?: string;
  embarazadaupdate?: boolean;
  examination?: string;
  diagnostics?: string[];
  medications?: Array<{
    medicament?: string;
    prescription?: string;
  }>;
  indicaciones?: string;
  notes?: string;
  office_label_ids?: number[];
}

interface DownloadPrescriptionPayload {
  patient_id: number;
  office_id?: number;
  height?: string;
  weight?: string;
  ta?: string;
  temp?: string;
  fc?: string;
  os?: string;
  diagnostics?: string[];
  medications?: Array<{
    medicament?: string;
    prescription?: string;
  }>;
  indicaciones?: string;
}

export interface PatientReportItem {
  id: number;
  created_at?: string | null;
  created_at_label: string;
  type_key: string;
  type_label: string;
  editor_url?: string | null;
}

export interface PatientReportsData {
  patient_id: number;
  office_id: number;
  reports_enabled: Array<{
    key: string;
    label: string;
  }>;
  last_report_type_key?: string | null;
  last_report_type_label?: string | null;
  last_report_date_label?: string | null;
  items: PatientReportItem[];
}

async function resolveOfficeId(): Promise<number> {
  const userRaw = localStorage.getItem('user');
  if (userRaw) {
    try {
      const user = JSON.parse(userRaw) as { consultorio_id?: number };
      if (user.consultorio_id) {
        return user.consultorio_id;
      }
    } catch {
      // Ignore malformed local storage and continue with API lookup.
    }
  }

  const offices = await appointmentService.getOffices();
  if (offices.length === 0) {
    throw new Error('No se encontraron consultorios disponibles');
  }

  return offices[0].id;
}

export const consultationService = {
  async getLatestConsultations(): Promise<ConsultationListItem[]> {
    const response = await apiClient.get<ApiConsultationsResponse>('/v2/consultations');
    return response.data.data ?? [];
  },

  async createDailyNote(payload: Omit<DailyNotePayload, 'office_id'> & { office_id?: number }) {
    const officeId = payload.office_id ?? (await resolveOfficeId());

    const response = await apiClient.post('/v2/consultations', {
      ...payload,
      office_id: officeId,
    });

    return response.data;
  },

  async updateDailyNote(
    consultationId: number,
    payload: Omit<DailyNotePayload, 'office_id'> & { office_id?: number }
  ) {
    const officeId = payload.office_id ?? (await resolveOfficeId());

    const response = await apiClient.put(`/v2/consultations/${consultationId}`, {
      ...payload,
      office_id: officeId,
    });

    return response.data;
  },

  async downloadPrescription(payload: DownloadPrescriptionPayload): Promise<Blob> {
    const officeId = payload.office_id ?? (await resolveOfficeId());
    const response = await apiClient.post('/v2/consultations/download-prescription', {
      ...payload,
      office_id: officeId,
    }, {
      responseType: 'blob',
    });

    return response.data;
  },

  async downloadPrescriptionPdf(payload: DownloadPrescriptionPayload): Promise<Blob> {
    const officeId = payload.office_id ?? (await resolveOfficeId());
    const response = await apiClient.post('/v2/consultations/download-prescription-pdf', {
      ...payload,
      office_id: officeId,
    }, {
      responseType: 'blob',
    });

    return response.data;
  },

  async getPatientReports(patientId: number, officeId?: number): Promise<PatientReportsData> {
    const resolvedOfficeId = officeId ?? (await resolveOfficeId());
    const response = await apiClient.get<{ status: string; data: PatientReportsData }>(
      `/v2/patients/${patientId}/reports`,
      { params: { office_id: resolvedOfficeId } }
    );

    return response.data.data;
  },

  async createPatientReport(
    patientId: number,
    reportKey: string,
    officeId?: number
  ): Promise<{
    id: number;
    type_key: string;
    type_label: string;
    created_at?: string | null;
    created_at_label: string;
    next_view: 'colposcopy' | 'legacy_report_editor';
    editor_url?: string | null;
  }> {
    const resolvedOfficeId = officeId ?? (await resolveOfficeId());
    const response = await apiClient.post<{
      status: string;
      message: string;
      data: {
        id: number;
        type_key: string;
        type_label: string;
        created_at?: string | null;
        created_at_label: string;
        next_view: 'colposcopy' | 'legacy_report_editor';
        editor_url?: string | null;
      };
    }>(`/v2/patients/${patientId}/reports`, {
      office_id: resolvedOfficeId,
      report_key: reportKey,
    });

    return response.data.data;
  },
};
