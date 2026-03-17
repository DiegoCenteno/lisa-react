import type { Appointment, AppointmentStatus } from '../types';
import apiClient from './client';

const MOCK_APPOINTMENTS: Appointment[] = [
  {
    id: 1,
    patient_id: 1,
    medico_id: 1,
    date: new Date().toISOString().split('T')[0],
    start_time: '09:00',
    end_time: '09:30',
    status: 'confirmed' as AppointmentStatus,
    reason: 'Consulta de seguimiento',
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
  {
    id: 2,
    patient_id: 2,
    medico_id: 1,
    date: new Date().toISOString().split('T')[0],
    start_time: '09:30',
    end_time: '10:00',
    status: 'scheduled' as AppointmentStatus,
    reason: 'Primera consulta',
    patient: {
      id: 2,
      name: 'Josefina',
      last_name: 'Martínez Ruiz',
      phone: '3387654321',
      email: 'josefina@email.com',
      created_at: '2024-03-10',
      updated_at: '2024-06-18',
    },
  },
  {
    id: 3,
    patient_id: 3,
    medico_id: 1,
    date: new Date().toISOString().split('T')[0],
    start_time: '10:00',
    end_time: '10:30',
    status: 'confirmed' as AppointmentStatus,
    reason: 'Revisión de estudios',
    patient: {
      id: 3,
      name: 'Guadalupe',
      last_name: 'Hernández Flores',
      phone: '3376543210',
      email: 'guadalupe@email.com',
      created_at: '2023-11-05',
      updated_at: '2024-05-30',
    },
  },
  {
    id: 4,
    patient_id: 4,
    medico_id: 1,
    date: new Date().toISOString().split('T')[0],
    start_time: '10:30',
    end_time: '11:00',
    status: 'in_progress' as AppointmentStatus,
    reason: 'Control prenatal',
    patient: {
      id: 4,
      name: 'Rosa',
      last_name: 'Sánchez Villa',
      phone: '3365432109',
      email: 'rosa@email.com',
      created_at: '2024-02-20',
      updated_at: '2024-06-15',
    },
  },
  {
    id: 5,
    patient_id: 5,
    medico_id: 1,
    date: new Date().toISOString().split('T')[0],
    start_time: '11:00',
    end_time: '11:30',
    status: 'scheduled' as AppointmentStatus,
    reason: 'Papanicolaou',
    patient: {
      id: 5,
      name: 'Carmen',
      last_name: 'Díaz Moreno',
      phone: '3354321098',
      email: 'carmen@email.com',
      created_at: '2024-04-01',
      updated_at: '2024-06-22',
    },
  },
  {
    id: 6,
    patient_id: 6,
    medico_id: 1,
    date: (() => {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      return d.toISOString().split('T')[0];
    })(),
    start_time: '09:00',
    end_time: '09:30',
    status: 'scheduled' as AppointmentStatus,
    reason: 'Ultrasonido',
    patient: {
      id: 6,
      name: 'Patricia',
      last_name: 'Ramírez Castro',
      phone: '3343210987',
      email: 'patricia@email.com',
      created_at: '2024-05-10',
      updated_at: '2024-06-25',
    },
  },
];

const USE_MOCK = true;

export const appointmentService = {
  async getAppointments(
    date?: string,
    medicoId?: number
  ): Promise<Appointment[]> {
    if (USE_MOCK) {
      let filtered = MOCK_APPOINTMENTS;
      if (date) {
        filtered = filtered.filter((a) => a.date === date);
      }
      if (medicoId) {
        filtered = filtered.filter((a) => a.medico_id === medicoId);
      }
      return filtered;
    }
    const params: Record<string, string | number> = {};
    if (date) params.date = date;
    if (medicoId) params.medico_id = medicoId;
    const response = await apiClient.get<Appointment[]>('/appointments', {
      params,
    });
    return response.data;
  },

  async getAppointmentsByRange(
    startDate: string,
    endDate: string,
    medicoId?: number
  ): Promise<Appointment[]> {
    if (USE_MOCK) {
      return MOCK_APPOINTMENTS.filter(
        (a) =>
          a.date >= startDate &&
          a.date <= endDate &&
          (!medicoId || a.medico_id === medicoId)
      );
    }
    const params: Record<string, string | number> = {
      start_date: startDate,
      end_date: endDate,
    };
    if (medicoId) params.medico_id = medicoId;
    const response = await apiClient.get<Appointment[]>('/appointments/range', {
      params,
    });
    return response.data;
  },

  async createAppointment(
    data: Partial<Appointment>
  ): Promise<Appointment> {
    if (USE_MOCK) {
      const newAppointment: Appointment = {
        id: MOCK_APPOINTMENTS.length + 1,
        patient_id: data.patient_id ?? 0,
        medico_id: data.medico_id ?? 0,
        date: data.date ?? '',
        start_time: data.start_time ?? '',
        end_time: data.end_time ?? '',
        status: 'scheduled' as AppointmentStatus,
        reason: data.reason,
        notes: data.notes,
      };
      MOCK_APPOINTMENTS.push(newAppointment);
      return newAppointment;
    }
    const response = await apiClient.post<Appointment>('/appointments', data);
    return response.data;
  },

  async updateAppointment(
    id: number,
    data: Partial<Appointment>
  ): Promise<Appointment> {
    if (USE_MOCK) {
      const idx = MOCK_APPOINTMENTS.findIndex((a) => a.id === id);
      if (idx !== -1) {
        MOCK_APPOINTMENTS[idx] = { ...MOCK_APPOINTMENTS[idx], ...data };
        return MOCK_APPOINTMENTS[idx];
      }
      throw new Error('Cita no encontrada');
    }
    const response = await apiClient.put<Appointment>(
      `/appointments/${id}`,
      data
    );
    return response.data;
  },

  async updateAppointmentStatus(
    id: number,
    status: AppointmentStatus
  ): Promise<Appointment> {
    return this.updateAppointment(id, { status });
  },
};
