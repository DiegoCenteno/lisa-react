import type { Patient, ClinicalHistory, SOAPNote, PatientFile } from '../types';
import apiClient from './client';
import { appointmentService } from './appointmentService';

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

const MOCK_CLINICAL_HISTORY: ClinicalHistory = {
  id: 1,
  patient_id: 1,
  hereditary_background: {
    blood_type_rh: 'O+',
    genetic_defects: 'Negados',
    family_preeclampsia: 'Negada',
    diabetes: 'Abuela paterna',
    cancer: 'Abuela materna con CA de mama',
    hypertension: 'Padre',
    rheumatic_disease: 'Negada',
    others: '',
  },
  personal_non_pathological: {
    origin: 'Jalisco',
    residence: 'Tivoli',
    civil_status: 'Union libre',
    education: 'Secundaria',
    occupation: 'Ama de casa',
    substance_use: 'Antes consumia con muy poca frecuencia, Marihuana',
    medications: '',
    smoking: 'Entre 1 y 2 cigarros a la semana, desde los 13 anos',
    alcohol: '',
    others: '',
  },
  personal_pathological: {
    allergies: 'Negadas',
    chronic_diseases: 'Trastornos de ansiedad sin TX actual',
    surgeries: '',
    transfusions: '',
    fractures: '',
    others: '',
  },
  gynecological: {
    menarche: '11',
    menstrual_cycles: 'Ciclos regulares 28x3, eumenorreica, dismenorrea: leve',
    pregnant: false,
    last_menstruation_date: '2026-03-02',
    ivsa: '15',
    sexual_partners: '3',
    std: '',
    cytology: 'Nunca',
    family_planning: 'Ninguno',
    gestations: '',
    last_gestation_date: '',
    deliveries: '',
    cesareans: '',
    abortions: '',
    ectopic: '',
    molar: '',
    menopause_age: '',
    climacteric_symptoms: '',
    prenatal_care: '',
  },
};

const MOCK_SOAP_NOTES: SOAPNote[] = [
  {
    id: 1,
    appointment_id: 1,
    patient_id: 1,
    subjective: 'Paciente refiere dolor abdominal leve desde hace 3 dias.',
    objective: 'Signos vitales normales. Abdomen blando, depresible.',
    assessment: 'Probable gastritis.',
    plan: 'Se indica omeprazol 20mg cada 24hrs por 14 dias. Dieta blanda.',
    private_comments: 'Evaluar en siguiente consulta posible referencia a gastro.',
    labels: [
      { id: 1, name: 'Estudio de Papanicolaou', status: 'Pendiente revision por el medico', color: '#FB8C00' },
    ],
    created_at: '2024-06-20T09:30:00',
    updated_at: '2024-06-20T09:45:00',
  },
];

const MOCK_FILES: PatientFile[] = [
  {
    id: 1,
    patient_id: 1,
    name: 'Ultrasonido_20240615.pdf',
    type: 'application/pdf',
    url: '#',
    size: 2048000,
    uploaded_at: '2024-06-15',
  },
  {
    id: 2,
    patient_id: 1,
    name: 'Resultados_Laboratorio.pdf',
    type: 'application/pdf',
    url: '#',
    size: 1024000,
    uploaded_at: '2024-06-10',
  },
];

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

  async getClinicalHistory(patientId: number): Promise<ClinicalHistory> {
    return { ...MOCK_CLINICAL_HISTORY, patient_id: patientId };
  },

  async updateClinicalHistory(
    patientId: number,
    data: Partial<ClinicalHistory>
  ): Promise<ClinicalHistory> {
    return { ...MOCK_CLINICAL_HISTORY, ...data, patient_id: patientId };
  },

  async getSOAPNotes(patientId: number): Promise<SOAPNote[]> {
    return MOCK_SOAP_NOTES.filter((n) => n.patient_id === patientId);
  },

  async createSOAPNote(
    patientId: number,
    data: Partial<SOAPNote>
  ): Promise<SOAPNote> {
    const newNote: SOAPNote = {
      id: MOCK_SOAP_NOTES.length + 1,
      appointment_id: data.appointment_id ?? 0,
      patient_id: patientId,
      subjective: data.subjective ?? '',
      objective: data.objective ?? '',
      assessment: data.assessment ?? '',
      plan: data.plan ?? '',
      private_comments: data.private_comments,
      labels: data.labels ?? [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    MOCK_SOAP_NOTES.push(newNote);
    return newNote;
  },

  async getFiles(patientId: number): Promise<PatientFile[]> {
    return MOCK_FILES.filter((f) => f.patient_id === patientId);
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
