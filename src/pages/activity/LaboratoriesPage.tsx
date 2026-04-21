import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
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
import ScienceIcon from '@mui/icons-material/Science';
import { appointmentService } from '../../api/appointmentService';
import studyDeliveryService from '../../api/studyDeliveryService';
import StudyModuleTabs from '../../components/activity/StudyModuleTabs';
import type { LaboratoryItem, Office } from '../../types';

export default function LaboratoriesPage() {
  const [offices, setOffices] = useState<Office[]>([]);
  const [laboratories, setLaboratories] = useState<LaboratoryItem[]>([]);
  const [selectedOfficeId, setSelectedOfficeId] = useState('');
  const [laboratoryName, setLaboratoryName] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deactivatingLaboratoryId, setDeactivatingLaboratoryId] = useState<number | null>(null);
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

    studyDeliveryService.getLaboratories(selectedOfficeId ? Number(selectedOfficeId) : undefined)
      .then((result) => {
        if (cancelled) return;
        setLaboratories(result);
      })
      .catch((requestError: unknown) => {
        if (cancelled) return;
        const message = requestError instanceof Error ? requestError.message : 'No se pudo cargar el listado de laboratorios.';
        setError(message);
        setLaboratories([]);
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

  const visibleLaboratories = useMemo(() => {
    if (!selectedOfficeId) {
      return laboratories;
    }

    return laboratories.filter((laboratory) => String(laboratory.office_id) === selectedOfficeId);
  }, [laboratories, selectedOfficeId]);

  const handleCreateLaboratory = async () => {
    const normalizedName = laboratoryName.trim();

    if (!selectedOfficeId || !normalizedName || saving) {
      return;
    }

    setSaving(true);
    setSaveError(null);

    try {
      const created = await studyDeliveryService.createLaboratory({
        office_id: Number(selectedOfficeId),
        name: normalizedName,
      });

      setLaboratories((current) => {
        const next = [created, ...current.filter((item) => item.id !== created.id)];
        return next.sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
      });
      setLaboratoryName('');
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : 'No se pudo crear el laboratorio.';
      setSaveError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivateLaboratory = async (laboratory: LaboratoryItem) => {
    if (deactivatingLaboratoryId) {
      return;
    }

    setDeactivatingLaboratoryId(laboratory.id);
    setSaveError(null);

    try {
      await studyDeliveryService.deactivateLaboratory(laboratory.id);
      setLaboratories((current) => current.filter((item) => item.id !== laboratory.id));
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : 'No se pudo desactivar el laboratorio.';
      setSaveError(message);
    } finally {
      setDeactivatingLaboratoryId(null);
    }
  };

  return (
    <Box sx={{ display: 'grid', gap: 2.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
        <ScienceIcon sx={{ color: 'primary.main' }} />
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Laboratorios
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Alta y consulta de laboratorios disponibles para estudios.
          </Typography>
        </Box>
      </Box>

      <StudyModuleTabs />

      <Card>
        <CardContent sx={{ display: 'grid', gap: 2 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} useFlexGap flexWrap="wrap">
            <FormControl size="small" sx={{ minWidth: 240 }}>
              <InputLabel>Consultorio</InputLabel>
              <Select
                value={selectedOfficeId}
                label="Consultorio"
                onChange={(event) => setSelectedOfficeId(event.target.value)}
              >
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
              label="Nuevo laboratorio"
              value={laboratoryName}
              onChange={(event) => setLaboratoryName(event.target.value)}
              sx={{ minWidth: { xs: '100%', md: 320 } }}
            />

            <Button
              variant="contained"
              onClick={handleCreateLaboratory}
              disabled={!selectedOfficeId || !laboratoryName.trim() || saving}
              sx={{ width: 'fit-content' }}
            >
              {saving ? 'Guardando...' : 'Guardar laboratorio'}
            </Button>
          </Stack>

          {saveError ? <Alert severity="error">{saveError}</Alert> : null}
          {error ? <Alert severity="error">{error}</Alert> : null}

          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Laboratorio</TableCell>
                  <TableCell>Consultorio</TableCell>
                  <TableCell align="right">Acción</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {visibleLaboratories.map((laboratory) => {
                  const office = offices.find((item) => item.id === laboratory.office_id);
                  return (
                    <TableRow key={laboratory.id} hover>
                      <TableCell>{laboratory.name}</TableCell>
                      <TableCell>{office?.title || laboratory.office_id}</TableCell>
                      <TableCell align="right">
                        <Button
                          size="small"
                          color="error"
                          onClick={() => handleDeactivateLaboratory(laboratory)}
                          disabled={deactivatingLaboratoryId === laboratory.id}
                        >
                          {deactivatingLaboratoryId === laboratory.id ? 'Desactivando...' : 'Desactivar'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {!loading && visibleLaboratories.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} align="center">
                      No hay laboratorios registrados.
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
