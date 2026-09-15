import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { Loader2 } from 'lucide-react';

const AdminProjects: React.FC = () => {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await api.get('/admin/projects');
      setProjects(res.data.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const approveProject = async (id: string) => {
    if (!window.confirm("Approve this project? After approval, the student will become eligible for certificate generation.")) return;
    try {
      await api.post(`/admin/projects/${id}/approve`);
      alert('Project Approved! Certificate Generated and Email Sent.');
      fetchProjects();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to approve');
    }
  };

  const requestChanges = async (id: string) => {
    const feedback = prompt("Please enter the feedback for the student:");
    if (!feedback) return;
    try {
      await api.post(`/admin/projects/${id}/request-changes`, { feedback });
      alert('Changes requested.');
      fetchProjects();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to request changes');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="animate-spin w-8 h-8 text-accent" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-white mb-6">Admin Project Management</h1>
      <div className="space-y-4">
        {projects.length === 0 ? (
          <p className="text-slate-400">No projects found.</p>
        ) : (
          projects.map((proj) => (
            <div key={proj._id} className="bg-card-dark p-6 rounded-xl border border-white/5 space-y-4 text-white">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-lg">{proj.title}</h3>
                  <p className="text-sm text-slate-400">Student: {proj.studentId?.name} ({proj.studentId?.email})</p>
                  <p className="text-sm text-slate-400">Status: <span className="text-accent font-semibold">{proj.status}</span></p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => requestChanges(proj._id)} className="px-4 py-2 bg-slate-800 rounded-lg text-sm hover:bg-slate-700">Request Changes</button>
                  <button onClick={() => approveProject(proj._id)} className="px-4 py-2 bg-emerald-600 rounded-lg text-sm hover:bg-emerald-500">Approve Project</button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminProjects;
