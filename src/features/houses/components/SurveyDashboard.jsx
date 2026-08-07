'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import LinearProgress from '@mui/material/LinearProgress';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Select from '@mui/material/Select';
import Typography from '@mui/material/Typography';
import HomeWorkIcon from '@mui/icons-material/HomeWork';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import SyncIcon from '@mui/icons-material/Sync';
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import WifiIcon from '@mui/icons-material/Wifi';
import AppChrome from '@shared/layouts/AppChrome';
import { colors } from '@shared/theme/colors';
import { fetchDashboardStats, fetchWardFacets } from '../api';

function StatTile({ icon: Icon, label, value, tint }) {
  return (
    <Paper sx={{ p: 1.25, borderRadius: 2, boxShadow: '0 1px 3px rgba(0,0,0,0.10)', flex: 1, minWidth: 0 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.4 }}>
        <Icon sx={{ fontSize: 15, color: tint ?? colors.orange }} />
        <Typography sx={{ fontSize: 10.5, color: colors.textMuted }}>{label}</Typography>
      </Box>
      <Typography sx={{ fontSize: 18, fontWeight: 800, color: colors.text }}>{value}</Typography>
    </Paper>
  );
}

function QuickTile({ icon: Icon, label, onClick }) {
  return (
    <Paper
      onClick={onClick}
      sx={{
        p: 1.25,
        borderRadius: 2,
        boxShadow: '0 1px 3px rgba(0,0,0,0.10)',
        flex: 1,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 0.5,
        cursor: 'pointer',
      }}
    >
      <Icon sx={{ fontSize: 22, color: colors.orange }} />
      <Typography sx={{ fontSize: 11.5, fontWeight: 600, textAlign: 'center' }}>{label}</Typography>
    </Paper>
  );
}

/**
 * डैशबोर्ड (होम) — screen 1, the landing page after login for सर्वेक्षण ऐप.
 * Every number here comes from the local SQLite store (`data/app.db`), seeded
 * by `npm run import:mysql` from the remote EROLL_NN055 table — no hardcoded
 * ward/locality placeholders.
 */
export default function SurveyDashboard() {
  const router = useRouter();
  const [wardList, setWardList] = useState([]);
  const [bhagList, setBhagList] = useState([]);
  const [ward, setWard] = useState('all');
  const [part, setPart] = useState('all');
  const [stats, setStats] = useState(null);
  const [online, setOnline] = useState(true);

  // Reload bhag facets when ward changes
  useEffect(() => {
    fetchWardFacets(ward === 'all' ? undefined : ward)
      .then(d => { setWardList(d.wards); setBhagList(d.bhags); })
      .catch(() => {});
  }, [ward]);

  useEffect(() => {
    setOnline(typeof navigator !== 'undefined' ? navigator.onLine : true);
  }, []);

  function handleWardChange(v) { setWard(v); setPart('all'); }

  useEffect(() => {
    setStats(null);
    fetchDashboardStats(
      ward === 'all' ? undefined : ward,
      part === 'all' ? undefined : part,
    ).then(setStats).catch(() => {});
  }, [ward, part]);

  const pct = stats && stats.total ? Math.round((stats.done / stats.total) * 100) : 0;
  const wardLabel = ward === 'all' ? 'सभी वार्ड'
    : part === 'all' ? `वार्ड ${ward}`
    : `वार्ड ${ward}, भाग ${part}`;

  return (
    <AppChrome title="सर्वेक्षण ऐप">
      <Box sx={{ flex: 1, p: 1.25, display: 'flex', flexDirection: 'column', gap: 1.25 }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Select
            value={ward}
            onChange={e => handleWardChange(e.target.value)}
            size="small"
            sx={{ fontSize: 13, bgcolor: '#fff', minWidth: 140 }}
          >
            <MenuItem value="all">सभी वार्ड</MenuItem>
            {wardList.map(w => (
              <MenuItem key={w.ward} value={w.ward}>वार्ड {w.ward}</MenuItem>
            ))}
          </Select>

          <Select
            value={part}
            onChange={e => setPart(e.target.value)}
            size="small"
            sx={{ fontSize: 13, bgcolor: '#fff', minWidth: 120 }}
            disabled={bhagList.length === 0}
          >
            <MenuItem value="all">सभी भाग</MenuItem>
            {bhagList.map(b => (
              <MenuItem key={b.bhag} value={b.bhag}>भाग {b.bhag}</MenuItem>
            ))}
          </Select>
        </Box>

        {!stats && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress size={28} />
          </Box>
        )}

        {stats && (
          <>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <StatTile icon={HomeWorkIcon} label="कुल घर" value={stats.total} />
              <StatTile icon={CheckCircleOutlineIcon} label="पूर्ण" value={stats.done} tint="#2e7d32" />
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <StatTile icon={DescriptionOutlinedIcon} label="ड्राफ्ट" value={stats.draft} tint="#b26a00" />
              <StatTile icon={HourglassEmptyIcon} label="शेष" value={stats.remaining} />
            </Box>

            <Paper sx={{ p: 1.25, borderRadius: 2, boxShadow: '0 1px 3px rgba(0,0,0,0.10)' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography sx={{ fontSize: 12, color: colors.textMuted }}>आज के सर्वे</Typography>
                <Typography sx={{ fontSize: 12, fontWeight: 700 }}>{stats.todaySurveys}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography sx={{ fontSize: 12, color: colors.textMuted, display: 'flex', alignItems: 'center', gap: 0.4 }}>
                  <WifiIcon sx={{ fontSize: 14, color: online ? '#2e7d32' : '#c62828' }} />
                  समन्वयन स्थिति
                </Typography>
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: online ? '#2e7d32' : '#c62828' }}>
                  {online ? 'ऑनलाइन' : 'ऑफलाइन'}
                </Typography>
              </Box>
            </Paper>

            <Paper sx={{ p: 1.5, borderRadius: 2, boxShadow: '0 1px 3px rgba(0,0,0,0.10)' }}>
              <Typography sx={{ fontSize: 12.5, fontWeight: 700, mb: 0.75 }}>प्रगति ({wardLabel})</Typography>
              <LinearProgress variant="determinate" value={pct} sx={{ height: 8, borderRadius: 4, mb: 0.75 }} />
              <Typography sx={{ fontSize: 12, color: colors.textMuted }}>
                {pct}% · {stats.done} / {stats.total}
              </Typography>
            </Paper>

            <Button
              onClick={() => {
                const p = new URLSearchParams();
                if (ward !== 'all') p.set('ward', ward);
                if (part !== 'all') p.set('part', part);
                router.push(`/houses/list${p.toString() ? '?' + p.toString() : ''}`);
              }}
              variant="contained"
              fullWidth
              sx={{ textTransform: 'none', borderRadius: 5, py: 1.1, fontWeight: 700 }}
            >
              सर्वे शुरू करें
            </Button>

            <Typography sx={{ fontSize: 12, fontWeight: 700, color: colors.textMuted, mt: 0.5 }}>
              त्वरित कार्य
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <QuickTile icon={SyncIcon} label="सिंक करें" onClick={() => {}} />
              <QuickTile icon={AssessmentOutlinedIcon} label="रिपोर्ट" onClick={() => {}} />
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <QuickTile icon={SettingsOutlinedIcon} label="सेटिंग" onClick={() => router.push('/settings')} />
              <QuickTile icon={HelpOutlineIcon} label="सहायता" onClick={() => {}} />
            </Box>

            {stats.lastSync && (
              <Typography sx={{ fontSize: 11, color: colors.textMuted, textAlign: 'center', mt: 0.5 }}>
                अंतिम सिंक: {stats.lastSync}
              </Typography>
            )}
          </>
        )}
      </Box>
    </AppChrome>
  );
}
