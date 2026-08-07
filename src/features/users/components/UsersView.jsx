'use client';

import { useCallback, useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1';
import AppChrome from '@shared/layouts/AppChrome';
import { fetchUsers, createUser } from '../api';
import PasswordField from '@shared/components/PasswordField';
import PasswordRules from '@shared/components/PasswordRules';
import { isPasswordValid } from '@shared/validation/credentials';
import ScopeFields from '@shared/components/ScopeFields';
import { scopeSummary } from '@shared/scope';
import { colors } from '@shared/theme/colors';

const ROLES = [
  { value: 'karyakarta', label: 'कार्यकर्ता' },
  { value: 'booth_incharge', label: 'बूथ प्रभारी' },
  { value: 'admin', label: 'व्यवस्थापक' },
];

/** No grants at all — every level blank, nothing assumed. */
const EMPTY_SCOPE = [];

const EMPTY = {
  name: '',
  mobile: '',
  password: '',
  role: 'karyakarta',
  scope: EMPTY_SCOPE,
};

export default function UsersView() {
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  // The saved user, shown back as confirmation — including the scope the server
  // settled on, which may be wider than what was typed once blank levels are
  // inherited from the creator.
  const [added, setAdded] = useState(null);
  const [viewer, setViewer] = useState({ scope: [], unrestricted: true });

  // The user list itself isn't shown, but this call also carries the creator's
  // own scope — the levels they're bound to are pre-filled and locked below.
  const loadViewerScope = useCallback(() => {
    fetchUsers()
      .then((d) => {
        setViewer({ scope: d.viewerScope ?? [], unrestricted: d.viewerUnrestricted !== false });
      })
      .catch((e) => setError(e.message));
  }, []);

  useEffect(loadViewerScope, [loadViewerScope]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const mobileOk = /^\d{10}$/.test(form.mobile);
  const passwordOk = isPasswordValid(form.password);
  // Password is optional, but if given it must be valid and have a mobile to attach to.
  const credentialsOk = form.password.length === 0 || (passwordOk && mobileOk);

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      const saved = await createUser({
        name: form.name,
        mobile: form.mobile,
        password: form.password,
        role: form.role,
        scope: form.scope,
      });
      setAdded({ ...saved, hasLogin: form.password.length > 0 });
      setForm({ ...EMPTY, scope: EMPTY_SCOPE });
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppChrome title="उपयोगकर्ता जोड़ें">
      <Box sx={{ flex: 1, p: 1.25, display: 'flex', flexDirection: 'column', gap: 1.25 }}>
        <Paper sx={{ p: 1.5, borderRadius: 2, boxShadow: '0 1px 3px rgba(0,0,0,0.10)' }}>
          <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 1.5 }}>नया उपयोगकर्ता</Typography>

          <TextField
            label="नाम"
            value={form.name}
            onChange={set('name')}
            size="small"
            fullWidth
            sx={{ mb: 1.5 }}
          />
          <TextField
            label="मोबाइल नंबर"
            value={form.mobile}
            onChange={set('mobile')}
            size="small"
            fullWidth
            inputProps={{ inputMode: 'numeric', maxLength: 10 }}
            sx={{ mb: 1.5 }}
          />

          {/* Optional. Filling it creates a login account on this mobile number. */}
          <PasswordField
            label="पासवर्ड (लॉगिन के लिए)"
            value={form.password}
            onChange={(password) => setForm((f) => ({ ...f, password }))}
            autoComplete="new-password"
            error={form.password.length > 0 && !passwordOk}
            helperText={
              form.password.length === 0
                ? 'खाली छोड़ें तो लॉगिन खाता नहीं बनेगा'
                : mobileOk
                  ? ' '
                  : 'लॉगिन के लिए 10 अंकों का मोबाइल नंबर आवश्यक है'
            }
          />
          {form.password.length > 0 && <PasswordRules password={form.password} />}

          <Box sx={{ mb: 1.5 }} />

          <TextField
            select
            label="भूमिका"
            value={form.role}
            onChange={set('role')}
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
            viewerScope={viewer.scope}
            viewerUnrestricted={viewer.unrestricted}
          />

          <Box sx={{ mt: 2 }} />

          <Button
            onClick={submit}
            disabled={saving || form.name.trim().length < 2 || !credentialsOk}
            variant="contained"
            fullWidth
            startIcon={<PersonAddAlt1Icon />}
            sx={{ textTransform: 'none' }}
          >
            {saving ? 'जोड़ा जा रहा…' : 'जोड़ें'}
          </Button>

          {error && (
            <Typography sx={{ fontSize: 12.5, color: '#c62828', mt: 1 }}>{error}</Typography>
          )}
        </Paper>

      </Box>

      <AddedDialog user={added} onClose={() => setAdded(null)} />
    </AppChrome>
  );
}

function AddedDialog({ user, onClose }) {
  if (!user) return null;

  const rows = [
    ['मोबाइल', user.mobile || '—'],
    ['भूमिका', ROLES.find((r) => r.value === user.role)?.label ?? user.role],
    ['क्षेत्राधिकार', scopeSummary(user.scope)],
    ['लॉगिन', user.hasLogin ? 'बन गया — इसी मोबाइल नंबर से' : 'नहीं बना (पासवर्ड खाली था)'],
  ];

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs">
      <DialogContent sx={{ textAlign: 'center', pt: 3 }}>
        <CheckCircleIcon sx={{ fontSize: 46, color: '#2e7d32' }} />
        <Typography sx={{ fontSize: 15.5, fontWeight: 700, mt: 1 }}>
          उपयोगकर्ता जुड़ गया
        </Typography>
        <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: colors.orange, mt: 0.25 }}>
          {user.name}
        </Typography>

        <Paper variant="outlined" sx={{ mt: 2, p: 1.25, textAlign: 'left', borderColor: colors.border }}>
          {rows.map(([label, value]) => (
            <Box key={label} sx={{ display: 'flex', gap: 1, py: 0.35 }}>
              <Typography sx={{ fontSize: 12, color: colors.textMuted, minWidth: 84 }}>
                {label}
              </Typography>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: colors.text, flex: 1 }}>
                {value}
              </Typography>
            </Box>
          ))}
        </Paper>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} variant="contained" fullWidth sx={{ textTransform: 'none' }}>
          ठीक है
        </Button>
      </DialogActions>
    </Dialog>
  );
}
