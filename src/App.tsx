import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import LandingPage from './pages/public/LandingPage';
import AdminLogin from './pages/admin/AdminLogin';
import AdminSetup from './pages/admin/AdminSetup';
import { AdminLayout } from './components/layout/AdminLayout';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminReservations } from './pages/admin/AdminReservations';
import { AdminClients } from './pages/admin/AdminClients';
import { AdminMessages } from './pages/admin/AdminMessages';
import { AdminWhatsApp } from './pages/admin/AdminWhatsApp';
import { AdminReviews } from './pages/admin/AdminReviews';
import { AdminPayments } from './pages/admin/AdminPayments';
import { AdminNotifications } from './pages/admin/AdminNotifications';
import { AdminAccessCodes } from './pages/admin/AdminAccessCodes';
import { AdminWifi } from './pages/admin/AdminWifi';
import { AdminHouseRules } from './pages/admin/AdminHouseRules';
import { AdminDocuments } from './pages/admin/AdminDocuments';
import { AdminConfiguration } from './pages/admin/AdminConfiguration';
import ClientSpace from './pages/client/ClientSpace';
import { ProtectedRoute } from './components/layout/ProtectedRoute';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/admin/setup" element={<AdminSetup />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
            <Route index element={<Navigate to="accueil" replace />} />
            <Route path="accueil" element={<AdminDashboard />} />
            <Route path="reservations" element={<AdminReservations />} />
            <Route path="clients" element={<AdminClients />} />
            <Route path="messages" element={<AdminMessages />} />
            <Route path="whatsapp" element={<AdminWhatsApp />} />
            <Route path="avis" element={<AdminReviews />} />
            <Route path="paiements" element={<AdminPayments />} />
            <Route path="notifications" element={<AdminNotifications />} />
            <Route path="codes-acces" element={<AdminAccessCodes />} />
            <Route path="wifi" element={<AdminWifi />} />
            <Route path="reglement" element={<AdminHouseRules />} />
            <Route path="documents" element={<AdminDocuments />} />
            <Route path="configuration" element={<AdminConfiguration />} />
          </Route>
          <Route path="/client/:token" element={<ClientSpace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
