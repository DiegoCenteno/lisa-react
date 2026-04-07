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
import { patientService } from '../../api/patientService';
import ActivityLogTimeline from '../../components/activity/ActivityLogTimeline';

interface Props {
  patientId: number;
  onNavigateToHistorical: () => void;
}

function PatientActivityLogTabInner({
  patientId,
  onNavigateToHistorical,
}: Props) {
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

        <ActivityLogTimeline
          emptyText="No hay movimientos registrados para este paciente."
          loadLogs={({ dayKey, before, limit }) =>
            patientService.getPatientActivityLogs(patientId, {
              days: 30,
              before: before ?? `${dayKey}T23:59:59`,
              limit,
            })
          }
        />
      </CardContent>
    </Card>
  );
}

export default memo(PatientActivityLogTabInner);
