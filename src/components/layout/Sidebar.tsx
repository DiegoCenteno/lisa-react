import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  Typography,
  Divider,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  CalendarMonth as CalendarIcon,
  People as PeopleIcon,
  Assignment as ConsultationIcon,
  History as HistoryIcon,
  Sms as WhatsAppIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';
import { UserRole } from '../../types';

const DRAWER_WIDTH = 260;
const MINI_DRAWER_WIDTH = 76;

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

interface MenuItem {
  text: string;
  icon: React.ReactNode;
  path: string;
  roles: UserRole[];
  permission?: string;
}

const menuItems: MenuItem[] = [
  {
    text: 'Dashboard',
    icon: <DashboardIcon />,
    path: '/dashboard',
    roles: [UserRole.MEDICO, UserRole.ASISTENTE],
  },
  {
    text: 'Agenda Médica',
    icon: <CalendarIcon />,
    path: '/agenda',
    roles: [UserRole.MEDICO, UserRole.ASISTENTE],
  },
  {
    text: 'Pacientes',
    icon: <PeopleIcon />,
    path: '/pacientes',
    roles: [UserRole.MEDICO, UserRole.ASISTENTE],
    permission: 'patients.view',
  },
  {
    text: 'Consultas',
    icon: <ConsultationIcon />,
    path: '/consultas',
    roles: [UserRole.MEDICO, UserRole.ASISTENTE],
    permission: 'consultations.view',
  },
  {
    text: 'Bitácora',
    icon: <HistoryIcon />,
    path: '/bitacora',
    roles: [UserRole.MEDICO, UserRole.ASISTENTE],
    permission: 'patients.view',
  },
  {
    text: 'WhatsApp',
    icon: <WhatsAppIcon />,
    path: '/notificaciones',
    roles: [UserRole.MEDICO, UserRole.ASISTENTE],
    permission: 'notifications.manage',
  },
  {
    text: 'Configuración',
    icon: <SettingsIcon />,
    path: '/configuracion',
    roles: [UserRole.MEDICO, UserRole.ASISTENTE],
    permission: 'settings.profile.self',
  },
];

export default function Sidebar({ open, onClose }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { hasRole, can } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [isHovered, setIsHovered] = useState(false);
  const desktopDrawerWidth = isHovered ? DRAWER_WIDTH : MINI_DRAWER_WIDTH;

  const filteredItems = menuItems.filter((item) => hasRole(item.roles) && (!item.permission || can(item.permission)));

  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflowX: 'hidden' }}>
      <Box
        sx={{
          p: 2.5,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          justifyContent: isMobile || isHovered ? 'flex-start' : 'center',
        }}
      >
        <Box
          component="img"
          src="/img/lisalogo.png"
          alt="LisaMedic"
          sx={{ width: 34, height: 34, objectFit: 'contain', flexShrink: 0 }}
        />
        <Box
          sx={{
            opacity: isMobile || isHovered ? 1 : 0,
            width: isMobile || isHovered ? 'auto' : 0,
            overflow: 'hidden',
            transition: 'opacity 180ms ease',
            whiteSpace: 'nowrap',
          }}
        >
          <Typography
            variant="h6"
            sx={{ color: 'primary.main', fontWeight: 700, lineHeight: 1.2 }}
          >
            LisaMedic
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Asistente Médico Digital
          </Typography>
        </Box>
      </Box>
      <Divider />
      <List sx={{ flex: 1, px: 1, py: 1 }}>
        {filteredItems.map((item) => {
          const isActive = location.pathname.startsWith(item.path);
          return (
            <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                onClick={() => {
                  navigate(item.path, item.path === '/agenda'
                    ? { state: { sidebarResetAt: Date.now() } }
                    : undefined);
                  if (isMobile) onClose();
                }}
                sx={{
                  borderRadius: 1,
                  backgroundColor: isActive ? 'primary.main' : 'transparent',
                  color: isActive ? 'white' : 'text.primary',
                  minHeight: 48,
                  justifyContent: isMobile || isHovered ? 'initial' : 'center',
                  px: isMobile || isHovered ? 2 : 1.5,
                  '&:hover': {
                    backgroundColor: isActive ? 'primary.dark' : 'action.hover',
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    color: isActive ? 'white' : 'primary.main',
                    minWidth: 40,
                    mr: isMobile || isHovered ? 1 : 0,
                    justifyContent: 'center',
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.text}
                  sx={{
                    opacity: isMobile || isHovered ? 1 : 0,
                    width: isMobile || isHovered ? 'auto' : 0,
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                    transition: 'opacity 180ms ease',
                  }}
                  primaryTypographyProps={{ fontWeight: isActive ? 600 : 400 }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
    </Box>
  );

  if (isMobile) {
    return (
      <Drawer
        variant="temporary"
        open={open}
        onClose={onClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
          },
        }}
      >
        {drawerContent}
      </Drawer>
    );
  }

  return (
    <Drawer
      variant="permanent"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      sx={{
        width: MINI_DRAWER_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: desktopDrawerWidth,
          boxSizing: 'border-box',
          overflowX: 'hidden',
          transition: theme.transitions.create('width', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.shorter,
          }),
        },
      }}
    >
      {drawerContent}
    </Drawer>
  );
}
