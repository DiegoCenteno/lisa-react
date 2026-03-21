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
  confirmed?: boolean;
  smsstatus?: number;
  is_first_time?: boolean;
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
  role: 'owner' | 'assistant';
}

export interface ClinicalHistory {
  id: number;
  patient_id: number;
  hereditary_background: HereditaryBackground;
  personal_non_pathological: PersonalNonPathological;
  personal_pathological: PersonalPathological;
  gynecological?: GynecologicalBackground;
}

export interface HereditaryBackground {
  blood_type_rh?: string;
  genetic_defects?: string;
  family_preeclampsia?: string;
  diabetes?: string;
  cancer?: string;
  hypertension?: string;
  rheumatic_disease?: string;
  others?: string;
}

export interface PersonalNonPathological {
  origin?: string;
  residence?: string;
  civil_status?: string;
  education?: string;
  occupation?: string;
  substance_use?: string;
  medications?: string;
  smoking?: string;
  alcohol?: string;
  others?: string;
}

export interface PersonalPathological {
  allergies?: string;
  chronic_diseases?: string;
  surgeries?: string;
  transfusions?: string;
  fractures?: string;
  others?: string;
}

export interface GynecologicalBackground {
  menarche?: string;
  menstrual_cycles?: string;
  pregnant?: boolean;
  last_menstruation_date?: string;
  ivsa?: string;
  sexual_partners?: string;
  std?: string;
  cytology?: string;
  family_planning?: string;
  gestations?: string;
  last_gestation_date?: string;
  deliveries?: string;
  cesareans?: string;
  abortions?: string;
  ectopic?: string;
  molar?: string;
  menopause_age?: string;
  climacteric_symptoms?: string;
  prenatal_care?: string;
}

export interface SOAPNote {
  id: number;
  appointment_id: number;
  patient_id: number;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  private_comments?: string;
  labels: NoteLabel[];
  created_at: string;
  updated_at: string;
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
  size: number;
  uploaded_at: string;
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
