import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import systemAnnouncementService, {
  type SystemAnnouncementReadersItem,
} from '../../api/systemAnnouncementService';

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

  return 'No se pudo cargar la bitacora de lecturas.';
}

function formatDateTime(value?: string | null): string {
  if (!value) return 'Sin fecha';

  const date = new Date(String(value).replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) {
    return 'Sin fecha';
  }

  return date.toLocaleString('es-MX');
}

export default function SystemAnnouncementReadersPage() {
  const [items, setItems] = useState<SystemAnnouncementReadersItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const loadItems = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await systemAnnouncementService.listReaders();
      setItems(response);
    } catch (loadError) {
      setError(getBackendErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadItems();
  }, []);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return items;
    }

    return items.filter((item) => {
      const announcementMatch = [
        item.title,
        item.summary,
        item.body,
      ]
        .join(' ')
        .toLowerCase()
        .includes(query);

      if (announcementMatch) {
        return true;
      }

      return item.readers.some((reader) =>
        [
          reader.name,
          reader.email,
          reader.office_titles,
        ]
          .join(' ')
          .toLowerCase()
          .includes(query)
      );
    });
  }, [items, search]);

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
          Bitacora de noticias
        </Typography>
        <Typography color="text.secondary">
          Consulta que medicos han visto las noticias publicadas y la fecha exacta de lectura.
        </Typography>
      </Box>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }}>
        <TextField
          fullWidth
          placeholder="Buscar por noticia, medico, correo o consultorio"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <Button variant="outlined" onClick={() => void loadItems()} disabled={loading}>
          Actualizar
        </Button>
      </Stack>

      {loading ? (
        <Box sx={{ py: 8, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : !filteredItems.length ? (
        <Alert severity="info">No hay lecturas registradas para las noticias publicadas.</Alert>
      ) : (
        <Stack spacing={2.5}>
          {filteredItems.map((item) => (
            <Card key={item.id} variant="outlined">
              <CardContent>
                <Stack spacing={1.5}>
                  <Stack
                    direction={{ xs: 'column', md: 'row' }}
                    spacing={1.5}
                    justifyContent="space-between"
                    alignItems={{ xs: 'flex-start', md: 'center' }}
                  >
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 800 }}>
                        {item.title}
                      </Typography>
                      {item.summary ? (
                        <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                          {item.summary}
                        </Typography>
                      ) : null}
                    </Box>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Chip
                        label={`${item.read_count} lectura${item.read_count === 1 ? '' : 's'}`}
                        color={item.read_count > 0 ? 'primary' : 'default'}
                        size="small"
                      />
                      <Typography variant="caption" color="text.secondary">
                        Publicada: {formatDateTime(item.created_at)}
                      </Typography>
                    </Stack>
                  </Stack>

                  <Divider />

                  {!item.readers.length ? (
                    <Alert severity="info">Aun no hay medicos que hayan abierto esta noticia.</Alert>
                  ) : (
                    <Stack spacing={1.25}>
                      {item.readers.map((reader) => (
                        <Box
                          key={`${item.id}-${reader.user_id}`}
                          sx={{
                            p: 1.5,
                            borderRadius: 2,
                            border: '1px solid',
                            borderColor: 'divider',
                            backgroundColor: 'background.paper',
                          }}
                        >
                          <Stack
                            direction={{ xs: 'column', md: 'row' }}
                            spacing={1}
                            justifyContent="space-between"
                            alignItems={{ xs: 'flex-start', md: 'center' }}
                          >
                            <Box>
                              <Typography sx={{ fontWeight: 700 }}>
                                {reader.name || 'Medico sin nombre'}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {reader.email || 'Sin correo'}
                              </Typography>
                              {reader.office_titles ? (
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                                  Consultorio(s): {reader.office_titles}
                                </Typography>
                              ) : null}
                            </Box>
                            <Chip
                              label={`Leida: ${formatDateTime(reader.read_at)}`}
                              size="small"
                              color="success"
                              variant="outlined"
                            />
                          </Stack>
                        </Box>
                      ))}
                    </Stack>
                  )}
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
