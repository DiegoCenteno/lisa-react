import { useEffect } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { clearBrowserClientState } from '../../utils/clientReset';

export default function ClearStoragePage() {
  useEffect(() => {
    void clearBrowserClientState().finally(() => {
      window.location.replace('/app/login');
    });
  }, []);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        px: 3,
        textAlign: 'center',
      }}
    >
      <CircularProgress />
      <Typography variant="body1">Limpiando datos del navegador...</Typography>
    </Box>
  );
}
