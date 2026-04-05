import { memo, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Link,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { patientService } from '../../api/patientService';
import type { PatientTagControlData } from '../../types';

interface Props {
  patientId: number;
  patientTagControl: PatientTagControlData | null;
}

const tagStatusColorMap: Record<string, { bg: string; text: string }> = {
  'btn-primary': { bg: '#1e88e5', text: '#ffffff' },
  'btn-success': { bg: '#4caf50', text: '#ffffff' },
  'btn-danger': { bg: '#e53935', text: '#ffffff' },
  'btn-warning': { bg: '#ff9800', text: '#ffffff' },
  'btn-info': { bg: '#29b6f6', text: '#ffffff' },
  'btn-rose': { bg: '#e91e63', text: '#ffffff' },
  'btn-default': { bg: '#9e9e9e', text: '#ffffff' },
};

function getTagStatusBadgeSx(colorClass?: string) {
  const palette = tagStatusColorMap[colorClass ?? 'btn-default'] ?? tagStatusColorMap['btn-default'];

  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    px: 1.5,
    py: 0.7,
    borderRadius: 1,
    backgroundColor: palette.bg,
    color: palette.text,
    fontSize: '0.78rem',
    fontWeight: 700,
    lineHeight: 1.2,
    textTransform: 'uppercase',
    minHeight: 34,
  };
}

function getTagHistoryBadgeSx(colorClass?: string) {
  const palette = tagStatusColorMap[colorClass ?? 'btn-default'] ?? tagStatusColorMap['btn-default'];

  return {
    ...getTagStatusBadgeSx(colorClass),
    backgroundColor: palette.bg,
    color: '#cdcdcd',
    opacity: 0.68,
    px: 1.15,
    py: 0,
    minHeight: 24,
    fontSize: '0.72rem',
    lineHeight: 1,
  };
}

function getStatusButtonSx(colorClass?: string, active?: boolean) {
  const palette = tagStatusColorMap[colorClass ?? 'btn-default'] ?? tagStatusColorMap['btn-default'];

  return {
    textTransform: 'none',
    fontWeight: 700,
    borderRadius: 999,
    boxShadow: active ? '0 0 0 2px rgba(38,50,56,0.18)' : 'none',
    backgroundColor: palette.bg,
    color: palette.text,
    '&:hover': {
      backgroundColor: palette.bg,
      opacity: 0.92,
    },
  };
}

function getTagHistoryActorLabel(roleId?: number) {
  if (roleId === 1) return 'Observaciones del médico';
  if (roleId === 2) return 'Observaciones del asistente';
  return 'Observaciones';
}

function formatVisibleUntil(value?: string | null) {
  if (!value) return null;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(parsed);
}

function PatientTagsTabInner({ patientId, patientTagControl }: Props) {
  const navigate = useNavigate();
  const [tagControl, setTagControl] = useState<PatientTagControlData | null>(patientTagControl);
  const [newLabel, setNewLabel] = useState('');
  const [saving, setSaving] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [localSuccess, setLocalSuccess] = useState<string | null>(null);
  const [openTagIds, setOpenTagIds] = useState<number[]>([]);
  const [tagStatusSavingId, setTagStatusSavingId] = useState<number | null>(null);
  const [finalizeTag, setFinalizeTag] = useState<{ id: number; code: string } | null>(null);
  const [finalizingTagId, setFinalizingTagId] = useState<number | null>(null);

  useEffect(() => {
    setTagControl(patientTagControl);
  }, [patientTagControl]);

  const handleGoToSettings = () => {
    navigate('/configuracion?tab=etiquetas');
  };

  const refreshTagControl = async () => {
    const refreshed = await patientService.getPatientTagControl(patientId);
    setTagControl(refreshed);
  };

  const handleCreateLabel = async () => {
    const trimmedLabel = newLabel.trim();
    if (!trimmedLabel) return;

    setSaving(true);
    setLocalError(null);
    setLocalSuccess(null);

    try {
      const createdLabel = await patientService.createOfficeLabel(trimmedLabel);
      const updated = await patientService.updatePatientTagStatuses(
        patientId,
        [],
        { officeLabelIds: [createdLabel.id] }
      );
      setTagControl(updated);
      setNewLabel('');
      setLocalSuccess('Etiqueta agregada correctamente.');
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : 'No fue posible agregar la etiqueta.');
      try {
        await refreshTagControl();
      } catch {
        // noop
      }
    } finally {
      setSaving(false);
    }
  };

  const handleToggleTagStatuses = (tagId: number) => {
    setOpenTagIds((current) =>
      current.includes(tagId) ? current.filter((id) => id !== tagId) : [...current, tagId]
    );
  };

  const handleSelectStatus = async (tagId: number, statusId: number) => {
    setTagStatusSavingId(tagId);
    setLocalError(null);
    setLocalSuccess(null);

    try {
      const updated = await patientService.updatePatientTagStatuses(patientId, [
        { tag_id: tagId, status_id: statusId },
      ]);
      setTagControl(updated);
      setOpenTagIds((current) => current.filter((id) => id !== tagId));
      setLocalSuccess('Estatus de etiqueta actualizado correctamente.');
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : 'No se pudo actualizar el estatus de la etiqueta.');
    } finally {
      setTagStatusSavingId(null);
    }
  };

  const handleConfirmFinalizeTag = async () => {
    if (!finalizeTag) return;

    setFinalizingTagId(finalizeTag.id);
    setLocalError(null);
    setLocalSuccess(null);

    try {
      const updated = await patientService.finalizePatientTag(patientId, finalizeTag.id);
      setTagControl(updated);
      setFinalizeTag(null);
      setOpenTagIds((current) => current.filter((id) => id !== finalizeTag.id));
      setLocalSuccess('Etiqueta finalizada correctamente.');
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : 'No se pudo finalizar la etiqueta.');
    } finally {
      setFinalizingTagId(null);
    }
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 1.5 }}>
          Etiquetas
        </Typography>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
          Para agregar estados a las etiquetas puedes configurarlos desde{' '}
          <Link
            component="button"
            type="button"
            underline="always"
            onClick={handleGoToSettings}
            sx={{ color: '#d32f2f', fontWeight: 700 }}
          >
            aquí
          </Link>.
        </Typography>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) auto' },
            gap: 2,
            alignItems: 'end',
            mb: 3,
          }}
        >
          <TextField
            fullWidth
            label="Nueva etiqueta"
            value={newLabel}
            disabled={saving}
            onChange={(event) => setNewLabel(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                void handleCreateLabel();
              }
            }}
          />
          <Button
            variant="contained"
            onClick={() => void handleCreateLabel()}
            disabled={saving || !newLabel.trim()}
          >
            Agregar etiqueta
          </Button>
        </Box>

        {localError ? <Alert severity="error" sx={{ mb: 2 }}>{localError}</Alert> : null}
        {localSuccess ? <Alert severity="success" sx={{ mb: 2 }}>{localSuccess}</Alert> : null}

        {!tagControl ? (
          <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
            No se pudo cargar el histórico de etiquetas.
          </Typography>
        ) : tagControl.tags.length === 0 ? (
          <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
            Este paciente no tiene etiquetas registradas.
          </Typography>
        ) : (
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: 72 }}>#</TableCell>
                  <TableCell>Información</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {tagControl.tags.map((tag, index) => {
                  const tagHistory = [...(tag.history ?? [])].reverse();
                  const visibleUntilLabel = formatVisibleUntil(tag.visible_until);
                  const isOpen = openTagIds.includes(tag.id);
                  const availableStatuses = tagControl.statuses.filter(
                    (status) => status.code !== tag.current_status.code
                  );

                  return (
                    <TableRow key={tag.id} hover>
                      <TableCell sx={{ color: 'text.secondary', verticalAlign: 'top' }}>
                        {index + 1}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                          <Typography
                            variant="h6"
                            sx={{
                              color: '#177b26',
                              fontWeight: 700,
                              fontSize: { xs: '1.1rem', md: '1.35rem' },
                            }}
                          >
                            {tag.code}{' '}
                            {tag.created_at_label ? (
                              <Box component="span" sx={{ fontWeight: 500, fontSize: '0.9em' }}>
                                {tag.created_at_label}
                              </Box>
                            ) : null}
                          </Typography>

                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                            <Typography variant="body1" sx={{ color: 'text.secondary' }}>
                              Estatus actual:
                            </Typography>
                            <Chip
                              label={tag.current_status.code || 'Indefinido'}
                              size="small"
                              onClick={() => handleToggleTagStatuses(tag.id)}
                              clickable
                              sx={{
                                fontWeight: 700,
                                cursor: 'pointer',
                                boxShadow: isOpen ? '0 0 0 2px rgba(38,50,56,0.16)' : 'none',
                                color:
                                  tagStatusColorMap[tag.current_status.color_class]?.text ??
                                  tagStatusColorMap['btn-default'].text,
                                backgroundColor:
                                  tagStatusColorMap[tag.current_status.color_class]?.bg ??
                                  tagStatusColorMap['btn-default'].bg,
                              }}
                            />
                          </Box>

                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                            {isOpen
                              ? availableStatuses.map((status) => (
                                <Button
                                  key={status.id}
                                  size="small"
                                  variant="contained"
                                  onClick={() => void handleSelectStatus(tag.id, status.id)}
                                  disabled={tagStatusSavingId === tag.id}
                                  sx={getStatusButtonSx(status.color_class, tag.current_status.code === status.code)}
                                >
                                  {status.code}
                                </Button>
                              ))
                              : null}
                          </Box>

                          {visibleUntilLabel ? (
                            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                              Visible hasta: <Box component="span" sx={{ fontWeight: 700 }}>{visibleUntilLabel}</Box>
                            </Typography>
                          ) : null}

                          <Box sx={{ border: '1px solid #d8e8ef', borderRadius: 2, px: 1.5, py: 1.25 }}>
                            <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 700, mb: 1 }}>
                              Históricos de cambio de estatus de las etiquetas:
                            </Typography>

                            {tagHistory.length === 0 ? (
                              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                No hay cambios registrados para esta etiqueta.
                              </Typography>
                            ) : (
                              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                              {tagHistory.map((entry, historyIndex) => (
                                <Box
                                  key={`${tag.id}-${historyIndex}-${entry.date ?? 'sin-fecha'}-${entry.code ?? 'sin-codigo'}`}
                                  sx={{
                                    pt: historyIndex === 0 ? 0 : 1.25,
                                    borderTop: historyIndex === 0 ? 'none' : '1px solid',
                                    borderColor: 'divider',
                                  }}
                                >
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                      {entry.date || 'Sin fecha'}
                                    </Typography>
                                    <Box component="span" sx={getTagHistoryBadgeSx(entry.color)}>
                                      {entry.code || 'Indefinido'}
                                    </Box>
                                  </Box>
                                  <Typography variant="body2" sx={{ mt: 0.75 }}>
                                    <Box component="span" sx={{ fontWeight: 600 }}>
                                      {getTagHistoryActorLabel(entry.rol_id)}:
                                    </Box>{' '}
                                    {entry.note?.trim() || 'Sin observaciones'}
                                  </Typography>
                                </Box>
                              ))}
                              </Box>
                            )}
                          </Box>

                          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <Button
                              variant="text"
                              color="error"
                              sx={{ px: 0, minWidth: 'auto' }}
                              onClick={() => setFinalizeTag({ id: tag.id, code: tag.code })}
                              disabled={finalizingTagId === tag.id}
                            >
                              finalizar etiqueta
                            </Button>
                          </Box>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </CardContent>
      <Dialog
        open={Boolean(finalizeTag)}
        onClose={() => {
          if (!finalizingTagId) {
            setFinalizeTag(null);
          }
        }}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>
          Finalizar etiqueta
          {finalizeTag ? (
            <Typography component="div" sx={{ mt: 0.75, fontWeight: 700, color: '#5f6f7a', fontSize: '0.9rem' }}>
              {finalizeTag.code}
            </Typography>
          ) : null}
        </DialogTitle>
        <DialogContent dividers>
          <Typography>
            Si finalizas la etiqueta cambiará su estado a inactiva y ya no podrás asignarle
            ningún estado. ¿Continuar?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFinalizeTag(null)} disabled={Boolean(finalizingTagId)}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => void handleConfirmFinalizeTag()}
            disabled={Boolean(finalizingTagId)}
          >
            {finalizingTagId ? 'Finalizando...' : 'Sí, finalizar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}

export default memo(PatientTagsTabInner);


