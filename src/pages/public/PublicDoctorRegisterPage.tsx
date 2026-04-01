import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { LocalHospital as LocalHospitalIcon } from '@mui/icons-material';
import { authService } from '../../api/authService';
import { useAuth } from '../../hooks/useAuth';

type DoctorRegisterFormState = {
  name: string;
  last_name: string;
  phone: string;
  email: string;
  password: string;
  password_confirmation: string;
  promocode: string;
  sumatoria: string;
};

const EMPTY_FORM: DoctorRegisterFormState = {
  name: '',
  last_name: '',
  phone: '',
  email: '',
  password: '',
  password_confirmation: '',
  promocode: '',
  sumatoria: '',
};

const BENEFITS = [
  'Agenda medica digital',
  'Perfil nuevo de hasta 1,000 pacientes',
  'Historia clinica por paciente',
  'Formulario de consulta diaria por paciente',
  'Confirmacion de cita por WhatsApp',
  'Envio de formulario de historia clinica para pacientes nuevos',
  'Ingreso a modulos especificos para asistentes',
  'LISA App',
  'Almacenamiento en la nube para estudios por paciente',
];

export default function PublicDoctorRegisterPage() {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();
  const [form, setForm] = useState<DoctorRegisterFormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showLoginButton, setShowLoginButton] = useState(false);

  const canSubmit = useMemo(() => {
    return Boolean(
      form.name.trim() &&
        form.last_name.trim() &&
        form.phone.trim().length === 10 &&
        form.email.trim() &&
        form.password &&
        form.password_confirmation &&
        form.sumatoria.trim()
    );
  }, [form]);

  if (isAuthenticated) {
    navigate('/dashboard', { replace: true });
    return null;
  }

  const handleChange = (field: keyof DoctorRegisterFormState, value: string) => {
    setForm((current) => ({
      ...current,
      [field]: field === 'phone' ? value.replace(/\D/g, '').slice(0, 10) : value,
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    try {
      setSubmitting(true);
      setError('');
      setSuccess('');
      setShowLoginButton(false);

      await authService.registerDoctor({
        name: form.name.trim(),
        last_name: form.last_name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        password: form.password,
        password_confirmation: form.password_confirmation,
        promocode: form.promocode.trim() || undefined,
        sumatoria: form.sumatoria.trim(),
      });

      await login(form.email.trim(), form.password);
      navigate('/dashboard', { replace: true });
      return;
    } catch (requestError) {
      const backendMessage = axios.isAxiosError(requestError)
        ? (requestError.response?.data as { message?: string } | undefined)?.message
        : undefined;
      const nextError = backendMessage || 'No fue posible completar el registro del medico.';
      setError(nextError);
      setShowLoginButton(
        nextError === 'Correo previamente registrado.' || nextError === 'Ese celular ya está registrado en el sistema.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #dff6ef 0%, #f8fbff 100%)',
        p: 2,
      }}
    >
      <Card sx={{ maxWidth: 820, width: '100%', borderRadius: 4, boxShadow: '0 24px 60px rgba(26, 71, 63, 0.12)' }}>
        <Box
          sx={{
            px: 4,
            py: 3,
            color: 'white',
            background: 'linear-gradient(135deg, #17866d 0%, #2fb398 100%)',
          }}
        >
          <Stack direction="row" spacing={1.5} alignItems="center">
            <LocalHospitalIcon sx={{ fontSize: 34 }} />
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800 }}>
                Registro de medicos
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.92 }}>
                Completa tu alta para iniciar el proceso de registro en LISAmedic.
              </Typography>
            </Box>
          </Stack>
        </Box>

        <CardContent sx={{ p: 4 }}>
          <Stack spacing={3}>
            {error ? <Alert severity="error">{error}</Alert> : null}
            {success ? <Alert severity="success">{success}</Alert> : null}
            {showLoginButton ? (
              <Button variant="outlined" onClick={() => navigate('/login')} sx={{ alignSelf: 'flex-start' }}>
                Ir a iniciar sesion
              </Button>
            ) : null}

            <Box>
              <Typography variant="body1" sx={{ color: '#0e8f56', fontWeight: 600, mb: 1.5 }}>
                Rellena los datos a continuacion para iniciar el proceso del registro en el sistema.
              </Typography>
              <Stack spacing={1}>
                {BENEFITS.map((benefit) => (
                  <Typography key={benefit} variant="body2" sx={{ color: '#0a3c8d' }}>
                    {`• ${benefit}.`}
                  </Typography>
                ))}
              </Stack>
            </Box>

            <Divider />

            <Box component="form" onSubmit={handleSubmit}>
              <Stack spacing={2}>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                  <TextField
                    label="Nombre del medico"
                    value={form.name}
                    onChange={(event) => handleChange('name', event.target.value)}
                    fullWidth
                    required
                  />
                  <TextField
                    label="Apellido"
                    value={form.last_name}
                    onChange={(event) => handleChange('last_name', event.target.value)}
                    fullWidth
                    required
                  />
                </Stack>

                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                  <TextField
                    label="Celular"
                    value={form.phone}
                    onChange={(event) => handleChange('phone', event.target.value)}
                    fullWidth
                    required
                    inputProps={{ maxLength: 10, inputMode: 'numeric' }}
                    helperText="10 digitos"
                  />
                  <TextField
                    label="Correo"
                    type="email"
                    value={form.email}
                    onChange={(event) => handleChange('email', event.target.value)}
                    fullWidth
                    required
                  />
                </Stack>

                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                  <TextField
                    label="Nueva contrasena"
                    type="password"
                    value={form.password}
                    onChange={(event) => handleChange('password', event.target.value)}
                    fullWidth
                    required
                  />
                  <TextField
                    label="Confirmar contrasena"
                    type="password"
                    value={form.password_confirmation}
                    onChange={(event) => handleChange('password_confirmation', event.target.value)}
                    fullWidth
                    required
                  />
                </Stack>

                <TextField
                  label="Codigo promocional"
                  value={form.promocode}
                  onChange={(event) => handleChange('promocode', event.target.value)}
                  fullWidth
                  helperText="Si cuentas con un codigo promocional, ingresalo en este campo"
                />

                <TextField
                  label="Cuanto es 10 + 5?"
                  value={form.sumatoria}
                  onChange={(event) => handleChange('sumatoria', event.target.value)}
                  fullWidth
                  required
                />

                <Typography variant="caption" color="text.secondary">
                  LISAmedic funciona como herramienta digital para mejorar la administracion del consultorio y la
                  atencion con tus pacientes. La informacion proporcionada se maneja como confidencial.
                </Typography>

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="space-between">
                  <Button variant="text" onClick={() => navigate('/login')}>
                    Ya tengo cuenta
                  </Button>
                  <Button type="submit" variant="contained" disabled={!canSubmit || submitting}>
                    Continuar
                  </Button>
                </Stack>
              </Stack>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
