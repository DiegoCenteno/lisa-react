import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  InputAdornment,
  IconButton,
  CircularProgress,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
} from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';
import { shouldRunClientReset } from '../../utils/clientReset';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, isAuthenticated, hardResetClientAuth, user } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [preparing, setPreparing] = useState(true);

  useEffect(() => {
    let active = true;

    const prepareLogin = async () => {
      if (shouldRunClientReset()) {
        await hardResetClientAuth();
      }

      if (active) {
        setPreparing(false);
      }
    };

    void prepareLogin();

    return () => {
      active = false;
    };
  }, [hardResetClientAuth]);

  const getLandingPath = () => {
    if (user?.role === 'system_admin') {
      return '/admin';
    }

    return isMobile ? '/agenda' : '/dashboard';
  };

  if (preparing) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (isAuthenticated) {
    navigate(getLandingPath(), { replace: true });
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(emailOrPhone, password);
      const savedUser = localStorage.getItem('user');
      const parsedUser = savedUser ? JSON.parse(savedUser) as { role?: string } : null;
      navigate(parsedUser?.role === 'system_admin' ? '/admin' : (isMobile ? '/agenda' : '/dashboard'), { replace: true });
    } catch {
      setError('Credenciales inválidas. Verifica tu email/teléfono y Contraseña.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundImage: 'url(/img/hero-bg2.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        p: 2,
      }}
    >
      <Card sx={{ maxWidth: 420, width: '100%' }}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Box
              component="img"
              src="/img/lisacompleto.png"
              alt="LisaMedic"
              sx={{
                width: '100%',
                maxWidth: 240,
                height: 'auto',
                display: 'inline-block',
              }}
            />
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Correo electrónico o teléfono"
              value={emailOrPhone}
              onChange={(e) => setEmailOrPhone(e.target.value)}
              margin="normal"
              required
              autoFocus
              autoComplete="email"
            />
            <TextField
              fullWidth
              label="Contraseña"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              margin="normal"
              required
              autoComplete="current-password"
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                        size="small"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={loading}
              sx={{ mt: 3, mb: 2, py: 1.5 }}
            >
              {loading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                'Iniciar Sesión'
              )}
            </Button>
            <Button
              fullWidth
              variant="text"
              size="large"
              onClick={() => navigate('/registrar')}
              sx={{ mb: 1 }}
            >
              Crear cuenta médica
            </Button>
          </Box>

          <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
              Ingresa con tu correo electrónico o número de teléfono
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}




