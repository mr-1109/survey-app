'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AppChrome from '@shared/layouts/AppChrome';
import { colors } from '@shared/theme/colors';
import { fetchHouse, deleteMember } from '../api';
import { genderLabel, relationLabel } from '../constants';

/** सदस्य सूची (एडिट) — screen 10. */
export default function MemberList({ houseId }) {
  const router = useRouter();
  const [members, setMembers] = useState(null);
  const [error, setError] = useState(null);
  const [confirmId, setConfirmId] = useState(null);

  const load = useCallback(() => {
    fetchHouse(houseId)
      .then((d) => {
        setMembers(d.members.filter((m) => !m.is_deleted));
        setError(null);
      })
      .catch((e) => setError(e.message));
  }, [houseId]);

  useEffect(load, [load]);

  async function remove(id) {
    try {
      await deleteMember(id);
      setConfirmId(null);
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <AppChrome
      title={`सदस्य सूची (कुल ${members?.length ?? 0})`}
      actions={
        <Button
          onClick={() => router.push(`/houses/${houseId}/members/new`)}
          startIcon={<AddIcon sx={{ fontSize: 16 }} />}
          size="small"
          sx={{ color: '#fff', border: '1px solid rgba(255,255,255,0.6)', borderRadius: 5, textTransform: 'none', fontSize: 12.5, px: 1.25 }}
        >
          जोड़ें
        </Button>
      }
    >
      <Box sx={{ flex: 1, p: 1.25, display: 'flex', flexDirection: 'column', gap: 1 }}>
        {error && <Alert severity="error">{error}</Alert>}

        {!members && !error && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress size={28} />
          </Box>
        )}

        {members?.length === 0 && (
          <Typography sx={{ textAlign: 'center', color: colors.textMuted, fontSize: 14, py: 4 }}>
            कोई सदस्य नहीं
          </Typography>
        )}

        {members?.map((m, i) => (
          <Paper key={m.id} sx={{ p: 1.25, borderRadius: 2, boxShadow: '0 1px 3px rgba(0,0,0,0.10)' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
              <Avatar sx={{ bgcolor: colors.orangeTint, color: colors.orange, fontSize: 13, fontWeight: 700, width: 32, height: 32 }}>
                {i + 1}
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <Typography sx={{ fontSize: 14, fontWeight: 700, color: colors.text }}>{m.name}</Typography>
                  <Typography sx={{ fontSize: 12, color: colors.textMuted }}>
                    ({genderLabel(m.gender)[0]}/{m.age ?? '—'})
                  </Typography>
                  {m.is_head === 1 && (
                    <Chip label="HEAD" size="small" sx={{ height: 18, fontSize: 10, bgcolor: colors.orange, color: '#fff' }} />
                  )}
                </Box>
                <Typography sx={{ fontSize: 12, color: colors.textMuted }}>
                  {relationLabel(m.relation)}: {m.relative_name || '—'}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                <IconButton
                  size="small"
                  onClick={() => router.push(`/houses/${houseId}/members/${m.id}`)}
                  sx={{ color: colors.blue }}
                >
                  <EditOutlinedIcon sx={{ fontSize: 18 }} />
                </IconButton>
                <IconButton size="small" onClick={() => setConfirmId(m.id)} sx={{ color: '#c62828' }}>
                  <DeleteOutlineIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Box>
            </Box>

            {confirmId === m.id && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1, pt: 1, borderTop: `1px solid ${colors.border}` }}>
                <Typography sx={{ fontSize: 12, color: colors.textMuted, flex: 1 }}>पक्का हटाना है?</Typography>
                <Button onClick={() => setConfirmId(null)} size="small" sx={{ textTransform: 'none' }}>नहीं</Button>
                <Button onClick={() => remove(m.id)} size="small" variant="contained" color="error" sx={{ textTransform: 'none' }}>
                  हाँ, हटाएँ
                </Button>
              </Box>
            )}
          </Paper>
        ))}

        {members && (
          <Typography sx={{ fontSize: 12.5, color: colors.textMuted, textAlign: 'center', mt: 1 }}>
            कुल सदस्य: {members.length}
          </Typography>
        )}
      </Box>
    </AppChrome>
  );
}
