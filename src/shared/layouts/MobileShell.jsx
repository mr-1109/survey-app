'use client';

import Box from '@mui/material/Box';
import { colors } from '@shared/theme/colors';

/**
 * Phone-shaped frame. Designed at 375×812; on wider screens the content stays
 * centred at a phone width instead of stretching.
 */
export default function MobileShell({ children, wide = false, bgcolor }) {
  const background = bgcolor ?? colors.pageBg;
  return (
    <Box
      sx={{
        minHeight: '100dvh',
        bgcolor: background,
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <Box
        sx={{
          width: '100%',
          // Survey & Feedback is a desktop-width dashboard; everything else
          // stays phone-width.
          maxWidth: wide ? 1400 : 480,
          minHeight: '100dvh',
          bgcolor: background,
          boxShadow: wide ? 'none' : { xs: 'none', sm: '0 0 24px rgba(0,0,0,0.08)' },
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
