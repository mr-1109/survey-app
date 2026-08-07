'use client';

import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v14-appRouter';
import { theme } from './theme';
import { SettingsProvider } from '@shared/settings/SettingsContext';

/** Emotion cache + MUI theme for the App Router (avoids a flash of unstyled UI). */
export default function ThemeRegistry({ children }) {
  return (
    <AppRouterCacheProvider options={{ key: 'mui' }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <SettingsProvider>{children}</SettingsProvider>
      </ThemeProvider>
    </AppRouterCacheProvider>
  );
}
