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
import { patientService } from '../../api/patientService';
import { clinicalHistoryCatalogs } from '../../utils/clinicalHistory';

interface ClinicalHistoryTabProps {
  patientId: number;
}

type MessageState = {
  open: boolean;
  text: string;
  severity: 'success' | 'error' | 'info';
};

type SectionCardProps = {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
};

type SubsectionCardProps = {
  title: string;
  children: React.ReactNode;
};

type FieldProps = {
  label: string;
  value?: string | number;
  disabled?: boolean;
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
};

const INFO_ALERT_TEXT =
  'Se recuperó un borrador local de historia clínica. Puedes continuar editando o cancelar para volver a la versión guardada.';

function getDraftKey(patientId: number) {
  return `clinical-history-draft:${patientId}`;
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

const SectionCard = memo(function SectionCard({ title, icon, children }: SectionCardProps) {
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
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.25,
          px: 2.5,
          py: 1.5,
          borderBottom: '1px solid',
          borderColor: 'rgba(35, 165, 193, 0.12)',
          background: 'linear-gradient(180deg, rgba(35,165,193,0.06) 0%, rgba(35,165,193,0.02) 100%)',
        }}
      >
        <Box sx={{ color: '#1297a8', display: 'flex', alignItems: 'center' }}>{icon}</Box>
        <Typography variant="h6" fontWeight={700} color="#0d7f1f">
          {title}
        </Typography>
      </Box>
      <CardContent sx={{ p: { xs: 2, md: 3 } }}>{children}</CardContent>
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
}: DocumentFieldProps) {
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
  onChange,
  select,
  multiline,
  rows,
  type,
  children,
  xs = 12,
  sm = 6,
}: FieldProps) {
  const isDateField = type === 'date';

  if (disabled) {
    return <DocumentField label={label} value={value ?? ''} xs={xs} sm={sm} />;
  }

  return (
    <Grid size={{ xs, sm }}>
      <TextField
        fullWidth
        size="small"
        label={label}
        value={value ?? ''}
        onChange={(event) => onChange?.(event.target.value)}
        disabled={disabled}
        select={select}
        multiline={multiline}
        rows={rows}
        type={type}
        slotProps={
          isDateField
            ? {
                inputLabel: {
                  shrink: true,
                },
              }
            : undefined
        }
      >
        {children}
      </TextField>
    </Grid>
  );
});

const CheckField = memo(function CheckField({
  label,
  checked,
  value,
  disabled,
  onCheckedChange,
  onValueChange,
  multiline,
  rows,
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
          placeholder="Descripción"
          multiline={multiline}
          rows={rows}
        />
      </Box>
    </Grid>
  );
});

type HereditarySectionProps = {
  value: HereditaryBackground;
  disabled: boolean;
  onPatch: (patch: Partial<HereditaryBackground>) => void;
};

const HereditarySection = memo(function HereditarySection({
  value,
  disabled,
  onPatch,
}: HereditarySectionProps) {
  return (
    <SectionCard title="Antecedentes Heredofamiliares" icon={<FamilyRestroomIcon />}>
      <Grid container spacing={2}>
        <Field
          label="Tipo de sangre / RH"
          value={value.blood_type_rh}
          disabled={disabled}
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
          checked={value.cgdm_checked}
          value={value.cgdm}
          disabled={disabled}
          onCheckedChange={(cgdm_checked) => onPatch({ cgdm_checked })}
          onValueChange={(cgdm) => onPatch({ cgdm })}
        />
        <CheckField
          label="Consanguíneos"
          checked={value.consanguineous_checked}
          value={value.consanguineous}
          disabled={disabled}
          onCheckedChange={(consanguineous_checked) => onPatch({ consanguineous_checked })}
          onValueChange={(consanguineous) => onPatch({ consanguineous })}
        />
        <CheckField
          label="Defectos genéticos"
          checked={value.genetic_defects_checked}
          value={value.genetic_defects}
          disabled={disabled}
          onCheckedChange={(genetic_defects_checked) => onPatch({ genetic_defects_checked })}
          onValueChange={(genetic_defects) => onPatch({ genetic_defects })}
        />
        <CheckField
          label="Preeclampsia familiar"
          checked={value.family_preeclampsia_checked}
          value={value.family_preeclampsia}
          disabled={disabled}
          onCheckedChange={(family_preeclampsia_checked) => onPatch({ family_preeclampsia_checked })}
          onValueChange={(family_preeclampsia) => onPatch({ family_preeclampsia })}
        />
        <Grid size={{ xs: 12 }}>
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
                <Grid size={{ xs: 12, sm: 6 }}>
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
                <Grid size={{ xs: 12, sm: 6 }}>
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
          checked={value.diabetes_checked}
          value={value.diabetes}
          disabled={disabled}
          onCheckedChange={(diabetes_checked) => onPatch({ diabetes_checked })}
          onValueChange={(diabetes) => onPatch({ diabetes })}
        />
        <CheckField
          label="Cáncer"
          checked={value.cancer_checked}
          value={value.cancer}
          disabled={disabled}
          onCheckedChange={(cancer_checked) => onPatch({ cancer_checked })}
          onValueChange={(cancer) => onPatch({ cancer })}
        />
        <CheckField
          label="Hipertensión"
          checked={value.hypertension_checked}
          value={value.hypertension}
          disabled={disabled}
          onCheckedChange={(hypertension_checked) => onPatch({ hypertension_checked })}
          onValueChange={(hypertension) => onPatch({ hypertension })}
        />
        <CheckField
          label="Enfermedad reumática"
          checked={value.rheumatic_disease_checked}
          value={value.rheumatic_disease}
          disabled={disabled}
          onCheckedChange={(rheumatic_disease_checked) => onPatch({ rheumatic_disease_checked })}
          onValueChange={(rheumatic_disease) => onPatch({ rheumatic_disease })}
        />
        <CheckField
          label="Otras"
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
};

const NonPathologicalSection = memo(function NonPathologicalSection({
  value,
  disabled,
  onPatch,
}: NonPathologicalSectionProps) {
  return (
    <SectionCard title="Antecedentes Personales NO Patológicos" icon={<PersonIcon />}>
      <Grid container spacing={2}>
        <Field label="Origen" value={value.origin} disabled={disabled} onChange={(origin) => onPatch({ origin })} />
        <Field label="Residencia" value={value.residence} disabled={disabled} onChange={(residence) => onPatch({ residence })} />
        <Field label="Estado civil" value={value.civil_status} disabled={disabled} onChange={(civil_status) => onPatch({ civil_status })} />
        <Field label="Religión" value={value.religion} disabled={disabled} onChange={(religion) => onPatch({ religion })} />
        <Field label="Escolaridad" value={value.education} disabled={disabled} onChange={(education) => onPatch({ education })} select>
          {clinicalHistoryCatalogs.education.map((item) => (
            <MenuItem key={item} value={item}>
              {item}
            </MenuItem>
          ))}
        </Field>
        <Field label="Ocupación" value={value.occupation} disabled={disabled} onChange={(occupation) => onPatch({ occupation })} />
        <CheckField label="Toxicomanías" checked={value.substance_use_checked} value={value.substance_use} disabled={disabled} onCheckedChange={(substance_use_checked) => onPatch({ substance_use_checked })} onValueChange={(substance_use) => onPatch({ substance_use })} />
        <CheckField label="Fármacos" checked={value.medications_checked} value={value.medications} disabled={disabled} onCheckedChange={(medications_checked) => onPatch({ medications_checked })} onValueChange={(medications) => onPatch({ medications })} />
        <CheckField label="Exposiciones" checked={value.exposures_checked} value={value.exposures} disabled={disabled} onCheckedChange={(exposures_checked) => onPatch({ exposures_checked })} onValueChange={(exposures) => onPatch({ exposures })} />
        <CheckField label="Tabaquismo" checked={value.smoking_checked} value={value.smoking} disabled={disabled} onCheckedChange={(smoking_checked) => onPatch({ smoking_checked })} onValueChange={(smoking) => onPatch({ smoking })} />
        <CheckField label="Alcohol" checked={value.alcohol_checked} value={value.alcohol} disabled={disabled} onCheckedChange={(alcohol_checked) => onPatch({ alcohol_checked })} onValueChange={(alcohol) => onPatch({ alcohol })} />
        <CheckField label="Relaciones homosexuales" checked={value.homosexual_relations_checked} value={value.homosexual_relations} disabled={disabled} onCheckedChange={(homosexual_relations_checked) => onPatch({ homosexual_relations_checked })} onValueChange={(homosexual_relations) => onPatch({ homosexual_relations })} />
        <CheckField label="Ejercicio" checked={value.exercise_checked} value={value.exercise} disabled={disabled} onCheckedChange={(exercise_checked) => onPatch({ exercise_checked })} onValueChange={(exercise) => onPatch({ exercise })} />
        <CheckField label="Otras" checked={value.others_checked} value={value.others} disabled={disabled} onCheckedChange={(others_checked) => onPatch({ others_checked })} onValueChange={(others) => onPatch({ others })} multiline rows={2} />
      </Grid>
    </SectionCard>
  );
});

type PathologicalSectionProps = {
  value: PersonalPathological;
  disabled: boolean;
  onPatch: (patch: Partial<PersonalPathological>) => void;
};

const PathologicalSection = memo(function PathologicalSection({
  value,
  disabled,
  onPatch,
}: PathologicalSectionProps) {
  return (
    <SectionCard title="Antecedentes Personales Patológicos" icon={<BiotechIcon />}>
      <Grid container spacing={2}>
        <Field
          label="Alergias"
          value={value.allergies}
          disabled={disabled}
          onChange={(allergies) => onPatch({ allergies })}
          multiline
          rows={2}
          xs={12}
        />
        <CheckField
          label="Hijo con síndrome de Down"
          checked={value.down_syndrome_child_checked}
          value={value.down_syndrome_child}
          disabled={disabled}
          onCheckedChange={(down_syndrome_child_checked) => onPatch({ down_syndrome_child_checked })}
          onValueChange={(down_syndrome_child) => onPatch({ down_syndrome_child })}
        />
        <CheckField
          label="Enfermedades crónicas"
          checked={value.chronic_diseases_checked}
          value={value.chronic_diseases}
          disabled={disabled}
          onCheckedChange={(chronic_diseases_checked) => onPatch({ chronic_diseases_checked })}
          onValueChange={(chronic_diseases) => onPatch({ chronic_diseases })}
        />
        <CheckField
          label="Cirugías"
          checked={value.surgeries_checked}
          value={value.surgeries}
          disabled={disabled}
          onCheckedChange={(surgeries_checked) => onPatch({ surgeries_checked })}
          onValueChange={(surgeries) => onPatch({ surgeries })}
        />
        <CheckField
          label="Transfusiones"
          checked={value.transfusions_checked}
          value={value.transfusions}
          disabled={disabled}
          onCheckedChange={(transfusions_checked) => onPatch({ transfusions_checked })}
          onValueChange={(transfusions) => onPatch({ transfusions })}
        />
        <CheckField
          label="Fracturas"
          checked={value.fractures_checked}
          value={value.fractures}
          disabled={disabled}
          onCheckedChange={(fractures_checked) => onPatch({ fractures_checked })}
          onValueChange={(fractures) => onPatch({ fractures })}
        />
        <CheckField
          label="Otras"
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
};

const GynecologyPregnancyBlock = memo(function GynecologyPregnancyBlock({
  value,
  disabled,
  onPatch,
}: GynecologicalSectionProps) {
  const isPregnant = Boolean(value.pregnant);

  return (
    <SubsectionCard title="Embarazo y control">
      <Grid container spacing={2}>
        <Field label="Menarca" value={value.menarche} disabled={disabled} onChange={(menarche) => onPatch({ menarche })} />
        <Field label="Ciclos menstruales" value={value.menstrual_cycles} disabled={disabled} onChange={(menstrual_cycles) => onPatch({ menstrual_cycles })} />
        {disabled ? (
          <DocumentField label="Embarazada" value={value.pregnant ? 'Sí' : 'No'} />
        ) : (
          <Grid size={{ xs: 12, sm: 6 }}>
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
        <Field label="FUR" value={value.last_menstruation_date} disabled={disabled} onChange={(last_menstruation_date) => onPatch({ last_menstruation_date })} type="date" />

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
            <Field label="Patología obstétrica" value={value.obstetric_pathology} disabled={disabled} onChange={(obstetric_pathology) => onPatch({ obstetric_pathology })} xs={12} multiline rows={2} />
            <Field label="TA embarazo" value={value.pregnancy_bp} disabled={disabled} onChange={(pregnancy_bp) => onPatch({ pregnancy_bp })} />
            <Field label="Peso embarazo" value={value.pregnancy_weight} disabled={disabled} onChange={(pregnancy_weight) => onPatch({ pregnancy_weight })} />
            <Field label="Talla embarazo" value={value.pregnancy_height} disabled={disabled} onChange={(pregnancy_height) => onPatch({ pregnancy_height })} />
            <CheckField label="Donación de óvulos" checked={value.ovum_donation_checked} value={value.pregnancy_notes} disabled={disabled} onCheckedChange={(ovum_donation_checked) => onPatch({ ovum_donation_checked })} onValueChange={(pregnancy_notes) => onPatch({ pregnancy_notes })} multiline rows={2} />
            <Field label="Fecha nacimiento donador" value={value.ovum_donor_birth_date} disabled={disabled || !value.ovum_donation_checked} onChange={(ovum_donor_birth_date) => onPatch({ ovum_donor_birth_date })} type="date" />
            <Field label="Edad donador" value={value.ovum_donor_age} disabled={disabled || !value.ovum_donation_checked} onChange={(ovum_donor_age) => onPatch({ ovum_donor_age })} />
            <CheckField label="Control prenatal" checked={value.prenatal_care_checked} value={value.prenatal_care} disabled={disabled} onCheckedChange={(prenatal_care_checked) => onPatch({ prenatal_care_checked })} onValueChange={(prenatal_care) => onPatch({ prenatal_care })} />
          </>
        )}
      </Grid>
    </SubsectionCard>
  );
});

type GynecologyUltrasoundsBlockProps = {
  value: GynecologicalBackground;
  disabled: boolean;
  onPatch: (patch: Partial<GynecologicalBackground>) => void;
  ultrasoundRows: readonly [1, 2, 3, 4, 5];
};

const GynecologyUltrasoundsBlock = memo(function GynecologyUltrasoundsBlock({
  value,
  disabled,
  onPatch,
  ultrasoundRows,
}: GynecologyUltrasoundsBlockProps) {
  if (disabled) {
    const enabledUltrasounds = ultrasoundRows.filter((index) => Boolean(value[`ultrasound${index}_checked` as const]));

    return (
      <SubsectionCard title="Ultrasonidos">
        {enabledUltrasounds.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No hay ultrasonidos registrados.
          </Typography>
        ) : (
          <Grid container spacing={2}>
            {enabledUltrasounds.map((index) => {
              const dateKey = `ultrasound${index}_date` as const;
              const weeksKey = `ultrasound${index}_weeks` as const;
              const daysKey = `ultrasound${index}_days` as const;
              const notesKey = `ultrasound${index}_notes` as const;

              return (
                <Grid key={index} size={{ xs: 12 }}>
                  <Box
                    sx={{
                      border: '1px solid',
                      borderColor: 'rgba(35, 165, 193, 0.12)',
                      borderRadius: 2,
                      p: 2,
                    }}
                  >
                    <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 700, color: '#177b26' }}>
                      Ultrasonido {index}
                    </Typography>
                    <Grid container spacing={2}>
                      <DocumentField label="Fecha" value={String(value[dateKey] ?? '')} />
                      <DocumentField label="Semanas" value={String(value[weeksKey] ?? '')} />
                      <DocumentField label="Días" value={String(value[daysKey] ?? '')} />
                      <DocumentField label="Notas" value={String(value[notesKey] ?? '')} xs={12} sm={12} />
                    </Grid>
                  </Box>
                </Grid>
              );
            })}
          </Grid>
        )}
      </SubsectionCard>
    );
  }

  return (
    <SubsectionCard title="Ultrasonidos">
      <Grid container spacing={2}>
        {ultrasoundRows.map((index) => {
          const checkedKey = `ultrasound${index}_checked` as const;
          const dateKey = `ultrasound${index}_date` as const;
          const weeksKey = `ultrasound${index}_weeks` as const;
          const daysKey = `ultrasound${index}_days` as const;
          const notesKey = `ultrasound${index}_notes` as const;
          const enabled = Boolean(value[checkedKey]);

          return (
            <Grid key={index} size={{ xs: 12 }}>
              <Box
                sx={{
                  border: '1px solid',
                  borderColor: 'rgba(35, 165, 193, 0.12)',
                  borderRadius: 2,
                  p: 2,
                }}
              >
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={enabled}
                      onChange={(event) => onPatch({ [checkedKey]: event.target.checked } as Partial<GynecologicalBackground>)}
                      disabled={disabled}
                    />
                  }
                  label={`Ultrasonido ${index}`}
                  sx={{ mb: 1 }}
                />
                <Grid container spacing={2}>
                  <Field label="Fecha" value={String(value[dateKey] ?? '')} disabled={disabled || !enabled} onChange={(next) => onPatch({ [dateKey]: next } as Partial<GynecologicalBackground>)} type="date" />
                  <Field label="Semanas" value={String(value[weeksKey] ?? '')} disabled={disabled || !enabled} onChange={(next) => onPatch({ [weeksKey]: next } as Partial<GynecologicalBackground>)} />
                  <Field label="Días" value={String(value[daysKey] ?? '')} disabled={disabled || !enabled} onChange={(next) => onPatch({ [daysKey]: next } as Partial<GynecologicalBackground>)} />
                  <Field label="Notas" value={String(value[notesKey] ?? '')} disabled={disabled || !enabled} onChange={(next) => onPatch({ [notesKey]: next } as Partial<GynecologicalBackground>)} multiline rows={2} xs={12} />
                </Grid>
              </Box>
            </Grid>
          );
        })}
      </Grid>
    </SubsectionCard>
  );
});

const GynecologySexualBlock = memo(function GynecologySexualBlock({
  value,
  disabled,
  onPatch,
}: GynecologicalSectionProps) {
  return (
    <SubsectionCard title="Vida sexual y antecedentes gineco-obstétricos">
      <Grid container spacing={2}>
        <Field label="IVSA" value={value.ivsa} disabled={disabled} onChange={(ivsa) => onPatch({ ivsa })} />
        <Field label="Parejas sexuales" value={value.sexual_partners} disabled={disabled} onChange={(sexual_partners) => onPatch({ sexual_partners })} />
        <CheckField label="ETS" checked={value.std_checked} value={value.std} disabled={disabled} onCheckedChange={(std_checked) => onPatch({ std_checked })} onValueChange={(std) => onPatch({ std })} />
        <Field label="Citología" value={value.cytology} disabled={disabled} onChange={(cytology) => onPatch({ cytology })} />
        <Field label="Planificación familiar" value={value.family_planning} disabled={disabled} onChange={(family_planning) => onPatch({ family_planning })} />
        <CheckField label="Gestaciones" checked={value.gestations_checked} value={value.gestations} disabled={disabled} onCheckedChange={(gestations_checked) => onPatch({ gestations_checked })} onValueChange={(gestations) => onPatch({ gestations })} />
        <Field label="Fecha última gestación" value={value.last_gestation_date} disabled={disabled} onChange={(last_gestation_date) => onPatch({ last_gestation_date })} type="date" />
        <Field label="Partos" value={value.deliveries} disabled={disabled} onChange={(deliveries) => onPatch({ deliveries })} />
        <Field label="Cesáreas" value={value.cesareans} disabled={disabled} onChange={(cesareans) => onPatch({ cesareans })} />
        <Field label="Abortos" value={value.abortions} disabled={disabled} onChange={(abortions) => onPatch({ abortions })} />
        <Field label="Embarazo ectópico" value={value.ectopic} disabled={disabled} onChange={(ectopic) => onPatch({ ectopic })} />
        <Field label="Embarazo molar" value={value.molar} disabled={disabled} onChange={(molar) => onPatch({ molar })} />
        <Field label="Edad de menopausia" value={value.menopause_age} disabled={disabled} onChange={(menopause_age) => onPatch({ menopause_age })} />
        <CheckField label="Síntomas climatéricos" checked={value.climacteric_symptoms_checked} value={value.climacteric_symptoms} disabled={disabled} onCheckedChange={(climacteric_symptoms_checked) => onPatch({ climacteric_symptoms_checked })} onValueChange={(climacteric_symptoms) => onPatch({ climacteric_symptoms })} />
      </Grid>
    </SubsectionCard>
  );
});

const GynecologicalSection = memo(function GynecologicalSection({
  value,
  disabled,
  onPatch,
}: GynecologicalSectionProps) {
  const ultrasoundRows = useMemo(() => ([1, 2, 3, 4, 5] as const), []);

  return (
    <SectionCard title="Antecedentes Ginecológicos" icon={<PregnantWomanIcon />}>
      <Box sx={{ display: 'grid', gap: 2 }}>
        <GynecologyPregnancyBlock value={value} disabled={disabled} onPatch={onPatch} />
        <GynecologyUltrasoundsBlock
          value={value}
          disabled={disabled}
          onPatch={onPatch}
          ultrasoundRows={ultrasoundRows}
        />
        <GynecologySexualBlock value={value} disabled={disabled} onPatch={onPatch} />
      </Box>
    </SectionCard>
  );
});

function ClinicalHistoryTabInner({ patientId }: ClinicalHistoryTabProps) {
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
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
        const history = await patientService.getClinicalHistory(patientId);
        if (cancelled) return;

        const draft = safeReadDraft(patientId);
        const initialForm = draft ?? history;

        setClinicalHistory(history);
        setForm(initialForm);
        setEditing(Boolean(draft));
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

  const patchHereditary = useCallback((patch: Partial<HereditaryBackground>) => {
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
    setEditing(true);
  }, []);

  const cancelEditing = useCallback(() => {
    if (clinicalHistory) {
      setForm(clinicalHistory);
    }
    setEditing(false);
    setDraftRecovered(false);
    clearDraft(patientId);
  }, [clinicalHistory, patientId]);

  const saveClinicalHistory = useCallback(async () => {
    if (!form) return;

    try {
      setSaving(true);
      const saved = await patientService.updateClinicalHistory(patientId, form);
      setClinicalHistory(saved);
      setForm(saved);
      setEditing(false);
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
                    disabled={saving}
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
            />
            <NonPathologicalSection
              value={form.personal_non_pathological}
              disabled={!editing || saving}
              onPatch={patchNonPathological}
            />
            <PathologicalSection
              value={form.personal_pathological}
              disabled={!editing || saving}
              onPatch={patchPathological}
            />
            <GynecologicalSection
              value={form.gynecological ?? {}}
              disabled={!editing || saving}
              onPatch={patchGynecological}
            />
          </Box>
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
