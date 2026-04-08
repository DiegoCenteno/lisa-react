import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  Link,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { useNavigate } from 'react-router-dom';
import { appointmentService } from '../../api/appointmentService';
import studyDeliveryService from '../../api/studyDeliveryService';
import type { Office, PatientSimple, PendingStudyDeliveryLink } from '../../types';

GlobalWorkerOptions.workerSrc = pdfWorker;

type DetectionStatus = 'processing' | 'detected' | 'manual' | 'multiple' | 'not_found' | 'no_text';

interface UploadRow {
  id: string;
  file: File;
  fileName: string;
  extractedText: string;
  detectionStatus: DetectionStatus;
  assignedPatient: PatientSimple | null;
  includeUpload: boolean;
  pendingLinks: PendingStudyDeliveryLink[];
  selectedPendingId: string;
  loadingPendingLinks: boolean;
}

const CREATE_NEW_PENDING_VALUE = '__create_new__';

const detectionLabels: Record<DetectionStatus, string> = {
  processing: 'Procesando',
  detected: 'Detectado',
  manual: 'Asignado manualmente',
  multiple: 'Coincidencia múltiple',
  not_found: 'Sin coincidencia',
  no_text: 'Sin texto legible',
};

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

function buildPatientSearchTerms(patient: PatientSimple): string[] {
  const fullName = normalizeText(patient.full_name || '');
  const tokens = fullName.split(' ').filter((token) => token.length >= 3);
  const combined = tokens.length > 1 ? [tokens.join(' ')] : [];

  return Array.from(new Set([fullName, ...combined, ...tokens].filter(Boolean)));
}

function detectPatientFromText(text: string, patients: PatientSimple[]): { patient: PatientSimple | null; status: DetectionStatus } {
  const normalizedText = normalizeText(text);
  if (normalizedText.length < 10) {
    return { patient: null, status: 'no_text' };
  }

  let bestScore = 0;
  let bestPatients: PatientSimple[] = [];

  patients.forEach((patient) => {
    const terms = buildPatientSearchTerms(patient);
    if (terms.length === 0) return;

    let score = 0;
    const fullName = terms[0];

    if (fullName && normalizedText.includes(fullName)) {
      score = 100;
    } else {
      const tokenMatches = terms.slice(1).filter((term) => normalizedText.includes(term)).length;
      if (tokenMatches >= 2) {
        score = tokenMatches;
      }
    }

    if (score <= 0) return;

    if (score > bestScore) {
      bestScore = score;
      bestPatients = [patient];
      return;
    }

    if (score === bestScore) {
      bestPatients.push(patient);
    }
  });

  if (bestScore <= 0) {
    return { patient: null, status: 'not_found' };
  }

  if (bestPatients.length === 1) {
    return { patient: bestPatients[0], status: 'detected' };
  }

  return { patient: null, status: 'multiple' };
}

async function extractPdfText(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const pdf = await getDocument({ data: buffer }).promise;
  const chunks: string[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ');

    chunks.push(pageText);
  }

  return chunks.join(' ').trim();
}

export default function BulkStudyUploadPage() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [offices, setOffices] = useState<Office[]>([]);
  const [patients, setPatients] = useState<PatientSimple[]>([]);
  const [selectedOfficeId, setSelectedOfficeId] = useState('');
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [rows, setRows] = useState<UploadRow[]>([]);
  const [processingFiles, setProcessingFiles] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [previewFileName, setPreviewFileName] = useState('');
  const [previewFileUrl, setPreviewFileUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    appointmentService.getOffices()
      .then((result) => {
        if (cancelled) return;
        setOffices(result);
        if (result.length === 1) {
          setSelectedOfficeId(String(result[0].id));
        }
      })
      .catch(() => {
        if (cancelled) return;
        setOffices([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedOfficeId) {
      setPatients([]);
      setRows([]);
      return;
    }

    let cancelled = false;
    setLoadingPatients(true);

    appointmentService.getPatients(Number(selectedOfficeId))
      .then((result) => {
        if (cancelled) return;
        setPatients(result);
      })
      .catch(() => {
        if (cancelled) return;
        setPatients([]);
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingPatients(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedOfficeId]);

  useEffect(() => {
    return () => {
      if (previewFileUrl) {
        window.URL.revokeObjectURL(previewFileUrl);
      }
    };
  }, [previewFileUrl]);

  const selectedCount = useMemo(() => rows.filter((row) => row.includeUpload).length, [rows]);

  const canUpload = useMemo(() => {
    return rows.some((row) => {
      if (!row.includeUpload || !row.assignedPatient) {
        return false;
      }

      if (row.pendingLinks.length <= 1) {
        return true;
      }

      return row.selectedPendingId !== '';
    });
  }, [rows]);

  const loadPendingLinks = async (rowId: string, patientId: number) => {
    if (!selectedOfficeId) return;

    setRows((current) => current.map((row) => (
      row.id === rowId
        ? { ...row, loadingPendingLinks: true, pendingLinks: [], selectedPendingId: '' }
        : row
    )));

    try {
      const pendingLinks = await studyDeliveryService.getPendingStudyLinks(Number(selectedOfficeId), patientId);
      setRows((current) => current.map((row) => {
        if (row.id !== rowId) {
          return row;
        }

        let selectedPendingId = row.selectedPendingId;
        if (pendingLinks.length === 0) {
          selectedPendingId = CREATE_NEW_PENDING_VALUE;
        } else if (pendingLinks.length === 1) {
          selectedPendingId = String(pendingLinks[0].id);
        } else if (selectedPendingId !== '' && selectedPendingId !== CREATE_NEW_PENDING_VALUE) {
          const stillExists = pendingLinks.some((item) => String(item.id) === selectedPendingId);
          if (!stillExists) {
            selectedPendingId = '';
          }
        }

        return {
          ...row,
          pendingLinks,
          loadingPendingLinks: false,
          selectedPendingId,
        };
      }));
    } catch {
      setRows((current) => current.map((row) => (
        row.id === rowId
          ? { ...row, pendingLinks: [], loadingPendingLinks: false, selectedPendingId: CREATE_NEW_PENDING_VALUE }
          : row
      )));
    }
  };

  const getPendingSelectionLabel = (row: UploadRow): string => {
    if (row.selectedPendingId === CREATE_NEW_PENDING_VALUE) {
      return 'Crear como recibido nuevo';
    }

    if (!row.selectedPendingId) {
      return '';
    }

    const matchedPendingLink = row.pendingLinks.find((item) => String(item.id) === row.selectedPendingId);
    return matchedPendingLink?.label ?? '';
  };

  const applyAssignedPatient = (rowId: string, patient: PatientSimple | null, source: 'detected' | 'manual') => {
    setRows((current) => current.map((row) => {
      if (row.id !== rowId) return row;

      return {
        ...row,
        assignedPatient: patient,
        includeUpload: Boolean(patient),
        detectionStatus: patient ? source : row.detectionStatus === 'detected' ? 'not_found' : row.detectionStatus,
        pendingLinks: [],
        selectedPendingId: '',
        loadingPendingLinks: Boolean(patient),
      };
    }));

    if (patient) {
      void loadPendingLinks(rowId, patient.id);
    }
  };

  const handleSelectFiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? []);
    if (!selectedOfficeId) {
      setError('Primero selecciona un consultorio.');
      return;
    }

    if (selectedFiles.length === 0) {
      return;
    }

    if (selectedFiles.some((file) => file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf'))) {
      setError('En carga masiva solo se permiten archivos PDF.');
      return;
    }

    if (selectedFiles.length > 10) {
      setError('Solo se permiten hasta 10 documentos por interacción.');
      return;
    }

    setError(null);
    setSuccessMessage(null);
    setProcessingFiles(true);

    try {
      const preparedRows: UploadRow[] = [];

      for (const file of selectedFiles) {
        const rowId = `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`;
        let extractedText = '';

        try {
          extractedText = await extractPdfText(file);
        } catch {
          extractedText = '';
        }

        const detection = detectPatientFromText(extractedText, patients);

        preparedRows.push({
          id: rowId,
          file,
          fileName: file.name,
          extractedText,
          detectionStatus: detection.status,
          assignedPatient: detection.patient,
          includeUpload: Boolean(detection.patient),
          pendingLinks: [],
          selectedPendingId: '',
          loadingPendingLinks: false,
        });
      }

      setRows(preparedRows);

      preparedRows.forEach((row) => {
        if (row.assignedPatient) {
          void loadPendingLinks(row.id, row.assignedPatient.id);
        }
      });
    } finally {
      setProcessingFiles(false);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedOfficeId) {
      setError('Selecciona un consultorio.');
      return;
    }

    const selectedRows = rows.filter((row) => row.includeUpload);
    if (selectedRows.length === 0) {
      setError('Selecciona al menos un archivo asignado para cargar.');
      return;
    }

    const invalidRows = selectedRows.filter((row) => !row.assignedPatient);
    if (invalidRows.length > 0) {
      setError('Todos los archivos seleccionados deben tener un paciente asignado.');
      return;
    }

    const pendingSelectionRequiredRows = selectedRows.filter((row) => row.pendingLinks.length > 1 && row.selectedPendingId === '');
    if (pendingSelectionRequiredRows.length > 0) {
      setError('Debes elegir una opción en el estudio pendiente cuando existan múltiples registros previos.');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await studyDeliveryService.bulkUploadStudies(
        Number(selectedOfficeId),
        selectedRows.map((row) => ({
          patient_id: row.assignedPatient!.id,
          study_delivery_id:
            row.selectedPendingId && row.selectedPendingId !== CREATE_NEW_PENDING_VALUE
              ? Number(row.selectedPendingId)
              : null,
          file: row.file,
        })),
      );

      setSuccessMessage(`Se cargaron ${selectedRows.length} archivo(s) correctamente.`);
      setRows([]);
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : 'No se pudo completar la carga masiva.';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleOpenPreview = (file: File) => {
    if (previewFileUrl) {
      window.URL.revokeObjectURL(previewFileUrl);
    }

    const blobUrl = window.URL.createObjectURL(file);
    setPreviewFileName(file.name);
    setPreviewFileUrl(blobUrl);
  };

  const handleClosePreview = () => {
    if (previewFileUrl) {
      window.URL.revokeObjectURL(previewFileUrl);
    }

    setPreviewFileName('');
    setPreviewFileUrl(null);
  };

  return (
    <Box sx={{ display: 'grid', gap: 2.5 }}>
      <Box>
        <Button
          variant="text"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/estudios')}
          sx={{ px: 0, minWidth: 0 }}
        >
          Regresar
        </Button>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
        <UploadFileIcon sx={{ color: 'primary.main' }} />
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Carga masiva de estudios
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Precarga hasta 10 PDFs, detecta paciente y permite vincularlos a una toma de muestra previa.
          </Typography>
        </Box>
      </Box>

      <Card>
        <CardContent sx={{ display: 'grid', gap: 2 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', md: 'center' }}>
            <FormControl size="small" sx={{ minWidth: 260 }}>
              <InputLabel>Consultorio</InputLabel>
              <Select
                value={selectedOfficeId}
                label="Consultorio"
                onChange={(event) => {
                  setSelectedOfficeId(event.target.value);
                  setError(null);
                  setSuccessMessage(null);
                }}
              >
                <MenuItem value="">Selecciona</MenuItem>
                {offices.map((office) => (
                  <MenuItem key={office.id} value={String(office.id)}>
                    {office.title}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Button
              component="label"
              variant="contained"
              startIcon={<PictureAsPdfIcon />}
              disabled={!selectedOfficeId || processingFiles || loadingPatients}
              sx={{ width: 'fit-content' }}
            >
              Cargar PDFs
              <input
                ref={inputRef}
                type="file"
                hidden
                multiple
                accept="application/pdf,.pdf"
                onChange={handleSelectFiles}
              />
            </Button>

            {loadingPatients ? <CircularProgress size={22} /> : null}

            <Typography variant="body2" color="text.secondary">
              Máximo 10 archivos PDF por interacción.
            </Typography>
          </Stack>

          {error ? <Alert severity="error">{error}</Alert> : null}
          {successMessage ? <Alert severity="success">{successMessage}</Alert> : null}

          {processingFiles ? (
            <Alert severity="info">
              Procesando PDFs y buscando coincidencias de pacientes.
            </Alert>
          ) : null}

          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Cargar</TableCell>
                  <TableCell>Archivo</TableCell>
                  <TableCell>Detección</TableCell>
                  <TableCell>Paciente</TableCell>
                  <TableCell>Estudio pendiente</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id} hover>
                    <TableCell width={70}>
                      <Checkbox
                        checked={row.includeUpload}
                        disabled={!row.assignedPatient || (row.pendingLinks.length > 1 && row.selectedPendingId === '')}
                        onChange={(event) => {
                          const checked = event.target.checked;
                          setRows((current) => current.map((item) => (
                            item.id === row.id ? { ...item, includeUpload: checked } : item
                          )));
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ minWidth: 240 }}>
                      <Link
                        component="button"
                        type="button"
                        underline="hover"
                        onClick={() => handleOpenPreview(row.file)}
                        sx={{ fontWeight: 600, textAlign: 'left' }}
                      >
                        {row.fileName}
                      </Link>
                      <Typography variant="caption" color="text.secondary">
                        {(row.file.size / 1024).toFixed(1)} KB
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ minWidth: 180 }}>
                      <Chip
                        size="small"
                        color={row.detectionStatus === 'detected' ? 'success' : row.detectionStatus === 'manual' ? 'info' : 'default'}
                        label={detectionLabels[row.detectionStatus]}
                      />
                    </TableCell>
                    <TableCell sx={{ minWidth: 320 }}>
                      <Autocomplete
                        size="small"
                        options={patients}
                        getOptionLabel={(option) => `${option.full_name}${option.full_phone ? ` | ${option.full_phone}` : ''}`}
                        value={row.assignedPatient}
                        onChange={(_, value) => applyAssignedPatient(row.id, value, 'manual')}
                        isOptionEqualToValue={(option, value) => option.id === value.id}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Paciente asignado"
                            placeholder="Selecciona paciente"
                          />
                        )}
                      />
                    </TableCell>
                    <TableCell sx={{ minWidth: 320 }}>
                      <FormControl
                        size="small"
                        fullWidth
                        disabled={!row.assignedPatient || row.loadingPendingLinks || (row.pendingLinks.length === 0 && row.selectedPendingId === CREATE_NEW_PENDING_VALUE)}
                      >
                        <InputLabel>Estudio pendiente</InputLabel>
                        <Select
                          value={row.selectedPendingId}
                          label="Estudio pendiente"
                          displayEmpty
                          renderValue={() => {
                            const selectedLabel = getPendingSelectionLabel(row);
                            return selectedLabel || 'Estudio pendiente';
                          }}
                          onChange={(event) => {
                            const value = event.target.value;
                            setRows((current) => current.map((item) => (
                              item.id === row.id ? { ...item, selectedPendingId: value } : item
                            )));
                          }}
                        >
                          {row.pendingLinks.length > 1 ? (
                            <MenuItem value="">
                              Selecciona una opción
                            </MenuItem>
                          ) : null}
                          {row.assignedPatient ? (
                            <MenuItem value={CREATE_NEW_PENDING_VALUE}>
                              Crear como recibido nuevo
                            </MenuItem>
                          ) : null}
                          {row.pendingLinks.map((option) => (
                            <MenuItem key={option.id} value={String(option.id)}>
                              {option.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      {row.pendingLinks.length > 1 && row.selectedPendingId === '' ? (
                        <Typography variant="caption" color="error">
                          Debes seleccionar una opción antes de cargar este archivo.
                        </Typography>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}

                {!processingFiles && rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      Aún no hay PDFs precargados.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </Box>

          {rows.length ? (
            <Typography variant="body2" color="text.secondary">
              Seleccionados para carga: {selectedCount} de {rows.length}
            </Typography>
          ) : null}

          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              onClick={handleUpload}
              disabled={!canUpload || saving || processingFiles}
            >
              {saving ? 'Cargando...' : 'Cargar seleccionados'}
            </Button>
          </Box>
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(previewFileUrl)}
        onClose={handleClosePreview}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>{previewFileName || 'Vista previa del documento'}</DialogTitle>
        <DialogContent dividers>
          {previewFileUrl ? (
            <Box
              component="iframe"
              src={`${previewFileUrl}#toolbar=0&navpanes=0&pagemode=none&view=FitH`}
              title={previewFileName || 'Vista previa del PDF'}
              sx={{ width: '100%', height: '75vh', border: 0 }}
            />
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClosePreview}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
