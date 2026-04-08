import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Pagination,
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
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import VisibilityIcon from '@mui/icons-material/Visibility';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useNavigate } from 'react-router-dom';
import { appointmentService } from '../../api/appointmentService';
import studyDeliveryService from '../../api/studyDeliveryService';
import type { LaboratoryItem, Office, StudyDeliveryItem } from '../../types';

const channelLabels: Record<string, string> = {
  whatsapp_auto: 'WhatsApp automático',
  manual_direct: 'Marcado manual',
  manual_link: 'Link manual',
};

const processingStatusLabels: Record<string, string> = {
  sample_collected: 'Muestra tomada',
  sent_to_lab: 'Enviado al laboratorio',
  result_received: 'Resultado recibido',
  pending_review: 'Pendiente de interpretar',
  reviewed: 'Interpretado',
  cancelled: 'Cancelado',
};

const statusLabels: Record<string, string> = {
  not_sent: 'No enviado',
  sent: 'Enviado',
  viewed: 'Visto',
  downloaded: 'Descargado',
  cancelled: 'Cancelado',
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

function statusColor(status: string): 'default' | 'success' | 'warning' | 'error' | 'info' {
  if (status === 'downloaded') return 'success';
  if (status === 'viewed') return 'info';
  if (status === 'sent') return 'warning';
  if (status === 'not_sent') return 'default';
  if (status === 'cancelled') return 'error';
  return 'default';
}

export default function StudyDeliveriesPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<StudyDeliveryItem[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);
  const [laboratories, setLaboratories] = useState<LaboratoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRows, setTotalRows] = useState(0);
  const [selectedOfficeId, setSelectedOfficeId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedProcessingStatus, setSelectedProcessingStatus] = useState('');
  const [selectedChannel, setSelectedChannel] = useState('');
  const [selectedSeenStatus, setSelectedSeenStatus] = useState('');
  const [selectedLaboratoryId, setSelectedLaboratoryId] = useState('');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedRow, setSelectedRow] = useState<StudyDeliveryItem | null>(null);
  const [editingProcessingStatus, setEditingProcessingStatus] = useState('');
  const [editingLaboratoryId, setEditingLaboratoryId] = useState('');
  const [savingDetail, setSavingDetail] = useState(false);
  const [saveDetailError, setSaveDetailError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    appointmentService.getOffices()
      .then((result) => {
        if (cancelled) return;
        setOffices(result);
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
    let cancelled = false;

    studyDeliveryService.getLaboratories(selectedOfficeId ? Number(selectedOfficeId) : undefined)
      .then((result) => {
        if (cancelled) return;
        setLaboratories(result);
      })
      .catch(() => {
        if (cancelled) return;
        setLaboratories([]);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedOfficeId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    studyDeliveryService.getStudyDeliveries({
      officeId: selectedOfficeId ? Number(selectedOfficeId) : undefined,
      page,
      perPage: 20,
      deliveryStatus: selectedStatus || undefined,
      processingStatus: selectedProcessingStatus || undefined,
      channel: selectedChannel || undefined,
      seenStatus: selectedSeenStatus || undefined,
      laboratoryId: selectedLaboratoryId ? Number(selectedLaboratoryId) : undefined,
      search: search || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    })
      .then((result) => {
        if (cancelled) return;
        setRows(result.data ?? []);
        setTotalPages(result.last_page ?? 1);
        setTotalRows(result.total ?? 0);
      })
      .catch((requestError: unknown) => {
        if (cancelled) return;
        const message = requestError instanceof Error ? requestError.message : 'No se pudo cargar el control de envíos.';
        setError(message);
        setRows([]);
        setTotalPages(1);
        setTotalRows(0);
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedOfficeId, page, selectedStatus, selectedProcessingStatus, selectedChannel, selectedSeenStatus, selectedLaboratoryId, search, dateFrom, dateTo]);

  const activeFilterCount = useMemo(() => {
    return [
      selectedOfficeId,
      selectedStatus,
      selectedProcessingStatus,
      selectedChannel,
      selectedSeenStatus,
      selectedLaboratoryId,
      search.trim(),
      dateFrom,
      dateTo,
    ].filter(Boolean).length;
  }, [selectedOfficeId, selectedStatus, selectedProcessingStatus, selectedChannel, selectedSeenStatus, selectedLaboratoryId, search, dateFrom, dateTo]);

  const detailLaboratoryOptions = useMemo(() => {
    if (!selectedRow) {
      return laboratories;
    }

    return laboratories.filter((laboratory) => laboratory.office_id === selectedRow.office_id);
  }, [laboratories, selectedRow]);

  const handleResetFilters = () => {
    setSelectedOfficeId('');
    setSelectedStatus('');
    setSelectedProcessingStatus('');
    setSelectedChannel('');
    setSelectedSeenStatus('');
    setSelectedLaboratoryId('');
    setSearch('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  const handleOpenDetail = (row: StudyDeliveryItem) => {
    setSelectedRow(row);
    setEditingProcessingStatus(row.processing_status);
    setEditingLaboratoryId(row.laboratory_id ? String(row.laboratory_id) : '');
    setSaveDetailError(null);
  };

  const handleSaveDetail = async () => {
    if (!selectedRow) {
      return;
    }

    const nextProcessingStatus = editingProcessingStatus || selectedRow.processing_status;
    const nextLaboratoryId = editingLaboratoryId ? Number(editingLaboratoryId) : null;
    const currentLaboratoryId = selectedRow.laboratory_id ?? null;
    const hasProcessingChange = nextProcessingStatus !== selectedRow.processing_status;
    const hasLaboratoryChange = nextLaboratoryId !== currentLaboratoryId;

    if (!hasProcessingChange && !hasLaboratoryChange) {
      return;
    }

    setSavingDetail(true);
    setSaveDetailError(null);

    try {
      const updated = await studyDeliveryService.updateStudyDelivery(selectedRow.id, {
        processing_status: nextProcessingStatus,
        laboratory_id: nextLaboratoryId,
      });

      setSelectedRow(updated);
      setEditingProcessingStatus(updated.processing_status);
      setEditingLaboratoryId(updated.laboratory_id ? String(updated.laboratory_id) : '');
      setRows((current) => current.map((row) => (row.id === updated.id ? updated : row)));
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : 'No se pudo actualizar el envío.';
      setSaveDetailError(message);
    } finally {
      setSavingDetail(false);
    }
  };

  return (
    <Box sx={{ display: 'grid', gap: 2.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <LocalShippingIcon sx={{ color: 'primary.main' }} />
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              Control de envíos de estudios
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Seguimiento de resultados de estudios enviados, vistos y descargados.
            </Typography>
          </Box>
        </Box>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} sx={{ alignItems: { xs: 'stretch', sm: 'center' } }}>
          <Button
            variant="outlined"
            sx={{
              color: '#0288d1',
              borderColor: '#0288d1',
              '&:hover': {
                borderColor: '#0277bd',
                backgroundColor: 'rgba(2, 136, 209, 0.04)',
              },
            }}
            onClick={() => navigate('/estudios/interpretar')}
          >
            Interpretar estudios
          </Button>
          <Button
            variant="outlined"
            onClick={() => navigate('/estudios/laboratorios')}
          >
            Laboratorio
          </Button>
          <Button
            variant="contained"
            startIcon={<UploadFileIcon />}
            onClick={() => navigate('/estudios/carga-masiva')}
          >
            Carga masiva
          </Button>
        </Stack>
      </Box>

      <Card>
        <CardContent sx={{ display: 'grid', gap: 2 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} useFlexGap flexWrap="wrap">
            <FormControl size="small" sx={{ minWidth: 210 }}>
              <InputLabel>Consultorio</InputLabel>
              <Select
                value={selectedOfficeId}
                label="Consultorio"
                onChange={(event) => {
                  setSelectedOfficeId(event.target.value);
                  setSelectedLaboratoryId('');
                  setPage(1);
                }}
              >
                <MenuItem value="">Todos</MenuItem>
                {offices.map((office) => (
                  <MenuItem key={office.id} value={String(office.id)}>
                    {office.title}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>Estado</InputLabel>
              <Select
                value={selectedStatus}
                label="Estado"
                onChange={(event) => {
                  setSelectedStatus(event.target.value);
                  setPage(1);
                }}
              >
                <MenuItem value="">Todos</MenuItem>
                {Object.entries(statusLabels).map(([value, label]) => (
                  <MenuItem key={value} value={value}>
                    {label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel>Proceso</InputLabel>
              <Select
                value={selectedProcessingStatus}
                label="Proceso"
                onChange={(event) => {
                  setSelectedProcessingStatus(event.target.value);
                  setPage(1);
                }}
              >
                <MenuItem value="">Todos</MenuItem>
                {Object.entries(processingStatusLabels).map(([value, label]) => (
                  <MenuItem key={value} value={value}>
                    {label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 210 }}>
              <InputLabel>Canal</InputLabel>
              <Select
                value={selectedChannel}
                label="Canal"
                onChange={(event) => {
                  setSelectedChannel(event.target.value);
                  setPage(1);
                }}
              >
                <MenuItem value="">Todos</MenuItem>
                {Object.entries(channelLabels).map(([value, label]) => (
                  <MenuItem key={value} value={value}>
                    {label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>Visto</InputLabel>
              <Select
                value={selectedSeenStatus}
                label="Visto"
                onChange={(event) => {
                  setSelectedSeenStatus(event.target.value);
                  setPage(1);
                }}
              >
                <MenuItem value="">Todos</MenuItem>
                <MenuItem value="seen">Visto</MenuItem>
                <MenuItem value="unseen">No visto</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel>Laboratorio</InputLabel>
              <Select
                value={selectedLaboratoryId}
                label="Laboratorio"
                onChange={(event) => {
                  setSelectedLaboratoryId(event.target.value);
                  setPage(1);
                }}
              >
                <MenuItem value="">Todos</MenuItem>
                {laboratories.map((laboratory) => (
                  <MenuItem key={laboratory.id} value={String(laboratory.id)}>
                    {laboratory.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              size="small"
              label="Paciente o teléfono"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              sx={{ minWidth: { xs: '100%', md: 240 } }}
            />

            <TextField
              size="small"
              type="date"
              label="Desde"
              value={dateFrom}
              onChange={(event) => {
                setDateFrom(event.target.value);
                setPage(1);
              }}
              InputLabelProps={{ shrink: true }}
            />

            <TextField
              size="small"
              type="date"
              label="Hasta"
              value={dateTo}
              onChange={(event) => {
                setDateTo(event.target.value);
                setPage(1);
              }}
              InputLabelProps={{ shrink: true }}
            />

            <Button
              variant="text"
              color="warning"
              onClick={handleResetFilters}
              sx={{ alignSelf: 'center', width: 'fit-content' }}
            >
              Restablecer filtros
            </Button>
          </Stack>

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
            <Typography variant="body2" color="text.secondary">
              {totalRows} registros{activeFilterCount ? ` | ${activeFilterCount} filtros activos` : ''}
            </Typography>
          </Box>

          {error ? <Alert severity="error">{error}</Alert> : null}

          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Fecha de carga del estudio</TableCell>
                  <TableCell>Fecha envío</TableCell>
                  <TableCell>Paciente</TableCell>
                  <TableCell>Canal</TableCell>
                  <TableCell>Proceso</TableCell>
                  <TableCell>Laboratorio</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell>Archivos</TableCell>
                  <TableCell>Visto</TableCell>
                  <TableCell>Descargas</TableCell>
                  <TableCell>Enviado por</TableCell>
                  <TableCell align="right">Detalle</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id} hover>
                    <TableCell>{formatDateTime(row.created_at)}</TableCell>
                    <TableCell>{formatDateTime(row.sent_at)}</TableCell>
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
                    <TableCell>{channelLabels[row.channel] ?? row.channel}</TableCell>
                    <TableCell>{processingStatusLabels[row.processing_status] ?? row.processing_status}</TableCell>
                    <TableCell>{row.laboratory_name || 'Sin laboratorio'}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        color={statusColor(row.status)}
                        label={statusLabels[row.status] ?? row.status}
                      />
                    </TableCell>
                    <TableCell>{row.files.length}</TableCell>
                    <TableCell>{row.viewed_at || row.status === 'viewed' || row.status === 'downloaded' ? 'Sí' : 'No'}</TableCell>
                    <TableCell>{row.download_count}</TableCell>
                    <TableCell>{row.sent_by || 'Sistema'}</TableCell>
                    <TableCell align="right">
                      <Button
                        size="small"
                        startIcon={<VisibilityIcon />}
                        onClick={() => handleOpenDetail(row)}
                      >
                        Ver
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!loading && rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} align="center">
                      Aún no hay envíos registrados con esos filtros.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <Pagination
              count={Math.max(totalPages, 1)}
              page={page}
              color="primary"
              onChange={(_, nextPage) => setPage(nextPage)}
            />
          </Box>
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(selectedRow)}
        onClose={() => setSelectedRow(null)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>Detalle del envío</DialogTitle>
        <DialogContent dividers sx={{ display: 'grid', gap: 2 }}>
          {selectedRow ? (
            <>
              <Box sx={{ display: 'grid', gap: 0.5 }}>
                <Typography variant="h6">{selectedRow.patient_name || 'Paciente'}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Teléfono: {selectedRow.patient_phone || 'Sin teléfono'}
                </Typography>
              </Box>

              {saveDetailError ? <Alert severity="error">{saveDetailError}</Alert> : null}

              <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
                <FormControl size="small" fullWidth>
                  <InputLabel>Proceso</InputLabel>
                  <Select
                    value={editingProcessingStatus}
                    label="Proceso"
                    onChange={(event) => setEditingProcessingStatus(event.target.value)}
                  >
                    {Object.entries(processingStatusLabels).map(([value, label]) => (
                      <MenuItem key={value} value={value}>
                        {label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl size="small" fullWidth>
                  <InputLabel>Laboratorio</InputLabel>
                  <Select
                    value={editingLaboratoryId}
                    label="Laboratorio"
                    onChange={(event) => setEditingLaboratoryId(event.target.value)}
                  >
                    <MenuItem value="">Sin laboratorio</MenuItem>
                    {detailLaboratoryOptions.map((laboratory) => (
                      <MenuItem key={laboratory.id} value={String(laboratory.id)}>
                        {laboratory.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>

              <Box sx={{ display: 'grid', gap: 0.75 }}>
                <Typography variant="body2"><strong>Canal:</strong> {channelLabels[selectedRow.channel] ?? selectedRow.channel}</Typography>
                <Typography variant="body2"><strong>Estado:</strong> {statusLabels[selectedRow.status] ?? selectedRow.status}</Typography>
                <Typography variant="body2"><strong>Fecha de envío:</strong> {formatDateTime(selectedRow.sent_at)}</Typography>
                <Typography variant="body2"><strong>Resultado recibido:</strong> {formatDateTime(selectedRow.received_at)}</Typography>
                <Typography variant="body2"><strong>Interpretado:</strong> {formatDateTime(selectedRow.reviewed_at)}</Typography>
                <Typography variant="body2"><strong>Visto por el paciente:</strong> {formatDateTime(selectedRow.viewed_at)}</Typography>
                <Typography variant="body2"><strong>Primera descarga:</strong> {formatDateTime(selectedRow.first_downloaded_at)}</Typography>
                <Typography variant="body2"><strong>Última descarga:</strong> {formatDateTime(selectedRow.last_downloaded_at)}</Typography>
                <Typography variant="body2"><strong>Descargas:</strong> {selectedRow.download_count}</Typography>
                <Typography variant="body2"><strong>Enviado por:</strong> {selectedRow.sent_by || 'Sistema'}</Typography>
                <Box sx={{ display: 'grid', gap: 0.5 }}>
                  <Typography variant="body2">
                    <strong>Link enviado al paciente:</strong>
                  </Typography>
                  <TextField
                    size="small"
                    fullWidth
                    value={selectedRow.public_code ? `${window.location.origin}/wsapp/${selectedRow.public_code}` : '—'}
                    InputProps={{ readOnly: true }}
                  />
                  {selectedRow.public_code ? (
                    <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
                      <Button
                        size="small"
                        startIcon={<OpenInNewIcon />}
                        onClick={() => {
                          window.open(`/wsapp/${selectedRow.public_code}?preview=1`, '_blank', 'noopener,noreferrer');
                        }}
                      >
                        Previsualizar
                      </Button>
                    </Box>
                  ) : null}
                </Box>
              </Box>

              <Box sx={{ display: 'grid', gap: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  Archivos enviados
                </Typography>
                {selectedRow.files.length ? (
                  selectedRow.files.map((file) => (
                    <Box
                      key={`${selectedRow.id}-${file.id}`}
                      sx={{
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 2,
                        px: 1.5,
                        py: 1,
                      }}
                    >
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {file.title || file.file || `Archivo ${file.position}`}
                      </Typography>
                      {file.description ? (
                        <Typography variant="caption" color="text.secondary">
                          {file.description}
                        </Typography>
                      ) : null}
                    </Box>
                  ))
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No hay archivos asociados.
                  </Typography>
                )}
              </Box>
            </>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedRow(null)} color="inherit">
            Cerrar
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveDetail}
            disabled={!selectedRow || savingDetail}
          >
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

