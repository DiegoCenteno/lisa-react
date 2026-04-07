import type { ClinicalHistory, Patient } from '../types';

type HistoryRecord = Record<string, unknown>;

const EDUCATION_LABELS: Record<string, string> = {
  escolaridad1: 'Ninguna',
  escolaridad2: 'Primaria',
  escolaridad3: 'Secundaria',
  escolaridad4: 'Preparatoria',
  escolaridad5: 'Carrera técnica',
  escolaridad6: 'Licenciatura',
  escolaridad7: 'Posgrado',
};

const EDUCATION_CODES = Object.fromEntries(
  Object.entries(EDUCATION_LABELS).map(([code, label]) => [label.toLowerCase(), code])
);

const BLOOD_TYPE_LABELS: Record<string, string> = {
  sangreop: 'O+',
  sangreon: 'O-',
  sangreap: 'A+',
  sangrean: 'A-',
  sangrebp: 'B+',
  sangrebn: 'B-',
  sangreabp: 'AB+',
  sangreabn: 'AB-',
};

const BLOOD_TYPE_CODES = Object.fromEntries(
  Object.entries(BLOOD_TYPE_LABELS).map(([code, label]) => [label.toLowerCase(), code])
);

function asRecord(value: unknown): HistoryRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return value as HistoryRecord;
}

function asString(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function hasFlag(record: HistoryRecord, key: string): boolean {
  return asString(record[key]) !== '';
}

function textFromFlag(record: HistoryRecord, flagKey: string, textKey: string): string {
  const text = asString(record[textKey]);
  if (text) return text;
  return hasFlag(record, flagKey) ? 'Sí' : '';
}

function boolFromText(value?: string): boolean {
  return String(value ?? '').toLowerCase() === 'sí' || String(value ?? '').toLowerCase() === 'si';
}

function setValue(record: HistoryRecord, key: string, value?: string) {
  const normalized = asString(value);
  if (normalized) {
    record[key] = normalized;
  } else {
    delete record[key];
  }
}

function setFlagWithText(record: HistoryRecord, flagKey: string, enabled: boolean, textKey: string, value?: string) {
  if (enabled) {
    record[flagKey] = flagKey;
  } else {
    delete record[flagKey];
  }
  setValue(record, textKey, value);
}

function setPureFlag(record: HistoryRecord, flagKey: string, enabled?: boolean) {
  if (enabled) {
    record[flagKey] = flagKey;
  } else {
    delete record[flagKey];
  }
}

export function createEmptyClinicalHistory(patientId: number, allergy?: string, raw?: HistoryRecord): ClinicalHistory {
  return {
    id: patientId,
    patient_id: patientId,
    raw_datahc: raw ?? {},
    reference_physician: '',
    hereditary_background: {
      blood_type_rh: '',
    },
    personal_non_pathological: {},
    personal_pathological: {
      allergies: allergy ?? '',
    },
    gynecological: {
      pregnant: false,
    },
  };
}

export function decodeClinicalHistory(patient: Patient): ClinicalHistory {
  const raw = asRecord(patient.datahc);

  return {
    id: patient.id,
    patient_id: patient.id,
    raw_datahc: raw,
    reference_physician: asString(raw.medicoreferencia),
    hereditary_background: {
      blood_type_rh: BLOOD_TYPE_LABELS[asString(raw.tiposangre)] ?? asString(raw.tiposangre),
      cgdm_checked: hasFlag(raw, 'cgdm'),
      cgdm: textFromFlag(raw, 'cgdm', 'txtcgdm'),
      consanguineous_checked: hasFlag(raw, 'consanguineos'),
      consanguineous: textFromFlag(raw, 'consanguineos', 'txtconsanguineos'),
      genetic_defects_checked: hasFlag(raw, 'geneticosodefectos'),
      genetic_defects: textFromFlag(raw, 'geneticosodefectos', 'txtgeneticosodefectos'),
      family_preeclampsia_checked: hasFlag(raw, 'familiarpreeclampsia'),
      family_preeclampsia: textFromFlag(raw, 'familiarpreeclampsia', 'txtfamiliarpreeclampsia'),
      partner_history_checked: hasFlag(raw, 'familiarpareja'),
      partner_history_name: asString(raw.txtfamiliarparejanombre),
      partner_history_age: asString(raw.txtfamiliarparejaedad),
      partner_app_checked: hasFlag(raw, 'parejaapp'),
      partner_genetic_defects_checked: hasFlag(raw, 'parejageneticos'),
      diabetes_checked: hasFlag(raw, 'diabetes'),
      diabetes: textFromFlag(raw, 'diabetes', 'txtdiabetes'),
      cancer_checked: hasFlag(raw, 'cancer'),
      cancer: textFromFlag(raw, 'cancer', 'txtcancer'),
      hypertension_checked: hasFlag(raw, 'hipertension'),
      hypertension: textFromFlag(raw, 'hipertension', 'txthipertension'),
      rheumatic_disease_checked: hasFlag(raw, 'reumatica'),
      rheumatic_disease: textFromFlag(raw, 'reumatica', 'txtreumatica'),
      others_checked: hasFlag(raw, 'antfam'),
      others: textFromFlag(raw, 'antfam', 'txtantfam'),
    },
    personal_non_pathological: {
      origin: asString(raw.originaria),
      residence: asString(raw.residente),
      civil_status: asString(raw.estadocivil),
      religion: asString(raw.religion),
      education: EDUCATION_LABELS[asString(raw.escolaridad)] ?? asString(raw.escolaridad),
      occupation: asString(raw.ocupacion),
      substance_use_checked: hasFlag(raw, 'toxicomanias'),
      substance_use: textFromFlag(raw, 'toxicomanias', 'txttoxicomanias'),
      medications_checked: hasFlag(raw, 'farmacos'),
      medications: textFromFlag(raw, 'farmacos', 'txtfarmacos'),
      exposures_checked: hasFlag(raw, 'exposiciones'),
      exposures: textFromFlag(raw, 'exposiciones', 'txtexposiciones'),
      smoking_checked: hasFlag(raw, 'tabaquismo'),
      smoking: textFromFlag(raw, 'tabaquismo', 'txttabaquismo'),
      alcohol_checked: hasFlag(raw, 'bebidas'),
      alcohol: textFromFlag(raw, 'bebidas', 'txtbebidas'),
      homosexual_relations_checked: hasFlag(raw, 'homosex'),
      homosexual_relations: textFromFlag(raw, 'homosex', 'txthomosex'),
      exercise_checked: hasFlag(raw, 'ejercicio'),
      exercise: textFromFlag(raw, 'ejercicio', 'txtejercicio'),
      others_checked: hasFlag(raw, 'persnopat'),
      others: textFromFlag(raw, 'persnopat', 'txtpersnopat'),
    },
    personal_pathological: {
      allergies: patient.allergy ?? '',
      down_syndrome_child_checked: hasFlag(raw, 'hijosindromedown'),
      down_syndrome_child: textFromFlag(raw, 'hijosindromedown', 'txthijosindromedown'),
      chronic_diseases_checked: hasFlag(raw, 'degenerativas'),
      chronic_diseases: textFromFlag(raw, 'degenerativas', 'txtdegenerativas'),
      surgeries_checked: hasFlag(raw, 'cirujias'),
      surgeries: textFromFlag(raw, 'cirujias', 'txtcirujias'),
      transfusions_checked: hasFlag(raw, 'transfusiones'),
      transfusions: textFromFlag(raw, 'transfusiones', 'txttransfusiones'),
      fractures_checked: hasFlag(raw, 'fracturas'),
      fractures: textFromFlag(raw, 'fracturas', 'txtfracturas'),
      others_checked: hasFlag(raw, 'perspat'),
      others: textFromFlag(raw, 'perspat', 'txtperspat'),
    },
    gynecological: {
      menarche: asString(raw.menarca),
      menstrual_cycles: asString(raw.ciclosmestruales),
      pregnant: hasFlag(raw, 'embarazada'),
      pregnancy_achieved: asString(raw.embarazologrado),
      pregnancy_type: asString(raw.tipoembarazo),
      obstetric_pathology: asString(raw.patoobste),
      pregnancy_bp: asString(raw.embta),
      pregnancy_weight: asString(raw.embpeso),
      pregnancy_height: asString(raw.embtalla),
      ovum_donation_checked: hasFlag(raw, 'donacionovulos'),
      ovum_donor_birth_date: asString(raw.fndonadorov),
      ovum_donor_age: asString(raw.edaddonadorov),
      pregnancy_notes: asString(raw.txtembarazada),
      last_menstruation_date: asString(raw.fur),
      ultrasound1_checked: hasFlag(raw, 'ultrasonido1'),
      ultrasound1_date: asString(raw.fechaultra1),
      ultrasound1_weeks: asString(raw.fetometria1),
      ultrasound1_days: asString(raw.fetometrib1),
      ultrasound1_notes: asString(raw.txtultrasonido1),
      ultrasound2_checked: hasFlag(raw, 'ultrasonido2'),
      ultrasound2_date: asString(raw.fechaultra2),
      ultrasound2_weeks: asString(raw.fetometria2),
      ultrasound2_days: asString(raw.fetometrib2),
      ultrasound2_notes: asString(raw.txtultrasonido2),
      ultrasound3_checked: hasFlag(raw, 'ultrasonido3'),
      ultrasound3_date: asString(raw.fechaultra3),
      ultrasound3_weeks: asString(raw.fetometria3),
      ultrasound3_days: asString(raw.fetometrib3),
      ultrasound3_notes: asString(raw.txtultrasonido3),
      ultrasound4_checked: hasFlag(raw, 'ultrasonido4'),
      ultrasound4_date: asString(raw.fechaultra4),
      ultrasound4_weeks: asString(raw.fetometria4),
      ultrasound4_days: asString(raw.fetometrib4),
      ultrasound4_notes: asString(raw.txtultrasonido4),
      ultrasound5_checked: hasFlag(raw, 'ultrasonido5'),
      ultrasound5_date: asString(raw.fechaultra5),
      ultrasound5_weeks: asString(raw.fetometria5),
      ultrasound5_days: asString(raw.fetometrib5),
      ultrasound5_notes: asString(raw.txtultrasonido5),
      ivsa: asString(raw.ivsa),
      sexual_partners: asString(raw.parejassexuales),
      std_checked: hasFlag(raw, 'ets'),
      std: textFromFlag(raw, 'ets', 'txtets'),
      cytology: asString(raw.citologia),
      family_planning: asString(raw.planificacionfamiliar),
      gestations_checked: hasFlag(raw, 'gestaciones'),
      gestations: asString(raw.txtgestas),
      last_gestation_date: asString(raw.gestacion),
      deliveries: asString(raw.txtpartos),
      cesareans: asString(raw.txtcesareas),
      abortions: asString(raw.txtabortos),
      ectopic: asString(raw.txtetopicos),
      molar: asString(raw.txtmolar),
      menopause_age: asString(raw.txtdejoreglar),
      climacteric_symptoms_checked: hasFlag(raw, 'climaterio'),
      climacteric_symptoms: textFromFlag(raw, 'climaterio', 'txtclimaterio'),
      prenatal_care_checked: hasFlag(raw, 'controlprenatal'),
      prenatal_care: textFromFlag(raw, 'controlprenatal', 'txtcontrolprenatal'),
    },
  };
}

export function encodeClinicalHistory(history: ClinicalHistory): HistoryRecord {
  const raw = { ...asRecord(history.raw_datahc) };
  const hereditary = history.hereditary_background;
  const nonPath = history.personal_non_pathological;
  const pathological = history.personal_pathological;
  const gyn = history.gynecological ?? {};

  setValue(raw, 'medicoreferencia', history.reference_physician);
  const bloodTypeCode = BLOOD_TYPE_CODES[asString(hereditary.blood_type_rh).toLowerCase()];
  setValue(raw, 'tiposangre', bloodTypeCode ?? hereditary.blood_type_rh);
  setFlagWithText(raw, 'cgdm', Boolean(hereditary.cgdm_checked), 'txtcgdm', hereditary.cgdm);
  setFlagWithText(raw, 'consanguineos', Boolean(hereditary.consanguineous_checked), 'txtconsanguineos', hereditary.consanguineous);
  setFlagWithText(raw, 'geneticosodefectos', Boolean(hereditary.genetic_defects_checked), 'txtgeneticosodefectos', hereditary.genetic_defects);
  setFlagWithText(raw, 'familiarpreeclampsia', Boolean(hereditary.family_preeclampsia_checked), 'txtfamiliarpreeclampsia', hereditary.family_preeclampsia);
  setPureFlag(raw, 'familiarpareja', hereditary.partner_history_checked);
  setValue(raw, 'txtfamiliarparejanombre', hereditary.partner_history_name);
  setValue(raw, 'txtfamiliarparejaedad', hereditary.partner_history_age);
  setPureFlag(raw, 'parejaapp', hereditary.partner_app_checked);
  setPureFlag(raw, 'parejageneticos', hereditary.partner_genetic_defects_checked);
  setFlagWithText(raw, 'diabetes', Boolean(hereditary.diabetes_checked), 'txtdiabetes', hereditary.diabetes);
  setFlagWithText(raw, 'cancer', Boolean(hereditary.cancer_checked), 'txtcancer', hereditary.cancer);
  setFlagWithText(raw, 'hipertension', Boolean(hereditary.hypertension_checked), 'txthipertension', hereditary.hypertension);
  setFlagWithText(raw, 'reumatica', Boolean(hereditary.rheumatic_disease_checked), 'txtreumatica', hereditary.rheumatic_disease);
  setFlagWithText(raw, 'antfam', Boolean(hereditary.others_checked), 'txtantfam', hereditary.others);

  setValue(raw, 'originaria', nonPath.origin);
  setValue(raw, 'residente', nonPath.residence);
  setValue(raw, 'estadocivil', nonPath.civil_status);
  setValue(raw, 'religion', nonPath.religion);
  const educationCode = EDUCATION_CODES[asString(nonPath.education).toLowerCase()];
  setValue(raw, 'escolaridad', educationCode ?? nonPath.education);
  setValue(raw, 'ocupacion', nonPath.occupation);
  setFlagWithText(raw, 'toxicomanias', Boolean(nonPath.substance_use_checked), 'txttoxicomanias', nonPath.substance_use);
  setFlagWithText(raw, 'farmacos', Boolean(nonPath.medications_checked), 'txtfarmacos', nonPath.medications);
  setFlagWithText(raw, 'exposiciones', Boolean(nonPath.exposures_checked), 'txtexposiciones', nonPath.exposures);
  setFlagWithText(raw, 'tabaquismo', Boolean(nonPath.smoking_checked), 'txttabaquismo', nonPath.smoking);
  setFlagWithText(raw, 'bebidas', Boolean(nonPath.alcohol_checked), 'txtbebidas', nonPath.alcohol);
  setFlagWithText(raw, 'homosex', Boolean(nonPath.homosexual_relations_checked), 'txthomosex', nonPath.homosexual_relations);
  setFlagWithText(raw, 'ejercicio', Boolean(nonPath.exercise_checked), 'txtejercicio', nonPath.exercise);
  setFlagWithText(raw, 'persnopat', Boolean(nonPath.others_checked), 'txtpersnopat', nonPath.others);

  setFlagWithText(raw, 'hijosindromedown', Boolean(pathological.down_syndrome_child_checked), 'txthijosindromedown', pathological.down_syndrome_child);
  setFlagWithText(raw, 'degenerativas', Boolean(pathological.chronic_diseases_checked), 'txtdegenerativas', pathological.chronic_diseases);
  setFlagWithText(raw, 'cirujias', Boolean(pathological.surgeries_checked), 'txtcirujias', pathological.surgeries);
  setFlagWithText(raw, 'transfusiones', Boolean(pathological.transfusions_checked), 'txttransfusiones', pathological.transfusions);
  setFlagWithText(raw, 'fracturas', Boolean(pathological.fractures_checked), 'txtfracturas', pathological.fractures);
  setFlagWithText(raw, 'perspat', Boolean(pathological.others_checked), 'txtperspat', pathological.others);

  setValue(raw, 'menarca', gyn.menarche);
  setValue(raw, 'ciclosmestruales', gyn.menstrual_cycles);
  setPureFlag(raw, 'embarazada', gyn.pregnant);
  setValue(raw, 'embarazologrado', gyn.pregnancy_achieved);
  setValue(raw, 'tipoembarazo', gyn.pregnancy_type);
  setValue(raw, 'patoobste', gyn.obstetric_pathology);
  setValue(raw, 'embta', gyn.pregnancy_bp);
  setValue(raw, 'embpeso', gyn.pregnancy_weight);
  setValue(raw, 'embtalla', gyn.pregnancy_height);
  setPureFlag(raw, 'donacionovulos', gyn.ovum_donation_checked);
  setValue(raw, 'fndonadorov', gyn.ovum_donor_birth_date);
  setValue(raw, 'edaddonadorov', gyn.ovum_donor_age);
  setValue(raw, 'txtembarazada', gyn.pregnancy_notes);
  setValue(raw, 'fur', gyn.last_menstruation_date);

  for (const index of [1, 2, 3, 4, 5] as const) {
    const prefix = `ultrasound${index}` as const;
    const legacyIndex = String(index);
    setPureFlag(raw, `ultrasonido${legacyIndex}`, boolFromText(String(gyn[`${prefix}_checked` as keyof typeof gyn] ?? '')) || Boolean(gyn[`${prefix}_checked` as keyof typeof gyn]));
    setValue(raw, `fechaultra${legacyIndex}`, asString(gyn[`${prefix}_date` as keyof typeof gyn]));
    setValue(raw, `fetometria${legacyIndex}`, asString(gyn[`${prefix}_weeks` as keyof typeof gyn]));
    setValue(raw, `fetometrib${legacyIndex}`, asString(gyn[`${prefix}_days` as keyof typeof gyn]));
    setValue(raw, `txtultrasonido${legacyIndex}`, asString(gyn[`${prefix}_notes` as keyof typeof gyn]));
  }

  setValue(raw, 'ivsa', gyn.ivsa);
  setValue(raw, 'parejassexuales', gyn.sexual_partners);
  setFlagWithText(raw, 'ets', Boolean(gyn.std_checked), 'txtets', gyn.std);
  setValue(raw, 'citologia', gyn.cytology);
  setValue(raw, 'planificacionfamiliar', gyn.family_planning);
  setPureFlag(raw, 'gestaciones', gyn.gestations_checked);
  setValue(raw, 'txtgestas', gyn.gestations);
  setValue(raw, 'gestacion', gyn.last_gestation_date);
  setValue(raw, 'txtpartos', gyn.deliveries);
  setValue(raw, 'txtcesareas', gyn.cesareans);
  setValue(raw, 'txtabortos', gyn.abortions);
  setValue(raw, 'txtetopicos', gyn.ectopic);
  setValue(raw, 'txtmolar', gyn.molar);
  setValue(raw, 'txtdejoreglar', gyn.menopause_age);
  setFlagWithText(raw, 'climaterio', Boolean(gyn.climacteric_symptoms_checked), 'txtclimaterio', gyn.climacteric_symptoms);
  setFlagWithText(raw, 'controlprenatal', Boolean(gyn.prenatal_care_checked), 'txtcontrolprenatal', gyn.prenatal_care);

  return raw;
}

export const clinicalHistoryCatalogs = {
  education: Object.values(EDUCATION_LABELS),
  bloodTypes: Object.values(BLOOD_TYPE_LABELS),
  pregnancyAchieved: ['espontaneo', 'planeado'],
  pregnancyType: ['unico', 'multiple'],
};
