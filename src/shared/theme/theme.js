'use client';

import { createTheme } from '@mui/material/styles';
import { colors } from './colors';

export const theme = createTheme({
  palette: {
    primary: {
      main: colors.orange,
      dark: colors.orangeDark,
      light: colors.orangeLight,
      contrastText: '#ffffff',
    },
    background: { default: colors.pageBg, paper: colors.cardBg },
    text: { primary: colors.text, secondary: colors.textMuted },
  },
  typography: {
    fontFamily:
      '"Noto Sans Devanagari", "Nirmala UI", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    fontSize: 14,
  },
  shape: { borderRadius: 8 },
  components: {
    MuiButton: { defaultProps: { disableElevation: true } },
    MuiPaper: { defaultProps: { elevation: 0 } },
  },
});
