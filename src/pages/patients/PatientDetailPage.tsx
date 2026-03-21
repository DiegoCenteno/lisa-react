import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Tabs,
  Tab,
  Grid,
  Avatar,
  Chip,
  Button,
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Skeleton,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Person as PersonIcon,
  MedicalServices as MedicalIcon,
  Description as FileIcon,
  Note as NoteIcon,
  History as HistoryIcon,
  PictureAsPdf as PdfIcon,
  Image as ImageIcon,
  InsertDriveFile as DocIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { patientService } from '../../api/patientService';
import type { Patient, ClinicalHistory, SOAPNote, PatientFile } from '../../types';
import { formatDisplayDate, formatDisplayDateTime } from '../../utils/date';

interface TabPanelProps {
  children: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  if (value !== index) return null;
  return <Box sx={{ py: 2 }}>{children}</Box>;
}

function InfoRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <Box sx={{ mb: 1.5 }}>
      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
        {label}
      </Typography>
      <Typography variant="body2">{value}</Typography>
    </Box>
  );
}

function SectionCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          {icon}
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            {title}
          </Typography>
        </Box>
        {children}
      </CardContent>
    </Card>
  );
}

const fileIcons: Record<string, React.ReactNode> = {
  'application/pdf': <PdfIcon sx={{ color: '#E53935' }} />,
  'image/jpeg': <ImageIcon sx={{ color: '#43A047' }} />,
  'image/png': <ImageIcon sx={{ color: '#43A047' }} />,
};

const statusColors: Record<string, string> = {
  'Enviada al patólogo': '#1565C0',
  'Pendiente revisión por el médico': '#FB8C00',
  'Enviada al paciente': '#43A047',
};

export default function PatientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [clinicalHistory, setClinicalHistory] = useState<ClinicalHistory | null>(null);
  const [soapNotes, setSoapNotes] = useState<SOAPNote[]>([]);
  const [files, setFiles] = useState<PatientFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [newNote, setNewNote] = useState({
    subjective: '',
    objective: '',
    assessment: '',
    plan: '',
    private_comments: '',
  });

  useEffect(() => {
    const loadData = async () => {
      if (!id) return;
      const patientId = parseInt(id, 10);
      try {
        const [patientData, historyData, notesData, filesData] = await Promise.all([
          patientService.getPatient(patientId),
          patientService.getClinicalHistory(patientId),
          patientService.getSOAPNotes(patientId),
          patientService.getFiles(patientId),
        ]);
        setPatient(patientData);
        setClinicalHistory(historyData);
        setSoapNotes(notesData);
        setFiles(filesData);
      } catch (err) {
        console.error('Error cargando datos del paciente:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id]);

  const handleCreateNote = async () => {
    if (!id) return;
    try {
      const note = await patientService.createSOAPNote(parseInt(id, 10), {
        ...newNote,
        labels: [],
      });
      setSoapNotes([note, ...soapNotes]);
      setNoteDialogOpen(false);
      setNewNote({ subjective: '', objective: '', assessment: '', plan: '', private_comments: '' });
    } catch (err) {
      console.error('Error creando nota:', err);
    }
  };

  if (loading) {
    return (
      <Box>
        <Skeleton height={60} />
        <Skeleton height={200} sx={{ mt: 2 }} />
        <Skeleton height={200} sx={{ mt: 2 }} />
      </Box>
    );
  }

  if (!patient) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography>Paciente no encontrado</Typography>
        <Button onClick={() => navigate('/pacientes')} sx={{ mt: 2 }}>
          Volver a Pacientes
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <IconButton onClick={() => navigate('/pacientes')}>
          <BackIcon />
        </IconButton>
        <Avatar sx={{ bgcolor: 'primary.main', width: 48, height: 48, fontSize: 18 }}>
          {patient.name[0]}
          {patient.last_name[0]}
        </Avatar>
        <Box>
          <Typography variant="h5">
            {patient.name} {patient.last_name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {patient.phone} | {patient.email} | {patient.blood_type}
          </Typography>
        </Box>
      </Box>

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ mb: 1, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab icon={<PersonIcon />} label="Datos Generales" iconPosition="start" />
        <Tab icon={<MedicalIcon />} label="Historia Clínica" iconPosition="start" />
        <Tab icon={<NoteIcon />} label="Nota Diaria" iconPosition="start" />
        <Tab icon={<FileIcon />} label="Archivos" iconPosition="start" />
        <Tab icon={<HistoryIcon />} label="Histórico" iconPosition="start" />
      </Tabs>

      {/* Tab 0: Datos Generales */}
      <TabPanel value={tab} index={0}>
        <Card>
          <CardContent>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <InfoRow label="Nombre" value={`${patient.name} ${patient.last_name}`} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <InfoRow label="Teléfono" value={patient.phone} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <InfoRow label="Email" value={patient.email} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <InfoRow
                  label="Fecha de Nacimiento"
                  value={
                    patient.birth_date
                      ? `${formatDisplayDate(patient.birth_date)}${patient.age ? ` (${patient.age} años)` : ''}`
                      : undefined
                  }
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <InfoRow label="Género" value={patient.gender} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <InfoRow label="Tipo de Sangre" value={patient.blood_type} />
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </TabPanel>

      {/* Tab 1: Historia Clínica */}
      <TabPanel value={tab} index={1}>
        {clinicalHistory && (
          <>
            <SectionCard title="Antecedentes Heredofamiliares" icon={<MedicalIcon color="primary" />}>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <InfoRow label="Grupo Sanguíneo y RH" value={clinicalHistory.hereditary_background.blood_type_rh} />
                  <InfoRow label="A. genéticos y/o defectos" value={clinicalHistory.hereditary_background.genetic_defects} />
                  <InfoRow label="A. familiar de preeclampsia" value={clinicalHistory.hereditary_background.family_preeclampsia} />
                  <InfoRow label="Diabetes mellitus" value={clinicalHistory.hereditary_background.diabetes} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <InfoRow label="Cáncer" value={clinicalHistory.hereditary_background.cancer} />
                  <InfoRow label="Hipertensión" value={clinicalHistory.hereditary_background.hypertension} />
                  <InfoRow label="Enfermedad reumática" value={clinicalHistory.hereditary_background.rheumatic_disease} />
                  <InfoRow label="Otras" value={clinicalHistory.hereditary_background.others} />
                </Grid>
              </Grid>
            </SectionCard>

            <SectionCard title="Antecedentes Personales NO Patológicos" icon={<PersonIcon color="primary" />}>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <InfoRow label="Originaria" value={clinicalHistory.personal_non_pathological.origin} />
                  <InfoRow label="Residente" value={clinicalHistory.personal_non_pathological.residence} />
                  <InfoRow label="Estado civil" value={clinicalHistory.personal_non_pathological.civil_status} />
                  <InfoRow label="Escolaridad" value={clinicalHistory.personal_non_pathological.education} />
                  <InfoRow label="Ocupación" value={clinicalHistory.personal_non_pathological.occupation} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <InfoRow label="Toxicomanías" value={clinicalHistory.personal_non_pathological.substance_use} />
                  <InfoRow label="Fármacos" value={clinicalHistory.personal_non_pathological.medications} />
                  <InfoRow label="Tabaquismo" value={clinicalHistory.personal_non_pathological.smoking} />
                  <InfoRow label="Bebidas alcohólicas" value={clinicalHistory.personal_non_pathological.alcohol} />
                  <InfoRow label="Otras" value={clinicalHistory.personal_non_pathological.others} />
                </Grid>
              </Grid>
            </SectionCard>

            <SectionCard title="Antecedentes Personales Patológicos" icon={<MedicalIcon color="error" />}>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <InfoRow label="Alergias" value={clinicalHistory.personal_pathological.allergies} />
                  <InfoRow label="Enfermedades crónico degenerativas" value={clinicalHistory.personal_pathological.chronic_diseases} />
                  <InfoRow label="Cirugías" value={clinicalHistory.personal_pathological.surgeries} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <InfoRow label="Transfusiones" value={clinicalHistory.personal_pathological.transfusions} />
                  <InfoRow label="Fracturas" value={clinicalHistory.personal_pathological.fractures} />
                  <InfoRow label="Otras" value={clinicalHistory.personal_pathological.others} />
                </Grid>
              </Grid>
            </SectionCard>

            {clinicalHistory.gynecological && (
              <SectionCard title="Antecedentes Ginecológicos" icon={<MedicalIcon color="secondary" />}>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <InfoRow label="Menarca" value={clinicalHistory.gynecological.menarche} />
                    <InfoRow label="Ciclos menstruales" value={clinicalHistory.gynecological.menstrual_cycles} />
                    <InfoRow label="Fecha de última menstruación" value={clinicalHistory.gynecological.last_menstruation_date} />
                    <InfoRow label="IVSA" value={clinicalHistory.gynecological.ivsa} />
                    <InfoRow label="Parejas sexuales" value={clinicalHistory.gynecological.sexual_partners} />
                    <InfoRow label="ETS" value={clinicalHistory.gynecological.std} />
                    <InfoRow label="Citología" value={clinicalHistory.gynecological.cytology} />
                    <InfoRow label="Método de planificación familiar" value={clinicalHistory.gynecological.family_planning} />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <InfoRow label="Gestaciones" value={clinicalHistory.gynecological.gestations} />
                    <InfoRow label="Fecha de última gestación" value={clinicalHistory.gynecological.last_gestation_date} />
                    <InfoRow label="Partos" value={clinicalHistory.gynecological.deliveries} />
                    <InfoRow label="Cesáreas" value={clinicalHistory.gynecological.cesareans} />
                    <InfoRow label="Abortos" value={clinicalHistory.gynecological.abortions} />
                    <InfoRow label="Ectópico" value={clinicalHistory.gynecological.ectopic} />
                    <InfoRow label="Molar" value={clinicalHistory.gynecological.molar} />
                    <InfoRow label="Edad en la que dejó de reglar" value={clinicalHistory.gynecological.menopause_age} />
                    <InfoRow label="Síntomas de climaterio" value={clinicalHistory.gynecological.climacteric_symptoms} />
                    <InfoRow label="Control prenatal" value={clinicalHistory.gynecological.prenatal_care} />
                  </Grid>
                </Grid>
              </SectionCard>
            )}
          </>
        )}
      </TabPanel>

      {/* Tab 2: Nota Diaria (SOAP) */}
      <TabPanel value={tab} index={2}>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setNoteDialogOpen(true)}>
            Nueva Nota
          </Button>
        </Box>
        {soapNotes.length === 0 ? (
          <Card>
            <CardContent>
              <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                No hay notas registradas para este paciente
              </Typography>
            </CardContent>
          </Card>
        ) : (
          soapNotes.map((note) => (
            <Card key={note.id} sx={{ mb: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    {formatDisplayDateTime(note.created_at)}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {note.labels.map((label) => (
                      <Chip
                        key={label.id}
                        label={`${label.name}: ${label.status}`}
                        size="small"
                        sx={{
                          bgcolor: statusColors[label.status] ?? '#757575',
                          color: 'white',
                        }}
                      />
                    ))}
                  </Box>
                </Box>
                <Divider sx={{ mb: 2 }} />
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="caption" sx={{ fontWeight: 600, color: 'primary.main' }}>
                      S - Subjetivo
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 2 }}>
                      {note.subjective}
                    </Typography>
                    <Typography variant="caption" sx={{ fontWeight: 600, color: 'primary.main' }}>
                      O - Objetivo
                    </Typography>
                    <Typography variant="body2">{note.objective}</Typography>
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="caption" sx={{ fontWeight: 600, color: 'primary.main' }}>
                      A - Evaluación
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 2 }}>
                      {note.assessment}
                    </Typography>
                    <Typography variant="caption" sx={{ fontWeight: 600, color: 'primary.main' }}>
                      P - Plan
                    </Typography>
                    <Typography variant="body2">{note.plan}</Typography>
                  </Grid>
                </Grid>
                {note.private_comments && (
                  <Box
                    sx={{
                      mt: 2,
                      p: 1.5,
                      bgcolor: '#FFF3E0',
                      borderRadius: 1,
                      borderLeft: '3px solid #FB8C00',
                    }}
                  >
                    <Typography variant="caption" sx={{ fontWeight: 600, color: '#E65100' }}>
                      Comentarios Privados (solo médico)
                    </Typography>
                    <Typography variant="body2">{note.private_comments}</Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          ))
        )}

        <Dialog open={noteDialogOpen} onClose={() => setNoteDialogOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>Nueva Nota SOAP</DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="S - Subjetivo"
                multiline
                rows={3}
                fullWidth
                value={newNote.subjective}
                onChange={(e) => setNewNote({ ...newNote, subjective: e.target.value })}
                placeholder="Lo que el paciente refiere..."
              />
              <TextField
                label="O - Objetivo"
                multiline
                rows={3}
                fullWidth
                value={newNote.objective}
                onChange={(e) => setNewNote({ ...newNote, objective: e.target.value })}
                placeholder="Hallazgos de la exploración física..."
              />
              <TextField
                label="A - Evaluación"
                multiline
                rows={2}
                fullWidth
                value={newNote.assessment}
                onChange={(e) => setNewNote({ ...newNote, assessment: e.target.value })}
                placeholder="Diagnóstico o impresión clínica..."
              />
              <TextField
                label="P - Plan"
                multiline
                rows={2}
                fullWidth
                value={newNote.plan}
                onChange={(e) => setNewNote({ ...newNote, plan: e.target.value })}
                placeholder="Plan de tratamiento..."
              />
              <TextField
                label="Comentarios Privados (solo visibles para el médico)"
                multiline
                rows={2}
                fullWidth
                value={newNote.private_comments}
                onChange={(e) => setNewNote({ ...newNote, private_comments: e.target.value })}
                placeholder="Notas personales..."
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setNoteDialogOpen(false)}>Cancelar</Button>
            <Button variant="contained" onClick={handleCreateNote}>
              Guardar Nota
            </Button>
          </DialogActions>
        </Dialog>
      </TabPanel>

      {/* Tab 3: Archivos */}
      <TabPanel value={tab} index={3}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6">Archivos del Paciente</Typography>
              <Button variant="outlined" startIcon={<AddIcon />} size="small">
                Subir Archivo
              </Button>
            </Box>
            {files.length === 0 ? (
              <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                No hay archivos almacenados
              </Typography>
            ) : (
              <List>
                {files.map((file) => (
                  <ListItem key={file.id} divider>
                    <ListItemIcon>
                      {fileIcons[file.type] ?? <DocIcon sx={{ color: '#1565C0' }} />}
                    </ListItemIcon>
                    <ListItemText
                      primary={file.name}
                      secondary={`${(file.size / 1024).toFixed(0)} KB | Subido: ${formatDisplayDate(file.uploaded_at)}`}
                    />
                    <Button size="small">Descargar</Button>
                  </ListItem>
                ))}
              </List>
            )}
          </CardContent>
        </Card>
      </TabPanel>

      {/* Tab 4: Histórico de Consultas */}
      <TabPanel value={tab} index={4}>
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Histórico de Consultas
            </Typography>
            {soapNotes.length === 0 ? (
              <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                No hay consultas registradas
              </Typography>
            ) : (
              <List>
                {soapNotes.map((note) => (
                  <ListItem key={note.id} divider>
                    <ListItemIcon>
                      <HistoryIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary={`Consulta - ${formatDisplayDate(note.created_at)}`}
                      secondary={`Diagnóstico: ${note.assessment} | Plan: ${note.plan}`}
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </CardContent>
        </Card>
      </TabPanel>
    </Box>
  );
}
