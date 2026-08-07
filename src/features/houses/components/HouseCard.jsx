'use client';

import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import HomeIcon from '@mui/icons-material/Home';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { colors } from '@shared/theme/colors';
import { STATUS_LABELS } from '../constants';

const STATUS_COLOR = {
  done:    { bg: '#e8f5e9', fg: '#2e7d32' },
  partial: { bg: '#e3f2fd', fg: '#1565c0' },
  pending: { bg: '#fff8e1', fg: '#b26a00' },
};

export default function HouseCard({ house, onClick }) {
  const status     = STATUS_COLOR[house.survey_status] ?? STATUS_COLOR.pending;
  const houseLabel = house.house_no ?? house.house_no_raw ?? '—';

  return (
    <Paper
      onClick={onClick}
      sx={{
        p: 1.5,
        borderRadius: 2,
        boxShadow: '0 1px 3px rgba(0,0,0,0.10)',
        cursor: 'pointer',
        '&:active': { bgcolor: colors.orangeTint },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
        {/* House icon */}
        <Box
          sx={{
            width: 40, height: 40, borderRadius: '50%',
            bgcolor: house.survey_status === 'done' ? colors.orange : colors.orangeTint,
            display: 'grid', placeItems: 'center', flexShrink: 0,
          }}
        >
          <HomeIcon sx={{ color: house.survey_status === 'done' ? '#fff' : colors.orange, fontSize: 20 }} />
        </Box>

        {/* Content */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {/* Row 1: HNO + status */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 700, color: colors.text }}>
              घर नं.: {houseLabel}
            </Typography>
            <Box sx={{ fontSize: 11, fontWeight: 700, px: 1, py: 0.25, borderRadius: 1, bgcolor: status.bg, color: status.fg, flexShrink: 0 }}>
              {STATUS_LABELS[house.survey_status] ?? 'नोट शुरू'}
            </Box>
          </Box>

          {/* Row 2: परिवार प्रमुख */}
          <Typography sx={{ fontSize: 12.5, color: colors.textMuted, mt: 0.3 }}>
            परिवार प्रमुख:{'  '}<span style={{ color: colors.text }}>{house.head_name || 'अज्ञात'}</span>
          </Typography>

          {/* Row 3: क्षेत्र (AREACOLONY) */}
          <Typography sx={{ fontSize: 12.5, color: colors.textMuted, mt: 0.2 }}>
            क्षेत्र:{'  '}<span style={{ color: colors.text }}>{house.area || '—'}</span>
          </Typography>

          {/* Row 4: कुल सदस्य · मतदाता */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 0.3 }}>
            <Typography sx={{ fontSize: 12.5, color: colors.textMuted }}>
              कुल सदस्य:{'  '}<b style={{ color: colors.text }}>{house.total_members ?? house.voter_count}</b>
              {'      '}
              मतदाता:{'  '}<b style={{ color: colors.text }}>{house.voter_count}</b>
            </Typography>
            <ChevronRightIcon sx={{ fontSize: 18, color: colors.textMuted }} />
          </Box>
        </Box>
      </Box>
    </Paper>
  );
}
