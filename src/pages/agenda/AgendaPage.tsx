import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useRef } from 'react';
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
  Stack,
  TextField,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
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
import { patientService } from '../../api/patientService';
import type { Appointment, PatientSimple, Office, ActivityLogItem, LastConsultationSummary } from '../../types';
import ActivityLogTimeline from '../../components/activity/ActivityLogTimeline';
import dayjs from 'dayjs';
import NewAppointmentDialog from './NewAppointmentDialog';
import { useAuth } from '../../hooks/useAuth';
import ClickableDateField from '../../components/ClickableDateField';

const FIRST_TIME_BG = 'rgb(195 236 255)';
const FIRST_TIME_HOVER_BG = 'rgb(176 229 255)';
const FIRST_TIME_TEXT = 'rgb(51, 51, 51)';
const FOLLOW_UP_BG = '#A8FBBD';
const FOLLOW_UP_HOVER_BG = '#92f5ac';
const FOLLOW_UP_TEXT = '#333333';

type AppointmentAction = 'confirm' | 'cancel' | 'no_show';

const appointmentStatusLabels: Record<number, string> = {
  0: 'Pendiente de confirmar',
  1: 'Confirmada',
  2: 'No asistió',
  3: 'Cancelada',
  4: 'Reprogramada',
};

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
  const isCancelled = Number(apt.status) === 3;

  if (end.isBefore(now) || isCancelled) {
    return { bg: 'rgb(189 189 189)', text: '#ffffff' };
  }
  if (apt.is_first_time) {
    return { bg: FIRST_TIME_BG, text: FIRST_TIME_TEXT };
  }
  return { bg: FOLLOW_UP_BG, text: FOLLOW_UP_TEXT };
}

function getAppointmentStatusLabel(value: unknown): string {
  const numericValue = Number(value);
  if (!Number.isNaN(numericValue) && appointmentStatusLabels[numericValue]) {
    return appointmentStatusLabels[numericValue];
  }

  return String(value ?? '-');
}

function getReadableAgeText(value?: string | null): string {
  const raw = String(value ?? '').trim();
  if (!raw) return '-';

  if (!/[ÃƒÃ‚Ã¢]/.test(raw)) {
    return raw;
  }

  const firstNumber = raw.match(/\d{1,3}/)?.[0];
  if (!firstNumber) {
    return '-';
  }

  return `${firstNumber} a\u00f1os`;
}

function appointmentToEvent(apt: Appointment): EventInput {
  const patientName = apt.patient
    ? `${toPascalCaseName(apt.patient.name)} ${toPascalCaseName(apt.patient.last_name)}`.trim()
    : `Paciente #${apt.patient_id}`;

  const colors = getEventColors(apt);
  const isPast = dayjs(apt.dateend).isBefore(dayjs());
  const isCancelled = Number(apt.status) === 3;
  const eventType = isPast || isCancelled ? 'past' : apt.is_first_time ? 'first-time' : 'follow-up';

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
      smscode: apt.smscode,
      confirmed: apt.confirmed,
      confirmation_whatsapp_status: apt.confirmation_whatsapp_status,
      is_first_time: apt.is_first_time,
      history_form_required: apt.history_form_required,
      patientId: apt.patient?.id ?? apt.patient_id,
      phone: apt.patient?.phone,
      office: apt.office?.title,
      rowTextColor: colors.text,
      rowType: eventType,
    },
  };
}

function renderEventContent(arg: EventContentArg) {
  const { confirmed, confirmation_whatsapp_status, phone, status } = arg.event.extendedProps;
  const isListView = arg.view.type.startsWith('list');
  const bgColor = arg.event.backgroundColor;
  const normalizedStatus = Number(status);
  const isNoShow = normalizedStatus === 2;
  const isCancelled = normalizedStatus === 3;
  const isConfirmed = !isNoShow && !isCancelled && (confirmed || normalizedStatus === 1);
  const hasConfirmationNotification = Number(confirmation_whatsapp_status ?? 0) === 2;

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
  ) : hasConfirmationNotification ? (
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
  const location = useLocation();
  const { can } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isShortViewport = useMediaQuery('(max-height:650px)');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EventClickArg | null>(null);
  const [officeId, setOfficeId] = useState<number>(0);
  const [pendingAction, setPendingAction] = useState<AppointmentAction | null>(null);
  const [notifyPatientAction, setNotifyPatientAction] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionToast, setActionToast] = useState<string | null>(null);
  const [showPreviousAppointments, setShowPreviousAppointments] = useState(false);
  const [showOfficeActivityLogs, setShowOfficeActivityLogs] = useState(false);
  const [appliedPatientSearch, setAppliedPatientSearch] = useState('');
  const calendarRef = useRef<FullCalendar | null>(null);
  const patientSearchInputRef = useRef<HTMLInputElement | null>(null);
  const patientSearchDraftRef = useRef('');
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
  const [showAppointmentDetails, setShowAppointmentDetails] = useState(false);
  const [showAppointmentMore, setShowAppointmentMore] = useState(false);
  const [appointmentActivityLogs, setAppointmentActivityLogs] = useState<ActivityLogItem[]>([]);
  const [appointmentActivityLogsHasMore, setAppointmentActivityLogsHasMore] = useState(false);
  const [appointmentActivityLogsNextBefore, setAppointmentActivityLogsNextBefore] = useState<string | null>(null);
  const [appointmentActivityLogsLoadingMore, setAppointmentActivityLogsLoadingMore] = useState(false);
  const [activityLogsLoading, setActivityLogsLoading] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryData, setSummaryData] = useState<LastConsultationSummary | null>(null);
  const [selectedPatientRecord, setSelectedPatientRecord] = useState<Appointment['patient'] & { birth_date?: string; age?: number | string } | null>(null);
  const [birthEditorOpen, setBirthEditorOpen] = useState(false);
  const [birthEditorValue, setBirthEditorValue] = useState('');
  const [birthSaving, setBirthSaving] = useState(false);
  const [reasonEditorOpen, setReasonEditorOpen] = useState(false);
  const [reasonSaving, setReasonSaving] = useState(false);
  const reasonInputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  const [dateRange, setDateRange] = useState<{ start: string; end: string } | null>(null);
  const [viewRange, setViewRange] = useState<{ start: string; end: string; viewType: string } | null>(null);

  useEffect(() => {
    if (!actionToast) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setActionToast(null);
    }, 2000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [actionToast]);

  const canViewPatientSummary = can('agenda.patient_summary');
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
      setOffices(offices);
      if (offices.length > 0) {
        setOfficeId(offices[0].id);
      }
    }).catch((err) => console.error('Error loading offices:', err));
  }, []);

  const selectedOfficeNotificationPreferences = useMemo(() => {
    const selectedOffice = offices.find((office) => office.id === officeId);
    return selectedOffice?.notification_preferences ?? {};
  }, [officeId, offices]);

  const cancelNotificationDefault = Boolean(
    selectedOfficeNotificationPreferences.cancelacion_cita_paciente
  );
  const confirmNotificationDefault = Boolean(
    selectedOfficeNotificationPreferences.confirmacion_cita
  );
  const newAppointmentNotificationDefault = Boolean(
    selectedOfficeNotificationPreferences.nueva_cita
  );
  const newAppointmentDefaultGender = useMemo(() => {
    const selectedOffice = offices.find((office) => office.id === officeId);
    return selectedOffice?.new_appointment_default_gender ?? '';
  }, [officeId, offices]);
  const newAppointmentConsultationReasons = useMemo(() => {
    const selectedOffice = offices.find((office) => office.id === officeId);
    return selectedOffice?.consultation_reasons ?? [];
  }, [officeId, offices]);
  const newAppointmentBaseMinutes = useMemo(() => {
    const selectedOffice = offices.find((office) => office.id === officeId);
    const firsttime = selectedOffice?.firsttime ?? 0;
    const recurrent = selectedOffice?.recurrent ?? 0;
    return Math.max(firsttime, recurrent, 50);
  }, [officeId, offices]);

  useEffect(() => {
    const resetToken = (location.state as { sidebarResetAt?: number } | null)?.sidebarResetAt;
    if (!resetToken) return;

    setShowPreviousAppointments(false);
    setShowOfficeActivityLogs(false);
    setAppliedPatientSearch('');
    patientSearchDraftRef.current = '';
    if (patientSearchInputRef.current) {
      patientSearchInputRef.current.value = '';
    }
    setDialogOpen(false);
    setSelectedEvent(null);
    setPendingAction(null);
    setNotifyPatientAction(false);
    setActionLoading(false);
    setActionToast(null);
    setRescheduleDialogOpen(false);
    setRescheduleAppointment(null);
    setAssignDialogOpen(false);
    setAssignAppointment(null);
    setShowAppointmentDetails(false);
    setShowAppointmentMore(false);
    setAppointmentActivityLogs([]);
    setAppointmentActivityLogsHasMore(false);
    setAppointmentActivityLogsNextBefore(null);
    setAppointmentActivityLogsLoadingMore(false);
    setActivityLogsLoading(false);
    setSummaryOpen(false);
    setSummaryLoading(false);
    setSummaryData(null);
  }, [location.state]);

  const loadAppointments = useCallback(async (startDate: string, endDate: string) => {
    setLoading(true);
    try {
      const data = await appointmentService.getAppointmentsByRange(startDate, endDate, appliedPatientSearch);
      setAppointments(data);
    } catch (err) {
      console.error('Error cargando citas:', err);
    } finally {
      setLoading(false);
    }
  }, [appliedPatientSearch]);

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
    setShowAppointmentDetails(false);
    setShowAppointmentMore(false);
    setAppointmentActivityLogs([]);
    setAppointmentActivityLogsHasMore(false);
    setAppointmentActivityLogsNextBefore(null);
    setAppointmentActivityLogsLoadingMore(false);
  };

  const isSelectedEventToday = selectedEvent
    ? dayjs(selectedEvent.event.start).isSame(dayjs(), 'day')
    : false;
  const selectedEventStatus = Number(selectedEvent?.event.extendedProps.status ?? -1);
  const selectedEventIsConfirmed = Boolean(
    selectedEvent
    && selectedEventStatus !== 2
    && selectedEventStatus !== 3
    && (selectedEvent.event.extendedProps.confirmed || selectedEventStatus === 1)
  );
  const canConfirmSelectedEvent = selectedEvent
    ? !selectedEventIsConfirmed && dayjs(selectedEvent.event.start).startOf('day').diff(dayjs().startOf('day'), 'day') < 3
    : false;
  const selectedEventCanNotifyPatient = Boolean(
    String(selectedEvent?.event.extendedProps.phone ?? '').trim()
  );

  const handleAppointmentCreated = useCallback(() => {
    if (dateRange) {
      loadAppointments(dateRange.start, dateRange.end);
    }
  }, [dateRange, loadAppointments]);

  const handleCopyPhone = useCallback(async (phone?: string) => {
    if (!phone) return;
    try {
      await navigator.clipboard.writeText(String(phone));
      setActionToast('Información copiada');
    } catch (error) {
      console.error('Error copiando telefono:', error);
    }
  }, []);

  const handleSaveBirthDate = useCallback(async () => {
    if (!selectedPatientRecord?.id) return;

    setBirthSaving(true);
    try {
      const updatedPatient = await patientService.updatePatient(selectedPatientRecord.id, {
        name: selectedPatientRecord.name,
        last_name: selectedPatientRecord.last_name,
        phone: selectedPatientRecord.phone,
        birth: birthEditorValue || '',
        gender: undefined,
        allergy: undefined,
      });

      setSelectedPatientRecord((prev) => prev ? {
        ...prev,
        birth_date: updatedPatient.birth_date,
        age: updatedPatient.age,
      } : prev);
      setBirthEditorValue(String(updatedPatient.birth_date ?? ''));
      setBirthEditorOpen(false);
      setActionToast('Fecha de nacimiento actualizada');
    } catch (error) {
      console.error('Error actualizando fecha de nacimiento:', error);
      setActionToast('No se pudo actualizar la fecha de nacimiento');
    } finally {
      setBirthSaving(false);
    }
  }, [birthEditorValue, selectedPatientRecord]);

  const handleSaveAppointmentReason = useCallback(async () => {
    if (!selectedEvent) return;

    setReasonSaving(true);
    try {
      const nextReason = String(reasonInputRef.current?.value ?? '').trim();
      await appointmentService.updateAppointment(Number(selectedEvent.event.id), {
        reason: nextReason,
      });

      selectedEvent.event.setExtendedProp('reason', nextReason);
      setReasonEditorOpen(false);
      setActionToast('Motivo actualizado');
    } catch (error) {
      console.error('Error actualizando motivo de la cita:', error);
      setActionToast('No se pudo actualizar el motivo');
    } finally {
      setReasonSaving(false);
    }
  }, [selectedEvent]);

  const handleCloseSelectedEvent = useCallback(() => {
    setSelectedEvent(null);
    setSelectedPatientRecord(null);
    setBirthEditorOpen(false);
    setBirthEditorValue('');
    setBirthSaving(false);
    setReasonEditorOpen(false);
    setReasonSaving(false);
    setPendingAction(null);
    setNotifyPatientAction(false);
    setActionLoading(false);
    setShowAppointmentDetails(false);
    setShowAppointmentMore(false);
    setAppointmentActivityLogs([]);
  }, []);

  const doctorSpecialty = useMemo(() => {
    try {
      const rawUser = localStorage.getItem('user');
      if (!rawUser) return 'Sin especialidad';
      const user = JSON.parse(rawUser) as { specialty?: string };
      return user.specialty?.trim() || 'Sin especialidad';
    } catch {
      return 'Sin especialidad';
    }
  }, []);

  useEffect(() => {
    const patientId = Number(selectedEvent?.event.extendedProps.patientId ?? 0);
    if (!patientId) {
      setSelectedPatientRecord(null);
      return;
    }

    let cancelled = false;
    void patientService.getPatient(patientId)
      .then((patient) => {
        if (cancelled) return;
        setSelectedPatientRecord({
          id: patient.id,
          name: patient.name,
          last_name: patient.last_name,
          phone: patient.phone,
          email: patient.email,
          birth_date: patient.birth_date,
          age: patient.age,
        });
        setBirthEditorValue(String(patient.birth_date ?? ''));
      })
      .catch((error) => {
        if (!cancelled) {
          console.error('Error cargando paciente para agenda:', error);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedEvent]);

  const handleCopyAppointmentDetails = useCallback(async () => {
    if (!selectedEvent) return;

    const selectedOffice = offices.find((office) => office.id === officeId);
    const patientName = String(selectedEvent.event.title || '').trim() || 'Paciente';
    const appointmentDate = dayjs(selectedEvent.event.start).format('dddd, DD/MMM/YYYY');
    const appointmentTime = `${dayjs(selectedEvent.event.start).format('HH:mm')} hrs`;
    const address = selectedOffice
      ? [selectedOffice.address, selectedOffice.suburb].filter(Boolean).join(' ')
      : 'Consultorio';
    const officePhone = selectedOffice?.phone ? ` Tel: ${selectedOffice.phone}` : '';

    const text = [
      'Datos de la cita',
      `Paciente: ${patientName}`,
      `Fecha de la cita: ${appointmentDate}`,
      `Hora de la cita: ${appointmentTime}`,
      `Médico: ${doctorName}`,
      `Especialidad: ${doctorSpecialty}`,
      `Dirección: ${address}${officePhone}`,
    ].join('\n');

    try {
      await navigator.clipboard.writeText(text);
      setActionToast('Información copiada');
      handleCloseSelectedEvent();
    } catch (error) {
      console.error('Error copiando datos de la cita:', error);
    }
  }, [doctorName, doctorSpecialty, handleCloseSelectedEvent, officeId, offices, selectedEvent]);

  const handleCopyHistoryFormLink = useCallback(async () => {
    if (!selectedEvent) return;

    const smscode = String(selectedEvent.event.extendedProps.smscode || '').trim();
    if (!smscode) return;

    const baseUrl = (import.meta.env.VITE_PUBLIC_APP_BASE_URL as string | undefined)?.trim() || 'https://lisamedic.com';
    const historyLink = `${baseUrl.replace(/\/$/, '')}/wsapp/${smscode}`;

    try {
      await navigator.clipboard.writeText(historyLink);
      setActionToast('Información copiada');
    } catch (error) {
      console.error('Error copiando enlace de historia clínica:', error);
    }
  }, [selectedEvent]);

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
        notify_patient:
          pendingAction === 'confirm' || pendingAction === 'cancel'
            ? (selectedEventCanNotifyPatient ? notifyPatientAction : false)
            : false,
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
  }, [selectedEvent, pendingAction, notifyPatientAction, selectedEventCanNotifyPatient, dateRange, loadAppointments, handleCloseSelectedEvent]);

  const handleOpenAppointmentMore = useCallback(async () => {
    if (!selectedEvent) return;

    setShowAppointmentMore(true);
    setShowAppointmentDetails(false);
    setActivityLogsLoading(true);

    try {
      const logs = await appointmentService.getAppointmentActivityLogs(Number(selectedEvent.event.id), { days: 7 });
      setAppointmentActivityLogs(logs.logs);
      setAppointmentActivityLogsHasMore(logs.hasMore);
      setAppointmentActivityLogsNextBefore(logs.nextBefore);
    } catch (error) {
      console.error('Error cargando historial de movimientos de la cita:', error);
      setAppointmentActivityLogs([]);
      setAppointmentActivityLogsHasMore(false);
      setAppointmentActivityLogsNextBefore(null);
    } finally {
      setActivityLogsLoading(false);
    }
  }, [selectedEvent]);

  const handleLoadMoreAppointmentActivityLogs = useCallback(async () => {
    if (!selectedEvent || !appointmentActivityLogsNextBefore || appointmentActivityLogsLoadingMore) {
      return;
    }

    setAppointmentActivityLogsLoadingMore(true);

    try {
      const data = await appointmentService.getAppointmentActivityLogs(Number(selectedEvent.event.id), {
        days: 7,
        before: appointmentActivityLogsNextBefore,
      });
      setAppointmentActivityLogs((current) => [...current, ...data.logs]);
      setAppointmentActivityLogsHasMore(data.hasMore);
      setAppointmentActivityLogsNextBefore(data.nextBefore);
    } catch (error) {
      console.error('Error cargando mas movimientos de la cita:', error);
    } finally {
      setAppointmentActivityLogsLoadingMore(false);
    }
  }, [appointmentActivityLogsLoadingMore, appointmentActivityLogsNextBefore, selectedEvent]);

  const handleOpenPatientLogbook = useCallback(() => {
    const patientId = selectedEvent?.event.extendedProps.patientId;
    if (!patientId) return;

    handleCloseSelectedEvent();
    navigate(`/pacientes/${Number(patientId)}?tab=bitacora`);
  }, [handleCloseSelectedEvent, navigate, selectedEvent]);

  const handleOpenSummary = useCallback(async () => {
    if (!canViewPatientSummary) return;

    const patientId = Number(selectedEvent?.event.extendedProps.patientId ?? 0);
    if (!patientId) return;

    setSummaryOpen(true);
    setSummaryLoading(true);
    setSummaryData(null);
    handleCloseSelectedEvent();

    try {
      const data = await appointmentService.getLastConsultationSummary(patientId);
      setSummaryData(data);
    } catch (error) {
      console.error('Error cargando resumen del paciente:', error);
      setSummaryData(null);
    } finally {
      setSummaryLoading(false);
    }
  }, [canViewPatientSummary, handleCloseSelectedEvent, selectedEvent]);

  const handleOpenPatientHistoryFromSummary = useCallback(() => {
    const patientId = Number(summaryData?.patient.id ?? selectedEvent?.event.extendedProps.patientId ?? 0);
    if (!patientId) return;

    setSummaryOpen(false);
    navigate(`/pacientes/${patientId}?tab=history`);
  }, [navigate, selectedEvent, summaryData]);

  const handleOpenNewConsultationFromSummary = useCallback(() => {
    const patientId = Number(summaryData?.patient.id ?? selectedEvent?.event.extendedProps.patientId ?? 0);
    if (!patientId) return;

    setSummaryOpen(false);
    navigate(`/pacientes/${patientId}?tab=soap`);
  }, [navigate, selectedEvent, summaryData]);

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
          (cell as HTMLElement).style.backgroundColor = bgColor;
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
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
            {showPreviousAppointments
              ? 'Ocultar citas previas'
              : isMobile
                ? 'Citas previas'
                : 'Mostrar citas previas'}
          </Button>
          <Box sx={{ flex: 1 }} />
            <Button
              variant="text"
              onClick={() => {
                setShowOfficeActivityLogs((value) => !value);
              }}
            sx={{
              p: 0,
              minWidth: 'auto',
              textTransform: 'none',
              textDecoration: 'underline',
              color: '#2d64c8',
              fontWeight: 400,
            }}
          >
            {showOfficeActivityLogs ? 'Ocultar bitácora' : 'Bitácora'}
          </Button>
        </Box>
        <Box sx={{ mt: 1.25, width: '100%', maxWidth: 640 }}>
          <TextField
            fullWidth
            size="small"
            label="Buscar pacientes agendados"
            inputRef={patientSearchInputRef}
            defaultValue=""
            onChange={(event) => {
              patientSearchDraftRef.current = event.target.value;
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                setAppliedPatientSearch(patientSearchDraftRef.current.trim());
              }
            }}
          />
          {appliedPatientSearch ? (
            <Button
              variant="text"
              onClick={() => {
                setAppliedPatientSearch('');
                patientSearchDraftRef.current = '';
                if (patientSearchInputRef.current) {
                  patientSearchInputRef.current.value = '';
                }
                calendarRef.current?.getApi().today();
              }}
              sx={{
                mt: 0.5,
                p: 0,
                minWidth: 'auto',
                textTransform: 'none',
                textDecoration: 'underline',
                color: '#ef6c00',
                fontWeight: 400,
              }}
            >
              Restablecer búsqueda
            </Button>
          ) : null}
        </Box>
        {showOfficeActivityLogs ? (
          <Box
            sx={{
              mt: 1.5,
              p: 1.5,
              borderRadius: 2,
              backgroundColor: '#f8fbfd',
              border: '1px solid #dde8ef',
            }}
          >
            <ActivityLogTimeline
              emptyText="Aún no hay movimientos recientes en este consultorio."
              showPatient
              loadLogs={({ dayKey, before, limit }) =>
                appointmentService.getGlobalActivityLogs({
                  officeId,
                  days: 30,
                  before: before ?? `${dayKey}T23:59:59`,
                  limit,
                })
              }
            />
          </Box>
        ) : null}
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
               backgroundColor: 'rgb(189 189 189) !important',
               borderColor: 'rgb(189 189 189) !important',
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
               backgroundColor: 'rgb(189 189 189) !important',
               color: '#ffffff !important',
              filter: 'none',
            },
            '& .fc-list-event td': {
              transition: 'filter 0.2s, background-color 0.2s, color 0.2s',
            },
          }}
        >
          <FullCalendar
            ref={calendarRef}
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
            pt: isShortViewport ? { xs: '10px', sm: '2px' } : { xs: '14px', sm: '6px' },
          },
          '& .MuiDialog-paper': {
            width: isMobile ? 'calc(100vw - 8px)' : undefined,
            maxWidth: isMobile ? 'calc(100vw - 8px)' : 444,
            margin: isMobile
              ? (isShortViewport ? '10px 4px 4px' : '14px 4px 4px')
              : (isShortViewport ? '8px auto 24px' : '60px auto 32px'),
          },
        }}
        PaperProps={{
          sx: {
            borderRadius: { xs: 1.5, sm: 2 },
            overflow: 'hidden',
          },
        }}
      >
        <DialogContent
          sx={{
            px: 0,
            py: 0,
            display: 'flex',
            flexDirection: 'column',
            maxHeight: { xs: 'calc(100vh - 24px)', sm: 'calc(100vh - 96px)' },
          }}
        >
          {selectedEvent && (
            <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <Box
                  sx={{
                    px: { xs: isShortViewport ? 1.25 : 1.5, sm: isShortViewport ? 2 : 3 },
                    py: { xs: isShortViewport ? 0.9 : 1.25, sm: isShortViewport ? 1.25 : 2 },
                    pt: { xs: isShortViewport ? 0.25 : 0.5, sm: isShortViewport ? 0.5 : 1 },
                    display: 'flex',
                    flexDirection: 'column',
                    gap: { xs: isShortViewport ? 0.8 : 1.25, sm: isShortViewport ? 1.1 : 2 },
                    overflowY: 'auto',
                    minHeight: 0,
                  }}
                >
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
                  {showAppointmentMore
                    ? `Movimientos de la cita`
                    : showAppointmentDetails
                    ? ''
                    : doctorName}
                </Typography>
                <IconButton
                  onClick={handleCloseSelectedEvent}
                  size="small"
                  sx={{ ml: 1, color: '#b3b3b3' }}
                >
                  <CloseIcon />
                </IconButton>
              </Box>

              {showAppointmentMore ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {activityLogsLoading ? (
                    <Box sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
                      <CircularProgress />
                    </Box>
                  ) : appointmentActivityLogs.length === 0 ? (
                    <Typography sx={{ color: '#5f6b75', fontSize: '0.95rem' }}>
                      Aún no hay movimientos registrados para esta cita.
                    </Typography>
                  ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                      {appointmentActivityLogs.slice(0, 10).map((log) => (
                        <Box
                          key={log.id}
                          sx={{
                            borderBottom: '1px solid #e5e9ef',
                            pb: 1.25,
                          }}
                        >
                          <Typography sx={{ fontSize: '0.95rem', color: '#3f4a56', fontWeight: 600 }}>
                            {log.message || log.action}
                          </Typography>
                          <Typography sx={{ fontSize: '0.88rem', color: '#6b7785', mt: 0.25 }}>
                            {log.user_name || 'Sistema'}{' '}
                            {log.created_at ? `(${dayjs(log.created_at).format('dddd DD/MMM, HH:mm')} hrs)` : ''}
                          </Typography>

                          {log.meta && (
                            <Box sx={{ mt: 0.75, display: 'flex', flexDirection: 'column', gap: 0.35 }}>
                              {log.action === 'rescheduled' && (
                                <>
                                  <Typography sx={{ fontSize: '0.85rem', color: '#5f6b75' }}>
                                    Anterior: {String(log.meta.previous_datestart || '-')}
                                  </Typography>
                                  <Typography sx={{ fontSize: '0.85rem', color: '#5f6b75' }}>
                                    Nueva: {String(log.meta.new_datestart || '-')}
                                  </Typography>
                                </>
                              )}
                              {'new_status' in log.meta && (
                                <Typography sx={{ fontSize: '0.85rem', color: '#5f6b75' }}>
                                  Estatus: {getAppointmentStatusLabel(log.meta.previous_status)}{' -> '}{getAppointmentStatusLabel(log.meta.new_status)}
                                </Typography>
                              )}
                              {'new_reason' in log.meta && String(log.meta.new_reason || '').trim() !== '' && (
                                <Typography sx={{ fontSize: '0.85rem', color: '#5f6b75' }}>
                                  Motivo: {String(log.meta.new_reason)}
                                </Typography>
                              )}
                            </Box>
                          )}
                        </Box>
                      ))}

                      {appointmentActivityLogs.length > 10 ? (
                        <Button
                          variant="text"
                          onClick={handleOpenPatientLogbook}
                          sx={{
                            alignSelf: 'flex-start',
                            minWidth: 'auto',
                            p: 0,
                            color: '#6f7680',
                            textDecoration: 'underline',
                            textTransform: 'none',
                          }}
                        >
                          Ver bitácora completa del paciente
                        </Button>
                      ) : null}
                      {appointmentActivityLogsHasMore ? (
                        <Button
                          variant="text"
                          onClick={handleLoadMoreAppointmentActivityLogs}
                          disabled={appointmentActivityLogsLoadingMore}
                          sx={{
                            alignSelf: 'flex-start',
                            minWidth: 'auto',
                            p: 0,
                            color: '#2d64c8',
                            textDecoration: 'underline',
                            textTransform: 'none',
                          }}
                        >
                          {appointmentActivityLogsLoadingMore ? 'Cargando...' : 'Mostrar más registros'}
                        </Button>
                      ) : null}
                    </Box>
                  )}

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 0.25 }}>
                    <Button
                      variant="text"
                      startIcon={<ArrowBackIcon />}
                      onClick={() => setShowAppointmentMore(false)}
                      sx={{
                        alignSelf: 'flex-start',
                        minWidth: 'auto',
                        p: 0,
                        color: '#6f7680',
                        textDecoration: 'underline',
                        textTransform: 'none',
                      }}
                    >
                      Regresar
                    </Button>
                    <Button
                      variant="text"
                      onClick={() => {
                        setShowAppointmentMore(false);
                        setShowAppointmentDetails(true);
                      }}
                      sx={{
                        minWidth: 'auto',
                        p: 0,
                        color: '#6f7680',
                        textDecoration: 'underline',
                        textTransform: 'none',
                      }}
                    >
                      Datos de la cita
                    </Button>
                  </Box>
                </Box>
              ) : showAppointmentDetails ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 1.25, sm: 2 } }}>
                  <Box
                    sx={{
                      background: 'linear-gradient(180deg, #c8f4ea 0%, #b7efdf 100%)',
                      borderRadius: 2,
                      px: { xs: 1, sm: 2.5 },
                      py: { xs: 1.25, sm: 3 },
                    }}
                  >
                    <Box
                      sx={{
                        position: 'relative',
                        backgroundColor: '#ffffff',
                        borderRadius: 2,
                        px: { xs: 1.5, sm: 2.5 },
                        py: { xs: 1.75, sm: 3 },
                        boxShadow: '0 4px 14px rgba(60, 92, 86, 0.12)',
                      }}
                    >
                      <Box
                        sx={{
                          position: 'absolute',
                          top: { xs: -14, sm: -18 },
                          left: { xs: 12, sm: 16 },
                          backgroundColor: '#4caf50',
                          color: '#ffffff',
                          px: { xs: 1.5, sm: 2 },
                          py: { xs: 0.9, sm: 1.4 },
                          borderRadius: 0.75,
                          boxShadow: '0 6px 14px rgba(76, 175, 80, 0.35)',
                        }}
                      >
                        <Typography sx={{ fontSize: { xs: '0.85rem', sm: '0.95rem' }, fontWeight: 500 }}>
                          Datos de la cita
                        </Typography>
                      </Box>

                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'flex-end',
                          alignItems: 'center',
                          mb: { xs: 0.5, sm: 1 },
                        }}
                      >
                        <IconButton
                          size="small"
                          onClick={handleCopyAppointmentDetails}
                          sx={{
                            border: '1px solid #49c5ff',
                            borderRadius: 1,
                            color: '#49c5ff',
                            width: { xs: 38, sm: 42 },
                            height: { xs: 32, sm: 36 },
                          }}
                        >
                          <ContentCopyIcon sx={{ fontSize: { xs: 16, sm: 18 } }} />
                        </IconButton>
                      </Box>

                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 0.65, sm: 1.15 }, pt: { xs: 1.25, sm: 2.2 } }}>
                        <Typography sx={{ fontSize: { xs: '0.9rem', sm: '0.98rem' }, color: '#666' }}>
                          Paciente:{' '}
                          <Box component="span" sx={{ fontWeight: 500, color: '#555' }}>
                            {selectedEvent.event.title}
                          </Box>
                        </Typography>
                        <Typography sx={{ fontSize: { xs: '0.9rem', sm: '0.98rem' }, color: '#666' }}>
                          Fecha de la cita:{' '}
                          <Box component="span" sx={{ fontWeight: 500, color: '#555' }}>
                            {dayjs(selectedEvent.event.start).format('dddd, DD/MMM/YYYY')}
                          </Box>
                        </Typography>
                        <Typography sx={{ fontSize: { xs: '0.9rem', sm: '0.98rem' }, color: '#666' }}>
                          Hora de la cita:{' '}
                          <Box component="span" sx={{ fontWeight: 500, color: '#555' }}>
                            {dayjs(selectedEvent.event.start).format('HH:mm')} hrs
                          </Box>
                        </Typography>

                        <Box
                          sx={{
                            width: '100%',
                            maxWidth: 340,
                            height: 2,
                            backgroundColor: '#476bc2',
                            my: { xs: 0.5, sm: 1 },
                            alignSelf: 'center',
                          }}
                        />

                        <Typography sx={{ fontSize: { xs: '0.9rem', sm: '0.98rem' }, color: '#666' }}>
                          Médico:{' '}
                          <Box component="span" sx={{ fontWeight: 500, color: '#555' }}>
                            {doctorName}
                          </Box>
                        </Typography>
                        <Typography sx={{ fontSize: { xs: '0.9rem', sm: '0.98rem' }, color: '#666' }}>
                          Especialidad:{' '}
                          <Box component="span" sx={{ fontWeight: 500, color: '#555' }}>
                            {doctorSpecialty}
                          </Box>
                        </Typography>
                        <Typography sx={{ fontSize: { xs: '0.9rem', sm: '0.98rem' }, color: '#666' }}>
                          Dirección:{' '}
                          <Box component="span" sx={{ fontWeight: 500, color: '#555' }}>
                            {(() => {
                              const selectedOffice = offices.find((office) => office.id === officeId);
                              if (!selectedOffice) return 'Consultorio';
                              return [selectedOffice.address, selectedOffice.suburb].filter(Boolean).join(' ');
                            })()}
                          </Box>
                          {(() => {
                            const selectedOffice = offices.find((office) => office.id === officeId);
                            return selectedOffice?.phone ? (
                              <Box component="span" sx={{ fontWeight: 500, color: '#555' }}>
                                {` Tel: ${selectedOffice.phone}`}
                              </Box>
                            ) : null;
                          })()}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>

                  <Button
                    variant="text"
                    startIcon={<ArrowBackIcon />}
                    onClick={() => setShowAppointmentDetails(false)}
                    sx={{
                      alignSelf: 'flex-start',
                      minWidth: 'auto',
                      p: 0,
                      color: '#6f7680',
                      textDecoration: 'underline',
                      textTransform: 'none',
                    }}
                  >
                    Regresar
                  </Button>

                  {selectedEvent.event.extendedProps.smscode &&
                  selectedEvent.event.extendedProps.is_first_time ? (
                    <Box
                      sx={{
                        mt: 1.5,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 1.25,
                      }}
                    >
                      {selectedEvent.event.extendedProps.history_form_required ? (
                        <>
                          <Typography sx={{ fontSize: '0.95rem', color: '#5f6a76', lineHeight: 1.6 }}>
                            Comparte un enlace con tu paciente para que conteste las preguntas de su historia clínica.
                          </Typography>
                          <Stack
                            direction="row"
                            spacing={1.25}
                            alignItems="center"
                            justifyContent="flex-end"
                            sx={{ flexWrap: 'wrap', width: '100%' }}
                          >
                            <Typography sx={{ fontSize: '0.9rem', color: '#5b6470', fontWeight: 600 }}>
                              Link de historia clínica
                            </Typography>
                            <IconButton
                              size="small"
                              onClick={handleCopyHistoryFormLink}
                              sx={{
                                alignSelf: 'flex-start',
                                border: '1px solid #49c5ff',
                                borderRadius: 1,
                                color: '#49c5ff',
                                width: 42,
                                height: 36,
                              }}
                            >
                              <ContentCopyIcon sx={{ fontSize: 18 }} />
                            </IconButton>
                          </Stack>
                        </>
                      ) : (
                        <Typography
                          sx={{
                            fontSize: '0.95rem',
                            color: '#2e7d32',
                            fontWeight: 700,
                            textAlign: 'right',
                            width: '100%',
                          }}
                        >
                          HC contestada!
                        </Typography>
                      )}
                    </Box>
                  ) : null}
                </Box>
              ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: isShortViewport ? 0.2 : 0.35, sm: isShortViewport ? 0.45 : 0.65 } }}>
                <Typography sx={{ fontSize: { xs: isShortViewport ? '0.84rem' : '0.9rem', sm: isShortViewport ? '0.9rem' : '0.95rem' }, color: '#4b5b6b' }}>
                  Paciente: {selectedEvent.event.title}{' '}
                  <Button
                    variant="text"
                    onClick={() => setBirthEditorOpen((current) => !current)}
                    sx={{
                      p: 0,
                      minWidth: 0,
                      textTransform: 'none',
                      fontSize: 'inherit',
                      verticalAlign: 'baseline',
                    }}
                  >
                    ({selectedPatientRecord?.birth_date
                      ? `${selectedPatientRecord.age ?? ''} años`
                      : 'Edad no registrada'})
                  </Button>
                </Typography>
                {birthEditorOpen ? (
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                    <ClickableDateField
                      label="Fecha de nacimiento"
                      value={birthEditorValue}
                      onChange={setBirthEditorValue}
                    />
                    <Button
                      variant="contained"
                      size="small"
                      onClick={handleSaveBirthDate}
                      disabled={birthSaving}
                    >
                      {birthSaving ? 'Guardando...' : 'Guardar'}
                    </Button>
                  </Box>
                ) : null}
                <Typography sx={{ fontSize: { xs: isShortViewport ? '0.84rem' : '0.9rem', sm: isShortViewport ? '0.9rem' : '0.95rem' }, color: '#4b5b6b' }}>
                  Fecha de la cita: {`${dayjs(selectedEvent.event.start).format('dddd, DD/MMM HH:mm')} hrs`}
                </Typography>
                <Typography sx={{ fontSize: { xs: isShortViewport ? '0.84rem' : '0.9rem', sm: isShortViewport ? '0.9rem' : '0.95rem' }, color: '#4b5b6b' }}>
                  Motivo de la consulta:{' '}
                  <Button
                    variant="text"
                    onClick={() => setReasonEditorOpen((current) => !current)}
                    sx={{
                      p: 0,
                      minWidth: 0,
                      textTransform: 'none',
                      fontSize: 'inherit',
                      verticalAlign: 'baseline',
                    }}
                  >
                    {String(selectedEvent.event.extendedProps.reason || 'No registrado')}
                  </Button>
                </Typography>
                {reasonEditorOpen ? (
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                    <TextField
                      key={`reason-editor-${selectedEvent.event.id}-${String(selectedEvent.event.extendedProps.reason ?? '')}`}
                      inputRef={reasonInputRef}
                      size="small"
                      fullWidth
                      defaultValue={String(selectedEvent.event.extendedProps.reason ?? '')}
                      sx={{ maxWidth: 420 }}
                    />
                    <Button
                      variant="contained"
                      size="small"
                      onClick={handleSaveAppointmentReason}
                      disabled={reasonSaving}
                    >
                      {reasonSaving ? 'Guardando...' : 'Guardar'}
                    </Button>
                  </Box>
                ) : null}
              </Box>
              )}

              {!showAppointmentDetails && !showAppointmentMore && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: isShortViewport ? 0.7 : 1, sm: isShortViewport ? 1 : 1.5 }, flexWrap: 'wrap' }}>
                <Typography sx={{ fontSize: { xs: isShortViewport ? '0.84rem' : '0.9rem', sm: isShortViewport ? '0.9rem' : '0.95rem' }, color: '#4b5b6b' }}>
                  Celular: {String(selectedEvent.event.extendedProps.phone || '-')}
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => handleCopyPhone(String(selectedEvent.event.extendedProps.phone || ''))}
                  sx={{
                    border: '1px solid #49c5ff',
                    borderRadius: 1,
                    color: '#49c5ff',
                    width: { xs: isShortViewport ? 34 : 38, sm: isShortViewport ? 36 : 42 },
                    height: { xs: isShortViewport ? 28 : 32, sm: isShortViewport ? 30 : 36 },
                  }}
                >
                  <ContentCopyIcon sx={{ fontSize: { xs: isShortViewport ? 14 : 16, sm: isShortViewport ? 16 : 18 } }} />
                </IconButton>
                {isMobile ? (
                  <IconButton
                    size="small"
                    component="a"
                    href={`tel:${String(selectedEvent.event.extendedProps.phone || '')}`}
                    sx={{
                      borderRadius: 1,
                      backgroundColor: '#4caf50',
                      color: '#ffffff',
                      width: isShortViewport ? 34 : 38,
                      height: isShortViewport ? 28 : 32,
                      '&:hover': {
                        backgroundColor: '#43a047',
                      },
                    }}
                  >
                    <PhoneIcon sx={{ fontSize: isShortViewport ? 14 : 16 }} />
                  </IconButton>
                ) : null}
                <Button
                  variant="text"
                  onClick={handleOpenAppointmentMore}
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
              )}

              {!showAppointmentDetails && !showAppointmentMore && !pendingAction && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.2 }}>
                  {selectedEventIsConfirmed ? (
                    <Typography sx={{ textAlign: 'center', color: '#2e7d32', fontWeight: 700, py: 0.9 }}>
                      Cita confirmada
                    </Typography>
                  ) : canConfirmSelectedEvent ? (
                    <Button
                      fullWidth
                      variant="outlined"
                      startIcon={<CheckCircleIcon />}
                      onClick={() => {
                        setPendingAction('confirm');
                        setNotifyPatientAction(confirmNotificationDefault);
                      }}
                      sx={{
                        borderColor: '#50c65b',
                        color: '#50c65b',
                        py: 0.9,
                        fontWeight: 500,
                      }}
                    >
                      CONFIRMAR CITA
                    </Button>
                  ) : null}
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<CancelOutlinedIcon />}
                    onClick={() => {
                      setPendingAction('cancel');
                      setNotifyPatientAction(cancelNotificationDefault);
                    }}
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
                      onClick={() => {
                        setPendingAction('no_show');
                        setNotifyPatientAction(false);
                      }}
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

              {!showAppointmentDetails && !showAppointmentMore && pendingAction && (
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

                  {pendingAction !== 'no_show' ? (
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={notifyPatientAction}
                          disabled={!selectedEventCanNotifyPatient}
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
                  ) : null}
                  {pendingAction !== 'no_show' && !selectedEventCanNotifyPatient ? (
                    <Typography sx={{ fontSize: '0.8rem', color: 'error.main', textAlign: 'center', mt: -2 }}>
                      No se puede notificar al paciente ya que no tiene teléfono registrado
                    </Typography>
                  ) : null}
                </Box>
              )}

              </Box>
              {!showAppointmentDetails && !showAppointmentMore && (
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    px: { xs: 1.5, sm: 3 },
                    py: 1.25,
                    borderTop: '1px solid #e5e9ef',
                    backgroundColor: '#fff',
                    position: 'sticky',
                    bottom: 0,
                    zIndex: 1,
                  }}
                >
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
                  {canViewPatientSummary ? (
                    <Button
                      variant="contained"
                      onClick={handleOpenSummary}
                      sx={{
                        backgroundColor: '#5bc0eb',
                        '&:hover': { backgroundColor: '#43b3e0' },
                        minWidth: 110,
                      }}
                    >
                      RESUMEN
                    </Button>
                  ) : null}
                </Box>
              )}
              {showAppointmentMore && (
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    px: { xs: 1.5, sm: 3 },
                    py: 1.25,
                    borderTop: '1px solid #e5e9ef',
                    backgroundColor: '#fff',
                    position: 'sticky',
                    bottom: 0,
                    zIndex: 1,
                  }}
                >
                  <Button
                    variant="contained"
                    onClick={() => setShowAppointmentMore(false)}
                    sx={{
                      backgroundColor: '#8c8c8c',
                      '&:hover': { backgroundColor: '#7c7c7c' },
                      minWidth: 92,
                    }}
                  >
                    Regresar
                  </Button>
                  <Button
                    variant="contained"
                    onClick={() => {
                      setShowAppointmentMore(false);
                      setShowAppointmentDetails(true);
                    }}
                    sx={{
                      backgroundColor: '#5bc0eb',
                      '&:hover': { backgroundColor: '#43b3e0' },
                      minWidth: 140,
                    }}
                  >
                    Datos de la cita
                  </Button>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={canViewPatientSummary && summaryOpen}
        onClose={() => setSummaryOpen(false)}
        maxWidth="sm"
        fullWidth
        sx={{
          '& .MuiDialog-container': {
            alignItems: 'flex-start',
            pt: isShortViewport ? { xs: '10px', sm: '2px' } : { xs: '14px', sm: '10px' },
          },
        }}
        PaperProps={{
          sx: {
            borderRadius: 2,
            overflow: 'hidden',
            width: { xs: 'calc(100% - 6px)', sm: 'auto' },
            maxWidth: { xs: 'calc(100% - 6px)', sm: 640 },
            m: isShortViewport ? { xs: '10px 3px 4px', sm: '8px auto 24px' } : { xs: '14px 3px 4px', sm: '60px auto 32px' },
          },
        }}
      >
        <DialogContent
          sx={{
            px: 0,
            py: 0,
            display: 'flex',
            flexDirection: 'column',
            maxHeight: { xs: 'calc(100vh - 24px)', sm: 'calc(100vh - 96px)' },
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: 0, width: '100%' }}>
            <Box
              sx={{
                pt: 1,
                px: 3,
                pb: 2,
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                overflowY: 'auto',
                minHeight: 0,
              }}
            >
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
                Resumen del paciente
              </Typography>
              <IconButton
                onClick={() => setSummaryOpen(false)}
                size="small"
                sx={{ ml: 1, color: '#b3b3b3' }}
              >
                <CloseIcon />
              </IconButton>
            </Box>

            {summaryLoading ? (
              <Box sx={{ py: 5, display: 'flex', justifyContent: 'center' }}>
                <CircularProgress />
              </Box>
            ) : summaryData ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box
                  sx={{
                    backgroundColor: '#f7fbff',
                    border: '1px solid #dfeaf5',
                    borderRadius: 2,
                    p: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1.5,
                  }}
                >
                  <Typography sx={{ fontSize: '1rem', color: '#3f4f5f', fontWeight: 600 }}>
                    {summaryData.patient.full_name}
                  </Typography>
                  <Typography sx={{ fontSize: '0.95rem', color: '#5f6b75' }}>
                    Edad: {getReadableAgeText(summaryData.patient.age_text)}
                  </Typography>
                  <Typography sx={{ fontSize: '0.95rem', color: '#5f6b75' }}>
                    Última consulta:{' '}
                    {summaryData.last_consultation
                      ? dayjs(summaryData.last_consultation.created_at).format('dddd, DD/MMM/YYYY HH:mm [hrs]')
                      : 'Sin consultas registradas'}
                  </Typography>
                </Box>

                {summaryData.last_consultation ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <Box>
                      <Typography sx={{ fontSize: '0.9rem', color: '#758391', fontWeight: 600, mb: 0.4 }}>
                        Diagnóstico
                      </Typography>
                      <Typography sx={{ fontSize: '0.95rem', color: '#4b5b6b' }}>
                        {summaryData.last_consultation.diagnostic_text || '-'}
                      </Typography>
                    </Box>

                    <Box>
                      <Typography sx={{ fontSize: '0.9rem', color: '#758391', fontWeight: 600, mb: 0.4 }}>
                        Medicamentos
                      </Typography>
                      <Typography sx={{ fontSize: '0.95rem', color: '#4b5b6b' }}>
                        {summaryData.last_consultation.medicament_text || '-'}
                      </Typography>
                    </Box>

                    <Box>
                      <Typography sx={{ fontSize: '0.9rem', color: '#758391', fontWeight: 600, mb: 0.4 }}>
                        Análisis
                      </Typography>
                      <Typography sx={{ fontSize: '0.95rem', color: '#4b5b6b' }}>
                        {summaryData.last_consultation.notes || '-'}
                      </Typography>
                    </Box>
                  </Box>
                ) : (
                  <Alert severity="info" sx={{ borderRadius: 2 }}>
                    Este paciente aún no tiene consultas registradas.
                  </Alert>
                )}

              </Box>
            ) : (
              <Alert severity="warning" sx={{ borderRadius: 2 }}>
                No se pudo cargar el resumen del paciente.
              </Alert>
            )}
          </Box>
            {summaryData ? (
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 1.5,
                  px: 3,
                  py: 1.5,
                  flexWrap: 'wrap',
                  borderTop: '1px solid #e5e9ef',
                  backgroundColor: '#fff',
                  position: 'sticky',
                  bottom: 0,
                  zIndex: 1,
                }}
              >
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
                <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', justifyContent: 'flex-end', flex: 1 }}>
                  <Button
                    variant="contained"
                    onClick={handleOpenPatientHistoryFromSummary}
                    sx={{
                      backgroundColor: '#ef3b87',
                      '&:hover': { backgroundColor: '#df2c78' },
                      minWidth: 150,
                    }}
                  >
                    HISTORIA CLÍNICA
                  </Button>
                  <Button
                    variant="contained"
                    onClick={handleOpenNewConsultationFromSummary}
                    sx={{
                      backgroundColor: '#ef3b87',
                      '&:hover': { backgroundColor: '#df2c78' },
                      minWidth: 150,
                    }}
                  >
                    NUEVA CONSULTA
                  </Button>
                </Box>
              </Box>
            ) : null}
          </Box>
        </DialogContent>
      </Dialog>

      <Snackbar
        open={!!actionToast}
        autoHideDuration={2000}
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

      {/* Dialog: Nueva cita (wizard) */}
      <NewAppointmentDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        officeId={officeId}
        onAppointmentCreated={() => {
          handleAppointmentCreated();
          setActionToast('Cita guardada correctamente');
        }}
        initialNotifyPatient={newAppointmentNotificationDefault}
        initialGenderDefault={newAppointmentDefaultGender}
        consultationReasons={newAppointmentConsultationReasons}
        defaultAvailabilityMinutes={newAppointmentBaseMinutes}
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
          setActionToast('Cita reprogramada correctamente');
          setRescheduleDialogOpen(false);
          setRescheduleAppointment(null);
        }}
        mode="reschedule"
        appointmentId={rescheduleAppointment?.id}
        initialPatient={rescheduleAppointment?.patient ?? null}
        initialReason={rescheduleAppointment?.reason ?? ''}
        initialNotifyPatient={newAppointmentNotificationDefault}
        initialGenderDefault={newAppointmentDefaultGender}
        consultationReasons={newAppointmentConsultationReasons}
        defaultAvailabilityMinutes={newAppointmentBaseMinutes}
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
        initialNotifyPatient={newAppointmentNotificationDefault}
        initialGenderDefault={newAppointmentDefaultGender}
        consultationReasons={newAppointmentConsultationReasons}
        defaultAvailabilityMinutes={newAppointmentBaseMinutes}
      />
    </Box>
  );
}

