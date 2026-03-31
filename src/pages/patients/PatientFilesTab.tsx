import { memo, useEffect, useRef, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  Close as CloseIcon,
  Image as ImageIcon,
  InsertDriveFile as DocIcon,
  PictureAsPdf as PdfIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import Lightbox from 'yet-another-react-lightbox';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';
import 'yet-another-react-lightbox/styles.css';
import type { PatientFile } from '../../types';
import { patientService } from '../../api/patientService';
import { formatDisplayDateTimeLongEs } from '../../utils/date';

interface Props {
  patientId: number;
  refreshKey?: number;
  cameraModuleTitle?: string;
  onError: (message: string) => void;
}

const fileIcons: Record<string, React.ReactNode> = {
  'application/pdf': <PdfIcon sx={{ color: '#E53935' }} />,
  'image/jpeg': <ImageIcon sx={{ color: '#43A047' }} />,
  'image/png': <ImageIcon sx={{ color: '#43A047' }} />,
};

function isImageFile(type?: string) {
  return type === 'image/jpeg' || type === 'image/png';
}

function isPdfFile(type?: string) {
  return type === 'application/pdf';
}

const captureSessionChipColors = [
  { bg: '#E3F2FD', color: '#1565C0' },
  { bg: '#E8F5E9', color: '#2E7D32' },
  { bg: '#FFF3E0', color: '#EF6C00' },
  { bg: '#F3E5F5', color: '#7B1FA2' },
  { bg: '#FCE4EC', color: '#C2185B' },
];

function resolveFileChip(file: PatientFile, cameraModuleTitle: string) {
  if (file.capture_source === 'colposcopy_camera') {
    const paletteIndex = Math.abs(Number(file.capture_session_id ?? 0)) % captureSessionChipColors.length;
    const palette = captureSessionChipColors[paletteIndex];
    const labelPrefix = cameraModuleTitle.trim() || 'Camara';

    return {
      label: file.capture_session_title?.replace(/^Colposcopia/i, labelPrefix).trim()
        || `${labelPrefix} ${formatDisplayDateTimeLongEs(file.uploaded_at)}`,
      sx: {
        backgroundColor: palette.bg,
        color: palette.color,
        fontWeight: 700,
        height: 28,
      },
    };
  }

  return {
    label: 'AGREGADO MANUALMENTE',
    sx: {
      backgroundColor: '#ECEFF1',
      color: '#455A64',
      fontWeight: 700,
      height: 28,
    },
  };
}

function PatientFilesTabInner({ patientId, refreshKey = 0, cameraModuleTitle = 'Camara', onError }: Props) {
  const [files, setFiles] = useState<PatientFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<Record<number, string>>({});
  const imagePreviewUrlsRef = useRef<Record<number, string>>({});
  const [lightboxSlides, setLightboxSlides] = useState<Array<{ src: string; alt: string }>>([]);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [pdfPreviewName, setPdfPreviewName] = useState('');
  const onErrorRef = useRef(onError);

  useEffect(() => {
    imagePreviewUrlsRef.current = imagePreviewUrls;
  }, [imagePreviewUrls]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    const loadFiles = async () => {
      setLoading(true);
      try {
        const nextFiles = await patientService.getFiles(patientId);
        setFiles(
          [...nextFiles].sort(
            (a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime()
          )
        );
      } catch (err) {
        console.error('Error cargando archivos del paciente:', err);
        onErrorRef.current('No se pudieron cargar los archivos');
      } finally {
        setLoading(false);
      }
    };

    void loadFiles();
  }, [patientId, refreshKey]);

  useEffect(() => {
    return () => {
      Object.values(imagePreviewUrlsRef.current).forEach((url) => {
        window.URL.revokeObjectURL(url);
      });
      if (pdfPreviewUrl) {
        window.URL.revokeObjectURL(pdfPreviewUrl);
      }
    };
  }, [pdfPreviewUrl]);

  const imageFiles = files.filter((file) => isImageFile(file.type));

  const handleDownloadFile = async (file: PatientFile) => {
    try {
      await patientService.downloadFile(file.id, file.name);
    } catch (err) {
      console.error('Error descargando archivo:', err);
      onErrorRef.current('No se pudo descargar el archivo');
    }
  };

  const handlePreviewImage = async (selectedFile: PatientFile) => {
    try {
      const nextPreviewUrls = { ...imagePreviewUrlsRef.current };
      const missingFiles = imageFiles.filter((file) => !nextPreviewUrls[file.id]);

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

      const slides = imageFiles.map((file) => ({
        src: nextPreviewUrls[file.id],
        alt: file.name,
      }));

      setLightboxSlides(slides);
      const selectedIndex = imageFiles.findIndex((file) => file.id === selectedFile.id);
      setLightboxIndex(selectedIndex >= 0 ? selectedIndex : 0);
      setLightboxOpen(true);
    } catch (err) {
      console.error('Error visualizando imagen:', err);
      onErrorRef.current('No se pudo abrir la imagen');
    }
  };

  const handlePreviewPdf = async (file: PatientFile) => {
    try {
      if (pdfPreviewUrl) {
        window.URL.revokeObjectURL(pdfPreviewUrl);
      }
      const blob = await patientService.getFileBlob(file.id);
      const previewUrl = window.URL.createObjectURL(blob);
      setPdfPreviewUrl(previewUrl);
      setPdfPreviewName(file.name);
    } catch (err) {
      console.error('Error visualizando PDF:', err);
      onErrorRef.current('No se pudo abrir el PDF');
    }
  };

  const handleClosePdfPreview = () => {
    if (pdfPreviewUrl) {
      window.URL.revokeObjectURL(pdfPreviewUrl);
    }
    setPdfPreviewUrl(null);
    setPdfPreviewName('');
  };

  return (
    <>
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6">Archivos del Paciente</Typography>
            <Button variant="outlined" startIcon={<AddIcon />} size="small">
              Subir Archivo
            </Button>
          </Box>
          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              <CircularProgress size={24} />
            </Box>
          )}
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
                    secondary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mt: 0.5 }}>
                        <Box component="span">
                          {`${Math.round(Number(file.size) || 0)} KB | Subido: ${formatDisplayDateTimeLongEs(file.uploaded_at)}`}
                        </Box>
                        <Chip
                          size="small"
                          label={resolveFileChip(file, cameraModuleTitle).label}
                          sx={resolveFileChip(file, cameraModuleTitle).sx}
                        />
                      </Box>
                    }
                  />
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {isImageFile(file.type) && (
                      <Button size="small" startIcon={<VisibilityIcon />} onClick={() => handlePreviewImage(file)}>
                        Ver
                      </Button>
                    )}
                    {isPdfFile(file.type) && (
                      <Button size="small" startIcon={<VisibilityIcon />} onClick={() => handlePreviewPdf(file)}>
                        Ver
                      </Button>
                    )}
                    <Button size="small" onClick={() => handleDownloadFile(file)}>
                      Descargar
                    </Button>
                  </Box>
                </ListItem>
              ))}
            </List>
          )}
        </CardContent>
      </Card>
      <Lightbox
        open={lightboxOpen}
        close={() => setLightboxOpen(false)}
        slides={lightboxSlides}
        index={lightboxIndex}
        plugins={[Zoom]}
      />
      <Dialog open={Boolean(pdfPreviewUrl)} onClose={handleClosePdfPreview} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 1 }}>
          <Box component="span">{pdfPreviewName || 'Vista previa PDF'}</Box>
          <IconButton onClick={handleClosePdfPreview} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0, height: '80vh' }}>
          {pdfPreviewUrl && (
            <Box
              component="iframe"
              src={pdfPreviewUrl}
              title={pdfPreviewName || 'Vista previa PDF'}
              sx={{ border: 0, width: '100%', height: '100%' }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export default memo(PatientFilesTabInner);
