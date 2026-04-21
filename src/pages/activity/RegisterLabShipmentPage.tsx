import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  FormControl,
  IconButton,
  InputLabel,
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
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import dayjs from 'dayjs';
import { appointmentService } from '../../api/appointmentService';
import studyDeliveryService from '../../api/studyDeliveryService';
import StudyModuleTabs from '../../components/activity/StudyModuleTabs';
import ClickableDateField from '../../components/ClickableDateField';
import type { LaboratoryItem, Office, PatientSimple, PendingStudyDeliveryLink, StudyTypeItem } from '../../types';

type ShipmentRow = {
  id: string;
  patient: PatientSimple;
  sampleOptions: PendingStudyDeliveryLink[];
  loadingSampleOptions: boolean;
  mode: 'existing_sample' | 'new_study';
  selectedExistingId: string;
  selectedStudyTypeId: string;
};

function buildRowId(patientId: number) {
  return `shipment-row-${patientId}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function RegisterLabShipmentPage() {
  const [offices, setOffices] = useState<Office[]>([]);
  const [laboratories, setLaboratories] = useState<LaboratoryItem[]>([]);
  const [studyTypes, setStudyTypes] = useState<StudyTypeItem[]>([]);
  const [selectedOfficeId, setSelectedOfficeId] = useState('');
  const [selectedLaboratoryId, setSelectedLaboratoryId] = useState('');
  const [shipmentDate, setShipmentDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [notes, setNotes] = useState('');
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [patientResults, setPatientResults] = useState<PatientSimple[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [rows, setRows] = useState<ShipmentRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const searchRequestVersionRef = useRef(0);
  const patientSearchInputRef = useRef<HTMLInputElement | null>(null);

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
      setLaboratories([]);
      setStudyTypes([]);
      setRows([]);
      setPatientResults([]);
      return;
    }

    let cancelled = false;

    studyDeliveryService.getLaboratories(Number(selectedOfficeId))
      .then((result) => {
        if (!cancelled) {
          setLaboratories(result);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLaboratories([]);
        }
      });

    studyDeliveryService.getStudyTypes(Number(selectedOfficeId))
      .then((result) => {
        if (!cancelled) {
          setStudyTypes(result);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStudyTypes([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedOfficeId]);

  useEffect(() => {
    if (!selectedOfficeId || !searchInput.trim()) {
      searchRequestVersionRef.current += 1;
      setPatientResults([]);
      setSearchLoading(false);
      return;
    }

    let cancelled = false;
    const requestVersion = ++searchRequestVersionRef.current;
    setSearchLoading(true);

    const timeoutId = window.setTimeout(() => {
      appointmentService.getPatients(Number(selectedOfficeId), {
        search: searchInput,
        perPage: 10,
      })
        .then((result) => {
          if (!cancelled && requestVersion === searchRequestVersionRef.current) {
            setPatientResults(result);
          }
        })
        .catch(() => {
          if (!cancelled && requestVersion === searchRequestVersionRef.current) {
            setPatientResults([]);
          }
        })
        .finally(() => {
          if (!cancelled && requestVersion === searchRequestVersionRef.current) {
            setSearchLoading(false);
          }
        });
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [searchInput, selectedOfficeId]);

  const usedExistingIds = useMemo(() => {
    return new Set(
      rows
        .map((row) => row.selectedExistingId)
        .filter((value) => value !== '')
    );
  }, [rows]);

  const loadSampleOptions = async (rowId: string, patientId: number) => {
    if (!selectedOfficeId) {
      return;
    }

    setRows((current) => current.map((row) => (
      row.id === rowId
        ? { ...row, loadingSampleOptions: true, sampleOptions: [], selectedExistingId: '' }
        : row
    )));

    try {
      const options = await studyDeliveryService.getPendingStudyLinks(Number(selectedOfficeId), patientId);
      const sampleOptions = options.filter((item) => item.processing_status === 'sample_collected');

      setRows((current) => current.map((row) => {
        if (row.id !== rowId) {
          return row;
        }

        return {
          ...row,
          sampleOptions,
          loadingSampleOptions: false,
          mode: sampleOptions.length > 0 ? 'existing_sample' : 'new_study',
          selectedExistingId: sampleOptions.length === 1 ? String(sampleOptions[0].id) : '',
          selectedStudyTypeId: '',
        };
      }));
    } catch {
      setRows((current) => current.map((row) => (
        row.id === rowId
          ? { ...row, sampleOptions: [], loadingSampleOptions: false, mode: 'new_study', selectedExistingId: '' }
          : row
      )));
    }
  };

  const handleAddPatient = (patient: PatientSimple) => {
    setSuccessMessage(null);
    setError(null);

    const rowId = buildRowId(patient.id);
    setRows((current) => [
      ...current,
      {
        id: rowId,
        patient,
        sampleOptions: [],
        loadingSampleOptions: true,
        mode: 'new_study',
        selectedExistingId: '',
        selectedStudyTypeId: '',
      },
    ]);
    searchRequestVersionRef.current += 1;
    setSearchInput('');
    setPatientResults([]);
    setSearchLoading(false);
    if (patientSearchInputRef.current) {
      patientSearchInputRef.current.value = '';
      window.requestAnimationFrame(() => {
        patientSearchInputRef.current?.focus();
      });
    }
    void loadSampleOptions(rowId, patient.id);
  };

  const handleRemoveRow = (rowId: string) => {
    setRows((current) => current.filter((row) => row.id !== rowId));
  };

  const handleRowModeChange = (rowId: string, mode: ShipmentRow['mode']) => {
    setRows((current) => current.map((row) => {
      if (row.id !== rowId) {
        return row;
      }

      return {
        ...row,
        mode,
        selectedExistingId: mode === 'existing_sample'
          ? (row.sampleOptions.length === 1 ? String(row.sampleOptions[0].id) : '')
          : '',
        selectedStudyTypeId: mode === 'new_study' ? row.selectedStudyTypeId : '',
      };
    }));
  };

  const handleSubmit = async () => {
    if (!selectedOfficeId) {
      setError('Selecciona un consultorio.');
      return;
    }

    if (rows.length === 0) {
      setError('Agrega al menos una fila para registrar el envío.');
      return;
    }

    const invalidExistingRow = rows.find((row) => row.mode === 'existing_sample' && row.selectedExistingId === '');
    if (invalidExistingRow) {
      setError(`Debes elegir una muestra tomada para ${invalidExistingRow.patient.full_name}.`);
      return;
    }

    const invalidNewRow = rows.find((row) => row.mode === 'new_study' && row.selectedStudyTypeId === '');
    if (invalidNewRow) {
      setError(`Debes elegir un estudio nuevo para ${invalidNewRow.patient.full_name}.`);
      return;
    }

    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const now = dayjs();
      const shipmentTimestamp = dayjs(shipmentDate)
        .hour(now.hour())
        .minute(now.minute())
        .second(now.second())
        .format('YYYY-MM-DD HH:mm:ss');

      const result = await studyDeliveryService.createLabShipment({
        office_id: Number(selectedOfficeId),
        laboratory_id: selectedLaboratoryId ? Number(selectedLaboratoryId) : null,
        sent_at: shipmentTimestamp,
        notes: notes.trim(),
        evidence_file: evidenceFile,
        items: rows.map((row) => ({
          patient_id: row.patient.id,
          mode: row.mode,
          study_delivery_id: row.mode === 'existing_sample' ? Number(row.selectedExistingId) : null,
          study_type_id: row.mode === 'new_study' ? Number(row.selectedStudyTypeId) : null,
        })),
      });

      setSuccessMessage(`Se registraron ${result.length} envío(s) al laboratorio.`);
      setRows([]);
      setSearchInput('');
      setPatientResults([]);
      setSelectedLaboratoryId('');
      setNotes('');
      setEvidenceFile(null);
      setShipmentDate(dayjs().format('YYYY-MM-DD'));
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : 'No se pudo registrar el envío al laboratorio.';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const canSubmit = useMemo(() => {
    if (!selectedOfficeId || rows.length === 0 || saving) {
      return false;
    }

    return rows.every((row) => (
      row.mode === 'existing_sample'
        ? row.selectedExistingId !== ''
        : row.selectedStudyTypeId !== ''
    ));
  }, [rows, saving, selectedOfficeId]);

  return (
    <Box sx={{ display: 'grid', gap: 2.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
        <UploadFileIcon sx={{ color: 'primary.main' }} />
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Registrar envío al laboratorio
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Agrega una o varias muestras. Cada fila puede usar una muestra tomada existente o crear un estudio nuevo y enviarlo al laboratorio.
          </Typography>
        </Box>
      </Box>

      <StudyModuleTabs />

      <Card>
        <CardContent sx={{ display: 'grid', gap: 2 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} useFlexGap flexWrap="wrap">
            {offices.length > 1 ? (
              <FormControl size="small" sx={{ flex: { md: '1 1 220px' } }}>
                <InputLabel>Consultorio</InputLabel>
                <Select
                  value={selectedOfficeId}
                  label="Consultorio"
                  onChange={(event) => {
                    setSelectedOfficeId(event.target.value);
                    setSelectedLaboratoryId('');
                    setRows([]);
                    setSearchInput('');
                    setPatientResults([]);
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
            ) : null}

            <ClickableDateField
              label="Fecha de envío"
              value={shipmentDate}
              onChange={(nextValue) => setShipmentDate(nextValue)}
              size="small"
              fullWidth={false}
              sx={{ flex: { md: '1 1 180px' } }}
            />

            <TextField
              size="small"
              label="Proceso"
              value="Enviado al laboratorio"
              InputProps={{ readOnly: true }}
              sx={{ flex: { md: '1 1 220px' } }}
            />

            <FormControl size="small" sx={{ flex: { md: '1 1 220px' } }}>
              <InputLabel>Laboratorio</InputLabel>
              <Select
                value={selectedLaboratoryId}
                label="Laboratorio"
                onChange={(event) => setSelectedLaboratoryId(event.target.value)}
              >
                <MenuItem value="">Sin laboratorio</MenuItem>
                {laboratories.map((laboratory) => (
                  <MenuItem key={laboratory.id} value={String(laboratory.id)}>
                    {laboratory.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ md: 'center' }}>
            <Button
              component="label"
              variant="outlined"
              startIcon={<UploadFileIcon />}
              sx={{ width: { xs: '100%', md: 'fit-content' } }}
            >
              {evidenceFile ? 'Cambiar evidencia' : 'Agregar evidencia'}
              <input
                hidden
                type="file"
                accept=".jpg,.jpeg,.png,.pdf"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  setEvidenceFile(file);
                }}
              />
            </Button>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Evidencia de envío
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {evidenceFile ? evidenceFile.name : 'Opcional. Puedes adjuntar una imagen, foto o PDF como respaldo del envío.'}
              </Typography>
            </Box>
          </Stack>

          <TextField
            size="small"
            label="Notas"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            multiline
            minRows={2}
          />

          {error ? <Alert severity="error">{error}</Alert> : null}
          {successMessage ? <Alert severity="success">{successMessage}</Alert> : null}
        </CardContent>
      </Card>

      <Card>
        <CardContent sx={{ display: 'grid', gap: 1.5 }}>
          <Typography variant="h6">Buscar pacientes</Typography>
          <TextField
            size="small"
            label="Paciente o teléfono"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            inputRef={patientSearchInputRef}
            placeholder="Nombre, apellidos o teléfono"
            disabled={!selectedOfficeId}
          />

          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Nombre completo</TableCell>
                  <TableCell>Teléfono</TableCell>
                  <TableCell align="right">Agregar</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {searchLoading ? (
                  <TableRow>
                    <TableCell colSpan={3} align="center">
                      <CircularProgress size={20} />
                    </TableCell>
                  </TableRow>
                ) : patientResults.length > 0 ? (
                  patientResults.map((patient) => (
                    <TableRow key={patient.id} hover>
                      <TableCell>{patient.full_name}</TableCell>
                      <TableCell>{patient.phone || 'Sin teléfono'}</TableCell>
                      <TableCell align="right">
                        <Button size="small" onClick={() => handleAddPatient(patient)}>
                          Agregar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} align="center">
                      {!selectedOfficeId
                        ? 'Selecciona un consultorio para comenzar.'
                        : searchInput.trim()
                          ? 'Sin resultados para esa búsqueda.'
                          : 'Escribe nombre o teléfono para buscar pacientes.'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Box>
        </CardContent>
      </Card>

      <Card>
        <CardContent sx={{ display: 'grid', gap: 1.5 }}>
          <Typography variant="h6">Muestras seleccionadas</Typography>
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Paciente</TableCell>
                  <TableCell>Modo</TableCell>
                  <TableCell>Estudio</TableCell>
                  <TableCell align="right">Quitar</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id} hover>
                    <TableCell sx={{ minWidth: 220 }}>
                      <Typography variant="body2" fontWeight={500}>
                        {row.patient.full_name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {row.patient.phone || 'Sin teléfono'}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ minWidth: 220 }}>
                      <FormControl size="small" fullWidth>
                        <InputLabel>Modo</InputLabel>
                        <Select
                          value={row.mode}
                          label="Modo"
                          onChange={(event) => handleRowModeChange(row.id, event.target.value as ShipmentRow['mode'])}
                        >
                          <MenuItem value="existing_sample" disabled={row.sampleOptions.length === 0}>
                            Usar muestra tomada
                          </MenuItem>
                          <MenuItem value="new_study">
                            Crear estudio nuevo
                          </MenuItem>
                        </Select>
                      </FormControl>
                    </TableCell>
                    <TableCell sx={{ minWidth: 320 }}>
                      {row.loadingSampleOptions ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <CircularProgress size={18} />
                          <Typography variant="body2" color="text.secondary">
                            Cargando opciones…
                          </Typography>
                        </Box>
                      ) : row.mode === 'existing_sample' ? (
                        row.sampleOptions.length > 0 ? (
                          <FormControl size="small" fullWidth>
                            <InputLabel>Muestra tomada</InputLabel>
                            <Select
                              value={row.selectedExistingId}
                              label="Muestra tomada"
                              onChange={(event) => {
                                const nextValue = event.target.value;
                                setRows((current) => current.map((item) => (
                                  item.id === row.id
                                    ? { ...item, selectedExistingId: nextValue }
                                    : item
                                )));
                              }}
                            >
                              {row.sampleOptions.map((option) => {
                                const takenByAnotherRow = option.id !== Number(row.selectedExistingId) && usedExistingIds.has(String(option.id));
                                return (
                                  <MenuItem key={option.id} value={String(option.id)} disabled={takenByAnotherRow}>
                                    {option.label}
                                  </MenuItem>
                                );
                              })}
                            </Select>
                          </FormControl>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            No tiene muestras tomadas. Cambia a “Crear estudio nuevo”.
                          </Typography>
                        )
                      ) : (
                        <FormControl size="small" fullWidth>
                          <InputLabel>Estudio</InputLabel>
                          <Select
                            value={row.selectedStudyTypeId}
                            label="Estudio"
                            onChange={(event) => {
                              const nextValue = event.target.value;
                              setRows((current) => current.map((item) => (
                                item.id === row.id
                                  ? { ...item, selectedStudyTypeId: nextValue }
                                  : item
                              )));
                            }}
                          >
                            {studyTypes.map((studyType) => (
                              <MenuItem key={studyType.id} value={String(studyType.id)}>
                                {studyType.name}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <IconButton onClick={() => handleRemoveRow(row.id)} size="small">
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center">
                      Aún no has agregado muestras al envío.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              <Chip label={`${rows.length} fila(s)`} />
              <Chip label="Proceso: Enviado al laboratorio" color="info" />
            </Stack>
            <Button variant="contained" onClick={handleSubmit} disabled={!canSubmit}>
              {saving ? 'Registrando…' : 'Registrar envío'}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}

