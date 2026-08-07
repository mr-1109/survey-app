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
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Typography from '@mui/material/Typography';
import CallOutlinedIcon from '@mui/icons-material/CallOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import HowToVoteOutlinedIcon from '@mui/icons-material/HowToVoteOutlined';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import PeopleOutlinedIcon from '@mui/icons-material/PeopleOutlined';
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined';
import SummarizeOutlinedIcon from '@mui/icons-material/SummarizeOutlined';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import AppChrome from '@shared/layouts/AppChrome';
import { colors } from '@shared/theme/colors';
import { fetchHouse, deleteHouse, fetchNeighborHouses } from '../api';
import {
  STATUS_LABELS,
  POLITICAL_PARTY_OPTIONS,
  DEVELOPMENT_WORK_OPTIONS,
  CM_SATISFACTION_OPTIONS,
  genderLabel,
} from '../constants';
import HouseInfoDialog   from './dialogs/HouseInfoDialog';
import MemberDialog      from './dialogs/MemberDialog';
import InfluencersDialog from './dialogs/InfluencersDialog';
import SurveyDialog      from './dialogs/SurveyDialog';
import SummaryDialog     from './dialogs/SummaryDialog';

/* ─── Status chip colours ──────────────────────────────────────── */
const STATUS_COLOR = {
  done:    { bg: '#2e7d32', fg: '#fff' },
  partial: { bg: '#b26a00', fg: '#fff' },
  pending: { bg: '#757575', fg: '#fff' },
};

/* ─── Helpers ──────────────────────────────────────────────────── */
function parseAreaId(rawId) {
  const parts = String(rawId ?? '').split('_');
  return { ward: parts[1] ? Number(parts[1]) : null, bhag: parts[2] ? Number(parts[2]) : null };
}

function parseWorkers(str) {
  if (!str || !String(str).trim()) return [];
  return String(str).split(',').map((s) => s.trim()).filter(Boolean);
}

function parseDevWorks(raw) {
  if (Array.isArray(raw)) return raw;
  try { return JSON.parse(raw || '[]'); } catch { return []; }
}

/* ─── Table shared styles ──────────────────────────────────────── */
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
          fontSize: 11, textTransform: 'none', py: 0.25, px: 1, flexShrink: 0,
          borderColor: colors.orange, color: colors.orange, mt: 0.2,
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
  return (
    <Box sx={{ overflowX: 'auto' }}>
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
              <td style={TD}>{inf.detail || '—'}</td>
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
      {/* Column 1: Political party */}
      <Box>
        <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: colors.text, mb: 0.5, lineHeight: 1.35 }}>
          परिवार किस पार्टी को सपोर्ट करता है
        </Typography>
        <RadioGroup value={party} sx={{ pointerEvents: 'none' }}>
          {POLITICAL_PARTY_OPTIONS.map((o) => (
            <FormControlLabel
              key={o.value}
              value={o.value}
              control={<Radio size="small" sx={{ py: 0.2 }} />}
              label={<Typography sx={{ fontSize: 10.5 }}>{o.label}</Typography>}
              sx={{ mx: 0, mb: 0 }}
            />
          ))}
        </RadioGroup>
      </Box>

      {/* Column 2: Development works */}
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

      {/* Column 3: CM satisfaction */}
      <Box>
        <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: colors.text, mb: 0.5, lineHeight: 1.35 }}>
          मेरा परिवार माननीय मुख्यमंत्री जी के कार्यों के प्रति संतुति
        </Typography>
        <RadioGroup value={cm} sx={{ pointerEvents: 'none' }}>
          {CM_SATISFACTION_OPTIONS.map((o) => (
            <FormControlLabel
              key={o.value}
              value={o.value}
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

/* ═══════════════════════════════════════════════════════════════ */
/*  Main component                                                  */
/* ═══════════════════════════════════════════════════════════════ */

export default function HouseDetail({ houseId }) {
  const router = useRouter();
  const [data, setData]           = useState(null);
  const [error, setError]         = useState(null);
  const [neighbors, setNeighbors] = useState({ prev: null, next: null });

  /* dialog states */
  const [houseInfoOpen,      setHouseInfoOpen]      = useState(false);
  const [memberDialogMember, setMemberDialogMember] = useState(undefined); // undefined=closed null=add obj=edit
  const [influencersOpen,    setInfluencersOpen]    = useState(false);
  const [surveyOpen,         setSurveyOpen]         = useState(false);
  const [summaryOpen,        setSummaryOpen]        = useState(false);
  const [notesOpen,          setNotesOpen]          = useState(false);

  /* delete state */
  const [deleteConfirm,  setDeleteConfirm]  = useState(false);
  const [deletingHouse,  setDeletingHouse]  = useState(false);
  const [deleteHouseErr, setDeleteHouseErr] = useState(null);

  /* more-menu anchor */
  const [moreAnchor, setMoreAnchor] = useState(null);

  /* ── load ── */
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
  const house          = data?.house;
  const houseLabel     = house?.house_no ?? house?.house_no_raw ?? '—';
  const statusKey      = house?.survey_status ?? 'pending';
  const statusColor    = STATUS_COLOR[statusKey] ?? STATUS_COLOR.pending;
  const statusLabel    = STATUS_LABELS[statusKey] ?? 'लंबित';
  const activeMembers  = (data?.members ?? []).filter((m) => !m.is_deleted);
  const influencers    = data?.influencers ?? [];
  const survey         = data?.survey ?? {};
  const mobile         = house?.mobile;
  const bjpWorkers     = parseWorkers(survey?.colony_workers);
  const cngrWorkers    = parseWorkers(survey?.block_workers);
  const devWorks       = parseDevWorks(survey?.development_works);
  const { ward }       = parseAreaId(house?.area_id);
  const areaLabel      = [ward ? `वार्ड ${ward}` : null, house?.area].filter(Boolean).join(', ');

  /* ── delete handler ── */
  async function handleDeleteHouse() {
    setDeletingHouse(true);
    setDeleteHouseErr(null);
    try {
      await deleteHouse(houseId);
      router.push('/houses/list');
    } catch (e) {
      setDeleteHouseErr(e.message);
      setDeletingHouse(false);
    }
  }

  /* ── AppChrome right-side actions: status chip + ⋮ menu ── */
  const headerActions = house ? (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      <Chip
        label={statusLabel}
        size="small"
        sx={{ bgcolor: statusColor.bg, color: statusColor.fg, fontWeight: 700, fontSize: 11, height: 22, px: 0.25 }}
      />
      <IconButton
        onClick={(e) => setMoreAnchor(e.currentTarget)}
        sx={{ color: '#fff' }}
        size="small"
        aria-label="अधिक विकल्प"
      >
        <MoreVertIcon />
      </IconButton>
    </Box>
  ) : null;

  /* ── Sub-header info strip ── */
  const infoStrip = house ? (
    <Box sx={{
      display: 'flex', flexWrap: 'wrap', bgcolor: '#fff',
      borderBottom: `1px solid ${colors.border}`, px: 1.25, py: 0.75, gap: 0,
    }}>
      <InfoItem icon={<PersonOutlinedIcon sx={{ fontSize: 14 }} />} text={`परिवार प्रमुख: ${house.head_name || 'अज्ञात'}`} />
      <InfoItem icon={<LocationOnOutlinedIcon sx={{ fontSize: 14 }} />} text={`क्षेत्र: ${areaLabel || '—'}`} />
      <InfoItem icon={<PeopleOutlinedIcon sx={{ fontSize: 14 }} />} text={`कुल सदस्यः ${house.total_members ?? activeMembers.length}`} />
      <InfoItem icon={<HowToVoteOutlinedIcon sx={{ fontSize: 14 }} />} text={`मतदाता: ${house.voter_count ?? '—'}`} />
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
      {/* extra bottom padding so footer doesn't obscure content */}
      <Box sx={{ bgcolor: colors.pageBg, pb: '68px' }}>

        {error && <Alert severity="error" sx={{ m: 1 }}>{error}</Alert>}

        {!data && !error && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress size={28} />
          </Box>
        )}

        {data && (
          <>
            {/* ── 1. परिवार विवरण ──────────────────────────────── */}
            <SectionBox>
              <SectionHead
                number="1"
                title="परिवार विवरण (मतदाता सूची के अनुसार)"
                onEdit={() => setHouseInfoOpen(true)}
              />
              <MemberTable members={activeMembers} caste={house.caste} />
              <Typography sx={{ fontSize: 10.5, color: colors.textMuted, px: 1.5, py: 0.5, fontStyle: 'italic' }}>
                * परिवार के मुखिया के सामने HEAD लिखें
              </Typography>
            </SectionBox>

            {/* ── 2. प्रभावशाली व्यक्ति ───────────────────────── */}
            <SectionBox>
              <SectionHead
                number="2"
                title="आपके वार्ड के प्रमुख प्रभावशाली व्यक्ति"
                onEdit={() => setInfluencersOpen(true)}
              />
              <InfluencerTable influencers={influencers} />
            </SectionBox>

            {/* ── 6. BJP workers ───────────────────────────────── */}
            <SectionBox>
              <SectionHead
                number="6"
                title="स्थानीय वार्ड के अंतर्गत बीजेपी में आप किन-किन कार्यकर्ताओं / पदाधिकारियों को जानते हैं :—"
                onEdit={() => setSurveyOpen(true)}
              />
              <WorkersList workers={bjpWorkers} />
            </SectionBox>

            {/* ── 6. Congress workers ──────────────────────────── */}
            <SectionBox>
              <SectionHead
                number="6"
                title="स्थानीय वार्ड के अंतर्गत कांग्रेस में आप किन-किन कार्यकर्ताओं / पदाधिकारियों को जानते हैं :—"
                onEdit={() => setSurveyOpen(true)}
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
            </SectionBox>
          </>
        )}
      </Box>

      {/* ── Sticky footer ─────────────────────────────────────── */}
      {data && (
        <Box sx={{
          position: 'sticky', bottom: 0, zIndex: 4,
          bgcolor: '#fff', borderTop: `1px solid ${colors.border}`,
          px: 1.25, py: 0.875,
          display: 'flex', gap: 0.75,
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
            sx={{
              flex: 1.2, textTransform: 'none', fontSize: 12, py: 0.75,
              borderColor: '#aaa', color: colors.text,
            }}
          >
            नोट / टिप्पणी देखें
          </Button>
          <Button
            variant="contained"
            disabled={!neighbors.next}
            onClick={() => neighbors.next && router.push(`/houses/${neighbors.next.id}`)}
            sx={{
              flex: 1, textTransform: 'none', fontSize: 12, py: 0.75,
              bgcolor: colors.orange,
              '&:hover': { bgcolor: colors.orangeDark },
              '&:disabled': { bgcolor: '#e0e0e0', color: '#aaa' },
            }}
          >
            अगला मकान →
          </Button>
        </Box>
      )}

      {/* ── ⋮ More menu ──────────────────────────────────────── */}
      <Menu anchorEl={moreAnchor} open={Boolean(moreAnchor)} onClose={() => setMoreAnchor(null)}>
        <MenuItem onClick={() => { setMoreAnchor(null); setSummaryOpen(true); }}>
          <SummarizeOutlinedIcon sx={{ fontSize: 18, mr: 1.25, color: colors.blue }} />
          सारांश देखें
        </MenuItem>
        <MenuItem
          disabled={!mobile}
          onClick={() => { setMoreAnchor(null); if (mobile) window.location.href = `tel:${mobile}`; }}
        >
          <CallOutlinedIcon sx={{ fontSize: 18, mr: 1.25, color: colors.orange }} />
          कॉल करें
        </MenuItem>
        <MenuItem
          disabled={!mobile}
          onClick={() => { setMoreAnchor(null); if (mobile) window.open(`https://wa.me/91${mobile}`, '_blank'); }}
        >
          <WhatsAppIcon sx={{ fontSize: 18, mr: 1.25, color: '#25d366' }} />
          WhatsApp करें
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={() => { setMoreAnchor(null); setDeleteConfirm(true); }}
          sx={{ color: '#c62828' }}
        >
          <DeleteOutlineIcon sx={{ fontSize: 18, mr: 1.25 }} />
          घर हटाएँ
        </MenuItem>
      </Menu>

      {/* ── Dialogs ──────────────────────────────────────────── */}
      {data && (
        <>
          <HouseInfoDialog
            open={houseInfoOpen}
            onClose={() => setHouseInfoOpen(false)}
            onSaved={load}
            houseId={houseId}
            house={house}
            members={data.members}
          />
          <MemberDialog
            open={memberDialogMember !== undefined}
            onClose={() => setMemberDialogMember(undefined)}
            onSaved={load}
            houseId={houseId}
            member={memberDialogMember ?? null}
          />
          <InfluencersDialog
            open={influencersOpen}
            onClose={() => setInfluencersOpen(false)}
            houseId={houseId}
            houseArea={house?.area}
          />
          <SurveyDialog
            open={surveyOpen}
            onClose={() => setSurveyOpen(false)}
            onSaved={load}
            houseId={houseId}
          />
          <SummaryDialog
            open={summaryOpen}
            onClose={() => setSummaryOpen(false)}
            onSaved={load}
            houseId={houseId}
            data={data}
          />
        </>
      )}

      {/* ── Notes dialog ─────────────────────────────────────── */}
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

      {/* ── Delete confirm dialog ─────────────────────────────── */}
      <Dialog open={deleteConfirm} onClose={() => setDeleteConfirm(false)} maxWidth="xs" fullWidth>
        <DialogContent sx={{ pt: 3 }}>
          <Typography sx={{ fontSize: 14, fontWeight: 700, mb: 1 }}>घर हटाएँ?</Typography>
          <Typography sx={{ fontSize: 12.5, color: colors.textMuted }}>यह घर सूची से हटा दिया जाएगा।</Typography>
          {deleteHouseErr && <Alert severity="error" sx={{ mt: 1 }}>{deleteHouseErr}</Alert>}
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2, gap: 1 }}>
          <Button onClick={() => setDeleteConfirm(false)} fullWidth sx={{ textTransform: 'none' }}>नहीं</Button>
          <Button
            onClick={handleDeleteHouse}
            disabled={deletingHouse}
            fullWidth
            variant="contained"
            color="error"
            sx={{ textTransform: 'none' }}
          >
            {deletingHouse ? 'हटाया जा रहा…' : 'हाँ, हटाएँ'}
          </Button>
        </DialogActions>
      </Dialog>
    </AppChrome>
  );
}
