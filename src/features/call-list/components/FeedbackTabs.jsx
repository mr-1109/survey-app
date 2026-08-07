'use client';

import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import { colors } from '@shared/theme/colors';
import { FEEDBACK_TABS } from '../constants';

/** Sticky tab strip filtering on FEEDBACK_STATUS. */
export default function FeedbackTabs({ value, onChange }) {
  return (
    <Tabs
      value={value}
      onChange={(_event, next) => onChange(next)}
      variant="fullWidth"
      sx={{
        position: 'sticky',
        top: 0,
        zIndex: 2,
        bgcolor: colors.orangeTint,
        borderBottom: `1px solid ${colors.border}`,
        minHeight: 40,
        '& .MuiTab-root': {
          minHeight: 40,
          minWidth: 0,
          px: 0.5,
          fontSize: 12.5,
          fontWeight: 600,
          color: colors.textMuted,
          textTransform: 'none',
        },
        '& .Mui-selected': { color: colors.orange },
        '& .MuiTabs-indicator': { backgroundColor: colors.orange, height: 3 },
      }}
    >
      {FEEDBACK_TABS.map((tab) => (
        <Tab key={tab.value} value={tab.value} label={tab.label} />
      ))}
    </Tabs>
  );
}
