'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import CallOutlinedIcon from '@mui/icons-material/CallOutlined';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import SummarizeOutlinedIcon from '@mui/icons-material/SummarizeOutlined';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import AppChrome from '@shared/layouts/AppChrome';
import { colors } from '@shared/theme/colors';
import { fetchHouse, deleteHouse, deleteMember } from '../api';
import { STATUS_LABELS, genderLabel } from '../constants';
import HouseInfoDialog    from './dialogs/HouseInfoDialog';
import MemberDialog       from './dialogs/MemberDialog';
import InfluencersDialog  from './dialogs/InfluencersDialog';
import SurveyDialog       from './dialogs/SurveyDialog';
import SummaryDialog      from './dialogs/SummaryDialog';

const STATUS_COLOR = {
  done:    { bg: '#e8f5e9', fg: '#2e7d32' },
  partial: { bg: '#fff8e1', fg: '#b26a00' },
  pending: { bg: '#f1f1f1', fg: colors.textMuted },
};

export default function HouseDetail({ houseId }) {
  const router = useRouter();
  const [data, setData]                   = useState(null);
  const [error, setError]                 = useState(null);
  const [membersExpanded, setMembersExpanded] = useState(false);

  // Dialogs
  const [houseInfoOpen, setHouseInfoOpen]         = useState(false);
  const [memberDialogMember, setMemberDialogMember] = useState(undefined); // undefined=closed, null=add, obj=edit
  const [influencersOpen, setInfluencersOpen]     = useState(false);
  const [surveyOpen, setSurveyOpen]               = useState(false);
  const [summaryOpen, setSummaryOpen]             = useState(false);

  // Delete confirmations
  const [deleteHouseConfirm, setDeleteHouseConfirm] = useState(false);
  const [deletingHouse, setDeletingHouse]           = useState(false);
  const [deleteHouseError, setDeleteHouseError]     = useState(null);
  const [deleteMemberConfirmId, setDeleteMemberConfirmId] = useState(null);
  const [deletingMemberId, setDeletingMemberId]     = useState(null);

  const load = useCallback(() => {
    fetchHouse(houseId)
      .then((d) => { setData(d); setError(null); })
      .catch((e) => setError(e.message));
  }, [houseId]);

  useEffect(load, [load]);

  const house         = data?.house;
  const houseLabel    = house?.house_no ?? house?.house_no_raw ?? '—';
  const status        = STATUS_COLOR[house?.survey_status] ?? STATUS_COLOR.pending;
  const activeMembers = (data?.members ?? []).filter((m) => !m.is_deleted);
  const mobile        = house?.mobile;

  // Members shown: first 3 always; all when expanded
  const visibleMembers = membersExpanded ? activeMembers : activeMembers.slice(0, 3);
  const hasMore        = activeMembers.length > 3;

  async function handleDeleteHouse() {
    setDeletingHouse(true);
    setDeleteHouseError(null);
    try {
      await deleteHouse(houseId);
      router.push('/houses/list');
    } catch (e) {
      setDeleteHouseError(e.message);
      setDeletingHouse(false);
    }
  }

  async function handleDeleteMember(memberId) {
    setDeletingMemberId(memberId);
    try {
      await deleteMember(memberId);
      setDeleteMemberConfirmId(null);
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setDeletingMemberId(null);
    }
  }

  return (
    <AppChrome title={`घर विवरण: ${houseLabel}`}>
      <Box sx={{ flex: 1, p: 1.25 }}>
        {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}

        {!data && !error && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress size={28} />
          </Box>
        )}

        {data && (
          <>
            {/* ── Status badge ───────────────────────────────────── */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
              <Chip
                label={STATUS_LABELS[house.survey_status] ?? 'लंबित'}
                size="small"
                sx={{ bgcolor: status.bg, color: status.fg, fontWeight: 700 }}
              />
            </Box>

            {/* ── घर विवरण card ──────────────────────────────────── */}
            <Paper sx={{ bgcolor: '#fff', borderRadius: 2, boxShadow: '0 1px 3px rgba(0,0,0,0.10)', p: 1.5, mb: 1.25 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, mb: 1 }}>
                <HomeOutlinedIcon sx={{ fontSize: 18, color: colors.orange }} />
                <Typography sx={{ fontSize: 13, fontWeight: 700, color: colors.orange }}>घर विवरण</Typography>
                <IconButton
                  onClick={() => setHouseInfoOpen(true)}
                  size="small"
                  sx={{ ml: 'auto', color: colors.blue }}
                  aria-label="संपादित करें"
                >
                  <EditOutlinedIcon sx={{ fontSize: 17 }} />
                </IconButton>
              </Box>

              <Typography sx={{ fontSize: 12, color: colors.textMuted }}>परिवार मुखिया</Typography>
              <Typography sx={{ fontSize: 14, fontWeight: 700, mb: 1 }}>
                {house.head_name || 'अज्ञात — अभी दर्ज नहीं'}
              </Typography>

              {mobile ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                  <Typography sx={{ fontSize: 13.5, fontWeight: 700 }}>{mobile}</Typography>
                  <WhatsAppIcon sx={{ fontSize: 16, color: '#25d366' }} />
                </Box>
              ) : (
                <Typography sx={{ fontSize: 12.5, color: colors.textMuted, mb: 1 }}>मोबाइल नंबर दर्ज नहीं</Typography>
              )}

              <Typography sx={{ fontSize: 12.5, color: colors.textMuted, mb: 1 }}>{house.area || '—'}</Typography>

              <Box sx={{ display: 'flex', gap: 3 }}>
                <Box>
                  <Typography sx={{ fontSize: 11.5, color: colors.textMuted }}>मकान संख्या</Typography>
                  <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{houseLabel}</Typography>
                </Box>
                <Box>
                  <Typography sx={{ fontSize: 11.5, color: colors.textMuted }}>जाति / उपजाति</Typography>
                  <Typography sx={{ fontSize: 13, fontWeight: 700 }}>
                    {[house.caste, house.subcaste].filter(Boolean).join(' / ') || '—'}
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', gap: 3, mt: 1 }}>
                <Box>
                  <Typography sx={{ fontSize: 11.5, color: colors.textMuted }}>कुल सदस्य</Typography>
                  <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{house.total_members ?? house.voter_count}</Typography>
                </Box>
                <Box>
                  <Typography sx={{ fontSize: 11.5, color: colors.textMuted }}>मतदाता</Typography>
                  <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{house.voter_count}</Typography>
                </Box>
              </Box>
              {house.note && (
                <Typography sx={{ fontSize: 12, color: colors.textMuted, mt: 1 }}>नोट: {house.note}</Typography>
              )}
            </Paper>

            {/* ── सदस्य section ───────────────────────────────────── */}
            <Box sx={{ display: 'flex', alignItems: 'center', px: 0.5, mb: 0.75 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: colors.orange, flex: 1 }}>
                घर के मुख्य सदस्य ({activeMembers.length})
              </Typography>
              {hasMore && (
                <Box
                  onClick={() => setMembersExpanded((v) => !v)}
                  sx={{ display: 'flex', alignItems: 'center', gap: 0.25, cursor: 'pointer', color: colors.blue }}
                >
                  <Typography sx={{ fontSize: 12, fontWeight: 600 }}>
                    {membersExpanded ? 'कम दिखाएं' : 'और सदस्य देखें'}
                  </Typography>
                  {membersExpanded
                    ? <ExpandLessIcon sx={{ fontSize: 16 }} />
                    : <ExpandMoreIcon sx={{ fontSize: 16 }} />
                  }
                </Box>
              )}
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 1 }}>
              {visibleMembers.map((m, i) => (
                <Paper
                  key={m.id}
                  sx={{
                    p: 1.1,
                    borderRadius: 2,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.10)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                  }}
                >
                  <Avatar sx={{ bgcolor: colors.orangeTint, color: colors.orange, fontSize: 12.5, fontWeight: 700, width: 28, height: 28 }}>
                    {i + 1}
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontSize: 13.5, fontWeight: 700 }}>
                      {m.name} ({genderLabel(m.gender)[0]}/{m.age ?? '—'})
                    </Typography>
                    {m.mobile && <Typography sx={{ fontSize: 11.5, color: colors.textMuted }}>📞 {m.mobile}</Typography>}
                  </Box>
                  {m.is_head === 1 && (
                    <Chip label="HEAD" size="small" sx={{ height: 18, fontSize: 10, bgcolor: colors.orange, color: '#fff' }} />
                  )}

                  {/* Edit / delete — only shown when expanded or first 3 with controls */}
                  <Box sx={{ display: 'flex', flexShrink: 0 }}>
                    <IconButton
                      size="small"
                      onClick={() => setMemberDialogMember(m)}
                      sx={{ color: colors.blue }}
                      aria-label="सदस्य संपादित करें"
                    >
                      <EditOutlinedIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => setDeleteMemberConfirmId(m.id)}
                      sx={{ color: '#c62828' }}
                      aria-label="सदस्य हटाएँ"
                    >
                      <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Box>

                  {/* Inline delete confirm */}
                  {deleteMemberConfirmId === m.id && (
                    <Box
                      sx={{ position: 'absolute', display: 'none' }}
                    />
                  )}
                </Paper>
              ))}

              {/* Delete confirm row — rendered below the member card */}
              {deleteMemberConfirmId && (
                <Paper sx={{ p: 1.25, borderRadius: 2, bgcolor: '#fff3e0', display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography sx={{ fontSize: 12.5, flex: 1 }}>
                    क्या आप इस सदस्य को हटाना चाहते हैं?
                  </Typography>
                  <Button onClick={() => setDeleteMemberConfirmId(null)} size="small" sx={{ textTransform: 'none' }}>नहीं</Button>
                  <Button
                    onClick={() => handleDeleteMember(deleteMemberConfirmId)}
                    disabled={deletingMemberId === deleteMemberConfirmId}
                    size="small"
                    variant="contained"
                    color="error"
                    sx={{ textTransform: 'none' }}
                  >
                    {deletingMemberId ? 'हटाया जा रहा…' : 'हाँ, हटाएँ'}
                  </Button>
                </Paper>
              )}

              {activeMembers.length === 0 && (
                <Typography sx={{ textAlign: 'center', color: colors.textMuted, fontSize: 13, py: 2 }}>
                  कोई सदस्य नहीं
                </Typography>
              )}
            </Box>

            {/* + New member button */}
            <Button
              onClick={() => setMemberDialogMember(null)}
              variant="outlined"
              startIcon={<PersonAddAlt1Icon />}
              fullWidth
              sx={{ mb: 2, textTransform: 'none', borderRadius: 5, borderColor: colors.orange, color: colors.orange }}
            >
              + नया सदस्य जोड़ें
            </Button>

            {/* ── त्वरित कार्य section ────────────────────────────── */}
            <Box sx={{ mb: 0.5, px: 0.5 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: colors.orange }}>त्वरित कार्य</Typography>
            </Box>
            <Paper sx={{ borderRadius: 2, boxShadow: '0 1px 3px rgba(0,0,0,0.10)', overflow: 'hidden', mb: 2 }}>
              <List sx={{ py: 0 }}>
                <ListItemButton onClick={() => setHouseInfoOpen(true)} sx={{ py: 1.1, borderBottom: `1px solid ${colors.border}` }}>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <EditOutlinedIcon sx={{ fontSize: 19, color: colors.orange }} />
                  </ListItemIcon>
                  <ListItemText primaryTypographyProps={{ fontSize: 13.5, fontWeight: 600 }} primary="घर की जानकारी संपादित करें" />
                  <ChevronRightIcon sx={{ color: colors.textMuted, fontSize: 18 }} />
                </ListItemButton>

                <ListItemButton onClick={() => setInfluencersOpen(true)} sx={{ py: 1.1, borderBottom: `1px solid ${colors.border}` }}>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <GroupsOutlinedIcon sx={{ fontSize: 19, color: colors.orange }} />
                  </ListItemIcon>
                  <ListItemText primaryTypographyProps={{ fontSize: 13.5, fontWeight: 600 }} primary="प्रभावशाली व्यक्ति देखें / जोड़ें" />
                  <ChevronRightIcon sx={{ color: colors.textMuted, fontSize: 18 }} />
                </ListItemButton>

                <ListItemButton onClick={() => setSurveyOpen(true)} sx={{ py: 1.1, borderBottom: `1px solid ${colors.border}` }}>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <AssignmentOutlinedIcon sx={{ fontSize: 19, color: colors.orange }} />
                  </ListItemIcon>
                  <ListItemText primaryTypographyProps={{ fontSize: 13.5, fontWeight: 600 }} primary="परिवार सर्वेक्षण (एडिट)" />
                  <ChevronRightIcon sx={{ color: colors.textMuted, fontSize: 18 }} />
                </ListItemButton>

                <ListItemButton onClick={() => setMemberDialogMember(null)} sx={{ py: 1.1, borderBottom: `1px solid ${colors.border}` }}>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <PeopleAltOutlinedIcon sx={{ fontSize: 19, color: colors.orange }} />
                  </ListItemIcon>
                  <ListItemText primaryTypographyProps={{ fontSize: 13.5, fontWeight: 600 }} primary="सदस्य (एडिट / जोड़ें)" />
                  <ChevronRightIcon sx={{ color: colors.textMuted, fontSize: 18 }} />
                </ListItemButton>

                <ListItemButton onClick={() => setSummaryOpen(true)} sx={{ py: 1.1, borderBottom: `1px solid ${colors.border}` }}>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <SummarizeOutlinedIcon sx={{ fontSize: 19, color: colors.orange }} />
                  </ListItemIcon>
                  <ListItemText primaryTypographyProps={{ fontSize: 13.5, fontWeight: 600 }} primary="सारांश (एडिट स्क्रीन)" />
                  <ChevronRightIcon sx={{ color: colors.textMuted, fontSize: 18 }} />
                </ListItemButton>

                <ListItemButton
                  onClick={() => mobile && (window.location.href = `tel:${mobile}`)}
                  disabled={!mobile}
                  sx={{ py: 1.1, borderBottom: `1px solid ${colors.border}`, opacity: mobile ? 1 : 0.45 }}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <CallOutlinedIcon sx={{ fontSize: 19, color: colors.orange }} />
                  </ListItemIcon>
                  <ListItemText primaryTypographyProps={{ fontSize: 13.5, fontWeight: 600 }} primary="कॉल करें" />
                  <ChevronRightIcon sx={{ color: colors.textMuted, fontSize: 18 }} />
                </ListItemButton>

                <ListItemButton
                  onClick={() => mobile && window.open(`https://wa.me/91${mobile}`, '_blank')}
                  disabled={!mobile}
                  sx={{ py: 1.1, borderBottom: `1px solid ${colors.border}`, opacity: mobile ? 1 : 0.45 }}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <WhatsAppIcon sx={{ fontSize: 19, color: '#25d366' }} />
                  </ListItemIcon>
                  <ListItemText primaryTypographyProps={{ fontSize: 13.5, fontWeight: 600 }} primary="WhatsApp करें" />
                  <ChevronRightIcon sx={{ color: colors.textMuted, fontSize: 18 }} />
                </ListItemButton>

                <ListItemButton onClick={() => setDeleteHouseConfirm(true)} sx={{ py: 1.1 }}>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <DeleteOutlineIcon sx={{ fontSize: 19, color: '#c62828' }} />
                  </ListItemIcon>
                  <ListItemText primaryTypographyProps={{ fontSize: 13.5, fontWeight: 600, color: '#c62828' }} primary="घर हटाएँ" />
                </ListItemButton>
              </List>
            </Paper>
          </>
        )}
      </Box>

      {/* ── Dialogs ──────────────────────────────────────────────── */}
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

      {/* ── Delete house confirm dialog ───────────────────────── */}
      <Dialog open={deleteHouseConfirm} onClose={() => setDeleteHouseConfirm(false)} maxWidth="xs" fullWidth>
        <DialogContent sx={{ pt: 3 }}>
          <Typography sx={{ fontSize: 14, fontWeight: 700, mb: 1 }}>घर हटाएँ?</Typography>
          <Typography sx={{ fontSize: 12.5, color: colors.textMuted }}>
            यह घर सूची से हटा दिया जाएगा।
          </Typography>
          {deleteHouseError && (
            <Alert severity="error" sx={{ mt: 1 }}>{deleteHouseError}</Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2, gap: 1 }}>
          <Button onClick={() => setDeleteHouseConfirm(false)} fullWidth sx={{ textTransform: 'none' }}>नहीं</Button>
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
