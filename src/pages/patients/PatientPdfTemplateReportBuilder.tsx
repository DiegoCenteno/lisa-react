import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Divider,
  Dialog,
  DialogContent,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormLabel,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  TextField,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  consultationService,
  type PatientPdfTemplateBuilderData,
  type PatientPdfTemplateBuilderField,
} from '../../api/consultationService';
import { studyDeliveryService } from '../../api/studyDeliveryService';
import ClickableDateField from '../../components/ClickableDateField';
import { decodeClinicalHistory } from '../../utils/clinicalHistory';
import { getPdfReportTemplateCategoryLabel } from '../../utils/pdfReportTemplateLabels';
import type { Patient, PendingStudyDeliveryLink } from '../../types';

interface PatientPdfTemplateReportBuilderProps {
  patientId: number;
  templateId: number;
  initialStudyDeliveryId?: number | null;
  onBack: () => void;
  onGenerated?: () => Promise<void> | void;
}

type FieldValue = string | boolean | string[];
type SummaryItem = { label: string; value: string };
const CREATE_STUDY_DELIVERY_OPTION = '__create_study_delivery_today__';

function getDraftStorageKey(patientId: number, templateId: number): string {
  return `pdf-template-builder-draft:${patientId}:${templateId}`;
}

function normalizeInitialValues(data: PatientPdfTemplateBuilderData): Record<string, FieldValue> {
  const values: Record<string, FieldValue> = {};

  data.sections.forEach((section) => {
    section.fields.forEach((field) => {
      values[field.field_key] = field.initial_value;
    });
  });

  return values;
}

function resolveFieldWidth(field: PatientPdfTemplateBuilderField): { xs: number; md: number } {
  const xs = field.ui?.xs && [2, 3, 4, 6, 12].includes(field.ui.xs) ? field.ui.xs : 12;
  const md = field.ui?.md && [2, 3, 4, 6, 12].includes(field.ui.md) ? field.ui.md : 6;
  return { xs, md };
}

function buildPdfDownloadName(baseName: string): string {
  const normalized = (baseName || 'reporte_pdf')
    .trim()
    .replace(/[^A-Za-z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '');

  return `${normalized || 'reporte_pdf'}.pdf`;
}

function buildSavedSnapshot(
  values: Record<string, FieldValue>,
  selectedStudyDeliveryId: string
): string {
  return JSON.stringify({
    values,
    selectedStudyDeliveryId: selectedStudyDeliveryId || '',
  });
}

function formatDateTimeValue(value?: string | null): string {
  if (!value) return '';

  const normalized = value.includes(' ') ? value.replace(' ', 'T') : value;
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString('es-MX', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function buildCreateStudyDeliveryOptionLabel(data: PatientPdfTemplateBuilderData | null): string {
  const studyName = data?.template.study_type?.name?.trim() || 'Estudio';
  const timestamp = new Date().toLocaleString('es-MX', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  return `Iniciar toma de muestra hoy | ${studyName} | ${timestamp}`;
}

function pushSummaryItem(items: SummaryItem[], label: string, value: unknown) {
  if (Array.isArray(value)) {
    const normalized = value
      .map((item) => String(item ?? '').trim())
      .filter(Boolean)
      .join(', ');
    if (normalized) {
      items.push({ label, value: normalized });
    }
    return;
  }

  const normalized = String(value ?? '').trim();
  if (normalized) {
    items.push({ label, value: normalized });
  }
}

function buildClinicalHistorySummary(data: PatientPdfTemplateBuilderData): SummaryItem[] {
  const patient = {
    id: data.patient.id,
    name: '',
    last_name: '',
    allergy: data.patient.allergy ?? '',
    datahc: data.patient.datahc,
  } as Patient;

  const history = decodeClinicalHistory(patient);
  const items: SummaryItem[] = [];

  pushSummaryItem(items, 'Grupo sanguÃ­neo y RH', history.hereditary_background.blood_type_rh);
  pushSummaryItem(items, 'Origen', history.personal_non_pathological.origin);
  pushSummaryItem(items, 'Residencia', history.personal_non_pathological.residence);
  pushSummaryItem(items, 'Estado civil', history.personal_non_pathological.civil_status);
  pushSummaryItem(items, 'ReligiÃ³n', history.personal_non_pathological.religion);
  pushSummaryItem(items, 'Escolaridad', history.personal_non_pathological.education);
  pushSummaryItem(items, 'OcupaciÃ³n', history.personal_non_pathological.occupation);
  pushSummaryItem(items, 'ToxicomanÃ­as', history.personal_non_pathological.substance_use);
  pushSummaryItem(items, 'FÃ¡rmacos', history.personal_non_pathological.medications);
  pushSummaryItem(items, 'Exposiciones', history.personal_non_pathological.exposures);
  pushSummaryItem(items, 'Tabaquismo', history.personal_non_pathological.smoking);
  pushSummaryItem(items, 'Alcohol', history.personal_non_pathological.alcohol);
  pushSummaryItem(items, 'Relaciones homosexuales', history.personal_non_pathological.homosexual_relations);
  pushSummaryItem(items, 'Ejercicio', history.personal_non_pathological.exercise);
  pushSummaryItem(items, 'Alergias', history.personal_pathological.allergies);
  pushSummaryItem(items, 'Enfermedades degenerativas', history.personal_pathological.chronic_diseases);
  pushSummaryItem(items, 'CirugÃ­as', history.personal_pathological.surgeries);
  pushSummaryItem(items, 'Transfusiones', history.personal_pathological.transfusions);
  pushSummaryItem(items, 'Fracturas', history.personal_pathological.fractures);
  pushSummaryItem(items, 'Menarca', history.gynecological?.menarche);
  pushSummaryItem(items, 'Ciclos menstruales', history.gynecological?.menstrual_cycles);
  pushSummaryItem(items, 'Embarazada', history.gynecological?.pregnant ? 'SÃ­' : '');
  pushSummaryItem(items, 'FUR', history.gynecological?.last_menstruation_date);
  pushSummaryItem(items, 'IVSA', history.gynecological?.ivsa);
  pushSummaryItem(items, 'Parejas sexuales', history.gynecological?.sexual_partners);
  pushSummaryItem(items, 'ETS', history.gynecological?.std);
  pushSummaryItem(items, 'CitologÃ­a', history.gynecological?.cytology);
  pushSummaryItem(items, 'PlanificaciÃ³n familiar', history.gynecological?.family_planning);
  pushSummaryItem(items, 'Gestas', history.gynecological?.gestations);
  pushSummaryItem(items, 'Partos', history.gynecological?.deliveries);
  pushSummaryItem(items, 'CesÃ¡reas', history.gynecological?.cesareans);
  pushSummaryItem(items, 'Abortos', history.gynecological?.abortions);
  pushSummaryItem(items, 'EctÃ³picos', history.gynecological?.ectopic);
  pushSummaryItem(items, 'Molares', history.gynecological?.molar);
  pushSummaryItem(items, 'Climaterio', history.gynecological?.climacteric_symptoms);
  pushSummaryItem(items, 'Control prenatal', history.gynecological?.prenatal_care);

  return items;
}

function buildLastSoapSummary(data: PatientPdfTemplateBuilderData): SummaryItem[] {
  const consultation = data.last_consultation;
  if (!consultation) {
    return [];
  }

  const items: SummaryItem[] = [];
  pushSummaryItem(items, 'Fecha de consulta', formatDateTimeValue(consultation.created_at));
  pushSummaryItem(items, 'Padecimiento actual', consultation.currentcondition);
  pushSummaryItem(items, 'Fecha de inicio', consultation.ailingdate);
  pushSummaryItem(items, 'Talla', consultation.height);
  pushSummaryItem(items, 'Peso', consultation.weight);
  pushSummaryItem(items, 'TA', consultation.ta);
  pushSummaryItem(items, 'Temperatura', consultation.temp);
  pushSummaryItem(items, 'FC', consultation.fc);
  pushSummaryItem(items, 'OS', consultation.os);
  pushSummaryItem(items, 'Estudios', consultation.studies);
  pushSummaryItem(items, 'ExploraciÃ³n', consultation.examination);
  pushSummaryItem(items, 'DiagnÃ³sticos', consultation.diagnostics);
  pushSummaryItem(
    items,
    'Medicamentos',
    (consultation.medications ?? [])
      .map((item) => {
        const name = String(item.medicament ?? '').trim();
        const prescription = String(item.prescription ?? '').trim();
        return prescription ? `${name} (${prescription})` : name;
      })
      .filter(Boolean)
  );
  pushSummaryItem(items, 'Indicaciones', consultation.indicaciones);
  pushSummaryItem(items, 'Notas', consultation.notes);

  return items;
}

export default function PatientPdfTemplateReportBuilder({
  patientId,
  templateId,
  initialStudyDeliveryId = null,
  onBack,
  onGenerated,
}: PatientPdfTemplateReportBuilderProps) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [data, setData] = useState<PatientPdfTemplateBuilderData | null>(null);
  const [values, setValues] = useState<Record<string, FieldValue>>({});
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [soapExpanded, setSoapExpanded] = useState(false);
  const [creatingStudyDelivery, setCreatingStudyDelivery] = useState(false);
  const [selectedStudyDeliveryId, setSelectedStudyDeliveryId] = useState(
    initialStudyDeliveryId ? String(initialStudyDeliveryId) : ''
  );
  const [savedReportId, setSavedReportId] = useState<number | null>(null);
  const [savedSnapshot, setSavedSnapshot] = useState<string | null>(null);

  useEffect(() => {
    setSelectedStudyDeliveryId(initialStudyDeliveryId ? String(initialStudyDeliveryId) : '');
  }, [initialStudyDeliveryId, patientId, templateId]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        window.URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const closePreviewDialog = () => {
    if (previewUrl) {
      window.URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setPreviewOpen(false);
  };

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await consultationService.getPatientPdfReportTemplateBuilder(
          patientId,
          templateId,
          undefined,
          selectedStudyDeliveryId ? Number(selectedStudyDeliveryId) : null
        );
        if (cancelled) return;
        setData(response);
        const initialValues = normalizeInitialValues(response);
        const savedValues = response.saved_report?.report_payload?.submitted_values ?? {};
        const hasSavedReport = Boolean(response.saved_report?.id);
        const baseValues = Object.keys(initialValues).reduce<Record<string, FieldValue>>((accumulator, key) => {
          accumulator[key] = Object.prototype.hasOwnProperty.call(savedValues, key)
            ? savedValues[key]
            : initialValues[key];
          return accumulator;
        }, {});
        const draftKey = getDraftStorageKey(patientId, templateId);
        const savedStudyDeliveryId = response.saved_report?.study_delivery_id;

        setSavedReportId(response.saved_report?.id ?? null);
        if (typeof savedStudyDeliveryId === 'number' && savedStudyDeliveryId > 0 && !selectedStudyDeliveryId) {
          setSelectedStudyDeliveryId(String(savedStudyDeliveryId));
        }

        try {
          const rawDraft = localStorage.getItem(draftKey);
          if (rawDraft) {
            const parsedDraft = JSON.parse(rawDraft) as {
              values?: Record<string, FieldValue>;
              selectedStudyDeliveryId?: string;
            };

            const draftValues = parsedDraft.values ?? {};
            const mergedValues = Object.keys(baseValues).reduce<Record<string, FieldValue>>((accumulator, key) => {
              accumulator[key] = Object.prototype.hasOwnProperty.call(draftValues, key)
                ? draftValues[key]
                : baseValues[key];
              return accumulator;
            }, {});

            setValues(mergedValues);
            const nextSelectedStudyDeliveryId = typeof parsedDraft.selectedStudyDeliveryId === 'string'
              ? parsedDraft.selectedStudyDeliveryId
              : (typeof savedStudyDeliveryId === 'number' && savedStudyDeliveryId > 0 ? String(savedStudyDeliveryId) : '');
            setSavedSnapshot(
              hasSavedReport
                ? buildSavedSnapshot(
                    baseValues,
                    typeof savedStudyDeliveryId === 'number' && savedStudyDeliveryId > 0 ? String(savedStudyDeliveryId) : ''
                  )
                : null
            );
            if (typeof nextSelectedStudyDeliveryId === 'string') {
              setSelectedStudyDeliveryId(nextSelectedStudyDeliveryId);
            }
            return;
          }
        } catch {
          // Ignore malformed local drafts and continue with fresh values.
        }

        setValues(baseValues);
        setSavedSnapshot(
          hasSavedReport
            ? buildSavedSnapshot(
                baseValues,
                typeof savedStudyDeliveryId === 'number' && savedStudyDeliveryId > 0 ? String(savedStudyDeliveryId) : ''
              )
            : null
        );
      } catch (loadError) {
        console.error('Error cargando builder PDF del paciente:', loadError);
        if (!cancelled) {
          setError('No se pudo cargar la plantilla PDF seleccionada.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [patientId, selectedStudyDeliveryId, templateId]);

  useEffect(() => {
    if (!data) {
      return;
    }

    const draftKey = getDraftStorageKey(patientId, templateId);

    try {
      localStorage.setItem(
        draftKey,
        JSON.stringify({
          values,
          selectedStudyDeliveryId,
        })
      );
    } catch {
      // Ignore storage persistence errors.
    }
  }, [data, patientId, templateId, values, selectedStudyDeliveryId]);

  const fieldIndex = useMemo(() => {
    const index: Record<string, PatientPdfTemplateBuilderField> = {};
    data?.sections.forEach((section) => {
      section.fields.forEach((field) => {
        index[field.field_key] = field;
      });
    });
    return index;
  }, [data]);

  const updateFieldValue = (fieldKey: string, value: FieldValue) => {
    setMessage(null);
    setValues((current) => ({
      ...current,
      [fieldKey]: value,
    }));
  };

  const clinicalHistorySummary = useMemo(() => {
    return data ? buildClinicalHistorySummary(data) : [];
  }, [data]);

  const lastSoapSummary = useMemo(() => {
    return data ? buildLastSoapSummary(data) : [];
  }, [data]);

  const availableStudyLinks = useMemo(() => {
    const items: PendingStudyDeliveryLink[] = [];
    const seenIds = new Set<number>();

    const pushItem = (item?: PendingStudyDeliveryLink | null) => {
      if (!item || typeof item.id !== 'number' || seenIds.has(item.id)) {
        return;
      }
      seenIds.add(item.id);
      items.push(item);
    };

    (data?.available_study_links ?? []).forEach((item) => pushItem(item));
    pushItem(data?.linked_study_delivery ?? null);

    return items;
  }, [data]);

  const canCreateStudyDelivery = Boolean(data?.template.study_type?.id);

  const currentSnapshot = useMemo(
    () => buildSavedSnapshot(values, selectedStudyDeliveryId),
    [values, selectedStudyDeliveryId]
  );

  const isDirty = savedSnapshot !== null
    ? currentSnapshot !== savedSnapshot
    : Object.keys(values).length > 0;

  const handleSaveDraft = async () => {
    if (!data) {
      return;
    }

    setSavingDraft(true);
    setError(null);
    setMessage(null);

    try {
      const linkedStudyDeliveryId = selectedStudyDeliveryId ? Number(selectedStudyDeliveryId) : null;
      const savedReport = await consultationService.savePatientPdfTemplateDraft(
        patientId,
        templateId,
        values,
        undefined,
        linkedStudyDeliveryId
      );

      setSavedReportId(savedReport.id);
      setSavedSnapshot(currentSnapshot);
      setMessage('Formulario guardado correctamente.');
    } catch (saveError) {
      console.error('Error guardando formulario del reporte PDF:', saveError);
      setError('No se pudo guardar el formulario del reporte.');
    } finally {
      setSavingDraft(false);
    }
  };

  const handleDownloadFinalPdf = async () => {
    if (!data) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const linkedStudyDeliveryId = selectedStudyDeliveryId ? Number(selectedStudyDeliveryId) : null;
      const blob = await consultationService.downloadPatientPdfTemplateFinalReport(
        patientId,
        templateId,
        values,
        undefined,
        linkedStudyDeliveryId,
        savedReportId
      );
      const blobUrl = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = blobUrl;
      anchor.download = buildPdfDownloadName(data.template.output_file_name || data.template.name);
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(blobUrl);
      localStorage.removeItem(getDraftStorageKey(patientId, templateId));
      setSavedSnapshot(currentSnapshot);

      await onGenerated?.();
    } catch (downloadError) {
      console.error('Error generando PDF final desde plantilla:', downloadError);
      setError('No se pudo generar el PDF final desde esta plantilla.');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePreviewPdf = async () => {
    if (!data) {
      return;
    }

    setPreviewLoading(true);
    setError(null);

    try {
      const linkedStudyDeliveryId = selectedStudyDeliveryId ? Number(selectedStudyDeliveryId) : null;
      const blob = await consultationService.previewPatientPdfTemplateReport(
        patientId,
        templateId,
        values,
        undefined,
        linkedStudyDeliveryId
      );

      if (previewUrl) {
        window.URL.revokeObjectURL(previewUrl);
      }

      const blobUrl = window.URL.createObjectURL(blob);
      setPreviewUrl(blobUrl);
      setPreviewOpen(true);
    } catch (previewError) {
      console.error('Error generando previsualizacion del PDF:', previewError);
      setError('No se pudo generar la previsualizacion del PDF.');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleStudyDeliverySelection = async (nextValue: string) => {
    setMessage(null);

    if (nextValue !== CREATE_STUDY_DELIVERY_OPTION) {
      setSelectedStudyDeliveryId(nextValue);
      return;
    }

    if (!data?.template.study_type?.id) {
      setError('Esta plantilla no tiene un tipo de estudio ligado para iniciar una toma de muestra.');
      return;
    }

    const officeId = Number(sessionStorage.getItem('cached_office_id') ?? 0);
    if (officeId <= 0) {
      setError('No fue posible resolver el consultorio actual para iniciar la toma de muestra.');
      return;
    }

    setCreatingStudyDelivery(true);
    setError(null);

    try {
      const createdStudyDeliveries = await studyDeliveryService.createSampleStudyDelivery({
        office_id: officeId,
        patient_id: patientId,
        processing_status: 'sample_collected',
        study_type_ids: [Number(data.template.study_type.id)],
      });

      const createdStudyDelivery = createdStudyDeliveries.find(
        (item) => Number(item.study_type_id) === Number(data.template.study_type?.id)
      ) ?? createdStudyDeliveries[0];

      if (!createdStudyDelivery?.id) {
        setError('No fue posible iniciar una nueva toma de muestra para este reporte.');
        return;
      }

      setSelectedStudyDeliveryId(String(createdStudyDelivery.id));
      setMessage('Se inició una nueva toma de muestra y quedó seleccionada para este reporte.');
    } catch (creationError) {
      console.error('Error creando toma de muestra desde reportes PDF:', creationError);
      setError('No fue posible iniciar la toma de muestra desde este reporte.');
    } finally {
      setCreatingStudyDelivery(false);
    }
  };

  const renderField = (field: PatientPdfTemplateBuilderField) => {
    const currentValue = values[field.field_key];
    const disabled = !field.editable;
    const visibleHelperLines = [field.help_text]
      .filter(Boolean)
      .join(' ');

    if (field.field_type === 'textarea') {
      return (
        <TextField
          fullWidth
          multiline
          minRows={4}
          size="small"
          label={field.label}
          value={typeof currentValue === 'string' ? currentValue : ''}
          onChange={(event) => updateFieldValue(field.field_key, event.target.value)}
          disabled={disabled}
          required={field.is_required}
          helperText={visibleHelperLines || undefined}
          inputProps={field.max_length ? { maxLength: field.max_length } : undefined}
          placeholder={field.placeholder || undefined}
        />
      );
    }

    if (field.field_type === 'text') {
      return (
        <TextField
          fullWidth
          size="small"
          label={field.label}
          value={typeof currentValue === 'string' ? currentValue : ''}
          onChange={(event) => updateFieldValue(field.field_key, event.target.value)}
          disabled={disabled}
          required={field.is_required}
          helperText={visibleHelperLines || undefined}
          inputProps={field.max_length ? { maxLength: field.max_length } : undefined}
          placeholder={field.placeholder || undefined}
        />
      );
    }

    if (field.field_type === 'date') {
      return (
        <ClickableDateField
          fullWidth
          size="small"
          label={field.label}
          value={typeof currentValue === 'string' ? currentValue : ''}
          onChange={(nextValue) => updateFieldValue(field.field_key, nextValue)}
          disabled={disabled}
          helperText={visibleHelperLines || undefined}
        />
      );
    }

    if (field.field_type === 'checkbox') {
      return (
        <FormControl component="fieldset" fullWidth>
          <FormControlLabel
            control={(
              <Checkbox
                checked={Boolean(currentValue)}
                onChange={(event) => updateFieldValue(field.field_key, event.target.checked)}
                disabled={disabled}
              />
            )}
            label={field.label}
            sx={{ m: 0 }}
          />
          {visibleHelperLines ? (
            <Typography variant="caption" color="text.secondary">
              {visibleHelperLines}
            </Typography>
          ) : null}
        </FormControl>
      );
    }

    if (field.field_type === 'select') {
      return (
        <TextField
          select
          fullWidth
          size="small"
          label={field.label}
          value={typeof currentValue === 'string' ? currentValue : ''}
          onChange={(event) => updateFieldValue(field.field_key, event.target.value)}
          disabled={disabled}
          required={field.is_required}
          helperText={visibleHelperLines || undefined}
        >
          <MenuItem value="">Selecciona una opciÃ³n</MenuItem>
          {field.options.map((option) => (
            <MenuItem key={option.option_key} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>
      );
    }

    if (field.field_type === 'radio_group') {
      return (
        <FormControl component="fieldset" fullWidth disabled={disabled} required={field.is_required}>
          <FormLabel component="legend">{field.label}</FormLabel>
          <RadioGroup
            value={typeof currentValue === 'string' ? currentValue : ''}
            onChange={(event) => updateFieldValue(field.field_key, event.target.value)}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 0,
              '& .MuiButtonBase-root': {
                p: 0,
              },
            }}
          >
            {field.options.map((option) => (
              <FormControlLabel
                key={option.option_key}
                value={option.value}
                control={<Radio sx={{ p: 0 }} />}
                label={option.label}
                sx={{
                  m: 0,
                  minHeight: 0,
                  alignItems: 'center',
                  gap: 0.5,
                  '& .MuiFormControlLabel-label': {
                    lineHeight: 1.15,
                  },
                }}
              />
            ))}
          </RadioGroup>
          {visibleHelperLines ? (
            <Typography variant="caption" color="text.secondary">
              {visibleHelperLines}
            </Typography>
          ) : null}
        </FormControl>
      );
    }

    if (field.field_type === 'checkbox_group') {
      const selectedValues = Array.isArray(currentValue) ? currentValue : [];

      return (
        <FormControl component="fieldset" fullWidth disabled={disabled} required={field.is_required}>
          <FormLabel component="legend">{field.label}</FormLabel>
          <FormGroup
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 0,
              '& .MuiButtonBase-root': {
                p: 0,
              },
            }}
          >
            {field.options.map((option) => {
              const checked = selectedValues.includes(option.value);

              return (
                <FormControlLabel
                  key={option.option_key}
                  control={(
                    <Checkbox
                      checked={checked}
                      sx={{ p: 0 }}
                      onChange={(event) => {
                        const nextValues = event.target.checked
                          ? [...selectedValues, option.value]
                          : selectedValues.filter((value) => value !== option.value);
                        updateFieldValue(field.field_key, nextValues);
                      }}
                    />
                  )}
                  label={option.label}
                  sx={{
                    m: 0,
                    minHeight: 0,
                    alignItems: 'center',
                    gap: 0.5,
                    '& .MuiFormControlLabel-label': {
                      lineHeight: 1.15,
                    },
                  }}
                />
              );
            })}
          </FormGroup>
          {visibleHelperLines ? (
            <Typography variant="caption" color="text.secondary">
              {visibleHelperLines}
            </Typography>
          ) : null}
        </FormControl>
      );
    }

    return (
      <Alert severity="warning">
        No se pudo renderizar el tipo de campo <strong>{field.field_type}</strong>.
      </Alert>
    );
  };

  if (loading) {
    return (
      <Paper sx={{ p: 3, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      </Paper>
    );
  }

  if (error || !data) {
    return (
      <Paper sx={{ p: 3, borderRadius: 2 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error || 'No se pudo cargar la plantilla PDF.'}
        </Alert>
        <Button variant="outlined" onClick={onBack}>
          Volver
        </Button>
      </Paper>
    );
  }

  const requiresStudyLink = false;

  return (
    <Paper sx={{ p: 3, borderRadius: 2 }}>
      <Box sx={{ mb: 2 }}>
        <Button variant="text" onClick={onBack} sx={{ px: 0, mb: 1, minWidth: 0 }}>
          Volver
        </Button>
        <Box>
          <Typography variant="h6" sx={{ color: '#0a8f2f', fontWeight: 700 }}>
            {data.template.name}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
            {getPdfReportTemplateCategoryLabel(data.template.template_category)}
            {data.template.study_type?.name ? ` | ${data.template.study_type.name}` : ''}
            {data.template.laboratory?.name ? ` | ${data.template.laboratory.name}` : ''}
          </Typography>
          <Box
            sx={{
              mt: 2,
              display: 'grid',
              gap: 2,
              width: '100%',
              gridTemplateColumns: {
                xs: '1fr',
                md: (availableStudyLinks.length > 0 || data.linked_study_delivery || canCreateStudyDelivery)
                  ? 'minmax(0, 1fr) minmax(0, 1fr)'
                  : '1fr',
              },
              alignItems: 'start',
            }}
          >
            {(availableStudyLinks.length > 0 || data.linked_study_delivery || canCreateStudyDelivery) ? (
              <TextField
                select
                fullWidth
                label="Toma de muestra (opcional)"
                value={selectedStudyDeliveryId}
                onChange={(event) => { void handleStudyDeliverySelection(event.target.value); }}
                disabled={creatingStudyDelivery}
                helperText={
                  requiresStudyLink
                    ? (availableStudyLinks.length
                      ? 'Selecciona la toma de muestra correspondiente antes de generar el PDF.'
                      : 'No hay tomas de muestra en estatus "Muestra tomada" disponibles para este reporte.')
                    : 'Si lo relacionas, luego también podrás descargarlo desde el control de estudios.'
                }
              >
                <MenuItem value="">{requiresStudyLink ? 'Selecciona una toma de muestra' : 'Sin relación por ahora'}</MenuItem>
                {canCreateStudyDelivery ? (
                  <MenuItem value={CREATE_STUDY_DELIVERY_OPTION}>
                    {buildCreateStudyDeliveryOptionLabel(data)}
                  </MenuItem>
                ) : null}
                {availableStudyLinks.map((studyLink) => (
                  <MenuItem key={studyLink.id} value={String(studyLink.id)}>
                    {studyLink.label}
                  </MenuItem>
                ))}
              </TextField>
            ) : null}
            <TextField
              fullWidth
              label="Paciente"
              value={`${data.patient.full_name}${data.patient.age ? ` | ${data.patient.age} años` : ''}`}
              InputProps={{ readOnly: true }}
            />
          </Box>
        </Box>
      </Box>

      <Alert severity="info" sx={{ mb: 2 }}>
        Revisa los datos antes de generar el PDF final. Al descargarlo también se guardará en el historial de reportes del paciente.
      </Alert>

      {message ? (
        <Alert severity="success" sx={{ mb: 2 }}>
          {message}
        </Alert>
      ) : null}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 3 }}>
        <Accordion expanded={historyExpanded} onChange={(_, expanded) => setHistoryExpanded(expanded)} disableGutters>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography sx={{ fontWeight: 700 }}>Historia clínica</Typography>
          </AccordionSummary>
          <AccordionDetails>
            {clinicalHistorySummary.length > 0 ? (
              <Box sx={{ display: 'grid', gap: 1 }}>
                {clinicalHistorySummary.map((item) => (
                  <Typography key={`${item.label}-${item.value}`} variant="body2">
                    <strong>{item.label}:</strong> {item.value}
                  </Typography>
                ))}
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No hay información clínica disponible con valor.
              </Typography>
            )}
          </AccordionDetails>
        </Accordion>

        <Accordion expanded={soapExpanded} onChange={(_, expanded) => setSoapExpanded(expanded)} disableGutters>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography sx={{ fontWeight: 700 }}>Última consulta SOAP</Typography>
          </AccordionSummary>
          <AccordionDetails>
            {lastSoapSummary.length > 0 ? (
              <Box sx={{ display: 'grid', gap: 1 }}>
                {lastSoapSummary.map((item) => (
                  <Typography key={`${item.label}-${item.value}`} variant="body2">
                    <strong>{item.label}:</strong> {item.value}
                  </Typography>
                ))}
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No hay informaciÃ³n SOAP disponible con valor.
              </Typography>
            )}
          </AccordionDetails>
        </Accordion>
      </Box>

      {(requiresStudyLink || availableStudyLinks.length > 0 || data.linked_study_delivery) ? (
        <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 2, display: 'none' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            Relación con toma de muestra
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5, mb: 1.5 }}>
            {requiresStudyLink
              ? 'Este reporte debe quedar ligado a una toma de muestra para que aparezca en Control de envíos de estudios.'
              : 'Puedes ligar este reporte a una toma de muestra para darle seguimiento desde el módulo de estudios.'}
          </Typography>

          <TextField
            select
            fullWidth
            label={requiresStudyLink ? 'Toma de muestra' : 'Toma de muestra (opcional)'}
            value={selectedStudyDeliveryId}
            onChange={(event) => {
              setMessage(null);
              setSelectedStudyDeliveryId(event.target.value);
            }}
            helperText={
              requiresStudyLink
                ? (availableStudyLinks.length
                  ? 'Selecciona la toma de muestra correspondiente antes de generar el PDF.'
                  : 'No hay tomas de muestra en estatus "Muestra tomada" disponibles para este reporte.')
                : 'Si lo relacionas, luego podrás descargarlo también desde el control de estudios.'
            }
          >
            <MenuItem value="">{requiresStudyLink ? 'Selecciona una toma de muestra' : 'Sin relación por ahora'}</MenuItem>
            {availableStudyLinks.map((studyLink) => (
              <MenuItem key={studyLink.id} value={String(studyLink.id)}>
                {studyLink.label}
              </MenuItem>
            ))}
          </TextField>
        </Paper>
      ) : null}

      <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 2, display: 'none' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          Paciente
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
          {data.patient.full_name}
          {data.patient.age ? ` | ${data.patient.age} años` : ''}
        </Typography>
      </Paper>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {data.sections.map((section) => (
          <Paper key={section.label} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
              {section.label}
            </Typography>

            <Box
              sx={{
                display: 'grid',
                gap: 1.25,
                gridTemplateColumns: {
                  xs: 'repeat(12, minmax(0, 1fr))',
                  md: 'repeat(12, minmax(0, 1fr))',
                },
              }}
            >
              {section.fields.map((field) => {
                const width = resolveFieldWidth(field);

                return (
                  <Box
                    key={field.field_key}
                    sx={{
                      gridColumn: {
                        xs: `span ${width.xs}`,
                        md: `span ${width.md}`,
                      },
                    }}
                  >
                    {renderField(fieldIndex[field.field_key] ?? field)}
                  </Box>
                );
              })}
            </Box>
          </Paper>
        ))}
      </Box>

      <Divider sx={{ my: 3 }} />

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, flexWrap: 'wrap' }}>
        <Button color="inherit" onClick={onBack}>
          Cancelar
        </Button>
        <Button
          variant="outlined"
          onClick={() => void handleSaveDraft()}
          disabled={savingDraft || submitting || previewLoading || creatingStudyDelivery || !isDirty}
        >
          {savingDraft ? 'Guardando formulario...' : 'Guardar formulario'}
        </Button>
        <Button
          variant="outlined"
          onClick={() => void handlePreviewPdf()}
          disabled={previewLoading || submitting || savingDraft || creatingStudyDelivery}
        >
          {previewLoading ? 'Generando vista previa...' : 'Previsualizar PDF'}
        </Button>
        <Button
          variant="contained"
          onClick={() => void handleDownloadFinalPdf()}
          disabled={submitting || savingDraft || creatingStudyDelivery || !savedReportId || isDirty}
        >
          {submitting ? 'Generando PDF final...' : 'Descargar PDF final'}
        </Button>
      </Box>

      <Dialog
        open={previewOpen}
        onClose={closePreviewDialog}
        fullWidth
        maxWidth={false}
        PaperProps={{
          sx: {
            width: 'min(96vw, 1460px)',
            height: 'min(94vh, 1100px)',
            maxWidth: 'none',
            m: 1.5,
          },
        }}
      >
        <DialogContent sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Previsualización del documento
          </Typography>
          <Alert severity="warning">
            Esta previsualización te permite validar cómo va quedando el documento antes de guardarlo. Si el resultado es correcto, te recomendamos cerrar esta vista y después generar el PDF final para almacenarlo en el historial del paciente y dar seguimiento formal al estudio.
          </Alert>
          <Box sx={{ flex: 1, minHeight: 0, border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden', bgcolor: '#f7f7f7' }}>
            {previewUrl ? (
              <Box
                component="iframe"
                src={previewUrl}
                title="Previsualización PDF"
                sx={{ width: '100%', height: '100%', border: 0, minHeight: '72vh' }}
              />
            ) : null}
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, flexWrap: 'wrap' }}>
            <Button onClick={closePreviewDialog}>Cerrar previsualización</Button>
          </Box>
        </DialogContent>
      </Dialog>
    </Paper>
  );
}

