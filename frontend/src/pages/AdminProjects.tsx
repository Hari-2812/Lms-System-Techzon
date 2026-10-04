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
  
  // Assign Project Modal States
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignStep, setAssignStep] = useState(1);
  const [allCourses, setAllCourses] = useState<any[]>([]);
  const [courseStudents, setCourseStudents] = useState<any[]>([]);
  
  const [assignForm, setAssignForm] = useState({
    courseId: '',
    studentId: '',
    title: 'Final Project',
    description: '',
    instructions: '',
    domain: 'Web Development',
    projectType: 'MINOR',
    batch: 'General'
  });
  
  const [assignReqs, setAssignReqs] = useState<any[]>([
    { name: 'GitHub Repository', type: 'url', isRequired: true },
    { name: 'Live Project URL', type: 'url', isRequired: true },
    { name: 'Source Code', type: 'file', isRequired: true },
    { name: 'Output Screenshots', type: 'file', isRequired: true }
  ]);
  const [assignPdf, setAssignPdf] = useState<{name: string, url: string} | null>(null);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);

  useEffect(() => {
    fetchProjects();
    fetchCourses();
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

  const fetchCourses = async () => {
    try {
      const res = await api.get('/courses');
      setAllCourses(res.data.data || []);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchCourseStudents = async (courseId: string) => {
    setLoadingStudents(true);
    try {
      // Reusing the live class endpoint which returns enrolled students
      const res = await api.get(`/live-classes/course-students/${courseId}`);
      setCourseStudents(res.data.data || []);
    } catch (error) {
      console.error(error);
      setCourseStudents([]);
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleCourseSelect = (courseId: string) => {
    setAssignForm({ ...assignForm, courseId, studentId: '' });
    if (courseId) {
      fetchCourseStudents(courseId);
    } else {
      setCourseStudents([]);
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
  
  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPdf(true);
    // Mock Cloudinary PDF Upload
    await new Promise(r => setTimeout(r, 1500));
    const mockUrl = `https://res.cloudinary.com/demo/image/upload/v1615555555/${file.name.replace(/[^a-zA-Z0-9]/g, '')}.pdf`;
    setAssignPdf({ name: file.name, url: mockUrl });
    setUploadingPdf(false);
  };

  const handleAssignProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignForm.courseId || !assignForm.studentId) {
      alert('Please select both a course and a student.');
      return;
    }
    
    setAssigning(true);
    try {
      const response = await api.post(`/admin/students/${assignForm.studentId}/projects`, {
        courseId: assignForm.courseId,
        title: assignForm.title,
        description: assignForm.description,
        instructions: assignForm.instructions,
        projectPdf: assignPdf?.url,
        domain: assignForm.domain,
        projectType: assignForm.projectType,
        requirements: assignReqs,
        batch: assignForm.batch
      });
      
      if (response.data.emailSent === false) {
        alert('Project assigned successfully, but the email could not be sent.');
      } else {
        alert('Project assigned successfully and notification email sent.');
      }
      
      setAssignModalOpen(false);
      setAssignStep(1);
      fetchProjects();
    } catch (error: any) {
      const errorMsg = error.response?.data?.message 
        || (typeof error.response?.data === 'string' ? `Server Error: ${error.response.status}` : null)
        || error.message 
        || 'Failed to assign project';
      alert(`Failed: ${errorMsg}`);
    } finally {
      setAssigning(false);
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
          <Button variant="accent" onClick={() => setAssignModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> Assign Project
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

      {/* ASSIGN PROJECT MODAL */}
      <Modal 
        isOpen={assignModalOpen} 
        onClose={() => { setAssignModalOpen(false); setAssignStep(1); }}
        title="Assign Final Project"
        maxWidth="max-w-3xl"
      >
            {assignStep === 1 && (
              <form onSubmit={(e) => { e.preventDefault(); setAssignStep(2); }} className="space-y-6">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 dark:bg-slate-800/30 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Select Course <span className="text-red-500">*</span></label>
                    <select 
                      required
                      value={assignForm.courseId} 
                      onChange={e => handleCourseSelect(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-accent focus:outline-none"
                    >
                      <option value="">-- Choose a Course --</option>
                      {allCourses.map(c => (
                        <option key={c._id} value={c._id}>{c.title}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Select Student <span className="text-red-500">*</span></label>
                    <select 
                      required
                      value={assignForm.studentId} 
                      onChange={e => setAssignForm({...assignForm, studentId: e.target.value})}
                      disabled={!assignForm.courseId || loadingStudents}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-accent focus:outline-none disabled:opacity-50"
                    >
                      <option value="">{loadingStudents ? 'Loading students...' : '-- Choose a Student --'}</option>
                      {courseStudents.map(s => (
                        <option key={s.studentId?._id} value={s.studentId?._id}>
                          {s.studentId?.name} ({s.studentId?.email})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input label="Project Title" required value={assignForm.title} onChange={e => setAssignForm({...assignForm, title: e.target.value})} />
                  <Select label="Domain" value={assignForm.domain} onChange={e => setAssignForm({...assignForm, domain: e.target.value})}>
                    <option>Web Development</option>
                    <option>Java</option>
                    <option>Python</option>
                    <option>AI / Data Analytics</option>
                    <option>UI/UX</option>
                  </Select>
                </div>

                <Textarea label="Project Description" required rows={3} value={assignForm.description} onChange={e => setAssignForm({...assignForm, description: e.target.value})} placeholder="Project Objective..." />
                <Textarea label="Project Instructions" required rows={3} value={assignForm.instructions} onChange={e => setAssignForm({...assignForm, instructions: e.target.value})} placeholder="- Complete all required modules..." />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Select label="Project Type" value={assignForm.projectType} onChange={e => setAssignForm({...assignForm, projectType: e.target.value})}>
                    <option value="MINOR">Minor Project (10 Days)</option>
                    <option value="MAJOR">Major Project (30 Days)</option>
                  </Select>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Project PDF (Optional)</label>
                    {assignPdf ? (
                      <div className="flex items-center justify-between bg-emerald-50 dark:bg-[#0a0514] border border-emerald-500/30 p-2.5 rounded-lg text-emerald-600 dark:text-emerald-400">
                        <span className="truncate text-sm font-semibold pr-2">✓ {assignPdf.name}</span>
                        <div className="flex gap-3">
                           <a href={assignPdf.url} target="_blank" rel="noreferrer" className="text-xs hover:underline">Preview</a>
                           <button type="button" onClick={() => setAssignPdf(null)} className="text-xs text-red-500 dark:text-red-400 hover:underline">Remove</button>
                        </div>
                      </div>
                    ) : (
                      <label className="cursor-pointer flex items-center justify-center gap-2 w-full bg-slate-50 dark:bg-[#0a0514] border border-dashed border-slate-300 dark:border-white/20 rounded-lg px-4 py-2.5 hover:border-accent transition text-slate-500 dark:text-slate-400 text-sm">
                         {uploadingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                         {uploadingPdf ? 'Uploading...' : 'Upload Project PDF'}
                         <input type="file" accept=".pdf" className="hidden" onChange={handlePdfUpload} disabled={uploadingPdf} />
                      </label>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                   <Button type="submit" variant="accent">Next: Setup Requirements</Button>
                </div>
              </form>
            )}

            {assignStep === 2 && (
               <div className="space-y-6">
                 <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-2">Configure Submission Requirements</h3>
                 <p className="text-sm text-slate-500 dark:text-slate-400">Add or modify the files and links the student must submit.</p>
                 
                 <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                   {assignReqs.map((r, i) => (
                      <div key={i} className="flex gap-4 items-center bg-slate-50 dark:bg-[#0a0514] p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                        <input type="text" value={r.name} onChange={e => {
                          const nr = [...assignReqs]; nr[i].name = e.target.value; setAssignReqs(nr);
                        }} className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-sm text-slate-800 dark:text-white" />
                        <select value={r.type} onChange={e => {
                          const nr = [...assignReqs]; nr[i].type = e.target.value; setAssignReqs(nr);
                        }} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-sm text-slate-800 dark:text-white">
                          <option value="url">URL Link</option>
                          <option value="file">File Upload</option>
                        </select>
                        <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                          <input type="checkbox" checked={r.isRequired} onChange={e => {
                             const nr = [...assignReqs]; nr[i].isRequired = e.target.checked; setAssignReqs(nr);
                          }} className="rounded text-accent focus:ring-accent" />
                          <span className="text-xs font-semibold">Required</span>
                        </label>
                        <button onClick={() => {
                          const nr = [...assignReqs]; nr.splice(i, 1); setAssignReqs(nr);
                        }} className="text-slate-400 hover:text-red-500"><X className="w-4 h-4"/></button>
                      </div>
                   ))}
                 </div>
                 
                 <Button variant="secondary" size="sm" onClick={() => setAssignReqs([...assignReqs, {name:'New Requirement', type:'url', isRequired:false}])}>
                   <Plus className="w-4 h-4 mr-1" /> Add Requirement
                 </Button>

                 <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-between">
                   <Button type="button" variant="ghost" onClick={() => setAssignStep(1)}>Back</Button>
                   <Button type="button" variant="accent" onClick={handleAssignProject} disabled={assigning}>
                     {assigning ? <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Assigning...</span> : 'Confirm Assignment'}
                   </Button>
                 </div>
               </div>
            )}
      </Modal>

    </div>
  );
};

export default AdminProjects;
