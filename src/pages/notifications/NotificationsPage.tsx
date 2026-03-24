import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import {
  DeleteOutline as DeleteOutlineIcon,
  Sms as WhatsAppPageIcon,
  Savings as SavingsIcon,
} from '@mui/icons-material';
import { appointmentService } from '../../api/appointmentService';
import notificationService from '../../api/notificationService';
import { useAuth } from '../../hooks/useAuth';
import type {
  NotificationAssistantItem,
  NotificationAssistantRecipientsData,
  NotificationSettingsData,
  Office,
} from '../../types';

const notificationOptions = [
  {
    key: 'nueva_cita',
    audience: 'patient',
    title: 'Nueva cita generada',
    description:
      'Notificacion enviada al paciente con la informacion de la cita justo al momento en que se agenda.',
  },
  {
    key: 'confirmacion_cita',
    audience: 'patient',
    title: 'Confirmacion de citas',
    description:
      'Notificacion enviada al paciente un dia antes para confirmar, cancelar o reprogramar su cita.',
  },
  {
    key: 'mis_citas_hoy',
    audience: 'doctor',
    title: 'Mis citas de hoy',
    description:
      'Resumen diario enviado al medico con los horarios de la agenda del dia.',
  },
  {
    key: 'alertas_citas_proximas',
    audience: 'doctor',
    title: 'Alertas sobre cita de hoy o ma\u00F1ana',
    description:
      'Aviso al medico y asistentes cuando se agenda, reprograma o cancela una cita muy cercana.',
  },
  {
    key: 'formulario_historia_clinica',
    audience: 'patient',
    title: 'Enviar formulario de historia clinica',
    description:
      'Permite enviar al paciente un formulario de preguntas previas sobre su historia clinica.',
  },
  {
    key: 'recordatorio_cita',
    audience: 'patient',
    title: 'Recordatorio 5 dias antes de la cita',
    description:
      'Recordatorio preventivo al paciente cuando la cita se creo con mucha anticipacion.',
  },
  {
    key: 'envio_resultados_estudio',
    audience: 'patient',
    title: 'Envio de resultados de estudios',
    description:
      'Permite enviar al paciente el enlace publico para revisar y descargar su resultado.',
  },
  {
    key: 'cancelacion_cita_paciente',
    audience: 'patient',
    title: 'Cancelacion de cita al paciente',
    description:
      'Permite avisar al paciente cuando su cita fue cancelada desde el sistema o por respuesta en WhatsApp.',
  },
] as const;

export default function NotificationsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [settings, setSettings] = useState<NotificationSettingsData | null>(null);
  const [preferences, setPreferences] = useState<Record<string, boolean>>({});
  const [offices, setOffices] = useState<Office[]>([]);
  const [selectedOfficeId, setSelectedOfficeId] = useState<number>(0);
  const [assistantData, setAssistantData] = useState<NotificationAssistantRecipientsData | null>(null);
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [assistantSavingId, setAssistantSavingId] = useState<number | null>(null);
  const [legacySavingId, setLegacySavingId] = useState<number | null>(null);
  const [legacyRemovingId, setLegacyRemovingId] = useState<number | null>(null);
  const [assistantDeletingId, setAssistantDeletingId] = useState<number | null>(null);
  const [newLegacyPhone, setNewLegacyPhone] = useState('');
  const [addingLegacyPhone, setAddingLegacyPhone] = useState(false);
  const [assistantToDelete, setAssistantToDelete] = useState<NotificationAssistantItem | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const [data, officeList] = await Promise.all([
          notificationService.getSettings(),
          appointmentService.getOffices(),
        ]);
        if (!active) return;

        setSettings(data);
        setPreferences(data.preferences ?? {});
        const ownerOffices = officeList.filter((office) => office.role === 'owner');
        setOffices(ownerOffices);
        if (ownerOffices.length > 0) {
          setSelectedOfficeId(ownerOffices[0].id);
        }
      } catch (requestError) {
        console.error('Error cargando notificaciones:', requestError);
        if (!active) return;
        setError('No se pudo cargar la configuracion de notificaciones.');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    const loadAssistants = async () => {
      if (!selectedOfficeId || !preferences.alertas_citas_proximas) {
        setAssistantData(null);
        return;
      }

      try {
        setAssistantLoading(true);
        const data = await notificationService.getAssistantRecipients(selectedOfficeId);
        if (!active) return;
        setAssistantData(data);
      } catch (requestError) {
        console.error('Error cargando asistentes de notificaciones:', requestError);
        if (!active) return;
        setAssistantData(null);
      } finally {
        if (active) {
          setAssistantLoading(false);
        }
      }
    };

    void loadAssistants();

    return () => {
      active = false;
    };
  }, [preferences.alertas_citas_proximas, selectedOfficeId]);

  const handleToggle = (key: string, checked: boolean) => {
    setPreferences((current) => ({
      ...current,
      [key]: checked,
    }));
  };

  const ensureAlertasCitasProximasEnabled = async () => {
    const nextPreferences = {
      ...preferences,
      alertas_citas_proximas: true,
    };

    if (settings?.preferences?.alertas_citas_proximas) {
      if (!preferences.alertas_citas_proximas) {
        setPreferences(nextPreferences);
      }
      return;
    }

    if (!preferences.alertas_citas_proximas) {
      setPreferences(nextPreferences);
    }

    const data = await notificationService.updateSettings(nextPreferences);
    setSettings(data);
    setPreferences(data.preferences ?? nextPreferences);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setMessage(null);

      const data = await notificationService.updateSettings(preferences);
      setSettings(data);
      setPreferences(data.preferences ?? {});
      setMessage('Configuracion de notificaciones actualizada correctamente.');
    } catch (requestError) {
      console.error('Error guardando notificaciones:', requestError);
      setError('No se pudo guardar la configuracion de notificaciones.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ py: 8, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  const enabledCount = Object.values(preferences).filter(Boolean).length;
  const patientOptions = notificationOptions.filter((option) => option.audience === 'patient');
  const doctorOptions = notificationOptions.filter((option) => option.audience === 'doctor');
  const enabledRecipientCount = (assistantData?.limits.enabled_total ?? 0) + 1;
  const maxOptionalRecipientsReached = (assistantData?.limits.registered_total ?? 0) >= (assistantData?.limits.total_max ?? 5);

  const renderOption = (option: (typeof notificationOptions)[number]) => (
    <FormControlLabel
      key={option.key}
      control={
        <Checkbox
          checked={Boolean(preferences[option.key])}
          onChange={(event) => handleToggle(option.key, event.target.checked)}
        />
      }
      label={
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.35 }}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <Typography sx={{ fontWeight: 600 }}>{option.title}</Typography>
            <Box
              sx={{
                px: 1,
                py: 0.2,
                borderRadius: 999,
                backgroundColor: option.audience === 'patient'
                  ? 'rgba(76, 175, 80, 0.12)'
                  : 'rgba(30, 136, 229, 0.12)',
                color: option.audience === 'patient' ? 'success.dark' : 'info.dark',
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 0.3,
                textTransform: 'uppercase',
              }}
            >
              {option.audience === 'patient'
                ? 'Paciente'
                : option.key === 'mis_citas_hoy'
                  ? 'Medico'
                  : 'Medico / asistentes'}
            </Box>
          </Stack>
          <Typography variant="body2" color="text.secondary">
            {option.description}
          </Typography>
        </Box>
      }
      sx={{
        alignItems: 'flex-start',
        m: 0,
        px: 1.25,
        py: 1,
        borderRadius: 2.25,
        border: '1px solid rgba(25, 118, 210, 0.08)',
        backgroundColor: Boolean(preferences[option.key])
          ? 'rgba(25, 118, 210, 0.06)'
          : 'rgba(255,255,255,0.8)',
        transition: 'background-color 0.18s ease, border-color 0.18s ease',
      }}
    />
  );

  const handleAssistantToggle = async (assistantId: number, enabled: boolean) => {
    if (!selectedOfficeId) return;

    try {
      if (enabled) {
        await ensureAlertasCitasProximasEnabled();
      }
      setAssistantSavingId(assistantId);
      const data = await notificationService.updateAssistantRecipient(selectedOfficeId, assistantId, enabled);
      setAssistantData(data);
      setMessage(enabled ? 'Asistente habilitado para alertas cercanas.' : 'Asistente retirado de alertas cercanas.');
    } catch (requestError) {
      console.error('Error actualizando asistente de alertas:', requestError);
      setError('No se pudo actualizar el asistente para alertas de hoy o ma\u00F1ana.');
    } finally {
      setAssistantSavingId(null);
    }
  };

  const handleRemoveLegacyRecipient = async (id: number) => {
    try {
      setLegacyRemovingId(id);
      const data = await notificationService.removeLegacyRecipient(id);
      setAssistantData(data);
      setMessage('Telefono adicional retirado de la lista de alertas cercanas.');
    } catch (requestError) {
      console.error('Error eliminando telefono adicional:', requestError);
      setError('No se pudo eliminar el telefono adicional.');
    } finally {
      setLegacyRemovingId(null);
    }
  };

  const handleLegacyRecipientToggle = async (id: number, enabled: boolean) => {
    try {
      if (enabled) {
        await ensureAlertasCitasProximasEnabled();
      }
      setLegacySavingId(id);
      setError(null);
      const data = await notificationService.updateLegacyRecipient(id, enabled);
      setAssistantData(data);
      setMessage(enabled ? 'Telefono adicional habilitado para alertas cercanas.' : 'Telefono adicional conservado sin recibir alertas.');
    } catch (requestError) {
      console.error('Error actualizando telefono adicional:', requestError);
      setError('No se pudo actualizar el telefono adicional.');
    } finally {
      setLegacySavingId(null);
    }
  };

  const handleAddLegacyRecipient = async () => {
    if (!selectedOfficeId) return;

    try {
      await ensureAlertasCitasProximasEnabled();
      setAddingLegacyPhone(true);
      setError(null);
      const data = await notificationService.addLegacyRecipient(selectedOfficeId, newLegacyPhone);
      setAssistantData(data);
      setNewLegacyPhone('');
      setMessage('Telefono adicional habilitado para alertas cercanas.');
    } catch (requestError) {
      console.error('Error agregando telefono adicional:', requestError);
      setError('No se pudo agregar el telefono adicional.');
    } finally {
      setAddingLegacyPhone(false);
    }
  };

  const handleDisableAssistant = async (assistantId: number) => {
    try {
      setAssistantDeletingId(assistantId);
      setError(null);
      const data = await notificationService.disableAssistant(assistantId);
      setAssistantData(data);
      setMessage('Asistente deshabilitado. Ya no podra ingresar al sistema.');
      setAssistantToDelete(null);
    } catch (requestError) {
      console.error('Error deshabilitando asistente:', requestError);
      setError('No se pudo deshabilitar el asistente.');
    } finally {
      setAssistantDeletingId(null);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 700, color: 'primary.main' }}>
          WhatsApp
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Configura que mensajes puede enviar LISA por WhatsApp y consulta los creditos del mes.
        </Typography>
      </Box>

      {error ? <Alert severity="error">{error}</Alert> : null}
      {message ? <Alert severity="success">{message}</Alert> : null}

      <Card
        sx={{
          borderRadius: 3,
          background: 'linear-gradient(135deg, rgba(217,247,255,0.95) 0%, rgba(240,251,255,0.98) 100%)',
          border: '1px solid rgba(0, 137, 123, 0.12)',
        }}
      >
        <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
          <Stack spacing={1.25}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: 'success.dark' }}>
              Como funciona este modulo de WhatsApp
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Aqui decides que tipos de avisos puede enviar LISA por WhatsApp para tu operacion diaria.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Las preferencias se guardan por medico en <strong>`datahelp tipo = 26`</strong> y el consumo mensual se lee desde <strong>`datahelp tipo = 25`</strong>.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Los templates configurados en el sistema nuevo ya respetan estas banderas antes de registrar el mock o intentar un envio real.
            </Typography>
          </Stack>
        </CardContent>
      </Card>

      <Card sx={{ borderRadius: 3 }}>
        <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={1.5}
            alignItems={{ xs: 'flex-start', md: 'center' }}
            justifyContent="space-between"
            sx={{ mb: 2 }}
          >
            <Stack direction="row" spacing={1.5} alignItems="center">
              <WhatsAppPageIcon color="primary" />
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Mensajes habilitables
              </Typography>
            </Stack>
            <Box
              sx={{
                px: 1.5,
                py: 0.75,
                borderRadius: 999,
                backgroundColor: 'rgba(30, 136, 229, 0.12)',
                color: 'info.main',
                fontWeight: 700,
                fontSize: 13,
              }}
            >
              {enabledCount} activas
            </Box>
          </Stack>

          <Divider sx={{ mb: 2 }} />

          <Stack spacing={2.5}>
            <Box>
              <Typography sx={{ mb: 1.1, fontWeight: 700, color: 'success.dark' }}>
                Mensajes para paciente
              </Typography>
              <Stack spacing={1.1}>
                {patientOptions.map(renderOption)}
              </Stack>
            </Box>

            <Box>
              <Typography sx={{ mb: 1.1, fontWeight: 700, color: 'info.dark' }}>
                Mensajes para medico y asistentes
              </Typography>
              <Stack spacing={1.1}>
                {doctorOptions.map(renderOption)}
              </Stack>
            </Box>
          </Stack>

          {preferences.alertas_citas_proximas ? (
            <Box
              sx={{
                mt: 2.5,
                p: 2,
                borderRadius: 2.5,
                backgroundColor: 'rgba(30, 136, 229, 0.04)',
                border: '1px solid rgba(30, 136, 229, 0.10)',
              }}
            >
              <Stack spacing={2}>
                <Box>
                  <Typography sx={{ fontWeight: 700, color: 'info.dark' }}>
                    Asistentes que reciben alertas de hoy o manana
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Estas alertas corresponden al template operativo interno. "Mis citas de hoy" sigue siendo un mensaje solo para el medico.
                  </Typography>
                  {assistantData?.limits ? (
                    <Alert severity="warning" sx={{ mt: 1.5, borderRadius: 2 }}>
                      Hay {enabledRecipientCount} telefonos habilitados para recibir esta alerta, incluyendo al medico. Cada telefono consume un mensaje de tus creditos totales cuando se envia la notificacion.
                    </Alert>
                  ) : null}
                </Box>

                <FormControl size="small" sx={{ maxWidth: 360 }}>
                  <InputLabel id="notifications-office-label">Consultorio</InputLabel>
                  <Select
                    labelId="notifications-office-label"
                    value={selectedOfficeId}
                    label="Consultorio"
                    onChange={(event) => setSelectedOfficeId(Number(event.target.value))}
                  >
                    {offices.map((office) => (
                      <MenuItem key={office.id} value={office.id}>
                        {office.title}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {assistantLoading ? (
                  <Box sx={{ py: 2, display: 'flex', justifyContent: 'center' }}>
                    <CircularProgress size={24} />
                  </Box>
                ) : (
                  <Stack spacing={1.2}>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 2,
                        p: 1.25,
                        borderRadius: 2,
                        backgroundColor: '#fff',
                        border: '1px solid rgba(0,0,0,0.06)',
                      }}
                    >
                      <Box>
                        <Typography sx={{ fontWeight: 600 }}>
                          {user?.name || 'Medico titular'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {user?.phone || 'Recibe alertas por configuracion principal'}
                        </Typography>
                      </Box>
                      <FormControlLabel
                        sx={{ m: 0 }}
                        control={<Checkbox checked disabled />}
                        label="Recibe alertas"
                      />
                    </Box>

                    {(assistantData?.assistants ?? []).map((assistant) => (
                      <Box
                        key={assistant.assistant_id}
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: 2,
                          p: 1.25,
                          borderRadius: 2,
                          backgroundColor: '#fff',
                          border: '1px solid rgba(0,0,0,0.06)',
                        }}
                      >
                        <Box>
                          <Typography sx={{ fontWeight: 600 }}>
                            {assistant.name || `Asistente #${assistant.assistant_id}`}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {assistant.phone || 'Sin telefono valido'}
                          </Typography>
                        </Box>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <FormControlLabel
                            sx={{ m: 0 }}
                            control={
                              <Checkbox
                                checked={assistant.enabled}
                                disabled={!assistant.can_receive || assistantSavingId === assistant.assistant_id}
                                onChange={(event) => void handleAssistantToggle(assistant.assistant_id, event.target.checked)}
                              />
                            }
                            label={assistant.can_receive ? 'Recibe alertas' : 'Telefono no valido'}
                          />
                          <Button
                            color="error"
                            size="small"
                            startIcon={<DeleteOutlineIcon />}
                            disabled={assistantDeletingId === assistant.assistant_id}
                            onClick={() => setAssistantToDelete(assistant)}
                          >
                            Eliminar
                          </Button>
                        </Stack>
                      </Box>
                    ))}

                    {(assistantData?.assistants ?? []).length === 0 ? (
                      <Alert severity="info">Este consultorio no tiene asistentes activos para configurar.</Alert>
                    ) : null}

                    {(assistantData?.legacy_recipients ?? []).length > 0 ? (
                      <Box sx={{ pt: 1 }}>
                        <Typography sx={{ mb: 1, fontWeight: 700, color: 'text.primary' }}>
                          Otros tel\u00E9fonos habilitados
                        </Typography>
                        <Stack spacing={1}>
                          {(assistantData?.legacy_recipients ?? []).map((recipient) => (
                            <Box
                              key={recipient.id}
                              sx={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                gap: 2,
                                p: 1.25,
                                borderRadius: 2,
                                backgroundColor: '#fff',
                                border: '1px dashed rgba(0,0,0,0.12)',
                              }}
                            >
                              <Typography>{recipient.phone}</Typography>
                              <Stack direction="row" spacing={1} alignItems="center">
                                <FormControlLabel
                                  sx={{ m: 0 }}
                                  control={
                                    <Checkbox
                                      checked={recipient.enabled}
                                      disabled={legacySavingId === recipient.id}
                                      onChange={(event) => void handleLegacyRecipientToggle(recipient.id, event.target.checked)}
                                    />
                                  }
                                  label="Recibe alertas"
                                />
                                <Button
                                  color="error"
                                  size="small"
                                  startIcon={<DeleteOutlineIcon />}
                                  disabled={legacyRemovingId === recipient.id}
                                  onClick={() => void handleRemoveLegacyRecipient(recipient.id)}
                                >
                                  Quitar
                                </Button>
                              </Stack>
                            </Box>
                          ))}
                        </Stack>
                      </Box>
                    ) : null}

                    <Box
                      sx={{
                        p: 1.5,
                        borderRadius: 2,
                        backgroundColor: '#fff',
                        border: '1px dashed rgba(0,0,0,0.12)',
                      }}
                    >
                      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25} alignItems={{ xs: 'stretch', md: 'center' }}>
                        <TextField
                          label="Agregar otro teléfono"
                          placeholder="3121234567"
                          size="small"
                          value={newLegacyPhone}
                          disabled={maxOptionalRecipientsReached}
                          onChange={(event) => setNewLegacyPhone(event.target.value)}
                          helperText={`Maximo ${assistantData?.limits.total_max ?? 5} registros opcionales en total entre asistentes y otros tel\u00E9fonos, aunque esten deshabilitados.`}
                          sx={{ flex: 1 }}
                        />
                        <Button
                          variant="outlined"
                          disabled={!newLegacyPhone.trim() || addingLegacyPhone || maxOptionalRecipientsReached}
                          onClick={() => void handleAddLegacyRecipient()}
                        >
                          Agregar
                        </Button>
                      </Stack>
                    </Box>
                  </Stack>
                )}
              </Stack>
            </Box>
          ) : null}

          <Button sx={{ mt: 2.5 }} variant="contained" onClick={() => void handleSave()} disabled={saving}>
            {saving ? 'Guardando...' : 'Actualizar'}
          </Button>
        </CardContent>
      </Card>

      <Card sx={{ borderRadius: 3 }}>
        <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
            <SavingsIcon color="primary" />
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Creditos mensuales
            </Typography>
          </Stack>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Este resumen te ayuda a validar rapidamente el limite mensual contratado y el consumo acumulado por mes.
          </Typography>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 3 }}>
            <Box
              sx={{
                flex: 1,
                p: 2,
                borderRadius: 2,
                background: 'linear-gradient(135deg, #eef7ff 0%, #f8fbff 100%)',
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Typography variant="body2" color="text.secondary">
                Tu credito fijo mensual
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, color: 'primary.main' }}>
                {settings?.monthly_limit ?? 0}
              </Typography>
            </Box>

            <Box
              sx={{
                flex: 1,
                p: 2,
                borderRadius: 2,
                background: 'linear-gradient(135deg, #f2fbf4 0%, #fbfffc 100%)',
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Typography variant="body2" color="text.secondary">
                Creditos disponibles
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, color: 'success.main' }}>
                {settings?.available_credits ?? 0}
              </Typography>
            </Box>
          </Stack>

          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Mes</TableCell>
                  <TableCell align="center">SMS</TableCell>
                  <TableCell align="center">WhatsApp</TableCell>
                  <TableCell align="center">Utilizados</TableCell>
                  <TableCell align="center">Disponibles</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(settings?.history ?? []).map((item) => (
                  <TableRow key={item.id} hover>
                    <TableCell>{item.month_label}</TableCell>
                    <TableCell align="center">{item.sms_count}</TableCell>
                    <TableCell align="center">{item.whatsapp_count}</TableCell>
                    <TableCell align="center">{item.used_count}</TableCell>
                    <TableCell align="center">{item.available_count}</TableCell>
                  </TableRow>
                ))}
                {(settings?.history ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                      Todavia no hay historico de consumo para este usuario.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </Box>
        </CardContent>
      </Card>

      <Dialog
        open={!!assistantToDelete}
        onClose={() => {
          if (!assistantDeletingId) {
            setAssistantToDelete(null);
          }
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Eliminar asistente</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ pt: 1 }}>
            <Typography>
              Si eliminas a <strong>{assistantToDelete?.name || 'este asistente'}</strong> del sistema, ya no tendra acceso al mismo.
            </Typography>
            <Alert severity="warning" sx={{ borderRadius: 2 }}>
              Si solo quieres deshabilitar las alertas del asistente, desmarca la opcion de <strong>Recibe alertas</strong>.
            </Alert>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button
            onClick={() => setAssistantToDelete(null)}
            disabled={assistantDeletingId !== null}
          >
            Cancelar
          </Button>
          <Button
            color="error"
            variant="contained"
            disabled={!assistantToDelete || assistantDeletingId === assistantToDelete.assistant_id}
            onClick={() => assistantToDelete && void handleDisableAssistant(assistantToDelete.assistant_id)}
          >
            {assistantDeletingId === assistantToDelete?.assistant_id ? 'Eliminando...' : 'Eliminar asistente'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
