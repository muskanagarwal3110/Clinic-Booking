import { Navigate, Route, Routes } from 'react-router-dom';
import { homePath, useAuth } from './auth/AuthContext.jsx';
import AuthPage from './pages/AuthPage.jsx';
import PatientPage from './pages/PatientPage.jsx';
import ClinicPage from './pages/ClinicPage.jsx';

function RequireRole({ role, children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) return <Navigate to={homePath(user)} replace />;
  return children;
}

export default function App() {
  const { user } = useAuth();
  const home = user ? homePath(user) : '/login';
  return (
    <Routes>
      <Route path="/" element={<Navigate to={home} replace />} />
      <Route path="/login" element={user ? <Navigate to={home} replace /> : <AuthPage />} />
      <Route path="/patient" element={<RequireRole role="patient"><PatientPage /></RequireRole>} />
      <Route path="/clinic" element={<RequireRole role="clinic"><ClinicPage /></RequireRole>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
