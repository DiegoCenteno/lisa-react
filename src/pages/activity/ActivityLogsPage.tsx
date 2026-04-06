import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Skeleton,
  Typography,
} from '@mui/material';
import HistoryIcon from '@mui/icons-material/History';
import type { ActivityLogItem } from '../../types';
import { appointmentService } from '../../api/appointmentService';
import ActivityLogFeed from '../../components/activity/ActivityLogFeed';

export default function ActivityLogsPage() {
  const [logs, setLogs] = useState<ActivityLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextBefore, setNextBefore] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await appointmentService.getGlobalActivityLogs({ days: 7 });
        if (!cancelled) {
          setLogs(data.logs);
          setHasMore(data.hasMore);
          setNextBefore(data.nextBefore);
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

  const handleLoadMore = async () => {
    if (!nextBefore || loadingMore) {
      return;
    }

    setLoadingMore(true);
    setError(null);

    try {
      const data = await appointmentService.getGlobalActivityLogs({
        days: 7,
        before: nextBefore,
      });
      setLogs((current) => [...current, ...data.logs]);
      setHasMore(data.hasMore);
      setNextBefore(data.nextBefore);
    } catch (err) {
      console.error('Error cargando mas movimientos de bitacora:', err);
      setError('No se pudieron cargar más movimientos de la bitácora.');
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <Box sx={{ display: 'grid', gap: 2.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
        <HistoryIcon sx={{ color: 'primary.main' }} />
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Bitácora
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Últimos 7 días de movimientos registrados en el sistema.
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
            <Box sx={{ display: 'grid', gap: 1.5 }}>
              <ActivityLogFeed
                logs={logs}
                emptyText="Aún no hay movimientos registrados."
                showPatient
                showOffice
              />
              {hasMore ? (
                <Button
                  variant="outlined"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  sx={{ justifySelf: 'center', minWidth: 180 }}
                >
                  {loadingMore ? <CircularProgress size={20} /> : 'Cargar 7 días más'}
                </Button>
              ) : null}
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
