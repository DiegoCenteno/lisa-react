import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  CheckCircleOutline as CheckCircleOutlineIcon,
  Chat as ChatIcon,
  Close as CloseIcon,
  Download as DownloadIcon,
  EventAvailable as EventAvailableIcon,
  HighlightOff as HighlightOffIcon,
  LocalHospital as HospitalIcon,
  Phone as PhoneIcon,
  PictureAsPdf as PdfIcon,
} from '@mui/icons-material';
import publicStudyService from '../../api/publicStudyService';
import type {
  PublicAppLinkResponse,
  PublicAppointmentConfirmation,
  PublicStudyResult,
} from '../../types';

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

function normalizePhoneForWhatsApp(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  return digits.startsWith('52') ? digits : `52${digits}`;
}

function StudyResultView({ study }: { study: PublicStudyResult }) {
  const [previewFile, setPreviewFile] = useState<PublicStudyResult['files'][number] | null>(null);
  const hasMultipleFiles = study.files.length > 1;

  return (
    <>
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
              Resultado de estudio
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.88 }}>
              LisaMedic
            </Typography>
          </Box>
        </Stack>
      </Box>

      <CardContent sx={{ p: { xs: 3, md: 4 } }}>
        <Stack spacing={2.5}>
          <Box>
            <Typography variant="body1" sx={{ mb: 1 }}>
              <strong>Médico:</strong> {study.medic_name}
            </Typography>
            <Typography variant="body1">
              <strong>Paciente:</strong> {toPascalCaseName(study.patient_name)}
            </Typography>
          </Box>

          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'primary.main', mb: 1 }}>
              Resultado
            </Typography>
            <Typography
              variant="body1"
              sx={{
                whiteSpace: 'pre-line',
                color: 'text.primary',
                lineHeight: 1.75,
              }}
            >
              {study.template_text}
            </Typography>
          </Box>

          <Box
            sx={{
              borderTop: '1px solid',
              borderColor: 'divider',
              pt: 3,
            }}
          >
            <Stack spacing={2.5}>
              {study.files.map((file, index) => (
                <Box key={file.id}>
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={2}
                    alignItems={{ xs: 'stretch', sm: 'center' }}
                    justifyContent="space-between"
                    sx={{ mb: 2 }}
                  >
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                        {study.files.length > 1 ? `Archivo adjunto ${index + 1}` : 'Archivo adjunto'}
                      </Typography>
                      {file.preview_url ? (
                        <Button
                          variant="text"
                          onClick={() => setPreviewFile(file)}
                          sx={{ px: 0, minWidth: 'auto', textTransform: 'none' }}
                        >
                          {file.name}
                        </Button>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          {file.name}
                        </Typography>
                      )}
                    </Box>
                    {file.download_url ? (
                      <Button
                        component="a"
                        href={file.download_url}
                        variant="contained"
                        startIcon={<DownloadIcon />}
                      >
                        Descargar archivo
                      </Button>
                    ) : null}
                  </Stack>

                  {!hasMultipleFiles && file.type === 'image' && file.preview_url ? (
                    <Box
                      component="img"
                      src={file.preview_url}
                      alt={file.name}
                      sx={{
                        width: '100%',
                        maxHeight: 520,
                        objectFit: 'contain',
                        borderRadius: 3,
                        border: '1px solid',
                        borderColor: 'divider',
                        backgroundColor: '#fff',
                      }}
                    />
                  ) : null}

                  {!hasMultipleFiles && file.type === 'pdf' && file.preview_url ? (
                    <Box
                      sx={{
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 3,
                        overflow: 'hidden',
                        backgroundColor: '#fff',
                      }}
                    >
                      <Box
                        sx={{
                          px: 2,
                          py: 1.25,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                          borderBottom: '1px solid',
                          borderColor: 'divider',
                          color: 'text.secondary',
                        }}
                      >
                        <PdfIcon fontSize="small" />
                        <Typography variant="body2">{file.name}</Typography>
                      </Box>
                      <Box
                        component="iframe"
                        title={file.name}
                        src={`${file.preview_url}#toolbar=0&navpanes=0&pagemode=none&view=FitH`}
                        sx={{ width: '100%', height: 560, border: 0 }}
                      />
                    </Box>
                  ) : null}
                </Box>
              ))}
            </Stack>
          </Box>
        </Stack>
      </CardContent>
    </Card>

      <Dialog open={Boolean(previewFile)} onClose={() => setPreviewFile(null)} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {previewFile?.name ?? 'Vista previa'}
          </Typography>
          <IconButton onClick={() => setPreviewFile(null)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0 }}>
          {previewFile?.type === 'image' && previewFile.preview_url ? (
            <Box
              component="img"
              src={previewFile.preview_url}
              alt={previewFile.name}
              sx={{
                display: 'block',
                width: '100%',
                maxHeight: '78vh',
                objectFit: 'contain',
                backgroundColor: '#fff',
              }}
            />
          ) : null}
          {previewFile?.type === 'pdf' && previewFile.preview_url ? (
            <Box
              component="iframe"
              title={previewFile.name}
              src={`${previewFile.preview_url}#toolbar=0&navpanes=0&pagemode=none&view=FitH`}
              sx={{ width: '100%', height: '78vh', border: 0, backgroundColor: '#fff' }}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

function AppointmentConfirmationView({
  appointment,
  actionLoading,
  historyFormState,
  historyLoading,
  historyMessage,
  historyFormRef,
  onHistoryFormChange,
  onHistoryToggle,
  onSubmitHistoryForm,
  onRespond,
}: {
  appointment: PublicAppointmentConfirmation;
  actionLoading: boolean;
  historyFormState: PublicHistoryFormState;
  historyLoading: boolean;
  historyMessage: string | null;
  historyFormRef: React.RefObject<HTMLDivElement | null>;
  onHistoryFormChange: (field: keyof PublicHistoryFormState, value: string) => void;
  onHistoryToggle: (field: keyof PublicHistoryFormState, checked: boolean) => void;
  onSubmitHistoryForm: () => void;
  onRespond: (action: 'confirm' | 'cancel') => void;
}) {
  const statusAlert =
    appointment.status === 'cancelled'
        ? { severity: 'error' as const, text: 'Tu cita ya está cancelada.' }
        : null;

  return (
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
          background: 'linear-gradient(135deg, #1f76d2 0%, #47a6ff 100%)',
          color: 'white',
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <EventAvailableIcon sx={{ fontSize: 34 }} />
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>
              Confirmación de cita
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.88 }}>
              LisaMedic
            </Typography>
          </Box>
        </Stack>
      </Box>

      <CardContent sx={{ p: { xs: 3, md: 4 } }}>
        <Stack spacing={2.5}>
          {statusAlert ? <Alert severity={statusAlert.severity}>{statusAlert.text}</Alert> : null}


          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main', mb: 1 }}>
              {appointment.question_text}
            </Typography>
            <Typography variant="body1">
              <strong>Paciente:</strong> {toPascalCaseName(appointment.patient.full_name)}
            </Typography>
            <Typography variant="body1">
              <strong>Fecha de la cita:</strong> {appointment.appointment.date_label}
            </Typography>
            <Typography variant="body1">
              <strong>Hora de la cita:</strong> {appointment.appointment.time_label}
            </Typography>
          </Box>

          <Box
            sx={{
              p: 2.5,
              borderRadius: 3,
              backgroundColor: 'rgba(31, 118, 210, 0.05)',
              border: '1px solid rgba(31, 118, 210, 0.12)',
            }}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.25 }}>
              Datos del consultorio
            </Typography>
            <Typography variant="body1">
                <strong>Médico:</strong> {toPascalCaseName(appointment.office.doctor_name)}
            </Typography>
            {appointment.office.specialty ? (
              <Typography variant="body1">
                <strong>Especialidad:</strong> {appointment.office.specialty}
              </Typography>
            ) : null}
            {appointment.office.address ? (
              <Typography variant="body1">
                <strong>Dirección:</strong> {appointment.office.address}
              </Typography>
            ) : null}
            {appointment.office.phone ? (
              <Typography variant="body1">
                <strong>Teléfono del consultorio:</strong> {appointment.office.phone}
              </Typography>
            ) : null}
          </Box>

          {!appointment.history_form_completed ? (
            <Alert severity="info">
              Si tu historia clínica aún está vacía, después de confirmar también podrás responder algunas preguntas básicas.
            </Alert>
          ) : null}

          {appointment.can_respond ? (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Button
                variant="contained"
                color="success"
                startIcon={<CheckCircleOutlineIcon />}
                disabled={actionLoading}
                onClick={() => onRespond('confirm')}
                sx={{ flex: 1 }}
              >
                Confirmar cita
              </Button>
              <Button
                variant="outlined"
                color="error"
                startIcon={<HighlightOffIcon />}
                disabled={actionLoading}
                onClick={() => onRespond('cancel')}
                sx={{ flex: 1 }}
              >
                Cancelar cita
              </Button>
            </Stack>
          ) : null}

          {appointment.office.phone ? (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignSelf: 'flex-start' }}>
              <Button
                component="a"
                href={`tel:${appointment.office.phone}`}
                variant="text"
                startIcon={<PhoneIcon />}
              >
                Llamar al consultorio
              </Button>
              <Button
                component="a"
                href={`https://wa.me/${normalizePhoneForWhatsApp(appointment.office.phone)}`}
                target="_blank"
                rel="noopener noreferrer"
                variant="text"
                startIcon={<ChatIcon />}
              >
                Enviar WhatsApp al consultorio
              </Button>
            </Stack>
          ) : null}

          {historyMessage ? <Alert severity="success">{historyMessage}</Alert> : null}

          {appointment.show_history_form && appointment.history_form ? (
            <Box
              ref={historyFormRef}
              sx={{
                p: { xs: 2.5, md: 3 },
                borderRadius: 3,
                border: '1px solid rgba(31, 118, 210, 0.14)',
                backgroundColor: 'rgba(255,255,255,0.92)',
              }}
            >
              <Stack spacing={2.25}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: 'primary.main' }}>
                    {appointment.history_form_title ?? 'Historia cl�nica b�sica'}
                  </Typography>
                  {appointment.history_form_message ? (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                      {appointment.history_form_message}
                    </Typography>
                  ) : null}
                </Box>

                <Stack spacing={2}>
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                    Las respuestas son opcionales y puedes contestar �nicamente las que t� desees.
                  </Typography>

                  <TextField
                    select
                      label="�Cu�l es tu tipo de sangre?"
                    value={historyFormState.tiposangre}
                    onChange={(event) => onHistoryFormChange('tiposangre', event.target.value)}
                    fullWidth
                  >
                    <MenuItem value="">Seleccionar</MenuItem>
                    {appointment.history_form.blood_type_options.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </TextField>

                  <TextField
                    select
                      label="�En d�nde naciste?"
                    value={historyFormState.originaria}
                    onChange={(event) => onHistoryFormChange('originaria', event.target.value)}
                    fullWidth
                  >
                    <MenuItem value="">Seleccionar</MenuItem>
                    {appointment.history_form.birth_place_options.map((option) => (
                      <MenuItem key={option} value={option}>
                        {option}
                      </MenuItem>
                    ))}
                  </TextField>

                  <TextField
                      label="�En d�nde vives?"
                    value={historyFormState.residente}
                    onChange={(event) => onHistoryFormChange('residente', event.target.value)}
                    fullWidth
                  />

                  {appointment.history_form.allow_gender_question ? (
                    <TextField
                      select
                      label="Sexo"
                      value={historyFormState.gender}
                      onChange={(event) => onHistoryFormChange('gender', event.target.value)}
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
                    onChange={(event) => onHistoryFormChange('estadocivil', event.target.value)}
                    fullWidth
                  >
                    <MenuItem value="">Seleccionar</MenuItem>
                    {appointment.history_form.civil_status_options.map((option) => (
                      <MenuItem key={option} value={option}>
                        {option}
                      </MenuItem>
                    ))}
                  </TextField>

                  <TextField
                    select
                    label="Escolaridad"
                    value={historyFormState.escolaridad}
                    onChange={(event) => onHistoryFormChange('escolaridad', event.target.value)}
                    fullWidth
                  >
                    <MenuItem value="">Seleccionar</MenuItem>
                    {appointment.history_form.education_options.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </TextField>

                  <TextField
                    select
                      label="Â¿QuÃ© tan frecuente realizas ejercicio?"
                    value={historyFormState.txtejercicio}
                    onChange={(event) => onHistoryFormChange('txtejercicio', event.target.value)}
                    fullWidth
                  >
                    <MenuItem value="">Seleccionar</MenuItem>
                    {appointment.history_form.exercise_options.map((option) => (
                      <MenuItem key={option} value={option}>
                        {option}
                      </MenuItem>
                    ))}
                  </TextField>

                  <TextField
                      label="¿Qué ocupación tienes?"
                    value={historyFormState.ocupacion}
                    onChange={(event) => onHistoryFormChange('ocupacion', event.target.value)}
                    fullWidth
                  />

                  <TextField
                    select
                      label="¿Fumas o estás expuesto a alguien que fume?"
                    value={historyFormState.txttabaquismo}
                    onChange={(event) => onHistoryFormChange('txttabaquismo', event.target.value)}
                    fullWidth
                  >
                    <MenuItem value="">Seleccionar</MenuItem>
                    {appointment.history_form.smoking_options.map((option) => (
                      <MenuItem key={option} value={option}>
                        {option}
                      </MenuItem>
                    ))}
                  </TextField>

                  <TextField
                    select
                      label="¿Has consumido o consumes drogas?"
                    value={historyFormState.txttoxicomanias}
                    onChange={(event) => onHistoryFormChange('txttoxicomanias', event.target.value)}
                    fullWidth
                  >
                    <MenuItem value="">Seleccionar</MenuItem>
                    {appointment.history_form.substance_use_options.map((option) => (
                      <MenuItem key={option} value={option}>
                        {option}
                      </MenuItem>
                    ))}
                  </TextField>

                  {historyFormState.txttoxicomanias &&
                  historyFormState.txttoxicomanias !== 'No, nunca' ? (
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                        ¿Qué drogas consumes o consumías?
                      </Typography>
                      <Stack spacing={0.5}>
                        {appointment.history_form.drug_options.map((option) => (
                          <FormControlLabel
                            key={option.key}
                            control={
                              <Checkbox
                                checked={Boolean(historyFormState[option.key as keyof PublicHistoryFormState])}
                                onChange={(event) =>
                                  onHistoryToggle(
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
                    label="¿Aproximadamente cuántas parejas sexuales has tenido?"
                    value={historyFormState.parejassexuales}
                    onChange={(event) => onHistoryFormChange('parejassexuales', event.target.value)}
                    fullWidth
                  />

                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                      ¿Has tenido o tienes alguna de estas enfermedades?
                    </Typography>
                    <Stack spacing={0.5}>
                      {appointment.history_form.disease_options.map((option) => (
                        <FormControlLabel
                          key={option.key}
                          control={
                            <Checkbox
                              checked={Boolean(historyFormState[option.key as keyof PublicHistoryFormState])}
                              onChange={(event) =>
                                onHistoryToggle(
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

                  {appointment.history_form.include_referral_question ? (
                    <TextField
                      select
                      label="¿Cómo llegaste con tu médico?"
                      value={historyFormState.encuesta}
                      onChange={(event) => onHistoryFormChange('encuesta', event.target.value)}
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
                  Las respuestas seleccionadas son de carácter meramente informativo para el médico y únicamente él puede
                  consultarlas y modificarlas en el sistema. La información aquí expuesta no será compartida con ninguna
                  persona ni empresa externa y se enviarán al médico para anexarlas al expediente clínico electrónico del
                  paciente. Cada una de las preguntas son opcionales y puedes contestar únicamente las que tú desees.
                  Recuerda que al compartir información de tu estado de salud pasado y actual con tu médico contribuirá
                  en un mejor diagnóstico y un tratamiento más adecuado a tus necesidades. Al seleccionar el botón
                  &quot;Guardar respuestas&quot; estarás aceptando compartir esta información con tu médico tratante.
                </Typography>

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={historyFormState.privacy_notice_accepted}
                      onChange={(event) =>
                        onHistoryToggle('privacy_notice_accepted', event.target.checked)
                      }
                    />
                  }
                  label="He leído y acepto el aviso de privacidad para compartir esta información con mi médico."
                />

                <Button
                  variant="contained"
                  color="primary"
                  disabled={historyLoading || !historyFormState.privacy_notice_accepted}
                  onClick={onSubmitHistoryForm}
                  sx={{ alignSelf: 'flex-start' }}
                >
                  Guardar respuestas
                </Button>
              </Stack>
            </Box>
          ) : null}
        </Stack>
      </CardContent>
    </Card>
  );
}

export default function PublicStudyResultPage() {
  const { code = '' } = useParams();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [study, setStudy] = useState<PublicStudyResult | null>(null);
  const [appointment, setAppointment] = useState<PublicAppointmentConfirmation | null>(null);
  const [linkType, setLinkType] = useState<PublicAppLinkResponse['type'] | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [historyFormState, setHistoryFormState] = useState<PublicHistoryFormState>(EMPTY_HISTORY_FORM);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyMessage, setHistoryMessage] = useState<string | null>(null);
  const historyFormRef = useRef<HTMLDivElement | null>(null);
  const isPreviewMode = useMemo(() => new URLSearchParams(location.search).get('preview') === '1', [location.search]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        setActionMessage(null);
        setHistoryMessage(null);
        setStudy(null);
        setAppointment(null);
        setHistoryFormState(EMPTY_HISTORY_FORM);

        const data = await publicStudyService.resolvePublicCode(code, { preview: isPreviewMode });
        if (!active) return;
        setLinkType(data.type);

        if (data.type === 'study_result' && data.study) {
          const normalizedStudy = isPreviewMode
            ? {
                ...data.study,
                files: data.study.files.map((file) => ({
                  ...file,
                  preview_url: file.preview_url
                    ? `${file.preview_url}${file.preview_url.includes('?') ? '&' : '?'}preview=1`
                    : file.preview_url,
                  download_url: file.download_url
                    ? `${file.download_url}${file.download_url.includes('?') ? '&' : '?'}preview=1`
                    : file.download_url,
                })),
              }
            : data.study;
          setStudy(normalizedStudy);
          return;
        }

        if (data.type === 'appointment_confirmation' && data.appointment) {
          setAppointment(data.appointment);
          return;
        }

        setError('Este tipo de enlace público todavía no está disponible.');
      } catch (requestError) {
        console.error('Error cargando enlace pÃºblico:', requestError);
        if (!active) return;
        setError('No se encontró información para este enlace.');
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
  }, [code, isPreviewMode]);

  useEffect(() => {
    if (appointment?.status === 'confirmed' && appointment.show_history_form && actionMessage) {
      requestAnimationFrame(() => {
        historyFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }, [appointment, actionMessage]);

  const handleAppointmentResponse = async (action: 'confirm' | 'cancel') => {
    try {
      setActionLoading(true);
      setError(null);
      const response = await publicStudyService.respondToAppointment(code, action);
      if (response) {
        setAppointment(response);
        setHistoryMessage(null);
        setActionMessage(
          action === 'confirm'
            ? 'Tu cita fue confirmada correctamente.'
            : 'Tu cita fue cancelada correctamente.'
        );
      }
    } catch (requestError) {
      console.error('Error respondiendo cita pÃºblica:', requestError);
      setError('No se pudo actualizar el estatus de tu cita.');
    } finally {
      setActionLoading(false);
    }
  };

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

  const handleSubmitHistoryForm = async () => {
    try {
      setHistoryLoading(true);
      setError(null);
      const response = await publicStudyService.saveAppointmentHistoryForm(code, historyFormState);
      setAppointment(response);
      setHistoryMessage('Gracias por contestar la encuesta.');
    } catch (requestError) {
      console.error('Error guardando historia clÃ­nica pÃºblica:', requestError);
      setError('No se pudieron guardar tus respuestas de historia clÃ­nica.');
    } finally {
      setHistoryLoading(false);
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
          background: 'linear-gradient(135deg, #d5f3eb 0%, #f6fbff 100%)',
          p: 2,
        }}
      >
        <Stack spacing={2} alignItems="center">
          <CircularProgress />
          <Typography color="text.secondary">Cargando enlace pÃºblico...</Typography>
        </Stack>
      </Box>
    );
  }

  if (error || !linkType) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #d5f3eb 0%, #f6fbff 100%)',
          p: 2,
        }}
      >
        <Card sx={{ maxWidth: 640, width: '100%', borderRadius: 4 }}>
          <CardContent sx={{ p: 4 }}>
            <Alert severity="error">{error ?? 'Enlace no encontrado.'}</Alert>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #d5f3eb 0%, #f6fbff 100%)',
        p: { xs: 2, md: 3 },
      }}
    >
      <Box sx={{ maxWidth: 860, mx: 'auto' }}>
        {linkType === 'study_result' && study ? (
          <StudyResultView study={study} />
        ) : null}
        {linkType === 'appointment_confirmation' && appointment ? (
          <AppointmentConfirmationView
            appointment={appointment}
            actionLoading={actionLoading}
            historyFormState={historyFormState}
            historyLoading={historyLoading}
            historyMessage={historyMessage}
            historyFormRef={historyFormRef}
            onHistoryFormChange={handleHistoryFormChange}
            onHistoryToggle={handleHistoryToggle}
            onSubmitHistoryForm={handleSubmitHistoryForm}
            onRespond={handleAppointmentResponse}
          />
        ) : null}
      </Box>
    </Box>
  );
}

