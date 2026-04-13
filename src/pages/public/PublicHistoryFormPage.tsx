import { useState } from 'react';
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
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  LocalHospital as HospitalIcon,
} from '@mui/icons-material';

export default function PublicHistoryFormPage() {
  const [submitted, setSubmitted] = useState(false);
  const [expandedPanel, setExpandedPanel] = useState<string | false>('hereditary');

  const [formData, setFormData] = useState({
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
  });

  const updateField = (field: string, value: string | boolean) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  const handleAccordionChange = (panel: string) => (_: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedPanel(isExpanded ? panel : false);
  };

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
        <Card sx={{ maxWidth: 500, width: '100%' }}>
          <CardContent sx={{ p: 4, textAlign: 'center' }}>
            <HospitalIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
            <Typography variant="h5" sx={{ color: 'primary.main', mb: 2 }}>
              ¡Información Enviada!
            </Typography>
            <Alert severity="success">
              Tu historia clínica ha sido registrada exitosamente. El médico revisará tu información antes de la consulta.
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
            Historia Clínica
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
            LisaMedic - Por favor complete la siguiente información antes de su consulta
          </Typography>
        </Box>

        <Box component="form" onSubmit={handleSubmit}>
          <Accordion expanded={expandedPanel === 'hereditary'} onChange={handleAccordionChange('hereditary')}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography sx={{ fontWeight: 600 }}>Antecedentes Heredofamiliares</Typography>
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
                  <TextField label="Diabetes mellitus" fullWidth size="small" value={formData.diabetes} onChange={(e) => updateField('diabetes', e.target.value)} />
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
              <Typography sx={{ fontWeight: 600 }}>Antecedentes Personales NO Patológicos</Typography>
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
              <Typography sx={{ fontWeight: 600 }}>Antecedentes Personales Patológicos</Typography>
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
              <Typography sx={{ fontWeight: 600 }}>Antecedentes Ginecológicos</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.has_gynecological}
                    onChange={(e) => updateField('has_gynecological', e.target.checked)}
                  />
                }
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

          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Button type="submit" variant="contained" size="large" sx={{ px: 6 }}>
              Enviar Información
            </Button>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
