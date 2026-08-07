'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Alert from '@mui/material/Alert';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import AppChrome from '@shared/layouts/AppChrome';
import { colors } from '@shared/theme/colors';
import { fetchHouse, createHouse, updateHouse, fetchCasteFacets } from '../api';
import { genderLabel } from '../constants';
import FormActions from './shared/FormActions';

const EMPTY = {
  house_no: '',
  head_name: '',
  area: '',
  mobile: '',
  caste: '',
  subcaste: '',
  total_members: '',
  voter_count: '',
  note: '',
};

/**
 * घर की जानकारी संपादित करें — screen 5. Also used, with `mode="new"`, for
 * "+ नया घर जोड़ें" (screen 2).
 */
export default function HouseFormPage({ houseId, mode = 'edit' }) {
  const router = useRouter();
  const [form, setForm] = useState(EMPTY);
  const [members, setMembers] = useState([]);
  const [influencerCount, setInfluencerCount] = useState(null);
  const [casteOptions, setCasteOptions] = useState([]);
  const [subcasteOptions, setSubcasteOptions] = useState([]);
  const [loading, setLoading] = useState(mode === 'edit');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (mode !== 'edit') return;
    fetchHouse(houseId)
      .then((d) => {
        setForm({
          house_no: d.house.house_no ?? '',
          head_name: d.house.head_name ?? '',
          area: d.house.area ?? '',
          mobile: d.house.mobile ?? '',
          caste: d.house.caste ?? '',
          subcaste: d.house.subcaste ?? '',
          total_members: d.house.total_members ?? d.house.voter_count ?? '',
          voter_count: d.house.voter_count ?? '',
          note: d.house.note ?? '',
        });
        setMembers((d.members ?? []).filter((m) => !m.is_deleted));
        setInfluencerCount(d.influencers?.length ?? 0);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [houseId, mode]);

  // उपजाति choices depend on the जाति picked, so refetch when it changes.
  useEffect(() => {
    fetchCasteFacets(form.caste)
      .then((d) => {
        setCasteOptions(d.castes ?? []);
        setSubcasteOptions(d.subcastes ?? []);
      })
      .catch(() => {});
  }, [form.caste]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  function returnPath(id) {
    return mode === 'edit' ? `/houses/${id}?qa=1` : `/houses/${id}`;
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      if (mode === 'new') {
        const created = await createHouse({
          house_no: form.house_no,
          head_name: form.head_name,
          area: form.area,
          mobile: form.mobile,
          caste: form.caste,
          subcaste: form.subcaste,
          total_members: form.total_members === '' ? null : Number(form.total_members),
          note: form.note,
        });
        router.push(returnPath(created.house.id));
      } else {
        await updateHouse(houseId, {
          house_no: form.house_no,
          head_name: form.head_name,
          mobile: form.mobile,
          area: form.area,
          caste: form.caste,
          subcaste: form.subcaste,
          total_members: form.total_members === '' ? null : Number(form.total_members),
          voter_count: form.voter_count === '' ? 0 : Number(form.voter_count),
          note: form.note,
        });
        router.push(returnPath(houseId));
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  const title = mode === 'new' ? 'नया घर जोड़ें' : 'घर की जानकारी संपादित करें';
  const canSave = form.house_no.trim() && form.head_name.trim() && form.area.trim();

  return (
    <AppChrome title={title}>
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress size={28} />
        </Box>
      ) : (
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ flex: 1, p: 1.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField label="घर संख्या*" value={form.house_no} onChange={set('house_no')} size="small" fullWidth />
            {/* The head is one of the people already on the roll for this house,
                so offer them by name — but a worker correcting a bad roll entry
                still needs to be able to type one in. */}
            {members.length > 0 ? (
              <TextField
                select
                label="परिवार प्रमुख*"
                value={members.some((m) => m.name === form.head_name) ? form.head_name : ''}
                onChange={set('head_name')}
                size="small"
                fullWidth
                helperText={
                  form.head_name && !members.some((m) => m.name === form.head_name)
                    ? `वर्तमान: ${form.head_name} — सूची में नहीं`
                    : ' '
                }
              >
                {members.map((m) => (
                  <MenuItem key={m.id} value={m.name}>
                    {m.name}
                    <Box component="span" sx={{ ml: 1, fontSize: 11.5, color: 'text.secondary' }}>
                      ({genderLabel(m.gender)}{m.age ? `/${m.age}` : ''})
                    </Box>
                  </MenuItem>
                ))}
              </TextField>
            ) : (
              <TextField label="परिवार प्रमुख*" value={form.head_name} onChange={set('head_name')} size="small" fullWidth />
            )}
            <TextField label="पता / मोहल्ला*" value={form.area} onChange={set('area')} size="small" fullWidth multiline minRows={2} />
            <TextField
              label="मोबाइल नंबर*"
              value={form.mobile}
              onChange={(e) => setForm((f) => ({ ...f, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
              size="small"
              fullWidth
              inputProps={{ inputMode: 'numeric' }}
            />
            {/* जाति / उपजाति come from the roll's MAINCAST / SUBCAST values.
                freeSolo because SUBCAST is unpopulated in the roll today — the
                worker has to be able to enter one that isn't on file yet. */}
            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <Autocomplete
                freeSolo
                options={casteOptions}
                value={form.caste || ''}
                onChange={(_, v) => setForm((f) => ({ ...f, caste: v ?? '', subcaste: '' }))}
                onInputChange={(_, v, reason) =>
                  reason === 'input' && setForm((f) => ({ ...f, caste: v }))
                }
                sx={{ flex: 1 }}
                renderInput={(p) => <TextField {...p} label="जाति*" size="small" />}
              />
              <Autocomplete
                freeSolo
                options={subcasteOptions}
                value={form.subcaste || ''}
                onChange={(_, v) => setForm((f) => ({ ...f, subcaste: v ?? '' }))}
                onInputChange={(_, v, reason) =>
                  reason === 'input' && setForm((f) => ({ ...f, subcaste: v }))
                }
                sx={{ flex: 1 }}
                renderInput={(p) => <TextField {...p} label="उपजाति" size="small" />}
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <TextField
                label="कुल सदस्य (परिवार में)"
                value={form.total_members}
                onChange={(e) => setForm((f) => ({ ...f, total_members: e.target.value.replace(/\D/g, '') }))}
                size="small"
                fullWidth
                inputProps={{ inputMode: 'numeric' }}
              />
              <TextField
                label="मतदाताओं की संख्या"
                value={form.voter_count}
                onChange={(e) => setForm((f) => ({ ...f, voter_count: e.target.value.replace(/\D/g, '') }))}
                size="small"
                fullWidth
                inputProps={{ inputMode: 'numeric' }}
                disabled={mode === 'new'}
              />
            </Box>
            <TextField label="नोट (वैकल्पिक)" value={form.note} onChange={set('note')} size="small" fullWidth multiline minRows={2} />

            {/* Screen 5 → screen 6. Read-only count; the list is managed on its
                own screen, so this is a link rather than a field. */}
            {mode === 'edit' && influencerCount !== null && (
              <Paper
                onClick={() => router.push(`/houses/${houseId}/influencers`)}
                variant="outlined"
                sx={{
                  p: 1.25,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  cursor: 'pointer',
                  borderColor: colors.border,
                  '&:hover': { bgcolor: 'rgba(0,0,0,0.02)' },
                }}
              >
                <GroupsOutlinedIcon sx={{ fontSize: 18, color: colors.orange }} />
                <Typography sx={{ fontSize: 12.5, fontWeight: 600, flex: 1 }}>
                  प्रभावशाली व्यक्ति ({influencerCount})
                </Typography>
                <ChevronRightIcon sx={{ color: colors.textMuted, fontSize: 18 }} />
              </Paper>
            )}

            {error && <Alert severity="error">{error}</Alert>}
          </Box>

          <FormActions
            onCancel={() => router.push(mode === 'new' ? '/houses/list' : `/houses/${houseId}?qa=1`)}
            onSave={save}
            saving={saving}
            disabled={!canSave}
          />
        </Box>
      )}
    </AppChrome>
  );
}
