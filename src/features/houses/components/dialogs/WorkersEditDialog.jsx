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
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import { colors } from '@shared/theme/colors';
import { saveSurvey } from '../../api';

const CINPUT = {
  border: '1px solid #ccc',
  borderRadius: 4,
  padding: '7px 10px',
  fontSize: 13,
  fontFamily: 'inherit',
  width: '100%',
  color: '#212529',
  backgroundColor: '#fff',
  outline: 'none',
  boxSizing: 'border-box',
};

/* ── type: 'bjp' | 'congress' ── */
export default function WorkersEditDialog({ open, onClose, onSaved, houseId, type, survey }) {
  const [names, setNames]   = useState(['']);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState(null);

  const isBjp = type === 'bjp';
  const field  = isBjp ? 'colony_workers' : 'block_workers';
  const title  = isBjp
    ? 'भाजपा कार्यकर्ता / पदाधिकारी संपादित करें'
    : 'कांग्रेस कार्यकर्ता / पदाधिकारी संपादित करें';

  /* ── init from current survey ── */
  useEffect(() => {
    if (!open) return;
    const raw = survey?.[field] ?? '';
    const parsed = String(raw).trim()
      ? String(raw).split(',').map((s) => s.trim()).filter(Boolean)
      : [];
    setNames(parsed.length ? parsed : ['']);
    setError(null);
  }, [open, survey, field]);

  function updateName(i, value) {
    setNames((prev) => prev.map((n, j) => j === i ? value : n));
  }

  function addName() {
    setNames((prev) => [...prev, '']);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const cleaned = names.map((n) => n.trim()).filter(Boolean);
      await saveSurvey(houseId, {
        ...(survey ?? {}),
        [field]: cleaned.join(', '),
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
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" scroll="paper">
      <DialogTitle
        sx={{
          fontSize: 15, fontWeight: 700, color: colors.orange,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          pb: 1, borderBottom: `1px solid ${colors.border}`,
        }}
      >
        {title}
        <IconButton onClick={onClose} size="small"><CloseIcon fontSize="small" /></IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 1.25 }}>
        {names.map((name, i) => (
          <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography sx={{ fontSize: 13, color: colors.textMuted, minWidth: 22 }}>{i + 1}.</Typography>
            <input
              style={CINPUT}
              value={name}
              onChange={(e) => updateName(i, e.target.value)}
              placeholder={`नाम ${i + 1}`}
            />
          </Box>
        ))}

        <Button
          onClick={addName}
          startIcon={<AddIcon sx={{ fontSize: 15 }} />}
          size="small"
          sx={{
            textTransform: 'none', fontSize: 12.5, alignSelf: 'flex-start',
            borderColor: colors.orange, color: colors.orange,
            border: `1px solid ${colors.orange}`, borderRadius: 4, px: 1.5, mt: 0.5,
          }}
        >
          + नया नाम जोड़ें
        </Button>

        {error && <Alert severity="error">{error}</Alert>}
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
