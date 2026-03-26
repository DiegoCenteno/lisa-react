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
  IconButton,
  InputAdornment,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
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
} from '@mui/material';
import {
  Attachment as AttachmentIcon,
  ContentCopy as ContentCopyIcon,
  DescriptionOutlined as DescriptionOutlinedIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { patientService } from '../../api/patientService';
import type { Patient, PatientTagControlData } from '../../types';
import { formatDisplayDate } from '../../utils/date';

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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [patients, setPatients] = useState<Patient[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [attachPatientId, setAttachPatientId] = useState<number | null>(null);
  const [attachControl, setAttachControl] = useState<PatientTagControlData | null>(null);
  const [attachLoading, setAttachLoading] = useState(false);
  const [attachSaving, setAttachSaving] = useState(false);
  const [attachError, setAttachError] = useState<string | null>(null);
  const [attachMessage, setAttachMessage] = useState<string | null>(null);
  const [templateMessage, setTemplateMessage] = useState<string | null>(null);
  const [activeTagIds, setActiveTagIds] = useState<number[]>([]);
  const [pendingStatuses, setPendingStatuses] = useState<Record<number, number>>({});
  const [newOfficeLabelName, setNewOfficeLabelName] = useState('');
  const [savingOfficeLabel, setSavingOfficeLabel] = useState(false);
  const [attachSelectedFile, setAttachSelectedFile] = useState<File | null>(null);
  const [attachPreviewUrl, setAttachPreviewUrl] = useState<string | null>(null);
  const [sendResultToPatient, setSendResultToPatient] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [newTemplateTitle, setNewTemplateTitle] = useState('');
  const [newTemplateDescription, setNewTemplateDescription] = useState('');
  const [creatingTemplate, setCreatingTemplate] = useState(false);
  const attachFileInputRef = useRef<HTMLInputElement | null>(null);

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
    if (!attachSelectedFile) {
      setAttachPreviewUrl(null);
      return;
    }

    if (
      attachSelectedFile.type !== 'image/jpeg' &&
      attachSelectedFile.type !== 'image/png' &&
      attachSelectedFile.type !== 'application/pdf'
    ) {
      setAttachPreviewUrl(null);
      return;
    }

    const objectUrl = window.URL.createObjectURL(attachSelectedFile);
    setAttachPreviewUrl(objectUrl);

    return () => {
      window.URL.revokeObjectURL(objectUrl);
    };
  }, [attachSelectedFile]);

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
    } catch (error) {
      console.error('Error copiando telefono:', error);
    }
  };

  const handleOpenAttach = async (patientId: number) => {
    setAttachPatientId(patientId);
    setAttachLoading(true);
    setAttachError(null);
    setAttachMessage(null);
    setTemplateMessage(null);
    setActiveTagIds([]);
    setPendingStatuses({});
    setNewOfficeLabelName('');
    setAttachSelectedFile(null);
    setAttachPreviewUrl(null);
    setSendResultToPatient(false);
    setSelectedTemplateId(null);
    setShowTemplateForm(false);
    setNewTemplateTitle('');
    setNewTemplateDescription('');

    try {
      const data = await patientService.getPatientTagControl(patientId);
      setAttachControl(data);
    } catch (error) {
      console.error('Error cargando control de etiquetas:', error);
      setAttachControl(null);
      setAttachError('No se pudo cargar la informaci\u00f3n de etiquetas del paciente.');
    } finally {
      setAttachLoading(false);
    }
  };

  const handleToggleTag = (tagId: number) => {
    setAttachError(null);
    setActiveTagIds((current) => {
      if (current.includes(tagId)) {
        setPendingStatuses((pending) => {
          const next = { ...pending };
          delete next[tagId];
          return next;
        });
        return current.filter((id) => id !== tagId);
      }

      return Array.from(new Set([...current, tagId]));
    });
  };

  const handleCreateOfficeLabel = async () => {
    const code = newOfficeLabelName.trim();
    if (!code || !attachPatientId) return;

    setSavingOfficeLabel(true);
    setAttachError(null);
    setAttachMessage(null);

    try {
      const createdLabel = await patientService.createOfficeLabel(code);
      const refreshed = await patientService.updatePatientTagStatuses(attachPatientId, [], {
        officeLabelIds: [createdLabel.id],
      });
      setAttachControl(refreshed);
      setNewOfficeLabelName('');
      setAttachMessage('Etiqueta creada y asignada correctamente.');
    } catch (error) {
      console.error('Error creando etiqueta:', error);
      setAttachError('No se pudo crear la etiqueta.');
    } finally {
      setSavingOfficeLabel(false);
    }
  };

  const handleSelectStatus = (tagId: number, statusId: number) => {
    setActiveTagIds((current) => (current.includes(tagId) ? current : [...current, tagId]));
    setPendingStatuses((current) => ({
      ...current,
      [tagId]: statusId,
    }));
  };

  const handleChooseAttachFile = () => {
    attachFileInputRef.current?.click();
  };

  const handleAttachFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0] ?? null;

    if (!selectedFile) {
      setAttachSelectedFile(null);
      setAttachPreviewUrl(null);
      setSendResultToPatient(false);
      setSelectedTemplateId(null);
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(selectedFile.type)) {
      setAttachSelectedFile(null);
      setAttachPreviewUrl(null);
      setSendResultToPatient(false);
      setSelectedTemplateId(null);
      setAttachError('Solo se permiten documentos en imagen JPG/PNG o PDF.');
      event.target.value = '';
      return;
    }

    setAttachError(null);
    setAttachMessage(null);
    setTemplateMessage(null);
    setAttachSelectedFile(selectedFile);
    setSendResultToPatient(false);
    setSelectedTemplateId(null);
  };

  const handleToggleTemplate = (templateId: number) => {
    setSelectedTemplateId((current) => (current === templateId ? null : templateId));
  };

  const handleCreateTemplate = async () => {
    const title = newTemplateTitle.trim();
    const description = newTemplateDescription.trim();

    if (!title || !description || !attachPatientId) {
      setAttachError('Captura el título y la descripción de la plantilla.');
      return;
    }

    setCreatingTemplate(true);
    setAttachError(null);
    setAttachMessage(null);
    setTemplateMessage(null);

    try {
      const createdTemplate = await patientService.createOfficeResultTemplate(title, description);
      const refreshed = await patientService.getPatientTagControl(attachPatientId);
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

  const handleSendStatuses = async () => {
    if (!attachPatientId) {
      setAttachError('No se encontró el paciente para actualizar etiquetas.');
      return;
    }

    const updates = activeTagIds
      .map((tagId) => ({
        tag_id: tagId,
        status_id: pendingStatuses[tagId],
      }))
      .filter((item) => Boolean(item.status_id));

    if (updates.length === 0 && !attachSelectedFile) {
      setAttachError('No hay cambios de estatus ni documentos para guardar.');
      return;
    }

    if (attachSelectedFile && sendResultToPatient && !selectedTemplateId) {
      setAttachError('Selecciona una plantilla para preparar el envío del resultado al paciente.');
      return;
    }

    setAttachSaving(true);
    setAttachError(null);
    setAttachMessage(null);

    try {
      const data = await patientService.updatePatientTagStatuses(attachPatientId, updates, {
        file: attachSelectedFile,
        notifyPatient: sendResultToPatient,
        templateId: selectedTemplateId,
      });

      setAttachControl(data);
      setActiveTagIds([]);
      setPendingStatuses({});
      setAttachSelectedFile(null);
      setAttachPreviewUrl(null);
      setSendResultToPatient(false);
      setSelectedTemplateId(null);
      setTemplateMessage(null);
      if (attachFileInputRef.current) {
        attachFileInputRef.current.value = '';
      }
      setAttachMessage('Cambios de etiquetas y documentos guardados correctamente.');
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
                    <Typography variant="body1" sx={{ color: 'text.secondary', mb: 0.5 }}>
                      {'Tel\u00e9fono:'}{' '}
                      <Box component="span" sx={{ color: 'primary.main', fontWeight: 700 }}>
                        {attachControl.patient.phone || '-'}
                      </Box>
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
                      <Box component="span" sx={{ color: '#d32f2f', fontWeight: 700 }}>
                        {attachControl.patient.last_file_name || '-'}
                      </Box>
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
                      accept=".jpg,.jpeg,.png,.pdf,application/pdf,image/jpeg,image/png"
                      hidden
                      onChange={handleAttachFileChange}
                    />
                    <Button variant="contained" sx={{ minWidth: 170 }} onClick={handleChooseAttachFile}>
                      Subir documento
                    </Button>
                    {attachSelectedFile ? (
                      <Typography variant="body2" color="text.secondary">
                        Documento seleccionado: {attachSelectedFile.name}
                      </Typography>
                    ) : (
                      <Typography variant="caption" sx={{ width: '100%', color: 'text.secondary' }}>
                        Solo se permiten archivos JPG, PNG o PDF.
                      </Typography>
                    )}
                    {attachSelectedFile && attachPreviewUrl ? (
                      <Box
                        sx={{
                          mt: 1,
                          p: 1,
                          border: '1px solid #dfe7ef',
                          borderRadius: 2,
                          backgroundColor: '#fafcfe',
                          width: '100%',
                          maxWidth: 560,
                        }}
                      >
                        {attachSelectedFile.type === 'application/pdf' ? (
                          <Box
                            component="iframe"
                            src={`${attachPreviewUrl}#toolbar=0&navpanes=0&pagemode=none&view=FitH`}
                            title="Vista previa del PDF"
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
                            src={attachPreviewUrl}
                            alt="Vista previa del documento"
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
                    {attachSelectedFile ? (
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
                                  alignItems: 'flex-start',
                                  gap: 1,
                                  py: 0.75,
                                  cursor: 'pointer',
                                }}
                                onClick={() => handleToggleTemplate(template.id)}
                              >
                                <Checkbox
                                  checked={selectedTemplateId === template.id}
                                  onChange={() => handleToggleTemplate(template.id)}
                                  sx={{ p: 0.25, mt: 0.15 }}
                                />
                                 <Box>
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
                                Todavía no hay plantillas configuradas para este consultorio.
                              </Typography>
                            ) : null}

                            <Button
                              variant="text"
                              size="small"
                              sx={{ mt: 1, px: 0, fontSize: '0.98rem' }}
                              onClick={() => setShowTemplateForm((current) => !current)}
                            >
                              {showTemplateForm ? 'Cancelar nueva plantilla' : 'Nueva plantilla'}
                            </Button>

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
                                  label="Título"
                                  value={newTemplateTitle}
                                  onChange={(event) => setNewTemplateTitle(event.target.value)}
                                />
                                <TextField
                                  size="small"
                                  multiline
                                  minRows={3}
                                  label="Descripción"
                                  value={newTemplateDescription}
                                  onChange={(event) => setNewTemplateDescription(event.target.value)}
                                />
                                <Button
                                  variant="outlined"
                                  sx={{ width: 'fit-content' }}
                                  onClick={() => void handleCreateTemplate()}
                                  disabled={creatingTemplate}
                                >
                                  {creatingTemplate ? 'Guardando...' : 'Guardar plantilla'}
                                </Button>
                              </Box>
                            ) : null}
                          </Box>
                        ) : null}
                      </Box>
                    ) : null}
                  </Box>
                </Box>

                <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 2 }}>
                  <Box component="span" sx={{ color: '#ffcf48', fontSize: 24, lineHeight: 1 }}>
                    &#9873;
                  </Box>
                  Etiquetas:
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ display: 'block', color: 'text.secondary', mb: 2, fontSize: '0.82rem' }}
                >
                  Selecciona un nuevo estado de la etiqueta
                </Typography>

                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
                  <Typography variant="body2" sx={{ fontWeight: 500, color: '#5b6772' }}>
                    Nueva etiqueta
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', width: { xs: '100%', md: 'auto' } }}>
                    <TextField
                      size="small"
                      placeholder="Nueva etiqueta"
                      value={newOfficeLabelName}
                      onChange={(e) => setNewOfficeLabelName(e.target.value)}
                      sx={{ minWidth: { xs: '100%', sm: 240 } }}
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
                  </Box>
                </Box>

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
                    Aún no hay estados configurados para las etiquetas. Los estados te permiten indicar en qué etapa se
                    encuentra cada etiqueta, por ejemplo: pendiente, en proceso o concluido.
                  </Alert>
                ) : null}

                {attachError ? (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {attachError}
                  </Alert>
                ) : null}

                {attachControl.tags.length === 0 ? (
                  <Typography color="text.secondary">
                    Este paciente no tiene etiquetas activas para editar.
                  </Typography>
                ) : (
                  <Box>
                    {attachControl.tags.map((tag, index) => {
                      const isChecked = activeTagIds.includes(tag.id);
                      const selectedStatusId = pendingStatuses[tag.id];

                      return (
                        <Box key={tag.id}>
                          {index > 0 && <Divider sx={{ my: 2 }} />}
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flexWrap: 'wrap' }}>
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
                              onClick={() => handleToggleTag(tag.id)}
                              clickable
                              sx={{
                                fontWeight: 700,
                                cursor: 'pointer',
                                boxShadow: isChecked ? '0 0 0 2px rgba(38,50,56,0.16)' : 'none',
                                color:
                                  labelStatusColorMap[tag.current_status.color_class]?.text ??
                                  labelStatusColorMap['btn-default'].text,
                                backgroundColor:
                                  labelStatusColorMap[tag.current_status.color_class]?.bg ??
                                  labelStatusColorMap['btn-default'].bg,
                              }}
                            />
                          </Box>

                          {isChecked ? (
                            <Box
                              sx={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: 1,
                                mt: 1.5,
                                ml: { xs: 0, md: 5.5 },
                              }}
                            >
                              {attachControl.statuses.map((status) => (
                                <Button
                                  key={status.id}
                                  size="small"
                                  variant="contained"
                                  onClick={() => handleSelectStatus(tag.id, status.id)}
                                  sx={getStatusButtonSx(
                                    status.color_class,
                                    selectedStatusId === status.id
                                  )}
                                >
                                  {status.code}
                                </Button>
                              ))}
                            </Box>
                          ) : null}
                        </Box>
                      );
                    })}

                  </Box>
                )}

                <Button
                  variant="contained"
                  color="success"
                  sx={{ mt: 3, minWidth: 120 }}
                  onClick={() => void handleSendStatuses()}
                  disabled={attachSaving || (activeTagIds.length === 0 && !attachSelectedFile)}
                >
                  {attachSaving ? 'Guardando...' : 'Enviar'}
                </Button>

                {attachMessage ? (
                  <Alert severity="success" sx={{ mt: 2 }}>
                    {attachMessage}
                  </Alert>
                ) : null}
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
                            startIcon={<AttachmentIcon />}
                            onClick={() => void handleOpenAttach(patient.id)}
                          >
                            Más opciones
                          </Button>
                          <Button
                            size="small"
                            variant="contained"
                            onClick={() => navigate(`/pacientes/${patient.id}`)}
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
                          startIcon={<AttachmentIcon />}
                          onClick={() => void handleOpenAttach(patient.id)}
                        >
                          Más opciones
                        </Button>
                      </TableCell>
                      <TableCell align="center">
                        <Button
                          size="small"
                          variant="contained"
                          onClick={() => navigate(`/pacientes/${patient.id}`)}
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
    </Box>
  );
}
