import axios from 'axios';
import type { PublicAppLinkResponse } from '../types';

const publicApiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

const publicStudyService = {
  async resolvePublicCode(code: string): Promise<PublicAppLinkResponse> {
    const response = await publicApiClient.get<{ status: string; data: PublicAppLinkResponse }>(
      `/v2/public/app-links/${code}`
    );

    return response.data.data;
  },

  async getStudyFileBlob(code: string): Promise<Blob> {
    const response = await publicApiClient.get<Blob>(`/v2/public/app-links/${code}/file`, {
      responseType: 'blob',
    });

    return response.data;
  },
};

export default publicStudyService;
