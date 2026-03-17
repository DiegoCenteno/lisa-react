import { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Chip,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Grid,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import type { LabelConfig } from '../../types';

const INITIAL_LABELS: LabelConfig[] = [
  {
    id: 1,
    medico_id: 1,
    name: 'Estudio de Papanicolaou',
    statuses: ['Enviada al patólogo', 'Pendiente revisión por el médico', 'Enviada al paciente'],
  },
  {
    id: 2,
    medico_id: 1,
    name: 'Estudio de Laboratorio',
    statuses: ['Solicitado', 'En proceso', 'Resultados disponibles', 'Revisado por médico'],
  },
  {
    id: 3,
    medico_id: 1,
    name: 'Ultrasonido',
    statuses: ['Programado', 'Realizado', 'Pendiente de interpretación', 'Interpretado'],
  },
];

const statusColors = [
  '#1565C0', '#00897B', '#FB8C00', '#43A047', '#E53935',
  '#7B1FA2', '#00ACC1', '#F4511E',
];

export default function SettingsPage() {
  const [labels, setLabels] = useState<LabelConfig[]>(INITIAL_LABELS);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLabel, setEditingLabel] = useState<LabelConfig | null>(null);
  const [formName, setFormName] = useState('');
  const [formStatuses, setFormStatuses] = useState<string[]>([]);
  const [newStatus, setNewStatus] = useState('');

  const handleOpenNew = () => {
    setEditingLabel(null);
    setFormName('');
    setFormStatuses([]);
    setNewStatus('');
    setDialogOpen(true);
  };

  const handleOpenEdit = (label: LabelConfig) => {
    setEditingLabel(label);
    setFormName(label.name);
    setFormStatuses([...label.statuses]);
    setNewStatus('');
    setDialogOpen(true);
  };

  const handleAddStatus = () => {
    if (newStatus.trim() && !formStatuses.includes(newStatus.trim())) {
      setFormStatuses([...formStatuses, newStatus.trim()]);
      setNewStatus('');
    }
  };

  const handleRemoveStatus = (index: number) => {
    setFormStatuses(formStatuses.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (!formName.trim() || formStatuses.length === 0) return;

    if (editingLabel) {
      setLabels(
        labels.map((l) =>
          l.id === editingLabel.id
            ? { ...l, name: formName, statuses: formStatuses }
            : l
        )
      );
    } else {
      const newLabel: LabelConfig = {
        id: labels.length + 1,
        medico_id: 1,
        name: formName,
        statuses: formStatuses,
      };
      setLabels([...labels, newLabel]);
    }
    setDialogOpen(false);
  };

  const handleDelete = (id: number) => {
    setLabels(labels.filter((l) => l.id !== id));
  };

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 3 }}>
        Configuración
      </Typography>

      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box>
              <Typography variant="h6">Etiquetas Configurables</Typography>
              <Typography variant="body2" color="text.secondary">
                Configura las etiquetas y sus estados para las notas de los pacientes
              </Typography>
            </Box>
            <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenNew}>
              Nueva Etiqueta
            </Button>
          </Box>

          <Divider sx={{ mb: 2 }} />

          {labels.length === 0 ? (
            <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
              No hay etiquetas configuradas
            </Typography>
          ) : (
            <List>
              {labels.map((label) => (
                <ListItem
                  key={label.id}
                  sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    mb: 1,
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                    <ListItemText
                      primary={label.name}
                      primaryTypographyProps={{ fontWeight: 600 }}
                    />
                    <ListItemSecondaryAction>
                      <IconButton size="small" onClick={() => handleOpenEdit(label)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleDelete(label.id)} color="error">
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 1 }}>
                    {label.statuses.map((status, idx) => (
                      <Chip
                        key={status}
                        label={status}
                        size="small"
                        sx={{
                          bgcolor: statusColors[idx % statusColors.length],
                          color: 'white',
                        }}
                      />
                    ))}
                  </Box>
                </ListItem>
              ))}
            </List>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingLabel ? 'Editar Etiqueta' : 'Nueva Etiqueta'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Nombre de la Etiqueta"
              fullWidth
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="Ej: Estudio de Papanicolaou"
            />

            <Typography variant="subtitle2">Estados</Typography>
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              {formStatuses.map((status, idx) => (
                <Chip
                  key={status}
                  label={status}
                  onDelete={() => handleRemoveStatus(idx)}
                  sx={{
                    bgcolor: statusColors[idx % statusColors.length],
                    color: 'white',
                    '& .MuiChip-deleteIcon': { color: 'rgba(255,255,255,0.7)' },
                  }}
                />
              ))}
            </Box>

            <Grid container spacing={1} alignItems="center">
              <Grid size={9}>
                <TextField
                  label="Nuevo Estado"
                  fullWidth
                  size="small"
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddStatus();
                    }
                  }}
                  placeholder="Ej: Enviada al patólogo"
                />
              </Grid>
              <Grid size={3}>
                <Button fullWidth variant="outlined" onClick={handleAddStatus}>
                  Agregar
                </Button>
              </Grid>
            </Grid>

            <Typography variant="caption" color="text.secondary">
              El orden de los estados representa el flujo de trabajo. Puedes agregar tantos estados como necesites.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSave} disabled={!formName.trim() || formStatuses.length === 0}>
            {editingLabel ? 'Guardar Cambios' : 'Crear Etiqueta'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
