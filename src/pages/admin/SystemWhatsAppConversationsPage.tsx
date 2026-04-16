import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import systemWhatsAppConversationService, {
  type SystemWhatsAppConversationResponse,
  type SystemWhatsAppConversationThread,
} from '../../api/systemWhatsAppConversationService';

function getBackendErrorMessage(error: unknown): string {
  if (
    typeof error === 'object'
    && error !== null
    && 'response' in error
    && typeof (error as { response?: { data?: { message?: unknown } } }).response?.data?.message === 'string'
  ) {
    return (error as { response: { data: { message: string } } }).response.data.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'No se pudo cargar la bitacora de conversaciones.';
}

function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateTime(value?: string | null): string {
  if (!value) return 'Sin fecha';

  const date = new Date(String(value).replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) {
    return 'Sin fecha';
  }

  return date.toLocaleString('es-MX');
}

function formatPhone(phone: string): string {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.length !== 10) {
    return phone;
  }

  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
}

function getStatusChipColor(status: SystemWhatsAppConversationThread['conversation_status']): 'success' | 'warning' | 'error' | 'info' {
  switch (status) {
    case 'pending_system':
      return 'warning';
    case 'pending_patient':
      return 'info';
    case 'needs_review':
      return 'warning';
    case 'delivery_error':
      return 'error';
    default:
      return 'info';
  }
}

function getAssignmentRuleLabel(rule?: string | null): string | null {
  switch (rule) {
    case 'appointment_match':
      return 'Asignado por cita';
    case 'recent_patient_appointment':
      return 'Asignado por ultima cita';
    case 'recent_consultation':
      return 'Asignado por ultima interaccion';
    case 'unknown_phone':
      return 'Telefono no identificado';
    case 'manual_reassignment':
      return 'Reasignado manualmente';
    default:
      return null;
  }
}

export default function SystemWhatsAppConversationsPage() {
  const [data, setData] = useState<SystemWhatsAppConversationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState(toDateInputValue(new Date(Date.now() - (1000 * 60 * 60 * 24 * 30))));
  const [dateTo, setDateTo] = useState(toDateInputValue(new Date()));
  const [officeId, setOfficeId] = useState<string>('');
  const [doctorUserId, setDoctorUserId] = useState<string>('');
  const [conversationStatus, setConversationStatus] = useState<string>('');
  const [search, setSearch] = useState('');

  const loadItems = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await systemWhatsAppConversationService.list({
        date_from: dateFrom,
        date_to: dateTo,
        office_id: officeId === 'undefined' ? 'undefined' : (officeId ? Number(officeId) : null),
        doctor_user_id: doctorUserId ? Number(doctorUserId) : null,
        conversation_status: conversationStatus || undefined,
        search: search.trim() || undefined,
      });

      setData(response);
    } catch (loadError) {
      setError(getBackendErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadItems();
  }, []);

  const groupedThreads = useMemo(() => {
    const groups = new Map<string, {
      officeKey: string;
      officeTitle: string;
      doctorNames: Set<string>;
      threads: SystemWhatsAppConversationThread[];
    }>();

    (data?.threads ?? []).forEach((thread) => {
      const officeKey = String(thread.office_id ?? 'undefined');
      const existing = groups.get(officeKey);

      if (existing) {
        if (thread.doctor_name && thread.doctor_name !== 'Medico sin identificar') {
          existing.doctorNames.add(thread.doctor_name);
        }
        existing.threads.push(thread);
        return;
      }

      groups.set(officeKey, {
        officeKey,
        officeTitle: thread.office_title || 'No definido',
        doctorNames: new Set(
          thread.doctor_name && thread.doctor_name !== 'Medico sin identificar'
            ? [thread.doctor_name]
            : []
        ),
        threads: [thread],
      });
    });

    return Array.from(groups.values())
      .map((group) => ({
        ...group,
        threads: [...group.threads].sort((a, b) => {
          const patientCompare = a.patient_name.localeCompare(b.patient_name, 'es');
          if (patientCompare !== 0) {
            return patientCompare;
          }

          return String(b.last_message_at ?? '').localeCompare(String(a.last_message_at ?? ''));
        }),
      }))
      .sort((a, b) => {
        if (a.officeTitle === 'No definido') return -1;
        if (b.officeTitle === 'No definido') return 1;
        return a.officeTitle.localeCompare(b.officeTitle, 'es');
      });
  }, [data]);

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
          Conversaciones WhatsApp
        </Typography>
        <Typography color="text.secondary">
          Da seguimiento a templates enviados y respuestas reales, agrupadas por consultorio y paciente.
        </Typography>
      </Box>

      <Card variant="outlined">
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Filtros
            </Typography>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                label="Desde"
                type="date"
                value={dateFrom}
                onChange={(event) => setDateFrom(event.target.value)}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
              <TextField
                label="Hasta"
                type="date"
                value={dateTo}
                onChange={(event) => setDateTo(event.target.value)}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
              <TextField
                select
                fullWidth
                label="Consultorio"
                value={officeId}
                onChange={(event) => setOfficeId(event.target.value)}
              >
                <MenuItem value="">Todos los consultorios</MenuItem>
                {(data?.offices ?? []).map((office) => (
                  <MenuItem
                    key={office.office_id === null || office.office_id === undefined ? 'undefined' : office.office_id}
                    value={office.office_id === null || office.office_id === undefined ? 'undefined' : String(office.office_id)}
                  >
                    {office.title}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                fullWidth
                label="Medico"
                value={doctorUserId}
                onChange={(event) => setDoctorUserId(event.target.value)}
              >
                <MenuItem value="">Todos los medicos</MenuItem>
                {(data?.doctors ?? []).map((doctor) => (
                  <MenuItem key={doctor.user_id} value={String(doctor.user_id)}>
                    {doctor.name}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                select
                fullWidth
                label="Estado"
                value={conversationStatus}
                onChange={(event) => setConversationStatus(event.target.value)}
              >
                <MenuItem value="">Todos los estados</MenuItem>
                <MenuItem value="pending_system">Pendiente del sistema</MenuItem>
                <MenuItem value="pending_patient">Pendiente del paciente</MenuItem>
                <MenuItem value="needs_review">Revisar</MenuItem>
                <MenuItem value="delivery_error">Con error</MenuItem>
              </TextField>
              <TextField
                fullWidth
                placeholder="Buscar por paciente, telefono, template o texto"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <Button variant="contained" onClick={() => void loadItems()} disabled={loading}>
                Aplicar filtros
              </Button>
            </Stack>
            <Typography variant="caption" color="text.secondary">
              Para no cargar toda la bitacora, la consulta se limita al rango de fechas seleccionado. Si no cambias el filtro, se muestran los ultimos 30 dias.
            </Typography>
          </Stack>
        </CardContent>
      </Card>

      {loading ? (
        <Box sx={{ py: 8, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : !groupedThreads.length ? (
        <Alert severity="info">
          No hay conversaciones de WhatsApp en el rango seleccionado.
        </Alert>
      ) : (
        <Stack spacing={3}>
          {groupedThreads.map((group) => (
            <Card key={group.officeKey} variant="outlined">
              <CardContent>
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>
                      {group.officeTitle}
                    </Typography>
                    {group.doctorNames.size ? (
                      <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                        Medico(s): {Array.from(group.doctorNames).join(' | ')}
                      </Typography>
                    ) : null}
                  </Box>

                  <Stack spacing={2}>
                    {group.threads.map((thread) => {
                      const assignmentRuleLabel = getAssignmentRuleLabel(thread.assignment_rule);

                      return (
                        <Box
                          key={thread.thread_id}
                          sx={{
                            p: 2,
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 2,
                            backgroundColor: 'background.paper',
                          }}
                        >
                          <Stack spacing={1.5}>
                            <Stack
                              direction={{ xs: 'column', lg: 'row' }}
                              justifyContent="space-between"
                              spacing={1}
                              alignItems={{ xs: 'flex-start', lg: 'center' }}
                            >
                              <Box>
                                <Typography sx={{ fontWeight: 800 }}>
                                  {thread.patient_name}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  Telefono: {formatPhone(thread.phone)}
                                </Typography>
                                {thread.doctor_name && thread.doctor_name !== 'Medico sin identificar' ? (
                                  <Typography variant="body2" color="text.secondary">
                                    Medico: {thread.doctor_name}
                                  </Typography>
                                ) : null}
                              </Box>
                              <Stack direction="row" spacing={1} flexWrap="wrap">
                                <Chip
                                  size="small"
                                  label={`${thread.message_count} mensaje${thread.message_count === 1 ? '' : 's'}`}
                                  color="primary"
                                  variant="outlined"
                                />
                                <Chip
                                  size="small"
                                  label={thread.conversation_status_label}
                                  color={getStatusChipColor(thread.conversation_status)}
                                />
                                <Chip
                                  size="small"
                                  label={`Ultimo: ${thread.last_direction === 'inbound' ? 'Paciente' : 'Sistema'}`}
                                  color={thread.last_direction === 'inbound' ? 'success' : 'warning'}
                                  variant="outlined"
                                />
                                <Chip
                                  size="small"
                                  label={formatDateTime(thread.last_message_at)}
                                  variant="outlined"
                                />
                              </Stack>
                            </Stack>

                            {assignmentRuleLabel ? (
                              <Box>
                                <Chip size="small" variant="outlined" label={assignmentRuleLabel} />
                              </Box>
                            ) : null}

                            <Divider />

                            <Stack spacing={1.25}>
                              {thread.messages.map((message) => {
                                const isInbound = message.direction === 'inbound';

                                return (
                                  <Box
                                    key={message.id}
                                    sx={{
                                      alignSelf: isInbound ? 'flex-start' : 'stretch',
                                      borderRadius: 2,
                                      px: 1.5,
                                      py: 1.25,
                                      border: '1px solid',
                                      borderColor: isInbound ? 'success.light' : 'primary.light',
                                      backgroundColor: isInbound ? 'rgba(46, 125, 50, 0.08)' : 'rgba(25, 118, 210, 0.08)',
                                    }}
                                  >
                                    <Stack spacing={1}>
                                      <Stack
                                        direction={{ xs: 'column', md: 'row' }}
                                        spacing={1}
                                        justifyContent="space-between"
                                        alignItems={{ xs: 'flex-start', md: 'center' }}
                                      >
                                        <Stack direction="row" spacing={1} flexWrap="wrap">
                                          <Chip
                                            size="small"
                                            color={isInbound ? 'success' : 'primary'}
                                            label={isInbound ? 'Paciente' : 'Sistema'}
                                          />
                                          {!isInbound && message.template_name ? (
                                            <Chip size="small" variant="outlined" label={message.template_name} />
                                          ) : null}
                                          {message.provider_status ? (
                                            <Chip size="small" variant="outlined" label={message.provider_status} />
                                          ) : null}
                                        </Stack>
                                        <Typography variant="caption" color="text.secondary">
                                          {formatDateTime(message.message_at)}
                                        </Typography>
                                      </Stack>

                                      <Typography
                                        variant="body2"
                                        sx={{
                                          whiteSpace: 'pre-wrap',
                                          wordBreak: 'break-word',
                                          lineHeight: 1.55,
                                        }}
                                      >
                                        {message.body_text || '[Sin texto legible]'}
                                      </Typography>

                                      {message.provider_error_code || message.provider_error_message ? (
                                        <Alert severity="warning" sx={{ py: 0 }}>
                                          {message.provider_error_code ? `Codigo ${message.provider_error_code}. ` : ''}
                                          {message.provider_error_message || 'Error no especificado.'}
                                        </Alert>
                                      ) : null}
                                    </Stack>
                                  </Box>
                                );
                              })}
                            </Stack>
                          </Stack>
                        </Box>
                      );
                    })}
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
