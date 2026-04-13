import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Grid,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControlLabel,
  Checkbox,
  CircularProgress,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  LocalHospital as HospitalIcon,
} from '@mui/icons-material';
import publicStudyService from '../../api/publicStudyService';
import type { PublicAppointmentConfirmation } from '../../types';

type FormDataState = {
  blood_type_rh: string;
  genetic_defects: string;
  family_preeclampsia: string;
  diabetes: string;
  cancer: string;
  hypertension: string;
  rheumatic_disease: string;
  hereditary_others: string;
  origin: string;
  residence: string;
  civil_status: string;
  education: string;
  occupation: string;
  substance_use: string;
  medications: string;
  smoking: string;
  alcohol: string;
  personal_others: string;
  allergies: string;
  chronic_diseases: string;
  surgeries: string;
  transfusions: string;
  fractures: string;
  pathological_others: string;
  has_gynecological: boolean;
  menarche: string;
  menstrual_cycles: string;
  last_menstruation_date: string;
  ivsa: string;
  sexual_partners: string;
  std: string;
  cytology: string;
  family_planning: string;
  gestations: string;
  deliveries: string;
  cesareans: string;
  abortions: string;
  privacy_notice_accepted: boolean;
};

const initialFormData: FormDataState = {
  blood_type_rh: '',
  genetic_defects: '',
  family_preeclampsia: '',
  diabetes: '',
  cancer: '',
  hypertension: '',
  rheumatic_disease: '',
  hereditary_others: '',
  origin: '',
  residence: '',
  civil_status: '',
  education: '',
  occupation: '',
  substance_use: '',
  medications: '',
  smoking: '',
  alcohol: '',
  personal_others: '',
  allergies: '',
  chronic_diseases: '',
  surgeries: '',
  transfusions: '',
  fractures: '',
  pathological_others: '',
  has_gynecological: false,
  menarche: '',
  menstrual_cycles: '',
  last_menstruation_date: '',
  ivsa: '',
  sexual_partners: '',
  std: '',
  cytology: '',
  family_planning: '',
  gestations: '',
  deliveries: '',
  cesareans: '',
  abortions: '',
  privacy_notice_accepted: false,
};

export default function PublicHistoryFormPage() {
  const params = useParams<{ token?: string; code?: string }>();
  const publicCode = useMemo(() => params.code ?? params.token ?? '', [params.code, params.token]);

  const [submitted, setSubmitted] = useState(false);
  const [expandedPanel, setExpandedPanel] = useState<string | false>('hereditary');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [appointmentData, setAppointmentData] = useState<PublicAppointmentConfirmation | null>(null);
  const [legacyMode, setLegacyMode] = useState(false);
  const [formData, setFormData] = useState<FormDataState>(initialFormData);

  useEffect(() => {
    let ignore = false;

    async function load() {
      if (!publicCode) {
        setError('Código público no encontrado.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');

      try {
        let data: PublicAppointmentConfirmation;
        try {
          data = await publicStudyService.resolvePublicHistoryCode(publicCode);
          if (ignore) return;
          setLegacyMode(false);
        } catch {
          const legacy = await publicStudyService.resolvePublicCode(publicCode);
          if (legacy.type !== 'appointment_confirmation' || !legacy.appointment) {
            throw new Error('Código público no encontrado.');
          }
          data = legacy.appointment;
          if (ignore) return;
          setLegacyMode(true);
        }
        if (ignore) return;
        setAppointmentData(data);
        if (data.history_form_completed) {
          setSubmitted(true);
        }
      } catch (err: any) {
        if (ignore) return;
        setError(err?.response?.data?.message ?? 'No fue posible cargar la historia clínica.');
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

  const updateField = <K extends keyof FormDataState>(field: K, value: FormDataState[K]) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!publicCode) return;

    setSaving(true);
    setError('');

    try {
      if (legacyMode) {
        await publicStudyService.saveAppointmentHistoryForm(publicCode, formData);
      } else {
        await publicStudyService.savePublicHistoryForm(publicCode, formData);
      }
      setSubmitted(true);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'No fue posible guardar la historia clínica.');
    } finally {
      setSaving(false);
    }
  };

  const handleAccordionChange = (panel: string) => (_: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedPanel(isExpanded ? panel : false);
  };

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (submitted) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #00897B 0%, #1565C0 100%)',
          p: 2,
        }}
      >
        <Card sx={{ maxWidth: 560, width: '100%' }}>
          <CardContent sx={{ p: 4, textAlign: 'center' }}>
            <HospitalIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
            <Typography variant="h5" sx={{ color: 'primary.main', mb: 2 }}>
              Información enviada
            </Typography>
            <Alert severity="success">
              Tu historia clínica ha sido registrada. El médico podrá revisarla antes de la consulta.
            </Alert>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #00897B 0%, #1565C0 100%)',
        p: 2,
      }}
    >
      <Box sx={{ maxWidth: 800, mx: 'auto' }}>
        <Box sx={{ textAlign: 'center', mb: 3, pt: 3 }}>
          <HospitalIcon sx={{ fontSize: 40, color: 'white', mb: 1 }} />
          <Typography variant="h5" sx={{ color: 'white', fontWeight: 700 }}>
            Historia clínica
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.88)' }}>
            {appointmentData?.history_form_message || 'Por favor completa la siguiente información antes de tu consulta.'}
          </Typography>
          {appointmentData && (
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.88)', mt: 1 }}>
              {appointmentData.patient.full_name} · {appointmentData.office.doctor_name} · {appointmentData.appointment.date_label} · {appointmentData.appointment.time_label}
            </Typography>
          )}
        </Box>

        {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}

        <Box component="form" onSubmit={handleSubmit}>
          <Accordion expanded={expandedPanel === 'hereditary'} onChange={handleAccordionChange('hereditary')}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography sx={{ fontWeight: 600 }}>Antecedentes heredofamiliares</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField label="Grupo sanguíneo y RH" fullWidth size="small" value={formData.blood_type_rh} onChange={(e) => updateField('blood_type_rh', e.target.value)} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField label="A. genéticos y/o defectos" fullWidth size="small" value={formData.genetic_defects} onChange={(e) => updateField('genetic_defects', e.target.value)} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField label="A. familiar de preeclampsia" fullWidth size="small" value={formData.family_preeclampsia} onChange={(e) => updateField('family_preeclampsia', e.target.value)} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField label="Diabetes" fullWidth size="small" value={formData.diabetes} onChange={(e) => updateField('diabetes', e.target.value)} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField label="Cáncer" fullWidth size="small" value={formData.cancer} onChange={(e) => updateField('cancer', e.target.value)} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField label="Hipertensión" fullWidth size="small" value={formData.hypertension} onChange={(e) => updateField('hypertension', e.target.value)} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField label="Enfermedad reumática" fullWidth size="small" value={formData.rheumatic_disease} onChange={(e) => updateField('rheumatic_disease', e.target.value)} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField label="Otras" fullWidth size="small" value={formData.hereditary_others} onChange={(e) => updateField('hereditary_others', e.target.value)} />
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>

          <Accordion expanded={expandedPanel === 'personal_non_path'} onChange={handleAccordionChange('personal_non_path')}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography sx={{ fontWeight: 600 }}>Antecedentes personales no patológicos</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField label="Originaria" fullWidth size="small" value={formData.origin} onChange={(e) => updateField('origin', e.target.value)} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField label="Residente" fullWidth size="small" value={formData.residence} onChange={(e) => updateField('residence', e.target.value)} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField label="Estado civil" fullWidth size="small" value={formData.civil_status} onChange={(e) => updateField('civil_status', e.target.value)} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField label="Escolaridad" fullWidth size="small" value={formData.education} onChange={(e) => updateField('education', e.target.value)} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField label="Ocupación" fullWidth size="small" value={formData.occupation} onChange={(e) => updateField('occupation', e.target.value)} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField label="Toxicomanías" fullWidth size="small" value={formData.substance_use} onChange={(e) => updateField('substance_use', e.target.value)} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField label="Fármacos" fullWidth size="small" value={formData.medications} onChange={(e) => updateField('medications', e.target.value)} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField label="Tabaquismo" fullWidth size="small" value={formData.smoking} onChange={(e) => updateField('smoking', e.target.value)} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField label="Bebidas alcohólicas" fullWidth size="small" value={formData.alcohol} onChange={(e) => updateField('alcohol', e.target.value)} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField label="Otras" fullWidth size="small" value={formData.personal_others} onChange={(e) => updateField('personal_others', e.target.value)} />
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>

          <Accordion expanded={expandedPanel === 'pathological'} onChange={handleAccordionChange('pathological')}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography sx={{ fontWeight: 600 }}>Antecedentes personales patológicos</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField label="Alergias" fullWidth size="small" value={formData.allergies} onChange={(e) => updateField('allergies', e.target.value)} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField label="Enfermedades crónico-degenerativas" fullWidth size="small" value={formData.chronic_diseases} onChange={(e) => updateField('chronic_diseases', e.target.value)} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField label="Cirugías" fullWidth size="small" value={formData.surgeries} onChange={(e) => updateField('surgeries', e.target.value)} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField label="Transfusiones" fullWidth size="small" value={formData.transfusions} onChange={(e) => updateField('transfusions', e.target.value)} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField label="Fracturas" fullWidth size="small" value={formData.fractures} onChange={(e) => updateField('fractures', e.target.value)} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField label="Otras" fullWidth size="small" value={formData.pathological_others} onChange={(e) => updateField('pathological_others', e.target.value)} />
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>

          <Accordion expanded={expandedPanel === 'gynecological'} onChange={handleAccordionChange('gynecological')}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography sx={{ fontWeight: 600 }}>Antecedentes ginecológicos</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <FormControlLabel
                control={<Checkbox checked={formData.has_gynecological} onChange={(e) => updateField('has_gynecological', e.target.checked)} />}
                label="Aplica esta sección"
                sx={{ mb: 2 }}
              />
              {formData.has_gynecological && (
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField label="Menarca" fullWidth size="small" value={formData.menarche} onChange={(e) => updateField('menarche', e.target.value)} />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField label="Ciclos menstruales" fullWidth size="small" value={formData.menstrual_cycles} onChange={(e) => updateField('menstrual_cycles', e.target.value)} />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField label="Fecha de última menstruación" type="date" fullWidth size="small" value={formData.last_menstruation_date} onChange={(e) => updateField('last_menstruation_date', e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField label="IVSA" fullWidth size="small" value={formData.ivsa} onChange={(e) => updateField('ivsa', e.target.value)} />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField label="Parejas sexuales" fullWidth size="small" value={formData.sexual_partners} onChange={(e) => updateField('sexual_partners', e.target.value)} />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField label="ETS" fullWidth size="small" value={formData.std} onChange={(e) => updateField('std', e.target.value)} />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField label="Citología" fullWidth size="small" value={formData.cytology} onChange={(e) => updateField('cytology', e.target.value)} />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField label="Método de planificación familiar" fullWidth size="small" value={formData.family_planning} onChange={(e) => updateField('family_planning', e.target.value)} />
                  </Grid>
                  <Grid size={{ xs: 6, sm: 3 }}>
                    <TextField label="Gestaciones" fullWidth size="small" value={formData.gestations} onChange={(e) => updateField('gestations', e.target.value)} />
                  </Grid>
                  <Grid size={{ xs: 6, sm: 3 }}>
                    <TextField label="Partos" fullWidth size="small" value={formData.deliveries} onChange={(e) => updateField('deliveries', e.target.value)} />
                  </Grid>
                  <Grid size={{ xs: 6, sm: 3 }}>
                    <TextField label="Cesáreas" fullWidth size="small" value={formData.cesareans} onChange={(e) => updateField('cesareans', e.target.value)} />
                  </Grid>
                  <Grid size={{ xs: 6, sm: 3 }}>
                    <TextField label="Abortos" fullWidth size="small" value={formData.abortions} onChange={(e) => updateField('abortions', e.target.value)} />
                  </Grid>
                </Grid>
              )}
            </AccordionDetails>
          </Accordion>

          <Box sx={{ mt: 3 }}>
            <FormControlLabel
              control={<Checkbox checked={formData.privacy_notice_accepted} onChange={(e) => updateField('privacy_notice_accepted', e.target.checked)} />}
              label="Confirmo que deseo integrar esta información a mi expediente clínico."
            />
          </Box>

          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Button type="submit" variant="contained" size="large" sx={{ px: 6 }} disabled={saving}>
              {saving ? 'Enviando...' : 'Enviar información'}
            </Button>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
