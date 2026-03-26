import { memo, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  CircularProgress,
  Collapse,
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
  clinicalHistory: ClinicalHistory | null;
  soapContext: PatientSoapContext | null;
  soapNotes: SOAPNote[];
};

type Props = {
  patient: Patient;
  clinicalHistory: ClinicalHistory | null;
  soapContext: PatientSoapContext | null;
  medicamentHistory: MedicamentHistoryItem[];
  officeLabels: OfficeLabelItem[];
  patientTagControl: PatientTagControlData | null;
  canCreateDailyNote: boolean;
  canEditConsultationHistory: boolean;
  editRequestNote: SOAPNote | null;
  onEditRequestHandled: () => void;
  onRefreshAfterSave: (payload: RefreshPayload) => void;
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

function PatientDailyNoteTab({
  patient,
  clinicalHistory,
  soapContext,
  medicamentHistory,
  officeLabels,
  patientTagControl,
  canCreateDailyNote,
  canEditConsultationHistory,
  editRequestNote,
  onEditRequestHandled,
  onRefreshAfterSave,
}: Props) {
  const [subjectiveForm, setSubjectiveForm] = useState({ illnessStartDate: '', currentCondition: '' });
  const [objectiveForm, setObjectiveForm] = useState({ height: '', weight: '', ta: '', temp: '', fc: '', os: '', studies: '', lastMenstruationDate: '', pregnant: false });
  const [analysisForm, setAnalysisForm] = useState({ examination: '', diagnostics: [''] });
  const [planForm, setPlanForm] = useState({ medications: [{ medicament: '', prescription: '' }], additionalInstructions: '' });
  const [personalNotes, setPersonalNotes] = useState('');
  const [selectedOfficeLabels, setSelectedOfficeLabels] = useState<number[]>([]);
  const [savingDailyNote, setSavingDailyNote] = useState(false);
  const [dailyNoteMessage, setDailyNoteMessage] = useState<string | null>(null);
  const [dailyNoteError, setDailyNoteError] = useState<string | null>(null);
  const [editingConsultation, setEditingConsultation] = useState<SOAPNote | null>(null);
  const [showMedicamentHistory, setShowMedicamentHistory] = useState(false);
  const [medicamentSearch, setMedicamentSearch] = useState('');
  const [medicamentHistoryPage, setMedicamentHistoryPage] = useState(0);
  const [medicamentHistoryRowsPerPage, setMedicamentHistoryRowsPerPage] = useState(5);

  const lastConsultation = soapContext?.last_consultation ?? null;
  const lastConsultationDateLabel = lastConsultation?.created_at ? formatDisplayDate(lastConsultation.created_at) : null;

  const filteredMedicamentHistory = useMemo(() => {
    const query = medicamentSearch.toLowerCase().trim();
    if (!query) return medicamentHistory;
    return medicamentHistory.filter((item) => item.title.toLowerCase().includes(query));
  }, [medicamentHistory, medicamentSearch]);

  const paginatedMedicamentHistory = useMemo(() => filteredMedicamentHistory.slice(medicamentHistoryPage * medicamentHistoryRowsPerPage, medicamentHistoryPage * medicamentHistoryRowsPerPage + medicamentHistoryRowsPerPage), [filteredMedicamentHistory, medicamentHistoryPage, medicamentHistoryRowsPerPage]);

  useEffect(() => {
    setSelectedOfficeLabels((current) => (current.length > 0 ? current : officeLabels.slice(0, 1).map((label) => label.id)));
  }, [officeLabels]);

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
      onRefreshAfterSave({ patient: nextPatient, clinicalHistory: nextClinicalHistory, soapContext: nextSoapContext, soapNotes: nextSoapNotes });
      setEditingConsultation(null);
      setDailyNoteMessage(editingConsultation?.consultation_id ? 'Consulta actualizada' : 'Nota diaria guardada');
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
  };

  return (
    <>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, bgcolor: '#cbf7cb', p: 2, borderRadius: 2 }}>
        {editingConsultation && (
          <Alert severity="info" action={canCreateDailyNote ? <Button color="inherit" size="small" onClick={handleStartNewConsultation}>Nueva consulta</Button> : undefined}>
            Editando la consulta del {formatDisplayDate(editingConsultation.created_at)}
          </Alert>
        )}

        <Typography variant="body2" sx={{ color: '#2f2f2f' }}>
          {lastConsultationDateLabel ? `Última consulta: ${lastConsultationDateLabel}` : 'Última consulta: Sin consultas previas'}
        </Typography>

        <Card><CardContent>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>Fecha de inicio del padecimiento</Typography>
              <TextField type="date" fullWidth size="small" value={subjectiveForm.illnessStartDate} onChange={(e) => setSubjectiveForm((current) => ({ ...current, illnessStartDate: e.target.value }))} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>Motivo de consulta</Typography>
              <TextField multiline minRows={4} fullWidth value={subjectiveForm.currentCondition} onChange={(e) => setSubjectiveForm((current) => ({ ...current, currentCondition: e.target.value }))} />
            </Grid>
          </Grid>
        </CardContent></Card>

        <Card><CardContent>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 4 }}><TextField fullWidth size="small" label="Estatura" value={objectiveForm.height} onChange={(e) => setObjectiveForm((current) => ({ ...current, height: e.target.value }))} /></Grid>
            <Grid size={{ xs: 12, md: 4 }}><TextField fullWidth size="small" label="Peso" value={objectiveForm.weight} onChange={(e) => setObjectiveForm((current) => ({ ...current, weight: e.target.value }))} /></Grid>
            <Grid size={{ xs: 12, md: 4 }}><TextField fullWidth size="small" label="T. A." value={objectiveForm.ta} onChange={(e) => setObjectiveForm((current) => ({ ...current, ta: e.target.value }))} /></Grid>
            <Grid size={{ xs: 12, md: 4 }}><TextField fullWidth size="small" label="Temp (°C)" value={objectiveForm.temp} onChange={(e) => setObjectiveForm((current) => ({ ...current, temp: e.target.value }))} /></Grid>
            <Grid size={{ xs: 12, md: 4 }}><TextField fullWidth size="small" label="F.C." value={objectiveForm.fc} onChange={(e) => setObjectiveForm((current) => ({ ...current, fc: e.target.value }))} /></Grid>
            <Grid size={{ xs: 12, md: 4 }}><TextField fullWidth size="small" label="O2 (%)" value={objectiveForm.os} onChange={(e) => setObjectiveForm((current) => ({ ...current, os: e.target.value }))} /></Grid>
            <Grid size={{ xs: 12 }}><TextField multiline minRows={3} fullWidth label="Exploración física" value={objectiveForm.studies} onChange={(e) => setObjectiveForm((current) => ({ ...current, studies: e.target.value }))} /></Grid>
            <Grid size={{ xs: 12, md: 6 }}><TextField type="date" fullWidth size="small" label="Fecha de última menstruación" value={objectiveForm.lastMenstruationDate} onChange={(e) => setObjectiveForm((current) => ({ ...current, lastMenstruationDate: e.target.value }))} InputLabelProps={{ shrink: true }} /></Grid>
            <Grid size={{ xs: 12 }}><FormControlLabel control={<Checkbox checked={objectiveForm.pregnant} onChange={(e) => setObjectiveForm((current) => ({ ...current, pregnant: e.target.checked }))} />} label="Embarazada" /></Grid>
          </Grid>
        </CardContent></Card>

        <Card><CardContent>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <LockIcon sx={{ color: '#ff0000', fontSize: 20 }} />
                <Typography variant="body2" sx={{ fontWeight: 600 }}>Análisis</Typography>
              </Box>
              <TextField fullWidth size="small" value={analysisForm.examination} onChange={(e) => setAnalysisForm((current) => ({ ...current, examination: e.target.value }))} />
            </Grid>
            {analysisForm.diagnostics.map((diagnostic, index) => (
              <Grid key={`diagnostic-${index}`} size={{ xs: 12 }}>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <TextField fullWidth size="small" label={`Diagnóstico ${index + 1}`} value={diagnostic} onChange={(e) => setAnalysisForm((current) => ({ ...current, diagnostics: current.diagnostics.map((item, itemIndex) => itemIndex === index ? e.target.value : item) }))} />
                  {index === 0 ? (
                    <IconButton color="primary" onClick={() => setAnalysisForm((current) => ({ ...current, diagnostics: current.diagnostics.length >= 5 ? current.diagnostics : [...current.diagnostics, ''] }))}><AddIcon /></IconButton>
                  ) : (
                    <IconButton color="error" onClick={() => setAnalysisForm((current) => ({ ...current, diagnostics: current.diagnostics.filter((_, itemIndex) => itemIndex !== index) || [''] }))}><CancelIcon /></IconButton>
                  )}
                </Box>
              </Grid>
            ))}
          </Grid>
        </CardContent></Card>

        <Card><CardContent>
          <Button variant="text" onClick={() => setShowMedicamentHistory((current) => !current)} endIcon={showMedicamentHistory ? <ExpandLessIcon /> : <ExpandMoreIcon />} sx={{ color: '#E53935', textTransform: 'none', px: 0, mb: 2 }}>
            Enlista el histórico de tus medicamentos
          </Button>
          <Collapse in={showMedicamentHistory}>
            <Box sx={{ mb: 3 }}>
              <TextField fullWidth size="small" label="Buscar medicamentos" value={medicamentSearch} onChange={(e) => { setMedicamentSearch(e.target.value); setMedicamentHistoryPage(0); }} sx={{ mb: 2 }} />
              <TableContainer component={Paper} variant="outlined">
                <Table size="small"><TableBody>
                  {paginatedMedicamentHistory.map((item) => <TableRow key={item.title}><TableCell>{item.title}</TableCell></TableRow>)}
                  {paginatedMedicamentHistory.length === 0 && <TableRow><TableCell>No se encontraron medicamentos</TableCell></TableRow>}
                </TableBody></Table>
              </TableContainer>
              <TablePagination component="div" count={filteredMedicamentHistory.length} page={medicamentHistoryPage} onPageChange={(_, page) => setMedicamentHistoryPage(page)} rowsPerPage={medicamentHistoryRowsPerPage} onRowsPerPageChange={(e) => { setMedicamentHistoryRowsPerPage(parseInt(e.target.value, 10)); setMedicamentHistoryPage(0); }} rowsPerPageOptions={[5, 10, 20]} labelRowsPerPage="Filas" />
            </Box>
          </Collapse>

          <Grid container spacing={2}>
            {planForm.medications.map((row, index) => (
              <Grid key={`medication-${index}`} size={{ xs: 12 }}>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <TextField fullWidth size="small" label={`Medicamento ${index + 1}`} value={row.medicament} onChange={(e) => setPlanForm((current) => ({ ...current, medications: current.medications.map((item, itemIndex) => itemIndex === index ? { ...item, medicament: e.target.value } : item) }))} />
                  {index === 0 ? (
                    <IconButton color="primary" onClick={() => setPlanForm((current) => ({ ...current, medications: current.medications.length >= 6 ? current.medications : [...current.medications, { medicament: '', prescription: '' }] }))}><AddIcon /></IconButton>
                  ) : (
                    <IconButton color="error" onClick={() => setPlanForm((current) => ({ ...current, medications: current.medications.filter((_, itemIndex) => itemIndex !== index) }))}><CancelIcon /></IconButton>
                  )}
                </Box>
                <TextField fullWidth size="small" label="Prescripción" value={row.prescription} onChange={(e) => setPlanForm((current) => ({ ...current, medications: current.medications.map((item, itemIndex) => itemIndex === index ? { ...item, prescription: e.target.value } : item) }))} sx={{ mt: 1 }} />
              </Grid>
            ))}
            <Grid size={{ xs: 12 }}><TextField multiline minRows={2} fullWidth label="Indicaciones adicionales" value={planForm.additionalInstructions} onChange={(e) => setPlanForm((current) => ({ ...current, additionalInstructions: e.target.value }))} /></Grid>
          </Grid>
        </CardContent></Card>

        <Card><CardContent>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <LockIcon sx={{ color: '#ff0000', fontSize: 20 }} />
                <Typography variant="body2" sx={{ fontWeight: 600 }}>Anotaciones personales</Typography>
              </Box>
              <TextField multiline minRows={3} fullWidth value={personalNotes} onChange={(e) => setPersonalNotes(e.target.value)} helperText="Tus notas en este campo son privadas" />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>Etiquetas</Typography>
              {patientTagControl && patientTagControl.statuses.length === 0 ? <Alert severity="warning" sx={{ mb: 1.5 }}>Aún no hay estados configurados para las etiquetas.</Alert> : null}
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }, gap: 1.5 }}>
                {officeLabels.map((label) => (
                  <FormControlLabel key={label.id} control={<Checkbox checked={selectedOfficeLabels.includes(label.id)} onChange={() => setSelectedOfficeLabels((current) => current.includes(label.id) ? current.filter((id) => id !== label.id) : [...current, label.id])} />} label={label.code?.trim() || label.identify?.trim() || `Etiqueta ${label.id}`} />
                ))}
              </Box>
            </Grid>
          </Grid>
        </CardContent></Card>

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
    </>
  );
}

export default memo(PatientDailyNoteTab);
