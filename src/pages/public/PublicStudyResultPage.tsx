import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material';
import {
  Download as DownloadIcon,
  LocalHospital as HospitalIcon,
  PictureAsPdf as PdfIcon,
} from '@mui/icons-material';
import publicStudyService from '../../api/publicStudyService';
import type { PublicAppLinkResponse, PublicStudyResult } from '../../types';

export default function PublicStudyResultPage() {
  const { code = '' } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [study, setStudy] = useState<PublicStudyResult | null>(null);
  const [linkType, setLinkType] = useState<PublicAppLinkResponse['type'] | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const data = await publicStudyService.resolvePublicCode(code);
        if (!active) return;
        setLinkType(data.type);

        if (data.type !== 'study_result') {
          setError('Este tipo de enlace público todavía no está disponible.');
          return;
        }

        setStudy(data.study);

        const blob = await publicStudyService.getStudyFileBlob(code);
        if (!active) return;
        objectUrl = window.URL.createObjectURL(blob);
        setPreviewUrl(objectUrl);
      } catch (requestError) {
        console.error('Error cargando resultado público:', requestError);
        if (!active) return;
        setError('No se encontró información para este enlace.');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
      if (objectUrl) {
        window.URL.revokeObjectURL(objectUrl);
      }
    };
  }, [code]);

  const downloadUrl = useMemo(() => study?.file.download_url ?? null, [study]);

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #d5f3eb 0%, #f6fbff 100%)',
          p: 2,
        }}
      >
        <Stack spacing={2} alignItems="center">
          <CircularProgress />
          <Typography color="text.secondary">Cargando resultado del estudio...</Typography>
        </Stack>
      </Box>
    );
  }

  if (error || !study || linkType !== 'study_result') {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #d5f3eb 0%, #f6fbff 100%)',
          p: 2,
        }}
      >
        <Card sx={{ maxWidth: 640, width: '100%', borderRadius: 4 }}>
          <CardContent sx={{ p: 4 }}>
            <Alert severity="error">{error ?? 'Resultado no encontrado.'}</Alert>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #d5f3eb 0%, #f6fbff 100%)',
        p: { xs: 2, md: 3 },
      }}
    >
      <Box sx={{ maxWidth: 860, mx: 'auto' }}>
        <Card
          sx={{
            borderRadius: 4,
            boxShadow: '0 24px 60px rgba(26, 71, 63, 0.12)',
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              px: { xs: 3, md: 4 },
              py: 3,
              background: 'linear-gradient(135deg, #35a97b 0%, #75d6b4 100%)',
              color: 'white',
            }}
          >
            <Stack direction="row" spacing={1.5} alignItems="center">
              <HospitalIcon sx={{ fontSize: 34 }} />
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 800 }}>
                  Resultado de estudio
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.88 }}>
                  LisaMedic
                </Typography>
              </Box>
            </Stack>
          </Box>

          <CardContent sx={{ p: { xs: 3, md: 4 } }}>
            <Stack spacing={2.5}>
              <Box>
                <Typography variant="body1" sx={{ mb: 1 }}>
                  <strong>Médico:</strong> {study.medic_name}
                </Typography>
                <Typography variant="body1">
                  <strong>Paciente:</strong> {study.patient_name}
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'primary.main', mb: 1 }}>
                  Resultado
                </Typography>
                <Typography
                  variant="body1"
                  sx={{
                    whiteSpace: 'pre-line',
                    color: 'text.primary',
                    lineHeight: 1.75,
                  }}
                >
                  {study.template_text}
                </Typography>
              </Box>

              <Box
                sx={{
                  borderTop: '1px solid',
                  borderColor: 'divider',
                  pt: 3,
                }}
              >
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={2}
                  alignItems={{ xs: 'stretch', sm: 'center' }}
                  justifyContent="space-between"
                  sx={{ mb: 2 }}
                >
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      Archivo adjunto
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {study.file.name}
                    </Typography>
                  </Box>
                  {downloadUrl ? (
                    <Button
                      component="a"
                      href={downloadUrl}
                      variant="contained"
                      startIcon={<DownloadIcon />}
                    >
                      Descargar archivo
                    </Button>
                  ) : null}
                </Stack>

                {study.file.type === 'image' && previewUrl ? (
                  <Box
                    component="img"
                    src={previewUrl}
                    alt={study.file.name}
                    sx={{
                      width: '100%',
                      maxHeight: 520,
                      objectFit: 'contain',
                      borderRadius: 3,
                      border: '1px solid',
                      borderColor: 'divider',
                      backgroundColor: '#fff',
                    }}
                  />
                ) : null}

                {study.file.type === 'pdf' && previewUrl ? (
                  <Box
                    sx={{
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 3,
                      overflow: 'hidden',
                      backgroundColor: '#fff',
                    }}
                  >
                    <Box
                      sx={{
                        px: 2,
                        py: 1.25,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                        color: 'text.secondary',
                      }}
                    >
                      <PdfIcon fontSize="small" />
                      <Typography variant="body2">{study.file.name}</Typography>
                    </Box>
                    <Box
                      component="iframe"
                      title={study.file.name}
                      src={`${previewUrl}#toolbar=0&navpanes=0&pagemode=none&view=FitH`}
                      sx={{ width: '100%', height: 560, border: 0 }}
                    />
                  </Box>
                ) : null}
              </Box>
            </Stack>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
