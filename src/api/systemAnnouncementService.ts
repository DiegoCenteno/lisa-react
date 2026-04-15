import apiClient from './client';

export type SystemAnnouncementStatus = 'draft' | 'published' | 'archived';

export interface SystemAnnouncementFileItem {
  file_id: number;
  id: number;
  name: string;
  description?: string | null;
  kind: 'image' | 'file';
  sort_order: number;
  mime_type: string;
  type: 'image' | 'file';
  preview_url?: string | null;
  download_url: string;
  uploaded_at?: string | null;
}

export interface SystemAnnouncementItem {
  id: number;
  title: string;
  summary: string;
  body: string;
  status: SystemAnnouncementStatus;
  starts_at?: string | null;
  ends_at?: string | null;
  created_by?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
  read_at?: string | null;
  read_count: number;
  files: SystemAnnouncementFileItem[];
}

export interface SystemAnnouncementPayload {
  title: string;
  summary?: string;
  body: string;
  status: SystemAnnouncementStatus;
  starts_at?: string | null;
  ends_at?: string | null;
  files?: Array<{
    file_id: number;
    kind?: 'image' | 'file';
    sort_order?: number;
  }>;
}

const systemAnnouncementService = {
  async list(): Promise<SystemAnnouncementItem[]> {
    const response = await apiClient.get<{ status: string; data: SystemAnnouncementItem[] }>('/v2/system/announcements');
    return response.data.data ?? [];
  },

  async listSidebar(): Promise<SystemAnnouncementItem[]> {
    const response = await apiClient.get<{ status: string; data: SystemAnnouncementItem[] }>('/v2/system/announcements/sidebar');
    return response.data.data ?? [];
  },

  async create(payload: SystemAnnouncementPayload): Promise<SystemAnnouncementItem> {
    const response = await apiClient.post<{ status: string; data: SystemAnnouncementItem }>('/v2/system/announcements', payload);
    return response.data.data;
  },

  async update(id: number, payload: SystemAnnouncementPayload): Promise<SystemAnnouncementItem> {
    const response = await apiClient.put<{ status: string; data: SystemAnnouncementItem }>(`/v2/system/announcements/${id}`, payload);
    return response.data.data;
  },

  async markRead(id: number): Promise<void> {
    await apiClient.post(`/v2/system/announcements/${id}/read`);
  },

  async uploadFile(file: File): Promise<SystemAnnouncementFileItem> {
    const payload = new FormData();
    payload.append('file', file);

    const response = await apiClient.post<{ status: string; data: SystemAnnouncementFileItem }>(
      '/v2/system/announcement-files',
      payload,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
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
};

export default systemAnnouncementService;
