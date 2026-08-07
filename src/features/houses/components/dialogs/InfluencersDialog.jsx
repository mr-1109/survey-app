'use client';

import { useCallback, useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import { colors } from '@shared/theme/colors';
import { fetchInfluencers, addInfluencer, updateInfluencer, deleteInfluencer } from '../../api';
import LimitedTextarea from '../shared/LimitedTextarea';

const EMPTY_FORM = { name: '', party: '', position: '', mobile: '', address: '', description: '' };

export default function InfluencersDialog({ open, onClose, houseId, houseArea }) {
  const [list, setList]           = useState(null);
  const [error, setError]         = useState(null);
  const [formMode, setFormMode]   = useState(null); // null | 'add' | { ...influencer }
  const [form, setForm]           = useState(EMPTY_FORM);
  const [saving, setSaving]       = useState(false);
  const [formError, setFormError] = useState(null);
  const [confirmId, setConfirmId] = useState(null);

  const load = useCallback(() => {
    if (!open) return;
    fetchInfluencers(houseId)
      .then((d) => { setList(d.influencers); setError(null); })
      .catch((e) => setError(e.message));
  }, [houseId, open]);

  useEffect(load, [load]);

  function openAdd() {
    setForm({ ...EMPTY_FORM, address: houseArea ?? '' });
    setFormMode('add');
    setFormError(null);
  }

  function openEdit(p) {
    setForm({ name: p.name ?? '', party: p.party ?? '', position: p.position ?? '', mobile: p.mobile ?? '', address: p.address ?? '', description: p.description ?? '' });
    setFormMode(p);
    setFormError(null);
  }

  function cancelForm() { setFormMode(null); setFormError(null); }

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const canSave = form.name.trim() && form.party.trim() && form.description.trim();

  async function save() {
    setSaving(true);
    setFormError(null);
    try {
      if (formMode === 'add') {
        await addInfluencer(houseId, form);
      } else {
        await updateInfluencer(formMode.id, form);
      }
      setFormMode(null);
      load();
    } catch (e) {
      setFormError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(id) {
    try {
      await deleteInfluencer(id);
      setConfirmId(null);
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" scroll="paper">
      <DialogTitle sx={{ fontSize: 15, fontWeight: 700, color: colors.orange, display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        प्रभावशाली व्यक्ति
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {!formMode && (
            <Button
              onClick={openAdd}
              startIcon={<AddIcon sx={{ fontSize: 15 }} />}
              size="small"
              sx={{ textTransform: 'none', fontSize: 12.5, color: colors.orange, border: `1px solid ${colors.orange}`, borderRadius: 4, px: 1 }}
            >
              जोड़ें
            </Button>
          )}
          <IconButton onClick={onClose} size="small"><CloseIcon fontSize="small" /></IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 0 }}>
        {/* ── Add / Edit form ────────────────────────────────────── */}
        {formMode && (
          <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 700, color: colors.orange }}>
              {formMode === 'add' ? '+ नया प्रभावशाली व्यक्ति' : 'प्रभावशाली व्यक्ति संपादित करें'}
            </Typography>
            <TextField label="व्यक्ति का नाम*" value={form.name} onChange={set('name')} size="small" fullWidth />
            <TextField label="पार्टी / विचारधारा*" value={form.party} onChange={set('party')} size="small" fullWidth />
            <TextField label="पद / पहचान" value={form.position} onChange={set('position')} size="small" fullWidth />
            <TextField
              label="मोबाइल नंबर"
              value={form.mobile}
              onChange={(e) => setForm((f) => ({ ...f, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
              size="small" fullWidth inputProps={{ inputMode: 'numeric' }}
            />
            <TextField label="पता" value={form.address} onChange={set('address')} size="small" fullWidth multiline minRows={2} />
            <LimitedTextarea
              label="प्रभाव / विशेष विवरण*"
              value={form.description}
              onChange={(v) => setForm((f) => ({ ...f, description: v }))}
              minRows={3}
            />
            {formError && <Alert severity="error">{formError}</Alert>}
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button onClick={cancelForm} fullWidth sx={{ textTransform: 'none' }}>रद्द करें</Button>
              <Button
                onClick={save}
                disabled={!canSave || saving}
                variant="contained"
                fullWidth
                sx={{ textTransform: 'none', bgcolor: colors.orange, '&:hover': { bgcolor: colors.orangeDark } }}
              >
                {saving ? 'सहेजा जा रहा…' : 'सहेजें'}
              </Button>
            </Box>
            <Divider />
          </Box>
        )}

        {/* ── List ───────────────────────────────────────────────── */}
        <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}

          {!list && !error && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress size={26} /></Box>
          )}

          {list?.length === 0 && !formMode && (
            <Typography sx={{ textAlign: 'center', color: colors.textMuted, fontSize: 13.5, py: 3 }}>
              कोई प्रभावशाली व्यक्ति दर्ज नहीं
            </Typography>
          )}

          {list?.map((p, i) => (
            <Paper key={p.id} sx={{ p: 1.25, borderRadius: 2, boxShadow: '0 1px 3px rgba(0,0,0,0.10)' }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.25 }}>
                <Avatar sx={{ bgcolor: colors.orangeTint, color: colors.orange, fontSize: 13, fontWeight: 700, width: 30, height: 30 }}>
                  {i + 1}
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontSize: 13.5, fontWeight: 700 }}>{p.name}</Typography>
                  <Typography sx={{ fontSize: 12, color: colors.textMuted }}>पार्टी: {p.party}</Typography>
                  {p.position && <Typography sx={{ fontSize: 12, color: colors.textMuted }}>पद: {p.position}</Typography>}
                  {p.mobile && <Typography sx={{ fontSize: 12, color: colors.textMuted }}>📞 {p.mobile}</Typography>}
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                  <IconButton size="small" onClick={() => openEdit(p)} sx={{ color: colors.blue }}>
                    <EditOutlinedIcon sx={{ fontSize: 17 }} />
                  </IconButton>
                  <IconButton size="small" onClick={() => setConfirmId(p.id)} sx={{ color: '#c62828' }}>
                    <DeleteOutlineIcon sx={{ fontSize: 17 }} />
                  </IconButton>
                </Box>
              </Box>

              {confirmId === p.id && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1, pt: 1, borderTop: `1px solid ${colors.border}` }}>
                  <Typography sx={{ fontSize: 12, color: colors.textMuted, flex: 1 }}>पक्का हटाना है?</Typography>
                  <Button onClick={() => setConfirmId(null)} size="small" sx={{ textTransform: 'none' }}>नहीं</Button>
                  <Button onClick={() => remove(p.id)} size="small" variant="contained" color="error" sx={{ textTransform: 'none' }}>हाँ, हटाएँ</Button>
                </Box>
              )}
            </Paper>
          ))}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 2, py: 1.5 }}>
        <Button onClick={onClose} fullWidth sx={{ textTransform: 'none' }}>बंद करें</Button>
      </DialogActions>
    </Dialog>
  );
}
