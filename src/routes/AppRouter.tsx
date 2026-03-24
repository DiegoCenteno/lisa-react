import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import ProtectedRoute from './ProtectedRoute';
import LoginPage from '../pages/auth/LoginPage';
import DashboardPage from '../pages/dashboard/DashboardPage';
import AgendaPage from '../pages/agenda/AgendaPage';
import PatientsPage from '../pages/patients/PatientsPage';
import PatientDetailPage from '../pages/patients/PatientDetailPage';
import ConsultationsPage from '../pages/consultations/ConsultationsPage';
import NotificationsPage from '../pages/notifications/NotificationsPage';
import SettingsPage from '../pages/settings/SettingsPage';
import PublicAppointmentPage from '../pages/public/PublicAppointmentPage';
import PublicHistoryFormPage from '../pages/public/PublicHistoryFormPage';
import PublicStudyResultPage from '../pages/public/PublicStudyResultPage';

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/cita/:token" element={<PublicAppointmentPage />} />
        <Route path="/historia/:token" element={<PublicHistoryFormPage />} />
        <Route path="/app/:code" element={<PublicStudyResultPage />} />

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
          <Route path="/pacientes" element={<PatientsPage />} />
          <Route path="/pacientes/:id" element={<PatientDetailPage />} />
          <Route path="/consultas" element={<ConsultationsPage />} />
          <Route path="/notificaciones" element={<NotificationsPage />} />
          <Route path="/configuracion" element={<SettingsPage />} />
        </Route>

        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
