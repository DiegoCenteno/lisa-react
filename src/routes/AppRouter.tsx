import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import ProtectedRoute from './ProtectedRoute';
import LoginPage from '../pages/auth/LoginPage';
import DashboardPage from '../pages/dashboard/DashboardPage';
import AgendaPage from '../pages/agenda/AgendaPage';
import ActivityLogsPage from '../pages/activity/ActivityLogsPage';
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

export default function AppRouter() {
  const routerBase = window.location.pathname.startsWith('/app') ? '/app' : '/';

  return (
    <BrowserRouter basename={routerBase}>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/registrar" element={<PublicDoctorRegisterPage />} />
        <Route path="/asistente" element={<PublicAssistantRegisterPage />} />
        <Route path="/asistente/:code" element={<PublicAssistantRegisterPage />} />
        <Route path="/cita/:token" element={<PublicAppointmentPage />} />
        <Route path="/nuevacita/:code" element={<PublicAppointmentPage />} />
        <Route path="/historia/:token" element={<PublicHistoryFormPage />} />
        <Route path="/:code" element={<PublicStudyResultPage />} />

        {/* Protected routes */}
        <Route
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/agenda" element={<AgendaPage />} />
          <Route
            path="/bitacora"
            element={
              <ProtectedRoute roles={['medico', 'asistente']} permissions={['patients.view']}>
                <ActivityLogsPage />
              </ProtectedRoute>
            }
          />
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
              <ProtectedRoute roles={['medico', 'asistente']} permissions={['patients.detail.view']}>
                <PatientDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/consultas"
            element={
              <ProtectedRoute roles={['medico', 'asistente']} permissions={['consultations.view']}>
                <ConsultationsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/notificaciones"
            element={
              <ProtectedRoute roles={['medico', 'asistente']} permissions={['notifications.manage']}>
                <NotificationsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/configuracion"
            element={
              <ProtectedRoute roles={['medico', 'asistente']} permissions={['settings.profile.self']}>
                <SettingsPage />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
