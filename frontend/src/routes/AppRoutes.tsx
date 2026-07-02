import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../redux/store';

// Layout & Pages
import DashboardLayout from '../layouts/DashboardLayout';
import Login from '../pages/Login';
import VerifyCertificate from '../pages/VerifyCertificate';

// Student
import StudentDashboard from '../pages/StudentDashboard';
import CourseDetails from '../pages/CourseDetails';
import LiveClasses from '../pages/LiveClasses';
import Certificates from '../pages/Certificates';
import Tickets from '../pages/Tickets';

// Admin
import AdminOverview from '../pages/AdminOverview';
import AdminCourses from '../pages/AdminCourses';
import AdminPlans from '../pages/AdminPlans';
import AdminStudents from '../pages/AdminStudents';
import AdminSettings from '../pages/AdminSettings';
import AdminOnboarding from '../pages/AdminOnboarding';

// Onboarding student public page
import Onboard from '../pages/Onboard';

// Mentor
import MentorCourses from '../pages/MentorCourses';
import MentorSubmissions from '../pages/MentorSubmissions';

// Private Route Guard (Auth Check)
const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
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

  if (['admin', 'super-admin', 'SuperAdmin'].includes(user.role)) {
    return <Navigate to="/admin/overview" replace />;
  }
  if (user.role === 'mentor') {
    return <Navigate to="/mentor/courses" replace />;
  }
  return <StudentDashboard />;
};

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* 1. PUBLIC PATHS */}
      <Route path="/login" element={<Login />} />
      <Route path="/onboard" element={<Onboard />} />
      <Route path="/certificates/verify/:key" element={<VerifyCertificate />} />

      {/* 2. PROTECTED PRIVATE ROUTES */}
      <Route
        path="/*"
        element={
          <PrivateRoute>
            <DashboardLayout>
              <Routes>
                {/* Dashboards Base */}
                <Route path="/dashboard" element={<DashboardRedirector />} />
                
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
                    <RoleGuard allowedRoles={['student']}>
                      <Certificates />
                    </RoleGuard>
                  }
                />

                {/* Mentor paths */}
                <Route
                  path="/mentor/courses"
                  element={
                    <RoleGuard allowedRoles={['mentor']}>
                      <MentorCourses />
                    </RoleGuard>
                  }
                />
                <Route
                  path="/mentor/submissions"
                  element={
                    <RoleGuard allowedRoles={['mentor', 'admin', 'super-admin']}>
                      <MentorSubmissions />
                    </RoleGuard>
                  }
                />

                {/* Admin paths */}
                <Route
                  path="/admin/overview"
                  element={
                    <RoleGuard allowedRoles={['admin', 'super-admin']}>
                      <AdminOverview />
                    </RoleGuard>
                  }
                />
                <Route
                  path="/admin/courses"
                  element={
                    <RoleGuard allowedRoles={['admin', 'super-admin']}>
                      <AdminCourses />
                    </RoleGuard>
                  }
                />
                <Route
                  path="/admin/plans"
                  element={
                    <RoleGuard allowedRoles={['admin', 'super-admin']}>
                      <AdminPlans />
                    </RoleGuard>
                  }
                />
                <Route
                  path="/admin/students"
                  element={
                    <RoleGuard allowedRoles={['admin', 'super-admin']}>
                      <AdminStudents />
                    </RoleGuard>
                  }
                />
                <Route
                  path="/admin/onboarding"
                  element={
                    <RoleGuard allowedRoles={['admin', 'super-admin']}>
                      <AdminOnboarding />
                    </RoleGuard>
                  }
                />
                <Route
                  path="/admin/settings"
                  element={
                    <RoleGuard allowedRoles={['admin', 'super-admin']}>
                      <AdminSettings />
                    </RoleGuard>
                  }
                />

                {/* Catch-all redirect to Dashboard */}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </DashboardLayout>
          </PrivateRoute>
        }
      />
    </Routes>
  );
};

export default AppRoutes;
