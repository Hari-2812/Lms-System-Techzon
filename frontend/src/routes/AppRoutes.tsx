import React, { Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../redux/store';
import { Loader2 } from 'lucide-react';

// Layout & Public Pages (Eager load critical components)
import DashboardLayout from '../layouts/DashboardLayout';
import Login from '../pages/Login';
import VerifyCertificate from '../pages/VerifyCertificate';
import ChangePassword from '../pages/ChangePassword';

// Lazy Loaded Components
const StudentDashboard = React.lazy(() => import('../pages/StudentDashboard'));
const CourseDetails = React.lazy(() => import('../pages/CourseDetails'));
const LiveClasses = React.lazy(() => import('../pages/LiveClasses'));
const Certificates = React.lazy(() => import('../pages/Certificates'));
const Tickets = React.lazy(() => import('../pages/Tickets'));

const AdminOverview = React.lazy(() => import('../pages/AdminOverview'));
const AdminCourses = React.lazy(() => import('../pages/AdminCourses'));
const AdminPlans = React.lazy(() => import('../pages/AdminPlans'));
const AdminStudents = React.lazy(() => import('../pages/AdminStudents'));
const AdminStudentDetails = React.lazy(() => import('../pages/AdminStudentDetails'));
const AdminSettings = React.lazy(() => import('../pages/AdminSettings'));
const AdminOnboarding = React.lazy(() => import('../pages/AdminOnboarding'));
const GoogleFormSync = React.lazy(() => import('../pages/GoogleFormSync'));
const AdminNotifications = React.lazy(() => import('../pages/AdminNotifications'));

const MentorCourses = React.lazy(() => import('../pages/MentorCourses'));
const MentorSubmissions = React.lazy(() => import('../pages/MentorSubmissions'));

const SuspenseFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-[#070312]">
    <Loader2 className="w-8 h-8 animate-spin text-accent" />
  </div>
);

// Private Route Guard (Auth Check)
const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.needsPasswordChange && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }

  return <>{children}</>;
};

// Role-Based Route Access Guard
const RoleGuard: React.FC<{ children: React.ReactNode; allowedRoles: string[] }> = ({
  children,
  allowedRoles,
}) => {
  const { user } = useSelector((state: RootState) => state.auth);
  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
};

// Automatic Dashboard Redirector according to user role
const DashboardRedirector: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  if (!user) return <Navigate to="/login" replace />;

  if (['Admin', 'SuperAdmin'].includes(user.role)) {
    return <Navigate to="/admin/dashboard" replace />;
  }
  if (user.role === 'Mentor') {
    return <Navigate to="/mentor/dashboard" replace />;
  }
  return <Navigate to="/student/dashboard" replace />;
};

const AppRoutes: React.FC = () => {
  return (
    <Suspense fallback={<SuspenseFallback />}>
      <Routes>
        {/* 1. PUBLIC PATHS */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/certificates/verify/:key" element={<VerifyCertificate />} />

        {/* 2. PROTECTED PRIVATE ROUTES */}
        <Route
          path="/*"
          element={
            <PrivateRoute>
              <DashboardLayout>
                <Suspense fallback={<SuspenseFallback />}>
                  <Routes>
                    {/* Dashboards Base */}
                    <Route path="/dashboard" element={<DashboardRedirector />} />
                    <Route path="/change-password" element={<ChangePassword />} />
                    
                    {/* Student Dashboard explicitly */}
                    <Route 
                      path="/student/dashboard" 
                      element={
                        <RoleGuard allowedRoles={['Student']}>
                          <StudentDashboard />
                        </RoleGuard>
                      } 
                    />

                    {/* Course Details Details */}
                    <Route path="/courses/:id" element={<CourseDetails />} />
                    
                    {/* Shared calendar live list */}
                    <Route path="/live-classes" element={<LiveClasses />} />
                    
                    {/* Helpdesk Messaging */}
                    <Route path="/tickets" element={<Tickets />} />

                    {/* Students paths */}
                    <Route
                      path="/certificates"
                      element={
                        <RoleGuard allowedRoles={['Student']}>
                          <Certificates />
                        </RoleGuard>
                      }
                    />

                    {/* Mentor paths */}
                    <Route
                      path="/mentor/dashboard"
                      element={
                        <RoleGuard allowedRoles={['Mentor']}>
                          <MentorCourses />
                        </RoleGuard>
                      }
                    />
                    <Route
                      path="/mentor/submissions"
                      element={
                        <RoleGuard allowedRoles={['Mentor', 'Admin', 'SuperAdmin']}>
                          <MentorSubmissions />
                        </RoleGuard>
                      }
                    />

                    {/* Admin paths */}
                    <Route
                      path="/admin/dashboard"
                      element={
                        <RoleGuard allowedRoles={['Admin', 'SuperAdmin']}>
                          <AdminOverview />
                        </RoleGuard>
                      }
                    />
                    <Route
                      path="/admin/courses"
                      element={
                        <RoleGuard allowedRoles={['Admin', 'SuperAdmin']}>
                          <AdminCourses />
                        </RoleGuard>
                      }
                    />
                    <Route
                      path="/admin/plans"
                      element={
                        <RoleGuard allowedRoles={['Admin', 'SuperAdmin']}>
                          <AdminPlans />
                        </RoleGuard>
                      }
                    />
                    <Route
                      path="/admin/students"
                      element={
                        <RoleGuard allowedRoles={['Admin', 'SuperAdmin']}>
                          <AdminStudents />
                        </RoleGuard>
                      }
                    />
                    <Route
                      path="/admin/students/:studentId"
                      element={
                        <RoleGuard allowedRoles={['Admin', 'SuperAdmin']}>
                          <AdminStudentDetails />
                        </RoleGuard>
                      }
                    />
                    <Route
                      path="/admin/onboarding"
                      element={
                        <RoleGuard allowedRoles={['Admin', 'SuperAdmin']}>
                          <AdminOnboarding />
                        </RoleGuard>
                      }
                    />
                    <Route
                      path="/admin/settings"
                      element={
                        <RoleGuard allowedRoles={['Admin', 'SuperAdmin']}>
                          <AdminSettings />
                        </RoleGuard>
                      }
                    />
                    <Route
                      path="/admin/google-sync"
                      element={
                        <RoleGuard allowedRoles={['Admin', 'SuperAdmin']}>
                          <GoogleFormSync />
                        </RoleGuard>
                      }
                    />
                    <Route
                      path="/admin/notifications"
                      element={
                        <RoleGuard allowedRoles={['Admin', 'SuperAdmin']}>
                          <AdminNotifications />
                        </RoleGuard>
                      }
                    />

                    {/* Catch-all redirect to Dashboard */}
                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                  </Routes>
                </Suspense>
              </DashboardLayout>
            </PrivateRoute>
          }
        />
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;
