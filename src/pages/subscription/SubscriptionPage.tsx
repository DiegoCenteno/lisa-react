import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Alert,
  CircularProgress,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  CreditCard as CreditCardIcon,
  CheckCircleOutline as CheckIcon,
} from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';
import { subscriptionService } from '../../api/subscriptionService';
import type { SubscriptionStatus } from '../../api/subscriptionService';

declare global {
  interface Window {
    Mercadopago: {
      setPublishableKey(key: string): void;
      createToken(form: HTMLFormElement, callback: (status: number, response: MercadoPagoTokenResponse) => void): void;
      getPaymentMethod(params: { bin: string }, callback: (status: number, response: MercadoPagoPaymentMethod[]) => void): void;
      getIssuers(paymentMethodId: string, callback: (status: number, response: MercadoPagoIssuer[]) => void): void;
      getInstallments(params: { payment_method_id: string; amount: number; issuer_id: number }, callback: (status: number, response: MercadoPagoInstallment[]) => void): void;
    };
  }
}

interface MercadoPagoTokenResponse {
  id: string;
  [key: string]: unknown;
}

interface MercadoPagoPaymentMethod {
  id: string;
  name: string;
  [key: string]: unknown;
}

interface MercadoPagoIssuer {
  id: number;
  name: string;
}

interface MercadoPagoInstallment {
  payer_costs: Array<{
    installments: number;
    recommended_message: string;
  }>;
}

export default function SubscriptionPage() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const formRef = useRef<HTMLFormElement>(null);

  const [subscriptionData, setSubscriptionData] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [sdkReady, setSdkReady] = useState(false);

  const [cardholderName, setCardholderName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expirationMonth, setExpirationMonth] = useState('');
  const [expirationYear, setExpirationYear] = useState('');
  const [securityCode, setSecurityCode] = useState('');
  const [paymentMethodId, setPaymentMethodId] = useState('');
  const [issuers, setIssuers] = useState<MercadoPagoIssuer[]>([]);
  const [selectedIssuer, setSelectedIssuer] = useState('');

  const loadSubscriptionStatus = useCallback(async () => {
    try {
      const data = await subscriptionService.getStatus();
      setSubscriptionData(data);

      if (data.subscription_active) {
        navigate('/dashboard', { replace: true });
        return;
      }

      if (data.public_key) {
        loadMercadoPagoSdk(data.public_key);
      }
    } catch {
      setError('Error al cargar el estado de la suscripción.');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    void loadSubscriptionStatus();
  }, [loadSubscriptionStatus]);

  const loadMercadoPagoSdk = (publicKey: string) => {
    if (window.Mercadopago) {
      window.Mercadopago.setPublishableKey(publicKey);
      setSdkReady(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://secure.mlstatic.com/sdk/javascript/v1/mercadopago.js';
    script.async = true;
    script.onload = () => {
      window.Mercadopago.setPublishableKey(publicKey);
      setSdkReady(true);
    };
    document.head.appendChild(script);
  };

  const handleCardNumberChange = (value: string) => {
    setCardNumber(value);
    if (value.length >= 6 && window.Mercadopago) {
      const bin = value.substring(0, 6);
      window.Mercadopago.getPaymentMethod({ bin }, (status, response) => {
        if (status === 200 && response.length > 0) {
          setPaymentMethodId(response[0].id);
          window.Mercadopago.getIssuers(response[0].id, (issuerStatus, issuerResponse) => {
            if (issuerStatus === 200) {
              setIssuers(issuerResponse);
              if (issuerResponse.length > 0) {
                setSelectedIssuer(String(issuerResponse[0].id));
              }
            }
          });
        }
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!sdkReady || !window.Mercadopago || !formRef.current) {
      setError('El sistema de pagos no está listo. Recarga la página.');
      return;
    }

    if (!cardholderName || !cardNumber || !expirationMonth || !expirationYear || !securityCode) {
      setError('Completa todos los campos de la tarjeta.');
      return;
    }

    setSubmitting(true);

    window.Mercadopago.createToken(formRef.current, async (status, response) => {
      if (status !== 200 && status !== 201) {
        setSubmitting(false);
        setError('Error al validar los datos de la tarjeta. Verifica la información.');
        return;
      }

      try {
        const result = await subscriptionService.createPreapproval(response.id);

        if (result.subscription_active) {
          setSuccess('Suscripción activada correctamente. Redirigiendo...');
          setTimeout(() => {
            navigate('/dashboard', { replace: true });
          }, 2000);
        } else if (result.payment_pending) {
          setSuccess('Pago en proceso. Tu suscripción se activará en breve.');
          setTimeout(() => {
            navigate('/dashboard', { replace: true });
          }, 2000);
        } else {
          setError('No se pudo activar la suscripción. Intenta nuevamente.');
        }
      } catch (err: unknown) {
        const axiosErr = err as { response?: { data?: { message?: string } } };
        setError(axiosErr?.response?.data?.message || 'Error al procesar el pago. Intenta nuevamente.');
      } finally {
        setSubmitting(false);
      }
    });
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        p: 2,
      }}
    >
      <Card
        sx={{
          maxWidth: 500,
          width: '100%',
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          borderRadius: 3,
        }}
      >
        <CardContent sx={{ p: isMobile ? 3 : 4 }}>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
              Lisa Medic
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Tu asistente médico virtual
            </Typography>
          </Box>

          {subscriptionData && !subscriptionData.subscription_active && (
            <Alert severity="warning" sx={{ mb: 3 }}>
              Tu suscripción ha vencido. Renueva para continuar usando Lisa.
            </Alert>
          )}

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" icon={<CheckIcon />} sx={{ mb: 2 }}>
              {success}
            </Alert>
          )}

          <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              1 mes gratis
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Obtén el primer mes gratis y sin compromisos, cancela cuando quieras.
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
              <Typography variant="body2" color="text.secondary" sx={{ textDecoration: 'line-through' }}>
                $559
              </Typography>
              <Typography variant="h5" color="error" fontWeight="bold">
                ${subscriptionData?.price || '249'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                /mes
              </Typography>
            </Box>
          </Box>

          <form ref={formRef} onSubmit={handleSubmit}>
            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <CreditCardIcon /> Tarjeta de crédito
            </Typography>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Tu transacción es segura gracias a MercadoPago.
            </Typography>

            <TextField
              fullWidth
              label="Nombre del titular"
              value={cardholderName}
              onChange={(e) => setCardholderName(e.target.value)}
              inputProps={{ 'data-checkout': 'cardholderName' }}
              sx={{ mb: 2 }}
              disabled={submitting}
            />

            <TextField
              fullWidth
              label="Número de la tarjeta"
              value={cardNumber}
              onChange={(e) => handleCardNumberChange(e.target.value)}
              inputProps={{
                'data-checkout': 'cardNumber',
                autoComplete: 'off',
              }}
              sx={{ mb: 2 }}
              disabled={submitting}
            />

            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <TextField
                label="MM"
                value={expirationMonth}
                onChange={(e) => setExpirationMonth(e.target.value)}
                inputProps={{
                  'data-checkout': 'cardExpirationMonth',
                  autoComplete: 'off',
                  maxLength: 2,
                }}
                sx={{ flex: 1 }}
                disabled={submitting}
              />
              <TextField
                label="YY"
                value={expirationYear}
                onChange={(e) => setExpirationYear(e.target.value)}
                inputProps={{
                  'data-checkout': 'cardExpirationYear',
                  autoComplete: 'off',
                  maxLength: 2,
                }}
                sx={{ flex: 1 }}
                disabled={submitting}
              />
              <TextField
                label="CVV"
                value={securityCode}
                onChange={(e) => setSecurityCode(e.target.value)}
                inputProps={{
                  'data-checkout': 'securityCode',
                  autoComplete: 'off',
                  maxLength: 4,
                }}
                sx={{ flex: 1 }}
                disabled={submitting}
              />
            </Box>

            {issuers.length > 0 && (
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Banco emisor</InputLabel>
                <Select
                  value={selectedIssuer}
                  onChange={(e) => setSelectedIssuer(e.target.value)}
                  label="Banco emisor"
                  inputProps={{ 'data-checkout': 'issuer' }}
                  disabled={submitting}
                >
                  {issuers.map((issuer) => (
                    <MenuItem key={issuer.id} value={String(issuer.id)}>
                      {issuer.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            <input type="hidden" name="paymentMethodId" value={paymentMethodId} />

            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              disabled={submitting || !sdkReady}
              sx={{ mb: 2, py: 1.5 }}
            >
              {submitting ? <CircularProgress size={24} color="inherit" /> : 'Iniciar membresía'}
            </Button>

            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
              Al iniciar la membresía tu tarjeta de crédito quedará ligada con nuestro sistema para generar
              un cargo mensual de <strong>${subscriptionData?.price || '249'}</strong> iniciando el cargo
              hasta el segundo mes. Puedes cancelar la membresía en cualquier momento.
            </Typography>

            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
              Utilizamos MercadoPago como nuestro procesador de pagos para garantizar la seguridad en la
              transacción. No necesitas tener una cuenta en MercadoPago, solamente se requiere una tarjeta
              de crédito bancaria.
            </Typography>

            <Box sx={{ textAlign: 'center' }}>
              <Button
                variant="text"
                color="inherit"
                size="small"
                onClick={handleLogout}
                disabled={submitting}
              >
                Salir
              </Button>
            </Box>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}
