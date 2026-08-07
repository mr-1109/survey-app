'use client';

import { useCallback, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import DashboardIcon from '@mui/icons-material/Dashboard';
// import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted'; // कॉल सूची — commented out for now
import HomeWorkIcon from '@mui/icons-material/HomeWork';
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import { colors } from '@shared/theme/colors';
import { useSettingsContext } from '@shared/settings/SettingsContext';

const WIDTH = 288;

function NavItem({ icon: Icon, label, active, onClick, indent = false, badge }) {
  return (
    <ListItemButton
      onClick={onClick}
      sx={{
        pl: indent ? 4.5 : 2,
        bgcolor: active ? colors.orangeTint : 'transparent',
        borderRight: active ? `3px solid ${colors.orange}` : '3px solid transparent',
      }}
    >
      <ListItemIcon sx={{ minWidth: 36 }}>
        <Icon sx={{ color: active ? colors.orange : colors.textMuted, fontSize: 20 }} />
      </ListItemIcon>
      <ListItemText
        primaryTypographyProps={{
          fontSize: 14,
          fontWeight: active ? 700 : 500,
          color: active ? colors.orange : colors.text,
        }}
        primary={label}
      />
      {badge > 0 && (
        <Chip
          label={badge}
          size="small"
          sx={{ height: 20, fontSize: 11, bgcolor: colors.orange, color: '#fff' }}
        />
      )}
    </ListItemButton>
  );
}

export default function AppSidebar({ open, onClose }) {
  const router = useRouter();
  const pathname = usePathname();
  const { reset } = useSettingsContext();

  const [confirmLogout, setConfirmLogout] = useState(false);

  const go = useCallback(
    (href) => {
      onClose();
      router.push(href);
    },
    [onClose, router],
  );

  const handleLogout = useCallback(async () => {
    reset();
    setConfirmLogout(false);
    onClose();
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    router.replace('/');
    router.refresh();
  }, [reset, onClose, router]);

  return (
    <>
      <Drawer
        anchor="left"
        open={open}
        onClose={onClose}
        // The whole drawer scrolls as one column — a `flex:1` scroll area with a
        // pinned footer clipped items whenever the list outgrew the viewport.
        PaperProps={{ sx: { width: WIDTH, overflowY: 'auto' } }}
      >
        <Box sx={{ bgcolor: colors.orange, color: '#fff', px: 2, py: 2 }}>
          <Typography sx={{ fontSize: 16, fontWeight: 700 }}>सर्वेक्षण ऐप</Typography>
        </Box>

        <List sx={{ py: 0 }}>
          <NavItem
            icon={DashboardIcon}
            label="डैशबोर्ड (होम)"
            active={pathname === '/dashboard'}
            onClick={() => go('/dashboard')}
          />
          {/* कॉल सूची — commented out for now, per request. Route and data are
              untouched; restore this block to bring the nav entry back.
          <NavItem
            icon={FormatListBulletedIcon}
            label="कॉल सूची"
            active={pathname === '/call-list'}
            onClick={() => go('/call-list')}
          />
          */}

          <NavItem
            icon={HomeWorkIcon}
            label="घर सर्वेक्षण"
            active={pathname.startsWith('/houses')}
            onClick={() => go('/houses/list')}
          />

          <NavItem
            icon={PersonAddAlt1Icon}
            label="उपयोगकर्ता जोड़ें"
            active={pathname === '/users'}
            onClick={() => go('/users')}
          />

          <Divider sx={{ my: 1 }} />

          <NavItem
            icon={SettingsIcon}
            label="सेटिंग्स"
            active={pathname === '/settings'}
            onClick={() => go('/settings')}
          />

          <Divider sx={{ my: 1 }} />

          <ListItemButton onClick={() => setConfirmLogout(true)} sx={{ py: 1.5, pl: 2 }}>
            <ListItemIcon sx={{ minWidth: 36 }}>
              <LogoutIcon sx={{ color: '#c62828', fontSize: 20 }} />
            </ListItemIcon>
            <ListItemText
              primaryTypographyProps={{ fontSize: 14, fontWeight: 700, color: '#c62828' }}
              primary="लॉगआउट"
            />
          </ListItemButton>
        </List>
      </Drawer>

      <Dialog open={confirmLogout} onClose={() => setConfirmLogout(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontSize: 16, fontWeight: 700 }}>लॉगआउट करें?</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 13.5, color: colors.textMuted }}>
            आपका सत्र समाप्त हो जाएगा और इस डिवाइस की सेटिंग्स हट जाएँगी। मतदाताओं का फीडबैक,
            उपयोगकर्ता और फॉलो-अप सुरक्षित रहेंगे।
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConfirmLogout(false)} sx={{ textTransform: 'none' }}>
            रहने दें
          </Button>
          <Button onClick={handleLogout} variant="contained" color="error" sx={{ textTransform: 'none' }}>
            लॉगआउट
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
