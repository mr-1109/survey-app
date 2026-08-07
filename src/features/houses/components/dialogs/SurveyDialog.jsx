'use client';

import { useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import CloseIcon from '@mui/icons-material/Close';
import { colors } from '@shared/theme/colors';
import { fetchHouse, saveSurvey } from '../../api';
import {
  POLITICAL_PARTY_OPTIONS,
  DEVELOPMENT_WORK_OPTIONS,
  CM_SATISFACTION_OPTIONS,
  parseJsonArray,
} from '../../constants';
import LimitedTextarea from '../shared/LimitedTextarea';

const EMPTY = {
  political_party: '',
  political_party_other: '',
  development_works: [],
  development_other: '',
  cm_satisfaction: '',
  colony_workers: '',
  block_workers: '',
  remarks: '',
};

export default function SurveyDialog({ open, onClose, onSaved, houseId }) {
  const [form, setForm]       = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetchHouse(houseId)
      .then((d) => {
        const s = d.survey;
        setForm({
          political_party:       s?.political_party       ?? '',
          political_party_other: s?.political_party_other ?? '',
          development_works:     parseJsonArray(s?.development_works),
          development_other:     s?.development_other     ?? '',
          cm_satisfaction:       s?.cm_satisfaction       ?? '',
          colony_workers:        s?.colony_workers        ?? '',
          block_workers:         s?.block_workers         ?? '',
          remarks:               s?.remarks               ?? '',
        });
        setError(null);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [open, houseId]);

  function toggleDevelopment(key) {
    setForm((f) => ({
      ...f,
      development_works: f.development_works.includes(key)
        ? f.development_works.filter((k) => k !== key)
        : [...f.development_works, key],
    }));
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await saveSurvey(houseId, form);
      onSaved();
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" scroll="paper">
      <DialogTitle sx={{ fontSize: 15, fontWeight: 700, color: colors.orange, display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        परिवार सर्वेक्षण (एडिट)
        <IconButton onClick={onClose} size="small"><CloseIcon fontSize="small" /></IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 2 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress size={26} /></Box>
        ) : (
          <>
            {/* Q1 — political party */}
            <Box>
              <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 0.75 }}>
                1. इस परिवार का राजनीतिक झुकाव किस पार्टी की ओर है?
              </Typography>
              <RadioGroup value={form.political_party} onChange={(e) => setForm((f) => ({ ...f, political_party: e.target.value }))}>
                {POLITICAL_PARTY_OPTIONS.map((o) => (
                  <FormControlLabel key={o.value} value={o.value} control={<Radio size="small" />} label={o.label} sx={{ mb: 0 }} />
                ))}
              </RadioGroup>
              {form.political_party === 'other' && (
                <TextField
                  placeholder="पार्टी का नाम लिखें..."
                  value={form.political_party_other}
                  onChange={(e) => setForm((f) => ({ ...f, political_party_other: e.target.value }))}
                  size="small" fullWidth sx={{ mt: 1 }}
                />
              )}
            </Box>

            {/* Q2 — development works */}
            <Box>
              <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 0.75 }}>
                2. विकास कार्यों के लिए (एक या अधिक चुनें)
              </Typography>
              {DEVELOPMENT_WORK_OPTIONS.map((o) => (
                <FormControlLabel
                  key={o.value}
                  control={<Checkbox size="small" checked={form.development_works.includes(o.value)} onChange={() => toggleDevelopment(o.value)} />}
                  label={o.label}
                  sx={{ display: 'flex', mb: 0 }}
                />
              ))}
              <TextField
                placeholder="अन्य विवरण लिखें..."
                value={form.development_other}
                onChange={(e) => setForm((f) => ({ ...f, development_other: e.target.value }))}
                size="small" fullWidth sx={{ mt: 1 }}
              />
            </Box>

            {/* Q3 — CM satisfaction */}
            <Box>
              <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 0.75 }}>
                3. मुख्यमंत्री के कार्यों से आप कितने संतुष्ट हैं?
              </Typography>
              <RadioGroup value={form.cm_satisfaction} onChange={(e) => setForm((f) => ({ ...f, cm_satisfaction: e.target.value }))}>
                {CM_SATISFACTION_OPTIONS.map((o) => (
                  <FormControlLabel key={o.value} value={o.value} control={<Radio size="small" />} label={o.label} sx={{ mb: 0 }} />
                ))}
              </RadioGroup>
            </Box>

            {/* Q4 — colony workers */}
            <LimitedTextarea
              label="4. स्थानीय वार्ड के अंतर्गत कॉलोनी में आप किन-किन कार्यकर्ताओं को जानते हैं?"
              value={form.colony_workers}
              onChange={(v) => setForm((f) => ({ ...f, colony_workers: v }))}
              minRows={2}
            />

            {/* Q5 — block workers */}
            <LimitedTextarea
              label="5. स्थानीय वार्ड के अंतर्गत ब्लॉक में आप किन-किन कार्यकर्ताओं को जानते हैं?"
              value={form.block_workers}
              onChange={(v) => setForm((f) => ({ ...f, block_workers: v }))}
              minRows={2}
            />

            {/* Q6 — remarks */}
            <LimitedTextarea
              label="6. सर्वेक्षण टिप्पणी"
              value={form.remarks}
              onChange={(v) => setForm((f) => ({ ...f, remarks: v }))}
              minRows={3}
            />

            {error && <Alert severity="error">{error}</Alert>}
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 2, py: 1.5, gap: 1 }}>
        <Button onClick={onClose} sx={{ textTransform: 'none' }}>रद्द करें</Button>
        <Button
          onClick={save}
          disabled={loading || saving}
          variant="contained"
          sx={{ textTransform: 'none', bgcolor: colors.orange, '&:hover': { bgcolor: colors.orangeDark } }}
        >
          {saving ? 'सहेजा जा रहा…' : 'सहेजें'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
