import type {
  Patient,
  ClinicalHistory,
  SOAPNote,
  PatientFile,
  PatientSoapContext,
  MedicamentHistoryItem,
  OfficeLabelItem,
  PatientTagSummary,
  PatientTagControlData,
  PatientResultTemplate,
  ActivityLogItem,
  PatientTagStatusOption,
} from '../types';
import apiClient from './client';
import { appointmentService } from './appointmentService';
import { createEmptyClinicalHistory, decodeClinicalHistory, encodeClinicalHistory } from '../utils/clinicalHistory';

type ApiPatientRecord = {
  id: number;
  office_id?: number | null;
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
  detail_menu?: {
    camera_menu_enabled?: boolean;
    camera_menu_title?: string;
    daily_note_title_enabled?: boolean;
    daily_note_title?: string;
  };
  effective_consultations_count?: number;
  is_first_time?: boolean;
  patient_tags?: PatientTagSummary[];
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

interface ApiPatientsPaginatedPayload {
  data?: ApiPatientRecord[];
  current_page?: number;
  per_page?: number;
  total?: number;
  last_page?: number;
}

interface ApiPaginatedPatientsResponse {
  status: string;
  data: ApiPatientsPaginatedPayload;
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

interface ApiOfficeLabelStatusesResponse {
  status: string;
  data: Array<{
    id: number;
    code: string;
    identify: number | string;
  }>;
}

interface ApiPatientFilesResponse {
  status: string;
  data: PatientFile[];
  meta?: {
    limit?: number;
    offset?: number;
    has_more?: boolean;
    next_offset?: number | null;
  };
}

interface ApiPatientTagControlResponse {
  status: string;
  data: PatientTagControlData;
}

interface ApiActivityLogListResponse {
  status: string;
  data: ActivityLogItem[];
  meta?: {
    selected_date?: string;
    window_start?: string;
    window_end?: string;
    next_before?: string | null;
    has_more?: boolean;
  };
}

export interface ActivityLogWindow {
  logs: ActivityLogItem[];
  hasMore: boolean;
  nextBefore: string | null;
}

export interface PaginatedPatientsResult {
  data: Patient[];
  total: number;
  page: number;
  perPage: number;
  lastPage: number;
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
    office_id: record.office_id ?? null,
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
    detail_menu: {
      camera_menu_enabled: Boolean(record.detail_menu?.camera_menu_enabled),
      camera_menu_title: record.detail_menu?.camera_menu_title?.trim() || 'Camara',
      daily_note_title_enabled: Boolean(record.detail_menu?.daily_note_title_enabled),
      daily_note_title: record.detail_menu?.daily_note_title?.trim() || 'Nota diaria',
    },
    effective_consultations_count: record.effective_consultations_count ?? 0,
    is_first_time: record.is_first_time ?? (record.effective_consultations_count ?? 0) === 0,
    patient_tags: Array.isArray(record.patient_tags) ? record.patient_tags : [],
  };
}

function getStatusColorClass(identify: number): string {
  const colors: Record<number, string> = {
    0: 'btn-primary',
    1: 'btn-success',
    2: 'btn-danger',
    3: 'btn-warning',
    4: 'btn-info',
    5: 'btn-rose',
  };

  return colors[identify] ?? 'btn-default';
}

function extractPatients(payload: ApiPatientsPayload): ApiPatientRecord[] {
  if (Array.isArray(payload)) {
    return payload;
  }
  return payload.data ?? [];
}

let cachedOfficeId: number | null = null;
let officeIdPromise: Promise<number> | null = null;

async function resolveOfficeId(): Promise<number> {
  if (cachedOfficeId) {
    return cachedOfficeId;
  }

  const persistedOfficeId = sessionStorage.getItem('cached_office_id');
  if (persistedOfficeId) {
    const parsedOfficeId = Number(persistedOfficeId);
    if (Number.isFinite(parsedOfficeId) && parsedOfficeId > 0) {
      cachedOfficeId = parsedOfficeId;
      return parsedOfficeId;
    }
  }

  localStorage.removeItem('cached_office_id');

  const userRaw = localStorage.getItem('user');
  if (userRaw) {
    try {
      const user = JSON.parse(userRaw) as { consultorio_id?: number };
      if (user.consultorio_id) {
        cachedOfficeId = user.consultorio_id;
        sessionStorage.setItem('cached_office_id', String(user.consultorio_id));
        return user.consultorio_id;
      }
    } catch {
      // Ignore malformed local storage and continue with API lookup.
    }
  }

  if (!officeIdPromise) {
    officeIdPromise = appointmentService.getOffices().then((offices) => {
      if (offices.length === 0) {
        throw new Error('No se encontraron consultorios disponibles');
      }

      const officeId = offices[0].id;
      cachedOfficeId = officeId;
      sessionStorage.setItem('cached_office_id', String(officeId));
      return officeId;
    }).finally(() => {
      officeIdPromise = null;
    });
  }

  return officeIdPromise;
}

async function resolveOfficeIdWithOverride(officeIdOverride?: number | null): Promise<number> {
  if (officeIdOverride && Number.isFinite(officeIdOverride) && officeIdOverride > 0) {
    return officeIdOverride;
  }

  return resolveOfficeId();
}

export const patientService = {
  async getPatients(options?: {
    labelIds?: number[];
    labelStatusIds?: number[];
    search?: string;
    page?: number;
    perPage?: number;
    view?: 'list' | 'tagged';
  }): Promise<PaginatedPatientsResult> {
    const officeId = await resolveOfficeId();
    const response = await apiClient.get<ApiPaginatedPatientsResponse>('/v2/patients', {
      params: {
        office_id: officeId,
        search: options?.search?.trim() ? options.search.trim() : undefined,
        page: options?.page ?? 1,
        per_page: options?.perPage ?? 10,
        order_by: 'users.name',
        order_dir: 'asc',
        view: options?.view ?? 'list',
        label_ids: options?.labelIds && options.labelIds.length > 0 ? options.labelIds : undefined,
        label_status_ids: options?.labelStatusIds && options.labelStatusIds.length > 0 ? options.labelStatusIds : undefined,
      },
    });

    const payload = response.data.data ?? {};

    return {
      data: extractPatients(payload).map(normalizePatient),
      total: payload.total ?? 0,
      page: payload.current_page ?? 1,
      perPage: payload.per_page ?? (options?.perPage ?? 10),
      lastPage: payload.last_page ?? 1,
    };
  },

  async getPatient(id: number): Promise<Patient> {
    const officeId = await resolveOfficeId();
    const response = await apiClient.get<{ status: string; data: ApiPatientRecord }>(`/v2/patients/${id}`, {
      params: { office_id: officeId },
    });
    return normalizePatient(response.data.data);
  },

  async createPatient(data: {
    name: string;
    last_name: string;
    phone?: string;
    birth?: string;
  }): Promise<Patient> {
    const officeId = await resolveOfficeId();
    const response = await apiClient.post<{ status: string; data: ApiPatientRecord }>('/v2/patients', {
      ...data,
      office_id: officeId,
    });
    return normalizePatient(response.data.data);
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
    const officeId = await resolveOfficeId();
    const response = await apiClient.put<{ status: string; data: ApiPatientRecord }>(`/v2/patients/${id}`, {
      ...data,
      office_id: officeId,
    });
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

  async getMedicamentHistory(query?: string): Promise<MedicamentHistoryItem[]> {
    const response = await apiClient.get<ApiMedicamentHistoryResponse>('/v2/consultations/medicament-history', {
      params: query ? { q: query } : undefined,
    });
    return response.data.data;
  },

  async searchMedicamentHistory(query: string): Promise<MedicamentHistoryItem[]> {
    const response = await apiClient.get<ApiMedicamentHistoryResponse>('/v2/consultations/medicament-history', {
      params: { q: query },
    });
    return response.data.data;
  },

  async getOfficeLabels(officeIdOverride?: number | null): Promise<OfficeLabelItem[]> {
    const officeId = await resolveOfficeIdWithOverride(officeIdOverride);
    const response = await apiClient.get<ApiOfficeLabelsResponse>('/v2/datahelp/office-labels', {
      params: { office_id: officeId },
    });
    return response.data.data;
  },

  async getOfficeLabelStatuses(officeIdOverride?: number | null): Promise<PatientTagStatusOption[]> {
    const officeId = await resolveOfficeIdWithOverride(officeIdOverride);
    const response = await apiClient.get<ApiOfficeLabelStatusesResponse>('/v2/datahelp/office-label-statuses', {
      params: { office_id: officeId },
    });

    return (response.data.data ?? []).map((item) => {
      const identify = Number(item.identify) || 0;

      return {
        id: item.id,
        code: item.code,
        identify,
        color_class: getStatusColorClass(identify),
      };
    });
  },

  async createOfficeLabel(code: string, identify?: string, officeIdOverride?: number | null): Promise<OfficeLabelItem> {
    const officeId = await resolveOfficeIdWithOverride(officeIdOverride);
    const response = await apiClient.post<{ status: string; data: OfficeLabelItem }>('/v2/datahelp/office-labels', {
      office_id: officeId,
      code,
      identify,
      status: 1,
    });

    return response.data.data;
  },

  async updateOfficeLabel(id: number, payload: { code?: string; identify?: string; status?: number }): Promise<OfficeLabelItem> {
    const officeId = await resolveOfficeId();
    const response = await apiClient.put<{ status: string; data: OfficeLabelItem }>(`/v2/datahelp/office-labels/${id}`, {
      office_id: officeId,
      ...payload,
    });

    return response.data.data;
  },

  async createOfficeResultTemplate(
    code: string,
    data: string,
    officeIdOverride?: number | null
  ): Promise<PatientResultTemplate> {
    const officeId = await resolveOfficeIdWithOverride(officeIdOverride);
    const response = await apiClient.post<{ status: string; data: PatientResultTemplate }>(
      '/v2/datahelp/office-result-templates',
      {
        office_id: officeId,
        code,
        data,
        status: 1,
      }
    );

    return response.data.data;
  },

  async getFiles(patientId: number): Promise<PatientFile[]> {
    const response = await apiClient.get<ApiPatientFilesResponse>(`/v2/patients/${patientId}/files`);
    return response.data.data ?? [];
  },

  async getFilesWindow(
    patientId: number,
    options: { limit: number; offset: number }
  ): Promise<{ files: PatientFile[]; hasMore: boolean; nextOffset: number | null }> {
    const response = await apiClient.get<ApiPatientFilesResponse>(`/v2/patients/${patientId}/files`, {
      params: {
        limit: options.limit,
        offset: options.offset,
      },
    });

    return {
      files: response.data.data ?? [],
      hasMore: Boolean(response.data.meta?.has_more),
      nextOffset: response.data.meta?.next_offset ?? null,
    };
  },

  async uploadPatientFile(patientId: number, file: File): Promise<PatientFile> {
    const officeId = await resolveOfficeId();
    const payload = new FormData();
    payload.append('office_id', String(officeId));
    payload.append('file', file);

    const response = await apiClient.post<{ status: string; data: PatientFile }>(
      `/v2/patients/${patientId}/files`,
      payload,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    return response.data.data;
  },

  async deleteFile(fileId: number): Promise<void> {
    await apiClient.delete(`/v2/files/${fileId}`);
  },

  async getPatientTagControl(patientId: number, officeIdOverride?: number | null): Promise<PatientTagControlData> {
    const officeId = await resolveOfficeIdWithOverride(officeIdOverride);
    const response = await apiClient.get<ApiPatientTagControlResponse>(`/v2/patients/${patientId}/tag-control`, {
      params: { office_id: officeId },
    });
    return response.data.data;
  },

  async getPatientActivityLogs(
    patientId: number,
    options?: { days?: number; before?: string | null; date?: string; limit?: number }
  ): Promise<ActivityLogWindow> {
    const response = await apiClient.get<ApiActivityLogListResponse>(`/v2/patients/${patientId}/activity-logs`, {
      params: {
        days: options?.days ?? 7,
        before: options?.before ?? undefined,
        date: options?.date ?? undefined,
        limit: options?.limit ?? undefined,
      },
    });
    return {
      logs: response.data.data ?? [],
      hasMore: Boolean(response.data.meta?.has_more),
      nextBefore: response.data.meta?.next_before ?? response.data.meta?.window_start ?? null,
    };
  },

  async updatePatientTagStatuses(
    patientId: number,
    updates: Array<{ tag_id: number; status_id: number }>,
    options?: {
      files?: File[];
      existingFileIds?: number[];
      notifyPatient?: boolean;
      studyDeliveryId?: number | null;
      templateId?: number | null;
      officeLabelIds?: number[];
      officeId?: number | null;
    }
  ): Promise<PatientTagControlData> {
    const officeId = await resolveOfficeIdWithOverride(options?.officeId);
    const payload = new FormData();
    payload.append('office_id', String(officeId));
    payload.append('updates', JSON.stringify(updates));

    if (options?.officeLabelIds && options.officeLabelIds.length > 0) {
      payload.append('office_label_ids', JSON.stringify(options.officeLabelIds));
    }

    if (options?.existingFileIds && options.existingFileIds.length > 0) {
      payload.append('existing_file_ids', JSON.stringify(options.existingFileIds));
    }

    if (options?.files && options.files.length > 0) {
      options.files.forEach((file) => payload.append('files[]', file));
    }

    if (options?.notifyPatient) {
      payload.append('notify_patient', '1');
      if (options?.studyDeliveryId) {
        payload.append('study_delivery_id', String(options.studyDeliveryId));
      }
      if (options?.templateId) {
        payload.append('template_id', String(options.templateId));
      }
    } else {
      payload.append('notify_patient', '0');
    }

    const response = await apiClient.post<ApiPatientTagControlResponse>(
      `/v2/patients/${patientId}/tag-control/statuses`,
      payload,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    return response.data.data;
  },

  async finalizePatientTag(patientId: number, tagId: number, officeIdOverride?: number | null): Promise<PatientTagControlData> {
    const officeId = await resolveOfficeIdWithOverride(officeIdOverride);
    const response = await apiClient.post<ApiPatientTagControlResponse>(
      `/v2/patients/${patientId}/tag-control/tags/${tagId}/finalize`,
      {
        office_id: officeId,
      }
    );

    return response.data.data;
  },

  async getColposcopyFiles(patientId: number): Promise<PatientFile[]> {
    const officeId = await resolveOfficeId();
    const response = await apiClient.get<ApiPatientFilesResponse>(`/v2/patients/${patientId}/colposcopy-files`, {
      params: { office_id: officeId },
    });
    return response.data.data ?? [];
  },

  async captureColposcopy(patientId: number, image: string): Promise<PatientFile> {
    const officeId = await resolveOfficeId();
    const response = await apiClient.post<{ status: string; data: PatientFile }>(
      `/v2/patients/${patientId}/colposcopy-captures`,
      {
        office_id: officeId,
        image,
      }
    );

    return response.data.data;
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

  async getFileThumbnailBlob(fileId: number): Promise<Blob> {
    const response = await apiClient.get<Blob>(`/v2/files/${fileId}/thumbnail`, {
      responseType: 'blob',
    });
    return response.data;
  },

  async searchPatients(query: string): Promise<Patient[]> {
    const response = await this.getPatients({
      search: query,
      page: 1,
      perPage: 10,
    });

    return response.data;
  },
};
