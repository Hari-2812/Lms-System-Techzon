import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { Settings as SettingsIcon, ShieldCheck, Mail, Phone, Loader2, Save } from 'lucide-react';

const AdminSettings: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form states
  const [appName, setAppName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [supportEmail, setSupportEmail] = useState('');
  const [supportNumber, setSupportNumber] = useState('');
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await api.get('/settings');
      const data = res.data.data;
      setAppName(data.appName || 'Techzon LMS System');
      setCompanyName(data.companyName || 'Techzon Wide');
      setSupportEmail(data.supportEmail || 'support@techzonwide.com');
      setSupportNumber(data.supportNumber || '+91 6374191654');
      setMaintenanceMode(data.maintenanceMode || false);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      await api.put('/settings', {
        appName,
        companyName,
        supportEmail,
        supportNumber,
        maintenanceMode,
      });

      alert('Global configurations updated successfully!');
      fetchSettings();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to save settings');
    } finally {
      setSaving(false);
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
    <div className="space-y-8 font-poppins text-slate-800 dark:text-slate-200 max-w-4xl">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">System Settings</h2>
        <p className="text-xs text-slate-500">Edit branding coordinates, customer support numbers, and maintenance controls.</p>
      </div>

      <div className="glass-card p-6">
        <form onSubmit={handleSubmit} className="space-y-6 text-xs font-semibold">
          {/* General Branding */}
          <div className="space-y-4">
            <h3 className="font-extrabold text-sm border-b pb-2 border-slate-100 dark:border-border-dark">Branding & Identity</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-slate-500">App Name</label>
                <input
                  type="text"
                  required
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                  className="glass-input py-2 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-500">Company Legal Name</label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="glass-input py-2 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Contact Details */}
          <div className="space-y-4 pt-4">
            <h3 className="font-extrabold text-sm border-b pb-2 border-slate-100 dark:border-border-dark">Support Contact Points</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-slate-500 flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-accent" /> Support Email Address
                </label>
                <input
                  type="email"
                  required
                  value={supportEmail}
                  onChange={(e) => setSupportEmail(e.target.value)}
                  className="glass-input py-2 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-500 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-accent" /> Support Call Center Number
                </label>
                <input
                  type="text"
                  required
                  value={supportNumber}
                  onChange={(e) => setSupportNumber(e.target.value)}
                  className="glass-input py-2 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Maintenance Settings */}
          <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-border-dark">
            <h3 className="font-extrabold text-sm">System Operations</h3>
            <label className="flex items-center gap-3 p-4 rounded-xl border border-dashed border-slate-200 dark:border-border-dark cursor-pointer bg-slate-50/50 dark:bg-card-dark/20">
              <input
                type="checkbox"
                checked={maintenanceMode}
                onChange={() => setMaintenanceMode(!maintenanceMode)}
                className="w-5 h-5 rounded text-accent focus:ring-accent accent-accent"
              />
              <div>
                <h4 className="font-bold text-slate-800 dark:text-white text-xs">Enable Maintenance Mode</h4>
                <p className="text-[10px] text-slate-400 font-medium">Bypass student login pages and show static maintenance checkups screen.</p>
              </div>
            </label>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-border-dark">
            <button
              type="submit"
              disabled={saving}
              className="btn-accent py-2.5 px-6 flex items-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Global Configuration
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminSettings;
