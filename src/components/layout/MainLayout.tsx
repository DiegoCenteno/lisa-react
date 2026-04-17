import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Box, Toolbar, useMediaQuery, useTheme } from '@mui/material';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import MobileBottomNav from './MobileBottomNav';

const MINI_DRAWER_WIDTH = 76;

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const location = useLocation();
  const isAgendaRoute = location.pathname === '/agenda';

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <Navbar onMenuClick={() => setSidebarOpen(true)} />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: isMobile ? '100%' : `calc(100% - ${MINI_DRAWER_WIDTH}px)`,
          backgroundColor: 'background.default',
        }}
      >
        <Toolbar />
        <Box
          sx={{
            pt: { xs: 2, md: 3 },
            pb: { xs: 'calc(80px + env(safe-area-inset-bottom))', md: 3 },
            pl: { xs: 2, md: 3 },
            pr: {
              xs: 2,
              md: isAgendaRoute ? 0 : 3,
            },
          }}
        >
          <Outlet />
        </Box>
      </Box>
      {isMobile ? <MobileBottomNav /> : null}
    </Box>
  );
}
