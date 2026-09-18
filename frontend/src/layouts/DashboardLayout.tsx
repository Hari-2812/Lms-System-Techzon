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
  ClipboardList,
  RefreshCw,
  Bell,
  Mail
} from 'lucide-react';
import NotificationBell from '../components/NotificationBell';
import { Toaster } from 'react-hot-toast';
import { BRAND } from '@/config/branding';

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

  const handleLogout = () => {
    dispatch(logoutUser());
    setMobileOpen(false);
    navigate('/login');
  };

  const sidebarGroups = [
    {
      title: 'LEARNING',
      items: [
        { name: 'My Courses', path: '/dashboard', icon: <BookOpen size={18} />, roles: ['Student'] },
        { name: 'My Certificates', path: '/certificates', icon: <Award size={18} />, roles: ['Student'] },
        { name: 'Manage Courses', path: '/admin/courses', icon: <GraduationCap size={18} />, roles: ['Admin', 'SuperAdmin'] },
        { name: 'Learning Plans', path: '/admin/plans', icon: <Layers size={18} />, roles: ['Admin', 'SuperAdmin'] },
        { name: 'Assigned Courses', path: '/mentor/courses', icon: <BookOpen size={18} />, roles: ['Mentor'] },
        { name: 'Grade Assignments', path: '/mentor/submissions', icon: <FileText size={18} />, roles: ['Mentor', 'Admin', 'SuperAdmin'] },
      ]
    },
    {
      title: 'COMMUNICATION',
      items: [
        { name: 'Live Classes', path: '/live-classes', icon: <Calendar size={18} />, roles: ['Student'] },
        { name: 'Live Classes', path: '/admin/live-classes', icon: <Calendar size={18} />, roles: ['Mentor', 'Admin', 'SuperAdmin'] },
        { name: 'Email Management', path: '/superadmin/email-management', icon: <Mail size={18} />, roles: ['SuperAdmin'] },
        { name: 'System Notifications', path: '/admin/notifications', icon: <Bell size={18} />, roles: ['Admin', 'SuperAdmin'] },
        { name: 'Support Tickets', path: '/tickets', icon: <LifeBuoy size={18} />, roles: ['Student', 'Support', 'Admin', 'SuperAdmin'] },
      ]
    },
    {
      title: 'STUDENTS',
      items: [
        { name: 'Student Directory', path: '/admin/students', icon: <Users size={18} />, roles: ['Admin', 'SuperAdmin'] },
        { name: 'Onboarding Requests', path: '/admin/onboarding', icon: <ClipboardList size={18} />, roles: ['Admin', 'SuperAdmin'] },
      ]
    },
    {
      title: 'MANAGEMENT',
      items: [
        { name: 'LMS Overview', path: '/admin/overview', icon: <Activity size={18} />, roles: ['Admin', 'SuperAdmin'] },
        { name: 'Google Form Sync', path: '/admin/google-sync', icon: <RefreshCw size={18} />, roles: ['Admin', 'SuperAdmin'] },
        { name: 'Audit Logs', path: '/admin/audit', icon: <Shield size={18} />, roles: ['Admin', 'SuperAdmin'] },
        { name: 'System Settings', path: '/admin/settings', icon: <SettingsIcon size={18} />, roles: ['Admin', 'SuperAdmin'] },
      ]
    }
  ];

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-slate-900 text-slate-300 w-64 border-r border-slate-800 dark:bg-bg-dark dark:border-border-dark">
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-800 dark:border-border-dark bg-slate-950/20">
        <img
          src={BRAND.logo}
          alt={BRAND.name}
          className="w-10 h-10 object-contain"
        />
        <div>
          <h1 className="font-poppins font-bold text-white text-sm tracking-wide">{BRAND.company}</h1>
          <p className="text-[10px] text-slate-400 font-medium">PRIVATE LMS SYSTEM</p>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-4 py-6 overflow-y-auto custom-scrollbar">
        {sidebarGroups.map((group, idx) => {
          const groupItems = group.items.filter(item => user && item.roles.includes(user.role));
          if (groupItems.length === 0) return null;

          return (
            <div key={idx} className="mb-6 last:mb-0">
              <h3 className="px-3 mb-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">{group.title}</h3>
              <div className="space-y-1">
                {groupItems.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.name}
                      to={item.path}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-poppins text-sm font-medium transition-all duration-200 ${
                        isActive
                          ? 'bg-accent/10 text-accent font-semibold'
                          : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                      }`}
                    >
                      <div className={`${isActive ? 'text-accent' : 'text-slate-500'}`}>
                        {item.icon}
                      </div>
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Footer Profile & Controls */}
      <div className="p-4 border-t border-slate-800 dark:border-border-dark bg-slate-950/30">
        <div className="flex items-center justify-between mb-4 px-1">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 shrink-0 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 border border-slate-700 font-bold uppercase text-xs">
              {user?.name.slice(0, 2)}
            </div>
            <div className="overflow-hidden">
              <h4 className="font-semibold text-slate-200 text-xs truncate leading-tight">{user?.name}</h4>
              <span className="text-[10px] text-slate-500 font-poppins uppercase tracking-wider">{user?.role}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => dispatch(toggleTheme())}
            className="flex-1 flex items-center justify-center py-2 rounded-lg bg-slate-800/50 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition duration-200"
            title="Toggle Theme"
          >
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
          </button>
          <button
            onClick={handleLogout}
            className="flex-1 flex items-center justify-center py-2 rounded-lg bg-slate-800/50 hover:bg-red-900/40 text-slate-400 hover:text-red-400 transition duration-200"
            title="Logout"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </div>
  );

    return (
      <div className="min-h-screen flex bg-bg-light dark:bg-bg-dark transition-colors duration-200">
        <Toaster position="top-right" reverseOrder={false} />
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
          <header className="flex items-center justify-between px-6 py-4 bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-40 dark:bg-slate-900/80 dark:border-slate-800 h-[72px]">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setMobileOpen(true)}
                className="p-2 -ml-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden text-slate-500 dark:text-slate-400 transition-colors"
              >
                <Menu size={20} />
              </button>
    
              <div className="flex items-center gap-3">
                <img
                  src={BRAND.logo}
                  alt={BRAND.name}
                  className="w-8 h-8 object-contain"
                />
                <div className="hidden sm:flex flex-col">
                  <span className="font-poppins font-bold text-slate-800 dark:text-white text-sm leading-tight">
                    {BRAND.name}
                  </span>
                  <span className="text-[10px] font-bold text-accent uppercase tracking-wider">
                    {user?.role} Portal
                  </span>
                </div>
              </div>
            </div>
  
            <div className="flex items-center gap-5">
              <span className="hidden md:inline text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Support: support@techzonwide.com
              </span>
              <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 hidden md:block"></div>
              <NotificationBell />
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
