import { memo } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
} from '@mui/material';
import {
  History as HistoryIcon,
} from '@mui/icons-material';
import type { ActivityLogItem } from '../../types';
import { formatDisplayDateTimeLongEs } from '../../utils/date';

interface Props {
  patientActivityLogs: ActivityLogItem[];
  onNavigateToHistorical: () => void;
}

function getPatientActivityMetaLines(log: ActivityLogItem): string[] {
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
    lines.push(`Estatus: ${String(meta.previous_status ?? '-')} -> ${String(meta.new_status ?? '-')}`);
  }

  if ('new_reason' in meta && String(meta.new_reason ?? '').trim() !== '') {
    lines.push(`Motivo: ${String(meta.new_reason)}`);
  } else if ('reason' in meta && String(meta.reason ?? '').trim() !== '') {
    lines.push(`Motivo: ${String(meta.reason)}`);
  }

  return lines;
}

function PatientActivityLogTabInner({ patientActivityLogs, onNavigateToHistorical }: Props) {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Bit\u00e1cora
        </Typography>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
          <Button
            variant="outlined"
            startIcon={<HistoryIcon />}
            onClick={onNavigateToHistorical}
          >
            Hist\u00f3rico
          </Button>
        </Box>

        {patientActivityLogs.length === 0 ? (
          <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
            No hay movimientos registrados para este paciente.
          </Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {patientActivityLogs.map((log) => {
              const metaLines = getPatientActivityMetaLines(log);

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
                  <Typography sx={{ fontWeight: 700, color: '#3f4a56' }}>
                    {log.message || log.action}
                  </Typography>
                  <Typography sx={{ fontSize: '0.9rem', color: '#6b7785', mt: 0.25 }}>
                    {log.user_name || 'Sistema'}
                    {log.created_at ? ` (${formatDisplayDateTimeLongEs(log.created_at)})` : ''}
                  </Typography>

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
        )}
      </CardContent>
    </Card>
  );
}

export default memo(PatientActivityLogTabInner);
