import { type ChangeEvent, type ReactNode, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  MenuItem,
  Snackbar,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { ContentCopy, LockOutlined as LockOutlinedIcon } from '@mui/icons-material';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { appointmentService } from '../../api/appointmentService';
import notificationService from '../../api/notificationService';
import settingsService, { type SettingsAgendaData, type SettingsAgendaDayInput, type SettingsCompanyData, type SettingsProfileData, type SettingsUnavailableDayItem } from '../../api/settingsService';
import { useAuth } from '../../hooks/useAuth';
import type { NotificationAssistantItem, NotificationAssistantRecipientsData, Office } from '../../types';

dayjs.locale('es');

type SettingsTab = 'perfil' | 'empresa' | 'agenda' | 'dias_inhabiles' | 'impresion' | 'asistentes' | 'herramientas';

const SETTINGS_TABS: Array<{ value: SettingsTab; label: string }> = [
  { value: 'perfil', label: 'PERFIL' },
  { value: 'empresa', label: 'EMPRESA' },
  { value: 'agenda', label: 'AGENDA' },
  { value: 'dias_inhabiles', label: 'DÍAS INHÁBILES' },
  { value: 'impresion', label: 'IMPRESIÓN' },
  { value: 'asistentes', label: 'ASISTENTES' },
  { value: 'herramientas', label: 'HERRAMIENTAS' },
];

type AgendaDayRow = {
  day: number;
  label: string;
  enabled: boolean;
  start: string;
  end: string;
  hasBreak: boolean;
  breakstart: string;
  breakend: string;
};

const AGENDA_DAY_LABELS: Record<number, string> = {
  1: 'LUNES',
  2: 'MARTES',
  3: 'MIÉRCOLES',
  4: 'JUEVES',
  5: 'VIERNES',
  6: 'SÁBADO',
  7: 'DOMINGO',
};

const TIME_OPTIONS = Array.from({ length: ((24 - 5) * 12) + 1 }, (_, index) => {
  const totalMinutes = (5 * 60) + (index * 5);
  const normalizedMinutes = totalMinutes === 24 * 60 ? 0 : totalMinutes;
  const hours = Math.floor(normalizedMinutes / 60)
    .toString()
    .padStart(2, '0');
  const minutes = (normalizedMinutes % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}`;
});

const DURATION_OPTIONS = Array.from({ length: 48 }, (_, index) => {
  const totalMinutes = (index + 1) * 5;
  const hours = Math.floor(totalMinutes / 60)
    .toString()
    .padStart(2, '0');
  const minutes = (totalMinutes % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}`;
});

function createDefaultAgendaRows(opendays?: Office['opendays']): AgendaDayRow[] {
  return Array.from({ length: 7 }, (_, index) => {
    const day = index + 1;
    const current = opendays?.find((item) => item.day === day);

    return {
      day,
      label: AGENDA_DAY_LABELS[day],
      enabled: Boolean(current),
      start: current?.start?.slice(0, 5) ?? '09:00',
      end: current?.end?.slice(0, 5) ?? '20:00',
      hasBreak: Boolean(current?.breakstart && current?.breakend),
      breakstart: current?.breakstart?.slice(0, 5) ?? '',
      breakend: current?.breakend?.slice(0, 5) ?? '',
    };
  });
}

function formatMinutesToTime(value: number | null | undefined, fallback = '00:50'): string {
  if (!value || value <= 0) {
    return fallback;
  }

  const hours = Math.floor(value / 60)
    .toString()
    .padStart(2, '0');
  const minutes = (value % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

function parseTimeToMinutes(value: string): number | null {
  if (!value) {
    return null;
  }

  const [hours, minutes] = value.split(':').map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return null;
  }

  return hours * 60 + minutes;
}

function TimeSelect({
  label,
  value,
  onChange,
  disabled,
  options = TIME_OPTIONS,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  options?: string[];
}) {
  return (
    <TextField
      select
      label={label}
      value={value}
      disabled={disabled}
      fullWidth
      variant="standard"
      onChange={(event) => onChange(event.target.value)}
    >
      {options.map((option) => (
        <MenuItem key={option} value={option}>
          {option}
        </MenuItem>
      ))}
    </TextField>
  );
}

function CardShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card elevation={0} sx={{ borderRadius: 2.5, border: '1px solid #d8e8ef', boxShadow: '0 12px 28px rgba(20, 96, 120, 0.08)' }}>
      <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
        <Typography variant="h6" sx={{ color: '#1e8b2d', fontWeight: 500, mb: 4 }}>
          {title}
        </Typography>
        {children}
      </CardContent>
    </Card>
  );
}

function getBackendOrigin(): string {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
  try {
    const apiOrigin = new URL(apiUrl).origin;
    const apiHost = new URL(apiUrl).hostname;

    if (apiHost === 'localhost' || apiHost === '127.0.0.1') {
      return 'http://lisa.test';
    }

    return apiOrigin;
  } catch {
    return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? 'http://lisa.test'
      : window.location.origin;
  }
}

function resolveOfficeLogoUrl(logoUrl?: string | null): string | null {
  if (!logoUrl) {
    return null;
  }

  if (/^https?:\/\//i.test(logoUrl) || logoUrl.startsWith('data:')) {
    return logoUrl;
  }

  if (logoUrl.startsWith('/')) {
    return `${getBackendOrigin()}${logoUrl}`;
  }

  return `${getBackendOrigin()}/${logoUrl}`;
}

function PlaceholderPanel({ title, description }: { title: string; description: string }) {
  return (
    <CardShell title={title}>
      <Typography variant="body1" color="text.secondary">
        {description}
      </Typography>
    </CardShell>
  );
}

function ProfilePanel({
  profile,
  saving,
  passwordSaving,
  onSaveProfile,
  onSavePassword,
}: {
  profile: SettingsProfileData | null;
  saving: boolean;
  passwordSaving: boolean;
  onSaveProfile: (payload: { specialty_id: number | null; name: string; last_name: string; phone: string }) => Promise<void>;
  onSavePassword: (payload: { current_password: string; new_password: string; new_password_confirmation: string }) => Promise<void>;
}) {
  const [specialtyId, setSpecialtyId] = useState<number | ''>(profile?.specialty_id ?? '');
  const [firstName, setFirstName] = useState(profile?.name ?? '');
  const [lastName, setLastName] = useState(profile?.last_name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    setSpecialtyId(profile?.specialty_id ?? '');
    setFirstName(profile?.name ?? '');
    setLastName(profile?.last_name ?? '');
    setPhone(profile?.phone ?? '');
  }, [profile]);

  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, md: 7 }}>
        <CardShell title="Datos personales">
          <TextField select label="Especialidad" value={specialtyId} fullWidth variant="standard" onChange={(event) => setSpecialtyId(event.target.value === '' ? '' : Number(event.target.value))} sx={{ mb: 3.5 }}>
            <MenuItem value="">Selecciona una especialidad</MenuItem>
            {(profile?.specialties ?? []).map((specialty) => (
              <MenuItem key={specialty.id} value={specialty.id}>{specialty.title}</MenuItem>
            ))}
          </TextField>
          <TextField label="Nombre(s)" value={firstName} fullWidth variant="standard" onChange={(event) => setFirstName(event.target.value)} sx={{ mb: 3.5 }} />
          <TextField label="Apellidos" value={lastName} fullWidth variant="standard" onChange={(event) => setLastName(event.target.value)} sx={{ mb: 3.5 }} />
          <TextField label="Teléfono" value={phone} fullWidth variant="standard" onChange={(event) => setPhone(event.target.value)} sx={{ mb: 3.5 }} />
          <TextField label="Correo electrónico" value={profile?.email ?? ''} fullWidth variant="standard" InputProps={{ readOnly: true }} sx={{ mb: 4 }} />
          <Button variant="contained" disabled={saving} onClick={() => void onSaveProfile({ specialty_id: specialtyId === '' ? null : specialtyId, name: firstName, last_name: lastName, phone })} sx={{ minWidth: 132, borderRadius: 1, backgroundColor: '#ea1d63', boxShadow: '0 8px 18px rgba(234, 29, 99, 0.28)', '&:hover': { backgroundColor: '#cf1857' } }}>
            {saving ? 'Guardando...' : 'Actualizar'}
          </Button>
        </CardShell>
      </Grid>
      <Grid size={{ xs: 12, md: 5 }}>
        <CardShell title="Seguridad">
          <TextField label="Contraseña actual" type="password" fullWidth variant="standard" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} sx={{ mb: 3.5 }} />
          <TextField label="Nueva contraseña" type="password" fullWidth variant="standard" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} sx={{ mb: 3.5 }} />
          <TextField label="Confirmar nueva contraseña" type="password" fullWidth variant="standard" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} sx={{ mb: 4 }} />
          <Button variant="contained" disabled={passwordSaving || !currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim()} onClick={() => void onSavePassword({ current_password: currentPassword, new_password: newPassword, new_password_confirmation: confirmPassword }).then(() => { setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); })} sx={{ minWidth: 132, mb: 4, borderRadius: 1, backgroundColor: '#ea1d63', boxShadow: '0 8px 18px rgba(234, 29, 99, 0.28)', '&:hover': { backgroundColor: '#cf1857' } }}>
            {passwordSaving ? 'Guardando...' : 'Actualizar'}
          </Button>
          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, color: '#2f8df4', fontSize: 14 }}>
            <LockOutlinedIcon sx={{ fontSize: 18 }} />
            <Typography variant="body2" sx={{ color: 'inherit' }}>Mi cuenta</Typography>
          </Box>
        </CardShell>
      </Grid>
    </Grid>
  );
}

function CompanyPanel({ offices, saving, onSaveCompany }: { offices: Office[]; saving: boolean; onSaveCompany: (payload: SettingsCompanyData) => Promise<void>; }) {
  const ownerOffices = useMemo(() => offices.filter((office) => office.role === 'owner'), [offices]);
  const [selectedOfficeId, setSelectedOfficeId] = useState<number>(ownerOffices[0]?.id ?? 0);
  const [title, setTitle] = useState('');
  const [address, setAddress] = useState('');
  const [suburb, setSuburb] = useState('');
  const [phone, setPhone] = useState('');
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  useEffect(() => {
    if (ownerOffices.length === 0) {
      setSelectedOfficeId(0);
      return;
    }
    const preferredOffice = ownerOffices.find((office) => office.logo_url) ?? ownerOffices[0];
    setSelectedOfficeId((current) => current && ownerOffices.some((office) => office.id === current) ? current : preferredOffice.id);
  }, [ownerOffices]);

  useEffect(() => {
    const office = ownerOffices.find((item) => item.id === selectedOfficeId);
    setTitle(office?.title ?? '');
    setAddress(office?.address ?? '');
    setSuburb(office?.suburb ?? '');
    setPhone(office?.phone ?? '');
    setLogoPreview(resolveOfficeLogoUrl(office?.logo_url));
  }, [ownerOffices, selectedOfficeId]);

  if (ownerOffices.length === 0) {
    return <PlaceholderPanel title="Empresa" description="Esta sección estará disponible cuando tengas al menos un consultorio propio para administrar su información general." />;
  }

  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, md: 7 }}>
        <CardShell title="Información del consultorio">
          <TextField select label="Consultorio" value={selectedOfficeId} fullWidth variant="standard" onChange={(event) => setSelectedOfficeId(Number(event.target.value))} sx={{ mb: 3.5 }}>
            {ownerOffices.map((office) => (
              <MenuItem key={office.id} value={office.id}>{office.title}</MenuItem>
            ))}
          </TextField>
          <TextField label="Nombre" value={title} fullWidth variant="standard" onChange={(event) => setTitle(event.target.value)} helperText="Este nombre se usará para identificar el consultorio dentro del sistema." FormHelperTextProps={{ sx: { color: '#f44336' } }} sx={{ mb: 3.5 }} />
          <TextField label="Calle y número" value={address} fullWidth variant="standard" onChange={(event) => setAddress(event.target.value)} sx={{ mb: 3.5 }} />
          <TextField label="Colonia" value={suburb} fullWidth variant="standard" onChange={(event) => setSuburb(event.target.value)} sx={{ mb: 3.5 }} />
          <TextField label="Teléfono" value={phone} fullWidth variant="standard" onChange={(event) => setPhone(event.target.value)} helperText="Ingresa el teléfono del hospital, del consultorio o de tu asistente." FormHelperTextProps={{ sx: { color: '#f44336' } }} sx={{ mb: 4 }} />
          <Button variant="contained" disabled={saving || !selectedOfficeId} onClick={() => void onSaveCompany({ office_id: selectedOfficeId, title, address, suburb, phone })} sx={{ minWidth: 132, borderRadius: 1, backgroundColor: '#ea1d63', boxShadow: '0 8px 18px rgba(234, 29, 99, 0.28)', '&:hover': { backgroundColor: '#cf1857' } }}>
            {saving ? 'Guardando...' : 'Actualizar'}
          </Button>
        </CardShell>
      </Grid>
      <Grid size={{ xs: 12, md: 5 }}>
        <CardShell title="Logotipo">
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
            Puedes seleccionar un logotipo y revisar su vista previa aquí antes de integrarlo al consultorio.
          </Typography>
          <Box sx={{ width: 250, height: 220, maxWidth: '100%', borderRadius: 2, background: 'linear-gradient(180deg, #f8fbfd 0%, #edf7fb 100%)', border: '1px solid #d8e8ef', boxShadow: '0 12px 22px rgba(20, 96, 120, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7d8b92', fontWeight: 600, mb: 2.5, overflow: 'hidden' }}>
            {logoPreview ? (
              <Box
                component="img"
                src={logoPreview}
                alt="Logotipo del consultorio"
                sx={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  display: 'block',
                  backgroundColor: '#fff',
                }}
              />
            ) : 'Vista previa del logotipo'}
          </Box>
          <Button variant="contained" component="label" sx={{ minWidth: 132, borderRadius: 999, backgroundColor: '#ea1d63', boxShadow: '0 8px 18px rgba(234, 29, 99, 0.28)', '&:hover': { backgroundColor: '#cf1857' } }}>
            Cargar
            <input hidden type="file" accept="image/*" onChange={(event: ChangeEvent<HTMLInputElement>) => {
              const file = event.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = () => {
                if (typeof reader.result === 'string') setLogoPreview(reader.result);
              };
              reader.readAsDataURL(file);
            }} />
          </Button>
        </CardShell>
      </Grid>
    </Grid>
  );
}

function AgendaPanel({
  offices,
  saving,
  onSaveAgenda,
  onCopied,
}: {
  offices: Office[];
  saving: boolean;
  onSaveAgenda: (payload: SettingsAgendaData) => Promise<void>;
  onCopied: () => void;
}) {
  const ownerOffices = useMemo(() => offices.filter((office) => office.role === 'owner'), [offices]);
  const [selectedOfficeId, setSelectedOfficeId] = useState<number>(ownerOffices[0]?.id ?? 0);
  const [agendaRows, setAgendaRows] = useState<AgendaDayRow[]>([]);
  const [firstTime, setFirstTime] = useState('00:50');
  const [recurrent, setRecurrent] = useState('00:50');

  useEffect(() => {
    if (ownerOffices.length === 0) {
      setSelectedOfficeId(0);
      return;
    }
    setSelectedOfficeId((current) => current && ownerOffices.some((office) => office.id === current) ? current : ownerOffices[0].id);
  }, [ownerOffices]);

  useEffect(() => {
    const office = ownerOffices.find((item) => item.id === selectedOfficeId);
    setAgendaRows(createDefaultAgendaRows(office?.opendays));
    setFirstTime(formatMinutesToTime(office?.firsttime));
    setRecurrent(formatMinutesToTime(office?.recurrent));
  }, [ownerOffices, selectedOfficeId]);

  const selectedOffice = ownerOffices.find((item) => item.id === selectedOfficeId);
  const publicLink = selectedOffice?.getlink ? `${window.location.origin}/nuevacita/${selectedOffice.getlink}` : '';
  const buildAgendaPayload = (rows: AgendaDayRow[], nextFirstTime = firstTime, nextRecurrent = recurrent): SettingsAgendaData => ({
    office_id: selectedOfficeId,
    firsttime: parseTimeToMinutes(nextFirstTime),
    recurrent: parseTimeToMinutes(nextRecurrent),
    opendays: rows.map<SettingsAgendaDayInput>((row) => ({
      day: row.day,
      enabled: row.enabled,
      start: row.start,
      end: row.end,
      breakstart: row.hasBreak ? row.breakstart || undefined : undefined,
      breakend: row.hasBreak ? row.breakend || undefined : undefined,
    })),
  });

  const persistAgenda = async (rows: AgendaDayRow[], nextFirstTime = firstTime, nextRecurrent = recurrent) => {
    if (!selectedOfficeId) {
      return;
    }

    await onSaveAgenda(buildAgendaPayload(rows, nextFirstTime, nextRecurrent));
  };

  const updateRows = (updater: (current: AgendaDayRow[]) => AgendaDayRow[]) => {
    setAgendaRows((current) => {
      const nextRows = updater(current);
      void persistAgenda(nextRows);
      return nextRows;
    });
  };

  if (ownerOffices.length === 0) {
    return <PlaceholderPanel title="Agenda" description="Esta sección estará disponible cuando tengas al menos un consultorio propio para administrar sus horarios." />;
  }

  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, md: 7 }}>
        <CardShell title="Link público de fechas y horarios">
          <TextField select label="Consultorio" value={selectedOfficeId} fullWidth variant="standard" onChange={(event) => setSelectedOfficeId(Number(event.target.value))} sx={{ mb: 3 }}>
            {ownerOffices.map((office) => (
              <MenuItem key={office.id} value={office.id}>{office.title}</MenuItem>
            ))}
          </TextField>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Este link muestra las fechas y horarios disponibles para una nueva cita. Puedes compartirlo en redes sociales o por mensaje directo para que el público agende una cita.
          </Typography>
          <Box sx={{ p: 2, borderRadius: 2, border: '1px solid #d8e8ef', backgroundColor: '#f8fcfe', display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, gap: 2, flexDirection: { xs: 'column', md: 'row' } }}>
            <Typography sx={{ color: '#2f8df4', wordBreak: 'break-all' }}>{publicLink}</Typography>
            <Button variant="contained" startIcon={<ContentCopy />} onClick={() => { if (!publicLink) return; void navigator.clipboard.writeText(publicLink).then(onCopied); }} sx={{ minWidth: 132, backgroundColor: '#6bc5ea', boxShadow: '0 8px 18px rgba(107, 197, 234, 0.28)', '&:hover': { backgroundColor: '#55b7df' } }}>
              Copiar link
            </Button>
          </Box>
        </CardShell>
      </Grid>
      <Grid size={{ xs: 12, md: 5 }}>
        <CardShell title="Minutos asignados por tipo de paciente">
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography sx={{ minWidth: 170 }}>Paciente de primera vez</Typography>
              <TimeSelect
                label="Tiempo"
                value={firstTime}
                disabled={saving}
                onChange={(value) => {
                  setFirstTime(value);
                  void persistAgenda(agendaRows, value, recurrent);
                }}
                options={DURATION_OPTIONS}
              />
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography sx={{ minWidth: 170 }}>Paciente subsecuente</Typography>
              <TimeSelect
                label="Tiempo"
                value={recurrent}
                disabled={saving}
                onChange={(value) => {
                  setRecurrent(value);
                  void persistAgenda(agendaRows, firstTime, value);
                }}
                options={DURATION_OPTIONS}
              />
            </Box>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
            También puedes asignar minutos de la cita según el motivo de la cita más adelante. Por ahora este apartado ajusta los minutos base para paciente de primera vez y paciente subsecuente.
          </Typography>
        </CardShell>
      </Grid>
      <Grid size={{ xs: 12 }}>
        <CardShell title="Configuración de días y horarios laborales">
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {agendaRows.map((row, index) => (
              <Box key={row.day} sx={{ border: '1px solid #d8e8ef', borderRadius: 2, px: 2, py: 2 }}>
                <Grid container spacing={2} alignItems="center">
                  <Grid size={{ xs: 12, md: 4 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Checkbox
                        checked={row.enabled}
                        disabled={saving}
                        onChange={(event) =>
                          updateRows((current) =>
                            current.map((item, itemIndex) => itemIndex === index ? { ...item, enabled: event.target.checked } : item)
                          )
                        }
                      />
                      <Typography
                        sx={{ fontWeight: 700, cursor: 'pointer', userSelect: 'none' }}
                        onClick={() =>
                          !saving &&
                          updateRows((current) =>
                            current.map((item, itemIndex) => itemIndex === index ? { ...item, enabled: !item.enabled } : item)
                          )
                        }
                      >
                        {row.label}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <TimeSelect
                      label="De"
                      value={row.start}
                      disabled={!row.enabled || saving}
                      onChange={(value) =>
                        updateRows((current) =>
                          current.map((item, itemIndex) => itemIndex === index ? { ...item, start: value } : item)
                        )
                      }
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <TimeSelect
                      label="Hasta"
                      value={row.end}
                      disabled={!row.enabled || saving}
                      onChange={(value) =>
                        updateRows((current) =>
                          current.map((item, itemIndex) => itemIndex === index ? { ...item, end: value } : item)
                        )
                      }
                    />
                  </Grid>
                </Grid>
                <Grid container spacing={2} alignItems="center" sx={{ mt: 0.5 }}>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Checkbox
                        checked={row.hasBreak}
                        disabled={!row.enabled || saving}
                        onChange={(event) =>
                          updateRows((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index
                                ? {
                                    ...item,
                                    hasBreak: event.target.checked,
                                    breakstart: event.target.checked ? item.breakstart || '14:00' : '',
                                    breakend: event.target.checked ? item.breakend || '15:00' : '',
                                  }
                                : item
                            )
                          )
                        }
                        sx={{ ml: -1 }}
                      />
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ cursor: row.enabled && !saving ? 'pointer' : 'default', userSelect: 'none' }}
                        onClick={() => {
                          if (!row.enabled || saving) {
                            return;
                          }
                          updateRows((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index
                                ? {
                                    ...item,
                                    hasBreak: !item.hasBreak,
                                    breakstart: !item.hasBreak ? item.breakstart || '14:00' : '',
                                    breakend: !item.hasBreak ? item.breakend || '15:00' : '',
                                  }
                                : item
                            )
                          );
                        }}
                      >
                        Incluir horarios de descanso
                      </Typography>
                    </Box>
                  </Grid>
                  {row.hasBreak ? (
                    <>
                      <Grid size={{ xs: 12, md: 4 }}>
                        <TimeSelect
                          label="Inicio"
                          value={row.breakstart || '14:00'}
                          disabled={!row.enabled || !row.hasBreak || saving}
                          onChange={(value) =>
                            updateRows((current) =>
                              current.map((item, itemIndex) => itemIndex === index ? { ...item, breakstart: value } : item)
                            )
                          }
                        />
                      </Grid>
                      <Grid size={{ xs: 12, md: 4 }}>
                        <TimeSelect
                          label="Fin"
                          value={row.breakend || '15:00'}
                          disabled={!row.enabled || !row.hasBreak || saving}
                          onChange={(value) =>
                            updateRows((current) =>
                              current.map((item, itemIndex) => itemIndex === index ? { ...item, breakend: value } : item)
                            )
                          }
                        />
                      </Grid>
                    </>
                  ) : (
                    <>
                      <Grid size={{ xs: 12, md: 4 }} />
                      <Grid size={{ xs: 12, md: 4 }} />
                    </>
                  )}
                </Grid>
              </Box>
            ))}
          </Box>
        </CardShell>
      </Grid>
    </Grid>
  );
}

function UnavailableDaysPanel({ offices, onSuccess, onError }: {
  offices: Office[];
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}) {
  const ownerOffices = useMemo(() => offices.filter((office) => office.role === 'owner'), [offices]);
  const [selectedOfficeId, setSelectedOfficeId] = useState<number>(ownerOffices[0]?.id ?? 0);
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [records, setRecords] = useState<SettingsUnavailableDayItem[]>([]);
  const [availableDate, setAvailableDate] = useState(new Date().toISOString().slice(0, 10));
  const [availableStart, setAvailableStart] = useState('09:00');
  const [availableEnd, setAvailableEnd] = useState('20:00');
  const [availableRecords, setAvailableRecords] = useState<Array<{
    id: number;
    date: string;
    start: string;
    end: string;
    date_label: string;
    start_label: string;
    end_label: string;
  }>>([]);
  const [loading, setLoading] = useState(false);
  const [availableLoading, setAvailableLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [availableSaving, setAvailableSaving] = useState(false);
  const [availableWarning, setAvailableWarning] = useState<string | null>(null);
  const [availableError, setAvailableError] = useState<string | null>(null);

  useEffect(() => {
    if (ownerOffices.length === 0) {
      setSelectedOfficeId(0);
      return;
    }

    setSelectedOfficeId((current) =>
      current && ownerOffices.some((office) => office.id === current) ? current : ownerOffices[0].id
    );
  }, [ownerOffices]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (!selectedOfficeId) {
        setRecords([]);
        setAvailableRecords([]);
        return;
      }

      setLoading(true);
      setAvailableLoading(true);
      try {
        const [data, availableData] = await Promise.all([
          settingsService.getUnavailableDays(selectedOfficeId),
          settingsService.getAvailableDays(selectedOfficeId),
        ]);
        if (mounted) {
          setRecords(data);
          setAvailableRecords(availableData);
          setAvailableWarning(null);
          setAvailableError(null);
        }
      } catch (err) {
        if (mounted) {
          onError(err instanceof Error ? err.message : 'No fue posible cargar los días inhábiles.');
        }
      } finally {
        if (mounted) {
          setLoading(false);
          setAvailableLoading(false);
        }
      }
    };

    void load();

    return () => {
      mounted = false;
    };
  }, [onError, selectedOfficeId]);

  if (ownerOffices.length === 0) {
    return <PlaceholderPanel title="Días in-hábiles" description="Esta sección estará disponible cuando tengas al menos un consultorio propio para administrar días inhábiles." />;
  }

  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12 }}>
        <CardShell title="Registro de días inhábiles">
          <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
            <TextField
              select
              label="Consultorio"
              value={selectedOfficeId}
              fullWidth
              variant="standard"
              onChange={(event) => setSelectedOfficeId(Number(event.target.value))}
              sx={{ mb: 3.5 }}
            >
              {ownerOffices.map((office) => (
                <MenuItem key={office.id} value={office.id}>{office.title}</MenuItem>
              ))}
            </TextField>
            <DatePicker
              label="Fecha inicial"
              value={startDate ? dayjs(startDate) : null}
              onChange={(value) => setStartDate(value ? value.format('YYYY-MM-DD') : '')}
              slotProps={{
                textField: {
                  fullWidth: true,
                  variant: 'standard',
                  sx: { mb: 3.5 },
                },
              }}
            />
            <DatePicker
              label="Fecha final"
              value={endDate ? dayjs(endDate) : null}
              minDate={startDate ? dayjs(startDate) : undefined}
              onChange={(value) => setEndDate(value ? value.format('YYYY-MM-DD') : '')}
              slotProps={{
                textField: {
                  fullWidth: true,
                  variant: 'standard',
                  sx: { mb: 4 },
                },
              }}
            />
            <Button
              variant="contained"
              disabled={saving || !selectedOfficeId || !startDate || !endDate}
              onClick={() => {
                setSaving(true);
                void settingsService.createUnavailableDay({
                  office_id: selectedOfficeId,
                  start_date: startDate,
                  end_date: endDate,
                }).then((record) => {
                  setRecords((current) => [record, ...current]);
                  onSuccess('Días inhábiles registrados correctamente.');
                }).catch((err) => {
                  onError(err instanceof Error ? err.message : 'No fue posible registrar los días inhábiles.');
                }).finally(() => {
                  setSaving(false);
                });
              }}
              sx={{ minWidth: 132, borderRadius: 1, backgroundColor: '#ea1d63', boxShadow: '0 8px 18px rgba(234, 29, 99, 0.28)', '&:hover': { backgroundColor: '#cf1857' } }}
            >
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
            <Divider sx={{ my: 4 }} />
            <Typography variant="h6" sx={{ color: '#1e8b2d', fontWeight: 500, mb: 3 }}>
              Días inhábiles registrados
            </Typography>
            {loading ? (
              <Box sx={{ minHeight: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CircularProgress />
              </Box>
            ) : records.length ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {records.map((record) => (
                  <Box key={record.id} sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr auto' }, gap: 2, alignItems: 'center', borderBottom: '1px solid #e2eef3', pb: 2 }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Fecha inicial</Typography>
                      <Typography>{record.start_date_label}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Fecha final</Typography>
                      <Typography>{record.end_date_label}</Typography>
                    </Box>
                    <Button
                      color="error"
                      variant="text"
                      onClick={() => {
                        void settingsService.deleteUnavailableDay(record.id).then(() => {
                          setRecords((current) => current.filter((item) => item.id !== record.id));
                          onSuccess('Registro eliminado correctamente.');
                        }).catch((err) => {
                          onError(err instanceof Error ? err.message : 'No fue posible eliminar el registro.');
                        });
                      }}
                    >
                      Eliminar
                    </Button>
                  </Box>
                ))}
              </Box>
            ) : (
              <Typography color="text.secondary">Todavía no hay días inhábiles registrados para este consultorio.</Typography>
            )}
          </LocalizationProvider>
        </CardShell>
      </Grid>
      <Grid size={{ xs: 12 }}>
        <CardShell title="Registro de días hábiles">
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
            Registra aquí días específicos que quieras habilitar fuera de tu configuración semanal habitual.
          </Typography>
          {availableWarning ? (
            <Alert
              severity="warning"
              variant="filled"
              onClose={() => setAvailableWarning(null)}
              sx={{
                mb: 3,
                borderRadius: 2,
                alignItems: 'flex-start',
                backgroundColor: '#fdf1e3',
                color: '#7a4b11',
                '& .MuiAlert-icon': {
                  color: '#f09a2a',
                },
              }}
            >
              {availableWarning}
            </Alert>
          ) : null}
          <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
            <DatePicker
              label="Fecha hábil"
              value={availableDate ? dayjs(availableDate) : null}
              onChange={(value) => setAvailableDate(value ? value.format('YYYY-MM-DD') : '')}
              slotProps={{
                textField: {
                  fullWidth: true,
                  variant: 'standard',
                  sx: { mb: 3.5 },
                },
              }}
            />
          </LocalizationProvider>
          <TimeSelect label="Desde" value={availableStart} onChange={setAvailableStart} disabled={availableSaving} />
          <Box sx={{ height: 24 }} />
          <TimeSelect label="Hasta" value={availableEnd} onChange={setAvailableEnd} disabled={availableSaving} />
          <Button
            variant="contained"
            disabled={availableSaving || !selectedOfficeId || !availableDate || !availableStart || !availableEnd}
            onClick={() => {
              setAvailableSaving(true);
              setAvailableWarning(null);
              setAvailableError(null);
              void settingsService.createAvailableDay({
                office_id: selectedOfficeId,
                date: availableDate,
                start: availableStart,
                end: availableEnd,
              }).then(({ record, warning }) => {
                setAvailableRecords((current) => {
                  const next = [record, ...current.filter((item) => item.id !== record.id)];
                  return next.sort((a, b) => a.date.localeCompare(b.date));
                });
                if (warning) {
                  setAvailableWarning(warning);
                  onSuccess('Día hábil registrado correctamente.');
                } else {
                  onSuccess('Día hábil registrado correctamente.');
                }
              }).catch((err) => {
                const backendMessage =
                  typeof err === 'object' &&
                  err !== null &&
                  'response' in err &&
                  typeof (err as { response?: { data?: { message?: unknown } } }).response?.data?.message === 'string'
                    ? ((err as { response?: { data?: { message?: string } } }).response?.data?.message ?? '')
                    : '';

                setAvailableError(backendMessage || (err instanceof Error ? err.message : 'No fue posible registrar el día hábil.'));
              }).finally(() => {
                setAvailableSaving(false);
              });
            }}
            sx={{ mt: 4, minWidth: 132, borderRadius: 1, backgroundColor: '#ea1d63', boxShadow: '0 8px 18px rgba(234, 29, 99, 0.28)', '&:hover': { backgroundColor: '#cf1857' } }}
          >
            {availableSaving ? 'Guardando...' : 'Guardar'}
          </Button>
          {availableError ? (
            <Alert
              severity="warning"
              variant="filled"
              onClose={() => setAvailableError(null)}
              sx={{
                mt: 3,
                borderRadius: 2,
                alignItems: 'flex-start',
                backgroundColor: '#fdf1e3',
                color: '#7a4b11',
                '& .MuiAlert-icon': {
                  color: '#f09a2a',
                },
              }}
            >
              {availableError}
            </Alert>
          ) : null}
          <Divider sx={{ my: 4 }} />
          <Typography variant="h6" sx={{ color: '#1e8b2d', fontWeight: 500, mb: 3 }}>
              Días hábiles registrados
          </Typography>
          {availableLoading ? (
            <Box sx={{ minHeight: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CircularProgress />
            </Box>
          ) : availableRecords.length ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {availableRecords.map((record) => (
                <Box key={record.id} sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr auto' }, gap: 2, alignItems: 'center', borderBottom: '1px solid #e2eef3', pb: 2 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Fecha hábil</Typography>
                    <Typography>{record.date_label}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Desde</Typography>
                    <Typography>{record.start_label}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Hasta</Typography>
                    <Typography>{record.end_label}</Typography>
                  </Box>
                  <Button
                    color="error"
                    variant="text"
                    onClick={() => {
                      void settingsService.deleteAvailableDay(record.id).then(() => {
                        setAvailableRecords((current) => current.filter((item) => item.id !== record.id));
                        onSuccess('Registro eliminado correctamente.');
                      }).catch((err) => {
                        onError(err instanceof Error ? err.message : 'No fue posible eliminar el registro.');
                      });
                    }}
                  >
                    Eliminar
                  </Button>
                </Box>
              ))}
            </Box>
          ) : (
            <Typography color="text.secondary">Todavía no hay días hábiles registrados para este consultorio.</Typography>
          )}
        </CardShell>
      </Grid>
    </Grid>
  );
}

function AssistantsPanel({ offices }: { offices: Office[] }) {
  const ownerOffices = useMemo(() => offices.filter((office) => office.role === 'owner'), [offices]);
  const [selectedOfficeId, setSelectedOfficeId] = useState<number>(ownerOffices[0]?.id ?? 0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [assistantData, setAssistantData] = useState<NotificationAssistantRecipientsData | null>(null);
  const [assistantToDelete, setAssistantToDelete] = useState<NotificationAssistantItem | null>(null);

  useEffect(() => {
    if (ownerOffices.length === 0) {
      setSelectedOfficeId(0);
      return;
    }
    setSelectedOfficeId((current) => current && ownerOffices.some((office) => office.id === current) ? current : ownerOffices[0].id);
  }, [ownerOffices]);

  useEffect(() => {
    let mounted = true;
    const loadAssistants = async () => {
      if (!selectedOfficeId) {
        setAssistantData(null);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const data = await notificationService.getAssistantRecipients(selectedOfficeId);
        if (mounted) setAssistantData(data);
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : 'No fue posible cargar los asistentes del consultorio.');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void loadAssistants();
    return () => {
      mounted = false;
    };
  }, [selectedOfficeId]);

  if (ownerOffices.length === 0) {
    return <PlaceholderPanel title="Asistentes" description="Esta sección estará disponible cuando tengas al menos un consultorio propio para administrar asistentes." />;
  }

  return (
    <>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 4 }}>
          <CardShell title="Consultorio">
            <TextField select label="Selecciona un consultorio" value={selectedOfficeId} onChange={(event) => setSelectedOfficeId(Number(event.target.value))} fullWidth>
              {ownerOffices.map((office) => (
                <MenuItem key={office.id} value={office.id}>{office.title}</MenuItem>
              ))}
            </TextField>
            <Divider sx={{ my: 3 }} />
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>Asistentes registrados:</Typography>
            <Typography variant="h4" sx={{ fontWeight: 700, color: '#164a58', mb: 2 }}>{assistantData?.limits.registered_assistants ?? 0}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>Reciben alertas:</Typography>
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#2f8df4' }}>{assistantData?.limits.enabled_assistants ?? 0}</Typography>
          </CardShell>
        </Grid>
        <Grid size={{ xs: 12, md: 8 }}>
          <CardShell title="Asistentes del consultorio">
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Aquí puedes revisar qué asistentes están ligados al consultorio y deshabilitar su acceso cuando sea necesario.
            </Typography>
            {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
            {loading ? (
              <Box sx={{ minHeight: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CircularProgress />
              </Box>
            ) : assistantData?.assistants.length ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {assistantData.assistants.map((assistant) => (
                  <Box key={assistant.assistant_id} sx={{ border: '1px solid #d8e8ef', borderRadius: 2, px: 2, py: 2, display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, gap: 2, flexDirection: { xs: 'column', md: 'row' } }}>
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#164a58' }}>{assistant.name || 'Asistente sin nombre'}</Typography>
                      <Typography variant="body2" color="text.secondary">{assistant.phone || 'Sin teléfono registrado'}</Typography>
                      <Typography variant="body2" sx={{ mt: 0.5, color: assistant.enabled ? '#1e8b2d' : '#7d8b92' }}>{assistant.enabled ? 'Recibe alertas activas' : 'Sin alertas activas'}</Typography>
                    </Box>
                    <Button variant="outlined" color="error" onClick={() => setAssistantToDelete(assistant)} sx={{ minWidth: 126 }}>Eliminar</Button>
                  </Box>
                ))}
              </Box>
            ) : (
              <Alert severity="info">Este consultorio todavía no tiene asistentes registrados.</Alert>
            )}
          </CardShell>
        </Grid>
      </Grid>
      <Dialog open={Boolean(assistantToDelete)} onClose={() => setAssistantToDelete(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Eliminar asistente</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">Si eliminas a este asistente del sistema, ya no tendrá acceso. Si solo quieres deshabilitar sus alertas, puedes hacerlo desde el módulo de WhatsApp.</Typography>
          <Typography variant="subtitle2" sx={{ mt: 2, fontWeight: 700 }}>{assistantToDelete?.name || 'Asistente seleccionado'}</Typography>
          <Typography variant="body2" color="text.secondary">{assistantToDelete?.phone || 'Sin teléfono registrado'}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssistantToDelete(null)}>Cancelar</Button>
          <Button color="error" variant="contained" onClick={() => {
            if (!assistantToDelete) return;
            void notificationService.disableAssistant(assistantToDelete.assistant_id).then((data) => {
              setAssistantData(data);
              setSuccessMessage('Asistente eliminado correctamente.');
              setAssistantToDelete(null);
            }).catch((err) => {
              setError(err instanceof Error ? err.message : 'No fue posible eliminar al asistente.');
            });
          }}>Eliminar</Button>
        </DialogActions>
      </Dialog>
      <Snackbar open={Boolean(successMessage)} autoHideDuration={2500} onClose={() => setSuccessMessage(null)} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert severity="success" variant="filled" onClose={() => setSuccessMessage(null)} sx={{ width: '100%' }}>{successMessage}</Alert>
      </Snackbar>
    </>
  );
}

export default function SettingsPage() {
  const { updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingsTab>('perfil');
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<SettingsProfileData | null>(null);
  const [offices, setOffices] = useState<Office[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [companySaving, setCompanySaving] = useState(false);
  const [agendaSaving, setAgendaSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [profileResponse, officesResponse] = await Promise.all([
          settingsService.getProfile(),
          appointmentService.getOffices().catch(() => [] as Office[]),
        ]);
        if (!mounted) return;
        setProfile(profileResponse);
        setOffices(officesResponse);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'No fue posible cargar la configuración.');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, []);

  const currentPanel = useMemo(() => {
    switch (activeTab) {
      case 'perfil':
        return (
          <ProfilePanel
            profile={profile}
            saving={profileSaving}
            passwordSaving={passwordSaving}
            onSaveProfile={async (payload) => {
              setProfileSaving(true);
              setError(null);
              try {
                const updated = await settingsService.updateProfile(payload);
                setProfile(updated);
                updateUser((current) => current ? { ...current, name: updated.full_name, email: updated.email, phone: updated.phone } : current);
                setSuccessMessage('Perfil actualizado correctamente.');
              } catch (err) {
                setError(err instanceof Error ? err.message : 'No fue posible actualizar el perfil.');
              } finally {
                setProfileSaving(false);
              }
            }}
            onSavePassword={async (payload) => {
              setPasswordSaving(true);
              setError(null);
              try {
                await settingsService.updatePassword(payload);
                setSuccessMessage('Contraseña actualizada correctamente.');
              } catch (err) {
                setError(err instanceof Error ? err.message : 'No fue posible actualizar la contraseña.');
              } finally {
                setPasswordSaving(false);
              }
            }}
          />
        );
      case 'empresa':
        return (
          <CompanyPanel
            offices={offices}
            saving={companySaving}
            onSaveCompany={async (payload) => {
              setCompanySaving(true);
              setError(null);
              try {
                const updated = await settingsService.updateCompany(payload);
                setOffices((current) => current.map((office) => office.id === updated.id ? { ...office, title: updated.title, address: updated.address, suburb: updated.suburb, phone: updated.phone } : office));
                setSuccessMessage('Información del consultorio actualizada correctamente.');
              } catch (err) {
                setError(err instanceof Error ? err.message : 'No fue posible actualizar la información del consultorio.');
              } finally {
                setCompanySaving(false);
              }
            }}
          />
        );
      case 'agenda':
        return (
          <AgendaPanel
            offices={offices}
            saving={agendaSaving}
            onCopied={() => setSuccessMessage('Link copiado correctamente.')}
            onSaveAgenda={async (payload) => {
              setAgendaSaving(true);
              setError(null);
              try {
                const updated = await settingsService.updateAgenda(payload);
                setOffices((current) => current.map((office) => office.id === updated.id ? { ...office, firsttime: updated.firsttime, recurrent: updated.recurrent, opendays: updated.opendays } : office));
                setSuccessMessage('Configuración de agenda actualizada correctamente.');
              } catch (err) {
                setError(err instanceof Error ? err.message : 'No fue posible actualizar la configuración de agenda.');
              } finally {
                setAgendaSaving(false);
              }
            }}
          />
        );
      case 'dias_inhabiles':
        return (
          <UnavailableDaysPanel
            offices={offices}
            onSuccess={(message) => setSuccessMessage(message)}
            onError={(message) => setError(message)}
          />
        );
      case 'impresion':
        return <PlaceholderPanel title="Impresión" description="Aquí podremos ajustar formatos de impresión, membretes, firmas, plantillas y salidas físicas del consultorio." />;
      case 'asistentes':
        return <AssistantsPanel offices={offices} />;
      case 'herramientas':
        return <PlaceholderPanel title="Herramientas" description="Aquí podremos agrupar herramientas complementarias y configuraciones avanzadas del sistema." />;
      default:
        return null;
    }
  }, [activeTab, agendaSaving, companySaving, offices, passwordSaving, profile, profileSaving, updateUser]);

  return (
    <Box sx={{ minHeight: 'calc(100vh - 112px)', borderRadius: 3, background: 'linear-gradient(180deg, #dff7ff 0%, #d4f3ff 100%)', border: '1px solid #caecf6', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.6)', p: { xs: 1.5, md: 2 } }}>
      <Box sx={{ borderRadius: 2, background: 'linear-gradient(90deg, #28bfd6 0%, #14abc7 100%)', boxShadow: '0 10px 22px rgba(15, 142, 164, 0.22)', px: { xs: 1, md: 2 }, pt: 1.5 }}>
        <Tabs value={activeTab} onChange={(_, value: SettingsTab) => setActiveTab(value)} variant="scrollable" scrollButtons="auto" TabIndicatorProps={{ sx: { display: 'none' } }} sx={{ minHeight: 56, '& .MuiTabs-flexContainer': { gap: 0.5 } }}>
          {SETTINGS_TABS.map((tab) => (
            <Tab key={tab.value} value={tab.value} label={tab.label} sx={{ minHeight: 44, px: 2, py: 1, borderRadius: 1, color: 'rgba(255,255,255,0.95)', fontSize: 13, fontWeight: 700, '&.Mui-selected': { color: '#fff', backgroundColor: 'rgba(255,255,255,0.14)' } }} />
          ))}
        </Tabs>
      </Box>
      <Divider sx={{ opacity: 0, mb: 2 }} />
      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      {loading ? (
        <Box sx={{ minHeight: 320, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CircularProgress />
        </Box>
      ) : currentPanel}
      <Snackbar open={Boolean(successMessage)} autoHideDuration={2500} onClose={() => setSuccessMessage(null)} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert severity="success" variant="filled" onClose={() => setSuccessMessage(null)} sx={{ width: '100%' }}>{successMessage}</Alert>
      </Snackbar>
    </Box>
  );
}
