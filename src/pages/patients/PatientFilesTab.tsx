import { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Avatar,
  List,
  ListItem,
  ListItemText,
  Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  Close as CloseIcon,
  DeleteOutline as DeleteIcon,
  InsertDriveFile as DocIcon,
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

function isImageFile(type?: string) {
  return type === 'image/jpeg' || type === 'image/png';
}

function isPdfFile(type?: string) {
  return type === 'application/pdf';
}

function isPreviewableFile(type?: string) {
  return isImageFile(type) || isPdfFile(type);
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

interface FileLeadingProps {
  file: PatientFile;
  previewUrl?: string;
  onVisible: (fileId: number) => void;
  onOpenPreview: () => void;
}

const FileLeading = memo(function FileLeading({
  file,
  previewUrl,
  onVisible,
  onOpenPreview,
}: FileLeadingProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isImageFile(file.type)) {
      return;
    }

    const element = containerRef.current;
    if (!element) {
      return;
    }

    const rect = element.getBoundingClientRect();
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
    if (rect.top <= viewportHeight + 200 && rect.bottom >= -200) {
      onVisible(file.id);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          onVisible(file.id);
          observer.disconnect();
        }
      },
      {
        rootMargin: '200px',
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [file.id, file.type, onVisible]);

  const commonSx = {
    width: 92,
    height: 92,
    borderRadius: 1.5,
    display: 'block',
    cursor: isPreviewableFile(file.type) ? 'pointer' : 'default',
    border: '1px solid #E0E0E0',
  } as const;

  return (
    <Box ref={containerRef}>
      {isImageFile(file.type) && previewUrl ? (
        <Box
          component="img"
          src={previewUrl}
          alt={file.name}
          onClick={onOpenPreview}
          sx={{
            ...commonSx,
            objectFit: 'cover',
          }}
        />
      ) : isImageFile(file.type) ? (
        <Box
          sx={{
            ...commonSx,
            bgcolor: 'grey.100',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <CircularProgress size={18} />
        </Box>
      ) : isPdfFile(file.type) ? (
        <Box
          component="img"
          src="/img/pdf-active.png"
          alt="PDF"
          onClick={onOpenPreview}
          sx={{ ...commonSx, objectFit: 'contain' }}
        />
      ) : (
        <Avatar
          variant="rounded"
          sx={{ width: 92, height: 92, bgcolor: '#E3F2FD', color: '#1565C0' }}
        >
          <DocIcon />
        </Avatar>
      )}
    </Box>
  );
});

function PatientFilesTabInner({ patientId, refreshKey = 0, cameraModuleTitle = 'Camara', onError }: Props) {
  const [files, setFiles] = useState<PatientFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<Record<number, string>>({});
  const [visibleImageIds, setVisibleImageIds] = useState<number[]>([]);
  const imagePreviewUrlsRef = useRef<Record<number, string>>({});
  const [imageViewerUrls, setImageViewerUrls] = useState<Record<number, string>>({});
  const imageViewerUrlsRef = useRef<Record<number, string>>({});
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [pdfPreviewName, setPdfPreviewName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PatientFile | null>(null);
  const [deleting, setDeleting] = useState(false);
  const viewerLoadingIdsRef = useRef<Record<number, boolean>>({});
  const onErrorRef = useRef(onError);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    imagePreviewUrlsRef.current = imagePreviewUrls;
  }, [imagePreviewUrls]);

  useEffect(() => {
    imageViewerUrlsRef.current = imageViewerUrls;
  }, [imageViewerUrls]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  const loadFiles = useCallback(async () => {
    setLoading(true);
    try {
      const nextFiles = await patientService.getFiles(patientId);
      const initialVisibleIds = nextFiles
        .filter((file) => isImageFile(file.type))
        .slice(0, 12)
        .map((file) => file.id);
      setVisibleImageIds(initialVisibleIds);
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
  }, [patientId]);

  useEffect(() => {
    void loadFiles();
  }, [loadFiles, refreshKey]);

  useEffect(() => {
    return () => {
      Object.values(imagePreviewUrlsRef.current).forEach((url) => {
        window.URL.revokeObjectURL(url);
      });
      Object.values(imageViewerUrlsRef.current).forEach((url) => {
        window.URL.revokeObjectURL(url);
      });
      if (pdfPreviewUrl) {
        window.URL.revokeObjectURL(pdfPreviewUrl);
      }
    };
  }, [pdfPreviewUrl]);

  const imageFiles = files.filter((file) => isImageFile(file.type));
  const lightboxSlides = imageFiles.map((file) => ({
    src: imageViewerUrls[file.id] ?? imagePreviewUrls[file.id],
    alt: file.name,
  }));

  useEffect(() => {
    const missingFiles = files.filter(
      (file) =>
        isImageFile(file.type) &&
        visibleImageIds.includes(file.id) &&
        !imagePreviewUrlsRef.current[file.id]
    );
    if (missingFiles.length === 0) {
      return;
    }

    let cancelled = false;

    const loadMissingPreviews = async () => {
      await Promise.all(
        missingFiles.map(async (file) => {
          try {
            let blob: Blob;
            try {
              blob = await patientService.getFileThumbnailBlob(file.id);
            } catch {
              blob = await patientService.getFileBlob(file.id);
            }

            const objectUrl = window.URL.createObjectURL(blob);
            if (cancelled) {
              window.URL.revokeObjectURL(objectUrl);
              return;
            }

            setImagePreviewUrls((current) => {
              const previousUrl = current[file.id];
              if (previousUrl && previousUrl !== objectUrl) {
                window.URL.revokeObjectURL(previousUrl);
              }

              const next = {
                ...current,
                [file.id]: objectUrl,
              };
              imagePreviewUrlsRef.current = next;
              return next;
            });
          } catch (err) {
            console.error(`Error cargando miniatura del archivo ${file.id}:`, err);
          }
        })
      );
    };

    void loadMissingPreviews();

    return () => {
      cancelled = true;
    };
  }, [files, visibleImageIds]);

  const handleImageVisible = useCallback((fileId: number) => {
    setVisibleImageIds((current) => (current.includes(fileId) ? current : [...current, fileId]));
  }, []);

  const ensureViewerOriginals = useCallback(async (startIndex: number) => {
    const targetIndexes = [startIndex, startIndex + 1].filter(
      (index) => index >= 0 && index < imageFiles.length
    );

    const missingFiles = targetIndexes
      .map((index) => imageFiles[index])
      .filter((file): file is PatientFile => Boolean(file))
      .filter((file) => !imageViewerUrlsRef.current[file.id] && !viewerLoadingIdsRef.current[file.id]);

    if (missingFiles.length === 0) {
      return;
    }

    missingFiles.forEach((file) => {
      viewerLoadingIdsRef.current[file.id] = true;
    });

    try {
      const loadedImages = await Promise.all(
        missingFiles.map(async (file) => ({
          fileId: file.id,
          url: window.URL.createObjectURL(await patientService.getFileBlob(file.id)),
        }))
      );

      const nextViewerUrls = {
        ...imageViewerUrlsRef.current,
      };

      loadedImages.forEach(({ fileId, url }) => {
        nextViewerUrls[fileId] = url;
      });

      imageViewerUrlsRef.current = nextViewerUrls;
      setImageViewerUrls(nextViewerUrls);
    } catch (err) {
      console.error('Error cargando imagen original del visor:', err);
      onErrorRef.current('No se pudo cargar la imagen completa');
    } finally {
      missingFiles.forEach((file) => {
        delete viewerLoadingIdsRef.current[file.id];
      });
    }
  }, [imageFiles]);

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
      const selectedIndex = imageFiles.findIndex((file) => file.id === selectedFile.id);
      const nextIndex = selectedIndex >= 0 ? selectedIndex : 0;
      setLightboxIndex(nextIndex);
      setLightboxOpen(true);
      await ensureViewerOriginals(nextIndex);
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

  const handleOpenUpload = () => {
    fileInputRef.current?.click();
  };

  const handleUploadChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    event.target.value = '';
    if (!selectedFile) {
      return;
    }

    setUploading(true);
    try {
      await patientService.uploadPatientFile(patientId, selectedFile);
      await loadFiles();
    } catch (err) {
      console.error('Error subiendo archivo del paciente:', err);
      onErrorRef.current('No se pudo subir el archivo');
    } finally {
      setUploading(false);
    }
  };

  const handleRequestDelete = (file: PatientFile) => {
    setDeleteTarget(file);
  };

  const handleCloseDeleteDialog = () => {
    if (deleting) {
      return;
    }
    setDeleteTarget(null);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) {
      return;
    }

    setDeleting(true);
    try {
      await patientService.deleteFile(deleteTarget.id);
      setDeleteTarget(null);
      await loadFiles();
    } catch (err) {
      console.error('Error eliminando archivo:', err);
      onErrorRef.current('No se pudo eliminar el archivo');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6">Archivos del Paciente</Typography>
            <Button variant="outlined" startIcon={<AddIcon />} size="small" onClick={handleOpenUpload} disabled={uploading}>
              Subir Archivo
            </Button>
          </Box>
          <input
            ref={fileInputRef}
            type="file"
            hidden
            accept=".jpg,.jpeg,.png,.pdf,.doc,.docx,application/pdf,image/jpeg,image/png,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={handleUploadChange}
          />
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
                  <Box sx={{ mr: 2, flexShrink: 0 }}>
                    <FileLeading
                      file={file}
                      previewUrl={imagePreviewUrls[file.id]}
                      onVisible={handleImageVisible}
                      onOpenPreview={() => {
                        if (isImageFile(file.type)) {
                          void handlePreviewImage(file);
                          return;
                        }

                        if (isPdfFile(file.type)) {
                          void handlePreviewPdf(file);
                        }
                      }}
                    />
                  </Box>
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
                    <Button size="small" onClick={() => handleDownloadFile(file)}>
                      Descargar
                    </Button>
                    <Button
                      size="small"
                      color="error"
                      startIcon={<DeleteIcon />}
                      onClick={() => handleRequestDelete(file)}
                    >
                      Eliminar
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
        on={{
          view: ({ index }) => {
            setLightboxIndex(index);
            void ensureViewerOriginals(index);
          },
        }}
        plugins={[Zoom]}
        zoom={{ maxZoomPixelRatio: 6, scrollToZoom: true }}
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
      <Dialog open={Boolean(deleteTarget)} onClose={handleCloseDeleteDialog} maxWidth="xs" fullWidth>
        <DialogTitle>Eliminar archivo</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Estás seguro de que deseas eliminar este archivo?
          </Typography>
          {deleteTarget ? (
            <Typography sx={{ mt: 1, fontWeight: 600 }}>
              {deleteTarget.name}
            </Typography>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog} disabled={deleting}>
            Cancelar
          </Button>
          <Button color="error" variant="contained" onClick={handleConfirmDelete} disabled={deleting}>
            {deleting ? 'Eliminando...' : 'Eliminar'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default memo(PatientFilesTabInner);
