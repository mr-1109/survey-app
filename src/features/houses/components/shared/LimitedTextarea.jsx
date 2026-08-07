'use client';

import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { colors } from '@shared/theme/colors';

const MAX = 250;

/** Textarea with the "अक्षर संख्या: n / 250" footer used on screens 7, 8, 9. */
export default function LimitedTextarea({ label, value, onChange, minRows = 3, max = MAX, placeholder }) {
  return (
    <Box>
      <TextField
        label={label}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, max))}
        size="small"
        fullWidth
        multiline
        minRows={minRows}
      />
      <Typography sx={{ fontSize: 11, color: colors.textMuted, textAlign: 'right', mt: 0.25 }}>
        अक्षर संख्या: {value?.length ?? 0} / {max}
      </Typography>
    </Box>
  );
}
