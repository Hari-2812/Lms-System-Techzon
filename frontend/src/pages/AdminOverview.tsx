import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import {
  Users,
  GraduationCap,
  Download,
  Activity,
  Loader2,
  CheckCircle,
  FileSpreadsheet,
  ClipboardList,
  ArrowRight,
  ExternalLink
} from 'lucide-react';

const AdminOverview: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await api.get('/analytics/admin');
      setStats(res.data.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async (type: 'onboardings' | 'enrollments') => {
    try {
      const response = await api.get(`/analytics/export?type=${type}`, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'text/csv' });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `${type}_report_${Date.now()}.csv`;
      link.click();
    } catch (error) {
      alert('Error exporting CSV reports');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-8 font-poppins text-slate-800 dark:text-slate-200">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Admin Dashboard Overview</h2>
        <p className="text-xs text-slate-500">Global site management analytics, onboarding reviews, and audit controls.</p>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="glass-card p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div>
            <h5 className="text-2xl font-bold">{stats?.pendingOnboardingRequests || 0}</h5>
            <p className="text-xs text-slate-500 font-medium">Pending Onboardings</p>
          </div>
        </div>

        <div className="glass-card p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h5 className="text-2xl font-bold">{stats?.totalStudents || 0}</h5>
            <p className="text-xs text-slate-500 font-medium">Active Students</p>
          </div>
        </div>

        <div className="glass-card p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <h5 className="text-2xl font-bold">{stats?.totalCourses || 0}</h5>
            <p className="text-xs text-slate-500 font-medium">Available Courses</p>
          </div>
        </div>

        <div className="glass-card p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-green-500/10 text-green-500 flex items-center justify-center">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <h5 className="text-2xl font-bold">{stats?.activeEnrollments || 0}</h5>
            <p className="text-xs text-slate-500 font-medium">Active Enrollments</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Onboarding Operations panel */}
        <div className="lg:col-span-1 glass-card p-6 space-y-5 h-fit border border-accent/15">
          <div className="flex items-center gap-2 text-accent">
            <ClipboardList className="w-5 h-5" />
            <h3 className="font-bold text-slate-800 dark:text-white text-base">Onboarding Actions</h3>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed font-medium">
            Manage your incoming student onboarding workflow. Review college degrees, contact details, preferred learning plans, and approve them to grant access.
          </p>

          <div className="space-y-3">
            <Link 
              to="/admin/onboarding" 
              className="w-full py-3 px-4 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary-light flex items-center justify-center gap-1.5 transition"
            >
              Go to Review Board <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Audit Logs and Report Downloads */}
        <div className="lg:col-span-2 space-y-6">
          {/* Report Downloads Panel */}
          <div className="glass-card p-6 space-y-4">
            <h3 className="font-bold text-slate-800 dark:text-white text-base">Export System Reports</h3>
            <div className="flex gap-4">
              <button
                onClick={() => handleExportCSV('onboardings')}
                className="flex-1 py-3 px-4 rounded-xl border border-slate-100 dark:border-border-dark hover:bg-slate-50 dark:hover:bg-slate-800/40 text-xs font-semibold flex items-center justify-center gap-2 transition"
              >
                <FileSpreadsheet className="w-5 h-5 text-emerald-500" /> Export Applications CSV
              </button>
              <button
                onClick={() => handleExportCSV('enrollments')}
                className="flex-1 py-3 px-4 rounded-xl border border-slate-100 dark:border-border-dark hover:bg-slate-50 dark:hover:bg-slate-800/40 text-xs font-semibold flex items-center justify-center gap-2 transition"
              >
                <FileSpreadsheet className="w-5 h-5 text-emerald-500" /> Export Enrollments CSV
              </button>
            </div>
          </div>

          {/* Audit Logs list */}
          <div className="glass-card p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-border-dark">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-accent" />
                <h3 className="font-bold text-slate-800 dark:text-white text-base">Audit Trail logs</h3>
              </div>
            </div>

            <div className="space-y-3 max-h-[30vh] overflow-y-auto pr-2">
              {stats?.recentAuditLogs?.length === 0 ? (
                <p className="text-center text-xs text-slate-500 py-6">No audits logged yet.</p>
              ) : (
                stats?.recentAuditLogs?.map((log: any) => (
                  <div key={log._id} className="p-3 border-b border-slate-50/50 dark:border-border-dark/30 text-xs space-y-1">
                    <div className="flex justify-between font-bold text-slate-700 dark:text-slate-300">
                      <span>{log.action}</span>
                      <span className="text-[10px] text-slate-400 font-semibold">{new Date(log.createdAt).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium leading-relaxed">{log.details}</p>
                    <p className="text-[9px] text-slate-400 font-medium">Actor: {log.userId?.email || 'System'}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminOverview;
