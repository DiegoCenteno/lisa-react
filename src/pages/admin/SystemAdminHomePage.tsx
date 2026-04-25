import { Alert, Box, Button, Card, CardContent, Grid, Stack, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';

export default function SystemAdminHomePage() {
  const navigate = useNavigate();

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
          Administracion General
        </Typography>
        <Typography color="text.secondary">
          Este espacio esta separado de los modulos clinicos del medico y del asistente.
        </Typography>
      </Box>

      <Alert severity="info">
        Aqui se concentran los modulos globales del sistema, como noticias funcionales,
        solicitudes PDF y bitacoras administrativas.
      </Alert>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                Noticias del sistema
              </Typography>
              <Typography color="text.secondary">
                Crea comunicados globales y controla lo que se muestra dentro de la agenda
                para medicos y asistentes.
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
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                Solicitudes de plantillas PDF
              </Typography>
              <Typography color="text.secondary">
                Revisa los formatos PDF que los consultorios ya cargaron, descarga el archivo
                base y prepara la configuracion interna.
              </Typography>
              <Button
                variant="contained"
                sx={{ mt: 2 }}
                onClick={() => navigate('/admin/solicitudes-plantillas')}
              >
                Ver solicitudes
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  );
}
