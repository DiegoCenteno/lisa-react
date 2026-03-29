import { memo, useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Link,
  MenuItem,
  Paper,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import {
  consultationService,
  type PatientReportItem,
  type PatientReportsData,
} from '../../api/consultationService';

interface PatientReportsTabProps {
  patientId: number;
  onOpenColposcopy?: () => void;
}

function PatientReportsTab({ patientId, onOpenColposcopy }: PatientReportsTabProps) {
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedReportKey, setSelectedReportKey] = useState('');
  const [reportsData, setReportsData] = useState<PatientReportsData | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const hasEnabledReports = (reportsData?.reports_enabled?.length ?? 0) > 0;

  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const data = await consultationService.getPatientReports(patientId);
      setReportsData(data);
      setSelectedReportKey(
        (current) => current || data.last_report_type_key || data.reports_enabled[0]?.key || ''
      );
    } catch (loadError) {
      console.error('Error cargando reportes del paciente:', loadError);
      setError('No se pudo cargar el módulo de reportes.');
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  const openLegacyEditor = useCallback((editorUrl?: string | null) => {
    if (!editorUrl) {
      setError('No se encontró la ruta del editor para este reporte.');
      return;
    }

    window.location.href = editorUrl;
  }, []);

  const handleCreateReport = useCallback(async () => {
    if (!selectedReportKey) {
      setError('Selecciona primero un tipo de reporte.');
      return;
    }

    setCreating(true);
    try {
      const created = await consultationService.createPatientReport(patientId, selectedReportKey);
      setShowCreate(false);
      await loadReports();

      if (created.next_view === 'colposcopy') {
        onOpenColposcopy?.();
      } else {
        openLegacyEditor(created.editor_url);
      }
    } catch (createError) {
      console.error('Error creando reporte:', createError);
      setError('No se pudo crear el reporte.');
    } finally {
      setCreating(false);
    }
  }, [loadReports, onOpenColposcopy, openLegacyEditor, patientId, selectedReportKey]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Paper sx={{ p: 2.5, borderRadius: 2 }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 2,
              flexWrap: 'wrap',
            }}
          >
            <Box>
              <Typography variant="h6" sx={{ color: '#0a8f2f', fontWeight: 700 }}>
                Reportes
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                Administra aquí los reportes del paciente siguiendo la lógica del módulo
                legacy.
              </Typography>
            </Box>
            {!showCreate && hasEnabledReports && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setShowCreate(true)}
              >
                Nuevo reporte
              </Button>
            )}
          </Box>

          {!hasEnabledReports ? (
            <Alert severity="info" sx={{ mt: 2.5 }}>
              No hay tipos de reportes habilitados para este consultorio. Puedes activarlos desde{' '}
              <Link href="/configuracion?tab=reportes" underline="hover">
                aquí
              </Link>
              .
            </Alert>
          ) : null}

          {showCreate && hasEnabledReports && (
            <Box sx={{ mt: 2.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <TextField
                select
                fullWidth
                label="Tipo de reporte"
                value={selectedReportKey}
                onChange={(event) => setSelectedReportKey(event.target.value)}
              >
                {reportsData?.reports_enabled.map((report) => (
                  <MenuItem key={report.key} value={report.key}>
                    {report.label}
                  </MenuItem>
                ))}
              </TextField>

              {reportsData?.last_report_type_label && (
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Reporte requerido previo: <strong>{reportsData.last_report_type_label}</strong>
                  {reportsData.last_report_date_label
                    ? ` | Fecha: ${reportsData.last_report_date_label}`
                    : ''}
                </Typography>
              )}

              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Button
                  variant="contained"
                  onClick={() => void handleCreateReport()}
                  disabled={creating || !selectedReportKey}
                >
                  {creating ? 'Creando...' : 'Siguiente'}
                </Button>
                <Button
                  color="inherit"
                  onClick={() => setShowCreate(false)}
                  disabled={creating}
                >
                  Cancelar
                </Button>
              </Box>
            </Box>
          )}
        </Paper>

        <Paper sx={{ p: 2.5, borderRadius: 2 }}>
          <Typography variant="h6" sx={{ color: '#0a8f2f', fontWeight: 700, mb: 2 }}>
            Tabla de reportes previamente creados
          </Typography>

          {reportsData?.items.length ? (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Fecha</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell align="right">Acción</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {reportsData.items.map((item: PatientReportItem) => (
                  <TableRow key={item.id} hover>
                    <TableCell>{item.created_at_label}</TableCell>
                    <TableCell>{item.type_label}</TableCell>
                    <TableCell align="right">
                      {item.type_key === 'tipoest9' ? (
                        <Button size="small" variant="outlined" onClick={onOpenColposcopy}>
                          Seleccionar
                        </Button>
                      ) : (
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => openLegacyEditor(item.editor_url)}
                        >
                          Seleccionar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Alert severity="info">Aún no hay reportes previos para este paciente.</Alert>
          )}
        </Paper>
      </Box>

      <Snackbar
        open={Boolean(message)}
        autoHideDuration={3500}
        onClose={() => setMessage(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={() => setMessage(null)} severity="success" sx={{ width: '100%' }}>
          {message}
        </Alert>
      </Snackbar>

      <Snackbar
        open={Boolean(error)}
        autoHideDuration={3500}
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={() => setError(null)} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>
    </>
  );
}

export default memo(PatientReportsTab);
