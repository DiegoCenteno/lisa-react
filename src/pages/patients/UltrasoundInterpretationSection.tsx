import { memo, startTransition, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Box,
  Checkbox,
  Divider,
  FormControlLabel,
  Grid,
  TextField,
  Typography,
} from '@mui/material';
import dayjs, { type Dayjs } from 'dayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

export interface UltrasoundInterpretationItemValue {
  enabled: boolean;
  study_date: string;
  fetometry_weeks: string;
  fetometry_days: string;
  notes: string;
}

type SectionTitleProps = {
  title: string;
  description?: string;
  showHeader?: boolean;
};

type SectionCardProps = {
  background: string;
  children: ReactNode;
};

type DisplayFieldProps = {
  label: string;
  value?: string | number | null;
  xs?: number;
  sm?: number;
};

type UltrasoundInterpretationSectionProps = {
  items: UltrasoundInterpretationItemValue[];
  onChange: (index: number, field: keyof UltrasoundInterpretationItemValue, value: string | boolean) => void;
  title?: string;
  description?: string;
  showHeader?: boolean;
};

type UltrasoundInterpretationDisplayProps = {
  items: UltrasoundInterpretationItemValue[];
  title?: string;
  emptyText?: string;
  showHeader?: boolean;
};

function formatDateDisplay(date: Date) {
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

function getWeekdayLabel(date: Date) {
  return new Intl.DateTimeFormat('es-MX', {
    weekday: 'long',
  }).format(date);
}

function toDayjsValue(value: string | null | undefined): Dayjs | null {
  if (!value) return null;
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed : null;
}

export function calculateInterpretationDerivedValues(
  studyDate: string,
  weeks: string,
  days: string
): {
  fum: string;
  fumDay: string;
  sdga: string;
  sdgaLabel: string;
  fpp: string;
  fppDay: string;
} | null {
  if (!studyDate || !weeks) {
    return null;
  }

  const parsedWeeks = Number(weeks);
  const parsedDays = Number(days || 0);
  if (Number.isNaN(parsedWeeks) || Number.isNaN(parsedDays)) {
    return null;
  }

  const ultraDate = new Date(`${studyDate}T00:00:00`);
  if (Number.isNaN(ultraDate.getTime())) {
    return null;
  }

  const fumDate = new Date(ultraDate);
  fumDate.setDate(fumDate.getDate() - ((parsedWeeks * 7) + parsedDays));

  const now = new Date();
  const msPerDay = 1000 * 60 * 60 * 24;
  const diffDays = Math.abs(now.getTime() - fumDate.getTime()) / msPerDay;
  const sdga = Math.round((diffDays / 7) * 10) / 10;
  const sdgaWeeks = Math.floor(sdga);
  const sdgaDays = Math.round((sdga - sdgaWeeks) * 7);

  const fppDate = new Date(fumDate);
  fppDate.setDate(fppDate.getDate() + 280);

  return {
    fum: formatDateDisplay(fumDate),
    fumDay: getWeekdayLabel(fumDate),
    sdga: String(sdga),
    sdgaLabel: `${sdgaWeeks} semanas ${sdgaDays} días`,
    fpp: formatDateDisplay(fppDate),
    fppDay: getWeekdayLabel(fppDate),
  };
}

function SectionTitle({ title, description }: SectionTitleProps) {
  return (
    <Box>
      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
        {title}
      </Typography>
      {description ? (
        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
          {description}
        </Typography>
      ) : null}
    </Box>
  );
}

function SectionCard({ background, children }: SectionCardProps) {
  return (
    <Box
      sx={{
        background,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        p: 2,
      }}
    >
      {children}
    </Box>
  );
}

function hasDisplayValue(value?: string | number | null) {
  if (value === null || value === undefined) return false;
  if (typeof value === 'number') return true;
  return value.trim().length > 0;
}

function DisplayField({ label, value, xs = 12, sm = 6 }: DisplayFieldProps) {
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
}

type InterpretationItemCardProps = {
  index: number;
  item: UltrasoundInterpretationItemValue;
  onChange: (index: number, field: keyof UltrasoundInterpretationItemValue, value: string | boolean) => void;
};

const InterpretationItemCard = memo(function InterpretationItemCard({
  index,
  item,
  onChange,
}: InterpretationItemCardProps) {
  const [studyDateDraft, setStudyDateDraft] = useState(item.study_date);
  const [fetometryWeeksDraft, setFetometryWeeksDraft] = useState(item.fetometry_weeks);
  const [fetometryDaysDraft, setFetometryDaysDraft] = useState(item.fetometry_days);
  const [notesDraft, setNotesDraft] = useState(item.notes);

  useEffect(() => {
    setStudyDateDraft(item.study_date);
  }, [item.study_date]);

  useEffect(() => {
    setFetometryWeeksDraft(item.fetometry_weeks);
  }, [item.fetometry_weeks]);

  useEffect(() => {
    setFetometryDaysDraft(item.fetometry_days);
  }, [item.fetometry_days]);

  useEffect(() => {
    setNotesDraft(item.notes);
  }, [item.notes]);

  const derived = useMemo(
    () =>
      calculateInterpretationDerivedValues(
        studyDateDraft,
        fetometryWeeksDraft,
        fetometryDaysDraft
      ),
    [studyDateDraft, fetometryWeeksDraft, fetometryDaysDraft]
  );

  const handleFieldChange = useCallback(
    (field: keyof UltrasoundInterpretationItemValue, value: string | boolean) => {
      onChange(index, field, value);
    },
    [index, onChange]
  );

  const handleImmediateChange = useCallback(
    (field: 'study_date' | 'fetometry_weeks' | 'fetometry_days', value: string) => {
      if (field === 'study_date') setStudyDateDraft(value);
      if (field === 'fetometry_weeks') setFetometryWeeksDraft(value);
      if (field === 'fetometry_days') setFetometryDaysDraft(value);

      startTransition(() => {
        handleFieldChange(field, value);
      });
    },
    [handleFieldChange]
  );

  const commitNotesIfNeeded = useCallback(() => {
    if (notesDraft !== item.notes) {
      handleFieldChange('notes', notesDraft);
    }
  }, [handleFieldChange, item.notes, notesDraft]);

  return (
    <Box
      sx={{
        px: { xs: 1.5, md: 1.75 },
        py: 1.5,
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'rgba(35, 165, 193, 0.12)',
        backgroundColor: 'rgba(255,255,255,0.72)',
      }}
    >
      <FormControlLabel
        control={
          <Checkbox
            checked={item.enabled}
            onChange={(event) => handleFieldChange('enabled', event.target.checked)}
          />
        }
        label={`Ultrasonido ${index + 1}`}
        sx={{ mb: item.enabled ? 1.5 : 0 }}
      />
      {item.enabled && (
        <>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(165px, 1fr))',
              gap: 0.75,
              alignItems: 'start',
              '@media (min-width:1000px)': {
                gridTemplateColumns:
                  'minmax(190px, 1.35fr) minmax(100px, 0.7fr) minmax(100px, 0.7fr) minmax(190px, 1fr) minmax(190px, 1fr)',
              },
            }}
          >
            <DatePicker
              label="Fecha US"
              value={toDayjsValue(studyDateDraft)}
              onChange={(value) =>
                handleImmediateChange('study_date', value && value.isValid() ? value.format('YYYY-MM-DD') : '')
              }
              format="DD/MM/YYYY"
              slotProps={{
                textField: {
                  size: 'small',
                  fullWidth: true,
                  helperText: derived ? `FUM: ${derived.fumDay}, ${derived.fum}` : ' ',
                  sx: { '& .MuiInputBase-root': { minHeight: 44 } },
                },
              }}
            />
            <TextField
              size="small"
              label="Fetometría"
              value={fetometryWeeksDraft}
              onChange={(event) => handleImmediateChange('fetometry_weeks', event.target.value)}
              placeholder="semanas"
              fullWidth
              helperText="semanas"
              sx={{ '& .MuiInputBase-root': { minHeight: 44 }, '& .MuiInputBase-input': { px: 0.5 } }}
            />
            <TextField
              size="small"
              label="Fetometría"
              value={fetometryDaysDraft}
              onChange={(event) => handleImmediateChange('fetometry_days', event.target.value)}
              placeholder="días"
              fullWidth
              helperText="días"
              sx={{ '& .MuiInputBase-root': { minHeight: 44 }, '& .MuiInputBase-input': { px: 0.5 } }}
            />
            <TextField
              size="small"
              label="SDG por amenorrea"
              value={derived?.sdga ?? ''}
              InputProps={{ readOnly: true }}
              fullWidth
              helperText={derived?.sdgaLabel ?? ' '}
              sx={{ '& .MuiInputBase-root': { minHeight: 44 } }}
            />
            <TextField
              size="small"
              label="FPP por amenorrea"
              value={derived?.fpp ?? ''}
              InputProps={{ readOnly: true }}
              fullWidth
              helperText={derived?.fppDay ?? ' '}
              sx={{ '& .MuiInputBase-root': { minHeight: 44 } }}
            />
          </Box>
          <TextField
            size="small"
            label={`Anotaciones adicionales US-${index + 1}`}
            value={notesDraft}
            onChange={(event) => setNotesDraft(event.target.value)}
            onBlur={commitNotesIfNeeded}
            fullWidth
            multiline
            minRows={2}
            sx={{ mt: 1.5 }}
          />
        </>
      )}
    </Box>
  );
});

export const UltrasoundInterpretationSection = memo(function UltrasoundInterpretationSection({
  items,
  onChange,
  title = '4. Interpretación de ultrasonidos',
  description = 'Se mantienen 5 bloques como en legacy para registrar estudios previos y sus cálculos derivados.',
  showHeader = true,
}: UltrasoundInterpretationSectionProps) {
  return (
    <>
      {showHeader ? (
        <>
          <Divider />
          <SectionTitle title={title} description={description} />
        </>
      ) : null}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {items.map((item, index) => (
          <InterpretationItemCard key={index} index={index} item={item} onChange={onChange} />
        ))}
      </Box>
    </>
  );
});

export const UltrasoundInterpretationDisplay = memo(function UltrasoundInterpretationDisplay({
  items,
  title = '4. Interpretación de ultrasonidos',
  emptyText = 'No se incluyeron ultrasonidos previos.',
  showHeader = true,
}: UltrasoundInterpretationDisplayProps) {
  const visibleInterpretations = useMemo(
    () => items.map((item, index) => ({ item, index })).filter(({ item }) => item.enabled),
    [items]
  );

  return (
    <SectionCard background="transparent">
      {showHeader ? (
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 700, color: '#0d7f1f' }}>
          {title}
        </Typography>
      ) : null}
      {visibleInterpretations.length === 0 ? (
        <Typography variant="body1" sx={{ color: 'text.secondary' }}>
          {emptyText}
        </Typography>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {visibleInterpretations.map(({ item, index }) => {
            const derived = calculateInterpretationDerivedValues(
              item.study_date,
              item.fetometry_weeks,
              item.fetometry_days
            );

            return (
              <Box
                key={index}
                sx={{
                  border: '1px solid',
                  borderColor: 'rgba(35, 165, 193, 0.12)',
                  borderRadius: 2,
                  p: 2,
                }}
              >
                <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 700, color: '#177b26' }}>
                  Ultrasonido {index + 1}
                </Typography>
                <Grid container spacing={3}>
                  <DisplayField
                    label="Fecha US"
                    value={derived ? item.study_date && formatDateDisplay(new Date(`${item.study_date}T00:00:00`)) : ''}
                  />
                  <DisplayField label="Fetometría semanas" value={item.fetometry_weeks} />
                  <DisplayField label="Fetometría días" value={item.fetometry_days} />
                  <DisplayField label="FUM" value={derived?.fum} />
                  <DisplayField label="SDG por amenorrea" value={derived?.sdgaLabel || derived?.sdga} />
                  <DisplayField label="FPP por amenorrea" value={derived?.fpp} />
                  <DisplayField label="Anotaciones adicionales" value={item.notes} xs={12} sm={12} />
                </Grid>
              </Box>
            );
          })}
        </Box>
      )}
    </SectionCard>
  );
});

