import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Checkbox,
  Divider,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  Link,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  MenuItem,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
  Snackbar,
} from '@mui/material';
import {
  ContentCopy as ContentCopyIcon,
  DescriptionOutlined as DescriptionOutlinedIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { patientService } from '../../api/patientService';
import type { Patient, PatientFile, PatientTagControlData } from '../../types';
import { formatDisplayDate } from '../../utils/date';
import { useAuth } from '../../hooks/useAuth';
import ClickableDateField from '../../components/ClickableDateField';

function formatPhone(phone?: string) {
  if (!phone) return '-';
  const digits = phone.replace(/\D/g, '');
  if (digits.length !== 10) return phone;
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
}

function normalizeSearchText(value?: string) {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function matchesPatientSearch(patient: Patient, query: string) {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return true;

  const tokens = normalizedQuery.split(/\s+/).filter(Boolean);
  const searchableValues = [
    patient.name,
    patient.last_name,
    patient.full_name,
    patient.phone,
    formatPhone(patient.phone),
  ];

  const words = searchableValues
    .filter(Boolean)
    .flatMap((value) => normalizeSearchText(value).split(/\s+/).filter(Boolean));
  const combinedText = normalizeSearchText(searchableValues.filter(Boolean).join(' '));

  return tokens.every(
    (token) => combinedText.includes(token) || words.some((word) => word.includes(token))
  );
}

const labelStatusColorMap: Record<string, { bg: string; border: string; text: string }> = {
  'btn-primary': { bg: '#1e88e5', border: '#1976d2', text: '#ffffff' },
  'btn-success': { bg: '#4caf50', border: '#43a047', text: '#ffffff' },
  'btn-danger': { bg: '#e53935', border: '#d32f2f', text: '#ffffff' },
  'btn-warning': { bg: '#ff9800', border: '#fb8c00', text: '#ffffff' },
  'btn-info': { bg: '#29b6f6', border: '#039be5', text: '#ffffff' },
  'btn-rose': { bg: '#e91e63', border: '#d81b60', text: '#ffffff' },
  'btn-default': { bg: '#bdbdbd', border: '#9e9e9e', text: '#ffffff' },
};

function getStatusButtonSx(colorClass?: string, active = false) {
  const palette = labelStatusColorMap[colorClass ?? 'btn-default'] ?? labelStatusColorMap['btn-default'];

  return {
    backgroundColor: active ? palette.bg : '#ffffff',
    borderColor: active ? palette.bg : palette.border,
    color: active ? palette.text : palette.bg,
    borderWidth: '1px',
    borderStyle: 'solid',
    boxShadow: active ? '0 0 0 2px rgba(38,50,56,0.18)' : 'none',
    '&:hover': {
      backgroundColor: active ? palette.bg : '#ffffff',
      borderColor: active ? palette.bg : palette.border,
    },
  };
}

export default function PatientsPage() {
  const navigate = useNavigate();
  const { user, can } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [patients, setPatients] = useState<Patient[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [attachPatientId, setAttachPatientId] = useState<number | null>(null);
  const [attachOfficeId, setAttachOfficeId] = useState<number | null>(null);
  const [attachControl, setAttachControl] = useState<PatientTagControlData | null>(null);
  const [attachLoading, setAttachLoading] = useState(false);
  const [attachSaving, setAttachSaving] = useState(false);
  const [attachError, setAttachError] = useState<string | null>(null);
  const [attachMessage, setAttachMessage] = useState<string | null>(null);
  const [attachWarningMessage, setAttachWarningMessage] = useState<string | null>(null);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const [attachFiles, setAttachFiles] = useState<PatientFile[]>([]);
  const [templateMessage, setTemplateMessage] = useState<string | null>(null);
  const [sentResultLink, setSentResultLink] = useState<{ url: string } | null>(null);
  const [openTagIds, setOpenTagIds] = useState<number[]>([]);
  const [newOfficeLabelName, setNewOfficeLabelName] = useState('');
  const [savingOfficeLabel, setSavingOfficeLabel] = useState(false);
  const [showNewLabelInput, setShowNewLabelInput] = useState(false);
  const [attachSelectedFiles, setAttachSelectedFiles] = useState<File[]>([]);
  const [singleAttachPreviewUrl, setSingleAttachPreviewUrl] = useState<string | null>(null);
  const [singleAttachPreviewType, setSingleAttachPreviewType] = useState<string>('');
  const [singleAttachPreviewName, setSingleAttachPreviewName] = useState<string>('');
  const [showStoredFiles, setShowStoredFiles] = useState(false);
  const [storedFilesLoading, setStoredFilesLoading] = useState(false);
  const [storedFilesVisible, setStoredFilesVisible] = useState<PatientFile[]>([]);
  const [selectedStoredFileIds, setSelectedStoredFileIds] = useState<number[]>([]);
  const [storedFilesHasMore, setStoredFilesHasMore] = useState(false);
  const [storedFilesNextOffset, setStoredFilesNextOffset] = useState<number | null>(null);
  const [storedFilesLoads, setStoredFilesLoads] = useState(0);
  const [sendResultToPatient, setSendResultToPatient] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [newTemplateTitle, setNewTemplateTitle] = useState('');
  const [newTemplateDescription, setNewTemplateDescription] = useState('');
  const [creatingTemplate, setCreatingTemplate] = useState(false);
  const [tagStatusSavingId, setTagStatusSavingId] = useState<number | null>(null);
  const [finalizeTag, setFinalizeTag] = useState<{ id: number; code: string } | null>(null);
  const [finalizingTagId, setFinalizingTagId] = useState<number | null>(null);
  const [quickEditOpen, setQuickEditOpen] = useState(false);
  const [quickEditPatientId, setQuickEditPatientId] = useState<number | null>(null);
  const [quickEditName, setQuickEditName] = useState('');
  const [quickEditLastName, setQuickEditLastName] = useState('');
  const [quickEditPhone, setQuickEditPhone] = useState('');
  const [quickEditBirthDate, setQuickEditBirthDate] = useState('');
  const [quickEditGender, setQuickEditGender] = useState<'M' | 'F' | ''>('');
  const [quickEditSaving, setQuickEditSaving] = useState(false);
  const [quickEditError, setQuickEditError] = useState<string | null>(null);
  const [createPatientOpen, setCreatePatientOpen] = useState(false);
  const [createPatientName, setCreatePatientName] = useState('');
  const [createPatientLastName, setCreatePatientLastName] = useState('');
  const [createPatientPhone, setCreatePatientPhone] = useState('');
  const [createPatientBirthDate, setCreatePatientBirthDate] = useState('');
  const [createPatientSaving, setCreatePatientSaving] = useState(false);
  const [createPatientError, setCreatePatientError] = useState<string | null>(null);
  const [previewFileName, setPreviewFileName] = useState('');
  const [previewFileType, setPreviewFileType] = useState('');
  const [previewFileUrl, setPreviewFileUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const attachFileInputRef = useRef<HTMLInputElement | null>(null);
  const attachSectionRef = useRef<HTMLDivElement | null>(null);
  const canViewPatientDetail = can('patients.detail.view');
  const canQuickEditPatient = can('patients.quick_edit');

  const sortPatientsByName = (items: Patient[]) =>
    [...items].sort((left, right) =>
      `${left.full_name ?? `${left.name} ${left.last_name}`}`.localeCompare(
        `${right.full_name ?? `${right.name} ${right.last_name}`}`,
        'es',
        { sensitivity: 'base' }
      )
    );

  useEffect(() => {
    const loadPatients = async () => {
      setLoading(true);
      try {
        const data = await patientService.getPatients();
        setPatients(data);
        setFilteredPatients(data);
      } catch (err) {
        console.error('Error cargando pacientes:', err);
      } finally {
        setLoading(false);
      }
    };

    loadPatients();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredPatients(patients);
    } else {
      setFilteredPatients(
        patients.filter((patient) => matchesPatientSearch(patient, searchQuery))
      );
    }
    setPage(0);
  }, [searchQuery, patients]);

  useEffect(() => {
    if (attachSelectedFiles.length !== 1) {
      if (singleAttachPreviewUrl) {
        window.URL.revokeObjectURL(singleAttachPreviewUrl);
      }
      setSingleAttachPreviewUrl(null);
      setSingleAttachPreviewType('');
      setSingleAttachPreviewName('');
      return;
    }

    const file = attachSelectedFiles[0];
    const blobUrl = window.URL.createObjectURL(file);

    if (singleAttachPreviewUrl) {
      window.URL.revokeObjectURL(singleAttachPreviewUrl);
    }

    setSingleAttachPreviewUrl(blobUrl);
    setSingleAttachPreviewType(file.type);
    setSingleAttachPreviewName(file.name);

    return () => {
      window.URL.revokeObjectURL(blobUrl);
    };
  }, [attachSelectedFiles]);

  useEffect(() => {
    return () => {
      if (previewFileUrl) {
        window.URL.revokeObjectURL(previewFileUrl);
      }
    };
  }, [previewFileUrl]);

  useEffect(() => {
    return () => {
      if (singleAttachPreviewUrl) {
        window.URL.revokeObjectURL(singleAttachPreviewUrl);
      }
    };
  }, [singleAttachPreviewUrl]);

  useEffect(() => {
    if (!attachMessage) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setAttachMessage(null);
    }, 2000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [attachMessage]);

  useEffect(() => {
    if (!attachWarningMessage) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setAttachWarningMessage(null);
    }, 2500);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [attachWarningMessage]);

  useEffect(() => {
    if (attachPatientId === null && !attachLoading) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 60);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [attachLoading, attachPatientId]);

  const paginatedPatients = filteredPatients.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleCopyPhone = async (
    event: React.MouseEvent<HTMLButtonElement>,
    phone?: string
  ) => {
    event.stopPropagation();
    if (!phone) return;

    try {
      await navigator.clipboard.writeText(phone);
      setCopyMessage('Información copiada');
    } catch (error) {
      console.error('Error copiando telefono:', error);
    }
  };

  const handleOpenAttach = async (patient: Patient) => {
    setAttachPatientId(patient.id);
    setAttachOfficeId(patient.office_id ?? null);
    setAttachLoading(true);
    setAttachError(null);
    setAttachMessage(null);
    setTemplateMessage(null);
    setSentResultLink(null);
    setAttachFiles([]);
    setNewOfficeLabelName('');
    setShowNewLabelInput(false);
    setAttachSelectedFiles([]);
    setShowStoredFiles(false);
    setStoredFilesLoading(false);
    setStoredFilesVisible([]);
    setSelectedStoredFileIds([]);
    setStoredFilesHasMore(false);
    setStoredFilesNextOffset(null);
    setStoredFilesLoads(0);
    setSendResultToPatient(false);
    setSelectedTemplateId(null);
    setShowTemplateForm(false);
    setNewTemplateTitle('');
    setNewTemplateDescription('');
    setOpenTagIds([]);
    setTagStatusSavingId(null);
    setFinalizeTag(null);
    setFinalizingTagId(null);

    try {
      const [data, files] = await Promise.all([
        patientService.getPatientTagControl(patient.id, patient.office_id ?? null),
        patientService.getFiles(patient.id),
      ]);
      setAttachControl(data);
      setAttachFiles(
        [...files].sort(
          (a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime()
        )
      );
    } catch (error) {
      console.error('Error cargando control de etiquetas:', error);
      setAttachControl(null);
      setAttachError('No se pudo cargar la informaci\u00f3n de etiquetas del paciente.');
    } finally {
      setAttachLoading(false);
    }
  };

  const handleOpenQuickEdit = (patient: Patient) => {
    if (!canQuickEditPatient) {
      return;
    }

    setQuickEditPatientId(patient.id);
    setQuickEditName(patient.name ?? '');
    setQuickEditLastName(patient.last_name ?? '');
    setQuickEditPhone(patient.phone ?? '');
    setQuickEditBirthDate(patient.birth_date ?? '');
    setQuickEditGender(
      patient.gender === 'M' || patient.gender === 'F' ? patient.gender : ''
    );
    setQuickEditError(null);
    setQuickEditOpen(true);
  };

  const handleCloseQuickEdit = () => {
    if (quickEditSaving) {
      return;
    }

    setQuickEditOpen(false);
    setQuickEditPatientId(null);
    setQuickEditError(null);
  };

  const handleOpenCreatePatient = () => {
    setCreatePatientName('');
    setCreatePatientLastName('');
    setCreatePatientPhone('');
    setCreatePatientBirthDate('');
    setCreatePatientError(null);
    setCreatePatientOpen(true);
  };

  const handleCloseCreatePatient = () => {
    if (createPatientSaving) {
      return;
    }

    setCreatePatientOpen(false);
    setCreatePatientError(null);
  };

  const handleSelectPatient = (patient: Patient) => {
    if (canViewPatientDetail) {
      navigate(`/pacientes/${patient.id}`);
      return;
    }

    handleOpenQuickEdit(patient);
  };

  const handleSaveQuickEdit = async () => {
    if (!quickEditPatientId) {
      return;
    }

    const normalizedName = quickEditName.trim();
    const normalizedLastName = quickEditLastName.trim();
    const normalizedPhone = quickEditPhone.trim();

    if (!normalizedName || !normalizedLastName) {
      setQuickEditError('Ingresa nombre y apellidos del paciente.');
      return;
    }

    setQuickEditSaving(true);
    setQuickEditError(null);

    try {
      const updatedPatient = await patientService.updatePatient(quickEditPatientId, {
        name: normalizedName,
        last_name: normalizedLastName,
        phone: normalizedPhone || undefined,
        birth: quickEditBirthDate || undefined,
        gender: quickEditGender || undefined,
      });

      setPatients((current) =>
        current.map((patient) => (patient.id === updatedPatient.id ? updatedPatient : patient))
      );
      handleCloseQuickEdit();
    } catch (error) {
      console.error('Error actualizando paciente:', error);
      setQuickEditError('No se pudieron guardar los cambios del paciente.');
    } finally {
      setQuickEditSaving(false);
    }
  };

  const handleCreatePatient = async () => {
    const normalizedName = createPatientName.trim();
    const normalizedLastName = createPatientLastName.trim();
    const normalizedPhone = createPatientPhone.trim();

    if (!normalizedName || !normalizedLastName) {
      setCreatePatientError('Ingresa nombre y apellido del paciente.');
      return;
    }

    setCreatePatientSaving(true);
    setCreatePatientError(null);

    try {
      const createdPatient = await patientService.createPatient({
        name: normalizedName,
        last_name: normalizedLastName,
        phone: normalizedPhone || undefined,
        birth: createPatientBirthDate || undefined,
      });

      setPatients((current) => sortPatientsByName([...current, createdPatient]));
      setCreatePatientOpen(false);

      if (user?.role === 'medico') {
        navigate(`/pacientes/${createdPatient.id}?tab=history`);
      } else {
        setCopyMessage('Registro guardado');
      }
    } catch (error) {
      console.error('Error creando paciente:', error);
      setCreatePatientError('No se pudo guardar el paciente.');
    } finally {
      setCreatePatientSaving(false);
    }
  };

  const handleClosePreview = () => {
    if (previewFileUrl) {
      window.URL.revokeObjectURL(previewFileUrl);
    }
    setPreviewFileUrl(null);
    setPreviewFileName('');
    setPreviewFileType('');
    setPreviewLoading(false);
  };

  const handleOpenLastFilePreview = async () => {
    const lastStoredFile = attachFiles[0];
    if (!lastStoredFile) return;

    const isPreviewable =
      lastStoredFile.type === 'application/pdf' ||
      lastStoredFile.type.startsWith('image/');

    if (!isPreviewable) {
      setAttachError('Solo es posible previsualizar archivos en imagen o PDF.');
      return;
    }

    setPreviewLoading(true);
    setAttachError(null);

    try {
      const blob = await patientService.getFileBlob(lastStoredFile.id);
      const blobUrl = window.URL.createObjectURL(blob);

      if (previewFileUrl) {
        window.URL.revokeObjectURL(previewFileUrl);
      }

      setPreviewFileUrl(blobUrl);
      setPreviewFileName(lastStoredFile.name);
      setPreviewFileType(lastStoredFile.type);
    } catch (error) {
      console.error('Error cargando vista previa del archivo:', error);
      setAttachError('No se pudo cargar la vista previa del archivo.');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleOpenStoredFilePreview = async (file: PatientFile) => {
    const isPreviewable =
      file.type === 'application/pdf' ||
      file.type.startsWith('image/');

    if (!isPreviewable) {
      setAttachError('Solo es posible previsualizar archivos en imagen o PDF.');
      return;
    }

    setPreviewLoading(true);
    setAttachError(null);

    try {
      const blob = await patientService.getFileBlob(file.id);
      const blobUrl = window.URL.createObjectURL(blob);

      if (previewFileUrl) {
        window.URL.revokeObjectURL(previewFileUrl);
      }

      setPreviewFileUrl(blobUrl);
      setPreviewFileName(file.name);
      setPreviewFileType(file.type);
    } catch (error) {
      console.error('Error cargando vista previa del archivo:', error);
      setAttachError('No se pudo cargar la vista previa del archivo.');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleOpenSelectedFilePreview = (file: File) => {
    const isPreviewable =
      file.type === 'application/pdf' ||
      file.type.startsWith('image/');

    if (!isPreviewable) {
      setAttachError('Solo es posible previsualizar archivos en imagen o PDF.');
      return;
    }

    const blobUrl = window.URL.createObjectURL(file);

    if (previewFileUrl) {
      window.URL.revokeObjectURL(previewFileUrl);
    }

    setPreviewLoading(false);
    setPreviewFileUrl(blobUrl);
    setPreviewFileName(file.name);
    setPreviewFileType(file.type);
  };

  const handleRemoveSelectedFile = (fileToRemove: File) => {
    setAttachSelectedFiles((current) =>
      current.filter(
        (file) =>
          !(
            file.name === fileToRemove.name &&
            file.size === fileToRemove.size &&
            file.lastModified === fileToRemove.lastModified
        )
      )
    );
  };

  const totalSelectedForPatientResult = attachSelectedFiles.length + selectedStoredFileIds.length;

  const loadStoredFilesWindow = async (options?: { limit?: number; offset?: number; append?: boolean }) => {
    if (!attachPatientId) return;

    const limit = options?.limit ?? 5;
    const offset = options?.offset ?? 0;
    const append = options?.append ?? false;

    try {
      setStoredFilesLoading(true);
      const response = await patientService.getFilesWindow(attachPatientId, { limit, offset });
      setStoredFilesVisible((current) => {
        if (!append) {
          return response.files;
        }

        const merged = [...current];
        response.files.forEach((file) => {
          if (!merged.some((item) => item.id === file.id)) {
            merged.push(file);
          }
        });
        return merged;
      });
      setStoredFilesHasMore(response.hasMore);
      setStoredFilesNextOffset(response.nextOffset);
      setStoredFilesLoads((current) => current + 1);
    } catch (error) {
      console.error('Error cargando archivos almacenados:', error);
      setAttachError('No se pudieron cargar los archivos almacenados.');
    } finally {
      setStoredFilesLoading(false);
    }
  };

  const handleToggleStoredFiles = async () => {
    const nextOpen = !showStoredFiles;
    setShowStoredFiles(nextOpen);

    if (nextOpen && storedFilesVisible.length === 0 && !storedFilesLoading) {
      await loadStoredFilesWindow({ limit: 5, offset: 0, append: false });
    }
  };

  const handleLoadMoreStoredFiles = async () => {
    if (!storedFilesHasMore || storedFilesNextOffset === null || storedFilesLoading || storedFilesLoads >= 6) {
      return;
    }

    await loadStoredFilesWindow({ limit: 10, offset: storedFilesNextOffset, append: true });
  };

  const handleToggleStoredFileSelection = (fileId: number) => {
    const alreadySelected = selectedStoredFileIds.includes(fileId);

    if (!alreadySelected && totalSelectedForPatientResult >= 3) {
      setAttachWarningMessage('Solo puedes seleccionar hasta 3 documentos en total para el envio.');
      return;
    }

    setAttachError(null);
    setSelectedStoredFileIds((current) =>
      alreadySelected ? current.filter((id) => id !== fileId) : [...current, fileId]
    );
  };

  const handleCreateOfficeLabel = async () => {
    const code = newOfficeLabelName.trim();
    if (!code || !attachPatientId) return;

    setSavingOfficeLabel(true);
    setAttachError(null);
    setAttachMessage(null);

    try {
      const createdLabel = await patientService.createOfficeLabel(code, undefined, attachOfficeId);
      const refreshed = await patientService.updatePatientTagStatuses(attachPatientId, [], {
        officeLabelIds: [createdLabel.id],
        officeId: attachOfficeId,
      });
      setAttachControl(refreshed);
      setNewOfficeLabelName('');
      setShowNewLabelInput(false);
      setAttachMessage('Etiqueta creada y asignada correctamente.');
    } catch (error) {
      console.error('Error creando etiqueta:', error);
      setAttachError('No se pudo crear la etiqueta.');
    } finally {
      setSavingOfficeLabel(false);
    }
  };

  const handleSelectStatus = async (tagId: number, statusId: number) => {
    if (!attachPatientId) return;

    setTagStatusSavingId(tagId);
    setAttachError(null);
    setAttachMessage(null);

    try {
      const data = await patientService.updatePatientTagStatuses(attachPatientId, [
        { tag_id: tagId, status_id: statusId },
      ], { officeId: attachOfficeId });
      setAttachControl(data);
      setOpenTagIds((current) => current.filter((id) => id !== tagId));
      setAttachMessage('Estatus de etiqueta actualizado correctamente.');
    } catch (error) {
      console.error('Error actualizando estatus de etiqueta:', error);
      setAttachError('No se pudo actualizar el estatus de la etiqueta.');
    } finally {
      setTagStatusSavingId(null);
    }
  };

  const handleConfirmFinalizeTag = async () => {
    if (!attachPatientId || !finalizeTag) return;

    setFinalizingTagId(finalizeTag.id);
    setAttachError(null);
    setAttachMessage(null);

    try {
      const data = await patientService.finalizePatientTag(attachPatientId, finalizeTag.id, attachOfficeId);
      setAttachControl(data);
      setAttachMessage('Etiqueta finalizada correctamente.');
      setFinalizeTag(null);
    } catch (error) {
      console.error('Error finalizando etiqueta:', error);
      setAttachError('No se pudo finalizar la etiqueta.');
    } finally {
      setFinalizingTagId(null);
    }
  };

  const handleToggleTagStatuses = (tagId: number) => {
    setOpenTagIds((current) =>
      current.includes(tagId) ? current.filter((id) => id !== tagId) : [...current, tagId]
    );
  };

  const handleChooseAttachFile = () => {
    if (totalSelectedForPatientResult >= 3) {
      setAttachWarningMessage('Solo puedes seleccionar hasta 3 documentos en total para el envio.');
      return;
    }
    attachFileInputRef.current?.click();
  };

  const handleAttachFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? []);

    if (selectedFiles.length === 0) {
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (selectedFiles.some((file) => !allowedTypes.includes(file.type))) {
      setAttachError('Solo se permiten documentos en imagen JPG/PNG o PDF.');
      event.target.value = '';
      return;
    }

    const mergedFiles = [...attachSelectedFiles];

    selectedFiles.forEach((file) => {
      const alreadyIncluded = mergedFiles.some(
        (existing) =>
          existing.name === file.name &&
          existing.size === file.size &&
          existing.lastModified === file.lastModified
      );

      if (!alreadyIncluded) {
        mergedFiles.push(file);
      }
    });

    if (mergedFiles.length + selectedStoredFileIds.length > 3) {
      setAttachWarningMessage('Solo puedes seleccionar hasta 3 documentos en total para el envio.');
      event.target.value = '';
      return;
    }

    setAttachError(null);
    setAttachMessage(null);
    setTemplateMessage(null);
    setAttachSelectedFiles(mergedFiles);
    setSendResultToPatient(false);
    setSelectedTemplateId(null);
    event.target.value = '';
  };

  const handleToggleTemplate = (templateId: number) => {
    setSelectedTemplateId((current) => (current === templateId ? null : templateId));
  };

  const handleCreateTemplate = async () => {
    const title = newTemplateTitle.trim();
    const description = newTemplateDescription.trim();

    if (!title || !description || !attachPatientId) {
      setAttachError('Captura el tÃ­tulo y la descripciÃ³n de la plantilla.');
      return;
    }

    setCreatingTemplate(true);
    setAttachError(null);
    setAttachMessage(null);
    setTemplateMessage(null);
    setSentResultLink(null);

    try {
      const createdTemplate = await patientService.createOfficeResultTemplate(title, description, attachOfficeId);
      const refreshed = await patientService.getPatientTagControl(attachPatientId, attachOfficeId);
      setAttachControl(refreshed);
      setSendResultToPatient(true);
      setSelectedTemplateId(createdTemplate.id);
      setShowTemplateForm(false);
      setNewTemplateTitle('');
      setNewTemplateDescription('');
      setTemplateMessage('Plantilla creada correctamente.');
    } catch (error) {
      console.error('Error creando plantilla de resultado:', error);
      setAttachError('No se pudo crear la plantilla de resultado.');
    } finally {
      setCreatingTemplate(false);
    }
  };

  const handleCancelTemplateForm = () => {
    setShowTemplateForm(false);
    setNewTemplateTitle('');
    setNewTemplateDescription('');
  };

  const handleSendStatuses = async () => {
    if (!attachPatientId) {
      setAttachError('No se encontrÃ³ el paciente para actualizar etiquetas.');
      return;
    }

    if (attachSelectedFiles.length === 0 && selectedStoredFileIds.length === 0) {
      setAttachError('Selecciona al menos un documento antes de enviarlo.');
      return;
    }

    if (sendResultToPatient && !selectedTemplateId) {
      setAttachError('Selecciona una plantilla para preparar el envÃ­o del resultado al paciente.');
      return;
    }

    setAttachSaving(true);
    setAttachError(null);
    setAttachMessage(null);

    try {
      const data = await patientService.updatePatientTagStatuses(attachPatientId, [], {
        files: attachSelectedFiles,
        existingFileIds: selectedStoredFileIds,
        notifyPatient: sendResultToPatient,
        templateId: selectedTemplateId,
        officeId: attachOfficeId,
      });

      setAttachControl(data);
      setSentResultLink(
        sendResultToPatient && selectedTemplateId && data.result_link?.url
          ? { url: data.result_link.url }
          : null
      );
      setAttachSelectedFiles([]);
      setSelectedStoredFileIds([]);
      setSendResultToPatient(false);
      setSelectedTemplateId(null);
      setTemplateMessage(null);
      if (attachFileInputRef.current) {
        attachFileInputRef.current.value = '';
      }
      const sentCount = attachSelectedFiles.length + selectedStoredFileIds.length;
      setAttachMessage(sentCount > 1 ? 'Documentos guardados correctamente.' : 'Documento guardado correctamente.');
    } catch (error) {
      console.error('Error actualizando estatus de etiquetas:', error);
      setAttachError('No se pudieron guardar los cambios del paciente.');
    } finally {
      setAttachSaving(false);
    }
  };

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 3 }}>
        Pacientes
      </Typography>

      {(attachPatientId !== null || attachLoading) && (
        <Card
          ref={attachSectionRef}
          sx={{
            mb: 3,
            border: '1px solid #8dd6ff',
            boxShadow: '0 10px 28px rgba(55, 113, 150, 0.08)',
          }}
        >
          <CardContent sx={{ p: { xs: 2, md: 3 } }}>
            {attachLoading ? (
              <>
                <Skeleton height={34} sx={{ mb: 1 }} />
                <Skeleton height={26} sx={{ mb: 1 }} />
                <Skeleton height={26} sx={{ mb: 1 }} />
                <Skeleton height={220} />
              </>
            ) : attachControl ? (
              <>
                {(() => {
                  const resultTemplates = (attachControl.templates ?? []).filter(
                    (template) =>
                      Boolean(template.code && String(template.code).trim()) &&
                      Boolean(template.data && String(template.data).trim())
                  );

                  return (
                    <>
                <Box
                  sx={{
                    display: 'block',
                    mb: 2,
                  }}
                >
                  <Box sx={{ minWidth: 280, mb: 2 }}>
                    <Typography variant="body1" sx={{ color: 'text.secondary', mb: 0.5 }}>
                      Paciente:{' '}
                      <Box component="span" sx={{ color: 'primary.main', fontWeight: 700 }}>
                        {attachControl.patient.full_name}
                      </Box>
                    </Typography>
                    <Typography
                      variant="body1"
                      sx={{ color: 'text.secondary', mb: 0.5, display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}
                    >
                      <Box component="span">
                        {'Tel\u00e9fono:'}{' '}
                        <Box component="span" sx={{ color: 'primary.main', fontWeight: 700 }}>
                          {attachControl.patient.phone || '-'}
                        </Box>
                      </Box>
                      {attachControl.patient.phone ? (
                        <IconButton
                          size="small"
                          sx={{ p: 0.4 }}
                          onClick={(event) => handleCopyPhone(event, attachControl.patient.phone)}
                        >
                          <ContentCopyIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      ) : null}
                    </Typography>
                    <Typography variant="body1" sx={{ color: 'text.secondary', mb: 0.5 }}>
                      Edad:{' '}
                      <Box component="span" sx={{ color: 'primary.main', fontWeight: 700 }}>
                        {attachControl.patient.age_text || '-'}
                      </Box>
                    </Typography>
                    <Typography variant="body1" sx={{ color: 'text.secondary', mb: 0.5 }}>
                      {'\u00daltima consulta:'}{' '}
                      <Box component="span" sx={{ color: 'primary.main', fontWeight: 700 }}>
                        {attachControl.patient.last_consultation_text || '-'}
                      </Box>
                      {attachControl.patient.last_consultation_diff ? (
                        <Box component="span" sx={{ ml: 0.75, color: 'text.secondary' }}>
                          {attachControl.patient.last_consultation_diff}
                        </Box>
                      ) : null}
                    </Typography>
                    <Typography variant="body1" sx={{ color: 'text.secondary', mb: 0.5 }}>
                      Siguiente cita:{' '}
                      <Box component="span" sx={{ color: 'primary.main', fontWeight: 700 }}>
                        {attachControl.patient.next_appointment_text || '-'}
                      </Box>
                      {attachControl.patient.next_appointment_diff ? (
                        <Box component="span" sx={{ ml: 0.75, color: 'text.secondary' }}>
                          {attachControl.patient.next_appointment_diff}
                        </Box>
                      ) : null}
                    </Typography>
                    <Typography variant="body1" sx={{ color: 'text.secondary', mb: 0.5 }}>
                      {'\u00daltimo archivo/estudio almacenado:'}{' '}
                      {attachControl.patient.last_file_name && attachFiles[0] ? (
                        <Link
                          component="button"
                          type="button"
                          underline="hover"
                          onClick={() => {
                            void handleOpenLastFilePreview();
                          }}
                          sx={{
                            color: '#d32f2f',
                            fontWeight: 700,
                            verticalAlign: 'baseline',
                            textAlign: 'left',
                          }}
                        >
                          {attachControl.patient.last_file_name}
                        </Link>
                      ) : (
                        <Box component="span" sx={{ color: '#d32f2f', fontWeight: 700 }}>
                          {attachControl.patient.last_file_name || '-'}
                        </Box>
                      )}
                      {attachControl.patient.last_file_text ? (
                        <Box component="span" sx={{ ml: 0.75, color: 'text.secondary' }}>
                          {attachControl.patient.last_file_text}
                          {attachControl.patient.last_file_diff
                            ? ` - ${attachControl.patient.last_file_diff}`
                            : ''}
                        </Box>
                      ) : null}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1 }}>
                    <input
                      ref={attachFileInputRef}
                      type="file"
                      multiple
                      accept=".jpg,.jpeg,.png,.pdf,application/pdf,image/jpeg,image/png"
                      hidden
                      onChange={handleAttachFileChange}
                    />
                    <Button
                      variant="contained"
                      sx={{ minWidth: 170 }}
                      onClick={handleChooseAttachFile}
                      disabled={totalSelectedForPatientResult >= 3}
                    >
                      Subir documentos
                    </Button>
                    {totalSelectedForPatientResult > 0 ? (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        <Typography variant="body2" sx={{ color: 'error.main', fontWeight: 700 }}>
                          {totalSelectedForPatientResult} de 3 documento{totalSelectedForPatientResult === 1 ? '' : 's'} seleccionado{totalSelectedForPatientResult === 1 ? '' : 's'}:
                        </Typography>
                        {attachSelectedFiles.map((file) => (
                          <Box
                            key={file.name + file.size}
                            sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}
                          >
                            <Link
                              component="button"
                              type="button"
                              underline="hover"
                              onClick={() => handleOpenSelectedFilePreview(file)}
                              sx={{ color: 'error.main', fontSize: '0.875rem', textAlign: 'left' }}
                            >
                              • {file.name} (pendiente por subir)
                            </Link>
                            <Link
                              component="button"
                              type="button"
                              underline="hover"
                              onClick={() => handleRemoveSelectedFile(file)}
                              sx={{ color: 'error.main', fontSize: '0.84rem', fontWeight: 600 }}
                            >
                              Eliminar
                            </Link>
                          </Box>
                        ))}
                        {selectedStoredFileIds.map((fileId) => {
                          const selectedFile = storedFilesVisible.find((file) => file.id === fileId);
                          return selectedFile ? (
                            <Box
                              key={fileId}
                              sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}
                            >
                              <Link
                                component="button"
                                type="button"
                                underline="hover"
                                onClick={() => void handleOpenStoredFilePreview(selectedFile)}
                                sx={{ color: 'text.secondary', fontSize: '0.875rem', textAlign: 'left' }}
                              >
                                • {selectedFile.name} (ya almacenado)
                              </Link>
                              <Link
                                component="button"
                                type="button"
                                underline="hover"
                                onClick={() => handleToggleStoredFileSelection(fileId)}
                                sx={{ color: 'error.main', fontSize: '0.84rem', fontWeight: 600 }}
                              >
                                Eliminar
                              </Link>
                            </Box>
                          ) : null;
                        })}
                      </Box>
                    ) : (
                      <Typography variant="caption" sx={{ width: '100%', color: 'text.secondary' }}>
                        Solo se permiten archivos JPG, PNG o PDF. Maximo 3 documentos.
                      </Typography>
                    )}
                    {attachSelectedFiles.length > 0 ? (
                      <Alert severity="error" sx={{ mt: 1, width: '100%', maxWidth: 820 }}>
                        Los documentos aun no se han almacenado. Para terminar el proceso da clic en Enviar.
                      </Alert>
                    ) : null}
                    {attachSelectedFiles.length === 1 && singleAttachPreviewUrl ? (
                      <Box
                        sx={{
                          mt: 1,
                          width: '100%',
                          maxWidth: 820,
                          p: 1,
                          border: '1px solid #dfe7ef',
                          borderRadius: 2,
                          backgroundColor: '#fafcfe',
                        }}
                      >
                        {singleAttachPreviewType === 'application/pdf' ? (
                          <Box
                            component="iframe"
                            src={`${singleAttachPreviewUrl}#toolbar=0&navpanes=0&pagemode=none&view=FitH`}
                            title={`Vista previa de ${singleAttachPreviewName}`}
                            sx={{
                              width: '100%',
                              height: 260,
                              border: 0,
                              borderRadius: 1,
                              backgroundColor: '#ffffff',
                            }}
                          />
                        ) : (
                          <Box
                            component="img"
                            src={singleAttachPreviewUrl}
                            alt={`Vista previa de ${singleAttachPreviewName}`}
                            sx={{
                              display: 'block',
                              width: '100%',
                              maxHeight: 360,
                              objectFit: 'contain',
                              borderRadius: 1,
                              backgroundColor: '#ffffff',
                            }}
                          />
                        )}
                      </Box>
                    ) : null}
                    <Link
                      component="button"
                      type="button"
                      underline="hover"
                      onClick={() => void handleToggleStoredFiles()}
                      sx={{ mt: 0.5 }}
                    >
                      {showStoredFiles ? 'Ocultar archivos almacenados' : 'Enlistar archivos almacenados'}
                    </Link>
                    {showStoredFiles ? (
                      <Box
                        sx={{
                          mt: 1,
                          width: '100%',
                          maxWidth: 560,
                          border: '1px solid #dfe7ef',
                          borderRadius: 2,
                          backgroundColor: '#fafcfe',
                          overflow: 'hidden',
                        }}
                      >
                        {storedFilesLoading && storedFilesVisible.length === 0 ? (
                          <Box sx={{ p: 2 }}>
                            <Skeleton height={28} />
                            <Skeleton height={28} />
                            <Skeleton height={28} />
                          </Box>
                        ) : storedFilesVisible.length === 0 ? (
                          <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
                            No hay archivos almacenados disponibles para este paciente en este consultorio.
                          </Typography>
                        ) : (
                          <>
                            {storedFilesVisible.map((file, index) => {
                              const checked = selectedStoredFileIds.includes(file.id);
                              return (
                                <Box
                                  key={file.id}
                                  sx={{
                                    px: 1.25,
                                    py: 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: 1.5,
                                    borderTop: index === 0 ? 'none' : '1px solid #e7edf3',
                                  }}
                                >
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0, flex: 1 }}>
                                    <Checkbox
                                      checked={checked}
                                      onChange={() => handleToggleStoredFileSelection(file.id)}
                                      disabled={!checked && totalSelectedForPatientResult >= 3}
                                      sx={{ p: 0.25 }}
                                    />
                                    <Link
                                      component="button"
                                      type="button"
                                      underline="hover"
                                      onClick={() => handleToggleStoredFileSelection(file.id)}
                                      sx={{
                                        textAlign: 'left',
                                        color: checked ? 'primary.main' : 'text.primary',
                                        fontWeight: checked ? 700 : 500,
                                        opacity: !checked && totalSelectedForPatientResult >= 3 ? 0.5 : 1,
                                        pointerEvents: !checked && totalSelectedForPatientResult >= 3 ? 'none' : 'auto',
                                      }}
                                    >
                                      {file.name}
                                    </Link>
                                  </Box>
                                  <Link
                                    component="button"
                                    type="button"
                                    underline="hover"
                                    onClick={() => void handleOpenStoredFilePreview(file)}
                                    sx={{ whiteSpace: 'nowrap' }}
                                  >
                                    Ver archivo
                                  </Link>
                                </Box>
                              );
                            })}
                            {storedFilesHasMore && storedFilesLoads < 6 ? (
                              <Box sx={{ px: 1.25, py: 1, borderTop: '1px solid #e7edf3' }}>
                                <Link
                                  component="button"
                                  type="button"
                                  underline="hover"
                                  onClick={() => void handleLoadMoreStoredFiles()}
                                  disabled={storedFilesLoading}
                                >
                                  {storedFilesLoading ? 'Cargando...' : 'Mostrar mas'}
                                </Link>
                              </Box>
                            ) : null}
                          </>
                        )}
                      </Box>
                    ) : null}
                    {totalSelectedForPatientResult > 0 ? (
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1 }}>
                        <Box
                          sx={{ display: 'flex', alignItems: 'center', gap: 0.75, cursor: 'pointer' }}
                          onClick={() => {
                            const nextChecked = !sendResultToPatient;
                            setSendResultToPatient(nextChecked);
                            if (!nextChecked) {
                              setSelectedTemplateId(null);
                            }
                          }}
                        >
                          <Checkbox
                            checked={sendResultToPatient}
                            onChange={(event) => {
                              const checked = event.target.checked;
                              setSendResultToPatient(checked);
                              if (!checked) {
                                setSelectedTemplateId(null);
                              }
                            }}
                            sx={{ p: 0.25 }}
                          />
                          <Typography variant="body2" color="text.secondary">
                            Enviar resultado al paciente
                          </Typography>
                        </Box>
                        {sendResultToPatient ? (
                          <Box sx={{ width: '100%' }}>
                            <Typography
                              variant="h5"
                              sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 1.5 }}
                            >
                              <DescriptionOutlinedIcon sx={{ color: '#14a3b8', fontSize: 24 }} />
                              Plantillas
                            </Typography>
                            <Typography
                              variant="caption"
                              sx={{ display: 'block', color: 'error.main', mb: 1.5, fontSize: '0.8rem' }}
                            >
                              Al seleccionar esta casilla se enviará una notificación al paciente
                              sobre el resultado de su estudio. Es necesario seleccionar un template
                              previamente configurado.
                            </Typography>

                            {resultTemplates.map((template) => (
                              <Box
                                key={template.id}
                                sx={{
                                  display: 'flex',
                                  alignItems: 'stretch',
                                  gap: 1,
                                  py: 0.9,
                                  px: 0.5,
                                  borderRadius: 1.5,
                                  cursor: 'pointer',
                                  transition: 'background-color 0.18s ease',
                                  '&:hover': {
                                    backgroundColor: 'rgba(20, 163, 184, 0.06)',
                                  },
                                }}
                                onClick={() => handleToggleTemplate(template.id)}
                              >
                                <Checkbox
                                  checked={selectedTemplateId === template.id}
                                  onChange={() => handleToggleTemplate(template.id)}
                                  onClick={(event) => event.stopPropagation()}
                                  sx={{ p: 0.25, alignSelf: 'flex-start', mt: 0.15 }}
                                />
                                 <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                    <Typography
                                      variant="body1"
                                      sx={{ fontWeight: 700 }}
                                    >
                                      {template.code}
                                   </Typography>
                                  {template.data ? (
                                    <Typography
                                      variant="body2"
                                      sx={{ color: 'text.disabled', fontSize: '0.8rem' }}
                                    >
                                      {template.data}
                                    </Typography>
                                  ) : null}
                                </Box>
                              </Box>
                            ))}

                            {resultTemplates.length === 0 ? (
                              <Typography
                                variant="body2"
                                sx={{ color: 'text.secondary', fontSize: '0.85rem', mb: 1 }}
                              >
                                TodavÃ­a no hay plantillas configuradas para este consultorio.
                              </Typography>
                            ) : null}

                            {!showTemplateForm ? (
                              <Button
                                variant="text"
                                size="small"
                                sx={{ mt: 1, px: 0, fontSize: '0.98rem' }}
                                onClick={() => setShowTemplateForm(true)}
                              >
                                Nueva plantilla
                              </Button>
                            ) : null}

                            {templateMessage ? (
                              <Alert severity="success" sx={{ mt: 1.25, mb: 1.25, maxWidth: 560 }}>
                                {templateMessage}
                              </Alert>
                            ) : null}

                            {showTemplateForm ? (
                              <Box
                                sx={{
                                  mt: 1.5,
                                  display: 'grid',
                                  gap: 1.5,
                                  maxWidth: 560,
                                }}
                              >
                                <TextField
                                  size="small"
                                  label="TÃ­tulo"
                                  value={newTemplateTitle}
                                  onChange={(event) => setNewTemplateTitle(event.target.value)}
                                />
                                <TextField
                                  size="small"
                                  multiline
                                  minRows={3}
                                  label="DescripciÃ³n"
                                  value={newTemplateDescription}
                                  onChange={(event) => setNewTemplateDescription(event.target.value)}
                                />
                                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                  <Button
                                    variant="outlined"
                                    sx={{ width: 'fit-content' }}
                                    onClick={() => void handleCreateTemplate()}
                                    disabled={creatingTemplate}
                                  >
                                    {creatingTemplate ? 'Guardando...' : 'Guardar plantilla'}
                                  </Button>
                                  <Button
                                    variant="text"
                                    color="inherit"
                                    sx={{ width: 'fit-content' }}
                                    onClick={handleCancelTemplateForm}
                                    disabled={creatingTemplate}
                                  >
                                    Cancelar nueva plantilla
                                  </Button>
                                </Box>
                              </Box>
                            ) : null}

                            {sentResultLink?.url ? (
                              <Alert severity="success" sx={{ mt: 2, maxWidth: 560 }}>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                    Link del resultado enviado
                                  </Typography>
                                  <Link
                                    href={sentResultLink.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    underline="hover"
                                    sx={{ wordBreak: 'break-all' }}
                                  >
                                    {sentResultLink.url}
                                  </Link>
                                </Box>
                              </Alert>
                            ) : null}
                          </Box>
                        ) : null}
                      </Box>
                    ) : null}
                  </Box>
                </Box>

                <Divider sx={{ my: 3 }} />

                <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 1 }}>
                  <Box component="span" sx={{ color: '#ffcf48', fontSize: 24, lineHeight: 1 }}>
                    &#9873;
                  </Box>
                  Etiquetas:
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ display: 'block', color: 'text.secondary', mb: 1, fontSize: '0.82rem' }}
                >
                  Selecciona un nuevo estado de la etiqueta
                </Typography>

                {attachControl.statuses.length === 0 ? (
                  <Alert
                    severity="warning"
                    sx={{
                      mb: 2,
                      alignItems: 'flex-start',
                      '& .MuiAlert-message': {
                        width: '100%',
                      },
                    }}
                  >
                    AÃºn no hay estados configurados para las etiquetas. Los estados te permiten indicar en quÃ© etapa se
                    encuentra cada etiqueta, por ejemplo: pendiente, en proceso o concluido.
                  </Alert>
                ) : null}

                {attachError ? (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {attachError}
                  </Alert>
                ) : null}

                {attachControl.tags.length === 0 ? (
                  <Typography color="text.secondary" sx={{ mb: 2 }}>
                    Este paciente no tiene etiquetas activas para editar.
                  </Typography>
                ) : (
                  <Box sx={{ mb: 1 }}>
                    {attachControl.tags.map((tag, index) => (
                      <Box key={tag.id}>
                        {index > 0 && <Divider sx={{ my: 1.2 }} />}
                        {(() => {
                          const isOpen = openTagIds.includes(tag.id);
                          const availableStatuses = attachControl.statuses.filter(
                            (status) => status.code !== tag.current_status.code
                          );

                          return (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                            <Typography
                              variant="body1"
                              sx={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: 0.9 }}
                            >
                              <Box
                                component="span"
                                sx={{ color: '#ffcf48', fontSize: 20, lineHeight: 1 }}
                              >
                                &#9873;
                              </Box>
                              {tag.code}
                            </Typography>
                            {tag.created_at_label ? (
                              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                {tag.created_at_label}
                              </Typography>
                            ) : null}
                            <Typography variant="body1" sx={{ color: 'text.secondary', ml: { md: 2 } }}>
                              Estatus actual:
                            </Typography>
                            <Chip
                              label={tag.current_status.code}
                              size="small"
                              onClick={() => handleToggleTagStatuses(tag.id)}
                              clickable
                              sx={{
                                fontWeight: 700,
                                cursor: 'pointer',
                                boxShadow: isOpen ? '0 0 0 2px rgba(38,50,56,0.16)' : 'none',
                                color:
                                  labelStatusColorMap[tag.current_status.color_class]?.text ??
                                  labelStatusColorMap['btn-default'].text,
                                backgroundColor:
                                  labelStatusColorMap[tag.current_status.color_class]?.bg ??
                                  labelStatusColorMap['btn-default'].bg,
                              }}
                            />
                            {tag.current_status.date ? (
                              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                {tag.current_status.date}
                              </Typography>
                            ) : null}
                            <Button
                              variant="text"
                              color="error"
                              sx={{ px: 0, minWidth: 'auto', ml: 'auto' }}
                              onClick={() => setFinalizeTag({ id: tag.id, code: tag.code })}
                              disabled={finalizingTagId === tag.id}
                            >
                              finalizar etiqueta
                            </Button>
                          </Box>

                          <Box
                            sx={{
                              display: 'flex',
                              flexWrap: 'wrap',
                              gap: 1,
                            }}
                          >
                            {isOpen
                              ? availableStatuses.map((status) => (
                              <Button
                                key={status.id}
                                size="small"
                                variant="contained"
                                onClick={() => void handleSelectStatus(tag.id, status.id)}
                                disabled={tagStatusSavingId === tag.id}
                                sx={getStatusButtonSx(
                                  status.color_class,
                                  tag.current_status.code === status.code
                                )}
                              >
                                {status.code}
                              </Button>
                              ))
                              : null}
                          </Box>
                        </Box>
                          );
                        })()}
                      </Box>
                    ))}
                  </Box>
                )}

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25, mb: 1.5 }}>
                  {!showNewLabelInput ? (
                    <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
                      <Link
                        component="button"
                        type="button"
                        underline="hover"
                        onClick={() => setShowNewLabelInput(true)}
                        sx={{ color: 'primary.main', fontWeight: 600 }}
                      >
                        Nueva etiqueta
                      </Link>
                    </Box>
                  ) : (
                    <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
                      <Box
                        sx={{
                          display: 'flex',
                          gap: 1,
                          flexWrap: 'wrap',
                          width: { xs: '100%', md: 'auto' },
                          maxWidth: { xs: '100%', md: 640 },
                        }}
                      >
                        <TextField
                          size="small"
                          placeholder="Nueva etiqueta"
                          value={newOfficeLabelName}
                          onChange={(e) => setNewOfficeLabelName(e.target.value)}
                          sx={{ flex: 1, minWidth: { xs: '100%', md: 460 } }}
                          disabled={savingOfficeLabel}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              event.preventDefault();
                              void handleCreateOfficeLabel();
                            }
                          }}
                        />
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => void handleCreateOfficeLabel()}
                          disabled={savingOfficeLabel || !newOfficeLabelName.trim()}
                        >
                          {savingOfficeLabel ? 'Creando...' : 'Agregar'}
                        </Button>
                        <Button
                          size="small"
                          variant="text"
                          color="inherit"
                          onClick={() => {
                            setShowNewLabelInput(false);
                            setNewOfficeLabelName('');
                          }}
                          disabled={savingOfficeLabel}
                        >
                          Cancelar
                        </Button>
                      </Box>
                    </Box>
                  )}
                </Box>
                <Button
                  variant="contained"
                  color="success"
                  sx={{ mt: 1, minWidth: 120 }}
                  onClick={() => void handleSendStatuses()}
                  disabled={attachSaving || totalSelectedForPatientResult === 0}
                >
                  {attachSaving ? 'Guardando...' : 'Enviar'}
                </Button>
                    </>
                  );
                })()}
              </>
            ) : (
              <Alert severity="error">{'No se pudo cargar la informaci\u00f3n del paciente.'}</Alert>
            )}
          </CardContent>
        </Card>
      )}

      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ py: 2 }}>
          <Box sx={{ display: 'flex', gap: 1.5, flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'stretch', sm: 'center' } }}>
            <TextField
              fullWidth
              placeholder={'Buscar por nombre o tel\u00e9fono...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon color="action" />
                    </InputAdornment>
                  ),
                },
              }}
              size="small"
            />
            <Button variant="contained" onClick={handleOpenCreatePatient} sx={{ minWidth: { sm: 180 } }}>
              Nuevo paciente
            </Button>
          </Box>
        </CardContent>
      </Card>

      <Card>
        {loading ? (
          <CardContent>
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} height={50} sx={{ mb: 1 }} />
            ))}
          </CardContent>
        ) : isMobile ? (
          <>
            <List>
              {paginatedPatients.map((patient) => (
                <ListItem
                  key={patient.id}
                  divider
                  sx={{ '&:hover': { bgcolor: 'action.hover' }, alignItems: 'flex-start' }}
                >
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'primary.main' }}>
                      {patient.name?.[0] ?? '?'}
                      {patient.last_name?.[0] ?? ''}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={patient.full_name ?? `${patient.name} ${patient.last_name}`}
                    secondary={
                      <Box component="span" sx={{ display: 'inline-flex', flexDirection: 'column', gap: 1 }}>
                        <Box
                          component="span"
                          sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}
                        >
                          {patient.phone ? (
                            <>
                              <span>{formatPhone(patient.phone)}</span>
                              <IconButton
                                size="small"
                                sx={{ p: 0.25 }}
                                onClick={(event) => handleCopyPhone(event, patient.phone)}
                              >
                                <ContentCopyIcon sx={{ fontSize: 14 }} />
                              </IconButton>
                            </>
                          ) : (
                            <span>Sin datos de contacto</span>
                          )}
                        </Box>
                        <Box component="span" sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => void handleOpenAttach(patient)}
                          >
                            Más opciones
                          </Button>
                          <Button
                            size="small"
                            variant="contained"
                            onClick={() => handleSelectPatient(patient)}
                          >
                            Seleccionar
                          </Button>
                        </Box>
                      </Box>
                    }
                  />
                </ListItem>
              ))}
              {paginatedPatients.length === 0 && (
                <ListItem>
                  <ListItemText
                    primary="No se encontraron pacientes"
                    primaryTypographyProps={{ color: 'text.secondary', textAlign: 'center' }}
                  />
                </ListItem>
              )}
            </List>

            <TablePagination
              component="div"
              count={filteredPatients.length}
              page={page}
              onPageChange={handleChangePage}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              rowsPerPageOptions={[5, 10, 25, 50]}
              labelRowsPerPage="Filas por pagina"
              labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
            />
          </>
        ) : (
          <>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Paciente</TableCell>
                    <TableCell>{'Tel\u00e9fono'}</TableCell>
                    <TableCell>Fecha de Nacimiento</TableCell>
                    <TableCell align="center">Más opciones</TableCell>
                    <TableCell align="center">Seleccionar</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedPatients.map((patient) => (
                    <TableRow key={patient.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32, fontSize: 14 }}>
                            {patient.name?.[0] ?? '?'}
                            {patient.last_name?.[0] ?? ''}
                          </Avatar>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {patient.full_name ?? `${patient.name} ${patient.last_name}`}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                          <Typography variant="body2">{formatPhone(patient.phone)}</Typography>
                          {patient.phone && (
                            <IconButton
                              size="small"
                              sx={{ p: 0.25 }}
                              onClick={(event) => handleCopyPhone(event, patient.phone)}
                            >
                              <ContentCopyIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        {patient.birth_date
                          ? `${formatDisplayDate(patient.birth_date)}${patient.age ? ` (${patient.age} a\u00f1os)` : ''}`
                          : '-'}
                      </TableCell>
                      <TableCell align="center">
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => void handleOpenAttach(patient)}
                        >
                          Más opciones
                        </Button>
                      </TableCell>
                      <TableCell align="center">
                        <Button
                          size="small"
                          variant="contained"
                          onClick={() => handleSelectPatient(patient)}
                        >
                          Seleccionar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}

                  {paginatedPatients.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} sx={{ textAlign: 'center', py: 4 }}>
                        <Typography color="text.secondary">
                          No se encontraron pacientes
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination
              component="div"
              count={filteredPatients.length}
              page={page}
              onPageChange={handleChangePage}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              rowsPerPageOptions={[5, 10, 25, 50]}
              labelRowsPerPage="Filas por pagina"
              labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
            />
          </>
        )}
      </Card>

      <Dialog
        open={Boolean(finalizeTag)}
        onClose={() => {
          if (!finalizingTagId) {
            setFinalizeTag(null);
          }
        }}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>
          Finalizar etiqueta
          {finalizeTag ? (
            <Typography component="div" sx={{ mt: 0.75, fontWeight: 700, color: '#5f6f7a', fontSize: '0.9rem' }}>
              {finalizeTag.code}
            </Typography>
          ) : null}
        </DialogTitle>
        <DialogContent dividers>
          <Typography>
            Si finalizas la etiqueta cambiará su estado a inactiva y ya no podrás asignarle
            ningún estado. ¿Continuar?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setFinalizeTag(null)}
            disabled={Boolean(finalizingTagId)}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => void handleConfirmFinalizeTag()}
            disabled={Boolean(finalizingTagId)}
          >
            {finalizingTagId ? 'Finalizando...' : 'Sí, finalizar'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(previewFileUrl) || previewLoading}
        onClose={handleClosePreview}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>{previewFileName || 'Vista previa del documento'}</DialogTitle>
        <DialogContent dividers>
          {previewLoading ? (
            <Box sx={{ py: 8, textAlign: 'center' }}>
              <Skeleton variant="rectangular" height={360} />
            </Box>
          ) : previewFileUrl ? (
            previewFileType === 'application/pdf' ? (
              <Box
                component="iframe"
                src={`${previewFileUrl}#toolbar=0&navpanes=0&pagemode=none&view=FitH`}
                title={previewFileName || 'Vista previa del PDF'}
                sx={{ width: '100%', height: '75vh', border: 0 }}
              />
            ) : (
              <Box
                component="img"
                src={previewFileUrl}
                alt={previewFileName || 'Vista previa del archivo'}
                sx={{
                  display: 'block',
                  maxWidth: '100%',
                  maxHeight: '75vh',
                  mx: 'auto',
                  objectFit: 'contain',
                }}
              />
            )
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClosePreview}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={Boolean(copyMessage)}
        autoHideDuration={2500}
        onClose={() => setCopyMessage(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          severity="success"
          variant="filled"
          onClose={() => setCopyMessage(null)}
          sx={{ width: '100%' }}
        >
          {copyMessage}
        </Alert>
      </Snackbar>

      <Snackbar
        open={Boolean(attachMessage)}
        autoHideDuration={2500}
        onClose={() => setAttachMessage(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          severity="success"
          variant="filled"
          onClose={() => setAttachMessage(null)}
          sx={{ width: '100%' }}
        >
          {attachMessage}
        </Alert>
      </Snackbar>

      <Snackbar
        open={Boolean(attachWarningMessage)}
        autoHideDuration={2500}
        onClose={() => setAttachWarningMessage(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          severity="warning"
          variant="filled"
          onClose={() => setAttachWarningMessage(null)}
          sx={{ width: '100%' }}
        >
          {attachWarningMessage}
        </Alert>
      </Snackbar>

      <Dialog
        open={createPatientOpen}
        onClose={handleCloseCreatePatient}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Nuevo paciente</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'grid', gap: 2, mt: 0.5 }}>
            {createPatientError && <Alert severity="error">{createPatientError}</Alert>}

            <TextField
              label="Nombre"
              value={createPatientName}
              onChange={(event) => setCreatePatientName(event.target.value)}
              fullWidth
              disabled={createPatientSaving}
            />

            <TextField
              label="Apellido"
              value={createPatientLastName}
              onChange={(event) => setCreatePatientLastName(event.target.value)}
              fullWidth
              disabled={createPatientSaving}
            />

            <TextField
              label="Teléfono"
              value={createPatientPhone}
              onChange={(event) => setCreatePatientPhone(event.target.value)}
              fullWidth
              disabled={createPatientSaving}
            />

            <ClickableDateField
              label="Fecha de nacimiento"
              value={createPatientBirthDate}
              onChange={setCreatePatientBirthDate}
              disabled={createPatientSaving}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCreatePatient} disabled={createPatientSaving}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={() => void handleCreatePatient()}
            disabled={createPatientSaving}
          >
            {createPatientSaving ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={quickEditOpen}
        onClose={handleCloseQuickEdit}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Editar datos del paciente</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'grid', gap: 2, mt: 0.5 }}>
            {quickEditError && <Alert severity="error">{quickEditError}</Alert>}

            <TextField
              label="Nombre"
              value={quickEditName}
              onChange={(event) => setQuickEditName(event.target.value)}
              fullWidth
              disabled={quickEditSaving}
            />

            <TextField
              label="Apellidos"
              value={quickEditLastName}
              onChange={(event) => setQuickEditLastName(event.target.value)}
              fullWidth
              disabled={quickEditSaving}
            />

            <TextField
              label="TelÃ©fono"
              value={quickEditPhone}
              onChange={(event) => setQuickEditPhone(event.target.value)}
              fullWidth
              disabled={quickEditSaving}
            />

            <TextField
              label="Fecha de nacimiento"
              type="date"
              value={quickEditBirthDate}
              onChange={(event) => setQuickEditBirthDate(event.target.value)}
              fullWidth
              disabled={quickEditSaving}
              slotProps={{ inputLabel: { shrink: true } }}
            />

            <TextField
              select
              label="GÃ©nero"
              value={quickEditGender}
              onChange={(event) =>
                setQuickEditGender(event.target.value as 'M' | 'F' | '')
              }
              fullWidth
              disabled={quickEditSaving}
            >
              <MenuItem value="">Sin especificar</MenuItem>
              <MenuItem value="F">Femenino</MenuItem>
              <MenuItem value="M">Masculino</MenuItem>
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseQuickEdit} disabled={quickEditSaving}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={() => void handleSaveQuickEdit()}
            disabled={quickEditSaving}
          >
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}


