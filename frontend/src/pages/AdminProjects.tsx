import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { Loader2, File as FileIcon, ExternalLink, Image as ImageIcon, Github, Globe } from 'lucide-react';

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
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="animate-spin w-8 h-8 text-accent" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6">Admin Project Management</h1>
      <div className="space-y-6">
        {projects.length === 0 ? (
          <div className="bg-card-dark border border-white/5 p-12 text-center rounded-xl text-slate-400">
            No projects found.
          </div>
        ) : (
          projects.map((proj) => {
            const submission = proj.submissionId;
            return (
            <div key={proj._id} className="bg-card-dark p-6 rounded-xl border border-white/5 space-y-6 text-white shadow-xl">
              <div className="flex justify-between items-start border-b border-white/10 pb-4">
                <div>
                  <h3 className="font-bold text-xl">{proj.title}</h3>
                  <div className="text-sm text-slate-400 mt-2 space-y-1">
                    <p>Student: <span className="font-semibold text-slate-200">{proj.studentId?.name}</span> ({proj.studentId?.email})</p>
                    <p>Course Completion: <span className="text-green-500 font-bold">100%</span></p>
                    <p>Status: <span className="text-accent font-semibold px-2 py-0.5 bg-accent/10 rounded">{proj.status}</span></p>
                  </div>
                </div>
                
                {proj.status === 'UNDER_REVIEW' && (
                  <div className="flex gap-3">
                    <button onClick={() => requestChanges(proj._id)} className="px-4 py-2 bg-slate-800 text-white font-semibold rounded-lg hover:bg-slate-700 transition">Request Changes</button>
                    <button onClick={() => approveProject(proj._id)} className="px-4 py-2 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-500 transition shadow-lg shadow-emerald-500/20">Approve Project</button>
                  </div>
                )}
                {proj.status === 'APPROVED' && (
                  <div className="text-emerald-500 font-bold bg-emerald-500/10 px-4 py-2 rounded-lg">
                    ✓ APPROVED
                  </div>
                )}
              </div>

              {/* Requirements & Submission Data */}
              {submission ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Links */}
                  <div className="space-y-4">
                    <h4 className="font-bold text-slate-300 border-b border-white/10 pb-2">Submitted Links</h4>
                    {Object.entries(submission.links || {}).map(([key, url]: any) => (
                       <div key={key} className="flex items-center justify-between bg-[#0a0514] p-3 rounded-lg border border-white/5">
                         <div className="flex items-center gap-3">
                           {key.toLowerCase().includes('github') ? <Github className="w-5 h-5 text-slate-400" /> : <Globe className="w-5 h-5 text-slate-400" />}
                           <span className="font-medium text-sm">{key}</span>
                         </div>
                         <a href={url} target="_blank" rel="noreferrer" className="text-accent text-xs font-bold hover:underline flex items-center gap-1">
                           Open Link <ExternalLink className="w-3 h-3" />
                         </a>
                       </div>
                    ))}
                    {Object.keys(submission.links || {}).length === 0 && <p className="text-sm text-slate-500">No links submitted.</p>}
                  </div>

                  {/* Files */}
                  <div className="space-y-4">
                    <h4 className="font-bold text-slate-300 border-b border-white/10 pb-2">Uploaded Files</h4>
                    <div className="space-y-3">
                      {submission.files?.map((file: any, idx: number) => {
                         const isImage = file.url.toLowerCase().match(/\.(jpeg|jpg|gif|png)$/) != null || file.type.toLowerCase().includes('screenshot');
                         return (
                           <div key={idx} className="flex flex-col gap-3 bg-[#0a0514] p-4 rounded-lg border border-white/5">
                             <div className="flex items-center justify-between">
                               <div className="flex items-center gap-3">
                                 {isImage ? <ImageIcon className="w-5 h-5 text-slate-400" /> : <FileIcon className="w-5 h-5 text-slate-400" />}
                                 <div>
                                   <p className="font-medium text-sm text-slate-200 truncate max-w-[200px]">{file.name}</p>
                                   <p className="text-xs text-slate-500">{file.type} • {(file.size / 1024).toFixed(1)} KB</p>
                                 </div>
                               </div>
                               <a href={file.url} target="_blank" rel="noreferrer" className="text-accent text-xs font-bold hover:underline flex items-center gap-1">
                                 View File <ExternalLink className="w-3 h-3" />
                               </a>
                             </div>
                             {isImage && (
                               <div className="mt-2 rounded-lg overflow-hidden border border-white/10 max-h-48">
                                 <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
                               </div>
                             )}
                           </div>
                         );
                      })}
                      {(!submission.files || submission.files.length === 0) && <p className="text-sm text-slate-500">No files submitted.</p>}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-slate-800/50 rounded-lg text-slate-400 text-sm text-center border border-white/5">
                  Submission is pending from the student.
                </div>
              )}
            </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default AdminProjects;
