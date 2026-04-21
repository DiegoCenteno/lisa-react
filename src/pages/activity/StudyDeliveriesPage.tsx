import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
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
import VisibilityIcon from '@mui/icons-material/Visibility';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { useRef } from 'react';
import dayjs from 'dayjs';
import { appointmentService } from '../../api/appointmentService';
import { patientService } from '../../api/patientService';
import studyDeliveryService from '../../api/studyDeliveryService';
import StudyModuleTabs from '../../components/activity/StudyModuleTabs';
import ClickableDateField from '../../components/ClickableDateField';
import type { LaboratoryItem, Office, Patient, StudyDeliveryItem } from '../../types';

type StudyDeliveryColumnKey =
  | 'sample_collected_at'
  | 'sent_to_lab_at'
  | 'created_at'
  | 'sent_at'
  | 'days_to_send'
  | 'patient'
  | 'study'
  | 'channel'
  | 'process'
  | 'laboratory'
  | 'status'
  | 'files'
  | 'seen'
  | 'downloads'
  | 'sent_by'
  | 'detail';

const STUDY_DELIVERY_COLUMNS: Array<{ key: StudyDeliveryColumnKey; label: string }> = [
  { key: 'sample_collected_at', label: 'Fecha de toma de muestra' },
  { key: 'sent_to_lab_at', label: 'Fecha envío a laboratorio' },
  { key: 'created_at', label: 'Fecha de carga del estudio' },
  { key: 'sent_at', label: 'Fecha envío' },
  { key: 'days_to_send', label: 'Días a envío' },
  { key: 'patient', label: 'Paciente' },
  { key: 'study', label: 'Estudio' },
  { key: 'channel', label: 'Canal' },
  { key: 'process', label: 'Proceso' },
  { key: 'laboratory', label: 'Laboratorio' },
  { key: 'status', label: 'Estado' },
  { key: 'files', label: 'Archivos' },
  { key: 'seen', label: 'Visto' },
  { key: 'downloads', label: 'Descargas' },
  { key: 'sent_by', label: 'Enviado por' },
  { key: 'detail', label: 'Detalle' },
];

const STUDY_DELIVERY_COLUMNS_STORAGE_KEY = 'study-deliveries-visible-columns';

function getDefaultSendDateRange() {
  const today = dayjs().format('YYYY-MM-DD');
  const thirtyDaysAgo = dayjs().subtract(30, 'day').format('YYYY-MM-DD');

  return {
    dateFrom: thirtyDaysAgo,
    dateTo: today,
  };
}

function getDefaultVisibleColumns(): Record<StudyDeliveryColumnKey, boolean> {
  const defaultVisibleKeys = new Set<StudyDeliveryColumnKey>([
    'sample_collected_at',
    'sent_at',
    'patient',
    'study',
    'process',
    'status',
    'sent_by',
    'detail',
  ]);

  return STUDY_DELIVERY_COLUMNS.reduce((accumulator, column) => {
    accumulator[column.key] = defaultVisibleKeys.has(column.key);
    return accumulator;
  }, {} as Record<StudyDeliveryColumnKey, boolean>);
}

function loadVisibleColumns(): Record<StudyDeliveryColumnKey, boolean> {
  const defaults = getDefaultVisibleColumns();

  try {
    const raw = localStorage.getItem(STUDY_DELIVERY_COLUMNS_STORAGE_KEY);
    if (!raw) {
      return defaults;
    }

    const parsed = JSON.parse(raw) as Partial<Record<StudyDeliveryColumnKey, boolean>>;
    return STUDY_DELIVERY_COLUMNS.reduce((accumulator, column) => {
      accumulator[column.key] = parsed[column.key] !== false;
      return accumulator;
    }, {} as Record<StudyDeliveryColumnKey, boolean>);
  } catch {
    return defaults;
  }
}

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

const manualCreateProcessingStatusOptions = [
  'sample_collected',
  'sent_to_lab',
  'result_received',
  'pending_review',
] as const;

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

function formatDayDifference(from?: string | null, to?: string | null): string {
  if (!from || !to) {
    return '—';
  }

  const fromDate = new Date(from.replace(' ', 'T'));
  const toDate = new Date(to.replace(' ', 'T'));

  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
    return '—';
  }

  const fromStart = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate()).getTime();
  const toStart = new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate()).getTime();
  const diffDays = Math.round((toStart - fromStart) / (1000 * 60 * 60 * 24));

  return String(diffDays);
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
  const defaultSendDateRange = useMemo(() => getDefaultSendDateRange(), []);
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
  const [dateFrom, setDateFrom] = useState(() => defaultSendDateRange.dateFrom);
  const [dateTo, setDateTo] = useState(() => defaultSendDateRange.dateTo);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [selectedRow, setSelectedRow] = useState<StudyDeliveryItem | null>(null);
  const [editingProcessingStatus, setEditingProcessingStatus] = useState('');
  const [editingLaboratoryId, setEditingLaboratoryId] = useState('');
  const [savingDetail, setSavingDetail] = useState(false);
  const [saveDetailError, setSaveDetailError] = useState<string | null>(null);
  const [saveDetailSuccess, setSaveDetailSuccess] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createPatientSearch, setCreatePatientSearch] = useState('');
  const [patientOptions, setPatientOptions] = useState<Patient[]>([]);
  const [visiblePatientOptionCount, setVisiblePatientOptionCount] = useState(4);
  const [patientSearchLoading, setPatientSearchLoading] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [newProcessingStatus, setNewProcessingStatus] = useState<(typeof manualCreateProcessingStatusOptions)[number]>('sample_collected');
  const [newLaboratoryId, setNewLaboratoryId] = useState('');
  const [creatingDelivery, setCreatingDelivery] = useState(false);
  const [createDeliveryError, setCreateDeliveryError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [showColumnConfig, setShowColumnConfig] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<Record<StudyDeliveryColumnKey, boolean>>(() => loadVisibleColumns());
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const searchDebounceTimeoutRef = useRef<number | null>(null);
  const patientSearchDebounceTimeoutRef = useRef<number | null>(null);

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
    return () => {
      if (searchDebounceTimeoutRef.current !== null) {
        window.clearTimeout(searchDebounceTimeoutRef.current);
      }
      if (patientSearchDebounceTimeoutRef.current !== null) {
        window.clearTimeout(patientSearchDebounceTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (offices.length === 1) {
      const onlyOfficeId = String(offices[0].id);
      setSelectedOfficeId((current) => (current === onlyOfficeId ? current : onlyOfficeId));
      return;
    }

    if (selectedOfficeId && !offices.some((office) => String(office.id) === selectedOfficeId)) {
      setSelectedOfficeId('');
    }
  }, [offices, selectedOfficeId]);

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
  }, [selectedOfficeId, page, selectedStatus, selectedProcessingStatus, selectedChannel, selectedSeenStatus, selectedLaboratoryId, search, dateFrom, dateTo, reloadKey]);

  useEffect(() => {
    localStorage.setItem(STUDY_DELIVERY_COLUMNS_STORAGE_KEY, JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  useEffect(() => {
    const columnsToEnable = new Set<StudyDeliveryColumnKey>();

    if (selectedStatus) {
      columnsToEnable.add('status');
    }
    if (selectedProcessingStatus) {
      columnsToEnable.add('process');
    }
    if (selectedChannel) {
      columnsToEnable.add('channel');
    }
    if (selectedSeenStatus) {
      columnsToEnable.add('seen');
    }
    if (selectedLaboratoryId) {
      columnsToEnable.add('laboratory');
    }
    if (search.trim()) {
      columnsToEnable.add('patient');
    }
    if (dateFrom || dateTo) {
      columnsToEnable.add('sent_at');
      columnsToEnable.add('sample_collected_at');
      columnsToEnable.add('sent_to_lab_at');
      columnsToEnable.add('created_at');
    }

    if (columnsToEnable.size === 0) {
      return;
    }

    setVisibleColumns((current) => {
      let changed = false;
      const next = { ...current };

      columnsToEnable.forEach((columnKey) => {
        if (!next[columnKey]) {
          next[columnKey] = true;
          changed = true;
        }
      });

      return changed ? next : current;
    });
  }, [dateFrom, dateTo, search, selectedChannel, selectedLaboratoryId, selectedProcessingStatus, selectedSeenStatus, selectedStatus]);

  const activeFilterCount = useMemo(() => {
    return [
      offices.length > 1 ? selectedOfficeId : '',
      selectedStatus,
      selectedProcessingStatus,
      selectedChannel,
      selectedSeenStatus,
      selectedLaboratoryId,
      search.trim(),
      dateFrom !== defaultSendDateRange.dateFrom ? dateFrom : '',
      dateTo !== defaultSendDateRange.dateTo ? dateTo : '',
    ].filter(Boolean).length;
  }, [
    defaultSendDateRange.dateFrom,
    defaultSendDateRange.dateTo,
    offices.length,
    selectedOfficeId,
    selectedStatus,
    selectedProcessingStatus,
    selectedChannel,
    selectedSeenStatus,
    selectedLaboratoryId,
    search,
    dateFrom,
    dateTo,
  ]);

  const hasMovedFilters = activeFilterCount > 0;
  const hasAdvancedFiltersApplied = Boolean(
    (offices.length > 1 && selectedOfficeId)
    || selectedStatus
    || selectedChannel
    || selectedSeenStatus
    || selectedLaboratoryId
  );

  const detailLaboratoryOptions = useMemo(() => {
    if (!selectedRow) {
      return laboratories;
    }

    return laboratories.filter((laboratory) => laboratory.office_id === selectedRow.office_id);
  }, [laboratories, selectedRow]);

  const createDialogLaboratoryOptions = useMemo(() => {
    if (!selectedOfficeId) {
      return [];
    }

    return laboratories.filter((laboratory) => laboratory.office_id === Number(selectedOfficeId));
  }, [laboratories, selectedOfficeId]);

  const visiblePatientOptions = useMemo(
    () => patientOptions.slice(0, visiblePatientOptionCount),
    [patientOptions, visiblePatientOptionCount],
  );

  useEffect(() => {
    if (!showCreateDialog || !selectedOfficeId) {
      setPatientOptions([]);
      setVisiblePatientOptionCount(4);
      setPatientSearchLoading(false);
      return;
    }

    let cancelled = false;

    if (patientSearchDebounceTimeoutRef.current !== null) {
      window.clearTimeout(patientSearchDebounceTimeoutRef.current);
    }

    setPatientSearchLoading(true);
    patientSearchDebounceTimeoutRef.current = window.setTimeout(() => {
      void patientService.getPatients({
        officeIdOverride: Number(selectedOfficeId),
        search: createPatientSearch,
        page: 1,
        perPage: 50,
        view: 'list',
      })
        .then((result) => {
          if (cancelled) {
            return;
          }

          setPatientOptions(result.data ?? []);
          setVisiblePatientOptionCount(4);
        })
        .catch(() => {
          if (cancelled) {
            return;
          }

          setPatientOptions([]);
          setVisiblePatientOptionCount(4);
        })
        .finally(() => {
          if (!cancelled) {
            setPatientSearchLoading(false);
          }
        });
    }, 300);

    return () => {
      cancelled = true;
      if (patientSearchDebounceTimeoutRef.current !== null) {
        window.clearTimeout(patientSearchDebounceTimeoutRef.current);
        patientSearchDebounceTimeoutRef.current = null;
      }
    };
  }, [showCreateDialog, selectedOfficeId, createPatientSearch]);

  useEffect(() => {
    if (!showCreateDialog) {
      return;
    }

    if (!selectedPatientId) {
      return;
    }

    const patientStillAvailable = patientOptions.some((patient) => String(patient.id) === selectedPatientId);
    if (!patientStillAvailable) {
      setSelectedPatientId('');
    }
  }, [patientOptions, selectedPatientId, showCreateDialog]);

  const visibleColumnCount = useMemo(
    () => STUDY_DELIVERY_COLUMNS.filter((column) => visibleColumns[column.key]).length,
    [visibleColumns],
  );

  useEffect(() => {
    if (!selectedRow) {
      return;
    }

    const refreshedSelectedRow = rows.find((row) => row.id === selectedRow.id);
    if (refreshedSelectedRow) {
      setSelectedRow(refreshedSelectedRow);
    }
  }, [rows, selectedRow]);

  const handleResetFilters = () => {
    setSelectedOfficeId('');
    setSelectedStatus('');
    setSelectedProcessingStatus('');
    setSelectedChannel('');
    setSelectedSeenStatus('');
    setSelectedLaboratoryId('');
    setShowAdvancedFilters(false);
    setSearch('');
    if (searchDebounceTimeoutRef.current !== null) {
      window.clearTimeout(searchDebounceTimeoutRef.current);
      searchDebounceTimeoutRef.current = null;
    }
    if (searchInputRef.current) {
      searchInputRef.current.value = '';
    }
    setDateFrom(defaultSendDateRange.dateFrom);
    setDateTo(defaultSendDateRange.dateTo);
    setPage(1);
  };

  const handleOpenCreateDialog = () => {
    if (!selectedOfficeId) {
      return;
    }

    setShowCreateDialog(true);
    setCreatePatientSearch('');
    setPatientOptions([]);
    setVisiblePatientOptionCount(4);
    setSelectedPatientId('');
    setNewProcessingStatus('sample_collected');
    setNewLaboratoryId('');
    setCreateDeliveryError(null);
  };

  const handleCloseCreateDialog = () => {
    setShowCreateDialog(false);
    setCreatePatientSearch('');
    setPatientOptions([]);
    setVisiblePatientOptionCount(4);
    setPatientSearchLoading(false);
    setSelectedPatientId('');
    setNewProcessingStatus('sample_collected');
    setNewLaboratoryId('');
    setCreateDeliveryError(null);
    if (patientSearchDebounceTimeoutRef.current !== null) {
      window.clearTimeout(patientSearchDebounceTimeoutRef.current);
      patientSearchDebounceTimeoutRef.current = null;
    }
  };

  const handleCreateStudyDelivery = async () => {
    if (!selectedOfficeId || !selectedPatientId) {
      return;
    }

    setCreatingDelivery(true);
    setCreateDeliveryError(null);

    try {
      await studyDeliveryService.createSampleStudyDelivery({
        office_id: Number(selectedOfficeId),
        patient_id: Number(selectedPatientId),
        processing_status: newProcessingStatus,
        laboratory_id: newLaboratoryId ? Number(newLaboratoryId) : null,
      });

      handleCloseCreateDialog();
      setPage(1);
      setReloadKey((current) => current + 1);
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : 'No se pudo registrar el proceso del paciente.';
      setCreateDeliveryError(message);
    } finally {
      setCreatingDelivery(false);
    }
  };

  const handleOpenDetail = (row: StudyDeliveryItem) => {
    setSelectedRow(row);
    setEditingProcessingStatus(row.processing_status);
    setEditingLaboratoryId(row.laboratory_id ? String(row.laboratory_id) : '');
    setSaveDetailError(null);
    setSaveDetailSuccess(null);
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
    setSaveDetailSuccess(null);

    try {
      const updated = await studyDeliveryService.updateStudyDelivery(selectedRow.id, {
        processing_status: nextProcessingStatus,
        laboratory_id: nextLaboratoryId,
      });

      setSelectedRow(updated);
      setEditingProcessingStatus(updated.processing_status);
      setEditingLaboratoryId(updated.laboratory_id ? String(updated.laboratory_id) : '');
      setRows((current) => current.map((row) => (row.id === updated.id ? updated : row)));
      setSaveDetailSuccess('Cambios guardados correctamente.');
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : 'No se pudo actualizar el envío.';
      setSaveDetailError(message);
    } finally {
      setSavingDetail(false);
    }
  };

  const handleOpenEvidenceFile = async (fileId: number) => {
    try {
      const blob = await patientService.getFileBlob(fileId);
      const blobUrl = window.URL.createObjectURL(blob);
      window.open(blobUrl, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => {
        window.URL.revokeObjectURL(blobUrl);
      }, 60_000);
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : 'No se pudo abrir la evidencia de envío.';
      setSaveDetailError(message);
    }
  };

  return (
    <Box sx={{ display: 'grid', gap: 2.5 }}>
      <Box sx={{ display: 'grid', gap: 1.5 }}>
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
        </Box>
        <StudyModuleTabs />
      </Box>

      <Card>
        <CardContent sx={{ display: 'grid', gap: 2 }}>
          <Stack spacing={1.5}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} useFlexGap flexWrap="wrap">
              <ClickableDateField
                label="Desde"
                value={dateFrom}
                onChange={(value) => {
                  setDateFrom(value);
                  setPage(1);
                }}
                size="small"
                fullWidth={false}
                sx={{ flex: { md: '1 1 220px' } }}
              />

              <ClickableDateField
                label="Hasta"
                value={dateTo}
                onChange={(value) => {
                  setDateTo(value);
                  setPage(1);
                }}
                size="small"
                fullWidth={false}
                minDate={dateFrom || undefined}
                sx={{ flex: { md: '1 1 220px' } }}
              />

              <FormControl size="small" sx={{ flex: { md: '1 1 180px' } }}>
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
            </Stack>

            <TextField
              size="small"
              label="Paciente o teléfono"
              inputRef={searchInputRef}
              defaultValue={search}
              onChange={(event) => {
                const nextValue = event.target.value;
                if (searchDebounceTimeoutRef.current !== null) {
                  window.clearTimeout(searchDebounceTimeoutRef.current);
                }
                searchDebounceTimeoutRef.current = window.setTimeout(() => {
                  setSearch(nextValue.trim());
                  setPage(1);
                }, 300);
              }}
              fullWidth
            />

            <Collapse in={showAdvancedFilters || hasAdvancedFiltersApplied}>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} useFlexGap flexWrap="wrap">
                {offices.length > 1 ? (
                  <FormControl size="small" sx={{ flex: { md: '1 1 180px' } }}>
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
                ) : null}

                <FormControl size="small" sx={{ flex: { md: '1 1 160px' } }}>
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

                <FormControl size="small" sx={{ flex: { md: '1 1 170px' } }}>
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

                <FormControl size="small" sx={{ flex: { md: '1 1 140px' } }}>
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

                <FormControl size="small" sx={{ flex: { md: '1 1 190px' } }}>
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
              </Stack>
            </Collapse>

            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 1.5, flexWrap: 'wrap' }}>
              <Button
                variant="text"
                onClick={() => setShowAdvancedFilters((current) => !current)}
                sx={{ alignSelf: 'flex-start', width: 'fit-content', textTransform: 'none', px: 0 }}
              >
                Más filtros
              </Button>
            </Box>

            {hasMovedFilters ? (
              <Button
                variant="text"
                color="warning"
                onClick={handleResetFilters}
                sx={{ alignSelf: 'center', width: 'fit-content' }}
              >
                Restablecer filtros
              </Button>
            ) : null}
          </Stack>

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
            <Typography variant="body2" color="text.secondary">
              {totalRows} registros{activeFilterCount ? ` | ${activeFilterCount} filtros activos` : ''}
            </Typography>
            <Button
              variant="text"
              onClick={() => setShowColumnConfig((current) => !current)}
              sx={{ textTransform: 'none', alignSelf: 'center' }}
            >
              Configurar columnas
            </Button>
          </Box>

          <Collapse in={showColumnConfig}>
            <Card variant="outlined">
              <CardContent sx={{ display: 'grid', gap: 1.25 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  Configurar columnas
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' }, gap: 0.5 }}>
                  {STUDY_DELIVERY_COLUMNS.map((column) => (
                    <FormControlLabel
                      key={column.key}
                      control={
                        <Checkbox
                          checked={visibleColumns[column.key]}
                          onChange={(event) => {
                            setVisibleColumns((current) => ({
                              ...current,
                              [column.key]: event.target.checked,
                            }));
                          }}
                          size="small"
                        />
                      }
                      label={column.label}
                    />
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Collapse>

          {error ? <Alert severity="error">{error}</Alert> : null}

          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {visibleColumns.sample_collected_at ? <TableCell>Fecha de toma de muestra</TableCell> : null}
                  {visibleColumns.sent_to_lab_at ? <TableCell>Fecha envío a laboratorio</TableCell> : null}
                  {visibleColumns.created_at ? <TableCell>Fecha de carga del estudio</TableCell> : null}
                  {visibleColumns.sent_at ? <TableCell>Fecha envío</TableCell> : null}
                  {visibleColumns.days_to_send ? <TableCell>Días a envío</TableCell> : null}
                  {visibleColumns.patient ? <TableCell>Paciente</TableCell> : null}
                  {visibleColumns.study ? <TableCell>Estudio</TableCell> : null}
                  {visibleColumns.channel ? <TableCell>Canal</TableCell> : null}
                  {visibleColumns.process ? <TableCell>Proceso</TableCell> : null}
                  {visibleColumns.laboratory ? <TableCell>Laboratorio</TableCell> : null}
                  {visibleColumns.status ? <TableCell>Estado</TableCell> : null}
                  {visibleColumns.files ? <TableCell>Archivos</TableCell> : null}
                  {visibleColumns.seen ? <TableCell>Visto</TableCell> : null}
                  {visibleColumns.downloads ? <TableCell>Descargas</TableCell> : null}
                  {visibleColumns.sent_by ? <TableCell>Enviado por</TableCell> : null}
                  {visibleColumns.detail ? <TableCell align="right">Detalle</TableCell> : null}
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id} hover>
                    {visibleColumns.sample_collected_at ? <TableCell>{formatDateTime(row.sample_collected_at)}</TableCell> : null}
                    {visibleColumns.sent_to_lab_at ? <TableCell>{formatDateTime(row.sent_to_lab_at)}</TableCell> : null}
                    {visibleColumns.created_at ? <TableCell>{formatDateTime(row.created_at)}</TableCell> : null}
                    {visibleColumns.sent_at ? <TableCell>{formatDateTime(row.sent_at)}</TableCell> : null}
                    {visibleColumns.days_to_send ? <TableCell>{formatDayDifference(row.sample_collected_at, row.sent_at)}</TableCell> : null}
                    {visibleColumns.patient ? (
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
                    ) : null}
                    {visibleColumns.study ? <TableCell>{row.study_name || 'Sin tipo de estudio'}</TableCell> : null}
                    {visibleColumns.channel ? <TableCell>{channelLabels[row.channel] ?? row.channel}</TableCell> : null}
                    {visibleColumns.process ? <TableCell>{processingStatusLabels[row.processing_status] ?? row.processing_status}</TableCell> : null}
                    {visibleColumns.laboratory ? <TableCell>{row.laboratory_name || 'Sin laboratorio'}</TableCell> : null}
                    {visibleColumns.status ? (
                      <TableCell>
                        <Chip
                          size="small"
                          color={statusColor(row.status)}
                          label={statusLabels[row.status] ?? row.status}
                        />
                      </TableCell>
                    ) : null}
                    {visibleColumns.files ? <TableCell>{row.files.length}</TableCell> : null}
                    {visibleColumns.seen ? <TableCell>{row.viewed_at || row.status === 'viewed' || row.status === 'downloaded' ? 'Sí' : 'No'}</TableCell> : null}
                    {visibleColumns.downloads ? <TableCell>{row.download_count}</TableCell> : null}
                    {visibleColumns.sent_by ? <TableCell>{row.sent_by || 'Sistema'}</TableCell> : null}
                    {visibleColumns.detail ? (
                      <TableCell align="right">
                        <Button
                          size="small"
                          startIcon={<VisibilityIcon />}
                          onClick={() => handleOpenDetail(row)}
                        >
                          Ver
                        </Button>
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
                {!loading && rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={Math.max(visibleColumnCount, 1)} align="center">
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
        open={showCreateDialog}
        onClose={handleCloseCreateDialog}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Asignar estudio al control de envíos</DialogTitle>
        <DialogContent dividers sx={{ display: 'grid', gap: 2 }}>
          {createDeliveryError ? <Alert severity="error">{createDeliveryError}</Alert> : null}

          <TextField
            size="small"
            label="Buscar paciente"
            value={createPatientSearch}
            onChange={(event) => setCreatePatientSearch(event.target.value)}
            placeholder="Nombre o teléfono"
            fullWidth
          />

          <Box
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2,
              p: 1.5,
              display: 'grid',
              gap: 1,
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Paciente
            </Typography>

            {patientSearchLoading ? (
              <Typography variant="body2" color="text.secondary">
                Buscando pacientes…
              </Typography>
            ) : null}

            {!patientSearchLoading && visiblePatientOptions.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                {createPatientSearch.trim() ? 'Sin resultados para esa búsqueda.' : 'Escribe nombre o teléfono para buscar pacientes.'}
              </Typography>
            ) : null}

            {visiblePatientOptions.map((patient) => {
              const patientLabel = patient.full_name || `${patient.name} ${patient.last_name}`.trim() || 'Paciente';
              const isChecked = selectedPatientId === String(patient.id);

              return (
                <Box
                  key={patient.id}
                  onClick={() => setSelectedPatientId(isChecked ? '' : String(patient.id))}
                  sx={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 1,
                    px: 1,
                    py: 0.75,
                    borderRadius: 1.5,
                    border: '1px solid',
                    borderColor: isChecked ? 'primary.main' : 'divider',
                    backgroundColor: isChecked ? 'rgba(25, 118, 210, 0.06)' : 'transparent',
                    cursor: 'pointer',
                  }}
                >
                  <Checkbox
                    checked={isChecked}
                    onClick={(event) => event.stopPropagation()}
                    onChange={() => setSelectedPatientId(isChecked ? '' : String(patient.id))}
                    size="small"
                    sx={{ mt: -0.25 }}
                  />
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {patientLabel}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {patient.phone || 'Sin teléfono'}
                    </Typography>
                  </Box>
                </Box>
              );
            })}
          </Box>

          <FormControl size="small" fullWidth>
            <InputLabel>Nuevo proceso</InputLabel>
            <Select
              value={newProcessingStatus}
              label="Nuevo proceso"
              onChange={(event) => setNewProcessingStatus(event.target.value as (typeof manualCreateProcessingStatusOptions)[number])}
            >
              {manualCreateProcessingStatusOptions.map((value) => (
                <MenuItem key={value} value={value}>
                  {processingStatusLabels[value]}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" fullWidth>
            <InputLabel>Laboratorio</InputLabel>
            <Select
              value={newLaboratoryId}
              label="Laboratorio"
              onChange={(event) => setNewLaboratoryId(event.target.value)}
            >
              <MenuItem value="">Sin laboratorio</MenuItem>
              {createDialogLaboratoryOptions.map((laboratory) => (
                <MenuItem key={laboratory.id} value={String(laboratory.id)}>
                  {laboratory.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCreateDialog} color="inherit">
            Cerrar
          </Button>
          <Button
            variant="contained"
            onClick={handleCreateStudyDelivery}
            disabled={!selectedOfficeId || !selectedPatientId || creatingDelivery}
          >
            Guardar
          </Button>
        </DialogActions>
      </Dialog>

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
              {saveDetailSuccess ? (
                <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                  <Alert severity="success" sx={{ width: 'fit-content', minWidth: 280, justifyContent: 'center' }}>
                    {saveDetailSuccess}
                  </Alert>
                </Box>
              ) : null}

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
                <Typography variant="body2"><strong>Tipo de estudio:</strong> {selectedRow.study_name || 'Sin tipo de estudio'}</Typography>
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
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                    <TextField
                      size="small"
                      fullWidth
                      value={selectedRow.public_code ? `${window.location.origin}/wsapp/${selectedRow.public_code}` : '—'}
                      InputProps={{ readOnly: true }}
                    />
                    {selectedRow.public_code ? (
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<ContentCopyIcon />}
                        onClick={() => {
                          const publicLink = `${window.location.origin}/wsapp/${selectedRow.public_code}`;
                          void navigator.clipboard.writeText(publicLink).catch(() => undefined);
                        }}
                        sx={{ minWidth: 108, mt: 0.4 }}
                      >
                        Copiar
                      </Button>
                    ) : null}
                  </Box>
                  <Typography variant="caption" sx={{ color: 'error.main', lineHeight: 1.4 }}>
                    Puedes copiar este link y enviárselo al paciente. Evita abrirlo tú directamente, porque eso puede cambiar su estatus de no visto a visto. Si el médico necesita revisar el contenido, usa el botón de previsualizar para no marcarlo como leído.
                  </Typography>
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
                  Evidencia de envío
                </Typography>
                {selectedRow.evidence_file ? (
                  <Box
                    sx={{
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 2,
                      px: 1.5,
                      py: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 1,
                    }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {selectedRow.evidence_file.title || selectedRow.evidence_file.file || 'Evidencia de envío'}
                      </Typography>
                      {selectedRow.evidence_file.description ? (
                        <Typography variant="caption" color="text.secondary">
                          {selectedRow.evidence_file.description}
                        </Typography>
                      ) : null}
                    </Box>
                    <Button
                      size="small"
                      startIcon={<OpenInNewIcon />}
                      onClick={() => {
                        if (selectedRow.evidence_file?.id) {
                          void handleOpenEvidenceFile(selectedRow.evidence_file.id);
                        }
                      }}
                    >
                      Ver
                    </Button>
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No hay evidencia de envío asociada.
                  </Typography>
                )}
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

