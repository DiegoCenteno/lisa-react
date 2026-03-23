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
  Settings as SettingsIcon,
  LocalHospital as HospitalIcon,
} from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';
import { UserRole } from '../../types';

const DRAWER_WIDTH = 260;

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

interface MenuItem {
  text: string;
  icon: React.ReactNode;
  path: string;
  roles: UserRole[];
}

const menuItems: MenuItem[] = [
  {
    text: 'Dashboard',
    icon: <DashboardIcon />,
    path: '/dashboard',
    roles: [
      UserRole.MEDICO,
      UserRole.ASISTENTE,
    ],
  },
  {
    text: 'Agenda Médica',
    icon: <CalendarIcon />,
    path: '/agenda',
    roles: [
      UserRole.MEDICO,
      UserRole.ASISTENTE,
    ],
  },
  {
    text: 'Pacientes',
    icon: <PeopleIcon />,
    path: '/pacientes',
    roles: [
      UserRole.MEDICO,
    ],
  },
  {
    text: 'Consultas',
    icon: <ConsultationIcon />,
    path: '/consultas',
    roles: [
      UserRole.MEDICO,
    ],
  },
  {
    text: 'Configuración',
    icon: <SettingsIcon />,
    path: '/configuracion',
    roles: [
      UserRole.MEDICO,
    ],
  },
];

export default function Sidebar({ open, onClose }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const filteredItems = menuItems.filter((item) => hasRole(item.roles));

  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box
        sx={{
          p: 2.5,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
        }}
      >
        <HospitalIcon sx={{ color: 'primary.main', fontSize: 32 }} />
        <Box>
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
                  backgroundColor: isActive
                    ? 'primary.main'
                    : 'transparent',
                  color: isActive ? 'white' : 'text.primary',
                  '&:hover': {
                    backgroundColor: isActive
                      ? 'primary.dark'
                      : 'action.hover',
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    color: isActive ? 'white' : 'primary.main',
                    minWidth: 40,
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.text}
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
      sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
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
