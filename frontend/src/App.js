/**
 * MAIN APP COMPONENT
 * Sets up routing and authentication context
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import StudentDashboard from './pages/StudentDashboard';
import AdminDashboard from './pages/AdminDashboard';
import WardenComplaints from './pages/WardenComplaints';
import StudentComplaints from './pages/StudentComplaints';
import AllocationHistory from './pages/AllocationHistory';
import StudentPaymentDashboard from './pages/StudentPaymentDashboard';
import StudentPaymentHistory from './pages/StudentPaymentHistory';
import AdminPaymentManagement from './pages/AdminPaymentManagement';
import SafetyTrackingPage from './pages/SafetyTrackingPage';
import CriticalAdminDashboard from './pages/CriticalAdminDashboard';
import './App.css';
import StudentFineDashboard from './pages/StudentFineDashboard';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Student Routes */}
          <Route
            path="/student/dashboard"
            element={
              <ProtectedRoute allowedRoles={['Student']}>
                <StudentDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/history"
            element={
              <ProtectedRoute allowedRoles={['Student']}>
                <AllocationHistory />
              </ProtectedRoute>
            }
          />
            <Route
              path="/student/complaints"
              element={
                <ProtectedRoute allowedRoles={['Student']}>
                  <StudentComplaints />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/payments"
              element={
                <ProtectedRoute allowedRoles={['Student']}>
                  <StudentPaymentDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/payment-history"
              element={
                <ProtectedRoute allowedRoles={['Student']}>
                  <StudentPaymentHistory />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/safety"
              element={
                <ProtectedRoute allowedRoles={['Student']}>
                  <SafetyTrackingPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/fines"
              element={
                <ProtectedRoute allowedRoles={['Student']}>
                  <StudentFineDashboard />
                </ProtectedRoute>
              }
            />

          {/* Admin/Warden Routes */}
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute allowedRoles={['Admin', 'Warden']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/complaints"
            element={
              <ProtectedRoute allowedRoles={['Admin', 'Warden']}>
                <WardenComplaints />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/payments"
            element={
              <ProtectedRoute allowedRoles={['Admin', 'Warden']}>
                <AdminPaymentManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/safety"
            element={
              <ProtectedRoute allowedRoles={['Admin', 'Warden']}>
                <SafetyTrackingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/warden/dashboard"
            element={
              <ProtectedRoute allowedRoles={['Warden']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/food/dashboard"
            element={
              <ProtectedRoute allowedRoles={['Admin']}>
                <CriticalAdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/safety/dashboard"
            element={
              <ProtectedRoute allowedRoles={['Admin']}>
                <CriticalAdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/health/dashboard"
            element={
              <ProtectedRoute allowedRoles={['Admin']}>
                <CriticalAdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* Unauthorized Page */}
          <Route
            path="/unauthorized"
            element={
              <div style={{ textAlign: 'center', padding: '3rem' }}>
                <h1>403 - Unauthorized</h1>
                <p>You don't have permission to access this page.</p>
                <a href="/login">Go to Login</a>
              </div>
            }
          />

          {/* Default Redirect */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          
          {/* 404 Page */}
          <Route
            path="*"
            element={
              <div style={{ textAlign: 'center', padding: '3rem' }}>
                <h1>404 - Page Not Found</h1>
                <a href="/login">Go to Login</a>
              </div>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
