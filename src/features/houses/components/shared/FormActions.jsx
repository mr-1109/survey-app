'use client';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import { colors } from '@shared/theme/colors';

/** रद्द करें / सहेजें (or custom labels), pinned to the bottom of an edit screen. */
export default function FormActions({ onCancel, onSave, saving, disabled, saveLabel = 'सहेजें', cancelLabel = 'रद्द करें' }) {
  return (
    <Box
      sx={{
        position: 'sticky',
        bottom: 0,
        display: 'flex',
        gap: 1,
        p: 1.25,
        bgcolor: '#fff',
        borderTop: `1px solid ${colors.border}`,
      }}
    >
      <Button onClick={onCancel} fullWidth sx={{ textTransform: 'none' }} disabled={saving}>
        {cancelLabel}
      </Button>
      <Button onClick={onSave} fullWidth variant="contained" sx={{ textTransform: 'none' }} disabled={saving || disabled}>
        {saving ? 'सहेजा जा रहा…' : saveLabel}
      </Button>
    </Box>
  );
}
