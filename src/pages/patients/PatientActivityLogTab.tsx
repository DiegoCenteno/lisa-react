import { memo, useCallback, useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Typography,
} from '@mui/material';
import {
  History as HistoryIcon,
} from '@mui/icons-material';
import type { ActivityLogItem } from '../../types';
import { patientService } from '../../api/patientService';
import ActivityLogFeed from '../../components/activity/ActivityLogFeed';

interface Props {
  patientId: number;
  onNavigateToHistorical: () => void;
}

function PatientActivityLogTabInner({
  patientId,
  onNavigateToHistorical,
}: Props) {
  const [patientActivityLogs, setPatientActivityLogs] = useState<ActivityLogItem[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [nextBefore, setNextBefore] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadInitialLogs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await patientService.getPatientActivityLogs(patientId, { days: 7 });
      setPatientActivityLogs(data.logs);
      setHasMore(data.hasMore);
      setNextBefore(data.nextBefore);
    } catch (err) {
      console.error('Error cargando movimientos del paciente:', err);
      setPatientActivityLogs([]);
      setHasMore(false);
      setNextBefore(null);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    void loadInitialLogs();
  }, [loadInitialLogs]);

  const handleLoadMore = useCallback(async () => {
    if (!nextBefore || loadingMore) {
      return;
    }

    setLoadingMore(true);

    try {
      const data = await patientService.getPatientActivityLogs(patientId, {
        days: 7,
        before: nextBefore,
      });
      setPatientActivityLogs((current) => [...current, ...data.logs]);
      setHasMore(data.hasMore);
      setNextBefore(data.nextBefore);
    } catch (err) {
      console.error('Error cargando mas movimientos del paciente:', err);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, nextBefore, patientId]);

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Bitácora
        </Typography>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
          <Button
            variant="outlined"
            startIcon={<HistoryIcon />}
            onClick={onNavigateToHistorical}
          >
            Histórico
          </Button>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        ) : (
          <ActivityLogFeed
            logs={patientActivityLogs}
            emptyText="No hay movimientos registrados para este paciente."
          />
        )}

        {!loading && hasMore ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <Button variant="outlined" onClick={handleLoadMore} disabled={loadingMore}>
              {loadingMore ? 'Cargando...' : 'Cargar 7 días más'}
            </Button>
          </Box>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default memo(PatientActivityLogTabInner);
