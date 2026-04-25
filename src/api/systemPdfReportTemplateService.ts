import apiClient from './client';

export type SystemPdfReportTemplateStatus =
  | 'draft'
  | 'pending_review'
  | 'published'
  | 'archived';

export interface SystemPdfReportTemplateUserSummary {
  id: number;
  name: string;
}

export interface SystemPdfReportTemplateFileSummary {
  id: number;
  office_id: number | null;
  title: string;
  file: string;
}

export interface SystemPdfReportTemplateDetectedPdfField {
  name: string;
  pdf_type: string;
}

export interface SystemPdfReportTemplateOption {
  id: number;
  option_key: string;
  label: string;
  value: string;
  pdf_field_name: string;
  sort_order: number;
  is_default: boolean;
  status: string;
  meta_json: unknown;
}

export interface SystemPdfReportTemplateField {
  id: number;
  section_label: string;
  field_key: string;
  label: string;
  field_type: string;
  source_mode: string;
  source_path: string;
  pdf_field_name: string;
  is_required: boolean;
  max_length: number | null;
  date_format: string;
  placeholder: string;
  help_text: string;
  selection_mode: string;
  sort_order: number;
  status: string;
  meta_json: unknown;
  options: SystemPdfReportTemplateOption[];
}

export interface SystemPdfReportTemplateSummary {
  id: number;
  office_id: number;
  office: {
    id: number;
    title: string;
  } | null;
  laboratory: {
    id: number;
    name: string;
  } | null;
  study_type: {
    id: number;
    name: string;
  } | null;
  name: string;
  description: string;
  output_file_name: string;
  template_category: string;
  status: SystemPdfReportTemplateStatus;
  detected_pdf_fields: SystemPdfReportTemplateDetectedPdfField[];
  original_pdf_file: SystemPdfReportTemplateFileSummary | null;
  base_pdf_file: SystemPdfReportTemplateFileSummary | null;
  fields_count: number;
  published_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  created_by: SystemPdfReportTemplateUserSummary | null;
}

export interface SystemPdfReportTemplateDetail extends SystemPdfReportTemplateSummary {
  fields: SystemPdfReportTemplateField[];
  updated_by: SystemPdfReportTemplateUserSummary | null;
  reviewed_by: SystemPdfReportTemplateUserSummary | null;
}

export interface SystemPdfReportTemplateCatalogData {
  office_id: number;
  template_categories: string[];
  template_statuses: string[];
  field_types: string[];
  field_source_modes: string[];
  source_path_options: Array<{
    key: string;
    label: string;
  }>;
  field_statuses: string[];
  selection_modes: string[];
  date_formats: string[];
  laboratories: Array<{
    id: number;
    name: string;
  }>;
  study_types: Array<{
    id: number;
    name: string;
  }>;
}

export interface SystemPdfReportTemplateUpdatePayload {
  name: string;
  description?: string;
  output_file_name: string;
  template_category: string;
  laboratory_id: number | null;
  study_type_id: number | null;
  base_pdf_file_id: number;
  status: SystemPdfReportTemplateStatus;
  fields: Array<{
    section_label?: string;
    field_key: string;
    label: string;
    field_type: string;
    source_mode: string;
    source_path?: string;
    pdf_field_name?: string;
    is_required?: boolean;
    max_length?: number | null;
    date_format?: string;
    placeholder?: string;
    help_text?: string;
    selection_mode?: string;
    sort_order?: number;
    status?: string;
    meta_json?: unknown;
    options?: Array<{
      option_key: string;
      label: string;
      value: string;
      pdf_field_name?: string;
      sort_order?: number;
      is_default?: boolean;
      status?: string;
      meta_json?: unknown;
    }>;
  }>;
}

const systemPdfReportTemplateService = {
  async list(filters?: {
    status?: SystemPdfReportTemplateStatus | 'all';
    office_id?: number | null;
  }): Promise<SystemPdfReportTemplateSummary[]> {
    const response = await apiClient.get<{ status: string; data: SystemPdfReportTemplateSummary[] }>(
      '/v2/system/pdf-report-templates',
      {
        params: {
          status: filters?.status && filters.status !== 'all' ? filters.status : undefined,
          office_id: filters?.office_id ?? undefined,
        },
      }
    );

    return response.data.data ?? [];
  },

  async show(id: number): Promise<SystemPdfReportTemplateDetail> {
    const response = await apiClient.get<{ status: string; data: SystemPdfReportTemplateDetail }>(
      `/v2/system/pdf-report-templates/${id}`
    );

    return response.data.data;
  },

  async getCatalog(officeId: number): Promise<SystemPdfReportTemplateCatalogData> {
    const response = await apiClient.get<{ status: string; data: SystemPdfReportTemplateCatalogData }>(
      '/v2/system/pdf-report-templates/catalog',
      {
        params: {
          office_id: officeId,
        },
      }
    );

    return response.data.data;
  },

  async update(id: number, payload: SystemPdfReportTemplateUpdatePayload): Promise<SystemPdfReportTemplateDetail> {
    const response = await apiClient.put<{ status: string; data: SystemPdfReportTemplateDetail }>(
      `/v2/system/pdf-report-templates/${id}`,
      payload
    );

    return response.data.data;
  },

  async uploadProcessedPdf(id: number, file: File): Promise<SystemPdfReportTemplateDetail> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post<{ status: string; data: SystemPdfReportTemplateDetail }>(
      `/v2/system/pdf-report-templates/${id}/upload-processed-pdf`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    return response.data.data;
  },

  async downloadPreviewPdf(id: number, fallbackName: string): Promise<void> {
    const response = await apiClient.get<Blob>(`/v2/system/pdf-report-templates/${id}/download-preview-pdf`, {
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

  async downloadBasePdf(fileId: number, fallbackName: string): Promise<void> {
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
};

export default systemPdfReportTemplateService;
