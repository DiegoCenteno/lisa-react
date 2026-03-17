import type { Prescription } from '../types';
import apiClient from './client';

const MOCK_PRESCRIPTIONS: Prescription[] = [
  {
    id: 1,
    patient_id: 1,
    medico_id: 1,
    appointment_id: 1,
    date: '2024-06-20',
    medications: [
      {
        name: 'Omeprazol',
        dosage: '20mg',
        frequency: 'Cada 24 horas',
        duration: '14 días',
        instructions: 'Tomar en ayunas',
      },
      {
        name: 'Buscapina',
        dosage: '10mg',
        frequency: 'Cada 8 horas',
        duration: '5 días',
        instructions: 'En caso de dolor abdominal',
      },
    ],
    diagnosis: 'Probable gastritis',
    notes: 'Dieta blanda. Evitar irritantes.',
    patient: {
      id: 1,
      name: 'María',
      last_name: 'López García',
      phone: '3398765432',
      email: 'maria@email.com',
      created_at: '2024-01-15',
      updated_at: '2024-06-20',
    },
  },
];

const USE_MOCK = true;

export const prescriptionService = {
  async getPrescriptions(patientId?: number): Promise<Prescription[]> {
    if (USE_MOCK) {
      if (patientId) {
        return MOCK_PRESCRIPTIONS.filter((p) => p.patient_id === patientId);
      }
      return MOCK_PRESCRIPTIONS;
    }
    const params: Record<string, number> = {};
    if (patientId) params.patient_id = patientId;
    const response = await apiClient.get<Prescription[]>('/prescriptions', {
      params,
    });
    return response.data;
  },

  async createPrescription(
    data: Partial<Prescription>
  ): Promise<Prescription> {
    if (USE_MOCK) {
      const newPrescription: Prescription = {
        id: MOCK_PRESCRIPTIONS.length + 1,
        patient_id: data.patient_id ?? 0,
        medico_id: data.medico_id ?? 0,
        appointment_id: data.appointment_id,
        date: data.date ?? new Date().toISOString().split('T')[0],
        medications: data.medications ?? [],
        diagnosis: data.diagnosis,
        notes: data.notes,
      };
      MOCK_PRESCRIPTIONS.push(newPrescription);
      return newPrescription;
    }
    const response = await apiClient.post<Prescription>(
      '/prescriptions',
      data
    );
    return response.data;
  },

  async getPrescription(id: number): Promise<Prescription> {
    if (USE_MOCK) {
      const prescription = MOCK_PRESCRIPTIONS.find((p) => p.id === id);
      if (!prescription) throw new Error('Receta no encontrada');
      return prescription;
    }
    const response = await apiClient.get<Prescription>(
      `/prescriptions/${id}`
    );
    return response.data;
  },
};
