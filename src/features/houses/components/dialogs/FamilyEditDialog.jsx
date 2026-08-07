'use client';

import { useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import CloseIcon from '@mui/icons-material/Close';
import { colors } from '@shared/theme/colors';
import { updateMember, addMember } from '../../api';
import { genderLabel } from '../../constants';

/* ── Shared cell styles ── */
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
const CREADONLY = {
  ...CINPUT,
  backgroundColor: '#f7f7f7',
  border: '1px solid #e8e8e8',
  color: '#555',
  cursor: 'default',
};
const CSELECT = {
  ...CINPUT,
  cursor: 'pointer',
  paddingRight: 4,
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

const VOTER_OPTS = ['HEAD', 'अधिवासित'];

function toStr(v) { return v == null ? '' : String(v); }

export default function FamilyEditDialog({ open, onClose, onSaved, houseId, members, house }) {
  const [rows, setRows]     = useState([]);
  const [extra, setExtra]   = useState({ name: '', relName: '', mobile: '', occ: '', isHead: false });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState(null);

  /* ── init rows from props ── */
  useEffect(() => {
    if (!open) return;
    setRows(
      (members ?? [])
        .filter((m) => !m.is_deleted)
        .map((m) => ({
          id:      m.id,
          name:    m.name ?? '',
          age:     m.age  ?? '—',
          gender:  genderLabel(m.gender),
          relName: toStr(m.relative_name),
          mobile:  toStr(m.mobile),
          occ:     toStr(m.occupation),
          isHead:  m.is_head === 1,
          _orig:   m,
        })),
    );
    setExtra({ name: '', relName: '', mobile: '', occ: '', isHead: false });
    setError(null);
  }, [open, members]);

  /* ── update a row field ── */
  function updateRow(i, field, value) {
    setRows((prev) => {
      const next = prev.map((r, j) =>
        j === i ? { ...r, [field]: value } : r,
      );
      /* single HEAD constraint */
      if (field === 'isHead' && value) {
        return next.map((r, j) => j === i ? r : { ...r, isHead: false });
      }
      return next;
    });
  }

  /* ── save all ── */
  async function save() {
    setSaving(true);
    setError(null);
    try {
      const calls = rows.map((row) =>
        updateMember(row.id, {
          relative_name: row.relName || null,
          mobile:        row.mobile  || null,
          occupation:    row.occ     || null,
          is_head:       row.isHead  ? 1 : 0,
        }),
      );

      if (extra.name.trim()) {
        calls.push(
          addMember(houseId, {
            name:          extra.name.trim(),
            relative_name: extra.relName || null,
            mobile:        extra.mobile  || null,
            occupation:    extra.occ     || null,
            is_head:       extra.isHead  ? 1 : 0,
          }),
        );
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
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" scroll="paper">
      <DialogTitle
        sx={{
          fontSize: 15, fontWeight: 700, color: colors.orange,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          pb: 1, borderBottom: `1px solid ${colors.border}`,
        }}
      >
        परिवार विवरण संपादित करें
        <IconButton onClick={onClose} size="small"><CloseIcon fontSize="small" /></IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        {saving ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={26} />
          </Box>
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: 580, borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ ...TH, width: 30, textAlign: 'center' }}>{'क्र.\nसं.'}</th>
                  <th style={TH}>{'नाम\n(आयु / लिंग)'}</th>
                  <th style={TH}>{'पिता / पति\nका नाम'}</th>
                  <th style={TH}>जाति</th>
                  <th style={TH}>मोबाइल</th>
                  <th style={TH}>व्यवसाय / पता</th>
                  <th style={TH}>मतदाता श्रेणी</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={row.id} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                    <td style={{ ...TD, textAlign: 'center', fontSize: 12 }}>{i + 1}</td>

                    {/* name — read only */}
                    <td style={TD}>
                      <div style={{ ...CREADONLY, lineHeight: 1.3 }}>
                        <span style={{ fontSize: 12, fontWeight: 600 }}>{row.name}</span>
                        <br />
                        <span style={{ fontSize: 10.5, color: '#888' }}>{row.age} / {row.gender}</span>
                      </div>
                    </td>

                    <td style={TD}>
                      <input
                        style={CINPUT}
                        value={row.relName}
                        onChange={(e) => updateRow(i, 'relName', e.target.value)}
                        placeholder="पिता / पति का नाम"
                      />
                    </td>

                    {/* caste — house level, read only */}
                    <td style={TD}>
                      <div style={CREADONLY}>{house?.caste || '—'}</div>
                    </td>

                    <td style={TD}>
                      <input
                        style={CINPUT}
                        value={row.mobile}
                        inputMode="numeric"
                        maxLength={10}
                        onChange={(e) => updateRow(i, 'mobile', e.target.value.replace(/\D/g, '').slice(0, 10))}
                        placeholder="मोबाइल"
                      />
                    </td>

                    <td style={TD}>
                      <input
                        style={CINPUT}
                        value={row.occ}
                        onChange={(e) => updateRow(i, 'occ', e.target.value)}
                        placeholder="व्यवसाय / पता"
                      />
                    </td>

                    <td style={TD}>
                      <select
                        style={CSELECT}
                        value={row.isHead ? 'HEAD' : 'अधिवासित'}
                        onChange={(e) => updateRow(i, 'isHead', e.target.value === 'HEAD')}
                      >
                        {VOTER_OPTS.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}

                {/* Extra "अतिरिक्त सदस्य" row */}
                <tr style={{ background: '#fffde7' }}>
                  <td style={{ ...TD, textAlign: 'center', fontSize: 12, color: '#aaa' }}>{rows.length + 1}</td>

                  <td style={TD}>
                    <input
                      style={CINPUT}
                      value={extra.name}
                      onChange={(e) => setExtra((p) => ({ ...p, name: e.target.value }))}
                      placeholder="(अतिरिक्त सदस्य)"
                    />
                  </td>

                  <td style={TD}>
                    <input
                      style={CINPUT}
                      value={extra.relName}
                      onChange={(e) => setExtra((p) => ({ ...p, relName: e.target.value }))}
                      placeholder="पिता / पति का नाम"
                    />
                  </td>

                  <td style={TD}>
                    <div style={CREADONLY}>{house?.caste || '—'}</div>
                  </td>

                  <td style={TD}>
                    <input
                      style={CINPUT}
                      value={extra.mobile}
                      inputMode="numeric"
                      maxLength={10}
                      onChange={(e) => setExtra((p) => ({ ...p, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                      placeholder="मोबाइल"
                    />
                  </td>

                  <td style={TD}>
                    <input
                      style={CINPUT}
                      value={extra.occ}
                      onChange={(e) => setExtra((p) => ({ ...p, occ: e.target.value }))}
                      placeholder="व्यवसाय / पता"
                    />
                  </td>

                  <td style={TD}>
                    <select
                      style={CSELECT}
                      value={extra.isHead ? 'HEAD' : 'अधिवासित'}
                      onChange={(e) => setExtra((p) => ({ ...p, isHead: e.target.value === 'HEAD' }))}
                    >
                      {VOTER_OPTS.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </td>
                </tr>
              </tbody>
            </table>
          </Box>
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
