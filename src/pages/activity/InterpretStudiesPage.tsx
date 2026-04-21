import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  Link,
  MenuItem,
  Pagination,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import PsychologyIcon from '@mui/icons-material/Psychology';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloseIcon from '@mui/icons-material/Close';
import notificationService from '../../api/notificationService';
import { patientService } from '../../api/patientService';
import studyDeliveryService from '../../api/studyDeliveryService';
import StudyModuleTabs from '../../components/activity/StudyModuleTabs';
import type { PatientResultTemplate, StudyDeliveryItem } from '../../types';

type PreviewEntry = {
  rowId: number;
  officeId: number;
  fileId: number;
  fileName: string;
};

function formatDateTime(value?: string | null): string {
  if (!value) {
    return '—';
  }

  const parsed = new Date(value.replace(' ', 'T'));
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('es-MX', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed);
}

export default function InterpretStudiesPage() {
  const [rows, setRows] = useState<StudyDeliveryItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [processingAction, setProcessingAction] = useState(false);
  const [templateMap, setTemplateMap] = useState<Record<number, PatientResultTemplate[]>>({});
  const [selectedTemplates, setSelectedTemplates] = useState<Record<number, string>>({});
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [previewRowId, setPreviewRowId] = useState<number | null>(null);
  const [previewOfficeId, setPreviewOfficeId] = useState<number | null>(null);
  const [previewTemplateValue, setPreviewTemplateValue] = useState('');
  const [previewFileName, setPreviewFileName] = useState('');
  const [previewFileUrl, setPreviewFileUrl] = useState<string | null>(null);
  const [actionModalOpen, setActionModalOpen] = useState(false);

  const previewEntries = useMemo<PreviewEntry[]>(
    () =>
      rows.flatMap((row) =>
        row.files.map((file) => ({
          rowId: row.id,
          officeId: row.office_id,
          fileId: file.id,
          fileName: file.title || file.file || `Archivo ${file.position}`,
        }))
      ),
    [rows]
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    studyDeliveryService
      .getStudyDeliveries({
        page,
        perPage: 50,
        deliveryStatus: 'not_sent',
      })
      .then(async (result) => {
        if (cancelled) return;
        const pendingRows = (result.data ?? []).filter((row) => row.files.length > 0);
        setRows(pendingRows);
        setTotalPages(result.last_page ?? 1);
        setSelectedTemplates((current) => {
          const next = { ...current };
          pendingRows.forEach((row) => {
            if (row.template_id && !next[row.id]) {
              next[row.id] = String(row.template_id);
            }
          });
          return next;
        });

        const officeIds = Array.from(new Set(pendingRows.map((row) => row.office_id)));
        const templateEntries = await Promise.all(
          officeIds.map(async (officeId) => [officeId, await notificationService.getResultTemplates(officeId)] as const)
        );

        if (cancelled) return;
        setTemplateMap(Object.fromEntries(templateEntries));
      })
      .catch((requestError: unknown) => {
        if (cancelled) return;
        const message =
          requestError instanceof Error
            ? requestError.message
            : 'No se pudo cargar la lista de estudios por interpretar.';
        setError(message);
        setRows([]);
        setTotalPages(1);
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [page]);

  useEffect(() => {
    return () => {
      if (previewFileUrl) {
        window.URL.revokeObjectURL(previewFileUrl);
      }
    };
  }, [previewFileUrl]);

  const selectableRows = useMemo(
    () => rows.filter((row) => Boolean(selectedTemplates[row.id])),
    [rows, selectedTemplates]
  );

  const previewTemplates = previewOfficeId ? (templateMap[previewOfficeId] ?? []) : [];
  const previewTemplateDescription =
    previewTemplates.find((template) => String(template.id) === previewTemplateValue)?.data ?? '';
  const hasNextPreview = previewIndex !== null && previewIndex < previewEntries.length - 1;

  const persistPreviewTemplate = () => {
    if (previewRowId) {
      setSelectedTemplates((current) => ({
        ...current,
        [previewRowId]: previewTemplateValue,
      }));
    }
  };

  const loadPreviewByIndex = async (nextIndex: number) => {
    const entry = previewEntries[nextIndex];
    if (!entry) {
      return;
    }

    const blob = await patientService.getFileBlob(entry.fileId);
    if (previewFileUrl) {
      window.URL.revokeObjectURL(previewFileUrl);
    }

    const blobUrl = window.URL.createObjectURL(blob);
    setPreviewIndex(nextIndex);
    setPreviewRowId(entry.rowId);
    setPreviewOfficeId(entry.officeId);
    setPreviewTemplateValue(selectedTemplates[entry.rowId] ?? '');
    setPreviewFileUrl(blobUrl);
    setPreviewFileName(entry.fileName);
  };

  const handleOpenPreview = async (rowId: number, fileId: number) => {
    const nextIndex = previewEntries.findIndex((entry) => entry.rowId === rowId && entry.fileId === fileId);
    if (nextIndex === -1) {
      return;
    }

    await loadPreviewByIndex(nextIndex);
  };

  const handleOpenFirstPreview = async () => {
    if (previewEntries.length === 0) {
      return;
    }

    await loadPreviewByIndex(0);
  };

  const handleNextPreview = async () => {
    if (previewIndex === null) {
      return;
    }

    persistPreviewTemplate();
    if (!hasNextPreview) {
      handleClosePreview();
      return;
    }

    await loadPreviewByIndex(previewIndex + 1);
  };

  const handleClosePreview = () => {
    persistPreviewTemplate();
    if (previewFileUrl) {
      window.URL.revokeObjectURL(previewFileUrl);
    }
    setPreviewIndex(null);
    setPreviewRowId(null);
    setPreviewOfficeId(null);
    setPreviewTemplateValue('');
    setPreviewFileUrl(null);
    setPreviewFileName('');
  };

  const handleInterpretOnly = async () => {
    if (selectableRows.length === 0) {
      return;
    }

    setProcessingAction(true);
    setSendError(null);

    try {
      const updatedRows = await Promise.all(
        selectableRows.map((row) =>
          studyDeliveryService.updateStudyDelivery(row.id, {
            template_id: Number(selectedTemplates[row.id]),
            processing_status: 'reviewed',
          })
        )
      );

      setRows((current) => current.map((row) => updatedRows.find((item) => item.id === row.id) ?? row));
      setActionModalOpen(false);
    } catch (requestError) {
      const message =
        requestError instanceof Error ? requestError.message : 'No se pudieron interpretar los estudios seleccionados.';
      setSendError(message);
    } finally {
      setProcessingAction(false);
    }
  };

  const handleInterpretAndSend = async () => {
    if (selectableRows.length === 0) {
      return;
    }

    setProcessingAction(true);
    setSendError(null);

    try {
      await Promise.all(
        selectableRows.map((row) =>
          studyDeliveryService.updateStudyDelivery(row.id, {
            template_id: Number(selectedTemplates[row.id]),
            processing_status: 'reviewed',
          })
        )
      );

      const items = selectableRows.map((row) => ({
        study_delivery_id: row.id,
        template_id: Number(selectedTemplates[row.id]),
      }));

      await studyDeliveryService.sendStudyDeliveries(items);
      setRows((current) => current.filter((row) => !selectedTemplates[row.id]));
      setSelectedTemplates({});
      setActionModalOpen(false);
    } catch (requestError) {
      const message =
        requestError instanceof Error ? requestError.message : 'No se pudieron interpretar y enviar los estudios seleccionados.';
      setSendError(message);
    } finally {
      setProcessingAction(false);
    }
  };

  return (
    <Box sx={{ display: 'grid', gap: 2.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <PsychologyIcon sx={{ color: 'primary.main' }} />
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              Interpretar estudios
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Estudios con archivos cargados y pendientes de envío al paciente.
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, ml: 'auto' }}>
          <Button
            variant="outlined"
            onClick={() => void handleOpenFirstPreview()}
            disabled={loading || previewEntries.length === 0}
          >
            Interpretar estudios
          </Button>
          <Button
            variant="contained"
            color="success"
            onClick={() => setActionModalOpen(true)}
            disabled={processingAction || selectableRows.length === 0}
          >
            Enviar
          </Button>
        </Box>
      </Box>

      <StudyModuleTabs />

      <Card>
        <CardContent sx={{ display: 'grid', gap: 2 }}>
          {error ? <Alert severity="error">{error}</Alert> : null}
          {sendError ? <Alert severity="error">{sendError}</Alert> : null}

          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell width={56} align="center"></TableCell>
                  <TableCell>Fecha de carga del estudio</TableCell>
                  <TableCell>Paciente</TableCell>
                  <TableCell>Laboratorio</TableCell>
                  <TableCell>Archivos</TableCell>
                  <TableCell>Plantilla</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id} hover>
                    <TableCell align="center">
                      {selectedTemplates[row.id] ? <CheckCircleIcon sx={{ color: 'success.main', fontSize: 28 }} /> : null}
                    </TableCell>
                    <TableCell>{formatDateTime(row.created_at)}</TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {row.patient_name || 'Paciente'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {row.patient_phone || 'Sin teléfono'}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>{row.laboratory_name || 'Sin laboratorio'}</TableCell>
                    <TableCell>
                      <Stack spacing={0.5}>
                        {row.files.map((file) => (
                          <Link
                            key={`${row.id}-${file.id}`}
                            component="button"
                            type="button"
                            underline="hover"
                            onClick={() => void handleOpenPreview(row.id, file.id)}
                            sx={{ textAlign: 'left', width: 'fit-content' }}
                          >
                            {file.title || file.file || `Archivo ${file.position}`}
                          </Link>
                        ))}
                      </Stack>
                    </TableCell>
                    <TableCell sx={{ minWidth: 260 }}>
                      <FormControl size="small" fullWidth>
                        <InputLabel>Plantilla</InputLabel>
                        <Select
                          value={selectedTemplates[row.id] ?? ''}
                          label="Plantilla"
                          onChange={(event) => {
                            const value = event.target.value;
                            setSelectedTemplates((current) => ({
                              ...current,
                              [row.id]: value,
                            }));
                          }}
                        >
                          <MenuItem value="">Seleccionar</MenuItem>
                          {(templateMap[row.office_id] ?? []).map((template) => (
                            <MenuItem key={template.id} value={String(template.id)}>
                              {template.code}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </TableCell>
                  </TableRow>
                ))}
                {!loading && rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      No hay estudios pendientes por interpretar.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <Pagination count={Math.max(totalPages, 1)} page={page} color="primary" onChange={(_, nextPage) => setPage(nextPage)} />
          </Box>
        </CardContent>
      </Card>

      <Dialog open={Boolean(previewFileUrl)} onClose={handleClosePreview} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 1, pb: 1.25 }}>
          <Typography variant="h6" sx={{ fontSize: '1.05rem', fontWeight: 700, lineHeight: 1.2 }}>
            {previewFileName || 'Vista previa PDF'}
          </Typography>
          <IconButton onClick={handleClosePreview} size="small">
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0, height: '86vh', display: 'grid', gridTemplateRows: 'auto 1fr' }}>
          <Box sx={{ px: 2, pt: 0.75, pb: 1.25, display: 'grid', gap: 0.9, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.25 }}>
              <FormControl size="small" fullWidth sx={{ flex: 1, minWidth: 0 }}>
                <InputLabel>Plantilla</InputLabel>
                <Select
                  value={previewTemplateValue}
                  label="Plantilla"
                  onChange={(event) => setPreviewTemplateValue(event.target.value)}
                >
                  <MenuItem value="">Seleccionar</MenuItem>
                  {previewTemplates.map((template) => (
                    <MenuItem key={template.id} value={String(template.id)}>
                      {template.code}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Box sx={{ flexShrink: 0, pt: 0.5 }}>
                <Button
                variant="contained"
                onClick={() => void handleNextPreview()}
                sx={{
                  minWidth: 120,
                  backgroundColor: '#2e7d32',
                    color: '#fff',
                    '&:hover': { backgroundColor: '#1b5e20' },
                    '&.Mui-disabled': { color: '#fff', opacity: 0.45 },
                  }}
                >
                  Siguiente
                </Button>
              </Box>
            </Box>
            {previewTemplateValue ? (
              <Typography variant="body2" color="text.secondary">
                {previewTemplateDescription || 'Sin descripción.'}
              </Typography>
            ) : null}
          </Box>
          {previewFileUrl ? (
            <Box
              component="iframe"
              src={previewFileUrl}
              title={previewFileName || 'Vista previa PDF'}
              sx={{ width: '100%', height: '100%', border: 0 }}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={actionModalOpen} onClose={() => !processingAction && setActionModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Enviar estudios</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 1.5 }}>
          <Typography variant="body2" color="text.secondary">
            `Interpretar` guarda la plantilla seleccionada y marca el estudio como revisado, pero no se envía al paciente.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            `Enviar` primero interpreta los estudios seleccionados y enseguida los envía al paciente.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setActionModalOpen(false)} disabled={processingAction}>
            Cerrar
          </Button>
          <Button onClick={() => void handleInterpretOnly()} disabled={processingAction || selectableRows.length === 0}>
            Interpretar
          </Button>
          <Button
            variant="contained"
            color="success"
            onClick={() => void handleInterpretAndSend()}
            disabled={processingAction || selectableRows.length === 0}
          >
            Enviar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
