'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Typography from '@mui/material/Typography';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import HowToVoteOutlinedIcon from '@mui/icons-material/HowToVoteOutlined';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import PeopleOutlinedIcon from '@mui/icons-material/PeopleOutlined';
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined';
import AppChrome from '@shared/layouts/AppChrome';
import { colors } from '@shared/theme/colors';
import { fetchHouse, fetchNeighborHouses } from '../api';
import {
  STATUS_LABELS,
  POLITICAL_PARTY_OPTIONS,
  DEVELOPMENT_WORK_OPTIONS,
  CM_SATISFACTION_OPTIONS,
  genderLabel,
} from '../constants';
import FamilyEditDialog      from './dialogs/FamilyEditDialog';
import InfluencersEditDialog from './dialogs/InfluencersEditDialog';
import WorkersEditDialog     from './dialogs/WorkersEditDialog';
import SurveyDialog          from './dialogs/SurveyDialog';

/* ─── Status colours ───────────────────────────────────────────── */
const STATUS_COLOR = {
  done:    { bg: '#2e7d32', fg: '#fff' },
  partial: { bg: '#b26a00', fg: '#fff' },
  pending: { bg: '#757575', fg: '#fff' },
};

/* ─── Helpers ──────────────────────────────────────────────────── */
function parseAreaId(rawId) {
  const parts = String(rawId ?? '').split('_');
  return { ward: parts[1] ? Number(parts[1]) : null };
}

function parseWorkers(str) {
  if (!str || !String(str).trim()) return [];
  return String(str).split(',').map((s) => s.trim()).filter(Boolean);
}

function parseDevWorks(raw) {
  if (Array.isArray(raw)) return raw;
  try { return JSON.parse(raw || '[]'); } catch { return []; }
}

/* ─── Table header / cell shared styles ───────────────────────── */
const TH = {
  background: '#f7f7f7',
  borderBottom: '1.5px solid #ddd',
  padding: '5px 7px',
  textAlign: 'left',
  fontWeight: 700,
  fontSize: 11,
  color: '#555',
  verticalAlign: 'bottom',
  lineHeight: 1.3,
  whiteSpace: 'pre-line',
};
const TD = {
  borderBottom: '1px solid #f0f0f0',
  padding: '5px 7px',
  verticalAlign: 'middle',
  fontSize: 12,
  color: '#212529',
};

/* ─── Sub-components ───────────────────────────────────────────── */

function InfoItem({ icon, text }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.35, mr: 1.5 }}>
      {icon && <Box sx={{ color: colors.orange, display: 'flex', alignItems: 'center' }}>{icon}</Box>}
      <Typography sx={{ fontSize: 11.5, color: colors.text }}>{text}</Typography>
    </Box>
  );
}

function SectionHead({ number, title, onEdit }) {
  return (
    <Box sx={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
      px: 1.5, py: 1, bgcolor: colors.orangeTint,
      borderBottom: `1px solid ${colors.border}`,
    }}>
      <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: colors.orange, flex: 1, pr: 1, lineHeight: 1.4 }}>
        {number}. {title}
      </Typography>
      <Button
        variant="outlined"
        size="small"
        startIcon={<EditOutlinedIcon sx={{ fontSize: 13 }} />}
        onClick={onEdit}
        sx={{
          fontSize: 11, textTransform: 'none', py: 0.25, px: 1, flexShrink: 0, mt: 0.2,
          borderColor: colors.orange, color: colors.orange,
          '&:hover': { borderColor: colors.orangeDark, bgcolor: colors.orangeTint },
        }}
      >
        संपादित करें
      </Button>
    </Box>
  );
}

function SectionBox({ children }) {
  return (
    <Box sx={{ mb: 1, border: `1px solid ${colors.border}`, bgcolor: '#fff', overflow: 'hidden' }}>
      {children}
    </Box>
  );
}

/* ── Member table ── */
function MemberTable({ members, caste }) {
  const scroll = members.length > 5;
  return (
    <Box sx={{ overflowX: 'auto', overflowY: scroll ? 'auto' : 'visible', maxHeight: scroll ? 260 : 'none' }}>
      <table style={{ width: '100%', minWidth: 580, borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ ...TH, width: 30, textAlign: 'center' }}>{'क्र.\nसं.'}</th>
            <th style={TH}>नाम (आयु / लिंग)</th>
            <th style={TH}>{'पिता / पति\nका नाम'}</th>
            <th style={TH}>जाति</th>
            <th style={TH}>मोबाइल</th>
            <th style={TH}>{'नौकरी / व्यवसाय का पूर्ण विवरण\n(पद बाहर रहते हैं तो पता)'}</th>
            <th style={TH}>{'विशेष पारिवारिक विवरण\n(मतदाता श्रेणी)'}</th>
          </tr>
        </thead>
        <tbody>
          {members.map((m, i) => (
            <tr key={m.id} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
              <td style={{ ...TD, textAlign: 'center' }}>{i + 1}</td>
              <td style={TD}>
                <span style={{ fontWeight: 600 }}>{m.name}</span>
                <br />
                <span style={{ fontSize: 10.5, color: '#888' }}>
                  ({genderLabel(m.gender)} / {m.age ?? '—'})
                </span>
              </td>
              <td style={TD}>{m.relative_name || '—'}</td>
              <td style={TD}>{caste || '—'}</td>
              <td style={{ ...TD, whiteSpace: 'nowrap' }}>{m.mobile || '—'}</td>
              <td style={TD}>{m.occupation || '—'}</td>
              <td style={{ ...TD, fontWeight: m.is_head === 1 ? 700 : 400, color: m.is_head === 1 ? colors.orange : undefined }}>
                {m.is_head === 1 ? 'HEAD' : 'अधिवासित'}
              </td>
            </tr>
          ))}
          {members.length === 0 && (
            <tr>
              <td colSpan={7} style={{ ...TD, textAlign: 'center', color: '#999', padding: '12px 8px' }}>
                कोई सदस्य नहीं
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </Box>
  );
}

/* ── Influencer table ── */
function InfluencerTable({ influencers }) {
  if (!influencers.length) {
    return (
      <Typography sx={{ fontSize: 12.5, color: colors.textMuted, px: 1.5, py: 1.5, textAlign: 'center', fontStyle: 'italic' }}>
        कोई प्रभावशाली व्यक्ति नहीं जोड़ा गया
      </Typography>
    );
  }
  return (
    <Box sx={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', minWidth: 380, borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ ...TH, width: 30, textAlign: 'center' }}>{'क्र.\nसं.'}</th>
            <th style={TH}>व्यक्ति का नाम</th>
            <th style={TH}>पार्टी / विचारधारा</th>
            <th style={TH}>विशेष विवरण</th>
            <th style={TH}>{'मोबाइल नंबर\n(पद उपलब्ध हो)'}</th>
          </tr>
        </thead>
        <tbody>
          {influencers.map((inf, i) => (
            <tr key={inf.id ?? i} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
              <td style={{ ...TD, textAlign: 'center' }}>{i + 1}</td>
              <td style={{ ...TD, fontWeight: 600 }}>{inf.name || '—'}</td>
              <td style={TD}>{inf.party || '—'}</td>
              <td style={TD}>{inf.description ?? inf.detail ?? '—'}</td>
              <td style={{ ...TD, whiteSpace: 'nowrap' }}>{inf.mobile || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Box>
  );
}

/* ── Workers numbered list ── */
function WorkersList({ workers }) {
  if (!workers.length) {
    return (
      <Typography sx={{ fontSize: 12, color: colors.textMuted, px: 1.5, py: 1, fontStyle: 'italic' }}>
        कोई जानकारी नहीं
      </Typography>
    );
  }
  return (
    <Box sx={{ px: 1.5, py: 1, display: 'flex', flexWrap: 'wrap' }}>
      {workers.map((w, i) => (
        <Typography key={i} sx={{ fontSize: 12.5, mr: 2, mb: 0.25 }}>
          {i + 1}. {w}
        </Typography>
      ))}
    </Box>
  );
}

/* ── Survey read-only display ── */
function SurveyDisplay({ survey, devWorks }) {
  const party = survey?.political_party ?? '';
  const cm    = survey?.cm_satisfaction ?? '';

  return (
    <Box sx={{ p: 1.25, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1 }}>
      <Box>
        <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: colors.text, mb: 0.5, lineHeight: 1.35 }}>
          परिवार किस पार्टी को सपोर्ट करता है
        </Typography>
        <RadioGroup value={party} sx={{ pointerEvents: 'none' }}>
          {POLITICAL_PARTY_OPTIONS.map((o) => (
            <FormControlLabel
              key={o.value} value={o.value}
              control={<Radio size="small" sx={{ py: 0.2 }} />}
              label={<Typography sx={{ fontSize: 10.5 }}>{o.label}</Typography>}
              sx={{ mx: 0, mb: 0 }}
            />
          ))}
        </RadioGroup>
      </Box>

      <Box>
        <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: colors.text, mb: 0.5, lineHeight: 1.35 }}>
          विकास कार्य के लिए माननीय मुख्यमंत्री जी के कार्यों के प्रति परिवार की संतुति
        </Typography>
        <Box sx={{ pointerEvents: 'none' }}>
          {DEVELOPMENT_WORK_OPTIONS.map((o) => (
            <FormControlLabel
              key={o.value}
              control={<Checkbox size="small" checked={devWorks.includes(o.value)} sx={{ py: 0.2 }} />}
              label={<Typography sx={{ fontSize: 10.5 }}>{o.label}</Typography>}
              sx={{ mx: 0, display: 'flex', mb: 0 }}
            />
          ))}
        </Box>
      </Box>

      <Box>
        <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: colors.text, mb: 0.5, lineHeight: 1.35 }}>
          मेरा परिवार माननीय मुख्यमंत्री जी के कार्यों के प्रति संतुति
        </Typography>
        <RadioGroup value={cm} sx={{ pointerEvents: 'none' }}>
          {CM_SATISFACTION_OPTIONS.map((o) => (
            <FormControlLabel
              key={o.value} value={o.value}
              control={<Radio size="small" sx={{ py: 0.2 }} />}
              label={<Typography sx={{ fontSize: 10.5 }}>{o.label}</Typography>}
              sx={{ mx: 0, mb: 0 }}
            />
          ))}
        </RadioGroup>
      </Box>
    </Box>
  );
}

/* ══════════════════════════════════════════════════════════════ */
/*  Main component                                                 */
/* ══════════════════════════════════════════════════════════════ */

export default function HouseDetail({ houseId }) {
  const router = useRouter();
  const [data, setData]           = useState(null);
  const [error, setError]         = useState(null);
  const [neighbors, setNeighbors] = useState({ prev: null, next: null });

  /* ── section edit dialogs ── */
  const [familyEditOpen,      setFamilyEditOpen]      = useState(false);
  const [influencersEditOpen, setInfluencersEditOpen] = useState(false);
  const [bjpWorkersOpen,      setBjpWorkersOpen]      = useState(false);
  const [congressWorkersOpen, setCongressWorkersOpen] = useState(false);
  const [surveyOpen,          setSurveyOpen]          = useState(false);
  const [notesOpen,           setNotesOpen]           = useState(false);

  /* ── navigation ── */
  const [nextSuccessOpen, setNextSuccessOpen] = useState(false);

  /* ── load data ── */
  const load = useCallback(() => {
    fetchHouse(houseId)
      .then((d) => { setData(d); setError(null); })
      .catch((e) => setError(e.message));
  }, [houseId]);

  useEffect(load, [load]);

  useEffect(() => {
    fetchNeighborHouses(houseId)
      .then(setNeighbors)
      .catch(() => {});
  }, [houseId]);

  /* ── derived ── */
  const house         = data?.house;
  const houseLabel    = house?.house_no ?? house?.house_no_raw ?? '—';
  const statusKey     = house?.survey_status ?? 'pending';
  const statusColor   = STATUS_COLOR[statusKey] ?? STATUS_COLOR.pending;
  const statusLabel   = STATUS_LABELS[statusKey] ?? 'लंबित';
  const activeMembers = (data?.members ?? []).filter((m) => !m.is_deleted);
  const influencers   = data?.influencers ?? [];
  const survey        = data?.survey ?? {};
  const mobile        = house?.mobile;
  const bjpWorkers    = parseWorkers(survey?.colony_workers);
  const cngrWorkers   = parseWorkers(survey?.block_workers);
  const devWorks      = parseDevWorks(survey?.development_works);
  const { ward }      = parseAreaId(house?.area_id);
  const areaLabel     = [ward ? `वार्ड ${ward}` : null, house?.area].filter(Boolean).join(', ');


  /* ── AppChrome right actions: status chip + ⋮ ── */
  const headerActions = house ? (
    <Chip
      label={statusLabel}
      size="small"
      sx={{ bgcolor: statusColor.bg, color: statusColor.fg, fontWeight: 700, fontSize: 11, height: 22, px: 0.25 }}
    />
  ) : null;

  /* ── Sub-header info strip ── */
  const infoStrip = house ? (
    <Box sx={{
      display: 'flex', flexWrap: 'wrap', bgcolor: '#fff',
      borderBottom: `1px solid ${colors.border}`, px: 1.25, py: 0.75,
    }}>
      <InfoItem icon={<PersonOutlinedIcon sx={{ fontSize: 14 }} />}      text={`परिवार प्रमुख: ${house.head_name || 'अज्ञात'}`} />
      <InfoItem icon={<LocationOnOutlinedIcon sx={{ fontSize: 14 }} />}  text={`क्षेत्र: ${areaLabel || '—'}`} />
      <InfoItem icon={<PeopleOutlinedIcon sx={{ fontSize: 14 }} />}      text={`कुल सदस्यः ${house.total_members ?? activeMembers.length}`} />
      <InfoItem icon={<HowToVoteOutlinedIcon sx={{ fontSize: 14 }} />}   text={`मतदाता: ${house.voter_count ?? '—'}`} />
    </Box>
  ) : null;

  /* ══════════════════════════════════════════════════════════ */
  return (
    <AppChrome
      title={house ? `मकान संख्या - ${houseLabel}` : 'मकान विवरण'}
      backTo="/houses/list"
      backLabel="मकान सूची"
      subHeader={infoStrip}
      actions={headerActions}
    >
      <Box sx={{ bgcolor: colors.pageBg, pb: '68px' }}>

        {error && <Alert severity="error" sx={{ m: 1 }}>{error}</Alert>}

        {!data && !error && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress size={28} />
          </Box>
        )}

        {data && (
          <>
            {/* ── 1. परिवार विवरण ─────────────────────────────── */}
            <SectionBox>
              <SectionHead
                number="1"
                title="परिवार विवरण (मतदाता सूची के अनुसार)"
                onEdit={() => setFamilyEditOpen(true)}
              />
              <MemberTable members={activeMembers} caste={house.caste} />
              <Typography sx={{ fontSize: 10.5, color: colors.textMuted, px: 1.5, py: 0.5, fontStyle: 'italic' }}>
                * परिवार के मुखिया के सामने HEAD लिखें
              </Typography>
            </SectionBox>

            {/* ── 2. प्रभावशाली व्यक्ति ──────────────────────── */}
            <SectionBox>
              <SectionHead
                number="2"
                title="आपके वार्ड के प्रमुख प्रभावशाली व्यक्ति"
                onEdit={() => setInfluencersEditOpen(true)}
              />
              <InfluencerTable influencers={influencers} />
            </SectionBox>

            {/* ── 3. BJP workers ──────────────────────────────── */}
            <SectionBox>
              <SectionHead
                number="3"
                title="स्थानीय वार्ड के अंतर्गत बीजेपी में आप किन-किन कार्यकर्ताओं / पदाधिकारियों को जानते हैं :—"
                onEdit={() => setBjpWorkersOpen(true)}
              />
              <WorkersList workers={bjpWorkers} />
            </SectionBox>

            {/* ── 4. Congress workers ─────────────────────────── */}
            <SectionBox>
              <SectionHead
                number="4"
                title="स्थानीय वार्ड के अंतर्गत कांग्रेस में आप किन-किन कार्यकर्ताओं / पदाधिकारियों को जानते हैं :—"
                onEdit={() => setCongressWorkersOpen(true)}
              />
              <WorkersList workers={cngrWorkers} />
            </SectionBox>

            {/* ── 5. सर्वेक्षण टिप्पणी ────────────────────────── */}
            <SectionBox>
              <SectionHead
                number="5"
                title="उपरोक्त परिवार के संबंध में सर्वेक्षण कर्ता की टिप्पणी"
                onEdit={() => setSurveyOpen(true)}
              />
              <SurveyDisplay survey={survey} devWorks={devWorks} />
              {survey?.remarks && (
                <Box sx={{ px: 1.5, pb: 1.25, pt: 0 }}>
                  <Typography sx={{ fontSize: 11, color: colors.textMuted, mb: 0.25 }}>टिप्पणी:</Typography>
                  <Typography sx={{ fontSize: 13, fontStyle: 'italic' }}>{survey.remarks}</Typography>
                </Box>
              )}
            </SectionBox>
          </>
        )}
      </Box>

      {/* ── Sticky footer ──────────────────────────────────────── */}
      {data && (
        <Box sx={{
          position: 'sticky', bottom: 0, zIndex: 4,
          bgcolor: '#fff', borderTop: `1px solid ${colors.border}`,
          px: 1.25, py: 0.875, display: 'flex', gap: 0.75,
        }}>
          <Button
            variant="outlined"
            disabled={!neighbors.prev}
            onClick={() => neighbors.prev && router.push(`/houses/${neighbors.prev.id}`)}
            sx={{
              flex: 1, textTransform: 'none', fontSize: 12, py: 0.75,
              borderColor: colors.orange, color: colors.orange,
              '&:disabled': { borderColor: '#ccc', color: '#aaa' },
            }}
          >
            ← पिछला मकान
          </Button>

          <Button
            variant="outlined"
            onClick={() => setNotesOpen(true)}
            sx={{ flex: 1.2, textTransform: 'none', fontSize: 12, py: 0.75, borderColor: '#aaa', color: colors.text }}
          >
            नोट / टिप्पणी देखें
          </Button>

          <Button
            variant="contained"
            disabled={!neighbors.next}
            onClick={() => neighbors.next && setNextSuccessOpen(true)}
            sx={{
              flex: 1, textTransform: 'none', fontSize: 12, py: 0.75,
              bgcolor: colors.orange, '&:hover': { bgcolor: colors.orangeDark },
              '&:disabled': { bgcolor: '#e0e0e0', color: '#aaa' },
            }}
          >
            अगला मकान →
          </Button>
        </Box>
      )}


      {/* ── Section dialogs ─────────────────────────────────────── */}
      {data && (
        <>
          <FamilyEditDialog
            open={familyEditOpen}
            onClose={() => setFamilyEditOpen(false)}
            onSaved={load}
            houseId={houseId}
            members={data.members}
            house={house}
          />

          <InfluencersEditDialog
            open={influencersEditOpen}
            onClose={() => setInfluencersEditOpen(false)}
            onSaved={load}
            houseId={houseId}
          />

          <WorkersEditDialog
            open={bjpWorkersOpen}
            onClose={() => setBjpWorkersOpen(false)}
            onSaved={load}
            houseId={houseId}
            type="bjp"
            survey={survey}
          />

          <WorkersEditDialog
            open={congressWorkersOpen}
            onClose={() => setCongressWorkersOpen(false)}
            onSaved={load}
            houseId={houseId}
            type="congress"
            survey={survey}
          />

          <SurveyDialog
            open={surveyOpen}
            onClose={() => setSurveyOpen(false)}
            onSaved={load}
            houseId={houseId}
          />
        </>
      )}

      {/* ── अगला मकान success popup ─────────────────────────────── */}
      <Dialog open={nextSuccessOpen} onClose={() => setNextSuccessOpen(false)} maxWidth="xs" fullWidth>
        <DialogContent sx={{ textAlign: 'center', pt: 3.5, pb: 2 }}>
          <CheckCircleIcon sx={{ fontSize: 60, color: '#2e7d32', mb: 1.5 }} />
          <Typography sx={{ fontSize: 17, fontWeight: 700, mb: 0.75 }}>
            सफलतापूर्वक सहेजा गया
          </Typography>
          <Typography sx={{ fontSize: 13.5, color: colors.textMuted }}>
            सभी जानकारी अपडेट कर दी गई है।
          </Typography>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 2.5 }}>
          <Button
            onClick={() => {
              setNextSuccessOpen(false);
              if (neighbors.next) router.push(`/houses/${neighbors.next.id}`);
            }}
            variant="outlined"
            sx={{
              textTransform: 'none', px: 4, fontSize: 14,
              borderColor: colors.orange, color: colors.orange,
              '&:hover': { bgcolor: colors.orangeTint },
            }}
          >
            OK
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Notes dialog ────────────────────────────────────────── */}
      <Dialog open={notesOpen} onClose={() => setNotesOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontSize: 15, fontWeight: 700, color: colors.orange, pb: 1 }}>
          नोट / टिप्पणी
        </DialogTitle>
        <DialogContent sx={{ pt: 0 }}>
          {house?.note && (
            <>
              <Typography sx={{ fontSize: 12, fontWeight: 600, color: colors.textMuted, mb: 0.5 }}>मकान नोट</Typography>
              <Typography sx={{ fontSize: 13, mb: 1.5 }}>{house.note}</Typography>
            </>
          )}
          {survey?.remarks && (
            <>
              <Typography sx={{ fontSize: 12, fontWeight: 600, color: colors.textMuted, mb: 0.5 }}>सर्वेक्षण टिप्पणी</Typography>
              <Typography sx={{ fontSize: 13 }}>{survey.remarks}</Typography>
            </>
          )}
          {!house?.note && !survey?.remarks && (
            <Typography sx={{ fontSize: 13, color: colors.textMuted, textAlign: 'center', py: 2 }}>
              कोई नोट / टिप्पणी नहीं
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 1.5 }}>
          <Button onClick={() => setNotesOpen(false)} sx={{ textTransform: 'none', color: colors.orange }}>बंद करें</Button>
        </DialogActions>
      </Dialog>

    </AppChrome>
  );
}
