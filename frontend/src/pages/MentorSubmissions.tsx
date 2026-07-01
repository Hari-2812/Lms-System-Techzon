import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { FileText, CheckCircle, ExternalLink, Loader2, X, GraduationCap } from 'lucide-react';

interface Submission {
  _id: string;
  submissionType: string;
  fileUrl?: string;
  repoUrl?: string;
  gdriveUrl?: string;
  notes?: string;
  status: string;
  marksObtained?: number;
  feedback?: string;
  submittedAt: string;
  studentId?: {
    name: string;
    email: string;
  };
  assignmentId?: {
    title: string;
    maxMarks: number;
  };
}

const MentorSubmissions: React.FC = () => {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  // Grading states
  const [selectedSub, setSelectedSub] = useState<Submission | null>(null);
  const [marks, setMarks] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [grading, setGrading] = useState(false);

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    try {
      const res = await api.get('/assignments/submissions');
      setSubmissions(res.data.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleGradeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSub) return;
    setGrading(true);

    try {
      await api.put(`/assignments/submissions/${selectedSub._id}/grade`, {
        marksObtained: marks,
        feedback,
      });

      alert('Assignment graded successfully!');
      setSelectedSub(null);
      fetchSubmissions();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Error grading submission');
    } finally {
      setGrading(false);
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
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Assignments Grading Board</h2>
        <p className="text-xs text-slate-500">Grade student coding projects, verify GitHub checkouts, and post feedback logs.</p>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-semibold">
            <thead className="bg-slate-55/50 border-b border-slate-100 dark:border-border-dark text-slate-500 text-[10px] uppercase tracking-wider font-bold">
              <tr>
                <th className="px-6 py-4">Student</th>
                <th className="px-6 py-4">Assignment</th>
                <th className="px-6 py-4">Submitted Type</th>
                <th className="px-6 py-4">Sent Date</th>
                <th className="px-6 py-4">Grading Status</th>
                <th className="px-6 py-4">Score</th>
                <th className="px-6 py-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/50 dark:divide-border-dark/30">
              {submissions.map((sub) => (
                <tr key={sub._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition">
                  <td className="px-6 py-4">
                    <p className="font-bold text-slate-800 dark:text-white">{sub.studentId?.name || 'Student'}</p>
                    <p className="text-[10px] text-slate-400 font-medium">{sub.studentId?.email}</p>
                  </td>
                  <td className="px-6 py-4 text-slate-700 dark:text-slate-300">
                    {sub.assignmentId?.title || 'Assignment Task'}
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-bold bg-accent/10 text-accent font-inter">
                      {sub.submissionType}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-400 font-medium">
                    {new Date(sub.submittedAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold ${
                      sub.status === 'graded' ? 'bg-green-500/10 text-green-500' : 'bg-amber-500/10 text-amber-500'
                    }`}>
                      {sub.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-bold">
                    {sub.marksObtained !== undefined
                      ? `${sub.marksObtained} / ${sub.assignmentId?.maxMarks}`
                      : '-'}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => {
                        setSelectedSub(sub);
                        setMarks(sub.marksObtained || 0);
                        setFeedback(sub.feedback || '');
                      }}
                      className="text-xs font-bold text-accent hover:underline flex items-center gap-1"
                    >
                      <GraduationCap className="w-4 h-4" /> Evaluate
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {submissions.length === 0 && (
            <div className="text-center py-12 text-slate-500 text-xs">No project submissions registered yet.</div>
          )}
        </div>
      </div>

      {/* Grade modal */}
      {selectedSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 font-poppins">
          <div className="w-full max-w-md glass-card p-6 border border-white/5 space-y-4 text-left relative dark:bg-card-dark">
            <button onClick={() => setSelectedSub(null)} className="absolute top-4 right-4 text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
            <h3 className="font-extrabold text-slate-800 dark:text-white text-base">Evaluate Student Submission</h3>

            <div className="p-4 bg-slate-50 dark:bg-card-dark/30 rounded-xl space-y-2 border border-slate-100 dark:border-border-dark">
              <p className="text-xs text-slate-500">Student: <span className="font-bold text-slate-700 dark:text-white">{selectedSub.studentId?.name}</span></p>
              <p className="text-xs text-slate-500">Assignment: <span className="font-bold text-slate-700 dark:text-white">{selectedSub.assignmentId?.title}</span></p>
              <p className="text-xs text-slate-500 flex items-center gap-1.5">
                Attachments Link:
                <a
                  href={selectedSub.fileUrl || selectedSub.repoUrl || selectedSub.gdriveUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-bold text-accent hover:underline flex items-center gap-0.5"
                >
                  Open submitted resources <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </p>
              {selectedSub.notes && (
                <div className="text-[11px] text-slate-400 italic mt-2 border-t pt-2">
                  Student Notes: "{selectedSub.notes}"
                </div>
              )}
            </div>

            <form onSubmit={handleGradeSubmit} className="space-y-4 text-xs font-semibold">
              <div className="space-y-1">
                <label className="text-slate-400">Score / Marks Obtained (Max: {selectedSub.assignmentId?.maxMarks})</label>
                <input
                  type="number"
                  required
                  max={selectedSub.assignmentId?.maxMarks}
                  value={marks}
                  onChange={(e) => setMarks(parseInt(e.target.value))}
                  className="glass-input py-2 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400">Mentor Remarks / Feedback</label>
                <textarea
                  required
                  placeholder="Excellent work! Check out modular code improvements..."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  className="glass-input py-2 text-xs h-24"
                />
              </div>

              <button type="submit" disabled={grading} className="btn-accent w-full py-2.5 text-xs flex items-center justify-center gap-1.5">
                {grading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Confirm Evaluation & Save
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MentorSubmissions;
