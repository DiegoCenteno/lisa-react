import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  Skeleton,
} from '@mui/material';
import {
  CalendarMonth as CalendarIcon,
  People as PeopleIcon,
  CheckCircle as ConfirmedIcon,
  Schedule as PendingIcon,
  Cancel as CancelledIcon,
  TrendingUp as TrendingIcon,
} from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';
import { dashboardService } from '../../api/dashboardService';
import { appointmentService } from '../../api/appointmentService';
import type { DashboardStats, Appointment } from '../../types';

const statusConfig: Record<number, { label: string; color: 'success' | 'warning' | 'info' | 'error' | 'default' }> = {
  0: { label: 'Pendiente', color: 'info' },
  1: { label: 'Confirmada', color: 'success' },
  2: { label: 'No asistió', color: 'error' },
  3: { label: 'Cancelada', color: 'default' },
  4: { label: 'Reprogramada', color: 'warning' },
};

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const [statsData, appointmentsData] = await Promise.all([
          dashboardService.getStats(),
          appointmentService.getAppointmentsByRange(today, today),
        ]);
        setStats(statsData);
        setTodayAppointments(appointmentsData);
      } catch (err) {
        console.error('Error cargando dashboard:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const statCards = [
    {
      title: 'Citas Hoy',
      value: stats?.today_appointments ?? 0,
      icon: <CalendarIcon />,
      color: '#00897B',
    },
    {
      title: 'Citas Semana',
      value: stats?.week_appointments ?? 0,
      icon: <TrendingIcon />,
      color: '#1565C0',
    },
    {
      title: 'Total Pacientes',
      value: stats?.total_patients ?? 0,
      icon: <PeopleIcon />,
      color: '#7B1FA2',
    },
    {
      title: 'Confirmadas',
      value: stats?.confirmed_appointments ?? 0,
      icon: <ConfirmedIcon />,
      color: '#43A047',
    },
    {
      title: 'Pendientes',
      value: stats?.pending_appointments ?? 0,
      icon: <PendingIcon />,
      color: '#FB8C00',
    },
    {
      title: 'Canceladas',
      value: stats?.cancelled_appointments ?? 0,
      icon: <CancelledIcon />,
      color: '#E53935',
    },
  ];

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 3 }}>
        Bienvenido, {user?.name}
      </Typography>

      <Typography
        variant="body2"
        sx={{ mb: 3, color: 'text.secondary', maxWidth: 760, lineHeight: 1.6 }}
      >
        Nos actualizamos para ti. Queremos darte el mejor servicio, cualquier duda o
        inconveniente que observes en este nuevo sistema te rogamos nos lo hagas saber.
        WhatsApp: 3123097282.
      </Typography>

      <Grid container spacing={2} sx={{ mb: 4 }}>
        {statCards.map((card) => (
          <Grid key={card.title} size={{ xs: 6, sm: 4, md: 2 }}>
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 2, px: 1 }}>
                <Box sx={{ color: card.color, mb: 1 }}>{card.icon}</Box>
                {loading ? (
                  <Skeleton width={40} sx={{ mx: 'auto' }} />
                ) : (
                  <Typography variant="h4" sx={{ fontWeight: 700, color: card.color }}>
                    {card.value}
                  </Typography>
                )}
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {card.title}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Citas de Hoy
              </Typography>
              {loading ? (
                <>
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} height={60} sx={{ mb: 1 }} />
                  ))}
                </>
              ) : todayAppointments.length === 0 ? (
                <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                  No hay citas programadas para hoy
                </Typography>
              ) : (
                <List>
                  {todayAppointments.map((appointment) => (
                    (() => {
                      const patientId = appointment.patient_id ?? appointment.patient?.id;
                      const patientName = `${appointment.patient?.name ?? ''} ${appointment.patient?.last_name ?? ''}`.trim();

                      return (
                    <ListItem
                      key={appointment.id}
                      sx={{
                        borderRadius: 1,
                        mb: 0.5,
                        cursor: patientId ? 'pointer' : 'default',
                        '&:hover': { bgcolor: 'action.hover' },
                      }}
                      onClick={() => {
                        if (!patientId) return;
                        navigate(`/pacientes/${patientId}`);
                      }}
                    >
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                          {appointment.patient?.name?.[0]}
                          {appointment.patient?.last_name?.[0]}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={patientName || 'Paciente sin nombre'}
                        secondary={`${appointment.datestart ? new Date(appointment.datestart).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : ''} - ${appointment.dateend ? new Date(appointment.dateend).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : ''} | ${appointment.reason ?? ''}`}
                      />
                      <Chip
                        label={
                          statusConfig[appointment.status]?.label ??
                          appointment.status
                        }
                        color={statusConfig[appointment.status]?.color ?? 'default'}
                        size="small"
                      />
                    </ListItem>
                      );
                    })()
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Accesos Rápidos
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Card
                  variant="outlined"
                  sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                  onClick={() => navigate('/agenda')}
                >
                  <CardContent sx={{ py: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CalendarIcon sx={{ color: 'primary.main' }} />
                    <Typography variant="body2">Ver Agenda Completa</Typography>
                  </CardContent>
                </Card>
                <Card
                  variant="outlined"
                  sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                  onClick={() => navigate('/pacientes')}
                >
                  <CardContent sx={{ py: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PeopleIcon sx={{ color: 'primary.main' }} />
                    <Typography variant="body2">Buscar Paciente</Typography>
                  </CardContent>
                </Card>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
