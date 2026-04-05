import { memo, useCallback, useMemo, useState } from 'react';
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
  InputAdornment,
  Paper,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  ArticleOutlined as LogbookIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import type { Patient, SOAPNote } from '../../types';
import { formatDisplayDate } from '../../utils/date';
import { consultationService } from '../../api/consultationService';

interface Props {
  patient: Pick<Patient, 'id' | 'name' | 'last_name'>;
  soapNotes: SOAPNote[];
  canEditConsultationHistory: boolean;
  onNavigateToBitacora: () => void;
  onEditNote: (note: SOAPNote) => void;
}

function ConsultationHistoryTabInner({
  patient,
  soapNotes,
  canEditConsultationHistory,
  onNavigateToBitacora,
  onEditNote,
}: Props) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [expandedFields, setExpandedFields] = useState<Record<string, boolean>>({});
  const [prescriptionFormatOpen, setPrescriptionFormatOpen] = useState(false);
  const [selectedPrescriptionNote, setSelectedPrescriptionNote] = useState<SOAPNote | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const filteredNotes = useMemo(() => {
    if (!searchQuery.trim()) return soapNotes;
    const query = searchQuery.toLowerCase();
    return soapNotes.filter(
      (note) =>
        note.subjective?.toLowerCase().includes(query) ||
        note.objective?.toLowerCase().includes(query) ||
        note.assessment?.toLowerCase().includes(query) ||
        note.plan?.toLowerCase().includes(query) ||
        note.private_comments?.toLowerCase().includes(query)
    );
  }, [soapNotes, searchQuery]);

  const paginatedNotes = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredNotes.slice(start, start + rowsPerPage);
  }, [filteredNotes, page, rowsPerPage]);

  const formatHistoricalTitleDate = useCallback((value?: string | null) => {
    const raw = String(value ?? '').trim();
    if (!raw) return '';

    const datePortion = raw.includes('T')
      ? raw.split('T')[0]
      : raw.includes(' ')
        ? raw.split(' ')[0]
        : raw;

    const match = datePortion.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) {
      return formatDisplayDate(value);
    }

    const [, year, month, day] = match;
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    if (Number.isNaN(date.getTime())) {
      return formatDisplayDate(value);
    }

    const monthName = date.toLocaleString('es-MX', { month: 'long' });
    return `${date.getDate()}/${monthName}/${date.getFullYear()}`;
  }, []);

  const downloadPrescriptionBlob = useCallback((blob: Blob, extension: 'docx' | 'pdf') => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeName = `${patient.name}_${patient.last_name}`.replace(/[^A-Za-z0-9_-]/g, '_');
    link.href = url;
    link.download = `${safeName || 'Receta'}.${extension}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }, [patient.last_name, patient.name]);

  const buildPrescriptionPayload = useCallback((note: SOAPNote) => ({
    patient_id: patient.id,
    prescription_date: note.created_at,
    height: note.height?.trim() || undefined,
    weight: note.weight?.trim() || undefined,
    ta: note.ta?.trim() || undefined,
    temp: note.temp?.trim() || undefined,
    fc: note.fc?.trim() || undefined,
    os: note.os?.trim() || undefined,
    diagnostics: (note.diagnostics ?? []).map((value) => value.trim()).filter(Boolean),
    medications: (note.medications ?? [])
      .map((row) => ({
        medicament: row.medicament.trim(),
        prescription: row.prescription.trim(),
      }))
      .filter((row) => row.medicament || row.prescription),
    indicaciones: note.indicaciones?.trim() || undefined,
  }), [patient.id]);

  const handleDownloadPrescription = useCallback(async (extension: 'docx' | 'pdf') => {
    if (!selectedPrescriptionNote) {
      return;
    }

    try {
      setDownloadError(null);
      const payload = buildPrescriptionPayload(selectedPrescriptionNote);
      const blob = extension === 'pdf'
        ? await consultationService.downloadPrescriptionPdf(payload)
        : await consultationService.downloadPrescription(payload);

      downloadPrescriptionBlob(blob, extension);
      setPrescriptionFormatOpen(false);
    } catch (error) {
      console.error(`Error descargando receta en ${extension}:`, error);
      setDownloadError(extension === 'pdf'
        ? 'No se pudo descargar la receta en PDF.'
        : 'No se pudo descargar la receta en Word.');
    }
  }, [buildPrescriptionPayload, downloadPrescriptionBlob, selectedPrescriptionNote]);

  const handleOpenPrescription = useCallback((note: SOAPNote) => {
    setSelectedPrescriptionNote(note);
    setPrescriptionFormatOpen(true);
  }, []);

  const toggleExpandedField = useCallback((key: string) => {
    setExpandedFields((current) => ({
      ...current,
      [key]: true,
    }));
  }, []);

  const renderExpandableText = useCallback((text: string, expandKey: string, color: string) => {
    const normalized = text.trim() || '-';
    const shouldTruncate = normalized !== '-' && normalized.length > 100;
    const expanded = Boolean(expandedFields[expandKey]);
    const visibleText = shouldTruncate && !expanded ? `${normalized.slice(0, 100)}...` : normalized;

    return (
      <Typography sx={{ fontSize: '0.92rem', color }}>
        {visibleText}
        {shouldTruncate && !expanded ? (
          <>
            {' '}
            <Box
              component="button"
              type="button"
              onClick={() => toggleExpandedField(expandKey)}
              sx={{
                border: 0,
                background: 'transparent',
                color: '#1e88e5',
                p: 0,
                m: 0,
                font: 'inherit',
                fontSize: '0.92rem',
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              Leer más
            </Box>
          </>
        ) : null}
      </Typography>
    );
  }, [expandedFields, toggleExpandedField]);

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Histórico de Consultas
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
          <Button
            variant="outlined"
            startIcon={<LogbookIcon />}
            onClick={onNavigateToBitacora}
          >
            Bitácora
          </Button>
        </Box>
        <TextField
          fullWidth
          placeholder="Buscar en motivo, análisis, plan o notas..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          size="small"
          sx={{ mb: 2 }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
            },
          }}
        />
        {soapNotes.length === 0 ? (
          <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
            No hay consultas registradas
          </Typography>
        ) : (
          <>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                {!isMobile && (
                  <TableHead>
                    <TableRow>
                      <TableCell>Fecha</TableCell>
                      <TableCell>Motivo</TableCell>
                      <TableCell>Resumen</TableCell>
                      <TableCell align="center">Receta</TableCell>
                      <TableCell align="right">Acción</TableCell>
                    </TableRow>
                  </TableHead>
                )}
                <TableBody>
                  {paginatedNotes.map((note) => (
                    isMobile ? (
                      <TableRow key={note.consultation_id ?? note.id} hover>
                        <TableCell sx={{ p: 0, borderBottom: '1px solid rgba(224, 224, 224, 1)' }}>
                          {(() => {
                            const noteDate = formatHistoricalTitleDate(note.created_at);
                            const noteKey = String(note.consultation_id ?? note.id);
                            const summaryText = [note.objective, note.assessment, note.plan, note.private_comments].filter(Boolean).join(' | ') || '-';
                            return (
                          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                            <Box
                              sx={{
                                height: 10,
                                backgroundColor: '#16324f',
                              }}
                            />
                            <Box
                              sx={{
                                px: 2,
                                py: 1.25,
                                backgroundColor: '#eef7ff',
                                borderBottom: '1px solid rgba(224, 224, 224, 1)',
                              }}
                            >
                              <Typography sx={{ fontWeight: 700, color: '#245a7a', fontSize: '0.92rem' }}>
                                {formatDisplayDate(note.created_at)}
                              </Typography>
                            </Box>
                            <Box sx={{ px: 2, py: 1.25, borderBottom: '1px solid rgba(224, 224, 224, 1)' }}>
                              <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', color: '#3b4650', mb: noteDate ? 0.15 : 0.25 }}>
                                Motivo de cita
                              </Typography>
                              {noteDate ? (
                                <Typography sx={{ fontSize: '0.72rem', color: '#8a94a0', mb: 0.35 }}>
                                  [{noteDate}]
                                </Typography>
                              ) : null}
                              {renderExpandableText(note.subjective || '-', `${noteKey}-subjective`, '#333')}
                            </Box>
                            <Box sx={{ px: 2, py: 1.25, borderBottom: '1px solid rgba(224, 224, 224, 1)' }}>
                              <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', color: '#3b4650', mb: noteDate ? 0.15 : 0.25 }}>
                                Resumen
                              </Typography>
                              {noteDate ? (
                                <Typography sx={{ fontSize: '0.72rem', color: '#8a94a0', mb: 0.35 }}>
                                  [{noteDate}]
                                </Typography>
                              ) : null}
                              {renderExpandableText(summaryText, `${noteKey}-summary`, '#59636e')}
                            </Box>
                            <Box sx={{ px: 2, py: 1.25, borderBottom: '1px solid rgba(224, 224, 224, 1)' }}>
                              <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', color: '#3b4650', mb: noteDate ? 0.15 : 0.75 }}>
                                Receta
                              </Typography>
                              {noteDate ? (
                                <Typography sx={{ fontSize: '0.72rem', color: '#8a94a0', mb: 0.6 }}>
                                  [{noteDate}]
                                </Typography>
                              ) : null}
                              <Button
                                size="small"
                                variant="outlined"
                                onClick={() => handleOpenPrescription(note)}
                              >
                                Descargar
                              </Button>
                            </Box>
                            <Box sx={{ px: 2, py: 1.25 }}>
                              <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', color: '#3b4650', mb: noteDate ? 0.15 : 0.75 }}>
                                Acción
                              </Typography>
                              {noteDate ? (
                                <Typography sx={{ fontSize: '0.72rem', color: '#8a94a0', mb: 0.6 }}>
                                  [{noteDate}]
                                </Typography>
                              ) : null}
                              <Button
                                size="small"
                                variant="outlined"
                                onClick={() => onEditNote(note)}
                                disabled={!canEditConsultationHistory}
                              >
                                Editar
                              </Button>
                            </Box>
                          </Box>
                            );
                          })()}
                        </TableCell>
                      </TableRow>
                    ) : (
                      <TableRow key={note.consultation_id ?? note.id} hover>
                        <TableCell sx={{ whiteSpace: 'nowrap', fontWeight: 500 }}>
                          {formatDisplayDate(note.created_at)}
                        </TableCell>
                      <TableCell sx={{ maxWidth: 280 }}>
                        {renderExpandableText(note.subjective || '-', `${String(note.consultation_id ?? note.id)}-subjective`, '#333')}
                      </TableCell>
                      <TableCell sx={{ maxWidth: 520 }}>
                        {renderExpandableText(
                          [note.objective, note.assessment, note.plan, note.private_comments].filter(Boolean).join(' | ') || '-',
                          `${String(note.consultation_id ?? note.id)}-summary`,
                          '#59636e'
                        )}
                      </TableCell>
                        <TableCell align="center">
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => handleOpenPrescription(note)}
                          >
                            Descargar
                          </Button>
                        </TableCell>
                        <TableCell align="right">
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => onEditNote(note)}
                            disabled={!canEditConsultationHistory}
                          >
                            Editar
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  ))}
                  {paginatedNotes.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={isMobile ? 1 : 5} sx={{ textAlign: 'center', py: 4 }}>
                        <Typography color="text.secondary">
                          No se encontraron consultas
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={filteredNotes.length}
              page={page}
              onPageChange={(_event, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(event) => {
                setRowsPerPage(parseInt(event.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={[5, 10, 25]}
              labelRowsPerPage="Filas"
            />
          </>
        )}
      </CardContent>

      <Dialog
        open={prescriptionFormatOpen}
        onClose={() => setPrescriptionFormatOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Descargar receta</DialogTitle>
        <DialogContent dividers>
          <Typography>
            ¿En qué formato deseas descargar la receta?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPrescriptionFormatOpen(false)} color="inherit">
            Cancelar
          </Button>
          <Button onClick={() => void handleDownloadPrescription('pdf')}>
            PDF
          </Button>
          <Button variant="contained" onClick={() => void handleDownloadPrescription('docx')}>
            Word
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={Boolean(downloadError)}
        autoHideDuration={3000}
        onClose={() => setDownloadError(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={() => setDownloadError(null)} severity="error" sx={{ width: '100%' }}>
          {downloadError}
        </Alert>
      </Snackbar>
    </Card>
  );
}

export default memo(ConsultationHistoryTabInner);
