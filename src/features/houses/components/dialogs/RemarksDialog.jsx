'use client';

import { useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import CloseIcon from '@mui/icons-material/Close';
import { colors } from '@shared/theme/colors';
import { saveSurvey } from '../../api';

const MAX = 500;

export default function RemarksDialog({ open, onClose, onSaved, houseId, survey }) {
  const [text, setText]     = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState(null);

  useEffect(() => {
    if (!open) return;
    setText(survey?.remarks ?? '');
    setError(null);
  }, [open, survey]);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await saveSurvey(houseId, {
        ...(survey ?? {}),
        remarks: text.trim(),
      });
      onSaved();
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle
        sx={{
          fontSize: 15, fontWeight: 700, color: colors.orange,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          pb: 1, borderBottom: `1px solid ${colors.border}`,
        }}
      >
        सर्वेक्षक की टिप्पणी संपादित करें
        <IconButton onClick={onClose} size="small"><CloseIcon fontSize="small" /></IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        <Box sx={{ position: 'relative' }}>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, MAX))}
            rows={6}
            placeholder="टिप्पणी लिखें..."
            style={{
              width: '100%',
              border: `1px solid #ccc`,
              borderRadius: 6,
              padding: '10px 12px',
              fontSize: 13,
              fontFamily: 'inherit',
              resize: 'vertical',
              outline: 'none',
              color: '#212529',
              boxSizing: 'border-box',
              lineHeight: 1.5,
            }}
          />
          <Typography
            sx={{
              fontSize: 11.5, color: text.length >= MAX * 0.9 ? '#c62828' : colors.textMuted,
              textAlign: 'right', mt: 0.5,
            }}
          >
            {text.length} / {MAX}
          </Typography>
        </Box>

        {error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}
      </DialogContent>

      <DialogActions sx={{ px: 2, pb: 2, pt: 1, gap: 1 }}>
        <Button
          onClick={onClose}
          fullWidth
          variant="outlined"
          sx={{ textTransform: 'none', borderColor: colors.orange, color: colors.orange }}
        >
          रद्द करें
        </Button>
        <Button
          onClick={save}
          disabled={saving}
          fullWidth
          variant="contained"
          sx={{ textTransform: 'none', bgcolor: colors.orange, '&:hover': { bgcolor: colors.orangeDark } }}
        >
          {saving ? 'सहेजा जा रहा…' : 'सहेजें'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
