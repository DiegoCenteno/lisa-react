import { memo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import type { PatientTagControlData } from '../../types';

interface Props {
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

function getTagHistoryActorLabel(roleId?: number) {
  if (roleId === 1) return 'Observaciones del m\u00e9dico';
  if (roleId === 2) return 'Observaciones del asistente';
  return 'Observaciones';
}

function PatientTagsTabInner({ patientTagControl }: Props) {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2.5 }}>
          Etiquetas
        </Typography>

        {!patientTagControl ? (
          <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
            No se pudo cargar el hist\u00f3rico de etiquetas.
          </Typography>
        ) : patientTagControl.tags.length === 0 ? (
          <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
            Este paciente no tiene etiquetas registradas.
          </Typography>
        ) : (
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: 72 }}>#</TableCell>
                  <TableCell>Informaci\u00f3n</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {patientTagControl.tags.map((tag, index) => {
                  const tagHistory = [...(tag.history ?? [])].reverse();

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
                            <Box component="span" sx={getTagStatusBadgeSx(tag.current_status.color_class)}>
                              {tag.current_status.code || 'Indefinido'}
                            </Box>
                          </Box>

                          <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 700 }}>
                            Hist\u00f3ricos de cambio de estatus de las etiquetas:
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
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </CardContent>
    </Card>
  );
}

export default memo(PatientTagsTabInner);
