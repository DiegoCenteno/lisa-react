import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Typography,
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  FormControlLabel,
  IconButton,
  CircularProgress,
  Snackbar,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Add as AddIcon,
  Check as CheckIcon,
  DoneAll as DoneAllIcon,
  Close as CloseIcon,
  ContentCopy as ContentCopyIcon,
  Phone as PhoneIcon,
  CheckCircle as CheckCircleIcon,
  CancelOutlined as CancelOutlinedIcon,
  CalendarMonth as CalendarMonthIcon,
  EventBusy as EventBusyIcon,
  PersonOff as PersonOffIcon,
} from '@mui/icons-material';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import type { EventInput, EventClickArg, DatesSetArg, EventContentArg } from '@fullcalendar/core';
import { appointmentService } from '../../api/appointmentService';
import type { Appointment, PatientSimple, LastConsultationSummary } from '../../types';
import dayjs from 'dayjs';
import NewAppointmentDialog from './NewAppointmentDialog';

const FIRST_TIME_BG = 'rgb(195 236 255)';
const FIRST_TIME_HOVER_BG = 'rgb(176 229 255)';
const FIRST_TIME_TEXT = 'rgb(51, 51, 51)';
const FOLLOW_UP_BG = '#A8FBBD';
const FOLLOW_UP_HOVER_BG = '#92f5ac';
const FOLLOW_UP_TEXT = '#333333';

type AppointmentAction = 'confirm' | 'cancel' | 'no_show';

function toPascalCaseName(value?: string): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getEventColors(apt: Appointment): { bg: string; text: string } {
  const now = dayjs();
  const end = dayjs(apt.dateend);

  if (end.isBefore(now)) {
    return { bg: '#9e9e9e', text: '#ffffff' };
  }
  if (apt.is_first_time) {
    return { bg: FIRST_TIME_BG, text: FIRST_TIME_TEXT };
  }
  return { bg: FOLLOW_UP_BG, text: FOLLOW_UP_TEXT };
}

function appointmentToEvent(apt: Appointment): EventInput {
  const patientName = apt.patient
    ? `${toPascalCaseName(apt.patient.name)} ${toPascalCaseName(apt.patient.last_name)}`.trim()
    : `Paciente #${apt.patient_id}`;

  const colors = getEventColors(apt);
  const isPast = dayjs(apt.dateend).isBefore(dayjs());
  const eventType = isPast ? 'past' : apt.is_first_time ? 'first-time' : 'follow-up';

  return {
    id: String(apt.id),
    title: patientName,
    start: apt.datestart,
    end: apt.dateend,
    backgroundColor: colors.bg,
    borderColor: colors.bg,
    textColor: colors.text,
    classNames: [`appointment-event`, `appointment-event--${eventType}`],
    extendedProps: {
      reason: apt.reason,
      status: apt.status,
      confirmed: apt.confirmed,
      smsstatus: apt.smsstatus,
      is_first_time: apt.is_first_time,
      patientId: apt.patient?.id ?? apt.patient_id,
      phone: apt.patient?.phone,
      office: apt.office?.title,
      rowTextColor: colors.text,
      rowType: eventType,
    },
  };
}

function renderEventContent(arg: EventContentArg) {
  const { confirmed, smsstatus, phone, status } = arg.event.extendedProps;
  const isListView = arg.view.type.startsWith('list');
  const bgColor = arg.event.backgroundColor;
  const normalizedStatus = Number(status);
  const isNoShow = normalizedStatus === 2;
  const isCancelled = normalizedStatus === 3;
  const isConfirmed = !isNoShow && !isCancelled && (confirmed || normalizedStatus === 1);

  // In list view, pick icon color that contrasts with row background
  const confirmedColor = '#00aeff';
  const smsColor = isListView && bgColor === '#9e9e9e' ? '#ffffff' : '#04d84e';
  const missedColor = '#ffb300';
  const cancelledColor = '#ff3b30';

  const statusEl = isConfirmed ? (
    <span style={{ display: 'inline-flex', alignItems: 'center', marginRight: 6 }}>
      <DoneAllIcon sx={{ color: confirmedColor, fontSize: 22, fontWeight: 700 }} />
    </span>
  ) : isNoShow ? (
    <span style={{ display: 'inline-flex', alignItems: 'center', marginRight: 6 }}>
      <PersonOffIcon sx={{ color: missedColor, fontSize: 21 }} />
    </span>
  ) : isCancelled ? (
    <span style={{ display: 'inline-flex', alignItems: 'center', marginRight: 6 }}>
      <EventBusyIcon sx={{ color: cancelledColor, fontSize: 21 }} />
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
          {statusEl}
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
        <div
          className="fc-event-title"
          style={{
            display: 'flex',
            alignItems: 'center',
            minWidth: 0,
            overflow: 'hidden',
          }}
        >
          {statusEl}
          <span
            style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              display: 'block',
              minWidth: 0,
              flex: 1,
            }}
          >
            {arg.event.title}
          </span>
        </div>
      </>
    );
  }

  return (
    <>
      {arg.timeText && <span className="fc-event-time">{arg.timeText} </span>}
      {statusEl}
      <span className="fc-event-title">{arg.event.title}</span>
    </>
  );
}

export default function AgendaPage() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EventClickArg | null>(null);
  const [officeId, setOfficeId] = useState<number>(0);
  const [pendingAction, setPendingAction] = useState<AppointmentAction | null>(null);
  const [notifyPatientAction, setNotifyPatientAction] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionToast, setActionToast] = useState<string | null>(null);
  const [showPreviousAppointments, setShowPreviousAppointments] = useState(false);
  const [rescheduleDialogOpen, setRescheduleDialogOpen] = useState(false);
  const [rescheduleAppointment, setRescheduleAppointment] = useState<{
    id: number;
    patient: PatientSimple | null;
    reason?: string;
  } | null>(null);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assignAppointment, setAssignAppointment] = useState<{
    patient: PatientSimple | null;
    reason?: string;
  } | null>(null);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryData, setSummaryData] = useState<LastConsultationSummary | null>(null);
  const [summaryContext, setSummaryContext] = useState<{
    patientId: number;
    patientName: string;
    reason: string;
    start: string;
  } | null>(null);

  const [dateRange, setDateRange] = useState<{ start: string; end: string } | null>(null);
  const [viewRange, setViewRange] = useState<{ start: string; end: string; viewType: string } | null>(null);
  const doctorName = useMemo(() => {
    try {
      const rawUser = localStorage.getItem('user');
      if (!rawUser) return 'Doctor';
      const user = JSON.parse(rawUser) as { name?: string };
      return user.name?.trim() || 'Doctor';
    } catch {
      return 'Doctor';
    }
  }, []);

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
    if (!viewRange) return;

    const viewStart = dayjs(viewRange.start);
    const viewEnd = dayjs(viewRange.end);
    const today = dayjs().startOf('day');

    if (viewRange.viewType.startsWith('list')) {
      const effectiveStart = showPreviousAppointments
        ? viewStart
        : (viewStart.isBefore(today) ? today : viewStart);

      if (effectiveStart.valueOf() >= viewEnd.valueOf()) {
        setAppointments([]);
        setDateRange(null);
        return;
      }

      setDateRange({
        start: effectiveStart.format('YYYY-MM-DD'),
        end: viewEnd.format('YYYY-MM-DD'),
      });
      return;
    }

    setDateRange({
      start: viewStart.format('YYYY-MM-DD'),
      end: viewEnd.format('YYYY-MM-DD'),
    });
  }, [viewRange, showPreviousAppointments]);

  useEffect(() => {
    if (dateRange) {
      loadAppointments(dateRange.start, dateRange.end);
    }
  }, [dateRange, loadAppointments]);

  const handleDatesSet = useCallback((arg: DatesSetArg) => {
    setViewRange({
      start: arg.startStr,
      end: arg.endStr,
      viewType: arg.view.type,
    });
  }, []);

  const visibleAppointments = useMemo(() => {
    const todayStart = dayjs().startOf('day');

    if (showPreviousAppointments) {
      return appointments;
    }

    return appointments.filter((appointment) => {
      const isBeforeToday = dayjs(appointment.datestart).isBefore(todayStart);
      const isCancelled = appointment.status === 3;
      return !isBeforeToday && !isCancelled;
    });
  }, [appointments, showPreviousAppointments]);

  const events = useMemo(
    () => visibleAppointments.map(appointmentToEvent),
    [visibleAppointments]
  );


  const handleEventClick = (clickInfo: EventClickArg) => {
    setSelectedEvent(clickInfo);
    setPendingAction(null);
    setNotifyPatientAction(false);
  };

  const isSelectedEventToday = selectedEvent
    ? dayjs(selectedEvent.event.start).isSame(dayjs(), 'day')
    : false;

  const handleAppointmentCreated = useCallback(() => {
    if (dateRange) {
      loadAppointments(dateRange.start, dateRange.end);
    }
  }, [dateRange, loadAppointments]);

  const handleCopyPhone = useCallback(async (phone?: string) => {
    if (!phone) return;
    try {
      await navigator.clipboard.writeText(String(phone));
    } catch (error) {
      console.error('Error copiando telefono:', error);
    }
  }, []);

  const handleCloseSelectedEvent = useCallback(() => {
    setSelectedEvent(null);
    setPendingAction(null);
    setNotifyPatientAction(false);
    setActionLoading(false);
  }, []);

  const handleOpenReschedule = useCallback(() => {
    if (!selectedEvent) return;

    const patientName = String(selectedEvent.event.title || '').trim();
    const patientNameParts = patientName.split(/\s+/);
    const currentPatient: PatientSimple | null = selectedEvent.event.extendedProps.patientId
      ? {
          id: Number(selectedEvent.event.extendedProps.patientId),
          full_name: patientName,
          name: patientNameParts[0] ?? patientName,
          last_name: patientNameParts.slice(1).join(' '),
          phone: String(selectedEvent.event.extendedProps.phone || ''),
          phone_code: '',
          full_phone: String(selectedEvent.event.extendedProps.phone || ''),
        }
      : null;

    setRescheduleAppointment({
      id: Number(selectedEvent.event.id),
      patient: currentPatient,
      reason: String(selectedEvent.event.extendedProps.reason || ''),
    });
    handleCloseSelectedEvent();
    setRescheduleDialogOpen(true);
  }, [selectedEvent, handleCloseSelectedEvent]);

  const handleOpenAssignAppointment = useCallback(() => {
    if (!selectedEvent) return;

    const patientName = String(selectedEvent.event.title || '').trim();
    const patientNameParts = patientName.split(/\s+/);
    const currentPatient: PatientSimple | null = selectedEvent.event.extendedProps.patientId
      ? {
          id: Number(selectedEvent.event.extendedProps.patientId),
          full_name: patientName,
          name: patientNameParts[0] ?? patientName,
          last_name: patientNameParts.slice(1).join(' '),
          phone: String(selectedEvent.event.extendedProps.phone || ''),
          phone_code: '',
          full_phone: String(selectedEvent.event.extendedProps.phone || ''),
        }
      : null;

    setAssignAppointment({
      patient: currentPatient,
      reason: String(selectedEvent.event.extendedProps.reason || ''),
    });
    handleCloseSelectedEvent();
    setAssignDialogOpen(true);
  }, [selectedEvent, handleCloseSelectedEvent]);

  const handleAppointmentStatusAction = useCallback(async () => {
    if (!selectedEvent || !pendingAction) return;

    const statusMap: Record<AppointmentAction, number> = {
      confirm: 1,
      no_show: 2,
      cancel: 3,
    };
    const successMessageMap: Record<AppointmentAction, string> = {
      confirm: 'Cita confirmada correctamente',
      cancel: 'Cita cancelada correctamente',
      no_show: 'Cita marcada como no asistió',
    };

    setActionLoading(true);
    try {
      await appointmentService.updateAppointment(Number(selectedEvent.event.id), {
        status: statusMap[pendingAction],
      });

      if (dateRange) {
        await loadAppointments(dateRange.start, dateRange.end);
      }

      setActionToast(successMessageMap[pendingAction]);
      handleCloseSelectedEvent();
    } catch (error) {
      console.error('Error actualizando estatus de la cita:', error);
      setActionLoading(false);
    }
  }, [selectedEvent, pendingAction, dateRange, loadAppointments, handleCloseSelectedEvent]);

  const handleOpenSummary = useCallback(async () => {
    if (!selectedEvent?.event.extendedProps.patientId) return;

    setSummaryContext({
      patientId: Number(selectedEvent.event.extendedProps.patientId),
      patientName: String(selectedEvent.event.title || ''),
      reason: String(selectedEvent.event.extendedProps.reason || 'Consulta general'),
      start: dayjs(selectedEvent.event.start).format('YYYY-MM-DD HH:mm:ss'),
    });
    setSummaryLoading(true);
    handleCloseSelectedEvent();
    setSummaryOpen(true);
    try {
      const data = await appointmentService.getLastConsultationSummary(
        Number(selectedEvent.event.extendedProps.patientId)
      );
      setSummaryData(data);
    } catch (error) {
      console.error('Error cargando resumen del paciente:', error);
      setSummaryData(null);
    } finally {
      setSummaryLoading(false);
    }
  }, [selectedEvent, handleCloseSelectedEvent]);

  const handleOpenClinicalHistory = useCallback(() => {
    const patientId =
      summaryData?.patient?.id ?? summaryContext?.patientId ?? selectedEvent?.event.extendedProps.patientId ?? null;

    if (!patientId) return;

    setSummaryOpen(false);
    navigate(`/pacientes/${Number(patientId)}?tab=history`);
  }, [navigate, selectedEvent, summaryContext, summaryData]);

  const handleOpenDailyNote = useCallback(() => {
    const patientId =
      summaryData?.patient?.id ?? summaryContext?.patientId ?? selectedEvent?.event.extendedProps.patientId ?? null;

    if (!patientId) return;

    setSummaryOpen(false);
    navigate(`/pacientes/${Number(patientId)}?tab=soap`);
  }, [navigate, selectedEvent, summaryContext, summaryData]);

  const handleEventDidMount = useCallback((info: { el: HTMLElement; event: { backgroundColor: string; textColor: string; extendedProps: Record<string, unknown> }; view: { type: string } }) => {
    if (info.view.type.startsWith('list')) {
      const row = info.el.tagName === 'TR'
        ? info.el
        : info.el.closest('tr');
      if (row && row instanceof HTMLElement) {
        const bgColor = info.event.backgroundColor;
        const textColor = (info.event.extendedProps.rowTextColor as string) || info.event.textColor || '#333';
        const rowType = (info.event.extendedProps.rowType as string) || '';
        row.style.backgroundColor = bgColor;
        row.dataset.rowType = rowType;
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

      <Box sx={{ mb: 2 }}>
        <Button
          variant="text"
          onClick={() => setShowPreviousAppointments((value) => !value)}
          sx={{
            p: 0,
            minWidth: 'auto',
            textTransform: 'none',
            textDecoration: 'underline',
            color: '#2d64c8',
            fontWeight: 400,
          }}
        >
          {showPreviousAppointments ? 'Ocultar citas previas' : 'Mostrar citas previas'}
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
              transition: 'filter 0.2s, background-color 0.2s, border-color 0.2s',
            },
            '& .fc-event:hover': {
              filter: 'brightness(0.97)',
            },
            '& .appointment-event--first-time:hover': {
              backgroundColor: `${FIRST_TIME_HOVER_BG} !important`,
              borderColor: `${FIRST_TIME_HOVER_BG} !important`,
              color: `${FIRST_TIME_TEXT} !important`,
            },
            '& .appointment-event--follow-up:hover': {
              backgroundColor: `${FOLLOW_UP_HOVER_BG} !important`,
              borderColor: `${FOLLOW_UP_HOVER_BG} !important`,
              color: `${FOLLOW_UP_TEXT} !important`,
            },
            '& .appointment-event--past:hover': {
              backgroundColor: '#8f8f8f !important',
              borderColor: '#8f8f8f !important',
              color: '#ffffff !important',
            },
            '& .fc-daygrid-event-dot': {
              borderColor: 'inherit',
            },
            '& .fc-day-today': {
              backgroundColor: 'rgba(0, 137, 123, 0.05) !important',
            },
            '& .fc-list-event:hover td': {
              filter: 'brightness(0.96)',
            },
            '& .fc-list-event[data-row-type="first-time"]:hover td, & tr.fc-list-event[data-row-type="first-time"]:hover td': {
              backgroundColor: `${FIRST_TIME_HOVER_BG} !important`,
              color: `${FIRST_TIME_TEXT} !important`,
              filter: 'none',
            },
            '& .fc-list-event[data-row-type="follow-up"]:hover td, & tr.fc-list-event[data-row-type="follow-up"]:hover td': {
              backgroundColor: `${FOLLOW_UP_HOVER_BG} !important`,
              color: `${FOLLOW_UP_TEXT} !important`,
              filter: 'none',
            },
            '& .fc-list-event[data-row-type="past"]:hover td, & tr.fc-list-event[data-row-type="past"]:hover td': {
              backgroundColor: '#8f8f8f !important',
              color: '#ffffff !important',
              filter: 'none',
            },
            '& .fc-list-event td': {
              transition: 'filter 0.2s, background-color 0.2s, color 0.2s',
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
        onClose={handleCloseSelectedEvent}
        maxWidth="xs"
        fullWidth
        sx={{
          '& .MuiDialog-container': {
            alignItems: 'flex-start',
            pt: '4vh',
          },
        }}
        PaperProps={{
          sx: {
            borderRadius: 2,
            overflow: 'hidden',
          },
        }}
      >
        <DialogContent>
          {selectedEvent && (
            <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                <Typography
                  sx={{
                    color: '#2d64c8',
                    fontSize: '1rem',
                    fontWeight: 500,
                    textAlign: 'center',
                    flex: 1,
                  }}
                >
                  {doctorName}
                </Typography>
                <IconButton
                  onClick={handleCloseSelectedEvent}
                  size="small"
                  sx={{ ml: 1, color: '#b3b3b3' }}
                >
                  <CloseIcon />
                </IconButton>
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Typography sx={{ fontSize: '0.95rem', color: '#4b5b6b' }}>
                  Paciente: {selectedEvent.event.title}
                </Typography>
                <Typography sx={{ fontSize: '0.95rem', color: '#4b5b6b' }}>
                  Fecha de la cita: {`${dayjs(selectedEvent.event.start).format('dddd, DD/MMM HH:mm')} hrs`}
                </Typography>
                <Typography sx={{ fontSize: '0.95rem', color: '#4b5b6b' }}>
                  Motivo de la consulta: {String(selectedEvent.event.extendedProps.reason || 'Consulta general')}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                <Typography sx={{ fontSize: '0.95rem', color: '#4b5b6b' }}>
                  Celular: {String(selectedEvent.event.extendedProps.phone || '-')}
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => handleCopyPhone(String(selectedEvent.event.extendedProps.phone || ''))}
                  sx={{
                    border: '1px solid #49c5ff',
                    borderRadius: 1,
                    color: '#49c5ff',
                    width: 42,
                    height: 36,
                  }}
                >
                  <ContentCopyIcon sx={{ fontSize: 18 }} />
                </IconButton>
                <IconButton
                  size="small"
                  sx={{
                    borderRadius: 1,
                    backgroundColor: '#4caf50',
                    color: '#ffffff',
                    width: 42,
                    height: 36,
                    '&:hover': {
                      backgroundColor: '#43a047',
                    },
                  }}
                >
                  <PhoneIcon sx={{ fontSize: 18 }} />
                </IconButton>
                <Button
                  variant="text"
                  sx={{
                    minWidth: 'auto',
                    p: 0,
                    color: '#666',
                    textDecoration: 'underline',
                    textTransform: 'none',
                  }}
                >
                  ..más
                </Button>
              </Box>

              {!pendingAction && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.2 }}>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<CheckCircleIcon />}
                    onClick={() => setPendingAction('confirm')}
                    sx={{
                      borderColor: '#50c65b',
                      color: '#50c65b',
                      py: 0.9,
                      fontWeight: 500,
                    }}
                  >
                    CONFIRMAR CITA
                  </Button>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<CancelOutlinedIcon />}
                    onClick={() => setPendingAction('cancel')}
                    sx={{
                      borderColor: '#ff4f42',
                      color: '#ff4f42',
                      py: 0.9,
                      fontWeight: 500,
                    }}
                  >
                    CANCELAR CITA
                  </Button>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<CalendarMonthIcon />}
                    onClick={handleOpenReschedule}
                    sx={{
                      borderColor: '#50c65b',
                      color: '#50c65b',
                      py: 0.9,
                      fontWeight: 500,
                    }}
                  >
                    REPROGRAMAR CITA
                  </Button>
                  {isSelectedEventToday && (
                    <Button
                      fullWidth
                      variant="outlined"
                      startIcon={<CalendarMonthIcon />}
                      onClick={handleOpenAssignAppointment}
                      sx={{
                        borderColor: '#27c3ff',
                        color: '#00b8f0',
                        py: 0.9,
                        fontWeight: 500,
                      }}
                    >
                      ASIGNAR NUEVA CITA
                    </Button>
                  )}
                  {isSelectedEventToday && (
                    <Button
                      fullWidth
                      variant="outlined"
                      startIcon={<EventBusyIcon sx={{ color: '#ffb300', fontSize: 22 }} />}
                      onClick={() => setPendingAction('no_show')}
                      sx={{
                        borderColor: '#ffb300',
                        color: '#ffb300',
                        py: 0.9,
                        fontWeight: 500,
                        '& .MuiButton-startIcon': {
                          color: '#ffb300',
                        },
                      }}
                    >
                      NO ASISTIÓ
                    </Button>
                  )}
                </Box>
              )}

              {pendingAction && (
                <Box sx={{ pt: 0.5, display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                  <Typography
                    sx={{
                      textAlign: 'center',
                      color:
                        pendingAction === 'confirm'
                          ? '#50c65b'
                          : pendingAction === 'cancel'
                            ? '#ff4f42'
                            : '#ff9800',
                      fontSize: '1rem',
                    }}
                  >
                    {pendingAction === 'confirm'
                      ? '¿El paciente asistirá a la cita?'
                      : pendingAction === 'cancel'
                        ? '¿Deseas cancelar la cita?'
                        : '¿Confirmas que el paciente no asistió?'}
                  </Typography>

                  <Button
                    fullWidth
                    variant="contained"
                    onClick={handleAppointmentStatusAction}
                    disabled={actionLoading}
                    sx={{
                      py: 1,
                      fontWeight: 700,
                      backgroundColor:
                        pendingAction === 'confirm'
                          ? '#4caf50'
                          : pendingAction === 'cancel'
                            ? '#ff4f42'
                            : '#ff9800',
                      '&:hover': {
                        backgroundColor:
                          pendingAction === 'confirm'
                            ? '#43a047'
                            : pendingAction === 'cancel'
                              ? '#f44336'
                              : '#fb8c00',
                      },
                    }}
                  >
                    {actionLoading ? (
                      <CircularProgress size={22} sx={{ color: '#fff' }} />
                    ) : pendingAction === 'confirm' ? (
                      'SI, CONFIRMAR'
                    ) : pendingAction === 'cancel' ? (
                      'SI, CANCELAR'
                    ) : (
                      'SI, MARCAR NO ASISTIÓ'
                    )}
                  </Button>

                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={notifyPatientAction}
                        onChange={(event) => setNotifyPatientAction(event.target.checked)}
                        size="small"
                        sx={{ py: 0.5 }}
                      />
                    }
                    label="Notificar al paciente (WhatsApp o SMS)"
                    sx={{
                      alignSelf: 'center',
                      color: '#5f6b75',
                      '& .MuiFormControlLabel-label': {
                        fontSize: '0.95rem',
                      },
                    }}
                  />
                </Box>
              )}

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                <Typography sx={{ fontSize: '0.88rem', color: '#5f6b75' }}>
                  *Se va a realizar la acción indicada al paciente: {selectedEvent.event.title}
                </Typography>
                <Button
                  variant="text"
                  sx={{
                    alignSelf: 'flex-start',
                    minWidth: 'auto',
                    p: 0,
                    color: '#6f7680',
                    textDecoration: 'underline',
                    textTransform: 'none',
                  }}
                >
                  ..datos de la cita
                </Button>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 1 }}>
                <Button
                  variant="contained"
                  onClick={handleCloseSelectedEvent}
                  sx={{
                    backgroundColor: '#8c8c8c',
                    '&:hover': { backgroundColor: '#7c7c7c' },
                    minWidth: 92,
                  }}
                >
                  SALIR
                </Button>
                <Button
                  variant="contained"
                  onClick={handleOpenSummary}
                  sx={{
                    backgroundColor: '#66d2ff',
                    '&:hover': { backgroundColor: '#52c7fb' },
                    minWidth: 106,
                  }}
                >
                  RESUMEN
                </Button>
              </Box>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      <Snackbar
        open={!!actionToast}
        autoHideDuration={3000}
        onClose={() => setActionToast(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        sx={{ mt: 2 }}
      >
        <Alert
          onClose={() => setActionToast(null)}
          severity="success"
          variant="filled"
          sx={{
            minWidth: { xs: '90vw', sm: 520 },
            boxShadow: 3,
            alignItems: 'center',
            '& .MuiAlert-message': {
              fontSize: '1rem',
              fontWeight: 500,
            },
          }}
        >
          {actionToast}
        </Alert>
      </Snackbar>

      <Dialog
        open={summaryOpen}
        onClose={() => setSummaryOpen(false)}
        maxWidth="sm"
        fullWidth
        sx={{
          '& .MuiDialog-container': {
            alignItems: 'flex-start',
            pt: '3vh',
          },
        }}
        PaperProps={{
          sx: {
            borderRadius: 2,
          },
        }}
      >
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
              <Typography
                sx={{
                  flex: 1,
                  textAlign: 'center',
                  fontSize: '1.05rem',
                  color: '#4b5b6b',
                  fontWeight: 500,
                }}
              >
                Resumen del paciente
              </Typography>
              <IconButton onClick={() => setSummaryOpen(false)} size="small" sx={{ color: '#b3b3b3' }}>
                <CloseIcon />
              </IconButton>
            </Box>

            {summaryLoading ? (
              <Box sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
                <CircularProgress />
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Typography sx={{ fontSize: '0.95rem', color: '#707b86' }}>
                  Hora asignada de consulta: {summaryContext ? `${dayjs(summaryContext.start).format('dddd, DD/MMM/YYYY HH:mm')} hrs` : '-'}
                </Typography>

                <Typography sx={{ fontSize: '0.95rem', color: '#5b6772' }}>
                  Paciente: {summaryData?.patient.full_name || summaryContext?.patientName || '-'}
                </Typography>

                <Typography sx={{ fontSize: '0.95rem', color: '#5b6772' }}>
                  Edad: {summaryData?.patient.age_text || '-'}
                </Typography>

                <Typography sx={{ fontSize: '0.95rem', color: '#5b6772' }}>
                  Motivo de la consulta: {summaryContext?.reason || '-'}
                </Typography>

                <Box sx={{ borderTop: '2px solid #355bb0', pt: 2 }}>
                  <Typography sx={{ textAlign: 'center', color: '#707b86', fontSize: '1rem' }}>
                    {'Informaci\u00f3n de la \u00faltima consulta:'}
                  </Typography>
                  <Typography sx={{ textAlign: 'center', color: '#5b6772', fontSize: '0.95rem', mt: 0.5 }}>
                    {summaryData?.last_consultation?.created_at
                      ? dayjs(summaryData.last_consultation.created_at).format('dddd, DD [de] MMMM YYYY')
                      : 'Sin consultas previas'}
                  </Typography>
                </Box>

                <Typography sx={{ fontSize: '0.95rem', color: '#5b6772', lineHeight: 1.55 }}>
                  {'Diagn\u00f3stico: '}{summaryData?.last_consultation?.diagnostic_text || 'Sin diagn\u00f3stico registrado'}
                </Typography>

                <Typography sx={{ fontSize: '0.95rem', color: '#5b6772', lineHeight: 1.55 }}>
                  Medicamentos recetados: {summaryData?.last_consultation?.medicament_text || 'Sin medicamentos registrados'}
                </Typography>

                <Typography sx={{ fontSize: '0.95rem', color: '#d32f2f', lineHeight: 1.55 }}>
                  {'An\u00e1lisis: '}{summaryData?.last_consultation?.notes || 'Sin an\u00e1lisis registrados'}
                </Typography>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 1, gap: 1.5 }}>
                  <Button
                    variant="contained"
                    onClick={() => setSummaryOpen(false)}
                    sx={{
                      backgroundColor: '#8c8c8c',
                      '&:hover': { backgroundColor: '#7c7c7c' },
                      minWidth: 92,
                    }}
                  >
                    CERRAR
                  </Button>
                  <Button
                    variant="contained"
                    onClick={handleOpenClinicalHistory}
                    sx={{
                      backgroundColor: '#e91e63',
                      '&:hover': { backgroundColor: '#d81b60' },
                      minWidth: 140,
                    }}
                  >
                    {'HISTORIA CL\u00cdNICA'}
                  </Button>
                  <Button
                    variant="contained"
                    onClick={handleOpenDailyNote}
                    sx={{
                      backgroundColor: '#e91e63',
                      '&:hover': { backgroundColor: '#d81b60' },
                      minWidth: 140,
                    }}
                  >
                    NUEVA CONSULTA
                  </Button>
                </Box>
              </Box>
            )}
          </Box>
        </DialogContent>
      </Dialog>

      {/* Dialog: Nueva cita (wizard) */}
      <NewAppointmentDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        officeId={officeId}
        onAppointmentCreated={handleAppointmentCreated}
      />
      <NewAppointmentDialog
        open={rescheduleDialogOpen}
        onClose={() => {
          setRescheduleDialogOpen(false);
          setRescheduleAppointment(null);
        }}
        officeId={officeId}
        onAppointmentCreated={() => {
          handleAppointmentCreated();
          setRescheduleDialogOpen(false);
          setRescheduleAppointment(null);
        }}
        mode="reschedule"
        appointmentId={rescheduleAppointment?.id}
        initialPatient={rescheduleAppointment?.patient ?? null}
        initialReason={rescheduleAppointment?.reason ?? ''}
      />
      <NewAppointmentDialog
        open={assignDialogOpen}
        onClose={() => {
          setAssignDialogOpen(false);
          setAssignAppointment(null);
        }}
        officeId={officeId}
        onAppointmentCreated={() => {
          handleAppointmentCreated();
          setAssignDialogOpen(false);
          setAssignAppointment(null);
        }}
        mode="assign"
        initialPatient={assignAppointment?.patient ?? null}
        initialReason={assignAppointment?.reason ?? ''}
      />
    </Box>
  );
}
