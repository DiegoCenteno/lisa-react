import { memo, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Snackbar,
  Typography,
} from '@mui/material';
import {
  CameraAlt as CameraAltIcon,
} from '@mui/icons-material';
import Lightbox from 'yet-another-react-lightbox';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';
import 'yet-another-react-lightbox/styles.css';
import type { PatientFile } from '../../types';
import { patientService } from '../../api/patientService';
import { consultationService } from '../../api/consultationService';
import { formatDisplayDateTimeLongEs } from '../../utils/date';

interface Props {
  patientId: number;
  patientName?: string;
  moduleTitle?: string;
  onCaptureSaved?: (file: PatientFile) => void;
}

function PatientColposcopyTabInner({ patientId, patientName, moduleTitle = 'Camara', onCaptureSaved }: Props) {
  const captureLimit = 20;
  const captureCooldownMs = 3000;
  const [colposcopyFiles, setColposcopyFiles] = useState<PatientFile[]>([]);
  const [loadingColposcopy, setLoadingColposcopy] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturingColposcopy, setCapturingColposcopy] = useState(false);
  const [captureCooldownUntil, setCaptureCooldownUntil] = useState<number | null>(null);
  const [captureCooldownNow, setCaptureCooldownNow] = useState(() => Date.now());
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
  const patientIdRef = useRef(patientId);
  const navigationLockRef = useRef(false);
  const pollingInFlightRef = useRef(false);
  const lastActiveCheckAtRef = useRef(0);
  const switchAudioRef = useRef<HTMLAudioElement | null>(null);
  const captureAudioRef = useRef<HTMLAudioElement | null>(null);
  const sectionRef = useRef<HTMLDivElement | null>(null);

  const scrollToCameraSection = () => {
    window.requestAnimationFrame(() => {
      const top = (sectionRef.current?.getBoundingClientRect().top ?? 0) + window.scrollY - 88;
      window.scrollTo({ top: Math.max(top, 0), behavior: 'auto' });
    });
  };

  useEffect(() => {
    imagePreviewUrlsRef.current = imagePreviewUrls;
  }, [imagePreviewUrls]);

  const todaysColposcopyFiles = colposcopyFiles.filter((file) => {
    const uploadedAt = new Date(file.uploaded_at);
    const now = new Date();

    return (
      uploadedAt.getFullYear() === now.getFullYear() &&
      uploadedAt.getMonth() === now.getMonth() &&
      uploadedAt.getDate() === now.getDate()
    );
  });
  const captureLimitReached = todaysColposcopyFiles.length >= captureLimit;
  const captureCooldownActive = captureCooldownUntil !== null && captureCooldownUntil > captureCooldownNow;
  const captureCooldownSeconds = captureCooldownActive
    ? Math.ceil((captureCooldownUntil - captureCooldownNow) / 1000)
    : 0;
  const captureDisabled = !cameraReady || capturingColposcopy || captureCooldownActive || captureLimitReached;

  useEffect(() => {
    if (!captureCooldownActive) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setCaptureCooldownNow(Date.now());
    }, 250);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [captureCooldownActive]);

  useEffect(() => {
    patientIdRef.current = patientId;
    navigationLockRef.current = false;
    setCaptureCooldownUntil(null);
    setCaptureCooldownNow(Date.now());
  }, [patientId]);

  useEffect(() => {
    switchAudioRef.current = new Audio('/img/sounds/magic-chime-01.wav');
    captureAudioRef.current = new Audio('/img/sounds/camera-shutter-click-01.wav');
  }, []);

  const stopCameraStream = () => {
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraReady(false);
    setCameraError(null);
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

  useEffect(() => {
    scrollToCameraSection();
    const timeoutId = window.setTimeout(() => {
      scrollToCameraSection();
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [patientId]);

  useEffect(() => {
    if (!cameraReady) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      scrollToCameraSection();
    }, 150);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [cameraReady]);

  useEffect(() => {
    let cancelled = false;

    const loadThumbnails = async () => {
      const nextPreviewUrls = { ...imagePreviewUrlsRef.current };
      const missingFiles = todaysColposcopyFiles.filter((file) => !nextPreviewUrls[file.id]);

      if (missingFiles.length === 0) {
        return;
      }

      try {
        const loadedPreviews = await Promise.all(
          missingFiles.map(async (file) => ({
            fileId: file.id,
            url: window.URL.createObjectURL(await patientService.getFileBlob(file.id)),
          }))
        );

        if (cancelled) {
          loadedPreviews.forEach(({ url }) => window.URL.revokeObjectURL(url));
          return;
        }

        loadedPreviews.forEach(({ fileId, url }) => {
          nextPreviewUrls[fileId] = url;
        });

        setImagePreviewUrls(nextPreviewUrls);
      } catch (err) {
        if (!cancelled) {
          console.error('Error cargando miniaturas de colposcopia:', err);
        }
      }
    };

    void loadThumbnails();

    return () => {
      cancelled = true;
    };
  }, [todaysColposcopyFiles]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName?.toLowerCase();
      const isTypingContext =
        tagName === 'input' ||
        tagName === 'textarea' ||
        tagName === 'select' ||
        target?.isContentEditable;

      if (isTypingContext) {
        return;
      }

      if (event.key === 'b' || event.key === 'B') {
        event.preventDefault();
        void handleCaptureColposcopy();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [captureCooldownActive, captureLimitReached, cameraReady, capturingColposcopy, patientId]);

  useEffect(() => {
    let cancelled = false;
    let timeoutId: number | null = null;
    const pollDelayMs = 30000;

    const scheduleNextPoll = (delay = pollDelayMs) => {
      if (cancelled) {
        return;
      }

      timeoutId = window.setTimeout(() => {
        void pollActivePatient();
      }, delay);
    };

    const pollActivePatient = async () => {
      const now = Date.now();
      if (now - lastActiveCheckAtRef.current < pollDelayMs) {
        scheduleNextPoll(Math.max(pollDelayMs - (now - lastActiveCheckAtRef.current), 1000));
        return;
      }

      if (cancelled || pollingInFlightRef.current || navigationLockRef.current) {
        scheduleNextPoll();
        return;
      }

      lastActiveCheckAtRef.current = now;
      pollingInFlightRef.current = true;

      try {
        const activePatient = await consultationService.getActiveColposcopyPatient(patientIdRef.current);
        const nextPatientId = Number(activePatient.patient_id ?? 0);

        if (!cancelled && nextPatientId && nextPatientId !== patientIdRef.current) {
          navigationLockRef.current = true;
          try {
            if (switchAudioRef.current) {
              switchAudioRef.current.currentTime = 0;
            }
            await switchAudioRef.current?.play();
          } catch {
            // Ignore autoplay restrictions and continue the navigation.
          }
          window.setTimeout(() => {
            window.location.replace(`/pacientes/${nextPatientId}?tab=colposcopy`);
          }, 3000);
          return;
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Error revisando paciente activo de camara:', err);
        }
      } finally {
        pollingInFlightRef.current = false;
      }

      scheduleNextPoll();
    };

    void pollActivePatient();

    return () => {
      cancelled = true;
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, []);

  const handleCaptureColposcopy = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    if (captureLimitReached) {
      setError('Se alcanzo el maximo de 20 capturas en esta sesion.');
      return;
    }

    if (captureCooldownActive || capturingColposcopy || !cameraReady) {
      return;
    }

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
      try {
        if (captureAudioRef.current) {
          captureAudioRef.current.currentTime = 0;
        }
        await captureAudioRef.current?.play();
      } catch {
        // Ignore autoplay restrictions and continue the capture.
      }

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
      setCaptureCooldownUntil(Date.now() + captureCooldownMs);
      setCaptureCooldownNow(Date.now());
      onCaptureSaved?.(createdFile);
      setMessage('Captura realizada');
    } catch (err) {
      console.error('Error capturando imagen de colposcop\u00eda:', err);
      setError('No se pudo guardar la captura');
    } finally {
      setCapturingColposcopy(false);
    }
  };

  const handlePreviewImage = async (selectedFile: PatientFile) => {
    try {
      const nextPreviewUrls = { ...imagePreviewUrlsRef.current };
      const missingFiles = todaysColposcopyFiles.filter((file) => !nextPreviewUrls[file.id]);

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

      const slides = todaysColposcopyFiles.map((file) => ({
        src: nextPreviewUrls[file.id],
        alt: file.name,
      }));

      setLightboxSlides(slides);
      const selectedIndex = todaysColposcopyFiles.findIndex((file) => file.id === selectedFile.id);
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
        <CardContent ref={sectionRef}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, gap: 1, flexWrap: 'wrap' }}>
            <Typography variant="h6">Captura con {moduleTitle}</Typography>
            <Button
              variant="contained"
              color="primary"
              startIcon={capturingColposcopy ? <CircularProgress size={18} color="inherit" /> : <CameraAltIcon />}
              onClick={handleCaptureColposcopy}
              disabled={captureDisabled}
            >
              {capturingColposcopy
                ? 'Capturando...'
                : captureCooldownActive
                  ? `Espera ${captureCooldownSeconds}s`
                  : captureLimitReached
                    ? 'Limite alcanzado'
                    : 'Capturar imagen'}
            </Button>
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Puedes capturar con el boton, con click sobre la vista previa o presionando la tecla <strong>B</strong>.
          </Typography>

          {cameraError && !cameraReady && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              {cameraError}
            </Alert>
          )}

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1fr) minmax(280px, 1fr)' },
              gap: 2,
              alignItems: 'start',
            }}
          >
            <Box sx={{ maxWidth: { xs: '100%', lg: 760 }, mx: { xs: 0, lg: 'auto' }, width: '100%' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
                <Typography
                  variant="h4"
                  sx={{
                    textAlign: 'center',
                    fontWeight: 700,
                    color: 'primary.main',
                    fontSize: { xs: '1.5rem', md: '2rem' },
                  }}
                >
                  {patientName || 'Paciente en atencion'}
                </Typography>
                <Box
                  sx={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    bgcolor: '#d32f2f',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '1.35rem',
                    boxShadow: '0 6px 16px rgba(211, 47, 47, 0.25)',
                  }}
                >
                  {todaysColposcopyFiles.length}
                </Box>
              </Box>

              <Box
                onClick={() => void handleCaptureColposcopy()}
                sx={{
                  position: 'relative',
                  width: '100%',
                  borderRadius: 2,
                  overflow: 'hidden',
                  bgcolor: '#111',
                  border: '1px solid',
                  borderColor: 'divider',
                  cursor: captureDisabled ? 'default' : 'pointer',
                  aspectRatio: '16 / 9',
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
            </Box>

            <Box
              sx={{
                minHeight: { xs: 120, lg: 0 },
                maxHeight: { xs: 'none', lg: 'calc(100vh - 260px)' },
                overflowY: 'auto',
                pr: { xs: 0, lg: 0.5 },
              }}
            >
              {loadingColposcopy && todaysColposcopyFiles.length === 0 ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : todaysColposcopyFiles.length === 0 ? (
                <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                  Sin capturas de hoy
                </Typography>
              ) : (
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(112px, 1fr))',
                    gap: 1.25,
                  }}
                >
                  {todaysColposcopyFiles.map((file) => (
                    <Box
                      key={file.id}
                      onClick={() => void handlePreviewImage(file)}
                      title={formatDisplayDateTimeLongEs(file.uploaded_at)}
                      sx={{
                        position: 'relative',
                        aspectRatio: '1 / 1',
                        borderRadius: 1.5,
                        overflow: 'hidden',
                        border: '1px solid',
                        borderColor: 'divider',
                        bgcolor: 'grey.100',
                        cursor: 'pointer',
                      }}
                    >
                      {imagePreviewUrls[file.id] ? (
                        <Box
                          component="img"
                          src={imagePreviewUrls[file.id]}
                          alt={file.name}
                          sx={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            display: 'block',
                          }}
                        />
                      ) : (
                        <Box
                          sx={{
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <CircularProgress size={18} />
                        </Box>
                      )}
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          </Box>
        </CardContent>
      </Card>

      <Lightbox
        open={lightboxOpen}
        close={() => setLightboxOpen(false)}
        slides={lightboxSlides}
        index={lightboxIndex}
        plugins={[Zoom]}
        zoom={{ maxZoomPixelRatio: 6, scrollToZoom: true }}
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
