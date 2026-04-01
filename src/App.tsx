import { ThemeProvider, CssBaseline } from '@mui/material';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import 'dayjs/locale/es';
import { AuthProvider } from './contexts/AuthContext';
import AppRouter from './routes/AppRouter';
import theme from './theme';

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
        <AuthProvider>
          <AppRouter />
        </AuthProvider>
      </LocalizationProvider>
    </ThemeProvider>
  );
}
