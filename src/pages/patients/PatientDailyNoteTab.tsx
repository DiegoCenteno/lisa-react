import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  CircularProgress,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  IconButton,
  Paper,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  Cancel as CancelIcon,
  ExpandLess as ExpandLessIcon,
  ExpandMore as ExpandMoreIcon,
  Lock as LockIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import { consultationService } from '../../api/consultationService';
import { patientService } from '../../api/patientService';
import type { ClinicalHistory, MedicamentHistoryItem, OfficeLabelItem, Patient, PatientSoapContext, PatientTagControlData, SOAPNote } from '../../types';
import { formatDisplayDate } from '../../utils/date';

type RefreshPayload = {
  patient: Patient;
  soapNotes: SOAPNote[];
};

type Props = {
  patient: Patient;
  canCreateDailyNote: boolean;
  canEditConsultationHistory: boolean;
  editRequestNote: SOAPNote | null;
  onEditRequestHandled: () => void;
  onRefreshAfterSave: (payload: RefreshPayload) => void;
  onOpenColposcopy: () => void;
};

type SubjectiveFormData = { illnessStartDate: string; currentCondition: string };
type ObjectiveFormData = { height: string; weight: string; ta: string; temp: string; fc: string; os: string; studies: string; lastMenstruationDate: string; pregnant: boolean };
type AnalysisFormData = { examination: string; diagnostics: string[] };
type PlanFormData = { medications: Array<{ medicament: string; prescription: string }>; additionalInstructions: string };

type DraftData = {
  subjectiveForm: SubjectiveFormData;
  objectiveForm: ObjectiveFormData;
  analysisForm: AnalysisFormData;
  planForm: PlanFormData;
  personalNotes: string;
  selectedOfficeLabels: number[];
  editingConsultationId: number | null;
  savedAt: number;
};

function normalizeDateInputValue(value?: string | null): string {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const match = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (match) {
    const [, day, month, year] = match;
    return `${year}-${month}-${day}`;
  }
  return raw;
}

function getDraftKey(patientId: number): string {
  return `soap-draft-${patientId}`;
}

function loadDraft(patientId: number): DraftData | null {
  try {
    const raw = localStorage.getItem(getDraftKey(patientId));
    if (!raw) return null;
    const draft = JSON.parse(raw) as DraftData;
    const oneDay = 24 * 60 * 60 * 1000;
    if (Date.now() - draft.savedAt > oneDay) {
      localStorage.removeItem(getDraftKey(patientId));
      return null;
    }
    return draft;
  } catch {
    return null;
  }
}

function saveDraft(patientId: number, data: Omit<DraftData, 'savedAt'>): void {
  try {
    localStorage.setItem(getDraftKey(patientId), JSON.stringify({ ...data, savedAt: Date.now() }));
  } catch {
    // localStorage full or unavailable
  }
}

function clearDraft(patientId: number): void {
  try {
    localStorage.removeItem(getDraftKey(patientId));
  } catch {
    // ignore
  }
}

function SoapSectionTitle({
  initial,
  title,
}: {
  initial: string;
  title: string;
}) {
  const remainder = title.startsWith(initial) ? title.slice(1) : title;

  return (
    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 2 }}>
      <Typography
        component="span"
        sx={{
          color: '#177b26',
          fontWeight: 800,
          fontSize: { xs: '2rem', md: '2.5rem' },
          lineHeight: 1,
        }}
      >
        {initial}
      </Typography>
      <Typography
        variant="h6"
        sx={{
          color: '#177b26',
          fontWeight: 700,
        }}
      >
        {remainder}
      </Typography>
    </Box>
  );
}

// --- Memoized sub-components ---

const SubjectiveSection = memo(function SubjectiveSection({
  form, onChange,
}: {
  form: SubjectiveFormData;
  onChange: (next: SubjectiveFormData) => void;
}) {
  return (
    <Card><CardContent>
      <SoapSectionTitle initial="S" title="Subjetivo" />
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>Fecha de inicio del padecimiento</Typography>
          <TextField type="date" fullWidth size="small" value={form.illnessStartDate} onChange={(e) => onChange({ ...form, illnessStartDate: e.target.value })} InputLabelProps={{ shrink: true }} />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>Motivo de consulta</Typography>
          <TextField multiline minRows={4} fullWidth value={form.currentCondition} onChange={(e) => onChange({ ...form, currentCondition: e.target.value })} />
        </Grid>
      </Grid>
    </CardContent></Card>
  );
});

const ObjectiveSection = memo(function ObjectiveSection({
  form, onChange,
}: {
  form: ObjectiveFormData;
  onChange: (next: ObjectiveFormData) => void;
}) {
  return (
    <Card><CardContent>
      <SoapSectionTitle initial="O" title="Objetivo" />
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 4 }}><TextField fullWidth size="small" label="Estatura" value={form.height} onChange={(e) => onChange({ ...form, height: e.target.value })} /></Grid>
        <Grid size={{ xs: 12, md: 4 }}><TextField fullWidth size="small" label="Peso" value={form.weight} onChange={(e) => onChange({ ...form, weight: e.target.value })} /></Grid>
        <Grid size={{ xs: 12, md: 4 }}><TextField fullWidth size="small" label="T. A." value={form.ta} onChange={(e) => onChange({ ...form, ta: e.target.value })} /></Grid>
        <Grid size={{ xs: 12, md: 4 }}><TextField fullWidth size="small" label={`Temp (\u00b0C)`} value={form.temp} onChange={(e) => onChange({ ...form, temp: e.target.value })} /></Grid>
        <Grid size={{ xs: 12, md: 4 }}><TextField fullWidth size="small" label="F.C." value={form.fc} onChange={(e) => onChange({ ...form, fc: e.target.value })} /></Grid>
        <Grid size={{ xs: 12, md: 4 }}><TextField fullWidth size="small" label="O2 (%)" value={form.os} onChange={(e) => onChange({ ...form, os: e.target.value })} /></Grid>
        <Grid size={{ xs: 12 }}><TextField multiline minRows={3} fullWidth label={`Exploraci\u00f3n f\u00edsica`} value={form.studies} onChange={(e) => onChange({ ...form, studies: e.target.value })} /></Grid>
        <Grid size={{ xs: 12, md: 6 }}><TextField type="date" fullWidth size="small" label={`Fecha de \u00faltima menstruaci\u00f3n`} value={form.lastMenstruationDate} onChange={(e) => onChange({ ...form, lastMenstruationDate: e.target.value })} InputLabelProps={{ shrink: true }} /></Grid>
        <Grid size={{ xs: 12 }}><FormControlLabel control={<Checkbox checked={form.pregnant} onChange={(e) => onChange({ ...form, pregnant: e.target.checked })} />} label="Embarazada" /></Grid>
      </Grid>
    </CardContent></Card>
  );
});

const AnalysisSection = memo(function AnalysisSection({
  form, onChange,
}: {
  form: AnalysisFormData;
  onChange: (next: AnalysisFormData) => void;
}) {
  return (
    <Card><CardContent>
      <SoapSectionTitle initial="A" title="Análisis" />
      <Grid container spacing={2}>
        <Grid size={{ xs: 12 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <LockIcon sx={{ color: '#ff0000', fontSize: 20 }} />
            <Typography variant="body2" sx={{ fontWeight: 600 }}>{`An\u00e1lisis`}</Typography>
          </Box>
          <TextField fullWidth size="small" value={form.examination} onChange={(e) => onChange({ ...form, examination: e.target.value })} />
        </Grid>
        {form.diagnostics.map((diagnostic, index) => (
          <Grid key={`diagnostic-${index}`} size={{ xs: 12 }}>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <TextField fullWidth size="small" label={`Diagn\u00f3stico ${index + 1}`} value={diagnostic} onChange={(e) => onChange({ ...form, diagnostics: form.diagnostics.map((item, i) => i === index ? e.target.value : item) })} />
              {index === 0 ? (
                <IconButton color="primary" onClick={() => onChange({ ...form, diagnostics: form.diagnostics.length >= 5 ? form.diagnostics : [...form.diagnostics, ''] })}><AddIcon /></IconButton>
              ) : (
                <IconButton color="error" onClick={() => onChange({ ...form, diagnostics: form.diagnostics.filter((_, i) => i !== index) })}><CancelIcon /></IconButton>
              )}
            </Box>
          </Grid>
        ))}
      </Grid>
    </CardContent></Card>
  );
});

const PlanSection = memo(function PlanSection({
  form, onChange, medicamentHistory, onOpenColposcopy, onOpenPrescription,
}: {
  form: PlanFormData;
  onChange: (next: PlanFormData) => void;
  medicamentHistory: MedicamentHistoryItem[];
  onOpenColposcopy: () => void;
  onOpenPrescription: () => void;
}) {
  const [showHistory, setShowHistory] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return medicamentHistory;
    return medicamentHistory.filter((item) => item.title.toLowerCase().includes(q));
  }, [medicamentHistory, search]);

  const paginated = useMemo(
    () => filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [filtered, page, rowsPerPage]
  );

  return (
    <Card><CardContent>
      <SoapSectionTitle initial="P" title="Plan" />
      <Button variant="text" onClick={() => setShowHistory((c) => !c)} endIcon={showHistory ? <ExpandLessIcon /> : <ExpandMoreIcon />} sx={{ color: '#E53935', textTransform: 'none', px: 0, mb: 2 }}>
        {`Enlista el hist\u00f3rico de tus medicamentos`}
      </Button>
      <Collapse in={showHistory}>
        <Box sx={{ mb: 3 }}>
          <TextField fullWidth size="small" label="Buscar medicamentos" value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} sx={{ mb: 2 }} />
          <TableContainer component={Paper} variant="outlined">
            <Table size="small"><TableBody>
              {paginated.map((item) => <TableRow key={item.title}><TableCell>{item.title}</TableCell></TableRow>)}
              {paginated.length === 0 && <TableRow><TableCell>No se encontraron medicamentos</TableCell></TableRow>}
            </TableBody></Table>
          </TableContainer>
          <TablePagination component="div" count={filtered.length} page={page} onPageChange={(_, p) => setPage(p)} rowsPerPage={rowsPerPage} onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }} rowsPerPageOptions={[5, 10, 20]} labelRowsPerPage="Filas" />
        </Box>
      </Collapse>

      <Grid container spacing={2}>
        {form.medications.map((row, index) => (
          <Grid key={`medication-${index}`} size={{ xs: 12 }}>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <TextField fullWidth size="small" label={`Medicamento ${index + 1}`} value={row.medicament} onChange={(e) => onChange({ ...form, medications: form.medications.map((item, i) => i === index ? { ...item, medicament: e.target.value } : item) })} />
              {index === 0 ? (
                <IconButton color="primary" onClick={() => onChange({ ...form, medications: form.medications.length >= 6 ? form.medications : [...form.medications, { medicament: '', prescription: '' }] })}><AddIcon /></IconButton>
              ) : (
                <IconButton color="error" onClick={() => onChange({ ...form, medications: form.medications.filter((_, i) => i !== index) })}><CancelIcon /></IconButton>
              )}
            </Box>
            <TextField fullWidth size="small" label={`Prescripci\u00f3n`} value={row.prescription} onChange={(e) => onChange({ ...form, medications: form.medications.map((item, i) => i === index ? { ...item, prescription: e.target.value } : item) })} sx={{ mt: 1 }} />
          </Grid>
        ))}
        <Grid size={{ xs: 12 }}><TextField multiline minRows={2} fullWidth label="Indicaciones adicionales" value={form.additionalInstructions} onChange={(e) => onChange({ ...form, additionalInstructions: e.target.value })} /></Grid>
        <Grid size={{ xs: 12 }}>
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mt: 0.5 }}>
            <Button
              variant="contained"
              onClick={onOpenColposcopy}
              sx={{
                backgroundColor: '#16b8d4',
                '&:hover': { backgroundColor: '#1099b1' },
              }}
            >
              Colposcopia
            </Button>
            <Button
              variant="contained"
              onClick={onOpenPrescription}
              sx={{
                backgroundColor: '#16b8d4',
                '&:hover': { backgroundColor: '#1099b1' },
              }}
            >
              Receta
            </Button>
          </Box>
        </Grid>
      </Grid>
    </CardContent></Card>
  );
});

const PersonalNotesSection = memo(function PersonalNotesSection({
  notes, onNotesChange, selectedLabels, onLabelsChange, officeLabels, patientTagControl,
}: {
  notes: string;
  onNotesChange: (next: string) => void;
  selectedLabels: number[];
  onLabelsChange: (next: number[]) => void;
  officeLabels: OfficeLabelItem[];
  patientTagControl: PatientTagControlData | null;
}) {
  return (
    <Card><CardContent>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <LockIcon sx={{ color: '#ff0000', fontSize: 20 }} />
            <Typography variant="body2" sx={{ fontWeight: 600 }}>Anotaciones personales</Typography>
          </Box>
          <TextField multiline minRows={3} fullWidth value={notes} onChange={(e) => onNotesChange(e.target.value)} helperText="Tus notas en este campo son privadas" />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>Etiquetas</Typography>
          {patientTagControl && patientTagControl.statuses.length === 0 ? <Alert severity="warning" sx={{ mb: 1.5 }}>{`A\u00fan no hay estados configurados para las etiquetas.`}</Alert> : null}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }, gap: 1.5 }}>
            {officeLabels.map((label) => (
              <FormControlLabel
                key={label.id}
                control={<Checkbox checked={selectedLabels.includes(label.id)} onChange={() => onLabelsChange(selectedLabels.includes(label.id) ? selectedLabels.filter((id) => id !== label.id) : [...selectedLabels, label.id])} />}
                label={label.code?.trim() || label.identify?.trim() || `Etiqueta ${label.id}`}
              />
            ))}
          </Box>
        </Grid>
      </Grid>
    </CardContent></Card>
  );
});

// --- Main component ---

function PatientDailyNoteTab({
  patient,
  canCreateDailyNote,
  canEditConsultationHistory,
  editRequestNote,
  onEditRequestHandled,
  onRefreshAfterSave,
  onOpenColposcopy,
}: Props) {
  const [clinicalHistory, setClinicalHistory] = useState<ClinicalHistory | null>(null);
  const [soapContext, setSoapContext] = useState<PatientSoapContext | null>(null);
  const [medicamentHistory, setMedicamentHistory] = useState<MedicamentHistoryItem[]>([]);
  const [officeLabels, setOfficeLabels] = useState<OfficeLabelItem[]>([]);
  const [patientTagControl, setPatientTagControl] = useState<PatientTagControlData | null>(null);
  const [tabLoading, setTabLoading] = useState(true);
  const [subjectiveForm, setSubjectiveForm] = useState<SubjectiveFormData>({ illnessStartDate: '', currentCondition: '' });
  const [objectiveForm, setObjectiveForm] = useState<ObjectiveFormData>({ height: '', weight: '', ta: '', temp: '', fc: '', os: '', studies: '', lastMenstruationDate: '', pregnant: false });
  const [analysisForm, setAnalysisForm] = useState<AnalysisFormData>({ examination: '', diagnostics: [''] });
  const [planForm, setPlanForm] = useState<PlanFormData>({ medications: [{ medicament: '', prescription: '' }], additionalInstructions: '' });
  const [personalNotes, setPersonalNotes] = useState('');
  const [selectedOfficeLabels, setSelectedOfficeLabels] = useState<number[]>([]);
  const [savingDailyNote, setSavingDailyNote] = useState(false);
  const [dailyNoteMessage, setDailyNoteMessage] = useState<string | null>(null);
  const [dailyNoteError, setDailyNoteError] = useState<string | null>(null);
  const [prescriptionFormatOpen, setPrescriptionFormatOpen] = useState(false);
  const [editingConsultation, setEditingConsultation] = useState<SOAPNote | null>(null);
  const draftRestoredRef = useRef(false);

  const lastConsultation = soapContext?.last_consultation ?? null;
  const lastConsultationDateLabel = lastConsultation?.created_at ? formatDisplayDate(lastConsultation.created_at) : null;

  useEffect(() => {
    let cancelled = false;

    const loadTabData = async () => {
      setTabLoading(true);
      try {
        const [historyData, soapContextData, medicamentHistoryData, officeLabelsData, tagControlData] = await Promise.all([
          patientService.getClinicalHistory(patient.id),
          patientService.getPatientSoapContext(patient.id),
          patientService.getMedicamentHistory(),
          patientService.getOfficeLabels(),
          patientService.getPatientTagControl(patient.id),
        ]);

        if (cancelled) return;

        setClinicalHistory(historyData);
        setSoapContext(soapContextData);
        setMedicamentHistory(medicamentHistoryData);
        setOfficeLabels(officeLabelsData);
        setPatientTagControl(tagControlData);
      } catch (error) {
        if (cancelled) return;
        console.error('Error cargando datos de nota diaria:', error);
        setDailyNoteError('No se pudo cargar la información de nota diaria.');
      } finally {
        if (!cancelled) {
          setTabLoading(false);
        }
      }
    };

    loadTabData();

    return () => {
      cancelled = true;
    };
  }, [patient.id]);

  // Restore draft from localStorage on mount
  useEffect(() => {
    if (draftRestoredRef.current) return;
    draftRestoredRef.current = true;
    const draft = loadDraft(patient.id);
    if (!draft) return;
    setSubjectiveForm(draft.subjectiveForm);
    setObjectiveForm(draft.objectiveForm);
    setAnalysisForm(draft.analysisForm);
    setPlanForm(draft.planForm);
    setPersonalNotes(draft.personalNotes);
    setSelectedOfficeLabels(draft.selectedOfficeLabels);
  }, [patient.id]);

  // Save draft to localStorage on changes (debounced)
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!draftRestoredRef.current) return;
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    draftTimerRef.current = setTimeout(() => {
      saveDraft(patient.id, {
        subjectiveForm,
        objectiveForm,
        analysisForm,
        planForm,
        personalNotes,
        selectedOfficeLabels,
        editingConsultationId: editingConsultation?.consultation_id ?? null,
      });
    }, 500);
    return () => {
      if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    };
  }, [patient.id, subjectiveForm, objectiveForm, analysisForm, planForm, personalNotes, selectedOfficeLabels, editingConsultation]);

  useEffect(() => {
    if (tabLoading) return;
    setSelectedOfficeLabels((current) => (current.length > 0 ? current : officeLabels.slice(0, 1).map((label) => label.id)));
  }, [officeLabels, tabLoading]);

  useEffect(() => {
    setObjectiveForm((current) => ({
      ...current,
      lastMenstruationDate: current.lastMenstruationDate || normalizeDateInputValue(clinicalHistory?.gynecological?.last_menstruation_date) || '',
      pregnant: current.pregnant || Boolean(clinicalHistory?.gynecological?.pregnant),
    }));
  }, [clinicalHistory]);

  useEffect(() => {
    if (!editRequestNote) return;
    if (!canEditConsultationHistory) {
      setDailyNoteError('Tu perfil no tiene permiso para editar consultas del historial.');
      onEditRequestHandled();
      return;
    }
    setEditingConsultation(editRequestNote);
    setSubjectiveForm({ illnessStartDate: normalizeDateInputValue(editRequestNote.ailingdate) || '', currentCondition: editRequestNote.subjective ?? '' });
    setObjectiveForm({
      height: editRequestNote.height ?? '',
      weight: editRequestNote.weight ?? '',
      ta: editRequestNote.ta ?? '',
      temp: editRequestNote.temp ?? '',
      fc: editRequestNote.fc ?? '',
      os: editRequestNote.os ?? '',
      studies: editRequestNote.studies ?? editRequestNote.objective ?? '',
      lastMenstruationDate: normalizeDateInputValue(clinicalHistory?.gynecological?.last_menstruation_date) || '',
      pregnant: Boolean(clinicalHistory?.gynecological?.pregnant),
    });
    setAnalysisForm({ examination: editRequestNote.examination ?? '', diagnostics: editRequestNote.diagnostics?.length ? editRequestNote.diagnostics : [''] });
    setPlanForm({ medications: editRequestNote.medications?.length ? editRequestNote.medications : [{ medicament: '', prescription: '' }], additionalInstructions: editRequestNote.indicaciones ?? '' });
    setPersonalNotes(editRequestNote.private_comments ?? '');
    setSelectedOfficeLabels(editRequestNote.office_label_ids ?? []);
    onEditRequestHandled();
  }, [canEditConsultationHistory, clinicalHistory, editRequestNote, onEditRequestHandled]);

  const handleSaveDailyNote = async () => {
    if (!editingConsultation && !canCreateDailyNote) {
      setDailyNoteError('Tu perfil no tiene permiso para crear una nota diaria.');
      return;
    }
    if (editingConsultation && !canEditConsultationHistory) {
      setDailyNoteError('Tu perfil no tiene permiso para editar consultas del historial.');
      return;
    }
    setSavingDailyNote(true);
    setDailyNoteError(null);
    try {
      const payload = {
        patient_id: patient.id,
        currentcondition: subjectiveForm.currentCondition.trim() || undefined,
        ailingdate: normalizeDateInputValue(subjectiveForm.illnessStartDate) || undefined,
        height: objectiveForm.height.trim() || undefined,
        weight: objectiveForm.weight.trim() || undefined,
        ta: objectiveForm.ta.trim() || undefined,
        temp: objectiveForm.temp.trim() || undefined,
        fc: objectiveForm.fc.trim() || undefined,
        os: objectiveForm.os.trim() || undefined,
        studies: objectiveForm.studies.trim() || undefined,
        furupdate: normalizeDateInputValue(objectiveForm.lastMenstruationDate) || undefined,
        embarazadaupdate: objectiveForm.pregnant,
        examination: analysisForm.examination.trim() || undefined,
        diagnostics: analysisForm.diagnostics.map((value) => value.trim()).filter(Boolean),
        medications: planForm.medications.map((row) => ({ medicament: row.medicament.trim(), prescription: row.prescription.trim() })).filter((row) => row.medicament || row.prescription),
        indicaciones: planForm.additionalInstructions.trim() || undefined,
        notes: personalNotes.trim() || undefined,
        office_label_ids: selectedOfficeLabels,
      };
      if (editingConsultation?.consultation_id) {
        await consultationService.updateDailyNote(editingConsultation.consultation_id, payload);
      } else {
        await consultationService.createDailyNote(payload);
      }
      const [nextPatient, nextClinicalHistory, nextSoapContext, nextSoapNotes] = await Promise.all([
        patientService.getPatient(patient.id),
        patientService.getClinicalHistory(patient.id),
        patientService.getPatientSoapContext(patient.id),
        patientService.getSOAPNotes(patient.id),
      ]);
      setClinicalHistory(nextClinicalHistory);
      setSoapContext(nextSoapContext);
      setPatientTagControl(await patientService.getPatientTagControl(patient.id));
      onRefreshAfterSave({ patient: nextPatient, soapNotes: nextSoapNotes });
      setEditingConsultation(null);
      clearDraft(patient.id);
      setDailyNoteMessage(editingConsultation?.consultation_id ? 'Consulta actualizada' : 'Nota diaria guardada');
      // Reset form after successful save
      setSubjectiveForm({ illnessStartDate: '', currentCondition: '' });
      setObjectiveForm({ height: '', weight: '', ta: '', temp: '', fc: '', os: '', studies: '', lastMenstruationDate: normalizeDateInputValue(clinicalHistory?.gynecological?.last_menstruation_date) || '', pregnant: Boolean(clinicalHistory?.gynecological?.pregnant) });
      setAnalysisForm({ examination: '', diagnostics: [''] });
      setPlanForm({ medications: [{ medicament: '', prescription: '' }], additionalInstructions: '' });
      setPersonalNotes('');
      setSelectedOfficeLabels(officeLabels.slice(0, 1).map((label) => label.id));
    } catch (error) {
      console.error('Error guardando nota diaria:', error);
      setDailyNoteError(editingConsultation?.consultation_id ? 'No se pudo actualizar la consulta' : 'No se pudo guardar la nota diaria');
    } finally {
      setSavingDailyNote(false);
    }
  };

  const handleStartNewConsultation = () => {
    if (!canCreateDailyNote) {
      setDailyNoteError('Tu perfil no tiene permiso para crear una nota diaria.');
      return;
    }
    setEditingConsultation(null);
    setSubjectiveForm({ illnessStartDate: '', currentCondition: '' });
    setObjectiveForm({ height: '', weight: '', ta: '', temp: '', fc: '', os: '', studies: '', lastMenstruationDate: normalizeDateInputValue(clinicalHistory?.gynecological?.last_menstruation_date) || '', pregnant: Boolean(clinicalHistory?.gynecological?.pregnant) });
    setAnalysisForm({ examination: '', diagnostics: [''] });
    setPlanForm({ medications: [{ medicament: '', prescription: '' }], additionalInstructions: '' });
    setPersonalNotes('');
    setSelectedOfficeLabels(officeLabels.slice(0, 1).map((label) => label.id));
    clearDraft(patient.id);
  };

  const handleSubjectiveChange = useCallback((next: SubjectiveFormData) => setSubjectiveForm(next), []);
  const handleObjectiveChange = useCallback((next: ObjectiveFormData) => setObjectiveForm(next), []);
  const handleAnalysisChange = useCallback((next: AnalysisFormData) => setAnalysisForm(next), []);
  const handlePlanChange = useCallback((next: PlanFormData) => setPlanForm(next), []);
  const handleNotesChange = useCallback((next: string) => setPersonalNotes(next), []);
  const handleLabelsChange = useCallback((next: number[]) => setSelectedOfficeLabels(next), []);
  const buildPrescriptionPayload = useCallback(() => ({
    patient_id: patient.id,
    height: objectiveForm.height.trim() || undefined,
    weight: objectiveForm.weight.trim() || undefined,
    ta: objectiveForm.ta.trim() || undefined,
    temp: objectiveForm.temp.trim() || undefined,
    fc: objectiveForm.fc.trim() || undefined,
    os: objectiveForm.os.trim() || undefined,
    diagnostics: analysisForm.diagnostics.map((value) => value.trim()).filter(Boolean),
    medications: planForm.medications
      .map((row) => ({
        medicament: row.medicament.trim(),
        prescription: row.prescription.trim(),
      }))
      .filter((row) => row.medicament || row.prescription),
    indicaciones: planForm.additionalInstructions.trim() || undefined,
  }), [
    analysisForm.diagnostics,
    objectiveForm.fc,
    objectiveForm.height,
    objectiveForm.os,
    objectiveForm.ta,
    objectiveForm.temp,
    objectiveForm.weight,
    patient.id,
    planForm.additionalInstructions,
    planForm.medications,
  ]);

  const downloadPrescriptionBlob = useCallback((blob: Blob, extension: 'docx' | 'pdf') => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeName = `${patient.name}_${patient.last_name}`.replace(/[^A-Za-z0-9_-]/g, '_');
    link.href = url;
    link.download = `${safeName || 'Receta'}.${extension}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }, [patient.last_name, patient.name]);

  const handleDownloadPrescriptionWord = useCallback(async () => {
    try {
      setDailyNoteError(null);
      const blob = await consultationService.downloadPrescription(buildPrescriptionPayload());
      downloadPrescriptionBlob(blob, 'docx');
    } catch (error) {
      console.error('Error descargando receta:', error);
      setDailyNoteError('No se pudo descargar la receta.');
    }
  }, [buildPrescriptionPayload, downloadPrescriptionBlob]);

  const handleDownloadPrescriptionPdf = useCallback(async () => {
    try {
      setDailyNoteError(null);
      const blob = await consultationService.downloadPrescriptionPdf(buildPrescriptionPayload());
      downloadPrescriptionBlob(blob, 'pdf');
    } catch (error) {
      console.error('Error descargando receta en PDF:', error);
      setDailyNoteError('No se pudo descargar la receta en PDF.');
    }
  }, [buildPrescriptionPayload, downloadPrescriptionBlob]);

  const handleOpenPrescription = useCallback(() => {
    setPrescriptionFormatOpen(true);
  }, []);

  const handleSelectPrescriptionWord = useCallback(async () => {
    setPrescriptionFormatOpen(false);
    await handleDownloadPrescriptionWord();
  }, [handleDownloadPrescriptionWord]);

  const handleSelectPrescriptionPdf = useCallback(async () => {
    setPrescriptionFormatOpen(false);
    await handleDownloadPrescriptionPdf();
  }, [handleDownloadPrescriptionPdf]);

  if (tabLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, bgcolor: '#cbf7cb', p: 2, borderRadius: 2 }}>
        {editingConsultation && (
          <Alert severity="info" action={canCreateDailyNote ? <Button color="inherit" size="small" onClick={handleStartNewConsultation}>Nueva consulta</Button> : undefined}>
            Editando la consulta del {formatDisplayDate(editingConsultation.created_at)}
          </Alert>
        )}

        <Typography variant="body2" sx={{ color: '#2f2f2f' }}>
          {lastConsultationDateLabel ? `\u00daltima consulta: ${lastConsultationDateLabel}` : '\u00daltima consulta: Sin consultas previas'}
        </Typography>

        <SubjectiveSection form={subjectiveForm} onChange={handleSubjectiveChange} />
        <ObjectiveSection form={objectiveForm} onChange={handleObjectiveChange} />
        <AnalysisSection form={analysisForm} onChange={handleAnalysisChange} />
        <PlanSection
          form={planForm}
          onChange={handlePlanChange}
          medicamentHistory={medicamentHistory}
          onOpenColposcopy={onOpenColposcopy}
          onOpenPrescription={handleOpenPrescription}
        />
        <PersonalNotesSection
          notes={personalNotes}
          onNotesChange={handleNotesChange}
          selectedLabels={selectedOfficeLabels}
          onLabelsChange={handleLabelsChange}
          officeLabels={officeLabels}
          patientTagControl={patientTagControl}
        />

        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button variant="contained" color="primary" startIcon={savingDailyNote ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />} onClick={handleSaveDailyNote} disabled={savingDailyNote || (!editingConsultation && !canCreateDailyNote) || (Boolean(editingConsultation) && !canEditConsultationHistory)} sx={{ minWidth: 180 }}>
            {savingDailyNote ? 'Guardando...' : editingConsultation ? 'Actualizar consulta' : 'Guardar'}
          </Button>
        </Box>
      </Box>

      <Snackbar open={Boolean(dailyNoteMessage)} autoHideDuration={3000} onClose={() => setDailyNoteMessage(null)} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert onClose={() => setDailyNoteMessage(null)} severity="success" sx={{ width: '100%' }}>{dailyNoteMessage}</Alert>
      </Snackbar>
      <Snackbar open={Boolean(dailyNoteError)} autoHideDuration={3000} onClose={() => setDailyNoteError(null)} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert onClose={() => setDailyNoteError(null)} severity="error" sx={{ width: '100%' }}>{dailyNoteError}</Alert>
      </Snackbar>

      <Dialog
        open={prescriptionFormatOpen}
        onClose={() => setPrescriptionFormatOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Descargar receta</DialogTitle>
        <DialogContent dividers>
          <Typography>
            ¿En qué formato deseas descargar la receta?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPrescriptionFormatOpen(false)} color="inherit">
            Cancelar
          </Button>
          <Button onClick={() => void handleSelectPrescriptionPdf()}>
            PDF
          </Button>
          <Button variant="contained" onClick={() => void handleSelectPrescriptionWord()}>
            Word
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default memo(PatientDailyNoteTab);
