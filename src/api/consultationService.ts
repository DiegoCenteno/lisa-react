import type { ConsultationListItem, PatientFile, PendingStudyDeliveryLink } from '../types';
import apiClient from './client';
import { appointmentService } from './appointmentService';

interface ApiConsultationsResponse {
  status: string;
  data: ConsultationListItem[];
}

interface DailyNotePayload {
  patient_id: number;
  office_id: number;
  currentcondition?: string;
  ailingdate?: string;
  height?: string;
  weight?: string;
  ta?: string;
  temp?: string;
  fc?: string;
  os?: string;
  studies?: string;
  furupdate?: string;
  embarazadaupdate?: boolean;
  examination?: string;
  diagnostics?: string[];
  medications?: Array<{
    medicament?: string;
    prescription?: string;
  }>;
  indicaciones?: string;
  notes?: string;
  office_label_ids?: number[];
}

interface DownloadPrescriptionPayload {
  patient_id: number;
  office_id?: number;
  prescription_date?: string;
  height?: string;
  weight?: string;
  ta?: string;
  temp?: string;
  fc?: string;
  os?: string;
  diagnostics?: string[];
  medications?: Array<{
    medicament?: string;
    prescription?: string;
  }>;
  indicaciones?: string;
}

export interface BasicObstetricMeasurementPayload {
  value: string;
  sdg: string;
}

export interface BasicObstetricFetusPayload {
  fetus_number: number;
  growth_screening: {
    dbp: BasicObstetricMeasurementPayload;
    cc: BasicObstetricMeasurementPayload;
    ca: BasicObstetricMeasurementPayload;
    lf: BasicObstetricMeasurementPayload;
    average_fetometry: string;
    estimated_weight: string;
    percentile: string;
  };
  basic_screening: {
    presentation: string;
    situation: string;
    back: string;
    fetal_heart_rate: string;
    placenta_cervix_relation: string;
    rhythm: string;
    fetal_movements: string;
    placenta_location: string;
    placenta_characteristics: string;
    amniotic_fluid: string;
    cvm: string;
    phelan: string;
    uterus_and_adnexa: string;
    cervical_length: string;
    internal_cervical_os: string;
  };
}

export interface BasicObstetricInterpretationUltrasoundPayload {
  enabled: boolean;
  study_date: string;
  fetometry_weeks: string;
  fetometry_days: string;
  notes: string;
}

export interface BasicObstetricConclusionPayload {
  fetus_count_risk: string;
  growth_risk: string;
  frequency_risk: string;
  placenta_risk: string;
  amniotic_fluid_risk: string;
  uterus_and_adnexa_risk: string;
  preterm_birth_risk: string;
  comments: string;
  recommended_next_study: string;
  recommended_start_date: string;
  recommended_end_date: string;
}

export interface BasicObstetricReportPayload {
  study_context: {
    reference_physician: string;
    fetus_count: number;
    selected_fetus: number;
  };
  fetuses: BasicObstetricFetusPayload[];
  interpretation_ultrasounds: BasicObstetricInterpretationUltrasoundPayload[];
  conclusion: BasicObstetricConclusionPayload;
}

export interface NuchalTranslucencyFetusPayload {
  fetus_number: number;
  growth_screening: {
    lcc: BasicObstetricMeasurementPayload;
    dbp: BasicObstetricMeasurementPayload;
    cc: BasicObstetricMeasurementPayload;
    ca: BasicObstetricMeasurementPayload;
    lf: BasicObstetricMeasurementPayload;
    average_fetometry: string;
    estimated_weight: string;
  };
  basic_screening: {
    fetal_heart_rate: string;
    rhythm: string;
    fetal_movements: string;
    placenta_location: string;
    placenta_characteristics: string;
    amniotic_fluid: string;
    cvm: string;
    phelan: string;
    uterus_and_adnexa: string;
    cervical_length: string;
    internal_cervical_os: string;
    umbilical_cord: string;
  };
  anatomical_screening: {
    central_nervous_system: {
      skull: string;
      midline: string;
      choroid_plexuses: string;
    };
    face: {
      orbits: string;
      profile: string;
      nose_and_lips: string;
    };
    spine_and_neck: {
      spine: string;
      neck: string;
    };
    thorax: {
      situs: string;
      axis: string;
      thoracic_wall: string;
      diaphragm: string;
      lung_area: string;
    };
    heart: {
      size: string;
      position: string;
      rate: string;
      rhythm: string;
    };
    abdomen: {
      abdominal_wall: string;
      stomach: string;
      liver: string;
      intestine: string;
      kidneys: string;
      bladder: string;
      cord_insertion: string;
      umbilical_vessels: string;
    };
    extremities: {
      upper_right: string;
      upper_left: string;
      lower_right: string;
      lower_left: string;
      genitalia: string;
    };
  };
  screenings: {
    preeclampsia: {
      uterine_right_ip: string;
      uterine_left_ip: string;
      average_ip: string;
      percentile: string;
      early_risk: string;
    };
    cardiopathy: {
      ductus_venosus: string;
    };
    chromosomopathies: {
      nuchal_translucency: string;
      nasal_bone: string;
      ductus_venosus: string;
      ductus_venosus_ip: string;
      tricuspid_flow: string;
      down_syndrome_previous_risk: string;
      down_syndrome_posterior_risk: string;
      trisomy18_previous_risk: string;
      trisomy18_posterior_risk: string;
    };
  };
}

export interface NuchalTranslucencyConclusionPayload {
  fetus_count_risk: string;
  growth_risk: string;
  frequency_risk: string;
  placenta_risk: string;
  amniotic_fluid_risk: string;
  uterus_and_adnexa_risk: string;
  preterm_birth_risk: string;
  structural_risk: string;
  cardiopathy_risk: string;
  preeclampsia_risk: string;
  chromosomopathies_risk: string;
  comments: string;
  recommended_next_study: string;
  recommended_start_date: string;
  recommended_end_date: string;
}

export interface NuchalTranslucencyReportPayload {
  study_context: {
    reference_physician: string;
    fetus_count: number;
    selected_fetus: number;
  };
  fetuses: NuchalTranslucencyFetusPayload[];
  interpretation_ultrasounds: BasicObstetricInterpretationUltrasoundPayload[];
  conclusion: NuchalTranslucencyConclusionPayload;
}

export interface GeneticStructuralScreeningPayload {
  central_nervous_system: {
    skull: string;
    midline: string;
    thalami: string;
    cavum_septum_pellucidum: string;
    lateral_ventricle: string;
    lateral_ventricle_mm: string;
    choroid_plexuses: string;
    cerebral_peduncles: string;
    cerebral_hemispheres: string;
    cerebellum: string;
    cisterna_magna: string;
    cisterna_magna_mm: string;
  };
  face: {
    orbits_and_lenses: string;
    nose_and_upper_lip: string;
    profile: string;
  };
  spine_and_neck: {
    spine: string;
    neck: string;
  };
  thorax: {
    thoracic_wall: string;
    lung_area: string;
    diaphragm: string;
  };
  heart: {
    size: string;
    axis: string;
    situs: string;
    fetal_heart_rate: string;
    rhythm: string;
    atrial_ventricular_chambers: string;
    valvular_apparatus: string;
    interventricular_septum: string;
    interatrial_septum_foramen_ovale: string;
    pulmonary_veins: string;
    aortic_outflow: string;
    pulmonary_outflow: string;
    three_vessel_view: string;
    three_vessel_trachea_view: string;
  };
  abdomen: {
    abdominal_wall: string;
    stomach: string;
    liver: string;
    intestine: string;
    kidneys: string;
    bladder: string;
    cord_insertion: string;
    umbilical_vessels: string;
  };
  extremities: {
    upper_right: string;
    upper_left: string;
    lower_right: string;
    lower_left: string;
    genitalia: string;
  };
}

export interface GeneticFetusPayload {
  fetus_number: number;
  growth_screening: {
    dbp: BasicObstetricMeasurementPayload;
    cc: BasicObstetricMeasurementPayload;
    ca: BasicObstetricMeasurementPayload;
    lf: BasicObstetricMeasurementPayload;
    lt: BasicObstetricMeasurementPayload;
    lh: BasicObstetricMeasurementPayload;
    lc: BasicObstetricMeasurementPayload;
    cerebellum: BasicObstetricMeasurementPayload;
    average_fetometry: string;
    estimated_weight: string;
    percentile: string;
  };
  basic_screening: {
    presentation: string;
    situation: string;
    back: string;
    fetal_heart_rate: string;
    rhythm: string;
    fetal_movements: string;
    placenta_location: string;
    placenta_characteristics: string;
    placenta_cervix_relation: string;
    amniotic_fluid: string;
    cvm: string;
    phelan: string;
    uterus_and_adnexa: string;
    cervical_length: string;
    internal_cervical_os: string;
  };
  structural_screening: GeneticStructuralScreeningPayload;
}

export interface GeneticReportPayload {
  study_context: {
    reference_physician: string;
    fetus_count: number;
    selected_fetus: number;
  };
  fetuses: GeneticFetusPayload[];
  interpretation_ultrasounds: BasicObstetricInterpretationUltrasoundPayload[];
  conclusion: BasicObstetricConclusionPayload;
}

export interface FetalVitalityFetusPayload {
  fetus_number: number;
  growth_screening: {
    lcc: BasicObstetricMeasurementPayload;
    dbp: BasicObstetricMeasurementPayload;
    average_fetometry: string;
  };
  basic_screening: {
    gestational_sac: string;
    gestational_sac_characteristics: string;
    decidual_reaction: string;
    yolk_vesicle_mm: string;
    yolk_vesicle_characteristics: string;
    embryo: string;
    embryonic_heart_rate: string;
    uterus_and_adnexa: string;
    cervical_length: string;
    internal_cervical_os: string;
  };
}

export interface FetalVitalityConclusionPayload {
  fetus_count_risk: string;
  growth_risk: string;
  frequency_risk: string;
  prognosis_data: string;
  uterus_and_adnexa_risk: string;
  comments: string;
  recommended_next_study: string;
  recommended_start_date: string;
  recommended_end_date: string;
}

export interface FetalVitalityReportPayload {
  study_context: {
    reference_physician: string;
    fetus_count: number;
    selected_fetus: number;
  };
  fetuses: FetalVitalityFetusPayload[];
  interpretation_ultrasounds: BasicObstetricInterpretationUltrasoundPayload[];
  conclusion: FetalVitalityConclusionPayload;
}

export interface PatientReportItem {
  id: number;
  created_at?: string | null;
  created_at_label: string;
  type_key: string;
  type_label: string;
  source_kind?: 'v2' | 'legacy';
  legacy_source?: 'ultrasonidos';
  can_migrate?: boolean;
  is_migrated?: boolean;
  migrated_report_id?: number | null;
  editor_url?: string | null;
}

export interface PatientReportRecord<TPayload = unknown> {
  id: number;
  office_id: number;
  patient_id: number;
  report_type_key: string;
  title?: string | null;
  report_date?: string | null;
  status: number;
  report_payload?: TPayload | null;
  form_config?: {
    hidden_fields?: string[];
  };
  created_by?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface PatientPdfTemplateSummary {
  id: number;
  name: string;
  description?: string | null;
  output_file_name: string;
  template_category: string;
  fields_count: number;
  study_type?: {
    id: number;
    name: string;
  } | null;
  laboratory?: {
    id: number;
    name: string;
  } | null;
}

export interface PatientReportsData {
  patient_id: number;
  office_id: number;
  reports_enabled: Array<{
    key: string;
    label: string;
  }>;
  pdf_templates_enabled?: PatientPdfTemplateSummary[];
  last_report_type_key?: string | null;
  last_report_type_label?: string | null;
  last_report_date_label?: string | null;
  items: PatientReportItem[];
  legacy_items?: PatientReportItem[];
}

export interface PatientPdfTemplateBuilderOption {
  id: number;
  option_key: string;
  label: string;
  value: string;
  pdf_field_name?: string | null;
  is_default: boolean;
}

export interface PatientPdfTemplateBuilderField {
  id: number;
  field_key: string;
  label: string;
  field_type: 'text' | 'textarea' | 'date' | 'checkbox' | 'select' | 'radio_group' | 'checkbox_group';
  source_mode: 'system' | 'system_editable' | 'manual';
  source_path?: string | null;
  pdf_field_name?: string | null;
  is_required: boolean;
  max_length?: number | null;
  date_format?: string | null;
  placeholder?: string | null;
  help_text?: string | null;
  status: string;
  selection_mode?: 'single' | 'multiple' | '' | null;
  editable: boolean;
  initial_value: string | boolean | string[];
  ui?: {
    xs?: number;
    md?: number;
  } | null;
  options: PatientPdfTemplateBuilderOption[];
}

export interface PatientPdfTemplateBuilderSection {
  label: string;
  fields: PatientPdfTemplateBuilderField[];
}

export interface PatientPdfTemplateBuilderData {
  template: {
    id: number;
    name: string;
    description?: string | null;
    output_file_name: string;
    template_category: string;
    requires_study_link?: boolean;
    study_type?: {
      id: number;
      name: string;
    } | null;
    laboratory?: {
      id: number;
      name: string;
    } | null;
  };
  patient: {
    id: number;
    full_name: string;
    age?: string | null;
    allergy?: string | null;
    datahc?: unknown;
  };
  last_consultation?: {
    id: number;
    created_at?: string | null;
    ailingdate?: string;
    currentcondition?: string;
    height?: string;
    weight?: string;
    ta?: string;
    temp?: string;
    fc?: string;
    os?: string;
    studies?: string;
    examination?: string;
    indicaciones?: string;
    notes?: string;
    diagnostics?: string[];
    medications?: Array<{
      medicament: string;
      prescription?: string;
    }>;
  } | null;
  linked_study_delivery?: {
    id: number;
    study_type_id?: number | null;
    processing_status: string;
    study_name?: string | null;
    laboratory_name?: string | null;
    label: string;
  } | null;
  available_study_links?: PendingStudyDeliveryLink[];
  sections: PatientPdfTemplateBuilderSection[];
}

export interface ColposcopyReportBuilderData {
  report: {
    id: number;
    title?: string | null;
    report_type_key: string;
    report_date?: string | null;
  };
  selected_file_ids: number[];
  is_locked: boolean;
  can_download: boolean;
  sessions: Array<{
    id: number;
    title: string;
    captured_on?: string | null;
    captured_on_label?: string | null;
    files_count: number;
    files: PatientFile[];
  }>;
}

export interface ActiveColposcopyPatientData {
  office_id: number;
  patient_id: number | null;
  changed?: boolean;
  updated_at?: string | null;
}

let officeIdPromise: Promise<number> | null = null;
let activeColposcopyPatientWriteCache:
  | {
      officeId: number;
      patientId: number;
      timestamp: number;
      result: ActiveColposcopyPatientData;
    }
  | null = null;
let activeColposcopyPatientWritePromise:
  | {
      officeId: number;
      patientId: number;
      promise: Promise<ActiveColposcopyPatientData>;
    }
  | null = null;
let activeColposcopyPatientCache:
  | {
      officeId: number;
      currentPatientId: number;
      timestamp: number;
      result: ActiveColposcopyPatientData;
    }
  | null = null;
let activeColposcopyPatientPromise:
  | {
      officeId: number;
      currentPatientId: number;
      promise: Promise<ActiveColposcopyPatientData>;
    }
  | null = null;

export function resetResolvedOfficeIdCache(): void {
  officeIdPromise = null;
  try {
    localStorage.removeItem('cached_office_id');
  } catch {
    // Ignore storage access errors.
  }
  try {
    sessionStorage.removeItem('cached_office_id');
  } catch {
    // Ignore storage access errors.
  }
}

export function primeResolvedOfficeIdCache(officeId: number): void {
  if (!Number.isFinite(officeId) || officeId <= 0) {
    return;
  }

  try {
    sessionStorage.setItem('cached_office_id', String(officeId));
  } catch {
    // Ignore storage access errors.
  }
}

async function resolveOfficeId(): Promise<number> {
  const persistedOfficeId = sessionStorage.getItem('cached_office_id');
  if (persistedOfficeId) {
    const parsedOfficeId = Number(persistedOfficeId);
    if (Number.isFinite(parsedOfficeId) && parsedOfficeId > 0) {
      return parsedOfficeId;
    }
  }

  localStorage.removeItem('cached_office_id');

  if (!officeIdPromise) {
    officeIdPromise = appointmentService.getOffices().then((offices) => {
      if (offices.length === 0) {
        throw new Error('No se encontraron consultorios disponibles');
      }

      const officeId = offices[0].id;
      primeResolvedOfficeIdCache(officeId);
      return officeId;
    }).finally(() => {
      officeIdPromise = null;
    });
  }

  return officeIdPromise;
}

export const consultationService = {
  async getLatestConsultations(): Promise<ConsultationListItem[]> {
    const response = await apiClient.get<ApiConsultationsResponse>('/v2/consultations');
    return response.data.data ?? [];
  },

  async createDailyNote(payload: Omit<DailyNotePayload, 'office_id'> & { office_id?: number }) {
    const officeId = payload.office_id ?? (await resolveOfficeId());

    const response = await apiClient.post('/v2/consultations', {
      ...payload,
      office_id: officeId,
    });

    return response.data;
  },

  async updateDailyNote(
    consultationId: number,
    payload: Omit<DailyNotePayload, 'office_id'> & { office_id?: number }
  ) {
    const officeId = payload.office_id ?? (await resolveOfficeId());

    const response = await apiClient.put(`/v2/consultations/${consultationId}`, {
      ...payload,
      office_id: officeId,
    });

    return response.data;
  },

  async downloadPrescription(payload: DownloadPrescriptionPayload): Promise<Blob> {
    const officeId = payload.office_id ?? (await resolveOfficeId());
    const response = await apiClient.post('/v2/consultations/download-prescription', {
      ...payload,
      office_id: officeId,
    }, {
      responseType: 'blob',
    });

    return response.data;
  },

  async downloadPrescriptionPdf(payload: DownloadPrescriptionPayload): Promise<Blob> {
    const officeId = payload.office_id ?? (await resolveOfficeId());
    const response = await apiClient.post('/v2/consultations/download-prescription-pdf', {
      ...payload,
      office_id: officeId,
    }, {
      responseType: 'blob',
    });

    return response.data;
  },

  async getPatientReports(patientId: number, officeId?: number): Promise<PatientReportsData> {
    const resolvedOfficeId = officeId ?? (await resolveOfficeId());
    const response = await apiClient.get<{ status: string; data: PatientReportsData }>(
      `/v2/patients/${patientId}/reports`,
      { params: { office_id: resolvedOfficeId } }
    );

    return response.data.data;
  },

  async getPatientPdfReportTemplateBuilder(
    patientId: number,
    templateId: number,
    officeId?: number,
    studyDeliveryId?: number | null
  ): Promise<PatientPdfTemplateBuilderData> {
    const resolvedOfficeId = officeId ?? (await resolveOfficeId());
    const response = await apiClient.get<{ status: string; data: PatientPdfTemplateBuilderData }>(
      `/v2/patients/${patientId}/pdf-report-templates/${templateId}/builder`,
      {
        params: {
          office_id: resolvedOfficeId,
          study_delivery_id: studyDeliveryId ?? undefined,
        },
      }
    );

    return response.data.data;
  },

  async downloadPatientPdfTemplateFinalReport(
    patientId: number,
    templateId: number,
    values: Record<string, string | boolean | string[]>,
    officeId?: number,
    studyDeliveryId?: number | null
  ): Promise<Blob> {
    const resolvedOfficeId = officeId ?? (await resolveOfficeId());
    const response = await apiClient.post<Blob>(
      `/v2/patients/${patientId}/pdf-report-templates/${templateId}/download-final-pdf`,
      {
        office_id: resolvedOfficeId,
        study_delivery_id: studyDeliveryId ?? undefined,
        values,
      },
      { responseType: 'blob' }
    );

    return response.data;
  },

  async previewPatientPdfTemplateReport(
    patientId: number,
    templateId: number,
    values: Record<string, string | boolean | string[]>,
    officeId?: number,
    studyDeliveryId?: number | null
  ): Promise<Blob> {
    const resolvedOfficeId = officeId ?? (await resolveOfficeId());
    const response = await apiClient.post<Blob>(
      `/v2/patients/${patientId}/pdf-report-templates/${templateId}/preview-pdf`,
      {
        office_id: resolvedOfficeId,
        study_delivery_id: studyDeliveryId ?? undefined,
        values,
      },
      { responseType: 'blob' }
    );

    return response.data;
  },

  async createPatientReport(
    patientId: number,
    reportKey: string,
    officeId?: number
  ): Promise<{
    id: number;
    type_key: string;
    type_label: string;
    created_at?: string | null;
    created_at_label: string;
    next_view: 'colposcopy' | 'basic_obstetric' | 'nuchal_translucency' | 'genetic' | 'structural' | 'wellbeing' | 'vitality' | 'v2_report_builder_pending';
    editor_url?: string | null;
  }> {
    const resolvedOfficeId = officeId ?? (await resolveOfficeId());
    const response = await apiClient.post<{
      status: string;
      message: string;
      data: {
        id: number;
        type_key: string;
        type_label: string;
        created_at?: string | null;
        created_at_label: string;
        next_view: 'colposcopy' | 'basic_obstetric' | 'nuchal_translucency' | 'genetic' | 'structural' | 'wellbeing' | 'vitality' | 'v2_report_builder_pending';
        editor_url?: string | null;
      };
    }>(`/v2/patients/${patientId}/reports`, {
      office_id: resolvedOfficeId,
      report_key: reportKey,
    });

    return response.data.data;
  },

  async migrateLegacyUltrasoundReport(
    patientId: number,
    legacyId: number,
    officeId?: number
  ): Promise<{
    id: number;
    type_key: string;
    type_label: string;
    created_at?: string | null;
    created_at_label: string;
    next_view: 'basic_obstetric' | 'nuchal_translucency' | 'genetic' | 'structural' | 'wellbeing' | 'vitality';
    editor_url?: string | null;
  }> {
    const resolvedOfficeId = officeId ?? (await resolveOfficeId());
    const response = await apiClient.post<{
      status: string;
      message: string;
      data: {
        id: number;
        type_key: string;
        type_label: string;
        created_at?: string | null;
        created_at_label: string;
        next_view: 'basic_obstetric' | 'nuchal_translucency' | 'genetic' | 'structural' | 'wellbeing' | 'vitality';
        editor_url?: string | null;
      };
    }>(`/v2/patients/${patientId}/legacy-ultrasounds/${legacyId}/migrate`, {
      office_id: resolvedOfficeId,
    });

    return response.data.data;
  },

  async getPatientReport<TPayload = unknown>(reportId: number, officeId?: number): Promise<PatientReportRecord<TPayload>> {
    const resolvedOfficeId = officeId ?? (await resolveOfficeId());
    const response = await apiClient.get<{ status: string; data: PatientReportRecord<TPayload> }>(
      `/v2/patient-reports/${reportId}`,
      { params: { office_id: resolvedOfficeId } }
    );

    return response.data.data;
  },

  async updatePatientReport<TPayload = unknown>(
    reportId: number,
    payload: {
      report_payload: TPayload;
      title?: string;
      report_date?: string;
    },
    officeId?: number
  ): Promise<PatientReportRecord<TPayload>> {
    const resolvedOfficeId = officeId ?? (await resolveOfficeId());
    const response = await apiClient.put<{ status: string; data: PatientReportRecord<TPayload> }>(
      `/v2/patient-reports/${reportId}`,
      {
        office_id: resolvedOfficeId,
        ...payload,
      }
    );

    return response.data.data;
  },

  async getColposcopyReportBuilder(reportId: number, officeId?: number): Promise<ColposcopyReportBuilderData> {
    const resolvedOfficeId = officeId ?? (await resolveOfficeId());
    const response = await apiClient.get<{ status: string; data: ColposcopyReportBuilderData }>(
      `/v2/patient-reports/${reportId}/colposcopy-builder`,
      { params: { office_id: resolvedOfficeId } }
    );

    return response.data.data;
  },

  async updateColposcopyReportFiles(
    reportId: number,
    fileIds: number[],
    officeId?: number
  ): Promise<ColposcopyReportBuilderData> {
    const resolvedOfficeId = officeId ?? (await resolveOfficeId());
    const response = await apiClient.put<{ status: string; data: ColposcopyReportBuilderData }>(
      `/v2/patient-reports/${reportId}/colposcopy-files`,
      {
        office_id: resolvedOfficeId,
        file_ids: fileIds,
      }
    );

    return response.data.data;
  },

  async downloadPatientReportDocx(reportId: number, officeId?: number): Promise<Blob> {
    const resolvedOfficeId = officeId ?? (await resolveOfficeId());
    const response = await apiClient.post<Blob>(
      `/v2/patient-reports/${reportId}/download-docx`,
      {
        office_id: resolvedOfficeId,
      },
      { responseType: 'blob' }
    );

    return response.data;
  },

  async setActiveColposcopyPatient(patientId: number, officeId?: number): Promise<ActiveColposcopyPatientData> {
    const resolvedOfficeId = officeId ?? (await resolveOfficeId());
    const now = Date.now();

    if (
      activeColposcopyPatientWriteCache &&
      activeColposcopyPatientWriteCache.officeId === resolvedOfficeId &&
      activeColposcopyPatientWriteCache.patientId === patientId &&
      now - activeColposcopyPatientWriteCache.timestamp < 30000
    ) {
      return activeColposcopyPatientWriteCache.result;
    }

    if (
      activeColposcopyPatientWritePromise &&
      activeColposcopyPatientWritePromise.officeId === resolvedOfficeId &&
      activeColposcopyPatientWritePromise.patientId === patientId
    ) {
      return activeColposcopyPatientWritePromise.promise;
    }

    const requestPromise = apiClient.post<{ status: string; data: ActiveColposcopyPatientData }>(
      '/v2/datahelp/active-colposcopy-patient',
      {
        office_id: resolvedOfficeId,
        patient_id: patientId,
      }
    ).then((response) => {
      activeColposcopyPatientWriteCache = {
        officeId: resolvedOfficeId,
        patientId,
        timestamp: Date.now(),
        result: response.data.data,
      };

      return response.data.data;
    }).finally(() => {
      activeColposcopyPatientWritePromise = null;
    });

    activeColposcopyPatientWritePromise = {
      officeId: resolvedOfficeId,
      patientId,
      promise: requestPromise,
    };

    return requestPromise;
  },

  async getActiveColposcopyPatient(currentPatientId?: number, officeId?: number): Promise<ActiveColposcopyPatientData> {
    const resolvedOfficeId = officeId ?? (await resolveOfficeId());
    const normalizedPatientId = Number(currentPatientId ?? 0);
    const now = Date.now();

    if (
      activeColposcopyPatientCache &&
      activeColposcopyPatientCache.officeId === resolvedOfficeId &&
      activeColposcopyPatientCache.currentPatientId === normalizedPatientId &&
      now - activeColposcopyPatientCache.timestamp < 30000
    ) {
      return activeColposcopyPatientCache.result;
    }

    if (
      activeColposcopyPatientPromise &&
      activeColposcopyPatientPromise.officeId === resolvedOfficeId &&
      activeColposcopyPatientPromise.currentPatientId === normalizedPatientId
    ) {
      return activeColposcopyPatientPromise.promise;
    }

    const requestPromise = apiClient.get<{ status: string; data: ActiveColposcopyPatientData }>(
      '/v2/datahelp/active-colposcopy-patient',
      {
        params: {
          office_id: resolvedOfficeId,
          current_patient_id: normalizedPatientId,
        },
      }
    ).then((response) => {
      activeColposcopyPatientCache = {
        officeId: resolvedOfficeId,
        currentPatientId: normalizedPatientId,
        timestamp: Date.now(),
        result: response.data.data,
      };

      return response.data.data;
    }).finally(() => {
      activeColposcopyPatientPromise = null;
    });

    activeColposcopyPatientPromise = {
      officeId: resolvedOfficeId,
      currentPatientId: normalizedPatientId,
      promise: requestPromise,
    };

    return requestPromise;
  },
};
