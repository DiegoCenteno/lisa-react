export const UserRole = {
  ADMIN_SYSTEM: 'admin_system',
  ADMIN_NUCLEO: 'admin_nucleo',
  MEDICO: 'medico',
  MEDICO_COMPARTIDO: 'medico_compartido',
  ASISTENTE: 'asistente',
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
}

export interface Patient {
  id: number;
  name: string;
  last_name: string;
  email?: string;
  phone?: string;
  birth_date?: string;
  gender?: string;
  blood_type?: string;
  created_at: string;
  updated_at: string;
}

export interface Appointment {
  id: number;
  patient_id: number;
  medico_id: number;
  consultorio_id?: number;
  date: string;
  start_time: string;
  end_time: string;
  status: AppointmentStatus;
  reason?: string;
  notes?: string;
  patient?: Patient;
  medico?: User;
}

export const AppointmentStatus = {
  SCHEDULED: 'scheduled',
  CONFIRMED: 'confirmed',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  RESCHEDULED: 'rescheduled',
  NO_SHOW: 'no_show',
} as const;

export type AppointmentStatus = (typeof AppointmentStatus)[keyof typeof AppointmentStatus];

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
