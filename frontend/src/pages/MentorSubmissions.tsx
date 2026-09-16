import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { FileText, CheckCircle, ExternalLink, Loader2, X, GraduationCap } from 'lucide-react';
import { PageHeader, Card, Modal, EmptyState, Badge, Button, Input, LoadingState } from '../components/ui';

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
    return <LoadingState message="Loading submissions..." />;
  }

  return (
    <div className="space-y-8 font-poppins text-slate-800 dark:text-slate-200 pb-20">
      <PageHeader
        title="Assignments Grading Board"
        subtitle="Grade student coding projects, verify GitHub checkouts, and post feedback logs."
      />

      <Card className="overflow-hidden p-0">
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
                    <Badge variant="neutral">
                      {sub.submissionType}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-slate-400 font-medium">
                    {new Date(sub.submittedAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={sub.status === 'graded' ? 'success' : 'warning'}>
                      {sub.status}
                    </Badge>
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
            <EmptyState
              icon={<FileText className="w-8 h-8" />}
              title="No submissions"
              description="No project submissions registered yet."
            />
          )}
        </div>
      </Card>

      {/* Grade modal */}
      {selectedSub && (
        <Modal
          isOpen={!!selectedSub}
          onClose={() => setSelectedSub(null)}
          title="Evaluate Student Submission"
          description={`Provide grading and feedback for ${selectedSub.studentId?.name}`}
        >
          <div className="space-y-4 mt-4 text-left relative">
            <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl space-y-2 border border-slate-100 dark:border-slate-800">
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
                <div className="text-[11px] text-slate-400 italic mt-2 border-t border-slate-200 dark:border-slate-800 pt-2">
                  Student Notes: "{selectedSub.notes}"
                </div>
              )}
            </div>

            <form onSubmit={handleGradeSubmit} className="space-y-4 text-xs font-semibold">
              <div className="space-y-1">
                <label className="text-slate-500 dark:text-slate-400">Score / Marks Obtained (Max: {selectedSub.assignmentId?.maxMarks})</label>
                <Input
                  type="number"
                  required
                  max={selectedSub.assignmentId?.maxMarks}
                  value={marks}
                  onChange={(e) => setMarks(parseInt(e.target.value))}
                  className="w-full"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-500 dark:text-slate-400">Mentor Remarks / Feedback</label>
                <textarea
                  required
                  placeholder="Excellent work! Check out modular code improvements..."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-xs h-24 outline-none focus:border-accent resize-none transition"
                />
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800">
                <Button type="submit" variant="accent" disabled={grading} className="w-full justify-center gap-1.5">
                  {grading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  Confirm Evaluation & Save
                </Button>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default MentorSubmissions;
