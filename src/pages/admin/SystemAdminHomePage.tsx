import { Alert, Box, Button, Card, CardContent, Stack, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';

export default function SystemAdminHomePage() {
  const navigate = useNavigate();

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
          Administración General
        </Typography>
        <Typography color="text.secondary">
          Este espacio está separado de los módulos clínicos del médico y del asistente.
        </Typography>
      </Box>

      <Alert severity="info">
        Aquí se concentrarán los módulos globales del sistema, como noticias funcionales,
        métricas generales y bitácoras administrativas.
      </Alert>

      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
            Próximo paso
          </Typography>
          <Typography color="text.secondary">
            El primer módulo recomendado para este rol es Noticias del sistema, desde donde
            podrás crear comunicados y luego mostrarlos en la agenda mediante un panel lateral.
          </Typography>
          <Button
            variant="contained"
            sx={{ mt: 2 }}
            onClick={() => navigate('/admin/noticias')}
          >
            Ir a Noticias
          </Button>
        </CardContent>
      </Card>
    </Stack>
  );
}
