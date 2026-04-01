import { useState } from 'react';
import dayjs, { type Dayjs } from 'dayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import type { SxProps, Theme } from '@mui/material/styles';

type ClickableDateFieldProps = {
  label: string;
  value?: string | null;
  onChange?: (value: string) => void;
  disabled?: boolean;
  fullWidth?: boolean;
  size?: 'small' | 'medium';
  minDate?: string | null;
  helperText?: string;
  sx?: SxProps<Theme>;
};

function toDayjsValue(value?: string | null): Dayjs | null {
  if (!value) return null;
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed : null;
}

export default function ClickableDateField({
  label,
  value,
  onChange,
  disabled = false,
  fullWidth = true,
  size = 'small',
  minDate,
  helperText,
  sx,
}: ClickableDateFieldProps) {
  const [open, setOpen] = useState(false);

  return (
    <DatePicker
      open={open}
      onOpen={() => {
        if (!disabled) {
          setOpen(true);
        }
      }}
      onClose={() => setOpen(false)}
      label={label}
      value={toDayjsValue(value)}
      minDate={toDayjsValue(minDate) ?? undefined}
      onChange={(nextValue) => {
        onChange?.(nextValue && nextValue.isValid() ? nextValue.format('YYYY-MM-DD') : '');
      }}
      disabled={disabled}
      format="DD/MM/YYYY"
      slotProps={{
        textField: {
          fullWidth,
          size,
          helperText,
          onClick: () => {
            if (!disabled) {
              setOpen(true);
            }
          },
          sx,
        },
        openPickerButton: {
          onClick: () => {
            if (!disabled) {
              setOpen(true);
            }
          },
        },
      }}
    />
  );
}
