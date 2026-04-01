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
  showOffice = false,
}: Props) {
  if (logs.length === 0) {
    return (
      <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
        {emptyText}
      </Typography>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {logs.map((log) => {
        const metaLines = getActivityMetaLines(log);

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
                <Typography sx={{ fontWeight: 700, color: '#3f4a56' }}>
                  {log.message || log.action}
                </Typography>
                <Typography sx={{ fontSize: '0.9rem', color: '#6b7785', mt: 0.25 }}>
                  {log.user_name || 'Sistema'}
                  {log.created_at ? ` (${formatDisplayDateTimeLongEs(log.created_at)})` : ''}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                {showPatient && log.patient_name ? (
                  <Chip
                    size="small"
                    label={log.patient_name}
                    sx={{ backgroundColor: 'rgba(0, 137, 123, 0.08)', color: '#0b6d61' }}
                  />
                ) : null}
                {showOffice && log.office_title ? (
                  <Chip
                    size="small"
                    label={log.office_title}
                    sx={{ backgroundColor: 'rgba(25, 118, 210, 0.08)', color: '#245b9e' }}
                  />
                ) : null}
                {log.entity_type ? (
                  <Chip
                    size="small"
                    label={log.entity_type}
                    variant="outlined"
                    sx={{ color: '#6b7785' }}
                  />
                ) : null}
              </Box>
            </Box>

            {metaLines.length > 0 ? (
              <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 0.45 }}>
                {metaLines.map((line, index) => (
                  <Typography key={`${log.id}-${index}`} sx={{ fontSize: '0.88rem', color: '#5f6b75' }}>
                    {line}
                  </Typography>
                ))}
              </Box>
            ) : null}
          </Box>
        );
      })}
    </Box>
  );
}
