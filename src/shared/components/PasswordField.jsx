'use client';

import { useState } from 'react';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import TextField from '@mui/material/TextField';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';

/** Password input with its own show/hide toggle. */
export default function PasswordField({ label, value, onChange, error, helperText, autoComplete }) {
  const [shown, setShown] = useState(false);

  return (
    <TextField
      type={shown ? 'text' : 'password'}
      label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      error={error}
      helperText={helperText}
      size="small"
      fullWidth
      autoComplete={autoComplete}
      InputProps={{
        endAdornment: (
          <InputAdornment position="end">
            <IconButton
              onClick={() => setShown((v) => !v)}
              edge="end"
              size="small"
              aria-label={shown ? 'पासवर्ड छिपाएँ' : 'पासवर्ड दिखाएँ'}
              tabIndex={-1}
            >
              {shown ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
            </IconButton>
          </InputAdornment>
        ),
      }}
    />
  );
}
