'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import CloseIcon from '@mui/icons-material/Close';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import SummarizeOutlinedIcon from '@mui/icons-material/SummarizeOutlined';
import CallOutlinedIcon from '@mui/icons-material/CallOutlined';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { colors } from '@shared/theme/colors';
import { deleteHouse } from '../api';

/** त्वरित कार्य — screen 4. Full-page action sheet opened from घर विवरण. */
export default function QuickActionsSheet({ houseId, house, open, onClose }) {
  const router = useRouter();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);

  function go(path) {
    onClose();
    router.push(path);
  }

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    try {
      await deleteHouse(houseId);
      onClose();
      router.push('/houses/list');
    } catch (e) {
      setError(e.message);
    } finally {
      setDeleting(false);
    }
  }

  const mobile = house?.mobile;

  const ITEMS = [
    {
      icon: EditOutlinedIcon,
      label: 'घर की जानकारी संपादित करें',
      onClick: () => go(`/houses/${houseId}/edit`),
    },
    {
      icon: GroupsOutlinedIcon,
      label: 'प्रभावशाली व्यक्ति देखें / जोड़ें',
      onClick: () => go(`/houses/${houseId}/influencers`),
    },
    {
      icon: AssignmentOutlinedIcon,
      label: 'परिवार सर्वेक्षण (एडिट)',
      onClick: () => go(`/houses/${houseId}/survey`),
    },
    {
      icon: PeopleAltOutlinedIcon,
      label: 'सदस्य (एडिट / जोड़ें)',
      onClick: () => go(`/houses/${houseId}/members`),
    },
    {
      icon: SummarizeOutlinedIcon,
      label: 'सारांश (एडिट स्क्रीन)',
      onClick: () => go(`/houses/${houseId}/summary`),
    },
    {
      icon: CallOutlinedIcon,
      label: 'कॉल करें',
      disabled: !mobile,
      onClick: () => {
        if (mobile) window.location.href = `tel:${mobile}`;
      },
    },
    {
      icon: WhatsAppIcon,
      label: 'WhatsApp करें',
      disabled: !mobile,
      iconColor: '#25d366',
      onClick: () => {
        if (mobile) window.open(`https://wa.me/91${mobile}`, '_blank');
      },
    },
    {
      icon: DeleteOutlineIcon,
      label: 'घर हटाएँ',
      danger: true,
      onClick: () => setConfirmDelete(true),
    },
  ];

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" scroll="paper">
      <DialogTitle
        sx={{
          fontSize: 16,
          fontWeight: 700,
          color: colors.orange,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        त्वरित कार्य
        <IconButton onClick={onClose} size="small">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ p: 0 }}>
        {!confirmDelete && (
          <List sx={{ py: 0 }}>
            {ITEMS.map((item) => (
              <ListItemButton
                key={item.label}
                onClick={item.onClick}
                disabled={item.disabled}
                sx={{ py: 1.25 }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  <item.icon
                    sx={{ color: item.danger ? '#c62828' : item.iconColor ?? colors.orange, fontSize: 20 }}
                  />
                </ListItemIcon>
                <ListItemText
                  primaryTypographyProps={{
                    fontSize: 13.5,
                    fontWeight: 600,
                    color: item.danger ? '#c62828' : colors.text,
                  }}
                  primary={item.label}
                />
                {!item.danger && <ChevronRightIcon sx={{ color: colors.textMuted, fontSize: 18 }} />}
              </ListItemButton>
            ))}
          </List>
        )}

        {confirmDelete && (
          <Box sx={{ p: 2.5 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 700, mb: 1 }}>घर हटाएँ?</Typography>
            <Typography sx={{ fontSize: 12.5, color: colors.textMuted, mb: 2 }}>
              यह घर सूची से हटा दिया जाएगा। यह क्रिया बाद में सुधारी जा सकती है, लेकिन तुरंत सूची में नहीं दिखेगा।
            </Typography>
            {error && <Typography sx={{ fontSize: 12.5, color: '#c62828', mb: 1 }}>{error}</Typography>}
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button onClick={() => setConfirmDelete(false)} fullWidth sx={{ textTransform: 'none' }}>
                नहीं
              </Button>
              <Button
                onClick={handleDelete}
                disabled={deleting}
                fullWidth
                variant="contained"
                color="error"
                sx={{ textTransform: 'none' }}
              >
                {deleting ? 'हटाया जा रहा…' : 'हाँ, हटाएँ'}
              </Button>
            </Box>
          </Box>
        )}
      </DialogContent>
      {!confirmDelete && (
        <DialogActions sx={{ px: 2, pb: 1.5 }}>
          <Button onClick={onClose} fullWidth sx={{ textTransform: 'none' }}>
            बंद करें
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
}
