import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  FormControl,
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
import BiotechIcon from '@mui/icons-material/Biotech';
import { appointmentService } from '../../api/appointmentService';
import studyDeliveryService from '../../api/studyDeliveryService';
import StudyModuleTabs from '../../components/activity/StudyModuleTabs';
import type { Office, StudyTypeItem } from '../../types';

export default function StudyTypesPage() {
  const [offices, setOffices] = useState<Office[]>([]);
  const [studyTypes, setStudyTypes] = useState<StudyTypeItem[]>([]);
  const [selectedOfficeId, setSelectedOfficeId] = useState('');
  const [studyTypeName, setStudyTypeName] = useState('');
  const [studyTypeDescription, setStudyTypeDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deactivatingStudyTypeId, setDeactivatingStudyTypeId] = useState<number | null>(null);
  const [reactivatingStudyTypeId, setReactivatingStudyTypeId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

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
    let cancelled = false;
    setLoading(true);
    setError(null);

    studyDeliveryService.getStudyTypes(selectedOfficeId ? Number(selectedOfficeId) : undefined, true)
      .then((result) => {
        if (cancelled) return;
        setStudyTypes(result);
      })
      .catch((requestError: unknown) => {
        if (cancelled) return;
        const message = requestError instanceof Error ? requestError.message : 'No se pudo cargar el listado de tipos de estudio.';
        setError(message);
        setStudyTypes([]);
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedOfficeId]);

  const visibleStudyTypes = useMemo(() => {
    if (!selectedOfficeId) {
      return studyTypes;
    }

    return studyTypes.filter((studyType) => String(studyType.office_id) === selectedOfficeId);
  }, [studyTypes, selectedOfficeId]);

  const handleCreateStudyType = async () => {
    const normalizedName = studyTypeName.trim();
    const normalizedDescription = studyTypeDescription.trim();

    if (!selectedOfficeId || !normalizedName || saving) {
      return;
    }

    setSaving(true);
    setSaveError(null);

    try {
      const created = await studyDeliveryService.createStudyType({
        office_id: Number(selectedOfficeId),
        name: normalizedName,
        description: normalizedDescription || null,
      });

      setStudyTypes((current) => {
        const next = [created, ...current.filter((item) => item.id !== created.id)];
        return next.sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
      });
      setStudyTypeName('');
      setStudyTypeDescription('');
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : 'No se pudo crear el tipo de estudio.';
      setSaveError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivateStudyType = async (studyType: StudyTypeItem) => {
    if (deactivatingStudyTypeId || reactivatingStudyTypeId) {
      return;
    }

    setDeactivatingStudyTypeId(studyType.id);
    setSaveError(null);

    try {
      await studyDeliveryService.deactivateStudyType(studyType.id);
      setStudyTypes((current) => current.filter((item) => item.id !== studyType.id));
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : 'No se pudo desactivar el tipo de estudio.';
      setSaveError(message);
    } finally {
      setDeactivatingStudyTypeId(null);
    }
  };

  const handleReactivateStudyType = async (studyType: StudyTypeItem) => {
    if (deactivatingStudyTypeId || reactivatingStudyTypeId) {
      return;
    }

    setReactivatingStudyTypeId(studyType.id);
    setSaveError(null);

    try {
      const updated = await studyDeliveryService.reactivateStudyType(studyType.id);
      setStudyTypes((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : 'No se pudo reactivar el tipo de estudio.';
      setSaveError(message);
    } finally {
      setReactivatingStudyTypeId(null);
    }
  };

  return (
    <Box sx={{ display: 'grid', gap: 2.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
        <BiotechIcon sx={{ color: 'primary.main' }} />
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Tipos de estudio
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Catálogo de estudios disponibles para registrar toma de muestra desde SOAP.
          </Typography>
        </Box>
      </Box>

      <StudyModuleTabs />

      <Card>
        <CardContent sx={{ display: 'grid', gap: 2 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} useFlexGap flexWrap="wrap">
            <FormControl size="small" sx={{ minWidth: 240 }}>
              <InputLabel>Consultorio</InputLabel>
              <Select value={selectedOfficeId} label="Consultorio" onChange={(event) => setSelectedOfficeId(event.target.value)}>
                <MenuItem value="">Todos</MenuItem>
                {offices.map((office) => (
                  <MenuItem key={office.id} value={String(office.id)}>
                    {office.title}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              size="small"
              label="Tipo de estudio"
              value={studyTypeName}
              onChange={(event) => setStudyTypeName(event.target.value)}
              sx={{ minWidth: { xs: '100%', md: 260 } }}
            />

            <TextField
              size="small"
              label="Descripción"
              value={studyTypeDescription}
              onChange={(event) => setStudyTypeDescription(event.target.value)}
              sx={{ minWidth: { xs: '100%', md: 320 } }}
            />

            <Button
              variant="contained"
              onClick={handleCreateStudyType}
              disabled={!selectedOfficeId || !studyTypeName.trim() || saving}
              sx={{ width: 'fit-content' }}
            >
              {saving ? 'Guardando...' : 'Guardar tipo'}
            </Button>
          </Stack>

          {saveError ? <Alert severity="error">{saveError}</Alert> : null}
          {error ? <Alert severity="error">{error}</Alert> : null}

          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Tipo de estudio</TableCell>
                  <TableCell>Descripción</TableCell>
                  <TableCell>Consultorio</TableCell>
                  <TableCell>Estatus</TableCell>
                  <TableCell align="right">Acción</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {visibleStudyTypes.map((studyType) => {
                  const office = offices.find((item) => item.id === studyType.office_id);
                  return (
                    <TableRow key={studyType.id} hover>
                      <TableCell>{studyType.name}</TableCell>
                      <TableCell>{studyType.description || '—'}</TableCell>
                      <TableCell>{office?.title || studyType.office_id}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          color={Number(studyType.status ?? 1) === 1 ? 'success' : 'default'}
                          label={Number(studyType.status ?? 1) === 1 ? 'Activo' : 'Inactivo'}
                        />
                      </TableCell>
                      <TableCell align="right">
                        {Number(studyType.status ?? 1) === 1 ? (
                          <Button
                            size="small"
                            color="error"
                            onClick={() => handleDeactivateStudyType(studyType)}
                            disabled={deactivatingStudyTypeId === studyType.id}
                          >
                            {deactivatingStudyTypeId === studyType.id ? 'Desactivando...' : 'Desactivar'}
                          </Button>
                        ) : (
                          <Button
                            size="small"
                            color="success"
                            onClick={() => handleReactivateStudyType(studyType)}
                            disabled={reactivatingStudyTypeId === studyType.id}
                          >
                            {reactivatingStudyTypeId === studyType.id ? 'Reactivando...' : 'Reactivar'}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {!loading && visibleStudyTypes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      No hay tipos de estudio registrados.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
