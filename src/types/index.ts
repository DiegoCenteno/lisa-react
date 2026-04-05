export const UserRole = {
  MEDICO: 'medico',
  ASISTENTE: 'asistente',
  PACIENTE: 'paciente',
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  assistant_access_level?: 'full' | 'limited';
  permissions?: string[];
  avatar?: string;
  specialty?: string;
  phone?: string;
  nucleo_id?: number;
  consultorio_id?: number;
}

export interface AuthResponse {
  user: User;
  token: string;
  refresh_token?: string;
}

export interface Patient {
  id: number;
  name: string;
  last_name: string;
  full_name?: string;
  email?: string;
  phone?: string;
  birth_date?: string;
  gender?: string;
  blood_type?: string;
  age?: number | string;
  allergy?: string;
  datahc?: unknown;
  detail_menu?: {
    camera_menu_enabled: boolean;
    camera_menu_title: string;
  };
  effective_consultations_count?: number;
  is_first_time?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Appointment {
  id: number;
  patient_id: number;
  office_id?: number;
  datestart: string;
  dateend: string;
  status: number;
  reason?: string;
  smscode?: string | null;
  confirmed?: boolean;
  confirmation_whatsapp_status?: number | null;
  is_first_time?: boolean;
  history_form_required?: boolean;
  patient?: {
    id: number;
    name: string;
    last_name: string;
    phone?: string;
    email?: string;
  };
  office?: {
    id: number;
    title: string;
  };
}

export const AppointmentStatusMap: Record<number, string> = {
  0: 'Pendiente',
  1: 'Confirmada',
  2: 'No asistió',
  3: 'Cancelada',
  4: 'Reprogramada',
};

export interface Office {
  id: number;
  title: string;
  address?: string;
  suburb?: string;
  phone?: string;
  logo_url?: string | null;
  firsttime?: number | null;
  recurrent?: number | null;
  getlink?: string;
  opendays?: Array<{
    day: number;
    start: string;
    end: string;
    breakstart?: string;
    breakend?: string;
  }>;
  role: 'owner' | 'assistant';
  notification_preferences?: Record<string, boolean>;
  new_appointment_default_gender?: 'M' | 'F' | '';
  consultation_reasons?: Array<{
    key: string;
    label: string;
    minutes: number | null;
  }>;
}

export interface ClinicalHistory {
  id: number;
  patient_id: number;
  raw_datahc?: Record<string, unknown>;
  hereditary_background: HereditaryBackground;
  personal_non_pathological: PersonalNonPathological;
  personal_pathological: PersonalPathological;
  gynecological?: GynecologicalBackground;
}

export interface HereditaryBackground {
  blood_type_rh?: string;
  cgdm_checked?: boolean;
  cgdm?: string;
  consanguineous_checked?: boolean;
  consanguineous?: string;
  partner_history_checked?: boolean;
  partner_history_name?: string;
  partner_history_age?: string;
  partner_app_checked?: boolean;
  partner_genetic_defects_checked?: boolean;
  diabetes_checked?: boolean;
  genetic_defects?: string;
  genetic_defects_checked?: boolean;
  family_preeclampsia?: string;
  family_preeclampsia_checked?: boolean;
  diabetes?: string;
  cancer_checked?: boolean;
  cancer?: string;
  hypertension_checked?: boolean;
  hypertension?: string;
  rheumatic_disease_checked?: boolean;
  rheumatic_disease?: string;
  others_checked?: boolean;
  others?: string;
}

export interface PersonalNonPathological {
  origin?: string;
  residence?: string;
  civil_status?: string;
  religion?: string;
  education?: string;
  occupation?: string;
  substance_use_checked?: boolean;
  substance_use?: string;
  medications_checked?: boolean;
  medications?: string;
  exposures_checked?: boolean;
  exposures?: string;
  smoking_checked?: boolean;
  smoking?: string;
  alcohol_checked?: boolean;
  alcohol?: string;
  homosexual_relations_checked?: boolean;
  homosexual_relations?: string;
  exercise_checked?: boolean;
  exercise?: string;
  others_checked?: boolean;
  others?: string;
}

export interface PersonalPathological {
  allergies?: string;
  down_syndrome_child_checked?: boolean;
  down_syndrome_child?: string;
  chronic_diseases_checked?: boolean;
  chronic_diseases?: string;
  surgeries_checked?: boolean;
  surgeries?: string;
  transfusions_checked?: boolean;
  transfusions?: string;
  fractures_checked?: boolean;
  fractures?: string;
  others_checked?: boolean;
  others?: string;
}

export interface GynecologicalBackground {
  menarche?: string;
  menstrual_cycles?: string;
  pregnant?: boolean;
  pregnancy_achieved?: string;
  pregnancy_type?: string;
  obstetric_pathology?: string;
  pregnancy_bp?: string;
  pregnancy_weight?: string;
  pregnancy_height?: string;
  ovum_donation_checked?: boolean;
  ovum_donor_birth_date?: string;
  ovum_donor_age?: string;
  pregnancy_notes?: string;
  last_menstruation_date?: string;
  ultrasound1_checked?: boolean;
  ultrasound1_date?: string;
  ultrasound1_weeks?: string;
  ultrasound1_days?: string;
  ultrasound1_notes?: string;
  ultrasound2_checked?: boolean;
  ultrasound2_date?: string;
  ultrasound2_weeks?: string;
  ultrasound2_days?: string;
  ultrasound2_notes?: string;
  ultrasound3_checked?: boolean;
  ultrasound3_date?: string;
  ultrasound3_weeks?: string;
  ultrasound3_days?: string;
  ultrasound3_notes?: string;
  ultrasound4_checked?: boolean;
  ultrasound4_date?: string;
  ultrasound4_weeks?: string;
  ultrasound4_days?: string;
  ultrasound4_notes?: string;
  ultrasound5_checked?: boolean;
  ultrasound5_date?: string;
  ultrasound5_weeks?: string;
  ultrasound5_days?: string;
  ultrasound5_notes?: string;
  ivsa?: string;
  std_checked?: boolean;
  sexual_partners?: string;
  std?: string;
  cytology?: string;
  family_planning?: string;
  gestations_checked?: boolean;
  gestations?: string;
  last_gestation_date?: string;
  deliveries?: string;
  cesareans?: string;
  abortions?: string;
  ectopic?: string;
  molar?: string;
  menopause_age?: string;
  climacteric_symptoms_checked?: boolean;
  climacteric_symptoms?: string;
  prenatal_care_checked?: boolean;
  prenatal_care?: string;
}

export interface SOAPNote {
  id: number;
  appointment_id: number;
  patient_id: number;
  office_id?: number;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  private_comments?: string;
  labels: NoteLabel[];
  created_at: string;
  updated_at: string;
  consultation_id?: number;
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
  medications?: Array<{
    medicament: string;
    prescription: string;
  }>;
  indicaciones?: string;
  office_label_ids?: number[];
}

export interface NoteLabel {
  id: number;
  name: string;
  status: string;
  color?: string;
}

export interface LabelConfig {
  id: number;
  medico_id: number;
  name: string;
  statuses: string[];
}

export interface Prescription {
  id: number;
  patient_id: number;
  medico_id: number;
  appointment_id?: number;
  date: string;
  medications: PrescriptionMedication[];
  diagnosis?: string;
  notes?: string;
  patient?: Patient;
}

export interface PrescriptionMedication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

export interface PatientFile {
  id: number;
  patient_id: number;
  name: string;
  type: string;
  url: string;
  thumbnail_url?: string | null;
  size: number;
  uploaded_at: string;
  description?: string;
  capture_source?: string;
  capture_session_id?: number | null;
  capture_session_key?: string | null;
  capture_session_title?: string | null;
}

export interface DashboardStats {
  today_appointments: number;
  week_appointments: number;
  total_patients: number;
  confirmed_appointments: number;
  pending_appointments: number;
  cancelled_appointments: number;
}

export interface AvailableDatesResponse {
  txt: string;
  dates: string[];
}

export interface AvailableSlot {
  datestart: string;
  dateend: string;
  timeshow: string;
  estatus: number; // 0=occupied, 1=available, 2=break/lunch
  minutes: string | number;
  dateesp: string;
  is_past: boolean;
  is_past_4hours: boolean;
}

export interface LastConsultationSummary {
  patient: {
    id: number;
    full_name: string;
    age_text: string;
  };
  last_consultation: {
    id: number;
    created_at: string;
    notes?: string;
    diagnostic_text: string;
    medicament_text: string;
  } | null;
}

export interface ActivityLogItem {
  id: number;
  entity_type: string;
  entity_id: number;
  action: string;
  patient_id?: number | null;
  patient_name?: string | null;
  office_id?: number | null;
  office_title?: string | null;
  appointment_id?: number | null;
  user_id?: number | null;
  user_role_id?: number | null;
  user_name?: string | null;
  message?: string | null;
  meta?: Record<string, unknown> | null;
  created_at: string;
  updated_at?: string | null;
}

export interface PatientSoapContext {
  last_consultation: {
    id: number;
    created_at: string;
    ailingdate?: string;
    subjective?: string;
    currentcondition?: string;
    height?: string;
    weight?: string;
    ta?: string;
    temp?: string;
    fc?: string;
    os?: string;
    studies?: string;
    examination?: string;
    indicaciones?: string;
    notes?: string;
    medicament_text?: string;
    diagnostic_text?: string;
    diagnostic_items?: string[];
    medications?: Array<{
      medicament: string;
      prescription: string;
    }>;
  } | null;
}

export interface MedicamentHistoryItem {
  title: string;
}

export interface OfficeLabelItem {
  id: number;
  code?: string;
  identify?: string;
  status?: number | null;
  created_at?: string;
}

export interface PatientTagStatusOption {
  id: number;
  code: string;
  identify: number;
  color_class: string;
}

export interface PatientResultTemplate {
  id: number;
  code: string;
  data?: string | null;
}

export interface PatientTagControlTag {
  id: number;
  code: string;
  consultation_id?: number | null;
  created_at?: string | null;
  created_at_label?: string;
  visible_until?: string | null;
  is_undefined: boolean;
  current_status: {
    code: string;
    color_class: string;
    date?: string | null;
  };
  history: Array<{
    note?: string;
    code?: string;
    color?: string;
    date?: string;
    rol_id?: number;
  }>;
}

export interface PatientTagControlData {
  patient: {
    id: number;
    full_name: string;
    phone?: string;
    age_text?: string;
    last_consultation_text?: string;
    last_consultation_diff?: string;
    next_appointment_text?: string;
    next_appointment_diff?: string;
    last_file_name?: string;
    last_file_text?: string;
    last_file_diff?: string;
  };
  statuses: PatientTagStatusOption[];
  tags: PatientTagControlTag[];
  templates: PatientResultTemplate[];
}

export interface PublicStudyResult {
  code: string;
  template_name: string;
  template_text: string;
  patient_name: string;
  medic_name: string;
  file: {
    id: number;
    name: string;
    description?: string | null;
    type: 'image' | 'pdf';
    mime_type: string;
    preview_url: string;
    download_url: string;
  };
}

export interface PublicAppointmentConfirmation {
  code: string;
  appointment_id: number;
  status: 'pending' | 'confirmed' | 'cancelled';
  question_text: string;
  patient: {
    first_name: string;
    full_name: string;
    gender?: string;
  };
  appointment: {
    date_label: string;
    time_label: string;
    reason?: string;
  };
  office: {
    phone?: string;
    doctor_name: string;
    specialty?: string;
    address?: string;
  };
  history_form_completed: boolean;
  history_form_required: boolean;
  show_history_form: boolean;
  history_form_title?: string;
  history_form_message?: string;
  history_form?: {
    allow_gender_question: boolean;
    include_referral_question: boolean;
    blood_type_options: Array<{ value: string; label: string }>;
    birth_place_options: string[];
    civil_status_options: string[];
    education_options: Array<{ value: string; label: string }>;
    exercise_options: string[];
    smoking_options: string[];
    substance_use_options: string[];
    drug_options: Array<{ key: string; label: string }>;
    disease_options: Array<{ key: string; label: string }>;
    referral_options: Array<{ value: string; label: string }>;
  };
  can_respond: boolean;
}

export interface PublicAppLinkResponse {
  type: 'study_result' | 'appointment_confirmation';
  study?: PublicStudyResult;
  appointment?: PublicAppointmentConfirmation;
}

export interface PublicRescheduleLinkResponse {
  mode: 'reschedule' | 'booking';
  code: string;
  minutes: number;
  can_reschedule: boolean;
  show_contact_actions: boolean;
  reschedule_message?: string | null;
  reschedule_count_used: number;
  reschedule_count_remaining: number;
  office: {
    id: number;
    title: string;
    doctor_name: string;
    specialty?: string;
    address?: string;
    phone?: string;
  };
  patient: {
    id: number;
    name: string;
    first_name: string;
  } | null;
  appointment: {
    id: number;
    status: number;
    date_label: string;
    time_label: string;
    reason?: string;
    datestart: string;
    dateend: string;
  } | null;
}

export interface PublicRescheduleDateOption {
  date: string;
  slots: string[];
  label: string;
}

export interface PublicRescheduleSuccessResponse {
  mode: 'reschedule' | 'booking';
  message: string;
  appointment: {
    id: number;
    date_label: string;
    time_label: string;
    datestart: string;
    dateend: string;
  };
  patient?: {
    name: string;
  };
}

export interface PublicBookingCandidate {
  user_id: number;
  patient_id: number;
  full_name: string;
  age?: number | null;
  birth?: string | null;
  has_history: boolean;
  has_consultations: boolean;
  has_appointments: boolean;
}

export interface PublicBookingCandidateResponse {
  has_candidates: boolean;
  candidates: PublicBookingCandidate[];
  limit_reached: boolean;
}

export interface PublicAssistantLinkResponse {
  code: string;
  name: string;
  phone: string;
  expires_at?: string;
  can_register: boolean;
  message: string | null;
  office: {
    id: number;
    title: string;
    doctor_name: string;
  };
}

export interface PublicAssistantRegisterResponse {
  message: string;
  phone: string;
  office_title: string;
}

export interface NotificationHistoryItem {
  id: number;
  month_label: string;
  sms_count: number;
  whatsapp_count: number;
  used_count: number;
  available_count: number;
  created_at: string;
  is_current_month: boolean;
}

export interface NotificationSettingsData {
  monthly_limit: number;
  available_credits: number;
  preferences: Record<string, boolean>;
  history: NotificationHistoryItem[];
}

export interface NotificationAssistantItem {
  assistant_id: number;
  user_id: number;
  name: string;
  phone: string;
  enabled: boolean;
  recipient_id?: number | null;
  can_receive: boolean;
}

export interface NotificationLegacyRecipient {
  id: number;
  phone: string;
  enabled: boolean;
}

export interface NotificationPreassistantItem {
  id: number;
  name: string;
  phone: string;
  code: string;
  link: string;
  expires_at?: string;
  template_pending: boolean;
}

export interface NotificationAssistantRecipientsData {
  office: {
    id: number;
    title: string;
  };
  assistants: NotificationAssistantItem[];
  preassistants: NotificationPreassistantItem[];
  legacy_recipients: NotificationLegacyRecipient[];
  limits: {
    legacy_max: number;
    total_max: number;
    assistant_max: number;
    registered_assistants: number;
    registered_preassistants: number;
    registered_legacy: number;
    registered_total: number;
    enabled_assistants: number;
    enabled_legacy: number;
    enabled_total: number;
  };
}

export interface ConsultationListItem {
  consultation_id: number;
  patient_id: number;
  patient_name: string;
  phone?: string;
  birth_date?: string;
  last_consultation_at: string;
  brief_summary: string;
}

export interface PatientSimple {
  id: number;
  name?: string;
  last_name?: string;
  full_name: string;
  phone: string;
  phone_code: string;
  full_phone: string;
  gender?: string;
}

export interface PatientSearchResult {
  id: number;
  name: string;
  last_name: string;
  full_name: string;
  phone: string;
  phone_code: string | null;
  full_phone: string;
  gender: string;
}

export interface NewPatientData {
  phone_code: string;
  phone: string;
  name: string;
  last_name: string;
  gender: 'M' | 'F' | '';
  birth_date: string;
}

export interface Consultorio {
  id: number;
  name: string;
  address?: string;
  medicos: User[];
}

export interface NucleoMedico {
  id: number;
  name: string;
  address?: string;
  phone?: string;
  consultorios: Consultorio[];
  medicos: User[];
}
