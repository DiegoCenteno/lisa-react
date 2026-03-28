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
};
