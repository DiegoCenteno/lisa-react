import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
} from '@mui/material';
import type { ActivityLogItem } from '../../types';
import ActivityLogFeed from './ActivityLogFeed';

interface ActivityLogWindow {
  logs: ActivityLogItem[];
  hasMore: boolean;
  nextBefore: string | null;
}

interface LoadOptions {
  dayKey: string;
  before?: string | null;
  limit: number;
}

interface Props {
  emptyText: string;
  loadLogs: (options: LoadOptions) => Promise<ActivityLogWindow>;
  showPatient?: boolean;
  maxDays?: number;
  initialLimit?: number;
  loadMoreLimit?: number;
}

function buildLastDayKeys(maxDays: number): string[] {
  const days: string[] = [];
  const today = new Date();

  for (let index = 0; index < maxDays; index += 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - index);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    days.push(`${year}-${month}-${day}`);
  }

  return days;
}

function formatTimelineDayLabel(dayKey: string): string {
  const [year, month, day] = dayKey.split('-').map(Number);
  const date = new Date(year, (month || 1) - 1, day || 1);
  if (Number.isNaN(date.getTime())) return dayKey;

  const labelMonth = date.toLocaleString('es-MX', { month: 'long' }).toLowerCase();
  return `${date.getDate()} ${labelMonth} ${date.getFullYear()}`;
}

export default function ActivityLogTimeline({
  emptyText,
  loadLogs,
  showPatient = false,
  maxDays = 30,
  initialLimit = 10,
  loadMoreLimit = 20,
}: Props) {
  const dayKeys = useMemo(() => buildLastDayKeys(maxDays), [maxDays]);
  const [selectedDay, setSelectedDay] = useState(dayKeys[0] ?? '');
  const [logs, setLogs] = useState<ActivityLogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextBefore, setNextBefore] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSelectedDay(dayKeys[0] ?? '');
  }, [dayKeys]);

  const loadInitial = useCallback(async (dayKey: string) => {
    setLoading(true);
    setError(null);

    try {
      const data = await loadLogs({ dayKey, before: null, limit: initialLimit });
      setLogs(data.logs);
      setHasMore(data.hasMore);
      setNextBefore(data.nextBefore);
    } catch (requestError) {
      setLogs([]);
      setHasMore(false);
      setNextBefore(null);
      setError(requestError instanceof Error ? requestError.message : 'No se pudo cargar la bitácora.');
    } finally {
      setLoading(false);
    }
  }, [initialLimit, loadLogs]);

  useEffect(() => {
    if (!selectedDay) return;
    void loadInitial(selectedDay);
  }, [loadInitial, selectedDay]);

  const handleLoadMore = useCallback(async () => {
    if (!selectedDay || !nextBefore || loadingMore) {
      return;
    }

    setLoadingMore(true);
    setError(null);

    try {
      const data = await loadLogs({ dayKey: selectedDay, before: nextBefore, limit: loadMoreLimit });
      setLogs((current) => [...current, ...data.logs]);
      setHasMore(data.hasMore);
      setNextBefore(data.nextBefore);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No se pudo cargar más información.');
    } finally {
      setLoadingMore(false);
    }
  }, [loadLogs, loadMoreLimit, loadingMore, nextBefore, selectedDay]);

  return (
    <Box sx={{ display: 'grid', gap: 1.5 }}>
      <Box
        sx={{
          display: 'flex',
          gap: 1,
          overflowX: 'auto',
          pb: 0.5,
        }}
      >
        {dayKeys.map((dayKey) => {
          const isSelected = dayKey === selectedDay;

          return (
            <Chip
              key={dayKey}
              label={formatTimelineDayLabel(dayKey)}
              clickable
              onClick={() => setSelectedDay(dayKey)}
              variant="outlined"
              sx={{
                flexShrink: 0,
                fontWeight: isSelected ? 700 : 500,
                borderRadius: 999,
                backgroundColor: '#ffffff',
                borderColor: isSelected ? '#2d64c8' : 'rgba(25, 118, 210, 0.32)',
                color: isSelected ? '#1f4f86' : '#2a4158',
                boxShadow: isSelected ? '0 0 0 3px rgba(45, 100, 200, 0.08)' : 'none',
              }}
            />
          );
        })}
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
          <CircularProgress size={28} />
        </Box>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : (
        <>
          <ActivityLogFeed
            logs={logs}
            emptyText={emptyText}
            showPatient={showPatient}
          />
          {hasMore ? (
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <Button
                variant="text"
                onClick={handleLoadMore}
                disabled={loadingMore}
                sx={{
                  minWidth: 'auto',
                  p: 0,
                  color: '#2d64c8',
                  textDecoration: 'underline',
                  textTransform: 'none',
                  fontWeight: 400,
                }}
              >
                {loadingMore ? 'Cargando...' : 'Mostrar más registros'}
              </Button>
            </Box>
          ) : null}
        </>
      )}
    </Box>
  );
}
