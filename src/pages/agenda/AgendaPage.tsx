import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  ToggleButtonGroup,
  ToggleButton,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Skeleton,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  ChevronLeft,
  ChevronRight,
  Add as AddIcon,
  ViewList as ListViewIcon,
  CalendarViewDay as DayViewIcon,
  CalendarViewWeek as WeekViewIcon,
  CalendarMonth as MonthViewIcon,
} from '@mui/icons-material';
import { appointmentService } from '../../api/appointmentService';
import type { Appointment } from '../../types';
import dayjs from 'dayjs';
import 'dayjs/locale/es';

dayjs.locale('es');

type ViewType = 'list' | 'day' | 'week' | 'month';

const statusConfig: Record<string, { label: string; color: 'success' | 'warning' | 'info' | 'error' | 'default' }> = {
  confirmed: { label: 'Confirmada', color: 'success' },
  scheduled: { label: 'Programada', color: 'info' },
  in_progress: { label: 'En curso', color: 'warning' },
  completed: { label: 'Completada', color: 'default' },
  cancelled: { label: 'Cancelada', color: 'error' },
  rescheduled: { label: 'Reprogramada', color: 'warning' },
  no_show: { label: 'No asistió', color: 'error' },
};

export default function AgendaPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [view, setView] = useState<ViewType>('list');
  const [currentDate, setCurrentDate] = useState(dayjs());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newAppointment, setNewAppointment] = useState({
    patient_name: '',
    date: dayjs().format('YYYY-MM-DD'),
    start_time: '09:00',
    end_time: '09:30',
    reason: '',
  });

  const loadAppointments = useCallback(async () => {
    setLoading(true);
    try {
      let startDate: string;
      let endDate: string;

      if (view === 'day' || view === 'list') {
        startDate = currentDate.format('YYYY-MM-DD');
        endDate = currentDate.add(7, 'day').format('YYYY-MM-DD');
      } else if (view === 'week') {
        startDate = currentDate.startOf('week').format('YYYY-MM-DD');
        endDate = currentDate.endOf('week').format('YYYY-MM-DD');
      } else {
        startDate = currentDate.startOf('month').format('YYYY-MM-DD');
        endDate = currentDate.endOf('month').format('YYYY-MM-DD');
      }

      const data = await appointmentService.getAppointmentsByRange(
        startDate,
        endDate
      );
      setAppointments(data);
    } catch (err) {
      console.error('Error cargando citas:', err);
    } finally {
      setLoading(false);
    }
  }, [currentDate, view]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  const navigateDate = (direction: 'prev' | 'next') => {
    const amount = view === 'month' ? 1 : view === 'week' ? 7 : 1;
    const unit = view === 'month' ? 'month' : 'day';
    setCurrentDate(
      direction === 'prev'
        ? currentDate.subtract(amount, unit)
        : currentDate.add(amount, unit)
    );
  };

  const handleCreateAppointment = async () => {
    try {
      await appointmentService.createAppointment({
        patient_id: 0,
        medico_id: 1,
        date: newAppointment.date,
        start_time: newAppointment.start_time,
        end_time: newAppointment.end_time,
        reason: newAppointment.reason,
      });
      setDialogOpen(false);
      setNewAppointment({
        patient_name: '',
        date: dayjs().format('YYYY-MM-DD'),
        start_time: '09:00',
        end_time: '09:30',
        reason: '',
      });
      loadAppointments();
    } catch (err) {
      console.error('Error creando cita:', err);
    }
  };

  const groupedByDate = appointments.reduce<Record<string, Appointment[]>>(
    (acc, apt) => {
      if (!acc[apt.date]) acc[apt.date] = [];
      acc[apt.date].push(apt);
      return acc;
    },
    {}
  );

  const renderListView = () => (
    <Box>
      {Object.entries(groupedByDate)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, dateAppointments]) => (
          <Box key={date} sx={{ mb: 3 }}>
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 600,
                color: 'primary.main',
                mb: 1,
                textTransform: 'capitalize',
              }}
            >
              {dayjs(date).format('dddd, D [de] MMMM YYYY')}
            </Typography>
            <Card>
              <List disablePadding>
                {dateAppointments
                  .sort((a, b) => a.start_time.localeCompare(b.start_time))
                  .map((apt, index) => (
                    <ListItem
                      key={apt.id}
                      divider={index < dateAppointments.length - 1}
                      sx={{
                        cursor: 'pointer',
                        '&:hover': { bgcolor: 'action.hover' },
                      }}
                    >
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                          {apt.patient?.name?.[0]}
                          {apt.patient?.last_name?.[0]}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                            <Typography variant="body1" sx={{ fontWeight: 500 }}>
                              {apt.patient?.name} {apt.patient?.last_name}
                            </Typography>
                            <Chip
                              label={statusConfig[apt.status]?.label ?? apt.status}
                              color={statusConfig[apt.status]?.color ?? 'default'}
                              size="small"
                            />
                          </Box>
                        }
                        secondary={
                          <Typography variant="body2" color="text.secondary">
                            {apt.start_time} - {apt.end_time}
                            {apt.reason ? ` | ${apt.reason}` : ''}
                            {apt.patient?.phone ? ` | Tel: ${apt.patient.phone}` : ''}
                          </Typography>
                        }
                      />
                    </ListItem>
                  ))}
              </List>
            </Card>
          </Box>
        ))}
      {Object.keys(groupedByDate).length === 0 && !loading && (
        <Typography color="text.secondary" sx={{ textAlign: 'center', py: 8 }}>
          No hay citas en este período
        </Typography>
      )}
    </Box>
  );

  const renderDayView = () => {
    const hours = Array.from({ length: 12 }, (_, i) => i + 7);
    const dayAppts = appointments.filter(
      (a) => a.date === currentDate.format('YYYY-MM-DD')
    );

    return (
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2, textTransform: 'capitalize' }}>
            {currentDate.format('dddd, D [de] MMMM YYYY')}
          </Typography>
          {hours.map((hour) => {
            const hourStr = hour.toString().padStart(2, '0');
            const hourAppts = dayAppts.filter(
              (a) => a.start_time.startsWith(hourStr)
            );
            return (
              <Box
                key={hour}
                sx={{
                  display: 'flex',
                  borderTop: '1px solid',
                  borderColor: 'divider',
                  minHeight: 60,
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    width: 60,
                    py: 1,
                    color: 'text.secondary',
                    fontWeight: 500,
                    flexShrink: 0,
                  }}
                >
                  {hourStr}:00
                </Typography>
                <Box sx={{ flex: 1, py: 0.5 }}>
                  {hourAppts.map((apt) => (
                    <Box
                      key={apt.id}
                      sx={{
                        bgcolor: 'primary.light',
                        color: 'white',
                        borderRadius: 1,
                        p: 1,
                        mb: 0.5,
                        cursor: 'pointer',
                      }}
                    >
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {apt.patient?.name} {apt.patient?.last_name}
                      </Typography>
                      <Typography variant="caption">
                        {apt.start_time} - {apt.end_time} | {apt.reason}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            );
          })}
        </CardContent>
      </Card>
    );
  };

  const renderWeekView = () => {
    const startOfWeek = currentDate.startOf('week');
    const days = Array.from({ length: 7 }, (_, i) => startOfWeek.add(i, 'day'));

    return (
      <Grid container spacing={1}>
        {days.map((day) => {
          const dayAppts = appointments.filter(
            (a) => a.date === day.format('YYYY-MM-DD')
          );
          const isToday = day.isSame(dayjs(), 'day');
          return (
            <Grid key={day.format()} size={{ xs: 12, sm: 6, md: 12 / 7 }}>
              <Card
                sx={{
                  minHeight: 150,
                  border: isToday ? '2px solid' : 'none',
                  borderColor: 'primary.main',
                }}
              >
                <CardContent sx={{ p: 1 }}>
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: 600,
                      color: isToday ? 'primary.main' : 'text.secondary',
                      textTransform: 'capitalize',
                    }}
                  >
                    {day.format('ddd D')}
                  </Typography>
                  {dayAppts.map((apt) => (
                    <Box
                      key={apt.id}
                      sx={{
                        bgcolor: 'primary.light',
                        color: 'white',
                        borderRadius: 0.5,
                        p: 0.5,
                        mt: 0.5,
                        fontSize: 11,
                        cursor: 'pointer',
                      }}
                    >
                      <Typography variant="caption" sx={{ fontWeight: 500 }}>
                        {apt.start_time} {apt.patient?.name}
                      </Typography>
                    </Box>
                  ))}
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    );
  };

  const renderMonthView = () => {
    const startOfMonth = currentDate.startOf('month');
    const startDay = startOfMonth.startOf('week');
    const weeks = [];
    let day = startDay;

    for (let w = 0; w < 6; w++) {
      const week = [];
      for (let d = 0; d < 7; d++) {
        week.push(day);
        day = day.add(1, 'day');
      }
      weeks.push(week);
    }

    return (
      <Card>
        <CardContent>
          <Grid container>
            {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((d) => (
              <Grid key={d} size={12 / 7}>
                <Typography
                  variant="caption"
                  sx={{ fontWeight: 600, color: 'text.secondary', textAlign: 'center', display: 'block' }}
                >
                  {d}
                </Typography>
              </Grid>
            ))}
          </Grid>
          {weeks.map((week, wi) => (
            <Grid container key={wi}>
              {week.map((d) => {
                const dayAppts = appointments.filter(
                  (a) => a.date === d.format('YYYY-MM-DD')
                );
                const isCurrentMonth = d.month() === currentDate.month();
                const isToday = d.isSame(dayjs(), 'day');
                return (
                  <Grid key={d.format()} size={12 / 7}>
                    <Box
                      sx={{
                        minHeight: 60,
                        p: 0.5,
                        borderTop: '1px solid',
                        borderColor: 'divider',
                        opacity: isCurrentMonth ? 1 : 0.4,
                      }}
                    >
                      <Typography
                        variant="caption"
                        sx={{
                          fontWeight: isToday ? 700 : 400,
                          color: isToday ? 'primary.main' : 'text.primary',
                        }}
                      >
                        {d.format('D')}
                      </Typography>
                      {dayAppts.slice(0, 2).map((apt) => (
                        <Box
                          key={apt.id}
                          sx={{
                            bgcolor: 'primary.light',
                            color: 'white',
                            borderRadius: 0.5,
                            px: 0.5,
                            mt: 0.25,
                            fontSize: 10,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {apt.start_time} {apt.patient?.name}
                        </Box>
                      ))}
                      {dayAppts.length > 2 && (
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 10 }}>
                          +{dayAppts.length - 2} más
                        </Typography>
                      )}
                    </Box>
                  </Grid>
                );
              })}
            </Grid>
          ))}
        </CardContent>
      </Card>
    );
  };

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
          flexWrap: 'wrap',
          gap: 1,
        }}
      >
        <Typography variant="h5">Agenda Médica</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setDialogOpen(true)}
        >
          Nueva Cita
        </Button>
      </Box>

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 2,
          flexWrap: 'wrap',
          gap: 1,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton onClick={() => navigateDate('prev')}>
            <ChevronLeft />
          </IconButton>
          <Typography variant="subtitle1" sx={{ fontWeight: 500, textTransform: 'capitalize', minWidth: 180, textAlign: 'center' }}>
            {view === 'month'
              ? currentDate.format('MMMM YYYY')
              : view === 'week'
              ? `Semana del ${currentDate.startOf('week').format('D MMM')} al ${currentDate.endOf('week').format('D MMM YYYY')}`
              : currentDate.format('D [de] MMMM YYYY')}
          </Typography>
          <IconButton onClick={() => navigateDate('next')}>
            <ChevronRight />
          </IconButton>
          <Button size="small" onClick={() => setCurrentDate(dayjs())}>
            Hoy
          </Button>
        </Box>

        <ToggleButtonGroup
          value={view}
          exclusive
          onChange={(_, v) => { if (v) setView(v as ViewType); }}
          size="small"
        >
          <ToggleButton value="list">
            {isMobile ? <ListViewIcon /> : 'Lista'}
          </ToggleButton>
          <ToggleButton value="day">
            {isMobile ? <DayViewIcon /> : 'Día'}
          </ToggleButton>
          <ToggleButton value="week">
            {isMobile ? <WeekViewIcon /> : 'Semana'}
          </ToggleButton>
          <ToggleButton value="month">
            {isMobile ? <MonthViewIcon /> : 'Mes'}
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {loading ? (
        <Box>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} height={80} sx={{ mb: 1 }} />
          ))}
        </Box>
      ) : (
        <>
          {view === 'list' && renderListView()}
          {view === 'day' && renderDayView()}
          {view === 'week' && renderWeekView()}
          {view === 'month' && renderMonthView()}
        </>
      )}

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Nueva Cita</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Nombre del Paciente"
              fullWidth
              value={newAppointment.patient_name}
              onChange={(e) =>
                setNewAppointment({ ...newAppointment, patient_name: e.target.value })
              }
            />
            <TextField
              label="Fecha"
              type="date"
              fullWidth
              value={newAppointment.date}
              onChange={(e) =>
                setNewAppointment({ ...newAppointment, date: e.target.value })
              }
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <Grid container spacing={2}>
              <Grid size={6}>
                <TextField
                  label="Hora Inicio"
                  type="time"
                  fullWidth
                  value={newAppointment.start_time}
                  onChange={(e) =>
                    setNewAppointment({ ...newAppointment, start_time: e.target.value })
                  }
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Grid>
              <Grid size={6}>
                <TextField
                  label="Hora Fin"
                  type="time"
                  fullWidth
                  value={newAppointment.end_time}
                  onChange={(e) =>
                    setNewAppointment({ ...newAppointment, end_time: e.target.value })
                  }
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Grid>
            </Grid>
            <TextField
              label="Motivo de la consulta"
              fullWidth
              multiline
              rows={2}
              value={newAppointment.reason}
              onChange={(e) =>
                setNewAppointment({ ...newAppointment, reason: e.target.value })
              }
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleCreateAppointment}>
            Crear Cita
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
