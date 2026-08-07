'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import AppChrome from '@shared/layouts/AppChrome';
import { fetchHouse, addMember, updateMember } from '../api';
import { GENDER_OPTIONS, MARITAL_STATUS_OPTIONS } from '../constants';
import FormActions from './shared/FormActions';

const EMPTY = {
  name: '',
  gender: '',
  age: '',
  relative_name: '',
  marital_status: '',
  mobile: '',
  education: '',
  epic: '',
};

/**
 * नया सदस्य जोड़ें (screen 11) / सदस्य संपादित करें (screen 12) — same fields,
 * both save flows return to screen 4 (त्वरित कार्य) per the hard rule.
 */
export default function MemberForm({ houseId, memberId }) {
  const router = useRouter();
  const isEdit = Boolean(memberId);
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isEdit) return;
    fetchHouse(houseId)
      .then((d) => {
        const m = d.members.find((x) => x.id === memberId);
        if (m) {
          setForm({
            name: m.name ?? '',
            gender: m.gender ?? '',
            age: m.age ?? '',
            relative_name: m.relative_name ?? '',
            marital_status: m.marital_status ?? '',
            mobile: m.mobile ?? '',
            education: m.education ?? '',
            epic: m.epic ?? '',
          });
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [houseId, memberId, isEdit]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const payload = { ...form, age: form.age === '' ? null : Number(form.age), relation: 'father' };
      if (isEdit) {
        await updateMember(memberId, payload);
      } else {
        await addMember(houseId, payload);
      }
      router.push(`/houses/${houseId}?qa=1`);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  const canSave = form.name.trim().length >= 2 && form.gender && form.age !== '' && form.relative_name.trim();

  return (
    <AppChrome title={isEdit ? 'सदस्य संपादित करें' : 'नया सदस्य जोड़ें'}>
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress size={28} />
        </Box>
      ) : (
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ flex: 1, p: 1.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField label="नाम*" value={form.name} onChange={set('name')} size="small" fullWidth />
            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <TextField select label="लिंग*" value={form.gender} onChange={set('gender')} size="small" sx={{ flex: 1 }}>
                <MenuItem value="">—</MenuItem>
                {GENDER_OPTIONS.map((g) => (
                  <MenuItem key={g.value} value={g.value}>{g.label}</MenuItem>
                ))}
              </TextField>
              <TextField
                label="आयु*"
                value={form.age}
                onChange={(e) => setForm((f) => ({ ...f, age: e.target.value.replace(/\D/g, '') }))}
                size="small"
                sx={{ width: 100 }}
                inputProps={{ inputMode: 'numeric' }}
              />
            </Box>
            <TextField label="पिता / पति का नाम*" value={form.relative_name} onChange={set('relative_name')} size="small" fullWidth />
            <TextField select label="वैवाहिक स्थिति" value={form.marital_status} onChange={set('marital_status')} size="small" fullWidth>
              <MenuItem value="">—</MenuItem>
              {MARITAL_STATUS_OPTIONS.map((o) => (
                <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
              ))}
            </TextField>
            <TextField
              label="मोबाइल नंबर"
              value={form.mobile}
              onChange={(e) => setForm((f) => ({ ...f, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
              size="small"
              fullWidth
              inputProps={{ inputMode: 'numeric' }}
            />
            <TextField label="शिक्षा" value={form.education} onChange={set('education')} size="small" fullWidth />
            <TextField label="मतदाता ID (यदि हो)" value={form.epic} onChange={set('epic')} size="small" fullWidth />

            {error && <Alert severity="error">{error}</Alert>}
          </Box>

          <FormActions
            onCancel={() => router.push(`/houses/${houseId}/members`)}
            onSave={save}
            saving={saving}
            disabled={!canSave}
          />
        </Box>
      )}
    </AppChrome>
  );
}
