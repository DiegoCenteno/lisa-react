import type { Patient, ClinicalHistory, SOAPNote, PatientFile } from '../types';
import apiClient from './client';

const MOCK_PATIENTS: Patient[] = [
  {
    id: 1,
    name: 'María',
    last_name: 'López García',
    email: 'maria@email.com',
    phone: '3398765432',
    birth_date: '1990-05-15',
    gender: 'Femenino',
    blood_type: 'O+',
    created_at: '2024-01-15',
    updated_at: '2024-06-20',
  },
  {
    id: 2,
    name: 'Josefina',
    last_name: 'Martínez Ruiz',
    email: 'josefina@email.com',
    phone: '3387654321',
    birth_date: '1985-08-22',
    gender: 'Femenino',
    blood_type: 'A+',
    created_at: '2024-03-10',
    updated_at: '2024-06-18',
  },
  {
    id: 3,
    name: 'Guadalupe',
    last_name: 'Hernández Flores',
    email: 'guadalupe@email.com',
    phone: '3376543210',
    birth_date: '1978-12-03',
    gender: 'Femenino',
    blood_type: 'B+',
    created_at: '2023-11-05',
    updated_at: '2024-05-30',
  },
  {
    id: 4,
    name: 'Rosa',
    last_name: 'Sánchez Villa',
    email: 'rosa@email.com',
    phone: '3365432109',
    birth_date: '1995-03-28',
    gender: 'Femenino',
    blood_type: 'AB+',
    created_at: '2024-02-20',
    updated_at: '2024-06-15',
  },
  {
    id: 5,
    name: 'Carmen',
    last_name: 'Díaz Moreno',
    email: 'carmen@email.com',
    phone: '3354321098',
    birth_date: '1992-07-11',
    gender: 'Femenino',
    blood_type: 'O-',
    created_at: '2024-04-01',
    updated_at: '2024-06-22',
  },
];

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
    residence: 'Tívoli',
    civil_status: 'Unión libre',
    education: 'Secundaria',
    occupation: 'Ama de casa',
    substance_use: 'Antes consumía con muy poca frecuencia, Marihuana',
    medications: '',
    smoking: 'Entre 1 y 2 cigarros a la semana, desde los 13 años',
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
    subjective: 'Paciente refiere dolor abdominal leve desde hace 3 días.',
    objective: 'Signos vitales normales. Abdomen blando, depresible.',
    assessment: 'Probable gastritis.',
    plan: 'Se indica omeprazol 20mg cada 24hrs por 14 días. Dieta blanda.',
    private_comments: 'Evaluar en siguiente consulta posible referencia a gastro.',
    labels: [
      { id: 1, name: 'Estudio de Papanicolaou', status: 'Pendiente revisión por el médico', color: '#FB8C00' },
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

const USE_MOCK = true;

export const patientService = {
  async getPatients(): Promise<Patient[]> {
    if (USE_MOCK) return MOCK_PATIENTS;
    const response = await apiClient.get<Patient[]>('/patients');
    return response.data;
  },

  async getPatient(id: number): Promise<Patient> {
    if (USE_MOCK) {
      const patient = MOCK_PATIENTS.find((p) => p.id === id);
      if (!patient) throw new Error('Paciente no encontrado');
      return patient;
    }
    const response = await apiClient.get<Patient>(`/patients/${id}`);
    return response.data;
  },

  async getClinicalHistory(patientId: number): Promise<ClinicalHistory> {
    if (USE_MOCK) {
      return { ...MOCK_CLINICAL_HISTORY, patient_id: patientId };
    }
    const response = await apiClient.get<ClinicalHistory>(
      `/patients/${patientId}/clinical-history`
    );
    return response.data;
  },

  async updateClinicalHistory(
    patientId: number,
    data: Partial<ClinicalHistory>
  ): Promise<ClinicalHistory> {
    if (USE_MOCK) {
      return { ...MOCK_CLINICAL_HISTORY, ...data, patient_id: patientId };
    }
    const response = await apiClient.put<ClinicalHistory>(
      `/patients/${patientId}/clinical-history`,
      data
    );
    return response.data;
  },

  async getSOAPNotes(patientId: number): Promise<SOAPNote[]> {
    if (USE_MOCK) {
      return MOCK_SOAP_NOTES.filter((n) => n.patient_id === patientId);
    }
    const response = await apiClient.get<SOAPNote[]>(
      `/patients/${patientId}/soap-notes`
    );
    return response.data;
  },

  async createSOAPNote(
    patientId: number,
    data: Partial<SOAPNote>
  ): Promise<SOAPNote> {
    if (USE_MOCK) {
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
    }
    const response = await apiClient.post<SOAPNote>(
      `/patients/${patientId}/soap-notes`,
      data
    );
    return response.data;
  },

  async getFiles(patientId: number): Promise<PatientFile[]> {
    if (USE_MOCK) {
      return MOCK_FILES.filter((f) => f.patient_id === patientId);
    }
    const response = await apiClient.get<PatientFile[]>(
      `/patients/${patientId}/files`
    );
    return response.data;
  },

  async searchPatients(query: string): Promise<Patient[]> {
    if (USE_MOCK) {
      const q = query.toLowerCase();
      return MOCK_PATIENTS.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.last_name.toLowerCase().includes(q) ||
          p.email?.toLowerCase().includes(q) ||
          p.phone?.includes(q)
      );
    }
    const response = await apiClient.get<Patient[]>('/patients/search', {
      params: { q: query },
    });
    return response.data;
  },
};
