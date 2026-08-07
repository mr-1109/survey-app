'use client';

import { createContext, useContext } from 'react';
import { useSettings } from './useSettings';

const SettingsContext = createContext(null);

/** One settings instance for the whole app, so the dialog and the list agree. */
export function SettingsProvider({ children }) {
  return <SettingsContext.Provider value={useSettings()}>{children}</SettingsContext.Provider>;
}

export function useSettingsContext() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettingsContext must be used inside <SettingsProvider>');
  return ctx;
}
