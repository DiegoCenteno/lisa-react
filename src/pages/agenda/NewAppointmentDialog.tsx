import { useState, useEffect, useCallback, useMemo, useDeferredValue } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
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
} from '@mui/material';
import {
  ContentCopy as CopyIcon,
  Close as CloseIcon,
  ArrowBack as BackIcon,
} from '@mui/icons-material';
import type { AvailableSlot, PatientSimple, NewPatientData } from '../../types';
import { appointmentService } from '../../api/appointmentService';
import dayjs from 'dayjs';
import 'dayjs/locale/es';

dayjs.locale('es');

// ── Color constants matching Diego's original design ──
const ROW_LIGHT = '#e0f7fa';
const ROW_WHITE = '#ffffff';
const SLOT_AVAILABLE = '#f0fff0';
const SLOT_OCCUPIED = '#f5f5f5';
const SLOT_BREAK = '#fffde7';
const TEAL = '#00897B';
const MAGENTA = '#e91e63';

// ── Helper: format a date string "2026-03-21" → "Sábado, 21 Marzo 2026" ──
function formatDateEs(dateStr: string): string {
  const d = dayjs(dateStr);
  const day = d.format('dddd');
  const capitalDay = day.charAt(0).toUpperCase() + day.slice(1);
  const monthRaw = d.format('MMMM');
  const capitalMonth = monthRaw.charAt(0).toUpperCase() + monthRaw.slice(1);
  return `${capitalDay}, ${d.format('D')} ${capitalMonth} ${d.format('YYYY')}`;
}

interface Props {
  open: boolean;
  onClose: () => void;
  officeId: number;
  onAppointmentCreated: () => void;
}

type WizardStep = 'dates' | 'patient' | 'summary';

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
    gender: 'M',
    birth_date: '',
  });
  const [newPatientErrors, setNewPatientErrors] = useState<Record<string, string>>({});

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
        gender: 'M',
        birth_date: '',
      });
      setNewPatientErrors({});
      setReason('');
      setNotifyPatient(true);
      setSaving(false);
      setSaveError('');
      loadAvailableDates();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // ── Load available dates ──
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

  // ── Load slots for a date ──
  const loadSlots = useCallback(
    async (date: string) => {
      if (!officeId) return;
      setSlotsLoading(true);
      try {
        const data = await appointmentService.getAvailableSlots(officeId, date, 50);
        setSlots(data.filter((s) => !s.is_past));
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
    if (!newPatient.phone || newPatient.phone.length !== 10) {
      errors.phone = 'El celular debe tener 10 dígitos';
    }
    if (!/^\d{10}$/.test(newPatient.phone)) {
      errors.phone = 'Solo se permiten números (10 dígitos)';
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
    if (!newPatient.birth_date) {
      errors.birth_date = 'La fecha de nacimiento es requerida';
    }
    setNewPatientErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ── Handle new patient confirm → go to summary ──
  const handleNewPatientConfirm = () => {
    if (validateNewPatient()) {
      setSelectedPatient(null);
      setStep('summary');
    }
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
          gender: newPatient.gender,
          birth_date: newPatient.birth_date,
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

  // ── Handle back navigation ──
  const handleBack = () => {
    if (step === 'patient') {
      setStep('dates');
      setSelectedSlot(null);
    } else if (step === 'summary') {
      setStep('patient');
    }
  };

  // ═══════════════════════════════════════════════
  //  RENDER: Step 1 – Available Dates + Slots
  // ═══════════════════════════════════════════════
  const renderDatesStep = () => (
    <Box>
      {/* Copy button */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
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
          {datesToShow.map((date, idx) => {
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
                    backgroundColor: idx % 2 === 0 ? ROW_LIGHT : ROW_WHITE,
                    borderLeft: `4px solid ${ROW_LIGHT}`,
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
                        const isBreak = slot.estatus === 2;
                        const isOccupied = slot.estatus === 0;
                        let bgColor = SLOT_AVAILABLE;
                        let label = 'disponible';
                        if (isOccupied) {
                          bgColor = SLOT_OCCUPIED;
                          label = 'no disponible';
                        } else if (isBreak) {
                          bgColor = SLOT_BREAK;
                          label = 'descanso';
                        }
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
    <Box>
      {showNewPatientForm ? (
        // ── New Patient Form ──
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
            Nuevo paciente
          </Typography>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <FormControl sx={{ minWidth: 160 }} size="small">
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
          />

          <FormControl size="small" fullWidth>
            <InputLabel>Género</InputLabel>
            <Select
              value={newPatient.gender}
              label="Género"
              onChange={(e) =>
                setNewPatient({
                  ...newPatient,
                  gender: e.target.value as 'M' | 'F',
                })
              }
            >
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
          />

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
            <Button
              variant="contained"
              size="small"
              onClick={() => setShowNewPatientForm(false)}
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
          </Box>
        </Box>
      ) : (
        // ── Patient List ──
        <Box>
          <TextField
            placeholder="Buscar paciente por nombre o teléfono..."
            size="small"
            fullWidth
            value={patientSearch}
            onChange={(e) => setPatientSearch(e.target.value)}
            sx={{ mb: 2 }}
          />

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
                filteredPatients.map((patient, idx) => (
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
                      backgroundColor: idx % 2 === 0 ? ROW_LIGHT : ROW_WHITE,
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

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
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

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
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
        </Box>
      </Box>
    );
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2 },
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
        {step !== 'dates' && (
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
      </DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        {step === 'dates' && renderDatesStep()}
        {step === 'patient' && renderPatientStep()}
        {step === 'summary' && renderSummaryStep()}
      </DialogContent>
    </Dialog>
  );
}
