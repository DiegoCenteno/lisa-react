import { memo, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  MenuItem,
  Snackbar,
  TextField,
  Typography,
} from '@mui/material';
import {
  Close as CancelIcon,
  Edit as EditIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import type { Patient } from '../../types';
import { patientService } from '../../api/patientService';
import { formatDisplayDate } from '../../utils/date';
import ClickableDateField from '../../components/ClickableDateField';

interface Props {
  patient: Patient;
  onPatientUpdated: (patient: Patient) => void;
}

function InfoRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <Box sx={{ mb: 1.5 }}>
      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
        {label}
      </Typography>
      <Typography variant="body2">{value}</Typography>
    </Box>
  );
}

function formatPhoneNumber(phone?: string) {
  const digits = String(phone ?? '').replace(/\D/g, '');
  if (digits.length === 10) {
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  }
  return phone ?? '';
}

function PatientProfileTabInner({ patient, onPatientUpdated }: Props) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveEnabled, setSaveEnabled] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    last_name: '',
    phone: '',
    birth_date: '',
    gender: '',
  });

  useEffect(() => {
    setForm({
      name: patient.name ?? '',
      last_name: patient.last_name ?? '',
      phone: patient.phone ?? '',
      birth_date: patient.birth_date ?? '',
      gender: patient.gender ?? '',
    });
  }, [patient]);

  useEffect(() => {
    if (!editing) {
      setSaveEnabled(false);
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setSaveEnabled(true);
    }, 5000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [editing]);

  const updateFormField = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setSaveEnabled(true);
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const handleCancel = () => {
    setForm({
      name: patient.name ?? '',
      last_name: patient.last_name ?? '',
      phone: patient.phone ?? '',
      birth_date: patient.birth_date ?? '',
      gender: patient.gender ?? '',
    });
    setEditing(false);
    setSaveEnabled(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const updatedPatient = await patientService.updatePatient(patient.id, {
        name: form.name.trim(),
        last_name: form.last_name.trim(),
        phone: form.phone.trim(),
        birth: form.birth_date || undefined,
        gender: form.gender || undefined,
      });
      onPatientUpdated(updatedPatient);
      setEditing(false);
      setSaveEnabled(false);
      setMessage('Datos generales actualizados');
    } catch (err) {
      console.error('Error actualizando paciente:', err);
      setError('No se pudieron guardar los cambios');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, gap: 1, flexWrap: 'wrap' }}>
            <Typography variant="h6">Perfil</Typography>
            {editing ? (
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button variant="outlined" startIcon={<CancelIcon />} onClick={handleCancel} disabled={saving}>
                  Cancelar
                </Button>
                <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave} disabled={saving || !saveEnabled}>
                  Guardar
                </Button>
              </Box>
            ) : (
              <Button
                variant="outlined"
                startIcon={<EditIcon />}
                onClick={() => {
                  setSaveEnabled(false);
                  setEditing(true);
                }}
              >
                Editar
              </Button>
            )}
          </Box>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              {editing ? (
                <TextField label="Nombre(s)" fullWidth value={form.name} onChange={(e) => updateFormField('name', e.target.value)} />
              ) : (
                <InfoRow label="Nombre" value={patient.name} />
              )}
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              {editing ? (
                <TextField label="Apellidos" fullWidth value={form.last_name} onChange={(e) => updateFormField('last_name', e.target.value)} />
              ) : (
                <InfoRow label="Apellidos" value={patient.last_name} />
              )}
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              {editing ? (
                <TextField label="Teléfono" fullWidth value={form.phone} onChange={(e) => updateFormField('phone', e.target.value)} />
              ) : (
                <InfoRow label="Teléfono" value={formatPhoneNumber(patient.phone)} />
              )}
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              {editing ? (
                <ClickableDateField
                  label="Fecha de nacimiento"
                  value={form.birth_date}
                  onChange={(birth_date) => updateFormField('birth_date', birth_date)}
                />
              ) : (
                <InfoRow
                  label="Fecha de Nacimiento"
                  value={patient.birth_date ? `${formatDisplayDate(patient.birth_date)}${patient.age ? ` (${patient.age} años)` : ''}` : undefined}
                />
              )}
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              {editing ? (
                <TextField select label="Género" fullWidth value={form.gender} onChange={(e) => updateFormField('gender', e.target.value)}>
                  <MenuItem value="">Sin especificar</MenuItem>
                  <MenuItem value="Masculino">Masculino</MenuItem>
                  <MenuItem value="Femenino">Femenino</MenuItem>
                </TextField>
              ) : (
                <InfoRow label="Género" value={patient.gender} />
              )}
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Snackbar open={Boolean(message)} autoHideDuration={3000} onClose={() => setMessage(null)} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert onClose={() => setMessage(null)} severity="success" sx={{ width: '100%' }}>{message}</Alert>
      </Snackbar>
      <Snackbar open={Boolean(error)} autoHideDuration={3000} onClose={() => setError(null)} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert onClose={() => setError(null)} severity="error" sx={{ width: '100%' }}>{error}</Alert>
      </Snackbar>
    </>
  );
}

export default memo(PatientProfileTabInner);
