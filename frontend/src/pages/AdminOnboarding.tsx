import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { toast } from 'react-hot-toast';
import { RefreshCw, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import DashboardLayout from '../layouts/DashboardLayout';


interface SyncStat {
  _id: string;
  timestamp: string;
  totalRows: number;
  processed: number;
  created: number;
  updated: number;
  alreadySynced: number;
  failed: number;
  skipped: number;
  errors: Array<{
    row: number;
    email: string;
    reason: string;
    message: string;
  }>;
}

const AdminOnboarding: React.FC = () => {
  const [stats, setStats] = useState<SyncStat[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await api.get('/onboarding/sync-stats');
      setStats(res.data.data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch sync stats');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleSync = async () => {
    try {
      setSyncing(true);
      const res = await api.post('/onboarding/sync');
      toast.success(res.data.message || 'Sync completed successfully');
      fetchStats();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const latestStat = stats.length > 0 ? stats[0] : null;

  return (
    <DashboardLayout role="Admin">
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        
        {/* HEADER SECTION */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Google Form Onboarding Sync</h2>
            <p className="text-slate-500 text-sm mt-1">
              Synchronize student onboarding data directly from Google Sheets.
            </p>
          </div>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-all shadow-sm disabled:opacity-70"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync Now'}
          </button>
        </div>

        {error && <div className="text-red-600 bg-red-50 p-4 rounded-md">{error}</div>}

        {loading ? (
          <div className="flex justify-center py-20">
            <span className="text-slate-500">Loading...</span>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* LATEST SYNC SUMMARY */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300">
                    <Clock className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Last Sync</h3>
                </div>
                <p className="text-xl font-bold text-slate-900 dark:text-white">
                  {latestStat ? new Date(latestStat.timestamp).toLocaleString() : 'Never'}
                </p>
              </div>

              <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Total Processed</h3>
                </div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {latestStat?.processed || 0}
                </p>
              </div>

              <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-green-50 dark:bg-green-900/30 rounded-lg text-green-600 dark:text-green-400">
                    <RefreshCw className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">New / Updated</h3>
                </div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {latestStat?.created || 0} / {latestStat?.updated || 0}
                </p>
              </div>

              <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-red-50 dark:bg-red-900/30 rounded-lg text-red-600 dark:text-red-400">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Failed / Skipped</h3>
                </div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {latestStat?.failed || 0} / {latestStat?.skipped || 0}
                </p>
              </div>
            </div>

            {/* SYNC HISTORY AND ERRORS */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Recent Sync Logs</h3>
                <button onClick={fetchStats} className="text-blue-600 hover:text-blue-700 text-sm font-medium">Refresh</button>
              </div>
              
              <div className="overflow-x-auto">
                {stats.length === 0 ? (
                  <div className="p-8 text-center text-slate-500">No sync history available.</div>
                ) : (
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="px-6 py-4">Timestamp</th>
                        <th className="px-6 py-4">Rows</th>
                        <th className="px-6 py-4">Created</th>
                        <th className="px-6 py-4">Updated</th>
                        <th className="px-6 py-4">Skipped</th>
                        <th className="px-6 py-4">Failed</th>
                        <th className="px-6 py-4">Errors</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                      {stats.map((stat) => (
                        <tr key={stat._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20">
                          <td className="px-6 py-4 text-slate-700 dark:text-slate-300">
                            {new Date(stat.timestamp).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{stat.processed} / {stat.totalRows}</td>
                          <td className="px-6 py-4 text-green-600 dark:text-green-400 font-medium">{stat.created}</td>
                          <td className="px-6 py-4 text-blue-600 dark:text-blue-400">{stat.updated}</td>
                          <td className="px-6 py-4 text-slate-500">{stat.skipped}</td>
                          <td className="px-6 py-4 text-red-600 dark:text-red-400 font-medium">{stat.failed}</td>
                          <td className="px-6 py-4">
                            {stat.errors && stat.errors.length > 0 ? (
                              <div className="max-h-24 overflow-y-auto space-y-1">
                                {stat.errors.map((err, i) => (
                                  <div key={i} className="text-xs text-red-600 dark:text-red-400">
                                    <span className="font-semibold">Row {err.row} ({err.email}):</span> {err.reason}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-400 italic text-xs">No errors</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminOnboarding;
