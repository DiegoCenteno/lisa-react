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
import ActivityLogFeed from '../../components/activity/ActivityLogFeed';

interface Props {
  patientActivityLogs: ActivityLogItem[];
  onNavigateToHistorical: () => void;
}

function PatientActivityLogTabInner({ patientActivityLogs, onNavigateToHistorical }: Props) {
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

        <ActivityLogFeed
          logs={patientActivityLogs}
          emptyText="No hay movimientos registrados para este paciente."
        />
      </CardContent>
    </Card>
  );
}

export default memo(PatientActivityLogTabInner);
