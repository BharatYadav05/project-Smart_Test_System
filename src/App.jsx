import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { StudentEntry } from './pages/student/StudentEntry';
import { StudentIdentity } from './pages/student/StudentIdentity';
import { TestRunner } from './pages/student/TestRunner';
import { SubmissionConfirmation } from './pages/student/SubmissionConfirmation';
import { AdminLogin } from './pages/admin/AdminLogin';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { LiveTestRoom } from './pages/admin/LiveTestRoom';
import { SubmissionsPage } from './pages/admin/SubmissionsPage';
import { ClassRosterPage } from './pages/admin/ClassRosterPage';
import { AdminSettingsPage } from './pages/admin/AdminSettingsPage';

// Protected Route for Admin Pages
const ProtectedAdminRoute = ({ children }) => {
  const { isAdmin, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500">Loading...</div>;
  }

  if (!isAdmin) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export const App = () => {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen flex flex-col bg-gray-50">
          <Navbar />
          <main className="flex-1">
            <Routes>
              {/* Student Routes */}
              <Route path="/" element={<StudentEntry />} />
              <Route path="/join/:code" element={<StudentIdentity />} />
              <Route path="/test" element={<TestRunner />} />
              <Route path="/submitted" element={<SubmissionConfirmation />} />

              {/* Staff / Admin Auth */}
              <Route path="/login" element={<AdminLogin />} />

              {/* Admin Protected Pages */}
              <Route
                path="/admin/dashboard"
                element={
                  <ProtectedAdminRoute>
                    <AdminDashboard />
                  </ProtectedAdminRoute>
                }
              />
              <Route
                path="/admin/tests/:id/monitor"
                element={
                  <ProtectedAdminRoute>
                    <LiveTestRoom />
                  </ProtectedAdminRoute>
                }
              />
              <Route
                path="/admin/submissions"
                element={
                  <ProtectedAdminRoute>
                    <SubmissionsPage />
                  </ProtectedAdminRoute>
                }
              />
              <Route
                path="/admin/classes"
                element={
                  <ProtectedAdminRoute>
                    <ClassRosterPage />
                  </ProtectedAdminRoute>
                }
              />
              <Route
                path="/admin/settings"
                element={
                  <ProtectedAdminRoute>
                    <AdminSettingsPage />
                  </ProtectedAdminRoute>
                }
              />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
};

export default App;
