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
  History as HistoryIcon,
  Lock as LockIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import { consultationService } from '../../api/consultationService';
import { patientService } from '../../api/patientService';
import type { ClinicalHistory, MedicamentHistoryItem, OfficeLabelItem, Patient, PatientSoapContext, PatientTagControlData, SOAPNote } from '../../types';
import { formatDisplayDate } from '../../utils/date';
import ClickableDateField from '../../components/ClickableDateField';

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

function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function parseIsoDateOnly(value?: string | null): Date | null {
  const raw = normalizeDateInputValue(value);
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  if (
    date.getFullYear() !== Number(year)
    || date.getMonth() !== Number(month) - 1
    || date.getDate() !== Number(day)
  ) {
    return null;
  }
  return date;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function diffInDays(from: Date, to: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.floor((startOfDay(to).getTime() - startOfDay(from).getTime()) / msPerDay);
}

function capitalizeEs(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatSpanishDate(date: Date, withWeekday = false): string {
  const day = date.getDate();
  const month = capitalizeEs(date.toLocaleString('es-MX', { month: 'long' }));
  const year = date.getFullYear();

  if (!withWeekday) {
    return `${day} ${month} ${year}`;
  }

  const weekday = capitalizeEs(date.toLocaleString('es-MX', { weekday: 'long' }));
  return `${weekday}, ${day} ${month} ${year}`;
}

function buildPregnancySummary(lastMenstruationDate?: string | null): { fur: string; fpp: string; gestation: string } | null {
  const furDate = parseIsoDateOnly(lastMenstruationDate);
  if (!furDate) return null;

  const elapsedDays = diffInDays(furDate, new Date());
  if (elapsedDays < 0) return null;

  const weeks = Math.floor(elapsedDays / 7);
  const days = elapsedDays % 7;
  const fppDate = addDays(furDate, 280);

  return {
    fur: formatSpanishDate(furDate),
    fpp: formatSpanishDate(fppDate, true),
    gestation: `${weeks} semana${weeks === 1 ? '' : 's'} ${days} d${days === 1 ? 'ía' : 'ías'}`,
  };
}

function getSuggestedHeight(patientAge?: number | string | null, previousHeight?: string | null): string {
  const age = Number(patientAge ?? 0);
  const normalizedPreviousHeight = String(previousHeight ?? '').trim();
  if (age > 24 && normalizedPreviousHeight) {
    return normalizedPreviousHeight;
  }
  return '';
}

function formatHistoricalDate(value?: string | null): string {
  const raw = String(value ?? '').trim();
  if (!raw) return '';

  const datePortion = raw.includes('T')
    ? raw.split('T')[0]
    : raw.includes(' ')
      ? raw.split(' ')[0]
      : raw;
  const normalized = normalizeDateInputValue(datePortion);
  const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return formatDisplayDate(value);
  }

  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  if (Number.isNaN(date.getTime())) {
    return formatDisplayDate(value);
  }

  const monthName = date.toLocaleString('es-MX', { month: 'long' });
  return `${date.getDate()}/${monthName}/${date.getFullYear()}`;
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

function PreviousFieldHint({
  date,
  text,
  showDate = true,
  quoteText = true,
}: {
  date?: string | null;
  text?: string | null;
  showDate?: boolean;
  quoteText?: boolean;
}) {
  const formattedDate = formatHistoricalDate(date);
  const normalizedText = String(text ?? '').trim();

  if ((!showDate || !formattedDate) && !normalizedText) {
    return null;
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.75, mt: 0.75 }}>
      <HistoryIcon sx={{ fontSize: '0.9rem', color: '#5f6b76', mt: '1px', flexShrink: 0 }} />
      <Typography sx={{ fontSize: '0.8rem', color: '#5f6b76', whiteSpace: 'pre-line', lineHeight: 1.35 }}>
        {showDate
          ? (normalizedText ? `[${formattedDate}]: ${quoteText ? `"${normalizedText}"` : normalizedText}` : `[${formattedDate}]`)
          : normalizedText}
      </Typography>
    </Box>
  );
}

// --- Memoized sub-components ---

const SubjectiveSection = memo(function SubjectiveSection({
  form, formInstanceKey, onIllnessStartDateChange, onCurrentConditionChange, previousConsultation,
}: {
  form: SubjectiveFormData;
  formInstanceKey: number;
  onIllnessStartDateChange: (value: string) => void;
  onCurrentConditionChange: (value: string) => void;
  previousConsultation: PatientSoapContext['last_consultation'];
}) {
  return (
    <Card><CardContent>
      <SoapSectionTitle initial="S" title="Subjetivo" />
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <ClickableDateField
            label="Fecha de inicio del padecimiento"
            value={form.illnessStartDate}
            onChange={onIllnessStartDateChange}
          />
          {String(previousConsultation?.ailingdate ?? '').trim() ? (
            <PreviousFieldHint
              date={previousConsultation?.created_at}
              text={formatDisplayDate(previousConsultation?.ailingdate)}
              quoteText={false}
            />
          ) : null}
        </Grid>
        <Grid size={{ xs: 12 }}>
          <TextField
            key={`${formInstanceKey}-currentCondition`}
            label="Motivo de consulta"
            multiline
            minRows={4}
            fullWidth
            defaultValue={form.currentCondition}
            onChange={(e) => onCurrentConditionChange(e.target.value)}
          />
          {String(previousConsultation?.currentcondition ?? previousConsultation?.subjective ?? '').trim() ? (
            <PreviousFieldHint date={previousConsultation?.created_at} text={previousConsultation?.currentcondition ?? previousConsultation?.subjective} />
          ) : null}
        </Grid>
      </Grid>
    </CardContent></Card>
  );
});

const ObjectiveSection = memo(function ObjectiveSection({
  form, formInstanceKey, onPassiveFieldChange, onLastMenstruationDateChange, onPregnantChange, previousConsultation,
}: {
  form: ObjectiveFormData;
  formInstanceKey: number;
  onPassiveFieldChange: (field: 'height' | 'weight' | 'ta' | 'temp' | 'fc' | 'os' | 'studies', value: string) => void;
  onLastMenstruationDateChange: (value: string) => void;
  onPregnantChange: (value: boolean) => void;
  previousConsultation: PatientSoapContext['last_consultation'];
}) {
  const previousDate = previousConsultation?.created_at;
  const pregnancySummary = form.pregnant ? buildPregnancySummary(form.lastMenstruationDate) : null;
  return (
    <Card><CardContent>
      <SoapSectionTitle initial="O" title="Objetivo" />
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 4 }}>
          <TextField key={`${formInstanceKey}-height`} fullWidth size="small" label="Estatura" defaultValue={form.height} onChange={(e) => onPassiveFieldChange('height', e.target.value)} />
          <PreviousFieldHint text={previousConsultation?.height} showDate={false} />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <TextField key={`${formInstanceKey}-weight`} fullWidth size="small" label="Peso" defaultValue={form.weight} onChange={(e) => onPassiveFieldChange('weight', e.target.value)} />
          <PreviousFieldHint text={previousConsultation?.weight} showDate={false} />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <TextField key={`${formInstanceKey}-ta`} fullWidth size="small" label="T. A." defaultValue={form.ta} onChange={(e) => onPassiveFieldChange('ta', e.target.value)} />
          <PreviousFieldHint text={previousConsultation?.ta} showDate={false} />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <TextField key={`${formInstanceKey}-temp`} fullWidth size="small" label={`Temp (\u00b0C)`} defaultValue={form.temp} onChange={(e) => onPassiveFieldChange('temp', e.target.value)} />
          <PreviousFieldHint text={previousConsultation?.temp} showDate={false} />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <TextField key={`${formInstanceKey}-fc`} fullWidth size="small" label="F.C." defaultValue={form.fc} onChange={(e) => onPassiveFieldChange('fc', e.target.value)} />
          <PreviousFieldHint text={previousConsultation?.fc} showDate={false} />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <TextField key={`${formInstanceKey}-os`} fullWidth size="small" label="O2 (%)" defaultValue={form.os} onChange={(e) => onPassiveFieldChange('os', e.target.value)} />
          <PreviousFieldHint text={previousConsultation?.os} showDate={false} />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <TextField key={`${formInstanceKey}-studies`} multiline minRows={3} fullWidth label={`Exploraci\u00f3n f\u00edsica`} defaultValue={form.studies} onChange={(e) => onPassiveFieldChange('studies', e.target.value)} />
          <PreviousFieldHint date={previousDate} text={previousConsultation?.studies} />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }} sx={{ display: 'none' }}>
          <ClickableDateField
            label="Fecha de última menstruación"
            value={form.lastMenstruationDate}
            onChange={onLastMenstruationDateChange}
          />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <Paper variant="outlined" sx={{ p: 1.5, borderColor: '#cfe0f5', backgroundColor: '#f4f9ff' }}>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
              Historia clínica
            </Typography>
            <Box sx={{ mt: 1.25, mb: 1.5 }}>
              <ClickableDateField
                label="Fecha de última menstruación"
                value={form.lastMenstruationDate}
                onChange={onLastMenstruationDateChange}
              />
            </Box>
            <FormControlLabel control={<Checkbox checked={form.pregnant} onChange={(e) => onPregnantChange(e.target.checked)} />} label="Embarazada" />
            {form.pregnant && pregnancySummary ? (
              <Box sx={{ mt: 0.5 }}>
                <Typography sx={{ fontSize: '0.8rem', color: '#5f6b76', lineHeight: 1.35 }}>
                  Fecha de última menstruación: {pregnancySummary.fur}
                </Typography>
                <Typography sx={{ fontSize: '0.8rem', color: '#5f6b76', lineHeight: 1.35 }}>
                  Fecha probable de parto: {pregnancySummary.fpp}
                </Typography>
                <Typography sx={{ fontSize: '0.8rem', color: '#5f6b76', lineHeight: 1.35 }}>
                  Semanas de gestación: {pregnancySummary.gestation}
                </Typography>
              </Box>
            ) : null}
          </Paper>
        </Grid>
      </Grid>
    </CardContent></Card>
  );
});

const AnalysisSection = memo(function AnalysisSection({
  form, formInstanceKey, onExaminationChange, onDiagnosticChange, onAddDiagnostic, onRemoveDiagnostic, previousConsultation,
}: {
  form: AnalysisFormData;
  formInstanceKey: number;
  onExaminationChange: (value: string) => void;
  onDiagnosticChange: (index: number, value: string) => void;
  onAddDiagnostic: () => void;
  onRemoveDiagnostic: (index: number) => void;
  previousConsultation: PatientSoapContext['last_consultation'];
}) {
  const previousDiagnosticsText = (previousConsultation?.diagnostic_items ?? [])
    .map((diagnostic) => String(diagnostic ?? '').trim())
    .filter(Boolean)
    .map((diagnostic) => `- ${diagnostic}`)
    .join('\n');
  return (
    <Card><CardContent>
      <SoapSectionTitle initial="A" title="Análisis" />
      <Grid container spacing={2}>
        <Grid size={{ xs: 12 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <LockIcon sx={{ color: '#ff0000', fontSize: 20 }} />
            <Typography variant="body2" sx={{ fontWeight: 600 }}>{`An\u00e1lisis`}</Typography>
          </Box>
          <TextField key={`${formInstanceKey}-examination`} fullWidth size="small" defaultValue={form.examination} onChange={(e) => onExaminationChange(e.target.value)} />
          <PreviousFieldHint date={previousConsultation?.created_at} text={previousConsultation?.examination} />
        </Grid>
        {form.diagnostics.map((diagnostic, index) => (
          <Grid key={`diagnostic-${index}`} size={{ xs: 12 }}>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <TextField key={`${formInstanceKey}-diagnostic-${index}`} fullWidth size="small" label={`Diagn\u00f3stico ${index + 1}`} defaultValue={diagnostic} onChange={(e) => onDiagnosticChange(index, e.target.value)} />
              {index === 0 ? (
                <IconButton color="primary" onClick={onAddDiagnostic}><AddIcon /></IconButton>
              ) : (
                <IconButton color="error" onClick={() => onRemoveDiagnostic(index)}><CancelIcon /></IconButton>
              )}
            </Box>
            {index === 0 && previousDiagnosticsText ? (
              <PreviousFieldHint date={previousConsultation?.created_at} text={previousDiagnosticsText} quoteText={false} />
            ) : null}
          </Grid>
        ))}
      </Grid>
    </CardContent></Card>
  );
});

const PlanSection = memo(function PlanSection({
  form, formInstanceKey, onMedicationChange, onAddMedication, onRemoveMedication, onAdditionalInstructionsChange, medicamentHistory, onOpenColposcopy, onOpenPrescription, previousConsultation,
}: {
  form: PlanFormData;
  formInstanceKey: number;
  onMedicationChange: (index: number, field: 'medicament' | 'prescription', value: string) => void;
  onAddMedication: () => void;
  onRemoveMedication: (index: number) => void;
  onAdditionalInstructionsChange: (value: string) => void;
  medicamentHistory: MedicamentHistoryItem[];
  onOpenColposcopy: () => void;
  onOpenPrescription: () => void;
  previousConsultation: PatientSoapContext['last_consultation'];
}) {
  const [showHistory, setShowHistory] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const previousMedicationRows = (previousConsultation?.medications ?? [])
    .map((row) => {
      const medicament = String(row?.medicament ?? '').trim();
      const prescription = String(row?.prescription ?? '').trim();
      if (!medicament) return null;
      return { medicament, prescription };
    })
    .filter((row): row is { medicament: string; prescription: string } => Boolean(row));

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
              <TextField key={`${formInstanceKey}-medicament-${index}`} fullWidth size="small" label={`Medicamento ${index + 1}`} defaultValue={row.medicament} onChange={(e) => onMedicationChange(index, 'medicament', e.target.value)} />
              {index === 0 ? (
                <IconButton color="primary" onClick={onAddMedication}><AddIcon /></IconButton>
              ) : (
                <IconButton color="error" onClick={() => onRemoveMedication(index)}><CancelIcon /></IconButton>
              )}
            </Box>
            <TextField key={`${formInstanceKey}-prescription-${index}`} fullWidth size="small" label={`Prescripci\u00f3n`} defaultValue={row.prescription} onChange={(e) => onMedicationChange(index, 'prescription', e.target.value)} sx={{ mt: 1 }} />
            {index === 0 && previousMedicationRows.length > 0 ? (
              <Box sx={{ mt: 0.75 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.75 }}>
                  <HistoryIcon sx={{ fontSize: '0.9rem', color: '#5f6b76', mt: '1px', flexShrink: 0 }} />
                  <Typography sx={{ fontSize: '0.8rem', color: '#5f6b76', lineHeight: 1.35 }}>
                    [{formatHistoricalDate(previousConsultation?.created_at)}]
                  </Typography>
                </Box>
                {previousMedicationRows.map((previousRow, lineIndex) => (
                  <Typography key={`previous-medication-${lineIndex}`} sx={{ fontSize: '0.8rem', color: '#5f6b76', mt: 0.5, whiteSpace: 'pre-line', lineHeight: 1.35 }}>
                    <Box component="span" sx={{ fontWeight: 700 }}>
                      {previousRow.medicament}
                    </Box>
                    {' | '}
                    {previousRow.prescription}
                  </Typography>
                ))}
              </Box>
            ) : null}
          </Grid>
        ))}
        <Grid size={{ xs: 12 }}><TextField key={`${formInstanceKey}-additionalInstructions`} multiline minRows={2} fullWidth label="Indicaciones adicionales" defaultValue={form.additionalInstructions} onChange={(e) => onAdditionalInstructionsChange(e.target.value)} /></Grid>
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
  notes, formInstanceKey, onNotesChange, selectedLabels, onLabelsChange, officeLabels, patientTagControl, previousConsultation,
}: {
  notes: string;
  formInstanceKey: number;
  onNotesChange: (next: string) => void;
  selectedLabels: number[];
  onLabelsChange: (next: number[]) => void;
  officeLabels: OfficeLabelItem[];
  patientTagControl: PatientTagControlData | null;
  previousConsultation: PatientSoapContext['last_consultation'];
}) {
  return (
    <Card><CardContent>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <LockIcon sx={{ color: '#ff0000', fontSize: 20 }} />
            <Typography variant="body2" sx={{ fontWeight: 600 }}>Anotaciones personales</Typography>
          </Box>
          <Typography sx={{ fontSize: '0.8rem', color: '#5f6b76', mb: 1 }}>
            Tus notas en este campo son privadas
          </Typography>
          <TextField key={`${formInstanceKey}-personalNotes`} multiline minRows={3} fullWidth defaultValue={notes} onChange={(e) => onNotesChange(e.target.value)} />
          {String(previousConsultation?.notes ?? '').trim() ? (
            <PreviousFieldHint date={previousConsultation?.created_at} text={previousConsultation?.notes} />
          ) : null}
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
  const [formInstanceKey, setFormInstanceKey] = useState(0);
  const subjectiveFormRef = useRef<SubjectiveFormData>({ illnessStartDate: '', currentCondition: '' });
  const objectiveFormRef = useRef<ObjectiveFormData>({ height: '', weight: '', ta: '', temp: '', fc: '', os: '', studies: '', lastMenstruationDate: '', pregnant: false });
  const analysisFormRef = useRef<AnalysisFormData>({ examination: '', diagnostics: [''] });
  const planFormRef = useRef<PlanFormData>({ medications: [{ medicament: '', prescription: '' }], additionalInstructions: '' });
  const personalNotesRef = useRef('');

  const lastConsultation = soapContext?.last_consultation ?? null;
  const lastConsultationDateLabel = lastConsultation?.created_at ? `[${formatHistoricalDate(lastConsultation.created_at)}]` : null;

  const refreshFormInstance = useCallback(() => setFormInstanceKey((current) => current + 1), []);

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
    subjectiveFormRef.current = subjectiveForm;
  }, [subjectiveForm]);

  useEffect(() => {
    objectiveFormRef.current = objectiveForm;
  }, [objectiveForm]);

  useEffect(() => {
    analysisFormRef.current = analysisForm;
  }, [analysisForm]);

  useEffect(() => {
    planFormRef.current = planForm;
  }, [planForm]);

  useEffect(() => {
    personalNotesRef.current = personalNotes;
  }, [personalNotes]);

  useEffect(() => {
    if (tabLoading) return;
    setSelectedOfficeLabels((current) => (current.length > 0 ? current : officeLabels.slice(0, 1).map((label) => label.id)));
  }, [officeLabels, tabLoading]);

  useEffect(() => {
    const suggestedHeight = getSuggestedHeight(patient.age, soapContext?.last_consultation?.height);

    setObjectiveForm((current) => ({
      ...current,
      height: current.height || suggestedHeight,
      lastMenstruationDate: current.lastMenstruationDate || normalizeDateInputValue(clinicalHistory?.gynecological?.last_menstruation_date) || '',
      pregnant: current.pregnant || Boolean(clinicalHistory?.gynecological?.pregnant),
    }));
  }, [clinicalHistory, patient.age, soapContext?.last_consultation?.height]);

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
    subjectiveFormRef.current = { illnessStartDate: normalizeDateInputValue(editRequestNote.ailingdate) || '', currentCondition: editRequestNote.subjective ?? '' };
    objectiveFormRef.current = {
      height: editRequestNote.height ?? '',
      weight: editRequestNote.weight ?? '',
      ta: editRequestNote.ta ?? '',
      temp: editRequestNote.temp ?? '',
      fc: editRequestNote.fc ?? '',
      os: editRequestNote.os ?? '',
      studies: editRequestNote.studies ?? editRequestNote.objective ?? '',
      lastMenstruationDate: normalizeDateInputValue(clinicalHistory?.gynecological?.last_menstruation_date) || '',
      pregnant: Boolean(clinicalHistory?.gynecological?.pregnant),
    };
    analysisFormRef.current = { examination: editRequestNote.examination ?? '', diagnostics: editRequestNote.diagnostics?.length ? editRequestNote.diagnostics : [''] };
    planFormRef.current = { medications: editRequestNote.medications?.length ? editRequestNote.medications : [{ medicament: '', prescription: '' }], additionalInstructions: editRequestNote.indicaciones ?? '' };
    personalNotesRef.current = editRequestNote.private_comments ?? '';
    refreshFormInstance();
    onEditRequestHandled();
  }, [canEditConsultationHistory, clinicalHistory, editRequestNote, onEditRequestHandled, refreshFormInstance]);

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
      const currentSubjectiveForm = subjectiveFormRef.current;
      const currentObjectiveForm = objectiveFormRef.current;
      const currentAnalysisForm = analysisFormRef.current;
      const currentPlanForm = planFormRef.current;
      const currentPersonalNotes = personalNotesRef.current;
      const payload = {
        patient_id: patient.id,
        currentcondition: currentSubjectiveForm.currentCondition.trim() || undefined,
        ailingdate: normalizeDateInputValue(currentSubjectiveForm.illnessStartDate) || undefined,
        height: currentObjectiveForm.height.trim() || undefined,
        weight: currentObjectiveForm.weight.trim() || undefined,
        ta: currentObjectiveForm.ta.trim() || undefined,
        temp: currentObjectiveForm.temp.trim() || undefined,
        fc: currentObjectiveForm.fc.trim() || undefined,
        os: currentObjectiveForm.os.trim() || undefined,
        studies: currentObjectiveForm.studies.trim() || undefined,
        furupdate: normalizeDateInputValue(currentObjectiveForm.lastMenstruationDate) || undefined,
        embarazadaupdate: currentObjectiveForm.pregnant,
        examination: currentAnalysisForm.examination.trim() || undefined,
        diagnostics: currentAnalysisForm.diagnostics.map((value) => value.trim()).filter(Boolean),
        medications: currentPlanForm.medications.map((row) => ({ medicament: row.medicament.trim(), prescription: row.prescription.trim() })).filter((row) => row.medicament || row.prescription),
        indicaciones: currentPlanForm.additionalInstructions.trim() || undefined,
        notes: currentPersonalNotes.trim() || undefined,
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
      setObjectiveForm({
        height: getSuggestedHeight(nextPatient.age, nextSoapContext.last_consultation?.height),
        weight: '',
        ta: '',
        temp: '',
        fc: '',
        os: '',
        studies: '',
        lastMenstruationDate: normalizeDateInputValue(nextClinicalHistory?.gynecological?.last_menstruation_date) || '',
        pregnant: Boolean(nextClinicalHistory?.gynecological?.pregnant),
      });
      setAnalysisForm({ examination: '', diagnostics: [''] });
      setPlanForm({ medications: [{ medicament: '', prescription: '' }], additionalInstructions: '' });
      setPersonalNotes('');
      setSelectedOfficeLabels(officeLabels.slice(0, 1).map((label) => label.id));
      subjectiveFormRef.current = { illnessStartDate: '', currentCondition: '' };
      objectiveFormRef.current = {
        height: getSuggestedHeight(nextPatient.age, nextSoapContext.last_consultation?.height),
        weight: '',
        ta: '',
        temp: '',
        fc: '',
        os: '',
        studies: '',
        lastMenstruationDate: normalizeDateInputValue(nextClinicalHistory?.gynecological?.last_menstruation_date) || '',
        pregnant: Boolean(nextClinicalHistory?.gynecological?.pregnant),
      };
      analysisFormRef.current = { examination: '', diagnostics: [''] };
      planFormRef.current = { medications: [{ medicament: '', prescription: '' }], additionalInstructions: '' };
      personalNotesRef.current = '';
      refreshFormInstance();
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
    setObjectiveForm({
      height: getSuggestedHeight(patient.age, soapContext?.last_consultation?.height),
      weight: '',
      ta: '',
      temp: '',
      fc: '',
      os: '',
      studies: '',
      lastMenstruationDate: normalizeDateInputValue(clinicalHistory?.gynecological?.last_menstruation_date) || '',
      pregnant: Boolean(clinicalHistory?.gynecological?.pregnant),
    });
    setAnalysisForm({ examination: '', diagnostics: [''] });
    setPlanForm({ medications: [{ medicament: '', prescription: '' }], additionalInstructions: '' });
    setPersonalNotes('');
    setSelectedOfficeLabels(officeLabels.slice(0, 1).map((label) => label.id));
    subjectiveFormRef.current = { illnessStartDate: '', currentCondition: '' };
    objectiveFormRef.current = {
      height: getSuggestedHeight(patient.age, soapContext?.last_consultation?.height),
      weight: '',
      ta: '',
      temp: '',
      fc: '',
      os: '',
      studies: '',
      lastMenstruationDate: normalizeDateInputValue(clinicalHistory?.gynecological?.last_menstruation_date) || '',
      pregnant: Boolean(clinicalHistory?.gynecological?.pregnant),
    };
    analysisFormRef.current = { examination: '', diagnostics: [''] };
    planFormRef.current = { medications: [{ medicament: '', prescription: '' }], additionalInstructions: '' };
    personalNotesRef.current = '';
    refreshFormInstance();
    clearDraft(patient.id);
  };

  const handleIllnessStartDateChange = useCallback((value: string) => {
    setSubjectiveForm((current) => {
      const next = { ...current, illnessStartDate: value };
      subjectiveFormRef.current = next;
      return next;
    });
  }, []);
  const handleCurrentConditionChange = useCallback((value: string) => {
    subjectiveFormRef.current = { ...subjectiveFormRef.current, currentCondition: value };
  }, []);
  const handleObjectivePassiveFieldChange = useCallback((field: 'height' | 'weight' | 'ta' | 'temp' | 'fc' | 'os' | 'studies', value: string) => {
    objectiveFormRef.current = { ...objectiveFormRef.current, [field]: value };
  }, []);
  const handleLastMenstruationDateChange = useCallback((value: string) => {
    setObjectiveForm((current) => {
      const next = { ...current, lastMenstruationDate: value };
      objectiveFormRef.current = next;
      return next;
    });
  }, []);
  const handlePregnantChange = useCallback((value: boolean) => {
    setObjectiveForm((current) => {
      const next = { ...current, pregnant: value };
      objectiveFormRef.current = next;
      return next;
    });
  }, []);
  const handleExaminationChange = useCallback((value: string) => {
    analysisFormRef.current = { ...analysisFormRef.current, examination: value };
  }, []);
  const handleDiagnosticChange = useCallback((index: number, value: string) => {
    const diagnostics = [...analysisFormRef.current.diagnostics];
    diagnostics[index] = value;
    analysisFormRef.current = { ...analysisFormRef.current, diagnostics };
  }, []);
  const handleAddDiagnostic = useCallback(() => {
    setAnalysisForm((current) => {
      if (current.diagnostics.length >= 10) return current;
      const next = { ...current, diagnostics: [...analysisFormRef.current.diagnostics, ''] };
      analysisFormRef.current = next;
      return next;
    });
  }, []);
  const handleRemoveDiagnostic = useCallback((index: number) => {
    setAnalysisForm((current) => {
      const nextDiagnostics = analysisFormRef.current.diagnostics.filter((_, i) => i !== index);
      const next = { ...current, diagnostics: nextDiagnostics.length > 0 ? nextDiagnostics : [''] };
      analysisFormRef.current = next;
      return next;
    });
  }, []);
  const handleMedicationChange = useCallback((index: number, field: 'medicament' | 'prescription', value: string) => {
    const medications = [...planFormRef.current.medications];
    const currentRow = medications[index] ?? { medicament: '', prescription: '' };
    medications[index] = { ...currentRow, [field]: value };
    planFormRef.current = { ...planFormRef.current, medications };
  }, []);
  const handleAddMedication = useCallback(() => {
    setPlanForm((current) => {
      if (current.medications.length >= 10) return current;
      const next = { ...current, medications: [...planFormRef.current.medications, { medicament: '', prescription: '' }] };
      planFormRef.current = next;
      return next;
    });
  }, []);
  const handleRemoveMedication = useCallback((index: number) => {
    setPlanForm((current) => {
      const nextMedications = planFormRef.current.medications.filter((_, i) => i !== index);
      const next = { ...current, medications: nextMedications.length > 0 ? nextMedications : [{ medicament: '', prescription: '' }] };
      planFormRef.current = next;
      return next;
    });
  }, []);
  const handleAdditionalInstructionsChange = useCallback((value: string) => {
    planFormRef.current = { ...planFormRef.current, additionalInstructions: value };
  }, []);
  const handleNotesChange = useCallback((next: string) => {
    personalNotesRef.current = next;
  }, []);
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

        <SubjectiveSection
          form={subjectiveForm}
          formInstanceKey={formInstanceKey}
          onIllnessStartDateChange={handleIllnessStartDateChange}
          onCurrentConditionChange={handleCurrentConditionChange}
          previousConsultation={lastConsultation}
        />
        <ObjectiveSection
          form={objectiveForm}
          formInstanceKey={formInstanceKey}
          onPassiveFieldChange={handleObjectivePassiveFieldChange}
          onLastMenstruationDateChange={handleLastMenstruationDateChange}
          onPregnantChange={handlePregnantChange}
          previousConsultation={lastConsultation}
        />
        <AnalysisSection
          form={analysisForm}
          formInstanceKey={formInstanceKey}
          onExaminationChange={handleExaminationChange}
          onDiagnosticChange={handleDiagnosticChange}
          onAddDiagnostic={handleAddDiagnostic}
          onRemoveDiagnostic={handleRemoveDiagnostic}
          previousConsultation={lastConsultation}
        />
        <PlanSection
          form={planForm}
          formInstanceKey={formInstanceKey}
          onMedicationChange={handleMedicationChange}
          onAddMedication={handleAddMedication}
          onRemoveMedication={handleRemoveMedication}
          onAdditionalInstructionsChange={handleAdditionalInstructionsChange}
          medicamentHistory={medicamentHistory}
          onOpenColposcopy={onOpenColposcopy}
          onOpenPrescription={handleOpenPrescription}
          previousConsultation={lastConsultation}
        />
        <PersonalNotesSection
          notes={personalNotes}
          formInstanceKey={formInstanceKey}
          onNotesChange={handleNotesChange}
          selectedLabels={selectedOfficeLabels}
          onLabelsChange={handleLabelsChange}
          officeLabels={officeLabels}
          patientTagControl={patientTagControl}
          previousConsultation={lastConsultation}
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
