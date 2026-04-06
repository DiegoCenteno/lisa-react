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

function isPatientPublicAppointmentAction(log: ActivityLogItem): boolean {
  const message = String(log.message ?? '').trim().toLowerCase();
  const source = String(log.meta?.source ?? '').trim().toLowerCase();

  return source === 'public_wsapp' || source === 'patient_whatsapp' || message.includes('por paciente');
}

function getDisplayTitle(log: ActivityLogItem): string {
  const normalizedAction = log.action.trim().toLowerCase();

  if (normalizedAction === 'cancelled') {
    return 'Cita Cancelada';
  }

  if (normalizedAction === 'confirmed') {
    return 'Cita Confirmada';
  }

  if (normalizedAction === 'created') {
    return 'Cita Creada';
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

  return {
    borderColor: 'rgba(107, 119, 133, 0.35)',
    backgroundColor: 'rgba(107, 119, 133, 0.06)',
    color: '#51606e',
  };
}

function getActivityMetaLines(log: ActivityLogItem): string[] {
  const meta = log.meta ?? {};
  const lines: string[] = [];

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

function getActorLineLabel(action: string): string {
  const normalized = action.toLowerCase();

  if (normalized === 'cancelled') return 'Quién canceló';
  if (normalized === 'confirmed') return 'Quién confirmó';
  if (normalized === 'rescheduled') return 'Quién reagendó';
  if (normalized === 'created') return 'Quién creó';
  if (normalized === 'updated') return 'Quién actualizó';

  return 'Quién realizó la acción';
}

function getActorDisplayName(log: ActivityLogItem): string {
  if (isPatientPublicAppointmentAction(log)) {
    return 'Paciente';
  }

  if (log.user_role_id === 1 || log.user_role_id === 2) {
    return toCamelCaseWords(log.user_name?.trim() || 'Sistema');
  }

  if (log.user_name?.trim()) {
    return toCamelCaseWords(log.user_name.trim());
  }

  if (log.patient_id) {
    return 'Paciente';
  }

  return 'Sistema';
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
}

export default function ActivityLogFeed({
  logs,
  emptyText,
  showPatient = false,
}: Props) {
  if (logs.length === 0) {
    return (
      <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
        {emptyText}
      </Typography>
    );
  }

  const groupedLogs = logs.reduce<Array<{ dayKey: string; items: ActivityLogItem[] }>>((acc, log) => {
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
            {group.items.map((log) => {
              const metaLines = getActivityMetaLines(log);
              const title = getDisplayTitle(log);

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
                          label={toCamelCaseWords(log.entity_type)}
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
                      {(showPatient || log.patient_id) && log.patient_name ? (
                        <Typography sx={{ fontSize: '0.88rem', color: '#5f6b75' }}>
                          Paciente: {toCamelCaseWords(log.patient_name)}
                        </Typography>
                      ) : null}
                    </Box>
                  )}
                </Box>
              );
            })}
          </Box>
        </Box>
      ))}
    </Box>
  );
}
