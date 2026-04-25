import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  CircularProgress,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  CreditCard as CreditCardIcon,
  CheckCircleOutline as CheckIcon,
  Visibility,
  VisibilityOff,
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

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '14px 12px',
  fontSize: '16px',
  border: '1px solid #c4c4c4',
  borderRadius: '8px',
  boxSizing: 'border-box',
  outline: 'none',
  fontFamily: 'inherit',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: '4px',
  fontSize: '14px',
  color: '#666',
  fontWeight: 500,
};

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
  const [paymentMethodId, setPaymentMethodId] = useState('');
  const [showIssuers, setShowIssuers] = useState(false);
  const [showCvv, setShowCvv] = useState(false);

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
    const initSdk = () => {
      if (window.Mercadopago) {
        window.Mercadopago.setPublishableKey(publicKey);
        return true;
      }
      return false;
    };

    if (initSdk()) return;

    const existingScript = document.querySelector('script[src*="mercadopago.js"]');
    if (existingScript) {
      let attempts = 0;
      const interval = setInterval(() => {
        attempts++;
        if (initSdk() || attempts >= 30) {
          clearInterval(interval);
        }
      }, 200);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://secure.mlstatic.com/sdk/javascript/v1/mercadopago.js';
    script.onload = () => {
      let attempts = 0;
      const interval = setInterval(() => {
        attempts++;
        if (initSdk() || attempts >= 30) {
          clearInterval(interval);
        }
      }, 200);
    };
    script.onerror = () => {
      setError('No se pudo cargar el sistema de pagos. Verifica tu conexión e intenta recargar la página.');
    };
    document.head.appendChild(script);
  };

  const handleCardholderNameInput = (e: React.FormEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    input.value = input.value.replace(/[0-9]/g, '').slice(0, 80);
  };

  const handleCardNumberInput = (e: React.FormEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const raw = input.value.replace(/\D/g, '').slice(0, 16);
    const formatted = raw.replace(/(.{4})/g, '$1 ').trim();
    input.value = formatted;
  };

  const handleExpirationInput = (e: React.FormEvent<HTMLInputElement>, nextFieldId: string) => {
    const input = e.currentTarget;
    input.value = input.value.replace(/\D/g, '').slice(0, 2);
    if (input.value.length === 2) {
      const nextField = document.getElementById(nextFieldId);
      if (nextField) nextField.focus();
    }
  };

  const guessPaymentMethod = () => {
    const cardNumberInput = document.getElementById('cardNumber') as HTMLInputElement | null;
    if (!cardNumberInput || !window.Mercadopago) return;

    const cardnumber = cardNumberInput.value.replace(/\s/g, '');
    if (cardnumber.length >= 6) {
      const bin = cardnumber.substring(0, 6);
      window.Mercadopago.getPaymentMethod({ bin }, (status, response) => {
        if (status === 200 && response.length > 0) {
          const method = response[0];
          setPaymentMethodId(method.id);

          window.Mercadopago.getIssuers(method.id, (issuerStatus, issuerResponse) => {
            if (issuerStatus === 200) {
              const issuerSelect = document.getElementById('issuer') as HTMLSelectElement | null;
              if (issuerSelect) {
                issuerSelect.options.length = 1;
                issuerResponse.forEach((issuer: MercadoPagoIssuer) => {
                  const opt = document.createElement('option');
                  opt.text = issuer.name;
                  opt.value = String(issuer.id);
                  issuerSelect.appendChild(opt);
                });
                setShowIssuers(true);

                const price = subscriptionData?.price || '249';
                const transactionAmountEl = document.getElementById('transactionAmount') as HTMLInputElement | null;
                if (transactionAmountEl) {
                  transactionAmountEl.value = price;
                }

                window.Mercadopago.getInstallments(
                  {
                    payment_method_id: method.id,
                    amount: parseFloat(price),
                    issuer_id: issuerResponse.length > 0 ? issuerResponse[0].id : 0,
                  },
                  (installStatus, installResponse) => {
                    if (installStatus === 200 && installResponse.length > 0) {
                      const installSelect = document.getElementById('installments') as HTMLSelectElement | null;
                      if (installSelect) {
                        installSelect.options.length = 0;
                        installResponse[0].payer_costs.forEach((cost) => {
                          const opt = document.createElement('option');
                          opt.text = cost.recommended_message;
                          opt.value = String(cost.installments);
                          installSelect.appendChild(opt);
                        });
                      }
                    }
                  }
                );
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

    if (!window.Mercadopago || !formRef.current) {
      if (!window.Mercadopago) {
        setError('MercadoPago no se cargó correctamente. Recarga la página (Ctrl+Shift+R).');
      } else {
        setError('Error interno del formulario. Recarga la página.');
      }
      return;
    }

    const cardholderName = (document.getElementById('cardholderName') as HTMLInputElement)?.value;
    const cardNumberRaw = (document.getElementById('cardNumber') as HTMLInputElement)?.value?.replace(/\s/g, '');
    const month = (document.getElementById('cardExpirationMonth') as HTMLInputElement)?.value;
    const year = (document.getElementById('cardExpirationYear') as HTMLInputElement)?.value;
    const cvv = (document.getElementById('securityCode') as HTMLInputElement)?.value;

    if (!cardholderName || !cardNumberRaw || !month || !year || !cvv) {
      setError('Completa todos los campos de la tarjeta.');
      return;
    }

    setSubmitting(true);

    const cardNumberInput = document.getElementById('cardNumber') as HTMLInputElement;
    const originalValue = cardNumberInput?.value;
    if (cardNumberInput) {
      cardNumberInput.value = cardNumberInput.value.replace(/\s/g, '');
    }

    window.Mercadopago.createToken(formRef.current, async (status, response) => {
      if (cardNumberInput && originalValue) {
        cardNumberInput.value = originalValue;
      }
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

  const price = subscriptionData?.price || '249';

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
                ${price}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                /mes
              </Typography>
            </Box>
          </Box>

          <form ref={formRef} id="paymentForm" onSubmit={handleSubmit}>
            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <CreditCardIcon /> Tarjeta de crédito
            </Typography>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Tu transacción es segura gracias a MercadoPago.
            </Typography>

            <div style={{ marginBottom: '16px' }}>
              <label htmlFor="cardholderName" style={labelStyle}>Nombre del titular</label>
              <input
                id="cardholderName"
                data-checkout="cardholderName"
                type="text"
                maxLength={80}
                onInput={handleCardholderNameInput}
                style={inputStyle}
                disabled={submitting}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label htmlFor="cardNumber" style={labelStyle}>Número de la tarjeta</label>
              <input
                id="cardNumber"
                data-checkout="cardNumber"
                type="text"
                maxLength={19}
                autoComplete="off"
                onInput={handleCardNumberInput}
                onBlur={guessPaymentMethod}
                style={{ ...inputStyle, letterSpacing: '2px' }}
                placeholder="0000 0000 0000 0000"
                disabled={submitting}
              />
            </div>

            <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
              <div style={{ flex: 1 }}>
                <label htmlFor="cardExpirationMonth" style={labelStyle}>MM</label>
                <input
                  id="cardExpirationMonth"
                  data-checkout="cardExpirationMonth"
                  type="text"
                  placeholder="MM"
                  maxLength={2}
                  autoComplete="off"
                  onInput={(e) => handleExpirationInput(e, 'cardExpirationYear')}
                  style={inputStyle}
                  disabled={submitting}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label htmlFor="cardExpirationYear" style={labelStyle}>YY</label>
                <input
                  id="cardExpirationYear"
                  data-checkout="cardExpirationYear"
                  type="text"
                  placeholder="YY"
                  maxLength={2}
                  autoComplete="off"
                  onInput={(e) => handleExpirationInput(e, 'securityCode')}
                  style={inputStyle}
                  disabled={submitting}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label htmlFor="securityCode" style={labelStyle}>CVV</label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="securityCode"
                    data-checkout="securityCode"
                    type={showCvv ? 'text' : 'password'}
                    placeholder="•••"
                    maxLength={4}
                    autoComplete="off"
                    style={{ ...inputStyle, paddingRight: '40px' }}
                    disabled={submitting}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCvv(!showCvv)}
                    style={{
                      position: 'absolute',
                      right: '8px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      color: '#999',
                    }}
                    tabIndex={-1}
                  >
                    {showCvv ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                  </button>
                </div>
              </div>
            </div>

            <div id="bnkemisor" style={{ marginBottom: '16px', display: showIssuers ? 'block' : 'none' }}>
              <label htmlFor="issuer" style={labelStyle}>Banco emisor</label>
              <select
                id="issuer"
                data-checkout="issuer"
                style={{ ...inputStyle, backgroundColor: '#fff' }}
                disabled={submitting}
              >
                <option value="">Selecciona...</option>
              </select>
            </div>

            <div style={{ display: 'none' }}>
              <select id="installments" name="installments">
                <option value="1">1</option>
              </select>
            </div>

            <input type="hidden" id="transactionAmount" name="transactionAmount" value={price} />
            <input type="hidden" id="paymentMethodId" name="paymentMethodId" value={paymentMethodId} />
            <input type="hidden" id="description" name="description" value="Lisa Medic" />

            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              disabled={submitting}
              sx={{ mb: 2, py: 1.5 }}
            >
              {submitting ? <CircularProgress size={24} color="inherit" /> : 'Iniciar membresía'}
            </Button>

            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
              Al iniciar la membresía tu tarjeta de crédito quedará ligada con nuestro sistema para generar
              un cargo mensual de <strong>${price}</strong> iniciando el cargo
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
