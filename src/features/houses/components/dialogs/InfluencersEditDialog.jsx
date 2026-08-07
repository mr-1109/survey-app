'use client';

import { useCallback, useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import { colors } from '@shared/theme/colors';
import { fetchInfluencers, addInfluencer, updateInfluencer, deleteInfluencer } from '../../api';

/* ── Cell styles (same scheme as FamilyEditDialog) ── */
const CINPUT = {
  border: '1px solid #ccc',
  borderRadius: 4,
  padding: '5px 7px',
  fontSize: 12,
  fontFamily: 'inherit',
  width: '100%',
  color: '#212529',
  backgroundColor: '#fff',
  outline: 'none',
  boxSizing: 'border-box',
};
const TH = {
  background: colors.orangeTint,
  borderBottom: `1.5px solid ${colors.border}`,
  padding: '6px 7px',
  textAlign: 'left',
  fontWeight: 700,
  fontSize: 11,
  color: colors.orange,
  whiteSpace: 'pre-line',
  lineHeight: 1.3,
  verticalAlign: 'bottom',
};
const TD = {
  borderBottom: '1px solid #f0f0f0',
  padding: '4px 6px',
  verticalAlign: 'middle',
};

function makeRow(inf) {
  return {
    _id:         inf?.id         ?? null,
    name:        inf?.name       ?? '',
    party:       inf?.party      ?? '',
    description: inf?.description ?? inf?.detail ?? '',
    mobile:      inf?.mobile     ?? '',
    _orig:       inf ?? null,
  };
}

export default function InfluencersEditDialog({ open, onClose, onSaved, houseId }) {
  const [rows, setRows]     = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState(null);

  /* ── load influencers ── */
  const load = useCallback(() => {
    if (!open) return;
    setLoading(true);
    fetchInfluencers(houseId)
      .then((d) => {
        setRows((d.influencers ?? []).map(makeRow));
        setError(null);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [houseId, open]);

  useEffect(load, [load]);

  /* ── update a field ── */
  function updateField(i, field, value) {
    setRows((prev) => prev.map((r, j) => j === i ? { ...r, [field]: value } : r));
  }

  /* ── add blank row ── */
  function addRow() {
    setRows((prev) => [...prev, makeRow(null)]);
  }

  /* ── save ── */
  async function save() {
    setSaving(true);
    setError(null);
    try {
      const calls = [];

      for (const row of rows) {
        const name        = row.name.trim();
        const party       = row.party.trim();
        const description = row.description.trim();
        const mobile      = row.mobile.replace(/\D/g, '');

        if (row._id) {
          /* existing — delete if name cleared, else update */
          if (!name) {
            calls.push(deleteInfluencer(row._id));
          } else {
            calls.push(
              updateInfluencer(row._id, {
                name,
                party:       party       || '—',
                description: description || '—',
                mobile:      mobile      || null,
              }),
            );
          }
        } else if (name) {
          /* new row — only save if name is provided */
          calls.push(
            addInfluencer(houseId, {
              name,
              party:       party       || '—',
              description: description || '—',
              mobile:      mobile      || null,
            }),
          );
        }
      }

      await Promise.all(calls);
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
      <DialogTitle
        sx={{
          fontSize: 15, fontWeight: 700, color: colors.orange,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          pb: 1, borderBottom: `1px solid ${colors.border}`,
        }}
      >
        प्रभावशाली व्यक्ति संपादित करें
        <IconButton onClick={onClose} size="small"><CloseIcon fontSize="small" /></IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={26} />
          </Box>
        ) : (
          <>
            <Box sx={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', minWidth: 420, borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ ...TH, width: 30, textAlign: 'center' }}>{'क्र.\nसं.'}</th>
                    <th style={TH}>व्यक्ति का नाम</th>
                    <th style={TH}>{'पार्टी /\nविचारधारा'}</th>
                    <th style={TH}>विशेष विवरण</th>
                    <th style={TH}>{'मोबाइल नंबर\n(पद उपलब्ध हो)'}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                      <td style={{ ...TD, textAlign: 'center', fontSize: 12 }}>{i + 1}</td>
                      <td style={TD}>
                        <input
                          style={CINPUT}
                          value={row.name}
                          onChange={(e) => updateField(i, 'name', e.target.value)}
                          placeholder="नाम दर्ज करें"
                        />
                      </td>
                      <td style={TD}>
                        <input
                          style={CINPUT}
                          value={row.party}
                          onChange={(e) => updateField(i, 'party', e.target.value)}
                          placeholder="पार्टी"
                        />
                      </td>
                      <td style={TD}>
                        <input
                          style={CINPUT}
                          value={row.description}
                          onChange={(e) => updateField(i, 'description', e.target.value)}
                          placeholder="विशेष विवरण"
                        />
                      </td>
                      <td style={TD}>
                        <input
                          style={CINPUT}
                          value={row.mobile}
                          inputMode="numeric"
                          maxLength={10}
                          onChange={(e) => updateField(i, 'mobile', e.target.value.replace(/\D/g, '').slice(0, 10))}
                          placeholder="मोबाइल"
                        />
                      </td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ ...TD, textAlign: 'center', color: '#aaa', padding: '12px' }}>
                        कोई प्रभावशाली व्यक्ति नहीं — नीचे जोड़ें
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </Box>

            {/* + add row button */}
            <Box sx={{ px: 1.5, py: 1 }}>
              <Button
                onClick={addRow}
                startIcon={<AddIcon sx={{ fontSize: 15 }} />}
                size="small"
                sx={{
                  textTransform: 'none', fontSize: 12.5,
                  borderColor: colors.orange, color: colors.orange,
                  border: `1px solid ${colors.orange}`, borderRadius: 4, px: 1.5,
                }}
              >
                + नया व्यक्ति जोड़ें
              </Button>
            </Box>
          </>
        )}

        {error && <Alert severity="error" sx={{ mx: 2, mt: 1 }}>{error}</Alert>}
      </DialogContent>

      <DialogActions sx={{ px: 2, pb: 2, pt: 1.5, gap: 1 }}>
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
          disabled={loading || saving}
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
