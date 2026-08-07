'use client';

import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import BadgeIcon from '@mui/icons-material/Badge';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import PhoneIphoneIcon from '@mui/icons-material/PhoneIphone';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import PauseCircleOutlinedIcon from '@mui/icons-material/PauseCircleOutlined';
import PlayCircleOutlinedIcon from '@mui/icons-material/PlayCircleOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { colors } from '@shared/theme/colors';
import { LEVELS, normaliseScope } from '@shared/scope';
import EditUserDialog from './EditUserDialog';

const ROLE_LABELS = {
  karyakarta: 'कार्यकर्ता',
  booth_incharge: 'बूथ प्रभारी',
  admin: 'व्यवस्थापक',
};

export const roleLabel = (r) => ROLE_LABELS[r] ?? r;

/**
 * The scope ladder, level by level, so it is obvious where authority stops.
 * Each grant is listed separately, since two grants are not the same as one
 * grant holding both sets of values.
 */
function ScopeLadder({ scope }) {
  const grants = normaliseScope(scope);
  if (!grants.length) {
    return (
      <Typography sx={{ fontSize: 12, color: colors.textMuted }}>
        कोई सीमा नहीं — पूरा क्षेत्र
      </Typography>
    );
  }

  return (
    <Box>
      {grants.map((grant, i) => (
        <Box key={i} sx={{ mt: i ? 0.75 : 0 }}>
          {grants.length > 1 && (
            <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: colors.orangeDark }}>
              क्षेत्र {i + 1}
            </Typography>
          )}
          {LEVELS.filter((l) => grant[l.key]?.length).map((l) => (
            <Box key={l.key} sx={{ display: 'flex', gap: 1, py: 0.2 }}>
              <Typography sx={{ fontSize: 12, color: colors.textMuted, minWidth: 74 }}>
                {l.label}
              </Typography>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: colors.text }}>
                {grant[l.key].join(', ')}
              </Typography>
            </Box>
          ))}
        </Box>
      ))}
    </Box>
  );
}

function Row({ icon: Icon, children }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, py: 0.15 }}>
      <Icon sx={{ fontSize: 14, color: colors.orange }} />
      <Typography sx={{ fontSize: 12.5, color: colors.textMuted }}>{children}</Typography>
    </Box>
  );
}

export default function ProfilePanel({ data, error, onChanged }) {
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [busy, setBusy] = useState(null);
  const [actionError, setActionError] = useState(null);

  async function call(id, init) {
    setBusy(id);
    setActionError(null);
    try {
      const res = await fetch(`/api/users/${id}`, init);
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'कार्रवाई विफल');
      onChanged?.();
    } catch (e) {
      setActionError(e.message);
    } finally {
      setBusy(null);
    }
  }

  const togglePause = (u) =>
    call(u.id, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !u.active }),
    });

  async function doDelete(u) {
    setConfirmDelete(null);
    await call(u.id, { method: 'DELETE' });
  }

  if (error) {
    return <Typography sx={{ fontSize: 12.5, color: '#c62828' }}>{error}</Typography>;
  }
  if (!data) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
        <CircularProgress size={22} />
      </Box>
    );
  }

  const { me, created } = data;

  return (
    <Box>
      <Typography sx={{ fontSize: 12, fontWeight: 800, color: colors.orange, mb: 1 }}>
        मेरी प्रोफ़ाइल
      </Typography>

      <Box
        sx={{
          border: `1px solid ${colors.border}`,
          borderRadius: 2,
          p: 1.5,
          bgcolor: colors.orangeTint,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <Typography sx={{ fontSize: 14.5, fontWeight: 800, color: colors.text }}>
            {me.name}
          </Typography>
          {me.isSuper && (
            <Chip
              label="सुपर एडमिन"
              size="small"
              sx={{ height: 19, fontSize: 10.5, bgcolor: colors.orange, color: '#fff' }}
            />
          )}
        </Box>
        <Row icon={PhoneIphoneIcon}>{me.phone}</Row>
        <Row icon={BadgeIcon}>{roleLabel(me.role)}</Row>
        <Row icon={PlaceOutlinedIcon}>{me.scopeLabel}</Row>

        <Divider sx={{ my: 1 }} />
        <Typography sx={{ fontSize: 11, fontWeight: 700, color: colors.textMuted, mb: 0.5 }}>
          क्षेत्राधिकार
        </Typography>
        <ScopeLadder scope={me.scope} />
      </Box>

      <Typography sx={{ fontSize: 12, fontWeight: 800, color: colors.orange, mt: 2.5, mb: 1 }}>
        मेरे द्वारा जोड़े गए उपयोगकर्ता ({created.length})
      </Typography>

      {created.length === 0 ? (
        <Typography sx={{ fontSize: 12.5, color: colors.textMuted }}>
          आपने अभी तक कोई उपयोगकर्ता नहीं जोड़ा।
        </Typography>
      ) : (
        created.map((u) => (
          <Box
            key={u.id}
            sx={{ border: `1px solid ${colors.border}`, borderRadius: 2, p: 1.5, mb: 1 }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography sx={{ fontSize: 14, fontWeight: 700, flex: 1, minWidth: 0 }}>
                {u.name}
              </Typography>
              <Chip
                label={u.active ? 'सक्रिय' : 'निष्क्रिय'}
                size="small"
                sx={{
                  height: 19,
                  fontSize: 10.5,
                  bgcolor: u.active ? '#e8f5e9' : '#eeeeee',
                  color: u.active ? '#2e7d32' : colors.textMuted,
                }}
              />
            </Box>
            <Row icon={PhoneIphoneIcon}>
              {u.mobile || 'मोबाइल नहीं'}
              {u.hasLogin ? ' · लॉगिन उपलब्ध' : ''}
            </Row>
            <Row icon={BadgeIcon}>{roleLabel(u.role)}</Row>
            <Row icon={PlaceOutlinedIcon}>{u.scopeLabel}</Row>

            <Divider sx={{ my: 0.75 }} />
            <ScopeLadder scope={u.scope} />

            <Typography sx={{ fontSize: 11, color: colors.textMuted, mt: 0.75 }}>
              जोड़ा गया: {u.createdAt}
              {u.pendingFollowups > 0 ? ` · ${u.pendingFollowups} फॉलो-अप बाकी` : ''}
            </Typography>

            <Box sx={{ display: 'flex', gap: 0.5, mt: 1, flexWrap: 'wrap' }}>
              <Button
                onClick={() => setEditing(u)}
                disabled={busy === u.id}
                size="small"
                startIcon={<EditOutlinedIcon />}
                sx={{ textTransform: 'none', fontSize: 12.5, color: colors.blue }}
              >
                संपादित करें
              </Button>
              <Button
                onClick={() => togglePause(u)}
                disabled={busy === u.id}
                size="small"
                startIcon={
                  u.active ? <PauseCircleOutlinedIcon /> : <PlayCircleOutlinedIcon />
                }
                sx={{ textTransform: 'none', fontSize: 12.5, color: colors.orangeDark }}
              >
                {u.active ? 'रोकें' : 'चालू करें'}
              </Button>
              <Box sx={{ flex: 1 }} />
              <Button
                onClick={() => setConfirmDelete(u)}
                disabled={busy === u.id}
                size="small"
                startIcon={<DeleteOutlineIcon />}
                sx={{ textTransform: 'none', fontSize: 12.5, color: '#c62828' }}
              >
                हटाएँ
              </Button>
            </Box>
          </Box>
        ))
      )}

      {actionError && (
        <Typography sx={{ fontSize: 12.5, color: '#c62828', mt: 1 }}>{actionError}</Typography>
      )}

      <EditUserDialog
        user={editing}
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        onSaved={onChanged}
        viewer={{ scope: me.scope, unrestricted: me.isSuper }}
      />

      <Dialog open={Boolean(confirmDelete)} onClose={() => setConfirmDelete(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontSize: 16, fontWeight: 700 }}>उपयोगकर्ता हटाएँ?</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 13.5, color: colors.textMuted }}>
            <b>{confirmDelete?.name}</b> और उनका लॉगिन खाता स्थायी रूप से हट जाएगा। यह वापस नहीं
            किया जा सकता। उनके फॉलो-अप बने रहेंगे, बस किसी को सौंपे नहीं होंगे।
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConfirmDelete(null)} sx={{ textTransform: 'none' }}>
            रहने दें
          </Button>
          <Button
            onClick={() => doDelete(confirmDelete)}
            variant="contained"
            color="error"
            sx={{ textTransform: 'none' }}
          >
            हटाएँ
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
