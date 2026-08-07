'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HowToVoteIcon from '@mui/icons-material/HowToVote';
import { colors } from '@shared/theme/colors';
import { isPasswordValid, isPhoneValid, normalizePhone } from '@shared/validation/credentials';
import PasswordField from '@shared/components/PasswordField';
import PasswordRules from '@shared/components/PasswordRules';

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState('login');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [touched, setTouched] = useState({});
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const isSignup = mode === 'signup';
  const phoneOk = isPhoneValid(phone);
  const passwordOk = isPasswordValid(password);
  const confirmOk = confirm.length > 0 && confirm === password;

  const canSubmit = isSignup
    ? phoneOk && passwordOk && confirmOk
    : phone.length > 0 && password.length > 0;

  function switchMode(next) {
    setMode(next);
    setError(null);
    setPassword('');
    setConfirm('');
    setTouched({});
  }

  async function submit(event) {
    event.preventDefault();
    if (!canSubmit || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/auth/${isSignup ? 'signup' : 'login'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          isSignup ? { phone, password, confirmPassword: confirm } : { phone, password },
        ),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'कुछ गलत हो गया');
      router.replace('/dashboard');
      router.refresh();
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        bgcolor: colors.pageBg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
      }}
    >
      <Paper
        component="form"
        onSubmit={submit}
        sx={{
          width: '100%',
          maxWidth: 400,
          borderRadius: 3,
          p: 3,
          boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
        }}
      >
        <Box sx={{ textAlign: 'center', mb: 2 }}>
          <Box
            sx={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              bgcolor: colors.orange,
              display: 'grid',
              placeItems: 'center',
              mx: 'auto',
              mb: 1.25,
            }}
          >
            <HowToVoteIcon sx={{ color: '#fff', fontSize: 28 }} />
          </Box>
          <Typography sx={{ fontSize: 17, fontWeight: 800, color: colors.text }}>
            सर्वेक्षण ऐप
          </Typography>
          <Typography sx={{ fontSize: 12.5, color: colors.textMuted }}>
            ऐप में प्रवेश करें
          </Typography>
        </Box>

        {/* Signup is disabled for now — accounts are created from the
            "उपयोगकर्ता जोड़ें" screen by giving a user a password. To re-enable
            self-signup, restore this tab strip and the footer link below; the
            signup form, its validation, and /api/auth/signup are all still live.

        <Tabs
          value={mode}
          onChange={(_e, v) => switchMode(v)}
          variant="fullWidth"
          sx={{
            mb: 2.5,
            minHeight: 38,
            bgcolor: colors.orangeTint,
            borderRadius: 1.5,
            '& .MuiTab-root': { minHeight: 38, textTransform: 'none', fontWeight: 700, fontSize: 14 },
            '& .Mui-selected': { color: colors.orange },
            '& .MuiTabs-indicator': { backgroundColor: colors.orange },
          }}
        >
          <Tab value="login" label="लॉगिन" />
          <Tab value="signup" label="साइन अप" />
        </Tabs>
        */}

        <Box sx={{ mb: 2.5 }} />

        <TextField
          label="मोबाइल नंबर"
          value={phone}
          onChange={(e) => setPhone(normalizePhone(e.target.value).slice(0, 10))}
          onBlur={() => setTouched((t) => ({ ...t, phone: true }))}
          error={isSignup && touched.phone && !phoneOk}
          helperText={
            isSignup && touched.phone && !phoneOk ? 'मोबाइल नंबर 10 अंकों का हो' : ' '
          }
          size="small"
          fullWidth
          autoComplete="tel"
          inputProps={{ inputMode: 'numeric', maxLength: 10 }}
        />

        <PasswordField
          label="पासवर्ड"
          value={password}
          onChange={setPassword}
          autoComplete={isSignup ? 'new-password' : 'current-password'}
          helperText=" "
        />

        {isSignup && <PasswordRules password={password} />}

        {isSignup && (
          <Box sx={{ mt: 1.5 }}>
            <PasswordField
              label="पासवर्ड की पुष्टि करें"
              value={confirm}
              onChange={setConfirm}
              autoComplete="new-password"
              error={confirm.length > 0 && !confirmOk}
              helperText={
                confirm.length > 0 && !confirmOk ? 'दोनों पासवर्ड मेल नहीं खाते' : ' '
              }
            />
            {confirmOk && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.25 }}>
                <CheckCircleIcon sx={{ fontSize: 15, color: '#2e7d32' }} />
                <Typography sx={{ fontSize: 12, color: '#2e7d32' }}>पासवर्ड मेल खाते हैं</Typography>
              </Box>
            )}
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mt: 1.5, fontSize: 13 }}>
            {error}
          </Alert>
        )}

        <Button
          type="submit"
          disabled={!canSubmit || busy}
          variant="contained"
          fullWidth
          sx={{ mt: 2.5, py: 1.15, textTransform: 'none', fontSize: 15, fontWeight: 700 }}
        >
          {busy ? 'रुकिए…' : isSignup ? 'खाता बनाएँ' : 'लॉगिन करें'}
        </Button>

        {/* Signup disabled — see the note on the tab strip above.

        <Typography sx={{ fontSize: 12.5, color: colors.textMuted, textAlign: 'center', mt: 2 }}>
          {isSignup ? 'पहले से खाता है?' : 'नया उपयोगकर्ता?'}{' '}
          <Box
            component="span"
            onClick={() => switchMode(isSignup ? 'login' : 'signup')}
            sx={{ color: colors.orange, fontWeight: 700, cursor: 'pointer' }}
          >
            {isSignup ? 'लॉगिन करें' : 'साइन अप करें'}
          </Box>
        </Typography>
        */}
      </Paper>
    </Box>
  );
}
