import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LeadsProvider } from './context/LeadsContext';
import MainLayout from './layout/MainLayout';
import Login from './pages/Login';
import Register from './pages/Register';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import Leads from './pages/Leads';
import AddLead from './pages/AddLead';
import Users from './pages/Users';
import UserProfile from './pages/UserProfile';
import AdminUserProfile from './pages/AdminUserProfile';
import Profile from './pages/Profile';
import LeadDetails from './pages/LeadDetails';

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to appropriate dashboard
    const redirectPath = user.role === 'admin' ? '/admin/dashboard' : '/sales/dashboard';
    return <Navigate to={redirectPath} replace />;
  }

  return children;
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <LeadsProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Protected Routes */}
            <Route path="/admin/dashboard" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <MainLayout />
              </ProtectedRoute>
            }>
              <Route index element={<Dashboard />} />
              <Route path="leads" element={<Leads />} />
              <Route path="leads/:id" element={<LeadDetails />} />
              <Route path="add-lead" element={<AddLead />} />
              <Route path="users" element={<Users />} />
              <Route path="users/:userId" element={<AdminUserProfile />} />
              <Route path="profile" element={<Profile />} />
            </Route>

            <Route path="/sales/dashboard" element={
              <ProtectedRoute allowedRoles={['sales']}>
                <MainLayout />
              </ProtectedRoute>
            }>
              <Route index element={<Dashboard />} />
              <Route path="leads" element={<Leads />} />
              <Route path="leads/:id" element={<LeadDetails />} />
              <Route path="add-lead" element={<AddLead />} />
              <Route path="profile" element={<Profile />} />
            </Route>

            {/* Catch all - redirect to Landing Page instead of Dashboard */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </LeadsProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
