import { type ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Add, ContentCopy, DeleteOutline, ExpandMore } from '@mui/icons-material';
import systemPdfReportTemplateService, {
  type SystemPdfReportTemplateCatalogData,
  type SystemPdfReportTemplateDetectedPdfField,
  type SystemPdfReportTemplateDetail,
  type SystemPdfReportTemplateField,
  type SystemPdfReportTemplateOption,
  type SystemPdfReportTemplateStatus,
  type SystemPdfReportTemplateSummary,
} from '../../api/systemPdfReportTemplateService';
import { getPdfReportTemplateCategoryLabel } from '../../utils/pdfReportTemplateLabels';

type EditableOption = {
  client_id: string;
  option_key: string;
  label: string;
  value: string;
  pdf_field_name: string;
  sort_order: number;
  is_default: boolean;
  status: string;
  meta_json: unknown;
};

type EditableField = {
  client_id: string;
  section_label: string;
  field_key: string;
  label: string;
  field_type: string;
  source_mode: string;
  is_auto_editable: boolean;
  source_path: string;
  pdf_field_name: string;
  is_required: boolean;
  max_length: string;
  date_format: string;
  placeholder: string;
  help_text: string;
  selection_mode: string;
  sort_order: number;
  status: string;
  meta_json: unknown;
  options: EditableOption[];
};

type EditableSection = {
  client_id: string;
  label: string;
};

type TemplateEditorState = {
  name: string;
  description: string;
  output_file_name: string;
  template_category: string;
  laboratory_id: number | '';
  study_type_id: number | '';
  status: SystemPdfReportTemplateStatus;
  base_pdf_file_id: number;
  sections: EditableSection[];
  fields: EditableField[];
};

const STATUS_OPTIONS: Array<{ value: SystemPdfReportTemplateStatus | 'all'; label: string }> = [
  { value: 'pending_review', label: 'Pendientes' },
  { value: 'draft', label: 'Borrador' },
  { value: 'published', label: 'Publicadas' },
  { value: 'archived', label: 'Archivadas' },
  { value: 'all', label: 'Todas' },
];

const STATUS_LABELS: Record<SystemPdfReportTemplateStatus, string> = {
  draft: 'Borrador',
  pending_review: 'Pendiente de revision',
  published: 'Publicada',
  archived: 'Archivada',
};

const STATUS_COLORS: Record<SystemPdfReportTemplateStatus, 'warning' | 'success' | 'default'> = {
  draft: 'default',
  pending_review: 'warning',
  published: 'success',
  archived: 'default',
};

const SIMPLE_FIELD_TYPES = ['text', 'textarea', 'date', 'checkbox'];
const GROUP_FIELD_TYPES = ['select', 'radio_group', 'checkbox_group'];

function createClientId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
}

function createEmptySection(label = ''): EditableSection {
  return {
    client_id: createClientId('section'),
    label,
  };
}

function getBackendErrorMessage(error: unknown): string | null {
  if (
    typeof error === 'object'
    && error !== null
    && 'response' in error
    && typeof (error as { response?: { data?: { message?: unknown } } }).response?.data?.message === 'string'
  ) {
    return String((error as { response?: { data?: { message?: string } } }).response?.data?.message);
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return null;
}

function formatDateTime(value?: string | null): string {
  if (!value) {
    return 'Sin fecha';
  }

  const date = new Date(String(value).replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) {
    return 'Sin fecha';
  }

  return date.toLocaleString('es-MX');
}

function mapOption(option: SystemPdfReportTemplateOption, index: number): EditableOption {
  return {
    client_id: createClientId(`option-${option.id || index + 1}`),
    option_key: option.option_key,
    label: option.label,
    value: option.value,
    pdf_field_name: option.pdf_field_name,
    sort_order: option.sort_order || index + 1,
    is_default: option.is_default,
    status: option.status || 'active',
    meta_json: option.meta_json ?? null,
  };
}

function mapField(field: SystemPdfReportTemplateField, index: number): EditableField {
  return {
    client_id: createClientId(`field-${field.id || index + 1}`),
    section_label: field.section_label || '',
    field_key: field.field_key,
    label: field.label,
    field_type: field.field_type,
    source_mode: field.source_mode,
    is_auto_editable: field.source_mode === 'system_editable',
    source_path: field.source_path || '',
    pdf_field_name: field.pdf_field_name || '',
    is_required: field.is_required,
    max_length: field.max_length ? String(field.max_length) : getDefaultMaxLength(field.field_type),
    date_format: field.date_format || (field.field_type === 'date' ? 'dd/mm/yyyy' : ''),
    placeholder: field.placeholder || '',
    help_text: field.help_text || '',
    selection_mode: field.selection_mode || '',
    sort_order: field.sort_order || index + 1,
    status: field.status || 'active',
    meta_json: field.meta_json ?? null,
    options: (field.options ?? []).map(mapOption),
  };
}

function createEmptyOption(index: number): EditableOption {
  return {
    client_id: createClientId(`new-option-${index + 1}`),
    option_key: '',
    label: '',
    value: '',
    pdf_field_name: '',
    sort_order: index + 1,
    is_default: false,
    status: 'active',
    meta_json: null,
  };
}

function getDefaultSelectionMode(fieldType: string): string {
  if (fieldType === 'radio_group') return 'single';
  if (fieldType === 'checkbox_group') return 'multiple';
  return '';
}

function getDefaultMaxLength(fieldType: string): string {
  if (fieldType === 'text') return '50';
  if (fieldType === 'textarea') return '300';
  return '';
}

function createEmptyField(index: number): EditableField {
  return {
    client_id: createClientId(`new-field-${index + 1}`),
    section_label: '',
    field_key: '',
    label: '',
    field_type: 'text',
    source_mode: 'manual',
    is_auto_editable: false,
    source_path: '',
    pdf_field_name: '',
    is_required: false,
    max_length: getDefaultMaxLength('text'),
    date_format: '',
    placeholder: '',
    help_text: '',
    selection_mode: '',
    sort_order: index + 1,
    status: 'active',
    meta_json: null,
    options: [],
  };
}

function createEmptyFieldForSection(index: number, sectionLabel: string): EditableField {
  return {
    ...createEmptyField(index),
    section_label: sectionLabel,
  };
}

function slugifyFieldKey(value: string, fallback: string): string {
  const normalized = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  return normalized || fallback;
}

function normalizeImportedFieldType(value: unknown): string {
  const normalized = String(value || 'text').trim().toLowerCase();

  switch (normalized) {
    case 'text':
    case 'texto':
      return 'text';
    case 'textarea':
    case 'text_area':
    case 'area_texto':
    case 'area de texto':
      return 'textarea';
    case 'date':
    case 'fecha':
      return 'date';
    case 'checkbox':
    case 'check':
    case 'boolean':
      return 'checkbox';
    case 'checkbox_group':
    case 'checkbox-group':
    case 'checkbox_multiple':
    case 'multiple_checkbox':
    case 'multiple':
      return 'checkbox_group';
    case 'radio_group':
    case 'radio-group':
    case 'radio':
      return 'radio_group';
    case 'select':
    case 'dropdown':
    case 'combo':
      return 'select';
    default:
      return 'text';
  }
}

function normalizeImportedOption(raw: any, index: number): EditableOption {
  if (typeof raw === 'string') {
    const optionKey = slugifyFieldKey(raw, `option_${index + 1}`);
    return {
      client_id: createClientId(`import-option-${index + 1}`),
      option_key: optionKey,
      label: raw,
      value: optionKey,
      pdf_field_name: '',
      sort_order: index + 1,
      is_default: false,
      status: 'active',
      meta_json: null,
    };
  }

  const label = String(raw?.label ?? raw?.name ?? raw?.text ?? raw?.value ?? `Opcion ${index + 1}`).trim();
  const optionKey = String(raw?.option_key ?? raw?.optionKey ?? raw?.key ?? slugifyFieldKey(label, `option_${index + 1}`)).trim();

  return {
    client_id: createClientId(`import-option-${index + 1}`),
    option_key: optionKey,
    label,
    value: String(raw?.value ?? optionKey).trim(),
    pdf_field_name: String(raw?.pdf_field_name ?? raw?.pdfFieldName ?? '').trim(),
    sort_order: Number(raw?.sort_order ?? raw?.sortOrder ?? index + 1),
    is_default: Boolean(raw?.is_default ?? raw?.isDefault ?? false),
    status: String(raw?.status ?? 'active'),
    meta_json: raw?.meta_json ?? raw?.metaJson ?? null,
  };
}

function normalizeImportedField(raw: any, index: number, inheritedSection = ''): EditableField {
  const fieldType = normalizeImportedFieldType(raw?.field_type ?? raw?.fieldType ?? raw?.type);
  const label = String(raw?.label ?? raw?.name ?? raw?.title ?? raw?.field_key ?? raw?.fieldKey ?? raw?.pdf_field_name ?? `Campo ${index + 1}`).trim();
  const fieldKey = String(
    raw?.field_key
    ?? raw?.fieldKey
    ?? slugifyFieldKey(label || String(raw?.pdf_field_name ?? ''), `field_${index + 1}`)
  ).trim();
  const sectionLabel = String(raw?.section_label ?? raw?.section ?? inheritedSection ?? '').trim();
  const optionsRaw = Array.isArray(raw?.options)
    ? raw.options
    : Array.isArray(raw?.choices)
      ? raw.choices
      : Array.isArray(raw?.items)
        ? raw.items
        : [];

  const selectionMode = fieldType === 'radio_group'
    ? 'single'
    : fieldType === 'checkbox_group'
      ? 'multiple'
      : fieldType === 'select'
        ? 'single'
        : String(raw?.selection_mode ?? raw?.selectionMode ?? '').trim();

  const sourcePath = String(raw?.source_path ?? raw?.sourcePath ?? '').trim();
  const sourceMode = String(raw?.source_mode ?? raw?.sourceMode ?? '').trim();
  const isAutoEditable = sourceMode === 'system_editable';
  const importedMeta = raw?.meta_json ?? raw?.metaJson ?? null;
  const importedUi = raw?.ui && typeof raw.ui === 'object' ? raw.ui : null;
  const nextMetaJson = importedUi
    ? {
        ...(typeof importedMeta === 'object' && importedMeta !== null ? importedMeta : {}),
        ui: importedUi,
      }
    : importedMeta;

  return {
    client_id: createClientId(`import-field-${index + 1}`),
    section_label: sectionLabel,
    field_key: fieldKey,
    label,
    field_type: fieldType,
    source_mode: sourcePath ? (isAutoEditable ? 'system_editable' : 'system') : 'manual',
    is_auto_editable: sourcePath ? isAutoEditable : false,
    source_path: sourcePath,
    pdf_field_name: String(raw?.pdf_field_name ?? raw?.pdfFieldName ?? '').trim(),
    is_required: Boolean(raw?.is_required ?? raw?.isRequired ?? false),
    max_length: raw?.max_length ?? raw?.maxLength ? String(raw?.max_length ?? raw?.maxLength) : getDefaultMaxLength(fieldType),
    date_format: String(raw?.date_format ?? raw?.dateFormat ?? '').trim() || (fieldType === 'date' ? 'dd/mm/yyyy' : ''),
    placeholder: String(raw?.placeholder ?? '').trim(),
    help_text: String(raw?.help_text ?? raw?.helpText ?? '').trim(),
    selection_mode: selectionMode,
    sort_order: Number(raw?.sort_order ?? raw?.sortOrder ?? index + 1),
    status: String(raw?.status ?? 'active'),
    meta_json: nextMetaJson,
    options: optionsRaw.map((option: any, optionIndex: number) => normalizeImportedOption(option, optionIndex)),
  };
}

function extractImportedFields(raw: any): EditableField[] {
  if (Array.isArray(raw)) {
    return raw.map((field, index) => normalizeImportedField(field, index));
  }

  if (Array.isArray(raw?.fields)) {
    return raw.fields.map((field: any, index: number) => normalizeImportedField(field, index));
  }

  if (Array.isArray(raw?.sections)) {
    return raw.sections.flatMap((section: any, sectionIndex: number) => {
      const sectionLabel = String(section?.label ?? section?.section_label ?? section?.name ?? `Seccion ${sectionIndex + 1}`).trim();
      const sectionFields = Array.isArray(section?.fields) ? section.fields : [];
      return sectionFields.map((field: any, fieldIndex: number) => normalizeImportedField(field, fieldIndex, sectionLabel));
    });
  }

  throw new Error('El JSON debe contener un arreglo de campos, una propiedad "fields" o una propiedad "sections".');
}

function buildAiImportPromptTemplate(): string {
  return `Devuelve solo JSON valido, sin markdown ni explicaciones.

Objetivo:
- Voy a darte una imagen o recorte de una sola seccion del formato, no el PDF completo.
- Interpreta esa imagen y devuelve los campos necesarios para agregarlos rapidamente al editor.
- No asignes todavia fuentes automaticas ni valores del sistema.
- Deja source_path como "".
- Si no conoces la propiedad interna del PDF, deja pdf_field_name como "".
- No incluyas el nombre de la seccion en el JSON.
- No inventes agrupaciones externas al recorte mostrado.
- Propone un layout conservador para el formulario del medico usando "ui.xs" y "ui.md".
- Usa solo anchos 12, 6, 4 o 3.
- Si el area de respuesta se ve muy corta, puedes sugerir "md": 3.
- Si es un input comun, usa por defecto "md": 4.
- Si es un textarea o grupo amplio, usa "md": 12.
- Si no estas segura, usa mas ancho, no menos.
- Siempre define "max_length" en campos text y textarea.
- Usa 50 por defecto para "text".
- Usa 300 por defecto para "textarea".
- Si es "date", usa por defecto "date_format": "dd/mm/yyyy".

Formato preferido:
{
  "fields": [
    {
      "field_key": "patient_full_name",
      "label": "Nombre completo",
      "field_type": "text",
      "ui": {
        "xs": 12,
        "md": 4
      },
      "source_path": "",
      "pdf_field_name": "",
      "is_required": false,
      "max_length": 50,
      "date_format": "",
      "placeholder": "",
      "help_text": "",
      "options": []
    }
  ]
}

Tambien puedes devolver un arreglo directo:
[
  {
    "field_key": "patient_full_name",
    "label": "Nombre completo",
    "field_type": "text",
    "ui": {
      "xs": 12,
      "md": 4
    },
    "source_path": "",
    "pdf_field_name": ""
  }
]

Tipos permitidos de field_type:
- text
- textarea
- date
- checkbox
- select
- radio_group
- checkbox_group

Para campos con opciones:
- usa options
- cada opcion debe incluir:
  - option_key
  - label
  - value
  - pdf_field_name

Reglas practicas:
- si el recorte muestra una sola caja de seleccion independiente, usa "checkbox"
- si el recorte muestra varias opciones donde solo debe elegirse una, usa "radio_group"
- si el recorte muestra varias opciones seleccionables al mismo tiempo, usa "checkbox_group"
- si el recorte no permite inferir bien el tipo, usa el tipo mas conservador y deja pdf_field_name vacio
- si el ancho visible del area de respuesta es muy corto, sugiere "ui.md": 3
- si el campo parece mediano, sugiere "ui.md": 4
- si el campo es amplio o multilinea, sugiere "ui.md": 6 o 12 segun corresponda

Ejemplo de opcion:
{
  "option_key": "mpf_ninguno",
  "label": "Ninguno",
  "value": "ninguno",
  "pdf_field_name": ""
}`;
}

function buildSectionsFromFields(fields: EditableField[]): EditableSection[] {
  const labels = Array.from(new Set(fields.map((field) => field.section_label.trim()).filter(Boolean)));
  return labels.map((label) => createEmptySection(label));
}

function isFieldConfigIncomplete(field: EditableField): boolean {
  if (!field.field_key.trim() || !field.label.trim()) {
    return true;
  }

  if (SIMPLE_FIELD_TYPES.includes(field.field_type) && !field.pdf_field_name.trim()) {
    return true;
  }

  if (GROUP_FIELD_TYPES.includes(field.field_type)) {
    if (field.options.length === 0) {
      return true;
    }

    if (field.field_type === 'select' && !field.pdf_field_name.trim() && !field.options.some((option) => option.pdf_field_name.trim())) {
      return true;
    }

    if (field.options.some((option) => {
      if (!option.option_key.trim() || !option.label.trim() || !option.value.trim()) {
        return true;
      }

      if (field.field_type !== 'select' && !option.pdf_field_name.trim()) {
        return true;
      }

      return false;
    })) {
      return true;
    }
  }

  return false;
}

function getFieldTitle(field: EditableField, index: number): string {
  const suffix = field.label.trim() ? `: ${field.label.trim()}` : '';
  return `Campo ${index + 1}${suffix}`;
}

function getSectionIncompleteCount(fields: EditableField[]): number {
  return fields.filter(isFieldConfigIncomplete).length;
}

function mapDetailToEditor(detail: SystemPdfReportTemplateDetail): TemplateEditorState {
  const fields = detail.fields.map(mapField);
  return {
    name: detail.name,
    description: detail.description || '',
    output_file_name: detail.output_file_name,
    template_category: detail.template_category,
    laboratory_id: detail.laboratory?.id ?? '',
    study_type_id: detail.study_type?.id ?? '',
    status: detail.status,
    base_pdf_file_id: detail.base_pdf_file?.id ?? 0,
    sections: buildSectionsFromFields(fields),
    fields,
  };
}

function getDetectedPdfFieldLabel(field: SystemPdfReportTemplateDetectedPdfField): string {
  return field.pdf_type && field.pdf_type !== 'unknown'
    ? `${field.name} (${field.pdf_type})`
    : field.name;
}

function getDerivedSourceMode(field: EditableField): string {
  if (!field.source_path.trim()) {
    return 'manual';
  }

  return field.is_auto_editable ? 'system_editable' : 'system';
}

function buildPdfFieldSelectOptions(
  detectedFields: SystemPdfReportTemplateDetectedPdfField[],
  currentValue: string
): Array<SystemPdfReportTemplateDetectedPdfField> {
  const items = [...detectedFields];

  if (currentValue.trim() && !items.some((item) => item.name === currentValue.trim())) {
    items.unshift({
      name: currentValue.trim(),
      pdf_type: 'manual',
    });
  }

  return items;
}

export default function SystemTemplateRequestsPage() {
  const [items, setItems] = useState<SystemPdfReportTemplateSummary[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedItem, setSelectedItem] = useState<SystemPdfReportTemplateDetail | null>(null);
  const [editor, setEditor] = useState<TemplateEditorState | null>(null);
  const [catalog, setCatalog] = useState<SystemPdfReportTemplateCatalogData | null>(null);
  const [statusFilter, setStatusFilter] = useState<SystemPdfReportTemplateStatus | 'all'>('pending_review');
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingProcessedPdf, setUploadingProcessedPdf] = useState(false);
  const [downloadingPreviewPdf, setDownloadingPreviewPdf] = useState(false);
  const [newSectionLabel, setNewSectionLabel] = useState('');
  const [sectionImportTexts, setSectionImportTexts] = useState<Record<string, string>>({});
  const [sectionImportFeedback, setSectionImportFeedback] = useState<Record<string, string | null>>({});
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [expandedFields, setExpandedFields] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const processedPdfInputRef = useRef<HTMLInputElement | null>(null);

  const loadItems = async (nextSelectedId?: number | null) => {
    setLoading(true);
    setError(null);

    try {
      const records = await systemPdfReportTemplateService.list({ status: statusFilter });
      setItems(records);

      const candidateId = nextSelectedId ?? selectedId;
      if (candidateId && records.some((item) => item.id === candidateId)) {
        setSelectedId(candidateId);
      } else {
        setSelectedId(records[0]?.id ?? null);
      }
    } catch (loadError) {
      setError(getBackendErrorMessage(loadError) || 'No se pudieron cargar las solicitudes de plantillas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadItems();
  }, [statusFilter]);

  useEffect(() => {
    if (!selectedId) {
      setSelectedItem(null);
      setEditor(null);
      setCatalog(null);
      return;
    }

    let cancelled = false;

    const loadDetail = async () => {
      setDetailLoading(true);
      setError(null);
      setSuccess(null);

      try {
        const detail = await systemPdfReportTemplateService.show(selectedId);
        if (cancelled) {
          return;
        }

        setSelectedItem(detail);
        const nextEditor = mapDetailToEditor(detail);
        setEditor(nextEditor);
        setNewSectionLabel('');
        setSectionImportTexts({});
        setSectionImportFeedback({});
        setActiveSectionId(null);
        setExpandedFields(
          nextEditor.fields.reduce<Record<string, boolean>>((accumulator, field) => {
            accumulator[field.client_id] = false;
            return accumulator;
          }, {})
        );

        const nextCatalog = await systemPdfReportTemplateService.getCatalog(detail.office_id);
        if (!cancelled) {
          setCatalog(nextCatalog);
        }
      } catch (detailError) {
        if (!cancelled) {
          setError(getBackendErrorMessage(detailError) || 'No se pudo cargar el detalle de la plantilla.');
          setSelectedItem(null);
          setEditor(null);
          setCatalog(null);
        }
      } finally {
        if (!cancelled) {
          setDetailLoading(false);
        }
      }
    };

    void loadDetail();

    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const sectionEntries = useMemo(() => {
    if (!editor) {
      return [];
    }

    return editor.sections.map((section) => ({
      section,
      fields: editor.fields
        .map((field, index) => ({ field, index }))
        .filter(({ field }) => field.section_label.trim() === section.label.trim()),
    }));
  }, [editor]);

  const activeSectionEntry = useMemo(() => {
    if (!activeSectionId) {
      return null;
    }

    return sectionEntries.find(({ section }) => section.client_id === activeSectionId) ?? null;
  }, [activeSectionId, sectionEntries]);

  const updateEditorField = <K extends keyof TemplateEditorState>(key: K, value: TemplateEditorState[K]) => {
    setEditor((current) => (current ? { ...current, [key]: value } : current));
  };

  const applyUpdatedTemplate = (updated: SystemPdfReportTemplateDetail) => {
    setSelectedItem(updated);
    const nextEditor = mapDetailToEditor(updated);
    setEditor(nextEditor);
    setActiveSectionId(null);
    setExpandedFields(
      nextEditor.fields.reduce<Record<string, boolean>>((accumulator, field) => {
        accumulator[field.client_id] = false;
        return accumulator;
      }, {})
    );
    setItems((current) => current.map((item) => (
      item.id === updated.id
        ? {
            ...item,
            name: updated.name,
            description: updated.description,
            output_file_name: updated.output_file_name,
            template_category: updated.template_category,
            status: updated.status,
            laboratory: updated.laboratory,
            study_type: updated.study_type,
            original_pdf_file: updated.original_pdf_file,
            base_pdf_file: updated.base_pdf_file,
            updated_at: updated.updated_at,
            fields_count: updated.fields.length,
          }
        : item
    )));
  };

  const updateField = (index: number, updater: (field: EditableField) => EditableField) => {
    setEditor((current) => {
      if (!current) return current;
      const nextFields = [...current.fields];
      nextFields[index] = updater(nextFields[index]);
      return { ...current, fields: nextFields };
    });
  };

  const addSection = () => {
    const label = newSectionLabel.trim();

    if (!label) {
      setError('Escribe un nombre para la seccion antes de agregarla.');
      return;
    }

     if (activeSectionId) {
      setError('Guarda la seccion activa antes de crear otra.');
      return;
    }

    let createdSectionId: string | null = null;

    setEditor((current) => {
      if (!current) return current;

      if (current.sections.some((section) => section.label.trim().toLowerCase() === label.toLowerCase())) {
        return current;
      }

      const nextSection = createEmptySection(label);
      createdSectionId = nextSection.client_id;

      return {
        ...current,
        sections: [...current.sections, nextSection],
      };
    });

    if (!createdSectionId) {
      setError('Ya existe una seccion con ese nombre.');
      return;
    }

    setNewSectionLabel('');
    setActiveSectionId(createdSectionId);
  };

  const updateSectionLabel = (sectionClientId: string, nextLabel: string) => {
    setEditor((current) => {
      if (!current) return current;

      const section = current.sections.find((item) => item.client_id === sectionClientId);
      if (!section) {
        return current;
      }

      const previousLabel = section.label;
      const trimmedLabel = nextLabel.trimStart();

      if (
        trimmedLabel
        && current.sections.some((item) => (
          item.client_id !== sectionClientId
          && item.label.trim().toLowerCase() === trimmedLabel.trim().toLowerCase()
        ))
      ) {
        return current;
      }

      return {
        ...current,
        sections: current.sections.map((item) => (
          item.client_id === sectionClientId ? { ...item, label: trimmedLabel } : item
        )),
        fields: current.fields.map((field) => (
          field.section_label === previousLabel ? { ...field, section_label: trimmedLabel } : field
        )),
      };
    });
  };

  const toggleFieldExpanded = (fieldClientId: string, expanded: boolean) => {
    setExpandedFields((current) => ({
      ...current,
      [fieldClientId]: expanded,
    }));
  };

  const addFieldToSection = (sectionLabel: string) => {
    let newFieldClientId: string | null = null;

    setEditor((current) => {
      if (!current) return current;
      const nextField = createEmptyFieldForSection(current.fields.length, sectionLabel);
      newFieldClientId = nextField.client_id;
      return {
        ...current,
        fields: [...current.fields, nextField],
      };
    });

    if (newFieldClientId) {
      setExpandedFields((current) => ({
        ...current,
        [newFieldClientId as string]: true,
      }));
    }
  };

  const removeField = (index: number) => {
    setEditor((current) => {
      if (!current) return current;
      return {
        ...current,
        fields: current.fields
          .filter((_, currentIndex) => currentIndex !== index)
          .map((field, currentIndex) => ({ ...field, sort_order: currentIndex + 1 })),
      };
    });
    setExpandedFields((current) => {
      const next = { ...current };
      const targetField = editor?.fields[index];
      if (targetField) {
        delete next[targetField.client_id];
      }
      return next;
    });
  };

  const addOption = (fieldIndex: number) => {
    updateField(fieldIndex, (field) => ({
      ...field,
      options: [...field.options, createEmptyOption(field.options.length)],
    }));
  };

  const updateOption = (fieldIndex: number, optionIndex: number, updater: (option: EditableOption) => EditableOption) => {
    updateField(fieldIndex, (field) => {
      const nextOptions = [...field.options];
      nextOptions[optionIndex] = updater(nextOptions[optionIndex]);
      return {
        ...field,
        options: nextOptions,
      };
    });
  };

  const removeOption = (fieldIndex: number, optionIndex: number) => {
    updateField(fieldIndex, (field) => ({
      ...field,
      options: field.options
        .filter((_, currentIndex) => currentIndex !== optionIndex)
        .map((option, currentIndex) => ({ ...option, sort_order: currentIndex + 1 })),
    }));
  };

  const handleSave = async () => {
    if (!selectedItem || !editor) {
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = {
        name: editor.name.trim(),
        description: editor.description.trim(),
        output_file_name: editor.output_file_name.trim(),
        template_category: editor.template_category,
        laboratory_id: editor.laboratory_id === '' ? null : Number(editor.laboratory_id),
        study_type_id: editor.study_type_id === '' ? null : Number(editor.study_type_id),
        base_pdf_file_id: editor.base_pdf_file_id,
        status: editor.status,
        fields: editor.fields.map((field, index) => ({
          section_label: field.section_label.trim() || undefined,
          field_key: field.field_key.trim(),
          label: field.label.trim(),
          field_type: field.field_type,
          source_mode: getDerivedSourceMode(field),
          source_path: field.source_path.trim() || undefined,
          pdf_field_name: field.pdf_field_name.trim() || undefined,
          is_required: field.is_required,
          max_length: field.max_length.trim() ? Number(field.max_length) : (getDefaultMaxLength(field.field_type).trim() ? Number(getDefaultMaxLength(field.field_type)) : null),
          date_format: field.field_type === 'date' ? (field.date_format || 'dd/mm/yyyy') : undefined,
          placeholder: field.placeholder.trim() || undefined,
          help_text: field.help_text.trim() || undefined,
          selection_mode: getDefaultSelectionMode(field.field_type) || (field.field_type === 'select' ? 'single' : undefined),
          sort_order: index + 1,
          status: field.status,
          meta_json: field.meta_json ?? null,
          options: field.options.map((option, optionIndex) => ({
            option_key: option.option_key.trim(),
            label: option.label.trim(),
            value: option.value.trim(),
            pdf_field_name: option.pdf_field_name.trim() || undefined,
            sort_order: optionIndex + 1,
            is_default: option.is_default,
            status: option.status,
            meta_json: option.meta_json ?? null,
          })),
        })),
      };

      const updated = await systemPdfReportTemplateService.update(selectedItem.id, payload);
      applyUpdatedTemplate(updated);
      setSuccess('Plantilla actualizada correctamente.');
    } catch (saveError) {
      setError(getBackendErrorMessage(saveError) || 'No se pudo guardar la plantilla.');
    } finally {
      setSaving(false);
    }
  };

  const handleProcessedPdfSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!selectedItem || !file) {
      return;
    }

    setUploadingProcessedPdf(true);
    setError(null);
    setSuccess(null);

    try {
      const updated = await systemPdfReportTemplateService.uploadProcessedPdf(selectedItem.id, file);
      applyUpdatedTemplate(updated);
      setSuccess('PDF procesado cargado correctamente. Esta version quedo como base operativa.');
    } catch (uploadError) {
      setError(getBackendErrorMessage(uploadError) || 'No se pudo cargar el PDF procesado.');
    } finally {
      setUploadingProcessedPdf(false);
    }
  };

  const handleDownloadPreviewPdf = async () => {
    if (!selectedItem) {
      return;
    }

    setDownloadingPreviewPdf(true);
    setError(null);

    try {
      await systemPdfReportTemplateService.downloadPreviewPdf(
        selectedItem.id,
        `${selectedItem.output_file_name || selectedItem.name || 'preview'}_preview.pdf`
      );
    } catch (downloadError) {
      setError(getBackendErrorMessage(downloadError) || 'No se pudo generar el PDF de ejemplo.');
    } finally {
      setDownloadingPreviewPdf(false);
    }
  };

  const handleBulkImportForSection = (sectionClientId: string) => {
    if (!editor) {
      return;
    }

    const section = editor.sections.find((item) => item.client_id === sectionClientId);
    if (!section) {
      return;
    }

    const rawText = sectionImportTexts[sectionClientId] ?? '';
    setSectionImportFeedback((current) => ({ ...current, [sectionClientId]: null }));
    setError(null);
    setSuccess(null);

    try {
      const parsed = JSON.parse(rawText);
      const importedFields = extractImportedFields(parsed).map((field) => ({
        ...field,
        section_label: section.label,
      }));

      if (importedFields.length === 0) {
        throw new Error('No se encontraron campos para importar.');
      }

      setEditor((current) => {
        if (!current) return current;

        return {
          ...current,
          fields: [
            ...current.fields,
            ...importedFields.map((field, index) => ({
              ...field,
              sort_order: current.fields.length + index + 1,
            })),
          ],
        };
      });

      setExpandedFields((current) => {
        const next = { ...current };
        importedFields.forEach((field) => {
          next[field.client_id] = false;
        });
        return next;
      });
      setActiveSectionId(sectionClientId);
      setSectionImportFeedback((current) => ({
        ...current,
        [sectionClientId]: `Se agregaron ${importedFields.length} campo(s) a la seccion.`,
      }));
      setSectionImportTexts((current) => ({
        ...current,
        [sectionClientId]: '',
      }));
    } catch (importError) {
      setSectionImportFeedback((current) => ({
        ...current,
        [sectionClientId]: getBackendErrorMessage(importError) || 'No se pudo interpretar el JSON pegado.',
      }));
    }
  };

  const handleCopyImportTemplate = async () => {
    const content = buildAiImportPromptTemplate();

    try {
      await navigator.clipboard.writeText(content);
      setSuccess('Se copio la estructura base para IA al portapapeles.');
    } catch (_clipboardError) {
      setSuccess('No se pudo copiar automaticamente. Se pego la estructura base en el textarea activo.');
    }
  };

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
          Solicitudes de plantillas PDF
        </Typography>
        <Typography color="text.secondary">
          Vista global de solicitudes cargadas por medicos y consultorios para su revision interna.
        </Typography>
      </Box>

      <Alert severity="info">
        Esta misma pantalla ya funciona como inbox y editor interno minimo. Aqui puedes conservar el PDF original del medico, subir una version procesada para uso operativo y completar los campos antes de publicar.
      </Alert>

      {error ? <Alert severity="error">{error}</Alert> : null}
      {success ? <Alert severity="success">{success}</Alert> : null}

      <Card>
        <CardContent>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }}>
            <TextField
              select
              label="Estatus"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as SystemPdfReportTemplateStatus | 'all')}
              sx={{ minWidth: 220 }}
            >
              {STATUS_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
            <Button variant="outlined" onClick={() => void loadItems()} disabled={loading || detailLoading || saving}>
              Recargar
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 4 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Stack spacing={2}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Solicitudes registradas
                </Typography>

                {loading ? (
                  <Box sx={{ py: 6, display: 'flex', justifyContent: 'center' }}>
                    <CircularProgress />
                  </Box>
                ) : items.length === 0 ? (
                  <Typography color="text.secondary">
                    No hay solicitudes para el filtro seleccionado.
                  </Typography>
                ) : (
                  <Stack spacing={1.5}>
                    {items.map((item) => {
                      const active = item.id === selectedId;
                      return (
                        <Box
                          key={item.id}
                          onClick={() => setSelectedId(item.id)}
                          sx={{
                            p: 2,
                            borderRadius: 2,
                            border: '1px solid',
                            borderColor: active ? 'primary.main' : 'divider',
                            backgroundColor: active ? 'rgba(0, 150, 136, 0.06)' : '#fff',
                            cursor: 'pointer',
                          }}
                        >
                          <Stack spacing={1}>
                            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                              <Typography sx={{ fontWeight: 700 }}>
                                {item.name}
                              </Typography>
                              <Chip size="small" color={STATUS_COLORS[item.status]} label={STATUS_LABELS[item.status]} />
                            </Stack>
                            <Typography variant="body2" color="text.secondary">
                              Consultorio: {item.office?.title || `#${item.office_id}`}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Estudio: {item.study_type?.name || 'General'}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Tipo: {getPdfReportTemplateCategoryLabel(item.template_category)}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Campos configurados: {item.fields_count}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Actualizado: {formatDateTime(item.updated_at)}
                            </Typography>
                          </Stack>
                        </Box>
                      );
                    })}
                  </Stack>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, lg: 8 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Stack spacing={2.5}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Editor interno de plantilla
                </Typography>

                {detailLoading ? (
                  <Box sx={{ py: 8, display: 'flex', justifyContent: 'center' }}>
                    <CircularProgress />
                  </Box>
                ) : !selectedItem || !editor ? (
                  <Typography color="text.secondary">
                    Selecciona una solicitud para revisar y completar su configuracion.
                  </Typography>
                ) : (
                  <>
                    <input
                      ref={processedPdfInputRef}
                      type="file"
                      accept="application/pdf"
                      style={{ display: 'none' }}
                      onChange={handleProcessedPdfSelected}
                    />
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        {selectedItem.name}
                      </Typography>
                      <Chip size="small" color={STATUS_COLORS[selectedItem.status]} label={STATUS_LABELS[selectedItem.status]} />
                    </Stack>

                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <TextField
                          label="Nombre del reporte"
                          value={editor.name}
                          onChange={(event) => updateEditorField('name', event.target.value)}
                          fullWidth
                        />
                      </Grid>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <TextField
                          label="Nombre del archivo descargable"
                          value={editor.output_file_name}
                          onChange={(event) => updateEditorField('output_file_name', event.target.value)}
                          fullWidth
                        />
                      </Grid>
                      <Grid size={{ xs: 12 }}>
                        <TextField
                          label="Descripcion"
                          value={editor.description}
                          onChange={(event) => updateEditorField('description', event.target.value)}
                          fullWidth
                          multiline
                          minRows={2}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, md: 4 }}>
                        <TextField
                          select
                          label="Categoria"
                          value={editor.template_category}
                          onChange={(event) => updateEditorField('template_category', event.target.value)}
                          fullWidth
                        >
                          {(catalog?.template_categories ?? []).map((category) => (
                            <MenuItem key={category} value={category}>
                              {getPdfReportTemplateCategoryLabel(category)}
                            </MenuItem>
                          ))}
                        </TextField>
                      </Grid>
                      <Grid size={{ xs: 12, md: 4 }}>
                        <TextField
                          select
                          label="Estatus final"
                          value={editor.status}
                          onChange={(event) => updateEditorField('status', event.target.value as SystemPdfReportTemplateStatus)}
                          fullWidth
                        >
                          {(catalog?.template_statuses ?? []).map((status) => (
                            <MenuItem key={status} value={status}>
                              {STATUS_LABELS[status as SystemPdfReportTemplateStatus] || status}
                            </MenuItem>
                          ))}
                        </TextField>
                      </Grid>
                      <Grid size={{ xs: 12, md: 4 }}>
                        <TextField
                          label="Consultorio"
                          value={selectedItem.office?.title || `#${selectedItem.office_id}`}
                          fullWidth
                          disabled
                        />
                      </Grid>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <TextField
                          select
                          label="Laboratorio"
                          value={editor.laboratory_id}
                          onChange={(event) => updateEditorField('laboratory_id', event.target.value === '' ? '' : Number(event.target.value))}
                          fullWidth
                        >
                          <MenuItem value="">Sin laboratorio</MenuItem>
                          {(catalog?.laboratories ?? []).map((laboratory) => (
                            <MenuItem key={laboratory.id} value={laboratory.id}>
                              {laboratory.name}
                            </MenuItem>
                          ))}
                        </TextField>
                      </Grid>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <TextField
                          select
                          label="Tipo de estudio"
                          value={editor.study_type_id}
                          onChange={(event) => updateEditorField('study_type_id', event.target.value === '' ? '' : Number(event.target.value))}
                          fullWidth
                        >
                          <MenuItem value="">General</MenuItem>
                          {(catalog?.study_types ?? []).map((studyType) => (
                            <MenuItem key={studyType.id} value={studyType.id}>
                              {studyType.name}
                            </MenuItem>
                          ))}
                        </TextField>
                      </Grid>
                    </Grid>

                    <Divider />

                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2, height: '100%' }}>
                          <Typography variant="body2" color="text.secondary">PDF original del medico</Typography>
                          <Typography sx={{ fontWeight: 700 }}>{selectedItem.original_pdf_file?.title || 'Sin archivo ligado'}</Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                            Conserva la referencia del archivo original que subio el consultorio.
                          </Typography>
                          {selectedItem.original_pdf_file ? (
                            <Button
                              sx={{ mt: 2 }}
                              variant="outlined"
                              onClick={() => void systemPdfReportTemplateService.downloadBasePdf(
                                selectedItem.original_pdf_file!.id,
                                selectedItem.original_pdf_file!.title || 'plantilla-original.pdf'
                              )}
                            >
                              Descargar PDF original
                            </Button>
                          ) : null}
                        </Box>
                      </Grid>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2, height: '100%' }}>
                          <Typography variant="body2" color="text.secondary">PDF base operativo</Typography>
                          <Typography sx={{ fontWeight: 700 }}>{selectedItem.base_pdf_file?.title || 'Sin archivo ligado'}</Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                            Esta es la version que se usara despues para leer propiedades y generar las descargas.
                          </Typography>
                          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 2 }}>
                            {selectedItem.base_pdf_file ? (
                              <Button
                                variant="outlined"
                                onClick={() => void systemPdfReportTemplateService.downloadBasePdf(
                                  selectedItem.base_pdf_file!.id,
                                  selectedItem.base_pdf_file!.title || 'plantilla-base.pdf'
                                )}
                              >
                                Descargar PDF base
                              </Button>
                            ) : null}
                            <Button
                              variant="outlined"
                              disabled={uploadingProcessedPdf}
                              onClick={() => processedPdfInputRef.current?.click()}
                            >
                              {uploadingProcessedPdf ? 'Subiendo PDF...' : 'Subir PDF procesado'}
                            </Button>
                          </Stack>
                        </Box>
                      </Grid>
                    </Grid>

                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', sm: 'center' }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          Creado por: {selectedItem.created_by?.name || 'Sin registro'} | Ultima actualizacion: {formatDateTime(selectedItem.updated_at)}
                        </Typography>
                      </Box>
                      <Button variant="contained" onClick={() => void handleSave()} disabled={saving || uploadingProcessedPdf}>
                        {saving ? 'Guardando...' : 'Guardar cambios'}
                      </Button>
                      <Button
                        variant="outlined"
                        onClick={() => void handleDownloadPreviewPdf()}
                        disabled={saving || uploadingProcessedPdf || downloadingPreviewPdf}
                      >
                        {downloadingPreviewPdf ? 'Generando PDF ejemplo...' : 'Descargar PDF ejemplo'}
                      </Button>
                    </Stack>

                    <Divider />

                    <Stack spacing={1}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                        Propiedades detectadas en el PDF operativo
                      </Typography>
                      {selectedItem.detected_pdf_fields.length === 0 ? (
                        <Alert severity="warning">
                          Todavia no se detectaron propiedades internas en el PDF operativo. Sube una version procesada con campos AcroForm para poder seleccionarlos en los mapeos.
                        </Alert>
                      ) : (
                        <Stack direction="row" spacing={1} flexWrap="wrap">
                          {selectedItem.detected_pdf_fields.map((detectedField) => (
                            <Chip
                              key={`${detectedField.name}-${detectedField.pdf_type}`}
                              label={getDetectedPdfFieldLabel(detectedField)}
                            />
                          ))}
                        </Stack>
                      )}
                    </Stack>

                    <Divider />

                    <Stack spacing={2}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                        Secciones y campos de la plantilla
                      </Typography>

                      <Card variant="outlined">
                        <CardContent>
                          <Stack spacing={2}>
                            <Typography sx={{ fontWeight: 700 }}>
                              Crear nueva seccion
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Primero crea la seccion y despues importa o agrega sus campos dentro de ella.
                            </Typography>
                            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
                              <TextField
                                label="Nombre de la seccion"
                                value={newSectionLabel}
                                onChange={(event) => setNewSectionLabel(event.target.value)}
                                fullWidth
                              />
                              <Button variant="contained" startIcon={<Add />} onClick={addSection} sx={{ minWidth: { md: 180 } }}>
                                Agregar seccion
                              </Button>
                            </Stack>
                          </Stack>
                        </CardContent>
                      </Card>

                      {editor.sections.length === 0 ? (
                        <Alert severity="warning">
                          Crea primero una seccion. Dentro de cada seccion podras pegar el JSON de IA y luego completar el mapeo de sus campos.
                        </Alert>
                      ) : (
                        <Stack spacing={1.5}>
                          <Typography variant="body2" color="text.secondary">
                            Secciones registradas
                          </Typography>
                          {sectionEntries.map(({ section, fields }) => {
                            const incompleteCount = getSectionIncompleteCount(fields.map(({ field }) => field));
                            const isActive = activeSectionId === section.client_id;

                            return (
                              <Box
                                key={section.client_id}
                                sx={{
                                  border: '1px solid',
                                  borderColor: isActive ? 'primary.main' : 'divider',
                                  borderRadius: 2,
                                  p: 2,
                                  backgroundColor: isActive ? 'rgba(0, 150, 136, 0.05)' : '#fff',
                                }}
                              >
                                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'flex-start', sm: 'center' }}>
                                  <Typography sx={{ fontWeight: 700 }}>
                                    {section.label || 'Seccion sin nombre'}
                                  </Typography>
                                  <Chip size="small" label={`${fields.length} campo(s)`} />
                                  {incompleteCount > 0 ? (
                                    <Chip size="small" color="warning" label={`${incompleteCount} por revisar`} />
                                  ) : (
                                    <Chip size="small" color="success" label="Completa" />
                                  )}
                                  {isActive ? <Chip size="small" color="primary" label="En captura" /> : null}
                                </Stack>
                              </Box>
                            );
                          })}
                        </Stack>
                      )}

                      {activeSectionEntry ? (
                        <Card variant="outlined" sx={{ borderColor: 'primary.main' }}>
                          <CardContent>
                            <Stack spacing={2}>
                              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                                Seccion en captura: {activeSectionEntry.section.label || 'Seccion sin nombre'}
                              </Typography>

                              <TextField
                                label="Nombre de la seccion"
                                defaultValue={activeSectionEntry.section.label}
                                onBlur={(event) => updateSectionLabel(activeSectionEntry.section.client_id, event.target.value)}
                                fullWidth
                              />

                              <Card variant="outlined">
                                <CardContent>
                                  <Stack spacing={1.5}>
                                    <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={1}>
                                      <Typography sx={{ fontWeight: 700 }}>
                                        Importacion JSON de esta seccion
                                      </Typography>
                                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                                        <Button variant="outlined" startIcon={<ContentCopy />} onClick={() => void handleCopyImportTemplate()}>
                                          Copiar estructura IA
                                        </Button>
                                        <Button variant="outlined" startIcon={<Add />} onClick={() => addFieldToSection(activeSectionEntry.section.label)}>
                                          Agregar campo
                                        </Button>
                                      </Stack>
                                    </Stack>
                                    <Typography variant="body2" color="text.secondary">
                                      Pega aqui solo el JSON de los campos de esta seccion. La IA no debe incluir el nombre de la seccion.
                                    </Typography>
                                    <TextField
                                      label="JSON de campos"
                                      value={sectionImportTexts[activeSectionEntry.section.client_id] ?? ''}
                                      onChange={(event) => setSectionImportTexts((current) => ({
                                        ...current,
                                        [activeSectionEntry.section.client_id]: event.target.value,
                                      }))}
                                      fullWidth
                                      multiline
                                      minRows={8}
                                      placeholder='{"fields":[{"field_key":"patient_full_name","label":"Nombre completo","field_type":"text"}]}'
                                    />
                                    {sectionImportFeedback[activeSectionEntry.section.client_id] ? (
                                      <Alert severity={sectionImportFeedback[activeSectionEntry.section.client_id]?.startsWith('Se ') ? 'success' : 'warning'}>
                                        {sectionImportFeedback[activeSectionEntry.section.client_id]}
                                      </Alert>
                                    ) : null}
                                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                                      <Button
                                        variant="contained"
                                        onClick={() => handleBulkImportForSection(activeSectionEntry.section.client_id)}
                                        disabled={!(sectionImportTexts[activeSectionEntry.section.client_id] ?? '').trim()}
                                      >
                                        Evaluar JSON y agregar campos
                                      </Button>
                                      <Button
                                        variant="outlined"
                                        onClick={() => setSectionImportTexts((current) => ({
                                          ...current,
                                          [activeSectionEntry.section.client_id]: '',
                                        }))}
                                      >
                                        Limpiar JSON
                                      </Button>
                                    </Stack>
                                  </Stack>
                                </CardContent>
                              </Card>

                              {activeSectionEntry.fields.length === 0 ? (
                                <Alert severity="warning">
                                  Esta seccion todavia no tiene campos. Agrega uno manualmente o importalos desde JSON.
                                </Alert>
                              ) : null}

                              {activeSectionEntry.fields.map(({ field, index: fieldIndex }, sectionFieldIndex) => {
                                const isSimple = SIMPLE_FIELD_TYPES.includes(field.field_type);
                                const isGrouped = GROUP_FIELD_TYPES.includes(field.field_type);
                                const incomplete = isFieldConfigIncomplete(field);

                                return (
                                  <Accordion
                                    key={field.client_id}
                                    expanded={expandedFields[field.client_id] ?? false}
                                    onChange={(_, expanded) => toggleFieldExpanded(field.client_id, expanded)}
                                    disableGutters
                                    sx={{ border: '1px solid', borderColor: incomplete ? 'warning.main' : 'divider', borderRadius: '12px !important', overflow: 'hidden' }}
                                  >
                                    <AccordionSummary expandIcon={<ExpandMore />}>
                                      <Stack direction="row" spacing={1} alignItems="center" sx={{ width: '100%' }}>
                                        <Typography sx={{ fontWeight: 700, color: incomplete ? 'error.main' : 'text.primary' }}>
                                          {getFieldTitle(field, sectionFieldIndex)}
                                          {incomplete ? ' *' : ''}
                                        </Typography>
                                        <Chip size="small" label={field.field_type} />
                                        {incomplete ? <Chip size="small" color="warning" label="Incompleto" /> : <Chip size="small" color="success" label="Listo" />}
                                        <Box sx={{ ml: 'auto' }}>
                                          <IconButton
                                            color="error"
                                            onClick={(event) => {
                                              event.stopPropagation();
                                              removeField(fieldIndex);
                                            }}
                                          >
                                            <DeleteOutline />
                                          </IconButton>
                                        </Box>
                                      </Stack>
                                    </AccordionSummary>
                                    <AccordionDetails>
                                        <Grid container spacing={2}>
                                          <Grid size={{ xs: 12, md: 6 }}>
                                            <TextField
                                              label="Clave interna"
                                              defaultValue={field.field_key}
                                              onBlur={(event) => updateField(fieldIndex, (current) => ({ ...current, field_key: event.target.value }))}
                                              fullWidth
                                            />
                                          </Grid>
                                          <Grid size={{ xs: 12, md: 6 }}>
                                            <TextField
                                              label="Etiqueta visible"
                                              defaultValue={field.label}
                                              onBlur={(event) => updateField(fieldIndex, (current) => ({ ...current, label: event.target.value }))}
                                              fullWidth
                                            />
                                          </Grid>
                                          <Grid size={{ xs: 12, md: 4 }}>
                                            <TextField
                                              select
                                              label="Tipo"
                                              value={field.field_type}
                                              onChange={(event) => {
                                                const nextType = event.target.value;
                                                updateField(fieldIndex, (current) => ({
                                                  ...current,
                                                  field_type: nextType,
                                                  selection_mode: getDefaultSelectionMode(nextType) || (nextType === 'select' ? 'single' : ''),
                                                  options: GROUP_FIELD_TYPES.includes(nextType) ? current.options : [],
                                                  pdf_field_name: nextType === 'checkbox_group' || nextType === 'radio_group' ? '' : current.pdf_field_name,
                                                  max_length: getDefaultMaxLength(nextType)
                                                    ? (current.max_length || getDefaultMaxLength(nextType))
                                                    : '',
                                                  date_format: nextType === 'date' ? (current.date_format || 'dd/mm/yyyy') : '',
                                                }));
                                              }}
                                              fullWidth
                                            >
                                              {(catalog?.field_types ?? []).map((fieldType) => (
                                                <MenuItem key={fieldType} value={fieldType}>
                                                  {fieldType}
                                                </MenuItem>
                                              ))}
                                            </TextField>
                                          </Grid>
                                          <Grid size={{ xs: 12, md: 4 }}>
                                            <TextField
                                              select
                                              label="Estatus del campo"
                                              value={field.status}
                                              onChange={(event) => updateField(fieldIndex, (current) => ({ ...current, status: event.target.value }))}
                                              fullWidth
                                            >
                                              {(catalog?.field_statuses ?? []).map((fieldStatus) => (
                                                <MenuItem key={fieldStatus} value={fieldStatus}>
                                                  {fieldStatus}
                                                </MenuItem>
                                              ))}
                                            </TextField>
                                          </Grid>
                                          <Grid size={{ xs: 12, md: 6 }}>
                                            <TextField
                                              select
                                              label="Fuente automatica"
                                              value={field.source_path}
                                              onChange={(event) => updateField(fieldIndex, (current) => ({
                                                ...current,
                                                source_path: event.target.value,
                                                source_mode: event.target.value ? (current.is_auto_editable ? 'system_editable' : 'system') : 'manual',
                                                is_auto_editable: event.target.value ? current.is_auto_editable : false,
                                              }))}
                                              fullWidth
                                              helperText={!field.source_path.trim()
                                                ? 'Selecciona "Ninguno" para llenado manual.'
                                                : 'Selecciona de donde se prellenara este dato.'}
                                            >
                                              <MenuItem value="">Ninguno</MenuItem>
                                              {(catalog?.source_path_options ?? []).map((sourcePathOption) => (
                                                <MenuItem key={sourcePathOption.key} value={sourcePathOption.key}>
                                                  {sourcePathOption.label}
                                                </MenuItem>
                                              ))}
                                            </TextField>
                                          </Grid>
                                          <Grid size={{ xs: 12, md: 6 }}>
                                            {selectedItem.detected_pdf_fields.length > 0 ? (
                                              <TextField
                                                select
                                                label="Campo PDF"
                                                value={field.pdf_field_name}
                                                onChange={(event) => updateField(fieldIndex, (current) => ({ ...current, pdf_field_name: event.target.value }))}
                                                fullWidth
                                                disabled={field.field_type === 'checkbox_group' || field.field_type === 'radio_group'}
                                                helperText="Selecciona una propiedad detectada del PDF operativo."
                                              >
                                                <MenuItem value="">Sin asignar</MenuItem>
                                                {buildPdfFieldSelectOptions(selectedItem.detected_pdf_fields, field.pdf_field_name).map((pdfField) => (
                                                  <MenuItem key={`${pdfField.name}-${pdfField.pdf_type}`} value={pdfField.name}>
                                                    {getDetectedPdfFieldLabel(pdfField)}
                                                  </MenuItem>
                                                ))}
                                              </TextField>
                                            ) : (
                                              <TextField
                                                label="Campo PDF"
                                                value={field.pdf_field_name}
                                                onChange={(event) => updateField(fieldIndex, (current) => ({ ...current, pdf_field_name: event.target.value }))}
                                                fullWidth
                                                disabled={field.field_type === 'checkbox_group' || field.field_type === 'radio_group'}
                                              />
                                            )}
                                          </Grid>
                                          <Grid size={{ xs: 12 }}>
                                            <Box
                                              sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: field.source_path.trim() ? 'pointer' : 'default' }}
                                              onClick={() => {
                                                if (!field.source_path.trim()) return;
                                                updateField(fieldIndex, (current) => ({
                                                  ...current,
                                                  is_auto_editable: !current.is_auto_editable,
                                                  source_mode: !current.is_auto_editable ? 'system_editable' : 'system',
                                                }));
                                              }}
                                            >
                                              <Checkbox
                                                checked={field.is_auto_editable}
                                                disabled={!field.source_path.trim()}
                                                onChange={(event) => updateField(fieldIndex, (current) => ({
                                                  ...current,
                                                  is_auto_editable: event.target.checked,
                                                  source_mode: event.target.checked ? 'system_editable' : 'system',
                                                }))}
                                              />
                                              <Typography>Editable</Typography>
                                            </Box>
                                          </Grid>
                                          <Grid size={{ xs: 12, md: 6 }}>
                                            <TextField
                                              label="Placeholder"
                                              defaultValue={field.placeholder}
                                              onBlur={(event) => updateField(fieldIndex, (current) => ({ ...current, placeholder: event.target.value }))}
                                              fullWidth
                                            />
                                          </Grid>
                                          <Grid size={{ xs: 12, md: 6 }}>
                                            <TextField
                                              label="Ayuda"
                                              defaultValue={field.help_text}
                                              onBlur={(event) => updateField(fieldIndex, (current) => ({ ...current, help_text: event.target.value }))}
                                              fullWidth
                                            />
                                          </Grid>
                                          <Grid size={{ xs: 12, md: 4 }}>
                                            <TextField
                                              label="Maximo caracteres"
                                              defaultValue={field.max_length}
                                              onBlur={(event) => updateField(fieldIndex, (current) => ({ ...current, max_length: event.target.value }))}
                                              fullWidth
                                              disabled={field.field_type === 'checkbox' || isGrouped}
                                            />
                                          </Grid>
                                          <Grid size={{ xs: 12, md: 4 }}>
                                            <TextField
                                              select
                                              label="Formato fecha"
                                              value={field.date_format}
                                              onChange={(event) => updateField(fieldIndex, (current) => ({ ...current, date_format: event.target.value }))}
                                              fullWidth
                                              disabled={field.field_type !== 'date'}
                                            >
                                              <MenuItem value="">Sin formato</MenuItem>
                                              {(catalog?.date_formats ?? []).map((dateFormat) => (
                                                <MenuItem key={dateFormat} value={dateFormat}>
                                                  {dateFormat}
                                                </MenuItem>
                                              ))}
                                            </TextField>
                                          </Grid>
                                          <Grid size={{ xs: 12 }}>
                                            <Box
                                              sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer' }}
                                              onClick={() => updateField(fieldIndex, (current) => ({ ...current, is_required: !current.is_required }))}
                                            >
                                              <Checkbox
                                                checked={field.is_required}
                                                onChange={(event) => updateField(fieldIndex, (current) => ({ ...current, is_required: event.target.checked }))}
                                              />
                                              <Typography>Campo obligatorio</Typography>
                                            </Box>
                                          </Grid>
                                        </Grid>

                                        {isSimple ? (
                                          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                                            Este campo se mapea de forma directa a una sola propiedad interna del PDF.
                                          </Typography>
                                        ) : null}

                                        {isGrouped ? (
                                          <Stack spacing={1.5} sx={{ mt: 2 }}>
                                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                                              <Typography sx={{ fontWeight: 700 }}>
                                                Opciones del campo
                                              </Typography>
                                              <Button startIcon={<Add />} onClick={() => addOption(fieldIndex)}>
                                                Agregar opcion
                                              </Button>
                                            </Stack>

                                            {field.options.length === 0 ? (
                                              <Alert severity="warning">
                                                Este campo grupal necesita al menos una opcion.
                                              </Alert>
                                            ) : null}

                                            {field.options.map((option, optionIndex) => (
                                              <Box key={option.client_id} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2 }}>
                                                <Grid container spacing={2} alignItems="center">
                                                  <Grid size={{ xs: 12, md: 3 }}>
                                                    <TextField
                                                      label="Clave de opcion"
                                                      defaultValue={option.option_key}
                                                      onBlur={(event) => updateOption(fieldIndex, optionIndex, (current) => ({ ...current, option_key: event.target.value }))}
                                                      fullWidth
                                                    />
                                                  </Grid>
                                                  <Grid size={{ xs: 12, md: 3 }}>
                                                    <TextField
                                                      label="Etiqueta visible"
                                                      defaultValue={option.label}
                                                      onBlur={(event) => updateOption(fieldIndex, optionIndex, (current) => ({ ...current, label: event.target.value }))}
                                                      fullWidth
                                                    />
                                                  </Grid>
                                                  <Grid size={{ xs: 12, md: 2 }}>
                                                    <TextField
                                                      label="Valor"
                                                      defaultValue={option.value}
                                                      onBlur={(event) => updateOption(fieldIndex, optionIndex, (current) => ({ ...current, value: event.target.value }))}
                                                      fullWidth
                                                    />
                                                  </Grid>
                                                  <Grid size={{ xs: 12, md: 3 }}>
                                                    {selectedItem.detected_pdf_fields.length > 0 ? (
                                                      <TextField
                                                        select
                                                        label="Campo PDF"
                                                        value={option.pdf_field_name}
                                                        onChange={(event) => updateOption(fieldIndex, optionIndex, (current) => ({ ...current, pdf_field_name: event.target.value }))}
                                                        fullWidth
                                                        helperText="Selecciona una propiedad detectada."
                                                      >
                                                        <MenuItem value="">Sin asignar</MenuItem>
                                                        {buildPdfFieldSelectOptions(selectedItem.detected_pdf_fields, option.pdf_field_name).map((pdfField) => (
                                                          <MenuItem key={`${pdfField.name}-${pdfField.pdf_type}`} value={pdfField.name}>
                                                            {getDetectedPdfFieldLabel(pdfField)}
                                                          </MenuItem>
                                                        ))}
                                                      </TextField>
                                                    ) : (
                                                      <TextField
                                                        label="Campo PDF"
                                                        value={option.pdf_field_name}
                                                        onChange={(event) => updateOption(fieldIndex, optionIndex, (current) => ({ ...current, pdf_field_name: event.target.value }))}
                                                        fullWidth
                                                      />
                                                    )}
                                                  </Grid>
                                                  <Grid size={{ xs: 12, md: 1 }}>
                                                    <IconButton color="error" onClick={() => removeOption(fieldIndex, optionIndex)}>
                                                      <DeleteOutline />
                                                    </IconButton>
                                                  </Grid>
                                                  <Grid size={{ xs: 12 }}>
                                                    <Box
                                                      sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer' }}
                                                      onClick={() => updateOption(fieldIndex, optionIndex, (current) => ({ ...current, is_default: !current.is_default }))}
                                                    >
                                                      <Checkbox
                                                        checked={option.is_default}
                                                        onChange={(event) => updateOption(fieldIndex, optionIndex, (current) => ({ ...current, is_default: event.target.checked }))}
                                                      />
                                                      <Typography>Valor por defecto</Typography>
                                                    </Box>
                                                  </Grid>
                                                </Grid>
                                              </Box>
                                            ))}
                                          </Stack>
                                        ) : null}
                                    </AccordionDetails>
                                  </Accordion>
                                );
                              })}
                            </Stack>
                          </CardContent>
                        </Card>
                      ) : editor.sections.length > 0 ? (
                        <Alert severity="info">
                          Las secciones ya guardadas se muestran solo como resumen. Crea una nueva seccion para continuar capturando.
                        </Alert>
                      ) : null}
                    </Stack>
                  </>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  );
}
