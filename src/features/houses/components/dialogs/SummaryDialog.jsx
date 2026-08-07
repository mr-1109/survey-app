'use client';

import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloseIcon from '@mui/icons-material/Close';
import { colors } from '@shared/theme/colors';
import { finalizeHouse } from '../../api';
import { politicalPartyLabel, cmSatisfactionLabel, developmentSummary, genderLabel } from '../../constants';

function Row({ label, value }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, py: 0.5 }}>
      <Typography sx={{ fontSize: 12.5, color: colors.textMuted }}>{label}</Typography>
      <Typography sx={{ fontSize: 13, fontWeight: 700, color: colors.text, textAlign: 'right' }}>{value || '—'}</Typography>
    </Box>
  );
}

export default function SummaryDialog({ open, onClose, onSaved, houseId, data }) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);
  const [error, setError]   = useState(null);

  const house   = data?.house;
  const survey  = data?.survey;
  const members = (data?.members ?? []).filter((m) => !m.is_deleted);

  async function finalize() {
    setSaving(true);
    setError(null);
    try {
      await finalizeHouse(houseId);
      setSaved(true);
      onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  function handleClose() {
    setSaved(false);
    onClose();
  }

  if (!house) return null;

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm" scroll="paper">
      <DialogTitle sx={{ fontSize: 15, fontWeight: 700, color: colors.orange, display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        सारांश (एडिट स्क्रीन)
        <IconButton onClick={handleClose} size="small"><CloseIcon fontSize="small" /></IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pt: 2 }}>
        {saved ? (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <CheckCircleIcon sx={{ fontSize: 54, color: '#2e7d32', mb: 1.5 }} />
            <Typography sx={{ fontSize: 15, fontWeight: 700 }}>ड्राफ्ट सफलतापूर्वक सहेज दिया गया है।</Typography>
          </Box>
        ) : (
          <>
            {/* House info */}
            <Paper sx={{ p: 1.5, borderRadius: 2, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: colors.orange, mb: 0.5 }}>घर जानकारी</Typography>
              <Row label="घर संख्या"      value={house.house_no ?? house.house_no_raw} />
              <Row label="परिवार प्रमुख"  value={house.head_name} />
              <Row label="क्षेत्र / मोहल्ला" value={house.area} />
              <Row label="जाति"           value={house.caste} />
              <Row label="कुल सदस्य"      value={house.total_members ?? house.voter_count} />
              <Row label="मतदाताओं की संख्या" value={house.voter_count} />
              {house.mobile && <Row label="मोबाइल" value={house.mobile} />}
            </Paper>

            {/* Members */}
            {members.length > 0 && (
              <Paper sx={{ p: 1.5, borderRadius: 2, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                <Typography sx={{ fontSize: 13, fontWeight: 700, color: colors.orange, mb: 0.5 }}>
                  सदस्य ({members.length})
                </Typography>
                {members.map((m) => (
                  <Box key={m.id} sx={{ py: 0.5, borderBottom: `1px solid ${colors.border}`, '&:last-child': { borderBottom: 'none' } }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
                      {m.name} ({genderLabel(m.gender)}{m.age ? `/${m.age}` : ''})
                      {m.is_head === 1 && <Box component="span" sx={{ ml: 1, fontSize: 11, bgcolor: colors.orange, color: '#fff', px: 0.75, py: 0.1, borderRadius: 1 }}>HEAD</Box>}
                    </Typography>
                    {m.mobile && <Typography sx={{ fontSize: 11.5, color: colors.textMuted }}>📞 {m.mobile}</Typography>}
                  </Box>
                ))}
              </Paper>
            )}

            {/* Survey */}
            <Paper sx={{ p: 1.5, borderRadius: 2, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: colors.orange, mb: 0.5 }}>परिवार सर्वेक्षण</Typography>
              <Row label="राजनीतिक झुकाव" value={politicalPartyLabel(survey?.political_party)} />
              <Row label="विकास कार्य"     value={developmentSummary(survey?.development_works)} />
              <Row label="CM से संतुष्टि"  value={cmSatisfactionLabel(survey?.cm_satisfaction)} />
              <Row label="कॉलोनी कार्यकर्ता" value={survey?.colony_workers} />
              <Row label="ब्लॉक कार्यकर्ता" value={survey?.block_workers} />
              {survey?.remarks && (
                <Box sx={{ mt: 0.75 }}>
                  <Typography sx={{ fontSize: 12, color: colors.textMuted }}>टिप्पणी:</Typography>
                  <Typography sx={{ fontSize: 13, fontStyle: 'italic' }}>"{survey.remarks}"</Typography>
                </Box>
              )}
            </Paper>

            {/* Influencers */}
            {data?.influencers?.length > 0 && (
              <Paper sx={{ p: 1.5, borderRadius: 2, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                <Typography sx={{ fontSize: 13, fontWeight: 700, color: colors.orange, mb: 0.5 }}>
                  प्रभावशाली व्यक्ति ({data.influencers.length})
                </Typography>
                {data.influencers.map((p) => (
                  <Box key={p.id} sx={{ py: 0.5, borderBottom: `1px solid ${colors.border}`, '&:last-child': { borderBottom: 'none' } }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{p.name}</Typography>
                    <Typography sx={{ fontSize: 11.5, color: colors.textMuted }}>पार्टी: {p.party}{p.position ? ` | पद: ${p.position}` : ''}</Typography>
                  </Box>
                ))}
              </Paper>
            )}

            {error && <Alert severity="error">{error}</Alert>}
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 2, py: 1.5, gap: 1 }}>
        <Button onClick={handleClose} sx={{ textTransform: 'none' }}>{saved ? 'बंद करें' : 'रद्द करें'}</Button>
        {!saved && (
          <Button
            onClick={finalize}
            disabled={saving}
            variant="contained"
            sx={{ textTransform: 'none', bgcolor: colors.orange, '&:hover': { bgcolor: colors.orangeDark } }}
          >
            {saving ? 'सहेजा जा रहा…' : 'सहेजें और पूर्ण करें'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
