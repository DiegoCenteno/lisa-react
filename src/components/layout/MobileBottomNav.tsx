import { BottomNavigation, BottomNavigationAction, Paper } from '@mui/material';
import {
  CalendarMonth as CalendarIcon,
  People as PeopleIcon,
  Assignment as ConsultationIcon,
  Sms as WhatsAppIcon,
} from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { UserRole } from '../../types';
import type { AssistantAccessLevel } from '../../utils/assistantAccess';
import { hasAllowedAssistantAccessLevel } from '../../utils/assistantAccess';

interface MobileNavItem {
  key: string;
  path: string;
  icon: React.ReactNode;
  roles: UserRole[];
  permission?: string;
  anyPermissions?: string[];
  assistantAccessLevels?: AssistantAccessLevel[];
}

const mobileNavItems: MobileNavItem[] = [
  {
    key: 'whatsapp',
    path: '/notificaciones',
    icon: <WhatsAppIcon />,
    roles: [UserRole.MEDICO, UserRole.ASISTENTE],
    assistantAccessLevels: ['full'],
    permission: 'notifications.manage',
  },
  {
    key: 'consultas',
    path: '/consultas',
    icon: <ConsultationIcon />,
    roles: [UserRole.MEDICO, UserRole.ASISTENTE],
    assistantAccessLevels: ['full'],
    anyPermissions: [
      'consultations.view',
      'consultations.history_edit',
      'consultations.daily_note.create',
    ],
  },
  {
    key: 'pacientes',
    path: '/pacientes',
    icon: <PeopleIcon />,
    roles: [UserRole.MEDICO, UserRole.ASISTENTE],
    permission: 'patients.view',
  },
  {
    key: 'agenda',
    path: '/agenda',
    icon: <CalendarIcon />,
    roles: [UserRole.MEDICO, UserRole.ASISTENTE],
  },
];

export default function MobileBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { hasRole, can, user } = useAuth();

  if (user?.role === UserRole.SYSTEM_ADMIN) {
    return null;
  }

  const items = mobileNavItems.filter((item) =>
    hasRole(item.roles)
    && hasAllowedAssistantAccessLevel(user, item.assistantAccessLevels)
    && (!item.permission || can(item.permission))
    && (!item.anyPermissions || item.anyPermissions.some((permission) => can(permission)))
  );

  if (items.length === 0) {
    return null;
  }

  const activeItem = items.find((item) => location.pathname.startsWith(item.path));
  const currentValue = activeItem?.path ?? false;

  return (
    <Paper
      elevation={10}
      sx={{
        position: 'fixed',
        right: 0,
        bottom: 0,
        left: 0,
        zIndex: (theme) => theme.zIndex.appBar - 1,
        borderTop: '1px solid',
        borderColor: 'primary.dark',
        backgroundColor: 'primary.main',
        pb: 'env(safe-area-inset-bottom)',
      }}
    >
      <BottomNavigation
        showLabels={false}
        value={currentValue}
        onChange={(_event, value) => {
          if (!value || value === currentValue) {
            return;
          }

          navigate(value, value === '/agenda'
            ? { state: { sidebarResetAt: Date.now() } }
            : undefined);
        }}
        sx={{
          minHeight: 64,
          backgroundColor: 'transparent',
          '& .MuiBottomNavigationAction-root': {
            minWidth: 0,
            color: 'rgba(255,255,255,0.88)',
            borderRadius: 2,
            mx: 0.5,
            my: 0.75,
            '& .MuiSvgIcon-root': {
              fontSize: 28,
            },
          },
          '& .Mui-selected': {
            color: '#00ff22',
            backgroundColor: 'rgba(0,0,0,0.18)',
          },
        }}
      >
        {items.map((item) => (
          <BottomNavigationAction
            key={item.key}
            value={item.path}
            icon={item.icon}
          />
        ))}
      </BottomNavigation>
    </Paper>
  );
}
