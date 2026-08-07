'use client';

import { useCallback, useEffect, useState } from 'react';

const PAGE_SIZE = 25;

const STORAGE_KEY = 'callList.settings';

export const DEFAULT_SETTINGS = {
  pageSize: PAGE_SIZE, // rows per "और देखें" page
  defaultBhag: 1, // booth the app opens on
};

function read() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

/**
 * Settings kept on the device — there is no user table to hang them off.
 * Hydrates after mount so the server and first client render agree.
 */
export function useSettings() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setSettings(read());
    setLoaded(true);
  }, []);

  const save = useCallback((patch) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Private mode / storage full — keep the in-memory value anyway.
      }
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    setSettings(DEFAULT_SETTINGS);
  }, []);

  return { settings, loaded, save, reset };
}
