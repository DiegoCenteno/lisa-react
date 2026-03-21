import { useState, useEffect, useCallback, useMemo, useDeferredValue, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  CircularProgress,
  Checkbox,
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
} from '@mui/material';
import {
  ContentCopy as CopyIcon,
  Close as CloseIcon,
  ArrowBack as BackIcon,
} from '@mui/icons-material';
import type { AvailableSlot, PatientSimple, NewPatientData, PatientSearchResult } from '../../types';
import { appointmentService } from '../../api/appointmentService';
import dayjs from 'dayjs';
import 'dayjs/locale/es';

dayjs.locale('es');

// Color constants
const ROW_LIGHT = '#e0f7fa';
const TEAL = '#00897B';
const MAGENTA = '#e91e63';

function formatDateEs(dateStr: string): string {
  const d = dayjs(dateStr);
  const day = d.format('dddd');
  const capitalDay = day.charAt(0).toUpperCase() + day.slice(1);
  const monthRaw = d.format('MMMM');
  const capitalMonth = monthRaw.charAt(0).toUpperCase() + monthRaw.slice(1);
  return `${capitalDay}, ${d.format('D')} ${capitalMonth} ${d.format('YYYY')}`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

interface Props {
  open: boolean;
  onClose: () => void;
  officeId: number;
  onAppointmentCreated: () => void;
}

type WizardStep = 'dates' | 'patient' | 'summary';
type ManualStep = 'month' | 'day' | 'hour' | 'minute' | 'ampm' | 'duration_hour' | 'duration_minute';

export default function NewAppointmentDialog({
  open,
  onClose,
  officeId,
  onAppointmentCreated,
}: Props) {
  // ── Wizard state ──
  const [step, setStep] = useState<WizardStep>('dates');

  // ── Step 1: dates + slots ──
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [availableTxt, setAvailableTxt] = useState('');
  const [datesLoading, setDatesLoading] = useState(false);
  const [showAllDates, setShowAllDates] = useState(false);
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);

  // ── Step 2: patient ──
  const [patients, setPatients] = useState<PatientSimple[]>([]);
  const [patientsLoading, setPatientsLoading] = useState(false);
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<PatientSimple | null>(null);
  const [showNewPatientForm, setShowNewPatientForm] = useState(false);
  const [newPatient, setNewPatient] = useState<NewPatientData>({
    phone_code: '+52',
    phone: '',
    name: '',
    last_name: '',
    gender: '',
    birth_date: '',
  });
  const [newPatientErrors, setNewPatientErrors] = useState<Record<string, string>>({});

  // Patient duplicate detection
  const [duplicatePatients, setDuplicatePatients] = useState<PatientSearchResult[]>([]);
  const [duplicateSource, setDuplicateSource] = useState<'phone' | 'name' | null>(null);
  const [selectedExistingPatient, setSelectedExistingPatient] = useState<PatientSearchResult | null>(null);
  const phoneSearchRef = useRef<string>('');
  const nameSearchRef = useRef<string>('');

  // Manual appointment mode (list-based)
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualStep, setManualStep] = useState<ManualStep>('month');
  const [showAllMonths, setShowAllMonths] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<{ year: number; month: number } | null>(null);
  const [selectedDay, setSelectedDay] = useState<dayjs.Dayjs | null>(null);
  const [selectedHour, setSelectedHour] = useState<number | null>(null);
  const [selectedMinute, setSelectedMinute] = useState<number | null>(null);
  const [selectedAmPm, setSelectedAmPm] = useState<'AM' | 'PM' | null>(null);
  const [manualDurationHours, setManualDurationHours] = useState<number | null>(null);
  const [manualDurationMinutes, setManualDurationMinutes] = useState<number | null>(null);

  // ── Step 3: summary ──
  const [reason, setReason] = useState('');
  const [notifyPatient, setNotifyPatient] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  // ── Reset on open ──
  useEffect(() => {
    if (open) {
      setStep('dates');
      setAvailableDates([]);
      setAvailableTxt('');
      setShowAllDates(false);
      setExpandedDate(null);
      setSlots([]);
      setSelectedSlot(null);
      setPatients([]);
      setPatientSearch('');
      setSelectedPatient(null);
      setShowNewPatientForm(false);
      setNewPatient({
        phone_code: '+52',
        phone: '',
        name: '',
        last_name: '',
        gender: '',
        birth_date: '',
      });
      setNewPatientErrors({});
      setDuplicatePatients([]);
      setDuplicateSource(null);
      setSelectedExistingPatient(null);
      setShowManualForm(false);
      setManualStep('month');
      setShowAllMonths(false);
      setSelectedMonth(null);
      setSelectedDay(null);
      setSelectedHour(null);
      setSelectedMinute(null);
      setSelectedAmPm(null);
      setManualDurationHours(null);
      setManualDurationMinutes(null);
      setReason('');
      setNotifyPatient(true);
      setSaving(false);
      setSaveError('');
      loadAvailableDates();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Phone duplicate detection: search when 10 digits
  useEffect(() => {
    if (!showNewPatientForm || selectedExistingPatient) return;
    const phone = newPatient.phone;
    if (phone.length === 10 && phone !== phoneSearchRef.current) {
      phoneSearchRef.current = phone;
      appointmentService.searchPatientsByPhone(phone).then((results) => {
        if (results.length > 0) {
          setDuplicatePatients(results);
          setDuplicateSource('phone');
        }
      }).catch(() => { /* ignore */ });
    } else if (phone.length < 10 && duplicateSource === 'phone') {
      setDuplicatePatients([]);
      setDuplicateSource(null);
      phoneSearchRef.current = '';
    }
  }, [newPatient.phone, showNewPatientForm, selectedExistingPatient, duplicateSource]);

  // Name duplicate detection: search when both name and last_name have content
  useEffect(() => {
    if (!showNewPatientForm || selectedExistingPatient) return;
    const name = newPatient.name.trim();
    const lastName = newPatient.last_name.trim();
    if (name && lastName) {
      const searchKey = name + '|' + lastName;
      if (searchKey !== nameSearchRef.current) {
        nameSearchRef.current = searchKey;
        appointmentService.searchPatientsByName(lastName).then((results) => {
          if (results.length > 0 && duplicateSource !== 'phone') {
            setDuplicatePatients(results);
            setDuplicateSource('name');
          }
        }).catch(() => { /* ignore */ });
      }
    } else if (duplicateSource === 'name') {
      setDuplicatePatients([]);
      setDuplicateSource(null);
      nameSearchRef.current = '';
    }
  }, [newPatient.name, newPatient.last_name, showNewPatientForm, selectedExistingPatient, duplicateSource]);

  // Load available dates
  const loadAvailableDates = useCallback(async () => {
    if (!officeId) return;
    setDatesLoading(true);
    try {
      const res = await appointmentService.getAvailableDates(officeId, 50);
      setAvailableDates(res.dates);
      setAvailableTxt(res.txt);
    } catch (err) {
      console.error('Error loading available dates:', err);
    } finally {
      setDatesLoading(false);
    }
  }, [officeId]);

  // Load slots for a date (filter out break/descanso slots with estatus === 2)
  const loadSlots = useCallback(
    async (date: string) => {
      if (!officeId) return;
      setSlotsLoading(true);
      try {
        const data = await appointmentService.getAvailableSlots(officeId, date, 50);
        setSlots(data.filter((s) => !s.is_past && s.estatus !== 2));
      } catch (err) {
        console.error('Error loading slots:', err);
      } finally {
        setSlotsLoading(false);
      }
    },
    [officeId]
  );

  // ── Load patients ──
  const loadPatients = useCallback(async () => {
    if (!officeId) return;
    setPatientsLoading(true);
    try {
      const data = await appointmentService.getPatients(officeId);
      setPatients(data);
    } catch (err) {
      console.error('Error loading patients:', err);
    } finally {
      setPatientsLoading(false);
    }
  }, [officeId]);

  // ── Handle date click → expand/collapse slots ──
  const handleDateClick = (date: string) => {
    if (expandedDate === date) {
      setExpandedDate(null);
      setSlots([]);
    } else {
      setExpandedDate(date);
      loadSlots(date);
    }
  };

  // ── Handle slot selection → go to patient step ──
  const handleSlotSelect = (slot: AvailableSlot) => {
    if (slot.estatus === 0) return; // occupied
    setSelectedSlot(slot);
    setStep('patient');
    loadPatients();
  };

  // ── Handle patient selection → go to summary step ──
  const handlePatientSelect = (patient: PatientSimple) => {
    setSelectedPatient(patient);
    setShowNewPatientForm(false);
    setStep('summary');
  };

  // ── Validate new patient form ──
  const validateNewPatient = (): boolean => {
    const errors: Record<string, string> = {};
    if (newPatient.phone && !/^\d{10}$/.test(newPatient.phone)) {
      errors.phone = 'El celular debe tener 10 dígitos numéricos';
    }
    if (!newPatient.name.trim()) {
      errors.name = 'El nombre es requerido';
    }
    if (newPatient.name.length > 80) {
      errors.name = 'Máximo 80 caracteres';
    }
    if (!newPatient.last_name.trim()) {
      errors.last_name = 'Los apellidos son requeridos';
    }
    if (newPatient.last_name.length > 80) {
      errors.last_name = 'Máximo 80 caracteres';
    }
    setNewPatientErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNewPatientConfirm = () => {
    if (selectedExistingPatient) {
      setSelectedPatient({
        id: selectedExistingPatient.id,
        full_name: selectedExistingPatient.full_name,
        phone: selectedExistingPatient.phone,
        phone_code: selectedExistingPatient.phone_code ?? '',
        full_phone: selectedExistingPatient.full_phone,
        name: selectedExistingPatient.name,
        last_name: selectedExistingPatient.last_name,
      });
      setStep('summary');
    } else if (validateNewPatient()) {
      setSelectedPatient(null);
      setStep('summary');
    }
  };

  const handleSelectExistingPatient = (patient: PatientSearchResult) => {
    setSelectedExistingPatient(patient);
    setNewPatient({ ...newPatient, phone: patient.phone, name: patient.name, last_name: patient.last_name });
  };

  // ── Copy available dates text ──
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(availableTxt);
    } catch {
      // Fallback: create a textarea and copy
      const textarea = document.createElement('textarea');
      textarea.value = availableTxt;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
  };

  // ── Save appointment ──
  const handleSave = async () => {
    if (!selectedSlot) return;
    setSaving(true);
    setSaveError('');
    try {
      if (selectedPatient) {
        await appointmentService.createAppointment({
          office_id: officeId,
          patient_id: selectedPatient.id,
          datestart: selectedSlot.datestart,
          dateend: selectedSlot.dateend,
          reason: reason || undefined,
        });
      } else {
        await appointmentService.createAppointmentWithNewPatient({
          office_id: officeId,
          datestart: selectedSlot.datestart,
          dateend: selectedSlot.dateend,
          reason: reason || undefined,
          name: newPatient.name,
          last_name: newPatient.last_name,
          phone: newPatient.phone,
          phone_code: newPatient.phone_code,
          gender: newPatient.gender || undefined,
          birth_date: newPatient.birth_date || undefined,
        });
      }
      onAppointmentCreated();
      onClose();
    } catch (err) {
      console.error('Error saving appointment:', err);
      setSaveError('Error al guardar la cita. Intente de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  // ── Filtered patients (client-side search with deferred value for instant typing) ──
  const deferredSearch = useDeferredValue(patientSearch);
  const filteredPatients = useMemo(() => {
    if (!deferredSearch.trim()) return patients.slice(0, 5);
    const q = deferredSearch.toLowerCase();
    return patients.filter(
      (p) =>
        (p.full_name ?? '').toLowerCase().includes(q) ||
        (p.phone ?? '').includes(q) ||
        (p.full_phone ?? '').includes(q)
    );
  }, [patients, deferredSearch]);

  // ── Dates to display ──
  const datesToShow = showAllDates ? availableDates : availableDates.slice(0, 6);

  const handleBack = () => {
    if (step === 'dates' && showManualForm) {
      if (manualStep === 'month') {
        setShowManualForm(false);
      } else if (manualStep === 'day') {
        setManualStep('month');
        setSelectedMonth(null);
      } else if (manualStep === 'hour') {
        setManualStep('day');
        setSelectedDay(null);
      } else if (manualStep === 'minute') {
        setManualStep('hour');
        setSelectedHour(null);
      } else if (manualStep === 'ampm') {
        setManualStep('minute');
        setSelectedMinute(null);
      } else if (manualStep === 'duration_hour') {
        setManualStep('ampm');
        setSelectedAmPm(null);
      } else if (manualStep === 'duration_minute') {
        setManualStep('duration_hour');
        setManualDurationHours(null);
      }
    } else if (step === 'patient') {
      setStep('dates');
      setSelectedSlot(null);
    } else if (step === 'summary') {
      setStep('patient');
    }
  };

  const handleManualContinueAfterDuration = useCallback((durH: number, durM: number) => {
    if (selectedDay === null || selectedHour === null || selectedMinute === null || selectedAmPm === null) return;
    let hour24 = selectedHour;
    if (selectedAmPm === 'PM' && hour24 !== 12) hour24 += 12;
    if (selectedAmPm === 'AM' && hour24 === 12) hour24 = 0;
    const start = selectedDay.hour(hour24).minute(selectedMinute).second(0);
    const totalDurationMinutes = durH * 60 + durM;
    const end = start.add(totalDurationMinutes, 'minute');
    setSelectedSlot({
      datestart: start.format('YYYY-MM-DD HH:mm:ss'),
      dateend: end.format('YYYY-MM-DD HH:mm:ss'),
      timeshow: start.format('hh:mm a'),
      estatus: 1,
      minutes: totalDurationMinutes,
      dateesp: '',
      is_past: false,
      is_past_4hours: false,
    });
    setStep('patient');
    loadPatients();
  }, [selectedDay, selectedHour, selectedMinute, selectedAmPm, loadPatients]);

  // Generate months list (3 years from today)
  const monthsList = useMemo(() => {
    const today = dayjs();
    const maxDate = today.add(3, 'year');
    const months: { year: number; month: number; label: string }[] = [];
    let current = today.startOf('month');
    while (current.isBefore(maxDate)) {
      const monthName = capitalize(current.format('MMMM'));
      months.push({ year: current.year(), month: current.month(), label: monthName + ' ' + current.year() });
      current = current.add(1, 'month');
    }
    return months;
  }, []);

  // Generate days list for selected month
  const daysList = useMemo(() => {
    if (!selectedMonth) return [];
    const today = dayjs();
    const start = dayjs().year(selectedMonth.year).month(selectedMonth.month).startOf('month');
    const end = start.endOf('month');
    const days: { date: dayjs.Dayjs; label: string }[] = [];
    let current = start;
    while (current.isBefore(end) || current.isSame(end, 'day')) {
      if (current.isSame(today, 'day') || current.isAfter(today, 'day')) {
        const dayName = capitalize(current.format('dddd'));
        const monthName = capitalize(current.format('MMMM'));
        days.push({ date: current, label: dayName + ', ' + current.format('D') + ' ' + monthName + ' ' + current.format('YYYY') });
      }
      current = current.add(1, 'day');
    }
    return days;
  }, [selectedMonth]);

  // Build manual selection summary for header display
  const manualSummaryParts = useMemo(() => {
    const parts: string[] = [];
    if (selectedMonth) {
      const found = monthsList.find((m) => m.year === selectedMonth.year && m.month === selectedMonth.month);
      if (found) parts.push(found.label);
    }
    if (selectedDay) {
      const dayName = capitalize(selectedDay.format('dddd'));
      parts.push(dayName + ' ' + selectedDay.format('D'));
    }
    if (selectedHour !== null) {
      parts.push(selectedHour + ':00');
    }
    if (selectedMinute !== null && selectedHour !== null) {
      parts[parts.length - 1] = selectedHour + ':' + String(selectedMinute).padStart(2, '0');
    }
    if (selectedAmPm) {
      parts[parts.length - 1] = parts[parts.length - 1] + ' ' + selectedAmPm;
    }
    if (manualDurationHours !== null) {
      const durMin = manualDurationMinutes ?? 0;
      parts.push('Duraci\u00f3n: ' + manualDurationHours + 'h ' + String(durMin).padStart(2, '0') + 'm');
    }
    return parts;
  }, [selectedMonth, selectedDay, selectedHour, selectedMinute, selectedAmPm, manualDurationHours, manualDurationMinutes, monthsList]);

  // RENDER: Manual date/time/duration form (list-based)
  const renderManualForm = () => {
    const rowSx = {
      py: 1.5, px: 2, textAlign: 'center' as const, cursor: 'pointer',
      backgroundColor: ROW_LIGHT, borderBottom: '1px solid #cfd8dc',
      color: TEAL, fontSize: '0.95rem',
      '&:hover': { backgroundColor: '#b2ebf2' },
    };

    // Header with selected values
    const header = manualSummaryParts.length > 0 ? (
      <Typography sx={{ textAlign: 'center', fontSize: '0.8rem', color: TEAL, fontWeight: 600, mb: 1, pb: 1, borderBottom: '1px solid #eee' }}>
        {manualSummaryParts.join(' - ')}
      </Typography>
    ) : null;

    if (manualStep === 'month') {
      const items = showAllMonths ? monthsList : monthsList.slice(0, 5);
      return (
        <Box>
          {header}
          <Typography sx={{ textAlign: 'center', fontWeight: 600, mb: 1, fontSize: '0.9rem' }}>Selecciona el mes</Typography>
          {items.map((m, i) => (
            <Box key={i} sx={rowSx} onClick={() => { setSelectedMonth({ year: m.year, month: m.month }); setManualStep('day'); }}>
              {m.label}
            </Box>
          ))}
          {!showAllMonths && monthsList.length > 5 && (
            <Box sx={{ textAlign: 'center', py: 1.5 }}>
              <Typography component="span" onClick={() => setShowAllMonths(true)} sx={{ cursor: 'pointer', color: '#333', textDecoration: 'underline', fontSize: '0.9rem', '&:hover': { color: TEAL } }}>
                Mostrar m\u00e1s
              </Typography>
            </Box>
          )}
        </Box>
      );
    }

    if (manualStep === 'day') {
      return (
        <Box>
          {header}
          <Typography sx={{ textAlign: 'center', fontWeight: 600, mb: 1, fontSize: '0.9rem' }}>Selecciona el d\u00eda</Typography>
          {daysList.length === 0 ? (
            <Typography sx={{ textAlign: 'center', py: 3, color: '#999' }}>No hay d\u00edas disponibles en este mes</Typography>
          ) : (
            daysList.map((d, i) => (
              <Box key={i} sx={rowSx} onClick={() => { setSelectedDay(d.date); setManualStep('hour'); }}>
                {d.label}
              </Box>
            ))
          )}
        </Box>
      );
    }

    if (manualStep === 'hour') {
      return (
        <Box>
          {header}
          <Typography sx={{ textAlign: 'center', fontWeight: 600, mb: 1, fontSize: '0.9rem' }}>Selecciona la hora</Typography>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
            <Box key={h} sx={rowSx} onClick={() => { setSelectedHour(h); setManualStep('minute'); }}>
              {h}
            </Box>
          ))}
        </Box>
      );
    }

    if (manualStep === 'minute') {
      const minutes = Array.from({ length: 12 }, (_, i) => i * 5);
      return (
        <Box>
          {header}
          <Typography sx={{ textAlign: 'center', fontWeight: 600, mb: 1, fontSize: '0.9rem' }}>Selecciona los minutos</Typography>
          {minutes.map((m) => (
            <Box key={m} sx={rowSx} onClick={() => { setSelectedMinute(m); setManualStep('ampm'); }}>
              {selectedHour}:{String(m).padStart(2, '0')}
            </Box>
          ))}
        </Box>
      );
    }

    if (manualStep === 'ampm') {
      return (
        <Box>
          {header}
          <Typography sx={{ textAlign: 'center', fontWeight: 600, mb: 1, fontSize: '0.9rem' }}>Selecciona AM o PM</Typography>
          <Box sx={rowSx} onClick={() => { setSelectedAmPm('AM'); setManualStep('duration_hour'); }}>AM</Box>
          <Box sx={rowSx} onClick={() => { setSelectedAmPm('PM'); setManualStep('duration_hour'); }}>PM</Box>
        </Box>
      );
    }

    if (manualStep === 'duration_hour') {
      return (
        <Box>
          {header}
          <Typography sx={{ textAlign: 'center', fontWeight: 600, mb: 1, fontSize: '0.9rem' }}>Duraci\u00f3n: horas</Typography>
          {Array.from({ length: 7 }, (_, i) => i).map((h) => (
            <Box key={h} sx={rowSx} onClick={() => { setManualDurationHours(h); setManualStep('duration_minute'); }}>
              {h} {h === 1 ? 'hora' : 'horas'}
            </Box>
          ))}
        </Box>
      );
    }

    if (manualStep === 'duration_minute') {
      const durMinutes = Array.from({ length: 12 }, (_, i) => i * 5);
      const filteredMinutes = manualDurationHours === 6 ? [0] : durMinutes;
      return (
        <Box>
          {header}
          <Typography sx={{ textAlign: 'center', fontWeight: 600, mb: 1, fontSize: '0.9rem' }}>Duraci\u00f3n: minutos</Typography>
          {filteredMinutes.map((m) => (
            <Box key={m} sx={rowSx} onClick={() => {
              setManualDurationMinutes(m);
              handleManualContinueAfterDuration(manualDurationHours ?? 0, m);
            }}>
              {manualDurationHours}h {String(m).padStart(2, '0')}m
            </Box>
          ))}
        </Box>
      );
    }

    return null;
  };

  // ═══════════════════════════════════════════════
  //  RENDER: Step 1 – Available Dates + Slots
  // ═══════════════════════════════════════════════
  const renderDatesStep = () => showManualForm ? renderManualForm() : (
    <Box>
      {/* Copy button */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button
          variant="outlined"
          size="small"
          startIcon={<CopyIcon />}
          onClick={handleCopy}
          sx={{
            borderColor: TEAL,
            color: TEAL,
            textTransform: 'uppercase',
            fontWeight: 600,
            fontSize: '0.75rem',
            '&:hover': { borderColor: TEAL, backgroundColor: 'rgba(0,137,123,0.04)' },
          }}
        >
          Copiar
        </Button>
      </Box>

      {datesLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={32} />
        </Box>
      ) : availableDates.length === 0 ? (
        <Typography sx={{ textAlign: 'center', py: 4, color: '#999' }}>
          No hay fechas disponibles
        </Typography>
      ) : (
        <Box>
          {datesToShow.map((date) => {
            const isExpanded = expandedDate === date;
            return (
              <Box key={date}>
                {/* Date row */}
                <Box
                  onClick={() => handleDateClick(date)}
                  sx={{
                    py: 1.5,
                    px: 2,
                    textAlign: 'center',
                    cursor: 'pointer',
                    backgroundColor: ROW_LIGHT,
                    borderBottom: '1px solid #cfd8dc',
                    fontWeight: isExpanded ? 600 : 400,
                    color: '#00897B',
                    fontSize: '0.95rem',
                    '&:hover': {
                      backgroundColor: '#b2ebf2',
                    },
                  }}
                >
                  {formatDateEs(date)}
                </Box>

                {/* Expanded slots */}
                {isExpanded && (
                  <Box>
                    {slotsLoading ? (
                      <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                        <CircularProgress size={24} />
                      </Box>
                    ) : (
                      slots.map((slot, sIdx) => {
                        const isOccupied = slot.estatus === 0;
                        const bgColor = isOccupied ? '#f5f5f5' : '#f0fff0';
                        const label = isOccupied ? 'no disponible' : 'disponible';
                        return (
                          <Box
                            key={sIdx}
                            onClick={() => !isOccupied && handleSlotSelect(slot)}
                            sx={{
                              py: 1,
                              px: 3,
                              textAlign: 'center',
                              cursor: isOccupied ? 'default' : 'pointer',
                              backgroundColor: bgColor,
                              borderLeft: `4px solid ${bgColor}`,
                              borderBottom: '1px solid #cfd8dc',
                              fontSize: '0.9rem',
                              color: isOccupied ? '#999' : '#333',
                              '&:hover': isOccupied
                                ? {}
                                : { filter: 'brightness(0.95)' },
                            }}
                          >
                            <span style={{ fontWeight: isOccupied ? 400 : 600 }}>
                              {slot.timeshow}
                            </span>
                            {' - '}
                            <span>{label}</span>
                            {!isOccupied && (
                              <span style={{ color: '#999', marginLeft: 8, fontSize: '0.8rem' }}>
                                {slot.minutes} min.
                              </span>
                            )}
                          </Box>
                        );
                      })
                    )}
                  </Box>
                )}
              </Box>
            );
          })}

          {/* Show more link */}
          {!showAllDates && availableDates.length > 6 && (
            <Box
              sx={{ textAlign: 'center', py: 1.5 }}
            >
              <Typography
                component="span"
                onClick={() => setShowAllDates(true)}
                sx={{
                  cursor: 'pointer',
                  color: '#333',
                  textDecoration: 'underline',
                  fontSize: '0.9rem',
                  '&:hover': { color: TEAL },
                }}
              >
                Mostrar más
              </Typography>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );

  // ═══════════════════════════════════════════════
  //  RENDER: Step 2 – Patient Selection
  // ═══════════════════════════════════════════════
  const renderPatientStep = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {showNewPatientForm ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
            {selectedExistingPatient ? 'Paciente existente seleccionado' : 'Nuevo paciente'}
          </Typography>

          {/* Duplicate patient warning */}
          {duplicatePatients.length > 0 && !selectedExistingPatient && (
            <Alert severity="warning" sx={{ fontSize: '0.85rem' }}>
              {duplicateSource === 'phone'
                ? 'Se encontraron pacientes con este número de teléfono:'
                : 'Se encontraron pacientes con nombre similar:'}
              {duplicatePatients.map((dp) => (
                <Box
                  key={dp.id}
                  onClick={() => handleSelectExistingPatient(dp)}
                  sx={{
                    mt: 0.5, py: 0.5, px: 1, cursor: 'pointer',
                    backgroundColor: ROW_LIGHT, borderRadius: 1,
                    '&:hover': { backgroundColor: '#b2ebf2' },
                  }}
                >
                  <Typography sx={{ fontSize: '0.85rem', fontWeight: 500 }}>
                    {dp.full_name} - {dp.full_phone}
                  </Typography>
                </Box>
              ))}
            </Alert>
          )}

          {selectedExistingPatient && (
            <Alert severity="info" sx={{ fontSize: '0.85rem' }}>
              Paciente seleccionado: {selectedExistingPatient.full_name}
              <Button size="small" onClick={() => {
                setSelectedExistingPatient(null);
                setDuplicatePatients([]);
                setDuplicateSource(null);
                phoneSearchRef.current = '';
                nameSearchRef.current = '';
              }} sx={{ ml: 1 }}>
                Cambiar
              </Button>
            </Alert>
          )}

          <Box sx={{ display: 'flex', gap: 2 }}>
            <FormControl sx={{ minWidth: 160 }} size="small" disabled={!!selectedExistingPatient}>
              <InputLabel>Código de país</InputLabel>
              <Select
                value={newPatient.phone_code}
                label="Código de país"
                onChange={(e) =>
                  setNewPatient({ ...newPatient, phone_code: e.target.value })
                }
              >
                <MenuItem value="+52">México (+52)</MenuItem>
                <MenuItem value="+1">Estados Unidos (+1)</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Celular"
              size="small"
              fullWidth
              value={newPatient.phone}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                setNewPatient({ ...newPatient, phone: val });
              }}
              error={!!newPatientErrors.phone}
              helperText={newPatientErrors.phone}
              inputProps={{ maxLength: 10, inputMode: 'numeric' }}
              disabled={!!selectedExistingPatient}
            />
          </Box>

          <TextField
            label="Nombre"
            size="small"
            fullWidth
            value={newPatient.name}
            onChange={(e) =>
              setNewPatient({ ...newPatient, name: e.target.value.slice(0, 80) })
            }
            error={!!newPatientErrors.name}
            helperText={newPatientErrors.name}
            inputProps={{ maxLength: 80 }}
            disabled={!!selectedExistingPatient}
          />

          <TextField
            label="Apellidos"
            size="small"
            fullWidth
            value={newPatient.last_name}
            onChange={(e) =>
              setNewPatient({ ...newPatient, last_name: e.target.value.slice(0, 80) })
            }
            error={!!newPatientErrors.last_name}
            helperText={newPatientErrors.last_name}
            inputProps={{ maxLength: 80 }}
            disabled={!!selectedExistingPatient}
          />

          <FormControl size="small" fullWidth disabled={!!selectedExistingPatient}>
            <InputLabel>Género</InputLabel>
            <Select
              value={newPatient.gender}
              label="Género"
              onChange={(e) =>
                setNewPatient({
                  ...newPatient,
                  gender: e.target.value as 'M' | 'F' | '',
                })
              }
            >
              <MenuItem value="">Ninguno</MenuItem>
              <MenuItem value="M">Masculino</MenuItem>
              <MenuItem value="F">Femenino</MenuItem>
            </Select>
          </FormControl>

          <TextField
            label="Fecha de nacimiento"
            type="date"
            size="small"
            fullWidth
            value={newPatient.birth_date}
            onChange={(e) =>
              setNewPatient({ ...newPatient, birth_date: e.target.value })
            }
            error={!!newPatientErrors.birth_date}
            helperText={newPatientErrors.birth_date}
            slotProps={{ inputLabel: { shrink: true } }}
            disabled={!!selectedExistingPatient}
          />
        </Box>
      ) : (
        // ── Patient List ──
        <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <TextField
            placeholder="Buscar paciente por nombre o teléfono..."
            size="small"
            fullWidth
            value={patientSearch}
            onChange={(e) => setPatientSearch(e.target.value)}
            sx={{ mb: 2, flexShrink: 0 }}
          />

          <Box sx={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
            {patientsLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress size={32} />
              </Box>
            ) : (
              <Box sx={{ borderTop: '2px solid', borderColor: TEAL }}>
                {filteredPatients.length === 0 ? (
                  <Typography sx={{ textAlign: 'center', py: 3, color: '#999' }}>
                    No se encontraron pacientes
                  </Typography>
                ) : (
                  filteredPatients.map((patient) => (
                    <Box
                      key={patient.id}
                      onClick={() => handlePatientSelect(patient)}
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        py: 1.2,
                        px: 2,
                        cursor: 'pointer',
                        backgroundColor: ROW_LIGHT,
                        borderBottom: '1px solid #cfd8dc',
                        '&:hover': { backgroundColor: '#b2ebf2' },
                      }}
                    >
                      <Typography sx={{ fontSize: '0.9rem' }}>
                        {patient.full_name ?? ''}
                      </Typography>
                      <Typography sx={{ fontSize: '0.9rem', color: '#555', whiteSpace: 'nowrap', ml: 2 }}>
                        {patient.phone ?? ''}
                      </Typography>
                    </Box>
                  ))
                )}
              </Box>
            )}
          </Box>
        </Box>
      )}
    </Box>
  );

  // ═══════════════════════════════════════════════
  //  RENDER: Step 3 – Summary
  // ═══════════════════════════════════════════════
  const renderSummaryStep = () => {
    const patientName = selectedPatient
      ? selectedPatient.full_name
      : `${newPatient.name} ${newPatient.last_name}`.trim();
    const patientPhone = selectedPatient
      ? selectedPatient.phone
      : newPatient.phone;
    const slotDate = selectedSlot ? formatDateEs(selectedSlot.datestart.split(' ')[0]) : '';
    const slotTime = selectedSlot?.timeshow ?? '';

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Box>
          <Typography sx={{ color: '#999', fontSize: '0.85rem' }}>Paciente:</Typography>
          <Typography sx={{ fontWeight: 500 }}>
            {patientName} - {patientPhone}
          </Typography>
        </Box>

        <Typography
          sx={{ textAlign: 'center', color: '#999', fontSize: '0.9rem', mt: 1 }}
        >
          Fecha y hora de la cita:
        </Typography>

        <Box sx={{ borderTop: '1px solid #eee', pt: 1 }}>
          <Typography>{slotDate}</Typography>
        </Box>
        <Box sx={{ borderTop: '1px solid #eee', pt: 1 }}>
          <Typography>{slotTime}</Typography>
        </Box>

        <Box sx={{ borderTop: '1px solid #eee', pt: 1 }}>
          <Typography sx={{ color: TEAL, fontSize: '0.85rem', textDecoration: 'underline', mb: 0.5 }}>
            Motivo de la consulta:
          </Typography>
          <TextField
            size="small"
            fullWidth
            value={reason}
            onChange={(e) => setReason(e.target.value.slice(0, 80))}
            placeholder="Consulta general"
            inputProps={{ maxLength: 80 }}
          />
        </Box>

        <FormControlLabel
          control={
            <Checkbox
              checked={notifyPatient}
              onChange={(e) => setNotifyPatient(e.target.checked)}
              sx={{ color: TEAL, '&.Mui-checked': { color: TEAL } }}
            />
          }
          label="Notificar al paciente (WhatsApp o SMS)"
          sx={{ mt: 1 }}
        />

        {saveError && (
          <Typography sx={{ color: 'error.main', fontSize: '0.85rem' }}>
            {saveError}
          </Typography>
        )}

      </Box>
    );
  };

  // ── Step label ──
  const stepNumber = step === 'dates' ? 1 : step === 'patient' ? 2 : 3;

  // ── Footer buttons per step ──
  const renderFooter = () => {
    if (step === 'dates') {
      if (showManualForm) {
        return null;
      }
      return (
        <DialogActions sx={{ justifyContent: 'flex-end', px: 3, pb: 2 }}>
          <Button
            variant="outlined"
            size="small"
            onClick={() => setShowManualForm(true)}
            sx={{
              borderColor: TEAL,
              color: TEAL,
              textTransform: 'none',
              fontWeight: 500,
              '&:hover': { borderColor: '#00796b', backgroundColor: 'rgba(0,137,123,0.04)' },
            }}
          >
            Día y hora específica
          </Button>
        </DialogActions>
      );
    }

    if (step === 'patient') {
      if (showNewPatientForm) {
        return (
          <DialogActions sx={{ justifyContent: 'space-between', px: 3, pb: 2 }}>
            <Button
              variant="contained"
              size="small"
              onClick={() => {
                setShowNewPatientForm(false);
                setDuplicatePatients([]);
                setDuplicateSource(null);
                setSelectedExistingPatient(null);
                phoneSearchRef.current = '';
                nameSearchRef.current = '';
              }}
              sx={{ backgroundColor: TEAL, '&:hover': { backgroundColor: '#00796b' } }}
            >
              Volver a lista
            </Button>
            <Button
              variant="contained"
              size="small"
              onClick={handleNewPatientConfirm}
              sx={{ backgroundColor: MAGENTA, '&:hover': { backgroundColor: '#c2185b' } }}
            >
              Continuar
            </Button>
          </DialogActions>
        );
      }
      return (
        <DialogActions sx={{ justifyContent: 'space-between', px: 3, pb: 2 }}>
          <Button
            variant="contained"
            size="small"
            onClick={onClose}
            sx={{ backgroundColor: TEAL, '&:hover': { backgroundColor: '#00796b' } }}
          >
            Cerrar
          </Button>
          <Button
            variant="outlined"
            size="small"
            onClick={() => setShowNewPatientForm(true)}
            sx={{
              borderColor: '#999',
              color: '#333',
              textTransform: 'uppercase',
              '&:hover': { borderColor: '#666' },
            }}
          >
            Nuevo paciente
          </Button>
        </DialogActions>
      );
    }

    // step === 'summary'
    return (
      <DialogActions sx={{ justifyContent: 'space-between', px: 3, pb: 2 }}>
        <Button
          variant="contained"
          size="small"
          onClick={onClose}
          sx={{ backgroundColor: TEAL, '&:hover': { backgroundColor: '#00796b' } }}
        >
          Cerrar
        </Button>
        <Button
          variant="contained"
          size="small"
          onClick={handleSave}
          disabled={saving}
          sx={{ backgroundColor: MAGENTA, '&:hover': { backgroundColor: '#c2185b' } }}
        >
          {saving ? <CircularProgress size={20} sx={{ color: '#fff' }} /> : 'Guardar cita'}
        </Button>
      </DialogActions>
    );
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2, height: 450, display: 'flex', flexDirection: 'column' },
      }}
    >
      <DialogTitle
        sx={{
          textAlign: 'center',
          fontWeight: 600,
          pb: 0,
          position: 'relative',
        }}
      >
        {(step !== 'dates' || showManualForm) && (
          <IconButton
            onClick={handleBack}
            sx={{ position: 'absolute', left: 8, top: 8 }}
            size="small"
          >
            <BackIcon />
          </IconButton>
        )}
        Nueva cita
        <IconButton
          onClick={onClose}
          sx={{ position: 'absolute', right: 8, top: 8 }}
          size="small"
        >
          <CloseIcon />
        </IconButton>
        <Typography sx={{ fontSize: '0.75rem', color: '#999', mt: 0.5 }}>
          Paso {stepNumber} de 3
        </Typography>
        {showManualForm && manualSummaryParts.length > 0 && (
          <Typography sx={{ fontSize: '0.7rem', color: TEAL, fontWeight: 500, mt: 0.5 }}>
            {manualSummaryParts.join(' - ')}
          </Typography>
        )}
      </DialogTitle>
      <DialogContent sx={{ pt: 2, flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        {step === 'dates' && renderDatesStep()}
        {step === 'patient' && renderPatientStep()}
        {step === 'summary' && renderSummaryStep()}
      </DialogContent>
      {renderFooter()}
    </Dialog>
  );
}
