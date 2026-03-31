import { memo, type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, Divider, Grid, MenuItem, Paper, TextField, Typography } from '@mui/material';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import {
  consultationService,
  type BasicObstetricInterpretationUltrasoundPayload,
  type NuchalTranslucencyReportPayload,
  type PatientReportRecord,
} from '../../api/consultationService';
import { UltrasoundInterpretationDisplay, UltrasoundInterpretationSection } from './UltrasoundInterpretationSection';

interface Props {
  reportId: number;
  onClose: () => void;
  onSaved?: (report: PatientReportRecord<NuchalTranslucencyReportPayload>) => void;
  onError?: (message: string) => void;
  onSuccess?: (message: string) => void;
  startInEditMode?: boolean;
}

type Option = { value: string | number; label: string };
type FlatField = { key: string; label: string; hiddenKey?: string; options?: Option[]; placeholder?: string };

const riskOptions: Option[] = ['bajo riesgo', 'alto riesgo'].map((value) => ({ value, label: value }));
const normalOptions: Option[] = ['normal', 'anormal', 'no valorable'].map((value) => ({ value, label: value }));
const fetusCountOptions: Option[] = [{ value: 1, label: 'Unico' }, { value: 2, label: 'Dos' }, { value: 3, label: 'Triple' }];
const conclusionFetusCountOptions: Option[] = [
  { value: 'unico', label: 'Unico' },
  { value: 'bicorial - biamniotico', label: 'Bicorial - biamniotico' },
  { value: 'monocorial - biamniotico', label: 'Monocorial - biamniotico' },
  { value: 'monocorial - monoamniotico', label: 'Monocorial - monoamniotico' },
  { value: 'triple', label: 'Triple' },
  { value: 'no valorable', label: 'No valorable' },
];
const recommendedStudyOptions: Option[] = [
  { value: 'tipoest1', label: 'Ultrasonido obstétrico básico' },
  { value: 'tipoest2', label: 'Ultrasonido translucencia nucal' },
  { value: 'tipoest3', label: 'Ultrasonido genético' },
  { value: 'tipoest4', label: 'Ultrasonido estructural' },
  { value: 'tipoest5', label: 'Ultrasonido bienestar fetal' },
  { value: 'tipoest7', label: 'Ultrasonido vitalidad fetal' },
  { value: 'ninguno', label: 'Ninguno' },
];

const growthFields: FlatField[] = [
  { key: 'lcc.value', label: 'LCC', hiddenKey: 'tamizajelcc', placeholder: 'cm' },
  { key: 'lcc.sdg', label: 'LCC SDG', hiddenKey: 'tamizajelcc' },
  { key: 'dbp.value', label: 'DBP', hiddenKey: 'tamizajedbp', placeholder: 'cm' },
  { key: 'dbp.sdg', label: 'DBP SDG', hiddenKey: 'tamizajedbp' },
  { key: 'cc.value', label: 'CC', hiddenKey: 'tamizajecc', placeholder: 'cm' },
  { key: 'cc.sdg', label: 'CC SDG', hiddenKey: 'tamizajecc' },
  { key: 'ca.value', label: 'CA', hiddenKey: 'tamizajeca', placeholder: 'cm' },
  { key: 'ca.sdg', label: 'CA SDG', hiddenKey: 'tamizajeca' },
  { key: 'lf.value', label: 'LF', hiddenKey: 'tamizajelf', placeholder: 'cm' },
  { key: 'lf.sdg', label: 'LF SDG', hiddenKey: 'tamizajelf' },
  { key: 'average_fetometry', label: 'Fetometría promedio', hiddenKey: 'uobafetometria' },
  { key: 'estimated_weight', label: 'Peso estimado', hiddenKey: 'uobapesoestimado', placeholder: 'Gr.' },
];

const basicFields: FlatField[] = [
  { key: 'fetal_heart_rate', label: 'Frecuencia cardiaca fetal', hiddenKey: 'uobbfcf', placeholder: 'LPM' },
  { key: 'rhythm', label: 'Ritmo', hiddenKey: 'uobbritmo', options: normalOptions },
  { key: 'fetal_movements', label: 'Movimientos fetales', hiddenKey: 'uobbmovfetales', options: ['presentes', 'ausentes', 'no valorable'].map((value) => ({ value, label: value })) },
  { key: 'placenta_location', label: 'Placenta ubicación', hiddenKey: 'uobbplacubicacion', options: ['anterior', 'posterior', 'fundica', 'insercion baja', 'previa'].map((value) => ({ value, label: value })) },
  { key: 'placenta_characteristics', label: 'Placenta características', hiddenKey: 'uobbplaccaract', options: normalOptions },
  { key: 'amniotic_fluid', label: 'Líquido amniótico', hiddenKey: 'uobbliquidoanm', options: normalOptions },
  { key: 'cvm', label: 'CVM', hiddenKey: 'uobbcvm', placeholder: 'cm' },
  { key: 'phelan', label: 'Phelan', hiddenKey: 'uobbphelan', placeholder: 'cm' },
  { key: 'uterus_and_adnexa', label: 'Útero y anexos', hiddenKey: 'uobbuteroyanex', options: normalOptions },
  { key: 'cervical_length', label: 'Longitud cervical', hiddenKey: 'uobblongcerv', placeholder: 'cm' },
  { key: 'internal_cervical_os', label: 'Orificio cervical interno', hiddenKey: 'uobborificiocervint', options: ['cerrado', 'abierto'].map((value) => ({ value, label: value })) },
  { key: 'umbilical_cord', label: 'Cordón umbilical', hiddenKey: 'uobbcordonumbilical', options: normalOptions },
];

const screeningGroups: Array<{ title: string; fields: FlatField[] }> = [
  {
    title: 'Tamizaje preeclampsia',
    fields: [
      { key: 'preeclampsia.uterine_right_ip', label: 'IP uterina derecha', hiddenKey: 'tamnormaliputerinader' },
      { key: 'preeclampsia.uterine_left_ip', label: 'IP uterina izquierda', hiddenKey: 'tamnormaliputerinaizq' },
      { key: 'preeclampsia.average_ip', label: 'IP promedio', hiddenKey: 'tamnormalippromedio' },
      { key: 'preeclampsia.percentile', label: 'Percentilla', hiddenKey: 'tamnormalpercentilla' },
      { key: 'preeclampsia.early_risk', label: 'Riesgo de preeclampsia temprana', hiddenKey: 'tamnormalrpretemp' },
    ],
  },
  {
    title: 'Tamizaje de cardiopatia',
    fields: [
      { key: 'cardiopathy.ductus_venosus', label: 'Ductus venosos', hiddenKey: 'tamnormalductus', options: normalOptions },
    ],
  },
  {
    title: 'Tamizaje cromosomopatias',
    fields: [
      { key: 'chromosomopathies.nuchal_translucency', label: 'Translucencia nucal', hiddenKey: 'tamnormaltransnucal', placeholder: 'mm' },
      { key: 'chromosomopathies.nasal_bone', label: 'Hueso nasal', hiddenKey: 'tamnormalhuesonasal', options: [{ value: 'presente', label: 'Presente' }] },
      { key: 'chromosomopathies.ductus_venosus', label: 'Ductus venoso', hiddenKey: 'tamnormalductusvenoso', options: normalOptions },
      { key: 'chromosomopathies.ductus_venosus_ip', label: 'IP del ductus venoso', hiddenKey: 'tamnormalipductusvenoso' },
      { key: 'chromosomopathies.tricuspid_flow', label: 'Flujo tricuspídeo', hiddenKey: 'tamnormalflujotricuspideo', options: [{ value: 'no valorable', label: 'No valorable' }] },
    ],
  },
  {
    title: 'Cromosomopatias - sindrome de down',
    fields: [
      { key: 'chromosomopathies.down_syndrome_previous_risk', label: 'Riesgo previo', hiddenKey: 'tamnormalsdriesprev' },
      { key: 'chromosomopathies.down_syndrome_posterior_risk', label: 'Riesgo posterior', hiddenKey: 'tamnormalsdriespos' },
    ],
  },
  {
    title: 'Cromosomopatias - Trisomia 18',
    fields: [
      { key: 'chromosomopathies.trisomy18_previous_risk', label: 'Riesgo previo', hiddenKey: 'tamnormaltrisriesprev' },
      { key: 'chromosomopathies.trisomy18_posterior_risk', label: 'Riesgo posterior', hiddenKey: 'tamnormaltrisriespos' },
    ],
  },
];

type AnatomyGroup = {
  title: string;
  icon: string;
  fields: FlatField[];
  iconsByField?: Record<string, string>;
};

const anatomyGroups: AnatomyGroup[] = [
  {
    title: 'Sistema nervioso central',
    icon: '/img/reports/sistemaner.png',
    fields: [
      { key: 'central_nervous_system.skull', label: 'Craneo', hiddenKey: 'tamdefestrcraneo', options: normalOptions },
      { key: 'central_nervous_system.midline', label: 'Línea media', hiddenKey: 'tamdefestrlinmed', options: normalOptions },
      { key: 'central_nervous_system.choroid_plexuses', label: 'Plexos coroideos', hiddenKey: 'tamdefestrplexos', options: normalOptions },
    ],
  },
  {
    title: 'Cara',
    icon: '/img/reports/babyface.png',
    fields: [
      { key: 'face.orbits', label: 'Órbitas', hiddenKey: 'tamdefestrorbitas', options: normalOptions },
      { key: 'face.profile', label: 'Perfil', hiddenKey: 'tamdefestrperfil', options: normalOptions },
    ],
  },
  {
    title: 'Columna vertebral y cuello',
    icon: '/img/reports/4001607.png',
    iconsByField: {
      'spine_and_neck.spine': '/img/reports/4001607.png',
      'spine_and_neck.neck': '/img/reports/2309107.png',
    },
    fields: [
      { key: 'spine_and_neck.spine', label: 'Columna vertebral', hiddenKey: 'tamdefestrcolumna', options: normalOptions },
      { key: 'spine_and_neck.neck', label: 'Cuello', hiddenKey: 'tamdefestrcuello', options: normalOptions },
    ],
  },
  {
    title: 'Tórax',
    icon: '/img/reports/torax2.png',
    fields: [
      { key: 'thorax.thoracic_wall', label: 'Pared torácica', hiddenKey: 'tamdefestrparedtor', options: normalOptions },
      { key: 'thorax.lung_area', label: 'Área pulmonar', hiddenKey: 'tamdefestrareapul', options: normalOptions },
    ],
  },
  {
    title: 'Corazón',
    icon: '/img/reports/ritmoc.png',
    fields: [
      { key: 'heart.size', label: 'Tamaño', hiddenKey: 'tamdefestrcorazontam', options: normalOptions },
      { key: 'heart.position', label: 'Posición', hiddenKey: 'tamdefestrcorazonpos', options: normalOptions },
    ],
  },
  {
    title: 'Abdomen',
    icon: '/img/reports/abdomen2.png',
    fields: [
      { key: 'abdomen.abdominal_wall', label: 'Pared abdominal', hiddenKey: 'tamdefestrparedad', options: normalOptions },
      { key: 'abdomen.stomach', label: 'Estómago', hiddenKey: 'tamdefestrestomago', options: normalOptions },
      { key: 'abdomen.liver', label: 'Hígado', hiddenKey: 'tamdefestrhigado', options: normalOptions },
      { key: 'abdomen.intestine', label: 'Intestino', hiddenKey: 'tamdefestrintestino', options: normalOptions },
      { key: 'abdomen.kidneys', label: 'Riñones', hiddenKey: 'tamdefestrrinones', options: normalOptions },
      { key: 'abdomen.bladder', label: 'Vejiga', hiddenKey: 'tamdefestrvejiga', options: normalOptions },
      { key: 'abdomen.cord_insertion', label: 'Inserción del cordón umbilical', hiddenKey: 'tamdefestrcordonumb', options: normalOptions },
      { key: 'abdomen.umbilical_vessels', label: 'Vasos umbilicales', hiddenKey: 'vasosumbil', options: normalOptions },
    ],
  },
  {
    title: 'Extremidades',
    icon: '/img/reports/extr.jpg',
    fields: [
      { key: 'extremities.upper_right', label: 'Superior derecha', hiddenKey: 'tamdefestrextremsupder', options: normalOptions },
      { key: 'extremities.upper_left', label: 'Superior izquierda', hiddenKey: 'tamdefestrextremsupiz', options: normalOptions },
      { key: 'extremities.lower_right', label: 'Inferior derecha', hiddenKey: 'tamdefestrextreminfder', options: normalOptions },
      { key: 'extremities.lower_left', label: 'Inferior izquierda', hiddenKey: 'tamdefestrextreminfiz', options: normalOptions },
    ],
  },
];

dayjs.locale('es');

const defaultRecommendedStudy = 'tipoest3';
const conclusionRiskFields: FlatField[] = [
  { key: 'fetus_count_risk', label: 'Número de fetos', hiddenKey: 'uobcnumfetos', options: conclusionFetusCountOptions },
  { key: 'growth_risk', label: 'Crecimiento', hiddenKey: 'uobccrecimiento', options: riskOptions },
  { key: 'frequency_risk', label: 'Frecuencia', hiddenKey: 'uobcfrecuencia', options: riskOptions },
  { key: 'placenta_risk', label: 'Placenta', hiddenKey: 'uobcplacenta', options: riskOptions },
  { key: 'amniotic_fluid_risk', label: 'Líquido amniótico', hiddenKey: 'uobcloquidoamn', options: riskOptions },
  { key: 'uterus_and_adnexa_risk', label: 'Útero y anexos', hiddenKey: 'uobcuteroyanex', options: riskOptions },
  { key: 'preterm_birth_risk', label: 'Parto prematuro', hiddenKey: 'uobcpartoprem', options: riskOptions },
  { key: 'structural_risk', label: 'Estructural', hiddenKey: 'uobcestructural', options: riskOptions },
  { key: 'cardiopathy_risk', label: 'Cardiopatía', hiddenKey: 'uobccardiopatia', options: riskOptions },
  { key: 'preeclampsia_risk', label: 'Preeclampsia', hiddenKey: 'uobcpreeclampsia', options: riskOptions },
  { key: 'chromosomopathies_risk', label: 'Cromosomopatías', hiddenKey: 'uobccromosomopatias', options: riskOptions },
];

function formatDateDisplay(date: Date) {
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

function toDayjsValue(value: string | null | undefined) {
  if (!value) return null;
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed : null;
}

function normalizeRecommendedEndDate(startDate: string, endDate: string) {
  const start = toDayjsValue(startDate);
  const end = toDayjsValue(endDate);
  if (!start || !end) return endDate;
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

function isFieldVisible(hiddenFields: Set<string>, fieldKey?: string) {
  return fieldKey ? !hiddenFields.has(fieldKey) : true;
}

function hasDisplayValue(value?: string | number | null) {
  if (value === null || value === undefined) return false;
  if (typeof value === 'number') return true;
  return value.trim().length > 0;
}

function getOptionLabel(options: Option[], value?: string | number | null) {
  const match = options.find((option) => option.value === value);
  return match?.label ?? (value ?? '');
}

function getDeepValue(source: unknown, path: string) {
  return path.split('.').reduce<unknown>((current, key) => {
    if (current && typeof current === 'object' && key in (current as Record<string, unknown>)) {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, source);
}

function setDeepValue<T>(source: T, path: string, value: string): T {
  const segments = path.split('.');
  const clone = structuredClone(source) as Record<string, unknown>;
  let current: Record<string, unknown> = clone;

  segments.forEach((segment, index) => {
    if (index === segments.length - 1) {
      current[segment] = value;
      return;
    }

    const next = current[segment];
    current[segment] = next && typeof next === 'object' ? { ...(next as Record<string, unknown>) } : {};
    current = current[segment] as Record<string, unknown>;
  });

  return clone as T;
}

function createDefaultFetusPayload(fetusNumber: number): NuchalTranslucencyReportPayload['fetuses'][number] {
  return {
    fetus_number: fetusNumber,
    growth_screening: {
      lcc: { value: '', sdg: '' },
      dbp: { value: '', sdg: '' },
      cc: { value: '', sdg: '' },
      ca: { value: '', sdg: '' },
      lf: { value: '', sdg: '' },
      average_fetometry: '',
      estimated_weight: '',
    },
    basic_screening: {
      fetal_heart_rate: '',
      rhythm: String(normalOptions[0].value),
      fetal_movements: 'presentes',
      placenta_location: 'anterior',
      placenta_characteristics: String(normalOptions[0].value),
      amniotic_fluid: String(normalOptions[0].value),
      cvm: '',
      phelan: '',
      uterus_and_adnexa: String(normalOptions[0].value),
      cervical_length: '',
      internal_cervical_os: 'cerrado',
      umbilical_cord: String(normalOptions[0].value),
    },
    anatomical_screening: {
      central_nervous_system: { skull: 'normal', midline: 'normal', choroid_plexuses: 'normal' },
      face: { orbits: 'normal', profile: 'normal', nose_and_lips: 'normal' },
      spine_and_neck: { spine: 'normal', neck: 'normal' },
      thorax: {
        situs: 'normal',
        axis: 'normal',
        thoracic_wall: 'normal',
        diaphragm: 'normal',
        lung_area: 'normal',
      },
      heart: { size: 'normal', position: 'normal', rate: '', rhythm: 'normal' },
      abdomen: {
        abdominal_wall: 'normal',
        stomach: 'normal',
        liver: 'normal',
        intestine: 'normal',
        kidneys: 'normal',
        bladder: 'normal',
        cord_insertion: 'normal',
        umbilical_vessels: 'normal',
      },
      extremities: {
        upper_right: 'normal',
        upper_left: 'normal',
        lower_right: 'normal',
        lower_left: 'normal',
        genitalia: '',
      },
    },
    screenings: {
      preeclampsia: {
        uterine_right_ip: '',
        uterine_left_ip: '',
        average_ip: '',
        percentile: '',
        early_risk: '',
      },
      cardiopathy: { ductus_venosus: 'normal' },
      chromosomopathies: {
        nuchal_translucency: '',
        nasal_bone: 'presente',
        ductus_venosus: 'normal',
        ductus_venosus_ip: '',
        tricuspid_flow: 'no valorable',
        down_syndrome_previous_risk: '',
        down_syndrome_posterior_risk: '',
        trisomy18_previous_risk: '',
        trisomy18_posterior_risk: '',
      },
    },
  };
}

function buildNormalizedPayload(payload?: NuchalTranslucencyReportPayload | null): NuchalTranslucencyReportPayload {
  const fetusCount = Math.min(Math.max(payload?.study_context?.fetus_count ?? 1, 1), 3);
  const fetuses = Array.from({ length: fetusCount }, (_, index) => {
    const defaultFetus = createDefaultFetusPayload(index + 1);
    const payloadFetus = payload?.fetuses?.[index];
    return {
      ...defaultFetus,
      ...payloadFetus,
      fetus_number: index + 1,
      growth_screening: {
        ...defaultFetus.growth_screening,
        ...payloadFetus?.growth_screening,
        lcc: { ...defaultFetus.growth_screening.lcc, ...payloadFetus?.growth_screening?.lcc },
        dbp: { ...defaultFetus.growth_screening.dbp, ...payloadFetus?.growth_screening?.dbp },
        cc: { ...defaultFetus.growth_screening.cc, ...payloadFetus?.growth_screening?.cc },
        ca: { ...defaultFetus.growth_screening.ca, ...payloadFetus?.growth_screening?.ca },
        lf: { ...defaultFetus.growth_screening.lf, ...payloadFetus?.growth_screening?.lf },
      },
      basic_screening: {
        ...defaultFetus.basic_screening,
        ...payloadFetus?.basic_screening,
      },
      anatomical_screening: {
        ...defaultFetus.anatomical_screening,
        ...payloadFetus?.anatomical_screening,
        central_nervous_system: {
          ...defaultFetus.anatomical_screening.central_nervous_system,
          ...payloadFetus?.anatomical_screening?.central_nervous_system,
        },
        face: { ...defaultFetus.anatomical_screening.face, ...payloadFetus?.anatomical_screening?.face },
        spine_and_neck: {
          ...defaultFetus.anatomical_screening.spine_and_neck,
          ...payloadFetus?.anatomical_screening?.spine_and_neck,
        },
        thorax: { ...defaultFetus.anatomical_screening.thorax, ...payloadFetus?.anatomical_screening?.thorax },
        heart: { ...defaultFetus.anatomical_screening.heart, ...payloadFetus?.anatomical_screening?.heart },
        abdomen: {
          ...defaultFetus.anatomical_screening.abdomen,
          ...payloadFetus?.anatomical_screening?.abdomen,
        },
        extremities: {
          ...defaultFetus.anatomical_screening.extremities,
          ...payloadFetus?.anatomical_screening?.extremities,
        },
      },
      screenings: {
        ...defaultFetus.screenings,
        ...payloadFetus?.screenings,
        preeclampsia: { ...defaultFetus.screenings.preeclampsia, ...payloadFetus?.screenings?.preeclampsia },
        cardiopathy: { ...defaultFetus.screenings.cardiopathy, ...payloadFetus?.screenings?.cardiopathy },
        chromosomopathies: {
          ...defaultFetus.screenings.chromosomopathies,
          ...payloadFetus?.screenings?.chromosomopathies,
        },
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
      fetus_count_risk: payload?.conclusion?.fetus_count_risk || String(conclusionFetusCountOptions[0].value),
      growth_risk: payload?.conclusion?.growth_risk || String(riskOptions[0].value),
      frequency_risk: payload?.conclusion?.frequency_risk || String(riskOptions[0].value),
      placenta_risk: payload?.conclusion?.placenta_risk || String(riskOptions[0].value),
      amniotic_fluid_risk: payload?.conclusion?.amniotic_fluid_risk || String(riskOptions[0].value),
      uterus_and_adnexa_risk: payload?.conclusion?.uterus_and_adnexa_risk || String(riskOptions[0].value),
      preterm_birth_risk: payload?.conclusion?.preterm_birth_risk || String(riskOptions[0].value),
      structural_risk: payload?.conclusion?.structural_risk || String(riskOptions[0].value),
      cardiopathy_risk: payload?.conclusion?.cardiopathy_risk || String(riskOptions[0].value),
      preeclampsia_risk: payload?.conclusion?.preeclampsia_risk || String(riskOptions[0].value),
      chromosomopathies_risk: payload?.conclusion?.chromosomopathies_risk || String(riskOptions[0].value),
      comments: payload?.conclusion?.comments ?? '',
      recommended_next_study: payload?.conclusion?.recommended_next_study || defaultRecommendedStudy,
      recommended_start_date: payload?.conclusion?.recommended_start_date ?? '',
      recommended_end_date: payload?.conclusion?.recommended_end_date ?? '',
    },
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

function SectionCard({ children, background }: { children: ReactNode; background: string }) {
  return (
    <Box sx={{ background, border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2 }}>
      {children}
    </Box>
  );
}

function DisplaySectionCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'rgba(35, 165, 193, 0.18)' }}>
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
      <CardContent sx={{ p: { xs: 1.5, md: 2 } }}>{children}</CardContent>
    </Card>
  );
}

function GroupTitle({ title, icon }: { title: string; icon: string }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 1.25 }}>
      <Box
        component="img"
        src={icon}
        alt={title}
        sx={{
          width: 26,
          height: 26,
          objectFit: 'contain',
          borderRadius: icon.endsWith('.jpg') ? 1 : 0,
          flexShrink: 0,
        }}
      />
      <Typography variant="subtitle1" sx={{ color: 'text.secondary' }}>
        {title}
      </Typography>
    </Box>
  );
}

function DisplayField({
  label,
  value,
  xs = 12,
  sm = 6,
  md = 4,
}: {
  label: string;
  value?: string | number | null;
  xs?: number;
  sm?: number;
  md?: number;
}) {
  if (!hasDisplayValue(value)) return null;
  return (
    <Grid size={{ xs, sm, md }}>
      <Box sx={{ display: 'grid', gap: 0.25 }}>
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

const BufferedTextInput = memo(function BufferedTextInput({
  label,
  value,
  onCommit,
  placeholder,
  multiline,
  minRows,
}: {
  label: string;
  value: string;
  onCommit: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  minRows?: number;
}) {
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
      fullWidth
      multiline={multiline}
      minRows={minRows}
    />
  );
});

const EditableFieldsSection = memo(function EditableFieldsSection({
  title,
  description,
  background,
  fields,
  source,
  hiddenFields,
  onCommit,
}: {
  title: string;
  description?: string;
  background: string;
  fields: FlatField[];
  source: unknown;
  hiddenFields: Set<string>;
  onCommit: (path: string, value: string) => void;
}) {
  const visibleFields = fields.filter((field) => isFieldVisible(hiddenFields, field.hiddenKey));
  if (visibleFields.length === 0) return null;

  return (
    <>
      <Divider />
      <SectionTitle title={title} description={description} />
      <SectionCard background={background}>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 1.5 }}>
          {visibleFields.map((field) => {
            const value = getDeepValue(source, field.key);
            if (field.options) {
              return (
                <TextField
                  key={field.key}
                  select
                  label={field.label}
                  value={String(value ?? field.options[0]?.value ?? '')}
                  onChange={(event) => onCommit(field.key, event.target.value)}
                  fullWidth
                >
                  {field.options.map((option) => (
                    <MenuItem key={`${field.key}-${option.value}`} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>
              );
            }

            return (
              <BufferedTextInput
                key={field.key}
                label={field.label}
                value={String(value ?? '')}
                onCommit={(nextValue) => onCommit(field.key, nextValue)}
                placeholder={field.placeholder}
              />
            );
          })}
        </Box>
      </SectionCard>
    </>
  );
});

const DisplayFieldsSection = memo(function DisplayFieldsSection({
  title,
  fields,
  source,
  hiddenFields,
}: {
  title: string;
  fields: FlatField[];
  source: unknown;
  hiddenFields: Set<string>;
}) {
  const visibleFields = fields.filter((field) => isFieldVisible(hiddenFields, field.hiddenKey));
  const hasVisibleValues = visibleFields.some((field) => hasDisplayValue(getDeepValue(source, field.key) as string | null));
  if (!hasVisibleValues) return null;

  return (
    <DisplaySectionCard title={title}>
      <Grid container spacing={{ xs: 1.5, md: 2 }}>
        {visibleFields.map((field) => {
          const value = getDeepValue(source, field.key) as string | number | null | undefined;
          const displayValue = field.options ? getOptionLabel(field.options, value) : value;
          return <DisplayField key={field.key} label={field.label} value={displayValue} md={3} />;
        })}
      </Grid>
    </DisplaySectionCard>
  );
});

const AnatomyEditingSection = memo(function AnatomyEditingSection({
  title,
  background,
  source,
  hiddenFields,
  onCommit,
}: {
  title: string;
  background: string;
  source: unknown;
  hiddenFields: Set<string>;
  onCommit: (path: string, value: string) => void;
}) {
  const visibleGroups = anatomyGroups
    .map((group) => ({
      ...group,
      fields: group.fields.filter((field) => isFieldVisible(hiddenFields, field.hiddenKey)),
    }))
    .filter((group) => group.fields.length > 0);

  if (visibleGroups.length === 0) return null;

  return (
    <>
      <Divider />
      <SectionTitle title={title} />
      <SectionCard background={background}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {visibleGroups.map((group) => (
            <Box key={group.title}>
              {group.iconsByField ? (
                <Box
                  sx={{
                    display: 'grid',
                    gap: 1.5,
                    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                    '@media (min-width:1000px)': {
                      gridTemplateColumns: `repeat(${group.fields.length}, minmax(0, 1fr))`,
                    },
                  }}
                >
                  {group.fields.map((field) => (
                    <Box key={field.key}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 1 }}>
                        <Box
                          component="img"
                          src={group.iconsByField?.[field.key]}
                          alt={field.label}
                          sx={{ width: 34, height: 34, objectFit: 'contain', flexShrink: 0 }}
                        />
                        <Typography variant="subtitle1" sx={{ color: 'text.secondary' }}>
                          {field.label}
                        </Typography>
                      </Box>
                      {field.options ? (
                        <TextField
                          select
                          label={field.label}
                          value={String(getDeepValue(source, field.key) ?? field.options?.[0]?.value ?? '')}
                          onChange={(event) => onCommit(field.key, event.target.value)}
                          fullWidth
                        >
                          {field.options.map((option) => (
                            <MenuItem key={`${field.key}-${option.value}`} value={option.value}>
                              {option.label}
                            </MenuItem>
                          ))}
                        </TextField>
                      ) : (
                        <BufferedTextInput
                          label={field.label}
                          value={String(getDeepValue(source, field.key) ?? '')}
                          onCommit={(value) => onCommit(field.key, value)}
                          placeholder={field.placeholder}
                        />
                      )}
                    </Box>
                  ))}
                </Box>
              ) : (
                <>
                  <GroupTitle title={group.title} icon={group.icon} />
                  <Box
                    sx={{
                      display: 'grid',
                      gap: 1.5,
                      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                      '@media (min-width:1000px)': {
                        gridTemplateColumns: `repeat(${Math.min(group.fields.length, 4)}, minmax(0, 1fr))`,
                      },
                    }}
                  >
                    {group.fields.map((field) => (
                      field.options ? (
                        <TextField
                          key={field.key}
                          select
                          label={field.label}
                          value={String(getDeepValue(source, field.key) ?? field.options?.[0]?.value ?? '')}
                          onChange={(event) => onCommit(field.key, event.target.value)}
                          fullWidth
                        >
                          {field.options.map((option) => (
                            <MenuItem key={`${field.key}-${option.value}`} value={option.value}>
                              {option.label}
                            </MenuItem>
                          ))}
                        </TextField>
                      ) : (
                        <BufferedTextInput
                          key={field.key}
                          label={field.label}
                          value={String(getDeepValue(source, field.key) ?? '')}
                          onCommit={(value) => onCommit(field.key, value)}
                          placeholder={field.placeholder}
                        />
                      )
                    ))}
                  </Box>
                </>
              )}
            </Box>
          ))}
        </Box>
      </SectionCard>
    </>
  );
});

const AnatomyDisplaySection = memo(function AnatomyDisplaySection({
  title,
  source,
  hiddenFields,
}: {
  title: string;
  source: unknown;
  hiddenFields: Set<string>;
}) {
  const visibleGroups = anatomyGroups
    .map((group) => ({
      ...group,
      fields: group.fields.filter(
        (field) => isFieldVisible(hiddenFields, field.hiddenKey) && hasDisplayValue(getDeepValue(source, field.key) as string | null)
      ),
    }))
    .filter((group) => group.fields.length > 0);

  if (visibleGroups.length === 0) return null;

  return (
    <DisplaySectionCard title={title}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        {visibleGroups.map((group) => (
          <Box key={group.title}>
            {group.iconsByField ? (
              <Box
                sx={{
                  display: 'grid',
                  gap: 1.5,
                  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                  '@media (min-width:1000px)': {
                    gridTemplateColumns: `repeat(${group.fields.length}, minmax(0, 1fr))`,
                  },
                }}
              >
                {group.fields.map((field) => (
                  <Box key={field.key}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 1 }}>
                      <Box
                        component="img"
                        src={group.iconsByField?.[field.key]}
                        alt={field.label}
                        sx={{ width: 34, height: 34, objectFit: 'contain', flexShrink: 0 }}
                      />
                      <Typography variant="subtitle1" sx={{ color: 'text.secondary' }}>
                        {field.label}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'grid', gap: 0.4 }}>
                      <Typography variant="body1" sx={{ color: '#16313b', whiteSpace: 'pre-wrap' }}>
                        {getOptionLabel(field.options ?? [], getDeepValue(source, field.key) as string | number | null | undefined)}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            ) : (
              <>
                <GroupTitle title={group.title} icon={group.icon} />
                <Grid container spacing={3}>
                  {group.fields.map((field) => (
                    <DisplayField
                      key={field.key}
                      label={field.label}
                      value={getOptionLabel(field.options ?? [], getDeepValue(source, field.key) as string | number | null | undefined)}
                      sm={3}
                      md={3}
                    />
                  ))}
                </Grid>
              </>
            )}
          </Box>
        ))}
      </Box>
    </DisplaySectionCard>
  );
});

const ScreeningEditingSection = memo(function ScreeningEditingSection({
  title,
  background,
  source,
  hiddenFields,
  onCommit,
}: {
  title: string;
  background: string;
  source: unknown;
  hiddenFields: Set<string>;
  onCommit: (path: string, value: string) => void;
}) {
  const visibleGroups = screeningGroups
    .map((group) => ({
      ...group,
      fields: group.fields.filter((field) => isFieldVisible(hiddenFields, field.hiddenKey)),
    }))
    .filter((group) => group.fields.length > 0);

  if (visibleGroups.length === 0) return null;

  return (
    <>
      <Divider />
      <SectionTitle title={title} />
      <SectionCard background={background}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {visibleGroups.map((group, index) => (
            <Box
              key={group.title}
              sx={{
                pt: index === 0 ? 0 : 1.5,
                borderTop: index === 0 ? 'none' : '2px dotted rgba(0, 160, 110, 0.9)',
              }}
            >
              <Typography variant="subtitle1" sx={{ color: 'text.secondary', mb: 1.25 }}>
                {group.title}
              </Typography>
              <Box
                sx={{
                  display: 'grid',
                  gap: 1.5,
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  '@media (min-width:1000px)': {
                    gridTemplateColumns: `repeat(${Math.min(group.fields.length, 3)}, minmax(0, 1fr))`,
                  },
                }}
              >
                {group.fields.map((field) => (
                  <Box
                    key={field.key}
                    sx={
                      group.fields.length === 1
                        ? {
                            maxWidth: { xs: '100%', md: 300 },
                          }
                        : undefined
                    }
                  >
                    {field.options ? (
                      <TextField
                        select
                        label={field.label}
                        value={String(getDeepValue(source, field.key) ?? field.options?.[0]?.value ?? '')}
                        onChange={(event) => onCommit(field.key, event.target.value)}
                        fullWidth
                      >
                        {field.options.map((option) => (
                          <MenuItem key={`${field.key}-${option.value}`} value={option.value}>
                            {option.label}
                          </MenuItem>
                        ))}
                      </TextField>
                    ) : (
                      <BufferedTextInput
                        label={field.label}
                        value={String(getDeepValue(source, field.key) ?? '')}
                        onCommit={(value) => onCommit(field.key, value)}
                        placeholder={field.placeholder}
                      />
                    )}
                  </Box>
                ))}
              </Box>
            </Box>
          ))}
        </Box>
      </SectionCard>
    </>
  );
});

const ScreeningDisplaySection = memo(function ScreeningDisplaySection({
  title,
  source,
  hiddenFields,
}: {
  title: string;
  source: unknown;
  hiddenFields: Set<string>;
}) {
  const visibleGroups = screeningGroups
    .map((group) => ({
      ...group,
      fields: group.fields.filter(
        (field) => isFieldVisible(hiddenFields, field.hiddenKey) && hasDisplayValue(getDeepValue(source, field.key) as string | null)
      ),
    }))
    .filter((group) => group.fields.length > 0);

  if (visibleGroups.length === 0) return null;

  return (
    <DisplaySectionCard title={title}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {visibleGroups.map((group, index) => (
          <Box
            key={group.title}
            sx={{
              pt: index === 0 ? 0 : 1.5,
              borderTop: index === 0 ? 'none' : '2px dotted rgba(0, 160, 110, 0.9)',
            }}
          >
            <Typography variant="subtitle1" sx={{ color: 'text.secondary', mb: 1.25 }}>
              {group.title}
            </Typography>
            <Grid container spacing={3}>
              {group.fields.map((field) => (
                <DisplayField
                  key={field.key}
                  label={field.label}
                  value={field.options ? getOptionLabel(field.options, getDeepValue(source, field.key) as string | number | null | undefined) : (getDeepValue(source, field.key) as string | number | null | undefined)}
                  sm={4}
                />
              ))}
            </Grid>
          </Box>
        ))}
      </Box>
    </DisplaySectionCard>
  );
});

const GrowthEditingSection = memo(function GrowthEditingSection({
  title,
  description,
  background,
  source,
  hiddenFields,
  onCommit,
}: {
  title: string;
  description?: string;
  background: string;
  source: unknown;
  hiddenFields: Set<string>;
  onCommit: (path: string, value: string) => void;
}) {
  const measurementPairs = [
    { base: 'lcc', label: 'LCC', hiddenKey: 'tamizajelcc', placeholder: 'cm' },
    { base: 'dbp', label: 'DBP', hiddenKey: 'tamizajedbp', placeholder: 'cm' },
    { base: 'cc', label: 'CC', hiddenKey: 'tamizajecc', placeholder: 'cm' },
    { base: 'ca', label: 'CA', hiddenKey: 'tamizajeca', placeholder: 'cm' },
    { base: 'lf', label: 'LF', hiddenKey: 'tamizajelf', placeholder: 'cm' },
  ].filter((field) => isFieldVisible(hiddenFields, field.hiddenKey));

  const extraFields = growthFields.filter(
    (field) => !field.key.includes('.') && isFieldVisible(hiddenFields, field.hiddenKey)
  );

  if (measurementPairs.length === 0 && extraFields.length === 0) {
    return null;
  }

  return (
    <>
      <Divider />
      <SectionTitle title={title} description={description} />
      <SectionCard background={background}>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 1.5 }}>
          {measurementPairs.map((field, index) => (
            <Box
              key={field.base}
              sx={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr auto',
                gap: 1.25,
                alignItems: 'stretch',
              }}
            >
              <BufferedTextInput
                label={field.label}
                value={String(getDeepValue(source, `${field.base}.value`) ?? '')}
                onCommit={(value) => onCommit(`${field.base}.value`, value)}
                placeholder={field.placeholder}
              />
              <BufferedTextInput
                label={`${field.label} SDG`}
                value={String(getDeepValue(source, `${field.base}.sdg`) ?? '')}
                onCommit={(value) => onCommit(`${field.base}.sdg`, value)}
              />
              {index < measurementPairs.length - 1 ? (
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
          ))}

          {extraFields.map((field) => (
            <BufferedTextInput
              key={field.key}
              label={field.label}
              value={String(getDeepValue(source, field.key) ?? '')}
              onCommit={(value) => onCommit(field.key, value)}
              placeholder={field.placeholder}
            />
          ))}
        </Box>
      </SectionCard>
    </>
  );
});

function PatientNuchalTranslucencyReportBuilder({
  reportId,
  onClose,
  onSaved,
  onError,
  onSuccess,
  startInEditMode = true,
}: Props) {
  const [report, setReport] = useState<PatientReportRecord<NuchalTranslucencyReportPayload> | null>(null);
  const [payload, setPayload] = useState<NuchalTranslucencyReportPayload>(() => buildNormalizedPayload());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [editing, setEditing] = useState(startInEditMode);

  useEffect(() => {
    setEditing(startInEditMode);
  }, [reportId, startInEditMode]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      try {
        const loaded = await consultationService.getPatientReport<NuchalTranslucencyReportPayload>(reportId);
        if (!active) return;
        setReport(loaded);
        setPayload(buildNormalizedPayload(loaded.report_payload));
      } catch (error) {
        console.error('Error cargando reporte de translucencia nucal:', error);
        if (active) {
          onError?.('No se pudo cargar el reporte de translucencia nucal.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [onError, reportId]);

  const hiddenFields = useMemo(
    () => new Set(report?.form_config?.hidden_fields ?? []),
    [report?.form_config?.hidden_fields]
  );

  const selectedFetus = useMemo(() => {
    const selectedNumber = payload.study_context.selected_fetus || 1;
    return payload.fetuses.find((fetus) => fetus.fetus_number === selectedNumber) ?? payload.fetuses[0];
  }, [payload.fetuses, payload.study_context.selected_fetus]);

  const selectedFetusLabel = `Feto ${selectedFetus?.fetus_number ?? 1}`;

  const updatePayload = useCallback((updater: (current: NuchalTranslucencyReportPayload) => NuchalTranslucencyReportPayload) => {
    setPayload((current) => updater(current));
  }, []);

  const handleStudyContextChange = useCallback((field: 'reference_physician' | 'fetus_count' | 'selected_fetus', value: string) => {
    updatePayload((current) => {
      if (field === 'reference_physician') {
        return { ...current, study_context: { ...current.study_context, reference_physician: value } };
      }

      if (field === 'fetus_count') {
        const nextCount = Math.min(Math.max(Number(value || 1), 1), 3);
        return buildNormalizedPayload({
          ...current,
          study_context: {
            ...current.study_context,
            fetus_count: nextCount,
            selected_fetus: Math.min(current.study_context.selected_fetus, nextCount),
          },
          fetuses: current.fetuses.slice(0, nextCount),
        });
      }

      return {
        ...current,
        study_context: { ...current.study_context, selected_fetus: Number(value || 1) },
      };
    });
  }, [updatePayload]);

  const updateSelectedFetusSection = useCallback((section: 'growth_screening' | 'basic_screening' | 'anatomical_screening' | 'screenings', path: string, value: string) => {
    updatePayload((current) => {
      const selectedIndex = Math.max(current.study_context.selected_fetus - 1, 0);
      const nextFetuses = current.fetuses.map((fetus, index) => {
        if (index !== selectedIndex) return fetus;
        return {
          ...fetus,
          [section]: setDeepValue(fetus[section], path, value),
        };
      });

      return { ...current, fetuses: nextFetuses };
    });
  }, [updatePayload]);

  const handleInterpretationChange = useCallback((index: number, field: keyof BasicObstetricInterpretationUltrasoundPayload, value: string | boolean) => {
    updatePayload((current) => ({
      ...current,
      interpretation_ultrasounds: current.interpretation_ultrasounds.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      ),
    }));
  }, [updatePayload]);

  const handleConclusionChange = useCallback((field: keyof NuchalTranslucencyReportPayload['conclusion'], value: string) => {
    updatePayload((current) => {
      const nextConclusion = { ...current.conclusion, [field]: value };
      if (field === 'recommended_start_date') {
        nextConclusion.recommended_end_date = normalizeRecommendedEndDate(value, nextConclusion.recommended_end_date);
      }
      if (field === 'recommended_end_date') {
        nextConclusion.recommended_end_date = normalizeRecommendedEndDate(nextConclusion.recommended_start_date, value);
      }
      return { ...current, conclusion: nextConclusion };
    });
  }, [updatePayload]);

  const persistReport = useCallback(async () => {
    if (!report) return null;
    setSaving(true);
    try {
      await flushActiveElement();
      const updated = await consultationService.updatePatientReport<NuchalTranslucencyReportPayload>(report.id, {
        report_payload: payload,
      });
      setReport(updated);
      setPayload(buildNormalizedPayload(updated.report_payload));
      setEditing(false);
      onSaved?.(updated);
      onSuccess?.('Reporte de translucencia nucal guardado correctamente.');
      return updated;
    } catch (error) {
      console.error('Error guardando reporte de translucencia nucal:', error);
      onError?.('No se pudo guardar el reporte de translucencia nucal.');
      return null;
    } finally {
      setSaving(false);
    }
  }, [onError, onSaved, onSuccess, payload, report]);

  const handleDownload = useCallback(async () => {
    if (!report) return;

    setDownloading(true);
    try {
      let activeReport = report;

      if (editing) {
        const updated = await persistReport();
        if (!updated) {
          return;
        }
        activeReport = updated;
      }

      const blob = await consultationService.downloadPatientReportDocx(activeReport.id);
      const blobUrl = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = blobUrl;
      anchor.download = 'ReporteUltrasonidoTranslucenciaNucal.docx';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(blobUrl);
      onSuccess?.('Reporte descargado correctamente.');
    } catch (downloadError) {
      console.error('Error descargando reporte de translucencia nucal:', downloadError);
      onError?.('No se pudo descargar el reporte de translucencia nucal.');
    } finally {
      setDownloading(false);
    }
  }, [editing, onError, onSuccess, persistReport, report]);

  const handleCancelEdit = useCallback(() => {
    if (report) {
      setPayload(buildNormalizedPayload(report.report_payload));
    }
    setEditing(false);
  }, [report]);

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
              Ultrasonido translucencia nucal
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
              Builder V2 del estudio usando patient_reports.report_payload.
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {editing ? (
              <Button color="inherit" onClick={handleCancelEdit} disabled={saving || downloading}>
                Cancelar
              </Button>
            ) : (
              <Button color="inherit" onClick={onClose} disabled={saving || downloading}>
                Cerrar
              </Button>
            )}
            {!editing ? (
              <Button variant="outlined" onClick={() => void handleDownload()} disabled={saving || downloading}>
                {downloading ? 'Descargando...' : 'Descargar DOCX'}
              </Button>
            ) : null}
            {editing ? (
              <Button variant="contained" onClick={() => void persistReport()} disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar'}
              </Button>
            ) : (
              <Button variant="contained" onClick={() => setEditing(true)}>
                Editar
              </Button>
            )}
          </Box>
        </Box>

        {editing ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <SectionTitle title="1. Contexto del estudio" description="Define el número de fetos y el feto activo." />
            <SectionCard background="rgba(10, 143, 47, 0.04)">
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 1.5 }}>
                <BufferedTextInput
                  label="Médico de referencia"
                  value={payload.study_context.reference_physician}
                  onCommit={(value) => handleStudyContextChange('reference_physician', value)}
                />
                <TextField select label="Número de fetos" value={payload.study_context.fetus_count} onChange={(event) => handleStudyContextChange('fetus_count', event.target.value)} fullWidth>
                  {fetusCountOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                  ))}
                </TextField>
                {payload.study_context.fetus_count > 1 && (
                  <TextField select label="Feto activo" value={payload.study_context.selected_fetus} onChange={(event) => handleStudyContextChange('selected_fetus', event.target.value)} fullWidth>
                    {payload.fetuses.map((fetus) => (
                      <MenuItem key={fetus.fetus_number} value={fetus.fetus_number}>Feto {fetus.fetus_number}</MenuItem>
                    ))}
                  </TextField>
                )}
              </Box>
            </SectionCard>

            <GrowthEditingSection title={`2. Tamizaje de alteraciones en el crecimiento - ${selectedFetusLabel}`} description="Biometrías y estimaciones del estudio." background="rgba(25, 118, 210, 0.04)" source={selectedFetus?.growth_screening} hiddenFields={hiddenFields} onCommit={(path, value) => updateSelectedFetusSection('growth_screening', path, value)} />
            <EditableFieldsSection title={`3. Tamizaje obstétrico básico - ${selectedFetusLabel}`} background="rgba(255, 152, 0, 0.06)" fields={basicFields} source={selectedFetus?.basic_screening} hiddenFields={hiddenFields} onCommit={(path, value) => updateSelectedFetusSection('basic_screening', path, value)} />
            <AnatomyEditingSection title={`4. Tamizaje defectos estructurales - ${selectedFetusLabel}`} background="rgba(0, 150, 136, 0.06)" source={selectedFetus?.anatomical_screening} hiddenFields={hiddenFields} onCommit={(path, value) => updateSelectedFetusSection('anatomical_screening', path, value)} />
            <ScreeningEditingSection title={`5. Tamizajes - ${selectedFetusLabel}`} background="rgba(156, 39, 176, 0.05)" source={selectedFetus?.screenings} hiddenFields={hiddenFields} onCommit={(path, value) => updateSelectedFetusSection('screenings', path, value)} />

            <UltrasoundInterpretationSection items={payload.interpretation_ultrasounds} onChange={handleInterpretationChange} />

            <Divider />
            <SectionTitle title="7. Conclusion" description="Valoracion final y estudio recomendado." />
            <SectionCard background="rgba(76, 175, 80, 0.05)">
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 1.5 }}>
                {conclusionRiskFields.filter((field) => isFieldVisible(hiddenFields, field.hiddenKey)).map((field) => (
                  <TextField key={field.key} select label={field.label} value={String(getDeepValue(payload.conclusion, field.key) ?? '')} onChange={(event) => handleConclusionChange(field.key as keyof NuchalTranslucencyReportPayload['conclusion'], event.target.value)} fullWidth>
                    {field.options?.map((option) => (
                      <MenuItem key={`${field.key}-${option.value}`} value={option.value}>{option.label}</MenuItem>
                    ))}
                  </TextField>
                ))}
                {isFieldVisible(hiddenFields, 'estudiorecomendadio') && (
                  <TextField select label="Siguiente estudio recomendado" value={payload.conclusion.recommended_next_study} onChange={(event) => handleConclusionChange('recommended_next_study', event.target.value)} fullWidth>
                    {recommendedStudyOptions.map((option) => (
                      <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                    ))}
                  </TextField>
                )}
                {isFieldVisible(hiddenFields, 'auxfechastudio') && (
                  <DatePicker label="Fecha inicio del siguiente estudio" value={toDayjsValue(payload.conclusion.recommended_start_date)} onChange={(value) => handleConclusionChange('recommended_start_date', value && value.isValid() ? value.format('YYYY-MM-DD') : '')} format="DD/MM/YYYY" slotProps={{ textField: { fullWidth: true } }} />
                )}
                {isFieldVisible(hiddenFields, 'auxfechastudio2') && (
                  <DatePicker label="Fecha fin del siguiente estudio" value={toDayjsValue(payload.conclusion.recommended_end_date)} minDate={toDayjsValue(payload.conclusion.recommended_start_date)?.add(1, 'day') ?? undefined} onChange={(value) => handleConclusionChange('recommended_end_date', value && value.isValid() ? value.format('YYYY-MM-DD') : '')} format="DD/MM/YYYY" slotProps={{ textField: { fullWidth: true } }} />
                )}
                {isFieldVisible(hiddenFields, 'uobccomentarios') && (
                  <Box sx={{ gridColumn: '1 / -1' }}>
                    <BufferedTextInput label="Comentarios" value={payload.conclusion.comments} onCommit={(value) => handleConclusionChange('comments', value)} multiline minRows={3} />
                  </Box>
                )}
              </Box>
            </SectionCard>

            <Alert severity="info">
              Esta primera versión de tipoest2 ya queda sobre la estructura V2 y reutiliza la interpretación compartida.
            </Alert>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
              <Button color="inherit" onClick={handleCancelEdit} disabled={saving || downloading}>Cancelar</Button>
              <Button variant="contained" onClick={() => void persistReport()} disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar'}
              </Button>
            </Box>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <DisplaySectionCard title="1. Contexto del estudio">
              <Grid container spacing={{ xs: 1.5, md: 2 }}>
                <DisplayField label="Médico de referencia" value={payload.study_context.reference_physician} />
                <DisplayField label="Número de fetos" value={getOptionLabel(fetusCountOptions, payload.study_context.fetus_count)} md={3} />
                {payload.study_context.fetus_count > 1 && <DisplayField label="Feto activo" value={`Feto ${payload.study_context.selected_fetus}`} md={3} />}
              </Grid>
            </DisplaySectionCard>
            <DisplayFieldsSection title={`2. Tamizaje de alteraciones en el crecimiento - ${selectedFetusLabel}`} fields={growthFields} source={selectedFetus?.growth_screening} hiddenFields={hiddenFields} />
            <DisplayFieldsSection title={`3. Tamizaje obstétrico básico - ${selectedFetusLabel}`} fields={basicFields} source={selectedFetus?.basic_screening} hiddenFields={hiddenFields} />
            <AnatomyDisplaySection title={`4. Tamizaje defectos estructurales - ${selectedFetusLabel}`} source={selectedFetus?.anatomical_screening} hiddenFields={hiddenFields} />
            <ScreeningDisplaySection title={`5. Tamizajes - ${selectedFetusLabel}`} source={selectedFetus?.screenings} hiddenFields={hiddenFields} />
            <UltrasoundInterpretationDisplay items={payload.interpretation_ultrasounds} />
            <DisplayFieldsSection title="7. Conclusion" fields={conclusionRiskFields} source={payload.conclusion} hiddenFields={hiddenFields} />
            <DisplaySectionCard title="Estudio recomendado">
              <Grid container spacing={{ xs: 1.5, md: 2 }}>
                {isFieldVisible(hiddenFields, 'estudiorecomendadio') && <DisplayField label="Siguiente estudio recomendado" value={getOptionLabel(recommendedStudyOptions, payload.conclusion.recommended_next_study)} />}
                {isFieldVisible(hiddenFields, 'auxfechastudio') && <DisplayField label="Fecha inicio del siguiente estudio" value={payload.conclusion.recommended_start_date ? formatDateDisplay(new Date(`${payload.conclusion.recommended_start_date}T00:00:00`)) : ''} />}
                {isFieldVisible(hiddenFields, 'auxfechastudio2') && <DisplayField label="Fecha fin del siguiente estudio" value={payload.conclusion.recommended_end_date ? formatDateDisplay(new Date(`${payload.conclusion.recommended_end_date}T00:00:00`)) : ''} />}
                {isFieldVisible(hiddenFields, 'uobccomentarios') && <DisplayField label="Comentarios" value={payload.conclusion.comments} xs={12} sm={12} md={12} />}
              </Grid>
            </DisplaySectionCard>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
              <Button color="inherit" onClick={onClose}>Cerrar</Button>
              <Button variant="outlined" onClick={() => void handleDownload()} disabled={downloading}>
                {downloading ? 'Descargando...' : 'Descargar DOCX'}
              </Button>
              <Button variant="contained" onClick={() => setEditing(true)}>Editar</Button>
            </Box>
          </Box>
        )}
      </Paper>
    </LocalizationProvider>
  );
}

export default memo(PatientNuchalTranslucencyReportBuilder);
