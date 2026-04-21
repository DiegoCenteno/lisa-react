import { Box, Tab, Tabs } from '@mui/material';
import type { SyntheticEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

type StudyTab = {
  label: string;
  path: string;
  matches: (pathname: string) => boolean;
};

const STUDY_TABS: StudyTab[] = [
  { label: 'Control de envíos', path: '/estudios', matches: (pathname) => pathname === '/estudios' },
  { label: 'Registrar envío', path: '/estudios/registrar-envio', matches: (pathname) => pathname.startsWith('/estudios/registrar-envio') },
  { label: 'Carga masiva', path: '/estudios/carga-masiva', matches: (pathname) => pathname.startsWith('/estudios/carga-masiva') },
  { label: 'Interpretación', path: '/estudios/interpretar', matches: (pathname) => pathname.startsWith('/estudios/interpretar') },
  { label: 'Laboratorios', path: '/estudios/laboratorios', matches: (pathname) => pathname.startsWith('/estudios/laboratorios') },
  { label: 'Tipos de estudio', path: '/estudios/tipos', matches: (pathname) => pathname.startsWith('/estudios/tipos') },
];

export default function StudyModuleTabs() {
  const location = useLocation();
  const navigate = useNavigate();

  const activePath = STUDY_TABS.find((tab) => tab.matches(location.pathname))?.path ?? '/estudios';

  const handleChange = (_event: SyntheticEvent, nextPath: string) => {
    if (nextPath !== location.pathname) {
      navigate(nextPath);
    }
  };

  return (
    <Box
      sx={{
        borderBottom: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
        borderRadius: 2,
        overflow: 'hidden',
      }}
    >
      <Tabs
        value={activePath}
        onChange={handleChange}
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
        sx={{
          minHeight: 52,
          '& .MuiTabs-flexContainer': {
            gap: 0.5,
            px: 1,
          },
          '& .MuiTab-root': {
            minHeight: 52,
            textTransform: 'none',
            fontWeight: 600,
          },
        }}
      >
        {STUDY_TABS.map((tab) => (
          <Tab key={tab.path} value={tab.path} label={tab.label} />
        ))}
      </Tabs>
    </Box>
  );
}
