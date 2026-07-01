import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { Users, UserPlus, Mail, ShieldAlert, Loader2, Plus, X } from 'lucide-react';

interface Student {
  _id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  isEmailVerified: boolean;
  createdAt: string;
}

const AdminStudents: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [mentors, setMentors] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'students' | 'mentors'>('students');

  // Create Mentor/Admin states
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'mentor' | 'admin'>('mentor');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const resStuds = await api.get('/users/students');
      setStudents(resStuds.data.data || []);

      const resMents = await api.get('/users/mentors');
      setMentors(resMents.data.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      await api.post('/users/create-admin-mentor', {
        name,
        email,
        password,
        role,
      });

      alert(`Account for ${role} created successfully!`);
      setName('');
      setEmail('');
      setPassword('');
      setShowForm(false);
      fetchUsers();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to create user account');
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
    <div className="space-y-8 font-poppins text-slate-800 dark:text-slate-200">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">LMS Users Directory</h2>
          <p className="text-xs text-slate-500">Manage registered students lists and create secure mentor accounts.</p>
        </div>

        <button
          onClick={() => setShowForm(true)}
          className="btn-accent py-2.5 px-5 text-xs flex items-center gap-1.5"
        >
          <UserPlus className="w-4 h-4" /> Provision Admin/Mentor
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-border-dark font-poppins">
        <button
          onClick={() => setActiveTab('students')}
          className={`px-6 py-3 text-xs font-semibold uppercase tracking-wider border-b-2 transition ${
            activeTab === 'students'
              ? 'border-accent text-accent'
              : 'border-transparent text-slate-500'
          }`}
        >
          Students ({students.length})
        </button>
        <button
          onClick={() => setActiveTab('mentors')}
          className={`px-6 py-3 text-xs font-semibold uppercase tracking-wider border-b-2 transition ${
            activeTab === 'mentors'
              ? 'border-accent text-accent'
              : 'border-transparent text-slate-500'
          }`}
        >
          Mentors ({mentors.length})
        </button>
      </div>

      {/* List grids */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-semibold">
            <thead className="bg-slate-55/50 border-b border-slate-100 dark:border-border-dark text-slate-500 text-[10px] uppercase tracking-wider font-bold">
              <tr>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Registered On</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Verification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/50 dark:divide-border-dark/30">
              {(activeTab === 'students' ? students : mentors).map((item) => (
                <tr key={item._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition">
                  <td className="px-6 py-4 font-bold text-slate-800 dark:text-white">{item.name}</td>
                  <td className="px-6 py-4 text-slate-500">{item.email}</td>
                  <td className="px-6 py-4 text-slate-500">{new Date(item.createdAt).toLocaleDateString()}</td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 rounded-full text-[10px] uppercase font-bold bg-green-500/10 text-green-500">
                      {item.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-400 font-medium">
                    {item.isEmailVerified ? 'Verified' : 'Pending OTP'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {(activeTab === 'students' ? students : mentors).length === 0 && (
            <div className="text-center py-12 text-slate-500 text-xs">No registered records found.</div>
          )}
        </div>
      </div>

      {/* Custom Add User Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 font-poppins">
          <div className="w-full max-w-sm glass-card p-6 border border-white/5 space-y-4 text-left relative dark:bg-card-dark">
            <button onClick={() => setShowForm(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
            <h3 className="font-extrabold text-slate-800 dark:text-white text-base">Provision Account</h3>

            <form onSubmit={handleCreateUser} className="space-y-4 text-xs font-semibold">
              <div className="space-y-1">
                <label className="text-slate-400">FullName</label>
                <input
                  type="text"
                  required
                  placeholder="John Mentor"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="glass-input py-2 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="mentor@techzonwide.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="glass-input py-2 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400">Password</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="glass-input py-2 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400">User Role</label>
                <select
                  value={role}
                  onChange={(e: any) => setRole(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-border-dark rounded-lg outline-none bg-transparent"
                >
                  <option value="mentor">Mentor / Instructor</option>
                  <option value="admin">System Administrator</option>
                </select>
              </div>

              <button type="submit" disabled={saving} className="btn-accent w-full py-2.5 text-xs">
                {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Provision Profile'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminStudents;
