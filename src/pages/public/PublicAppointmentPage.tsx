import { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Grid,
  Alert,
  Stepper,
  Step,
  StepLabel,
} from '@mui/material';
import { LocalHospital as HospitalIcon } from '@mui/icons-material';

const steps = ['Datos personales', 'Seleccionar fecha y hora', 'Confirmar'];

export default function PublicAppointmentPage() {
  const [activeStep, setActiveStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    last_name: '',
    phone: '',
    email: '',
    date: '',
    time: '',
    reason: '',
  });

  const handleNext = () => {
    if (activeStep === steps.length - 1) {
      setSubmitted(true);
    } else {
      setActiveStep(activeStep + 1);
    }
  };

  const handleBack = () => {
    setActiveStep(activeStep - 1);
  };

  const updateField = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  if (submitted) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #00897B 0%, #1565C0 100%)',
          p: 2,
        }}
      >
        <Card sx={{ maxWidth: 500, width: '100%' }}>
          <CardContent sx={{ p: 4, textAlign: 'center' }}>
            <HospitalIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
            <Typography variant="h5" sx={{ color: 'primary.main', mb: 2 }}>
              ¡Cita Agendada!
            </Typography>
            <Alert severity="success" sx={{ mb: 2 }}>
              Tu cita ha sido registrada exitosamente. Recibirás una confirmación por WhatsApp.
            </Alert>
            <Typography variant="body2" color="text.secondary">
              Fecha: {formData.date} a las {formData.time}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Paciente: {formData.name} {formData.last_name}
            </Typography>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #00897B 0%, #1565C0 100%)',
        p: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Card sx={{ maxWidth: 600, width: '100%' }}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <HospitalIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
            <Typography variant="h5" sx={{ color: 'primary.main', fontWeight: 700 }}>
              Agendar Cita
            </Typography>
            <Typography variant="body2" color="text.secondary">
              LisaMedic - Asistente Médico Digital
            </Typography>
          </Box>

          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {activeStep === 0 && (
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Nombre"
                  fullWidth
                  required
                  value={formData.name}
                  onChange={(e) => updateField('name', e.target.value)}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Apellido"
                  fullWidth
                  required
                  value={formData.last_name}
                  onChange={(e) => updateField('last_name', e.target.value)}
                />
              </Grid>
              <Grid size={12}>
                <TextField
                  label="Teléfono"
                  fullWidth
                  required
                  value={formData.phone}
                  onChange={(e) => updateField('phone', e.target.value)}
                />
              </Grid>
              <Grid size={12}>
                <TextField
                  label="Email (opcional)"
                  fullWidth
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateField('email', e.target.value)}
                />
              </Grid>
            </Grid>
          )}

          {activeStep === 1 && (
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Fecha"
                  type="date"
                  fullWidth
                  required
                  value={formData.date}
                  onChange={(e) => updateField('date', e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Hora"
                  type="time"
                  fullWidth
                  required
                  value={formData.time}
                  onChange={(e) => updateField('time', e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Grid>
              <Grid size={12}>
                <TextField
                  label="Motivo de la consulta"
                  fullWidth
                  multiline
                  rows={3}
                  value={formData.reason}
                  onChange={(e) => updateField('reason', e.target.value)}
                />
              </Grid>
            </Grid>
          )}

          {activeStep === 2 && (
            <Box>
              <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                Confirma los datos de tu cita:
              </Typography>
              <Box sx={{ bgcolor: 'grey.50', p: 2, borderRadius: 1 }}>
                <Typography variant="body2">
                  <strong>Nombre:</strong> {formData.name} {formData.last_name}
                </Typography>
                <Typography variant="body2">
                  <strong>Teléfono:</strong> {formData.phone}
                </Typography>
                {formData.email && (
                  <Typography variant="body2">
                    <strong>Email:</strong> {formData.email}
                  </Typography>
                )}
                <Typography variant="body2">
                  <strong>Fecha:</strong> {formData.date}
                </Typography>
                <Typography variant="body2">
                  <strong>Hora:</strong> {formData.time}
                </Typography>
                {formData.reason && (
                  <Typography variant="body2">
                    <strong>Motivo:</strong> {formData.reason}
                  </Typography>
                )}
              </Box>
            </Box>
          )}

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
            <Button disabled={activeStep === 0} onClick={handleBack}>
              Atrás
            </Button>
            <Button variant="contained" onClick={handleNext}>
              {activeStep === steps.length - 1 ? 'Confirmar Cita' : 'Siguiente'}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
