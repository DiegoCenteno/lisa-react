import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogContent,
  FormControlLabel,
  Link,
  MenuItem,
  Paper,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import Lightbox from 'yet-another-react-lightbox';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';
import 'yet-another-react-lightbox/styles.css';
import {
  consultationService,
  type BasicObstetricReportPayload,
  type ColposcopyReportBuilderData,
  type FetalVitalityReportPayload,
  type GeneticReportPayload,
  type NuchalTranslucencyReportPayload,
  type PatientPdfTemplateSummary,
  type PatientReportItem,
  type PatientReportRecord,
  type PatientReportsData,
} from '../../api/consultationService';
import { patientService } from '../../api/patientService';
import PatientBasicObstetricReportBuilder from './PatientBasicObstetricReportBuilder';
import PatientFetalVitalityReportBuilder from './PatientFetalVitalityReportBuilder';
import PatientFetalWellbeingReportBuilder from './PatientFetalWellbeingReportBuilder';
import PatientGeneticReportBuilder from './PatientGeneticReportBuilder';
import PatientNuchalTranslucencyReportBuilder from './PatientNuchalTranslucencyReportBuilder';
import PatientPdfTemplateReportBuilder from './PatientPdfTemplateReportBuilder';
import PatientStructuralReportBuilder from './PatientStructuralReportBuilder';

interface PatientReportsTabProps {
  patientId: number;
  initialPdfTemplateId?: number | null;
  initialStudyDeliveryId?: number | null;
  onInitialPdfTemplateHandled?: () => void;
}

function PatientReportsTab({
  patientId,
  initialPdfTemplateId = null,
  initialStudyDeliveryId = null,
  onInitialPdfTemplateHandled,
}: PatientReportsTabProps) {
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [builderLoading, setBuilderLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedReportKey, setSelectedReportKey] = useState('');
  const [selectedPdfTemplateId, setSelectedPdfTemplateId] = useState('');
  const [reportsData, setReportsData] = useState<PatientReportsData | null>(null);
  const [activeColposcopyReportId, setActiveColposcopyReportId] = useState<number | null>(null);
  const [activeBasicObstetricReportId, setActiveBasicObstetricReportId] = useState<number | null>(null);
  const [activeNuchalTranslucencyReportId, setActiveNuchalTranslucencyReportId] = useState<number | null>(null);
  const [activeGeneticReportId, setActiveGeneticReportId] = useState<number | null>(null);
  const [activeStructuralReportId, setActiveStructuralReportId] = useState<number | null>(null);
  const [activeWellbeingReportId, setActiveWellbeingReportId] = useState<number | null>(null);
  const [activeVitalityReportId, setActiveVitalityReportId] = useState<number | null>(null);
  const [activePdfTemplateId, setActivePdfTemplateId] = useState<number | null>(null);
  const [activePdfTemplateStudyDeliveryId, setActivePdfTemplateStudyDeliveryId] = useState<number | null>(null);
  const [reportBuilderStartInEditMode, setReportBuilderStartInEditMode] = useState(true);
  const [colposcopyBuilder, setColposcopyBuilder] = useState<ColposcopyReportBuilderData | null>(null);
  const [selectedSessionIds, setSelectedSessionIds] = useState<number[]>([]);
  const [selectedFileIds, setSelectedFileIds] = useState<number[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<Record<number, string>>({});
  const imagePreviewUrlsRef = useRef<Record<number, string>>({});
  const [lightboxSlides, setLightboxSlides] = useState<Array<{ src: string; alt: string }>>([]);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const hasEnabledReports = (reportsData?.reports_enabled?.length ?? 0) > 0;
  const hasPdfTemplates = (reportsData?.pdf_templates_enabled?.length ?? 0) > 0;
  const canCreateReports = hasEnabledReports || hasPdfTemplates;
  const isBuildingColposcopyReport = activeColposcopyReportId !== null;
  const isBuildingBasicObstetricReport = activeBasicObstetricReportId !== null;
  const isBuildingNuchalTranslucencyReport = activeNuchalTranslucencyReportId !== null;
  const isBuildingGeneticReport = activeGeneticReportId !== null;
  const isBuildingStructuralReport = activeStructuralReportId !== null;
  const isBuildingWellbeingReport = activeWellbeingReportId !== null;
  const isBuildingVitalityReport = activeVitalityReportId !== null;
  const isBuildingPdfTemplateReport = activePdfTemplateId !== null;
  const isBuildingReport =
    isBuildingColposcopyReport || isBuildingBasicObstetricReport || isBuildingNuchalTranslucencyReport || isBuildingGeneticReport || isBuildingStructuralReport || isBuildingWellbeingReport || isBuildingVitalityReport || isBuildingPdfTemplateReport;

  useEffect(() => {
    imagePreviewUrlsRef.current = imagePreviewUrls;
  }, [imagePreviewUrls]);

  useEffect(() => {
    return () => {
      Object.values(imagePreviewUrlsRef.current).forEach((url) => {
        window.URL.revokeObjectURL(url);
      });
    };
  }, []);

  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const data = await consultationService.getPatientReports(patientId);
      setReportsData(data);
      setSelectedReportKey(
        (current) => current || data.last_report_type_key || data.reports_enabled[0]?.key || ''
      );
      setSelectedPdfTemplateId((current) => current || String(data.pdf_templates_enabled?.[0]?.id ?? ''));
    } catch (loadError) {
      console.error('Error cargando reportes del paciente:', loadError);
      setError('No se pudo cargar el modulo de reportes.');
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  const loadColposcopyBuilder = useCallback(async (reportId: number) => {
    setBuilderLoading(true);
    try {
      const data = await consultationService.getColposcopyReportBuilder(reportId);
      const lockedSessionIds = Array.from(
        new Set(
          (data.sessions ?? [])
            .flatMap((session) => session.files)
            .filter((file) => data.selected_file_ids.includes(file.id))
            .map((file) => file.capture_session_id)
            .filter((sessionId): sessionId is number => typeof sessionId === 'number')
        )
      );
      const defaultSessionIds =
        lockedSessionIds.length > 0
          ? lockedSessionIds
          : data.sessions[0]
            ? [data.sessions[0].id]
            : [];

      setActiveColposcopyReportId(reportId);
      setColposcopyBuilder(data);
      setSelectedSessionIds(defaultSessionIds);
      setSelectedFileIds(data.selected_file_ids);
      setActiveStructuralReportId(null);
      setActiveWellbeingReportId(null);
      setActiveVitalityReportId(null);
      setShowCreate(false);
    } catch (loadError) {
      console.error('Error cargando builder de colposcopia:', loadError);
      setError('No se pudo cargar el reporte de colposcopia.');
    } finally {
      setBuilderLoading(false);
    }
  }, []);

  const loadBasicObstetricBuilder = useCallback((reportId: number, startInEditMode = true) => {
    setActiveColposcopyReportId(null);
    setColposcopyBuilder(null);
    setSelectedSessionIds([]);
    setSelectedFileIds([]);
    setShowCreate(false);
    setReportBuilderStartInEditMode(startInEditMode);
    setActiveNuchalTranslucencyReportId(null);
    setActiveGeneticReportId(null);
    setActiveStructuralReportId(null);
    setActiveWellbeingReportId(null);
    setActiveVitalityReportId(null);
    setActiveBasicObstetricReportId(reportId);
  }, []);

  const loadNuchalTranslucencyBuilder = useCallback((reportId: number, startInEditMode = true) => {
    setActiveColposcopyReportId(null);
    setColposcopyBuilder(null);
    setSelectedSessionIds([]);
    setSelectedFileIds([]);
    setShowCreate(false);
    setReportBuilderStartInEditMode(startInEditMode);
    setActiveBasicObstetricReportId(null);
    setActiveGeneticReportId(null);
    setActiveStructuralReportId(null);
    setActiveWellbeingReportId(null);
    setActiveVitalityReportId(null);
    setActiveNuchalTranslucencyReportId(reportId);
  }, []);

  const loadGeneticBuilder = useCallback((reportId: number, startInEditMode = true) => {
    setActiveColposcopyReportId(null);
    setColposcopyBuilder(null);
    setSelectedSessionIds([]);
    setSelectedFileIds([]);
    setShowCreate(false);
    setReportBuilderStartInEditMode(startInEditMode);
    setActiveBasicObstetricReportId(null);
    setActiveNuchalTranslucencyReportId(null);
    setActiveStructuralReportId(null);
    setActiveWellbeingReportId(null);
    setActiveVitalityReportId(null);
    setActiveGeneticReportId(reportId);
  }, []);

  const loadStructuralBuilder = useCallback((reportId: number, startInEditMode = true) => {
    setActiveColposcopyReportId(null);
    setColposcopyBuilder(null);
    setSelectedSessionIds([]);
    setSelectedFileIds([]);
    setShowCreate(false);
    setReportBuilderStartInEditMode(startInEditMode);
    setActiveBasicObstetricReportId(null);
    setActiveNuchalTranslucencyReportId(null);
    setActiveGeneticReportId(null);
    setActiveWellbeingReportId(null);
    setActiveVitalityReportId(null);
    setActiveStructuralReportId(reportId);
  }, []);

  const loadWellbeingBuilder = useCallback((reportId: number, startInEditMode = true) => {
    setActiveColposcopyReportId(null);
    setColposcopyBuilder(null);
    setSelectedSessionIds([]);
    setSelectedFileIds([]);
    setShowCreate(false);
    setReportBuilderStartInEditMode(startInEditMode);
    setActiveBasicObstetricReportId(null);
    setActiveNuchalTranslucencyReportId(null);
    setActiveGeneticReportId(null);
    setActiveStructuralReportId(null);
    setActiveVitalityReportId(null);
    setActiveWellbeingReportId(reportId);
  }, []);

  const loadVitalityBuilder = useCallback((reportId: number, startInEditMode = true) => {
    setActiveColposcopyReportId(null);
    setColposcopyBuilder(null);
    setSelectedSessionIds([]);
    setSelectedFileIds([]);
    setShowCreate(false);
    setReportBuilderStartInEditMode(startInEditMode);
    setActiveBasicObstetricReportId(null);
    setActiveNuchalTranslucencyReportId(null);
    setActiveGeneticReportId(null);
    setActiveStructuralReportId(null);
    setActiveWellbeingReportId(null);
    setActiveVitalityReportId(reportId);
  }, []);

  const openPdfTemplateBuilder = useCallback((templateId: number, studyDeliveryId: number | null = null) => {
    setActiveColposcopyReportId(null);
    setColposcopyBuilder(null);
    setSelectedSessionIds([]);
    setSelectedFileIds([]);
    setShowCreate(false);
    setActiveBasicObstetricReportId(null);
    setActiveNuchalTranslucencyReportId(null);
    setActiveGeneticReportId(null);
    setActiveStructuralReportId(null);
    setActiveWellbeingReportId(null);
    setActiveVitalityReportId(null);
    setActivePdfTemplateStudyDeliveryId(studyDeliveryId);
    setActivePdfTemplateId(templateId);
  }, []);

  useEffect(() => {
    if (!initialPdfTemplateId || !reportsData?.pdf_templates_enabled?.length || isBuildingReport) {
      return;
    }

    const suggestedTemplateExists = reportsData.pdf_templates_enabled.some(
      (template) => template.id === initialPdfTemplateId
    );

    if (!suggestedTemplateExists) {
      onInitialPdfTemplateHandled?.();
      return;
    }

    setSelectedPdfTemplateId(String(initialPdfTemplateId));
    openPdfTemplateBuilder(initialPdfTemplateId, initialStudyDeliveryId ?? null);
    onInitialPdfTemplateHandled?.();
  }, [
    initialPdfTemplateId,
    initialStudyDeliveryId,
    isBuildingReport,
    onInitialPdfTemplateHandled,
    openPdfTemplateBuilder,
    reportsData?.pdf_templates_enabled,
  ]);

  const handleCreateReport = useCallback(async () => {
    if (!selectedReportKey) {
      setError('Selecciona primero un tipo de reporte.');
      return;
    }

    setCreating(true);
    try {
      const created = await consultationService.createPatientReport(patientId, selectedReportKey);
      await loadReports();

      if (created.next_view === 'colposcopy') {
        setActiveBasicObstetricReportId(null);
        setActiveNuchalTranslucencyReportId(null);
        setActiveGeneticReportId(null);
        await loadColposcopyBuilder(created.id);
      } else if (created.next_view === 'basic_obstetric') {
        loadBasicObstetricBuilder(created.id);
      } else if (created.next_view === 'nuchal_translucency') {
        loadNuchalTranslucencyBuilder(created.id);
      } else if (created.next_view === 'genetic') {
        loadGeneticBuilder(created.id);
      } else if (created.next_view === 'structural') {
        loadStructuralBuilder(created.id);
      } else if (created.next_view === 'wellbeing') {
        loadWellbeingBuilder(created.id);
      } else if (created.next_view === 'vitality') {
        loadVitalityBuilder(created.id);
      } else {
        setShowCreate(false);
        setMessage('Este tipo de reporte se integrara en la siguiente fase V2.');
      }
    } catch (createError) {
      console.error('Error creando reporte:', createError);
      setError('No se pudo crear el reporte.');
    } finally {
      setCreating(false);
    }
  }, [loadBasicObstetricBuilder, loadColposcopyBuilder, loadGeneticBuilder, loadNuchalTranslucencyBuilder, loadReports, loadStructuralBuilder, loadVitalityBuilder, loadWellbeingBuilder, patientId, selectedReportKey]);

  const handleOpenPdfTemplateReport = useCallback(() => {
    const parsedTemplateId = Number(selectedPdfTemplateId);
    if (!Number.isFinite(parsedTemplateId) || parsedTemplateId <= 0) {
      setError('Selecciona primero una plantilla PDF publicada.');
      return;
    }

    openPdfTemplateBuilder(parsedTemplateId, null);
  }, [openPdfTemplateBuilder, selectedPdfTemplateId]);

  const availableBuilderFiles = useMemo(
    () =>
      colposcopyBuilder
        ? colposcopyBuilder.sessions
            .filter((session) => selectedSessionIds.includes(session.id))
            .flatMap((session) => session.files)
        : [],
    [colposcopyBuilder, selectedSessionIds]
  );

  const ensurePreviewUrls = useCallback(async (files: Array<{ id: number }>) => {
    const nextPreviewUrls = { ...imagePreviewUrlsRef.current };
    const missingFiles = files.filter((file) => !nextPreviewUrls[file.id]);

    if (missingFiles.length > 0) {
      const loadedPreviews = await Promise.all(
        missingFiles.map(async (file) => ({
          fileId: file.id,
          url: window.URL.createObjectURL(await patientService.getFileBlob(file.id)),
        }))
      );

      loadedPreviews.forEach(({ fileId, url }) => {
        nextPreviewUrls[fileId] = url;
      });
      setImagePreviewUrls(nextPreviewUrls);
    }

    return nextPreviewUrls;
  }, []);

  const handlePreviewBuilderImage = useCallback(
    async (selectedFileId: number) => {
      try {
        const previewFiles = availableBuilderFiles;
        if (previewFiles.length === 0) return;
        const previewUrls = await ensurePreviewUrls(previewFiles);
        const slides = previewFiles.map((file) => ({
          src: previewUrls[file.id],
          alt: file.name,
        }));
        setLightboxSlides(slides);
        const selectedIndex = previewFiles.findIndex((file) => file.id === selectedFileId);
        setLightboxIndex(selectedIndex >= 0 ? selectedIndex : 0);
        setLightboxOpen(true);
      } catch (previewError) {
        console.error('Error abriendo preview de colposcopia:', previewError);
        setError('No se pudo abrir la vista previa de la imagen.');
      }
    },
    [availableBuilderFiles, ensurePreviewUrls]
  );

  useEffect(() => {
    if (!colposcopyBuilder) return;
    const thumbnailCandidates = [
      ...colposcopyBuilder.sessions
        .map((session) => session.files[0])
        .filter((file): file is NonNullable<typeof file> => Boolean(file)),
      ...availableBuilderFiles,
    ];
    if (thumbnailCandidates.length === 0) return;
    void ensurePreviewUrls(thumbnailCandidates);
  }, [availableBuilderFiles, colposcopyBuilder, ensurePreviewUrls]);

  const handleDownloadDocx = useCallback(async () => {
    if (!activeColposcopyReportId || !colposcopyBuilder) {
      return;
    }

    setDownloading(true);
    try {
      let currentBuilder = colposcopyBuilder;

      if (!colposcopyBuilder.is_locked) {
        if (selectedFileIds.length < 1 || selectedFileIds.length > 4) {
          setError('Selecciona entre 1 y 4 imagenes.');
          return;
        }

        currentBuilder = await consultationService.updateColposcopyReportFiles(
          activeColposcopyReportId,
          selectedFileIds
        );
        setColposcopyBuilder(currentBuilder);
        setSelectedFileIds(currentBuilder.selected_file_ids);
      }

      const blob = await consultationService.downloadPatientReportDocx(activeColposcopyReportId);
      const blobUrl = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = blobUrl;
      anchor.download = 'ReporteColposcopia.docx';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(blobUrl);

      setActiveColposcopyReportId(null);
      setColposcopyBuilder(null);
      setSelectedSessionIds([]);
      setSelectedFileIds([]);
      await loadReports();

      setMessage(
        currentBuilder.is_locked
          ? 'Reporte descargado correctamente.'
          : 'Imagenes guardadas y reporte descargado correctamente.'
      );
    } catch (downloadError) {
      console.error('Error descargando reporte:', downloadError);
      setError('No se pudo descargar el reporte.');
    } finally {
      setDownloading(false);
    }
  }, [activeColposcopyReportId, colposcopyBuilder, loadReports, selectedFileIds]);

  const handleDownloadExistingReport = useCallback(async (report: PatientReportItem) => {
    if (report.type_key !== 'tipoest9') {
      if (report.type_key !== 'pdf_template') {
        setMessage('Este tipo de reporte se integrara en la siguiente fase V2.');
        return;
      }
    }

    try {
      const blob = await consultationService.downloadPatientReportDocx(report.id);
      const blobUrl = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = blobUrl;
      anchor.download = report.type_key === 'pdf_template'
        ? `${report.type_label.replace(/[^A-Za-z0-9_-]+/g, '_') || 'reporte_pdf'}.pdf`
        : 'ReporteColposcopia.docx';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(blobUrl);
      setMessage('Reporte descargado correctamente.');
    } catch (downloadError) {
      console.error('Error descargando reporte previo:', downloadError);
      setError('No se pudo descargar el reporte.');
    }
  }, []);

  const handleOpenExistingReport = useCallback(
    async (report: PatientReportItem) => {
      if (report.source_kind === 'legacy') {
        if (!report.can_migrate) {
          setError('Este reporte legacy no se puede migrar porque no tiene datos disponibles.');
          return;
        }

        setCreating(true);
        try {
          const migrated = await consultationService.migrateLegacyUltrasoundReport(patientId, report.id);
          await loadReports();

          if (migrated.next_view === 'basic_obstetric') {
            setActiveColposcopyReportId(null);
            setColposcopyBuilder(null);
            setSelectedSessionIds([]);
            setSelectedFileIds([]);
            setActiveNuchalTranslucencyReportId(null);
            loadBasicObstetricBuilder(migrated.id, false);
            return;
          }

          if (migrated.next_view === 'nuchal_translucency') {
            setActiveColposcopyReportId(null);
            setColposcopyBuilder(null);
            setSelectedSessionIds([]);
            setSelectedFileIds([]);
            setActiveBasicObstetricReportId(null);
            loadNuchalTranslucencyBuilder(migrated.id, false);
            return;
          }

          if (migrated.next_view === 'genetic') {
            setActiveColposcopyReportId(null);
            setColposcopyBuilder(null);
            setSelectedSessionIds([]);
            setSelectedFileIds([]);
            setActiveBasicObstetricReportId(null);
            setActiveNuchalTranslucencyReportId(null);
            loadGeneticBuilder(migrated.id, false);
            return;
          }

          if (migrated.next_view === 'structural') {
            setActiveColposcopyReportId(null);
            setColposcopyBuilder(null);
            setSelectedSessionIds([]);
            setSelectedFileIds([]);
            setActiveBasicObstetricReportId(null);
            setActiveNuchalTranslucencyReportId(null);
            setActiveGeneticReportId(null);
            loadStructuralBuilder(migrated.id, false);
            return;
          }

          if (migrated.next_view === 'wellbeing') {
            setActiveColposcopyReportId(null);
            setColposcopyBuilder(null);
            setSelectedSessionIds([]);
            setSelectedFileIds([]);
            setActiveBasicObstetricReportId(null);
            setActiveNuchalTranslucencyReportId(null);
            setActiveGeneticReportId(null);
            setActiveStructuralReportId(null);
            loadWellbeingBuilder(migrated.id, false);
            return;
          }

          if (migrated.next_view === 'vitality') {
            setActiveColposcopyReportId(null);
            setColposcopyBuilder(null);
            setSelectedSessionIds([]);
            setSelectedFileIds([]);
            setActiveBasicObstetricReportId(null);
            setActiveNuchalTranslucencyReportId(null);
            setActiveGeneticReportId(null);
            setActiveStructuralReportId(null);
            setActiveWellbeingReportId(null);
            loadVitalityBuilder(migrated.id, false);
            return;
          }

          setMessage('El reporte se migro correctamente.');
          return;
        } catch (migrationError) {
          console.error('Error migrando ultrasonido legacy:', migrationError);
          setError('No se pudo migrar el ultrasonido legacy.');
          return;
        } finally {
          setCreating(false);
        }
      }

      if (report.type_key === 'tipoest1') {
        setActiveColposcopyReportId(null);
        setColposcopyBuilder(null);
        setSelectedSessionIds([]);
        setSelectedFileIds([]);
        setActiveNuchalTranslucencyReportId(null);
        loadBasicObstetricBuilder(report.id, false);
        return;
      }

      if (report.type_key === 'tipoest2') {
        setActiveColposcopyReportId(null);
        setColposcopyBuilder(null);
        setSelectedSessionIds([]);
        setSelectedFileIds([]);
        setActiveBasicObstetricReportId(null);
        loadNuchalTranslucencyBuilder(report.id, false);
        return;
      }

      if (report.type_key === 'tipoest3') {
        setActiveColposcopyReportId(null);
        setColposcopyBuilder(null);
        setSelectedSessionIds([]);
        setSelectedFileIds([]);
        setActiveBasicObstetricReportId(null);
        setActiveNuchalTranslucencyReportId(null);
        loadGeneticBuilder(report.id, false);
        return;
      }

      if (report.type_key === 'tipoest4') {
        setActiveColposcopyReportId(null);
        setColposcopyBuilder(null);
        setSelectedSessionIds([]);
        setSelectedFileIds([]);
        setActiveBasicObstetricReportId(null);
        setActiveNuchalTranslucencyReportId(null);
        setActiveGeneticReportId(null);
        loadStructuralBuilder(report.id, false);
        return;
      }

      if (report.type_key === 'tipoest5') {
        setActiveColposcopyReportId(null);
        setColposcopyBuilder(null);
        setSelectedSessionIds([]);
        setSelectedFileIds([]);
        setActiveBasicObstetricReportId(null);
        setActiveNuchalTranslucencyReportId(null);
        setActiveGeneticReportId(null);
        setActiveStructuralReportId(null);
        loadWellbeingBuilder(report.id, false);
        return;
      }

      if (report.type_key === 'tipoest7') {
        setActiveColposcopyReportId(null);
        setColposcopyBuilder(null);
        setSelectedSessionIds([]);
        setSelectedFileIds([]);
        setActiveBasicObstetricReportId(null);
        setActiveNuchalTranslucencyReportId(null);
        setActiveGeneticReportId(null);
        setActiveStructuralReportId(null);
        setActiveWellbeingReportId(null);
        loadVitalityBuilder(report.id, false);
        return;
      }

      if (report.type_key === 'tipoest9' || report.type_key === 'pdf_template') {
        await handleDownloadExistingReport(report);
        return;
      }

      setMessage('Este tipo de reporte se integrara en la siguiente fase V2.');
    },
    [handleDownloadExistingReport, loadBasicObstetricBuilder, loadGeneticBuilder, loadNuchalTranslucencyBuilder, loadReports, loadStructuralBuilder, loadVitalityBuilder, loadWellbeingBuilder, patientId]
  );

  const handleBasicObstetricSaved = useCallback(
    (savedReport: PatientReportRecord<BasicObstetricReportPayload>) => {
      setReportsData((current) => {
        if (!current) return current;
        return {
          ...current,
          last_report_type_key: savedReport.report_type_key,
          last_report_type_label:
            current.reports_enabled.find((report) => report.key === savedReport.report_type_key)?.label ??
            current.last_report_type_label,
          last_report_date_label: savedReport.updated_at ?? savedReport.created_at ?? current.last_report_date_label,
        };
      });
    },
    []
  );

  const handleNuchalTranslucencySaved = useCallback(
    (savedReport: PatientReportRecord<NuchalTranslucencyReportPayload>) => {
      setReportsData((current) => {
        if (!current) return current;
        return {
          ...current,
          last_report_type_key: savedReport.report_type_key,
          last_report_type_label:
            current.reports_enabled.find((report) => report.key === savedReport.report_type_key)?.label ??
            current.last_report_type_label,
          last_report_date_label: savedReport.updated_at ?? savedReport.created_at ?? current.last_report_date_label,
        };
      });
    },
    []
  );

  const handleGeneticSaved = useCallback(
    (savedReport: PatientReportRecord<GeneticReportPayload>) => {
      setReportsData((current) => {
        if (!current) return current;
        return {
          ...current,
          last_report_type_key: savedReport.report_type_key,
          last_report_type_label:
            current.reports_enabled.find((report) => report.key === savedReport.report_type_key)?.label ??
            current.last_report_type_label,
          last_report_date_label: savedReport.updated_at ?? savedReport.created_at ?? current.last_report_date_label,
        };
      });
    },
    []
  );

  const handleVitalitySaved = useCallback(
    (savedReport: PatientReportRecord<FetalVitalityReportPayload>) => {
      setReportsData((current) => {
        if (!current) return current;
        return {
          ...current,
          last_report_type_key: savedReport.report_type_key,
          last_report_type_label:
            current.reports_enabled.find((report) => report.key === savedReport.report_type_key)?.label ??
            current.last_report_type_label,
          last_report_date_label: savedReport.updated_at ?? savedReport.created_at ?? current.last_report_date_label,
        };
      });
    },
    []
  );

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {!isBuildingReport && (
          <Paper sx={{ p: 2.5, borderRadius: 2 }}>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 2,
                flexWrap: 'wrap',
              }}
            >
              <Box>
                <Typography variant="h6" sx={{ color: '#0a8f2f', fontWeight: 700 }}>
                  Reportes
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                  Administra aqui los reportes del paciente desde la nueva version.
                </Typography>
              </Box>
              {!showCreate && canCreateReports && (
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => setShowCreate(true)}>
                  Nuevo reporte
                </Button>
              )}
            </Box>

            {!canCreateReports ? (
              <Alert severity="info" sx={{ mt: 2.5 }}>
                No hay reportes habilitados para este consultorio. Puedes activarlos o publicar plantillas PDF desde{' '}
                <Link href="/configuracion?tab=reportes" underline="hover">
                  aqui
                </Link>
                .
              </Alert>
            ) : null}

            {showCreate && canCreateReports && (
              <Box sx={{ mt: 2.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {hasEnabledReports && (
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
                      Reportes preconfigurados
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                      <TextField
                        select
                        fullWidth
                        label="Tipo de reporte"
                        value={selectedReportKey}
                        onChange={(event) => setSelectedReportKey(event.target.value)}
                      >
                        {reportsData?.reports_enabled.map((report) => (
                          <MenuItem key={report.key} value={report.key}>
                            {report.label}
                          </MenuItem>
                        ))}
                      </TextField>

                      {reportsData?.last_report_type_label && (
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                          Reporte requerido previo: <strong>{reportsData.last_report_type_label}</strong>
                          {reportsData.last_report_date_label ? ` | Fecha: ${reportsData.last_report_date_label}` : ''}
                        </Typography>
                      )}

                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Button variant="contained" onClick={() => void handleCreateReport()} disabled={creating || !selectedReportKey}>
                          {creating ? 'Creando...' : 'Siguiente'}
                        </Button>
                      </Box>
                    </Box>
                  </Paper>
                )}

                {hasPdfTemplates && (
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
                      Reportes específicos en PDF
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                      <TextField
                        select
                        fullWidth
                        label="Plantilla PDF publicada"
                        value={selectedPdfTemplateId}
                        onChange={(event) => setSelectedPdfTemplateId(event.target.value)}
                      >
                        {reportsData?.pdf_templates_enabled?.map((template: PatientPdfTemplateSummary) => (
                          <MenuItem key={template.id} value={String(template.id)}>
                            {template.name}
                            {template.study_type?.name ? ` | ${template.study_type.name}` : ''}
                          </MenuItem>
                        ))}
                      </TextField>

                      {selectedPdfTemplateId && reportsData?.pdf_templates_enabled ? (
                        (() => {
                          const selectedTemplate = reportsData.pdf_templates_enabled.find(
                            (template) => String(template.id) === selectedPdfTemplateId
                          );

                          if (!selectedTemplate) {
                            return null;
                          }

                          return (
                            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                              {selectedTemplate.description || 'Formulario previo para llenar el PDF desde esta plantilla publicada.'}
                              {selectedTemplate.laboratory?.name ? ` | Lab: ${selectedTemplate.laboratory.name}` : ''}
                              {selectedTemplate.fields_count ? ` | ${selectedTemplate.fields_count} campos` : ''}
                            </Typography>
                          );
                        })()
                      ) : null}

                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Button variant="contained" onClick={handleOpenPdfTemplateReport} disabled={!selectedPdfTemplateId}>
                          Abrir formulario PDF
                        </Button>
                      </Box>
                    </Box>
                  </Paper>
                )}

                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Button color="inherit" onClick={() => setShowCreate(false)} disabled={creating}>
                    Cancelar
                  </Button>
                </Box>
              </Box>
            )}
          </Paper>
        )}

        {!isBuildingReport && (
          <Paper sx={{ p: 2.5, borderRadius: 2 }}>
            <Typography variant="h6" sx={{ color: '#0a8f2f', fontWeight: 700, mb: 2 }}>
              Tabla de reportes previamente creados
            </Typography>

            {reportsData && (reportsData.items.length ?? 0) > 0 ? (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Fecha</TableCell>
                    <TableCell>Tipo</TableCell>
                    <TableCell align="right">Accion</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {reportsData.items.map((item: PatientReportItem) => (
                    <TableRow key={item.id} hover>
                      <TableCell>{item.created_at_label}</TableCell>
                      <TableCell>{item.type_label}</TableCell>
                      <TableCell align="right">
                        {item.type_key === 'tipoest1' || item.type_key === 'tipoest2' || item.type_key === 'tipoest3' || item.type_key === 'tipoest4' || item.type_key === 'tipoest5' || item.type_key === 'tipoest7' ? (
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => void handleOpenExistingReport(item)}
                          >
                            Seleccionar
                          </Button>
                        ) : (
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => void handleOpenExistingReport(item)}
                          >
                            Descargar reporte
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <Alert severity="info">Aun no hay reportes previos para este paciente.</Alert>
            )}
          </Paper>
        )}

        {activeColposcopyReportId && (
          <Paper sx={{ p: 2.5, borderRadius: 2 }}>
            <Typography variant="h6" sx={{ color: '#0a8f2f', fontWeight: 700, mb: 2 }}>
              Reporte de colposcopia
            </Typography>

            {builderLoading || !colposcopyBuilder ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                    1. Selecciona sesiones de captura
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
                    Estas sesiones solo filtran que imagenes ves abajo. La seleccion final que se guarda es la de
                    las 4 imagenes del reporte.
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                    {colposcopyBuilder.sessions.map((session) => (
                      <Box
                        key={session.id}
                        sx={{
                          border: '1px solid',
                          borderColor: selectedSessionIds.includes(session.id) ? 'primary.main' : 'divider',
                          borderRadius: 2,
                          p: 1.25,
                        }}
                      >
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={selectedSessionIds.includes(session.id)}
                              disabled={colposcopyBuilder.is_locked}
                              onChange={(event) => {
                                setSelectedSessionIds((current) =>
                                  event.target.checked
                                    ? [...current, session.id]
                                    : current.filter((id) => id !== session.id)
                                );
                              }}
                            />
                          }
                          sx={{ alignItems: 'flex-start', m: 0 }}
                          label={
                            <Box sx={{ pt: 0.5, cursor: colposcopyBuilder.is_locked ? 'default' : 'pointer' }}>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {session.title} ({session.files_count} imágenes)
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {session.captured_on_label || 'Sin fecha'}
                              </Typography>
                            </Box>
                          }
                        />
                      </Box>
                    ))}
                  </Box>
                </Box>

                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                    2. Selecciona 4 imágenes para el reporte
                  </Typography>
                  {colposcopyBuilder.is_locked && (
                    <Alert severity="info" sx={{ mb: 1.5 }}>
                      Este reporte ya tiene 4 imágenes definidas y ya no permite cambiarlas. Si necesitas otras
                      imágenes, crea un reporte nuevo.
                    </Alert>
                  )}
                  {availableBuilderFiles.length === 0 ? (
                    <Alert severity="info">Selecciona una o más sesiones para ver sus imágenes.</Alert>
                  ) : (
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 1.5 }}>
                      {availableBuilderFiles.map((file) => {
                        const checked = selectedFileIds.includes(file.id);
                        const disableUnchecked = !checked && selectedFileIds.length >= 4;
                        const selectedOrder = selectedFileIds.findIndex((id) => id === file.id);
                        const canToggle = !colposcopyBuilder.is_locked && (!disableUnchecked || checked);
                        const toggleFileSelection = () => {
                          if (!canToggle) return;
                          setSelectedFileIds((current) => {
                            if (current.includes(file.id)) {
                              return current.filter((id) => id !== file.id);
                            }
                            return [...current, file.id];
                          });
                        };

                        return (
                          <Box
                            key={file.id}
                            sx={{
                              border: '1px solid',
                              borderColor: checked ? 'primary.main' : 'divider',
                              borderRadius: 2,
                              p: 1.25,
                            }}
                          >
                            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                              <Checkbox
                                checked={checked}
                                disabled={colposcopyBuilder.is_locked || disableUnchecked}
                                onChange={(event) => {
                                  setSelectedFileIds((current) => {
                                    if (event.target.checked) {
                                      return [...current, file.id];
                                    }
                                    return current.filter((id) => id !== file.id);
                                  });
                                }}
                              />
                              <Box sx={{ flex: 1 }}>
                                <Box
                                  onClick={toggleFileSelection}
                                  sx={{
                                    cursor: canToggle ? 'pointer' : 'default',
                                  }}
                                >
                                  <Typography variant="body2" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                                    {selectedOrder >= 0 && (
                                      <Box
                                        component="span"
                                        sx={{
                                          width: 22,
                                          height: 22,
                                          borderRadius: '50%',
                                          bgcolor: '#d32f2f',
                                          color: '#fff',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          fontSize: 12,
                                          fontWeight: 700,
                                          lineHeight: 1,
                                          flexShrink: 0,
                                          textAlign: 'center',
                                        }}
                                      >
                                        {selectedOrder + 1}
                                      </Box>
                                    )}
                                    <Box component="span">{file.name}</Box>
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {file.uploaded_at ? file.uploaded_at.slice(11, 19) : 'Sin hora'}
                                  </Typography>
                                </Box>
                                <Box sx={{ mt: 1 }}>
                                  <Box
                                    component="button"
                                    type="button"
                                    onClick={() => void handlePreviewBuilderImage(file.id)}
                                    sx={{
                                      display: 'block',
                                      p: 0,
                                      border: 0,
                                      background: 'transparent',
                                      cursor: 'pointer',
                                      width: '100%',
                                      textAlign: 'left',
                                      opacity: disableUnchecked ? 0.45 : 1,
                                    }}
                                  >
                                    <Box
                                      component="img"
                                      src={imagePreviewUrls[file.id] || ''}
                                      alt={file.name}
                                      sx={{
                                        width: '100%',
                                        maxWidth: 200,
                                        height: 134,
                                        objectFit: 'cover',
                                        borderRadius: 1,
                                        border: '1px solid',
                                        borderColor: 'divider',
                                        bgcolor: 'rgba(0,0,0,0.04)',
                                      }}
                                    />
                                  </Box>
                                </Box>
                              </Box>
                            </Box>
                          </Box>
                        );
                      })}
                    </Box>
                  )}

                  <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
                    Seleccionadas: {selectedFileIds.length} / 4
                  </Typography>

                  <Box sx={{ mt: 1.5, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Button
                      variant="contained"
                      onClick={() => void handleDownloadDocx()}
                      disabled={
                        downloading ||
                        (colposcopyBuilder.is_locked
                          ? !colposcopyBuilder.can_download
                          : selectedFileIds.length < 1 || selectedFileIds.length > 4)
                      }
                    >
                      {downloading ? 'Descargando...' : 'Descargar DOCX'}
                    </Button>
                  </Box>
                </Box>
              </Box>
            )}
          </Paper>
        )}

        <Dialog
          open={activePdfTemplateId !== null}
          onClose={() => {
            setActivePdfTemplateId(null);
            setActivePdfTemplateStudyDeliveryId(null);
            setShowCreate(true);
          }}
          fullWidth
          maxWidth={false}
          PaperProps={{
            sx: {
              width: 'min(96vw, 1480px)',
              height: 'min(94vh, 1120px)',
              maxWidth: 'none',
              m: 1.5,
            },
          }}
        >
          <DialogContent sx={{ p: 2.5, overflow: 'auto' }}>
            {activePdfTemplateId ? (
              <PatientPdfTemplateReportBuilder
                patientId={patientId}
                templateId={activePdfTemplateId}
                initialStudyDeliveryId={activePdfTemplateStudyDeliveryId}
                onGenerated={async () => {
                  setActivePdfTemplateId(null);
                  setActivePdfTemplateStudyDeliveryId(null);
                  setShowCreate(false);
                  await loadReports();
                  setMessage('PDF final generado y guardado correctamente.');
                }}
                onBack={() => {
                  setActivePdfTemplateId(null);
                  setActivePdfTemplateStudyDeliveryId(null);
                  setShowCreate(true);
                }}
              />
            ) : null}
          </DialogContent>
        </Dialog>

        {activeBasicObstetricReportId && (
          <PatientBasicObstetricReportBuilder
            reportId={activeBasicObstetricReportId}
            startInEditMode={reportBuilderStartInEditMode}
            onClose={() => {
              setActiveBasicObstetricReportId(null);
              setReportBuilderStartInEditMode(true);
              void loadReports();
            }}
            onSaved={handleBasicObstetricSaved}
            onError={setError}
            onSuccess={setMessage}
          />
        )}

        {activeNuchalTranslucencyReportId && (
          <PatientNuchalTranslucencyReportBuilder
            reportId={activeNuchalTranslucencyReportId}
            startInEditMode={reportBuilderStartInEditMode}
            onClose={() => {
              setActiveNuchalTranslucencyReportId(null);
              setReportBuilderStartInEditMode(true);
              void loadReports();
            }}
            onSaved={handleNuchalTranslucencySaved}
            onError={setError}
            onSuccess={setMessage}
          />
        )}

        {activeGeneticReportId && (
          <PatientGeneticReportBuilder
            reportId={activeGeneticReportId}
            startInEditMode={reportBuilderStartInEditMode}
            onClose={() => {
              setActiveGeneticReportId(null);
              setReportBuilderStartInEditMode(true);
              void loadReports();
            }}
            onSaved={handleGeneticSaved}
            onError={setError}
            onSuccess={setMessage}
          />
        )}

        {activeStructuralReportId && (
          <PatientStructuralReportBuilder
            reportId={activeStructuralReportId}
            startInEditMode={reportBuilderStartInEditMode}
            onClose={() => {
              setActiveStructuralReportId(null);
              setReportBuilderStartInEditMode(true);
              void loadReports();
            }}
            onSaved={handleGeneticSaved}
            onError={setError}
            onSuccess={setMessage}
          />
        )}

        {activeWellbeingReportId && (
          <PatientFetalWellbeingReportBuilder
            reportId={activeWellbeingReportId}
            startInEditMode={reportBuilderStartInEditMode}
            onClose={() => {
              setActiveWellbeingReportId(null);
              setReportBuilderStartInEditMode(true);
              void loadReports();
            }}
            onSaved={handleGeneticSaved}
            onError={setError}
            onSuccess={setMessage}
          />
        )}

        {activeVitalityReportId && (
          <PatientFetalVitalityReportBuilder
            reportId={activeVitalityReportId}
            startInEditMode={reportBuilderStartInEditMode}
            onClose={() => {
              setActiveVitalityReportId(null);
              setReportBuilderStartInEditMode(true);
              void loadReports();
            }}
            onSaved={handleVitalitySaved}
            onError={setError}
            onSuccess={setMessage}
          />
        )}
      </Box>

      <Snackbar
        open={Boolean(message)}
        autoHideDuration={3500}
        onClose={() => setMessage(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={() => setMessage(null)} severity="success" sx={{ width: '100%' }}>
          {message}
        </Alert>
      </Snackbar>

      <Snackbar
        open={Boolean(error)}
        autoHideDuration={3500}
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={() => setError(null)} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>

      <Lightbox
        open={lightboxOpen}
        close={() => setLightboxOpen(false)}
        slides={lightboxSlides}
        index={lightboxIndex}
        plugins={[Zoom]}
        zoom={{ maxZoomPixelRatio: 6, scrollToZoom: true }}
      />
    </>
  );
}

export default memo(PatientReportsTab);
