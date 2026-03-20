import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { Add as AddIcon, Check as CheckIcon } from '@mui/icons-material';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import type { EventInput, EventClickArg, DatesSetArg, EventContentArg } from '@fullcalendar/core';
import { appointmentService } from '../../api/appointmentService';
import type { Appointment } from '../../types';
import dayjs from 'dayjs';
import NewAppointmentDialog from './NewAppointmentDialog';

function getEventColors(apt: Appointment): { bg: string; text: string } {
  const now = dayjs();
  const end = dayjs(apt.dateend);

  if (end.isBefore(now)) {
    return { bg: '#9e9e9e', text: '#ffffff' };
  }
  if (apt.is_first_time) {
    return { bg: '#00aeff', text: '#ffffff' };
  }
  return { bg: '#A8FBBD', text: '#333333' };
}

function appointmentToEvent(apt: Appointment): EventInput {
  const patientName = apt.patient
    ? `${apt.patient.name} ${apt.patient.last_name}`
    : `Paciente #${apt.patient_id}`;

  const colors = getEventColors(apt);

  return {
    id: String(apt.id),
    title: patientName,
    start: apt.datestart,
    end: apt.dateend,
    backgroundColor: colors.bg,
    borderColor: colors.bg,
    textColor: colors.text,
    extendedProps: {
      reason: apt.reason,
      status: apt.status,
      confirmed: apt.confirmed,
      smsstatus: apt.smsstatus,
      is_first_time: apt.is_first_time,
      phone: apt.patient?.phone,
      office: apt.office?.title,
      rowTextColor: colors.text,
    },
  };
}

function renderEventContent(arg: EventContentArg) {
  const { confirmed, smsstatus, phone, status } = arg.event.extendedProps;
  const isListView = arg.view.type.startsWith('list');
  const bgColor = arg.event.backgroundColor;
  const isConfirmed = confirmed || status === 1;

  // In list view, pick icon color that contrasts with row background
  const confirmedColor = isListView && bgColor === '#00aeff' ? '#ffffff' : '#00aeff';
  const smsColor = isListView && bgColor === '#9e9e9e' ? '#ffffff' : '#04d84e';

  const checkEl = isConfirmed ? (
    <span style={{ display: 'inline-flex', alignItems: 'center', marginRight: 6 }}>
      <CheckIcon sx={{ color: confirmedColor, fontSize: 'medium' }} />
      <CheckIcon sx={{ color: confirmedColor, fontSize: 'medium', marginLeft: '-9px' }} />
    </span>
  ) : smsstatus === 1 ? (
    <span style={{ display: 'inline-flex', alignItems: 'center', marginRight: 6 }}>
      <CheckIcon sx={{ color: smsColor, fontSize: 'medium' }} />
    </span>
  ) : null;

  if (isListView) {
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center' }}>
          {checkEl}
          <b>{arg.event.title}</b>
        </span>
        {phone && (
          <span style={{
            fontSize: '0.85em',
            whiteSpace: 'nowrap',
            marginLeft: 16,
            opacity: 0.8,
          }}>
            {String(phone)}
          </span>
        )}
      </div>
    );
  }

  if (arg.view.type.startsWith('timeGrid')) {
    return (
      <>
        <div className="fc-event-time">{arg.timeText}</div>
        <div className="fc-event-title">
          {checkEl}
          {arg.event.title}
        </div>
      </>
    );
  }

  return (
    <>
      {arg.timeText && <span className="fc-event-time">{arg.timeText} </span>}
      {checkEl}
      <span className="fc-event-title">{arg.event.title}</span>
    </>
  );
}

export default function AgendaPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EventClickArg | null>(null);
  const [officeId, setOfficeId] = useState<number>(0);

  const [dateRange, setDateRange] = useState<{ start: string; end: string } | null>(null);

  // Load office_id on mount
  useEffect(() => {
    appointmentService.getOffices().then((offices) => {
      if (offices.length > 0) {
        setOfficeId(offices[0].id);
      }
    }).catch((err) => console.error('Error loading offices:', err));
  }, []);

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
    const viewType = arg.view.type;
    const viewStart = dayjs(arg.start);
    const viewEnd = dayjs(arg.end);
    const today = dayjs().startOf('day');

    if (viewType.startsWith('list')) {
      const effectiveStart = viewStart.isBefore(today) ? today : viewStart;
      if (effectiveStart.valueOf() >= viewEnd.valueOf()) {
        setAppointments([]);
        return;
      }
      setDateRange({
        start: effectiveStart.format('YYYY-MM-DD'),
        end: viewEnd.format('YYYY-MM-DD'),
      });
    } else {
      setDateRange({
        start: viewStart.format('YYYY-MM-DD'),
        end: viewEnd.format('YYYY-MM-DD'),
      });
    }
  }, []);

  const events = useMemo(
    () => appointments.map(appointmentToEvent),
    [appointments]
  );


  const handleEventClick = (clickInfo: EventClickArg) => {
    setSelectedEvent(clickInfo);
  };

  const handleAppointmentCreated = useCallback(() => {
    if (dateRange) {
      loadAppointments(dateRange.start, dateRange.end);
    }
  }, [dateRange, loadAppointments]);

  const handleEventDidMount = useCallback((info: { el: HTMLElement; event: { backgroundColor: string; textColor: string; extendedProps: Record<string, unknown> }; view: { type: string } }) => {
    if (info.view.type.startsWith('list')) {
      const row = info.el.tagName === 'TR'
        ? info.el
        : info.el.closest('tr');
      if (row && row instanceof HTMLElement) {
        const bgColor = info.event.backgroundColor;
        const textColor = (info.event.extendedProps.rowTextColor as string) || info.event.textColor || '#333';
        row.style.backgroundColor = bgColor;
        row.querySelectorAll('td').forEach((cell) => {
          (cell as HTMLElement).style.color = textColor;
        });
        const dot = row.querySelector('.fc-list-event-dot') as HTMLElement | null;
        if (dot) {
          dot.style.display = 'none';
        }
      }
    }
  }, []);

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
              filter: 'brightness(0.95)',
            },
            '& .fc-list-event td': {
              transition: 'filter 0.2s',
            },
          }}
        >
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
            initialView="listMonth"
            locale="es"
            headerToolbar={isMobile ? {
              left: 'prev,next',
              center: 'title',
              right: '',
            } : {
              left: 'prev,next today',
              center: 'title',
              right: 'listMonth,timeGridDay,timeGridWeek,dayGridMonth',
            }}
            buttonText={{
              today: 'Hoy',
              month: 'Mes',
              week: 'Semana',
              day: 'Día',
              list: 'Lista',
            }}
            events={events}
            eventContent={renderEventContent}
            eventDidMount={handleEventDidMount}
            selectable={false}
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
              {selectedEvent.event.extendedProps.confirmed && (
                <Typography sx={{ color: '#00aeff' }}>
                  <strong>Cita confirmada</strong>
                </Typography>
              )}
              {selectedEvent.event.extendedProps.is_first_time && (
                <Typography sx={{ color: '#00aeff' }}>
                  <strong>Paciente de primera vez</strong>
                </Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedEvent(null)}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Nueva cita (wizard) */}
      <NewAppointmentDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        officeId={officeId}
        onAppointmentCreated={handleAppointmentCreated}
      />
    </Box>
  );
}
