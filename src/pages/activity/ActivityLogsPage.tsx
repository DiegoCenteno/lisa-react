import { Box, Card, CardContent, Typography } from '@mui/material';
import HistoryIcon from '@mui/icons-material/History';
import { appointmentService } from '../../api/appointmentService';
import ActivityLogTimeline from '../../components/activity/ActivityLogTimeline';

export default function ActivityLogsPage() {
  return (
    <Box sx={{ display: 'grid', gap: 2.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
        <HistoryIcon sx={{ color: 'primary.main' }} />
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Bitácora
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Últimos 30 días de movimientos registrados en el sistema.
          </Typography>
        </Box>
      </Box>

      <Card>
        <CardContent>
          <ActivityLogTimeline
            emptyText="Aún no hay movimientos registrados."
            showPatient
            loadLogs={({ dayKey, before, limit }) =>
              appointmentService.getGlobalActivityLogs({
                days: 30,
                before: before ?? `${dayKey}T23:59:59`,
                limit,
              })
            }
          />
        </CardContent>
      </Card>
    </Box>
  );
}
