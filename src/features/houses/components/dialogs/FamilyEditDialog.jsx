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
import CloseIcon from '@mui/icons-material/Close';
import { colors } from '@shared/theme/colors';
import { updateMember, addMember } from '../../api';

/* ── Styles ── */
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
  userSelect: 'none',
};
const CINPUT_SM = { ...CINPUT, padding: '4px 6px', fontSize: 12 };
const CSELECT   = { ...CINPUT, cursor: 'pointer' };

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

const GENDER_LABEL = { M: 'पुरुष', F: 'महिला', O: 'अन्य', पुरुष: 'पुरुष', महिला: 'महिला', अन्य: 'अन्य' };
const GENDER_OPTS  = [{ value: 'M', label: 'पुरुष' }, { value: 'F', label: 'महिला' }, { value: 'O', label: 'अन्य' }];

function toStr(v) { return v == null ? '' : String(v); }

function normalizeGender(g) {
  const map = { पुरुष: 'M', महिला: 'F', अन्य: 'O', M: 'M', F: 'F', O: 'O' };
  return map[g] ?? 'M';
}

/* Read-only name+age/gender display cell */
function NameCell({ m }) {
  const gLabel = GENDER_LABEL[m.gender] ?? m.gender ?? '—';
  return (
    <div style={CREADONLY}>
      <div style={{ fontWeight: 600, marginBottom: 2 }}>{m.name || '—'}</div>
      <div style={{ fontSize: 10.5, color: '#888' }}>
        {m.age ?? '—'} / {gLabel}
      </div>
    </div>
  );
}

export default function FamilyEditDialog({ open, onClose, onSaved, houseId, members }) {
  const [rows, setRows]     = useState([]);
  const [extra, setExtra]   = useState({ name: '', age: '', gender: 'M', relName: '', caste: '', mobile: '', occ: '', isHead: false });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState(null);

  /* init rows from members */
  useEffect(() => {
    if (!open) return;
    setRows(
      (members ?? [])
        .filter((m) => !m.is_deleted)
        .map((m) => ({
          id:     m.id,
          caste:  toStr(m.caste),
          mobile: toStr(m.mobile),
          occ:    toStr(m.occupation),
          isHead: m.is_head === 1,
          _orig:  m,
        })),
    );
    setExtra({ name: '', age: '', gender: 'M', relName: '', caste: '', mobile: '', occ: '', isHead: false });
    setError(null);
  }, [open, members]);

  function upd(i, field, value) {
    setRows((prev) => {
      const next = prev.map((r, j) => j === i ? { ...r, [field]: value } : r);
      if (field === 'isHead' && value)
        return next.map((r, j) => j === i ? r : { ...r, isHead: false });
      return next;
    });
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const calls = rows.map((row) =>
        updateMember(row.id, {
          caste:      row.caste  || null,
          mobile:     row.mobile || null,
          occupation: row.occ   || null,
          is_head:    row.isHead ? 1 : 0,
        }),
      );

      if (extra.name.trim().length >= 2) {
        calls.push(
          addMember(houseId, {
            name:          extra.name.trim(),
            age:           extra.age !== '' ? Number(extra.age) : null,
            gender:        extra.gender || 'M',
            relative_name: extra.relName || null,
            caste:         extra.caste   || null,
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
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" scroll="paper"
      PaperProps={{ sx: { maxHeight: '90vh' } }}>
      <DialogTitle sx={{
        fontSize: 15, fontWeight: 700, color: colors.orange,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        pb: 1, borderBottom: `1px solid ${colors.border}`,
      }}>
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
                  <th style={{ ...TH, width: 28, textAlign: 'center' }}>{'क्र.\nसं.'}</th>
                  <th style={{ ...TH, minWidth: 110 }}>{'नाम\n(आयु / लिंग)'}</th>
                  <th style={TH}>{'पिता / पति\nका नाम'}</th>
                  <th style={{ ...TH, width: 80 }}>जाति</th>
                  <th style={{ ...TH, width: 95 }}>मोबाइल</th>
                  <th style={TH}>व्यवसाय / पता</th>
                  <th style={{ ...TH, width: 95 }}>{'मतदाता\nश्रेणी'}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={row.id} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                    <td style={{ ...TD, textAlign: 'center', fontSize: 12 }}>{i + 1}</td>

                    {/* read-only */}
                    <td style={TD}><NameCell m={row._orig} /></td>

                    {/* read-only */}
                    <td style={TD}>
                      <div style={CREADONLY}>{row._orig.relative_name || '—'}</div>
                    </td>

                    {/* editable */}
                    <td style={TD}>
                      <input style={CINPUT} value={row.caste} onChange={(e) => upd(i, 'caste', e.target.value)} placeholder="जाति" />
                    </td>

                    <td style={TD}>
                      <input
                        style={CINPUT}
                        value={row.mobile}
                        inputMode="numeric"
                        maxLength={10}
                        onChange={(e) => upd(i, 'mobile', e.target.value.replace(/\D/g, '').slice(0, 10))}
                        placeholder="मोबाइल"
                      />
                    </td>

                    <td style={TD}>
                      <input style={CINPUT} value={row.occ} onChange={(e) => upd(i, 'occ', e.target.value)} placeholder="व्यवसाय / पता" />
                    </td>

                    <td style={TD}>
                      <select
                        style={CSELECT}
                        value={row.isHead ? 'HEAD' : 'अधिवासित'}
                        onChange={(e) => upd(i, 'isHead', e.target.value === 'HEAD')}
                      >
                        {VOTER_OPTS.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}

                {/* Extra new-member row — all fields editable */}
                <tr style={{ background: '#fffde7' }}>
                  <td style={{ ...TD, textAlign: 'center', fontSize: 11, color: '#aaa' }}>{rows.length + 1}</td>

                  <td style={TD}>
                    <input style={{ ...CINPUT, marginBottom: 3 }} value={extra.name} onChange={(e) => setExtra((p) => ({ ...p, name: e.target.value }))} placeholder="(अतिरिक्त सदस्य)" />
                    <div style={{ display: 'flex', gap: 3 }}>
                      <input
                        style={{ ...CINPUT_SM, width: 52, textAlign: 'center' }}
                        type="text" inputMode="numeric" pattern="[0-9]*" maxLength={3}
                        value={extra.age}
                        onChange={(e) => setExtra((p) => ({ ...p, age: e.target.value.replace(/\D/g, '').slice(0, 3) }))}
                        placeholder="आयु"
                      />
                      <select style={{ ...CINPUT_SM, cursor: 'pointer', flex: 1 }} value={extra.gender} onChange={(e) => setExtra((p) => ({ ...p, gender: e.target.value }))}>
                        {GENDER_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                  </td>

                  <td style={TD}>
                    <input style={CINPUT} value={extra.relName} onChange={(e) => setExtra((p) => ({ ...p, relName: e.target.value }))} placeholder="पिता / पति का नाम" />
                  </td>

                  <td style={TD}>
                    <input style={CINPUT} value={extra.caste} onChange={(e) => setExtra((p) => ({ ...p, caste: e.target.value }))} placeholder="जाति" />
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
                    <input style={CINPUT} value={extra.occ} onChange={(e) => setExtra((p) => ({ ...p, occ: e.target.value }))} placeholder="व्यवसाय / पता" />
                  </td>

                  <td style={TD}>
                    <select style={CSELECT} value={extra.isHead ? 'HEAD' : 'अधिवासित'} onChange={(e) => setExtra((p) => ({ ...p, isHead: e.target.value === 'HEAD' }))}>
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
        <Button onClick={onClose} fullWidth variant="outlined" sx={{ textTransform: 'none', borderColor: colors.orange, color: colors.orange }}>
          रद्द करें
        </Button>
        <Button onClick={save} disabled={saving} fullWidth variant="contained" sx={{ textTransform: 'none', bgcolor: colors.orange, '&:hover': { bgcolor: colors.orangeDark } }}>
          {saving ? 'सहेजा जा रहा…' : 'सहेजें'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
