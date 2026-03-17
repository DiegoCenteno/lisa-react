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
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import type { EventInput, EventClickArg, DateSelectArg, DatesSetArg } from '@fullcalendar/core';
import { appointmentService } from '../../api/appointmentService';
import type { Appointment } from '../../types';
import dayjs from 'dayjs';

const statusColors: Record<number, string> = {
  0: '#2196f3',   // Pendiente - azul
  1: '#4caf50',   // Confirmada - verde
  2: '#f44336',   // No asistió - rojo
  3: '#9e9e9e',   // Cancelada - gris
  4: '#ff9800',   // Reprogramada - naranja
};

function appointmentToEvent(apt: Appointment): EventInput {
  const patientName = apt.patient
    ? `${apt.patient.name} ${apt.patient.last_name}`
    : `Paciente #${apt.patient_id}`;

  return {
    id: String(apt.id),
    title: patientName,
    start: apt.datestart,
    end: apt.dateend,
    backgroundColor: statusColors[apt.status] ?? '#2196f3',
    borderColor: statusColors[apt.status] ?? '#2196f3',
    extendedProps: {
      reason: apt.reason,
      status: apt.status,
      phone: apt.patient?.phone,
      office: apt.office?.title,
    },
  };
}

export default function AgendaPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EventClickArg | null>(null);
  const [newAppointment, setNewAppointment] = useState({
    patient_name: '',
    date: dayjs().format('YYYY-MM-DD'),
    start_time: '09:00',
    end_time: '09:30',
    reason: '',
  });

  const [dateRange, setDateRange] = useState<{ start: string; end: string } | null>(null);

  const loadAppointments = useCallback(async (startDate: string, endDate: string) => {
    setLoading(true);
    try {
      const data = await appointmentService.getAppointmentsByRange(startDate, endDate);
      setAppointments(data);
    } catch (err) {
      console.error('Error cargando citas:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (dateRange) {
      loadAppointments(dateRange.start, dateRange.end);
    }
  }, [dateRange, loadAppointments]);

  const handleDatesSet = useCallback((arg: DatesSetArg) => {
    const start = dayjs(arg.start).format('YYYY-MM-DD');
    const end = dayjs(arg.end).format('YYYY-MM-DD');
    setDateRange({ start, end });
  }, []);

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
      const datestart = `${newAppointment.date} ${newAppointment.start_time}:00`;
      const dateend = `${newAppointment.date} ${newAppointment.end_time}:00`;
      await appointmentService.createAppointment({
        office_id: 0, // TODO: select office from user's offices
        patient_id: 0, // TODO: search and select patient
        datestart,
        dateend,
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
      if (dateRange) {
        loadAppointments(dateRange.start, dateRange.end);
      }
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

      <Box
        sx={{
          position: 'relative',
          opacity: loading ? 0.5 : 1,
          transition: 'opacity 0.3s',
        }}
      >
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
            datesSet={handleDatesSet}
            nowIndicator={true}
            dayMaxEvents={3}
            moreLinkText={(n) => `+${n} más`}
            noEventsText="No hay citas en este período"
            firstDay={1}
          />
        </Box>
      </Box>

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
