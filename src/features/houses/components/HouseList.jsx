'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import AppChrome from '@shared/layouts/AppChrome';
import { colors } from '@shared/theme/colors';
import HouseFilterBar from './HouseFilterBar';
import HouseCard from './HouseCard';
import { fetchHouses, fetchWardFacets } from '../api';
import { STATUS_TABS } from '../constants';

const PAGE_SIZE = 25;

export default function HouseList() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [ward, setWard] = useState(searchParams.get('ward') || 'all');
  const [part, setPart] = useState(searchParams.get('part') || 'all');
  const [status, setStatus] = useState('all');
  const [q, setQ] = useState('');
  const [wardList, setWardList] = useState([]);
  const [bhagList, setBhagList] = useState([]);
  const [houses, setHouses] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [stats, setStats] = useState({ total: 0, surveyed: 0 });
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Reload facets whenever ward changes (bhag list depends on ward)
  useEffect(() => {
    fetchWardFacets(ward === 'all' ? undefined : ward)
      .then(d => { setWardList(d.wards); setBhagList(d.bhags); })
      .catch(() => {});
  }, [ward]);

  // Reset part when ward changes
  function handleWardChange(v) { setWard(v); setPart('all'); }

  useEffect(() => setLimit(PAGE_SIZE), [ward, part, status, q]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetchHouses({ ward, part, status, q, limit })
      .then((d) => {
        if (!alive) return;
        setHouses(d.houses);
        setHasMore(d.hasMore);
        setStats(d.stats);
        setError(null);
      })
      .catch((e) => alive && setError(e.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [ward, part, status, q, limit]);

  const pct = stats.total ? Math.round((stats.surveyed / stats.total) * 100) : 0;

  const subHeader = (
    <>
      <HouseFilterBar
        ward={ward} part={part} wardList={wardList} bhagList={bhagList} q={q}
        onWardChange={handleWardChange} onPartChange={setPart} onQChange={setQ}
      />
      <Tabs
        value={status}
        onChange={(_e, v) => setStatus(v)}
        variant="fullWidth"
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 2,
          bgcolor: colors.orangeTint,
          borderBottom: `1px solid ${colors.border}`,
          minHeight: 40,
          '& .MuiTab-root': { minHeight: 40, minWidth: 0, px: 0.5, fontSize: 12.5, fontWeight: 600, color: colors.textMuted, textTransform: 'none' },
          '& .Mui-selected': { color: colors.orange },
          '& .MuiTabs-indicator': { backgroundColor: colors.orange, height: 3 },
        }}
      >
        {STATUS_TABS.map((t) => (
          <Tab key={t.value} value={t.value} label={t.label} />
        ))}
      </Tabs>
    </>
  );

  return (
    <AppChrome
      title={
        ward === 'all' ? 'घर सूची'
        : part === 'all' ? `घर सूची — वार्ड ${ward}`
        : `घर सूची — वार्ड ${ward}, भाग ${part}`
      }
      subHeader={subHeader}
      actions={
        <IconButton onClick={() => router.push('/houses/new')} sx={{ color: '#fff' }} aria-label="नया घर जोड़ें">
          <AddIcon />
        </IconButton>
      }
    >
      <Box sx={{ px: 1.25, py: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
        <Typography sx={{ fontSize: 12.5, color: colors.textMuted }}>
          कुल घर: <b style={{ color: colors.text }}>{stats.total}</b>
          {'   '}सर्वेक्षित: <b style={{ color: colors.text }}>{stats.surveyed} ({pct}%)</b>
        </Typography>
        <Button
          onClick={() => router.push('/houses/new')}
          size="small"
          variant="contained"
          startIcon={<AddIcon sx={{ fontSize: 16 }} />}
          sx={{ textTransform: 'none', borderRadius: 5, fontSize: 12, whiteSpace: 'nowrap' }}
        >
          नया घर जोड़ें
        </Button>
      </Box>

      <Box sx={{ flex: 1, px: 1, pb: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
        {loading && houses.length === 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress size={28} />
          </Box>
        )}

        {!loading && houses.length === 0 && (
          <Typography sx={{ textAlign: 'center', color: error ? '#c62828' : colors.textMuted, fontSize: 14, py: 6, px: 2 }}>
            {error || 'कोई घर नहीं मिला'}
          </Typography>
        )}

        {houses.map((h) => (
          <HouseCard key={h.id} house={h} onClick={() => router.push(`/houses/${h.id}`)} />
        ))}

        {hasMore && (
          <Button
            onClick={() => setLimit((n) => n + PAGE_SIZE)}
            disabled={loading}
            variant="contained"
            sx={{ alignSelf: 'center', my: 1.5, px: 3, borderRadius: 5, textTransform: 'none' }}
          >
            {loading ? 'लोड हो रहा है…' : 'और देखें'}
          </Button>
        )}
      </Box>
    </AppChrome>
  );
}
