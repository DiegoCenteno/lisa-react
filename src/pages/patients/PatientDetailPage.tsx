import { useState, useEffect, useRef } from 'react';
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
  EventNoteOutlined as MedicalIcon,
  AttachFileOutlined as FileIcon,
  Note as NoteIcon,
  History as HistoryIcon,
  PictureAsPdfOutlined as AssessmentIcon,
  ChecklistRtlOutlined as LogbookIcon,
  LocalOfferOutlined as TagIcon,
  ContentCopy as ContentCopyIcon,
  CameraAlt as CameraAltIcon,
} from '@mui/icons-material';
import { patientService } from '../../api/patientService';
import { useAuth } from '../../hooks/useAuth';
import type { Patient, SOAPNote, PatientTagControlData, ActivityLogItem } from '../../types';
import ClinicalHistoryTab from './ClinicalHistoryTab';
import PatientDailyNoteTab from './PatientDailyNoteTab';
import PatientProfileTab from './PatientProfileTab';
import PatientFilesTab from './PatientFilesTab';
import PatientColposcopyTab from './PatientColposcopyTab';
import PatientTagsTab from './PatientTagsTab';
import PatientActivityLogTab from './PatientActivityLogTab';
import ConsultationHistoryTab from './ConsultationHistoryTab';
import PatientReportsTab from './PatientReportsTab';
import { consultationService } from '../../api/consultationService';

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
  const veryCompactPatientTabs = useMediaQuery(theme.breakpoints.down(1200));
  const iconOnlyPatientTabs = useMediaQuery(theme.breakpoints.down(1000));
  const ultraCompactPatientTabs = useMediaQuery(theme.breakpoints.down(800));
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { can } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const canCreateDailyNote = can('consultations.daily_note.create');
  const canEditConsultationHistory = can('consultations.history_edit');
  const [tab, setTab] = useState(0);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [soapNotes, setSoapNotes] = useState<SOAPNote[]>([]);
  const [patientTagControl, setPatientTagControl] = useState<PatientTagControlData | null>(null);
  const [patientActivityLogs, setPatientActivityLogs] = useState<ActivityLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [dailyNoteMessage, setDailyNoteMessage] = useState<string | null>(null);
  const [dailyNoteError, setDailyNoteError] = useState<string | null>(null);
  const [dailyNoteEditRequest, setDailyNoteEditRequest] = useState<SOAPNote | null>(null);
  const [showCompactSticky, setShowCompactSticky] = useState(false);
  const [filesRefreshKey, setFilesRefreshKey] = useState(0);
  const headerSectionRef = useRef<HTMLDivElement | null>(null);
  const cameraMenuEnabled = Boolean(patient?.detail_menu?.camera_menu_enabled) && !iconOnlyPatientTabs;
  const cameraMenuTitle = (patient?.detail_menu?.camera_menu_title?.trim() || 'Camara');

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
        reports: 8,
      };

    if (requestedTab && requestedTab in tabMap) {
      if (!patient && tabMap[requestedTab] === 4) {
        return;
      }
      if (tabMap[requestedTab] === 4 && !patient?.detail_menu?.camera_menu_enabled) {
        setTab(0);
        setSearchParams({ tab: 'general' }, { replace: true });
        return;
      }
      setTab(tabMap[requestedTab]);
    }
  }, [searchParams, patient?.detail_menu?.camera_menu_enabled, setSearchParams]);

  useEffect(() => {
    if (tab === 4 && !patient?.detail_menu?.camera_menu_enabled) {
      setTab(0);
      setSearchParams({ tab: 'general' }, { replace: true });
    }
  }, [tab, patient?.detail_menu?.camera_menu_enabled, setSearchParams]);

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
      8: 'reports',
    };

    setSearchParams({ tab: queryTabMap[nextTab] ?? 'general' }, { replace: true });
  };

  const handleOpenDailyNoteTab = () => {
    setTab(2);
    setSearchParams({ tab: 'soap' }, { replace: true });
  };

  const refreshPatientFiles = () => {
    setFilesRefreshKey((current) => current + 1);
  };

  useEffect(() => {
    const loadData = async () => {
      if (!id) return;
      const patientId = parseInt(id, 10);
      try {
        const [patientData, notesData, tagControlData, patientActivityLogsData] = await Promise.all([
          patientService.getPatient(patientId),
          patientService.getSOAPNotes(patientId),
          patientService.getPatientTagControl(patientId),
          patientService.getPatientActivityLogs(patientId),
        ]);
        setPatient(patientData);
        setSoapNotes(notesData);
        setPatientTagControl(tagControlData);
        setPatientActivityLogs(patientActivityLogsData);
      } catch (err) {
        console.error('Error cargando datos del paciente:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id]);

  useEffect(() => {
    if (!patient?.id || !patient.detail_menu?.camera_menu_enabled) {
      return;
    }

    if (tab !== 0 && tab !== 1) {
      return;
    }

    let cancelled = false;

    void consultationService
      .setActiveColposcopyPatient(patient.id)
      .catch((err) => {
        if (!cancelled) {
          console.error('Error actualizando paciente activo de camara:', err);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [patient?.id, patient?.detail_menu?.camera_menu_enabled, tab]);

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
      setCopyMessage('Telefono copiado');
    } catch (error) {
      console.error('Error copiando telefono:', error);
      setCopyError('No se pudo copiar el telefono');
    }
  };

  const handleDailyNoteEditRequest = (note: SOAPNote) => {
    if (!canEditConsultationHistory) {
      return;
    }

    setDailyNoteEditRequest(note);
    setTab(2);
  };

  useEffect(() => {
    const stickyTabs = new Set([1, 2, 3, 5, 8]);

    if (!stickyTabs.has(tab)) {
      setShowCompactSticky(false);
      return;
    }

    const evaluateStickyVisibility = () => {
      const headerElement = headerSectionRef.current;
      if (!headerElement) {
        setShowCompactSticky(false);
        return;
      }

      const rect = headerElement.getBoundingClientRect();
      const stickyTop = window.innerWidth < theme.breakpoints.values.md ? 64 : 72;
      setShowCompactSticky(rect.bottom <= stickyTop + 12);
    };

    evaluateStickyVisibility();
    window.addEventListener('scroll', evaluateStickyVisibility, { passive: true });
    window.addEventListener('resize', evaluateStickyVisibility);

    return () => {
      window.removeEventListener('scroll', evaluateStickyVisibility);
      window.removeEventListener('resize', evaluateStickyVisibility);
    };
  }, [tab, theme.breakpoints.values.md]);


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
        <Box
          sx={{
            position: 'fixed',
            top: { xs: 64, md: 72 },
            left: '50%',
            transform: showCompactSticky
              ? 'translateX(-50%) translateY(0)'
              : 'translateX(-50%) translateY(-8px)',
            opacity: showCompactSticky ? 1 : 0,
            visibility: showCompactSticky ? 'visible' : 'hidden',
            transition: 'opacity 160ms ease, transform 160ms ease, visibility 160ms ease',
            zIndex: theme.zIndex.appBar - 1,
            width: 'min(720px, calc(100vw - 32px))',
            pointerEvents: 'none',
            willChange: 'opacity, transform',
          }}
        >
        <Box
          sx={{
            backgroundColor: 'rgba(75, 208, 72, 0.96)',
            color: '#14351a',
            borderRadius: 1.5,
            px: { xs: 1.5, md: 2 },
            py: 1,
            boxShadow: '0 6px 16px rgba(20, 96, 120, 0.10)',
            backdropFilter: 'blur(6px)',
          }}
        >
          <Typography
            variant="h6"
            sx={{
              fontSize: { xs: '1rem', md: '1.1rem' },
              lineHeight: 1.2,
              fontWeight: 500,
            }}
          >
            Paciente: {patient.name} {patient.last_name}
            {patient.age ? ` - ${patient.age} años` : ''}
          </Typography>
        </Box>
        </Box>

      <Box
        ref={headerSectionRef}
        sx={{
          mb: 2,
        }}
      >
      <Box
        sx={{
          backgroundColor: 'rgba(255,255,255,0.96)',
          backdropFilter: 'blur(10px)',
          borderRadius: 2,
          border: '1px solid rgba(210, 227, 233, 0.95)',
          boxShadow: '0 8px 22px rgba(20, 96, 120, 0.08)',
          px: { xs: 1.5, md: 2 },
          pt: 1.5,
        }}
      >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, mb: 2, flexWrap: 'wrap' }}>
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
          borderBottom: 1,
          borderColor: 'divider',
          '& .MuiTabs-flexContainer': {
            alignItems: 'center',
            gap: ultraCompactPatientTabs ? 0.25 : 0,
          },
          '& .MuiTab-root:nth-of-type(6)': {
            display: 'none',
          },
          '& .MuiTab-root': {
            minWidth: ultraCompactPatientTabs ? 44 : undefined,
            px: ultraCompactPatientTabs ? 0.5 : undefined,
          },
        }}
      >
        <Tab value={0} icon={<PersonIcon />} label={compactPatientTabs ? '' : 'Perfil'} iconPosition="start" />
        <Tab value={1} icon={<MedicalIcon />} label={iconOnlyPatientTabs ? '' : veryCompactPatientTabs ? 'HC' : compactPatientTabs ? 'H. Clínica' : 'Historia clínica'} iconPosition="start" />
        <Tab value={8} icon={<AssessmentIcon />} label={iconOnlyPatientTabs ? '' : veryCompactPatientTabs ? 'REPO' : 'Reportes'} iconPosition="start" />
        <Tab value={3} icon={<FileIcon />} label={iconOnlyPatientTabs ? '' : veryCompactPatientTabs ? 'ARCH' : 'Archivos'} iconPosition="start" />
        {cameraMenuEnabled && (
          <Tab value={4} icon={<CameraAltIcon />} label={cameraMenuTitle} iconPosition="start" />
        )}
        <Tab value={5} icon={<TagIcon />} label={iconOnlyPatientTabs ? '' : 'Etiquetas'} iconPosition="start" />
        <Tab value={6} icon={<LogbookIcon />} label={iconOnlyPatientTabs ? '' : veryCompactPatientTabs ? '' : 'Bitácora'} iconPosition="start" />
        <Tab value={7} icon={<HistoryIcon />} label={iconOnlyPatientTabs ? '' : veryCompactPatientTabs ? '' : 'Histórico'} iconPosition="start" />
        <Tab value={2} icon={<NoteIcon />} label={iconOnlyPatientTabs ? '' : 'Nota Diaria'} iconPosition="start" />
      </Tabs>
      </Box>
      </Box>

      {/* Tab 0: Perfil */}
      <TabPanel value={tab} index={0}>
        <PatientProfileTab patient={patient} onPatientUpdated={setPatient} />
      </TabPanel>

      {/* Tab 1: Historia Cl\u00ednica */}
      <TabPanel value={tab} index={1}>
        <ClinicalHistoryTab patientId={patient.id} />
      </TabPanel>

      {/* Tab 2: Nota Diaria (SOAP) */}
      <TabPanel value={tab} index={2}>
        <PatientDailyNoteTab
          patient={patient}
          canCreateDailyNote={canCreateDailyNote}
          canEditConsultationHistory={canEditConsultationHistory}
          editRequestNote={dailyNoteEditRequest}
          onEditRequestHandled={() => setDailyNoteEditRequest(null)}
          onOpenColposcopy={() => {
            if (!patient?.detail_menu?.camera_menu_enabled) return;
            setTab(4);
            setSearchParams({ tab: 'colposcopy' }, { replace: true });
          }}
          onRefreshAfterSave={({ patient: nextPatient, soapNotes: nextSoapNotes }) => {
            setPatient(nextPatient);
            setSoapNotes(nextSoapNotes);
          }}
        />
      </TabPanel>

      {/* Tab 3: Archivos */}
      <TabPanel value={tab} index={3}>
        <PatientFilesTab
          patientId={patient.id}
          refreshKey={filesRefreshKey}
          cameraModuleTitle={cameraMenuTitle}
          onError={(msg) => setCopyError(msg)}
        />
      </TabPanel>

      {/* Tab 8: Reportes */}
      <TabPanel value={tab} index={8}>
        <PatientReportsTab patientId={patient.id} />
      </TabPanel>

      {/* Tab 4: Colposcop\u00eda */}
      {patient.detail_menu?.camera_menu_enabled ? (
        <TabPanel value={tab} index={4}>
          <PatientColposcopyTab
            patientId={patient.id}
            patientName={`${patient.name} ${patient.last_name}`.trim()}
            moduleTitle={cameraMenuTitle}
            onCaptureSaved={refreshPatientFiles}
          />
        </TabPanel>
      ) : null}

      {/* Tab 5: Etiquetas */}
      <TabPanel value={tab} index={5}>
        <PatientTagsTab patientId={patient.id} patientTagControl={patientTagControl} />
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

