import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../utils/api';
import { Loader2, UploadCloud, X, File as FileIcon, CheckCircle2 } from 'lucide-react';

const StudentProject: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const [projectData, setProjectData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Form State
  const [links, setLinks] = useState<any>({});
  const [files, setFiles] = useState<any[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState<{ [key: string]: number }>({});
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchProject();
  }, [courseId]);

  const fetchProject = async () => {
    try {
      const res = await api.get(`/student/projects/${courseId}`);
      setProjectData(res.data.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleLinkChange = (key: string, value: string) => {
    setLinks({ ...links, [key]: value });
  };

  // Fake Cloudinary Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, requirementName: string) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;
    const file = selectedFiles[0];

    // File validation
    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('File exceeds the allowed size of 10MB.');
      return;
    }

    // Simulate upload progress
    const fileId = Math.random().toString(36).substring(7);
    setUploadingFiles({ ...uploadingFiles, [fileId]: 0 });
    
    for (let i = 10; i <= 100; i += 20) {
      await new Promise(r => setTimeout(r, 200));
      setUploadingFiles(prev => ({ ...prev, [fileId]: i }));
    }

    // Mock Cloudinary Response
    const uploadedUrl = `https://res.cloudinary.com/demo/image/upload/v1615555555/${file.name.replace(/[^a-zA-Z0-9]/g, '')}.jpg`;
    
    setFiles([...files, {
      name: file.name,
      url: uploadedUrl,
      type: requirementName,
      size: file.size
    }]);

    setUploadingFiles(prev => {
      const newMap = { ...prev };
      delete newMap[fileId];
      return newMap;
    });
    setErrorMsg('');
  };

  const removeFile = (index: number) => {
    const newFiles = [...files];
    newFiles.splice(index, 1);
    setFiles(newFiles);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectData?.project) return;
    setErrorMsg('');

    // Validation against requirements
    const reqs = projectData.project.requirements || [];
    for (const req of reqs) {
      if (req.isRequired) {
        if (req.type === 'url' && !links[req.name]) {
          setErrorMsg(`${req.name} is required.`);
          return;
        }
        if (req.type === 'file' && !files.some(f => f.type === req.name)) {
          setErrorMsg(`${req.name} is required.`);
          return;
        }
      }
    }

    setSubmitting(true);
    try {
      await api.post(`/student/projects/${projectData.project._id}/submit`, {
        links,
        files,
        notes: ''
      });
      alert('Project submitted successfully!');
      fetchProject();
    } catch (error: any) {
      setErrorMsg(error.response?.data?.message || 'Failed to submit project');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin w-8 h-8 text-accent" /></div>;

  if (!projectData?.project) return (
    <div className="p-12 text-center text-slate-400">
      <p>No project has been assigned yet. Complete your course to become eligible.</p>
    </div>
  );

  const { project, submission } = projectData;
  const reqs = project.requirements || [
    { name: 'GitHub Repository', type: 'url', isRequired: true },
    { name: 'Live Project URL', type: 'url', isRequired: true },
    { name: 'Screenshots', type: 'file', isRequired: true }
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-white">Project: {project.title}</h1>
      
      <div className="bg-card-dark p-6 rounded-xl border border-white/5 space-y-4 text-white">
        <div>
          <h3 className="font-semibold text-slate-300">Description</h3>
          <p className="text-sm mt-1">{project.description}</p>
        </div>
        <div>
          <h3 className="font-semibold text-slate-300">Due Date</h3>
          <p className="text-sm mt-1">{new Date(project.dueDate).toLocaleDateString()}</p>
        </div>
      </div>

      {(project.status === 'ASSIGNED' || project.status === 'CHANGES_REQUESTED') && (
        <form onSubmit={handleSubmit} className="bg-card-dark p-6 rounded-xl border border-white/5 space-y-6">
          <h2 className="text-xl font-bold text-white">Submit Project</h2>
          
          {submission?.adminFeedback && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
              <p className="font-bold">⚠ Changes Requested:</p>
              <p className="text-sm mt-1">{submission.adminFeedback}</p>
            </div>
          )}

          {errorMsg && (
             <div className="p-3 bg-red-500/20 border border-red-500 rounded text-red-400 text-sm font-semibold">
               {errorMsg}
             </div>
          )}

          <div className="space-y-5">
            {reqs.map((req: any, idx: number) => (
              <div key={idx} className="space-y-2 border-b border-white/5 pb-4 last:border-0">
                <label className="text-sm font-medium text-slate-300">
                  {req.name} {req.isRequired ? <span className="text-red-500">*</span> : <span className="text-slate-500">(Optional)</span>}
                </label>
                
                {req.type === 'url' ? (
                  <input 
                    type="url" 
                    value={links[req.name] || ''}
                    onChange={(e) => handleLinkChange(req.name, e.target.value)}
                    className="w-full bg-[#0a0514] border border-white/10 rounded-lg px-4 py-2 text-white outline-none focus:border-accent"
                    placeholder={`Enter ${req.name} URL...`}
                  />
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-4">
                      <label className="cursor-pointer bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg text-sm text-white font-semibold flex items-center gap-2 transition">
                        <UploadCloud className="w-4 h-4" /> Upload File
                        <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, req.name)} />
                      </label>
                    </div>

                    {/* Uploading Status */}
                    {Object.keys(uploadingFiles).length > 0 && (
                      <div className="text-xs text-slate-400 animate-pulse">Uploading...</div>
                    )}

                    {/* Uploaded Files for this req */}
                    <div className="space-y-2">
                      {files.filter(f => f.type === req.name).map((f, i) => (
                         <div key={i} className="flex items-center justify-between bg-[#0a0514] p-3 rounded-lg border border-white/5">
                           <div className="flex items-center gap-3 text-sm text-slate-300">
                             <CheckCircle2 className="w-4 h-4 text-green-500" />
                             <span className="truncate max-w-[200px]">{f.name}</span>
                             <span className="text-xs text-slate-500">{(f.size / 1024).toFixed(1)} KB</span>
                           </div>
                           <button type="button" onClick={() => removeFile(files.findIndex(file => file === f))} className="text-slate-500 hover:text-red-500">
                             <X className="w-4 h-4" />
                           </button>
                         </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <button 
            type="submit" 
            disabled={submitting || Object.keys(uploadingFiles).length > 0}
            className="w-full py-3 bg-accent text-white font-bold rounded-lg hover:bg-orange-600 disabled:opacity-50 mt-4"
          >
            {submitting ? 'Submitting...' : 'Submit Project'}
          </button>
        </form>
      )}

      {submission && (project.status === 'UNDER_REVIEW' || project.status === 'APPROVED') && (
        <div className="bg-card-dark p-6 rounded-xl border border-white/5 space-y-4 text-white">
          <h2 className="text-xl font-bold text-emerald-400 flex items-center gap-2">
            <CheckCircle2 className="w-6 h-6"/> 
            {project.status === 'APPROVED' ? 'Project Approved ✓' : 'Project Under Review'}
          </h2>
          <p className="text-sm text-slate-400">Your project has been submitted successfully.</p>
          
          <div className="mt-4 p-4 bg-[#0a0514] rounded-lg space-y-3">
             <h3 className="font-semibold text-slate-300 border-b border-white/5 pb-2">Submission Snapshot</h3>
             {Object.entries(submission.links || {}).map(([k, v]: any) => (
                <div key={k} className="text-sm">
                  <span className="text-slate-500 w-32 inline-block">{k}:</span>
                  <a href={v} target="_blank" rel="noreferrer" className="text-accent hover:underline">{v}</a>
                </div>
             ))}
             {submission.files?.map((f: any, i: number) => (
                <div key={i} className="text-sm flex items-center gap-2">
                  <span className="text-slate-500 w-32 inline-block">{f.type}:</span>
                  <a href={f.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-accent hover:underline">
                    <FileIcon className="w-4 h-4"/> {f.name}
                  </a>
                </div>
             ))}
          </div>

          {project.status === 'APPROVED' && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 mt-4">
              <p className="font-bold">🎓 Certificate Issued</p>
              <p className="text-sm mt-1 text-emerald-300/80">Your certificate has been sent to your registered email address.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StudentProject;
