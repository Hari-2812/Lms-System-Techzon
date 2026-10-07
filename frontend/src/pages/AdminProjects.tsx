import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { Loader2, File as FileIcon, ExternalLink, Image as ImageIcon, Github, Globe, Search, Filter, Plus, UploadCloud, X, CheckCircle, Clock } from 'lucide-react';
import { Card, Badge, Button, PageHeader, EmptyState, LoadingState, Input, Select, Textarea, Modal } from '../components/ui';
import { Link, useNavigate } from 'react-router-dom';

const AdminProjects: React.FC = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  
  const [reconciling, setReconciling] = useState(false);

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

  const handleReconcile = async () => {
    if (!window.confirm("Are you sure you want to reconcile existing students? This will automatically assign projects to students who are eligible but haven't received them yet.")) return;
    setReconciling(true);
    try {
      const res = await api.post('/admin/projects/reconcile');
      const { minorAssignedCount, majorAssignedCount, errors } = res.data.data;
      alert(`Reconciliation Complete!\nMinor Projects Assigned: ${minorAssignedCount}\nMajor Projects Assigned: ${majorAssignedCount}\nErrors: ${errors.length}`);
      fetchProjects();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to reconcile projects');
    } finally {
      setReconciling(false);
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
  


  const filteredProjects = projects.filter(p => {
    const matchesSearch = p.studentId?.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.studentId?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.title?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: projects.length,
    pendingReview: projects.filter(p => p.status === 'UNDER_REVIEW').length,
    approved: projects.filter(p => p.status === 'APPROVED').length,
    minor: projects.filter(p => p.projectType === 'MINOR').length,
    major: projects.filter(p => p.projectType === 'MAJOR').length,
  };

  if (loading) {
    return <LoadingState message="Loading projects..." />;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 font-poppins">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <PageHeader
          title="Project Management"
          description="Manage minor and major projects, configure requirements, and assign them to students."
        />
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => navigate('/admin/courses')} className="hidden md:flex">
            Configure Courses
          </Button>
          <Button variant="accent" onClick={handleReconcile} disabled={reconciling}>
            <Clock className="w-4 h-4 mr-2" /> {reconciling ? 'Reconciling...' : 'Reconcile Existing Students'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="p-4 flex flex-col justify-center bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30">
           <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.total}</span>
           <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1">Total Assigned</span>
        </Card>
        <Card className="p-4 flex flex-col justify-center bg-amber-50/50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/30">
           <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.pendingReview}</span>
           <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1">Pending Review</span>
        </Card>
        <Card className="p-4 flex flex-col justify-center bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/30">
           <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.approved}</span>
           <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1">Approved</span>
        </Card>
        <Card className="p-4 flex flex-col justify-center">
           <span className="text-2xl font-bold text-slate-700 dark:text-slate-300">{stats.minor}</span>
           <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1">Minor Projects</span>
        </Card>
        <Card className="p-4 flex flex-col justify-center">
           <span className="text-2xl font-bold text-slate-700 dark:text-slate-300">{stats.major}</span>
           <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1">Major Projects</span>
        </Card>
      </div>

      <Card className="p-0 overflow-hidden border border-slate-200 dark:border-slate-800">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-50 dark:bg-[#0a0514]">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Search students, emails..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <div className="flex gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-40">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <select 
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="ALL">All Statuses</option>
                <option value="ASSIGNED">Assigned</option>
                <option value="SUBMITTED">Submitted</option>
                <option value="UNDER_REVIEW">Under Review</option>
                <option value="CHANGES_REQUESTED">Changes Requested</option>
                <option value="APPROVED">Approved</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:border-slate-800">
                <th className="p-4 font-semibold">Student & Project</th>
                <th className="p-4 font-semibold">Course</th>
                <th className="p-4 font-semibold">Type</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
              {filteredProjects.length > 0 ? (
                filteredProjects.map((proj) => (
                  <tr key={proj._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                    <td className="p-4">
                      <div className="font-semibold text-slate-800 dark:text-white">{proj.studentId?.name}</div>
                      <div className="text-xs text-slate-500">{proj.studentId?.email}</div>
                      <div className="text-xs font-medium text-accent mt-1">{proj.title}</div>
                    </td>
                    <td className="p-4">
                      <span className="text-slate-600 dark:text-slate-300">{proj.courseId?.title}</span>
                    </td>
                    <td className="p-4">
                      <Badge variant={proj.projectType === 'MAJOR' ? 'accent' : 'info'}>
                        {proj.projectType}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <Badge variant={
                        proj.status === 'APPROVED' ? 'success' :
                        proj.status === 'UNDER_REVIEW' ? 'warning' :
                        proj.status === 'CHANGES_REQUESTED' ? 'danger' : 'default'
                      }>
                        {proj.status.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="p-4 text-right">
                      {proj.status === 'UNDER_REVIEW' && (
                        <div className="flex justify-end gap-2">
                          <button onClick={() => requestChanges(proj._id)} className="text-xs text-amber-600 hover:underline font-semibold">Request Changes</button>
                          <span className="text-slate-300">|</span>
                          <button onClick={() => approveProject(proj._id)} className="text-xs text-emerald-600 hover:underline font-semibold">Approve</button>
                        </div>
                      )}
                      {proj.status === 'APPROVED' && (
                        <span className="text-xs text-emerald-500 font-semibold flex items-center justify-end gap-1"><CheckCircle className="w-3 h-3"/> Approved</span>
                      )}
                      {proj.status !== 'UNDER_REVIEW' && proj.status !== 'APPROVED' && (
                        <span className="text-xs text-slate-400 font-semibold flex items-center justify-end gap-1"><Clock className="w-3 h-3"/> Pending</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">
                    No projects found matching the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>



    </div>
  );
};

export default AdminProjects;
