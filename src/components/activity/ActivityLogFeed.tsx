import { Box, Chip, Typography } from '@mui/material';
import type { ActivityLogItem } from '../../types';
import { formatDisplayDateTimeLongEs } from '../../utils/date';

function getAppointmentStatusLabel(status: unknown): string {
  const numericStatus = Number(status);

  if (Number.isNaN(numericStatus)) {
    return String(status ?? '-');
  }

  const labels: Record<number, string> = {
    0: 'programada',
    1: 'confirmada',
    2: 'no asistió',
    3: 'cancelada',
    4: 'lista de espera',
  };

  return labels[numericStatus] ?? String(numericStatus);
}

function toCamelCaseWords(value: string): string {
  return value
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

type RealActorType = 'system' | 'patient' | 'doctor' | 'assistant' | 'authenticated';

const SYSTEM_ACTIONS = new Set([
  'appointments_today_sent',
  'appointments_today_failed',
  'appointment_confirmation_scheduled',
  'appointment_confirmation_sent',
  'appointment_confirmation_failed',
  'five_day_reminder_sent',
  'five_day_reminder_failed',
]);

const PATIENT_SOURCE_ACTIONS: Partial<Record<string, Set<string>>> = {
  confirmed: new Set(['patient_whatsapp', 'public_wsapp']),
  cancelled: new Set(['patient_whatsapp', 'public_wsapp']),
  rescheduled: new Set(['public_reschedule_link']),
  assigned: new Set(['public_booking_link']),
  history_form_submitted: new Set(['public_history_form']),
};

const PATIENT_ACTIONS = new Set([
  'cancelled_from_five_day_reminder',
  'five_day_reminder_acknowledged',
  'incoming_message_unrecognized',
]);

function getNormalizedAction(log: ActivityLogItem): string {
  return String(log.action ?? '').trim().toLowerCase();
}

function getNormalizedSource(log: ActivityLogItem): string {
  return String(log.meta?.source ?? '').trim().toLowerCase();
}

function isSystemActionByMatrix(log: ActivityLogItem): boolean {
  return SYSTEM_ACTIONS.has(getNormalizedAction(log));
}

function isPatientActionByMatrix(log: ActivityLogItem): boolean {
  const action = getNormalizedAction(log);
  const source = getNormalizedSource(log);

  if (PATIENT_ACTIONS.has(action)) {
    return true;
  }

  const allowedSources = PATIENT_SOURCE_ACTIONS[action];
  return Boolean(allowedSources?.has(source));
}

function isSystemAutomatedAction(log: ActivityLogItem): boolean {
  const normalizedAction = String(log.action ?? '').trim().toLowerCase();
  const normalizedMessage = String(log.message ?? '').trim().toLowerCase();
  const source = String(log.meta?.source ?? '').trim().toLowerCase();

  return normalizedAction === 'five_day_reminder_sent'
    || normalizedAction === 'five_day_reminder_failed'
    || normalizedAction === 'appointment_confirmation_scheduled'
    || normalizedAction === 'appointment_confirmation_sent'
    || normalizedAction === 'appointment_confirmation_failed'
    || normalizedAction === 'appointments_today_sent'
    || normalizedAction === 'appointments_today_failed'
    || source === 'daily_schedule_summary'
    || source === 'five_day_reminder'
    || source === 'appointment_scheduling3'
    || normalizedMessage === 'recordatorio de cita enviado.'
    || normalizedMessage === 'error al enviar recordatorio de cita.'
    || normalizedMessage === 'confirmación de cita programada'
    || normalizedMessage === 'confirmación de cita enviada'
    || normalizedMessage === 'error al enviar confirmación de cita'
    || normalizedMessage === 'resumen diario de citas enviado.'
    || normalizedMessage === 'error al enviar resumen diario de citas.';
}

type RealActorType = 'system' | 'patient' | 'doctor' | 'assistant' | 'authenticated';

function getDisplayTitle(log: ActivityLogItem): string {
  const normalizedAction = log.action.trim().toLowerCase();
  const normalizedMessage = String(log.message ?? '').trim().toLowerCase();

  if (normalizedAction === 'cancelled') {
    return 'Cita Cancelada';
  }

  if (normalizedAction === 'confirmed') {
    return 'Cita Confirmada';
  }

  if (normalizedAction === 'created') {
    return 'Cita Creada';
  }

  if (normalizedMessage === 'nueva cita asignada') {
    return 'Nueva Cita';
  }

  if (normalizedMessage === 'cita previa reemplazada por la actual') {
    return 'Cita Reprogramada';
  }

  if (normalizedMessage === 'cita marcada como no asistió') {
    return 'Cita Marcada Como No Asistió';
  }

  if (normalizedMessage === 'recordatorio de cita enviado.') {
    return 'Recordatorio De Cita 5 Días Antes Enviado.';
  }

  return toCamelCaseWords(log.message || log.action);
}

function getActionTitleChipSx(title: string) {
  const normalized = title.trim().toLowerCase();

  if (normalized === 'cita cancelada') {
    return {
      borderColor: 'rgba(211, 47, 47, 0.35)',
      backgroundColor: 'rgba(211, 47, 47, 0.08)',
      color: '#c62828',
    };
  }

  if (normalized === 'cita creada') {
    return {
      borderColor: 'rgba(25, 118, 210, 0.35)',
      backgroundColor: 'rgba(25, 118, 210, 0.08)',
      color: '#245b9e',
    };
  }

  if (normalized === 'nueva cita') {
    return {
      borderColor: 'rgba(25, 118, 210, 0.35)',
      backgroundColor: 'rgba(25, 118, 210, 0.08)',
      color: '#245b9e',
    };
  }

  if (normalized === 'cita reprogramada') {
    return {
      borderColor: 'rgba(30, 136, 229, 0.35)',
      backgroundColor: 'rgba(30, 136, 229, 0.08)',
      color: '#1565c0',
    };
  }

  if (normalized === 'cita marcada como no asistió') {
    return {
      borderColor: 'rgba(245, 124, 0, 0.35)',
      backgroundColor: 'rgba(245, 124, 0, 0.08)',
      color: '#ef6c00',
    };
  }

  return {
    borderColor: 'rgba(107, 119, 133, 0.35)',
    backgroundColor: 'rgba(107, 119, 133, 0.06)',
    color: '#51606e',
  };
}

function getActivityMetaLines(log: ActivityLogItem): string[] {
  const meta = log.meta ?? {};
  const lines: string[] = [];
  const normalizedMessage = String(log.message ?? '').trim().toLowerCase();

  if (normalizedMessage === 'nueva cita asignada' && meta.new_datestart) {
    lines.push(`Nueva: ${String(meta.new_datestart)}`);
  }

  if (normalizedMessage === 'cita marcada como no asistió') {
    const appointmentDate = meta.new_datestart ?? meta.previous_datestart ?? meta.datestart;
    if (appointmentDate) {
      lines.push(`Cita: ${String(appointmentDate)}`);
    }
  }

  if (log.action === 'rescheduled') {
    if (meta.previous_datestart) {
      lines.push(`Anterior: ${String(meta.previous_datestart)}`);
    }
    if (meta.new_datestart) {
      lines.push(`Nueva: ${String(meta.new_datestart)}`);
    }
  }

  if ('previous_status' in meta || 'new_status' in meta) {
    lines.push(
      `Estatus: ${getAppointmentStatusLabel(meta.previous_status ?? '-')} -> ${getAppointmentStatusLabel(meta.new_status ?? '-')}`
    );
  }

  if ('new_reason' in meta && String(meta.new_reason ?? '').trim() !== '') {
    lines.push(`Motivo: ${String(meta.new_reason)}`);
  } else if ('reason' in meta && String(meta.reason ?? '').trim() !== '') {
    lines.push(`Motivo: ${String(meta.reason)}`);
  }

  return lines;
}

function getEntityTypeLabel(value?: string | null): string {
  const normalized = String(value ?? '').trim().toLowerCase();

  if (normalized === 'appointment') return 'Citas';
  if (normalized === 'patient') return 'Pacientes';

  return toCamelCaseWords(String(value ?? ''));
}

function getActorLineLabel(action: string): string {
  const normalized = action.toLowerCase();

  if (normalized === 'cancelled') return 'Quién canceló';
  if (normalized === 'confirmed') return 'Quién confirmó';
  if (normalized === 'rescheduled') return 'Quién reagendó';
  if (normalized === 'created') return 'Quién creó';
  if (normalized === 'updated') return 'Quién actualizó';

  return 'Quién realizó la acción';
}

function getRealActorType(log: ActivityLogItem): RealActorType {
  if (isSystemActionByMatrix(log)) {
    return 'system';
  }

  if (isPatientActionByMatrix(log)) {
    return 'patient';
  }

  if (log.user_role_id === 1) {
    return 'doctor';
  }

  if (log.user_role_id === 2) {
    return 'assistant';
  }

  if (log.user_name?.trim()) {
    return 'authenticated';
  }

  return 'system';
}

function getActorDisplayName(log: ActivityLogItem): string {
  const actorType = getRealActorType(log);
  const normalizedUserName = log.user_name?.trim();

  if (actorType === 'system') {
    return 'Sistema';
  }

  if (actorType === 'patient') {
    return 'Paciente';
  }

  if (actorType === 'doctor') {
    return normalizedUserName ? toCamelCaseWords(normalizedUserName) : 'Médico';
  }

  if (actorType === 'assistant') {
    return normalizedUserName ? toCamelCaseWords(normalizedUserName) : 'Asistente';
  }

  return normalizedUserName ? toCamelCaseWords(normalizedUserName) : 'Usuario';
}

function getDoctorDisplayName(log: ActivityLogItem): string | null {
  if (!isSystemActionByMatrix(log)) {
    return null;
  }

  if (log.user_name?.trim()) {
    return toCamelCaseWords(log.user_name.trim());
  }

  return null;
}

function getLogDayKey(value?: string | null): string {
  if (!value) return '';

  const normalized = value.includes('T') ? value : value.replace(' ', 'T');
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return value;

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function formatTimelineDayLabel(dayKey: string): string {
  if (!dayKey) return '';

  const date = new Date(`${dayKey}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dayKey;

  const day = date.getDate();
  const month = date.toLocaleString('es-MX', { month: 'long' }).toLowerCase();
  const year = date.getFullYear();

  return `${day} ${month} ${year}`;
}

interface Props {
  logs: ActivityLogItem[];
  emptyText: string;
  showPatient?: boolean;
  showOffice?: boolean;
  showDayGroups?: boolean;
}

function filterRedundantLogs(logs: ActivityLogItem[]): ActivityLogItem[] {
  const sentConfirmationAppointmentIds = new Set(
    logs
      .filter(
        (log) => log.action === 'appointment_confirmation_sent' && log.appointment_id != null
      )
      .map((log) => log.appointment_id as number)
  );

  return logs.filter((log) => {
    if (log.action !== 'appointment_confirmation_scheduled') {
      return true;
    }

    if (log.appointment_id == null) {
      return true;
    }

    return !sentConfirmationAppointmentIds.has(log.appointment_id);
  });
}

export default function ActivityLogFeed({
  logs,
  emptyText,
  showPatient = false,
  showDayGroups = true,
}: Props) {
  const visibleLogs = filterRedundantLogs(logs);

  if (visibleLogs.length === 0) {
    return (
      <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
        {emptyText}
      </Typography>
    );
  }

  const renderLogCard = (log: ActivityLogItem) => {
    const metaLines = getActivityMetaLines(log);
    const title = getDisplayTitle(log);
    const doctorName = getDoctorDisplayName(log);

    return (
      <Box
        key={log.id}
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
          px: 2,
          py: 1.5,
          backgroundColor: '#ffffff',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 1.5,
            flexWrap: 'wrap',
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Chip
              size="medium"
              label={title}
              variant="outlined"
              sx={{
                mb: 0.5,
                fontSize: '0.98rem',
                fontWeight: 600,
                borderRadius: 999,
                ...getActionTitleChipSx(title),
              }}
            />
            <Typography sx={{ fontSize: '0.9rem', color: '#6b7785', mt: 0.25 }}>
              {log.created_at ? formatDisplayDateTimeLongEs(log.created_at) : ''}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
            {log.entity_type ? (
              <Chip
                size="small"
                label={getEntityTypeLabel(log.entity_type)}
                variant="outlined"
                sx={{ color: '#6b7785' }}
              />
            ) : null}
          </Box>
        </Box>

        {metaLines.length > 0 ? (
          <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 0.45 }}>
            <Typography sx={{ fontSize: '0.88rem', color: '#5f6b75' }}>
              {getActorLineLabel(log.action)}: {getActorDisplayName(log)}
            </Typography>
            {doctorName ? (
              <Typography sx={{ fontSize: '0.88rem', color: '#5f6b75' }}>
                Médico: {doctorName}
              </Typography>
            ) : null}
            {(showPatient || log.patient_id) && log.patient_name ? (
              <Typography sx={{ fontSize: '0.88rem', color: '#5f6b75' }}>
                Paciente: {toCamelCaseWords(log.patient_name)}
              </Typography>
            ) : null}
            {metaLines.map((line, index) => (
              <Typography key={`${log.id}-${index}`} sx={{ fontSize: '0.88rem', color: '#5f6b75' }}>
                {line}
              </Typography>
            ))}
          </Box>
        ) : (
          <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 0.45 }}>
            <Typography sx={{ fontSize: '0.88rem', color: '#5f6b75' }}>
              {getActorLineLabel(log.action)}: {getActorDisplayName(log)}
            </Typography>
            {doctorName ? (
              <Typography sx={{ fontSize: '0.88rem', color: '#5f6b75' }}>
                Médico: {doctorName}
              </Typography>
            ) : null}
            {(showPatient || log.patient_id) && log.patient_name ? (
              <Typography sx={{ fontSize: '0.88rem', color: '#5f6b75' }}>
                Paciente: {toCamelCaseWords(log.patient_name)}
              </Typography>
            ) : null}
          </Box>
        )}
      </Box>
    );
  };

  if (!showDayGroups) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {visibleLogs.map((log) => renderLogCard(log))}
      </Box>
    );
  }

  const groupedLogs = visibleLogs.reduce<Array<{ dayKey: string; items: ActivityLogItem[] }>>((acc, log) => {
    const dayKey = getLogDayKey(log.created_at);
    const lastGroup = acc[acc.length - 1];

    if (lastGroup && lastGroup.dayKey === dayKey) {
      lastGroup.items.push(log);
      return acc;
    }

    acc.push({ dayKey, items: [log] });
    return acc;
  }, []);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {groupedLogs.map((group) => (
        <Box
          key={group.dayKey}
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '132px 1fr' },
            gap: { xs: 1.25, md: 2.25 },
            alignItems: 'stretch',
          }}
        >
          <Box
            sx={{
              position: 'relative',
              display: 'flex',
              justifyContent: { xs: 'flex-start', md: 'center' },
              pb: { xs: 0.5, md: 0 },
            }}
          >
            <Box
              sx={{
                position: 'absolute',
                top: { xs: 18, md: 38 },
                bottom: 0,
                left: { xs: 18, md: '50%' },
                transform: { xs: 'none', md: 'translateX(-50%)' },
                width: 2,
                backgroundColor: 'rgba(25, 118, 210, 0.26)',
                borderRadius: 999,
              }}
            />
            <Chip
              label={formatTimelineDayLabel(group.dayKey)}
              variant="outlined"
              sx={{
                position: 'relative',
                zIndex: 1,
                px: 0.5,
                fontSize: { xs: '0.95rem', md: '1rem' },
                fontWeight: 500,
                borderRadius: 999,
                backgroundColor: '#ffffff',
                borderColor: 'rgba(25, 118, 210, 0.32)',
                color: '#2a4158',
              }}
            />
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {group.items.map((log) => renderLogCard(log))}
          </Box>
        </Box>
      ))}
    </Box>
  );
}
