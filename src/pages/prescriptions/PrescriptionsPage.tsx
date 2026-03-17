import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Divider,
  Skeleton,
} from '@mui/material';
import {
  Add as AddIcon,
  Print as PrintIcon,
  Delete as DeleteIcon,
  Description as PrescriptionIcon,
} from '@mui/icons-material';
import { prescriptionService } from '../../api/prescriptionService';
import type { Prescription, PrescriptionMedication } from '../../types';

export default function PrescriptionsPage() {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newPrescription, setNewPrescription] = useState({
    diagnosis: '',
    notes: '',
    medications: [{ name: '', dosage: '', frequency: '', duration: '', instructions: '' }] as PrescriptionMedication[],
  });

  useEffect(() => {
    const loadPrescriptions = async () => {
      try {
        const data = await prescriptionService.getPrescriptions();
        setPrescriptions(data);
      } catch (err) {
        console.error('Error cargando recetas:', err);
      } finally {
        setLoading(false);
      }
    };
    loadPrescriptions();
  }, []);

  const addMedication = () => {
    setNewPrescription({
      ...newPrescription,
      medications: [
        ...newPrescription.medications,
        { name: '', dosage: '', frequency: '', duration: '', instructions: '' },
      ],
    });
  };

  const removeMedication = (index: number) => {
    setNewPrescription({
      ...newPrescription,
      medications: newPrescription.medications.filter((_, i) => i !== index),
    });
  };

  const updateMedication = (index: number, field: keyof PrescriptionMedication, value: string) => {
    const updated = [...newPrescription.medications];
    updated[index] = { ...updated[index], [field]: value };
    setNewPrescription({ ...newPrescription, medications: updated });
  };

  const handleCreate = async () => {
    try {
      const prescription = await prescriptionService.createPrescription({
        patient_id: 1,
        medico_id: 1,
        ...newPrescription,
      });
      setPrescriptions([prescription, ...prescriptions]);
      setDialogOpen(false);
      setNewPrescription({
        diagnosis: '',
        notes: '',
        medications: [{ name: '', dosage: '', frequency: '', duration: '', instructions: '' }],
      });
    } catch (err) {
      console.error('Error creando receta:', err);
    }
  };

  const handlePrint = (prescription: Prescription) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Receta Médica - LisaMedic</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
            .header { text-align: center; border-bottom: 2px solid #00897B; padding-bottom: 16px; margin-bottom: 24px; }
            .header h1 { color: #00897B; margin: 0; }
            .header p { color: #666; margin: 4px 0; }
            .patient { margin-bottom: 24px; }
            .medication { border: 1px solid #ddd; border-radius: 8px; padding: 12px; margin-bottom: 12px; }
            .medication h3 { margin: 0 0 8px; color: #00897B; }
            .medication p { margin: 4px 0; font-size: 14px; }
            .footer { margin-top: 48px; text-align: center; border-top: 1px solid #ddd; padding-top: 24px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>LisaMedic</h1>
            <p>Receta Médica</p>
            <p>Fecha: ${prescription.date}</p>
          </div>
          <div class="patient">
            <strong>Paciente:</strong> ${prescription.patient?.name ?? ''} ${prescription.patient?.last_name ?? ''}
          </div>
          <div>
            <strong>Diagnóstico:</strong> ${prescription.diagnosis ?? ''}
          </div>
          <h2>Medicamentos</h2>
          ${prescription.medications.map((med) => `
            <div class="medication">
              <h3>${med.name}</h3>
              <p><strong>Dosis:</strong> ${med.dosage}</p>
              <p><strong>Frecuencia:</strong> ${med.frequency}</p>
              <p><strong>Duración:</strong> ${med.duration}</p>
              ${med.instructions ? `<p><strong>Instrucciones:</strong> ${med.instructions}</p>` : ''}
            </div>
          `).join('')}
          ${prescription.notes ? `<p><strong>Notas:</strong> ${prescription.notes}</p>` : ''}
          <div class="footer">
            <p>___________________________</p>
            <p>Firma del Médico</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Recetas Médicas</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
          Nueva Receta
        </Button>
      </Box>

      {loading ? (
        <>
          {[1, 2].map((i) => (
            <Skeleton key={i} height={200} sx={{ mb: 2 }} />
          ))}
        </>
      ) : prescriptions.length === 0 ? (
        <Card>
          <CardContent>
            <Typography color="text.secondary" sx={{ textAlign: 'center', py: 8 }}>
              No hay recetas registradas
            </Typography>
          </CardContent>
        </Card>
      ) : (
        prescriptions.map((prescription) => (
          <Card key={prescription.id} sx={{ mb: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PrescriptionIcon color="primary" />
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      {prescription.patient?.name} {prescription.patient?.last_name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {prescription.date}
                    </Typography>
                  </Box>
                </Box>
                <Button
                  variant="outlined"
                  startIcon={<PrintIcon />}
                  size="small"
                  onClick={() => handlePrint(prescription)}
                >
                  Imprimir
                </Button>
              </Box>

              {prescription.diagnosis && (
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Diagnóstico:</strong> {prescription.diagnosis}
                </Typography>
              )}

              <Divider sx={{ my: 1.5 }} />

              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Medicamentos:
              </Typography>
              <Grid container spacing={1}>
                {prescription.medications.map((med, idx) => (
                  <Grid key={idx} size={{ xs: 12, sm: 6 }}>
                    <Box
                      sx={{
                        p: 1.5,
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                      }}
                    >
                      <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main' }}>
                        {med.name}
                      </Typography>
                      <Typography variant="caption" component="div">
                        Dosis: {med.dosage} | {med.frequency}
                      </Typography>
                      <Typography variant="caption" component="div">
                        Duración: {med.duration}
                      </Typography>
                      {med.instructions && (
                        <Chip label={med.instructions} size="small" sx={{ mt: 0.5 }} />
                      )}
                    </Box>
                  </Grid>
                ))}
              </Grid>

              {prescription.notes && (
                <Typography variant="body2" sx={{ mt: 1.5, color: 'text.secondary' }}>
                  <strong>Notas:</strong> {prescription.notes}
                </Typography>
              )}
            </CardContent>
          </Card>
        ))
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Nueva Receta Médica</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Diagnóstico"
              fullWidth
              value={newPrescription.diagnosis}
              onChange={(e) => setNewPrescription({ ...newPrescription, diagnosis: e.target.value })}
            />

            <Typography variant="subtitle2">Medicamentos</Typography>
            {newPrescription.medications.map((med, idx) => (
              <Box key={idx} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    Medicamento {idx + 1}
                  </Typography>
                  {newPrescription.medications.length > 1 && (
                    <IconButton size="small" onClick={() => removeMedication(idx)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  )}
                </Box>
                <Grid container spacing={1}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="Nombre"
                      fullWidth
                      size="small"
                      value={med.name}
                      onChange={(e) => updateMedication(idx, 'name', e.target.value)}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="Dosis"
                      fullWidth
                      size="small"
                      value={med.dosage}
                      onChange={(e) => updateMedication(idx, 'dosage', e.target.value)}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <TextField
                      label="Frecuencia"
                      fullWidth
                      size="small"
                      value={med.frequency}
                      onChange={(e) => updateMedication(idx, 'frequency', e.target.value)}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <TextField
                      label="Duración"
                      fullWidth
                      size="small"
                      value={med.duration}
                      onChange={(e) => updateMedication(idx, 'duration', e.target.value)}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <TextField
                      label="Instrucciones"
                      fullWidth
                      size="small"
                      value={med.instructions}
                      onChange={(e) => updateMedication(idx, 'instructions', e.target.value)}
                    />
                  </Grid>
                </Grid>
              </Box>
            ))}
            <Button variant="outlined" startIcon={<AddIcon />} onClick={addMedication}>
              Agregar Medicamento
            </Button>

            <TextField
              label="Notas adicionales"
              fullWidth
              multiline
              rows={2}
              value={newPrescription.notes}
              onChange={(e) => setNewPrescription({ ...newPrescription, notes: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleCreate}>
            Crear Receta
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
