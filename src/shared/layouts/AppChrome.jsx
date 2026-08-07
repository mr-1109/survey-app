'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import MenuIcon from '@mui/icons-material/Menu';
import HomeIcon from '@mui/icons-material/Home';
import { colors } from '@shared/theme/colors';
import MobileShell from './MobileShell';
import AppSidebar from './AppSidebar';

/**
 * Every screen's frame: phone shell, sticky orange bar with the ☰ menu, and
 * the drawer. `subHeader` rides inside the sticky block (the call list puts
 * its filter bar and tabs there).
 */
export default function AppChrome({ title, subHeader, children, wide = false, bgcolor, actions }) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <MobileShell wide={wide} bgcolor={bgcolor}>
      <Box sx={{ position: 'sticky', top: 0, zIndex: 3 }}>
        <AppBar position="static" elevation={0} sx={{ bgcolor: colors.orange }}>
          {/* px must be >= 12px: edge="start"/"end" apply a -12px margin, and
              anything less pushes the icon buttons past the viewport. */}
          <Toolbar variant="dense" sx={{ minHeight: 52, px: 1.5 }}>
            <IconButton
              edge="start"
              onClick={() => setMenuOpen(true)}
              sx={{ color: '#fff' }}
              aria-label="मेन्यू खोलें"
            >
              <MenuIcon />
            </IconButton>
            <Typography sx={{ flex: 1, fontSize: 15, fontWeight: 600, color: '#fff' }}>
              {title}
            </Typography>
            {actions}
            <IconButton
              edge="end"
              onClick={() => router.push('/dashboard')}
              sx={{ color: '#fff' }}
              aria-label="होम"
            >
              <HomeIcon />
            </IconButton>
          </Toolbar>
        </AppBar>
        {subHeader}
      </Box>

      {children}

      <AppSidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
    </MobileShell>
  );
}
