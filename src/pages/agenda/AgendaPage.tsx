import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Skeleton,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import type { EventInput, EventClickArg, DateSelectArg } from '@fullcalendar/core';
import { appointmentService } from '../../api/appointmentService';
import type { Appointment } from '../../types';
import dayjs from 'dayjs';

const statusColors: Record<string, string> = {
  confirmed: '#4caf50',
  scheduled: '#2196f3',
  in_progress: '#ff9800',
  completed: '#9e9e9e',
  cancelled: '#f44336',
  rescheduled: '#ff9800',
  no_show: '#f44336',
};

function appointmentToEvent(apt: Appointment): EventInput {
  const patientName = apt.patient
    ? `${apt.patient.name} ${apt.patient.last_name}`
    : `Paciente #${apt.patient_id}`;

  return {
    id: String(apt.id),
    title: patientName,
    start: `${apt.date}T${apt.start_time}`,
    end: `${apt.date}T${apt.end_time}`,
    backgroundColor: statusColors[apt.status] ?? '#2196f3',
    borderColor: statusColors[apt.status] ?? '#2196f3',
    extendedProps: {
      reason: apt.reason,
      status: apt.status,
      phone: apt.patient?.phone,
    },
  };
}

export default function AgendaPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EventClickArg | null>(null);
  const [newAppointment, setNewAppointment] = useState({
    patient_name: '',
    date: dayjs().format('YYYY-MM-DD'),
    start_time: '09:00',
    end_time: '09:30',
    reason: '',
  });

  const loadAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const data = await appointmentService.getAppointments();
      setAppointments(data);
    } catch (err) {
      console.error('Error cargando citas:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  const events = useMemo(
    () => appointments.map(appointmentToEvent),
    [appointments]
  );

  const handleDateSelect = (selectInfo: DateSelectArg) => {
    const startDate = dayjs(selectInfo.start);
    setNewAppointment({
      patient_name: '',
      date: startDate.format('YYYY-MM-DD'),
      start_time: startDate.format('HH:mm'),
      end_time: selectInfo.end
        ? dayjs(selectInfo.end).format('HH:mm')
        : startDate.add(30, 'minute').format('HH:mm'),
      reason: '',
    });
    setDialogOpen(true);
  };

  const handleEventClick = (clickInfo: EventClickArg) => {
    setSelectedEvent(clickInfo);
  };

  const handleCreateAppointment = async () => {
    try {
      await appointmentService.createAppointment({
        patient_id: 0,
        medico_id: 1,
        date: newAppointment.date,
        start_time: newAppointment.start_time,
        end_time: newAppointment.end_time,
        reason: newAppointment.reason,
      });
      setDialogOpen(false);
      setNewAppointment({
        patient_name: '',
        date: dayjs().format('YYYY-MM-DD'),
        start_time: '09:00',
        end_time: '09:30',
        reason: '',
      });
      loadAppointments();
    } catch (err) {
      console.error('Error creando cita:', err);
    }
  };

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
          flexWrap: 'wrap',
          gap: 1,
        }}
      >
        <Typography variant="h5">Agenda Médica</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setDialogOpen(true)}
        >
          Nueva Cita
        </Button>
      </Box>

      {loading ? (
        <Box>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} height={80} sx={{ mb: 1 }} />
          ))}
        </Box>
      ) : (
        <Box
          sx={{
            '& .fc': {
              fontFamily: 'Roboto, sans-serif',
            },
            '& .fc-toolbar-title': {
              fontSize: { xs: '1rem', sm: '1.25rem' },
              textTransform: 'capitalize',
            },
            '& .fc-button': {
              textTransform: 'capitalize',
            },
            '& .fc-button-primary': {
              backgroundColor: 'primary.main',
              borderColor: 'primary.main',
              '&:hover': {
                backgroundColor: 'primary.dark',
                borderColor: 'primary.dark',
              },
              '&:disabled': {
                backgroundColor: 'primary.main',
                borderColor: 'primary.main',
              },
            },
            '& .fc-button-primary:not(:disabled).fc-button-active': {
              backgroundColor: 'primary.dark',
              borderColor: 'primary.dark',
            },
            '& .fc-event': {
              cursor: 'pointer',
              borderRadius: '4px',
              fontSize: '0.8rem',
            },
            '& .fc-daygrid-event-dot': {
              borderColor: 'inherit',
            },
            '& .fc-day-today': {
              backgroundColor: 'rgba(0, 137, 123, 0.05) !important',
            },
            '& .fc-list-event:hover td': {
              backgroundColor: 'rgba(0, 137, 123, 0.08)',
            },
          }}
        >
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
            initialView="listWeek"
            locale="es"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'listWeek,timeGridDay,timeGridWeek,dayGridMonth',
            }}
            buttonText={{
              today: 'Hoy',
              month: 'Mes',
              week: 'Semana',
              day: 'Día',
              list: 'Lista',
            }}
            events={events}
            selectable={true}
            selectMirror={true}
            select={handleDateSelect}
            eventClick={handleEventClick}
            editable={false}
            height="auto"
            slotMinTime="07:00:00"
            slotMaxTime="21:00:00"
            allDaySlot={false}
            slotDuration="00:30:00"
            slotLabelFormat={{
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            }}
            eventTimeFormat={{
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            }}
            nowIndicator={true}
            dayMaxEvents={3}
            moreLinkText={(n) => `+${n} más`}
            noEventsText="No hay citas en este período"
            firstDay={1}
          />
        </Box>
      )}

      {/* Dialog: Detalle de cita */}
      <Dialog
        open={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Detalle de Cita</DialogTitle>
        <DialogContent>
          {selectedEvent && (
            <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography>
                <strong>Paciente:</strong> {selectedEvent.event.title}
              </Typography>
              <Typography>
                <strong>Horario:</strong>{' '}
                {dayjs(selectedEvent.event.start).format('HH:mm')} -{' '}
                {selectedEvent.event.end
                  ? dayjs(selectedEvent.event.end).format('HH:mm')
                  : ''}
              </Typography>
              <Typography>
                <strong>Fecha:</strong>{' '}
                {dayjs(selectedEvent.event.start).format('dddd, D [de] MMMM YYYY')}
              </Typography>
              {selectedEvent.event.extendedProps.reason && (
                <Typography>
                  <strong>Motivo:</strong> {selectedEvent.event.extendedProps.reason}
                </Typography>
              )}
              {selectedEvent.event.extendedProps.phone && (
                <Typography>
                  <strong>Teléfono:</strong> {selectedEvent.event.extendedProps.phone}
                </Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedEvent(null)}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Nueva cita */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Nueva Cita</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Nombre del Paciente"
              fullWidth
              value={newAppointment.patient_name}
              onChange={(e) =>
                setNewAppointment({ ...newAppointment, patient_name: e.target.value })
              }
            />
            <TextField
              label="Fecha"
              type="date"
              fullWidth
              value={newAppointment.date}
              onChange={(e) =>
                setNewAppointment({ ...newAppointment, date: e.target.value })
              }
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <Grid container spacing={2}>
              <Grid size={6}>
                <TextField
                  label="Hora Inicio"
                  type="time"
                  fullWidth
                  value={newAppointment.start_time}
                  onChange={(e) =>
                    setNewAppointment({ ...newAppointment, start_time: e.target.value })
                  }
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Grid>
              <Grid size={6}>
                <TextField
                  label="Hora Fin"
                  type="time"
                  fullWidth
                  value={newAppointment.end_time}
                  onChange={(e) =>
                    setNewAppointment({ ...newAppointment, end_time: e.target.value })
                  }
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Grid>
            </Grid>
            <TextField
              label="Motivo de la consulta"
              fullWidth
              multiline
              rows={2}
              value={newAppointment.reason}
              onChange={(e) =>
                setNewAppointment({ ...newAppointment, reason: e.target.value })
              }
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleCreateAppointment}>
            Crear Cita
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
