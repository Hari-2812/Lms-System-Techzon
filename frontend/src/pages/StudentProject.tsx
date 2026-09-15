import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../utils/api';
import { Loader2 } from 'lucide-react';

const StudentProject: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const [projectData, setProjectData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Form State
  const [githubUrl, setGithubUrl] = useState('');
  const [liveUrl, setLiveUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectData?.project) return;

    setSubmitting(true);
    try {
      await api.post(`/student/projects/${projectData.project._id}/submit`, {
        links: { githubUrl, liveUrl }
      });
      alert('Project submitted successfully!');
      fetchProject();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to submit project');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="animate-spin w-8 h-8 text-accent" />
      </div>
    );
  }

  if (!projectData?.project) {
    return (
      <div className="p-6 text-center text-slate-400">
        <p>No project has been assigned yet. Complete your course to become eligible.</p>
      </div>
    );
  }

  const { project, submission } = projectData;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-white">Project: {project.title}</h1>
      
      <div className="bg-card-dark p-6 rounded-xl border border-white/5 space-y-4 text-white">
        <div>
          <h3 className="font-semibold text-slate-300">Description</h3>
          <p className="text-sm mt-1">{project.description}</p>
        </div>
        <div>
          <h3 className="font-semibold text-slate-300">Status</h3>
          <p className="text-sm mt-1 text-accent font-bold">{project.status}</p>
        </div>
      </div>

      {(project.status === 'ASSIGNED' || project.status === 'CHANGES_REQUESTED') && (
        <form onSubmit={handleSubmit} className="bg-card-dark p-6 rounded-xl border border-white/5 space-y-4">
          <h2 className="text-xl font-bold text-white mb-4">Submit Project</h2>
          
          {submission?.adminFeedback && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
              <p className="font-bold">⚠ Changes Requested:</p>
              <p className="text-sm mt-1">{submission.adminFeedback}</p>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">GitHub Repository URL *</label>
            <input 
              type="url" 
              required
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              className="w-full bg-[#0a0514] border border-white/10 rounded-lg px-4 py-2 text-white outline-none focus:border-accent"
              placeholder="https://github.com/..."
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Live Project URL *</label>
            <input 
              type="url" 
              required
              value={liveUrl}
              onChange={(e) => setLiveUrl(e.target.value)}
              className="w-full bg-[#0a0514] border border-white/10 rounded-lg px-4 py-2 text-white outline-none focus:border-accent"
              placeholder="https://your-project.vercel.app"
            />
          </div>

          <button 
            type="submit" 
            disabled={submitting}
            className="w-full py-3 bg-accent text-white font-bold rounded-lg hover:bg-orange-600 disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Submit Project'}
          </button>
        </form>
      )}

      {submission && (project.status === 'UNDER_REVIEW' || project.status === 'APPROVED') && (
        <div className="bg-card-dark p-6 rounded-xl border border-white/5 space-y-4 text-white">
          <h2 className="text-xl font-bold text-emerald-400">
            {project.status === 'APPROVED' ? 'Project Approved ✓' : 'Project Under Review'}
          </h2>
          <p className="text-sm text-slate-400">Your project has been submitted successfully.</p>
          {project.status === 'APPROVED' && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400">
              <p className="font-bold">🎓 Certificate Issued</p>
              <p className="text-sm mt-1">Your certificate has been sent to your registered email address.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StudentProject;
