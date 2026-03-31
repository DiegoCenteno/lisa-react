import { memo, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Snackbar,
  Typography,
} from '@mui/material';
import {
  CameraAlt as CameraAltIcon,
  Image as ImageIcon,
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
  moduleTitle?: string;
  onCaptureSaved?: (file: PatientFile) => void;
}

function PatientColposcopyTabInner({ patientId, moduleTitle = 'Camara', onCaptureSaved }: Props) {
  const [colposcopyFiles, setColposcopyFiles] = useState<PatientFile[]>([]);
  const [loadingColposcopy, setLoadingColposcopy] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturingColposcopy, setCapturingColposcopy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const [imagePreviewUrls, setImagePreviewUrls] = useState<Record<number, string>>({});
  const imagePreviewUrlsRef = useRef<Record<number, string>>({});
  const [lightboxSlides, setLightboxSlides] = useState<Array<{ src: string; alt: string }>>([]);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  useEffect(() => {
    imagePreviewUrlsRef.current = imagePreviewUrls;
  }, [imagePreviewUrls]);

  const stopCameraStream = () => {
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraReady(false);
  };

  const startCameraStream = async () => {
    if (mediaStreamRef.current || !navigator.mediaDevices?.getUserMedia) {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError('Este navegador no permite abrir la c\u00e1mara en este contexto');
      }
      return;
    }

    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });

      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraReady(true);
    } catch (err) {
      console.error('Error abriendo c\u00e1mara:', err);
      setCameraReady(false);
      setCameraError(`Necesitas habilitar permisos de camara para usar ${moduleTitle.toLowerCase()}`);
    }
  };

  const loadColposcopyFiles = async () => {
    setLoadingColposcopy(true);
    try {
      const nextFiles = await patientService.getColposcopyFiles(patientId);
      setColposcopyFiles(
        [...nextFiles].sort(
          (a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime()
        )
      );
    } catch (err) {
      console.error('Error cargando capturas de colposcop\u00eda:', err);
      setError('No se pudieron cargar las capturas de colposcop\u00eda');
    } finally {
      setLoadingColposcopy(false);
    }
  };

  useEffect(() => {
    loadColposcopyFiles();
    startCameraStream();

    return () => {
      stopCameraStream();
      Object.values(imagePreviewUrlsRef.current).forEach((url) => {
        window.URL.revokeObjectURL(url);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  const handleCaptureColposcopy = async () => {
    if (capturingColposcopy || !videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const width = video.videoWidth;
    const height = video.videoHeight;

    if (!width || !height) {
      setError('La c\u00e1mara todav\u00eda no est\u00e1 lista para capturar');
      return;
    }

    setCapturingColposcopy(true);

    try {
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');

      if (!context) {
        throw new Error('No se pudo crear el contexto del canvas');
      }

      context.drawImage(video, 0, 0, width, height);
      const image = canvas.toDataURL('image/jpeg', 0.92);
      const createdFile = await patientService.captureColposcopy(patientId, image);

      setColposcopyFiles((current) => [createdFile, ...current.filter((file) => file.id !== createdFile.id)]);
      onCaptureSaved?.(createdFile);
      setMessage('Captura realizada');
    } catch (err) {
      console.error('Error capturando imagen de colposcop\u00eda:', err);
      setError('No se pudo guardar la captura');
    } finally {
      setCapturingColposcopy(false);
    }
  };

  const handleDownloadFile = async (file: PatientFile) => {
    try {
      await patientService.downloadFile(file.id, file.name);
    } catch (err) {
      console.error('Error descargando archivo:', err);
      setError('No se pudo descargar el archivo');
    }
  };

  const handlePreviewImage = async (selectedFile: PatientFile) => {
    try {
      const nextPreviewUrls = { ...imagePreviewUrlsRef.current };
      const missingFiles = colposcopyFiles.filter((file) => !nextPreviewUrls[file.id]);

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

      const slides = colposcopyFiles.map((file) => ({
        src: nextPreviewUrls[file.id],
        alt: file.name,
      }));

      setLightboxSlides(slides);
      const selectedIndex = colposcopyFiles.findIndex((file) => file.id === selectedFile.id);
      setLightboxIndex(selectedIndex >= 0 ? selectedIndex : 0);
      setLightboxOpen(true);
    } catch (err) {
      console.error('Error visualizando imagen:', err);
      setError('No se pudo abrir la imagen');
    }
  };

  return (
    <>
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, gap: 1, flexWrap: 'wrap' }}>
            <Typography variant="h6">Captura con {moduleTitle}</Typography>
            <Button
              variant="contained"
              color="primary"
              startIcon={capturingColposcopy ? <CircularProgress size={18} color="inherit" /> : <CameraAltIcon />}
              onClick={handleCaptureColposcopy}
              disabled={!cameraReady || capturingColposcopy}
            >
              {capturingColposcopy ? 'Capturando...' : 'Capturar imagen'}
            </Button>
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Puedes capturar con el boton, con click sobre la vista previa o presionando la tecla <strong>B</strong>.
          </Typography>

          {cameraError && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              {cameraError}
            </Alert>
          )}

          <Box
            onClick={() => void handleCaptureColposcopy()}
            sx={{
              position: 'relative',
              width: '100%',
              maxWidth: 840,
              mx: 'auto',
              borderRadius: 2,
              overflow: 'hidden',
              bgcolor: '#111',
              border: '1px solid',
              borderColor: 'divider',
              cursor: cameraReady && !capturingColposcopy ? 'pointer' : 'default',
              aspectRatio: '16 / 9',
              mb: 3,
            }}
          >
            <Box
              component="video"
              ref={videoRef}
              autoPlay
              muted
              playsInline
              sx={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: cameraReady ? 'block' : 'none',
              }}
            />
            {!cameraReady && (
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  px: 3,
                  textAlign: 'center',
                }}
              >
                <Typography variant="body1">{cameraError ?? 'Abriendo c\u00e1mara...'}</Typography>
              </Box>
            )}
            <canvas ref={canvasRef} style={{ display: 'none' }} />
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, gap: 1, flexWrap: 'wrap' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Capturas del paciente
            </Typography>
            {loadingColposcopy && <CircularProgress size={20} />}
          </Box>

          {colposcopyFiles.length === 0 ? (
            <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
              No hay capturas almacenadas en este modulo
            </Typography>
          ) : (
            <List>
              {colposcopyFiles.map((file) => (
                <ListItem key={file.id} divider>
                  <ListItemIcon>
                    <ImageIcon sx={{ color: '#43A047' }} />
                  </ListItemIcon>
                  <ListItemText
                    primary={file.name}
                    secondary={`${Math.round(Number(file.size) || 0)} KB | Capturada: ${formatDisplayDateTimeLongEs(file.uploaded_at)}`}
                  />
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Button size="small" startIcon={<VisibilityIcon />} onClick={() => handlePreviewImage(file)}>
                      Ver
                    </Button>
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

      <Snackbar open={Boolean(message)} autoHideDuration={3000} onClose={() => setMessage(null)} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert onClose={() => setMessage(null)} severity="success" sx={{ width: '100%' }}>{message}</Alert>
      </Snackbar>
      <Snackbar open={Boolean(error)} autoHideDuration={3000} onClose={() => setError(null)} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert onClose={() => setError(null)} severity="error" sx={{ width: '100%' }}>{error}</Alert>
      </Snackbar>
    </>
  );
}

export default memo(PatientColposcopyTabInner);
