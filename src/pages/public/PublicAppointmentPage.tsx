import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
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
import {
  CalendarMonth as CalendarMonthIcon,
  Chat as ChatIcon,
  EventRepeat as EventRepeatIcon,
  LocalHospital as LocalHospitalIcon,
  Phone as PhoneIcon,
} from '@mui/icons-material';
import publicStudyService from '../../api/publicStudyService';
import type {
  AvailableSlot,
  PublicBookingCandidate,
  PublicRescheduleDateOption,
  PublicRescheduleLinkResponse,
  PublicRescheduleSuccessResponse,
} from '../../types';

type BookingFormState = {
  name: string;
  last_name: string;
  phone: string;
  reason: string;
  website: string;
};

const EMPTY_BOOKING_FORM: BookingFormState = {
  name: '',
  last_name: '',
  phone: '',
  reason: '',
  website: '',
};

function toPascalCaseName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function normalizePhoneForWhatsApp(value?: string): string {
  const digits = (value ?? '').replace(/\D/g, '');
  if (!digits) return '';
  return digits.startsWith('52') ? digits : `52${digits}`;
}

function normalizePhoneInput(value: string): string {
  return value.replace(/\D/g, '').slice(0, 10);
}

export default function PublicAppointmentPage() {
  const params = useParams<{ code?: string; token?: string }>();
  const code = params.code ?? params.token ?? '';

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkData, setLinkData] = useState<PublicRescheduleLinkResponse | null>(null);
  const [availableDates, setAvailableDates] = useState<PublicRescheduleDateOption[]>([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [successData, setSuccessData] = useState<PublicRescheduleSuccessResponse | null>(null);
  const [bookingForm, setBookingForm] = useState<BookingFormState>(EMPTY_BOOKING_FORM);
  const [bookingCandidates, setBookingCandidates] = useState<PublicBookingCandidate[]>([]);
  const [checkingCandidates, setCheckingCandidates] = useState(false);
  const [selectedCandidateId, setSelectedCandidateId] = useState<number | null>(null);
  const [candidateDecisionMade, setCandidateDecisionMade] = useState(false);
  const [candidateLookupLimitReached, setCandidateLookupLimitReached] = useState(false);
  const [candidateLookupRequestKey, setCandidateLookupRequestKey] = useState(0);

  const isBookingMode = linkData?.mode === 'booking';

  useEffect(() => {
    let active = true;

    async function loadData() {
      if (!code) {
        setError('Link público no encontrado.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const [resolved, dates] = await Promise.all([
          publicStudyService.resolvePublicRescheduleCode(code),
          publicStudyService.getPublicRescheduleDates(code),
        ]);

        if (!active) return;

        setLinkData(resolved);
        setAvailableDates(dates);
        setSelectedDate(dates[0]?.date ?? '');
      } catch (_err: unknown) {
        if (!active) return;
        setError('No fue posible cargar el link público.');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      active = false;
    };
  }, [code]);

  useEffect(() => {
    let active = true;

    async function loadSlots() {
      if (!code || !selectedDate) {
        setAvailableSlots([]);
        setSelectedSlot(null);
        return;
      }

      try {
        setSelectedSlot(null);
        const slots = await publicStudyService.getPublicRescheduleSlots(code, selectedDate);
        if (!active) return;
        setAvailableSlots(slots.filter((slot) => slot.estatus === 1));
      } catch (_err: unknown) {
        if (!active) return;
        setAvailableSlots([]);
      }
    }

    loadSlots();

    return () => {
      active = false;
    };
  }, [code, selectedDate]);

  useEffect(() => {
    if (!isBookingMode) {
      setBookingCandidates([]);
      setSelectedCandidateId(null);
      setCandidateDecisionMade(false);
      setCandidateLookupLimitReached(false);
      setCheckingCandidates(false);
      return;
    }

    const hasEnoughData =
      bookingForm.name.trim().length >= 2 &&
      bookingForm.last_name.trim().length >= 2 &&
      bookingForm.phone.trim().length === 10;

    if (!hasEnoughData) {
      setBookingCandidates([]);
      setSelectedCandidateId(null);
      setCandidateDecisionMade(false);
      setCandidateLookupLimitReached(false);
      setCheckingCandidates(false);
      return;
    }

    if (candidateLookupRequestKey === 0) {
      return;
    }

    let active = true;
    setCheckingCandidates(true);

    (async () => {
      try {
        const response = await publicStudyService.checkPublicBookingCandidates(code, {
          name: bookingForm.name.trim(),
          last_name: bookingForm.last_name.trim(),
          phone: bookingForm.phone.trim(),
        });

        if (!active) return;

        setBookingCandidates(response.candidates);
        setCandidateLookupLimitReached(response.limit_reached);
        if (!response.candidates.length) {
          setSelectedCandidateId(null);
          setCandidateDecisionMade(true);
          return;
        }

        const stillSelected = response.candidates.some((candidate) => candidate.user_id === selectedCandidateId);
        if (!stillSelected) {
          setSelectedCandidateId(null);
          setCandidateDecisionMade(false);
        }
      } catch (_err: unknown) {
        if (!active) return;
        setBookingCandidates([]);
        setSelectedCandidateId(null);
        setCandidateDecisionMade(false);
        setCandidateLookupLimitReached(false);
      } finally {
        if (active) {
          setCheckingCandidates(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [bookingForm.last_name, bookingForm.name, bookingForm.phone, candidateLookupRequestKey, code, isBookingMode, selectedCandidateId]);

  const officeWhatsAppUrl = useMemo(() => {
    const normalized = normalizePhoneForWhatsApp(linkData?.office.phone);
    return normalized ? `https://wa.me/${normalized}` : '';
  }, [linkData]);

  const patientName = useMemo(() => {
    return toPascalCaseName(
      successData?.patient?.name ??
        linkData?.patient?.name ??
        ''
    );
  }, [linkData, successData]);

  const canSubmit = isBookingMode
    ? Boolean(
        selectedSlot &&
          bookingForm.name.trim() &&
          bookingForm.last_name.trim() &&
          bookingForm.phone.trim().length === 10
      )
    : Boolean(selectedSlot && linkData?.can_reschedule);

  const handleBookingFieldChange = (field: keyof BookingFormState, value: string) => {
    setBookingForm((current) => ({
      ...current,
      [field]: field === 'phone' ? normalizePhoneInput(value) : value,
    }));
    setBookingCandidates([]);
    setSelectedCandidateId(null);
    setCandidateDecisionMade(false);
    setCandidateLookupLimitReached(false);
  };

  const handleBookingFieldBlur = () => {
    if (!isBookingMode || checkingCandidates || candidateLookupLimitReached) {
      return;
    }

    const hasEnoughData =
      bookingForm.name.trim().length >= 2 &&
      bookingForm.last_name.trim().length >= 2 &&
      bookingForm.phone.trim().length === 10;

    if (!hasEnoughData) {
      return;
    }

    setCandidateLookupRequestKey((current) => current + 1);
  };

  const handleSubmit = async () => {
    if (!code || !selectedSlot || !linkData) {
      setError('Selecciona un horario para continuar.');
      return;
    }

    if (
      isBookingMode &&
      (!bookingForm.name.trim() || !bookingForm.last_name.trim() || bookingForm.phone.trim().length !== 10)
    ) {
      setError('Completa nombre, apellidos y teléfono para registrar la cita.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const payload = isBookingMode
        ? {
            datestart: selectedSlot.datestart,
            dateend: selectedSlot.dateend,
            name: bookingForm.name.trim(),
            last_name: bookingForm.last_name.trim(),
            phone: bookingForm.phone.trim(),
            reason: bookingForm.reason.trim(),
            website: bookingForm.website.trim(),
            selected_user_id: selectedCandidateId ?? undefined,
          }
        : {
            datestart: selectedSlot.datestart,
            dateend: selectedSlot.dateend,
          };

      const response = await publicStudyService.submitPublicReschedule(code, payload);
      setSuccessData(response);
    } catch (err: unknown) {
      const backendMessage = axios.isAxiosError(err)
        ? (err.response?.data as { message?: string } | undefined)?.message
        : undefined;

      setError(
        backendMessage ||
          (isBookingMode
            ? 'No fue posible registrar la cita. Intenta nuevamente con otro horario.'
            : 'No fue posible reprogramar la cita. Intenta nuevamente con otro horario.')
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #d9fbef 0%, #f8fdff 100%)',
          px: 2,
        }}
      >
        <Stack spacing={2} alignItems="center">
          <CircularProgress />
          <Typography variant="body1" color="text.secondary">
            Cargando información...
          </Typography>
        </Stack>
      </Box>
    );
  }

  if (error && !linkData) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #d9fbef 0%, #f8fdff 100%)',
          px: 2,
        }}
      >
        <Card sx={{ maxWidth: 560, width: '100%', borderRadius: 4 }}>
          <CardContent sx={{ p: 4 }}>
            <Alert severity="error">{error}</Alert>
          </CardContent>
        </Card>
      </Box>
    );
  }

  if (successData && linkData) {
    const title = successData.mode === 'booking' ? 'Cita registrada' : 'Cita reprogramada';

    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #d9fbef 0%, #f8fdff 100%)',
          px: 2,
          py: 4,
        }}
      >
        <Card sx={{ maxWidth: 640, width: '100%', borderRadius: 4, boxShadow: '0 20px 60px rgba(26, 71, 63, 0.12)' }}>
          <Box
            sx={{
              px: 4,
              py: 3,
              color: 'white',
              background: 'linear-gradient(135deg, #2f9f77 0%, #7eddbd 100%)',
            }}
          >
            <Stack direction="row" spacing={1.5} alignItems="center">
              <EventRepeatIcon />
              <Typography variant="h5" sx={{ fontWeight: 800 }}>
                {title}
              </Typography>
            </Stack>
          </Box>
          <CardContent sx={{ p: 4 }}>
            <Stack spacing={2}>
              <Alert severity="success">{successData.message}</Alert>
              {patientName ? (
                <Typography variant="body1">
                  <strong>Paciente:</strong> {patientName}
                </Typography>
              ) : null}
              <Typography variant="body1">
                <strong>Fecha:</strong> {successData.appointment.date_label}
              </Typography>
              <Typography variant="body1">
                <strong>Hora:</strong> {successData.appointment.time_label}
              </Typography>
              <Typography variant="body1">
                <strong>Médico:</strong> {linkData.office.doctor_name}
              </Typography>
              <Typography variant="body1">
                <strong>Dirección:</strong> {linkData.office.address || 'Sin dirección'}
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      </Box>
    );
  }

  if (!linkData) {
    return null;
  }

  const renderCandidateHelper = (candidate: PublicBookingCandidate) => {
    return typeof candidate.age === 'number' ? `${candidate.age} años` : '';
  };

  const selectedCandidate = bookingCandidates.find((candidate) => candidate.user_id === selectedCandidateId) ?? null;

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #d9fbef 0%, #f8fdff 100%)',
        px: 2,
        py: 4,
      }}
    >
      <Box sx={{ maxWidth: 920, mx: 'auto' }}>
        <Card sx={{ borderRadius: 4, boxShadow: '0 24px 60px rgba(26, 71, 63, 0.12)', overflow: 'hidden' }}>
          <Box
            sx={{
              px: { xs: 3, md: 4 },
              py: 3,
              background: 'linear-gradient(135deg, #1d8e74 0%, #43c2a6 100%)',
              color: 'white',
            }}
          >
            <Stack direction="row" spacing={1.5} alignItems="center">
              <LocalHospitalIcon sx={{ fontSize: 34 }} />
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 800 }}>
                  {isBookingMode ? 'Agendar cita' : 'Reprogramar cita'}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.88 }}>
                  {isBookingMode
                    ? 'Selecciona una fecha y horario y completa tus datos'
                    : 'Selecciona una nueva fecha y hora para tu cita'}
                </Typography>
              </Box>
            </Stack>
          </Box>

          <CardContent sx={{ p: { xs: 3, md: 4 } }}>
            <Stack spacing={3}>
              {error ? <Alert severity="error">{error}</Alert> : null}

              <Box
                sx={{
                  p: 3,
                  borderRadius: 3,
                  bgcolor: '#f8fffc',
                  border: '1px solid',
                  borderColor: 'rgba(29, 142, 116, 0.14)',
                }}
              >
                <Stack spacing={1.25}>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    {isBookingMode ? 'Consultorio' : 'Cita actual'}
                  </Typography>
                  {!isBookingMode && linkData.patient ? (
                    <Typography variant="body1">
                      <strong>Paciente:</strong> {toPascalCaseName(linkData.patient.name)}
                    </Typography>
                  ) : null}
                  {!isBookingMode && linkData.appointment ? (
                    <>
                      <Typography variant="body1">
                        <strong>Fecha:</strong> {linkData.appointment.date_label}
                      </Typography>
                      <Typography variant="body1">
                        <strong>Hora:</strong> {linkData.appointment.time_label}
                      </Typography>
                    </>
                  ) : null}
                  <Typography variant="body1">
                    <strong>Médico:</strong> {linkData.office.doctor_name}
                  </Typography>
                  <Typography variant="body1">
                    <strong>Especialidad:</strong> {linkData.office.specialty || 'Sin especialidad'}
                  </Typography>
                  <Typography variant="body1">
                    <strong>Dirección:</strong> {linkData.office.address || 'Sin dirección'}
                  </Typography>
                </Stack>
              </Box>

              {linkData.reschedule_message ? (
                <Alert severity={linkData.can_reschedule ? 'info' : 'warning'}>
                  {linkData.reschedule_message}
                </Alert>
              ) : null}

              {linkData.show_contact_actions ? (
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                  {linkData.office.phone ? (
                    <Button
                      component="a"
                      href={`tel:${linkData.office.phone}`}
                      variant="outlined"
                      startIcon={<PhoneIcon />}
                    >
                      Llamar al consultorio
                    </Button>
                  ) : null}
                  {officeWhatsAppUrl ? (
                    <Button
                      component="a"
                      href={officeWhatsAppUrl}
                      target="_blank"
                      rel="noreferrer"
                      variant="outlined"
                      startIcon={<ChatIcon />}
                    >
                      Enviar WhatsApp al consultorio
                    </Button>
                  ) : null}
                </Stack>
              ) : null}

              <Divider />

              {isBookingMode ? (
                <Stack spacing={2}>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    Tus datos
                  </Typography>
                  {selectedCandidate ? (
                    <Card variant="outlined">
                      <CardContent sx={{ p: 2 }}>
                        <Stack
                          direction={{ xs: 'column', sm: 'row' }}
                          spacing={1.5}
                          justifyContent="space-between"
                          alignItems={{ xs: 'flex-start', sm: 'center' }}
                        >
                          <Box>
                            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                              {selectedCandidate.full_name}
                            </Typography>
                            {renderCandidateHelper(selectedCandidate) ? (
                              <Typography variant="body2" color="text.secondary">
                                {renderCandidateHelper(selectedCandidate)}
                              </Typography>
                            ) : null}
                          </Box>
                          <Button
                            variant="text"
                            onClick={() => {
                              setSelectedCandidateId(null);
                              setCandidateDecisionMade(false);
                            }}
                          >
                            Elegir otro registro
                          </Button>
                        </Stack>
                      </CardContent>
                    </Card>
                  ) : (
                    <>
                      <TextField
                        label="Nombre(s)"
                        value={bookingForm.name}
                        onChange={(event) => handleBookingFieldChange('name', event.target.value)}
                        onBlur={handleBookingFieldBlur}
                        fullWidth
                      />
                      <TextField
                        label="Apellidos"
                        value={bookingForm.last_name}
                        onChange={(event) => handleBookingFieldChange('last_name', event.target.value)}
                        onBlur={handleBookingFieldBlur}
                        fullWidth
                      />
                      <TextField
                        label="Teléfono"
                        value={bookingForm.phone}
                        onChange={(event) => handleBookingFieldChange('phone', event.target.value)}
                        onBlur={handleBookingFieldBlur}
                        fullWidth
                      />
                    </>
                  )}
                  {checkingCandidates ? (
                    <Alert severity="info">Validando registros previos con este teléfono...</Alert>
                  ) : null}
                  {candidateLookupLimitReached ? (
                    <Alert severity="info">
                      Ya no mostraremos más sugerencias para este dispositivo. Si lo deseas, puedes continuar creando un registro nuevo.
                    </Alert>
                  ) : null}
                  {bookingCandidates.length ? (
                    <Stack spacing={1.5}>
                      <Alert severity="warning">
                        Encontramos posibles registros con este teléfono. Selecciona uno si corresponde o crea un registro nuevo.
                      </Alert>
                      {bookingCandidates.map((candidate) => {
                        const selected = selectedCandidateId === candidate.user_id;
                        return (
                          <Card
                            key={candidate.user_id}
                            variant="outlined"
                            sx={{
                              borderColor: selected ? 'primary.main' : 'divider',
                              boxShadow: selected ? '0 0 0 1px rgba(25, 118, 210, 0.3)' : 'none',
                            }}
                          >
                            <CardContent sx={{ p: 2 }}>
                              <Stack
                                direction={{ xs: 'column', sm: 'row' }}
                                spacing={1.5}
                                justifyContent="space-between"
                                alignItems={{ xs: 'flex-start', sm: 'center' }}
                              >
                                <Box>
                                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                                    {candidate.full_name}
                                  </Typography>
                                  {renderCandidateHelper(candidate) ? (
                                    <Typography variant="body2" color="text.secondary">
                                      {renderCandidateHelper(candidate)}
                                    </Typography>
                                  ) : null}
                                </Box>
                                <Button
                                  variant={selected ? 'contained' : 'outlined'}
                                  onClick={() => {
                                    setSelectedCandidateId(candidate.user_id);
                                    setCandidateDecisionMade(true);
                                  }}
                                >
                                  {selected ? 'Registro seleccionado' : 'Usar este registro'}
                                </Button>
                              </Stack>
                            </CardContent>
                          </Card>
                        );
                      })}
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <Button
                          variant={selectedCandidateId === null && candidateDecisionMade ? 'contained' : 'text'}
                          onClick={() => {
                            setSelectedCandidateId(null);
                            setCandidateDecisionMade(true);
                          }}
                        >
                          Ninguno de estos, crear un registro nuevo
                        </Button>
                      </Box>
                    </Stack>
                  ) : null}
                  <TextField
                    label="Motivo de la consulta"
                    value={bookingForm.reason}
                    onChange={(event) => handleBookingFieldChange('reason', event.target.value)}
                    fullWidth
                  />
                  <Box sx={{ display: 'none' }}>
                    <TextField
                      label="Sitio web"
                      value={bookingForm.website}
                      onChange={(event) => handleBookingFieldChange('website', event.target.value)}
                      fullWidth
                      autoComplete="off"
                      tabIndex={-1}
                    />
                  </Box>
                </Stack>
              ) : null}

              {(!isBookingMode && linkData.can_reschedule) || isBookingMode ? (
                <Stack spacing={2}>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    Nueva fecha y hora
                  </Typography>
                  <TextField
                    select
                    label="Selecciona una fecha"
                    value={selectedDate}
                    onChange={(event) => setSelectedDate(event.target.value)}
                    fullWidth
                  >
                    {availableDates.map((dateOption) => (
                      <MenuItem key={dateOption.date} value={dateOption.date}>
                        {dateOption.label}
                      </MenuItem>
                    ))}
                  </TextField>

                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
                      Horarios disponibles
                    </Typography>
                    {availableSlots.length ? (
                      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                        {availableSlots.map((slot) => {
                          const selected = selectedSlot?.datestart === slot.datestart;
                          return (
                            <Chip
                              key={slot.datestart}
                              icon={<CalendarMonthIcon />}
                              label={slot.timeshow}
                              clickable
                              color={selected ? 'primary' : 'default'}
                              onClick={() => setSelectedSlot(slot)}
                              sx={{
                                py: 2.5,
                                px: 0.5,
                                borderRadius: 2,
                              }}
                            />
                          );
                        })}
                      </Stack>
                    ) : (
                      <Alert severity="info">
                        No hay horarios disponibles para la fecha seleccionada.
                      </Alert>
                    )}
                  </Box>
                </Stack>
              ) : null}

              {((!isBookingMode && linkData.can_reschedule) || isBookingMode) ? (
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                  }}
                >
                  <Button
                    variant="contained"
                    size="large"
                    onClick={handleSubmit}
                    disabled={!canSubmit || submitting}
                  >
                    {submitting
                      ? 'Guardando...'
                      : isBookingMode
                        ? 'Registrar mi cita'
                        : 'Reprogramar cita'}
                  </Button>
                </Box>
              ) : null}
            </Stack>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
