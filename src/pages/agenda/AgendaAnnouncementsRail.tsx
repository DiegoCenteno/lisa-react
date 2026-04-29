import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Close as CloseIcon,
} from '@mui/icons-material';
import systemAnnouncementService, {
  type SystemAnnouncementFileItem,
  type SystemAnnouncementItem,
} from '../../api/systemAnnouncementService';

type AgendaAnnouncementsRailProps = {
  collapsed: boolean;
  onToggle: () => void;
};

function isAnnouncementNew(item: SystemAnnouncementItem): boolean {
  if (!item.read_at) {
    return true;
  }

  const firstReadAt = new Date(item.read_at).getTime();
  if (Number.isNaN(firstReadAt)) {
    return true;
  }

  return Date.now() - firstReadAt <= 24 * 60 * 60 * 1000;
}

function isImageMimeType(mimeType?: string | null): boolean {
  return String(mimeType ?? '').toLowerCase().startsWith('image/');
}

function isPdfMimeType(mimeType?: string | null): boolean {
  return String(mimeType ?? '').toLowerCase().includes('pdf');
}

function isPreviewableFile(file: SystemAnnouncementFileItem): boolean {
  return isImageMimeType(file.mime_type) || isPdfMimeType(file.mime_type);
}

function getBackendErrorMessage(error: unknown): string {
  if (
    typeof error === 'object'
    && error !== null
    && 'response' in error
    && typeof (error as { response?: { data?: { message?: unknown } } }).response?.data?.message === 'string'
  ) {
    return (error as { response: { data: { message: string } } }).response.data.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'No se pudieron cargar las noticias.';
}

export default function AgendaAnnouncementsRail({ collapsed, onToggle }: AgendaAnnouncementsRailProps) {
  const previewUrlsRef = useRef<Record<number, string>>({});
  const autoCollapsedRef = useRef(false);
  const [items, setItems] = useState<SystemAnnouncementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewUrls, setPreviewUrls] = useState<Record<number, string>>({});
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<SystemAnnouncementItem | null>(null);
  const [previewFile, setPreviewFile] = useState<SystemAnnouncementFileItem | null>(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    let active = true;

    const loadAnnouncements = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await systemAnnouncementService.listSidebar();
        if (!active) return;
        setItems(response);
      } catch (loadError) {
        if (!active) return;
        setError(getBackendErrorMessage(loadError));
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadAnnouncements();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const imageFiles = items
      .flatMap((item) => item.files)
      .filter((file) => file.type === 'image');

    const missingFiles = imageFiles.filter((file) => !previewUrlsRef.current[file.file_id]);
    if (!missingFiles.length) {
      return;
    }

    let cancelled = false;

    const loadMissingPreviews = async () => {
      const nextEntries: Record<number, string> = {};

      await Promise.all(missingFiles.map(async (file) => {
        try {
          const blob = await systemAnnouncementService.getFileBlob(file.file_id);
          nextEntries[file.file_id] = window.URL.createObjectURL(blob);
        } catch (previewError) {
          console.error(`Error cargando imagen del archivo ${file.file_id}:`, previewError);
        }
      }));

      if (cancelled || !Object.keys(nextEntries).length) {
        Object.values(nextEntries).forEach((url) => window.URL.revokeObjectURL(url));
        return;
      }

      setPreviewUrls((current) => {
        const next = { ...current, ...nextEntries };
        previewUrlsRef.current = next;
        return next;
      });
    };

    void loadMissingPreviews();

    return () => {
      cancelled = true;
    };
  }, [items]);

  useEffect(() => {
    const hasVisibleAnnouncements = items.some((item) => isAnnouncementNew(item));

    if (!autoCollapsedRef.current && !loading && !collapsed && !error && !hasVisibleAnnouncements) {
      autoCollapsedRef.current = true;
      onToggle();
    }
  }, [collapsed, error, items, loading, onToggle]);

  useEffect(() => () => {
    Object.values(previewUrlsRef.current).forEach((url) => window.URL.revokeObjectURL(url));
    if (previewBlobUrl) {
      window.URL.revokeObjectURL(previewBlobUrl);
    }
  }, [previewBlobUrl]);

  const handleSelectAnnouncement = async (item: SystemAnnouncementItem) => {
    setSelectedAnnouncement(item);

    if (item.read_at) {
      return;
    }

    try {
      await systemAnnouncementService.markRead(item.id);
      setItems((current) => current.map((entry) => (
        entry.id === item.id
          ? { ...entry, read_at: new Date().toISOString() }
          : entry
      )));
    } catch (markError) {
      console.error('Error marcando noticia como leída:', markError);
    }
  };

  const handleDownloadFile = async (file: SystemAnnouncementFileItem) => {
    try {
      await systemAnnouncementService.downloadFile(file.file_id, file.name);
    } catch (downloadError) {
      setError(getBackendErrorMessage(downloadError) || 'No se pudo descargar el archivo.');
    }
  };

  const handlePreviewFile = async (file: SystemAnnouncementFileItem) => {
    if (!isPreviewableFile(file)) {
      await handleDownloadFile(file);
      return;
    }

    setPreviewLoading(true);
    setPreviewFile(file);

    if (previewBlobUrl) {
      window.URL.revokeObjectURL(previewBlobUrl);
      setPreviewBlobUrl(null);
    }

    try {
      const blob = await systemAnnouncementService.getFileBlob(file.file_id);
      const objectUrl = window.URL.createObjectURL(blob);
      setPreviewBlobUrl(objectUrl);
    } catch (previewError) {
      console.error('Error cargando vista previa del archivo:', previewError);
      setError(getBackendErrorMessage(previewError) || 'No se pudo cargar la vista previa del archivo.');
      setPreviewFile(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleClosePreview = () => {
    if (previewBlobUrl) {
      window.URL.revokeObjectURL(previewBlobUrl);
    }

    setPreviewBlobUrl(null);
    setPreviewFile(null);
    setPreviewLoading(false);
  };

  const getAnnouncementPreviewUrl = (file: SystemAnnouncementFileItem | undefined): string | null => {
    if (!file) {
      return null;
    }

    return previewUrls[file.file_id] ?? null;
  };

  const handleToggleClick = (event: ReactMouseEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    onToggle();
  };

  const renderCollapsedHandle = () => (
    <Tooltip title={collapsed ? 'Mostrar noticias' : 'Ocultar noticias'} placement="left">
      <Box
        sx={{
          width: 36,
          minHeight: 420,
          borderRadius: 2.5,
          border: '1px solid #d8dde2',
          backgroundColor: '#f1f3f5',
          boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.55)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'sticky',
          top: 20,
        }}
      >
        <Box
          role="button"
          tabIndex={0}
          onClick={handleToggleClick}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              event.stopPropagation();
              onToggle();
            }
          }}
          sx={{
            width: '100%',
            height: '100%',
            borderRadius: 2.5,
            color: '#66727c',
            writingMode: 'vertical-rl',
            textOrientation: 'mixed',
            letterSpacing: '0.28em',
            fontWeight: 700,
            fontSize: '0.76rem',
            py: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            userSelect: 'none',
          }}
        >
          ACTUALIZACIONES
        </Box>
      </Box>
    </Tooltip>
  );

  if (collapsed) {
    return renderCollapsedHandle();
  }

  return (
    <>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: '32px minmax(0, 1fr)',
          gap: 0,
          alignItems: 'start',
          position: 'sticky',
          top: 16,
        }}
      >
        {renderCollapsedHandle()}

        <Box
          sx={{
            borderTopLeftRadius: 0,
            borderBottomLeftRadius: 0,
            borderTopRightRadius: 3,
            borderBottomRightRadius: 3,
            overflow: 'hidden',
            borderTop: '1px solid #d7e7ee',
            borderRight: '1px solid #d7e7ee',
            borderBottom: '1px solid #d7e7ee',
            borderLeft: 'none',
            backgroundColor: '#ffffff',
            boxShadow: '0 18px 40px rgba(19, 52, 77, 0.08)',
            minHeight: 520,
          }}
        >
          <Box
            sx={{
              px: 2.5,
              py: 2,
              borderBottom: '1px solid #e1eef2',
              background: 'linear-gradient(135deg, #4faee9 0%, #8fd5ff 100%)',
              color: '#ffffff',
            }}
          >
            <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1.5}>
              <Box>
                <Typography sx={{ fontSize: '1.45rem', fontWeight: 800, lineHeight: 1.05 }}>
                  Actualizaciones recientes
                </Typography>
                <Typography sx={{ mt: 0.8, fontSize: '0.92rem', opacity: 0.92 }}>
                  Conoce cambios recientes y herramientas nuevas del sistema.
                </Typography>
              </Box>
            </Stack>
          </Box>

          <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {loading ? (
              <Box sx={{ py: 8, display: 'flex', justifyContent: 'center' }}>
                <CircularProgress size={28} />
              </Box>
            ) : error ? (
              <Alert severity="error">{error}</Alert>
            ) : !items.length ? (
              <Alert severity="info">Por ahora no hay noticias publicadas.</Alert>
            ) : (
              items.map((item) => {
                const coverImage = item.files.find((file) => file.type === 'image');
                const hasPreview = coverImage ? previewUrls[coverImage.file_id] : null;

                return (
                  <Box
                    key={item.id}
                    sx={{
                      py: 0.25,
                      borderBottom: '1px solid #ebf0f3',
                    }}
                  >
                    <Stack spacing={1.1}>
                      <Stack direction="row" spacing={1} alignItems="flex-start" justifyContent="space-between">
                        <Box sx={{ minWidth: 0 }}>
                          <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap' }}>
                            <Typography sx={{ fontWeight: 800, fontSize: '1rem', color: '#1d2d35', lineHeight: 1.2 }}>
                              {item.title}
                            </Typography>
                            {isAnnouncementNew(item) ? (
                              <Chip
                                label="Nueva"
                                size="small"
                                sx={{
                                  backgroundColor: '#ff4d5e',
                                  color: '#ffffff',
                                  fontWeight: 800,
                                  height: 22,
                                  '& .MuiChip-label': {
                                    px: 1,
                                  },
                                }}
                              />
                            ) : null}
                          </Stack>
                        </Box>
                      </Stack>

                      {item.starts_at ? (
                        <Typography sx={{ fontSize: '0.76rem', color: '#68808d' }}>
                          Publicado desde {new Date(item.starts_at).toLocaleDateString('es-MX')}
                        </Typography>
                      ) : null}

                      <Typography sx={{ fontSize: '0.92rem', color: '#425763' }}>
                        {item.summary || item.body.slice(0, 150)}
                      </Typography>

                      {hasPreview ? (
                        <Box
                          component="img"
                          src={hasPreview}
                          alt={coverImage?.name ?? item.title}
                          onClick={() => void handleSelectAnnouncement(item)}
                          sx={{
                            width: '100%',
                            borderRadius: 1.5,
                            objectFit: 'cover',
                            maxHeight: 182,
                            cursor: 'pointer',
                          }}
                        />
                      ) : null}

                      <Button
                        variant="text"
                        onClick={() => void handleSelectAnnouncement(item)}
                        sx={{
                          alignSelf: 'flex-start',
                          textTransform: 'none',
                          fontWeight: 700,
                          px: 0,
                          minWidth: 'auto',
                        }}
                      >
                        Ver detalles
                      </Button>
                    </Stack>
                  </Box>
                );
              })
            )}
          </Box>
        </Box>
      </Box>

      <Dialog
        open={Boolean(selectedAnnouncement)}
        onClose={() => {
          setSelectedAnnouncement(null);
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>{selectedAnnouncement?.title ?? 'Noticia del sistema'}</DialogTitle>
        <DialogContent dividers>
          {selectedAnnouncement ? (
            <Stack spacing={2}>
              {(() => {
                const imageFiles = selectedAnnouncement.files.filter((file) => file.type === 'image');
                const firstImage = imageFiles[0];
                const remainingImages = imageFiles.slice(1);
                const firstImageUrl = getAnnouncementPreviewUrl(firstImage);
                const descriptionText = selectedAnnouncement.body ?? '';

                return (
                  <>
              {selectedAnnouncement.summary ? (
                <Typography sx={{ fontSize: '1rem', color: '#47606d', fontWeight: 500 }}>
                  {selectedAnnouncement.summary}
                </Typography>
              ) : null}

                    {firstImage && firstImageUrl ? (
                      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                        <Box
                          component="img"
                          src={firstImageUrl}
                          alt={firstImage.name}
                          onClick={() => void handlePreviewFile(firstImage)}
                          sx={{
                            width: '80%',
                            maxWidth: '100%',
                            maxHeight: 340,
                            objectFit: 'contain',
                            borderRadius: 2,
                            cursor: 'pointer',
                          }}
                        />
                      </Box>
                    ) : null}

                    <Box>
                      <Typography sx={{ whiteSpace: 'pre-wrap', color: '#243944' }}>
                        {descriptionText}
                      </Typography>
                    </Box>

                    {remainingImages.length ? (
                      <Stack spacing={1.5}>
                        {remainingImages.map((file) => {
                          const imageUrl = getAnnouncementPreviewUrl(file);
                          if (!imageUrl) {
                            return null;
                          }

                          return (
                            <Box key={file.id} sx={{ display: 'flex', justifyContent: 'center' }}>
                              <Box
                                component="img"
                                src={imageUrl}
                                alt={file.name}
                                onClick={() => void handlePreviewFile(file)}
                                sx={{
                                  width: '80%',
                                  maxWidth: '100%',
                                  maxHeight: 320,
                                  objectFit: 'contain',
                                  borderRadius: 2,
                                  cursor: 'pointer',
                                }}
                              />
                            </Box>
                          );
                        })}
                      </Stack>
                    ) : null}

                    {selectedAnnouncement.files.some((file) => file.type !== 'image') ? (
                      <Stack spacing={1}>
                        {selectedAnnouncement.files
                          .filter((file) => file.type !== 'image')
                          .map((file) => (
                            <Button
                              key={file.id}
                              variant="text"
                              onClick={() => void handlePreviewFile(file)}
                              sx={{ alignSelf: 'flex-start', px: 0, minWidth: 'auto', textTransform: 'none' }}
                            >
                              {isPreviewableFile(file) ? `Ver ${file.name}` : `Descargar ${file.name}`}
                            </Button>
                          ))}
                      </Stack>
                    ) : null}
                  </>
                );
              })()}
            </Stack>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button
            variant="contained"
            onClick={() => {
              setSelectedAnnouncement(null);
            }}
          >
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(previewFile)}
        onClose={handleClosePreview}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
          <Typography component="span" sx={{ fontWeight: 700 }}>
            {previewFile?.name ?? 'Vista previa'}
          </Typography>
          <IconButton onClick={handleClosePreview}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {previewLoading ? (
            <Box sx={{ py: 8, display: 'flex', justifyContent: 'center' }}>
              <CircularProgress />
            </Box>
          ) : previewFile && previewBlobUrl ? (
            isImageMimeType(previewFile.mime_type) ? (
              <Box
                component="img"
                src={previewBlobUrl}
                alt={previewFile.name}
                sx={{ width: '100%', borderRadius: 1.5 }}
              />
            ) : isPdfMimeType(previewFile.mime_type) ? (
              <Box
                component="iframe"
                src={previewBlobUrl}
                title={previewFile.name}
                sx={{ width: '100%', height: '70vh', border: 0 }}
              />
            ) : (
              <Alert severity="info">Este archivo no tiene vista previa embebida.</Alert>
            )
          ) : (
            <Alert severity="warning">No se pudo cargar la vista previa.</Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={handleClosePreview}>
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
