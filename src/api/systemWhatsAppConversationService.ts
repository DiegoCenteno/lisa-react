import apiClient from './client';

export interface SystemWhatsAppOfficeOption {
  office_id?: number | null;
  title: string;
  doctor_name: string;
}

export interface SystemWhatsAppDoctorOption {
  user_id: number;
  name: string;
  office_titles: string;
}

export interface SystemWhatsAppConversationMessage {
  id: number;
  direction: 'inbound' | 'outbound';
  message_type: string;
  template_name: string;
  body_text: string;
  provider_message_id: string;
  provider_status: string;
  provider_error_code: string;
  provider_error_message: string;
  message_at?: string | null;
  sent_at?: string | null;
  received_at?: string | null;
}

export interface SystemWhatsAppConversationThread {
  thread_id: number;
  office_id?: number | null;
  patient_id?: number | null;
  doctor_user_id?: number | null;
  assignment_rule?: string | null;
  patient_name: string;
  doctor_name: string;
  office_title: string;
  phone: string;
  last_message_at?: string | null;
  message_count: number;
  last_direction?: 'inbound' | 'outbound' | null;
  conversation_status: 'pending_system' | 'pending_patient' | 'needs_review' | 'delivery_error';
  conversation_status_label: string;
  messages: SystemWhatsAppConversationMessage[];
}

export interface SystemWhatsAppConversationFilters {
  date_from: string;
  date_to: string;
  office_id?: number | 'undefined' | null;
  doctor_user_id?: number | null;
  conversation_status?: 'pending_system' | 'pending_patient' | 'needs_review' | 'delivery_error' | '';
  search: string;
}

export interface SystemWhatsAppConversationResponse {
  filters: SystemWhatsAppConversationFilters;
  offices: SystemWhatsAppOfficeOption[];
  doctors: SystemWhatsAppDoctorOption[];
  threads: SystemWhatsAppConversationThread[];
}

export interface SystemWhatsAppConversationQuery {
  date_from?: string;
  date_to?: string;
  office_id?: number | 'undefined' | null;
  doctor_user_id?: number | null;
  conversation_status?: 'pending_system' | 'pending_patient' | 'needs_review' | 'delivery_error' | '';
  search?: string;
}

const systemWhatsAppConversationService = {
  async list(params: SystemWhatsAppConversationQuery): Promise<SystemWhatsAppConversationResponse> {
    const response = await apiClient.get<{ status: string; data: SystemWhatsAppConversationResponse }>(
      '/v2/system/whatsapp-conversations',
      { params }
    );

    return response.data.data;
  },
};

export default systemWhatsAppConversationService;
