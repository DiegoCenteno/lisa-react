import type { LaboratoryItem, PaginatedStudyDeliveries, PendingStudyDeliveryLink, StudyDeliveryItem, StudyTypeItem } from '../types';
import apiClient from './client';

interface ApiStudyDeliveryListResponse {
  status: string;
  data: PaginatedStudyDeliveries;
}

interface ApiStudyDeliveryResponse {
  status: string;
  data: StudyDeliveryItem;
}

interface ApiStudyDeliveryBatchResponse {
  status: string;
  data: StudyDeliveryItem[];
}

interface ApiLaboratoryListResponse {
  status: string;
  data: LaboratoryItem[];
}

interface ApiLaboratoryResponse {
  status: string;
  data: LaboratoryItem;
}

interface ApiStudyTypeListResponse {
  status: string;
  data: StudyTypeItem[];
}

interface ApiStudyTypeResponse {
  status: string;
  data: StudyTypeItem;
}

interface ApiPendingStudyDeliveryListResponse {
  status: string;
  data: PendingStudyDeliveryLink[];
}

export const studyDeliveryService = {
  async getStudyDeliveries(options?: {
    officeId?: number;
    page?: number;
    perPage?: number;
    deliveryStatus?: string;
    processingStatus?: string;
    channel?: string;
    seenStatus?: string;
    laboratoryId?: number;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<PaginatedStudyDeliveries> {
    const response = await apiClient.get<ApiStudyDeliveryListResponse>('/v2/study-deliveries', {
      params: {
        office_id: options?.officeId,
        page: options?.page ?? 1,
        per_page: options?.perPage ?? 20,
        delivery_status: options?.deliveryStatus || undefined,
        processing_status: options?.processingStatus || undefined,
        channel: options?.channel || undefined,
        seen_status: options?.seenStatus || undefined,
        laboratory_id: options?.laboratoryId,
        search: options?.search?.trim() ? options.search.trim() : undefined,
        date_from: options?.dateFrom || undefined,
        date_to: options?.dateTo || undefined,
      },
    });

    return response.data.data;
  },

  async getLaboratories(officeId?: number): Promise<LaboratoryItem[]> {
    const response = await apiClient.get<ApiLaboratoryListResponse>('/v2/laboratories', {
      params: {
        office_id: officeId,
      },
    });

    return response.data.data ?? [];
  },

  async createLaboratory(data: { office_id: number; name: string }): Promise<LaboratoryItem> {
    const response = await apiClient.post<ApiLaboratoryResponse>('/v2/laboratories', data);
    return response.data.data;
  },

  async deactivateLaboratory(id: number): Promise<LaboratoryItem> {
    const response = await apiClient.delete<ApiLaboratoryResponse>(`/v2/laboratories/${id}`);
    return response.data.data;
  },

  async getStudyTypes(officeId?: number, includeInactive?: boolean): Promise<StudyTypeItem[]> {
    const response = await apiClient.get<ApiStudyTypeListResponse>('/v2/study-types', {
      params: {
        office_id: officeId,
        include_inactive: includeInactive ? 1 : undefined,
      },
    });

    return response.data.data ?? [];
  },

  async createStudyType(data: { office_id: number; name: string; description?: string | null }): Promise<StudyTypeItem> {
    const response = await apiClient.post<ApiStudyTypeResponse>('/v2/study-types', data);
    return response.data.data;
  },

  async deactivateStudyType(id: number): Promise<StudyTypeItem> {
    const response = await apiClient.delete<ApiStudyTypeResponse>(`/v2/study-types/${id}`);
    return response.data.data;
  },

  async reactivateStudyType(id: number): Promise<StudyTypeItem> {
    const response = await apiClient.put<ApiStudyTypeResponse>(`/v2/study-types/${id}/reactivate`);
    return response.data.data;
  },

  async getPendingStudyLinks(officeId: number, patientId: number): Promise<PendingStudyDeliveryLink[]> {
    const response = await apiClient.get<ApiPendingStudyDeliveryListResponse>('/v2/study-deliveries/pending-links', {
      params: {
        office_id: officeId,
        patient_id: patientId,
      },
    });

    return response.data.data ?? [];
  },

  async bulkUploadStudies(officeId: number, items: Array<{
    patient_id: number;
    study_delivery_id?: number | null;
    file: File;
  }>): Promise<Array<{
    file_id: number;
    file_name: string;
    patient_id: number;
    study_delivery_id: number;
  }>> {
    const formData = new FormData();
    formData.append('office_id', String(officeId));

    items.forEach((item) => {
      formData.append('patient_ids[]', String(item.patient_id));
      formData.append('study_delivery_ids[]', item.study_delivery_id ? String(item.study_delivery_id) : '');
      formData.append('files[]', item.file);
    });

    const response = await apiClient.post<{ status: string; data: Array<{
      file_id: number;
      file_name: string;
      patient_id: number;
      study_delivery_id: number;
    }> }>('/v2/study-deliveries/bulk-upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data.data ?? [];
  },

  async createSampleStudyDelivery(data: {
    office_id: number;
    patient_id: number;
    processing_status: 'sample_collected' | 'sent_to_lab' | 'result_received' | 'pending_review';
    laboratory_id?: number | null;
    study_type_ids?: number[];
  }): Promise<StudyDeliveryItem[]> {
    const response = await apiClient.post<ApiStudyDeliveryBatchResponse>('/v2/study-deliveries/sample', data);
    return response.data.data ?? [];
  },

  async createLabShipment(data: {
    office_id: number;
    laboratory_id?: number | null;
    sent_at: string;
    notes?: string;
    evidence_file?: File | null;
    items: Array<{
      patient_id: number;
      mode: 'existing_sample' | 'new_study';
      study_delivery_id?: number | null;
      study_type_id?: number | null;
    }>;
  }): Promise<StudyDeliveryItem[]> {
    const formData = new FormData();
    formData.append('office_id', String(data.office_id));
    formData.append('sent_at', data.sent_at);

    if (data.laboratory_id) {
      formData.append('laboratory_id', String(data.laboratory_id));
    }

    if (data.notes?.trim()) {
      formData.append('notes', data.notes.trim());
    }

    if (data.evidence_file) {
      formData.append('evidence_file', data.evidence_file);
    }

    data.items.forEach((item, index) => {
      formData.append(`items[${index}][patient_id]`, String(item.patient_id));
      formData.append(`items[${index}][mode]`, item.mode);
      if (item.study_delivery_id) {
        formData.append(`items[${index}][study_delivery_id]`, String(item.study_delivery_id));
      }
      if (item.study_type_id) {
        formData.append(`items[${index}][study_type_id]`, String(item.study_type_id));
      }
    });

    const response = await apiClient.post<ApiStudyDeliveryBatchResponse>('/v2/study-deliveries/lab-shipment', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data.data ?? [];
  },

  async updateStudyDelivery(id: number, data: {
    processing_status?: string;
    laboratory_id?: number | null;
    template_id?: number | null;
  }): Promise<StudyDeliveryItem> {
    const response = await apiClient.put<ApiStudyDeliveryResponse>(`/v2/study-deliveries/${id}`, data);
    return response.data.data;
  },

  async sendStudyDeliveries(items: Array<{ study_delivery_id: number; template_id: number }>): Promise<StudyDeliveryItem[]> {
    const response = await apiClient.post<ApiStudyDeliveryBatchResponse>('/v2/study-deliveries/send', { items });
    return response.data.data ?? [];
  },
};

export default studyDeliveryService;
