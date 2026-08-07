'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import HomeIcon from '@mui/icons-material/Home';
import MenuIcon from '@mui/icons-material/Menu';
import { colors } from '@shared/theme/colors';
import MobileShell from './MobileShell';
import AppSidebar from './AppSidebar';

/**
 * Every screen's frame: phone shell, sticky orange bar with the ☰ menu, and
 * the drawer. `subHeader` rides inside the sticky block (the call list puts
 * its filter bar and tabs there).
 *
 * When `backTo` is provided the hamburger is replaced by ← backLabel and the
 * home icon is hidden — used for detail pages like घर विवरण.
 */
export default function AppChrome({ title, subHeader, children, wide = false, bgcolor, actions, backTo, backLabel }) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <MobileShell wide={wide} bgcolor={bgcolor}>
      <Box sx={{ position: 'sticky', top: 0, zIndex: 3 }}>
        <AppBar position="static" elevation={0} sx={{ bgcolor: colors.orange }}>
          {/* px must be >= 12px: edge="start"/"end" apply a -12px margin, and
              anything less pushes the icon buttons past the viewport. */}
          <Toolbar variant="dense" sx={{ position: 'relative', minHeight: 52, px: 1.5 }}>
            {/* Left: back button or hamburger */}
            {backTo ? (
              <Box sx={{ display: 'flex', alignItems: 'center', zIndex: 1 }}>
                <IconButton
                  edge="start"
                  onClick={() => router.push(backTo)}
                  sx={{ color: '#fff', mr: -0.5 }}
                  aria-label="वापस जाएं"
                >
                  <ArrowBackIcon sx={{ fontSize: 20 }} />
                </IconButton>
                {backLabel && (
                  <Typography
                    onClick={() => router.push(backTo)}
                    sx={{ fontSize: 12, color: 'rgba(255,255,255,0.9)', cursor: 'pointer', userSelect: 'none' }}
                  >
                    {backLabel}
                  </Typography>
                )}
              </Box>
            ) : (
              <IconButton
                edge="start"
                onClick={() => setMenuOpen(true)}
                sx={{ color: '#fff' }}
                aria-label="मेन्यू खोलें"
              >
                <MenuIcon />
              </IconButton>
            )}

            {/* Title — absolutely centered so it stays in the middle regardless of left/right content widths */}
            <Typography
              sx={{
                position: 'absolute',
                left: 0,
                right: 0,
                textAlign: 'center',
                fontSize: 14,
                fontWeight: 600,
                color: '#fff',
                pointerEvents: 'none',
                px: 7,
              }}
            >
              {title}
            </Typography>

            {/* Right: actions + home */}
            <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', zIndex: 1 }}>
              {actions}
              {!backTo && (
                <IconButton
                  edge="end"
                  onClick={() => router.push('/dashboard')}
                  sx={{ color: '#fff' }}
                  aria-label="होम"
                >
                  <HomeIcon />
                </IconButton>
              )}
            </Box>
          </Toolbar>
        </AppBar>
        {subHeader}
      </Box>

      {children}

      {!backTo && <AppSidebar open={menuOpen} onClose={() => setMenuOpen(false)} />}
    </MobileShell>
  );
}
