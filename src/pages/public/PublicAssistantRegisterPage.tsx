import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Badge as BadgeIcon, PersonAddAlt1 as PersonAddAlt1Icon } from '@mui/icons-material';
import publicStudyService from '../../api/publicStudyService';
import { useAuth } from '../../hooks/useAuth';
import type { PublicAssistantLinkResponse } from '../../types';

type RegisterFormState = {
  code: string;
  name: string;
  last_name: string;
  email: string;
  phone: string;
  password: string;
  password_confirmation: string;
};

const EMPTY_FORM: RegisterFormState = {
  code: '',
  name: '',
  last_name: '',
  email: '',
  phone: '',
  password: '',
  password_confirmation: '',
};

function normalizeCode(value: string): string {
  return value.trim();
}

export default function PublicAssistantRegisterPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const params = useParams<{ code?: string }>();
  const routeCode = normalizeCode(params.code ?? '');

  const [form, setForm] = useState<RegisterFormState>({
    ...EMPTY_FORM,
    code: routeCode,
  });
  const [resolved, setResolved] = useState<PublicAssistantLinkResponse | null>(null);
  const [loading, setLoading] = useState(Boolean(routeCode));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [linkStatus, setLinkStatus] = useState<'idle' | 'ready' | 'not_found' | 'expired' | 'used' | 'error'>('idle');

  useEffect(() => {
    setForm((current) => ({
      ...current,
      code: routeCode,
    }));
  }, [routeCode]);

  useEffect(() => {
    if (!routeCode) {
      setResolved(null);
      setLinkStatus('not_found');
      setLoading(false);
      return;
    }

    let active = true;

    async function resolveLink() {
      try {
        setLoading(true);
        setError('');
        setSuccess('');
        const data = await publicStudyService.resolvePublicAssistantCode(routeCode);
        if (!active) return;

        setResolved(data);
        setLinkStatus('ready');
        setForm((current) => ({
          ...current,
          code: data.code,
          name: current.name || data.name || '',
        }));
      } catch (requestError) {
        if (!active) return;
        const responseStatus = axios.isAxiosError(requestError) ? requestError.response?.status : undefined;
        const backendMessage = axios.isAxiosError(requestError)
          ? (requestError.response?.data as { message?: string } | undefined)?.message
          : undefined;
        const nextStatus = responseStatus === 404
          ? 'not_found'
          : responseStatus === 410
            ? (backendMessage?.toLowerCase().includes('utilizado') ? 'used' : 'expired')
            : 'error';

        setResolved(null);
        setLinkStatus(nextStatus);
        setError(nextStatus === 'error' ? (backendMessage || 'No fue posible validar el link de registro.') : '');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void resolveLink();

    return () => {
      active = false;
    };
  }, [routeCode]);

  const canSubmit = useMemo(() => {
    return Boolean(
      resolved?.can_register &&
        form.name.trim() &&
        form.email.trim() &&
        form.phone.trim().length === 10 &&
        form.password &&
        form.password_confirmation
    );
  }, [form, resolved]);

  const handleFieldChange = (field: keyof RegisterFormState, value: string) => {
    setForm((current) => ({
      ...current,
      [field]: field === 'phone' ? value.replace(/\D/g, '').slice(0, 10) : value,
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!resolved) {
      setError('No fue posible validar el link de registro del asistente.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      setSuccess('');

      await publicStudyService.registerAssistant(resolved.code, {
        code: resolved.code,
        name: form.name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        password: form.password,
        password_confirmation: form.password_confirmation,
      });

      try {
        await login(form.email.trim(), form.password);
        navigate('/dashboard', { replace: true });
        return;
      } catch {
        setSuccess('Registro completado correctamente. Ahora puedes iniciar sesion con tu correo y contrasena.');
      }
    } catch (requestError) {
      const backendMessage = axios.isAxiosError(requestError)
        ? (requestError.response?.data as { message?: string } | undefined)?.message
        : undefined;
      setError(backendMessage || 'No fue posible completar el registro del asistente.');
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
        background: 'linear-gradient(135deg, #d8f8ef 0%, #f6fbff 100%)',
        p: 2,
      }}
    >
      <Card sx={{ maxWidth: 620, width: '100%', borderRadius: 4, boxShadow: '0 24px 60px rgba(26, 71, 63, 0.12)' }}>
        <Box
          sx={{
            px: 4,
            py: 3,
            color: 'white',
            background: 'linear-gradient(135deg, #1d8e74 0%, #43c2a6 100%)',
          }}
        >
          <Stack direction="row" spacing={1.5} alignItems="center">
            <PersonAddAlt1Icon sx={{ fontSize: 34 }} />
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800 }}>
                Registro de asistentes
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Completa tu alta para acceder al sistema del consultorio.
              </Typography>
            </Box>
          </Stack>
        </Box>

        <CardContent sx={{ p: 4 }}>
          <Stack spacing={2.5}>
            {error ? <Alert severity="error">{error}</Alert> : null}
            {success ? <Alert severity="success">{success}</Alert> : null}
            {success ? (
              <Button
                variant="outlined"
                onClick={() => navigate('/login')}
                sx={{ alignSelf: 'flex-start' }}
              >
                Ir a iniciar sesion
              </Button>
            ) : null}

            {loading ? (
              <Stack direction="row" spacing={1.5} alignItems="center">
                <CircularProgress size={22} />
                <Typography variant="body2" color="text.secondary">
                  Validando link de registro...
                </Typography>
              </Stack>
            ) : null}

            {!loading && !resolved && linkStatus === 'not_found' ? (
              <Alert severity="error">404 | No encontramos un link de registro valido para asistentes.</Alert>
            ) : null}

            {!loading && !resolved && linkStatus === 'expired' ? (
              <Alert severity="warning">Este link de registro ya vencio. Solicita a tu medico que te comparta uno nuevo.</Alert>
            ) : null}

            {!loading && !resolved && linkStatus === 'used' ? (
              <Alert severity="warning">Este link de registro ya fue utilizado. Si necesitas registrarte de nuevo, solicita uno nuevo a tu medico.</Alert>
            ) : null}

            {resolved ? (
              <>
                <Box
                  sx={{
                    p: 2.5,
                    borderRadius: 3,
                    bgcolor: '#f8fffc',
                    border: '1px solid',
                    borderColor: 'rgba(29, 142, 116, 0.16)',
                  }}
                >
                  <Stack spacing={1}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      Consultorio
                    </Typography>
                    <Typography variant="body2">
                      <strong>Nombre:</strong> {resolved.office.title || 'Sin nombre'}
                    </Typography>
                    {resolved.office.doctor_name ? (
                      <Typography variant="body2">
                        <strong>Medico:</strong> {resolved.office.doctor_name}
                      </Typography>
                    ) : null}
                  </Stack>
                </Box>

                {resolved.message ? (
                  <Alert severity={resolved.can_register ? 'info' : 'warning'}>
                    {resolved.message}
                  </Alert>
                ) : null}

                <Box component="form" onSubmit={handleSubmit}>
                  <Stack spacing={2}>
                    <input type="hidden" name="code" value={resolved.code} />
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      Datos del asistente
                    </Typography>

                    <TextField
                      label="Nombre(s)"
                      value={form.name}
                      onChange={(event) => handleFieldChange('name', event.target.value)}
                      fullWidth
                      disabled={!resolved.can_register || submitting}
                    />

                    <TextField
                      label="Apellidos"
                      value={form.last_name}
                      onChange={(event) => handleFieldChange('last_name', event.target.value)}
                      fullWidth
                      disabled={!resolved.can_register || submitting}
                    />

                    <TextField
                      label="Correo"
                      type="email"
                      value={form.email}
                      onChange={(event) => handleFieldChange('email', event.target.value)}
                      fullWidth
                      disabled={!resolved.can_register || submitting}
                    />

                    <TextField
                      label="Telefono"
                      value={form.phone}
                      onChange={(event) => handleFieldChange('phone', event.target.value)}
                      fullWidth
                      disabled={!resolved.can_register || submitting}
                    />

                    <TextField
                      label="Contrasena"
                      type="password"
                      value={form.password}
                      onChange={(event) => handleFieldChange('password', event.target.value)}
                      fullWidth
                      disabled={!resolved.can_register || submitting}
                    />

                    <TextField
                      label="Confirmar contrasena"
                      type="password"
                      value={form.password_confirmation}
                      onChange={(event) => handleFieldChange('password_confirmation', event.target.value)}
                      fullWidth
                      disabled={!resolved.can_register || submitting}
                    />

                    <Stack direction="row" spacing={1} alignItems="center" sx={{ pt: 1 }}>
                      <BadgeIcon fontSize="small" color="primary" />
                      <Typography variant="caption" color="text.secondary">
                        Al registrarte podras ingresar al sistema como asistente de este consultorio.
                      </Typography>
                    </Stack>

                    <Button
                      type="submit"
                      variant="contained"
                      disabled={!canSubmit || submitting || !resolved.can_register}
                      sx={{ alignSelf: 'flex-start', minWidth: 180 }}
                    >
                      {submitting ? 'Registrando...' : 'Completar registro'}
                    </Button>
                  </Stack>
                </Box>
              </>
            ) : null}
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
