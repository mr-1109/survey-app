'use client';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { colors } from '@shared/theme/colors';

/** 1 → 2 → 3 → 4 stepper used on screens 8, 9, 13. */
export default function StepIndicator({ total = 4, current }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, py: 1.25 }}>
      {Array.from({ length: total }, (_, i) => i + 1).map((n, i) => (
        <Box key={n} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box
            sx={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              display: 'grid',
              placeItems: 'center',
              fontSize: 12,
              fontWeight: 700,
              bgcolor: n <= current ? colors.orange : colors.orangeTint,
              color: n <= current ? '#fff' : colors.textMuted,
            }}
          >
            {n}
          </Box>
          {i < total - 1 && (
            <Typography sx={{ color: colors.textMuted, fontSize: 12 }}>→</Typography>
          )}
        </Box>
      ))}
    </Box>
  );
}
