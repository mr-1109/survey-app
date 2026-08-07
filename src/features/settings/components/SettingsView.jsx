'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1';
import AppChrome from '@shared/layouts/AppChrome';
import ProfilePanel from '@shared/layouts/ProfilePanel';

export default function SettingsView() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    setError(null);
    fetch('/api/profile')
      .then((r) => r.json())
      .then((d) => (d.error ? setError(d.error) : setProfile(d)))
      .catch((e) => setError(e.message));
  }, []);

  useEffect(load, [load]);

  return (
    <AppChrome
      title="सेटिंग्स"
      actions={
        <IconButton
          onClick={() => router.push('/users')}
          sx={{ color: '#fff' }}
          aria-label="उपयोगकर्ता जोड़ें"
        >
          <PersonAddAlt1Icon />
        </IconButton>
      }
    >
      <Box sx={{ flex: 1, p: 1.5 }}>
        <ProfilePanel data={profile} error={error} onChanged={load} />
      </Box>
    </AppChrome>
  );
}
