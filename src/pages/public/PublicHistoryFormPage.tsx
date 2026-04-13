import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  CircularProgress,
  Divider,
  FormControlLabel,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  CheckCircleOutline as CheckCircleOutlineIcon,
  LocalHospital as HospitalIcon,
} from '@mui/icons-material';
import publicStudyService from '../../api/publicStudyService';
import type { PublicAppointmentConfirmation } from '../../types';

type PublicHistoryFormState = {
  tiposangre: string;
  originaria: string;
  residente: string;
  gender: string;
  estadocivil: string;
  escolaridad: string;
  txtejercicio: string;
  ocupacion: string;
  txttabaquismo: string;
  txttoxicomanias: string;
  heroina: boolean;
  cocaina: boolean;
  marihuana: boolean;
  extasis: boolean;
  lsd: boolean;
  metanfetamina: boolean;
  parejassexuales: string;
  diabetes: boolean;
  hipertension: boolean;
  cancer: boolean;
  reumatica: boolean;
  encuesta: string;
  privacy_notice_accepted: boolean;
};

const EMPTY_HISTORY_FORM: PublicHistoryFormState = {
  tiposangre: '',
  originaria: '',
  residente: '',
  gender: '',
  estadocivil: '',
  escolaridad: '',
  txtejercicio: '',
  ocupacion: '',
  txttabaquismo: '',
  txttoxicomanias: '',
  heroina: false,
  cocaina: false,
  marihuana: false,
  extasis: false,
  lsd: false,
  metanfetamina: false,
  parejassexuales: '',
  diabetes: false,
  hipertension: false,
  cancer: false,
  reumatica: false,
  encuesta: '',
  privacy_notice_accepted: false,
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

export default function PublicHistoryFormPage() {
  const params = useParams<{ token?: string; code?: string }>();
  const publicCode = useMemo(() => params.code ?? params.token ?? '', [params.code, params.token]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [legacyMode, setLegacyMode] = useState(false);
  const [appointment, setAppointment] = useState<PublicAppointmentConfirmation | null>(null);
  const [historyFormState, setHistoryFormState] = useState<PublicHistoryFormState>(EMPTY_HISTORY_FORM);
  const historyFormRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let ignore = false;

    async function load() {
      if (!publicCode) {
        setError('Codigo publico no encontrado.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        let data: PublicAppointmentConfirmation;
        try {
          data = await publicStudyService.resolvePublicHistoryCode(publicCode);
          if (ignore) return;
          setLegacyMode(false);
        } catch {
          const legacy = await publicStudyService.resolvePublicCode(publicCode);
          if (legacy.type !== 'appointment_confirmation' || !legacy.appointment) {
            throw new Error('Codigo publico no encontrado.');
          }
          data = legacy.appointment;
          if (ignore) return;
          setLegacyMode(true);
        }

        if (ignore) return;
        setAppointment(data);
        setHistoryFormState(EMPTY_HISTORY_FORM);
        setSubmitted(Boolean(data.history_form_completed));
      } catch (err: any) {
        if (ignore) return;
        setError(err?.response?.data?.message ?? 'No fue posible cargar la historia clinica.');
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      ignore = true;
    };
  }, [publicCode]);

  const handleHistoryFormChange = (field: keyof PublicHistoryFormState, value: string) => {
    setHistoryFormState((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleHistoryToggle = (field: keyof PublicHistoryFormState, checked: boolean) => {
    setHistoryFormState((current) => ({
      ...current,
      [field]: checked,
    }));
  };

  const handleSubmit = async () => {
    if (!publicCode) return;

    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      if (legacyMode) {
        await publicStudyService.saveAppointmentHistoryForm(publicCode, historyFormState);
      } else {
        await publicStudyService.savePublicHistoryForm(publicCode, historyFormState);
      }
      setSuccessMessage('Tus respuestas han sido confirmadas.');
      setSubmitted(true);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'No fue posible guardar la historia clinica.');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!appointment?.show_history_form || appointment.history_form_completed || !historyFormRef.current) return;
    historyFormRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [appointment]);

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!appointment) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3 }}>
        <Alert severity="error">{error ?? 'No fue posible cargar la historia clinica.'}</Alert>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #eaf7f2 0%, #f5fbf9 55%, #ffffff 100%)',
        py: { xs: 3, md: 5 },
        px: 2,
      }}
    >
      <Box sx={{ maxWidth: 860, mx: 'auto' }}>
        <Card
          sx={{
            borderRadius: 4,
            boxShadow: '0 24px 60px rgba(26, 71, 63, 0.12)',
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              px: { xs: 3, md: 4 },
              py: 3,
              background: 'linear-gradient(135deg, #35a97b 0%, #75d6b4 100%)',
              color: 'white',
            }}
          >
            <Stack direction="row" spacing={1.5} alignItems="center">
              <HospitalIcon sx={{ fontSize: 34 }} />
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 800 }}>
                  Historia clinica basica
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.88 }}>
                  LisaMedic
                </Typography>
              </Box>
            </Stack>
          </Box>

          <CardContent sx={{ p: { xs: 3, md: 4 } }}>
            <Stack spacing={2.5}>
              {error ? <Alert severity="error">{error}</Alert> : null}
              {successMessage ? <Alert severity="success">{successMessage}</Alert> : null}

              <Box>
                <Typography variant="body1">
                  <strong>Paciente:</strong> {toPascalCaseName(appointment.patient.full_name)}
                </Typography>
                <Typography variant="body1">
                  <strong>Medico:</strong> {toPascalCaseName(appointment.office.doctor_name)}
                </Typography>
                <Typography variant="body1">
                  <strong>Fecha de la cita:</strong> {appointment.appointment.date_label}
                </Typography>
                <Typography variant="body1">
                  <strong>Hora de la cita:</strong> {appointment.appointment.time_label}
                </Typography>
              </Box>

              {appointment.history_form_completed || submitted ? (
                <Alert severity="success">
                  Tus respuestas han sido confirmadas.
                </Alert>
              ) : null}

              {appointment.show_history_form && !appointment.history_form_completed && !submitted ? (
                <Box
                  ref={historyFormRef}
                  sx={{
                    p: { xs: 2.5, md: 3 },
                    borderRadius: 3,
                    border: '1px solid rgba(53, 169, 123, 0.16)',
                    backgroundColor: '#fff',
                  }}
                >
                  <Stack spacing={2.25}>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 800, color: 'primary.main' }}>
                        {appointment.history_form_title ?? 'Preguntas exclusivas para el paciente'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                        {appointment.history_form_message ?? 'Ayudanos a contestar las siguientes preguntas y contesta unicamente las que desees.'}
                      </Typography>
                    </Box>

                    <Stack spacing={2}>
                      <TextField
                        select
                        label="Cual es tu tipo de sangre?"
                        value={historyFormState.tiposangre}
                        onChange={(event) => handleHistoryFormChange('tiposangre', event.target.value)}
                        fullWidth
                      >
                        <MenuItem value="">Seleccionar</MenuItem>
                        {appointment.history_form?.blood_type_options.map((option) => (
                          <MenuItem key={option.value} value={option.value}>
                            {option.label}
                          </MenuItem>
                        ))}
                      </TextField>

                      <TextField
                        select
                        label="En donde naciste?"
                        value={historyFormState.originaria}
                        onChange={(event) => handleHistoryFormChange('originaria', event.target.value)}
                        fullWidth
                      >
                        <MenuItem value="">Seleccionar</MenuItem>
                        {appointment.history_form?.birth_place_options.map((option) => (
                          <MenuItem key={option} value={option}>
                            {option}
                          </MenuItem>
                        ))}
                      </TextField>

                      <TextField
                        label="En donde vives?"
                        value={historyFormState.residente}
                        onChange={(event) => handleHistoryFormChange('residente', event.target.value)}
                        fullWidth
                      />

                      {appointment.history_form?.allow_gender_question ? (
                        <TextField
                          select
                          label="Sexo"
                          value={historyFormState.gender}
                          onChange={(event) => handleHistoryFormChange('gender', event.target.value)}
                          fullWidth
                        >
                          <MenuItem value="">Seleccionar</MenuItem>
                          <MenuItem value="F">Femenino</MenuItem>
                          <MenuItem value="M">Masculino</MenuItem>
                        </TextField>
                      ) : null}

                      <TextField
                        select
                        label="Estado civil"
                        value={historyFormState.estadocivil}
                        onChange={(event) => handleHistoryFormChange('estadocivil', event.target.value)}
                        fullWidth
                      >
                        <MenuItem value="">Seleccionar</MenuItem>
                        {appointment.history_form?.civil_status_options.map((option) => (
                          <MenuItem key={option} value={option}>
                            {option}
                          </MenuItem>
                        ))}
                      </TextField>

                      <TextField
                        select
                        label="Escolaridad"
                        value={historyFormState.escolaridad}
                        onChange={(event) => handleHistoryFormChange('escolaridad', event.target.value)}
                        fullWidth
                      >
                        <MenuItem value="">Seleccionar</MenuItem>
                        {appointment.history_form?.education_options.map((option) => (
                          <MenuItem key={option.value} value={option.value}>
                            {option.label}
                          </MenuItem>
                        ))}
                      </TextField>

                      <TextField
                        select
                        label="Que tan frecuente realizas ejercicio?"
                        value={historyFormState.txtejercicio}
                        onChange={(event) => handleHistoryFormChange('txtejercicio', event.target.value)}
                        fullWidth
                      >
                        <MenuItem value="">Seleccionar</MenuItem>
                        {appointment.history_form?.exercise_options.map((option) => (
                          <MenuItem key={option} value={option}>
                            {option}
                          </MenuItem>
                        ))}
                      </TextField>

                      <TextField
                        label="Que ocupacion tienes?"
                        value={historyFormState.ocupacion}
                        onChange={(event) => handleHistoryFormChange('ocupacion', event.target.value)}
                        fullWidth
                      />

                      <TextField
                        select
                        label="Fumas o estas expuesto a alguien que fume?"
                        value={historyFormState.txttabaquismo}
                        onChange={(event) => handleHistoryFormChange('txttabaquismo', event.target.value)}
                        fullWidth
                      >
                        <MenuItem value="">Seleccionar</MenuItem>
                        {appointment.history_form?.smoking_options.map((option) => (
                          <MenuItem key={option} value={option}>
                            {option}
                          </MenuItem>
                        ))}
                      </TextField>

                      <TextField
                        select
                        label="Has consumido o consumes drogas?"
                        value={historyFormState.txttoxicomanias}
                        onChange={(event) => handleHistoryFormChange('txttoxicomanias', event.target.value)}
                        fullWidth
                      >
                        <MenuItem value="">Seleccionar</MenuItem>
                        {appointment.history_form?.substance_use_options.map((option) => (
                          <MenuItem key={option} value={option}>
                            {option}
                          </MenuItem>
                        ))}
                      </TextField>

                      {historyFormState.txttoxicomanias && historyFormState.txttoxicomanias !== 'No, nunca' ? (
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                            Que drogas consumes o consumias?
                          </Typography>
                          <Stack spacing={0.5}>
                            {appointment.history_form?.drug_options.map((option) => (
                              <FormControlLabel
                                key={option.key}
                                control={
                                  <Checkbox
                                    checked={Boolean(historyFormState[option.key as keyof PublicHistoryFormState])}
                                    onChange={(event) =>
                                      handleHistoryToggle(
                                        option.key as keyof PublicHistoryFormState,
                                        event.target.checked
                                      )
                                    }
                                  />
                                }
                                label={option.label}
                              />
                            ))}
                          </Stack>
                        </Box>
                      ) : null}

                      <TextField
                        label="Aproximadamente, cuantas parejas sexuales has tenido?"
                        value={historyFormState.parejassexuales}
                        onChange={(event) => handleHistoryFormChange('parejassexuales', event.target.value)}
                        fullWidth
                      />

                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                          Has tenido o tienes alguna de estas enfermedades?
                        </Typography>
                        <Stack spacing={0.5}>
                          {appointment.history_form?.disease_options.map((option) => (
                            <FormControlLabel
                              key={option.key}
                              control={
                                <Checkbox
                                  checked={Boolean(historyFormState[option.key as keyof PublicHistoryFormState])}
                                  onChange={(event) =>
                                    handleHistoryToggle(
                                      option.key as keyof PublicHistoryFormState,
                                      event.target.checked
                                    )
                                  }
                                />
                              }
                              label={option.label}
                            />
                          ))}
                        </Stack>
                      </Box>

                      {appointment.history_form?.include_referral_question ? (
                        <TextField
                          select
                          label="Como llegaste con tu medico?"
                          value={historyFormState.encuesta}
                          onChange={(event) => handleHistoryFormChange('encuesta', event.target.value)}
                          fullWidth
                        >
                          <MenuItem value="">Seleccionar</MenuItem>
                          {appointment.history_form.referral_options.map((option) => (
                            <MenuItem key={option.value} value={option.value}>
                              {option.label}
                            </MenuItem>
                          ))}
                        </TextField>
                      ) : null}
                    </Stack>

                    <Divider />

                    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8 }}>
                      Las respuestas seleccionadas son de caracter meramente informativo para el medico y unicamente el puede
                      consultarlas y modificarlas en el sistema. La informacion aqui expuesta no sera compartida con ninguna
                      persona ni empresa externa y se enviara al medico para anexarla al expediente clinico electronico del
                      paciente. Cada una de las preguntas son opcionales y puedes contestar unicamente las que tu desees.
                    </Typography>

                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={historyFormState.privacy_notice_accepted}
                          onChange={(event) =>
                            handleHistoryToggle('privacy_notice_accepted', event.target.checked)
                          }
                        />
                      }
                      label="He leido y acepto el aviso de privacidad para compartir esta informacion con mi medico."
                    />

                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={<CheckCircleOutlineIcon />}
                      disabled={saving || !historyFormState.privacy_notice_accepted}
                      onClick={handleSubmit}
                      sx={{ alignSelf: 'flex-start' }}
                    >
                      {saving ? 'Guardando...' : 'Guardar respuestas'}
                    </Button>
                  </Stack>
                </Box>
              ) : null}
            </Stack>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
