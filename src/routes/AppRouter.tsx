import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import ProtectedRoute from './ProtectedRoute';
import LoginPage from '../pages/auth/LoginPage';
import ClearStoragePage from '../pages/auth/ClearStoragePage';
import DashboardPage from '../pages/dashboard/DashboardPage';
import AgendaPage from '../pages/agenda/AgendaPage';
import ActivityLogsPage from '../pages/activity/ActivityLogsPage';
import BulkStudyUploadPage from '../pages/activity/BulkStudyUploadPage';
import InterpretStudiesPage from '../pages/activity/InterpretStudiesPage';
import LaboratoriesPage from '../pages/activity/LaboratoriesPage';
import RegisterLabShipmentPage from '../pages/activity/RegisterLabShipmentPage';
import StudyTypesPage from '../pages/activity/StudyTypesPage';
import StudyDeliveriesPage from '../pages/activity/StudyDeliveriesPage';
import PatientsPage from '../pages/patients/PatientsPage';
import PatientDetailPage from '../pages/patients/PatientDetailPage';
import ConsultationsPage from '../pages/consultations/ConsultationsPage';
import NotificationsPage from '../pages/notifications/NotificationsPage';
import SettingsPage from '../pages/settings/SettingsPage';
import PublicAppointmentPage from '../pages/public/PublicAppointmentPage';
import PublicAssistantRegisterPage from '../pages/public/PublicAssistantRegisterPage';
import PublicDoctorRegisterPage from '../pages/public/PublicDoctorRegisterPage';
import PublicHistoryFormPage from '../pages/public/PublicHistoryFormPage';
import PublicStudyResultPage from '../pages/public/PublicStudyResultPage';
import SystemAdminHomePage from '../pages/admin/SystemAdminHomePage';
import SystemAnnouncementsPage from '../pages/admin/SystemAnnouncementsPage';
import SystemAnnouncementReadersPage from '../pages/admin/SystemAnnouncementReadersPage';
import SystemTemplateRequestsPage from '../pages/admin/SystemTemplateRequestsPage';
import SystemWhatsAppConversationsPage from '../pages/admin/SystemWhatsAppConversationsPage';
import { useAuth } from '../hooks/useAuth';

function HomeRedirect() {
  const { user } = useAuth();

  if (user?.role === 'system_admin') {
    return <Navigate to="/admin" replace />;
  }

  return <Navigate to="/dashboard" replace />;
}

export default function AppRouter() {
  const routerBase = window.location.pathname.startsWith('/app') ? '/app' : '/';

  return (
    <BrowserRouter basename={routerBase}>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/clear-storage" element={<ClearStoragePage />} />
        <Route path="/registrar" element={<PublicDoctorRegisterPage />} />
        <Route path="/asistente" element={<PublicAssistantRegisterPage />} />
        <Route path="/asistente/:code" element={<PublicAssistantRegisterPage />} />
        <Route path="/cita/:token" element={<PublicAppointmentPage />} />
        <Route path="/nuevacita/:code" element={<PublicAppointmentPage />} />
        <Route path="/historia/:token" element={<PublicHistoryFormPage />} />
        <Route path="/wshc/:code" element={<PublicHistoryFormPage />} />
        <Route path="/wsapp/:code" element={<PublicStudyResultPage />} />
        <Route path="/:code" element={<PublicStudyResultPage />} />

        {/* Protected routes */}
        <Route
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute roles={['medico', 'asistente']}>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute roles={['system_admin']} permissions={['system.dashboard.view']}>
                <SystemAdminHomePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/noticias"
            element={
              <ProtectedRoute roles={['system_admin']} permissions={['system.announcements.manage']}>
                <SystemAnnouncementsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/solicitudes-plantillas"
            element={
              <ProtectedRoute roles={['system_admin']}>
                <SystemTemplateRequestsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/bitacora"
            element={
              <ProtectedRoute roles={['system_admin']} permissions={['system.activity_logs.view']}>
                <SystemAnnouncementReadersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/conversaciones-whatsapp"
            element={
              <ProtectedRoute roles={['system_admin']} permissions={['system.activity_logs.view']}>
                <SystemWhatsAppConversationsPage />
              </ProtectedRoute>
            }
          />
          <Route path="/agenda" element={<AgendaPage />} />
          <Route
            path="/bitacora"
            element={
              <ProtectedRoute roles={['medico', 'asistente']} permissions={['patients.view']} assistantAccessLevels={['full']}>
                <ActivityLogsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/estudios"
            element={
              <ProtectedRoute roles={['medico', 'asistente']} permissions={['patients.view']} assistantAccessLevels={['full']}>
                <StudyDeliveriesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/estudios/carga-masiva"
            element={
              <ProtectedRoute roles={['medico', 'asistente']} permissions={['patients.view']} assistantAccessLevels={['full']}>
                <BulkStudyUploadPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/estudios/registrar-envio"
            element={
              <ProtectedRoute roles={['medico', 'asistente']} permissions={['patients.view']} assistantAccessLevels={['full']}>
                <RegisterLabShipmentPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/estudios/interpretar"
            element={
              <ProtectedRoute roles={['medico', 'asistente']} permissions={['patients.view']} assistantAccessLevels={['full']}>
                <InterpretStudiesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/estudios/laboratorios"
            element={
              <ProtectedRoute roles={['medico', 'asistente']} permissions={['patients.view']} assistantAccessLevels={['full']}>
                <LaboratoriesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/estudios/tipos"
            element={
              <ProtectedRoute roles={['medico', 'asistente']} permissions={['patients.view']} assistantAccessLevels={['full']}>
                <StudyTypesPage />
              </ProtectedRoute>
            }
          />
          <Route path="/bitacora/envios-estudios" element={<Navigate to="/estudios" replace />} />
          <Route path="/bitacora/carga-masiva-estudios" element={<Navigate to="/estudios/carga-masiva" replace />} />
          <Route
            path="/pacientes"
            element={
              <ProtectedRoute roles={['medico', 'asistente']} permissions={['patients.view']}>
                <PatientsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pacientes/:id"
            element={
              <ProtectedRoute roles={['medico', 'asistente']} permissions={['patients.detail.view']} assistantAccessLevels={['full']}>
                <PatientDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/consultas"
            element={
              <ProtectedRoute
                roles={['medico', 'asistente']}
                assistantAccessLevels={['full']}
                anyPermissions={[
                  'consultations.view',
                  'consultations.history_edit',
                  'consultations.daily_note.create',
                ]}
              >
                <ConsultationsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/notificaciones"
            element={
              <ProtectedRoute roles={['medico', 'asistente']} permissions={['notifications.manage']} assistantAccessLevels={['full']}>
                <NotificationsPage />
              </ProtectedRoute>
            }
          />
            <Route
              path="/configuracion"
              element={
                <ProtectedRoute
                  roles={['medico', 'asistente']}
                  assistantAccessLevels={['full']}
                  anyPermissions={[
                    'settings.profile.self',
                    'settings.company',
                    'settings.agenda',
                    'settings.unavailable_days',
                    'settings.print',
                    'settings.labels',
                  ]}
                >
                  <SettingsPage />
                </ProtectedRoute>
              }
            />
        </Route>

        {/* Default redirect */}
         <Route
           path="/"
           element={
             <ProtectedRoute>
               <HomeRedirect />
             </ProtectedRoute>
           }
         />
         <Route
           path="*"
           element={
             <ProtectedRoute>
               <HomeRedirect />
             </ProtectedRoute>
           }
         />
      </Routes>
    </BrowserRouter>
  );
}
