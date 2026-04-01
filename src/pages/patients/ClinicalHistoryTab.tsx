import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  FormControlLabel,
  Grid,
  MenuItem,
  Skeleton,
  Snackbar,
  TextField,
  Typography,
} from '@mui/material';
import BiotechIcon from '@mui/icons-material/Biotech';
import CancelIcon from '@mui/icons-material/Cancel';
import EditIcon from '@mui/icons-material/Edit';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FamilyRestroomIcon from '@mui/icons-material/FamilyRestroom';
import PersonIcon from '@mui/icons-material/Person';
import PregnantWomanIcon from '@mui/icons-material/PregnantWoman';
import SaveIcon from '@mui/icons-material/Save';

import type {
  ClinicalHistory,
  GynecologicalBackground,
  HereditaryBackground,
  PersonalNonPathological,
  PersonalPathological,
} from '../../types';
import { appointmentService } from '../../api/appointmentService';
import { patientService } from '../../api/patientService';
import settingsService, { type SettingsFormsData } from '../../api/settingsService';
import { clinicalHistoryCatalogs } from '../../utils/clinicalHistory';
import ClickableDateField from '../../components/ClickableDateField';

interface ClinicalHistoryTabProps {
  patientId: number;
}

type MessageState = {
  open: boolean;
  text: string;
  severity: 'success' | 'error' | 'info';
};

type ClinicalHistorySectionKey = 'hereditary' | 'non_pathological' | 'pathological' | 'gynecological';

const expandedClinicalHistorySections: Record<ClinicalHistorySectionKey, boolean> = {
  hereditary: false,
  non_pathological: false,
  pathological: false,
  gynecological: false,
};

const collapsedClinicalHistorySections: Record<ClinicalHistorySectionKey, boolean> = {
  hereditary: true,
  non_pathological: true,
  pathological: true,
  gynecological: true,
};

type SectionCardProps = {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  collapsed?: boolean;
  onToggle?: () => void;
};

type SubsectionCardProps = {
  title: string;
  children: React.ReactNode;
};

type FieldProps = {
  label: string;
  value?: string | number;
  disabled?: boolean;
  hidden?: boolean;
  onChange?: (value: string) => void;
  select?: boolean;
  multiline?: boolean;
  rows?: number;
  type?: string;
  children?: React.ReactNode;
  xs?: number;
  sm?: number;
};

type CheckFieldProps = {
  label: string;
  checked?: boolean;
  value?: string;
  disabled?: boolean;
  hidden?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  onValueChange?: (value: string) => void;
  multiline?: boolean;
  rows?: number;
};

type DocumentFieldProps = {
  label: string;
  value?: string | number | null;
  xs?: number;
  sm?: number;
  hidden?: boolean;
};

const INFO_ALERT_TEXT =
  'Se recuperó un borrador local de historia clínica. Puedes continuar editando o cancelar para volver a la versión guardada.';

function getDraftKey(patientId: number) {
  return `clinical-history-draft:${patientId}`;
}

function getStoredOfficeId(): number | null {
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    const user = JSON.parse(raw) as { consultorio_id?: number };
    return typeof user.consultorio_id === 'number' && user.consultorio_id > 0 ? user.consultorio_id : null;
  } catch {
    return null;
  }
}

async function resolveOfficeIdForForms(): Promise<number | null> {
  const storedOfficeId = getStoredOfficeId();
  if (storedOfficeId) {
    return storedOfficeId;
  }

  const offices = await appointmentService.getOffices();
  if (offices.length === 0) {
    throw new Error('No se encontraron consultorios disponibles');
  }

  return offices[0].id;
}

function safeReadDraft(patientId: number): ClinicalHistory | null {
  try {
    const raw = localStorage.getItem(getDraftKey(patientId));
    if (!raw) return null;
    return JSON.parse(raw) as ClinicalHistory;
  } catch {
    return null;
  }
}

function clearDraft(patientId: number) {
  localStorage.removeItem(getDraftKey(patientId));
}

function calculateAgeFromBirthDate(value?: string) {
  if (!value) return '';
  const birthDate = new Date(`${value}T00:00:00`);
  if (Number.isNaN(birthDate.getTime())) return '';

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  const dayDiff = today.getDate() - birthDate.getDate();

  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    age -= 1;
  }

  return age >= 0 ? String(age) : '';
}

async function flushActiveElement() {
  const activeElement = document.activeElement;
  if (activeElement instanceof HTMLElement) {
    activeElement.blur();
    await new Promise((resolve) => window.setTimeout(resolve, 0));
  }
}

const SectionCard = memo(function SectionCard({
  title,
  icon,
  children,
  collapsed = false,
  onToggle,
}: SectionCardProps) {
  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'rgba(35, 165, 193, 0.18)',
        overflow: 'hidden',
      }}
    >
      <Box
        onClick={onToggle}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.25,
          px: 2.5,
          py: 1.5,
          borderBottom: '1px solid',
          borderColor: 'rgba(35, 165, 193, 0.12)',
          background: 'linear-gradient(180deg, rgba(35,165,193,0.06) 0%, rgba(35,165,193,0.02) 100%)',
          cursor: onToggle ? 'pointer' : 'default',
        }}
      >
        <Box sx={{ color: '#1297a8', display: 'flex', alignItems: 'center' }}>{icon}</Box>
        <Typography variant="h6" fontWeight={700} color="#0d7f1f">
          {title}
        </Typography>
        {onToggle ? (
          <Box sx={{ ml: 'auto', color: '#1297a8', display: 'flex', alignItems: 'center' }}>
            {collapsed ? <ExpandMoreIcon /> : <ExpandLessIcon />}
          </Box>
        ) : null}
      </Box>
      {!collapsed ? <CardContent sx={{ p: { xs: 2, md: 3 } }}>{children}</CardContent> : null}
    </Card>
  );
});

const SubsectionCard = memo(function SubsectionCard({ title, children }: SubsectionCardProps) {
  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: 'rgba(35, 165, 193, 0.12)',
        borderRadius: 2,
        p: 2,
      }}
    >
      <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 700, color: '#177b26' }}>
        {title}
      </Typography>
      {children}
    </Box>
  );
});

function hasDisplayValue(value?: string | number | null) {
  if (value === null || value === undefined) return false;
  if (typeof value === 'number') return true;
  return value.trim().length > 0;
}

const DocumentField = memo(function DocumentField({
  label,
  value,
  xs = 12,
  sm = 6,
  hidden = false,
}: DocumentFieldProps) {
  if (hidden) {
    return null;
  }

  if (!hasDisplayValue(value)) {
    return null;
  }

  return (
    <Grid size={{ xs, sm }}>
      <Box sx={{ display: 'grid', gap: 0.4 }}>
        <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 700 }}>
          {label}
        </Typography>
        <Typography variant="body1" sx={{ color: '#16313b', whiteSpace: 'pre-wrap' }}>
          {value}
        </Typography>
      </Box>
    </Grid>
  );
});

const Field = memo(function Field({
  label,
  value,
  disabled,
  hidden = false,
  onChange,
  select,
  multiline,
  rows,
  type,
  children,
  xs = 12,
  sm = 6,
}: FieldProps) {
  if (hidden) {
    return null;
  }

  const isDateField = type === 'date';
  const isImmediateField = Boolean(select || isDateField);
  const stringValue = String(value ?? '');
  const [draftValue, setDraftValue] = useState(stringValue);

  useEffect(() => {
    setDraftValue(stringValue);
  }, [stringValue]);

  if (disabled) {
    return <DocumentField label={label} value={value ?? ''} xs={xs} sm={sm} />;
  }

  if (isDateField) {
    return (
      <Grid size={{ xs, sm }}>
        <ClickableDateField
          label={label}
          value={stringValue}
          onChange={onChange}
        />
      </Grid>
    );
  }

  return (
    <Grid size={{ xs, sm }}>
      <TextField
        fullWidth
        size="small"
        label={label}
        value={isImmediateField ? stringValue : draftValue}
        onChange={(event) => {
          if (isImmediateField) {
            onChange?.(event.target.value);
            return;
          }
          setDraftValue(event.target.value);
        }}
        onBlur={() => {
          if (!isImmediateField && draftValue !== stringValue) {
            onChange?.(draftValue);
          }
        }}
        disabled={disabled}
        select={select}
        multiline={multiline}
        rows={rows}
        type={type}
      >
        {children}
      </TextField>
    </Grid>
  );
});

const LegacyCheckField = memo(function LegacyCheckField({
  label,
  checked,
  value,
  disabled,
  onCheckedChange,
  onValueChange,
}: CheckFieldProps) {
  if (disabled) {
    if (!checked && !hasDisplayValue(value)) {
      return null;
    }

    return (
      <DocumentField
        label={label}
        value={checked ? (hasDisplayValue(value) ? value : 'Sí') : ''}
        xs={12}
        sm={12}
      />
    );
  }

  return (
    <Grid size={{ xs: 12 }}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '260px minmax(0, 1fr)' },
          gap: 1.5,
          alignItems: 'start',
        }}
      >
        <FormControlLabel
          control={
            <Checkbox
              checked={Boolean(checked)}
              onChange={(event) => {
                const nextChecked = event.target.checked;
                onCheckedChange?.(nextChecked);
                if (!nextChecked) {
                  onValueChange?.('');
                }
              }}
              disabled={disabled}
            />
          }
          label={label}
          sx={{ m: 0 }}
        />
        <TextField
          fullWidth
          size="small"
          value={value ?? ''}
          onChange={(event) => onValueChange?.(event.target.value)}
          disabled={disabled || !checked}
          placeholder="Anotaciones adicionales"
        />
      </Box>
    </Grid>
  );
});

const BufferedCheckField = memo(function BufferedCheckField({
  label,
  checked,
  value,
  disabled,
  hidden = false,
  onCheckedChange,
  onValueChange,
}: CheckFieldProps) {
  if (hidden) {
    return null;
  }

  const stringValue = String(value ?? '');
  const [draftValue, setDraftValue] = useState(stringValue);

  useEffect(() => {
    setDraftValue(stringValue);
  }, [stringValue]);

  if (disabled) {
    return (
        <LegacyCheckField
          label={label}
          checked={checked}
          value={value}
          disabled={disabled}
          onCheckedChange={onCheckedChange}
          onValueChange={onValueChange}
        />
    );
  }

  return (
    <Grid size={{ xs: 12 }}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '260px minmax(0, 1fr)' },
          gap: 1.5,
          alignItems: 'start',
        }}
      >
        <FormControlLabel
          control={
            <Checkbox
              checked={Boolean(checked)}
              onChange={(event) => {
                const nextChecked = event.target.checked;
                onCheckedChange?.(nextChecked);
                if (!nextChecked) {
                  setDraftValue('');
                  onValueChange?.('');
                }
              }}
              disabled={disabled}
            />
          }
          label={label}
          sx={{ m: 0 }}
        />
        <TextField
          fullWidth
          size="small"
          value={draftValue}
          onChange={(event) => setDraftValue(event.target.value)}
          onBlur={() => {
            if (draftValue !== stringValue) {
              onValueChange?.(draftValue);
            }
          }}
          disabled={disabled || !checked}
          placeholder="Anotaciones adicionales"
        />
      </Box>
    </Grid>
  );
});

const CheckField = BufferedCheckField;

type HereditarySectionProps = {
  value: HereditaryBackground;
  disabled: boolean;
  onPatch: (patch: Partial<HereditaryBackground>) => void;
  collapsed?: boolean;
  onToggle?: () => void;
  fieldVisible?: (key: string) => boolean;
};

const HereditarySection = memo(function HereditarySection({
  value,
  disabled,
  onPatch,
  collapsed,
  onToggle,
  fieldVisible,
}: HereditarySectionProps) {
  const isVisible = (key: string) => fieldVisible?.(key) ?? true;

  return (
    <SectionCard
      title="Antecedentes Heredofamiliares"
      icon={<FamilyRestroomIcon />}
      collapsed={collapsed}
      onToggle={onToggle}
    >
      <Grid container spacing={2}>
        <Field
          label="Tipo de sangre / RH"
          value={value.blood_type_rh}
          disabled={disabled}
          hidden={!isVisible('tiposangre')}
          onChange={(blood_type_rh) => onPatch({ blood_type_rh })}
          select
        >
          {clinicalHistoryCatalogs.bloodTypes.map((type) => (
            <MenuItem key={type} value={type}>
              {type}
            </MenuItem>
          ))}
        </Field>
        <Grid size={{ xs: 12, sm: 6 }} />
        <CheckField
          label="CGDM"
          hidden={!isVisible('cgdm')}
          checked={value.cgdm_checked}
          value={value.cgdm}
          disabled={disabled}
          onCheckedChange={(cgdm_checked) => onPatch({ cgdm_checked })}
          onValueChange={(cgdm) => onPatch({ cgdm })}
        />
        <CheckField
          label="Consanguíneos"
          hidden={!isVisible('consanguineos')}
          checked={value.consanguineous_checked}
          value={value.consanguineous}
          disabled={disabled}
          onCheckedChange={(consanguineous_checked) => onPatch({ consanguineous_checked })}
          onValueChange={(consanguineous) => onPatch({ consanguineous })}
        />
        <CheckField
          label="Defectos genéticos"
          hidden={!isVisible('geneticosodefectos')}
          checked={value.genetic_defects_checked}
          value={value.genetic_defects}
          disabled={disabled}
          onCheckedChange={(genetic_defects_checked) => onPatch({ genetic_defects_checked })}
          onValueChange={(genetic_defects) => onPatch({ genetic_defects })}
        />
        <CheckField
          label="Preeclampsia familiar"
          hidden={!isVisible('familiarpreeclampsia')}
          checked={value.family_preeclampsia_checked}
          value={value.family_preeclampsia}
          disabled={disabled}
          onCheckedChange={(family_preeclampsia_checked) => onPatch({ family_preeclampsia_checked })}
          onValueChange={(family_preeclampsia) => onPatch({ family_preeclampsia })}
        />
        <Grid size={{ xs: 12 }} sx={{ display: isVisible('familiarpareja') ? 'block' : 'none' }}>
          {disabled ? (
            value.partner_history_checked ? (
              <Box
                sx={{
                  border: '1px solid',
                  borderColor: 'rgba(35, 165, 193, 0.18)',
                  borderRadius: 2,
                  p: 2,
                }}
              >
                <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 700, color: '#177b26' }}>
                  Antecedentes en pareja
                </Typography>
                <Grid container spacing={2}>
                  <DocumentField label="Nombre" value={value.partner_history_name} />
                  <DocumentField label="Edad" value={value.partner_history_age} />
                  <DocumentField label="APP en pareja" value={value.partner_app_checked ? 'Sí' : ''} />
                  <DocumentField
                    label="Defectos genéticos en pareja"
                    value={value.partner_genetic_defects_checked ? 'Sí' : ''}
                  />
                </Grid>
              </Box>
            ) : null
          ) : (
            <Box
              sx={{
                border: '1px solid',
                borderColor: 'rgba(35, 165, 193, 0.18)',
                borderRadius: 2,
                p: 2,
              }}
            >
              <FormControlLabel
                control={
                  <Checkbox
                    checked={Boolean(value.partner_history_checked)}
                    onChange={(event) => onPatch({ partner_history_checked: event.target.checked })}
                    disabled={disabled}
                  />
                }
                label="Antecedentes en pareja"
                sx={{ mb: 1 }}
              />
              <Grid container spacing={2}>
                <Field
                  label="Nombre"
                  value={value.partner_history_name}
                  disabled={disabled || !value.partner_history_checked}
                  onChange={(partner_history_name) => onPatch({ partner_history_name })}
                />
                <Field
                  label="Edad"
                  value={value.partner_history_age}
                  disabled={disabled || !value.partner_history_checked}
                  onChange={(partner_history_age) => onPatch({ partner_history_age })}
                />
                <Grid size={{ xs: 12, sm: 6 }} sx={{ display: isVisible('embarazada') ? 'block' : 'none' }}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={Boolean(value.partner_app_checked)}
                        onChange={(event) => onPatch({ partner_app_checked: event.target.checked })}
                        disabled={disabled || !value.partner_history_checked}
                      />
                    }
                    label="APP en pareja"
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }} sx={{ display: isVisible('embarazada') ? 'block' : 'none' }}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={Boolean(value.partner_genetic_defects_checked)}
                        onChange={(event) =>
                          onPatch({ partner_genetic_defects_checked: event.target.checked })
                        }
                        disabled={disabled || !value.partner_history_checked}
                      />
                    }
                    label="Defectos genéticos en pareja"
                  />
                </Grid>
              </Grid>
            </Box>
          )}
        </Grid>
        <CheckField
          label="Diabetes"
          hidden={!isVisible('diabetes')}
          checked={value.diabetes_checked}
          value={value.diabetes}
          disabled={disabled}
          onCheckedChange={(diabetes_checked) => onPatch({ diabetes_checked })}
          onValueChange={(diabetes) => onPatch({ diabetes })}
        />
        <CheckField
          label="Cáncer"
          hidden={!isVisible('cancer')}
          checked={value.cancer_checked}
          value={value.cancer}
          disabled={disabled}
          onCheckedChange={(cancer_checked) => onPatch({ cancer_checked })}
          onValueChange={(cancer) => onPatch({ cancer })}
        />
        <CheckField
          label="Hipertensión"
          hidden={!isVisible('hipertension')}
          checked={value.hypertension_checked}
          value={value.hypertension}
          disabled={disabled}
          onCheckedChange={(hypertension_checked) => onPatch({ hypertension_checked })}
          onValueChange={(hypertension) => onPatch({ hypertension })}
        />
        <CheckField
          label="Enfermedad reumática"
          hidden={!isVisible('reumatica')}
          checked={value.rheumatic_disease_checked}
          value={value.rheumatic_disease}
          disabled={disabled}
          onCheckedChange={(rheumatic_disease_checked) => onPatch({ rheumatic_disease_checked })}
          onValueChange={(rheumatic_disease) => onPatch({ rheumatic_disease })}
        />
        <CheckField
          label="Otras"
          hidden={!isVisible('antfam')}
          checked={value.others_checked}
          value={value.others}
          disabled={disabled}
          onCheckedChange={(others_checked) => onPatch({ others_checked })}
          onValueChange={(others) => onPatch({ others })}
          multiline
          rows={2}
        />
      </Grid>
    </SectionCard>
  );
});

type NonPathologicalSectionProps = {
  value: PersonalNonPathological;
  disabled: boolean;
  onPatch: (patch: Partial<PersonalNonPathological>) => void;
  collapsed?: boolean;
  onToggle?: () => void;
  fieldVisible?: (key: string) => boolean;
};

const NonPathologicalSection = memo(function NonPathologicalSection({
  value,
  disabled,
  onPatch,
  collapsed,
  onToggle,
  fieldVisible,
}: NonPathologicalSectionProps) {
  const isVisible = (key: string) => fieldVisible?.(key) ?? true;

  return (
    <SectionCard
      title="Antecedentes Personales NO Patologicos"
      icon={<PersonIcon />}
      collapsed={collapsed}
      onToggle={onToggle}
    >
      <Grid container spacing={2}>
        <Field label="Origen" value={value.origin} disabled={disabled} hidden={!isVisible('originaria')} onChange={(origin) => onPatch({ origin })} />
        <Field label="Residencia" value={value.residence} disabled={disabled} hidden={!isVisible('residente')} onChange={(residence) => onPatch({ residence })} />
        <Field label="Estado civil" value={value.civil_status} disabled={disabled} hidden={!isVisible('estadocivil')} onChange={(civil_status) => onPatch({ civil_status })} />
        <Field label="Religión" value={value.religion} disabled={disabled} hidden={!isVisible('religion')} onChange={(religion) => onPatch({ religion })} />
        <Field label="Escolaridad" value={value.education} disabled={disabled} hidden={!isVisible('escolaridad')} onChange={(education) => onPatch({ education })} select>
          {clinicalHistoryCatalogs.education.map((item) => (
            <MenuItem key={item} value={item}>
              {item}
            </MenuItem>
          ))}
        </Field>
        <Field label="Ocupación" value={value.occupation} disabled={disabled} hidden={!isVisible('ocupacion')} onChange={(occupation) => onPatch({ occupation })} />
        <CheckField label="Toxicomanías" hidden={!isVisible('toxicomanias')} checked={value.substance_use_checked} value={value.substance_use} disabled={disabled} onCheckedChange={(substance_use_checked) => onPatch({ substance_use_checked })} onValueChange={(substance_use) => onPatch({ substance_use })} />
        <CheckField label="Fármacos" hidden={!isVisible('farmacos')} checked={value.medications_checked} value={value.medications} disabled={disabled} onCheckedChange={(medications_checked) => onPatch({ medications_checked })} onValueChange={(medications) => onPatch({ medications })} />
        <CheckField label="Exposiciones" hidden={!isVisible('exposiciones')} checked={value.exposures_checked} value={value.exposures} disabled={disabled} onCheckedChange={(exposures_checked) => onPatch({ exposures_checked })} onValueChange={(exposures) => onPatch({ exposures })} />
        <CheckField label="Tabaquismo" hidden={!isVisible('tabaquismo')} checked={value.smoking_checked} value={value.smoking} disabled={disabled} onCheckedChange={(smoking_checked) => onPatch({ smoking_checked })} onValueChange={(smoking) => onPatch({ smoking })} />
        <CheckField label="Alcohol" hidden={!isVisible('bebidas')} checked={value.alcohol_checked} value={value.alcohol} disabled={disabled} onCheckedChange={(alcohol_checked) => onPatch({ alcohol_checked })} onValueChange={(alcohol) => onPatch({ alcohol })} />
        <CheckField label="Relaciones homosexuales" hidden={!isVisible('homosex')} checked={value.homosexual_relations_checked} value={value.homosexual_relations} disabled={disabled} onCheckedChange={(homosexual_relations_checked) => onPatch({ homosexual_relations_checked })} onValueChange={(homosexual_relations) => onPatch({ homosexual_relations })} />
        <CheckField label="Ejercicio" hidden={!isVisible('ejercicio')} checked={value.exercise_checked} value={value.exercise} disabled={disabled} onCheckedChange={(exercise_checked) => onPatch({ exercise_checked })} onValueChange={(exercise) => onPatch({ exercise })} />
        <CheckField label="Otras" hidden={!isVisible('persnopat')} checked={value.others_checked} value={value.others} disabled={disabled} onCheckedChange={(others_checked) => onPatch({ others_checked })} onValueChange={(others) => onPatch({ others })} multiline rows={2} />
      </Grid>
    </SectionCard>
  );
});

type PathologicalSectionProps = {
  value: PersonalPathological;
  disabled: boolean;
  onPatch: (patch: Partial<PersonalPathological>) => void;
  collapsed?: boolean;
  onToggle?: () => void;
  fieldVisible?: (key: string) => boolean;
};

const PathologicalSection = memo(function PathologicalSection({
  value,
  disabled,
  onPatch,
  collapsed,
  onToggle,
  fieldVisible,
}: PathologicalSectionProps) {
  const isVisible = (key: string) => fieldVisible?.(key) ?? true;

  return (
    <SectionCard
      title="Antecedentes Personales Patologicos"
      icon={<BiotechIcon />}
      collapsed={collapsed}
      onToggle={onToggle}
    >
      <Grid container spacing={2}>
        <Field
          label="Alergias"
          value={value.allergies}
          disabled={disabled}
          hidden={!isVisible('alergias')}
          onChange={(allergies) => onPatch({ allergies })}
          multiline
          rows={2}
          xs={12}
        />
        <CheckField
          label="Hijo con síndrome de Down"
          hidden={!isVisible('hijosindromedown')}
          checked={value.down_syndrome_child_checked}
          value={value.down_syndrome_child}
          disabled={disabled}
          onCheckedChange={(down_syndrome_child_checked) => onPatch({ down_syndrome_child_checked })}
          onValueChange={(down_syndrome_child) => onPatch({ down_syndrome_child })}
        />
        <CheckField
          label="Enfermedades crónicas"
          hidden={!isVisible('degenerativas')}
          checked={value.chronic_diseases_checked}
          value={value.chronic_diseases}
          disabled={disabled}
          onCheckedChange={(chronic_diseases_checked) => onPatch({ chronic_diseases_checked })}
          onValueChange={(chronic_diseases) => onPatch({ chronic_diseases })}
        />
        <CheckField
          label="Cirugías"
          hidden={!isVisible('cirujias')}
          checked={value.surgeries_checked}
          value={value.surgeries}
          disabled={disabled}
          onCheckedChange={(surgeries_checked) => onPatch({ surgeries_checked })}
          onValueChange={(surgeries) => onPatch({ surgeries })}
        />
        <CheckField
          label="Transfusiones"
          hidden={!isVisible('transfusiones')}
          checked={value.transfusions_checked}
          value={value.transfusions}
          disabled={disabled}
          onCheckedChange={(transfusions_checked) => onPatch({ transfusions_checked })}
          onValueChange={(transfusions) => onPatch({ transfusions })}
        />
        <CheckField
          label="Fracturas"
          hidden={!isVisible('fracturas')}
          checked={value.fractures_checked}
          value={value.fractures}
          disabled={disabled}
          onCheckedChange={(fractures_checked) => onPatch({ fractures_checked })}
          onValueChange={(fractures) => onPatch({ fractures })}
        />
        <CheckField
          label="Otras"
          hidden={!isVisible('perspat')}
          checked={value.others_checked}
          value={value.others}
          disabled={disabled}
          onCheckedChange={(others_checked) => onPatch({ others_checked })}
          onValueChange={(others) => onPatch({ others })}
          multiline
          rows={2}
        />
      </Grid>
    </SectionCard>
  );
});

type GynecologicalSectionProps = {
  value: GynecologicalBackground;
  disabled: boolean;
  onPatch: (patch: Partial<GynecologicalBackground>) => void;
  collapsed?: boolean;
  onToggle?: () => void;
  fieldVisible?: (key: string) => boolean;
};

const GynecologyPregnancyBlock = memo(function GynecologyPregnancyBlock({
  value,
  disabled,
  onPatch,
  fieldVisible,
}: GynecologicalSectionProps) {
  const isVisible = (key: string) => fieldVisible?.(key) ?? true;
  const isPregnant = Boolean(value.pregnant);

  return (
    <SubsectionCard title="Embarazo y control">
      <Grid container spacing={2}>
        <Field label="Menarca" value={value.menarche} disabled={disabled} hidden={!isVisible('menarca')} onChange={(menarche) => onPatch({ menarche })} />
        <Field label="Ciclos menstruales" value={value.menstrual_cycles} disabled={disabled} hidden={!isVisible('ciclosmestruales')} onChange={(menstrual_cycles) => onPatch({ menstrual_cycles })} />
        {disabled ? (
          <DocumentField label="Embarazada" hidden={!isVisible('embarazada')} value={value.pregnant ? 'Sí' : 'No'} />
        ) : (
          <Grid size={{ xs: 12, sm: 6 }} sx={{ display: isVisible('embarazada') ? 'block' : 'none' }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={Boolean(value.pregnant)}
                  onChange={(event) => onPatch({ pregnant: event.target.checked })}
                  disabled={disabled}
                />
              }
              label="Embarazada"
            />
          </Grid>
        )}
        <Grid size={{ xs: 12, sm: 6 }} />
        <Field label="FUR" value={value.last_menstruation_date} disabled={disabled} hidden={!isVisible('fur')} onChange={(last_menstruation_date) => onPatch({ last_menstruation_date })} type="date" />

        {isPregnant && (
          <>
            <Field label="Embarazo logrado" value={value.pregnancy_achieved} disabled={disabled} onChange={(pregnancy_achieved) => onPatch({ pregnancy_achieved })} select>
              {clinicalHistoryCatalogs.pregnancyAchieved.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Field>
            <Field label="Tipo de embarazo" value={value.pregnancy_type} disabled={disabled} onChange={(pregnancy_type) => onPatch({ pregnancy_type })} select>
              {clinicalHistoryCatalogs.pregnancyType.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Field>
            <Field label="Patologia obstetrica" value={value.obstetric_pathology} disabled={disabled} onChange={(obstetric_pathology) => onPatch({ obstetric_pathology })} xs={12} />
            <Field label="TA embarazo" value={value.pregnancy_bp} disabled={disabled} onChange={(pregnancy_bp) => onPatch({ pregnancy_bp })} />
            <Field label="Peso embarazo" value={value.pregnancy_weight} disabled={disabled} onChange={(pregnancy_weight) => onPatch({ pregnancy_weight })} />
            <Field label="Talla embarazo" value={value.pregnancy_height} disabled={disabled} onChange={(pregnancy_height) => onPatch({ pregnancy_height })} />
            <Grid size={{ xs: 12 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={Boolean(value.ovum_donation_checked)}
                    onChange={(event) => {
                      const nextChecked = event.target.checked;
                      onPatch({
                        ovum_donation_checked: nextChecked,
                        ovum_donor_birth_date: nextChecked ? value.ovum_donor_birth_date : '',
                        ovum_donor_age: nextChecked ? value.ovum_donor_age : '',
                      });
                    }}
                    disabled={disabled}
                  />
                }
                label="Donacion de ovulos"
                sx={{ m: 0 }}
              />
            </Grid>
            <Field label="Fecha nacimiento donador" value={value.ovum_donor_birth_date} disabled={disabled || !value.ovum_donation_checked} onChange={(ovum_donor_birth_date) => onPatch({ ovum_donor_birth_date, ovum_donor_age: calculateAgeFromBirthDate(ovum_donor_birth_date) })} type="date" />
            <Field label="Edad donador" value={value.ovum_donor_age} disabled />
            <Field label="Anotaciones adicionales del embarazo" value={value.pregnancy_notes} disabled={disabled} onChange={(pregnancy_notes) => onPatch({ pregnancy_notes })} xs={12} />
          </>
        )}
      </Grid>
    </SubsectionCard>
  );
});


const GynecologySexualBlock = memo(function GynecologySexualBlock({
  value,
  disabled,
  onPatch,
  fieldVisible,
}: GynecologicalSectionProps) {
  const isVisible = (key: string) => fieldVisible?.(key) ?? true;
  return (
    <SubsectionCard title="Vida sexual y antecedentes gineco-obstétricos">
      <Grid container spacing={2}>
        <Field label="IVSA" value={value.ivsa} disabled={disabled} hidden={!isVisible('ivsa')} onChange={(ivsa) => onPatch({ ivsa })} />
        <Field label="Parejas sexuales" value={value.sexual_partners} disabled={disabled} hidden={!isVisible('parejassexuales')} onChange={(sexual_partners) => onPatch({ sexual_partners })} />
        <CheckField label="ETS" hidden={!isVisible('ets')} checked={value.std_checked} value={value.std} disabled={disabled} onCheckedChange={(std_checked) => onPatch({ std_checked })} onValueChange={(std) => onPatch({ std })} />
        <Field label="Citologia" value={value.cytology} disabled={disabled} hidden={!isVisible('citologia')} onChange={(cytology) => onPatch({ cytology })} />
        <Field label="Planificacion familiar" value={value.family_planning} disabled={disabled} hidden={!isVisible('planificacionfamiliar')} onChange={(family_planning) => onPatch({ family_planning })} />
        <Grid size={{ xs: 12 }} sx={{ display: isVisible('gestaciones') ? 'block' : 'none' }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={Boolean(value.gestations_checked)}
                onChange={(event) => {
                  const nextChecked = event.target.checked;
                  onPatch({
                    gestations_checked: nextChecked,
                    gestations: nextChecked ? value.gestations : '',
                    last_gestation_date: nextChecked ? value.last_gestation_date : '',
                    deliveries: nextChecked ? value.deliveries : '',
                    cesareans: nextChecked ? value.cesareans : '',
                    abortions: nextChecked ? value.abortions : '',
                    ectopic: nextChecked ? value.ectopic : '',
                    molar: nextChecked ? value.molar : '',
                  });
                }}
                disabled={disabled}
              />
            }
            label="Gestaciones"
            sx={{ m: 0 }}
          />
        </Grid>
        <Field label="Fecha última gestación" value={value.last_gestation_date} hidden={!isVisible('gestaciones')} disabled={disabled || !value.gestations_checked} onChange={(last_gestation_date) => onPatch({ last_gestation_date })} type="date" />
        <Field label="Gestaciones" value={value.gestations} hidden={!isVisible('gestaciones')} disabled={disabled || !value.gestations_checked} onChange={(gestations) => onPatch({ gestations })} />
        <Field label="Partos" value={value.deliveries} hidden={!isVisible('gestaciones')} disabled={disabled || !value.gestations_checked} onChange={(deliveries) => onPatch({ deliveries })} />
        <Field label="Cesareas" value={value.cesareans} hidden={!isVisible('gestaciones')} disabled={disabled || !value.gestations_checked} onChange={(cesareans) => onPatch({ cesareans })} />
        <Field label="Abortos" value={value.abortions} hidden={!isVisible('gestaciones')} disabled={disabled || !value.gestations_checked} onChange={(abortions) => onPatch({ abortions })} />
        <Field label="Embarazo ectopico" value={value.ectopic} hidden={!isVisible('gestaciones')} disabled={disabled || !value.gestations_checked} onChange={(ectopic) => onPatch({ ectopic })} />
        <Field label="Embarazo molar" value={value.molar} hidden={!isVisible('gestaciones')} disabled={disabled || !value.gestations_checked} onChange={(molar) => onPatch({ molar })} />
        <Field label="Edad de menopausia" value={value.menopause_age} disabled={disabled} hidden={!isVisible('txtdejoreglar')} onChange={(menopause_age) => onPatch({ menopause_age })} />
        <CheckField label="Sintomas de climaterio" hidden={!isVisible('climaterio')} checked={value.climacteric_symptoms_checked} value={value.climacteric_symptoms} disabled={disabled} onCheckedChange={(climacteric_symptoms_checked) => onPatch({ climacteric_symptoms_checked })} onValueChange={(climacteric_symptoms) => onPatch({ climacteric_symptoms })} />
        <CheckField label="Control prenatal" hidden={!isVisible('controlprenatal')} checked={value.prenatal_care_checked} value={value.prenatal_care} disabled={disabled} onCheckedChange={(prenatal_care_checked) => onPatch({ prenatal_care_checked })} onValueChange={(prenatal_care) => onPatch({ prenatal_care })} />
      </Grid>
    </SubsectionCard>
  );
});

const GynecologicalSection = memo(function GynecologicalSection({
  value,
  disabled,
  onPatch,
  collapsed,
  onToggle,
  fieldVisible,
}: GynecologicalSectionProps) {

  return (
    <SectionCard
      title="Antecedentes Ginecologicos"
      icon={<PregnantWomanIcon />}
      collapsed={collapsed}
      onToggle={onToggle}
    >
      <Box sx={{ display: 'grid', gap: 2 }}>
        <GynecologyPregnancyBlock value={value} disabled={disabled} onPatch={onPatch} fieldVisible={fieldVisible} />
        <GynecologySexualBlock value={value} disabled={disabled} onPatch={onPatch} fieldVisible={fieldVisible} />
      </Box>
    </SectionCard>
  );
});

function ClinicalHistoryTabInner({ patientId }: ClinicalHistoryTabProps) {
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveEnabled, setSaveEnabled] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Record<ClinicalHistorySectionKey, boolean>>(expandedClinicalHistorySections);
  const [formSettings, setFormSettings] = useState<SettingsFormsData | null>(null);
  const [draftRecovered, setDraftRecovered] = useState(false);
  const [clinicalHistory, setClinicalHistory] = useState<ClinicalHistory | null>(null);
  const [form, setForm] = useState<ClinicalHistory | null>(null);
  const [message, setMessage] = useState<MessageState>({
    open: false,
    text: '',
    severity: 'success',
  });

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setDraftRecovered(false);

      try {
        const officeId = await resolveOfficeIdForForms();
        const [history, settings] = await Promise.all([
          patientService.getClinicalHistory(patientId),
          officeId ? settingsService.getFormSettings(officeId).catch(() => null) : Promise.resolve(null),
        ]);
        if (cancelled) return;

        const draft = safeReadDraft(patientId);
        const initialForm = draft ?? history;

        setClinicalHistory(history);
        setForm(initialForm);
        setFormSettings(settings);
        setEditing(false);
        setCollapsedSections(expandedClinicalHistorySections);
        setDraftRecovered(Boolean(draft));
      } catch {
        if (cancelled) return;
        setMessage({
          open: true,
          text: 'No se pudo cargar la historia clínica.',
          severity: 'error',
        });
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [patientId]);

  useEffect(() => {
    if (!editing || !form || loading || saving) return undefined;

    const timeoutId = window.setTimeout(() => {
      localStorage.setItem(getDraftKey(patientId), JSON.stringify(form));
    }, 350);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [editing, form, loading, patientId, saving]);

  useEffect(() => {
    if (!editing) {
      setSaveEnabled(false);
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setSaveEnabled(true);
    }, 5000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [editing]);

  const toggleSection = useCallback((section: ClinicalHistorySectionKey) => {
    setCollapsedSections((current) => ({
      ...current,
      [section]: !current[section],
    }));
  }, []);

  const fieldVisible = useCallback(
    (key: string) => {
      if (!formSettings) {
        return true;
      }
      return formSettings.clinical_history[key] !== false;
    },
    [formSettings]
  );

  const patchHereditary = useCallback((patch: Partial<HereditaryBackground>) => {
    setSaveEnabled(true);
    setForm((prev) =>
      prev
        ? {
            ...prev,
            hereditary_background: {
              ...prev.hereditary_background,
              ...patch,
            },
          }
        : prev
    );
  }, []);

  const patchNonPathological = useCallback((patch: Partial<PersonalNonPathological>) => {
    setSaveEnabled(true);
    setForm((prev) =>
      prev
        ? {
            ...prev,
            personal_non_pathological: {
              ...prev.personal_non_pathological,
              ...patch,
            },
          }
        : prev
    );
  }, []);

  const patchPathological = useCallback((patch: Partial<PersonalPathological>) => {
    setSaveEnabled(true);
    setForm((prev) =>
      prev
        ? {
            ...prev,
            personal_pathological: {
              ...prev.personal_pathological,
              ...patch,
            },
          }
        : prev
    );
  }, []);

  const patchGynecological = useCallback((patch: Partial<GynecologicalBackground>) => {
    setSaveEnabled(true);
    setForm((prev) =>
      prev
        ? {
            ...prev,
            gynecological: {
              ...(prev.gynecological ?? {}),
              ...patch,
            },
          }
        : prev
    );
  }, []);

  const startEditing = useCallback(() => {
    setSaveEnabled(false);
    setCollapsedSections(collapsedClinicalHistorySections);
    setEditing(true);
  }, []);

  const cancelEditing = useCallback(() => {
    if (clinicalHistory) {
      setForm(clinicalHistory);
    }
    setEditing(false);
    setSaveEnabled(false);
    setDraftRecovered(false);
    setCollapsedSections(expandedClinicalHistorySections);
    clearDraft(patientId);
  }, [clinicalHistory, patientId]);

  const saveClinicalHistory = useCallback(async () => {
    if (!form) return;

    try {
      setSaving(true);
      await flushActiveElement();
      const saved = await patientService.updateClinicalHistory(patientId, form);
      setClinicalHistory(saved);
      setForm(saved);
      setEditing(false);
      setSaveEnabled(false);
      setDraftRecovered(false);
      clearDraft(patientId);
      setMessage({
        open: true,
        text: 'Historia clínica guardada correctamente.',
        severity: 'success',
      });
    } catch {
      setMessage({
        open: true,
        text: 'No se pudo guardar la historia clínica.',
        severity: 'error',
      });
    } finally {
      setSaving(false);
    }
  }, [form, patientId]);

  const hasVisibleData = useMemo(() => {
    const serialized = JSON.stringify(form);
    return /"(?:[^"]+)":"[^"]+"|"(?:[^"]+)":true|"(?:[^"]+)":[0-9]+/.test(serialized);
  }, [form]);

  if (loading || !form) {
    return (
      <Box sx={{ display: 'grid', gap: 2 }}>
        <Skeleton variant="rounded" height={120} />
        <Skeleton variant="rounded" height={220} />
        <Skeleton variant="rounded" height={220} />
      </Box>
    );
  }

  return (
    <>
      <Card
        elevation={0}
        sx={{
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'rgba(35, 165, 193, 0.18)',
        }}
      >
        <CardContent sx={{ p: { xs: 2, md: 3 } }}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              justifyContent: 'space-between',
              alignItems: { xs: 'flex-start', md: 'center' },
              gap: 2,
              mb: 3,
            }}
          >
            <Box>
              <Typography variant="h5" fontWeight={700} color="#0d7f1f">
                Historia clínica
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                La historia se divide por secciones independientes para reducir renders y conservar
                un borrador local mientras editas.
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {!editing ? (
                <Button variant="contained" startIcon={<EditIcon />} onClick={startEditing}>
                  Editar
                </Button>
              ) : (
                <>
                  <Button
                    variant="outlined"
                    color="inherit"
                    startIcon={<CancelIcon />}
                    onClick={cancelEditing}
                    disabled={saving}
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<SaveIcon />}
                    onClick={saveClinicalHistory}
                    disabled={saving || !saveEnabled}
                  >
                    {saving ? 'Guardando...' : 'Guardar'}
                  </Button>
                </>
              )}
            </Box>
          </Box>

          {draftRecovered && (
            <Alert severity="info" sx={{ mb: 2 }}>
              {INFO_ALERT_TEXT}
            </Alert>
          )}

          <Box sx={{ display: 'grid', gap: 2 }}>
            <HereditarySection
              value={form.hereditary_background}
              disabled={!editing || saving}
              onPatch={patchHereditary}
              collapsed={collapsedSections.hereditary}
              onToggle={() => toggleSection('hereditary')}
              fieldVisible={fieldVisible}
            />
            <NonPathologicalSection
              value={form.personal_non_pathological}
              disabled={!editing || saving}
              onPatch={patchNonPathological}
              collapsed={collapsedSections.non_pathological}
              onToggle={() => toggleSection('non_pathological')}
              fieldVisible={fieldVisible}
            />
            <PathologicalSection
              value={form.personal_pathological}
              disabled={!editing || saving}
              onPatch={patchPathological}
              collapsed={collapsedSections.pathological}
              onToggle={() => toggleSection('pathological')}
              fieldVisible={fieldVisible}
            />
            <GynecologicalSection
              value={form.gynecological ?? {}}
              disabled={!editing || saving}
              onPatch={patchGynecological}
              collapsed={collapsedSections.gynecological}
              onToggle={() => toggleSection('gynecological')}
              fieldVisible={fieldVisible}
            />
          </Box>
          {editing ? (
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 1, flexWrap: 'wrap' }}>
              <Button
                variant="outlined"
                color="inherit"
                startIcon={<CancelIcon />}
                onClick={cancelEditing}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={saveClinicalHistory}
                disabled={saving || !saveEnabled}
              >
                {saving ? 'Guardando...' : 'Guardar'}
              </Button>
            </Box>
          ) : null}
          {!editing && !hasVisibleData ? (
            <Alert severity="info" sx={{ mt: 2 }}>
              Aún no hay información registrada en la historia clínica.
            </Alert>
          ) : null}
        </CardContent>
      </Card>

      <Snackbar
        open={message.open}
        autoHideDuration={message.severity === 'error' ? 5000 : 3000}
        onClose={() => setMessage((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          severity={message.severity}
          onClose={() => setMessage((prev) => ({ ...prev, open: false }))}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {message.text}
        </Alert>
      </Snackbar>
    </>
  );
}

export default memo(ClinicalHistoryTabInner);





