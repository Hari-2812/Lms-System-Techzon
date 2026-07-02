import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../redux/store';
import { logoutUser, toggleTheme } from '../redux/authSlice';
import {
  BookOpen,
  Calendar,
  Award,
  LifeBuoy,
  LogOut,
  Moon,
  Sun,
  Shield,
  Layers,
  FileText,
  User,
  GraduationCap,
  Users,
  Settings as SettingsIcon,
  Activity,
  Menu,
  X,
  ClipboardList
} from 'lucide-react';

interface SidebarItem {
  name: string;
  path: string;
  icon: React.ReactNode;
  roles: string[];
}

const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, theme } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const sidebarItems: SidebarItem[] = [
    // Students
    { name: 'My Courses', path: '/dashboard', icon: <BookOpen className="w-5 h-5" />, roles: ['student'] },
    { name: 'Live Classes', path: '/live-classes', icon: <Calendar className="w-5 h-5" />, roles: ['student', 'mentor', 'admin', 'super-admin'] },
    { name: 'My Certificates', path: '/certificates', icon: <Award className="w-5 h-5" />, roles: ['student'] },
    
    // Mentors
    { name: 'Assigned Courses', path: '/mentor/courses', icon: <BookOpen className="w-5 h-5" />, roles: ['mentor'] },
    { name: 'Grade Assignments', path: '/mentor/submissions', icon: <FileText className="w-5 h-5" />, roles: ['mentor', 'admin', 'super-admin'] },

    // Support
    { name: 'Support Tickets', path: '/tickets', icon: <LifeBuoy className="w-5 h-5" />, roles: ['student', 'support', 'admin', 'super-admin'] },

    // Admins
    { name: 'Onboarding Requests', path: '/admin/onboarding', icon: <ClipboardList className="w-5 h-5" />, roles: ['admin', 'super-admin'] },
    { name: 'LMS Overview', path: '/admin/overview', icon: <Activity className="w-5 h-5" />, roles: ['admin', 'super-admin'] },
    { name: 'Manage Courses', path: '/admin/courses', icon: <GraduationCap className="w-5 h-5" />, roles: ['admin', 'super-admin'] },
    { name: 'Learning Plans', path: '/admin/plans', icon: <Layers className="w-5 h-5" />, roles: ['admin', 'super-admin'] },
    { name: 'Student Directory', path: '/admin/students', icon: <Users className="w-5 h-5" />, roles: ['admin', 'super-admin'] },
    { name: 'Audit Logs', path: '/admin/audit', icon: <Shield className="w-5 h-5" />, roles: ['admin', 'super-admin'] },
    { name: 'System Settings', path: '/admin/settings', icon: <SettingsIcon className="w-5 h-5" />, roles: ['admin', 'super-admin'] },
  ];

  const handleLogout = () => {
    dispatch(logoutUser());
    navigate('/login');
  };

  const filteredItems = sidebarItems.filter(item => user && item.roles.includes(user.role));

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-slate-900 text-slate-300 w-64 border-r border-slate-800 dark:bg-bg-dark dark:border-border-dark">
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-800 dark:border-border-dark bg-slate-950/20">
        <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center font-bold text-white shadow-lg shadow-accent/20">
          TZ
        </div>
        <div>
          <h1 className="font-poppins font-bold text-white text-sm tracking-wide">Techzon Wide</h1>
          <p className="text-[10px] text-slate-400 font-medium">PRIVATE LMS SYSTEM</p>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {filteredItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.name}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-poppins text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-accent text-white shadow-lg shadow-accent/20'
                  : 'hover:bg-slate-800/50 hover:text-white'
              }`}
            >
              {item.icon}
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Footer Profile & Controls */}
      <div className="p-4 border-t border-slate-800 dark:border-border-dark space-y-3 bg-slate-950/10">
        {/* Profile Card */}
        <div className="flex items-center gap-3 px-2">
          <div className="w-10 h-10 rounded-full bg-secondary-light flex items-center justify-center text-white border border-slate-700 font-bold uppercase">
            {user?.name.slice(0, 2)}
          </div>
          <div className="overflow-hidden">
            <h4 className="font-medium text-white text-sm truncate leading-4">{user?.name}</h4>
            <span className="text-[10px] text-slate-400 font-poppins uppercase tracking-wider">{user?.role}</span>
          </div>
        </div>

        {/* Buttons Action */}
        <div className="flex gap-2">
          <button
            onClick={() => dispatch(toggleTheme())}
            className="flex-1 flex items-center justify-center p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition duration-200 border border-slate-700"
            title="Toggle Theme"
          >
            {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>
          <button
            onClick={handleLogout}
            className="flex-1 flex items-center justify-center gap-1 p-2 rounded-lg bg-red-950/20 hover:bg-red-950/40 text-red-400 hover:text-red-300 transition duration-200 border border-red-900/30"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-xs font-poppins font-medium">Logout</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-bg-light dark:bg-bg-dark transition-colors duration-200">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block h-screen sticky top-0">
        <SidebarContent />
      </div>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <div className="relative flex flex-col z-10 animate-slide-in">
            <SidebarContent />
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 -right-12 p-2 rounded-full bg-slate-900 text-white border border-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Panel */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="flex items-center justify-between px-6 py-4 bg-white/70 backdrop-blur-md border-b border-slate-200 sticky top-0 z-40 dark:bg-bg-dark/70 dark:border-border-dark">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden text-slate-600 dark:text-slate-300"
          >
            <Menu className="w-6 h-6" />
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xs font-poppins bg-accent/10 text-accent font-semibold px-3 py-1 rounded-full uppercase tracking-wider">
              {user?.role} Portal
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-xs text-slate-500 font-medium">
              Support: support@techzonwide.com
            </span>
          </div>
        </header>

        {/* Dashboard Pages */}
        <main className="flex-1 p-6 lg:p-8 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
