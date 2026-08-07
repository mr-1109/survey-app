'use client';

import { useEffect, useState } from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { colors } from '@shared/theme/colors';
import { normaliseScope } from '@shared/scope';
import ScopeFields from '@shared/components/ScopeFields';

const ROLES = [
  { value: 'karyakarta', label: 'कार्यकर्ता' },
  { value: 'booth_incharge', label: 'बूथ प्रभारी' },
  { value: 'admin', label: 'व्यवस्थापक' },
];

export default function EditUserDialog({ user, open, onClose, onSaved, viewer }) {
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open || !user) return;
    setForm({
      name: user.name ?? '',
      mobile: user.mobile ?? '',
      role: user.role ?? 'karyakarta',
      scope: normaliseScope(user.scope),
    });
    setError(null);
  }, [open, user]);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          mobile: form.mobile,
          role: form.role,
          scope: form.scope,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'अपडेट नहीं हुआ');
      onSaved?.();
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (!form) return null;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" scroll="paper">
      <DialogTitle sx={{ fontSize: 16, fontWeight: 700, color: colors.orange, pb: 1 }}>
        उपयोगकर्ता संपादित करें
      </DialogTitle>

      <DialogContent sx={{ pt: 1 }}>
        <TextField
          label="नाम"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          size="small"
          fullWidth
          sx={{ mt: 1, mb: 1.5 }}
        />
        <TextField
          label="मोबाइल नंबर"
          value={form.mobile}
          onChange={(e) =>
            setForm((f) => ({ ...f, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) }))
          }
          size="small"
          fullWidth
          inputProps={{ inputMode: 'numeric' }}
          helperText="बदलने पर पुराना लॉगिन नंबर काम नहीं करेगा"
          sx={{ mb: 1.5 }}
        />
        <TextField
          select
          label="भूमिका"
          value={form.role}
          onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
          size="small"
          fullWidth
        >
          {ROLES.map((r) => (
            <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>
          ))}
        </TextField>

        <ScopeFields
          scope={form.scope}
          onScopeChange={(scope) => setForm((f) => ({ ...f, scope }))}
          viewerScope={viewer?.scope ?? []}
          viewerUnrestricted={viewer?.unrestricted !== false}
        />

        {error && (
          <Typography sx={{ fontSize: 12.5, color: '#c62828', mt: 1.5 }}>{error}</Typography>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} sx={{ textTransform: 'none' }}>
          रद्द करें
        </Button>
        <Button
          onClick={save}
          disabled={saving || form.name.trim().length < 2}
          variant="contained"
          sx={{ textTransform: 'none' }}
        >
          {saving ? 'सहेजा जा रहा…' : 'सहेजें'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
