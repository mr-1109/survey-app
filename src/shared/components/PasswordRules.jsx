'use client';

import { useMemo } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import { colors } from '@shared/theme/colors';
import { checkPassword } from '@shared/validation/credentials';

/** Live checklist — ticks each rule as the password satisfies it. */
export default function PasswordRules({ password, sx }) {
  const rules = useMemo(() => checkPassword(password), [password]);

  return (
    <Box sx={{ mt: 1, mb: 0.5, ...sx }}>
      {rules.map((rule) => (
        <Box key={rule.key} sx={{ display: 'flex', alignItems: 'center', gap: 0.75, py: 0.2 }}>
          {rule.ok ? (
            <CheckCircleIcon sx={{ fontSize: 15, color: '#2e7d32' }} />
          ) : (
            <RadioButtonUncheckedIcon sx={{ fontSize: 15, color: colors.textMuted }} />
          )}
          <Typography sx={{ fontSize: 12, color: rule.ok ? '#2e7d32' : colors.textMuted }}>
            {rule.label}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}
