'use client';

import { useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import CloseIcon from '@mui/icons-material/Close';
import { colors } from '@shared/theme/colors';
import { addMember, updateMember } from '../../api';
import { GENDER_OPTIONS, MARITAL_STATUS_OPTIONS } from '../../constants';

const EMPTY = { name: '', gender: '', age: '', relative_name: '', marital_status: '', mobile: '', education: '', epic: '' };

/** Add or edit a family member inline — no page navigation. */
export default function MemberDialog({ open, onClose, onSaved, houseId, member }) {
  const isEdit = Boolean(member);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open) return;
    if (member) {
      setForm({
        name:           member.name ?? '',
        gender:         member.gender ?? '',
        age:            member.age ?? '',
        relative_name:  member.relative_name ?? '',
        marital_status: member.marital_status ?? '',
        mobile:         member.mobile ?? '',
        education:      member.education ?? '',
        epic:           member.epic ?? '',
      });
    } else {
      setForm(EMPTY);
    }
    setError(null);
  }, [open, member]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const canSave = form.name.trim().length >= 2 && form.gender && form.age !== '' && form.relative_name.trim();

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const payload = { ...form, age: form.age === '' ? null : Number(form.age), relation: 'father' };
      if (isEdit) {
        await updateMember(member.id, payload);
      } else {
        await addMember(houseId, payload);
      }
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
        {isEdit ? 'सदस्य संपादित करें' : 'नया सदस्य जोड़ें'}
        <IconButton onClick={onClose} size="small"><CloseIcon fontSize="small" /></IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
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
