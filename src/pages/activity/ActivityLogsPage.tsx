import { useEffect, useState } from 'react';
import { Alert, Box, Card, CardContent, Skeleton, Typography } from '@mui/material';
import HistoryIcon from '@mui/icons-material/History';
import type { ActivityLogItem } from '../../types';
import { appointmentService } from '../../api/appointmentService';
import ActivityLogFeed from '../../components/activity/ActivityLogFeed';

export default function ActivityLogsPage() {
  const [logs, setLogs] = useState<ActivityLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await appointmentService.getGlobalActivityLogs(500);
        if (!cancelled) {
          setLogs(data);
        }
      } catch (err) {
        console.error('Error cargando bitacora general:', err);
        if (!cancelled) {
          setError('No se pudo cargar la bitácora general.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Box sx={{ display: 'grid', gap: 2.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
        <HistoryIcon sx={{ color: 'primary.main' }} />
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Bitácora
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Últimos 500 movimientos registrados en el sistema.
          </Typography>
        </Box>
      </Box>

      <Card>
        <CardContent>
          {loading ? (
            <Box sx={{ display: 'grid', gap: 1.5 }}>
              <Skeleton variant="rounded" height={88} />
              <Skeleton variant="rounded" height={88} />
              <Skeleton variant="rounded" height={88} />
              <Skeleton variant="rounded" height={88} />
            </Box>
          ) : error ? (
            <Alert severity="error">{error}</Alert>
          ) : (
            <ActivityLogFeed
              logs={logs}
              emptyText="Aún no hay movimientos registrados."
              showPatient
              showOffice
            />
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
