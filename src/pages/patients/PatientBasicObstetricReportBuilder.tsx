import { memo, type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  Grid,
  MenuItem,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import dayjs, { type Dayjs } from 'dayjs';
import 'dayjs/locale/es';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import {
  consultationService,
  type BasicObstetricConclusionPayload,
  type BasicObstetricFetusPayload,
  type BasicObstetricInterpretationUltrasoundPayload,
  type BasicObstetricMeasurementPayload,
  type BasicObstetricReportPayload,
  type PatientReportRecord,
} from '../../api/consultationService';
import { patientService } from '../../api/patientService';
import {
  calculateInterpretationDerivedValues,
  UltrasoundInterpretationDisplay,
  UltrasoundInterpretationSection,
} from './UltrasoundInterpretationSection';

dayjs.locale('es');

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

interface PatientBasicObstetricReportBuilderProps {
  reportId: number;
  onClose: () => void;
  onSaved?: (report: PatientReportRecord<BasicObstetricReportPayload>) => void;
  onError?: (message: string) => void;
  onSuccess?: (message: string) => void;
  startInEditMode?: boolean;
}

type DisplaySectionCardProps = {
  title: string;
  children: ReactNode;
};

type DisplayFieldProps = {
  label: string;
  value?: string | number | null;
  xs?: number;
  sm?: number;
};

const riskOptions = ['bajo riesgo', 'alto riesgo'];
const conclusionFetusCountOptions = [
  { value: 'unico', label: 'Único' },
  { value: 'bicorial - biamniotico', label: 'Bicorial - biamniotico' },
  { value: 'monocorial - biamniotico', label: 'Monocorial - biamniotico' },
  { value: 'monocorial - monoamniotico', label: 'Monocorial - monoamniotico' },
  { value: 'triple', label: 'Triple' },
  { value: 'no valorable', label: 'No valorable' },
];
const presentationOptions = [
  { value: 'cefálico', label: 'Cefálico' },
  { value: 'pélvico', label: 'Pélvico' },
];
const situationOptions = [
  { value: 'longitudinal', label: 'Longitudinal' },
  { value: 'oblicuo', label: 'Oblicuo' },
  { value: 'transverso', label: 'Transverso' },
];
const backOptions = [
  { value: 'derecho', label: 'Derecho' },
  { value: 'izquierdo', label: 'Izquierdo' },
  { value: 'anterior', label: 'Anterior' },
  { value: 'posterior', label: 'Posterior' },
  { value: 'superior', label: 'Superior' },
];
const rhythmOptions = [
  { value: 'normal', label: 'Normal' },
  { value: 'anormal', label: 'Anormal' },
  { value: 'no valorable', label: 'No valorable' },
];
const fetalMovementsOptions = [
  { value: 'presentes', label: 'Presentes' },
  { value: 'ausentes', label: 'Ausentes' },
  { value: 'no valorable', label: 'No valorable' },
];
const placentaLocationOptions = [
  { value: 'anterior', label: 'Anterior' },
  { value: 'posterior', label: 'Posterior' },
  { value: 'fundica', label: 'Fúndica' },
  { value: 'inserción baja', label: 'Inserción baja' },
  { value: 'previa', label: 'Previa' },
];
const normalAbnormalOptions = [
  { value: 'normal', label: 'Normal' },
  { value: 'anormal', label: 'Anormal' },
  { value: 'no valorable', label: 'No valorable' },
];
const internalOsOptions = [
  { value: 'cerrado', label: 'Cerrado' },
  { value: 'abierto', label: 'Abierto' },
];
const fetusCountOptions = [
  { value: 1, label: 'Unico' },
  { value: 2, label: 'Dos' },
  { value: 3, label: 'Triple' },
];
const recommendedStudyOptions = [
  { value: 'tipoest1', label: 'Ultrasonido obstétrico básico' },
  { value: 'tipoest2', label: 'Ultrasonido translucencia nucal' },
  { value: 'tipoest3', label: 'Ultrasonido genético' },
  { value: 'tipoest4', label: 'Ultrasonido estructural' },
  { value: 'tipoest5', label: 'Ultrasonido bienestar fetal' },
  { value: 'tipoest7', label: 'Ultrasonido vitalidad fetal' },
  { value: 'ninguno', label: 'Ninguno' },
];
const defaultRecommendedStudy = 'tipoest2';

function formatDateDisplay(date: Date) {
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

function toDayjsValue(value: string | null | undefined): Dayjs | null {
  if (!value) return null;
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed : null;
}

function normalizeRecommendedEndDate(startDate: string, endDate: string): string {
  const start = toDayjsValue(startDate);
  const end = toDayjsValue(endDate);

  if (!start || !end) {
    return endDate;
  }

  if (!end.isAfter(start, 'day')) {
    return start.add(1, 'day').format('YYYY-MM-DD');
  }

  return endDate;
}

async function flushActiveElement() {
  const activeElement = document.activeElement;
  if (activeElement instanceof HTMLElement) {
    activeElement.blur();
    await new Promise((resolve) => window.setTimeout(resolve, 0));
  }
}

function withDefaultOption(
  value: string | undefined | null,
  options: Array<{ value: string; label: string }>
) {
  return value && value.trim() !== '' ? value : options[0].value;
}

function isFieldVisible(hiddenFields: Set<string>, fieldKey: string) {
  return !hiddenFields.has(fieldKey);
}

function hasDisplayValue(value?: string | number | null) {
  if (value === null || value === undefined) return false;
  if (typeof value === 'number') return true;
  return value.trim().length > 0;
}

function getOptionLabel(
  options: Array<{ value: string | number; label: string }>,
  value?: string | number | null
) {
  const match = options.find((option) => option.value === value);
  return match?.label ?? (value ?? '');
}

function SectionCard({
  children,
  background,
}: {
  children: ReactNode;
  background: string;
}) {
  return (
    <Box
      sx={{
        background,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        p: 2,
      }}
    >
      {children}
    </Box>
  );
}

function DisplaySectionCard({ title, children }: DisplaySectionCardProps) {
  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'rgba(35, 165, 193, 0.18)',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          px: 2.5,
          py: 1.5,
          borderBottom: '1px solid',
          borderColor: 'rgba(35, 165, 193, 0.12)',
          background: 'linear-gradient(180deg, rgba(35,165,193,0.06) 0%, rgba(35,165,193,0.02) 100%)',
        }}
      >
        <Typography variant="h6" fontWeight={700} color="#0d7f1f">
          {title}
        </Typography>
      </Box>
      <CardContent sx={{ p: { xs: 2, md: 3 } }}>{children}</CardContent>
    </Card>
  );
}

function DisplayField({ label, value, xs = 12, sm = 6 }: DisplayFieldProps) {
  if (!hasDisplayValue(value)) {
    return null;
  }

  return (
    <Grid size={{ xs, sm }}>
      <Box sx={{ display: 'grid', gap: 0.4 }}>
        <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 700 }}>
          {label}
        </Typography>
        <Typography variant="body1" sx={{ color: '#16313b', whiteSpace: 'pre-wrap' }}>
          {value}
        </Typography>
      </Box>
    </Grid>
  );
}

function createDefaultFetusPayload(fetusNumber: number): BasicObstetricFetusPayload {
  return {
    fetus_number: fetusNumber,
    growth_screening: {
      dbp: { value: '', sdg: '' },
      cc: { value: '', sdg: '' },
      ca: { value: '', sdg: '' },
      lf: { value: '', sdg: '' },
      average_fetometry: '',
      estimated_weight: '',
      percentile: '',
    },
    basic_screening: {
      presentation: presentationOptions[0].value,
      situation: situationOptions[0].value,
      back: backOptions[0].value,
      fetal_heart_rate: '',
      placenta_cervix_relation: '',
      rhythm: rhythmOptions[0].value,
      fetal_movements: fetalMovementsOptions[0].value,
      placenta_location: placentaLocationOptions[0].value,
      placenta_characteristics: normalAbnormalOptions[0].value,
      amniotic_fluid: normalAbnormalOptions[0].value,
      cvm: '',
      phelan: '',
      uterus_and_adnexa: normalAbnormalOptions[0].value,
      cervical_length: '',
      internal_cervical_os: internalOsOptions[0].value,
    },
  };
}

function buildNormalizedPayload(payload?: BasicObstetricReportPayload | null): BasicObstetricReportPayload {
  const fetusCount = Math.min(Math.max(payload?.study_context?.fetus_count ?? 1, 1), 3);
  const fetuses = Array.from({ length: fetusCount }, (_, index) => {
    const defaultFetus = createDefaultFetusPayload(index + 1);
    const payloadFetus = payload?.fetuses?.[index];
    const basicScreening = {
      ...defaultFetus.basic_screening,
      ...payloadFetus?.basic_screening,
    };

    return {
      ...defaultFetus,
      ...payloadFetus,
      fetus_number: index + 1,
      growth_screening: {
        ...defaultFetus.growth_screening,
        ...payloadFetus?.growth_screening,
        dbp: {
          ...defaultFetus.growth_screening.dbp,
          ...payloadFetus?.growth_screening?.dbp,
        },
        cc: {
          ...defaultFetus.growth_screening.cc,
          ...payloadFetus?.growth_screening?.cc,
        },
        ca: {
          ...defaultFetus.growth_screening.ca,
          ...payloadFetus?.growth_screening?.ca,
        },
        lf: {
          ...defaultFetus.growth_screening.lf,
          ...payloadFetus?.growth_screening?.lf,
        },
      },
      basic_screening: {
        ...basicScreening,
        presentation: withDefaultOption(basicScreening.presentation, presentationOptions),
        situation: withDefaultOption(basicScreening.situation, situationOptions),
        back: withDefaultOption(basicScreening.back, backOptions),
        rhythm: withDefaultOption(basicScreening.rhythm, rhythmOptions),
        fetal_movements: withDefaultOption(basicScreening.fetal_movements, fetalMovementsOptions),
        placenta_location: withDefaultOption(basicScreening.placenta_location, placentaLocationOptions),
        placenta_characteristics: withDefaultOption(
          basicScreening.placenta_characteristics,
          normalAbnormalOptions
        ),
        amniotic_fluid: withDefaultOption(basicScreening.amniotic_fluid, normalAbnormalOptions),
        uterus_and_adnexa: withDefaultOption(basicScreening.uterus_and_adnexa, normalAbnormalOptions),
        internal_cervical_os: withDefaultOption(basicScreening.internal_cervical_os, internalOsOptions),
      },
    };
  });

  const defaultInterpretations = Array.from({ length: 5 }, (_, index) => ({
    enabled: false,
    study_date: '',
    fetometry_weeks: '',
    fetometry_days: '',
    notes: '',
    ...payload?.interpretation_ultrasounds?.[index],
  }));

  const defaultConclusion: BasicObstetricConclusionPayload = {
    fetus_count_risk: conclusionFetusCountOptions[0].value,
    growth_risk: riskOptions[0],
    frequency_risk: riskOptions[0],
    placenta_risk: riskOptions[0],
    amniotic_fluid_risk: riskOptions[0],
    uterus_and_adnexa_risk: riskOptions[0],
    preterm_birth_risk: riskOptions[0],
    comments: '',
    recommended_next_study: defaultRecommendedStudy,
    recommended_start_date: '',
    recommended_end_date: '',
    ...payload?.conclusion,
  };
  const normalizedConclusion: BasicObstetricConclusionPayload = {
    ...defaultConclusion,
    fetus_count_risk: defaultConclusion.fetus_count_risk || conclusionFetusCountOptions[0].value,
    growth_risk: defaultConclusion.growth_risk || riskOptions[0],
    frequency_risk: defaultConclusion.frequency_risk || riskOptions[0],
    placenta_risk: defaultConclusion.placenta_risk || riskOptions[0],
    amniotic_fluid_risk: defaultConclusion.amniotic_fluid_risk || riskOptions[0],
    uterus_and_adnexa_risk: defaultConclusion.uterus_and_adnexa_risk || riskOptions[0],
    preterm_birth_risk: defaultConclusion.preterm_birth_risk || riskOptions[0],
    recommended_next_study: defaultConclusion.recommended_next_study || defaultRecommendedStudy,
  };

  return {
    study_context: {
      reference_physician: payload?.study_context?.reference_physician ?? '',
      fetus_count: fetusCount,
      selected_fetus: Math.min(Math.max(payload?.study_context?.selected_fetus ?? 1, 1), fetusCount),
    },
    fetuses,
    interpretation_ultrasounds: defaultInterpretations,
    conclusion: normalizedConclusion,
  };
}

function SectionTitle({ title, description }: { title: string; description?: string }) {
  return (
    <Box>
      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
        {title}
      </Typography>
      {description ? (
        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
          {description}
        </Typography>
      ) : null}
    </Box>
  );
}

type BufferedTextInputProps = {
  label: string;
  value: string;
  onCommit: (value: string) => void;
  placeholder?: string;
  fullWidth?: boolean;
  size?: 'small' | 'medium';
  multiline?: boolean;
  minRows?: number;
  helperText?: ReactNode;
  sx?: object;
};

const BufferedTextInput = memo(function BufferedTextInput({
  label,
  value,
  onCommit,
  placeholder,
  fullWidth = true,
  size,
  multiline,
  minRows,
  helperText,
  sx,
}: BufferedTextInputProps) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const commitIfNeeded = useCallback(() => {
    if (draft !== value) {
      onCommit(draft);
    }
  }, [draft, onCommit, value]);

  return (
    <TextField
      label={label}
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commitIfNeeded}
      placeholder={placeholder}
      fullWidth={fullWidth}
      size={size}
      multiline={multiline}
      minRows={minRows}
      helperText={helperText}
      sx={sx}
    />
  );
});

type StudyContextSectionProps = {
  studyContext: BasicObstetricReportPayload['study_context'];
  fetuses: BasicObstetricReportPayload['fetuses'];
  onChange: (field: 'reference_physician' | 'fetus_count' | 'selected_fetus', value: string) => void;
};

const StudyContextSection = memo(function StudyContextSection({
  studyContext,
  fetuses,
  onChange,
}: StudyContextSectionProps) {
  return (
    <>
      <SectionTitle
        title="1. Contexto del estudio"
        description="Aqui definimos el número de fetos, el feto activo y el médico de referencia."
      />
      <SectionCard background="rgba(10, 143, 47, 0.04)">
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 1.5 }}>
          <BufferedTextInput
            label="Médico de referencia"
            value={studyContext.reference_physician}
            onCommit={(nextValue) => onChange('reference_physician', nextValue)}
          />
          <TextField
            select
            label="Número de fetos"
            value={studyContext.fetus_count}
            onChange={(event) => onChange('fetus_count', event.target.value)}
            fullWidth
          >
            {fetusCountOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
          {studyContext.fetus_count > 1 && (
            <TextField
              select
              label="Feto activo"
              value={studyContext.selected_fetus}
              onChange={(event) => onChange('selected_fetus', event.target.value)}
              fullWidth
            >
              {fetuses.map((fetus) => (
                <MenuItem key={fetus.fetus_number} value={fetus.fetus_number}>
                  Feto {fetus.fetus_number}
                </MenuItem>
              ))}
            </TextField>
          )}
        </Box>
      </SectionCard>
    </>
  );
});

type GrowthSectionProps = {
  hiddenFields: Set<string>;
  selectedFetus?: BasicObstetricFetusPayload;
  selectedFetusNumber: number;
  onChange: (
    field: keyof BasicObstetricFetusPayload['growth_screening'],
    value: string,
    nestedField?: keyof BasicObstetricMeasurementPayload
  ) => void;
};

const GrowthSection = memo(function GrowthSection({
  hiddenFields,
  selectedFetus,
  selectedFetusNumber,
  onChange,
}: GrowthSectionProps) {
  const visibleMeasurements = [
    ['dbp', 'DBP', 'tamizajedbp'],
    ['cc', 'CC', 'tamizajecc'],
    ['ca', 'CA', 'tamizajeca'],
    ['lf', 'LF', 'tamizajelf'],
  ].filter(([, , configKey]) => isFieldVisible(hiddenFields, configKey));

  const hasVisibleGrowthSection =
    visibleMeasurements.length > 0 ||
    isFieldVisible(hiddenFields, 'uobafetometria') ||
    isFieldVisible(hiddenFields, 'uobapesoestimado') ||
    isFieldVisible(hiddenFields, 'uobapercentilla');

  if (!hasVisibleGrowthSection) {
    return null;
  }

  return (
    <>
      <Divider />
      <SectionTitle
        title={`2. Tamizaje de crecimiento - Feto ${selectedFetusNumber}`}
        description="Captura las biometrias y los calculos basicos del estudio."
      />
      <SectionCard background="rgba(25, 118, 210, 0.04)">
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 1.5 }}>
          {visibleMeasurements.map(([key, label], index, items) => {
            const measurement = selectedFetus?.growth_screening[
              key as keyof BasicObstetricFetusPayload['growth_screening']
            ] as BasicObstetricMeasurementPayload | undefined;

            return (
              <Box
                key={key}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr auto',
                  gap: 1.25,
                  alignItems: 'stretch',
                }}
              >
                <BufferedTextInput
                  label={label}
                  placeholder={key === 'dbp' ? 'cm' : undefined}
                  value={measurement?.value ?? ''}
                  onCommit={(nextValue) =>
                    onChange(
                      key as keyof BasicObstetricFetusPayload['growth_screening'],
                      nextValue,
                      'value'
                    )
                  }
                  size="medium"
                  sx={{ '& .MuiInputBase-root': { minHeight: 60 } }}
                />
                <BufferedTextInput
                  label={`${label} SDG`}
                  value={measurement?.sdg ?? ''}
                  onCommit={(nextValue) =>
                    onChange(
                      key as keyof BasicObstetricFetusPayload['growth_screening'],
                      nextValue,
                      'sdg'
                    )
                  }
                  size="medium"
                  sx={{ '& .MuiInputBase-root': { minHeight: 60 } }}
                />
                {index < items.length - 1 ? (
                  <Box
                    aria-hidden
                    sx={{
                      width: '1px',
                      bgcolor: 'rgba(0, 0, 0, 0.28)',
                      alignSelf: 'stretch',
                      my: 0.25,
                    }}
                  />
                ) : (
                  <Box />
                )}
              </Box>
            );
          })}
          {isFieldVisible(hiddenFields, 'uobafetometria') && (
            <BufferedTextInput
              label="Fetometria promedio"
              value={selectedFetus?.growth_screening.average_fetometry ?? ''}
              onCommit={(nextValue) => onChange('average_fetometry', nextValue)}
              sx={{ '& .MuiInputBase-root': { minHeight: 60 } }}
            />
          )}
          {isFieldVisible(hiddenFields, 'uobapesoestimado') && (
            <BufferedTextInput
              label="Peso estimado"
              value={selectedFetus?.growth_screening.estimated_weight ?? ''}
              onCommit={(nextValue) => onChange('estimated_weight', nextValue)}
              sx={{ '& .MuiInputBase-root': { minHeight: 60 } }}
            />
          )}
          {isFieldVisible(hiddenFields, 'uobapercentilla') && (
            <BufferedTextInput
              label="Percentila"
              value={selectedFetus?.growth_screening.percentile ?? ''}
              onCommit={(nextValue) => onChange('percentile', nextValue)}
              sx={{ '& .MuiInputBase-root': { minHeight: 60 } }}
            />
          )}
        </Box>
      </SectionCard>
    </>
  );
});

type BasicScreeningSectionProps = {
  hiddenFields: Set<string>;
  selectedFetus?: BasicObstetricFetusPayload;
  selectedFetusNumber: number;
  onChange: (field: keyof BasicObstetricFetusPayload['basic_screening'], value: string) => void;
};

const BasicScreeningSection = memo(function BasicScreeningSection({
  hiddenFields,
  selectedFetus,
  selectedFetusNumber,
  onChange,
}: BasicScreeningSectionProps) {
  const hasVisibleSection = [
    'uobbpresentacion',
    'uobbsituacion',
    'uobbdorso',
    'uobbfcf',
    'uobbrelplaccerv',
    'uobbritmo',
    'uobbmovfetales',
    'uobbplacubicacion',
    'uobbplaccaract',
    'uobbliquidoanm',
    'uobbcvm',
    'uobbphelan',
    'uobbuteroyanex',
    'uobblongcerv',
    'uobborificiocervint',
  ].some((field) => isFieldVisible(hiddenFields, field));

  if (!hasVisibleSection) {
    return null;
  }

  return (
    <>
      <Divider />
      <SectionTitle
        title={`3. Tamizaje obstétrico básico - Feto ${selectedFetusNumber}`}
        description="Aqui van los datos clínicos más importantes del estudio actual."
      />
      <SectionCard background="rgba(255, 152, 0, 0.05)">
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 1.5 }}>
          {isFieldVisible(hiddenFields, 'uobbpresentacion') && (
            <TextField select label="Presentacion" value={selectedFetus?.basic_screening.presentation ?? ''} onChange={(event) => onChange('presentation', event.target.value)} fullWidth>
              {presentationOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
              ))}
            </TextField>
          )}
          {isFieldVisible(hiddenFields, 'uobbsituacion') && (
            <TextField select label="Situacion" value={selectedFetus?.basic_screening.situation ?? ''} onChange={(event) => onChange('situation', event.target.value)} fullWidth>
              {situationOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
              ))}
            </TextField>
          )}
          {isFieldVisible(hiddenFields, 'uobbdorso') && (
            <TextField select label="Dorso" value={selectedFetus?.basic_screening.back ?? ''} onChange={(event) => onChange('back', event.target.value)} fullWidth>
              {backOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
              ))}
            </TextField>
          )}
          {isFieldVisible(hiddenFields, 'uobbfcf') && (
            <BufferedTextInput label="Frecuencia cardiaca fetal" value={selectedFetus?.basic_screening.fetal_heart_rate ?? ''} onCommit={(nextValue) => onChange('fetal_heart_rate', nextValue)} placeholder="LPM" />
          )}
          {isFieldVisible(hiddenFields, 'uobbrelplaccerv') && (
            <BufferedTextInput label="Relación placenta-cérvix" value={selectedFetus?.basic_screening.placenta_cervix_relation ?? ''} onCommit={(nextValue) => onChange('placenta_cervix_relation', nextValue)} placeholder="cm" />
          )}
          {isFieldVisible(hiddenFields, 'uobbritmo') && (
            <TextField select label="Ritmo" value={selectedFetus?.basic_screening.rhythm ?? ''} onChange={(event) => onChange('rhythm', event.target.value)} fullWidth>
              {rhythmOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
              ))}
            </TextField>
          )}
          {isFieldVisible(hiddenFields, 'uobbmovfetales') && (
            <TextField select label="Movimientos fetales" value={selectedFetus?.basic_screening.fetal_movements ?? ''} onChange={(event) => onChange('fetal_movements', event.target.value)} fullWidth>
              {fetalMovementsOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
              ))}
            </TextField>
          )}
          {isFieldVisible(hiddenFields, 'uobbplacubicacion') && (
            <TextField select label="Ubicación placentaria" value={selectedFetus?.basic_screening.placenta_location ?? ''} onChange={(event) => onChange('placenta_location', event.target.value)} fullWidth>
              {placentaLocationOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
              ))}
            </TextField>
          )}
          {isFieldVisible(hiddenFields, 'uobbliquidoanm') && (
            <TextField select label="Líquido amniótico" value={selectedFetus?.basic_screening.amniotic_fluid ?? ''} onChange={(event) => onChange('amniotic_fluid', event.target.value)} fullWidth>
              {normalAbnormalOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
              ))}
            </TextField>
          )}
          {isFieldVisible(hiddenFields, 'uobbcvm') && (
            <BufferedTextInput label="CVM" value={selectedFetus?.basic_screening.cvm ?? ''} onCommit={(nextValue) => onChange('cvm', nextValue)} placeholder="cm" />
          )}
          {isFieldVisible(hiddenFields, 'uobbphelan') && (
            <BufferedTextInput label="Phelan" value={selectedFetus?.basic_screening.phelan ?? ''} onCommit={(nextValue) => onChange('phelan', nextValue)} placeholder="cm" />
          )}
          {isFieldVisible(hiddenFields, 'uobbuteroyanex') && (
            <TextField select label="Útero y anexos" value={selectedFetus?.basic_screening.uterus_and_adnexa ?? ''} onChange={(event) => onChange('uterus_and_adnexa', event.target.value)} fullWidth>
              {normalAbnormalOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
              ))}
            </TextField>
          )}
          {isFieldVisible(hiddenFields, 'uobblongcerv') && (
            <BufferedTextInput label="Longitud cervical" value={selectedFetus?.basic_screening.cervical_length ?? ''} onCommit={(nextValue) => onChange('cervical_length', nextValue)} placeholder="cm" />
          )}
          {isFieldVisible(hiddenFields, 'uobborificiocervint') && (
            <TextField select label="Orificio cervical interno" value={selectedFetus?.basic_screening.internal_cervical_os ?? ''} onChange={(event) => onChange('internal_cervical_os', event.target.value)} fullWidth>
              {internalOsOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
              ))}
            </TextField>
          )}
          {isFieldVisible(hiddenFields, 'uobbplaccaract') && (
            <TextField select label="Caracteristicas placentarias" value={selectedFetus?.basic_screening.placenta_characteristics ?? ''} onChange={(event) => onChange('placenta_characteristics', event.target.value)} fullWidth>
              {normalAbnormalOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
              ))}
            </TextField>
          )}
        </Box>
      </SectionCard>
    </>
  );
});

type ConclusionSectionProps = {
  hiddenFields: Set<string>;
  conclusion: BasicObstetricConclusionPayload;
  onChange: (field: keyof BasicObstetricConclusionPayload, value: string) => void;
};

const ConclusionSection = memo(function ConclusionSection({
  hiddenFields,
  conclusion,
  onChange,
}: ConclusionSectionProps) {
  const hasVisibleRiskSection = [
    'uobcnumfetos',
    'uobccrecimiento',
    'uobcfrecuencia',
    'uobcplacenta',
    'uobcloquidoamn',
    'uobcuteroyanex',
    'uobcpartoprem',
  ].some((field) => isFieldVisible(hiddenFields, field));
  const hasVisibleRecommendationSection = ['estudiorecomendadio', 'auxfechastudio', 'auxfechastudio2'].some((field) =>
    isFieldVisible(hiddenFields, field)
  );
  const hasVisibleComments = isFieldVisible(hiddenFields, 'uobccomentarios');

  if (!hasVisibleRiskSection && !hasVisibleRecommendationSection && !hasVisibleComments) {
    return null;
  }

  return (
    <>
      <Divider />
      <SectionTitle
        title="5. Conclusión"
        description="Resumen de riesgo, comentarios y recomendación del siguiente estudio."
      />
      <SectionCard background="rgba(0, 150, 136, 0.05)">
        {hasVisibleRiskSection && (
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 1.5 }}>
            {isFieldVisible(hiddenFields, 'uobcnumfetos') && (
              <TextField
                select
                label="Número de fetos"
                value={conclusion.fetus_count_risk}
                onChange={(event) => onChange('fetus_count_risk', event.target.value)}
                fullWidth
              >
                {conclusionFetusCountOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
            )}
            {[
              ['growth_risk', 'Crecimiento', 'uobccrecimiento'],
              ['frequency_risk', 'Frecuencia', 'uobcfrecuencia'],
              ['placenta_risk', 'Placenta', 'uobcplacenta'],
              ['amniotic_fluid_risk', 'Líquido amniótico', 'uobcloquidoamn'],
              ['uterus_and_adnexa_risk', 'Útero y anexos', 'uobcuteroyanex'],
              ['preterm_birth_risk', 'Parto prematuro', 'uobcpartoprem'],
            ].map(([key, label, configKey]) =>
              isFieldVisible(hiddenFields, configKey) ? (
                <TextField
                  key={key}
                  select
                  label={label}
                  value={conclusion[key as keyof BasicObstetricConclusionPayload] as string}
                  onChange={(event) => onChange(key as keyof BasicObstetricConclusionPayload, event.target.value)}
                  fullWidth
                >
                  {riskOptions.map((option) => (
                    <MenuItem key={option} value={option}>
                      {option}
                    </MenuItem>
                  ))}
                </TextField>
              ) : null
            )}
          </Box>
        )}
        {hasVisibleRecommendationSection && (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 1.5,
              mt: hasVisibleRiskSection ? 1.5 : 0,
            }}
          >
            {isFieldVisible(hiddenFields, 'estudiorecomendadio') && (
              <TextField
                select
                label="Siguiente estudio recomendado"
                value={conclusion.recommended_next_study}
                onChange={(event) => onChange('recommended_next_study', event.target.value)}
                fullWidth
              >
                {recommendedStudyOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
            )}
            {isFieldVisible(hiddenFields, 'auxfechastudio') && (
              <DatePicker
                label="Fecha inicio del siguiente estudio"
                value={toDayjsValue(conclusion.recommended_start_date)}
                onChange={(value) =>
                  onChange('recommended_start_date', value && value.isValid() ? value.format('YYYY-MM-DD') : '')
                }
                format="DD/MM/YYYY"
                slotProps={{ textField: { fullWidth: true } }}
              />
            )}
            {isFieldVisible(hiddenFields, 'auxfechastudio2') && (
              <DatePicker
                label="Fecha fin del siguiente estudio"
                value={toDayjsValue(conclusion.recommended_end_date)}
                minDate={
                  conclusion.recommended_start_date
                    ? toDayjsValue(conclusion.recommended_start_date)?.add(1, 'day') ?? undefined
                    : undefined
                }
                onChange={(value) =>
                  onChange('recommended_end_date', value && value.isValid() ? value.format('YYYY-MM-DD') : '')
                }
                format="DD/MM/YYYY"
                slotProps={{ textField: { fullWidth: true } }}
              />
            )}
          </Box>
        )}
        {hasVisibleComments && (
          <BufferedTextInput
            label="Comentarios"
            value={conclusion.comments}
            onCommit={(nextValue) => onChange('comments', nextValue)}
            multiline
            minRows={3}
            sx={{ mt: hasVisibleRiskSection || hasVisibleRecommendationSection ? 1.5 : 0 }}
          />
        )}
      </SectionCard>
    </>
  );
});

function PatientBasicObstetricReportBuilder({
  reportId,
  onClose,
  onSaved,
  onError,
  onSuccess,
  startInEditMode = true,
}: PatientBasicObstetricReportBuilderProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [editing, setEditing] = useState(startInEditMode);
  const [report, setReport] = useState<PatientReportRecord<BasicObstetricReportPayload> | null>(null);
  const [payload, setPayload] = useState<BasicObstetricReportPayload>(() => buildNormalizedPayload(null));

  useEffect(() => {
    setEditing(startInEditMode);
  }, [reportId, startInEditMode]);

  useEffect(() => {
    let mounted = true;

    const loadReport = async () => {
      setLoading(true);
      try {
        const loaded = await consultationService.getPatientReport<BasicObstetricReportPayload>(reportId);
        const history = await patientService.getClinicalHistory(loaded.patient_id);
        if (!mounted) return;
        setReport(loaded);
        setPayload(applyReferencePhysicianFallback(
          buildNormalizedPayload(loaded.report_payload),
          history.reference_physician
        ));
        setEditing(!loaded.updated_at || loaded.updated_at === loaded.created_at);
      } catch (loadError) {
        console.error('Error cargando reporte obstetrico basico:', loadError);
        onError?.('No se pudo cargar el reporte de ultrasonido obstetrico basico.');
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void loadReport();

    return () => {
      mounted = false;
    };
  }, [onError, reportId]);

  const selectedFetus = useMemo(() => {
    const index = Math.max(payload.study_context.selected_fetus - 1, 0);
    return payload.fetuses[index] ?? payload.fetuses[0];
  }, [payload.fetuses, payload.study_context.selected_fetus]);

  const hiddenFields = useMemo(
    () => new Set(report?.form_config?.hidden_fields ?? []),
    [report?.form_config?.hidden_fields]
  );
  const hasVisibleGrowthSection = useMemo(
    () =>
      [
        'tamizajedbp',
        'tamizajecc',
        'tamizajeca',
        'tamizajelf',
        'uobafetometria',
        'uobapesoestimado',
        'uobapercentilla',
      ].some((field) => isFieldVisible(hiddenFields, field)),
    [hiddenFields]
  );
  const hasVisibleBasicScreeningSection = useMemo(
    () =>
      [
        'uobbpresentacion',
        'uobbsituacion',
        'uobbdorso',
        'uobbfcf',
        'uobbrelplaccerv',
        'uobbritmo',
        'uobbmovfetales',
        'uobbplacubicacion',
        'uobbplaccaract',
        'uobbliquidoanm',
        'uobbcvm',
        'uobbphelan',
        'uobbuteroyanex',
        'uobblongcerv',
        'uobborificiocervint',
      ].some((field) => isFieldVisible(hiddenFields, field)),
    [hiddenFields]
  );
  const hasVisibleConclusionRiskSection = useMemo(
    () =>
      [
        'uobcnumfetos',
        'uobccrecimiento',
        'uobcfrecuencia',
        'uobcplacenta',
        'uobcloquidoamn',
        'uobcuteroyanex',
        'uobcpartoprem',
      ].some((field) => isFieldVisible(hiddenFields, field)),
    [hiddenFields]
  );
  const hasVisibleConclusionRecommendationSection = useMemo(
    () =>
      ['estudiorecomendadio', 'auxfechastudio', 'auxfechastudio2'].some((field) =>
        isFieldVisible(hiddenFields, field)
      ),
    [hiddenFields]
  );
  const hasVisibleConclusionComments = useMemo(
    () => isFieldVisible(hiddenFields, 'uobccomentarios'),
    [hiddenFields]
  );
  const hasVisibleConclusionSection =
    hasVisibleConclusionRiskSection ||
    hasVisibleConclusionRecommendationSection ||
    hasVisibleConclusionComments;
  const visibleInterpretations = useMemo(
    () =>
      payload.interpretation_ultrasounds
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => item.enabled),
    [payload.interpretation_ultrasounds]
  );
  const selectedFetusLabel =
    payload.study_context.fetus_count > 1 ? `Feto ${payload.study_context.selected_fetus}` : 'Unico';

  const updatePayload = useCallback((updater: (current: BasicObstetricReportPayload) => BasicObstetricReportPayload) => {
    setPayload((current) => updater(current));
  }, []);

  const handleStudyContextChange = useCallback((
    field: 'reference_physician' | 'fetus_count' | 'selected_fetus',
    value: string
  ) => {
    updatePayload((current) => {
      if (field === 'reference_physician') {
        return {
          ...current,
          study_context: {
            ...current.study_context,
            reference_physician: value,
          },
        };
      }

      const numericValue = Math.max(Number(value) || 1, 1);
      if (field === 'fetus_count') {
        const normalizedFetusCount = Math.min(numericValue, 3);
        const nextFetuses = Array.from({ length: normalizedFetusCount }, (_, index) =>
          current.fetuses[index]
            ? { ...current.fetuses[index], fetus_number: index + 1 }
            : createDefaultFetusPayload(index + 1)
        );

        return {
          ...current,
          study_context: {
            ...current.study_context,
            fetus_count: normalizedFetusCount,
            selected_fetus:
              normalizedFetusCount === 1
                ? 1
                : Math.min(current.study_context.selected_fetus, normalizedFetusCount),
          },
          fetuses: nextFetuses,
        };
      }

      return {
        ...current,
        study_context: {
          ...current.study_context,
          selected_fetus: Math.min(numericValue, current.study_context.fetus_count),
        },
      };
    });
  }, [updatePayload]);

  const handleGrowthFieldChange = useCallback((
    field: keyof BasicObstetricFetusPayload['growth_screening'],
    value: string,
    nestedField?: keyof BasicObstetricMeasurementPayload
  ) => {
    updatePayload((current) => {
      const fetusIndex = current.study_context.selected_fetus - 1;
      const nextFetuses = [...current.fetuses];
      const currentFetus = nextFetuses[fetusIndex];
      if (!currentFetus) return current;

      if (nestedField && typeof currentFetus.growth_screening[field] === 'object') {
        nextFetuses[fetusIndex] = {
          ...currentFetus,
          growth_screening: {
            ...currentFetus.growth_screening,
            [field]: {
              ...(currentFetus.growth_screening[field] as BasicObstetricMeasurementPayload),
              [nestedField]: value,
            },
          },
        };
      } else {
        nextFetuses[fetusIndex] = {
          ...currentFetus,
          growth_screening: {
            ...currentFetus.growth_screening,
            [field]: value,
          },
        };
      }

      return {
        ...current,
        fetuses: nextFetuses,
      };
    });
  }, [updatePayload]);

  const handleBasicScreeningChange = useCallback((
    field: keyof BasicObstetricFetusPayload['basic_screening'],
    value: string
  ) => {
    updatePayload((current) => {
      const fetusIndex = current.study_context.selected_fetus - 1;
      const nextFetuses = [...current.fetuses];
      const currentFetus = nextFetuses[fetusIndex];
      if (!currentFetus) return current;

      nextFetuses[fetusIndex] = {
        ...currentFetus,
        basic_screening: {
          ...currentFetus.basic_screening,
          [field]: value,
        },
      };

      return {
        ...current,
        fetuses: nextFetuses,
      };
    });
  }, [updatePayload]);

  const handleInterpretationChange = useCallback((
    index: number,
    field: keyof BasicObstetricInterpretationUltrasoundPayload,
    value: string | boolean
  ) => {
    updatePayload((current) => {
      const nextInterpretations = [...current.interpretation_ultrasounds];
      nextInterpretations[index] = {
        ...nextInterpretations[index],
        [field]: value,
      };

      return {
        ...current,
        interpretation_ultrasounds: nextInterpretations,
      };
    });
  }, [updatePayload]);

  const handleConclusionChange = useCallback((
    field: keyof BasicObstetricConclusionPayload,
    value: string
  ) => {
    updatePayload((current) => {
      const nextConclusion = {
        ...current.conclusion,
        [field]: value,
      };

      if (field === 'recommended_start_date') {
        nextConclusion.recommended_end_date = normalizeRecommendedEndDate(
          value,
          nextConclusion.recommended_end_date
        );
      }

      if (field === 'recommended_end_date') {
        nextConclusion.recommended_end_date = normalizeRecommendedEndDate(
          nextConclusion.recommended_start_date,
          value
        );
      }

      return {
        ...current,
        conclusion: nextConclusion,
      };
    });
  }, [updatePayload]);

  const persistReport = async (showSuccessMessage = true) => {
    if (!report) return null;

    setSaving(true);
    try {
      await flushActiveElement();
      const updated = await consultationService.updatePatientReport<BasicObstetricReportPayload>(report.id, {
        report_payload: payload,
      });
      setReport(updated);
      setPayload(buildNormalizedPayload(updated.report_payload));
      setEditing(false);
      onSaved?.(updated);
      if (showSuccessMessage) {
        onSuccess?.('Reporte obstétrico básico guardado correctamente.');
      }
      return updated;
    } catch (saveError) {
      console.error('Error guardando reporte obstétrico básico:', saveError);
      onError?.('No se pudo guardar el reporte de ultrasonido obstétrico básico.');
      return null;
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    await persistReport(true);
  };

  const startEditing = () => {
    setEditing(true);
  };

  const handleDownload = async () => {
    if (!report) return;

    setDownloading(true);
    try {
      let activeReport = report;

      if (editing) {
        const updated = await persistReport(false);
        if (!updated) {
          return;
        }
        activeReport = updated;
      }

      const blob = await consultationService.downloadPatientReportDocx(activeReport.id);
      const blobUrl = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = blobUrl;
      anchor.download = 'ReporteUltrasonidoObstetricoBasico.docx';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(blobUrl);
      onSuccess?.('Reporte descargado correctamente.');
    } catch (downloadError) {
      console.error('Error descargando reporte obstétrico básico:', downloadError);
      onError?.('No se pudo descargar el reporte de ultrasonido obstétrico básico.');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <Paper sx={{ p: 2.5, borderRadius: 2 }}>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Cargando reporte...
        </Typography>
      </Paper>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
      <Paper sx={{ p: 2.5, borderRadius: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', mb: 2 }}>
        <Box>
          <Typography variant="h6" sx={{ color: '#0a8f2f', fontWeight: 700 }}>
            Ultrasonido obstétrico básico
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
            Esta primera version V2 ya guarda el formulario por secciones sobre el nuevo `report_payload`.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button color="inherit" onClick={onClose} disabled={saving}>
            Cerrar
          </Button>
          <Button variant="outlined" onClick={() => void handleDownload()} disabled={saving || downloading}>
            {downloading ? 'Descargando...' : 'Descargar DOCX'}
          </Button>
          {editing ? (
            <Button variant="contained" onClick={() => void handleSave()} disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
          ) : (
            <Button variant="contained" onClick={startEditing}>
              Editar
            </Button>
          )}
        </Box>
      </Box>

      {editing ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <StudyContextSection
            studyContext={payload.study_context}
            fetuses={payload.fetuses}
            onChange={handleStudyContextChange}
          />
          <GrowthSection
            hiddenFields={hiddenFields}
            selectedFetus={selectedFetus}
            selectedFetusNumber={selectedFetus?.fetus_number ?? 1}
            onChange={handleGrowthFieldChange}
          />
          <BasicScreeningSection
            hiddenFields={hiddenFields}
            selectedFetus={selectedFetus}
            selectedFetusNumber={selectedFetus?.fetus_number ?? 1}
            onChange={handleBasicScreeningChange}
          />
          <UltrasoundInterpretationSection
            items={payload.interpretation_ultrasounds}
            onChange={handleInterpretationChange}
          />
          <ConclusionSection
            hiddenFields={hiddenFields}
            conclusion={payload.conclusion}
            onChange={handleConclusionChange}
          />

          <Alert severity="info">
            Esta primera version ya deja la informacion estructurada en V2. En el siguiente corte podemos afinar
            opciones, calculos y el layout para que quede mas cercano al flujo legacy.
          </Alert>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, pt: 1 }}>
            <Button color="inherit" onClick={onClose} disabled={saving}>
              Cerrar
            </Button>
            <Button variant="outlined" onClick={() => void handleDownload()} disabled={saving || downloading}>
              {downloading ? 'Descargando...' : 'Descargar DOCX'}
            </Button>
            <Button variant="contained" onClick={() => void handleSave()} disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
          </Box>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <DisplaySectionCard title="1. Contexto del estudio">
            <Grid container spacing={3}>
              <DisplayField label="Médico de referencia" value={payload.study_context.reference_physician} />
              <DisplayField
                label="Número de fetos"
                value={getOptionLabel(fetusCountOptions, payload.study_context.fetus_count)}
              />
              {payload.study_context.fetus_count > 1 && (
                <DisplayField label="Feto activo" value={`Feto ${payload.study_context.selected_fetus}`} />
              )}
            </Grid>
          </DisplaySectionCard>

          {hasVisibleGrowthSection && (
            <DisplaySectionCard title={`2. Tamizaje de crecimiento - ${selectedFetusLabel}`}>
              <Grid container spacing={3}>
                {isFieldVisible(hiddenFields, 'tamizajedbp') && (
                  <>
                    <DisplayField label="DBP" value={selectedFetus?.growth_screening.dbp.value} sm={3} />
                    <DisplayField label="DBP SDG" value={selectedFetus?.growth_screening.dbp.sdg} sm={3} />
                  </>
                )}
                {isFieldVisible(hiddenFields, 'tamizajecc') && (
                  <>
                    <DisplayField label="CC" value={selectedFetus?.growth_screening.cc.value} sm={3} />
                    <DisplayField label="CC SDG" value={selectedFetus?.growth_screening.cc.sdg} sm={3} />
                  </>
                )}
                {isFieldVisible(hiddenFields, 'tamizajeca') && (
                  <>
                    <DisplayField label="CA" value={selectedFetus?.growth_screening.ca.value} sm={3} />
                    <DisplayField label="CA SDG" value={selectedFetus?.growth_screening.ca.sdg} sm={3} />
                  </>
                )}
                {isFieldVisible(hiddenFields, 'tamizajelf') && (
                  <>
                    <DisplayField label="LF" value={selectedFetus?.growth_screening.lf.value} sm={3} />
                    <DisplayField label="LF SDG" value={selectedFetus?.growth_screening.lf.sdg} sm={3} />
                  </>
                )}
                {isFieldVisible(hiddenFields, 'uobafetometria') && (
                  <DisplayField
                    label="Fetometría promedio"
                    value={selectedFetus?.growth_screening.average_fetometry}
                  />
                )}
                {isFieldVisible(hiddenFields, 'uobapesoestimado') && (
                  <DisplayField
                    label="Peso estimado"
                    value={selectedFetus?.growth_screening.estimated_weight}
                  />
                )}
                {isFieldVisible(hiddenFields, 'uobapercentilla') && (
                  <DisplayField label="Percentila" value={selectedFetus?.growth_screening.percentile} />
                )}
              </Grid>
            </DisplaySectionCard>
          )}

          {hasVisibleBasicScreeningSection && (
            <DisplaySectionCard title={`3. Tamizaje obstétrico básico - ${selectedFetusLabel}`}>
              <Grid container spacing={3}>
                {isFieldVisible(hiddenFields, 'uobbpresentacion') && (
                  <DisplayField
                    label="Presentación"
                    value={getOptionLabel(presentationOptions, selectedFetus?.basic_screening.presentation)}
                  />
                )}
                {isFieldVisible(hiddenFields, 'uobbsituacion') && (
                  <DisplayField
                    label="Situación"
                    value={getOptionLabel(situationOptions, selectedFetus?.basic_screening.situation)}
                  />
                )}
                {isFieldVisible(hiddenFields, 'uobbdorso') && (
                  <DisplayField label="Dorso" value={getOptionLabel(backOptions, selectedFetus?.basic_screening.back)} />
                )}
                {isFieldVisible(hiddenFields, 'uobbfcf') && (
                  <DisplayField label="Frecuencia cardiaca fetal" value={selectedFetus?.basic_screening.fetal_heart_rate} />
                )}
                {isFieldVisible(hiddenFields, 'uobbrelplaccerv') && (
                  <DisplayField
                    label="Relación placenta-cérvix"
                    value={selectedFetus?.basic_screening.placenta_cervix_relation}
                  />
                )}
                {isFieldVisible(hiddenFields, 'uobbritmo') && (
                  <DisplayField
                    label="Ritmo"
                    value={getOptionLabel(rhythmOptions, selectedFetus?.basic_screening.rhythm)}
                  />
                )}
                {isFieldVisible(hiddenFields, 'uobbmovfetales') && (
                  <DisplayField
                    label="Movimientos fetales"
                    value={getOptionLabel(fetalMovementsOptions, selectedFetus?.basic_screening.fetal_movements)}
                  />
                )}
                {isFieldVisible(hiddenFields, 'uobbplacubicacion') && (
                  <DisplayField
                    label="Ubicación placentaria"
                    value={getOptionLabel(placentaLocationOptions, selectedFetus?.basic_screening.placenta_location)}
                  />
                )}
                {isFieldVisible(hiddenFields, 'uobbplaccaract') && (
                  <DisplayField
                    label="Características placentarias"
                    value={getOptionLabel(
                      normalAbnormalOptions,
                      selectedFetus?.basic_screening.placenta_characteristics
                    )}
                  />
                )}
                {isFieldVisible(hiddenFields, 'uobbliquidoanm') && (
                  <DisplayField
                    label="Líquido amniótico"
                    value={getOptionLabel(normalAbnormalOptions, selectedFetus?.basic_screening.amniotic_fluid)}
                  />
                )}
                {isFieldVisible(hiddenFields, 'uobbcvm') && (
                  <DisplayField label="CVM" value={selectedFetus?.basic_screening.cvm} />
                )}
                {isFieldVisible(hiddenFields, 'uobbphelan') && (
                  <DisplayField label="Phelan" value={selectedFetus?.basic_screening.phelan} />
                )}
                {isFieldVisible(hiddenFields, 'uobbuteroyanex') && (
                  <DisplayField
                    label="Útero y anexos"
                    value={getOptionLabel(normalAbnormalOptions, selectedFetus?.basic_screening.uterus_and_adnexa)}
                  />
                )}
                {isFieldVisible(hiddenFields, 'uobblongcerv') && (
                  <DisplayField label="Longitud cervical" value={selectedFetus?.basic_screening.cervical_length} />
                )}
                {isFieldVisible(hiddenFields, 'uobborificiocervint') && (
                  <DisplayField
                    label="Orificio cervical interno"
                    value={getOptionLabel(internalOsOptions, selectedFetus?.basic_screening.internal_cervical_os)}
                  />
                )}
              </Grid>
            </DisplaySectionCard>
          )}

            {false && (<DisplaySectionCard title="4. Interpretación de ultrasonidos">
            {visibleInterpretations.length === 0 ? (
              <Typography variant="body1" sx={{ color: 'text.secondary' }}>
                No se incluyeron ultrasonidos previos.
              </Typography>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {visibleInterpretations.map(({ item, index }) => {
                  const derived = calculateInterpretationDerivedValues(
                    item.study_date,
                    item.fetometry_weeks,
                    item.fetometry_days
                  );

                  return (
                    <Box
                      key={index}
                      sx={{
                        border: '1px solid',
                        borderColor: 'rgba(35, 165, 193, 0.12)',
                        borderRadius: 2,
                        p: 2,
                      }}
                    >
                      <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 700, color: '#177b26' }}>
                        Ultrasonido {index + 1}
                      </Typography>
                      <Grid container spacing={3}>
                        <DisplayField label="Fecha US" value={derived ? item.study_date && formatDateDisplay(new Date(`${item.study_date}T00:00:00`)) : ''} />
                        <DisplayField label="Fetometría semanas" value={item.fetometry_weeks} />
                        <DisplayField label="Fetometría días" value={item.fetometry_days} />
                        <DisplayField label="FUM" value={derived?.fum} />
                        <DisplayField label="SDG por amenorrea" value={derived?.sdgaLabel || derived?.sdga} />
                        <DisplayField label="FPP por amenorrea" value={derived?.fpp} />
                        <DisplayField label="Anotaciones adicionales" value={item.notes} xs={12} sm={12} />
                      </Grid>
                    </Box>
                  );
                })}
              </Box>
            )}
          </DisplaySectionCard>)}
          <UltrasoundInterpretationDisplay items={payload.interpretation_ultrasounds} />

          {hasVisibleConclusionSection && (
            <DisplaySectionCard title="5. Conclusión">
              <Grid container spacing={3}>
                {isFieldVisible(hiddenFields, 'uobcnumfetos') && (
                  <DisplayField
                    label="Número de fetos"
                    value={getOptionLabel(conclusionFetusCountOptions, payload.conclusion.fetus_count_risk)}
                  />
                )}
                {isFieldVisible(hiddenFields, 'uobccrecimiento') && (
                  <DisplayField label="Crecimiento" value={payload.conclusion.growth_risk} />
                )}
                {isFieldVisible(hiddenFields, 'uobcfrecuencia') && (
                  <DisplayField label="Frecuencia" value={payload.conclusion.frequency_risk} />
                )}
                {isFieldVisible(hiddenFields, 'uobcplacenta') && (
                  <DisplayField label="Placenta" value={payload.conclusion.placenta_risk} />
                )}
                {isFieldVisible(hiddenFields, 'uobcloquidoamn') && (
                  <DisplayField label="Líquido amniótico" value={payload.conclusion.amniotic_fluid_risk} />
                )}
                {isFieldVisible(hiddenFields, 'uobcuteroyanex') && (
                  <DisplayField label="Útero y anexos" value={payload.conclusion.uterus_and_adnexa_risk} />
                )}
                {isFieldVisible(hiddenFields, 'uobcpartoprem') && (
                  <DisplayField label="Parto prematuro" value={payload.conclusion.preterm_birth_risk} />
                )}
                {isFieldVisible(hiddenFields, 'estudiorecomendadio') && (
                  <DisplayField
                    label="Siguiente estudio recomendado"
                    value={getOptionLabel(recommendedStudyOptions, payload.conclusion.recommended_next_study)}
                  />
                )}
                {isFieldVisible(hiddenFields, 'auxfechastudio') && (
                  <DisplayField
                    label="Fecha inicio del siguiente estudio"
                    value={
                      payload.conclusion.recommended_start_date
                        ? formatDateDisplay(new Date(`${payload.conclusion.recommended_start_date}T00:00:00`))
                        : ''
                    }
                  />
                )}
                {isFieldVisible(hiddenFields, 'auxfechastudio2') && (
                  <DisplayField
                    label="Fecha fin del siguiente estudio"
                    value={
                      payload.conclusion.recommended_end_date
                        ? formatDateDisplay(new Date(`${payload.conclusion.recommended_end_date}T00:00:00`))
                        : ''
                    }
                  />
                )}
                {isFieldVisible(hiddenFields, 'uobccomentarios') && (
                  <DisplayField label="Comentarios" value={payload.conclusion.comments} xs={12} sm={12} />
                )}
              </Grid>
            </DisplaySectionCard>
          )}

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, pt: 1 }}>
            <Button color="inherit" onClick={onClose}>
              Cerrar
            </Button>
            <Button variant="outlined" onClick={() => void handleDownload()} disabled={downloading}>
              {downloading ? 'Descargando...' : 'Descargar DOCX'}
            </Button>
            <Button variant="contained" onClick={startEditing}>
              Editar
            </Button>
          </Box>
        </Box>
      )}
      </Paper>
    </LocalizationProvider>
  );
}

export default memo(PatientBasicObstetricReportBuilder);
