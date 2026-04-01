import { Fragment, memo, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, Divider, Grid, MenuItem, Paper, TextField, Typography } from '@mui/material';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import {
  consultationService,
  type BasicObstetricInterpretationUltrasoundPayload,
  type PatientReportRecord,
} from '../../api/consultationService';
import { UltrasoundInterpretationDisplay, UltrasoundInterpretationSection } from './UltrasoundInterpretationSection';

type GeneticReportPayload = any;

interface Props {
  reportId: number;
  onClose: () => void;
  onSaved?: (report: PatientReportRecord<GeneticReportPayload>) => void;
  onError?: (message: string) => void;
  onSuccess?: (message: string) => void;
  startInEditMode?: boolean;
  variant?: 'genetic' | 'structural';
}

type Option = { value: string | number; label: string };
type FlatField = { key: string; label: string; hiddenKey?: string; options?: Option[]; placeholder?: string };
type ReportVariant = 'genetic' | 'structural';

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
  { value: 'tipoest1', label: 'Ultrasonido obstetrico basico' },
  { value: 'tipoest3', label: 'Ultrasonido genético' },
  { value: 'tipoest4', label: 'Ultrasonido estructural' },
  { value: 'tipoest5', label: 'Ultrasonido bienestar fetal' },
  { value: 'tipoest7', label: 'Ultrasonido vitalidad fetal' },
  { value: 'ninguno', label: 'Ninguno' },
];

const growthFields: FlatField[] = [
  { key: 'dbp.value', label: 'DBP', hiddenKey: 'tamizajedbp', placeholder: 'cm' },
  { key: 'dbp.sdg', label: 'DBP SDG', hiddenKey: 'tamizajedbp' },
  { key: 'cc.value', label: 'CC', hiddenKey: 'tamizajecc', placeholder: 'cm' },
  { key: 'cc.sdg', label: 'CC SDG', hiddenKey: 'tamizajecc' },
  { key: 'ca.value', label: 'CA', hiddenKey: 'tamizajeca', placeholder: 'cm' },
  { key: 'ca.sdg', label: 'CA SDG', hiddenKey: 'tamizajeca' },
  { key: 'lf.value', label: 'LF', hiddenKey: 'tamizajelf', placeholder: 'cm' },
  { key: 'lf.sdg', label: 'LF SDG', hiddenKey: 'tamizajelf' },
  { key: 'lt.value', label: 'LT', hiddenKey: 'tamizajelt', placeholder: 'cm' },
  { key: 'lt.sdg', label: 'LT SDG', hiddenKey: 'tamizajelt' },
  { key: 'lh.value', label: 'LH', hiddenKey: 'tamizajelh', placeholder: 'cm' },
  { key: 'lh.sdg', label: 'LH SDG', hiddenKey: 'tamizajelh' },
  { key: 'lc.value', label: 'LC', hiddenKey: 'tamizajelc', placeholder: 'cm' },
  { key: 'lc.sdg', label: 'LC SDG', hiddenKey: 'tamizajelc' },
  { key: 'cerebellum.value', label: 'Cerebelo', hiddenKey: 'tamizajecerebelo', placeholder: 'cm' },
  { key: 'cerebellum.sdg', label: 'Cerebelo SDG', hiddenKey: 'tamizajecerebelo' },
  { key: 'average_fetometry', label: 'Fetometria promedio', hiddenKey: 'uobafetometria' },
  { key: 'estimated_weight', label: 'Peso estimado', hiddenKey: 'uobapesoestimado', placeholder: 'Gr.' },
  { key: 'percentile', label: 'Percentilla', hiddenKey: 'uobapercentilla' },
];

const basicFields: FlatField[] = [
  { key: 'presentation', label: 'Presentacion', hiddenKey: 'uobbpresentacion', options: [{ value: 'cefálico', label: 'Cefálico' }, { value: 'pélvico', label: 'Pélvico' }] },
  { key: 'situation', label: 'Situacion', hiddenKey: 'uobbsituacion', options: ['longitudinal', 'oblicuo', 'transverso'].map((value) => ({ value, label: value })) },
  { key: 'back', label: 'Dorso', hiddenKey: 'uobbdorso', options: ['derecho', 'izquierdo', 'anterior', 'posterior', 'superior'].map((value) => ({ value, label: value })) },
  { key: 'fetal_heart_rate', label: 'Frecuencia cardiaca fetal', hiddenKey: 'uobbfcf', placeholder: 'LPM' },
  { key: 'rhythm', label: 'Ritmo', hiddenKey: 'uobbritmo', options: normalOptions },
  { key: 'fetal_movements', label: 'Movimientos fetales', hiddenKey: 'uobbmovfetales', options: ['presentes', 'ausentes', 'no valorable'].map((value) => ({ value, label: value })) },
  { key: 'placenta_location', label: 'Placenta ubicacion', hiddenKey: 'uobbplacubicacion', options: ['anterior', 'posterior', 'fundica', 'insercion baja', 'previa'].map((value) => ({ value, label: value })) },
  { key: 'placenta_characteristics', label: 'Placenta caracteristicas', hiddenKey: 'uobbplaccaract', options: normalOptions },
  { key: 'placenta_cervix_relation', label: 'Relacion placenta - cervix', hiddenKey: 'uobbrelplaccerv', placeholder: 'cm' },
  { key: 'amniotic_fluid', label: 'Liquido amniotico', hiddenKey: 'uobbliquidoanm', options: normalOptions },
  { key: 'cvm', label: 'CVM', hiddenKey: 'uobbcvm', placeholder: 'cm' },
  { key: 'phelan', label: 'Phelan', hiddenKey: 'uobbphelan', placeholder: 'cm' },
  { key: 'uterus_and_adnexa', label: 'Utero y anexos', hiddenKey: 'uobbuteroyanex', options: normalOptions },
  { key: 'cervical_length', label: 'Longitud cervical', hiddenKey: 'uobblongcerv', placeholder: 'cm' },
  { key: 'internal_cervical_os', label: 'Orificio cervical interno', hiddenKey: 'uobborificiocervint', options: ['cerrado', 'abierto'].map((value) => ({ value, label: value })) },
];

const geneticScreeningGroups: Array<{ title: string; fields: FlatField[]; subgroupTitle?: string; subgroupFields?: FlatField[] }> = [
  {
    title: 'Tamizaje preeclampsia',
    fields: [
      { key: 'preeclampsia.uterine_right_ip', label: 'IP uterina derecha', hiddenKey: 'tamnormaliputerinader' },
      { key: 'preeclampsia.uterine_left_ip', label: 'IP uterina izquierda', hiddenKey: 'tamnormaliputerinaizq' },
      { key: 'preeclampsia.average_ip', label: 'IP promedio', hiddenKey: 'tamnormalippromedio' },
      { key: 'preeclampsia.percentile', label: 'Percentilla', hiddenKey: 'tamnormalpercentilla' },
    ],
  },
  {
    title: 'Tamizaje cromosomopatias',
    fields: [
      { key: 'chromosomopathies.nuchal_fold', label: 'Pliegue nucal (mm)', hiddenKey: 'tamcromoplieguenucal' },
      { key: 'chromosomopathies.nasal_bone_mm', label: 'Hueso nasal (mm)', hiddenKey: 'tamcromohuesonasal' },
      { key: 'chromosomopathies.echogenic_intracardiac_focus', label: 'Foco ecogénico intracardiaco', hiddenKey: 'tamcromofocoecointra', options: ['presentes', 'ausentes', 'no valorable'].map((value) => ({ value, label: value })) },
      { key: 'chromosomopathies.atrium_mm', label: 'Atrio (mm)', hiddenKey: 'tamcromoatrio' },
      { key: 'chromosomopathies.hyperechoic_bowel', label: 'Intestino hiperecogénico', hiddenKey: 'tamcromointesthiper', options: ['presentes', 'ausentes', 'no valorable'].map((value) => ({ value, label: value })) },
      { key: 'chromosomopathies.renal_pelvis_mm', label: 'Pelvis renal (mm)', hiddenKey: 'tamcromopelvisren' },
      { key: 'chromosomopathies.structural_defect', label: 'Defecto estructural', hiddenKey: 'tamcromodefestr', options: ['presentes', 'ausentes', 'no valorable'].map((value) => ({ value, label: value })) },
      { key: 'chromosomopathies.choroid_plexus_cyst', label: 'Quiste coroideo', hiddenKey: 'tamcromoquistecoroideo', options: ['presentes', 'ausentes', 'no valorable'].map((value) => ({ value, label: value })) },
    ],
    subgroupTitle: 'Cromosomopatias - sindrome de down',
    subgroupFields: [
      { key: 'chromosomopathies.down_syndrome_previous_risk', label: 'Riesgo previo', hiddenKey: 'tamcromosdriesgoprevio' },
      { key: 'chromosomopathies.down_syndrome_posterior_risk', label: 'Riesgo posterior', hiddenKey: 'tamcromosdriesgoposterior' },
    ],
  },
];

const structuralScreeningGroups: Array<{ title: string; fields: FlatField[]; subgroupTitle?: string; subgroupFields?: FlatField[] }> = [
  {
    title: 'Tamizaje preeclampsia',
    fields: [
      { key: 'preeclampsia.uterine_right_ip', label: 'IP uterina derecha', hiddenKey: 'tamnormaliputerinader' },
      { key: 'preeclampsia.uterine_left_ip', label: 'IP uterina izquierda', hiddenKey: 'tamnormaliputerinaizq' },
      { key: 'preeclampsia.average_ip', label: 'IP promedio', hiddenKey: 'tamnormalippromedio' },
      { key: 'preeclampsia.percentile', label: 'Percentilla', hiddenKey: 'tamnormalpercentilla' },
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
      { key: 'central_nervous_system.skull', label: 'Craneo', hiddenKey: 'tdecraneo', options: normalOptions },
      { key: 'central_nervous_system.midline', label: 'Linea media', hiddenKey: 'tdelineamedia', options: normalOptions },
      { key: 'central_nervous_system.thalami', label: 'Talamos', hiddenKey: 'tdetalamos', options: normalOptions },
      { key: 'central_nervous_system.cavum_septum_pellucidum', label: 'Cavum del septum pellucidum', hiddenKey: 'tdecavum', options: normalOptions },
      { key: 'central_nervous_system.lateral_ventricle', label: 'Ventriculo lateral', hiddenKey: 'tdeventriculolat', options: normalOptions },
      { key: 'central_nervous_system.lateral_ventricle_mm', label: 'Ventriculo lateral (mm)', hiddenKey: 'tdeventriculolatcm' },
      { key: 'central_nervous_system.choroid_plexuses', label: 'Plexos coroideos', hiddenKey: 'tdeplexoscoroideos', options: normalOptions },
      { key: 'central_nervous_system.cerebral_peduncles', label: 'Pedunculos cerebrales', hiddenKey: 'tdepedcerebrales', options: normalOptions },
      { key: 'central_nervous_system.cerebral_hemispheres', label: 'Hemisferios cerebrales', hiddenKey: 'tdehemisferioscerebrales', options: normalOptions },
      { key: 'central_nervous_system.cerebellum', label: 'Cerebelo', hiddenKey: 'tdecerebelo', options: normalOptions },
      { key: 'central_nervous_system.cisterna_magna', label: 'Cisterna magna', hiddenKey: 'tdecisternamagna', options: normalOptions },
      { key: 'central_nervous_system.cisterna_magna_mm', label: 'Cisterna magna (mm)', hiddenKey: 'tdecisternamagnamm' },
    ],
  },
  {
    title: 'Cara',
    icon: '/img/reports/babyface.png',
    fields: [
      { key: 'face.orbits_and_lenses', label: 'Orbitas y cristalinos', hiddenKey: 'tamdefestrorbitas', options: normalOptions },
      { key: 'face.nose_and_upper_lip', label: 'Nariz y labio superior', hiddenKey: 'tamdefestrnarizlabio', options: normalOptions },
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
    title: 'Torax',
    icon: '/img/reports/torax2.png',
    fields: [
      { key: 'thorax.thoracic_wall', label: 'Pared toracica', hiddenKey: 'tamdefestrparedtor', options: normalOptions },
      { key: 'thorax.lung_area', label: 'Area pulmonar', hiddenKey: 'tamdefestrareapul', options: normalOptions },
      { key: 'thorax.diaphragm', label: 'Diafragma', hiddenKey: 'tamdefestrdiafragma', options: normalOptions },
    ],
  },
  {
    title: 'Corazon',
    icon: '/img/reports/ritmoc.png',
    fields: [
      { key: 'heart.size', label: 'Tamano', hiddenKey: 'tamdefestrcorazontam', options: normalOptions },
      { key: 'heart.axis', label: 'Eje', hiddenKey: 'tamdefestreje', options: normalOptions },
      { key: 'heart.situs', label: 'Situs', hiddenKey: 'tamdefestrsitus', options: normalOptions },
      { key: 'heart.fetal_heart_rate', label: 'Frecuencia cardiaca fetal', hiddenKey: 'tdefrecardfetal', placeholder: 'LPM' },
      { key: 'heart.rhythm', label: 'Ritmo', hiddenKey: 'tdecorazonritmo', options: normalOptions },
      { key: 'heart.atrial_ventricular_chambers', label: 'Cavidades auriculares y ventriculares', hiddenKey: 'tdecorazoncavauven', options: normalOptions },
      { key: 'heart.valvular_apparatus', label: 'Aparatos valvulares', hiddenKey: 'tdecorazonaparatosvalv', options: normalOptions },
      { key: 'heart.interventricular_septum', label: 'Tabique interventricular', hiddenKey: 'tdecorazontavint', options: normalOptions },
      { key: 'heart.interatrial_septum_foramen_ovale', label: 'Tabique interauricular y foramen oval', hiddenKey: 'tdecorazontavinforoval', options: normalOptions },
      { key: 'heart.pulmonary_veins', label: 'Venas pulmonares', hiddenKey: 'tdecorazonvenaspulmo', options: normalOptions },
      { key: 'heart.aortic_outflow', label: 'Salida de la aorta', hiddenKey: 'tdecorazonsalidaaorta', options: normalOptions },
      { key: 'heart.pulmonary_outflow', label: 'Salida de la pulmonar', hiddenKey: 'tdecorazonsalidapulmonar', options: normalOptions },
      { key: 'heart.three_vessel_view', label: 'Corte de tres vasos', hiddenKey: 'tdecorazoncortetresvasos', options: normalOptions },
      { key: 'heart.three_vessel_trachea_view', label: 'Corte de tres vasos y traquea', hiddenKey: 'tdecorazoncortetresvatraq', options: normalOptions },
    ],
  },
  {
    title: 'Abdomen',
    icon: '/img/reports/abdomen2.png',
    fields: [
      { key: 'abdomen.abdominal_wall', label: 'Pared abdominal', hiddenKey: 'tamdefestrparedad', options: normalOptions },
      { key: 'abdomen.stomach', label: 'Estomago', hiddenKey: 'tamdefestrestomago', options: normalOptions },
      { key: 'abdomen.liver', label: 'Higado', hiddenKey: 'tamdefestrhigado', options: normalOptions },
      { key: 'abdomen.intestine', label: 'Intestino', hiddenKey: 'tamdefestrintestino', options: normalOptions },
      { key: 'abdomen.kidneys', label: 'Rinones', hiddenKey: 'tamdefestrrinones', options: normalOptions },
      { key: 'abdomen.bladder', label: 'Vejiga', hiddenKey: 'tamdefestrvejiga', options: normalOptions },
      { key: 'abdomen.cord_insertion', label: 'Insercion del cordon umbilical', hiddenKey: 'tamdefestrcordonumb', options: normalOptions },
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
      { key: 'extremities.genitalia', label: 'Genitales externos', hiddenKey: 'tamdefestrextrgenitales', options: [{ value: 'femeninos', label: 'Femeninos' }, { value: 'masculinos', label: 'Masculinos' }] },
    ],
  },
];

dayjs.locale('es');
const conclusionRiskFields: FlatField[] = [
  { key: 'fetus_count_risk', label: 'Numero de fetos', hiddenKey: 'uobcnumfetos', options: conclusionFetusCountOptions },
  { key: 'growth_risk', label: 'Crecimiento', hiddenKey: 'uobccrecimiento', options: riskOptions },
  { key: 'frequency_risk', label: 'Frecuencia', hiddenKey: 'uobcfrecuencia', options: riskOptions },
  { key: 'placenta_risk', label: 'Placenta', hiddenKey: 'uobcplacenta', options: riskOptions },
  { key: 'amniotic_fluid_risk', label: 'Liquido amniotico', hiddenKey: 'uobcloquidoamn', options: riskOptions },
  { key: 'uterus_and_adnexa_risk', label: 'Utero y anexos', hiddenKey: 'uobcuteroyanex', options: riskOptions },
  { key: 'preterm_birth_risk', label: 'Parto prematuro', hiddenKey: 'uobcpartoprem', options: riskOptions },
  { key: 'structural_risk', label: 'Estructural', hiddenKey: 'uobcestructural', options: riskOptions },
  { key: 'cardiopathy_risk', label: 'Cardiopatia', hiddenKey: 'uobccardiopatia', options: riskOptions },
  { key: 'preeclampsia_risk', label: 'Preeclampsia', hiddenKey: 'uobcpreeclampsia', options: riskOptions },
  { key: 'chromosomopathies_risk', label: 'Cromosomopatias', hiddenKey: 'uobccromosomopatias', options: riskOptions },
];

const structuralConclusionRiskFields: FlatField[] = [
  { key: 'fetus_count_risk', label: 'Numero de fetos', hiddenKey: 'uobcnumfetos', options: conclusionFetusCountOptions },
  { key: 'growth_risk', label: 'Crecimiento', hiddenKey: 'uobccrecimiento', options: riskOptions },
  { key: 'frequency_risk', label: 'Frecuencia', hiddenKey: 'uobcfrecuencia', options: riskOptions },
  { key: 'placenta_risk', label: 'Placenta', hiddenKey: 'uobcplacenta', options: riskOptions },
  { key: 'amniotic_fluid_risk', label: 'Liquido amniotico', hiddenKey: 'uobcloquidoamn', options: riskOptions },
  { key: 'uterus_and_adnexa_risk', label: 'Utero y anexos', hiddenKey: 'uobcuteroyanex', options: riskOptions },
  { key: 'preterm_birth_risk', label: 'Parto prematuro', hiddenKey: 'uobcpartoprem', options: riskOptions },
  { key: 'structural_risk', label: 'Estructural', hiddenKey: 'uobcestructural', options: riskOptions },
  { key: 'preeclampsia_risk', label: 'Preeclampsia', hiddenKey: 'uobcpreeclampsia', options: riskOptions },
];

function getVariantConfig(variant: ReportVariant) {
  if (variant === 'structural') {
    return {
      title: 'Ultrasonido estructural',
      builderDescription: 'Builder V2 del estudio usando patient_reports.report_payload.',
      reportLabel: 'estructural',
      defaultRecommendedStudy: 'tipoest5',
      screeningGroups: structuralScreeningGroups,
      conclusionFields: structuralConclusionRiskFields,
      interpretationTitle: '6. Interpretacion de ultrasonidos',
      conclusionTitle: '7. Conclusion',
      downloadFileName: 'ReporteUltrasonidoEstructural.docx',
      successSave: 'Reporte estructural guardado correctamente.',
      errorLoad: 'No se pudo cargar el reporte estructural.',
      errorSave: 'No se pudo guardar el reporte estructural.',
      errorDownload: 'No se pudo descargar el reporte estructural.',
      successDownload: 'Reporte descargado correctamente.',
      sectionNote: 'Esta primera version de tipoest4 ya queda sobre la estructura V2 y reutiliza la interpretacion compartida.',
    };
  }

  return {
    title: 'Ultrasonido genetico',
    builderDescription: 'Builder V2 del estudio usando patient_reports.report_payload.',
    reportLabel: 'genetico',
    defaultRecommendedStudy: 'tipoest4',
    screeningGroups: geneticScreeningGroups,
    conclusionFields: conclusionRiskFields,
    interpretationTitle: '8. Interpretacion de ultrasonidos',
    conclusionTitle: '9. Conclusion',
    downloadFileName: 'ReporteUltrasonidoGenetico.docx',
    successSave: 'Reporte de genetico guardado correctamente.',
    errorLoad: 'No se pudo cargar el reporte de genetico.',
    errorSave: 'No se pudo guardar el reporte de genetico.',
    errorDownload: 'No se pudo descargar el reporte de genetico.',
    successDownload: 'Reporte descargado correctamente.',
    sectionNote: 'Esta primera version de tipoest3 ya queda sobre la estructura V2 y reutiliza la interpretacion compartida.',
  };
}

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

function createDefaultFetusPayload(fetusNumber: number, variant: ReportVariant = 'genetic'): GeneticReportPayload['fetuses'][number] {
  return {
    fetus_number: fetusNumber,
    growth_screening: {
      dbp: { value: '', sdg: '' },
      cc: { value: '', sdg: '' },
      ca: { value: '', sdg: '' },
      lf: { value: '', sdg: '' },
      lt: { value: '', sdg: '' },
      lh: { value: '', sdg: '' },
      lc: { value: '', sdg: '' },
      cerebellum: { value: '', sdg: '' },
      average_fetometry: '',
      estimated_weight: '',
      percentile: '',
    },
    basic_screening: {
      presentation: 'cefálico',
      situation: 'longitudinal',
      back: 'derecho',
      fetal_heart_rate: '',
      rhythm: String(normalOptions[0].value),
      fetal_movements: 'presentes',
      placenta_location: 'anterior',
      placenta_characteristics: String(normalOptions[0].value),
      placenta_cervix_relation: '',
      amniotic_fluid: String(normalOptions[0].value),
      cvm: '',
      phelan: '',
      uterus_and_adnexa: String(normalOptions[0].value),
      cervical_length: '',
      internal_cervical_os: 'cerrado',
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
        genitalia: 'femeninos',
      },
    },
    screenings:
      variant === 'structural'
        ? {
            preeclampsia: {
              uterine_right_ip: '',
              uterine_left_ip: '',
              average_ip: '',
              percentile: '',
            },
          }
        : {
            preeclampsia: {
              uterine_right_ip: '',
              uterine_left_ip: '',
              average_ip: '',
              percentile: '',
            },
            chromosomopathies: {
              nuchal_fold: '',
              nasal_bone_mm: '',
              echogenic_intracardiac_focus: 'presentes',
              atrium_mm: '',
              hyperechoic_bowel: 'presentes',
              renal_pelvis_mm: '',
              structural_defect: 'presentes',
              choroid_plexus_cyst: 'presentes',
              down_syndrome_previous_risk: '',
              down_syndrome_posterior_risk: '',
            },
          },
  };
}

function buildNormalizedPayload(payload?: GeneticReportPayload | null, variant: ReportVariant = 'genetic'): GeneticReportPayload {
  const fetusCount = Math.min(Math.max(payload?.study_context?.fetus_count ?? 1, 1), 3);
  const fetuses = Array.from({ length: fetusCount }, (_, index) => {
    const defaultFetus = createDefaultFetusPayload(index + 1, variant);
    const payloadFetus = payload?.fetuses?.[index];
    return {
      ...defaultFetus,
      ...payloadFetus,
      fetus_number: index + 1,
      growth_screening: {
        ...defaultFetus.growth_screening,
        ...payloadFetus?.growth_screening,
        dbp: { ...defaultFetus.growth_screening.dbp, ...payloadFetus?.growth_screening?.dbp },
        cc: { ...defaultFetus.growth_screening.cc, ...payloadFetus?.growth_screening?.cc },
        ca: { ...defaultFetus.growth_screening.ca, ...payloadFetus?.growth_screening?.ca },
        lf: { ...defaultFetus.growth_screening.lf, ...payloadFetus?.growth_screening?.lf },
        lt: { ...defaultFetus.growth_screening.lt, ...payloadFetus?.growth_screening?.lt },
        lh: { ...defaultFetus.growth_screening.lh, ...payloadFetus?.growth_screening?.lh },
        lc: { ...defaultFetus.growth_screening.lc, ...payloadFetus?.growth_screening?.lc },
        cerebellum: { ...defaultFetus.growth_screening.cerebellum, ...payloadFetus?.growth_screening?.cerebellum },
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
        ...(variant === 'genetic'
          ? {
              chromosomopathies: {
                ...(defaultFetus.screenings as any).chromosomopathies,
                ...(payloadFetus?.screenings as any)?.chromosomopathies,
              },
            }
          : {}),
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
      preeclampsia_risk: payload?.conclusion?.preeclampsia_risk || String(riskOptions[0].value),
      ...(variant === 'genetic'
        ? {
            cardiopathy_risk: payload?.conclusion?.cardiopathy_risk || String(riskOptions[0].value),
            chromosomopathies_risk: payload?.conclusion?.chromosomopathies_risk || String(riskOptions[0].value),
          }
        : {}),
      comments: payload?.conclusion?.comments ?? '',
      recommended_next_study: payload?.conclusion?.recommended_next_study || getVariantConfig(variant).defaultRecommendedStudy,
      recommended_start_date: payload?.conclusion?.recommended_start_date ?? '',
      recommended_end_date: payload?.conclusion?.recommended_end_date ?? '',
    },
  };
}

function SectionTitle({ title, description, icon }: { title: string; description?: string; icon?: string }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: icon ? 1.5 : 0 }}>
      {icon ? (
        <Box
          component="img"
          src={icon}
          alt={title}
          sx={{ width: 44, height: 44, objectFit: 'contain', flexShrink: 0, mt: 0.2 }}
        />
      ) : null}
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

function DisplaySectionCard({ title, children, icon }: { title: string; children: ReactNode; icon?: string }) {
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: icon ? 1.25 : 0 }}>
          {icon ? (
            <Box component="img" src={icon} alt={title} sx={{ width: 44, height: 44, objectFit: 'contain', flexShrink: 0 }} />
          ) : null}
          <Typography variant="h6" fontWeight={700} color="#0d7f1f">
            {title}
          </Typography>
        </Box>
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

function getScreeningGroupIcon(title: string) {
  switch (title) {
    case 'Tamizaje preeclampsia':
      return '/img/reports/preecl.png';
    case 'Tamizaje cromosomopatias':
      return '/img/reports/1432426.png';
    default:
      return undefined;
  }
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
  resetKey,
}: {
  label: string;
  value: string;
  onCommit: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  minRows?: number;
  resetKey?: number;
}) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [resetKey, value]);

  return (
    <TextField
      label={label}
      value={draft}
      onChange={(event) => {
        const nextValue = event.target.value;
        setDraft(nextValue);
        onCommit(nextValue);
      }}
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
  onTextDraft,
  resetKey,
  icon,
}: {
  title: string;
  description?: string;
  background: string;
  fields: FlatField[];
  source: unknown;
  hiddenFields: Set<string>;
  onCommit: (path: string, value: string) => void;
  onTextDraft: (path: string, value: string) => void;
  resetKey: number;
  icon?: string;
}) {
  const visibleFields = fields.filter((field) => isFieldVisible(hiddenFields, field.hiddenKey));
  if (visibleFields.length === 0) return null;

  return (
    <>
      <Divider />
      <SectionTitle title={title} description={description} icon={icon} />
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
                onCommit={(nextValue) => onTextDraft(field.key, nextValue)}
                placeholder={field.placeholder}
                resetKey={resetKey}
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
  icon,
}: {
  title: string;
  fields: FlatField[];
  source: unknown;
  hiddenFields: Set<string>;
  icon?: string;
}) {
  const visibleFields = fields.filter((field) => isFieldVisible(hiddenFields, field.hiddenKey));
  const hasVisibleValues = visibleFields.some((field) => hasDisplayValue(getDeepValue(source, field.key) as string | null));
  if (!hasVisibleValues) return null;

  return (
    <DisplaySectionCard title={title} icon={icon}>
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
  background,
  source,
  groups,
  hiddenFields,
  onCommit,
  onTextDraft,
  resetKey,
  startNumber,
  selectedFetusLabel,
}: {
  background: string;
  source: unknown;
  groups: Array<{ title: string; fields: FlatField[]; subgroupTitle?: string; subgroupFields?: FlatField[] }>;
  hiddenFields: Set<string>;
  onCommit: (path: string, value: string) => void;
  onTextDraft: (path: string, value: string) => void;
  resetKey: number;
  startNumber: number;
  selectedFetusLabel: string;
}) {
  const visibleGroups = groups
    .map((group) => ({
      ...group,
      fields: group.fields.filter((field) => isFieldVisible(hiddenFields, field.hiddenKey)),
      subgroupFields: (group.subgroupFields ?? []).filter((field) => isFieldVisible(hiddenFields, field.hiddenKey)),
    }))
    .filter((group) => group.fields.length > 0 || (group.subgroupFields?.length ?? 0) > 0);

  if (visibleGroups.length === 0) return null;

  return (
    <>
      {visibleGroups.map((group, index) => (
        <Fragment key={group.title}>
          <Divider />
          <SectionTitle
            title={`${startNumber + index}. ${group.title} - ${selectedFetusLabel}`}
            icon={getScreeningGroupIcon(group.title)}
          />
          <SectionCard background={background}>
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
                      onCommit={(value) => onTextDraft(field.key, value)}
                      placeholder={field.placeholder}
                      resetKey={resetKey}
                    />
                  )}
                </Box>
              ))}
            </Box>
            {group.subgroupTitle && (group.subgroupFields?.length ?? 0) > 0 ? (
              <Box sx={{ mt: 2.5 }}>
                <Typography variant="subtitle1" sx={{ color: 'text.secondary', mb: 1.5 }}>
                  {group.subgroupTitle}
                </Typography>
                <Box
                  sx={{
                    display: 'grid',
                    gap: 1.5,
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    '@media (min-width:1000px)': {
                      gridTemplateColumns: `repeat(${Math.min(group.subgroupFields?.length ?? 1, 3)}, minmax(0, 1fr))`,
                    },
                  }}
                >
                  {group.subgroupFields?.map((field) => (
                    <Box key={field.key}>
                      <BufferedTextInput
                        label={field.label}
                        value={String(getDeepValue(source, field.key) ?? '')}
                        onCommit={(value) => onTextDraft(field.key, value)}
                        placeholder={field.placeholder}
                        resetKey={resetKey}
                      />
                    </Box>
                  ))}
                </Box>
              </Box>
            ) : null}
          </SectionCard>
        </Fragment>
      ))}
    </>
  );
});

const ScreeningDisplaySection = memo(function ScreeningDisplaySection({
  source,
  groups,
  hiddenFields,
  startNumber,
  selectedFetusLabel,
}: {
  source: unknown;
  groups: Array<{ title: string; fields: FlatField[]; subgroupTitle?: string; subgroupFields?: FlatField[] }>;
  hiddenFields: Set<string>;
  startNumber: number;
  selectedFetusLabel: string;
}) {
  const visibleGroups = groups
    .map((group) => ({
      ...group,
      fields: group.fields.filter(
        (field) => isFieldVisible(hiddenFields, field.hiddenKey) && hasDisplayValue(getDeepValue(source, field.key) as string | null)
      ),
      subgroupFields: (group.subgroupFields ?? []).filter(
        (field) => isFieldVisible(hiddenFields, field.hiddenKey) && hasDisplayValue(getDeepValue(source, field.key) as string | null)
      ),
    }))
    .filter((group) => group.fields.length > 0 || (group.subgroupFields?.length ?? 0) > 0);

  if (visibleGroups.length === 0) return null;

  return (
    <>
      {visibleGroups.map((group, index) => (
        <DisplaySectionCard
          key={group.title}
          title={`${startNumber + index}. ${group.title} - ${selectedFetusLabel}`}
          icon={getScreeningGroupIcon(group.title)}
        >
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
          {group.subgroupTitle && (group.subgroupFields?.length ?? 0) > 0 ? (
            <Box sx={{ mt: 2.5 }}>
              <Typography variant="subtitle1" sx={{ color: 'text.secondary', mb: 1.5 }}>
                {group.subgroupTitle}
              </Typography>
              <Grid container spacing={3}>
                {group.subgroupFields?.map((field) => (
                  <DisplayField
                    key={field.key}
                    label={field.label}
                    value={field.options ? getOptionLabel(field.options, getDeepValue(source, field.key) as string | number | null | undefined) : (getDeepValue(source, field.key) as string | number | null | undefined)}
                    sm={4}
                  />
                ))}
              </Grid>
            </Box>
          ) : null}
        </DisplaySectionCard>
      ))}
    </>
  );
});
const GrowthEditingSection = memo(function GrowthEditingSection({
  title,
  description,
  background,
  source,
  hiddenFields,
  onTextDraft,
  resetKey,
  icon,
}: {
  title: string;
  description?: string;
  background: string;
  source: unknown;
  hiddenFields: Set<string>;
  onTextDraft: (path: string, value: string) => void;
  resetKey: number;
  icon?: string;
}) {
  const measurementPairs = [
    { base: 'dbp', label: 'DBP', hiddenKey: 'tamizajedbp', placeholder: 'cm' },
    { base: 'cc', label: 'CC', hiddenKey: 'tamizajecc', placeholder: 'cm' },
    { base: 'ca', label: 'CA', hiddenKey: 'tamizajeca', placeholder: 'cm' },
    { base: 'lf', label: 'LF', hiddenKey: 'tamizajelf', placeholder: 'cm' },
    { base: 'lt', label: 'LT', hiddenKey: 'tamizajelt', placeholder: 'cm' },
    { base: 'lh', label: 'LH', hiddenKey: 'tamizajelh', placeholder: 'cm' },
    { base: 'lc', label: 'LC', hiddenKey: 'tamizajelc', placeholder: 'cm' },
    { base: 'cerebellum', label: 'Cerebelo', hiddenKey: 'tamizajecerebelo', placeholder: 'cm' },
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
      <SectionTitle title={title} description={description} icon={icon} />
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
                onCommit={(value) => onTextDraft(`${field.base}.value`, value)}
                placeholder={field.placeholder}
                resetKey={resetKey}
              />
              <BufferedTextInput
                label={`${field.label} SDG`}
                value={String(getDeepValue(source, `${field.base}.sdg`) ?? '')}
                onCommit={(value) => onTextDraft(`${field.base}.sdg`, value)}
                resetKey={resetKey}
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
              onCommit={(value) => onTextDraft(field.key, value)}
              placeholder={field.placeholder}
              resetKey={resetKey}
            />
          ))}
        </Box>
      </SectionCard>
    </>
  );
});

function PatientGeneticReportBuilder({
  reportId,
  onClose,
  onSaved,
  onError,
  onSuccess,
  startInEditMode = true,
  variant = 'genetic',
}: Props) {
  const variantConfig = useMemo(() => getVariantConfig(variant), [variant]);
  const [report, setReport] = useState<PatientReportRecord<GeneticReportPayload> | null>(null);
  const [payload, setPayload] = useState<GeneticReportPayload>(() => buildNormalizedPayload(undefined, variant));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [editing, setEditing] = useState(startInEditMode);
  const [textResetKey, setTextResetKey] = useState(0);
  const textDraftsRef = useRef<Record<string, string>>({});

  useEffect(() => {
    setEditing(startInEditMode);
  }, [reportId, startInEditMode]);

  const clearTextDrafts = useCallback(() => {
    textDraftsRef.current = {};
    setTextResetKey((current) => current + 1);
  }, []);

  const rememberTextDraft = useCallback((path: string, value: string) => {
    textDraftsRef.current[path] = value;
  }, []);

  const mergeTextDrafts = useCallback((source: GeneticReportPayload) => {
    let next = structuredClone(source) as GeneticReportPayload;
    Object.entries(textDraftsRef.current).forEach(([path, value]) => {
      next = setDeepValue(next, path, value);
    });
    return next;
  }, []);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      try {
        const loaded = await consultationService.getPatientReport<GeneticReportPayload>(reportId);
        if (!active) return;
        setReport(loaded);
        setPayload(buildNormalizedPayload(loaded.report_payload, variant));
        clearTextDrafts();
      } catch (error) {
        console.error('Error cargando reporte de genetico:', error);
        if (active) {
          onError?.(variantConfig.errorLoad);
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
  }, [clearTextDrafts, onError, reportId, variant, variantConfig.errorLoad]);

  const hiddenFields = useMemo(
    () => new Set(report?.form_config?.hidden_fields ?? []),
    [report?.form_config?.hidden_fields]
  );

  const selectedFetus = useMemo(() => {
    const selectedNumber = payload.study_context.selected_fetus || 1;
    return payload.fetuses.find((fetus: any) => fetus.fetus_number === selectedNumber) ?? payload.fetuses[0];
  }, [payload.fetuses, payload.study_context.selected_fetus]);

  const selectedFetusIndex = Math.max((payload.study_context.selected_fetus || 1) - 1, 0);
  const selectedFetusLabel = `Feto ${selectedFetus?.fetus_number ?? 1}`;

  const updatePayload = useCallback((updater: (current: GeneticReportPayload) => GeneticReportPayload) => {
    setPayload((current: any) => updater(current));
  }, []);

  const handleStudyContextChange = useCallback((field: 'fetus_count' | 'selected_fetus', value: string) => {
    updatePayload((current) => {
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
        }, variant);
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
      const nextFetuses = current.fetuses.map((fetus: any, index: number) => {
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
      interpretation_ultrasounds: current.interpretation_ultrasounds.map((item: any, itemIndex: number) =>
        itemIndex === index ? { ...item, [field]: value } : item
      ),
    }));
  }, [updatePayload]);

  const handleConclusionChange = useCallback((field: keyof GeneticReportPayload['conclusion'], value: string) => {
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
      const payloadToSave = mergeTextDrafts(payload);
      const updated = await consultationService.updatePatientReport<GeneticReportPayload>(report.id, {
        report_payload: payloadToSave,
      });
      clearTextDrafts();
      setReport(updated);
      setPayload(buildNormalizedPayload(updated.report_payload, variant));
      setEditing(false);
      onSaved?.(updated);
      onSuccess?.(variantConfig.successSave);
      return updated;
    } catch (error) {
      console.error('Error guardando reporte de genetico:', error);
      onError?.(variantConfig.errorSave);
      return null;
    } finally {
      setSaving(false);
    }
  }, [clearTextDrafts, mergeTextDrafts, onError, onSaved, onSuccess, payload, report, variant, variantConfig.errorSave, variantConfig.successSave]);

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
      anchor.download = variantConfig.downloadFileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(blobUrl);
      onSuccess?.(variantConfig.successDownload);
    } catch (downloadError) {
      console.error('Error descargando reporte de genetico:', downloadError);
      onError?.(variantConfig.errorDownload);
    } finally {
      setDownloading(false);
    }
  }, [editing, onError, onSuccess, persistReport, report, variantConfig.downloadFileName, variantConfig.errorDownload, variantConfig.successDownload]);

  const handleCancelEdit = useCallback(() => {
    clearTextDrafts();
    if (report) {
      setPayload(buildNormalizedPayload(report.report_payload, variant));
    }
    setEditing(false);
  }, [clearTextDrafts, report, variant]);

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
              {variantConfig.title}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
              {variantConfig.builderDescription}
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
            <SectionTitle title="1. Contexto del estudio" description="Define el numero de fetos y el feto activo." />
            <SectionCard background="rgba(10, 143, 47, 0.04)">
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 1.5 }}>
                <BufferedTextInput
                  label="Medico de referencia"
                  value={payload.study_context.reference_physician}
                  onCommit={(value) => rememberTextDraft('study_context.reference_physician', value)}
                  resetKey={textResetKey}
                />
                <TextField select label="Numero de fetos" value={payload.study_context.fetus_count} onChange={(event) => handleStudyContextChange('fetus_count', event.target.value)} fullWidth>
                  {fetusCountOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                  ))}
                </TextField>
                {payload.study_context.fetus_count > 1 && (
                  <TextField select label="Feto activo" value={payload.study_context.selected_fetus} onChange={(event) => handleStudyContextChange('selected_fetus', event.target.value)} fullWidth>
                    {payload.fetuses.map((fetus: any) => (
                      <MenuItem key={fetus.fetus_number} value={fetus.fetus_number}>Feto {fetus.fetus_number}</MenuItem>
                    ))}
                  </TextField>
                )}
              </Box>
            </SectionCard>

            <GrowthEditingSection title={`2. Tamizaje de alteraciones en el crecimiento - ${selectedFetusLabel}`} icon="/img/reports/sdg5.png" description="Biometrias y estimaciones del estudio." background="rgba(25, 118, 210, 0.04)" source={selectedFetus?.growth_screening} hiddenFields={hiddenFields} onTextDraft={(path, value) => rememberTextDraft(`fetuses.${selectedFetusIndex}.growth_screening.${path}`, value)} resetKey={textResetKey} />
            <EditableFieldsSection title={`3. Tamizaje obstetrico basico - ${selectedFetusLabel}`} icon="/img/reports/tob.png" background="rgba(255, 152, 0, 0.06)" fields={basicFields} source={selectedFetus?.basic_screening} hiddenFields={hiddenFields} onCommit={(path, value) => updateSelectedFetusSection('basic_screening', path, value)} onTextDraft={(path, value) => rememberTextDraft(`fetuses.${selectedFetusIndex}.basic_screening.${path}`, value)} resetKey={textResetKey} />
            <AnatomyEditingSection title={`4. Tamizaje defectos estructurales - ${selectedFetusLabel}`} background="rgba(0, 150, 136, 0.06)" source={selectedFetus?.anatomical_screening} hiddenFields={hiddenFields} onCommit={(path, value) => updateSelectedFetusSection('anatomical_screening', path, value)} />
            <ScreeningEditingSection background="rgba(156, 39, 176, 0.05)" source={selectedFetus?.screenings} groups={variantConfig.screeningGroups} hiddenFields={hiddenFields} onCommit={(path, value) => updateSelectedFetusSection('screenings', path, value)} onTextDraft={(path, value) => rememberTextDraft(`fetuses.${selectedFetusIndex}.screenings.${path}`, value)} resetKey={textResetKey} startNumber={5} selectedFetusLabel={selectedFetusLabel} />

            <Divider />
            <SectionTitle title={variantConfig.interpretationTitle} icon="/img/reports/1721936.png" />
            <UltrasoundInterpretationSection items={payload.interpretation_ultrasounds} onChange={handleInterpretationChange} showHeader={false} />

            <Divider />
            <SectionTitle title={variantConfig.conclusionTitle} description="Valoracion final y estudio recomendado." />
            <SectionCard background="rgba(76, 175, 80, 0.05)">
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 1.5 }}>
                {variantConfig.conclusionFields.filter((field) => isFieldVisible(hiddenFields, field.hiddenKey)).map((field) => (
                  <TextField key={field.key} select label={field.label} value={String(getDeepValue(payload.conclusion, field.key) ?? '')} onChange={(event) => handleConclusionChange(field.key as keyof GeneticReportPayload['conclusion'], event.target.value)} fullWidth>
                    {field.options?.map((option) => (
                      <MenuItem key={`${field.key}-${option.value}`} value={option.value}>{option.label}</MenuItem>
                    ))}
                  </TextField>
                ))}
                </Box>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 1.5 }}>
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
                  <Box>
                    <BufferedTextInput label="Comentarios" value={payload.conclusion.comments} onCommit={(value) => rememberTextDraft('conclusion.comments', value)} multiline minRows={3} resetKey={textResetKey} />
                  </Box>
                )}
                </Box>
              </Box>
            </SectionCard>

            <Alert severity="info">
              {variantConfig.sectionNote}
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
                <DisplayField label="Medico de referencia" value={payload.study_context.reference_physician} />
                <DisplayField label="Numero de fetos" value={getOptionLabel(fetusCountOptions, payload.study_context.fetus_count)} md={3} />
                {payload.study_context.fetus_count > 1 && <DisplayField label="Feto activo" value={`Feto ${payload.study_context.selected_fetus}`} md={3} />}
              </Grid>
            </DisplaySectionCard>
            <DisplayFieldsSection title={`2. Tamizaje de alteraciones en el crecimiento - ${selectedFetusLabel}`} icon="/img/reports/sdg5.png" fields={growthFields} source={selectedFetus?.growth_screening} hiddenFields={hiddenFields} />
            <DisplayFieldsSection title={`3. Tamizaje obstetrico basico - ${selectedFetusLabel}`} icon="/img/reports/tob.png" fields={basicFields} source={selectedFetus?.basic_screening} hiddenFields={hiddenFields} />
            <AnatomyDisplaySection title={`4. Tamizaje defectos estructurales - ${selectedFetusLabel}`} source={selectedFetus?.anatomical_screening} hiddenFields={hiddenFields} />
            <ScreeningDisplaySection source={selectedFetus?.screenings} groups={variantConfig.screeningGroups} hiddenFields={hiddenFields} startNumber={5} selectedFetusLabel={selectedFetusLabel} />
            <DisplaySectionCard title={variantConfig.interpretationTitle} icon="/img/reports/1721936.png"><UltrasoundInterpretationDisplay items={payload.interpretation_ultrasounds} showHeader={false} /></DisplaySectionCard>
            <DisplayFieldsSection title={variantConfig.conclusionTitle} fields={variantConfig.conclusionFields} source={payload.conclusion} hiddenFields={hiddenFields} />
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

export default memo(PatientGeneticReportBuilder);






