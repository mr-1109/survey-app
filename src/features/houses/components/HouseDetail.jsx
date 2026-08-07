'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1';
import AppChrome from '@shared/layouts/AppChrome';
import { colors } from '@shared/theme/colors';
import { fetchHouse } from '../api';
import { STATUS_LABELS, genderLabel } from '../constants';
import QuickActionsSheet from './QuickActionsSheet';

const STATUS_COLOR = {
  done: { bg: '#e8f5e9', fg: '#2e7d32' },
  partial: { bg: '#fff8e1', fg: '#b26a00' },
  pending: { bg: '#f1f1f1', fg: colors.textMuted },
};

export default function HouseDetail({ houseId }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [qaOpen, setQaOpen] = useState(false);

  const load = useCallback(() => {
    fetchHouse(houseId)
      .then((d) => {
        setData(d);
        setError(null);
      })
      .catch((e) => setError(e.message));
  }, [houseId]);

  useEffect(load, [load]);

  // Hard rule: every save on the five त्वरित कार्य flows returns here with
  // ?qa=1 so this screen re-opens screen 4 automatically. See GHAR_SURVEY_PLAN.md §0.2.
  useEffect(() => {
    if (searchParams.get('qa') === '1') {
      setQaOpen(true);
      load();
      router.replace(`/houses/${houseId}`, { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const house = data?.house;
  const houseLabel = house?.house_no ?? house?.house_no_raw ?? '—';
  const status = STATUS_COLOR[house?.survey_status] ?? STATUS_COLOR.pending;
  const activeMembers = data?.members?.filter((m) => !m.is_deleted) ?? [];

  return (
    <AppChrome
      title={`घर विवरण: ${houseLabel}`}
      actions={
        data && (
          <>
            <IconButton onClick={() => setQaOpen(true)} sx={{ color: '#fff' }} aria-label="संपादित करें">
              <EditOutlinedIcon />
            </IconButton>
            <IconButton onClick={() => setQaOpen(true)} sx={{ color: '#fff' }} aria-label="त्वरित कार्य">
              <MoreVertIcon />
            </IconButton>
          </>
        )
      }
    >
      <Box sx={{ flex: 1, p: 1.25 }}>
        {error && <Alert severity="error">{error}</Alert>}

        {!data && !error && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress size={28} />
          </Box>
        )}

        {data && (
          <>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
              <Chip
                label={STATUS_LABELS[house.survey_status] ?? 'लंबित'}
                size="small"
                sx={{ bgcolor: status.bg, color: status.fg, fontWeight: 700 }}
              />
            </Box>

            <Box
              sx={{
                bgcolor: '#fff',
                borderRadius: 2,
                boxShadow: '0 1px 3px rgba(0,0,0,0.10)',
                p: 1.5,
                mb: 1.25,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, mb: 1 }}>
                <HomeOutlinedIcon sx={{ fontSize: 18, color: colors.orange }} />
                <Typography sx={{ fontSize: 13, fontWeight: 700, color: colors.orange }}>घर विवरण</Typography>
                <IconButton
                  onClick={() => router.push(`/houses/${houseId}/edit`)}
                  size="small"
                  sx={{ ml: 'auto', color: colors.blue }}
                  aria-label="संपादित करें"
                >
                  <EditOutlinedIcon sx={{ fontSize: 17 }} />
                </IconButton>
              </Box>

              <Typography sx={{ fontSize: 12, color: colors.textMuted }}>परिवार मुखिया</Typography>
              <Typography sx={{ fontSize: 14, fontWeight: 700, mb: 1 }}>
                {house.head_name || 'अज्ञात — अभी दर्ज नहीं'}
              </Typography>

              {house.mobile ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                  <Typography sx={{ fontSize: 13.5, fontWeight: 700 }}>{house.mobile}</Typography>
                  <WhatsAppIcon sx={{ fontSize: 16, color: '#25d366' }} />
                </Box>
              ) : (
                <Typography sx={{ fontSize: 12.5, color: colors.textMuted, mb: 1 }}>मोबाइल नंबर दर्ज नहीं</Typography>
              )}

              <Typography sx={{ fontSize: 12.5, color: colors.textMuted, mb: 1 }}>{house.area || '—'}</Typography>

              <Box sx={{ display: 'flex', gap: 3 }}>
                <Box>
                  <Typography sx={{ fontSize: 11.5, color: colors.textMuted }}>मकान संख्या</Typography>
                  <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{houseLabel}</Typography>
                </Box>
                <Box>
                  <Typography sx={{ fontSize: 11.5, color: colors.textMuted }}>जाति / उपजाति</Typography>
                  <Typography sx={{ fontSize: 13, fontWeight: 700 }}>
                    {[house.caste, house.subcaste].filter(Boolean).join(' / ') || '—'}
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', gap: 3, mt: 1 }}>
                <Box>
                  <Typography sx={{ fontSize: 11.5, color: colors.textMuted }}>कुल सदस्य</Typography>
                  <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{house.total_members ?? house.voter_count}</Typography>
                </Box>
                <Box>
                  <Typography sx={{ fontSize: 11.5, color: colors.textMuted }}>मतदाता</Typography>
                  <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{house.voter_count}</Typography>
                </Box>
              </Box>
              {house.note && (
                <Typography sx={{ fontSize: 12, color: colors.textMuted, mt: 1 }}>नोट: {house.note}</Typography>
              )}

            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', px: 0.5, mb: 0.75 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: colors.orange, flex: 1 }}>
                घर के मुख्य सदस्य ({activeMembers.length})
              </Typography>
              <Typography
                onClick={() => router.push(`/houses/${houseId}/members`)}
                sx={{ fontSize: 12, color: colors.blue, cursor: 'pointer', fontWeight: 600 }}
              >
                और सदस्य देखें ›
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {activeMembers.slice(0, 3).map((m, i) => (
                <Paper
                  key={m.id}
                  onClick={() => router.push(`/houses/${houseId}/members`)}
                  sx={{
                    p: 1.1,
                    borderRadius: 2,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.10)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    cursor: 'pointer',
                  }}
                >
                  <Avatar sx={{ bgcolor: colors.orangeTint, color: colors.orange, fontSize: 12.5, fontWeight: 700, width: 28, height: 28 }}>
                    {i + 1}
                  </Avatar>
                  <Typography sx={{ fontSize: 13.5, fontWeight: 700, flex: 1 }}>
                    {m.name} ({genderLabel(m.gender)[0]}/{m.age ?? '—'})
                  </Typography>
                  {m.is_head === 1 && (
                    <Chip label="HEAD" size="small" sx={{ height: 18, fontSize: 10, bgcolor: colors.orange, color: '#fff' }} />
                  )}
                </Paper>
              ))}
              {activeMembers.length === 0 && (
                <Typography sx={{ textAlign: 'center', color: colors.textMuted, fontSize: 13, py: 2 }}>
                  कोई सदस्य नहीं
                </Typography>
              )}
            </Box>

            <Button
              onClick={() => router.push(`/houses/${houseId}/members/new`)}
              variant="contained"
              startIcon={<PersonAddAlt1Icon />}
              fullWidth
              sx={{ mt: 1.5, textTransform: 'none', borderRadius: 5 }}
            >
              + नया सदस्य जोड़ें
            </Button>

            <QuickActionsSheet
              houseId={houseId}
              house={house}
              open={qaOpen}
              onClose={() => setQaOpen(false)}
            />
          </>
        )}
      </Box>
    </AppChrome>
  );
}
