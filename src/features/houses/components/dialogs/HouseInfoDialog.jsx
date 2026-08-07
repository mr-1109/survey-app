'use client';

import { useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import CloseIcon from '@mui/icons-material/Close';
import { colors } from '@shared/theme/colors';
import { updateHouse, fetchCasteFacets } from '../../api';
import { genderLabel } from '../../constants';

export default function HouseInfoDialog({ open, onClose, onSaved, houseId, house, members }) {
  const [form, setForm] = useState(null);
  const [casteOptions, setCasteOptions] = useState([]);
  const [subcasteOptions, setSubcasteOptions] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Seed form from props whenever dialog opens
  useEffect(() => {
    if (!open || !house) return;
    setForm({
      house_no:      house.house_no ?? '',
      head_name:     house.head_name ?? '',
      area:          house.area ?? '',
      mobile:        house.mobile ?? '',
      caste:         house.caste ?? '',
      subcaste:      house.subcaste ?? '',
      total_members: house.total_members ?? house.voter_count ?? '',
      voter_count:   house.voter_count ?? '',
      note:          house.note ?? '',
    });
    setError(null);
  }, [open, house]);

  useEffect(() => {
    if (!form?.caste && form?.caste !== '') return;
    fetchCasteFacets(form.caste)
      .then((d) => {
        setCasteOptions(d.castes ?? []);
        setSubcasteOptions(d.subcastes ?? []);
      })
      .catch(() => {});
  }, [form?.caste]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const activeMembers = (members ?? []).filter((m) => !m.is_deleted);
  const canSave = form?.house_no?.trim() && form?.head_name?.trim() && form?.area?.trim();

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await updateHouse(houseId, {
        house_no:      form.house_no,
        head_name:     form.head_name,
        mobile:        form.mobile,
        area:          form.area,
        caste:         form.caste,
        subcaste:      form.subcaste,
        total_members: form.total_members === '' ? null : Number(form.total_members),
        voter_count:   form.voter_count === '' ? 0 : Number(form.voter_count),
        note:          form.note,
      });
      onSaved();
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" scroll="paper">
      <DialogTitle sx={{ fontSize: 15, fontWeight: 700, color: colors.orange, display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        घर की जानकारी संपादित करें
        <IconButton onClick={onClose} size="small"><CloseIcon fontSize="small" /></IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
        {!form ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress size={26} /></Box>
        ) : (
          <>
            <TextField label="घर संख्या*" value={form.house_no} onChange={set('house_no')} size="small" fullWidth />

            {activeMembers.length > 0 ? (
              <TextField
                select
                label="परिवार प्रमुख*"
                value={activeMembers.some((m) => m.name === form.head_name) ? form.head_name : ''}
                onChange={set('head_name')}
                size="small"
                fullWidth
                helperText={
                  form.head_name && !activeMembers.some((m) => m.name === form.head_name)
                    ? `वर्तमान: ${form.head_name} — सूची में नहीं`
                    : ' '
                }
              >
                {activeMembers.map((m) => (
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
              label="मोबाइल नंबर"
              value={form.mobile}
              onChange={(e) => setForm((f) => ({ ...f, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
              size="small"
              fullWidth
              inputProps={{ inputMode: 'numeric' }}
            />

            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <Autocomplete
                freeSolo
                options={casteOptions}
                value={form.caste || ''}
                onChange={(_, v) => setForm((f) => ({ ...f, caste: v ?? '', subcaste: '' }))}
                onInputChange={(_, v, reason) => reason === 'input' && setForm((f) => ({ ...f, caste: v }))}
                sx={{ flex: 1 }}
                renderInput={(p) => <TextField {...p} label="जाति" size="small" />}
              />
              <Autocomplete
                freeSolo
                options={subcasteOptions}
                value={form.subcaste || ''}
                onChange={(_, v) => setForm((f) => ({ ...f, subcaste: v ?? '' }))}
                onInputChange={(_, v, reason) => reason === 'input' && setForm((f) => ({ ...f, subcaste: v }))}
                sx={{ flex: 1 }}
                renderInput={(p) => <TextField {...p} label="उपजाति" size="small" />}
              />
            </Box>

            <TextField label="नोट (वैकल्पिक)" value={form.note} onChange={set('note')} size="small" fullWidth multiline minRows={2} />

            {error && <Alert severity="error">{error}</Alert>}
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 2, py: 1.5, gap: 1 }}>
        <Button onClick={onClose} sx={{ textTransform: 'none' }}>रद्द करें</Button>
        <Button
          onClick={save}
          disabled={!canSave || saving}
          variant="contained"
          sx={{ textTransform: 'none', bgcolor: colors.orange, '&:hover': { bgcolor: colors.orangeDark } }}
        >
          {saving ? 'सहेजा जा रहा…' : 'सहेजें'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
