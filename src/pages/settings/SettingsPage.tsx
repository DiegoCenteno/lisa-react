import { memo, type ChangeEvent, type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
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
  IconButton,
  MenuItem,
  Snackbar,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { ContentCopy, DeleteOutline, ExpandLess, ExpandMore, LockOutlined as LockOutlinedIcon } from '@mui/icons-material';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { appointmentService } from '../../api/appointmentService';
import { useLocation } from 'react-router-dom';
import notificationService from '../../api/notificationService';
import settingsService, { type SettingsAgendaData, type SettingsAgendaDayInput, type SettingsCompanyData, type SettingsFormsData, type SettingsLabelStatusItem, type SettingsPdfReportTemplateCatalogData, type SettingsPdfReportTemplateSummary, type SettingsPrintData, type SettingsProfileData, type SettingsReportsData, type SettingsUnavailableDayItem } from '../../api/settingsService';
import { useAuth } from '../../hooks/useAuth';
import type { NotificationAssistantItem, NotificationAssistantRecipientsData, NotificationPreassistantItem, Office, OfficeLabelItem } from '../../types';
import { getPdfReportTemplateCategoryLabel } from '../../utils/pdfReportTemplateLabels';

dayjs.locale('es');

type SettingsTab = 'perfil' | 'empresa' | 'agenda' | 'dias_inhabiles' | 'impresion' | 'asistentes' | 'herramientas' | 'reportes' | 'etiquetas';

const SETTINGS_TABS: Array<{ value: SettingsTab; label: string }> = [
  { value: 'perfil', label: 'PERFIL' },
  { value: 'empresa', label: 'EMPRESA' },
  { value: 'agenda', label: 'AGENDA' },
  { value: 'dias_inhabiles', label: 'DÍAS IN-HABILES' },
  { value: 'impresion', label: 'IMPRESIÓN' },
  { value: 'asistentes', label: 'ASISTENTES' },
  { value: 'herramientas', label: 'FORMULARIOS' },
  { value: 'reportes', label: 'REPORTES' },
  { value: 'etiquetas', label: 'ETIQUETAS' },
];

const TAG_STATUS_VISIBLE_DAYS_OPTIONS: Array<{ value: number | 'always'; label: string }> = [
  { value: 'always', label: 'Siempre activa' },
  { value: 1, label: '1 día' },
  { value: 2, label: '2 días' },
  { value: 3, label: '3 días' },
  { value: 5, label: '5 días' },
  { value: 7, label: '7 días' },
  { value: 10, label: '10 días' },
  { value: 15, label: '15 días' },
  { value: 30, label: '30 días' },
  { value: 60, label: '60 días' },
  { value: 90, label: '90 días' },
];

type FormFieldDefinition = {
  key: string;
  label: string;
  helperText?: string;
};

type FormFieldGroup = {
  title: string;
  fields: FormFieldDefinition[];
};

type CustomHistoryModule = 'heredofamiliares' | 'personales_no_patologicos' | 'personales_patologicos' | 'ginecologicos';
type CustomHistoryInputType = 'checkbox' | 'text' | 'textarea' | 'select' | 'checkbox_with_text';

type CustomHistoryFieldDefinition = SettingsFormsData['custom_history_fields'][CustomHistoryModule][number];
type ConsultationReasonDefinition = SettingsFormsData['consultation_reasons'][number];

const CLINICAL_HISTORY_GROUPS: FormFieldGroup[] = [
  {
    title: 'Antecedentes heredofamiliares',
    fields: [
      { key: 'tiposangre', label: 'Grupo sanguíneo y RH' },
      { key: 'cgdm', label: 'CGDM' },
      { key: 'consanguineos', label: 'Consanguíneos' },
      { key: 'geneticosodefectos', label: 'A. genéticos y/o defectos' },
      { key: 'familiarpreeclampsia', label: 'Antecedente familiar de preeclampsia' },
      { key: 'familiarpareja', label: 'Nombre pareja' },
      { key: 'diabetes', label: 'Diabetes mellitus' },
      { key: 'cancer', label: 'Cáncer' },
      { key: 'hipertension', label: 'Hipertensión' },
      { key: 'reumatica', label: 'Enfermedad reumática' },
      { key: 'antfam', label: 'Otras' },
    ],
  },
  {
    title: 'Antecedentes personales no patológicos',
    fields: [
      { key: 'originaria', label: 'Originaria' },
      { key: 'residente', label: 'Residente' },
      { key: 'estadocivil', label: 'Estado civil' },
      { key: 'religion', label: 'Religión' },
      { key: 'escolaridad', label: 'Escolaridad' },
      { key: 'ocupacion', label: 'Ocupación' },
      { key: 'toxicomanias', label: 'Toxicomanías' },
      { key: 'farmacos', label: 'Fármacos' },
      { key: 'exposiciones', label: 'Exposiciones' },
      { key: 'tabaquismo', label: 'Tabaquismo' },
      { key: 'bebidas', label: 'Bebidas alcohólicas' },
      { key: 'homosex', label: 'Relaciones homosexuales' },
      { key: 'ejercicio', label: 'Realiza ejercicio' },
      { key: 'persnopat', label: 'Otras' },
    ],
  },
  {
    title: 'Antecedentes personales patológicos',
    fields: [
      { key: 'alergias', label: 'Alergias' },
      { key: 'hijosindromedown', label: 'Antecedentes hijos síndrome de down' },
      { key: 'degenerativas', label: 'Enfermedades crónico-degenerativas' },
      { key: 'cirujias', label: 'Cirugías' },
      { key: 'transfusiones', label: 'Transfusiones' },
      { key: 'fracturas', label: 'Fracturas' },
      { key: 'perspat', label: 'Otras' },
    ],
  },
  {
    title: 'Antecedentes ginecológicos',
    fields: [
      { key: 'menarca', label: 'Menarca' },
      { key: 'ciclosmestruales', label: 'Ciclos menstruales' },
      { key: 'embarazada', label: 'Embarazada' },
      { key: 'fur', label: 'Fecha de última menstruación' },
      { key: 'ultrasonido1', label: 'Ultrasonido 1' },
      { key: 'ultrasonido2', label: 'Ultrasonido 2' },
      { key: 'ultrasonido3', label: 'Ultrasonido 3' },
      { key: 'ultrasonido4', label: 'Ultrasonido 4' },
      { key: 'ultrasonido5', label: 'Ultrasonido 5' },
      { key: 'ivsa', label: 'IVSA' },
      { key: 'parejassexuales', label: 'Parejas sexuales' },
      { key: 'ets', label: 'Enfermedades de transmisión sexual' },
      { key: 'citologia', label: 'Citología' },
      { key: 'planificacionfamiliar', label: 'Método de planificación familiar' },
      { key: 'gestaciones', label: 'Gestaciones' },
      { key: 'txtdejoreglar', label: 'Edad en la que dejó de reglar' },
      { key: 'climaterio', label: 'Síntomas de climaterio' },
      { key: 'controlprenatal', label: 'Control prenatal' },
    ],
  },
];

const DAILY_NOTE_GROUPS: FormFieldGroup[] = [
  {
    title: 'Subjetivo',
    fields: [
      { key: 'consulfechaip', label: 'Fecha de inicio del padecimiento' },
      { key: 'consulmotivoconsulta', label: 'Motivo de consulta' },
    ],
  },
  {
    title: 'Objetivo',
    fields: [
      {
        key: 'consulupdatefur',
        label: 'Fecha de última menstruación',
        helperText: 'Campo compartido en conjunto con historia clínica',
      },
      {
        key: 'consulembarazada',
        label: 'Embarazada',
        helperText: 'Campo compartido en conjunto con historia clínica',
      },
      { key: 'consulestatura', label: 'Estatura' },
      { key: 'consulpeso', label: 'Peso' },
      { key: 'consulhta', label: 'T. A.' },
      { key: 'consultemp', label: 'Temperatura' },
      { key: 'consulfc', label: 'F. C.' },
      { key: 'consuloxigeno', label: 'O2' },
      { key: 'consulresultadosestudio', label: 'Resultados de estudios' },
    ],
  },
  {
    title: 'Análisis',
    fields: [
      { key: 'consulanalisis', label: 'Análisis' },
      { key: 'consuldiagnostico', label: 'Diagnósticos' },
    ],
  },
  {
    title: 'Plan',
    fields: [
      { key: 'consulindicaciones', label: 'Indicaciones adicionales' },
      { key: 'consulanotaciones', label: 'Anotaciones personales' },
    ],
  },
];

const CUSTOM_HISTORY_MODULE_LABELS: Record<CustomHistoryModule, string> = {
  heredofamiliares: 'Antecedentes heredofamiliares',
  personales_no_patologicos: 'Antecedentes personales no patológicos',
  personales_patologicos: 'Antecedentes personales patológicos',
  ginecologicos: 'Antecedentes ginecológicos',
};

const CLINICAL_HISTORY_GROUPS_WITH_MODULE: Array<FormFieldGroup & { module: CustomHistoryModule }> = [
  { module: 'heredofamiliares', title: CUSTOM_HISTORY_MODULE_LABELS.heredofamiliares, fields: CLINICAL_HISTORY_GROUPS[0].fields },
  { module: 'personales_no_patologicos', title: CUSTOM_HISTORY_MODULE_LABELS.personales_no_patologicos, fields: CLINICAL_HISTORY_GROUPS[1].fields },
  { module: 'personales_patologicos', title: CUSTOM_HISTORY_MODULE_LABELS.personales_patologicos, fields: CLINICAL_HISTORY_GROUPS[2].fields },
  { module: 'ginecologicos', title: CUSTOM_HISTORY_MODULE_LABELS.ginecologicos, fields: CLINICAL_HISTORY_GROUPS[3].fields },
];

const CUSTOM_HISTORY_INPUT_OPTIONS: Array<{ value: CustomHistoryInputType; label: string }> = [
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'text', label: 'Texto corto' },
  { value: 'textarea', label: 'Texto largo' },
  { value: 'select', label: 'Lista desplegable' },
  { value: 'checkbox_with_text', label: 'Checkbox con descripción' },
];

const CONSULTATION_REASON_MINUTE_OPTIONS: Array<{ value: number | ''; label: string }> = [
  { value: '', label: 'Por defecto' },
  ...Array.from({ length: 36 }, (_, index) => {
    const minutes = (index + 1) * 5;
    if (minutes < 60) {
      return { value: minutes, label: `${minutes} minutos` };
    }

    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;
    if (remainder === 0) {
      return { value: minutes, label: hours === 1 ? '1 hora' : `${hours} horas` };
    }

    return { value: minutes, label: `${hours}h ${String(remainder).padStart(2, '0')}m` };
  }),
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

function formatMinutesToTime(value: number | null | undefined, fallback = '00:10'): string {
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

const TimeSelect = memo(function TimeSelect({
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
});

const AgendaDayRowEditor = memo(function AgendaDayRowEditor({
  row,
  index,
  saving,
  onUpdate,
}: {
  row: AgendaDayRow;
  index: number;
  saving: boolean;
  onUpdate: (index: number, updater: (row: AgendaDayRow) => AgendaDayRow) => void;
}) {
  return (
    <Box sx={{ border: '1px solid #d8e8ef', borderRadius: 2, px: 2, py: 2 }}>
      <Grid container spacing={2} alignItems="center">
        <Grid size={{ xs: 12, md: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Checkbox
              checked={row.enabled}
              disabled={saving}
              onChange={(event) => onUpdate(index, (current) => ({ ...current, enabled: event.target.checked }))}
            />
            <Typography
              sx={{ fontWeight: 700, cursor: 'pointer', userSelect: 'none' }}
              onClick={() => !saving && onUpdate(index, (current) => ({ ...current, enabled: !current.enabled }))}
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
            onChange={(value) => onUpdate(index, (current) => ({ ...current, start: value }))}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <TimeSelect
            label="Hasta"
            value={row.end}
            disabled={!row.enabled || saving}
            onChange={(value) => onUpdate(index, (current) => ({ ...current, end: value }))}
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
                onUpdate(index, (current) => ({
                  ...current,
                  hasBreak: event.target.checked,
                  breakstart: event.target.checked ? current.breakstart || '14:00' : '',
                  breakend: event.target.checked ? current.breakend || '15:00' : '',
                }))
              }
              sx={{ ml: -1 }}
            />
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ cursor: row.enabled && !saving ? 'pointer' : 'default', userSelect: 'none' }}
              onClick={() => {
                if (!row.enabled || saving) return;
                onUpdate(index, (current) => ({
                  ...current,
                  hasBreak: !current.hasBreak,
                  breakstart: !current.hasBreak ? current.breakstart || '14:00' : '',
                  breakend: !current.hasBreak ? current.breakend || '15:00' : '',
                }));
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
                onChange={(value) => onUpdate(index, (current) => ({ ...current, breakstart: value }))}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TimeSelect
                label="Fin"
                value={row.breakend || '15:00'}
                disabled={!row.enabled || !row.hasBreak || saving}
                onChange={(value) => onUpdate(index, (current) => ({ ...current, breakend: value }))}
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
  );
});

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

function CollapsibleCardSection({
  title,
  collapsed,
  onToggle,
  children,
}: {
  title: string;
  collapsed: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <Box sx={{ border: '1px solid #d8e8ef', borderRadius: 2, overflow: 'hidden', backgroundColor: '#fff' }}>
      <Box
        onClick={onToggle}
        sx={{
          px: 2,
          py: 1.5,
          backgroundColor: '#f2fbff',
          borderBottom: collapsed ? 'none' : '1px solid #d8e8ef',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1.5,
          cursor: 'pointer',
        }}
      >
        <Typography sx={{ color: '#1e8b2d', fontWeight: 600 }}>{title}</Typography>
        {collapsed ? <ExpandMore sx={{ color: '#1e8b2d' }} /> : <ExpandLess sx={{ color: '#1e8b2d' }} />}
      </Box>
      {!collapsed ? (
        <Box sx={{ p: { xs: 2, md: 2.5 } }}>
          {children}
        </Box>
      ) : null}
    </Box>
  );
}

function getBackendOrigin(): string {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
  try {
    const apiOrigin = new URL(apiUrl).origin;
    const apiHost = new URL(apiUrl).hostname;

    if (apiHost === 'localhost' || apiHost === '127.0.0.1') {
      return 'https://lisamedic.com';
    }

    return apiOrigin;
  } catch {
    return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? 'https://lisamedic.com'
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
  showSpecialtyFields,
  onSaveProfile,
  onSavePassword,
}: {
  profile: SettingsProfileData | null;
  saving: boolean;
  passwordSaving: boolean;
  showSpecialtyFields: boolean;
  onSaveProfile: (payload: { specialty_id: number | null; name: string; last_name: string; phone: string; cedula_profesional: string; cedula_especialidad: string }) => Promise<void>;
  onSavePassword: (payload: { current_password: string; new_password: string; new_password_confirmation: string }) => Promise<void>;
}) {
  const [specialtyId, setSpecialtyId] = useState<number | ''>(profile?.specialty_id ?? '');
  const [firstName, setFirstName] = useState(profile?.name ?? '');
  const [lastName, setLastName] = useState(profile?.last_name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [professionalLicense, setProfessionalLicense] = useState(profile?.cedula_profesional ?? '');
  const [specialtyLicense, setSpecialtyLicense] = useState(profile?.cedula_especialidad ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    setSpecialtyId(profile?.specialty_id ?? '');
    setFirstName(profile?.name ?? '');
    setLastName(profile?.last_name ?? '');
    setPhone(profile?.phone ?? '');
    setProfessionalLicense(profile?.cedula_profesional ?? '');
    setSpecialtyLicense(profile?.cedula_especialidad ?? '');
  }, [profile]);

  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, md: 7 }}>
        <CardShell title="Datos personales">
          {showSpecialtyFields ? (
            <TextField select label="Especialidad" value={specialtyId} fullWidth variant="standard" onChange={(event) => setSpecialtyId(event.target.value === '' ? '' : Number(event.target.value))} sx={{ mb: 3.5 }}>
              <MenuItem value="">Selecciona una especialidad</MenuItem>
              {(profile?.specialties ?? []).map((specialty) => (
                <MenuItem key={specialty.id} value={specialty.id}>{specialty.title}</MenuItem>
              ))}
            </TextField>
          ) : null}
          <TextField label="Nombre(s)" value={firstName} fullWidth variant="standard" onChange={(event) => setFirstName(event.target.value)} sx={{ mb: 3.5 }} />
          <TextField label="Apellidos" value={lastName} fullWidth variant="standard" onChange={(event) => setLastName(event.target.value)} sx={{ mb: 3.5 }} />
          <TextField label="Cédula profesional" value={professionalLicense} fullWidth variant="standard" onChange={(event) => setProfessionalLicense(event.target.value)} sx={{ mb: 3.5 }} />
          <TextField label="Cédula de especialidad" value={specialtyLicense} fullWidth variant="standard" onChange={(event) => setSpecialtyLicense(event.target.value)} sx={{ mb: 3.5 }} />
          <TextField label="Teléfono" value={phone} fullWidth variant="standard" onChange={(event) => setPhone(event.target.value)} sx={{ mb: 3.5 }} />
          <TextField label="Correo electrónico" value={profile?.email ?? ''} fullWidth variant="standard" InputProps={{ readOnly: true }} sx={{ mb: 4 }} />
          <Button variant="contained" disabled={saving} onClick={() => void onSaveProfile({ specialty_id: specialtyId === '' ? null : specialtyId, name: firstName, last_name: lastName, phone, cedula_profesional: professionalLicense, cedula_especialidad: specialtyLicense })} sx={{ minWidth: 132, borderRadius: 1, backgroundColor: '#ea1d63', boxShadow: '0 8px 18px rgba(234, 29, 99, 0.28)', '&:hover': { backgroundColor: '#cf1857' } }}>
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
  const availableOffices = useMemo(() => offices, [offices]);
  const [selectedOfficeId, setSelectedOfficeId] = useState<number>(availableOffices[0]?.id ?? 0);
  const [title, setTitle] = useState('');
  const [address, setAddress] = useState('');
  const [suburb, setSuburb] = useState('');
  const [phone, setPhone] = useState('');
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  useEffect(() => {
    if (availableOffices.length === 0) {
      setSelectedOfficeId(0);
      return;
    }
    setSelectedOfficeId((current) => current && availableOffices.some((office) => office.id === current) ? current : availableOffices[0].id);
  }, [availableOffices]);

  useEffect(() => {
    const office = availableOffices.find((item) => item.id === selectedOfficeId);
    setTitle(office?.title ?? '');
    setAddress(office?.address ?? '');
    setSuburb(office?.suburb ?? '');
    setPhone(office?.phone ?? '');
    setLogoPreview(resolveOfficeLogoUrl(office?.logo_url));
  }, [availableOffices, selectedOfficeId]);

  if (availableOffices.length === 0) {
    return <PlaceholderPanel title="Empresa" description="Esta sección estará disponible cuando tengas al menos un consultorio asignado para administrar su información general." />;
  }

  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, md: 7 }}>
        <CardShell title="Información del consultorio">
          <TextField select label="Consultorio" value={selectedOfficeId} fullWidth variant="standard" onChange={(event) => setSelectedOfficeId(Number(event.target.value))} sx={{ mb: 3.5 }}>
            {availableOffices.map((office) => (
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

const TAG_STATUS_COLOR_PRESETS: Array<{ value: number; label: string; bg: string; text: string }> = [
  { value: 0, label: 'Azul', bg: '#1e88e5', text: '#ffffff' },
  { value: 1, label: 'Verde', bg: '#43a047', text: '#ffffff' },
  { value: 2, label: 'Rojo', bg: '#e53935', text: '#ffffff' },
  { value: 3, label: 'Naranja', bg: '#fb8c00', text: '#ffffff' },
  { value: 4, label: 'Celeste', bg: '#039be5', text: '#ffffff' },
  { value: 5, label: 'Rosa', bg: '#d81b60', text: '#ffffff' },
];

function LabelsPanel({
  offices,
  onSuccess,
}: {
  offices: Office[];
  onSuccess: (message: string) => void;
}) {
  const availableOffices = useMemo(() => offices, [offices]);
  const [selectedOfficeId, setSelectedOfficeId] = useState<number>(availableOffices[0]?.id ?? 0);
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [labels, setLabels] = useState<OfficeLabelItem[]>([]);
  const [statuses, setStatuses] = useState<SettingsLabelStatusItem[]>([]);
  const [newLabelName, setNewLabelName] = useState('');
  const [newStatusName, setNewStatusName] = useState('');
  const [newStatusColor, setNewStatusColor] = useState<number>(0);
  const [newStatusVisibleDays, setNewStatusVisibleDays] = useState<number | 'always'>('always');
  const [savingLabel, setSavingLabel] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [editingLabelId, setEditingLabelId] = useState<number | null>(null);
  const [editingLabelValue, setEditingLabelValue] = useState('');
  const [editingStatusId, setEditingStatusId] = useState<number | null>(null);
  const [editingStatusName, setEditingStatusName] = useState('');
  const [editingStatusColor, setEditingStatusColor] = useState<number>(0);
  const [editingStatusVisibleDays, setEditingStatusVisibleDays] = useState<number | 'always'>('always');
  const [primaryStatusDialogMessage, setPrimaryStatusDialogMessage] = useState<string | null>(null);
  const [finiteStatusWarningMessage, setFiniteStatusWarningMessage] = useState<string | null>(null);

  const createLabel = async () => {
    const trimmedName = newLabelName.trim();
    if (!trimmedName) {
      return;
    }

    const normalizedName = normalizeCatalogName(trimmedName);
    const duplicate = labels.find((item) => normalizeCatalogName(item.code ?? '') === normalizedName);

    if (duplicate) {
      const isActive = duplicate.status === null || duplicate.status === undefined || Number(duplicate.status) === 1;
      if (isActive) {
        setLocalError('Ya existe una etiqueta con ese nombre en este consultorio.');
        return;
      }

      const shouldReactivate = window.confirm(`Ya existe una etiqueta inactiva con el nombre "${duplicate.code}". ¿Quieres activarla?`);
      if (!shouldReactivate) {
        return;
      }

      await persistLabelStatus(duplicate, 1);
      setNewLabelName('');
      return;
    }

    setSavingLabel(true);
    setLocalError(null);
    try {
      const created = await settingsService.createOfficeLabel({
        office_id: selectedOfficeId,
        code: trimmedName,
        status: 1,
      });
      setLabels((current) => [created, ...current]);
      setNewLabelName('');
      onSuccess('Etiqueta creada correctamente.');
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'No fue posible crear la etiqueta.');
    } finally {
      setSavingLabel(false);
    }
  };

  useEffect(() => {
    if (availableOffices.length === 0) {
      setSelectedOfficeId(0);
      return;
    }
    setSelectedOfficeId((current) => current && availableOffices.some((office) => office.id === current) ? current : availableOffices[0].id);
  }, [availableOffices]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!selectedOfficeId) {
        setLabels([]);
        setStatuses([]);
        return;
      }

      setLoading(true);
      setLocalError(null);
      try {
        const [labelsResponse, statusesResponse] = await Promise.all([
          settingsService.getOfficeLabels(selectedOfficeId),
          settingsService.getOfficeLabelStatuses(selectedOfficeId),
        ]);
        if (!mounted) return;
        setLabels(labelsResponse);
        setStatuses(statusesResponse);
      } catch (err) {
        if (!mounted) return;
        setLocalError(err instanceof Error ? err.message : 'No fue posible cargar la configuración de etiquetas.');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, [selectedOfficeId]);

  if (availableOffices.length === 0) {
    return <PlaceholderPanel title="Etiquetas" description="Esta sección estará disponible cuando tengas al menos un consultorio asignado para administrar etiquetas y estados." />;
  }

  const persistLabelStatus = async (label: OfficeLabelItem, nextStatus: number) => {
    setSavingLabel(true);
    setLocalError(null);
    try {
      const updated = await settingsService.updateOfficeLabel(label.id, {
        office_id: selectedOfficeId,
        status: nextStatus,
      });
      setLabels((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      onSuccess(nextStatus === 1 ? 'Etiqueta activada correctamente.' : 'Etiqueta desactivada correctamente.');
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'No fue posible actualizar la etiqueta.');
    } finally {
      setSavingLabel(false);
    }
  };

  const persistStatusState = async (statusItem: SettingsLabelStatusItem, nextStatus: number) => {
    setSavingStatus(true);
    setLocalError(null);
    try {
      const updated = await settingsService.updateOfficeLabelStatus(statusItem.id, {
        office_id: selectedOfficeId,
        status: nextStatus,
      });
      setStatuses((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      onSuccess(nextStatus === 1 ? 'Estado activado correctamente.' : 'Estado desactivado correctamente.');
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'No fue posible actualizar el estado.');
    } finally {
      setSavingStatus(false);
    }
  };

  const resolveStatusMeta = (statusItem: SettingsLabelStatusItem): { visible_days?: number | null; is_default?: boolean } => {
    const rawData = statusItem.data;
    const parsed = typeof rawData === 'string'
      ? (() => {
          try {
            return JSON.parse(rawData) as { visible_days?: number | null; is_default?: boolean };
          } catch {
            return null;
          }
        })()
      : rawData;

    return parsed && typeof parsed === 'object' ? parsed : {};
  };

  const isPrimaryStatus = (statusItem: SettingsLabelStatusItem): boolean => Boolean(resolveStatusMeta(statusItem).is_default);

  const persistPrimaryStatus = async (statusItem: SettingsLabelStatusItem, nextPrimary: boolean) => {
    setSavingStatus(true);
    setLocalError(null);
    try {
      const resolvedVisibleDays = resolveStatusVisibleDays(statusItem);
      const updated = await settingsService.updateOfficeLabelStatus(statusItem.id, {
        office_id: selectedOfficeId,
        data: {
          visible_days: resolvedVisibleDays === 'always' ? null : resolvedVisibleDays,
          is_default: nextPrimary,
        },
      });

      if (nextPrimary) {
        setStatuses((current) => current.map((item) => {
          if (item.id === updated.id) {
            return updated;
          }

          const itemMeta = resolveStatusMeta(item);
          return {
            ...item,
            data: {
              ...itemMeta,
              is_default: false,
            },
          };
        }));
        setPrimaryStatusDialogMessage(
          'Has definido un estado inicial para las etiquetas. A partir de ahora, cada nueva etiqueta que asignes a un paciente comenzará con este estado dentro de su seguimiento.'
        );
      } else {
        setStatuses((current) => current.map((item) => (item.id === updated.id ? updated : item)));
        onSuccess('Se eliminó el estado inicial de las etiquetas. Las nuevas etiquetas volverán a crearse con estatus indefinido.');
      }
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'No fue posible actualizar el estado primario.');
    } finally {
      setSavingStatus(false);
    }
  };

  const resolveStatusVisibleDays = (statusItem: SettingsLabelStatusItem): number | 'always' => {
    const visibleDays = resolveStatusMeta(statusItem).visible_days;
    return typeof visibleDays === 'number' ? visibleDays : 'always';
  };

  const formatStatusVisibleDaysLabel = (value: number | 'always'): string => {
    if (value === 'always') {
      return 'Siempre activa';
    }

    return value === 1 ? '1 día' : `${value} días`;
  };
  const hasFiniteStatuses = statuses.some((statusItem) => resolveStatusVisibleDays(statusItem) !== 'always');
  const canStatusBePrimary = (statusItem: SettingsLabelStatusItem): boolean => resolveStatusVisibleDays(statusItem) === 'always';

  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12 }}>
        <CardShell title="Etiquetas">
          <TextField
            select
            label="Consultorio"
            value={selectedOfficeId}
            fullWidth
            variant="standard"
            onChange={(event) => setSelectedOfficeId(Number(event.target.value))}
            sx={{ maxWidth: 420, mb: 2.5 }}
          >
            {availableOffices.map((office) => (
              <MenuItem key={office.id} value={office.id}>{office.title}</MenuItem>
            ))}
          </TextField>
          <Typography variant="body2" color="text.secondary">
            Administra aquí el catálogo de etiquetas y los estados que podrán tomar dentro del seguimiento del paciente.
          </Typography>
        </CardShell>
      </Grid>
      {localError ? (
        <Grid size={{ xs: 12 }}>
          <Alert severity="error">{localError}</Alert>
        </Grid>
      ) : null}
      {loading ? (
        <Grid size={{ xs: 12 }}>
          <Box sx={{ minHeight: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CircularProgress />
          </Box>
        </Grid>
      ) : (
        <>
          <Grid size={{ xs: 12 }}>
            <CardShell title="Catálogo de etiquetas">
              <Alert severity="info" sx={{ mb: 2 }}>
                Las etiquetas te permiten clasificar y dar seguimiento a cada paciente. Cada etiqueta puede pasar por distintos estados conforme avanza su proceso, por lo que es recomendable configurar también estados de etiquetas para que puedan cambiar de uno a otro.
              </Alert>
              <Alert severity="warning" sx={{ mb: 3 }}>
                Como buena práctica, define primero tus estados de etiquetas antes de usar ampliamente el catálogo. Esto te ayudará a que cada etiqueta tenga una evolución clara dentro del seguimiento del paciente.
              </Alert>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 3 }}>
                <TextField
                  label="Nueva etiqueta"
                  variant="standard"
                  value={newLabelName}
                  onChange={(event) => setNewLabelName(event.target.value)}
                  sx={{ flex: 1, minWidth: 240 }}
                  disabled={savingLabel}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      void createLabel();
                    }
                  }}
                />
                <Button
                  variant="contained"
                  disabled={savingLabel || !newLabelName.trim()}
                  onClick={() => { void createLabel(); }}
                  sx={{ minWidth: 132, borderRadius: 1, backgroundColor: '#ea1d63', boxShadow: '0 8px 18px rgba(234, 29, 99, 0.28)', '&:hover': { backgroundColor: '#cf1857' } }}
                >
                  {savingLabel ? 'Guardando...' : 'Agregar'}
                </Button>
              </Box>
              {labels.length === 0 ? (
                <Alert severity="info">Todavía no hay etiquetas configuradas para este consultorio.</Alert>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {labels.map((label) => {
                    const isActive = label.status === null || label.status === undefined || Number(label.status) === 1;
                    const labelText = label.code?.trim() || label.identify?.trim() || `Etiqueta ${label.id}`;
                    const isEditing = editingLabelId === label.id;
                    return (
                      <Box key={label.id} sx={{ border: '1px solid #d8e8ef', borderRadius: 2, p: 2 }}>
                        {isEditing ? (
                          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                            <TextField
                              label="Nombre de la etiqueta"
                              variant="standard"
                              value={editingLabelValue}
                              onChange={(event) => setEditingLabelValue(event.target.value)}
                              sx={{ flex: 1, minWidth: 240 }}
                              disabled={savingLabel}
                            />
                            <Button
                              variant="contained"
                              disabled={savingLabel || !editingLabelValue.trim()}
                              onClick={() => {
                                setSavingLabel(true);
                                setLocalError(null);
                                void settingsService.updateOfficeLabel(label.id, {
                                  office_id: selectedOfficeId,
                                  code: editingLabelValue.trim(),
                                  status: isActive ? undefined : 1,
                                }).then((updated) => {
                                  setLabels((current) => current.map((item) => (item.id === updated.id ? updated : item)));
                                  setEditingLabelId(null);
                                  setEditingLabelValue('');
                                  onSuccess(isActive ? 'Etiqueta actualizada correctamente.' : 'Etiqueta actualizada y activada correctamente.');
                                }).catch((err) => {
                                  setLocalError(err instanceof Error ? err.message : 'No fue posible actualizar la etiqueta.');
                                }).finally(() => {
                                  setSavingLabel(false);
                                });
                              }}
                            >
                              Guardar
                            </Button>
                            <Button onClick={() => { setEditingLabelId(null); setEditingLabelValue(''); }} disabled={savingLabel}>
                              Cancelar
                            </Button>
                          </Box>
                        ) : (
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: { xs: 'flex-start', md: 'center' }, flexDirection: { xs: 'column', md: 'row' } }}>
                            <Box>
                              <Typography sx={{ color: '#183844', fontWeight: 600 }}>{labelText}</Typography>
                              <Typography variant="body2" color="text.secondary">
                                {isActive ? 'Activa' : 'Inactiva'}
                              </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                              <Button
                                variant="outlined"
                                onClick={() => {
                                  setEditingLabelId(label.id);
                                  setEditingLabelValue(labelText);
                                }}
                                disabled={savingLabel}
                              >
                                Editar
                              </Button>
                              {isActive ? (
                                <IconButton
                                  color="error"
                                  onClick={() => { void persistLabelStatus(label, 0); }}
                                  disabled={savingLabel}
                                  aria-label="Desactivar etiqueta"
                                >
                                  <DeleteOutline />
                                </IconButton>
                              ) : (
                                <Button
                                  color="success"
                                  variant="text"
                                  onClick={() => { void persistLabelStatus(label, 1); }}
                                  disabled={savingLabel}
                                >
                                  Activar
                                </Button>
                              )}
                            </Box>
                          </Box>
                        )}
                      </Box>
                    );
                  })}
                </Box>
              )}
            </CardShell>
          </Grid>
          <Grid size={{ xs: 12 }}>
            <CardShell title="Estados de etiquetas">
              <Alert severity="info" sx={{ mb: 2 }}>
                Define aquí los estados que podrá tomar cada etiqueta durante el seguimiento del paciente. Si un estado se configura con días activos, la etiqueta seguirá visible hasta esa fecha límite; si se deja como <strong>Siempre activa</strong>, continuará mostrándose sin vencimiento.
              </Alert>
              <Alert severity={hasFiniteStatuses ? 'success' : 'warning'} sx={{ mb: 3 }}>
                Se recomienda dejar al menos un estado final con días definidos para que algunas etiquetas dejen de mostrarse de forma automática. Como buena práctica, procura tener solo 1 estado final con vigencia definida.
              </Alert>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 3 }}>
                <TextField
                  label="Nuevo estado"
                  variant="standard"
                  value={newStatusName}
                  onChange={(event) => setNewStatusName(event.target.value)}
                  sx={{ flex: 1, minWidth: 220 }}
                  disabled={savingStatus}
                />
                <TextField
                  select
                  label="Color"
                  variant="standard"
                  value={newStatusColor}
                  onChange={(event) => setNewStatusColor(Number(event.target.value))}
                  sx={{ minWidth: 180 }}
                  disabled={savingStatus}
                >
                  {TAG_STATUS_COLOR_PRESETS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  label="Días activa"
                  variant="standard"
                  value={newStatusVisibleDays}
                  onChange={(event) => setNewStatusVisibleDays(event.target.value === 'always' ? 'always' : Number(event.target.value))}
                  sx={{ minWidth: 190 }}
                  disabled={savingStatus}
                >
                  {TAG_STATUS_VISIBLE_DAYS_OPTIONS.map((option) => (
                    <MenuItem key={String(option.value)} value={option.value}>{option.label}</MenuItem>
                  ))}
                </TextField>
                {newStatusVisibleDays !== 'always' ? (
                  <Alert severity="warning" sx={{ width: '100%', mt: 1 }}>
                    Este estado hará que la etiqueta siga visible durante {formatStatusVisibleDaysLabel(newStatusVisibleDays).toLowerCase()} y después dejará de mostrarse como opción activa para ese paciente.
                  </Alert>
                ) : null}
                <Button
                  variant="contained"
                  disabled={savingStatus || !newStatusName.trim()}
                  onClick={() => {
                    const showFiniteStatusWarning = newStatusVisibleDays !== 'always';
                    setSavingStatus(true);
                    setLocalError(null);
                    void settingsService.createOfficeLabelStatus({
                      office_id: selectedOfficeId,
                      code: newStatusName.trim(),
                      identify: newStatusColor,
                      data: {
                        visible_days: newStatusVisibleDays === 'always' ? null : newStatusVisibleDays,
                        is_default: false,
                      },
                      status: 1,
                    }).then((created) => {
                      setStatuses((current) => [...current, created].sort((a, b) => a.identify - b.identify || a.id - b.id));
                      setNewStatusName('');
                      setNewStatusColor(0);
                      setNewStatusVisibleDays('always');
                      onSuccess('Estado creado correctamente.');
                      if (showFiniteStatusWarning) {
                        setFiniteStatusWarningMessage(
                          'Has creado un estado con vigencia definida en días. Como buena práctica, se recomienda mantener solo un estado con límite de días activo para evitar ambigüedad en el cierre del seguimiento.'
                        );
                      }
                    }).catch((err) => {
                      setLocalError(err instanceof Error ? err.message : 'No fue posible crear el estado.');
                    }).finally(() => {
                      setSavingStatus(false);
                    });
                  }}
                  sx={{ minWidth: 132, borderRadius: 1, backgroundColor: '#ea1d63', boxShadow: '0 8px 18px rgba(234, 29, 99, 0.28)', '&:hover': { backgroundColor: '#cf1857' } }}
                >
                  {savingStatus ? 'Guardando...' : 'Agregar'}
                </Button>
              </Box>
              {statuses.length === 0 ? (
                <Alert severity="info">Todavía no hay estados configurados para las etiquetas.</Alert>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {statuses.map((statusItem) => {
                    const isActive = statusItem.status === null || statusItem.status === undefined || Number(statusItem.status) === 1;
                    const colorPreset = TAG_STATUS_COLOR_PRESETS.find((option) => option.value === Number(statusItem.identify)) ?? TAG_STATUS_COLOR_PRESETS[0];
                    const isEditing = editingStatusId === statusItem.id;
                    return (
                      <Box key={statusItem.id} sx={{ border: '1px solid #d8e8ef', borderRadius: 2, p: 2 }}>
                        {isEditing ? (
                          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                            <TextField
                              label="Nombre del estado"
                              variant="standard"
                              value={editingStatusName}
                              onChange={(event) => setEditingStatusName(event.target.value)}
                              sx={{ flex: 1, minWidth: 220 }}
                              disabled={savingStatus}
                            />
                            <TextField
                              select
                              label="Color"
                              variant="standard"
                              value={editingStatusColor}
                              onChange={(event) => setEditingStatusColor(Number(event.target.value))}
                              sx={{ minWidth: 180 }}
                              disabled={savingStatus}
                            >
                              {TAG_STATUS_COLOR_PRESETS.map((option) => (
                                <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                              ))}
                            </TextField>
                            <TextField
                              select
                              label="Días activa"
                              variant="standard"
                              value={editingStatusVisibleDays}
                              onChange={(event) => setEditingStatusVisibleDays(event.target.value === 'always' ? 'always' : Number(event.target.value))}
                              sx={{ minWidth: 190 }}
                              disabled={savingStatus}
                            >
                              {TAG_STATUS_VISIBLE_DAYS_OPTIONS.map((option) => (
                                <MenuItem key={String(option.value)} value={option.value}>{option.label}</MenuItem>
                              ))}
                            </TextField>
                            {editingStatusVisibleDays !== 'always' ? (
                              <Alert severity="warning" sx={{ width: '100%', mt: 1 }}>
                                Este estado hará que la etiqueta siga visible durante {formatStatusVisibleDaysLabel(editingStatusVisibleDays).toLowerCase()} y después dejará de mostrarse como opción activa para ese paciente.
                              </Alert>
                            ) : null}
                            <Button
                              variant="contained"
                              disabled={savingStatus || !editingStatusName.trim()}
                              onClick={() => {
                                setSavingStatus(true);
                                setLocalError(null);
                                void settingsService.updateOfficeLabelStatus(statusItem.id, {
                                  office_id: selectedOfficeId,
                                  code: editingStatusName.trim(),
                                  identify: editingStatusColor,
                                  data: {
                                    visible_days: editingStatusVisibleDays === 'always' ? null : editingStatusVisibleDays,
                                    is_default: isPrimaryStatus(statusItem),
                                  },
                                  status: isActive ? undefined : 1,
                                }).then((updated) => {
                                  setStatuses((current) => current.map((item) => (item.id === updated.id ? updated : item)).sort((a, b) => a.identify - b.identify || a.id - b.id));
                                  setEditingStatusId(null);
                                  setEditingStatusName('');
                                  setEditingStatusColor(0);
                                  setEditingStatusVisibleDays('always');
                                  onSuccess(isActive ? 'Estado actualizado correctamente.' : 'Estado actualizado y activado correctamente.');
                                }).catch((err) => {
                                  setLocalError(err instanceof Error ? err.message : 'No fue posible actualizar el estado.');
                                }).finally(() => {
                                  setSavingStatus(false);
                                });
                              }}
                            >
                              Guardar
                            </Button>
                            <Button
                              onClick={() => {
                                setEditingStatusId(null);
                                setEditingStatusName('');
                                setEditingStatusColor(0);
                                setEditingStatusVisibleDays('always');
                              }}
                              disabled={savingStatus}
                            >
                              Cancelar
                            </Button>
                          </Box>
                        ) : (
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: { xs: 'flex-start', md: 'center' }, flexDirection: { xs: 'column', md: 'row' } }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flexWrap: 'wrap' }}>
                              {canStatusBePrimary(statusItem) ? (
                                <Checkbox
                                  checked={isPrimaryStatus(statusItem)}
                                  disabled={savingStatus || !isActive}
                                  onChange={() => { void persistPrimaryStatus(statusItem, !isPrimaryStatus(statusItem)); }}
                                  inputProps={{ 'aria-label': 'Estado primario de etiqueta' }}
                                  sx={{ p: 0.25 }}
                                />
                              ) : (
                                <Box sx={{ width: 26, height: 26, flexShrink: 0 }} />
                              )}
                              <Box
                                sx={{
                                  px: 1.2,
                                  py: 0.55,
                                  borderRadius: 999,
                                  backgroundColor: colorPreset.bg,
                                  color: colorPreset.text,
                                  fontWeight: 700,
                                  fontSize: '0.85rem',
                                }}
                              >
                                {statusItem.code}
                              </Box>
                              <Typography variant="body2" color="text.secondary">
                                {isActive ? 'Activo' : 'Inactivo'}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {formatStatusVisibleDaysLabel(resolveStatusVisibleDays(statusItem))}
                              </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                              <Button
                                variant="outlined"
                                onClick={() => {
                                  setEditingStatusId(statusItem.id);
                                  setEditingStatusName(statusItem.code);
                                  setEditingStatusColor(Number(statusItem.identify));
                                  setEditingStatusVisibleDays(resolveStatusVisibleDays(statusItem));
                                }}
                                disabled={savingStatus}
                              >
                                Editar
                              </Button>
                              {isActive ? (
                                <IconButton
                                  color="error"
                                  onClick={() => { void persistStatusState(statusItem, 0); }}
                                  disabled={savingStatus}
                                  aria-label="Desactivar estado"
                                >
                                  <DeleteOutline />
                                </IconButton>
                              ) : (
                                <Button
                                  color="success"
                                  variant="text"
                                  onClick={() => { void persistStatusState(statusItem, 1); }}
                                  disabled={savingStatus}
                                >
                                  Activar
                                </Button>
                              )}
                            </Box>
                          </Box>
                        )}
                      </Box>
                    );
                  })}
                </Box>
              )}
            </CardShell>
          </Grid>
        </>
      )}
      <Dialog
        open={Boolean(primaryStatusDialogMessage)}
        onClose={() => setPrimaryStatusDialogMessage(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Estado inicial definido</DialogTitle>
        <DialogContent>
          <Typography>
            {primaryStatusDialogMessage}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            variant="contained"
            onClick={() => setPrimaryStatusDialogMessage(null)}
          >
            Entendido
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={Boolean(finiteStatusWarningMessage)}
        onClose={() => setFiniteStatusWarningMessage(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Estado con vigencia definida</DialogTitle>
        <DialogContent>
          <Typography>
            {finiteStatusWarningMessage}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            variant="contained"
            onClick={() => setFiniteStatusWarningMessage(null)}
          >
            Entendido
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  );
}

function FormSettingsPanel({
  offices,
  onSuccess,
}: {
  offices: Office[];
  onSuccess: (message: string) => void;
}) {
  const availableOffices = useMemo(() => offices, [offices]);
  const [selectedOfficeId, setSelectedOfficeId] = useState<number>(availableOffices[0]?.id ?? 0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<SettingsFormsData | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [cameraMenuDirty, setCameraMenuDirty] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({
    heredofamiliares: true,
    personales_no_patologicos: true,
    personales_patologicos: true,
    ginecologicos: true,
    daily_note_history_heredofamiliares: true,
    daily_note_history_personales_no_patologicos: true,
    daily_note_history_personales_patologicos: true,
    daily_note_history_ginecologicos: true,
    daily_note: true,
    new_appointment_default_gender: true,
    patient_detail_menu: true,
  });
  const cameraMenuTitleInputRef = useRef<HTMLInputElement | null>(null);
  const dailyNoteTitleInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (availableOffices.length === 0) {
      setSelectedOfficeId(0);
      return;
    }

    setSelectedOfficeId((current) => current && availableOffices.some((office) => office.id === current) ? current : availableOffices[0].id);
  }, [availableOffices]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (!selectedOfficeId) {
        setData(null);
        return;
      }

      setLoading(true);
      setLocalError(null);

      try {
        const response = await settingsService.getFormSettings(selectedOfficeId);
        if (mounted) {
          setData(response);
          setCameraMenuDirty(false);
        }
      } catch (err) {
        if (mounted) {
          setLocalError(err instanceof Error ? err.message : 'No fue posible cargar la configuración de formularios.');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      mounted = false;
    };
  }, [selectedOfficeId]);

  if (availableOffices.length === 0) {
    return <PlaceholderPanel title="Formularios" description="Esta sección estará disponible cuando tengas al menos un consultorio asignado para personalizar los formularios clínicos." />;
  }

  const persistSection = (
    section: 'clinical_history' | 'daily_note' | 'daily_note_clinical_history_visibility',
    key: string,
    checked: boolean
  ) => {
    if (!data) return;

    const previousData = data;
    const nextData: SettingsFormsData = {
      ...data,
      [section]: {
        ...data[section],
        [key]: checked,
      },
    };

    setData(nextData);
    setSaving(true);
    setLocalError(null);

    void settingsService.updateFormSettings(nextData).then((updated) => {
      setData(updated);
      onSuccess('Configuración de formularios actualizada correctamente.');
    }).catch((err) => {
      const backendMessage =
        typeof err === 'object' &&
        err !== null &&
        'response' in err &&
        typeof (err as { response?: { data?: { message?: unknown } } }).response?.data?.message === 'string'
          ? ((err as { response?: { data?: { message?: string } } }).response?.data?.message ?? '')
          : '';

      setData(previousData);
      setLocalError(backendMessage || (err instanceof Error ? err.message : 'No fue posible actualizar la configuración de formularios.'));
    }).finally(() => {
      setSaving(false);
    });
  };

  const persistNewAppointmentDefaultGender = (defaultGender: 'M' | 'F' | '') => {
    if (!data) return;

    const previousData = data;
    const nextData: SettingsFormsData = {
      ...data,
      new_appointment: {
        default_gender: defaultGender,
      },
    };

    setData(nextData);
    setSaving(true);
    setLocalError(null);

    void settingsService.updateFormSettings(nextData).then((updated) => {
      setData(updated);
      onSuccess('Configuracion de formularios actualizada correctamente.');
    }).catch((err) => {
      const backendMessage =
        typeof err === 'object' &&
        err !== null &&
        'response' in err &&
        typeof (err as { response?: { data?: { message?: unknown } } }).response?.data?.message === 'string'
          ? ((err as { response?: { data?: { message?: string } } }).response?.data?.message ?? '')
          : '';

      setData(previousData);
      setLocalError(backendMessage || (err instanceof Error ? err.message : 'No fue posible actualizar la configuracion de formularios.'));
    }).finally(() => {
      setSaving(false);
    });
  };

  const persistPatientDetailCameraMenu = (payload: SettingsFormsData['patient_detail']) => {
    if (!data) return;

    const previousData = data;
    const nextData: SettingsFormsData = {
      ...data,
      patient_detail: {
        camera_menu_enabled: payload.camera_menu_enabled,
        camera_menu_title: payload.camera_menu_title.trim() || 'Camara',
        daily_note_title_enabled: payload.daily_note_title_enabled,
        daily_note_title: payload.daily_note_title.trim() || 'Nota diaria',
      },
    };

    setData(nextData);
    setSaving(true);
    setLocalError(null);

    void settingsService.updateFormSettings(nextData).then((updated) => {
      setData(updated);
      setCameraMenuDirty(false);
      onSuccess('Configuracion de formularios actualizada correctamente.');
    }).catch((err) => {
      const backendMessage =
        typeof err === 'object' &&
        err !== null &&
        'response' in err &&
        typeof (err as { response?: { data?: { message?: unknown } } }).response?.data?.message === 'string'
          ? ((err as { response?: { data?: { message?: string } } }).response?.data?.message ?? '')
          : '';

      setData(previousData);
      setLocalError(backendMessage || (err instanceof Error ? err.message : 'No fue posible actualizar la configuracion de formularios.'));
    }).finally(() => {
      setSaving(false);
    });
  };

  const handlePatientDetailCameraToggle = (checked: boolean) => {
    setData((current) => {
      if (!current) return current;

      const nextTitle = checked
        ? ((current.patient_detail.camera_menu_enabled && current.patient_detail.camera_menu_title.trim())
            ? current.patient_detail.camera_menu_title
            : 'colposcopio')
        : current.patient_detail.camera_menu_title;

      return {
        ...current,
        patient_detail: {
          ...current.patient_detail,
          camera_menu_enabled: checked,
          camera_menu_title: nextTitle,
        },
      };
    });

    setCameraMenuDirty(true);

    if (checked) {
      setTimeout(() => {
        cameraMenuTitleInputRef.current?.focus();
        cameraMenuTitleInputRef.current?.select();
      }, 0);
    }
  };

  const handlePatientDetailDailyNoteTitleToggle = (checked: boolean) => {
    setData((current) => {
      if (!current) return current;

      const nextTitle = checked
        ? ((current.patient_detail.daily_note_title_enabled && current.patient_detail.daily_note_title.trim())
            ? current.patient_detail.daily_note_title
            : 'Nota diaria')
        : current.patient_detail.daily_note_title;

      return {
        ...current,
        patient_detail: {
          ...current.patient_detail,
          daily_note_title_enabled: checked,
          daily_note_title: nextTitle,
        },
      };
    });

    setCameraMenuDirty(true);

    if (checked) {
      setTimeout(() => {
        dailyNoteTitleInputRef.current?.focus();
        dailyNoteTitleInputRef.current?.select();
      }, 0);
    }
  };

  const persistCustomFields = (customHistoryFields: SettingsFormsData['custom_history_fields']) => {
    if (!data) return;

    const previousData = data;
    const nextData: SettingsFormsData = {
      ...data,
      custom_history_fields: customHistoryFields,
    };

    setData(nextData);
    setSaving(true);
    setLocalError(null);

    void settingsService.updateFormSettings(nextData).then((updated) => {
      setData(updated);
      onSuccess('Configuración de formularios actualizada correctamente.');
    }).catch((err) => {
      const backendMessage =
        typeof err === 'object' &&
        err !== null &&
        'response' in err &&
        typeof (err as { response?: { data?: { message?: unknown } } }).response?.data?.message === 'string'
          ? ((err as { response?: { data?: { message?: string } } }).response?.data?.message ?? '')
          : '';

      setData(previousData);
      setLocalError(backendMessage || (err instanceof Error ? err.message : 'No fue posible actualizar la configuración de formularios.'));
    }).finally(() => {
      setSaving(false);
    });
  };

  const updateCustomField = (module: CustomHistoryModule, index: number, updater: (field: CustomHistoryFieldDefinition) => CustomHistoryFieldDefinition) => {
    if (!data) return;

    const currentFields = data.custom_history_fields[module] ?? [];
    const nextFields = currentFields.map((field, fieldIndex) => fieldIndex === index ? updater(field) : field)
      .map((field, fieldIndex) => ({ ...field, sort_order: fieldIndex + 1 }));

    persistCustomFields({
      ...data.custom_history_fields,
      [module]: nextFields,
    });
  };

  const addCustomField = (module: CustomHistoryModule) => {
    if (!data) return;

    const currentFields = data.custom_history_fields[module] ?? [];
    if (currentFields.length >= 5) {
      setLocalError('Cada módulo permite un máximo de 5 campos personalizados.');
      return;
    }

    persistCustomFields({
      ...data.custom_history_fields,
      [module]: [...currentFields, createCustomHistoryField(module, currentFields.length)],
    });
  };

  const removeCustomField = (module: CustomHistoryModule, index: number) => {
    if (!data) return;

    const currentFields = data.custom_history_fields[module] ?? [];
    persistCustomFields({
      ...data.custom_history_fields,
      [module]: currentFields
        .filter((_, fieldIndex) => fieldIndex !== index)
        .map((field, fieldIndex) => ({ ...field, sort_order: fieldIndex + 1 })),
    });
  };

  return (
    <CardShell title="Formularios clínicos">
      <Grid container spacing={3}>
        <Grid size={{ xs: 12 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
            Personaliza qué campos se mostrarán en la historia clínica y en la nota diaria para cada consultorio.
          </Typography>
          <TextField
            select
            label="Consultorio"
            value={selectedOfficeId}
            fullWidth
            variant="standard"
            onChange={(event) => setSelectedOfficeId(Number(event.target.value))}
            sx={{ maxWidth: 420, mb: 1 }}
          >
            {availableOffices.map((office) => (
              <MenuItem key={office.id} value={office.id}>{office.title}</MenuItem>
            ))}
          </TextField>
        </Grid>
        {localError ? (
          <Grid size={{ xs: 12 }}>
            <Alert severity="error">{localError}</Alert>
          </Grid>
        ) : null}
        {loading || !data ? (
          <Grid size={{ xs: 12 }}>
            <Box sx={{ minHeight: 240, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CircularProgress />
            </Box>
          </Grid>
        ) : (
          <>
            <Grid size={{ xs: 12, lg: 4 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                <Typography variant="h6" sx={{ color: '#1e8b2d', fontWeight: 500 }}>
                  Historia clínica
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Define qué campos estarán disponibles dentro de la historia clínica del paciente y
                  qué información podrá capturarse por módulo durante la consulta.
                </Typography>
                {CLINICAL_HISTORY_GROUPS_WITH_MODULE.map((group) => (
                  <FormFieldGroupCard
                    key={group.title}
                    title={group.title}
                    fields={group.fields}
                    values={data.clinical_history}
                    disabled={saving}
                    onToggle={(key, checked) => persistSection('clinical_history', key, checked)}
                    collapsed={collapsedGroups[group.module] ?? true}
                    onCollapsedChange={(collapsed) =>
                      setCollapsedGroups((current) => ({ ...current, [group.module]: collapsed }))
                    }
                  >
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 2 }}>
                        <Box>
                          <Typography sx={{ color: '#1e8b2d', fontWeight: 600 }}>Campos personalizados</Typography>
                          <Typography variant="body2" color="text.secondary">
                            Puedes agregar hasta 5 campos extra en este módulo.
                          </Typography>
                        </Box>
                        <Button
                          variant="outlined"
                          size="small"
                          disabled={saving || (data.custom_history_fields[group.module].length >= 5)}
                          onClick={() => addCustomField(group.module)}
                        >
                          Agregar campo
                        </Button>
                      </Box>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {(() => {
                          const module = group.module;
                          const fields = data.custom_history_fields[module] ?? [];

                          if (fields.length === 0) {
                            return <Alert severity="info">Aún no hay campos personalizados en este módulo.</Alert>;
                          }

                          return fields.map((field, index) => (
                            <Box key={field.key} sx={{ border: '1px solid #e2edf2', borderRadius: 2, p: 2 }}>
                              <Grid container spacing={2}>
                                <Grid size={{ xs: 12, md: 6 }}>
                                  <TextField
                                    label="Título del campo"
                                    value={field.label}
                                    fullWidth
                                    variant="standard"
                                    disabled={saving}
                                    onBlur={(event) => {
                                      const label = event.target.value.trim();
                                      if (!label) return;
                                      updateCustomField(module, index, (current) => ({
                                        ...current,
                                        label,
                                        key: normalizeCustomFieldLabelToKey(module, label, current.key),
                                      }));
                                    }}
                                    onChange={(event) => {
                                      const nextValue = event.target.value;
                                      setData((current) => current ? ({
                                        ...current,
                                        custom_history_fields: {
                                          ...current.custom_history_fields,
                                          [module]: current.custom_history_fields[module].map((item, itemIndex) => itemIndex === index ? { ...item, label: nextValue } : item),
                                        },
                                      }) : current);
                                    }}
                                  />
                                </Grid>
                                <Grid size={{ xs: 12, md: 6 }}>
                                  <TextField
                                    select
                                    label="Tipo de input"
                                    value={field.input_type}
                                    fullWidth
                                    variant="standard"
                                    disabled={saving}
                                    onChange={(event) => {
                                      const nextType = event.target.value as CustomHistoryInputType;
                                      updateCustomField(module, index, (current) => ({
                                        ...current,
                                        input_type: nextType,
                                        options: nextType === 'select' ? (current.options.length ? current.options : ['', '']) : [],
                                      }));
                                    }}
                                  >
                                    {CUSTOM_HISTORY_INPUT_OPTIONS.map((option) => (
                                      <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                                    ))}
                                  </TextField>
                                </Grid>
                                <Grid size={{ xs: 12, md: 4 }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                                    <Checkbox
                                      checked={field.enabled}
                                      disabled={saving}
                                      onChange={(event) => updateCustomField(module, index, (current) => ({ ...current, enabled: event.target.checked }))}
                                    />
                                    <Typography>Activo</Typography>
                                  </Box>
                                </Grid>
                                <Grid size={{ xs: 12, md: 4 }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                                    <Checkbox
                                      checked={field.required}
                                      disabled={saving}
                                      onChange={(event) => updateCustomField(module, index, (current) => ({ ...current, required: event.target.checked }))}
                                    />
                                    <Typography>Obligatorio</Typography>
                                  </Box>
                                </Grid>
                                <Grid size={{ xs: 12, md: 4 }}>
                                  <Box sx={{ display: 'flex', justifyContent: { xs: 'flex-start', md: 'flex-end' }, alignItems: 'center', height: '100%' }}>
                                    <Button color="error" onClick={() => removeCustomField(module, index)} disabled={saving}>
                                      Eliminar
                                    </Button>
                                  </Box>
                                </Grid>
                                {field.input_type === 'select' ? (
                                  <Grid size={{ xs: 12 }}>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                      <Typography sx={{ color: '#183844', fontWeight: 500 }}>Opciones</Typography>
                                      {field.options.map((option, optionIndex) => (
                                        <Box key={`${field.key}_option_${optionIndex}`} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                          <TextField
                                            label={`Opción ${optionIndex + 1}`}
                                            value={option}
                                            fullWidth
                                            variant="standard"
                                            disabled={saving}
                                            onBlur={(event) => {
                                              const nextValue = event.target.value.trim();
                                              updateCustomField(module, index, (current) => ({
                                                ...current,
                                                options: current.options.map((item, itemIndex) => itemIndex === optionIndex ? nextValue : item),
                                              }));
                                            }}
                                            onChange={(event) => {
                                              const nextValue = event.target.value;
                                              setData((current) => current ? ({
                                                ...current,
                                                custom_history_fields: {
                                                  ...current.custom_history_fields,
                                                  [module]: current.custom_history_fields[module].map((item, itemIndex) => itemIndex === index ? {
                                                    ...item,
                                                    options: item.options.map((optionItem, currentOptionIndex) => currentOptionIndex === optionIndex ? nextValue : optionItem),
                                                  } : item),
                                                },
                                              }) : current);
                                            }}
                                          />
                                          <Button
                                            color="error"
                                            disabled={saving || field.options.length <= 2}
                                            onClick={() => updateCustomField(module, index, (current) => ({
                                              ...current,
                                              options: current.options.filter((_, currentOptionIndex) => currentOptionIndex !== optionIndex),
                                            }))}
                                          >
                                            Quitar
                                          </Button>
                                        </Box>
                                      ))}
                                      <Box>
                                        <Button
                                          size="small"
                                          variant="outlined"
                                          disabled={saving}
                                          onClick={() => updateCustomField(module, index, (current) => ({
                                            ...current,
                                            options: [...current.options, ''],
                                          }))}
                                        >
                                          Agregar opción
                                        </Button>
                                      </Box>
                                    </Box>
                                  </Grid>
                                ) : null}
                              </Grid>
                            </Box>
                          ));
                        })()}
                      </Box>
                  </FormFieldGroupCard>
                ))}
              </Box>
            </Grid>
            <Grid size={{ xs: 12, lg: 4 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                <Typography variant="h6" sx={{ color: '#1e8b2d', fontWeight: 500 }}>
                  Nota diaria
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Configura qué secciones y campos estarán visibles y editables dentro de la nota
                  diaria para organizar mejor la captura clínica en Subjetivo, Objetivo, Análisis y
                  Plan.
                </Typography>
                {DAILY_NOTE_GROUPS.map((group) => (
                  <FormFieldGroupCard
                    key={group.title}
                    title={group.title}
                    fields={group.fields}
                    values={data.daily_note}
                    disabled={saving}
                    onToggle={(key, checked) => persistSection('daily_note', key, checked)}
                    collapsed={collapsedGroups[`daily_note_${group.title}`] ?? true}
                    onCollapsedChange={(collapsed) =>
                      setCollapsedGroups((current) => ({
                        ...current,
                        [`daily_note_${group.title}`]: collapsed,
                      }))
                    }
                  />
                ))}
              </Box>
            </Grid>
            <Grid size={{ xs: 12, lg: 4 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                <Typography variant="h6" sx={{ color: '#1e8b2d', fontWeight: 500 }}>
                  Historia clínica visible en nota diaria
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Elige qué datos de historia clínica se mostrarán como referencia visual
                  dentro de la nota diaria para consultar contexto del paciente sin tener que ir al
                  apartado de la historia clínica.
                </Typography>
                {CLINICAL_HISTORY_GROUPS_WITH_MODULE.map((group) => (
                  <FormFieldGroupCard
                    key={`daily_note_history_${group.module}`}
                    title={group.title}
                    fields={group.fields}
                    values={data.daily_note_clinical_history_visibility}
                    disabled={saving}
                    onToggle={(key, checked) => persistSection('daily_note_clinical_history_visibility', key, checked)}
                    collapsed={collapsedGroups[`daily_note_history_${group.module}`] ?? true}
                    onCollapsedChange={(collapsed) =>
                      setCollapsedGroups((current) => ({ ...current, [`daily_note_history_${group.module}`]: collapsed }))
                    }
                  />
                ))}
              </Box>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                <Typography variant="h6" sx={{ color: '#1e8b2d', fontWeight: 500 }}>
                  Configuraciones adicionales
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Ajusta opciones generales que complementan la captura clínica y la experiencia en
                  otras pantallas del sistema.
                </Typography>
                <Grid container spacing={3}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <FormFieldGroupCard
                      title="Género por defecto"
                      fields={[]}
                      values={{}}
                      disabled={saving}
                      onToggle={() => undefined}
                      collapsed={collapsedGroups.new_appointment_default_gender ?? true}
                      onCollapsedChange={(collapsed) =>
                        setCollapsedGroups((current) => ({ ...current, new_appointment_default_gender: collapsed }))
                      }
                    >
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        <Typography variant="body2" color="text.secondary">
                          El campo de seleccionar género seguirá visible al agendar una cita, pero se precargará automáticamente con la opción elegida.
                        </Typography>
                        <TextField
                          select
                          label="Género por defecto en nueva cita"
                          value={data.new_appointment.default_gender}
                          fullWidth
                          variant="standard"
                          disabled={saving}
                          onChange={(event) => persistNewAppointmentDefaultGender(event.target.value as 'M' | 'F' | '')}
                        >
                          <MenuItem value="">Ninguno</MenuItem>
                          <MenuItem value="F">Femenino</MenuItem>
                          <MenuItem value="M">Masculino</MenuItem>
                        </TextField>
                      </Box>
                    </FormFieldGroupCard>
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <FormFieldGroupCard
                      title="Menú del detalle del paciente"
                      fields={[]}
                      values={{}}
                      disabled={saving}
                      onToggle={() => undefined}
                      collapsed={collapsedGroups.patient_detail_menu ?? true}
                      onCollapsedChange={(collapsed) =>
                        setCollapsedGroups((current) => ({ ...current, patient_detail_menu: collapsed }))
                      }
                    >
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        <Typography variant="body2" color="text.secondary">
                          Activa el acceso al módulo de cámara dentro del submenú del detalle del paciente y personaliza su título.
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Checkbox
                            checked={data.patient_detail.camera_menu_enabled}
                            disabled={saving}
                            onChange={(event) => handlePatientDetailCameraToggle(event.target.checked)}
                          />
                          <Typography>Mostrar menú de cámara</Typography>
                        </Box>
                        {data.patient_detail.camera_menu_enabled ? (
                          <TextField
                            inputRef={cameraMenuTitleInputRef}
                            label="Título del menú"
                            value={data.patient_detail.camera_menu_title}
                            fullWidth
                            variant="standard"
                            disabled={saving}
                            inputProps={{ maxLength: 14 }}
                            onChange={(event) => {
                              const nextValue = event.target.value.slice(0, 14);
                              setData((current) => current ? ({
                                ...current,
                                patient_detail: {
                                  ...current.patient_detail,
                                  camera_menu_title: nextValue,
                                },
                              }) : current);
                              setCameraMenuDirty(true);
                            }}
                          />
                        ) : null}
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Checkbox
                            checked={data.patient_detail.daily_note_title_enabled}
                            disabled={saving}
                            onChange={(event) => handlePatientDetailDailyNoteTitleToggle(event.target.checked)}
                          />
                          <Typography>Título de la nota diaria</Typography>
                        </Box>
                        {data.patient_detail.daily_note_title_enabled ? (
                          <TextField
                            inputRef={dailyNoteTitleInputRef}
                            label="Título del botón"
                            value={data.patient_detail.daily_note_title}
                            fullWidth
                            variant="standard"
                            disabled={saving}
                            inputProps={{ maxLength: 24 }}
                            onChange={(event) => {
                              const nextValue = event.target.value.slice(0, 24);
                              setData((current) => current ? ({
                                ...current,
                                patient_detail: {
                                  ...current.patient_detail,
                                  daily_note_title: nextValue,
                                },
                              }) : current);
                              setCameraMenuDirty(true);
                            }}
                          />
                        ) : null}
                        <Box>
                          <Button
                            variant="contained"
                            disabled={saving || !cameraMenuDirty}
                            onClick={() => persistPatientDetailCameraMenu(data.patient_detail)}
                          >
                            Guardar
                          </Button>
                        </Box>
                      </Box>
                    </FormFieldGroupCard>
                  </Grid>
                </Grid>
              </Box>
            </Grid>
          </>
        )}
      </Grid>
    </CardShell>
  );
}

function ReportsPanel({
  offices,
  onSuccess,
}: {
  offices: Office[];
  onSuccess: (message: string) => void;
}) {
  const availableOffices = useMemo(() => offices, [offices]);
  const [selectedOfficeId, setSelectedOfficeId] = useState<number>(availableOffices[0]?.id ?? 0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submittingTemplate, setSubmittingTemplate] = useState(false);
  const [data, setData] = useState<SettingsReportsData | null>(null);
  const [catalog, setCatalog] = useState<SettingsPdfReportTemplateCatalogData | null>(null);
  const [templates, setTemplates] = useState<SettingsPdfReportTemplateSummary[]>([]);
  const [localError, setLocalError] = useState<string | null>(null);
  const [templateNotice, setTemplateNotice] = useState<string | null>(null);
  const [preconfiguredCollapsed, setPreconfiguredCollapsed] = useState(true);
  const [pdfReportsCollapsed, setPdfReportsCollapsed] = useState(true);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [templateOutputName, setTemplateOutputName] = useState('');
  const [templateCategory, setTemplateCategory] = useState('lab_attachment');
  const [templateLaboratoryId, setTemplateLaboratoryId] = useState<number | ''>('');
  const [templateStudyTypeId, setTemplateStudyTypeId] = useState<number | ''>('');
  const [selectedTemplateFile, setSelectedTemplateFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (availableOffices.length === 0) {
      setSelectedOfficeId(0);
      return;
    }

    setSelectedOfficeId((current) => current && availableOffices.some((office) => office.id === current) ? current : availableOffices[0].id);
  }, [availableOffices]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (!selectedOfficeId) {
        setData(null);
        return;
      }

      setLoading(true);
      setLocalError(null);
      setTemplateNotice(null);

      try {
        const [reportSettings, nextCatalog, nextTemplates] = await Promise.all([
          settingsService.getReportSettings(selectedOfficeId),
          settingsService.getPdfReportTemplateCatalog(selectedOfficeId),
          settingsService.getPdfReportTemplates(selectedOfficeId),
        ]);
        if (mounted) {
          setData(reportSettings);
          setCatalog(nextCatalog);
          setTemplates(nextTemplates);
          if (nextCatalog.template_categories.includes(templateCategory) === false) {
            setTemplateCategory(nextCatalog.template_categories[0] ?? 'lab_attachment');
          }
        }
      } catch (err) {
        if (mounted) {
          setLocalError(err instanceof Error ? err.message : 'No fue posible cargar la configuración de reportes.');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      mounted = false;
    };
  }, [selectedOfficeId]);

  if (availableOffices.length === 0) {
    return <PlaceholderPanel title="Reportes" description="Esta sección estará disponible cuando tengas al menos un consultorio asignado para configurar los tipos de reportes." />;
  }

  const persist = (nextData: SettingsReportsData) => {
    const previousData = data;
    setData(nextData);
    setSaving(true);
    setLocalError(null);

    void settingsService.updateReportSettings(nextData).then((updated) => {
      setData(updated);
      onSuccess('Configuración de reportes actualizada correctamente.');
    }).catch((err) => {
      const backendMessage =
        typeof err === 'object' &&
        err !== null &&
        'response' in err &&
        typeof (err as { response?: { data?: { message?: unknown } } }).response?.data?.message === 'string'
          ? ((err as { response?: { data?: { message?: string } } }).response?.data?.message ?? '')
          : '';

      setData(previousData ?? null);
      setLocalError(backendMessage || (err instanceof Error ? err.message : 'No fue posible actualizar la configuración de reportes.'));
    }).finally(() => {
      setSaving(false);
    });
  };

  const buildNextReportsState = (
    currentData: SettingsReportsData,
    reportKey: string,
    enabled: boolean
  ): SettingsReportsData => {
    const nextEnabledKeys = enabled
      ? Array.from(new Set([...currentData.enabled_report_keys, reportKey]))
      : currentData.enabled_report_keys.filter((key) => key !== reportKey);

    return {
      ...currentData,
      enabled_report_keys: nextEnabledKeys,
      reports: currentData.reports.map((item) =>
        item.key === reportKey ? { ...item, enabled } : item
      ),
    };
  };

  const resetTemplateForm = () => {
    setTemplateName('');
    setTemplateDescription('');
    setTemplateOutputName('');
    setTemplateCategory('lab_attachment');
    setTemplateLaboratoryId('');
    setTemplateStudyTypeId('');
    setSelectedTemplateFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleTemplateFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] ?? null;
    setSelectedTemplateFile(nextFile);
  };

  const handleTemplateSubmit = async () => {
    if (!selectedOfficeId) {
      setLocalError('Selecciona un consultorio antes de registrar el reporte.');
      return;
    }

    if (!selectedTemplateFile) {
      setLocalError('Selecciona el PDF base del reporte.');
      return;
    }

    if (!templateName.trim() || !templateOutputName.trim()) {
      setLocalError('Completa el nombre del reporte y el nombre del archivo descargable.');
      return;
    }

    setSubmittingTemplate(true);
    setLocalError(null);
    setTemplateNotice(null);

    try {
      const uploadedFile = await settingsService.uploadPdfReportTemplateBasePdf({
        office_id: selectedOfficeId,
        file: selectedTemplateFile,
      });

      const created = await settingsService.createPdfReportTemplate({
        office_id: selectedOfficeId,
        laboratory_id: templateLaboratoryId === '' ? null : Number(templateLaboratoryId),
        study_type_id: templateStudyTypeId === '' ? null : Number(templateStudyTypeId),
        name: templateName.trim(),
        description: templateDescription.trim(),
        output_file_name: templateOutputName.trim(),
        template_category: templateCategory,
        base_pdf_file_id: uploadedFile.id,
        status: 'pending_review',
        fields: [],
      });

      setTemplates((current) => [created, ...current]);
      setTemplateNotice('Tu reporte fue recibido. En un máximo de 24 horas estará listo para utilizarse.');
      onSuccess('Tu reporte fue recibido. En un máximo de 24 horas estará listo para utilizarse.');
      resetTemplateForm();
    } catch (err) {
      const backendMessage =
        typeof err === 'object' &&
        err !== null &&
        'response' in err &&
        typeof (err as { response?: { data?: { message?: unknown } } }).response?.data?.message === 'string'
          ? ((err as { response?: { data?: { message?: string } } }).response?.data?.message ?? '')
          : '';

      setLocalError(backendMessage || (err instanceof Error ? err.message : 'No fue posible registrar el reporte específico.'));
    } finally {
      setSubmittingTemplate(false);
    }
  };

  return (
    <CardShell title="Reportes">
      <Grid container spacing={3}>
        <Grid size={{ xs: 12 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
            Configura aquí los reportes generales del sistema y registra reportes específicos en PDF para revisión interna.
          </Typography>
          <TextField
            select
            label="Consultorio"
            value={selectedOfficeId}
            fullWidth
            variant="standard"
            onChange={(event) => setSelectedOfficeId(Number(event.target.value))}
            sx={{ maxWidth: 420, mb: 1 }}
          >
            {availableOffices.map((office) => (
              <MenuItem key={office.id} value={office.id}>{office.title}</MenuItem>
            ))}
          </TextField>
        </Grid>
        {localError ? (
          <Grid size={{ xs: 12 }}>
            <Alert severity="error">{localError}</Alert>
          </Grid>
        ) : null}
        {templateNotice ? (
          <Grid size={{ xs: 12 }}>
            <Alert severity="success">{templateNotice}</Alert>
          </Grid>
        ) : null}
        {loading || !data ? (
          <Grid size={{ xs: 12 }}>
            <Box sx={{ minHeight: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CircularProgress />
            </Box>
          </Grid>
        ) : (
          <Grid size={{ xs: 12 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <CollapsibleCardSection
                title="Reportes preconfigurados"
                collapsed={preconfiguredCollapsed}
                onToggle={() => setPreconfiguredCollapsed((current) => !current)}
              >
                <Grid container spacing={3}>
                  <Grid size={{ xs: 12, md: 8 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Activa o desactiva los tipos de reportes que estarán disponibles para tu consultorio.
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.75 }}>
                      {data.reports.map((report) => (
                        <Box
                          key={report.key}
                          onClick={() => persist(buildNextReportsState(data, report.key, !report.enabled))}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1.5,
                            px: 1.5,
                            py: 1.25,
                            borderRadius: 1.75,
                            border: '1px solid #d8e8ef',
                            cursor: saving ? 'default' : 'pointer',
                            backgroundColor: '#ffffff',
                            transition: 'background-color 0.18s ease, border-color 0.18s ease',
                            '&:hover': saving ? undefined : {
                              backgroundColor: '#f6fbfd',
                              borderColor: '#b7d7e4',
                            },
                          }}
                        >
                          <Checkbox
                            checked={report.enabled}
                            disabled={saving}
                            onChange={(event) => {
                              event.stopPropagation();
                              persist(buildNextReportsState(data, report.key, event.target.checked));
                            }}
                            onClick={(event) => event.stopPropagation()}
                            sx={{ p: 0.5 }}
                          />
                          <Typography sx={{ color: '#183844', fontWeight: 500 }}>{report.label}</Typography>
                        </Box>
                      ))}
                    </Box>
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Ajustes complementarios de disponibilidad para la agenda médica.
                    </Typography>
                    <Box
                      onClick={() => persist({
                        ...data,
                        show_in_new_appointment: !data.show_in_new_appointment,
                      })}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        px: 1.5,
                        py: 1.25,
                        borderRadius: 1.75,
                        border: '1px solid #d8e8ef',
                        cursor: saving ? 'default' : 'pointer',
                        backgroundColor: '#ffffff',
                      }}
                    >
                      <Checkbox
                        checked={data.show_in_new_appointment}
                        disabled={saving}
                        onChange={(event) => {
                          event.stopPropagation();
                          persist({
                            ...data,
                            show_in_new_appointment: event.target.checked,
                          });
                        }}
                        onClick={(event) => event.stopPropagation()}
                        sx={{ p: 0.5 }}
                      />
                      <Typography sx={{ color: '#183844', fontWeight: 500 }}>
                        Mostrar tipos de reportes en nueva cita (funcionalidad pendiente)
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </CollapsibleCardSection>

              <CollapsibleCardSection
                title="Reportes específicos en PDF"
                collapsed={pdfReportsCollapsed}
                onToggle={() => setPdfReportsCollapsed((current) => !current)}
              >
                <Grid container spacing={3}>
                  <Grid size={{ xs: 12, lg: 7 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Registra aquí los formatos PDF que uses en tu operación diaria. Una vez cargados, el equipo interno los revisará y en un lapso máximo de 24 horas quedarán listos para utilizarse.
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <TextField
                          label="Nombre del reporte"
                          value={templateName}
                          onChange={(event) => setTemplateName(event.target.value)}
                          fullWidth
                          variant="standard"
                          disabled={submittingTemplate}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <TextField
                          label="Nombre del archivo descargable"
                          value={templateOutputName}
                          onChange={(event) => setTemplateOutputName(event.target.value)}
                          fullWidth
                          variant="standard"
                          disabled={submittingTemplate}
                          helperText="Este nombre se usará para el PDF final."
                        />
                      </Grid>
                      <Grid size={{ xs: 12 }}>
                        <TextField
                          label="Descripción"
                          value={templateDescription}
                          onChange={(event) => setTemplateDescription(event.target.value)}
                          fullWidth
                          variant="standard"
                          disabled={submittingTemplate}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, md: 4 }}>
                        <TextField
                          select
                          label="Tipo de reporte"
                          value={templateCategory}
                          onChange={(event) => setTemplateCategory(event.target.value)}
                          fullWidth
                          variant="standard"
                          disabled={submittingTemplate}
                        >
                          {(catalog?.template_categories ?? []).map((category) => (
                            <MenuItem key={category} value={category}>
                              {getPdfReportTemplateCategoryLabel(category)}
                            </MenuItem>
                          ))}
                        </TextField>
                      </Grid>
                      <Grid size={{ xs: 12, md: 4 }}>
                        <TextField
                          select
                          label="Laboratorio"
                          value={templateLaboratoryId}
                          onChange={(event) => setTemplateLaboratoryId(event.target.value === '' ? '' : Number(event.target.value))}
                          fullWidth
                          variant="standard"
                          disabled={submittingTemplate}
                        >
                          <MenuItem value="">Sin laboratorio específico</MenuItem>
                          {(catalog?.laboratories ?? []).map((laboratory) => (
                            <MenuItem key={laboratory.id} value={laboratory.id}>
                              {laboratory.name}
                            </MenuItem>
                          ))}
                        </TextField>
                      </Grid>
                      <Grid size={{ xs: 12, md: 4 }}>
                        <TextField
                          select
                          label="Estudio ligado"
                          value={templateStudyTypeId}
                          onChange={(event) => setTemplateStudyTypeId(event.target.value === '' ? '' : Number(event.target.value))}
                          fullWidth
                          variant="standard"
                          disabled={submittingTemplate}
                        >
                          <MenuItem value="">Sin estudio ligado</MenuItem>
                          {(catalog?.study_types ?? []).map((studyType) => (
                            <MenuItem key={studyType.id} value={studyType.id}>
                              {studyType.name}
                            </MenuItem>
                          ))}
                        </TextField>
                      </Grid>
                      <Grid size={{ xs: 12 }}>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="application/pdf"
                          hidden
                          onChange={handleTemplateFileChange}
                        />
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                          <Button
                            variant="outlined"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={submittingTemplate}
                          >
                            {selectedTemplateFile ? 'Reemplazar PDF' : 'Seleccionar PDF'}
                          </Button>
                          <Typography variant="body2" color="text.secondary">
                            {selectedTemplateFile ? selectedTemplateFile.name : 'Aún no se ha seleccionado un PDF base.'}
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid size={{ xs: 12 }}>
                        <Button
                          variant="contained"
                          onClick={() => { void handleTemplateSubmit(); }}
                          disabled={submittingTemplate || !templateName.trim() || !templateOutputName.trim() || !selectedTemplateFile}
                          sx={{ minWidth: 220, borderRadius: 1, backgroundColor: '#ea1d63', boxShadow: '0 8px 18px rgba(234, 29, 99, 0.28)', '&:hover': { backgroundColor: '#cf1857' } }}
                        >
                          {submittingTemplate ? 'Enviando...' : 'Registrar reporte específico'}
                        </Button>
                      </Grid>
                    </Grid>
                  </Grid>
                  <Grid size={{ xs: 12, lg: 5 }}>
                    <Typography sx={{ color: '#183844', fontWeight: 600, mb: 2 }}>
                      Reportes registrados
                    </Typography>
                    {templates.length === 0 ? (
                      <Alert severity="info">Todavía no hay reportes específicos registrados para este consultorio.</Alert>
                    ) : (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        {templates.map((template) => (
                          <Box
                            key={template.id}
                            sx={{
                              border: '1px solid #d8e8ef',
                              borderRadius: 2,
                              p: 1.75,
                              backgroundColor: '#fff',
                            }}
                          >
                            <Typography sx={{ color: '#183844', fontWeight: 600 }}>
                              {template.name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Estado: {template.status}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Tipo: {getPdfReportTemplateCategoryLabel(template.template_category)}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Archivo final: {template.output_file_name}
                            </Typography>
                            {template.study_type ? (
                              <Typography variant="body2" color="text.secondary">
                                Estudio: {template.study_type.name}
                              </Typography>
                            ) : null}
                            {template.laboratory ? (
                              <Typography variant="body2" color="text.secondary">
                                Laboratorio: {template.laboratory.name}
                              </Typography>
                            ) : null}
                            {template.base_pdf_file ? (
                              <Typography variant="body2" color="text.secondary">
                                PDF base: {template.base_pdf_file.title}
                              </Typography>
                            ) : null}
                          </Box>
                        ))}
                      </Box>
                    )}
                  </Grid>
                </Grid>
              </CollapsibleCardSection>
            </Box>
          </Grid>
        )}
      </Grid>
    </CardShell>
  );
}

function AgendaPanel({
  offices,
  saving,
  onSaveAgenda,
  onCopied,
  onSuccess,
  shouldScrollToConsultationReasons,
}: {
  offices: Office[];
  saving: boolean;
  onSaveAgenda: (payload: SettingsAgendaData) => Promise<void>;
  onCopied: () => void;
  onSuccess: (message: string) => void;
  shouldScrollToConsultationReasons?: boolean;
}) {
  const availableOffices = useMemo(() => offices, [offices]);
  const [selectedOfficeId, setSelectedOfficeId] = useState<number>(availableOffices[0]?.id ?? 0);
  const [agendaRows, setAgendaRows] = useState<AgendaDayRow[]>([]);
  const [savedAgendaRows, setSavedAgendaRows] = useState<AgendaDayRow[]>([]);
  const [firstTime, setFirstTime] = useState('00:10');
  const [recurrent, setRecurrent] = useState('00:10');
  const [formSettings, setFormSettings] = useState<SettingsFormsData | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formSaving, setFormSaving] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const consultationReasonsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (availableOffices.length === 0) {
      setSelectedOfficeId(0);
      return;
    }
    setSelectedOfficeId((current) => current && availableOffices.some((office) => office.id === current) ? current : availableOffices[0].id);
  }, [availableOffices]);

  useEffect(() => {
    const office = availableOffices.find((item) => item.id === selectedOfficeId);
    const nextRows = createDefaultAgendaRows(office?.opendays);
    setAgendaRows(nextRows);
    setSavedAgendaRows(nextRows);
    setFirstTime(formatMinutesToTime(office?.firsttime));
    setRecurrent(formatMinutesToTime(office?.recurrent));
  }, [availableOffices, selectedOfficeId]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (!selectedOfficeId) {
        setFormSettings(null);
        return;
      }

      setFormLoading(true);
      setLocalError(null);

      try {
        const response = await settingsService.getFormSettings(selectedOfficeId);
        if (mounted) {
          setFormSettings(response);
        }
      } catch (err) {
        if (mounted) {
          setLocalError(err instanceof Error ? err.message : 'No fue posible cargar los motivos de la consulta.');
        }
      } finally {
        if (mounted) {
          setFormLoading(false);
        }
      }
    };

    void load();

    return () => {
      mounted = false;
    };
  }, [selectedOfficeId]);

  useEffect(() => {
    if (!shouldScrollToConsultationReasons || formLoading) {
      return;
    }

    const timer = window.setTimeout(() => {
      consultationReasonsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 120);

    return () => window.clearTimeout(timer);
  }, [formLoading, shouldScrollToConsultationReasons]);

  const selectedOffice = availableOffices.find((item) => item.id === selectedOfficeId);
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

  const persistConsultationReasons = async (consultationReasons: SettingsFormsData['consultation_reasons']) => {
    if (!formSettings) {
      return;
    }

    setFormSaving(true);
    setLocalError(null);

    try {
      const sanitizedReasons = consultationReasons
        .map((reason, index) => {
          const trimmedLabel = reason.label.trim();
          const normalizedKey = trimmedLabel
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '')
            .slice(0, 50);

          return {
            key: normalizedKey || reason.key || `motivo_consulta_${Date.now()}_${index + 1}`,
            label: trimmedLabel || reason.label,
            minutes: reason.minutes === null || reason.minutes === undefined || Number.isNaN(reason.minutes) ? null : Number(reason.minutes),
          };
        })
        .filter((reason) => reason.label.trim().length > 0);

      const updated = await settingsService.updateFormSettings({
        ...formSettings,
        consultation_reasons: sanitizedReasons,
      });
      setFormSettings(updated);
      onSuccess('Motivos de la consulta actualizados correctamente.');
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'No fue posible actualizar los motivos de la consulta.');
    } finally {
      setFormSaving(false);
    }
  };

  const updateSingleRow = (index: number, updater: (row: AgendaDayRow) => AgendaDayRow) => {
    setAgendaRows((current) => current.map((item, itemIndex) => itemIndex === index ? updater(item) : item));
  };

  const scheduleRowsDirty = useMemo(
    () => JSON.stringify(agendaRows) !== JSON.stringify(savedAgendaRows),
    [agendaRows, savedAgendaRows]
  );

  if (availableOffices.length === 0) {
    return <PlaceholderPanel title="Agenda" description="Esta sección estará disponible cuando tengas al menos un consultorio asignado para administrar sus horarios." />;
  }

  return (
    <Grid container spacing={3}>
      {localError ? (
        <Grid size={{ xs: 12 }}>
          <Alert severity="error">{localError}</Alert>
        </Grid>
      ) : null}
      <Grid size={{ xs: 12, md: 7 }}>
        <CardShell title="Link público de fechas y horarios">
          <TextField select label="Consultorio" value={selectedOfficeId} fullWidth variant="standard" onChange={(event) => setSelectedOfficeId(Number(event.target.value))} sx={{ mb: 3 }}>
            {availableOffices.map((office) => (
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
        <CardShell title="Motivo de la consulta">
          <Box ref={consultationReasonsRef} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 2.5, flexWrap: 'wrap', scrollMarginTop: 180 }}>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 760 }}>
              Configura aquí los motivos de la consulta que podrás usar al agendar. Si un motivo tiene minutos propios, esos minutos se usarán para calcular las fechas y horarios disponibles.
            </Typography>
            <Button
              variant="outlined"
              size="small"
              disabled={saving || formSaving || formLoading || !formSettings}
              onClick={() => {
                setFormSettings((current) => current ? ({
                  ...current,
                  consultation_reasons: [...current.consultation_reasons, createConsultationReason(current.consultation_reasons.length)],
                }) : current);
              }}
            >
              Agregar motivo
            </Button>
          </Box>
          {formLoading ? (
            <Box sx={{ minHeight: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CircularProgress size={26} />
            </Box>
          ) : (formSettings?.consultation_reasons?.length ?? 0) === 0 ? (
            <Alert severity="info">Aún no hay motivos de la consulta configurados.</Alert>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {(formSettings?.consultation_reasons ?? []).map((reason, index) => (
                <ConsultationReasonRow
                  key={reason.key}
                  reason={reason}
                  disabled={saving || formSaving}
                  onSave={(updatedReason) => {
                    const nextReasons = (formSettings?.consultation_reasons ?? []).map((item, itemIndex) => itemIndex === index
                      ? updatedReason
                      : item);
                    void persistConsultationReasons(nextReasons);
                  }}
                  onDelete={() => {
                    const currentReasons = formSettings?.consultation_reasons ?? [];
                    const nextReasons = currentReasons.filter((_, itemIndex) => itemIndex !== index);
                    const currentReason = currentReasons[index];

                    if (!currentReason?.label?.trim()) {
                      setFormSettings((current) => current ? ({
                        ...current,
                        consultation_reasons: nextReasons,
                      }) : current);
                      return;
                    }

                    void persistConsultationReasons(nextReasons);
                  }}
                />
              ))}
            </Box>
          )}
        </CardShell>
      </Grid>
      <Grid size={{ xs: 12 }}>
        <CardShell title="Configuración de días y horarios laborales">
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
            Si requieres guardar los cambios de esta sección, da click en el botón Guardar al final de este panel.
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {agendaRows.map((row, index) => (
              <AgendaDayRowEditor
                key={row.day}
                row={row}
                index={index}
                saving={saving}
                onUpdate={updateSingleRow}
              />
            ))}
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2.5 }}>
            <Button
              variant="contained"
              disabled={saving || !scheduleRowsDirty}
              onClick={() => {
                void persistAgenda(agendaRows).then(() => {
                  setSavedAgendaRows(agendaRows);
                });
              }}
              sx={{ minWidth: 132, borderRadius: 1, backgroundColor: '#ea1d63', boxShadow: '0 8px 18px rgba(234, 29, 99, 0.28)', '&:hover': { backgroundColor: '#cf1857' } }}
            >
              Guardar
            </Button>
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
  const availableOffices = useMemo(() => offices, [offices]);
  const [selectedOfficeId, setSelectedOfficeId] = useState<number>(availableOffices[0]?.id ?? 0);
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
    if (availableOffices.length === 0) {
      setSelectedOfficeId(0);
      return;
    }

    setSelectedOfficeId((current) =>
      current && availableOffices.some((office) => office.id === current) ? current : availableOffices[0].id
    );
  }, [availableOffices]);

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

  if (availableOffices.length === 0) {
    return <PlaceholderPanel title="Días in-hábiles" description="Esta sección estará disponible cuando tengas al menos un consultorio asignado para administrar días inhábiles." />;
  }

  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12 }}>
        <CardShell title="Registro de días inhábiles">
          <Grid container spacing={4}>
            <Grid size={{ xs: 12, md: 5 }}>
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
                  {availableOffices.map((office) => (
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
              </LocalizationProvider>
            </Grid>
            <Grid size={{ xs: 12, md: 7 }}>
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
            </Grid>
          </Grid>
        </CardShell>
      </Grid>
      <Grid size={{ xs: 12 }}>
        <CardShell title="Registro de días hábiles">
          <Grid container spacing={4}>
            <Grid size={{ xs: 12, md: 5 }}>
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
            </Grid>
            <Grid size={{ xs: 12, md: 7 }}>
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
            </Grid>
          </Grid>
        </CardShell>
      </Grid>
    </Grid>
  );
}

function AssistantsPanel({ offices }: { offices: Office[] }) {
  const ownerOffices = useMemo(() => offices.filter((office) => office.role === 'owner'), [offices]);
  const [selectedOfficeId, setSelectedOfficeId] = useState<number>(ownerOffices[0]?.id ?? 0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [assistantData, setAssistantData] = useState<NotificationAssistantRecipientsData | null>(null);
  const [assistantToDelete, setAssistantToDelete] = useState<NotificationAssistantItem | null>(null);
  const [preassistantIdToDelete, setPreassistantIdToDelete] = useState<number | null>(null);
  const [createdPreassistant, setCreatedPreassistant] = useState<NotificationPreassistantItem | null>(null);

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
        setCreatedPreassistant(null);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const data = await notificationService.getAssistantRecipients(selectedOfficeId);
        if (mounted) {
          setAssistantData(data);
          setCreatedPreassistant((current) => current ? data.preassistants.find((item) => item.id === current.id) ?? null : null);
        }
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

  const copyLink = async (link: string) => {
    await navigator.clipboard.writeText(link);
    setSuccessMessage('Link copiado correctamente.');
  };

  const reachedAssistantLimit =
    (assistantData?.limits.registered_assistants ?? 0) +
      (assistantData?.limits.registered_preassistants ?? 0) >=
    (assistantData?.limits.assistant_max ?? 3);

  return (
    <>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12 }}>
          <CardShell title="Nuevo asistente">
            <TextField
              select
              label="Selecciona un consultorio"
              value={selectedOfficeId}
              onChange={(event) => {
                setSelectedOfficeId(Number(event.target.value));
                setCreatedPreassistant(null);
              }}
              fullWidth
              sx={{ mb: 3.5 }}
            >
              {ownerOffices.map((office) => (
                <MenuItem key={office.id} value={office.id}>{office.title}</MenuItem>
              ))}
            </TextField>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
              Puedes tener hasta {assistantData?.limits.assistant_max ?? 3} asistentes activos entre registrados y pre-asignados. Cada link de asistente permanecerá vigente durante 2 días.
            </Typography>
            {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
            <Button
              variant="contained"
              disabled={saving || loading || !selectedOfficeId || reachedAssistantLimit}
              onClick={() => {
                setSaving(true);
                setError(null);
                void notificationService.addPreassistant(selectedOfficeId).then((data) => {
                  setAssistantData(data);
                  setCreatedPreassistant(data.preassistants[0] ?? null);
                  setSuccessMessage('Link de asistente creado correctamente.');
                }).catch((err) => {
                  const backendMessage =
                    typeof err === 'object' &&
                    err !== null &&
                    'response' in err &&
                    typeof (err as { response?: { data?: { message?: unknown } } }).response?.data?.message === 'string'
                      ? ((err as { response?: { data?: { message?: string } } }).response?.data?.message ?? '')
                      : '';
                  setError(backendMessage || (err instanceof Error ? err.message : 'No fue posible generar el link del asistente.'));
                }).finally(() => {
                  setSaving(false);
                });
              }}
              sx={{ minWidth: 160, borderRadius: 1, backgroundColor: '#ea1d63', boxShadow: '0 8px 18px rgba(234, 29, 99, 0.28)', '&:hover': { backgroundColor: '#cf1857' } }}
            >
              {saving ? 'Generando...' : 'Generar link'}
            </Button>
            {createdPreassistant ? (
              <Box sx={{ mt: 3, border: '1px solid #d8e8ef', borderRadius: 2, px: 2.5, py: 2.25, backgroundColor: '#fbfeff' }}>
                <Typography variant="body2" sx={{ color: '#24404c', lineHeight: 1.7 }}>
                  Comparte este link con tu asistente para que complete su registro en LISA y pueda comenzar a agendar citas en tu consultorio.
                </Typography>
                <Box sx={{ mt: 2, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: { xs: 'stretch', md: 'center' }, gap: 1.5 }}>
                  <Typography sx={{ flex: 1, color: '#2f8df4', wordBreak: 'break-all' }}>{createdPreassistant.link}</Typography>
                  <Button variant="outlined" startIcon={<ContentCopy />} onClick={() => { void copyLink(createdPreassistant.link); }} sx={{ whiteSpace: 'nowrap' }}>
                    Copiar link
                  </Button>
                </Box>
              </Box>
            ) : null}
          </CardShell>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <CardShell title="Asistentes registrados">
            {loading ? (
              <Box sx={{ minHeight: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CircularProgress />
              </Box>
            ) : assistantData?.assistants.length ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {assistantData.assistants.map((assistant) => (
                  <Box key={assistant.assistant_id} sx={{ borderBottom: '1px solid #e2eef3', pb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, gap: 2, flexDirection: { xs: 'column', md: 'row' } }}>
                      <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#164a58' }}>{assistant.name || 'Asistente sin nombre'}</Typography>
                        <Typography variant="body2" color="text.secondary">{assistant.phone || 'Sin teléfono registrado'}</Typography>
                        <Typography variant="body2" sx={{ mt: 0.5, color: assistant.enabled ? '#1e8b2d' : '#7d8b92' }}>{assistant.enabled ? 'Recibe alertas activas' : 'Sin alertas activas'}</Typography>
                      </Box>
                      <Button variant="outlined" color="error" onClick={() => setAssistantToDelete(assistant)} sx={{ minWidth: 126 }}>Eliminar</Button>
                    </Box>
                  </Box>
                ))}
              </Box>
            ) : (
              <Alert severity="info">Este consultorio todavía no tiene asistentes registrados.</Alert>
            )}
          </CardShell>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <CardShell title="Asistentes pre-asignados">
            {loading ? (
              <Box sx={{ minHeight: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CircularProgress />
              </Box>
            ) : assistantData?.preassistants.length ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {assistantData.preassistants.map((item) => (
                  <Box key={item.id} sx={{ borderBottom: '1px solid #e2eef3', pb: 2 }}>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.8fr auto' }, gap: 2, alignItems: 'start' }}>
                      <Box>
                        <Typography variant="caption" color="text.secondary">Link activo</Typography>
                        <Typography sx={{ mt: 0.5, color: '#2f8df4', wordBreak: 'break-all' }}>{item.link}</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                          Vigente hasta {item.expires_at ? dayjs(item.expires_at).format('DD/MM/YYYY HH:mm') : 'las próximas 48 horas'}.
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', flexDirection: { xs: 'row', md: 'column' }, justifyContent: 'flex-start', alignItems: { xs: 'center', md: 'flex-end' }, gap: 1 }}>
                        <Button variant="outlined" startIcon={<ContentCopy />} onClick={() => { void copyLink(item.link); }}>
                          Copiar link
                        </Button>
                        <Button variant="text" color="error" onClick={() => setPreassistantIdToDelete(item.id)}>Eliminar</Button>
                      </Box>
                    </Box>
                  </Box>
                ))}
              </Box>
            ) : (
              <Alert severity="info">No hay asistentes pre-asignados para este consultorio.</Alert>
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
      <Dialog open={Boolean(preassistantIdToDelete)} onClose={() => setPreassistantIdToDelete(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Eliminar asistente pre-asignado</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">Si eliminas este pre-registro, el código de invitación dejará de estar disponible para el asistente.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreassistantIdToDelete(null)}>Cancelar</Button>
          <Button color="error" variant="contained" onClick={() => {
            if (!preassistantIdToDelete) return;
            void notificationService.removePreassistant(preassistantIdToDelete).then((data) => {
              setAssistantData(data);
              setCreatedPreassistant((current) => current && current.id === preassistantIdToDelete ? null : current);
              setSuccessMessage('Asistente pre-asignado eliminado correctamente.');
              setPreassistantIdToDelete(null);
            }).catch((err) => {
              setError(err instanceof Error ? err.message : 'No fue posible eliminar al asistente pre-asignado.');
            });
          }}>Eliminar</Button>
        </DialogActions>
      </Dialog>
      <Snackbar open={Boolean(successMessage)} autoHideDuration={6000} onClose={() => setSuccessMessage(null)} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert severity="success" variant="filled" onClose={() => setSuccessMessage(null)} sx={{ width: '100%' }}>{successMessage}</Alert>
      </Snackbar>
    </>
  );
}

function PrintPanel({
  offices,
  onSuccess,
}: {
  offices: Office[];
  onSuccess: (message: string) => void;
}) {
  const availableOffices = useMemo(() => offices, [offices]);
  const [selectedOfficeId, setSelectedOfficeId] = useState<number>(availableOffices[0]?.id ?? 0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<SettingsPrintData | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (availableOffices.length === 0) {
      setSelectedOfficeId(0);
      return;
    }

    setSelectedOfficeId((current) => current && availableOffices.some((office) => office.id === current) ? current : availableOffices[0].id);
  }, [availableOffices]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (!selectedOfficeId) {
        setData(null);
        return;
      }

      setLoading(true);
      setLocalError(null);

      try {
        const response = await settingsService.getPrintSettings(selectedOfficeId);
        if (mounted) {
          setData(response);
        }
      } catch (err) {
        if (mounted) {
          setLocalError(err instanceof Error ? err.message : 'No fue posible cargar la configuración de impresión.');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      mounted = false;
    };
  }, [selectedOfficeId]);

  if (availableOffices.length === 0) {
    return <PlaceholderPanel title="Impresión" description="Esta sección estará disponible cuando tengas al menos un consultorio asignado para configurar formatos de receta." />;
  }

  const persistField = (field: keyof SettingsPrintData, value: number | boolean) => {
    if (!data) return;

    const previousData = data;
    const nextData = { ...data, [field]: value };

    setData(nextData);
    setSaving(true);
    setLocalError(null);

    void settingsService.updatePrintSettings(nextData).then((updated) => {
      setData(updated);
      onSuccess('Configuración de impresión actualizada correctamente.');
    }).catch((err) => {
      const backendMessage =
        typeof err === 'object' &&
        err !== null &&
        'response' in err &&
        typeof (err as { response?: { data?: { message?: unknown } } }).response?.data?.message === 'string'
          ? ((err as { response?: { data?: { message?: string } } }).response?.data?.message ?? '')
          : '';

      const message = backendMessage || (err instanceof Error ? err.message : 'No fue posible actualizar la configuración de impresión.');
      setData(previousData);
      setLocalError(message);
    }).finally(() => {
      setSaving(false);
    });
  };

  return (
    <CardShell title="">
      <Grid container spacing={4}>
        <Grid size={{ xs: 12, md: 5 }}>
          <Typography variant="h6" sx={{ color: '#1e8b2d', fontWeight: 500, mb: 3 }}>
            Formato de impresión
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
            Selecciona el formato de receta que más se ajuste a tu procesador de textos y a la configuración de tu impresora.
          </Typography>
          <TextField
            select
            label="Consultorio"
            value={selectedOfficeId}
            fullWidth
            variant="standard"
            onChange={(event) => setSelectedOfficeId(Number(event.target.value))}
            sx={{ mb: 3.5 }}
          >
            {availableOffices.map((office) => (
              <MenuItem key={office.id} value={office.id}>{office.title}</MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Formato de impresión"
            value={data?.print_type ?? 0}
            fullWidth
            variant="standard"
            disabled={loading || saving || !data}
            onChange={(event) => persistField('print_type', Number(event.target.value))}
            sx={{ mb: 4 }}
          >
            <MenuItem value={0}>MEDIA CARTA</MenuItem>
            <MenuItem value={2}>A5</MenuItem>
            <MenuItem value={1}>TAMAÑO CARTA</MenuItem>
          </TextField>
          <Box
            sx={{
              p: 2,
              borderRadius: 2,
              border: '1px solid #d9e8ef',
              backgroundColor: '#f8fdff',
              color: '#5b7280',
              fontSize: 13,
              lineHeight: 1.8,
              mb: 4,
            }}
          >
            <div>MEDIA CARTA - Ideal si tienes recetas a media carta membretadas sueltas - 13.91 x 21.59 cm - 5.5 x 8.5 pulgadas</div>
            <div>TAMAÑO CARTA - Ideal si tu receta incluye más información y necesita abarcar una hoja completa - 21.59 x 27.94 cm - 8.5 x 11 pulgadas</div>
            <div>A5 - Alternativa al formato de impresión en media carta - 14.8 x 21 cm - 5.82 x 8.26 pulgadas</div>
          </Box>
          {localError ? <Alert severity="error" sx={{ mt: 3 }}>{localError}</Alert> : null}
        </Grid>
        <Grid size={{ xs: 12, md: 7 }}>
          <Typography variant="h6" sx={{ color: '#1e8b2d', fontWeight: 500, mb: 3 }}>
            Apartados a agregar en la receta
          </Typography>
          {loading || !data ? (
            <Box sx={{ minHeight: 240, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CircularProgress />
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.25 }}>
              {[
                ['prescriptionsex', 'Agregar género a la receta'],
                ['prescriptionbirthdate', 'Agregar fecha de nacimiento a la receta'],
                ['prescriptionsignosvitales', 'Agregar signos vitales a la receta'],
                ['prescriptionindicaciones', 'Agregar indicaciones adicionales a la receta'],
                ['prescriptiondiagnostico', 'Agregar diagnóstico a la receta'],
              ].map(([field, label]) => (
                <Box
                  key={field}
                  onClick={() => persistField(field as keyof SettingsPrintData, !Boolean(data[field as keyof SettingsPrintData]))}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    px: 1.5,
                    py: 1.25,
                    borderRadius: 1.75,
                    border: '1px solid #d8e8ef',
                    cursor: 'pointer',
                    backgroundColor: '#ffffff',
                    transition: 'background-color 0.18s ease, border-color 0.18s ease',
                    '&:hover': {
                      backgroundColor: '#f6fbfd',
                      borderColor: '#b7d7e4',
                    },
                  }}
                >
                  <Checkbox
                    checked={Boolean(data[field as keyof SettingsPrintData])}
                    onChange={(event) => persistField(field as keyof SettingsPrintData, event.target.checked)}
                    onClick={(event) => event.stopPropagation()}
                    disabled={saving}
                    sx={{ p: 0.5 }}
                  />
                  <Typography sx={{ color: '#183844', fontWeight: 500 }}>{label}</Typography>
                </Box>
              ))}
            </Box>
          )}
        </Grid>
      </Grid>
    </CardShell>
  );
}

function FormFieldGroupCard({
  title,
  fields,
  values,
  disabled,
  onToggle,
  children,
  collapsed = true,
  onCollapsedChange,
}: {
  title: string;
  fields: FormFieldDefinition[];
  values: Record<string, boolean>;
  disabled: boolean;
  onToggle: (key: string, checked: boolean) => void;
  children?: ReactNode;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}) {
  return (
    <Box sx={{ border: '1px solid #d8e8ef', borderRadius: 2, overflow: 'hidden', backgroundColor: '#fff' }}>
      <Box
        onClick={() => onCollapsedChange?.(!collapsed)}
        sx={{
          px: 2,
          py: 1.5,
          backgroundColor: '#f2fbff',
          borderBottom: collapsed ? 'none' : '1px solid #d8e8ef',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1.5,
          cursor: onCollapsedChange ? 'pointer' : 'default',
        }}
      >
        <Typography sx={{ color: '#1e8b2d', fontWeight: 600 }}>{title}</Typography>
        {onCollapsedChange ? (
          collapsed ? <ExpandMore sx={{ color: '#1e8b2d' }} /> : <ExpandLess sx={{ color: '#1e8b2d' }} />
        ) : null}
      </Box>
      {!collapsed ? (
        <>
          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            {fields.map((field, index) => (
              <Box
                key={field.key}
                onClick={() => !disabled && onToggle(field.key, !Boolean(values[field.key]))}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  px: 2,
                  py: 1.25,
                  cursor: disabled ? 'default' : 'pointer',
                  borderBottom: index === fields.length - 1 ? 'none' : '1px solid #edf4f7',
                  transition: 'background-color 0.18s ease',
                  '&:hover': disabled ? undefined : { backgroundColor: '#f8fcfe' },
                }}
              >
                <Checkbox
                  checked={Boolean(values[field.key])}
                  disabled={disabled}
                  onChange={(event) => onToggle(field.key, event.target.checked)}
                  onClick={(event) => event.stopPropagation()}
                  sx={{ p: 0.5 }}
                />
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                  <Typography sx={{ color: '#183844' }}>{field.label}</Typography>
                  {field.helperText ? (
                    <Typography sx={{ color: '#7b8794', fontSize: '0.8rem', lineHeight: 1.35 }}>
                      {field.helperText}
                    </Typography>
                  ) : null}
                </Box>
              </Box>
            ))}
          </Box>
          {children ? (
            <Box sx={{ borderTop: '1px solid #d8e8ef', backgroundColor: '#fcfeff', p: 2 }}>
              {children}
            </Box>
          ) : null}
        </>
      ) : null}
    </Box>
  );
}

function createCustomHistoryField(module: CustomHistoryModule, index: number): CustomHistoryFieldDefinition {
  return {
    key: `${module}_custom_${Date.now()}_${index + 1}`,
    label: '',
    input_type: 'text',
    enabled: true,
    required: false,
    sort_order: index + 1,
    options: [],
  };
}

function createConsultationReason(index: number): ConsultationReasonDefinition {
  return {
    key: `motivo_consulta_${Date.now()}_${index + 1}`,
    label: '',
    minutes: null,
  };
}

function ConsultationReasonRow({
  reason,
  disabled,
  onSave,
  onDelete,
}: {
  reason: ConsultationReasonDefinition;
  disabled: boolean;
  onSave: (reason: ConsultationReasonDefinition) => void;
  onDelete: () => void;
}) {
  const [label, setLabel] = useState(reason.label);
  const [minutes, setMinutes] = useState<number | ''>(reason.minutes ?? '');

  useEffect(() => {
    setLabel(reason.label);
    setMinutes(reason.minutes ?? '');
  }, [reason.key, reason.label, reason.minutes]);

  const trimmedLabel = label.trim();
  const hasChanges = trimmedLabel !== reason.label || (minutes === '' ? null : Number(minutes)) !== (reason.minutes ?? null);

  return (
    <Box sx={{ border: '1px solid #e2edf2', borderRadius: 2, p: 2 }}>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 7 }}>
          <TextField
            label="Motivo"
            value={label}
            fullWidth
            variant="standard"
            disabled={disabled}
            onChange={(event) => setLabel(event.target.value)}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <TextField
            select
            label="Minutos"
            value={minutes}
            fullWidth
            variant="standard"
            disabled={disabled}
            onChange={(event) => setMinutes(event.target.value === '' ? '' : Number(event.target.value))}
          >
            {CONSULTATION_REASON_MINUTE_OPTIONS.map((option) => (
              <MenuItem key={`agenda_reason_minutes_${reason.key}_${String(option.value)}`} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid size={{ xs: 12, md: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: { xs: 'flex-start', md: 'flex-end' }, alignItems: 'center', height: '100%' }}>
            <Button
              variant="contained"
              disabled={disabled || !trimmedLabel || !hasChanges}
              onClick={() => {
                onSave({
                  ...reason,
                  label: trimmedLabel,
                  minutes: minutes === '' ? null : Number(minutes),
                });
              }}
            >
              Guardar
            </Button>
          </Box>
        </Grid>
        <Grid size={{ xs: 12 }}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', mt: 0.5 }}>
            <Button
              color="error"
              disabled={disabled}
              onClick={onDelete}
            >
              Eliminar
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}

function normalizeCatalogName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function normalizeCustomFieldLabelToKey(module: CustomHistoryModule, label: string, fallbackKey: string): string {
  const normalized = label
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);

  return normalized ? `${module}_${normalized}` : fallbackKey;
}

export default function SettingsPage() {
  const { updateUser, can, user } = useAuth();
  const location = useLocation();
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
  const isAssistant = user?.role === 'asistente';
  const availableTabs = useMemo(() => {
    if (!isAssistant) {
      return SETTINGS_TABS;
    }

    return SETTINGS_TABS.filter((tab) => {
      switch (tab.value) {
        case 'perfil':
          return can('settings.profile.self');
        case 'empresa':
          return can('settings.company');
        case 'agenda':
          return can('settings.agenda');
        case 'dias_inhabiles':
          return can('settings.unavailable_days');
        case 'impresion':
          return can('settings.print');
        case 'asistentes':
          return false;
        case 'herramientas':
          return can('settings.forms');
        case 'reportes':
          return can('settings.reports');
        case 'etiquetas':
          return can('settings.labels');
        default:
          return false;
      }
    });
  }, [can, isAssistant]);

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

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    const requestedTab = availableTabs.find((tab) => tab.value === tabParam);
    if (requestedTab) {
      setActiveTab(requestedTab.value);
    }
  }, [availableTabs, location.search]);

  useEffect(() => {
    if (!availableTabs.some((tab) => tab.value === activeTab)) {
      setActiveTab(availableTabs[0]?.value ?? 'perfil');
    }
  }, [activeTab, availableTabs]);

  const currentPanel = useMemo(() => {
    switch (activeTab) {
      case 'perfil':
        return (
          <ProfilePanel
            profile={profile}
            saving={profileSaving}
            passwordSaving={passwordSaving}
            showSpecialtyFields={!isAssistant}
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
            onSuccess={(message) => setSuccessMessage(message)}
            shouldScrollToConsultationReasons={activeTab === 'agenda' && location.hash === '#agenda-consultation-reasons'}
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
        return (
          <PrintPanel
            offices={offices}
            onSuccess={(message) => setSuccessMessage(message)}
          />
        );
      case 'asistentes':
        return <AssistantsPanel offices={offices} />;
      case 'reportes':
        return (
          <ReportsPanel
            offices={offices}
            onSuccess={(message) => setSuccessMessage(message)}
          />
        );
      case 'etiquetas':
        return (
          <LabelsPanel
            offices={offices}
            onSuccess={(message) => setSuccessMessage(message)}
          />
        );
      case 'herramientas':
        return <PlaceholderPanel title="Herramientas" description="Aquí podremos agrupar herramientas complementarias y configuraciones avanzadas del sistema." />;
      default:
        return null;
    }
  }, [activeTab, agendaSaving, can, companySaving, isAssistant, offices, passwordSaving, profile, profileSaving, updateUser]);

  const resolvedPanel = activeTab === 'herramientas'
    ? (
      <FormSettingsPanel
        offices={offices}
        onSuccess={(message) => setSuccessMessage(message)}
      />
    )
    : activeTab === 'reportes'
      ? (
        <ReportsPanel
          offices={offices}
          onSuccess={(message) => setSuccessMessage(message)}
        />
      )
      : activeTab === 'etiquetas'
        ? (
          <LabelsPanel
            offices={offices}
            onSuccess={(message) => setSuccessMessage(message)}
          />
        )
      : currentPanel;

  return (
    <Box sx={{ minHeight: 'calc(100vh - 112px)', borderRadius: 3, background: 'linear-gradient(180deg, #dff7ff 0%, #d4f3ff 100%)', border: '1px solid #caecf6', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.6)', p: { xs: 1.5, md: 2 } }}>
      <Box sx={{ borderRadius: 2, background: 'linear-gradient(90deg, #28bfd6 0%, #14abc7 100%)', boxShadow: '0 10px 22px rgba(15, 142, 164, 0.22)', px: { xs: 1, md: 2 }, pt: 1.5 }}>
        <Tabs
          value={activeTab}
          onChange={(_, value: SettingsTab) => setActiveTab(value)}
          variant="scrollable"
          scrollButtons="auto"
          TabIndicatorProps={{ sx: { display: 'none' } }}
          sx={{
            minHeight: 56,
            '& .MuiTabs-flexContainer': { gap: 0.5 },
            '& .MuiTabScrollButton-root': {
              width: 42,
              minWidth: 42,
              height: 44,
              alignSelf: 'center',
              color: '#ffffff',
              opacity: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
            },
            '& .MuiTabScrollButton-root svg': {
              fontSize: 28,
              display: 'block',
            },
            '& .MuiTabScrollButton-root.Mui-disabled': {
              opacity: 0.4,
              color: 'rgba(255,255,255,0.75)',
            },
          }}
        >
          {availableTabs.map((tab) => (
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
      ) : resolvedPanel}
      <Snackbar open={Boolean(successMessage)} autoHideDuration={6000} onClose={() => setSuccessMessage(null)} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert severity="success" variant="filled" onClose={() => setSuccessMessage(null)} sx={{ width: '100%' }}>{successMessage}</Alert>
      </Snackbar>
    </Box>
  );
}





