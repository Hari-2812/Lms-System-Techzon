import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import {
  TrendingUp,
  Users,
  GraduationCap,
  CreditCard,
  Download,
  Terminal,
  Activity,
  Loader2,
  CheckCircle,
  FileSpreadsheet
} from 'lucide-react';

const AdminOverview: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Webhook Simulator states
  const [simEmail, setSimEmail] = useState('');
  const [simName, setSimName] = useState('');
  const [simCourse, setSimCourse] = useState('full-stack-mern-development');
  const [simPlan, setSimPlan] = useState('mentor-led');
  const [simLoading, setSimLoading] = useState(false);
  const [simResult, setSimResult] = useState('');

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

  const handleSimulateWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    setSimLoading(true);
    setSimResult('');

    try {
      const res = await api.post('/payments/simulate-webhook', {
        email: simEmail,
        name: simName,
        courseIdOrSlug: simCourse,
        planCodeOrSlug: simPlan,
      });

      setSimResult('Webhook Processed! Account created and enrollment activated.');
      setSimEmail('');
      setSimName('');
      fetchStats();
    } catch (error: any) {
      setSimResult('Error simulating payment webhook: ' + (error.response?.data?.error || error.message));
    } finally {
      setSimLoading(false);
    }
  };

  const handleExportCSV = async (type: 'payments' | 'enrollments') => {
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
        <p className="text-xs text-slate-500">Global site management analytics and audit controls.</p>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="glass-card p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <h5 className="text-2xl font-bold">₹{stats?.totalRevenue?.toLocaleString()}</h5>
            <p className="text-xs text-slate-500 font-medium">Total Revenue</p>
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
        {/* Webhook Simulator (Manual Account Creator) */}
        <div className="lg:col-span-1 glass-card p-6 space-y-5 h-fit border border-accent/15">
          <div className="flex items-center gap-2 text-accent">
            <Terminal className="w-5 h-5" />
            <h3 className="font-bold text-slate-800 dark:text-white text-base">Razorpay Webhook Simulator</h3>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed font-medium">
            Simulate a Razorpay purchase webhook event to automatically create a student account, enroll them, and trigger the welcome email template.
          </p>

          <form onSubmit={handleSimulateWebhook} className="space-y-4 text-xs font-semibold">
            <div className="space-y-1">
              <label className="text-slate-500">Student Name</label>
              <input
                type="text"
                required
                placeholder="Jane Doe"
                value={simName}
                onChange={(e) => setSimName(e.target.value)}
                className="glass-input py-2 text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-500">Payment Email</label>
              <input
                type="email"
                required
                placeholder="jane@example.com"
                value={simEmail}
                onChange={(e) => setSimEmail(e.target.value)}
                className="glass-input py-2 text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-500">Course Identifier (ID or Slug)</label>
              <input
                type="text"
                required
                value={simCourse}
                onChange={(e) => setSimCourse(e.target.value)}
                className="glass-input py-2 text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-500">Learning Plan Code</label>
              <select
                value={simPlan}
                onChange={(e) => setSimPlan(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 dark:border-border-dark rounded-lg outline-none bg-transparent"
              >
                <option value="self-paced">Self-Paced Learning</option>
                <option value="mentor-led">Mentor-Led Learning</option>
                <option value="advanced-mentor">Advanced Mentor Plan</option>
              </select>
            </div>

            <button type="submit" disabled={simLoading} className="btn-accent w-full py-2.5 text-xs">
              {simLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Trigger Purchase Verification'}
            </button>
          </form>

          {simResult && (
            <div className="p-3 bg-primary/10 border border-primary/20 dark:border-border-dark text-[11px] rounded-lg leading-relaxed text-center font-medium text-accent">
              {simResult}
            </div>
          )}
        </div>

        {/* Audit Logs and Report Downloads */}
        <div className="lg:col-span-2 space-y-6">
          {/* Report Downloads Panel */}
          <div className="glass-card p-6 space-y-4">
            <h3 className="font-bold text-slate-800 dark:text-white text-base">Export System Reports</h3>
            <div className="flex gap-4">
              <button
                onClick={() => handleExportCSV('payments')}
                className="flex-1 py-3 px-4 rounded-xl border border-slate-100 dark:border-border-dark hover:bg-slate-50 dark:hover:bg-slate-800/40 text-xs font-semibold flex items-center justify-center gap-2 transition"
              >
                <FileSpreadsheet className="w-5 h-5 text-emerald-500" /> Export Payments CSV
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
