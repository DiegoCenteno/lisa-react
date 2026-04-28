import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Divider,
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
import {
  consultationService,
  type PatientPdfTemplateBuilderData,
  type PatientPdfTemplateBuilderField,
} from '../../api/consultationService';
import { getPdfReportTemplateCategoryLabel } from '../../utils/pdfReportTemplateLabels';

interface PatientPdfTemplateReportBuilderProps {
  patientId: number;
  templateId: number;
  initialStudyDeliveryId?: number | null;
  onBack: () => void;
  onGenerated?: () => Promise<void> | void;
}

type FieldValue = string | boolean | string[];

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

export default function PatientPdfTemplateReportBuilder({
  patientId,
  templateId,
  initialStudyDeliveryId = null,
  onBack,
  onGenerated,
}: PatientPdfTemplateReportBuilderProps) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [data, setData] = useState<PatientPdfTemplateBuilderData | null>(null);
  const [values, setValues] = useState<Record<string, FieldValue>>({});
  const [error, setError] = useState<string | null>(null);
  const [selectedStudyDeliveryId, setSelectedStudyDeliveryId] = useState(
    initialStudyDeliveryId ? String(initialStudyDeliveryId) : ''
  );

  useEffect(() => {
    setSelectedStudyDeliveryId(initialStudyDeliveryId ? String(initialStudyDeliveryId) : '');
  }, [initialStudyDeliveryId, patientId, templateId]);

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
        setValues(normalizeInitialValues(response));
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
    setValues((current) => ({
      ...current,
      [fieldKey]: value,
    }));
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
        linkedStudyDeliveryId
      );
      const blobUrl = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = blobUrl;
      anchor.download = buildPdfDownloadName(data.template.output_file_name || data.template.name);
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(blobUrl);

      await onGenerated?.();
    } catch (downloadError) {
      console.error('Error generando PDF final desde plantilla:', downloadError);
      setError('No se pudo generar el PDF final desde esta plantilla.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderField = (field: PatientPdfTemplateBuilderField) => {
    const currentValue = values[field.field_key];
    const disabled = !field.editable;
    const visibleHelperLines = [field.help_text]
      .filter(Boolean)
      .join(' ');
    const helperLines = [field.help_text, disabled ? 'Se llena automáticamente desde la plantilla.' : null]
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
          helperText={visibleHelperLines || ' '}
          inputProps={field.max_length ? { maxLength: field.max_length } : undefined}
          placeholder={field.placeholder || undefined}
        />
      );
    }

    if (field.field_type === 'text' || field.field_type === 'date') {
      return (
        <TextField
          fullWidth
          size="small"
          label={field.label}
          value={typeof currentValue === 'string' ? currentValue : ''}
          onChange={(event) => updateFieldValue(field.field_key, event.target.value)}
          disabled={disabled}
          required={field.is_required}
          helperText={visibleHelperLines || ' '}
          inputProps={field.max_length ? { maxLength: field.max_length } : undefined}
          placeholder={field.placeholder || undefined}
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
          />
          <Typography variant="caption" color="text.secondary">
            {visibleHelperLines || ' '}
          </Typography>
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
          helperText={visibleHelperLines || ' '}
        >
          <MenuItem value="">Selecciona una opción</MenuItem>
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
            row
            value={typeof currentValue === 'string' ? currentValue : ''}
            onChange={(event) => updateFieldValue(field.field_key, event.target.value)}
            sx={{ columnGap: 1.5, rowGap: 0.25 }}
          >
            {field.options.map((option) => (
              <FormControlLabel
                key={option.option_key}
                value={option.value}
                control={<Radio />}
                label={option.label}
                sx={{ mr: 1.5 }}
              />
            ))}
          </RadioGroup>
          <Typography variant="caption" color="text.secondary">
            {visibleHelperLines || ' '}
          </Typography>
        </FormControl>
      );
    }

    if (field.field_type === 'checkbox_group') {
      const selectedValues = Array.isArray(currentValue) ? currentValue : [];

      return (
        <FormControl component="fieldset" fullWidth disabled={disabled} required={field.is_required}>
          <FormLabel component="legend">{field.label}</FormLabel>
          <FormGroup row sx={{ columnGap: 1.5, rowGap: 0.25 }}>
            {field.options.map((option) => {
              const checked = selectedValues.includes(option.value);

              return (
                <FormControlLabel
                  key={option.option_key}
                  control={(
                    <Checkbox
                      checked={checked}
                      onChange={(event) => {
                        const nextValues = event.target.checked
                          ? [...selectedValues, option.value]
                          : selectedValues.filter((value) => value !== option.value);
                        updateFieldValue(field.field_key, nextValues);
                      }}
                    />
                  )}
                  label={option.label}
                  sx={{ mr: 1.5 }}
                />
              );
            })}
          </FormGroup>
          <Typography variant="caption" color="text.secondary">
            {visibleHelperLines || ' '}
          </Typography>
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

  const requiresStudyLink = Boolean(data.template.requires_study_link);
  const availableStudyLinks = data.available_study_links ?? [];
  const isStudyLinkMissing = requiresStudyLink && !selectedStudyDeliveryId;

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
              maxWidth: 920,
              gridTemplateColumns: {
                xs: '1fr',
                md: (requiresStudyLink || availableStudyLinks.length > 0 || data.linked_study_delivery) ? 'minmax(0, 1fr) minmax(320px, 360px)' : 'minmax(320px, 360px)',
              },
              alignItems: 'start',
            }}
          >
            {(requiresStudyLink || availableStudyLinks.length > 0 || data.linked_study_delivery) ? (
              <TextField
                select
                fullWidth
                label={requiresStudyLink ? 'Toma de muestra' : 'Toma de muestra (opcional)'}
                value={selectedStudyDeliveryId}
                onChange={(event) => setSelectedStudyDeliveryId(event.target.value)}
                helperText={
                  requiresStudyLink
                    ? (availableStudyLinks.length
                      ? 'Selecciona la toma de muestra correspondiente antes de generar el PDF.'
                      : 'No hay tomas de muestra en estatus "Muestra tomada" disponibles para este reporte.')
                    : 'Si lo relacionas, luego podrÃ¡s descargarlo tambiÃ©n desde el control de estudios.'
                }
              >
                <MenuItem value="">{requiresStudyLink ? 'Selecciona una toma de muestra' : 'Sin relaciÃ³n por ahora'}</MenuItem>
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
              value={`${data.patient.full_name}${data.patient.age ? ` | ${data.patient.age} aÃ±os` : ''}`}
              InputProps={{ readOnly: true }}
            />
          </Box>
        </Box>
      </Box>

      <Alert severity="info" sx={{ mb: 2 }}>
        Revisa los datos antes de generar el PDF final. Al descargarlo también se guardará en el historial de reportes del paciente.
      </Alert>

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
            onChange={(event) => setSelectedStudyDeliveryId(event.target.value)}
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
                gap: 2,
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
        <Button variant="contained" onClick={() => void handleDownloadFinalPdf()} disabled={submitting || isStudyLinkMissing}>
          {submitting ? 'Generando PDF final...' : 'Descargar PDF final'}
        </Button>
      </Box>
    </Paper>
  );
}
