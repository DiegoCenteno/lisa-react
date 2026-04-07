import { memo, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Box, Button, Card, CardContent, Divider, Grid, MenuItem, Paper, TextField, Typography } from '@mui/material';
import dayjs, { type Dayjs } from 'dayjs';
import 'dayjs/locale/es';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import {
  consultationService,
  type BasicObstetricInterpretationUltrasoundPayload,
  type FetalVitalityFetusPayload,
  type FetalVitalityReportPayload,
  type PatientReportRecord,
} from '../../api/consultationService';
import { patientService } from '../../api/patientService';
import { UltrasoundInterpretationDisplay, UltrasoundInterpretationSection } from './UltrasoundInterpretationSection';

dayjs.locale('es');

interface PatientFetalVitalityReportBuilderProps {
  reportId: number;
  onClose: () => void;
  onSaved?: (report: PatientReportRecord<FetalVitalityReportPayload>) => void;
  onError?: (message: string) => void;
  onSuccess?: (message: string) => void;
  startInEditMode?: boolean;
}

const riskOptions = ['bajo riesgo', 'alto riesgo'];
const prognosisOptions = ['buen', 'mal'];
const fetusCountRiskOptions = ['unico', 'bicorial - biamniotico', 'monocorial - biamniotico', 'monocorial - monoamniotico', 'triple', 'no valorable'];
const gestationalSacOptions = ['intrauterino', 'extrauterino'];
const normalAbnormalOptions = ['normal', 'anormal'];
const embryoOptions = ['presente', 'ausente'];
const uterusAndAdnexaOptions = ['normal', 'anormal', 'no valorable'];
const internalOsOptions = ['cerrado', 'abierto'];

function applyReferencePhysicianFallback<T extends { study_context?: { reference_physician?: string } }>(
  payload: T,
  referencePhysician?: string | null
): T {
  const fallback = String(referencePhysician ?? '').trim();
  if (!fallback) {
    return payload;
  }

  if (String(payload?.study_context?.reference_physician ?? '').trim() !== '') {
    return payload;
  }

  return {
    ...payload,
    study_context: {
      ...payload.study_context,
      reference_physician: fallback,
    },
  };
}
const recommendedStudyOptions = ['tipoest1', 'tipoest2', 'tipoest3', 'tipoest4', 'tipoest5', 'tipoest7', 'ninguno'];

function formatDateDisplay(value?: string | null) {
  if (!value) return '';
  return new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(`${value}T00:00:00`));
}

function toDayjsValue(value: string | null | undefined): Dayjs | null {
  if (!value) return null;
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed : null;
}

function normalizeRecommendedEndDate(startDate: string, endDate: string) {
  const start = toDayjsValue(startDate);
  const end = toDayjsValue(endDate);
  if (!start || !end) return endDate;
  return end.isAfter(start, 'day') ? endDate : start.add(1, 'day').format('YYYY-MM-DD');
}

async function flushActiveElement() {
  const activeElement = document.activeElement;
  if (activeElement instanceof HTMLElement) {
    activeElement.blur();
    await new Promise((resolve) => window.setTimeout(resolve, 0));
  }
}

function hasDisplayValue(value?: string | number | null) {
  if (value === null || value === undefined) return false;
  return typeof value === 'number' ? true : value.trim().length > 0;
}

function isFieldVisible(hiddenFields: Set<string>, fieldKey: string) {
  return !hiddenFields.has(fieldKey);
}

function createDefaultFetusPayload(fetusNumber: number): FetalVitalityFetusPayload {
  return {
    fetus_number: fetusNumber,
    growth_screening: { lcc: { value: '', sdg: '' }, dbp: { value: '', sdg: '' }, average_fetometry: '' },
    basic_screening: {
      gestational_sac: 'intrauterino',
      gestational_sac_characteristics: 'normal',
      decidual_reaction: 'normal',
      yolk_vesicle_mm: '',
      yolk_vesicle_characteristics: 'normal',
      embryo: 'presente',
      embryonic_heart_rate: '',
      uterus_and_adnexa: 'normal',
      cervical_length: '',
      internal_cervical_os: 'cerrado',
    },
  };
}

function buildNormalizedPayload(payload?: FetalVitalityReportPayload | null): FetalVitalityReportPayload {
  const fetusCount = Math.min(Math.max(payload?.study_context?.fetus_count ?? 1, 1), 3);
  const fetuses = Array.from({ length: fetusCount }, (_, index) => {
    const base = createDefaultFetusPayload(index + 1);
    const incoming = payload?.fetuses?.[index];
    return {
      ...base,
      ...incoming,
      fetus_number: index + 1,
      growth_screening: {
        ...base.growth_screening,
        ...incoming?.growth_screening,
        lcc: { ...base.growth_screening.lcc, ...incoming?.growth_screening?.lcc },
        dbp: { ...base.growth_screening.dbp, ...incoming?.growth_screening?.dbp },
      },
      basic_screening: {
        ...base.basic_screening,
        ...incoming?.basic_screening,
        gestational_sac: incoming?.basic_screening?.gestational_sac || 'intrauterino',
        gestational_sac_characteristics: incoming?.basic_screening?.gestational_sac_characteristics || 'normal',
        decidual_reaction: incoming?.basic_screening?.decidual_reaction || 'normal',
        yolk_vesicle_characteristics: incoming?.basic_screening?.yolk_vesicle_characteristics || 'normal',
        embryo: incoming?.basic_screening?.embryo || 'presente',
        uterus_and_adnexa: incoming?.basic_screening?.uterus_and_adnexa || 'normal',
        internal_cervical_os: incoming?.basic_screening?.internal_cervical_os || 'cerrado',
      },
    };
  });

  return {
    study_context: {
      reference_physician: payload?.study_context?.reference_physician ?? '',
      fetus_count: fetusCount,
      selected_fetus: Math.min(Math.max(payload?.study_context?.selected_fetus ?? 1, 1), fetusCount),
    },
    fetuses,
    interpretation_ultrasounds: Array.from({ length: 5 }, (_, index) => ({
      enabled: false,
      study_date: '',
      fetometry_weeks: '',
      fetometry_days: '',
      notes: '',
      ...payload?.interpretation_ultrasounds?.[index],
    })),
    conclusion: {
      fetus_count_risk: payload?.conclusion?.fetus_count_risk || 'unico',
      growth_risk: payload?.conclusion?.growth_risk || 'bajo riesgo',
      frequency_risk: payload?.conclusion?.frequency_risk || 'bajo riesgo',
      prognosis_data: payload?.conclusion?.prognosis_data || 'buen',
      uterus_and_adnexa_risk: payload?.conclusion?.uterus_and_adnexa_risk || 'bajo riesgo',
      comments: payload?.conclusion?.comments ?? '',
      recommended_next_study: payload?.conclusion?.recommended_next_study || 'tipoest1',
      recommended_start_date: payload?.conclusion?.recommended_start_date ?? '',
      recommended_end_date: payload?.conclusion?.recommended_end_date ?? '',
    },
  };
}

function HeaderCard({ title, children }: { title: string; children: ReactNode }) {
  return <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'rgba(35,165,193,.18)' }}><Box sx={{ px: 2.5, py: 1.5, borderBottom: '1px solid', borderColor: 'rgba(35,165,193,.12)', background: 'linear-gradient(180deg, rgba(35,165,193,.06) 0%, rgba(35,165,193,.02) 100%)' }}><Typography variant="h6" fontWeight={700} color="#0d7f1f">{title}</Typography></Box><CardContent sx={{ p: { xs: 2, md: 3 } }}>{children}</CardContent></Card>;
}

function InfoField({ label, value, xs = 12, sm = 6 }: { label: string; value?: string | number | null; xs?: number; sm?: number }) {
  if (!hasDisplayValue(value)) return null;
  return <Grid size={{ xs, sm }}><Box sx={{ display: 'grid', gap: .4 }}><Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 700 }}>{label}</Typography><Typography variant="body1" sx={{ color: '#16313b', whiteSpace: 'pre-wrap' }}>{value}</Typography></Box></Grid>;
}

function PatientFetalVitalityReportBuilder({
  reportId,
  onClose,
  onSaved,
  onError,
  onSuccess,
  startInEditMode = true,
}: PatientFetalVitalityReportBuilderProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [editing, setEditing] = useState(startInEditMode);
  const [report, setReport] = useState<PatientReportRecord<FetalVitalityReportPayload> | null>(null);
  const [payload, setPayload] = useState<FetalVitalityReportPayload>(() => buildNormalizedPayload(null));

  useEffect(() => { setEditing(startInEditMode); }, [reportId, startInEditMode]);

  useEffect(() => {
    let mounted = true;
    const loadReport = async () => {
      setLoading(true);
      try {
        const loaded = await consultationService.getPatientReport<FetalVitalityReportPayload>(reportId);
        const history = await patientService.getClinicalHistory(loaded.patient_id);
        if (!mounted) return;
        setReport(loaded);
        setPayload(applyReferencePhysicianFallback(
          buildNormalizedPayload(loaded.report_payload),
          history.reference_physician
        ));
        setEditing(!loaded.updated_at || loaded.updated_at === loaded.created_at);
      } catch (error) {
        console.error('Error cargando reporte de vitalidad fetal:', error);
        onError?.('No se pudo cargar el reporte de ultrasonido de vitalidad fetal.');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void loadReport();
    return () => { mounted = false; };
  }, [onError, reportId]);

  const hiddenFields = useMemo(() => new Set(report?.form_config?.hidden_fields ?? []), [report?.form_config?.hidden_fields]);
  const selectedFetusIndex = Math.max(payload.study_context.selected_fetus - 1, 0);
  const selectedFetus = payload.fetuses[selectedFetusIndex] ?? payload.fetuses[0];
  const selectedFetusLabel = `Feto ${selectedFetus?.fetus_number ?? 1}`;
  const hasVisibleGrowthSection = ['tamizajedbp', 'tamizajelcc', 'uobafetometria'].some((field) => isFieldVisible(hiddenFields, field));
  const hasVisibleBasicScreeningSection = ['tobsacogest', 'tobcarsacogest', 'tobreacciondecidual', 'tobvesiculavitelina', 'tobcarvesiculavitelina', 'tobembrion', 'tobfreccardembrion', 'tobuteroanexos', 'toblongcervical', 'toborificiocervicalint'].some((field) => isFieldVisible(hiddenFields, field));
  const hasVisibleConclusionSection = ['uobcnumfetos', 'uobccrecimiento', 'uobcfrecuencia', 'uobcdatospron', 'uobcuteroyanex', 'uobccomentarios', 'estudiorecomendadio', 'auxfechastudio', 'auxfechastudio2'].some((field) => isFieldVisible(hiddenFields, field));

  const updatePayload = useCallback((updater: (current: FetalVitalityReportPayload) => FetalVitalityReportPayload) => setPayload((current) => updater(current)), []);
  const updateSelectedFetus = useCallback((updater: (fetus: FetalVitalityFetusPayload) => FetalVitalityFetusPayload) => {
    updatePayload((current) => {
      const nextFetuses = [...current.fetuses];
      nextFetuses[selectedFetusIndex] = updater(nextFetuses[selectedFetusIndex] ?? createDefaultFetusPayload(selectedFetusIndex + 1));
      return { ...current, fetuses: nextFetuses };
    });
  }, [selectedFetusIndex, updatePayload]);

  const persistReport = async (showSuccessMessage = true) => {
    if (!report) return null;
    setSaving(true);
    try {
      await flushActiveElement();
      const updated = await consultationService.updatePatientReport<FetalVitalityReportPayload>(report.id, { report_payload: payload });
      setReport(updated);
      setPayload(buildNormalizedPayload(updated.report_payload));
      setEditing(false);
      onSaved?.(updated);
      if (showSuccessMessage) onSuccess?.('Reporte de vitalidad fetal guardado correctamente.');
      return updated;
    } catch (error) {
      console.error('Error guardando reporte de vitalidad fetal:', error);
      onError?.('No se pudo guardar el reporte de ultrasonido de vitalidad fetal.');
      return null;
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = async () => {
    if (!report) return;
    setDownloading(true);
    try {
      let activeReport = report;
      if (editing) {
        const updated = await persistReport(false);
        if (!updated) return;
        activeReport = updated;
      }
      const blob = await consultationService.downloadPatientReportDocx(activeReport.id);
      const blobUrl = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = blobUrl;
      anchor.download = 'ReporteUltrasonidoVitalidadFetal.docx';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(blobUrl);
      onSuccess?.('Reporte descargado correctamente.');
    } catch (error) {
      console.error('Error descargando reporte de vitalidad fetal:', error);
      onError?.('No se pudo descargar el reporte de ultrasonido de vitalidad fetal.');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) return <Paper sx={{ p: 2.5, borderRadius: 2 }}><Typography variant="body2" sx={{ color: 'text.secondary' }}>Cargando reporte...</Typography></Paper>;

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
      <Paper sx={{ p: 2.5, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', mb: 2 }}>
          <Box><Typography variant="h6" sx={{ color: '#0a8f2f', fontWeight: 700 }}>Ultrasonido vitalidad fetal</Typography><Typography variant="body2" sx={{ color: 'text.secondary', mt: .5 }}>El reporte ya usa la estructura V2 sobre `patient_reports.report_payload`.</Typography></Box>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}><Button color="inherit" onClick={onClose} disabled={saving}>Cerrar</Button><Button variant="outlined" onClick={() => void handleDownload()} disabled={saving || downloading}>{downloading ? 'Descargando...' : 'Descargar DOCX'}</Button>{editing ? <Button variant="contained" onClick={() => void persistReport(true)} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</Button> : <Button variant="contained" onClick={() => setEditing(true)}>Editar</Button>}</Box>
        </Box>

        {editing ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box><Typography variant="subtitle1" sx={{ fontWeight: 700 }}>1. Contexto del estudio</Typography><Box sx={{ mt: 1.25, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2, background: 'rgba(10,143,47,.04)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 1.5 }}><TextField fullWidth label="Medico de referencia" value={payload.study_context.reference_physician} onChange={(event) => updatePayload((current) => ({ ...current, study_context: { ...current.study_context, reference_physician: event.target.value } }))} /><TextField select fullWidth label="Numero de fetos" value={payload.study_context.fetus_count} onChange={(event) => { const nextCount = Math.min(Math.max(Number(event.target.value) || 1, 1), 3); updatePayload((current) => ({ ...current, study_context: { ...current.study_context, fetus_count: nextCount, selected_fetus: Math.min(current.study_context.selected_fetus, nextCount) }, fetuses: Array.from({ length: nextCount }, (_, index) => current.fetuses[index] ?? createDefaultFetusPayload(index + 1)) })); }}>{[1, 2, 3].map((option) => <MenuItem key={option} value={option}>{option === 1 ? 'Unico' : option === 2 ? 'Dos' : 'Triple'}</MenuItem>)}</TextField>{payload.study_context.fetus_count > 1 && <TextField select fullWidth label="Feto activo" value={payload.study_context.selected_fetus} onChange={(event) => updatePayload((current) => ({ ...current, study_context: { ...current.study_context, selected_fetus: Number(event.target.value) || 1 } }))}>{payload.fetuses.map((fetus) => <MenuItem key={fetus.fetus_number} value={fetus.fetus_number}>{`Feto ${fetus.fetus_number}`}</MenuItem>)}</TextField>}</Box></Box>

            {hasVisibleGrowthSection && <><Divider /><Box><Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{`2. Tamizaje de alteraciones en el crecimiento - ${selectedFetusLabel}`}</Typography><Box sx={{ mt: 1.25, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2, background: 'rgba(25,118,210,.04)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 1.5 }}>{isFieldVisible(hiddenFields, 'tamizajedbp') && <><TextField fullWidth label="DBP" value={selectedFetus?.growth_screening.dbp.value ?? ''} onChange={(event) => updateSelectedFetus((fetus) => ({ ...fetus, growth_screening: { ...fetus.growth_screening, dbp: { ...fetus.growth_screening.dbp, value: event.target.value } } }))} /><TextField fullWidth label="DBP SDG" value={selectedFetus?.growth_screening.dbp.sdg ?? ''} onChange={(event) => updateSelectedFetus((fetus) => ({ ...fetus, growth_screening: { ...fetus.growth_screening, dbp: { ...fetus.growth_screening.dbp, sdg: event.target.value } } }))} /></>}{isFieldVisible(hiddenFields, 'tamizajelcc') && <><TextField fullWidth label="LCC" value={selectedFetus?.growth_screening.lcc.value ?? ''} onChange={(event) => updateSelectedFetus((fetus) => ({ ...fetus, growth_screening: { ...fetus.growth_screening, lcc: { ...fetus.growth_screening.lcc, value: event.target.value } } }))} /><TextField fullWidth label="LCC SDG" value={selectedFetus?.growth_screening.lcc.sdg ?? ''} onChange={(event) => updateSelectedFetus((fetus) => ({ ...fetus, growth_screening: { ...fetus.growth_screening, lcc: { ...fetus.growth_screening.lcc, sdg: event.target.value } } }))} /></>}{isFieldVisible(hiddenFields, 'uobafetometria') && <TextField fullWidth label="Fetometria promedio" value={selectedFetus?.growth_screening.average_fetometry ?? ''} onChange={(event) => updateSelectedFetus((fetus) => ({ ...fetus, growth_screening: { ...fetus.growth_screening, average_fetometry: event.target.value } }))} />}</Box></Box></>}

            {hasVisibleBasicScreeningSection && <><Divider /><Box><Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{`3. Tamizaje obstetrico basico - ${selectedFetusLabel}`}</Typography><Box sx={{ mt: 1.25, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2, background: 'rgba(255,152,0,.05)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 1.5 }}>{isFieldVisible(hiddenFields, 'tobsacogest') && <TextField select fullWidth label="Saco gestacional" value={selectedFetus?.basic_screening.gestational_sac ?? 'intrauterino'} onChange={(event) => updateSelectedFetus((fetus) => ({ ...fetus, basic_screening: { ...fetus.basic_screening, gestational_sac: event.target.value } }))}>{gestationalSacOptions.map((option) => <MenuItem key={option} value={option}>{option}</MenuItem>)}</TextField>}{isFieldVisible(hiddenFields, 'tobcarsacogest') && <TextField select fullWidth label="Caracteristicas del saco" value={selectedFetus?.basic_screening.gestational_sac_characteristics ?? 'normal'} onChange={(event) => updateSelectedFetus((fetus) => ({ ...fetus, basic_screening: { ...fetus.basic_screening, gestational_sac_characteristics: event.target.value } }))}>{normalAbnormalOptions.map((option) => <MenuItem key={option} value={option}>{option}</MenuItem>)}</TextField>}{isFieldVisible(hiddenFields, 'tobreacciondecidual') && <TextField select fullWidth label="Reaccion decidual" value={selectedFetus?.basic_screening.decidual_reaction ?? 'normal'} onChange={(event) => updateSelectedFetus((fetus) => ({ ...fetus, basic_screening: { ...fetus.basic_screening, decidual_reaction: event.target.value } }))}>{normalAbnormalOptions.map((option) => <MenuItem key={option} value={option}>{option}</MenuItem>)}</TextField>}{isFieldVisible(hiddenFields, 'tobvesiculavitelina') && <TextField fullWidth label="Vesicula vitelina (mm)" value={selectedFetus?.basic_screening.yolk_vesicle_mm ?? ''} onChange={(event) => updateSelectedFetus((fetus) => ({ ...fetus, basic_screening: { ...fetus.basic_screening, yolk_vesicle_mm: event.target.value } }))} />}{isFieldVisible(hiddenFields, 'tobcarvesiculavitelina') && <TextField select fullWidth label="Caracteristicas de vesicula vitelina" value={selectedFetus?.basic_screening.yolk_vesicle_characteristics ?? 'normal'} onChange={(event) => updateSelectedFetus((fetus) => ({ ...fetus, basic_screening: { ...fetus.basic_screening, yolk_vesicle_characteristics: event.target.value } }))}>{normalAbnormalOptions.map((option) => <MenuItem key={option} value={option}>{option}</MenuItem>)}</TextField>}{isFieldVisible(hiddenFields, 'tobembrion') && <TextField select fullWidth label="Embrion" value={selectedFetus?.basic_screening.embryo ?? 'presente'} onChange={(event) => updateSelectedFetus((fetus) => ({ ...fetus, basic_screening: { ...fetus.basic_screening, embryo: event.target.value } }))}>{embryoOptions.map((option) => <MenuItem key={option} value={option}>{option}</MenuItem>)}</TextField>}{isFieldVisible(hiddenFields, 'tobfreccardembrion') && <TextField fullWidth label="Frecuencia cardiaca del embrion" value={selectedFetus?.basic_screening.embryonic_heart_rate ?? ''} onChange={(event) => updateSelectedFetus((fetus) => ({ ...fetus, basic_screening: { ...fetus.basic_screening, embryonic_heart_rate: event.target.value } }))} />}{isFieldVisible(hiddenFields, 'tobuteroanexos') && <TextField select fullWidth label="Utero y anexos" value={selectedFetus?.basic_screening.uterus_and_adnexa ?? 'normal'} onChange={(event) => updateSelectedFetus((fetus) => ({ ...fetus, basic_screening: { ...fetus.basic_screening, uterus_and_adnexa: event.target.value } }))}>{uterusAndAdnexaOptions.map((option) => <MenuItem key={option} value={option}>{option}</MenuItem>)}</TextField>}{isFieldVisible(hiddenFields, 'toblongcervical') && <TextField fullWidth label="Longitud cervical" value={selectedFetus?.basic_screening.cervical_length ?? ''} onChange={(event) => updateSelectedFetus((fetus) => ({ ...fetus, basic_screening: { ...fetus.basic_screening, cervical_length: event.target.value } }))} />}{isFieldVisible(hiddenFields, 'toborificiocervicalint') && <TextField select fullWidth label="Orificio cervical interno" value={selectedFetus?.basic_screening.internal_cervical_os ?? 'cerrado'} onChange={(event) => updateSelectedFetus((fetus) => ({ ...fetus, basic_screening: { ...fetus.basic_screening, internal_cervical_os: event.target.value } }))}>{internalOsOptions.map((option) => <MenuItem key={option} value={option}>{option}</MenuItem>)}</TextField>}</Box></Box></>}

            <UltrasoundInterpretationSection items={payload.interpretation_ultrasounds} onChange={(index: number, field: keyof BasicObstetricInterpretationUltrasoundPayload, value: string | boolean) => updatePayload((current) => { const nextItems = [...current.interpretation_ultrasounds]; nextItems[index] = { ...nextItems[index], [field]: value }; return { ...current, interpretation_ultrasounds: nextItems }; })} />

            {hasVisibleConclusionSection && <><Divider /><Box><Typography variant="subtitle1" sx={{ fontWeight: 700 }}>5. Conclusion</Typography><Box sx={{ mt: 1.25, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2, background: 'rgba(76,175,80,.05)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 1.5 }}>{isFieldVisible(hiddenFields, 'uobcnumfetos') && <TextField select fullWidth label="Numero de fetos" value={payload.conclusion.fetus_count_risk} onChange={(event) => updatePayload((current) => ({ ...current, conclusion: { ...current.conclusion, fetus_count_risk: event.target.value } }))}>{fetusCountRiskOptions.map((option) => <MenuItem key={option} value={option}>{option}</MenuItem>)}</TextField>}{isFieldVisible(hiddenFields, 'uobccrecimiento') && <TextField select fullWidth label="Crecimiento" value={payload.conclusion.growth_risk} onChange={(event) => updatePayload((current) => ({ ...current, conclusion: { ...current.conclusion, growth_risk: event.target.value } }))}>{riskOptions.map((option) => <MenuItem key={option} value={option}>{option}</MenuItem>)}</TextField>}{isFieldVisible(hiddenFields, 'uobcfrecuencia') && <TextField select fullWidth label="Frecuencia cardiaca" value={payload.conclusion.frequency_risk} onChange={(event) => updatePayload((current) => ({ ...current, conclusion: { ...current.conclusion, frequency_risk: event.target.value } }))}>{riskOptions.map((option) => <MenuItem key={option} value={option}>{option}</MenuItem>)}</TextField>}{isFieldVisible(hiddenFields, 'uobcdatospron') && <TextField select fullWidth label="Datos de pronostico" value={payload.conclusion.prognosis_data} onChange={(event) => updatePayload((current) => ({ ...current, conclusion: { ...current.conclusion, prognosis_data: event.target.value } }))}>{prognosisOptions.map((option) => <MenuItem key={option} value={option}>{option === 'buen' ? 'Buen pronostico' : 'Mal pronostico'}</MenuItem>)}</TextField>}{isFieldVisible(hiddenFields, 'uobcuteroyanex') && <TextField select fullWidth label="Utero y anexos" value={payload.conclusion.uterus_and_adnexa_risk} onChange={(event) => updatePayload((current) => ({ ...current, conclusion: { ...current.conclusion, uterus_and_adnexa_risk: event.target.value } }))}>{riskOptions.map((option) => <MenuItem key={option} value={option}>{option}</MenuItem>)}</TextField>}{isFieldVisible(hiddenFields, 'estudiorecomendadio') && <TextField select fullWidth label="Siguiente estudio recomendado" value={payload.conclusion.recommended_next_study} onChange={(event) => updatePayload((current) => ({ ...current, conclusion: { ...current.conclusion, recommended_next_study: event.target.value } }))}>{recommendedStudyOptions.map((option) => <MenuItem key={option} value={option}>{option}</MenuItem>)}</TextField>}{isFieldVisible(hiddenFields, 'auxfechastudio') && <DatePicker label="Fecha inicio siguiente estudio" value={toDayjsValue(payload.conclusion.recommended_start_date)} onChange={(value) => updatePayload((current) => ({ ...current, conclusion: { ...current.conclusion, recommended_start_date: value && value.isValid() ? value.format('YYYY-MM-DD') : '', recommended_end_date: normalizeRecommendedEndDate(value && value.isValid() ? value.format('YYYY-MM-DD') : '', current.conclusion.recommended_end_date) } }))} slotProps={{ textField: { fullWidth: true } }} />}{isFieldVisible(hiddenFields, 'auxfechastudio2') && <DatePicker label="Fecha fin siguiente estudio" value={toDayjsValue(payload.conclusion.recommended_end_date)} onChange={(value) => updatePayload((current) => ({ ...current, conclusion: { ...current.conclusion, recommended_end_date: value && value.isValid() ? normalizeRecommendedEndDate(current.conclusion.recommended_start_date, value.format('YYYY-MM-DD')) : '' } }))} slotProps={{ textField: { fullWidth: true } }} />}{isFieldVisible(hiddenFields, 'uobccomentarios') && <TextField fullWidth multiline minRows={4} label="Comentarios" value={payload.conclusion.comments} onChange={(event) => updatePayload((current) => ({ ...current, conclusion: { ...current.conclusion, comments: event.target.value } }))} />}</Box></Box></>}
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <HeaderCard title="1. Contexto del estudio"><Grid container spacing={3}><InfoField label="Medico de referencia" value={payload.study_context.reference_physician} /><InfoField label="Numero de fetos" value={payload.study_context.fetus_count === 1 ? 'Unico' : payload.study_context.fetus_count === 2 ? 'Dos' : 'Triple'} />{payload.study_context.fetus_count > 1 && <InfoField label="Feto activo" value={`Feto ${payload.study_context.selected_fetus}`} />}</Grid></HeaderCard>
            {hasVisibleGrowthSection && <HeaderCard title={`2. Tamizaje de alteraciones en el crecimiento - ${selectedFetusLabel}`}><Grid container spacing={3}>{isFieldVisible(hiddenFields, 'tamizajedbp') && <><InfoField label="DBP" value={selectedFetus?.growth_screening.dbp.value} sm={3} /><InfoField label="DBP SDG" value={selectedFetus?.growth_screening.dbp.sdg} sm={3} /></>}{isFieldVisible(hiddenFields, 'tamizajelcc') && <><InfoField label="LCC" value={selectedFetus?.growth_screening.lcc.value} sm={3} /><InfoField label="LCC SDG" value={selectedFetus?.growth_screening.lcc.sdg} sm={3} /></>}{isFieldVisible(hiddenFields, 'uobafetometria') && <InfoField label="Fetometria promedio" value={selectedFetus?.growth_screening.average_fetometry} />}</Grid></HeaderCard>}
            {hasVisibleBasicScreeningSection && <HeaderCard title={`3. Tamizaje obstetrico basico - ${selectedFetusLabel}`}><Grid container spacing={3}>{isFieldVisible(hiddenFields, 'tobsacogest') && <InfoField label="Saco gestacional" value={selectedFetus?.basic_screening.gestational_sac} />}{isFieldVisible(hiddenFields, 'tobcarsacogest') && <InfoField label="Caracteristicas del saco" value={selectedFetus?.basic_screening.gestational_sac_characteristics} />}{isFieldVisible(hiddenFields, 'tobreacciondecidual') && <InfoField label="Reaccion decidual" value={selectedFetus?.basic_screening.decidual_reaction} />}{isFieldVisible(hiddenFields, 'tobvesiculavitelina') && <InfoField label="Vesicula vitelina (mm)" value={selectedFetus?.basic_screening.yolk_vesicle_mm} />}{isFieldVisible(hiddenFields, 'tobcarvesiculavitelina') && <InfoField label="Caracteristicas de vesicula vitelina" value={selectedFetus?.basic_screening.yolk_vesicle_characteristics} />}{isFieldVisible(hiddenFields, 'tobembrion') && <InfoField label="Embrion" value={selectedFetus?.basic_screening.embryo} />}{isFieldVisible(hiddenFields, 'tobfreccardembrion') && <InfoField label="Frecuencia cardiaca del embrion" value={selectedFetus?.basic_screening.embryonic_heart_rate} />}{isFieldVisible(hiddenFields, 'tobuteroanexos') && <InfoField label="Utero y anexos" value={selectedFetus?.basic_screening.uterus_and_adnexa} />}{isFieldVisible(hiddenFields, 'toblongcervical') && <InfoField label="Longitud cervical" value={selectedFetus?.basic_screening.cervical_length} />}{isFieldVisible(hiddenFields, 'toborificiocervicalint') && <InfoField label="Orificio cervical interno" value={selectedFetus?.basic_screening.internal_cervical_os} />}</Grid></HeaderCard>}
            <UltrasoundInterpretationDisplay items={payload.interpretation_ultrasounds} />
            {hasVisibleConclusionSection && <HeaderCard title="5. Conclusion"><Grid container spacing={3}>{isFieldVisible(hiddenFields, 'uobcnumfetos') && <InfoField label="Numero de fetos" value={payload.conclusion.fetus_count_risk} />}{isFieldVisible(hiddenFields, 'uobccrecimiento') && <InfoField label="Crecimiento" value={payload.conclusion.growth_risk} />}{isFieldVisible(hiddenFields, 'uobcfrecuencia') && <InfoField label="Frecuencia cardiaca" value={payload.conclusion.frequency_risk} />}{isFieldVisible(hiddenFields, 'uobcdatospron') && <InfoField label="Datos de pronostico" value={payload.conclusion.prognosis_data === 'buen' ? 'Buen pronostico' : payload.conclusion.prognosis_data === 'mal' ? 'Mal pronostico' : payload.conclusion.prognosis_data} />}{isFieldVisible(hiddenFields, 'uobcuteroyanex') && <InfoField label="Utero y anexos" value={payload.conclusion.uterus_and_adnexa_risk} />}{isFieldVisible(hiddenFields, 'estudiorecomendadio') && <InfoField label="Siguiente estudio recomendado" value={payload.conclusion.recommended_next_study} />}{isFieldVisible(hiddenFields, 'auxfechastudio') && <InfoField label="Fecha inicio del siguiente estudio" value={formatDateDisplay(payload.conclusion.recommended_start_date)} />}{isFieldVisible(hiddenFields, 'auxfechastudio2') && <InfoField label="Fecha fin del siguiente estudio" value={formatDateDisplay(payload.conclusion.recommended_end_date)} />}{isFieldVisible(hiddenFields, 'uobccomentarios') && <InfoField label="Comentarios" value={payload.conclusion.comments} xs={12} sm={12} />}</Grid></HeaderCard>}
          </Box>
        )}
      </Paper>
    </LocalizationProvider>
  );
}

export default memo(PatientFetalVitalityReportBuilder);
