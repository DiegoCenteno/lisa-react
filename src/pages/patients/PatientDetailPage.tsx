import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Avatar,
  Button,
  Skeleton,
  IconButton,
  Alert,
  Snackbar,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Person as PersonIcon,
  MedicalServices as MedicalIcon,
  Description as FileIcon,
  Note as NoteIcon,
  History as HistoryIcon,
  ArticleOutlined as LogbookIcon,
  LocalOfferOutlined as TagIcon,
  ContentCopy as ContentCopyIcon,
  CameraAlt as CameraAltIcon,
} from '@mui/icons-material';
import { patientService } from '../../api/patientService';
import { useAuth } from '../../hooks/useAuth';
import type { Patient, ClinicalHistory, SOAPNote, PatientFile, PatientSoapContext, MedicamentHistoryItem, OfficeLabelItem, PatientTagControlData, ActivityLogItem } from '../../types';
import ClinicalHistoryTab from './ClinicalHistoryTab';
import PatientDailyNoteTab from './PatientDailyNoteTab';
import PatientProfileTab from './PatientProfileTab';
import PatientFilesTab from './PatientFilesTab';
import PatientColposcopyTab from './PatientColposcopyTab';
import PatientTagsTab from './PatientTagsTab';
import PatientActivityLogTab from './PatientActivityLogTab';
import ConsultationHistoryTab from './ConsultationHistoryTab';

interface TabPanelProps {
  children: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  if (value !== index) return null;
  return <Box sx={{ py: 2 }}>{children}</Box>;
}

export default function PatientDetailPage() {
  const theme = useTheme();
  const compactPatientTabs = useMediaQuery(theme.breakpoints.down(1400));
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { can } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const canCreateDailyNote = can('consultations.daily_note.create');
  const canEditConsultationHistory = can('consultations.history_edit');
  const [tab, setTab] = useState(0);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [clinicalHistory, setClinicalHistory] = useState<ClinicalHistory | null>(null);
  const [soapNotes, setSoapNotes] = useState<SOAPNote[]>([]);
  const [soapContext, setSoapContext] = useState<PatientSoapContext | null>(null);
  const [medicamentHistory, setMedicamentHistory] = useState<MedicamentHistoryItem[]>([]);
  const [officeLabels, setOfficeLabels] = useState<OfficeLabelItem[]>([]);
  const [patientTagControl, setPatientTagControl] = useState<PatientTagControlData | null>(null);
  const [patientActivityLogs, setPatientActivityLogs] = useState<ActivityLogItem[]>([]);
  const [files, setFiles] = useState<PatientFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [dailyNoteMessage, setDailyNoteMessage] = useState<string | null>(null);
  const [dailyNoteError, setDailyNoteError] = useState<string | null>(null);
  const [dailyNoteEditRequest, setDailyNoteEditRequest] = useState<SOAPNote | null>(null);

  useEffect(() => {
    const requestedTab = searchParams.get('tab');
    const tabMap: Record<string, number> = {
      general: 0,
      history: 1,
      soap: 2,
      files: 3,
      colposcopy: 4,
      tags: 5,
      bitacora: 6,
      historical: 7,
    };

    if (requestedTab && requestedTab in tabMap) {
      setTab(tabMap[requestedTab]);
    }
  }, [searchParams]);

  const handleTabChange = (_event: React.SyntheticEvent, nextTab: number) => {
    setTab(nextTab);

    const queryTabMap: Record<number, string> = {
      0: 'general',
      1: 'history',
      2: 'soap',
      3: 'files',
      4: 'colposcopy',
      5: 'tags',
      6: 'bitacora',
      7: 'historical',
    };

    setSearchParams({ tab: queryTabMap[nextTab] ?? 'general' }, { replace: true });
  };

  const handleOpenDailyNoteTab = () => {
    setTab(2);
    setSearchParams({ tab: 'soap' }, { replace: true });
  };

  useEffect(() => {
    const loadData = async () => {
      if (!id) return;
      const patientId = parseInt(id, 10);
      try {
        const [patientData, historyData, notesData, soapContextData, medicamentHistoryData, officeLabelsData, tagControlData, patientActivityLogsData, filesData] = await Promise.all([
          patientService.getPatient(patientId),
          patientService.getClinicalHistory(patientId),
          patientService.getSOAPNotes(patientId),
          patientService.getPatientSoapContext(patientId),
          patientService.getMedicamentHistory(),
          patientService.getOfficeLabels(),
          patientService.getPatientTagControl(patientId),
          patientService.getPatientActivityLogs(patientId),
          patientService.getFiles(patientId),
        ]);
        setPatient(patientData);
        setClinicalHistory(historyData);
        setSoapNotes(notesData);
        setSoapContext(soapContextData);
        setMedicamentHistory(medicamentHistoryData);
        setOfficeLabels(officeLabelsData);
        setPatientTagControl(tagControlData);
        setPatientActivityLogs(patientActivityLogsData);
        setFiles(
          [...filesData].sort(
            (a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime()
          )
        );
      } catch (err) {
        console.error('Error cargando datos del paciente:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id]);

  const formatPhoneNumber = (phone?: string) => {
    const digits = String(phone ?? '').replace(/\D/g, '');
    if (digits.length === 10) {
      return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
    }
    return phone ?? '';
  };

  const handleCopyPhone = async () => {
    if (!patient?.phone) return;
    try {
      await navigator.clipboard.writeText(patient.phone);
      setCopyMessage('Tel\u00e9fono copiado');
    } catch (error) {
      console.error('Error copiando tel\u00e9fono:', error);
      setCopyError('No se pudo copiar el tel\u00e9fono');
    }
  };

  const handleDailyNoteEditRequest = (note: SOAPNote) => {
    if (!canEditConsultationHistory) {
      return;
    }

    setDailyNoteEditRequest(note);
    setTab(2);
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
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 0 }}>
          <Avatar sx={{ bgcolor: 'primary.main', width: 48, height: 48, fontSize: 18 }}>
            {patient.name[0]}
            {patient.last_name[0]}
          </Avatar>
          <Box>
            <Typography variant="h5">
              {patient.name} {patient.last_name}
              {patient.age ? ` (${patient.age} años)` : ""}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', color: 'text.secondary' }}>
              <Typography variant="body2" color="inherit">
                {formatPhoneNumber(patient.phone) || 'Sin tel\u00e9fono'}
              </Typography>
              {patient.phone && (
                <IconButton size="small" onClick={handleCopyPhone} sx={{ color: 'primary.main', p: 0.5 }}>
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              )}
              <Typography variant="body2" color="inherit">
                {patient.is_first_time
                  ? 'Primera vez'
                  : `Subsecuente (${patient.effective_consultations_count ?? 0} citas previas)`}
              </Typography>
            </Box>
          </Box>
        </Box>
        <Button
          variant="contained"
          startIcon={<NoteIcon />}
          onClick={handleOpenDailyNoteTab}
          sx={{
            alignSelf: { xs: 'stretch', sm: 'flex-start' },
            ml: { xs: 0, sm: 'auto' },
            backgroundColor: '#1e88e5',
            '&:hover': {
              backgroundColor: '#1565c0',
            },
          }}
        >
          Nota diaria
        </Button>
      </Box>

      <Tabs
        value={tab}
        onChange={handleTabChange}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          mb: 1,
          borderBottom: 1,
          borderColor: 'divider',
          '& .MuiTabs-flexContainer': {
            alignItems: 'center',
          },
          '& .MuiTab-root:nth-of-type(6)': {
            display: 'none',
          },
        }}
      >
        <Tab value={0} icon={<PersonIcon />} label={compactPatientTabs ? '' : 'Perfil'} iconPosition="start" />
        <Tab value={1} icon={<MedicalIcon />} label={'Historia cl\u00ednica'} iconPosition="start" />
        <Tab value={3} icon={<FileIcon />} label="Archivos" iconPosition="start" />
        <Tab value={4} icon={<CameraAltIcon />} label="Colposcopia" iconPosition="start" />
        <Tab value={5} icon={<TagIcon />} label="Etiquetas" iconPosition="start" />
        <Tab value={6} icon={<LogbookIcon />} label="Bit\u00e1cora" iconPosition="start" />
        <Tab value={7} icon={<HistoryIcon />} label={'Hist\u00f3rico'} iconPosition="start" />
        <Tab value={2} icon={<NoteIcon />} label="Nota Diaria" iconPosition="start" />
      </Tabs>

      {/* Tab 0: Perfil */}
      <TabPanel value={tab} index={0}>
        <PatientProfileTab patient={patient} onPatientUpdated={setPatient} />
      </TabPanel>

      {/* Tab 1: Historia Cl\u00ednica */}
      <TabPanel value={tab} index={1}>
        <ClinicalHistoryTab patientId={patient.id} onHistoryLoaded={setClinicalHistory} />
      </TabPanel>

      {/* Tab 2: Nota Diaria (SOAP) */}
      <Box sx={{ display: tab === 2 ? 'block' : 'none', py: 2 }}>
        {patient && (
          <PatientDailyNoteTab
            patient={patient}
            clinicalHistory={clinicalHistory}
            soapContext={soapContext}
            medicamentHistory={medicamentHistory}
            officeLabels={officeLabels}
            patientTagControl={patientTagControl}
            canCreateDailyNote={canCreateDailyNote}
            canEditConsultationHistory={canEditConsultationHistory}
            editRequestNote={dailyNoteEditRequest}
            onEditRequestHandled={() => setDailyNoteEditRequest(null)}
            onRefreshAfterSave={({ patient: nextPatient, clinicalHistory: nextHistory, soapContext: nextSoapContext, soapNotes: nextSoapNotes }) => {
              setPatient(nextPatient);
              setClinicalHistory(nextHistory);
              setSoapContext(nextSoapContext);
              setSoapNotes(nextSoapNotes);
            }}
          />
        )}
      </Box>

      {/* Tab 3: Archivos */}
      <TabPanel value={tab} index={3}>
        <PatientFilesTab files={files} onError={(msg) => setCopyError(msg)} />
      </TabPanel>

      {/* Tab 4: Colposcop\u00eda */}
      <TabPanel value={tab} index={4}>
        <PatientColposcopyTab patientId={patient.id} />
      </TabPanel>

      {/* Tab 5: Etiquetas */}
      <TabPanel value={tab} index={5}>
        <PatientTagsTab patientTagControl={patientTagControl} />
      </TabPanel>

      {/* Tab 6: Bit\u00e1cora */}
      <TabPanel value={tab} index={6}>
        <PatientActivityLogTab
          patientActivityLogs={patientActivityLogs}
          onNavigateToHistorical={() => {
            setTab(7);
            setSearchParams({ tab: 'historical' }, { replace: true });
          }}
        />
      </TabPanel>

      {/* Tab 7: Hist\u00f3rico */}
      <TabPanel value={tab} index={7}>
        <ConsultationHistoryTab
          soapNotes={soapNotes}
          canEditConsultationHistory={canEditConsultationHistory}
          onNavigateToBitacora={() => {
            setTab(6);
            setSearchParams({ tab: 'bitacora' }, { replace: true });
          }}
          onEditNote={handleDailyNoteEditRequest}
        />
      </TabPanel>

      <Snackbar
        open={Boolean(copyMessage)}
        autoHideDuration={3000}
        onClose={() => setCopyMessage(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={() => setCopyMessage(null)} severity="success" sx={{ width: '100%' }}>
          {copyMessage}
        </Alert>
      </Snackbar>

      <Snackbar
        open={Boolean(copyError)}
        autoHideDuration={3000}
        onClose={() => setCopyError(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={() => setCopyError(null)} severity="error" sx={{ width: '100%' }}>
          {copyError}
        </Alert>
      </Snackbar>

      <Snackbar
        open={Boolean(dailyNoteMessage)}
        autoHideDuration={3000}
        onClose={() => setDailyNoteMessage(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={() => setDailyNoteMessage(null)} severity="success" sx={{ width: '100%' }}>
          {dailyNoteMessage}
        </Alert>
      </Snackbar>

      <Snackbar
        open={Boolean(dailyNoteError)}
        autoHideDuration={3000}
        onClose={() => setDailyNoteError(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={() => setDailyNoteError(null)} severity="error" sx={{ width: '100%' }}>
          {dailyNoteError}
        </Alert>
      </Snackbar>
    </Box>
  );
}
