import type { Patient, ClinicalHistory, SOAPNote, PatientFile, PatientSoapContext, MedicamentHistoryItem, OfficeLabelItem } from '../types';
import apiClient from './client';
import { appointmentService } from './appointmentService';
import { createEmptyClinicalHistory, decodeClinicalHistory, encodeClinicalHistory } from '../utils/clinicalHistory';

type ApiPatientRecord = {
  id: number;
  name?: string;
  last_name?: string;
  full_name?: string;
  phone?: string;
  phone_code?: string;
  full_phone?: string;
  birth?: {
    raw?: string;
    formats?: {
      iso?: string;
    };
  };
  age?: number | string;
  gender?: string;
  allergy?: string | null;
  datahc?: unknown;
  effective_consultations_count?: number;
  is_first_time?: boolean;
};

type ApiPatientsPayload =
  | ApiPatientRecord[]
  | {
      data?: ApiPatientRecord[];
    };

interface ApiPatientsResponse {
  status: string;
  data: ApiPatientsPayload;
}

interface ApiPatientSoapContextResponse {
  status: string;
  data: PatientSoapContext;
}

interface ApiPatientConsultationsHistoryResponse {
  status: string;
  data: Array<{
    consultation_id: number;
    patient_id: number;
    office_id?: number;
    currentcondition?: string;
    ailingdate?: string;
    height?: string;
    weight?: string;
    ta?: string;
    temp?: string;
    fc?: string;
    os?: string;
    studies?: string;
    examination?: string;
    diagnostics?: string[];
    diagnostic_text?: string;
    medications?: Array<{
      medicament?: string;
      prescription?: string;
    }>;
    medicament_text?: string;
    indicaciones?: string;
    notes?: string;
    office_label_ids?: number[];
    created_at: string;
    updated_at?: string;
  }>;
}

interface ApiMedicamentHistoryResponse {
  status: string;
  data: MedicamentHistoryItem[];
}

interface ApiOfficeLabelsResponse {
  status: string;
  data: OfficeLabelItem[];
}

interface ApiPatientFilesResponse {
  status: string;
  data: PatientFile[];
}

function splitFullName(fullName?: string): { name: string; lastName: string } {
  const safe = (fullName ?? '').trim();
  if (!safe) return { name: '', lastName: '' };
  const parts = safe.split(/\s+/);
  if (parts.length === 1) return { name: parts[0], lastName: '' };
  return {
    name: parts[0],
    lastName: parts.slice(1).join(' '),
  };
}

function normalizePatient(record: ApiPatientRecord): Patient {
  const derivedNames = (!record.name || !record.last_name)
    ? splitFullName(record.full_name)
    : null;

  return {
    id: record.id,
    name: record.name ?? derivedNames?.name ?? '',
    last_name: record.last_name ?? derivedNames?.lastName ?? '',
    phone: record.phone ?? record.full_phone ?? '',
    birth_date: record.birth?.formats?.iso ?? record.birth?.raw ?? '',
    gender: record.gender ?? '',
    created_at: '',
    updated_at: '',
    full_name: record.full_name,
    age: record.age,
    allergy: record.allergy ?? undefined,
    datahc: record.datahc,
    effective_consultations_count: record.effective_consultations_count ?? 0,
    is_first_time: record.is_first_time ?? (record.effective_consultations_count ?? 0) === 0,
  };
}

function extractPatients(payload: ApiPatientsPayload): ApiPatientRecord[] {
  if (Array.isArray(payload)) {
    return payload;
  }
  return payload.data ?? [];
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

export const patientService = {
  async getPatients(): Promise<Patient[]> {
    const officeId = await resolveOfficeId();
    const response = await apiClient.get<ApiPatientsResponse>('/v2/patients', {
      params: {
        office_id: officeId,
        per_page: 10000,
        order_by: 'users.name',
        order_dir: 'asc',
      },
    });

    return extractPatients(response.data.data).map(normalizePatient);
  },

  async getPatient(id: number): Promise<Patient> {
    const patients = await this.getPatients();
    const patient = patients.find((item) => item.id === id);
    if (!patient) {
      throw new Error('Paciente no encontrado');
    }
    return patient;
  },

  async updatePatient(
    id: number,
    data: {
      name: string;
      last_name: string;
      phone?: string;
      birth?: string;
      gender?: string;
      allergy?: string;
      datahc?: Record<string, unknown>;
    }
  ): Promise<Patient> {
    const response = await apiClient.put<{ status: string; data: ApiPatientRecord }>(`/v2/patients/${id}`, data);
    return normalizePatient(response.data.data);
  },

  async getClinicalHistory(patientId: number): Promise<ClinicalHistory> {
    const patient = await this.getPatient(patientId);
    if (!patient.datahc && !patient.allergy) {
      return createEmptyClinicalHistory(patientId);
    }
    return decodeClinicalHistory(patient);
  },

  async updateClinicalHistory(
    patientId: number,
    data: Partial<ClinicalHistory>
  ): Promise<ClinicalHistory> {
    const patient = await this.getPatient(patientId);
    const currentHistory = decodeClinicalHistory(patient);
    const nextHistory: ClinicalHistory = {
      ...currentHistory,
      ...data,
      hereditary_background: {
        ...currentHistory.hereditary_background,
        ...data.hereditary_background,
      },
      personal_non_pathological: {
        ...currentHistory.personal_non_pathological,
        ...data.personal_non_pathological,
      },
      personal_pathological: {
        ...currentHistory.personal_pathological,
        ...data.personal_pathological,
      },
      gynecological: {
        ...currentHistory.gynecological,
        ...data.gynecological,
      },
    };

    const updatedPatient = await this.updatePatient(patientId, {
      name: patient.name,
      last_name: patient.last_name,
      phone: patient.phone,
      birth: patient.birth_date,
      gender: patient.gender,
      allergy: nextHistory.personal_pathological.allergies ?? '',
      datahc: encodeClinicalHistory(nextHistory),
    });

    return decodeClinicalHistory(updatedPatient);
  },

  async getSOAPNotes(patientId: number): Promise<SOAPNote[]> {
    const response = await apiClient.get<ApiPatientConsultationsHistoryResponse>(`/v2/patients/${patientId}/consultations-history`);
    return (response.data.data ?? []).map((item) => ({
      id: item.consultation_id,
      consultation_id: item.consultation_id,
      appointment_id: 0,
      patient_id: item.patient_id,
      office_id: item.office_id,
      subjective: item.currentcondition ?? '',
      objective: item.studies ?? '',
      assessment: item.diagnostic_text ?? item.examination ?? '',
      plan: [item.medicament_text, item.indicaciones].filter(Boolean).join(' | '),
      private_comments: item.notes ?? undefined,
      labels: [],
      created_at: item.created_at,
      updated_at: item.updated_at ?? item.created_at,
      ailingdate: item.ailingdate ?? '',
      height: item.height ?? '',
      weight: item.weight ?? '',
      ta: item.ta ?? '',
      temp: item.temp ?? '',
      fc: item.fc ?? '',
      os: item.os ?? '',
      studies: item.studies ?? '',
      examination: item.examination ?? '',
      diagnostics: item.diagnostics ?? [],
      medications: (item.medications ?? []).map((row) => ({
        medicament: row.medicament ?? '',
        prescription: row.prescription ?? '',
      })),
      indicaciones: item.indicaciones ?? '',
      office_label_ids: item.office_label_ids ?? [],
    }));
  },

  async getPatientSoapContext(patientId: number): Promise<PatientSoapContext> {
    const response = await apiClient.get<ApiPatientSoapContextResponse>(`/v2/patients/${patientId}/soap-context`);
    return response.data.data;
  },

  async getMedicamentHistory(): Promise<MedicamentHistoryItem[]> {
    const response = await apiClient.get<ApiMedicamentHistoryResponse>('/v2/consultations/medicament-history');
    return response.data.data;
  },

  async getOfficeLabels(): Promise<OfficeLabelItem[]> {
    const officeId = await resolveOfficeId();
    const response = await apiClient.get<ApiOfficeLabelsResponse>('/v2/datahelp/office-labels', {
      params: { office_id: officeId },
    });
    return response.data.data;
  },

  async getFiles(patientId: number): Promise<PatientFile[]> {
    const response = await apiClient.get<ApiPatientFilesResponse>(`/v2/patients/${patientId}/files`);
    return response.data.data ?? [];
  },

  async downloadFile(fileId: number, fallbackName: string): Promise<void> {
    const response = await apiClient.get<Blob>(`/v2/files/${fileId}/download`, {
      responseType: 'blob',
    });

    const disposition = response.headers['content-disposition'] as string | undefined;
    const match = disposition?.match(/filename\*?=(?:UTF-8''|")?([^\";]+)/i);
    const filename = match ? decodeURIComponent(match[1].replace(/"/g, '').trim()) : fallbackName;

    const blobUrl = window.URL.createObjectURL(response.data);
    const anchor = document.createElement('a');
    anchor.href = blobUrl;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(blobUrl);
  },

  async getFileBlob(fileId: number): Promise<Blob> {
    const response = await apiClient.get<Blob>(`/v2/files/${fileId}/download`, {
      responseType: 'blob',
    });
    return response.data;
  },

  async searchPatients(query: string): Promise<Patient[]> {
    const officeId = await resolveOfficeId();
    const response = await apiClient.get<ApiPatientsResponse>('/v2/patients', {
      params: {
        office_id: officeId,
        search: query,
        per_page: 1000,
        order_by: 'users.name',
        order_dir: 'asc',
      },
    });

    return extractPatients(response.data.data).map(normalizePatient);
  },
};
