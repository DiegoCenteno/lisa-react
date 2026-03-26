import { memo, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  FormControlLabel,
  Grid,
  MenuItem,
  Skeleton,
  Snackbar,
  TextField,
  Typography,
} from '@mui/material';
import {
  Biotech as BiotechIcon,
  Close as CancelIcon,
  Edit as EditIcon,
  FamilyRestroom as FamilyRestroomIcon,
  PregnantWoman as PregnantWomanIcon,
  Person as PersonIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import type { ClinicalHistory } from '../../types';
import { patientService } from '../../api/patientService';
import { clinicalHistoryCatalogs } from '../../utils/clinicalHistory';

interface Props {
  patientId: number;
  onHistoryLoaded?: (history: ClinicalHistory) => void;
}

function InfoRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <Box sx={{ mb: 1.5 }}>
      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>{label}</Typography>
      <Typography variant="body2">{value}</Typography>
    </Box>
  );
}

function SectionCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          {icon}
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{title}</Typography>
        </Box>
        {children}
      </CardContent>
    </Card>
  );
}

function Field({
  label, value, editing, onChange, options, multiline = false,
}: {
  label: string; value?: string; editing: boolean; onChange: (value: string) => void; options?: string[]; multiline?: boolean;
}) {
  if (!editing) return <InfoRow label={label} value={value} />;
  return (
    <TextField
      label={label}
      fullWidth
      size="small"
      value={value ?? ''}
      select={Boolean(options)}
      multiline={multiline}
      minRows={multiline ? 2 : undefined}
      onChange={(event) => onChange(event.target.value)}
    >
      {options?.map((option) => <MenuItem key={option} value={option}>{option}</MenuItem>)}
    </TextField>
  );
}

function CheckField({
  label, checked, value, editing, onCheckedChange, onValueChange,
}: {
  label: string; checked?: boolean; value?: string; editing: boolean; onCheckedChange: (value: boolean) => void; onValueChange: (value: string) => void;
}) {
  if (!editing) return <InfoRow label={label} value={value} />;
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        gap: 1,
      }}
    >
      <FormControlLabel
        sx={{ m: 0 }}
        control={<Checkbox checked={Boolean(checked)} onChange={(event) => onCheckedChange(event.target.checked)} />}
        label={label}
      />
      {checked ? (
        <TextField
          fullWidth
          size="small"
          value={value ?? ''}
          onChange={(event) => onValueChange(event.target.value)}
          placeholder="Detalle adicional"
        />
      ) : null}
    </Box>
  );
}

function ClinicalHistoryTabInner({ patientId, onHistoryLoaded }: Props) {
  const [clinicalHistory, setClinicalHistory] = useState<ClinicalHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<ClinicalHistory | null>(null);
  const onHistoryLoadedRef = useRef(onHistoryLoaded);
  useEffect(() => { onHistoryLoadedRef.current = onHistoryLoaded; }, [onHistoryLoaded]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    patientService.getClinicalHistory(patientId).then((data) => {
      if (cancelled) return;
      setClinicalHistory(data);
      setForm(data);
      onHistoryLoadedRef.current?.(data);
    }).catch((err) => {
      console.error('Error cargando historia clínica:', err);
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [patientId]);

  const save = async () => {
    if (!form) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await patientService.updateClinicalHistory(patientId, form);
      setClinicalHistory(updated);
      setForm(updated);
      setEditing(false);
      setMessage('Historia clínica actualizada');
      onHistoryLoadedRef.current?.(updated);
    } catch (saveError) {
      console.error(saveError);
      setError('No se pudo guardar la historia clínica');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !form) {
    return (
      <Box>
        <Skeleton height={60} />
        <Skeleton height={200} sx={{ mt: 2 }} />
        <Skeleton height={200} sx={{ mt: 2 }} />
      </Box>
    );
  }

  const hereditary = form.hereditary_background;
  const nonPath = form.personal_non_pathological;
  const pathological = form.personal_pathological;
  const gyn = form.gynecological ?? {};

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, gap: 1, flexWrap: 'wrap' }}>
        <Typography variant="h6">Historia clínica</Typography>
        {editing ? (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant="outlined" startIcon={<CancelIcon />} onClick={() => { setForm(clinicalHistory ?? form); setEditing(false); }} disabled={saving}>Cancelar</Button>
            <Button variant="contained" startIcon={<SaveIcon />} onClick={save} disabled={saving}>Guardar</Button>
          </Box>
        ) : (
          <Button variant="outlined" startIcon={<EditIcon />} onClick={() => setEditing(true)}>Editar</Button>
        )}
      </Box>

      <SectionCard title="Antecedentes Heredofamiliares" icon={<FamilyRestroomIcon color="primary" />}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}><Field label="Grupo sanguíneo y RH" value={hereditary.blood_type_rh} editing={editing} options={clinicalHistoryCatalogs.bloodTypes} onChange={(value) => setForm((prev) => ({ ...prev, hereditary_background: { ...prev.hereditary_background, blood_type_rh: value } }))} /></Grid>
          <Grid size={{ xs: 12, lg: 6 }}><CheckField label="Diabetes mellitus" checked={hereditary.diabetes_checked} value={hereditary.diabetes} editing={editing} onCheckedChange={(value) => setForm((prev) => ({ ...prev, hereditary_background: { ...prev.hereditary_background, diabetes_checked: value } }))} onValueChange={(value) => setForm((prev) => ({ ...prev, hereditary_background: { ...prev.hereditary_background, diabetes: value } }))} /></Grid>
          <Grid size={{ xs: 12, lg: 6 }}><CheckField label="A. genéticos y/o defectos" checked={hereditary.genetic_defects_checked} value={hereditary.genetic_defects} editing={editing} onCheckedChange={(value) => setForm((prev) => ({ ...prev, hereditary_background: { ...prev.hereditary_background, genetic_defects_checked: value } }))} onValueChange={(value) => setForm((prev) => ({ ...prev, hereditary_background: { ...prev.hereditary_background, genetic_defects: value } }))} /></Grid>
          <Grid size={{ xs: 12, lg: 6 }}><CheckField label="A. familiar de preeclampsia" checked={hereditary.family_preeclampsia_checked} value={hereditary.family_preeclampsia} editing={editing} onCheckedChange={(value) => setForm((prev) => ({ ...prev, hereditary_background: { ...prev.hereditary_background, family_preeclampsia_checked: value } }))} onValueChange={(value) => setForm((prev) => ({ ...prev, hereditary_background: { ...prev.hereditary_background, family_preeclampsia: value } }))} /></Grid>
          <Grid size={{ xs: 12, lg: 6 }}><CheckField label="Cáncer" checked={hereditary.cancer_checked} value={hereditary.cancer} editing={editing} onCheckedChange={(value) => setForm((prev) => ({ ...prev, hereditary_background: { ...prev.hereditary_background, cancer_checked: value } }))} onValueChange={(value) => setForm((prev) => ({ ...prev, hereditary_background: { ...prev.hereditary_background, cancer: value } }))} /></Grid>
          <Grid size={{ xs: 12, lg: 6 }}><CheckField label="Hipertensión" checked={hereditary.hypertension_checked} value={hereditary.hypertension} editing={editing} onCheckedChange={(value) => setForm((prev) => ({ ...prev, hereditary_background: { ...prev.hereditary_background, hypertension_checked: value } }))} onValueChange={(value) => setForm((prev) => ({ ...prev, hereditary_background: { ...prev.hereditary_background, hypertension: value } }))} /></Grid>
          <Grid size={{ xs: 12, lg: 6 }}><CheckField label="Enfermedad reumática" checked={hereditary.rheumatic_disease_checked} value={hereditary.rheumatic_disease} editing={editing} onCheckedChange={(value) => setForm((prev) => ({ ...prev, hereditary_background: { ...prev.hereditary_background, rheumatic_disease_checked: value } }))} onValueChange={(value) => setForm((prev) => ({ ...prev, hereditary_background: { ...prev.hereditary_background, rheumatic_disease: value } }))} /></Grid>
          <Grid size={{ xs: 12 }}><CheckField label="Otras" checked={hereditary.others_checked} value={hereditary.others} editing={editing} onCheckedChange={(value) => setForm((prev) => ({ ...prev, hereditary_background: { ...prev.hereditary_background, others_checked: value } }))} onValueChange={(value) => setForm((prev) => ({ ...prev, hereditary_background: { ...prev.hereditary_background, others: value } }))} /></Grid>
        </Grid>
      </SectionCard>

      <SectionCard title="Antecedentes Personales NO Patológicos" icon={<PersonIcon color="primary" />}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 4 }}><Field label="Originaria" value={nonPath.origin} editing={editing} onChange={(value) => setForm((prev) => ({ ...prev, personal_non_pathological: { ...prev.personal_non_pathological, origin: value } }))} /></Grid>
          <Grid size={{ xs: 12, md: 4 }}><Field label="Residente" value={nonPath.residence} editing={editing} onChange={(value) => setForm((prev) => ({ ...prev, personal_non_pathological: { ...prev.personal_non_pathological, residence: value } }))} /></Grid>
          <Grid size={{ xs: 12, md: 4 }}><Field label="Estado civil" value={nonPath.civil_status} editing={editing} onChange={(value) => setForm((prev) => ({ ...prev, personal_non_pathological: { ...prev.personal_non_pathological, civil_status: value } }))} /></Grid>
          <Grid size={{ xs: 12, md: 4 }}><Field label="Religión" value={nonPath.religion} editing={editing} onChange={(value) => setForm((prev) => ({ ...prev, personal_non_pathological: { ...prev.personal_non_pathological, religion: value } }))} /></Grid>
          <Grid size={{ xs: 12, md: 4 }}><Field label="Escolaridad" value={nonPath.education} editing={editing} options={clinicalHistoryCatalogs.education} onChange={(value) => setForm((prev) => ({ ...prev, personal_non_pathological: { ...prev.personal_non_pathological, education: value } }))} /></Grid>
          <Grid size={{ xs: 12, md: 4 }}><Field label="Ocupación" value={nonPath.occupation} editing={editing} onChange={(value) => setForm((prev) => ({ ...prev, personal_non_pathological: { ...prev.personal_non_pathological, occupation: value } }))} /></Grid>
          <Grid size={{ xs: 12, lg: 6 }}><CheckField label="Toxicomanías" checked={nonPath.substance_use_checked} value={nonPath.substance_use} editing={editing} onCheckedChange={(value) => setForm((prev) => ({ ...prev, personal_non_pathological: { ...prev.personal_non_pathological, substance_use_checked: value } }))} onValueChange={(value) => setForm((prev) => ({ ...prev, personal_non_pathological: { ...prev.personal_non_pathological, substance_use: value } }))} /></Grid>
          <Grid size={{ xs: 12, lg: 6 }}><CheckField label="Fármacos" checked={nonPath.medications_checked} value={nonPath.medications} editing={editing} onCheckedChange={(value) => setForm((prev) => ({ ...prev, personal_non_pathological: { ...prev.personal_non_pathological, medications_checked: value } }))} onValueChange={(value) => setForm((prev) => ({ ...prev, personal_non_pathological: { ...prev.personal_non_pathological, medications: value } }))} /></Grid>
          <Grid size={{ xs: 12, lg: 6 }}><CheckField label="Tabaquismo" checked={nonPath.smoking_checked} value={nonPath.smoking} editing={editing} onCheckedChange={(value) => setForm((prev) => ({ ...prev, personal_non_pathological: { ...prev.personal_non_pathological, smoking_checked: value } }))} onValueChange={(value) => setForm((prev) => ({ ...prev, personal_non_pathological: { ...prev.personal_non_pathological, smoking: value } }))} /></Grid>
          <Grid size={{ xs: 12, lg: 6 }}><CheckField label="Bebidas alcohólicas" checked={nonPath.alcohol_checked} value={nonPath.alcohol} editing={editing} onCheckedChange={(value) => setForm((prev) => ({ ...prev, personal_non_pathological: { ...prev.personal_non_pathological, alcohol_checked: value } }))} onValueChange={(value) => setForm((prev) => ({ ...prev, personal_non_pathological: { ...prev.personal_non_pathological, alcohol: value } }))} /></Grid>
          <Grid size={{ xs: 12 }}><CheckField label="Otras" checked={nonPath.others_checked} value={nonPath.others} editing={editing} onCheckedChange={(value) => setForm((prev) => ({ ...prev, personal_non_pathological: { ...prev.personal_non_pathological, others_checked: value } }))} onValueChange={(value) => setForm((prev) => ({ ...prev, personal_non_pathological: { ...prev.personal_non_pathological, others: value } }))} /></Grid>
        </Grid>
      </SectionCard>

      <SectionCard title="Antecedentes Personales Patológicos" icon={<BiotechIcon color="error" />}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12 }}><Field label="Alergias" value={pathological.allergies} editing={editing} multiline onChange={(value) => setForm((prev) => ({ ...prev, personal_pathological: { ...prev.personal_pathological, allergies: value } }))} /></Grid>
          <Grid size={{ xs: 12, lg: 6 }}><CheckField label="Enfermedades crónico degenerativas" checked={pathological.chronic_diseases_checked} value={pathological.chronic_diseases} editing={editing} onCheckedChange={(value) => setForm((prev) => ({ ...prev, personal_pathological: { ...prev.personal_pathological, chronic_diseases_checked: value } }))} onValueChange={(value) => setForm((prev) => ({ ...prev, personal_pathological: { ...prev.personal_pathological, chronic_diseases: value } }))} /></Grid>
          <Grid size={{ xs: 12, lg: 6 }}><CheckField label="Cirugías" checked={pathological.surgeries_checked} value={pathological.surgeries} editing={editing} onCheckedChange={(value) => setForm((prev) => ({ ...prev, personal_pathological: { ...prev.personal_pathological, surgeries_checked: value } }))} onValueChange={(value) => setForm((prev) => ({ ...prev, personal_pathological: { ...prev.personal_pathological, surgeries: value } }))} /></Grid>
          <Grid size={{ xs: 12, lg: 6 }}><CheckField label="Transfusiones" checked={pathological.transfusions_checked} value={pathological.transfusions} editing={editing} onCheckedChange={(value) => setForm((prev) => ({ ...prev, personal_pathological: { ...prev.personal_pathological, transfusions_checked: value } }))} onValueChange={(value) => setForm((prev) => ({ ...prev, personal_pathological: { ...prev.personal_pathological, transfusions: value } }))} /></Grid>
          <Grid size={{ xs: 12, lg: 6 }}><CheckField label="Fracturas" checked={pathological.fractures_checked} value={pathological.fractures} editing={editing} onCheckedChange={(value) => setForm((prev) => ({ ...prev, personal_pathological: { ...prev.personal_pathological, fractures_checked: value } }))} onValueChange={(value) => setForm((prev) => ({ ...prev, personal_pathological: { ...prev.personal_pathological, fractures: value } }))} /></Grid>
          <Grid size={{ xs: 12 }}><CheckField label="Otras" checked={pathological.others_checked} value={pathological.others} editing={editing} onCheckedChange={(value) => setForm((prev) => ({ ...prev, personal_pathological: { ...prev.personal_pathological, others_checked: value } }))} onValueChange={(value) => setForm((prev) => ({ ...prev, personal_pathological: { ...prev.personal_pathological, others: value } }))} /></Grid>
        </Grid>
      </SectionCard>

      <SectionCard title="Antecedentes Ginecológicos" icon={<PregnantWomanIcon color="secondary" />}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 4 }}><Field label="Menarca" value={gyn.menarche} editing={editing} onChange={(value) => setForm((prev) => ({ ...prev, gynecological: { ...prev.gynecological, menarche: value } }))} /></Grid>
          <Grid size={{ xs: 12, md: 8 }}><Field label="Ciclos menstruales" value={gyn.menstrual_cycles} editing={editing} multiline onChange={(value) => setForm((prev) => ({ ...prev, gynecological: { ...prev.gynecological, menstrual_cycles: value } }))} /></Grid>
          <Grid size={{ xs: 12, md: 4 }}><Field label="Fecha de última menstruación" value={gyn.last_menstruation_date} editing={editing} onChange={(value) => setForm((prev) => ({ ...prev, gynecological: { ...prev.gynecological, last_menstruation_date: value } }))} /></Grid>
          <Grid size={{ xs: 12, md: 4 }}><Field label="IVSA" value={gyn.ivsa} editing={editing} onChange={(value) => setForm((prev) => ({ ...prev, gynecological: { ...prev.gynecological, ivsa: value } }))} /></Grid>
          <Grid size={{ xs: 12, md: 4 }}><Field label="Parejas sexuales" value={gyn.sexual_partners} editing={editing} onChange={(value) => setForm((prev) => ({ ...prev, gynecological: { ...prev.gynecological, sexual_partners: value } }))} /></Grid>
          <Grid size={{ xs: 12 }}><CheckField label="ETS" checked={gyn.std_checked} value={gyn.std} editing={editing} onCheckedChange={(value) => setForm((prev) => ({ ...prev, gynecological: { ...prev.gynecological, std_checked: value } }))} onValueChange={(value) => setForm((prev) => ({ ...prev, gynecological: { ...prev.gynecological, std: value } }))} /></Grid>
          <Grid size={{ xs: 12, md: 6 }}><Field label="Citología" value={gyn.cytology} editing={editing} onChange={(value) => setForm((prev) => ({ ...prev, gynecological: { ...prev.gynecological, cytology: value } }))} /></Grid>
          <Grid size={{ xs: 12 }}><Field label="Método de planificación familiar" value={gyn.family_planning} editing={editing} multiline onChange={(value) => setForm((prev) => ({ ...prev, gynecological: { ...prev.gynecological, family_planning: value } }))} /></Grid>
          <Grid size={{ xs: 12, md: 4 }}><Field label="Gestaciones" value={gyn.gestations} editing={editing} onChange={(value) => setForm((prev) => ({ ...prev, gynecological: { ...prev.gynecological, gestations: value } }))} /></Grid>
          <Grid size={{ xs: 12, md: 4 }}><Field label="Fecha de última gestación" value={gyn.last_gestation_date} editing={editing} onChange={(value) => setForm((prev) => ({ ...prev, gynecological: { ...prev.gynecological, last_gestation_date: value } }))} /></Grid>
          <Grid size={{ xs: 12, md: 4 }}><Field label="Partos" value={gyn.deliveries} editing={editing} onChange={(value) => setForm((prev) => ({ ...prev, gynecological: { ...prev.gynecological, deliveries: value } }))} /></Grid>
          <Grid size={{ xs: 12, md: 4 }}><Field label="Cesáreas" value={gyn.cesareans} editing={editing} onChange={(value) => setForm((prev) => ({ ...prev, gynecological: { ...prev.gynecological, cesareans: value } }))} /></Grid>
          <Grid size={{ xs: 12, md: 4 }}><Field label="Abortos" value={gyn.abortions} editing={editing} onChange={(value) => setForm((prev) => ({ ...prev, gynecological: { ...prev.gynecological, abortions: value } }))} /></Grid>
          <Grid size={{ xs: 12, md: 4 }}><Field label="Ectópico" value={gyn.ectopic} editing={editing} onChange={(value) => setForm((prev) => ({ ...prev, gynecological: { ...prev.gynecological, ectopic: value } }))} /></Grid>
          <Grid size={{ xs: 12, md: 4 }}><Field label="Molar" value={gyn.molar} editing={editing} onChange={(value) => setForm((prev) => ({ ...prev, gynecological: { ...prev.gynecological, molar: value } }))} /></Grid>
          <Grid size={{ xs: 12, md: 4 }}><Field label="Edad en la que dejó de reglar" value={gyn.menopause_age} editing={editing} onChange={(value) => setForm((prev) => ({ ...prev, gynecological: { ...prev.gynecological, menopause_age: value } }))} /></Grid>
          <Grid size={{ xs: 12 }}><CheckField label="Síntomas de climaterio" checked={gyn.climacteric_symptoms_checked} value={gyn.climacteric_symptoms} editing={editing} onCheckedChange={(value) => setForm((prev) => ({ ...prev, gynecological: { ...prev.gynecological, climacteric_symptoms_checked: value } }))} onValueChange={(value) => setForm((prev) => ({ ...prev, gynecological: { ...prev.gynecological, climacteric_symptoms: value } }))} /></Grid>
          <Grid size={{ xs: 12 }}><CheckField label="Control prenatal" checked={gyn.prenatal_care_checked} value={gyn.prenatal_care} editing={editing} onCheckedChange={(value) => setForm((prev) => ({ ...prev, gynecological: { ...prev.gynecological, prenatal_care_checked: value } }))} onValueChange={(value) => setForm((prev) => ({ ...prev, gynecological: { ...prev.gynecological, prenatal_care: value } }))} /></Grid>
        </Grid>
      </SectionCard>

      <Snackbar open={Boolean(message)} autoHideDuration={3000} onClose={() => setMessage(null)} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert onClose={() => setMessage(null)} severity="success" sx={{ width: '100%' }}>{message}</Alert>
      </Snackbar>
      <Snackbar open={Boolean(error)} autoHideDuration={3000} onClose={() => setError(null)} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert onClose={() => setError(null)} severity="error" sx={{ width: '100%' }}>{error}</Alert>
      </Snackbar>
    </Box>
  );
}

export default memo(ClinicalHistoryTabInner);
