'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import TextField from '@mui/material/TextField';
import AppChrome from '@shared/layouts/AppChrome';
import { fetchHouse, addInfluencer, updateInfluencer } from '../api';
import FormActions from './shared/FormActions';
import LimitedTextarea from './shared/LimitedTextarea';

const EMPTY = { name: '', party: '', position: '', mobile: '', address: '', description: '' };

/** प्रभावशाली व्यक्ति जोड़ें / संपादित करें — screen 7. */
export default function InfluencerForm({ houseId, influencerId }) {
  const router = useRouter();
  const isEdit = Boolean(influencerId);
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchHouse(houseId)
      .then((d) => {
        if (!isEdit) {
          setForm((f) => ({ ...f, address: d.house.area ?? '' }));
          return;
        }
        const found = d.influencers?.find((p) => p.id === influencerId);
        if (found) {
          setForm({
            name: found.name ?? '',
            party: found.party ?? '',
            position: found.position ?? '',
            mobile: found.mobile ?? '',
            address: found.address ?? '',
            description: found.description ?? '',
          });
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [houseId, influencerId, isEdit]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  // Hard rule (GHAR_SURVEY_PLAN.md §0.2): this flow's save always returns to
  // screen 4 (त्वरित कार्य), not back to the influencer list.
  async function save() {
    setSaving(true);
    setError(null);
    try {
      if (isEdit) {
        await updateInfluencer(influencerId, form);
      } else {
        await addInfluencer(houseId, form);
      }
      router.push(`/houses/${houseId}?qa=1`);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  const canSave = form.name.trim() && form.party.trim() && form.description.trim();

  return (
    <AppChrome title="प्रभावशाली व्यक्ति जोड़ें / संपादित करें">
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress size={28} />
        </Box>
      ) : (
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ flex: 1, p: 1.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField label="व्यक्ति का नाम*" value={form.name} onChange={set('name')} size="small" fullWidth />
            <TextField label="पार्टी / विचारधारा*" value={form.party} onChange={set('party')} size="small" fullWidth />
            <TextField label="पद / पहचान" value={form.position} onChange={set('position')} size="small" fullWidth />
            <TextField
              label="मोबाइल नंबर"
              value={form.mobile}
              onChange={(e) => setForm((f) => ({ ...f, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
              size="small"
              fullWidth
              inputProps={{ inputMode: 'numeric' }}
            />
            <TextField label="पता" value={form.address} onChange={set('address')} size="small" fullWidth multiline minRows={2} />
            <LimitedTextarea
              label="प्रभाव / विशेष विवरण*"
              value={form.description}
              onChange={(v) => setForm((f) => ({ ...f, description: v }))}
              minRows={3}
            />

            {error && <Alert severity="error">{error}</Alert>}
          </Box>

          <FormActions
            onCancel={() => router.push(`/houses/${houseId}/influencers`)}
            onSave={save}
            saving={saving}
            disabled={!canSave}
          />
        </Box>
      )}
    </AppChrome>
  );
}
