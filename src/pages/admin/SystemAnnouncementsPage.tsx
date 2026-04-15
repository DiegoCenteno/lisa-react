import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import systemAnnouncementService, {
  type SystemAnnouncementFileItem,
  type SystemAnnouncementItem,
  type SystemAnnouncementPayload,
  type SystemAnnouncementStatus,
} from '../../api/systemAnnouncementService';

type AnnouncementFormState = {
  title: string;
  summary: string;
  body: string;
  status: SystemAnnouncementStatus;
  starts_at: string;
  ends_at: string;
  files: SystemAnnouncementFileItem[];
};

const EMPTY_FORM: AnnouncementFormState = {
  title: '',
  summary: '',
  body: '',
  status: 'draft',
  starts_at: '',
  ends_at: '',
  files: [],
};

const STATUS_LABELS: Record<SystemAnnouncementStatus, string> = {
  draft: 'Borrador',
  published: 'Publicada',
  archived: 'Archivada',
};

const STATUS_COLORS: Record<SystemAnnouncementStatus, 'default' | 'success' | 'warning'> = {
  draft: 'warning',
  published: 'success',
  archived: 'default',
};

function toInputDateTime(value?: string | null) {
  if (!value) return '';
  const date = new Date(String(value).replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) return '';

  const pad = (input: number) => String(input).padStart(2, '0');

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toPayload(form: AnnouncementFormState): SystemAnnouncementPayload {
  return {
    title: form.title.trim(),
    summary: form.summary.trim(),
    body: form.body.trim(),
    status: form.status,
    starts_at: form.starts_at || null,
    ends_at: form.ends_at || null,
    files: form.files.map((item, index) => ({
      file_id: item.file_id,
      kind: item.kind,
      sort_order: index,
    })),
  };
}

function getBackendErrorMessage(error: unknown): string | null {
  if (
    typeof error === 'object'
    && error !== null
    && 'response' in error
    && typeof (error as { response?: { data?: { message?: unknown } } }).response?.data?.message === 'string'
  ) {
    return String((error as { response?: { data?: { message?: string } } }).response?.data?.message);
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return null;
}

function formatDateTime(value?: string | null): string {
  if (!value) return 'Sin fecha';

  const date = new Date(String(value).replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) {
    return 'Sin fecha';
  }

  return date.toLocaleString('es-MX');
}

function isImageMimeType(value?: string | null): boolean {
  return value === 'image/jpeg' || value === 'image/png';
}

function isPdfMimeType(value?: string | null): boolean {
  return value === 'application/pdf';
}

function isPreviewableFile(file: SystemAnnouncementFileItem): boolean {
  return isImageMimeType(file.mime_type) || isPdfMimeType(file.mime_type);
}

export default function SystemAnnouncementsPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const previewUrlsRef = useRef<Record<number, string>>({});
  const [items, setItems] = useState<SystemAnnouncementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<AnnouncementFormState>(EMPTY_FORM);
  const [previewUrls, setPreviewUrls] = useState<Record<number, string>>({});
  const [previewFile, setPreviewFile] = useState<SystemAnnouncementFileItem | null>(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const loadItems = async () => {
    setLoading(true);
    try {
      const response = await systemAnnouncementService.list();
      setItems(response);
    } catch (loadError) {
      setError(getBackendErrorMessage(loadError) || 'No se pudieron cargar las noticias.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadItems();
  }, []);

  useEffect(() => {
    const imageFiles = form.files.filter((file) => file.type === 'image');
    const missingFiles = imageFiles.filter((file) => !previewUrlsRef.current[file.file_id]);
    let cancelled = false;

    const loadMissingPreviews = async () => {
      await Promise.all(
        missingFiles.map(async (file) => {
          try {
            let blob: Blob;
            try {
              blob = await systemAnnouncementService.getFileThumbnailBlob(file.file_id);
            } catch {
              blob = await systemAnnouncementService.getFileBlob(file.file_id);
            }

            const objectUrl = window.URL.createObjectURL(blob);
            if (cancelled) {
              window.URL.revokeObjectURL(objectUrl);
              return;
            }

            setPreviewUrls((current) => {
              const previousUrl = current[file.file_id];
              if (previousUrl && previousUrl !== objectUrl) {
                window.URL.revokeObjectURL(previousUrl);
              }

              const next = {
                ...current,
                [file.file_id]: objectUrl,
              };
              previewUrlsRef.current = next;
              return next;
            });
          } catch (previewError) {
            console.error(`Error cargando miniatura del archivo ${file.file_id}:`, previewError);
          }
        })
      );
    };

    if (missingFiles.length > 0) {
      void loadMissingPreviews();
    }

    return () => {
      cancelled = true;
    };
  }, [form.files]);

  useEffect(() => () => {
    Object.values(previewUrlsRef.current).forEach((url) => window.URL.revokeObjectURL(url));
  }, []);

  useEffect(() => {
    return () => {
      if (previewBlobUrl) {
        window.URL.revokeObjectURL(previewBlobUrl);
      }
    };
  }, [previewBlobUrl]);

  const sortedItems = useMemo(
    () => [...items].sort((a, b) => String(b.created_at ?? '').localeCompare(String(a.created_at ?? ''))),
    [items]
  );

  const handleEdit = (item: SystemAnnouncementItem) => {
    setEditingId(item.id);
    setSuccess(null);
    setError(null);
    setForm({
      title: item.title ?? '',
      summary: item.summary ?? '',
      body: item.body ?? '',
      status: item.status,
      starts_at: toInputDateTime(item.starts_at),
      ends_at: toInputDateTime(item.ends_at),
      files: item.files ?? [],
    });
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const handleUploadFiles = async (fileList: FileList | null) => {
    if (!fileList?.length) return;

    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      const uploadedItems = await Promise.all(
        Array.from(fileList).map((file) => systemAnnouncementService.uploadFile(file))
      );

      setForm((current) => ({
        ...current,
        files: [
          ...current.files,
          ...uploadedItems.map((item, index) => ({
            ...item,
            sort_order: current.files.length + index,
          })),
        ],
      }));
      setSuccess(uploadedItems.length === 1 ? 'Archivo adjuntado correctamente.' : 'Archivos adjuntados correctamente.');
    } catch (uploadError) {
      setError(getBackendErrorMessage(uploadError) || 'No se pudieron subir los archivos.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveFile = (fileId: number) => {
    const existingUrl = previewUrlsRef.current[fileId];
    if (existingUrl) {
      window.URL.revokeObjectURL(existingUrl);
    }

    if (previewFile?.file_id === fileId) {
      handleClosePreview();
    }

    setPreviewUrls((current) => {
      const next = { ...current };
      delete next[fileId];
      previewUrlsRef.current = next;
      return next;
    });

    setForm((current) => ({
      ...current,
      files: current.files
        .filter((item) => item.file_id !== fileId)
        .map((item, index) => ({ ...item, sort_order: index })),
    }));
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
    setError(null);
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

  const handleSubmit = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = toPayload(form);

      const saved = editingId
        ? await systemAnnouncementService.update(editingId, payload)
        : await systemAnnouncementService.create(payload);

      setItems((current) => {
        const exists = current.some((item) => item.id === saved.id);
        if (exists) {
          return current.map((item) => (item.id === saved.id ? saved : item));
        }
        return [saved, ...current];
      });

      setSuccess(editingId ? 'Noticia actualizada correctamente.' : 'Noticia creada correctamente.');
      resetForm();
    } catch (submitError) {
      setError(getBackendErrorMessage(submitError) || 'No se pudo guardar la noticia.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
          Noticias del sistema
        </Typography>
        <Typography color="text.secondary">
          Crea y administra comunicados para las nuevas funcionalidades del sistema.
        </Typography>
      </Box>

      {error ? <Alert severity="error">{error}</Alert> : null}
      {success ? <Alert severity="success">{success}</Alert> : null}

      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {editingId ? 'Editar noticia' : 'Nueva noticia'}
            </Typography>

            <TextField
              label="Título"
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              fullWidth
            />

            <TextField
              label="Resumen breve"
              value={form.summary}
              onChange={(event) => setForm((current) => ({ ...current, summary: event.target.value }))}
              fullWidth
            />

            <TextField
              label="Descripción"
              value={form.body}
              onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))}
              multiline
              minRows={5}
              fullWidth
            />

            <Stack spacing={1.25}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', sm: 'center' }}>
                <Button
                  variant="outlined"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading || saving}
                >
                  {uploading ? 'Subiendo archivos...' : 'Subir archivos'}
                </Button>
                <Typography color="text.secondary" sx={{ fontSize: '0.9rem' }}>
                  Adjunta imágenes o documentos para mostrarlos dentro de la noticia.
                </Typography>
              </Stack>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                hidden
                accept=".jpg,.jpeg,.png,.pdf,.doc,.docx"
                onChange={(event) => void handleUploadFiles(event.target.files)}
              />

              {form.files.length > 0 ? (
                <Stack spacing={1.5}>
                  {form.files.map((file) => (
                    <Card key={file.file_id} variant="outlined">
                      <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', md: 'center' }}>
                          {file.type === 'image' && previewUrls[file.file_id] ? (
                            <Box
                              component="img"
                              src={previewUrls[file.file_id]}
                              alt={file.name}
                              sx={{
                                width: 88,
                                height: 88,
                                objectFit: 'cover',
                                borderRadius: 1,
                                border: '1px solid',
                                borderColor: 'divider',
                              }}
                            />
                          ) : (
                            <Box
                              sx={{
                                width: 88,
                                height: 88,
                                borderRadius: 1,
                                border: '1px dashed',
                                borderColor: 'divider',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'text.secondary',
                                px: 1,
                                textAlign: 'center',
                                fontSize: '0.8rem',
                              }}
                            >
                              {file.mime_type.includes('pdf') ? 'PDF' : 'Archivo'}
                            </Box>
                          )}

                            <Stack spacing={0.75} sx={{ minWidth: 0, flex: 1 }}>
                              <Typography sx={{ fontWeight: 600 }}>
                                {file.name}
                              </Typography>
                              <Stack direction="row" spacing={1} flexWrap="wrap">
                                <Chip size="small" label={file.type === 'image' ? 'Imagen' : 'Archivo'} />
                                <Chip size="small" variant="outlined" label={`Orden ${file.sort_order + 1}`} />
                              </Stack>
                              <Button
                                variant="text"
                                sx={{ alignSelf: 'flex-start', px: 0, minWidth: 'auto', textTransform: 'none' }}
                                onClick={() => void handlePreviewFile(file)}
                              >
                                {isPreviewableFile(file) ? 'Ver archivo' : 'Descargar archivo'}
                              </Button>
                            </Stack>

                          <Button
                            variant="text"
                            color="error"
                            onClick={() => handleRemoveFile(file.file_id)}
                            disabled={saving}
                          >
                            Quitar
                          </Button>
                        </Stack>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              ) : null}
            </Stack>

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                select
                label="Estatus"
                value={form.status}
                onChange={(event) =>
                  setForm((current) => ({ ...current, status: event.target.value as SystemAnnouncementStatus }))
                }
                fullWidth
              >
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <MenuItem key={value} value={value}>
                    {label}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                label="Inicio de vigencia"
                type="datetime-local"
                value={form.starts_at}
                onChange={(event) => setForm((current) => ({ ...current, starts_at: event.target.value }))}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />

              <TextField
                label="Fin de vigencia"
                type="datetime-local"
                value={form.ends_at}
                onChange={(event) => setForm((current) => ({ ...current, ends_at: event.target.value }))}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Stack>

            <Stack direction="row" spacing={1.5}>
              <Button
                variant="contained"
                onClick={() => void handleSubmit()}
                disabled={saving || uploading || !form.title.trim() || !form.body.trim()}
              >
                {saving ? 'Guardando...' : editingId ? 'Actualizar noticia' : 'Crear noticia'}
              </Button>
              {(editingId || form.title || form.summary || form.body || form.files.length > 0) ? (
                <Button variant="text" color="inherit" onClick={resetForm} disabled={saving || uploading}>
                  Cancelar
                </Button>
              ) : null}
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Noticias registradas
            </Typography>

            {loading ? (
              <Box sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
                <CircularProgress />
              </Box>
            ) : sortedItems.length === 0 ? (
              <Typography color="text.secondary">
                Aún no hay noticias registradas.
              </Typography>
            ) : (
              <Stack spacing={2}>
                {sortedItems.map((item, index) => (
                  <Box key={item.id}>
                    {index > 0 ? <Divider sx={{ mb: 2 }} /> : null}
                    <Stack spacing={1.25}>
                      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                          {item.title}
                        </Typography>
                        <Chip
                          size="small"
                          label={STATUS_LABELS[item.status]}
                          color={STATUS_COLORS[item.status]}
                        />
                        <Chip
                          size="small"
                          variant="outlined"
                          label={`${item.read_count} lecturas`}
                        />
                      </Stack>

                      {item.summary ? (
                        <Typography color="text.secondary">
                          {item.summary}
                        </Typography>
                      ) : null}

                      {item.files.length > 0 ? (
                        <Stack direction="row" spacing={1} flexWrap="wrap">
                          {item.files.map((file) => (
                            <Chip
                              key={file.file_id}
                              size="small"
                              variant="outlined"
                              label={file.name}
                              clickable
                              onClick={() => void handlePreviewFile(file)}
                            />
                          ))}
                        </Stack>
                      ) : null}

                      <Typography sx={{ whiteSpace: 'pre-line' }}>
                        {item.body}
                      </Typography>

                      <Stack direction="row" spacing={2} flexWrap="wrap">
                        <Typography variant="body2" color="text.secondary">
                          Inicio: {formatDateTime(item.starts_at)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Fin: {formatDateTime(item.ends_at)}
                        </Typography>
                      </Stack>

                      <Box>
                        <Button size="small" variant="outlined" onClick={() => handleEdit(item)}>
                          Editar
                        </Button>
                      </Box>
                    </Stack>
                  </Box>
                ))}
              </Stack>
            )}
          </Stack>
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(previewFile)}
        onClose={handleClosePreview}
        fullWidth
        maxWidth="lg"
      >
        <DialogTitle>{previewFile?.name ?? 'Vista previa'}</DialogTitle>
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
                sx={{
                  width: '100%',
                  maxHeight: '75vh',
                  objectFit: 'contain',
                  display: 'block',
                  mx: 'auto',
                  borderRadius: 1,
                }}
              />
            ) : isPdfMimeType(previewFile.mime_type) ? (
              <Box
                component="iframe"
                src={previewBlobUrl}
                title={previewFile.name}
                sx={{
                  width: '100%',
                  height: '75vh',
                  border: 0,
                  borderRadius: 1,
                  backgroundColor: '#fff',
                }}
              />
            ) : null
          ) : (
            <Typography color="text.secondary">
              No se pudo generar la vista previa.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          {previewFile ? (
            <Button onClick={() => void handleDownloadFile(previewFile)}>
              Descargar
            </Button>
          ) : null}
          <Button variant="contained" onClick={handleClosePreview}>
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
