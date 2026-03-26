import { memo, useEffect, useRef, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
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
  files: PatientFile[];
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

function PatientFilesTabInner({ files, onError }: Props) {
  const [imagePreviewUrls, setImagePreviewUrls] = useState<Record<number, string>>({});
  const imagePreviewUrlsRef = useRef<Record<number, string>>({});
  const [lightboxSlides, setLightboxSlides] = useState<Array<{ src: string; alt: string }>>([]);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [pdfPreviewName, setPdfPreviewName] = useState('');

  useEffect(() => {
    imagePreviewUrlsRef.current = imagePreviewUrls;
  }, [imagePreviewUrls]);

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
      onError('No se pudo descargar el archivo');
    }
  };

  const handlePreviewImage = async (selectedFile: PatientFile) => {
    try {
      const nextPreviewUrls = { ...imagePreviewUrlsRef.current };

      if (!nextPreviewUrls[selectedFile.id]) {
        nextPreviewUrls[selectedFile.id] = window.URL.createObjectURL(
          await patientService.getFileBlob(selectedFile.id)
        );
        setImagePreviewUrls(nextPreviewUrls);
      }

      const slides = imageFiles
        .map((file) => {
          const src = nextPreviewUrls[file.id] ?? imagePreviewUrlsRef.current[file.id];
          if (!src) return null;
          return { src, alt: file.name };
        })
        .filter((slide): slide is { src: string; alt: string } => Boolean(slide));

      setLightboxSlides(slides);
      const selectedIndex = imageFiles.findIndex((file) => file.id === selectedFile.id);
      setLightboxIndex(selectedIndex >= 0 ? selectedIndex : 0);
      setLightboxOpen(true);
    } catch (err) {
      console.error('Error visualizando imagen:', err);
      onError('No se pudo abrir la imagen');
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
      onError('No se pudo abrir el PDF');
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
                    secondary={`${Math.round(Number(file.size) || 0)} KB | Subido: ${formatDisplayDateTimeLongEs(file.uploaded_at)}`}
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
