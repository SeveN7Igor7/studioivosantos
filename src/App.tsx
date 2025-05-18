import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { SchedulePage } from './pages/SchedulePage';
import { AdminPage } from './pages/AdminPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ProfilePage } from './pages/ProfilePage';
import { useAuth } from './contexts/AuthContext';

function App() {
  const { isAuthenticated, isAdmin } = useAuth();

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/login" replace />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="forgot-password" element={<ForgotPasswordPage />} />
        <Route 
          path="schedule" 
          element={
            isAuthenticated ? <SchedulePage /> : <Navigate to="/login" replace />
          } 
        />
        <Route 
          path="profile" 
          element={
            isAuthenticated ? <ProfilePage /> : <Navigate to="/login" replace />
          } 
        />
        <Route 
          path="admin" 
          element={
            isAuthenticated && isAdmin ? <AdminPage /> : <Navigate to="/" replace />
          } 
        />
      </Route>
    </Routes>
  );
}

export default App;